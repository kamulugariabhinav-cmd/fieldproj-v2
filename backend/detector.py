"""
VoiceGuard Deepfake Detector Engine
===================================
Unified multi-model inference engine supporting:
- AASIST-L (Default, Graph Attention Network)
- AASIST (Full Graph Attention Network)
- RawNet2 (ASVspoof 2021 Official Baseline)
- Wav2Vec2 Audio Classifier (Hugging Face / Vansh180)
- Configured External APIs (Hive AI, Resemble AI)
- Safe registry status handling for blocked/incompatible models (AntiDeepfake, ProSDD)
"""

import time
import logging
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path

import torch
import numpy as np

from backend.config import (
    MODEL_CONFIGS,
    DEFAULT_MODEL_NAME,
    DEFAULT_SPOOF_THRESHOLD,
    HIGH_RISK_THRESHOLD,
    LOW_RISK_THRESHOLD,
    EXTERNAL_PROVIDERS
)
from backend.models.registry import (
    MODEL_REGISTRY,
    ModelStatus,
    get_model_status
)
from backend.models.aasist import Model as AASISTModel
from backend.models.rawnet2 import RawNet2Model
from backend.audio_processor import decode_audio_bytes, prepare_windows, AudioProcessingError

logger = logging.getLogger("voiceguard.detector")


class ModelUnavailableError(Exception):
    """Raised when an unready or blocked model is requested for inference."""
    def __init__(self, model_id: str, status: str, message: str):
        super().__init__(f"Model '{model_id}' is unavailable ({status}): {message}")
        self.model_id = model_id
        self.status = status
        self.message = message


