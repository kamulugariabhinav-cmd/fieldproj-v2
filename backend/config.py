"""
VoiceGuard Configuration
========================
System-wide configuration, model paths, audio settings, and detection thresholds.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent

# Model configuration
DEFAULT_MODEL_NAME = os.getenv("VOICEGUARD_MODEL", "AASIST-L")
WEIGHTS_DIR = BASE_DIR / "models" / "weights"

MODEL_CONFIGS = {
    "AASIST-L": {
        "architecture": "AASIST",
        "nb_samp": 64600,
        "first_conv": 128,
        "filts": [70, [1, 32], [32, 32], [32, 24], [24, 24]],
        "gat_dims": [24, 32],
        "pool_ratios": [0.4, 0.5, 0.7, 0.5],
        "temperatures": [2.0, 2.0, 100.0, 100.0],
        "weights_file": WEIGHTS_DIR / "AASIST-L.pth"
    },
    "AASIST": {
        "architecture": "AASIST",
        "nb_samp": 64600,
        "first_conv": 128,
        "filts": [70, [1, 32], [32, 32], [32, 64], [64, 64]],
        "gat_dims": [64, 32],
        "pool_ratios": [0.5, 0.7, 0.5, 0.5],
        "temperatures": [2.0, 2.0, 100.0, 100.0],
        "weights_file": WEIGHTS_DIR / "AASIST.pth"
    },
    "RawNet2": {
        "architecture": "RawNet2Spoof",
        "nb_samp": 64600,
        "first_conv": 1024,
        "in_channels": 1,
        "filts": [20, [20, 20], [20, 128], [128, 128]],
        "blocks": [2, 4],
        "nb_fc_node": 1024,
        "gru_node": 1024,
        "nb_gru_layer": 3,
        "nb_classes": 2,
        "weights_file": WEIGHTS_DIR / "pre_trained_DF_RawNet2.pth"
    },
    "Wav2Vec2-Deepfake": {
        "architecture": "Wav2Vec2ForSequenceClassification",
        "hf_model_id": "Vansh180/deepfake-audio-wav2vec2",
        "sample_rate": 16000
    }
}

# External API providers
EXTERNAL_PROVIDERS = {
    "Hive-AI": {
        "id": "Hive-AI",
        "name": "Hive AI Audio Deepfake Detector",
        "provider": "Hive AI Moderation",
        "default_endpoint": "https://api.thehive.ai/api/v2/task/sync",
        "api_key_env": "HIVE_API_KEY",
        "doc_url": "https://docs.thehive.ai/",
        "description": "Enterprise cloud API identifying AI-generated audio and speech synthesis."
    },
    "Resemble-AI": {
        "id": "Resemble-AI",
        "name": "Resemble AI Detect",
        "provider": "Resemble AI",
        "default_endpoint": "https://app.resemble.ai/api/v2/detect",
        "api_key_env": "RESEMBLE_API_KEY",
        "doc_url": "https://docs.resemble.ai/",
        "description": "Specialized voice deepfake detection API for synthetic speech forensics."
    },
    "TruthScan": {
        "id": "TruthScan",
        "name": "TruthScan Audio AI Detector",
        "provider": "TruthScan (detect-audio.truthscan.com)",
        "default_endpoint": "https://detect-audio.truthscan.com/detect-file",
        "api_key_env": "TRUTHSCAN_API_KEY",
        "doc_url": "https://detect-audio.truthscan.com/docs",
        "description": "Cloud API for detecting AI-generated voices with chunk-level synthetic probability analysis.",
        "supported_formats": [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".webm"]
    }
}

# Detection Thresholds
DEFAULT_SPOOF_THRESHOLD = float(os.getenv("VOICEGUARD_THRESHOLD", "0.50"))
HIGH_RISK_THRESHOLD = 0.70
LOW_RISK_THRESHOLD = 0.30

# Audio settings
SAMPLE_RATE = 16000
WINDOW_SAMPLES = 64600
HOP_SAMPLES = 32300
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm", ".aac"}

# API and Security
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]
API_PORT = int(os.getenv("PORT", "8000"))
API_HOST = os.getenv("HOST", "0.0.0.0")