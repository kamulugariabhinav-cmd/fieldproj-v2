
import sys
from pathlib import Path

import numpy as np
import torch
from safetensors.torch import load_file

MODEL_ID = "Forensics-XLSR-Wild"

MODEL_DIR = Path(__file__).resolve().parent
CHECKPOINT = MODEL_DIR / "checkpoint_epoch_4.safetensors"

# The downloaded model.py imports from its own directory.
sys.path.insert(0, str(MODEL_DIR))
from model import DeepfakeDetector


class ForensicsDetector:
    def __init__(self):
        if not CHECKPOINT.exists():
            raise FileNotFoundError(
                f"Forensics checkpoint not found: {CHECKPOINT}"
            )

        self.model = DeepfakeDetector().eval()

        weights = load_file(str(CHECKPOINT))
        load_result = self.model.load_state_dict(
            weights,
            strict=False,
        )

        if load_result.missing_keys:
            raise RuntimeError(
                f"Missing Forensics weights: {load_result.missing_keys}"
            )

        # The published checkpoint includes four unused projection keys.
        expected_unused = {
            "projection.0.bias",
            "projection.0.weight",
            "projection.2.bias",
            "projection.2.weight",
        }

        if set(load_result.unexpected_keys) != expected_unused:
            raise RuntimeError(
                "Unexpected Forensics checkpoint mismatch: "
                f"{load_result.unexpected_keys}"
            )

    @torch.inference_mode()
    def detect_waveform(self, waveform):
        audio = np.asarray(waveform, dtype=np.float32).reshape(-1)

        if len(audio) == 0:
            raise ValueError("Audio is empty.")

        # Match the model's published 5-second preprocessing.
        audio = audio / (np.max(np.abs(audio)) + 1e-8)
        target_samples = 5 * 16000

        if len(audio) < target_samples:
            repeats = (
                target_samples + len(audio) - 1
            ) // len(audio)
            audio = np.tile(audio, repeats)[:target_samples]
        else:
            start = (len(audio) - target_samples) // 2
            audio = audio[start:start + target_samples]

        tensor = torch.from_numpy(
            audio.copy()
        ).float().unsqueeze(0)

        logit = self.model(tensor)
        human_score = torch.sigmoid(logit.float()).item()
        ai_score = 1.0 - human_score

        return {
            "model_name": MODEL_ID,
            "prediction": (
                "AI Detected" if ai_score >= 0.5
                else "Human Detected"
            ),
            "ai_probability": ai_score,
            "human_probability": human_score,
            "confidence": max(ai_score, human_score),
        }
