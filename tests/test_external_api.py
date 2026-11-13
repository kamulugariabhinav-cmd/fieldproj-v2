"""
Tests for External Deepfake Detection API Integration
====================================================
Verifies:
1. Provider listing & credential masking
2. SSRF protection against internal/private endpoints
3. Connection testing with invalid keys
4. Failure handling and graceful fallback to AASIST-L
5. Hive AI response parsing & risk classification
6. Preservation of local AASIST inference
"""

import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.external_api import (
    ExternalDeepfakeManager,
    ExternalAPIError,
    validate_safe_url,
    mask_api_key
)

client = TestClient(app)


def test_get_external_providers():
    """Verifies external providers listing endpoint."""
    resp = client.get("/api/external/providers")
    assert resp.status_code == 200
    data = resp.json()
    assert "Hive-AI" in data
    assert "Resemble-AI" in data
    assert "TruthScan" in data
    assert data["TruthScan"]["endpoint"] == "https://detect-audio.truthscan.com/detect-file"
    # Ensure raw secret is never returned
    assert data["Hive-AI"]["masked_key"] is None or "*" in data["Hive-AI"]["masked_key"]


def test_key_masking():
    """Verifies that API keys are properly masked."""
    assert mask_api_key("") == ""
    assert mask_api_key("12345") == "********"
    assert mask_api_key("hive_secret_token_123456789") == "hive*******************6789"


def test_ssrf_protection_blocks_private_destinations():
    """Verifies SSRF filter blocks localhost, loopback, private IPs, and insecure schemes."""
    # Insecure scheme
    with pytest.raises(ExternalAPIError) as exc:
        validate_safe_url("http://api.thehive.ai")
    assert "INSECURE_PROTOCOL" in str(exc.value.code)

    # Localhost
    with pytest.raises(ExternalAPIError) as exc:
        validate_safe_url("https://localhost/detect")
    assert "SSRF_BLOCKED" in str(exc.value.code)

    # 127.0.0.1
    with pytest.raises(ExternalAPIError) as exc:
        validate_safe_url("https://127.0.0.1:8000")
    assert "SSRF_BLOCKED" in str(exc.value.code)

    # AWS/GCP metadata
    with pytest.raises(ExternalAPIError) as exc:
        validate_safe_url("https://169.254.169.254/latest/meta-data")
    assert "SSRF_BLOCKED" in str(exc.value.code)


def test_ssrf_allows_valid_public_https():
    """Valid public HTTPS endpoints pass SSRF validation."""
    validate_safe_url("https://api.thehive.ai/api/v2/task/sync")
    validate_safe_url("https://app.resemble.ai/api/v2/detect")
    validate_safe_url("https://detect-audio.truthscan.com/detect-file")
    validate_safe_url("https://detect-audio.truthscan.com/check-user-credits")


def test_connection_test_without_key_fails_cleanly():
    """Connection test without an API key produces clear KEY_MISSING error."""
    resp = client.post(
        "/api/external/test-connection",
        json={"provider_id": "Hive-AI", "api_key": ""}
    )
    assert resp.status_code == 400
    err = resp.json()["detail"]
    assert err["error"] == "KEY_MISSING"


