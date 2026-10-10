"""
Comprehensive test suite for multi-model integration:
- Model Registry endpoint
- AASIST-L (Default) inference
- AASIST inference
- RawNet2 inference
- Wav2Vec2-Deepfake inference
- AntiDeepfake blocker handling
- ProSDD blocker handling
- Multi-Model comparison endpoint (/api/compare)
"""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

SAMPLE_WAV = Path(r"C:\Users\ABHINAV\OneDrive\Desktop\fieldproj-v2\dataset\bonafide\bonafide_001.wav")

def test_api_models_registry():
    """Verify all 8 models are present with accurate metadata and statuses."""
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["default_model"] == "AASIST-L"

    models = {m["model_id"]: m for m in data["models"]}
    assert "AASIST-L" in models
    assert "AASIST" in models
    assert "RawNet2" in models
    assert "Wav2Vec2-Deepfake" in models
    assert "AntiDeepfake" in models
    assert "ProSDD" in models
    assert "Hive-AI" in models
    assert "Resemble-AI" in models
    assert "TruthScan" in models

    # Check statuses
    assert models["AASIST-L"]["status"] == "ready"
    assert models["AASIST-L"]["is_default"] is True
    assert models["RawNet2"]["status"] == "ready"
    assert models["Wav2Vec2-Deepfake"]["status"] == "ready"
    assert models["AntiDeepfake"]["status"] == "dependency_unavailable"
    assert models["ProSDD"]["status"] == "checkpoint_missing"


def test_detect_default_aasist_l():
    """Verify default AASIST-L model works properly."""
    with open(SAMPLE_WAV, "rb") as f:
        response = client.post(
            "/api/detect",
            files={"file": ("test.wav", f, "audio/wav")},
            data={"model_name": "AASIST-L", "threshold": "0.5"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["model_id"] == "AASIST-L"
    assert data["prediction"] in ("POSSIBLE_AI_VOICE", "LIKELY_HUMAN_VOICE", "INCONCLUSIVE")
    assert "raw_score" in data
    assert "processing_time_ms" in data


def test_detect_rawnet2():
    """Verify real inference with RawNet2 model."""
    with open(SAMPLE_WAV, "rb") as f:
        response = client.post(
            "/api/detect",
            files={"file": ("test.wav", f, "audio/wav")},
            data={"model_name": "RawNet2", "threshold": "0.5"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["model_id"] == "RawNet2"
    assert "RawNet2" in data["model_name"]
    assert 0.0 <= data["raw_score"] <= 1.0
    assert data["score_type"] == "spoof_probability"
    assert "canonical_prediction" in data


def test_detect_wav2vec2_deepfake():
    """Verify real inference with Wav2Vec2-Deepfake model."""
    with open(SAMPLE_WAV, "rb") as f:
        response = client.post(
            "/api/detect",
            files={"file": ("test.wav", f, "audio/wav")},
            data={"model_name": "Wav2Vec2-Deepfake", "threshold": "0.5"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["model_id"] == "Wav2Vec2-Deepfake"
    assert "Wav2Vec2" in data["model_name"]
    assert 0.0 <= data["raw_score"] <= 1.0


def test_detect_antideepfake_blocker():
    """Verify AntiDeepfake safely reports dependency blocker without crashing."""
    with open(SAMPLE_WAV, "rb") as f:
        response = client.post(
            "/api/detect",
            files={"file": ("test.wav", f, "audio/wav")},
            data={"model_name": "AntiDeepfake"}
        )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "unavailable" in str(detail).lower()
    assert "fairseq" in str(detail).lower()


def test_detect_prosdd_blocker():
    """Verify ProSDD safely reports checkpoint blocker without crashing."""
    with open(SAMPLE_WAV, "rb") as f:
        response = client.post(
            "/api/detect",
            files={"file": ("test.wav", f, "audio/wav")},
            data={"model_name": "ProSDD"}
        )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "unavailable" in str(detail).lower()
    assert "checkpoint" in str(detail).lower()


def test_multi_model_compare():
    """Verify /api/compare evaluates all ready models and returns comparison matrix."""
    with open(SAMPLE_WAV, "rb") as f:
        response = client.post(
            "/api/compare",
            files={"file": ("test.wav", f, "audio/wav")},
            data={"threshold": "0.5"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["models_evaluated_count"] >= 4  # AASIST-L, AASIST, RawNet2, Wav2Vec2-Deepfake
    assert "disagreement_detected" in data
    assert "results" in data
    assert "unavailable_models" in data

    evaluated_ids = [r["model_id"] for r in data["results"]]
    assert "AASIST-L" in evaluated_ids
    assert "RawNet2" in evaluated_ids
    assert "Wav2Vec2-Deepfake" in evaluated_ids

    unavailable_ids = [u["model_id"] for u in data["unavailable_models"]]
    assert "AntiDeepfake" in unavailable_ids
    assert "ProSDD" in unavailable_ids
