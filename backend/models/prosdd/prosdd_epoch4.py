
"""VoiceGuard ProSDD Stage-2, epoch-4 inference engine.

Uses the clean classifier path from model_stage2realfake.py.
Class 0 = spoof; class 1 = bonafide.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import numpy as np
import torch

from backend.models.prosdd.model_stage2realfake import ProSDDStage2


MODEL_DIR = Path(__file__).resolve().parent
BACKBONE_PATH = MODEL_DIR / "pro_sdd_ready.pth"
CLASSIFIER_PATH = MODEL_DIR / "classifier_epoch_04.pth"
CONFIG_PATH = MODEL_DIR / "voiceguard_epoch4_config.json"

MODEL_ID = "ProSDD-Stage2-Epoch4"


def _extract_state(checkpoint):
    """Extract model or classifier weights from a PyTorch checkpoint."""
    if not isinstance(checkpoint, dict):
        raise ValueError("Checkpoint is not a dictionary.")

    for key in (
        "classifier_state_dict",
        "model_state_dict",
        "state_dict",
        "model",
    ):
        value = checkpoint.get(key)
        if isinstance(value, dict):
            checkpoint = value
            break

    return {
        key.removeprefix("module."): value
        for key, value in checkpoint.items()
        if isinstance(key, str) and isinstance(value, torch.Tensor)
    }


def _load_checkpoint(path: Path):
    if not path.is_file():
        raise FileNotFoundError(f"Missing checkpoint: {path}")

    checkpoint = torch.load(
        str(path),
        map_location="cpu",
        weights_only=True,
    )
    return _extract_state(checkpoint)


class ProSDDEpoch4Detector:
    def __init__(self):
        if not CONFIG_PATH.is_file():
            raise FileNotFoundError(f"Missing configuration: {CONFIG_PATH}")

        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            self.config = json.load(f)

        model_config = self.config["model"]
        decision = self.config["decision"]

        if model_config["pooling"] != "mean":
            raise ValueError("This engine requires mean pooling.")

        if int(model_config["audio_samples"]) != 64000:
            raise ValueError("Unexpected audio window length.")

        self.sample_rate = int(model_config["sample_rate_hz"])
        self.window_samples = int(model_config["audio_samples"])
        self.target_frames = int(model_config["target_frames"])
        self.threshold_percent = float(decision["threshold_percent"])

        expected_sha = model_config.get("classifier_sha256")
        if expected_sha:
            digest = hashlib.sha256(CLASSIFIER_PATH.read_bytes()).hexdigest()
            if digest.lower() != expected_sha.lower():
                raise ValueError("Epoch-4 classifier SHA256 mismatch.")

        device_name = os.getenv("PROSDD_DEVICE", "cpu")
        if device_name.startswith("cuda") and not torch.cuda.is_available():
            raise RuntimeError("CUDA requested but no GPU is available.")

        self.device = torch.device(device_name)

        # Instantiate the exact supplied architecture.
        self.model = ProSDDStage2(
            model_name=model_config["backbone"],
            T_target=self.target_frames,
            classifier_pool="mean",
            num_classes=2,
        )

        # Restore the trained Stage-2 model.
        base_state = _load_checkpoint(BACKBONE_PATH)
        base_keys = set(self.model.state_dict())
        matched = set(base_state) & base_keys

        if not any(k.startswith("ssl.") for k in matched):
            raise ValueError("Original checkpoint has no matching SSL weights.")

        incompatible = self.model.load_state_dict(base_state, strict=False)

        print(
            "ProSDD base loaded:",
            len(matched),
            "matching tensors;",
            len(incompatible.missing_keys),
            "missing keys;",
            len(incompatible.unexpected_keys),
            "unexpected keys",
            flush=True,
        )

        # Restore the separately fine-tuned classifier.
        head_state = _load_checkpoint(CLASSIFIER_PATH)

        if any(k.startswith("cls_head.") for k in head_state):
            head_state = {
                k.removeprefix("cls_head."): v
                for k, v in head_state.items()
                if k.startswith("cls_head.")
            }

        self.model.cls_head.load_state_dict(head_state, strict=True)
        self.model.to(self.device)
        self.model.eval()

    def _predict_window(self, waveform: np.ndarray) -> float:
        """Return the uncalibrated class-0 softmax score as a percentage."""
        if waveform.shape != (self.window_samples,):
            raise ValueError("Expected exactly 64000 audio samples.")

        wav = torch.from_numpy(
            np.ascontiguousarray(waveform, dtype=np.float32)
        ).unsqueeze(0).to(self.device)

        with torch.inference_mode():
            z = self.model.ssl.feature_extractor(wav)

            if isinstance(z, dict):
                z = z["input_values"]
            elif isinstance(z, (tuple, list)):
                z = z[0]

            z = z.transpose(1, 2)

            z = self.model.ssl.feature_projection(z)
            if isinstance(z, (tuple, list)):
                z = z[0]

            batch, frames, hidden = z.shape

            if frames > self.target_frames:
                z = z[:, :self.target_frames, :]
            elif frames < self.target_frames:
                padding = z.new_zeros(
                    batch,
                    self.target_frames - frames,
                    hidden,
                )
                z = torch.cat([z, padding], dim=1)

            context = self.model.ssl.encoder(
                z,
                attention_mask=None,
                output_hidden_states=False,
                return_dict=True,
            ).last_hidden_state

            pooled = context.mean(dim=1)
            logits = self.model.cls_head(pooled)
            score = torch.softmax(logits, dim=1)[0, 0].item()

        return float(score * 100.0)

    def detect_waveform(self, audio: np.ndarray) -> dict:
        """Analyze mono 16 kHz waveform, with non-overlapping 4 s windows."""
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)

        if audio.size == 0:
            raise ValueError("Audio is empty.")
        if not np.all(np.isfinite(audio)):
            raise ValueError("Audio contains invalid samples.")

        started = time.perf_counter()
        duration = audio.size / self.sample_rate

        scores = []
        for start in range(0, audio.size, self.window_samples):
            segment = audio[start:start + self.window_samples]

            if segment.size < self.window_samples:
                total_padding = self.window_samples - segment.size
                left = total_padding // 2
                right = total_padding - left
                segment = np.pad(segment, (left, right))

            scores.append(self._predict_window(segment))

        # Research-prototype aggregation; must be validated on long recordings.
        ai_score = float(np.mean(scores))

        warnings = []
        if duration < 4.0:
            warnings.append(
                "Audio shorter than four seconds was zero-padded."
            )

        warnings.append(
            "Telephone-quality speech may produce false positives."
        )

        return {
            "model_name": MODEL_ID,
            "ai_score_percent": ai_score,
            "threshold_percent": self.threshold_percent,
            "prediction": (
                "AI-like"
                if ai_score >= self.threshold_percent
                else "Genuine-like"
            ),
            "audio_duration_seconds": duration,
            "windows_analyzed": len(scores),
            "window_scores_percent": scores,
            "inference_time_ms": (
                time.perf_counter() - started
            ) * 1000,
            "warnings": warnings,
            "score_calibrated": False,
        }