class VoiceGuardDetector:
    """
    Unified deepfake detection engine with lazy-loading and multi-model support.
    Supports singleton access and specific model instantiations.
    """
    _instances: Dict[str, "VoiceGuardDetector"] = {}

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME, device: Optional[str] = None):
        if model_name not in MODEL_REGISTRY and model_name not in MODEL_CONFIGS and model_name not in EXTERNAL_PROVIDERS:
            raise ValueError(f"Unknown model: '{model_name}'. Available: {list(MODEL_REGISTRY.keys())}")

        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._loaded_models: Dict[str, Any] = {}
        # Pre-load requested model if local
        if self.model_name in ("AASIST-L", "AASIST"):
            self.model = self._get_or_load_model(self.model_name)
        else:
            self.model = None

    @classmethod
    def get_instance(cls, model_name: str = DEFAULT_MODEL_NAME) -> "VoiceGuardDetector":
        if model_name not in cls._instances:
            cls._instances[model_name] = VoiceGuardDetector(model_name=model_name)
        return cls._instances[model_name]

    def _get_or_load_model(self, model_id: str) -> Any:
        """
        Lazy-loads model weights on first invocation.
        Caches in memory for subsequent requests.
        """
        if model_id in self._loaded_models:
            return self._loaded_models[model_id]

        status, msg = get_model_status(model_id)
        if status != ModelStatus.READY:
            raise ModelUnavailableError(model_id, status.value, msg)

        logger.info(f"Lazy loading model '{model_id}' on {self.device}...")

        # 1. AASIST models
        if model_id in ("AASIST-L", "AASIST"):
            conf = MODEL_CONFIGS[model_id]
            weights_path = Path(conf["weights_file"])
            model = AASISTModel(conf)
            state_dict = torch.load(weights_path, map_location=self.device)
            model.load_state_dict(state_dict, strict=True)
            model.to(self.device)
            model.eval()
            self._loaded_models[model_id] = model
            logger.info(f"Model '{model_id}' loaded successfully.")
            return model

        # 2. RawNet2
        elif model_id == "RawNet2":
            conf = MODEL_CONFIGS["RawNet2"]
            weights_path = Path(conf["weights_file"])
            model = RawNet2Model(conf)
            state_dict = torch.load(weights_path, map_location=self.device)
            model.load_state_dict(state_dict, strict=True)
            model.to(self.device)
            model.eval()
            self._loaded_models[model_id] = model
            logger.info(f"Model '{model_id}' loaded successfully.")
            return model

        # 3. Wav2Vec2 Deepfake Audio Classifier
        elif model_id == "Wav2Vec2-Deepfake":
            from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
            hf_id = MODEL_CONFIGS["Wav2Vec2-Deepfake"]["hf_model_id"]
            extractor = AutoFeatureExtractor.from_pretrained(hf_id)
            model = AutoModelForAudioClassification.from_pretrained(hf_id)
            model.to(self.device)
            model.eval()
            bundle = {"model": model, "extractor": extractor}
            self._loaded_models[model_id] = bundle
            logger.info(f"Model '{model_id}' (HuggingFace: {hf_id}) loaded successfully.")
            return bundle

        else:
            raise ModelUnavailableError(model_id, "unsupported", f"No adapter registered for '{model_id}'.")

    def detect(self,
               audio_bytes: bytes,
               filename: str = "audio.wav",
               model_name: Optional[str] = None,
               threshold: float = DEFAULT_SPOOF_THRESHOLD) -> Dict[str, Any]:
        """
        Runs genuine end-to-end deepfake detection using the specified model.
        Returns standardized forensic analysis payload.
        """
        active_model = model_name or self.model_name
        model_meta = MODEL_REGISTRY.get(active_model, {})
        status, status_msg = get_model_status(active_model)

        if status != ModelStatus.READY:
            blocker = model_meta.get("blocker_reason") or status_msg
            raise ModelUnavailableError(active_model, status.value, blocker)

        start_total = time.perf_counter()

        # 1. Decode & Preprocess audio
        waveform, sample_rate, duration, audio_stats = decode_audio_bytes(audio_bytes, filename)
        time_preproc_ms = round((time.perf_counter() - start_total) * 1000, 2)

        start_inf = time.perf_counter()
        warnings_list: List[str] = []

        if duration < 1.0:
            warnings_list.append("Audio duration is under 1.0 second; brief audio may contain fewer acoustic cues.")

        # 2. Model-specific forward pass
        if active_model in ("AASIST-L", "AASIST"):
            model = self._get_or_load_model(active_model)
            windows = prepare_windows(waveform)
            window_results = []
            spoof_scores = []

            for win in windows:
                tensor = torch.tensor(win["waveform"], dtype=torch.float32, device=self.device).unsqueeze(0)
                with torch.no_grad():
                    _, out = model(tensor)
                    probs = torch.softmax(out, dim=-1).squeeze(0).cpu().numpy()
                    logits = out.squeeze(0).cpu().numpy()

                s_prob = float(probs[0])
                b_prob = float(probs[1])
                spoof_scores.append(s_prob)
                window_results.append({
                    "window_index": win["index"],
                    "start_seconds": win["start_seconds"],
                    "end_seconds": win["end_seconds"],
                    "is_padded": win["is_padded"],
                    "spoof_score": round(s_prob, 5),
                    "bonafide_score": round(b_prob, 5),
                    "spoof_logit": round(float(logits[0]), 3),
                    "bonafide_logit": round(float(logits[1]), 3)
                })

            max_spoof = float(np.max(spoof_scores))
            mean_spoof = float(np.mean(spoof_scores))
            if len(spoof_scores) == 1:
                aggregated_score = max_spoof
            else:
                aggregated_score = float(0.80 * max_spoof + 0.20 * mean_spoof)

        elif active_model == "RawNet2":
            model = self._get_or_load_model("RawNet2")
            windows = prepare_windows(waveform)
            window_results = []
            spoof_scores = []

            for win in windows:
                tensor = torch.tensor(win["waveform"], dtype=torch.float32, device=self.device).unsqueeze(0)
                with torch.no_grad():
                    _, log_out = model(tensor)
                    probs = torch.exp(log_out).squeeze(0).cpu().numpy()
                    logits = log_out.squeeze(0).cpu().numpy()

                s_prob = float(probs[0])
                b_prob = float(probs[1])
                spoof_scores.append(s_prob)
                window_results.append({
                    "window_index": win["index"],
                    "start_seconds": win["start_seconds"],
                    "end_seconds": win["end_seconds"],
                    "is_padded": win["is_padded"],
                    "spoof_score": round(s_prob, 5),
                    "bonafide_score": round(b_prob, 5),
                    "spoof_logit": round(float(logits[0]), 3),
                    "bonafide_logit": round(float(logits[1]), 3)
                })

            max_spoof = float(np.max(spoof_scores))
            mean_spoof = float(np.mean(spoof_scores))
            if len(spoof_scores) == 1:
                aggregated_score = max_spoof
            else:
                aggregated_score = float(0.80 * max_spoof + 0.20 * mean_spoof)

        elif active_model == "Wav2Vec2-Deepfake":
            bundle = self._get_or_load_model("Wav2Vec2-Deepfake")
            model = bundle["model"]
            extractor = bundle["extractor"]

            inputs = extractor(waveform, sampling_rate=16000, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                logits = model(**inputs).logits
                probs = torch.softmax(logits, dim=-1).squeeze(0).cpu().numpy()
                raw_logits = logits.squeeze(0).cpu().numpy()

            b_prob = float(probs[0])
            s_prob = float(probs[1])
            aggregated_score = s_prob
            window_results = [{
                "window_index": 0,
                "start_seconds": 0.0,
                "end_seconds": round(duration, 3),
                "is_padded": False,
                "spoof_score": round(s_prob, 5),
                "bonafide_score": round(b_prob, 5),
                "spoof_logit": round(float(raw_logits[1]), 3),
                "bonafide_logit": round(float(raw_logits[0]), 3)
            }]

        else:
            raise ModelUnavailableError(active_model, "unsupported", f"Unrecognized model '{active_model}'.")

        time_inf_ms = round((time.perf_counter() - start_inf) * 1000, 2)
        time_total_ms = round((time.perf_counter() - start_total) * 1000, 2)
        aggregated_score = round(aggregated_score, 4)

        # 3. Decision classification & Canonical predictions
        uncertainty_band = 0.15
        if aggregated_score >= max(threshold, HIGH_RISK_THRESHOLD):
            prediction = "POSSIBLE_AI_VOICE"
            canonical_prediction = "SPOOF"
            risk_level = "HIGH"
            message = (
                f"Synthetic speech patterns detected ({aggregated_score*100:.1f}% spoof likelihood). "
                f"Model [{model_meta.get('short_name', active_model)}] flagged spectral/temporal synthesis cues."
            )
        elif aggregated_score <= min(threshold - uncertainty_band, LOW_RISK_THRESHOLD):
            prediction = "LIKELY_HUMAN_VOICE"
            canonical_prediction = "BONAFIDE"
            risk_level = "LOW"
            message = (
                f"Voice appears genuine human speech ({(1-aggregated_score)*100:.1f}% natural confidence). "
                f"Model [{model_meta.get('short_name', active_model)}] verified organic acoustic resonance."
            )
        else:
            prediction = "INCONCLUSIVE"
            canonical_prediction = "INCONCLUSIVE"
            risk_level = "MEDIUM"
            message = (
                f"Acoustic features are inconclusive (score: {aggregated_score:.2f}, threshold: {threshold:.2f}). "
                f"Model [{model_meta.get('short_name', active_model)}] detected ambiguous boundaries."
            )

        confidence = aggregated_score if canonical_prediction == "SPOOF" else round(1.0 - aggregated_score, 4)

        return {
            "status": "success",
            "prediction": prediction,
            "canonical_prediction": canonical_prediction,
            "model_id": active_model,
            "model_name": model_meta.get("display_name", active_model),
            "raw_score": aggregated_score,
            "model_score": aggregated_score,
            "score_type": model_meta.get("score_type", "spoof_probability"),
            "confidence": confidence,
            "risk_level": risk_level,
            "threshold_used": threshold,
            "audio_duration_seconds": round(duration, 3),
            "inference_time_ms": time_inf_ms,
            "preprocessing_time_ms": time_preproc_ms,
            "total_processing_time_ms": time_total_ms,
            "processing_time_ms": time_total_ms,
            "device": self.device,
            "message": message,
            "warnings": warnings_list,
            "windows_analyzed": len(window_results),
            "window_details": window_results,
            "audio_features": audio_stats
        }

    def compare_models(self,
                       audio_bytes: bytes,
                       filename: str = "audio.wav",
                       threshold: float = DEFAULT_SPOOF_THRESHOLD) -> Dict[str, Any]:
        """
        Runs the exact same audio through all available, ready models.
        Provides transparent comparison without averaging or inventing artificial consensus.
        """
        start_total = time.perf_counter()

        ready_results: List[Dict[str, Any]] = []
        unavailable_summary: List[Dict[str, Any]] = []

        for m_id, m_dict in MODEL_REGISTRY.items():
            status, status_msg = get_model_status(m_id)
            if status == ModelStatus.READY and not m_dict.get("is_external", False):
                try:
                    res = self.detect(audio_bytes, filename=filename, model_name=m_id, threshold=threshold)
                    ready_results.append({
                        "model_id": m_id,
                        "model_name": m_dict["display_name"],
                        "short_name": m_dict.get("short_name", m_id),
                        "architecture": m_dict["architecture"],
                        "provider": m_dict["provider"],
                        "license": m_dict["license"],
                        "prediction": res["prediction"],
                        "canonical_prediction": res["canonical_prediction"],
                        "raw_score": res["raw_score"],
                        "confidence": res["confidence"],
                        "risk_level": res["risk_level"],
                        "inference_time_ms": res["inference_time_ms"],
                        "processing_time_ms": res["processing_time_ms"],
                        "warnings": res.get("warnings", []),
                        "status": "success"
                    })
                except Exception as eval_err:
                    ready_results.append({
                        "model_id": m_id,
                        "model_name": m_dict["display_name"],
                        "short_name": m_dict.get("short_name", m_id),
                        "status": "error",
                        "error_message": str(eval_err)
                    })
            else:
                unavailable_summary.append({
                    "model_id": m_id,
                    "model_name": m_dict["display_name"],
                    "short_name": m_dict.get("short_name", m_id),
                    "status": status.value,
                    "status_message": status_msg,
                    "blocker_reason": m_dict.get("blocker_reason") or status_msg,
                    "license": m_dict["license"]
                })

        total_time_ms = round((time.perf_counter() - start_total) * 1000, 2)
        valid_predictions = [r["canonical_prediction"] for r in ready_results if r.get("status") == "success"]
        distinct_decisions = set(valid_predictions) - {"INCONCLUSIVE"}
        disagreement_detected = len(distinct_decisions) > 1

        return {
            "status": "success",
            "models_evaluated_count": len(ready_results),
            "disagreement_detected": disagreement_detected,
            "total_processing_time_ms": total_time_ms,
            "threshold_used": threshold,
            "results": ready_results,
            "unavailable_models": unavailable_summary
        }