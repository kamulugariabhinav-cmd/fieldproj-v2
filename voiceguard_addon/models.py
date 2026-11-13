"""Trained checkpoint inference. No untrained fallback classifiers."""
import re
import threading
import time
from pathlib import Path

import numpy as np
import torch
from safetensors.torch import load_file
from transformers import Wav2Vec2Config, Wav2Vec2FeatureExtractor
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2Model

ROOT = Path(__file__).resolve().parent
PELLA_REPO = "mo-thecreator/Deepfake-audio-detection"
PELLA_REV = "e4d9874b493362149cec96ced85f00b00b1a04c0"
NII_REV = "7928e119e09f616b2ce698892e00ca22dbaa40bf"


def nii_key(key):
    """Fairseq feature-only Wav2Vec2 -> Transformers parameter names."""
    key = key.removeprefix("m_ssl.model.")
    if key == "mask_emb":
        key = "masked_spec_embed"
    if key.startswith(("quantizer.", "project_q.", "final_proj.")):
        return None  # Pretraining loss modules are unused by features_only=True.
    if key.startswith("proj_fc."):
        return key
    key = re.sub(r"feature_extractor.conv_layers.(\d+).0.",
                 r"feature_extractor.conv_layers.\1.conv.", key)
    key = re.sub(r"feature_extractor.conv_layers.(\d+).2.1.",
                 r"feature_extractor.conv_layers.\1.layer_norm.", key)
    if key.startswith("layer_norm."):
        key = "feature_projection." + key
    key = key.replace("post_extract_proj.", "feature_projection.projection.")
    key = key.replace("encoder.pos_conv.0.", "encoder.pos_conv_embed.conv.")
    key = key.replace(".weight_g", ".parametrizations.weight.original0")
    key = key.replace(".weight_v", ".parametrizations.weight.original1")
    key = key.replace(".self_attn.", ".attention.")
    key = key.replace(".self_attn_layer_norm.", ".layer_norm.")
    key = key.replace(".fc1.", ".feed_forward.intermediate_dense.")
    key = key.replace(".fc2.", ".feed_forward.output_dense.")
    return "ssl." + key


class NIINetwork(torch.nn.Module):
    """Official MMS frontend + mean pooling + trained linear classifier."""
    def __init__(self, directory):
        super().__init__()
        config = Wav2Vec2Config.from_pretrained(str(directory), local_files_only=True)
        # Match the official fairseq inference architecture (dropout disabled in eval).
        config._attn_implementation = "eager"
        # Construct without allocating a second full 300M-parameter model.
        with torch.device("meta"):
            self.ssl = Wav2Vec2Model(config)
            self.proj_fc = torch.nn.Linear(1024, 2)
        source = load_file(str(directory / "model.safetensors"))
        converted = {}
        for key, value in source.items():
            target = nii_key(key)
            if target is not None:
                if target in converted:
                    raise RuntimeError(f"Duplicate converted NII weight: {target}")
                converted[target] = value
        # Reject missing, extra, and mismatched inference parameters.
        self.load_state_dict(converted, strict=True, assign=True)

    def forward(self, audio):
        return self.proj_fc(self.ssl(audio).last_hidden_state.mean(dim=1))


class Detector:
    def __init__(self, name):
        self.name = name
        self.lock = threading.Lock()
        if name == "pella":
            self.extractor = Wav2Vec2FeatureExtractor.from_pretrained(
                PELLA_REPO, revision=PELLA_REV, local_files_only=True)
            self.model, info = Wav2Vec2ForSequenceClassification.from_pretrained(
                PELLA_REPO, revision=PELLA_REV, local_files_only=True,
                output_loading_info=True)
            if any(info.get(k) for k in ("missing_keys", "unexpected_keys", "mismatched_keys")):
                raise RuntimeError(f"Pella checkpoint mismatch: {info}")
            if {int(k): str(v).lower() for k, v in self.model.config.id2label.items()} != {0: "fake", 1: "real"}:
                raise RuntimeError("Pella checkpoint has an unexpected label mapping")
            self.model_id = "PellaV2"
        elif name == "nii":
            self.model = NIINetwork(ROOT / "weights" / "nii")
            self.model_id = "NII-AntiDeepfake"
        else:
            raise ValueError("Unknown add-on model")
        self.model.eval()

    @torch.inference_mode()
    def detect_waveform(self, waveform):
        audio = np.asarray(waveform, dtype=np.float32).reshape(-1)
        if not audio.size or not np.isfinite(audio).all():
            raise ValueError("Audio must contain finite samples")
        started = time.perf_counter()
        # Bound quadratic attention memory. Aggregate duration-weighted windows.
        scores, lengths = [], []
        with self.lock:
            for start in range(0, len(audio), 160000):
                segment = audio[start:start + 160000]
                lengths.append(len(segment))
                if len(segment) < 400:
                    segment = np.pad(segment, (0, 400 - len(segment)))
                if self.name == "pella":
                    inputs = self.extractor(segment, sampling_rate=16000, return_tensors="pt")
                    logits = self.model(**inputs).logits
                else:
                    inputs = torch.from_numpy(segment.copy()).unsqueeze(0)
                    inputs = torch.nn.functional.layer_norm(inputs, (inputs.shape[-1],))
                    logits = self.model(inputs)
                scores.append(torch.softmax(logits.float(), dim=-1)[0, 0].item())
        score = float(np.average(scores, weights=lengths))
        if not np.isfinite(score):
            raise RuntimeError("Model returned a non-finite probability")
        return {
            "model_name": self.model_id,
            "prediction": "AI Detected" if score >= 0.5 else "Human Detected",
            "ai_probability": score, "human_probability": 1 - score,
            "confidence": max(score, 1 - score), "score_calibrated": False,
            "audio_duration_seconds": len(audio) / 16000,
            "inference_time_ms": (time.perf_counter() - started) * 1000,
            "windows_analyzed": len(scores),
            "warnings": ["Uncalibrated model score; accuracy depends on the recording domain.",
                         "Audio longer than 10 seconds uses duration-weighted window scores."],
        }