def test_configure_and_masked_return():
    """Configuring key keeps it server-side and returns masked representation."""
    sample_key = "test_hive_key_sample_12345"
    resp = client.post(
        "/api/external/configure",
        json={"provider_id": "Hive-AI", "api_key": sample_key}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    # Never returns raw key
    masked = data["provider"]["masked_key"]
    assert masked.startswith("test")
    assert masked.endswith("2345")
    assert "*" in masked
    assert sample_key not in masked


def test_external_detection_missing_key_returns_clear_error():
    """Calling external detection without key returns error with AASIST-L fallback hint."""
    manager = ExternalDeepfakeManager.get_instance()
    manager._runtime_keys["Resemble-AI"] = "" # clear key

    resp = client.post(
        "/api/detect",
        files={"audio": ("test.wav", b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00", "audio/wav")},
        data={"model_name": "Resemble-AI"}
    )
    assert resp.status_code == 400
    err = resp.json()["detail"]
    assert err["error"] == "KEY_NOT_CONFIGURED"
    assert err["fallback_available"] == "AASIST-L"


def test_hive_response_parsing():
    """Verifies that Hive AI response format is correctly parsed into VoiceGuard schema."""
    manager = ExternalDeepfakeManager.get_instance()
    mock_hive_data = {
        "status": [
            {
                "status": {"code": "0", "message": "SUCCESS"},
                "response": {
                    "output": [
                        {
                            "time": 0,
                            "end_time": 4.5,
                            "classes": [
                                {"class": "not_ai_generated", "score": 0.02},
                                {"class": "ai_generated", "score": 0.98}
                            ]
                        }
                    ]
                }
            }
        ]
    }

    parsed = manager._parse_hive_response(
        data=mock_hive_data,
        filename="speech.wav",
        latency_ms=180.5,
        threshold=0.50,
        meta={"name": "Hive AI Audio Deepfake Detector", "provider": "Hive AI Moderation"}
    )

    assert parsed["status"] == "success"
    assert parsed["prediction"] == "POSSIBLE_AI_VOICE"
    assert parsed["risk_level"] == "HIGH"
    assert parsed["model_score"] >= 0.90
    assert parsed["provider"] == "Hive AI Moderation"
    assert parsed["inference_time_ms"] == 180.5


def test_existing_local_models_remain_fully_functional():
    """Verifies that local AASIST-L continues to work even when external providers exist."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["model_name"] == "AASIST-L"


def test_truthscan_configure_and_masked_return():
    """Configuring TruthScan key keeps it server-side and returns masked representation."""
    sample_key = "truthscan_secret_sample_key_987654"
    resp = client.post(
        "/api/external/configure",
        json={"provider_id": "TruthScan", "api_key": sample_key}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    masked = data["provider"]["masked_key"]
    assert masked.startswith("trut")
    assert masked.endswith("7654")
    assert "*" in masked
    assert sample_key not in masked


def test_truthscan_detection_missing_key_returns_clear_error():
    """Calling TruthScan detection without key returns error with AASIST-L fallback hint."""
    manager = ExternalDeepfakeManager.get_instance()
    manager._runtime_keys["TruthScan"] = ""

    resp = client.post(
        "/api/detect",
        files={"audio": ("test.wav", b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00", "audio/wav")},
        data={"model_name": "TruthScan"}
    )
    assert resp.status_code == 400
    err = resp.json()["detail"]
    assert err["error"] == "KEY_NOT_CONFIGURED"
    assert "AASIST-L" in str(err)


def test_truthscan_response_parsing_synthetic():
    """Verifies that TruthScan synthetic speech response is mapped accurately to schema."""
    manager = ExternalDeepfakeManager.get_instance()
    mock_data = {
        "id": "ts_query_987",
        "result": 0.94,
        "result_details": {
            "mean_ai_prob": 0.94,
            "individual_chunks_ai_prob": [0.91, 0.96, 0.95],
            "original_duration": 12.0,
            "truncated_duration": 12.0,
            "is_truncated": False
        }
    }

    parsed = manager._parse_truthscan_response(
        data=mock_data,
        filename="speech_cloned.wav",
        latency_ms=210.4,
        threshold=0.50,
        meta={
            "id": "TruthScan",
            "name": "TruthScan Audio AI Detector",
            "provider": "TruthScan (detect-audio.truthscan.com)"
        }
    )

    assert parsed["status"] == "success"
    assert parsed["prediction"] == "POSSIBLE_AI_VOICE"
    assert parsed["canonical_prediction"] == "SPOOF"
    assert parsed["risk_level"] == "HIGH"
    assert parsed["model_score"] == 0.94
    assert parsed["confidence"] == 0.94
    assert parsed["windows_analyzed"] == 3
    assert len(parsed["window_details"]) == 3
    assert parsed["audio_features"]["query_id"] == "ts_query_987"
    assert parsed["audio_features"]["mean_ai_prob"] == 0.94
    assert parsed["inference_time_ms"] == 210.4


def test_truthscan_response_parsing_bonafide():
    """Verifies that TruthScan human speech response is mapped accurately to schema."""
    manager = ExternalDeepfakeManager.get_instance()
    mock_data = {
        "id": "ts_query_human_123",
        "result": 0.04,
        "result_details": {
            "mean_ai_prob": 0.04,
            "individual_chunks_ai_prob": [0.03, 0.05],
            "original_duration": 8.0,
            "truncated_duration": 8.0,
            "is_truncated": False
        }
    }

    parsed = manager._parse_truthscan_response(
        data=mock_data,
        filename="natural_human.wav",
        latency_ms=195.0,
        threshold=0.50,
        meta={
            "id": "TruthScan",
            "name": "TruthScan Audio AI Detector",
            "provider": "TruthScan (detect-audio.truthscan.com)"
        }
    )

    assert parsed["status"] == "success"
    assert parsed["prediction"] == "LIKELY_HUMAN_VOICE"
    assert parsed["canonical_prediction"] == "BONAFIDE"
    assert parsed["risk_level"] == "LOW"
    assert parsed["model_score"] == 0.04
    assert parsed["confidence"] == 0.96
    assert parsed["windows_analyzed"] == 2
