
import sys
import numpy as np
import soundfile as sf
import torch
from safetensors.torch import load_file

sys.path.insert(0, "backend/models/forensics")
from model import DeepfakeDetector

# Load the pretrained model
model = DeepfakeDetector().eval()
weights = load_file(
    "backend/models/forensics/checkpoint_epoch_4.safetensors"
)
result = model.load_state_dict(weights, strict=False)

print("Missing keys:", result.missing_keys)
print("Unexpected keys:", result.unexpected_keys)

# Load your existing voice recording
audio, sample_rate = sf.read(
    "test_voice_converted.wav",
    dtype="float32"
)

if audio.ndim == 2:
    audio = audio.mean(axis=1)

assert sample_rate == 16000, "Expected 16 kHz audio"
assert len(audio) > 0, "Audio is empty"

# Match the model's published preprocessing
audio = audio / (np.max(np.abs(audio)) + 1e-8)

target_samples = 5 * 16000

if len(audio) < target_samples:
    repeats = (target_samples + len(audio) - 1) // len(audio)
    audio = np.tile(audio, repeats)[:target_samples]
else:
    start = (len(audio) - target_samples) // 2
    audio = audio[start:start + target_samples]

waveform = torch.from_numpy(audio).float().unsqueeze(0)

# Run inference
with torch.inference_mode():
    logit = model(waveform)
    human_score = torch.sigmoid(logit.float()).item()
    ai_score = 1.0 - human_score

print("AI score:", round(ai_score * 100, 3), "%")
print(
    "Prediction:",
    "AI Detected" if ai_score >= 0.5 else "Human Detected"
)
