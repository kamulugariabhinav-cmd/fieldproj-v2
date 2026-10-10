"""
VoiceGuard Comprehensive Automated Test Suite
=============================================
Runs real integration tests with the genuine AASIST-L checkpoint,
plus unit tests for audio decoding, windowing, and error edge cases.
"""

import io
from pathlib import Path
import pytest
import numpy as np
from fastapi.testclient import TestClient

from backend.app import app
from backend.detector import VoiceGuardDetector
from backend.audio_processor import decode_audio_bytes, prepare_windows, AudioProcessingError

REPO_ROOT = Path(__file__).resolve().parent.parent
TEST_DATA = REPO_ROOT / "tests" / "test_data"
BONAFIDE_WAV = TEST_DATA / "bonafide_001.wav"
SPOOF_WAV = TEST_DATA / "spoof_001.wav"
SILENT_WAV = TEST_DATA / "silent.wav"
SHORT_WAV = TEST_DATA / "too_short.wav"
STEREO_WAV = TEST_DATA / "stereo_44k.wav"
CORRUPTED_WAV = TEST_DATA / "corrupted.wav"
EMPTY_WAV = TEST_DATA / "empty.wav"

client = TestClient(app)


# ------------------------------------------------------------------------------
# 1. Health and Backend Readiness
# ------------------------------------------------------------------------------
def test_backend_health():
    """Requirement 10: Backend status & model readiness."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["model_ready"] is True
    assert data["model_name"] in ["AASIST-L", "AASIST"]


def test_api_info():
    """Verifies architectural specs endpoint."""
    resp = client.get("/api/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["architecture"] == "AASIST (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks)"
    assert data["input_sampling_rate_hz"] == 16000


# ------------------------------------------------------------------------------
# 2. Genuine Audio Upload (Real Inference)
# ------------------------------------------------------------------------------
def test_genuine_audio_detection():
    """Requirement 1: Real inference on authentic human speech."""
    assert BONAFIDE_WAV.exists(), f"Missing {BONAFIDE_WAV}"
    content = BONAFIDE_WAV.read_bytes()
    
    resp = client.post(
        "/api/detect",
        files={"audio": ("bonafide_001.wav", content, "audio/wav")},
        data={"threshold": 0.50}
    )
    assert resp.status_code == 200
    result = resp.json()
    
    assert result["status"] == "success"
    assert result["prediction"] == "LIKELY_HUMAN_VOICE"
    assert result["risk_level"] == "LOW"
    assert result["model_score"] < 0.30
    assert result["inference_time_ms"] > 0
    assert result["total_processing_time_ms"] > 0
    assert result["windows_analyzed"] >= 1
    assert "audio_features" in result


# ------------------------------------------------------------------------------
# 3. Synthetic Audio Upload (Real Inference)
# ------------------------------------------------------------------------------
def test_synthetic_audio_detection():
    """Requirement 2: Real inference on synthetic AI speech."""
    assert SPOOF_WAV.exists(), f"Missing {SPOOF_WAV}"
    content = SPOOF_WAV.read_bytes()
    
    resp = client.post(
        "/api/detect",
        files={"audio": ("spoof_001.wav", content, "audio/wav")},
        data={"threshold": 0.50}
    )
    assert resp.status_code == 200
    result = resp.json()
    
    assert result["status"] == "success"
    assert result["prediction"] == "POSSIBLE_AI_VOICE"
    assert result["risk_level"] == "HIGH"
    assert result["model_score"] >= 0.70
    assert len(result["window_details"]) >= 1


# ------------------------------------------------------------------------------
# 4. Reproducibility / Determinism Test
# ------------------------------------------------------------------------------
def test_inference_reproducibility():
    """Requirement: Repeated inference on same input produces identical numerical scores."""
    detector = VoiceGuardDetector.get_instance("AASIST-L")
    content = BONAFIDE_WAV.read_bytes()
    
    res1 = detector.detect(content, filename="bonafide_001.wav", threshold=0.50)
    res2 = detector.detect(content, filename="bonafide_001.wav", threshold=0.50)
    
    assert np.isclose(res1["model_score"], res2["model_score"], atol=1e-5), "Inference scores must be deterministic!"


# ------------------------------------------------------------------------------
# 5. Missing Audio File
# ------------------------------------------------------------------------------
def test_missing_audio():
    """Requirement 3: Missing audio payload returns 422 Unprocessable Entity."""
    resp = client.post("/api/detect")
    assert resp.status_code == 422


# ------------------------------------------------------------------------------
# 6. Invalid / Corrupted File
# ------------------------------------------------------------------------------
def test_corrupted_file():
    """Requirement 4: Corrupted file returns clear 400 error."""
    assert CORRUPTED_WAV.exists()
    content = CORRUPTED_WAV.read_bytes()
    
    resp = client.post(
        "/api/detect",
        files={"audio": ("corrupted.wav", content, "audio/wav")}
    )
    assert resp.status_code == 400
    err = resp.json()["detail"]
    assert err["status"] == "error"
    assert err["error"] == "UNSUPPORTED_FORMAT"


# ------------------------------------------------------------------------------
# 7. Empty File (0 Bytes)
# ------------------------------------------------------------------------------
def test_empty_file():
    """Requirement 5: Empty file returns 400 EMPTY_FILE."""
    resp = client.post(
        "/api/detect",
        files={"audio": ("empty.wav", b"", "audio/wav")}
    )
    assert resp.status_code == 400
    err = resp.json()["detail"]
    assert err["status"] == "error"
    assert err["error"] == "EMPTY_FILE"


# ------------------------------------------------------------------------------
# 8. Silent Recording
# ------------------------------------------------------------------------------
def test_silent_recording():
    """Requirement 6: Silent recording returns 400 SILENT_AUDIO."""
    assert SILENT_WAV.exists()
    content = SILENT_WAV.read_bytes()
    
    resp = client.post(
        "/api/detect",
        files={"audio": ("silent.wav", content, "audio/wav")}
    )
    assert resp.status_code == 400
    err = resp.json()["detail"]
    assert err["status"] == "error"
    assert err["error"] == "SILENT_AUDIO"


# ------------------------------------------------------------------------------
# 9. Unsupported Format Extension
# ------------------------------------------------------------------------------
def test_unsupported_format():
    """Requirement 7: Unsupported file extension is rejected."""
    resp = client.post(
        "/api/detect",
        files={"audio": ("document.pdf", b"%PDF-1.4 dummy", "application/pdf")}
    )
    assert resp.status_code == 400
    err = resp.json()["detail"]
    assert err["error"] == "UNSUPPORTED_FORMAT"


# ------------------------------------------------------------------------------
# 10. Large File Rejection
# ------------------------------------------------------------------------------
def test_large_file_rejection():
    """Requirement 8: Oversized file (> 25MB) rejected with 413."""
    oversized_bytes = b"0" * (26 * 1024 * 1024)
    resp = client.post(
        "/api/detect",
        files={"audio": ("huge.wav", oversized_bytes, "audio/wav")}
    )
    assert resp.status_code == 413
    err = resp.json()["detail"]
    assert err["error"] == "FILE_TOO_LARGE"


# ------------------------------------------------------------------------------
# 11. Model Initialization Failure (Edge case handling)
# ------------------------------------------------------------------------------
def test_model_initialization_invalid_name():
    """Requirement 9: Invalid model name raises descriptive error."""
    with pytest.raises(ValueError) as excinfo:
        VoiceGuardDetector(model_name="NON_EXISTENT_MODEL")
    assert "Unknown model" in str(excinfo.value)


# ------------------------------------------------------------------------------
# 12. Preprocessing & Stereo Downmixing
# ------------------------------------------------------------------------------
def test_stereo_downmix_and_resampling():
    """Verifies stereo 44.1kHz audio downmixes to mono 16kHz seamlessly."""
    assert STEREO_WAV.exists()
    waveform, sr, duration, stats = decode_audio_bytes(STEREO_WAV.read_bytes(), "stereo_44k.wav")
    assert sr == 16000
    assert stats["original_channels"] == 2
    assert stats["original_sample_rate"] == 44100
    assert waveform.ndim == 1
    assert duration > 2.5


# ------------------------------------------------------------------------------
# 13. CORS Configuration & Preflight Validation
# ------------------------------------------------------------------------------
def test_cors_vercel_production_origin():
    """Verify production Vercel frontend origin is allowed with credentials."""
    resp = client.get("/health", headers={"Origin": "https://fieldproj-v2.vercel.app"})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://fieldproj-v2.vercel.app"
    assert resp.headers.get("access-control-allow-credentials") == "true"


def test_cors_vercel_preview_branch_origin():
    """Verify Vercel preview branch deployments are dynamically and securely allowed."""
    preview_origin = "https://voiceguard-pr-123-team.vercel.app"
    resp = client.get("/health", headers={"Origin": preview_origin})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == preview_origin


def test_cors_preflight_options_request():
    """Verify preflight OPTIONS requests return 200 with appropriate CORS headers."""
    headers = {
        "Origin": "https://fieldproj-v2.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    }
    resp = client.options("/api/detect", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://fieldproj-v2.vercel.app"
    assert "POST" in resp.headers.get("access-control-allow-methods", "")


def test_cors_untrusted_origin_rejected():
    """Verify untrusted origins are NOT granted access-control-allow-origin."""
    resp = client.get("/health", headers={"Origin": "https://malicious-attacker-site.com"})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") is None
