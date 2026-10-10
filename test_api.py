"""
VoiceGuard Integration API Test Script
======================================
Tests the running VoiceGuard FastAPI backend on http://localhost:8000.
Usage:
    python test_api.py
"""

import os
import requests
from pathlib import Path

BASE_URL = os.getenv("VOICEGUARD_URL", "http://localhost:8000")

def test_api():
    print(f"Testing VoiceGuard API at: {BASE_URL}")
    
    # 1. Health check
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"[OK] GET /health -> Status {r.status_code}: {r.json()}")
    except Exception as e:
        print(f"[ERR] Backend not reachable at {BASE_URL}: {e}")
        print("      Start the backend with: python backend.py")
        return

    # 2. Test sample detection
    dataset_dir = Path(__file__).resolve().parent / "dataset"
    test_files = list(dataset_dir.glob("**/*.wav"))
    
    if test_files:
        sample = test_files[0]
        print(f"\nTesting POST /api/detect with: {sample.name}")
        with open(sample, "rb") as f:
            r = requests.post(
                f"{BASE_URL}/api/detect",
                files={"audio": (sample.name, f, "audio/wav")},
                data={"threshold": 0.50}
            )
        if r.status_code == 200:
            res = r.json()
            print(f"[OK] Status: {res['status']}")
            print(f"     Prediction: {res['prediction']} ({res['risk_level']})")
            print(f"     Spoof Score: {res['model_score']:.4f}")
            print(f"     Latency: {res['inference_time_ms']} ms")
        else:
            print(f"[ERR] Detection failed ({r.status_code}): {r.text}")

if __name__ == "__main__":
    test_api()
