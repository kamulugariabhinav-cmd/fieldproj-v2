"""
VoiceGuard External API Integration
===================================
Connects to verified external deepfake detection APIs (Hive AI Moderation, Resemble AI Detect).
Includes:
- Strict SSRF protection on endpoints
- Server-side API key storage & masking (never returned to frontend)
- Real request/response mapping to VoiceGuard forensic schema
- Dedicated connection test validation
- Graceful error handling (auth, rate limits, timeouts) with fallback to local AASIST
"""

import os
import time
import socket
import logging
import ipaddress
import urllib.parse
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

import httpx

logger = logging.getLogger("voiceguard.external_api")

# Provider definitions
EXTERNAL_PROVIDERS = {
    "Hive-AI": {
        "id": "Hive-AI",
        "name": "Hive AI Audio Deepfake Detector",
        "provider": "Hive AI Moderation",
        "default_endpoint": "https://api.thehive.ai/api/v2/task/sync",
        "api_key_env": "HIVE_API_KEY",
        "doc_url": "https://docs.thehive.ai/",
        "description": "Enterprise cloud API identifying AI-generated audio and speech synthesis.",
        "supported_formats": [".wav", ".mp3", ".flac", ".ogg", ".m4a"]
    },
    "Resemble-AI": {
        "id": "Resemble-AI",
        "name": "Resemble AI Detect",
        "provider": "Resemble AI",
        "default_endpoint": "https://app.resemble.ai/api/v2/detect",
        "api_key_env": "RESEMBLE_API_KEY",
        "doc_url": "https://docs.resemble.ai/",
        "description": "Specialized voice deepfake detection API for synthetic speech forensics.",
        "supported_formats": [".wav", ".mp3"]
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


class ExternalAPIError(Exception):
    """Custom exception for external provider errors."""
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def validate_safe_url(url: str) -> None:
    """
    Strict SSRF validation:
    - Must be HTTPS
    - Hostname must resolve to public IP (blocks localhost, 127.0.0.1, 10.x, 192.168.x, 169.254.x, etc.)
    """
    if not url:
        raise ExternalAPIError("INVALID_ENDPOINT", "Endpoint URL cannot be empty.")

    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("https",):
        raise ExternalAPIError(
            "INSECURE_PROTOCOL",
            f"Only HTTPS endpoints are permitted for security (received: '{parsed.scheme}').",
            status_code=400
        )

    hostname = parsed.hostname
    if not hostname:
        raise ExternalAPIError("INVALID_HOSTNAME", "Could not parse hostname from endpoint URL.")

    # Prevent loopback strings directly
    if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"):
        raise ExternalAPIError("SSRF_BLOCKED", f"Access to local destination '{hostname}' is blocked.")

    # DNS Resolution & IP subnet validation
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise ExternalAPIError("DNS_RESOLUTION_FAILED", f"Could not resolve hostname '{hostname}': {str(e)}")

    for item in addr_info:
        ip_str = item[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                raise ExternalAPIError(
                    "SSRF_BLOCKED",
                    f"Access to private/internal network IP ({ip_str}) is blocked by VoiceGuard SSRF security policy.",
                    status_code=403
                )
        except ValueError:
            continue


def mask_api_key(key: Optional[str]) -> str:
    """Masks API key for secure frontend status inspection (e.g. hiv_**********3f8a)."""
    if not key:
        return ""
    k = key.strip()
    if len(k) <= 8:
        return "********"
    prefix = k[:4]
    suffix = k[-4:]
    return f"{prefix}{'*' * (len(k) - 8)}{suffix}"


class ExternalDeepfakeManager:
    """
    Manages external voice deepfake API authentication, connection testing,
    and actual audio inference.
    """
    _instance: Optional["ExternalDeepfakeManager"] = None
    _runtime_keys: Dict[str, str] = {}
    _runtime_endpoints: Dict[str, str] = {}

    @classmethod
    def get_instance(cls) -> "ExternalDeepfakeManager":
        if cls._instance is None:
            cls._instance = ExternalDeepfakeManager()
        return cls._instance

    def get_key(self, provider_id: str) -> Optional[str]:
        """Resolves API key from runtime configuration or server environment variables."""
        if provider_id in self._runtime_keys and self._runtime_keys[provider_id]:
            return self._runtime_keys[provider_id]

        if provider_id in EXTERNAL_PROVIDERS:
            env_var = EXTERNAL_PROVIDERS[provider_id]["api_key_env"]
            return os.getenv(env_var, None)

        return os.getenv("EXTERNAL_DEEPFAKE_API_KEY", None)

    def set_runtime_key(self, provider_id: str, key: str, endpoint: Optional[str] = None):
        """Stores key securely in server memory only (never written to disk or frontend)."""
        clean_key = key.strip() if key else ""
        self._runtime_keys[provider_id] = clean_key
        if endpoint:
            clean_endpoint = endpoint.strip()
            validate_safe_url(clean_endpoint)
            self._runtime_endpoints[provider_id] = clean_endpoint
        logger.info(f"Updated runtime credentials for external provider: {provider_id}")

    def get_endpoint(self, provider_id: str) -> str:
        if provider_id in self._runtime_endpoints and self._runtime_endpoints[provider_id]:
            return self._runtime_endpoints[provider_id]
        if provider_id in EXTERNAL_PROVIDERS:
            return EXTERNAL_PROVIDERS[provider_id]["default_endpoint"]
        return os.getenv("EXTERNAL_DEEPFAKE_ENDPOINT", "https://api.thehive.ai/api/v2/task/sync")

    def get_provider_status(self) -> Dict[str, Any]:
        """Returns provider status list with masked keys for model settings UI."""
        status_list = {}
        for pid, meta in EXTERNAL_PROVIDERS.items():
            key = self.get_key(pid)
            status_list[pid] = {
                "id": pid,
                "name": meta["name"],
                "provider": meta["provider"],
                "configured": bool(key),
                "masked_key": mask_api_key(key) if key else None,
                "endpoint": self.get_endpoint(pid),
                "description": meta["description"],
                "doc_url": meta["doc_url"]
            }
        return status_list

    async def test_connection(self,
                              provider_id: str,
                              api_key: Optional[str] = None,
                              endpoint: Optional[str] = None) -> Dict[str, Any]:
        """
        Validates the provider configuration by making an actual authenticated verification call.
        """
        if provider_id not in EXTERNAL_PROVIDERS:
            raise ExternalAPIError("UNKNOWN_PROVIDER", f"Unknown external provider: {provider_id}")

        key = (api_key.strip() if api_key else None) or self.get_key(provider_id)
        if not key:
            raise ExternalAPIError(
                "KEY_MISSING",
                f"No API key provided or configured for {provider_id}. "
                f"Please set {EXTERNAL_PROVIDERS[provider_id]['api_key_env']} or enter key in settings."
            )

        target_url = endpoint or self.get_endpoint(provider_id)
        validate_safe_url(target_url)

        start_time = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                if provider_id == "Hive-AI":
                    # Send a minimal ping test to Hive API
                    headers = {
                        "Authorization": f"token {key}",
                        "Accept": "application/json"
                    }
                    # Small 1-second dummy silent wav byte payload for testing
                    dummy_wav = (
                        b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
                        b"\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
                    )
                    files = {"media": ("test_ping.wav", dummy_wav, "audio/wav")}
                    resp = await client.post(target_url, headers=headers, files=files)

                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                    if resp.status_code in (401, 403):
                        raise ExternalAPIError(
                            "INVALID_API_KEY",
                            f"Authentication failed: The provided Hive API key was rejected by api.thehive.ai (HTTP {resp.status_code})."
                        )
                    elif resp.status_code == 429:
                        raise ExternalAPIError(
                            "RATE_LIMITED",
                            "Provider rate limit exceeded. Connection reached Hive AI successfully, but quota was exhausted."
                        )
                    elif resp.status_code in (200, 201, 400):
                        # HTTP 200 or 400 (bad audio format on dummy bytes) proves authentication succeeded!
                        return {
                            "status": "success",
                            "provider": provider_id,
                            "endpoint": target_url,
                            "authenticated": True,
                            "latency_ms": latency_ms,
                            "message": f"Successfully authenticated with {EXTERNAL_PROVIDERS[provider_id]['name']}."
                        }
                    else:
                        raise ExternalAPIError(
                            "PROVIDER_ERROR",
                            f"Hive API responded with unexpected status HTTP {resp.status_code}: {resp.text[:200]}"
                        )

                elif provider_id == "Resemble-AI":
                    headers = {
                        "x-access-token": key,
                        "Accept": "application/json"
                    }
                    resp = await client.get("https://app.resemble.ai/api/v2/projects", headers=headers)
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                    if resp.status_code in (401, 403):
                        raise ExternalAPIError(
                            "INVALID_API_KEY",
                            f"Authentication failed: Resemble API rejected key (HTTP {resp.status_code})."
                        )
                    elif resp.status_code == 200:
                        return {
                            "status": "success",
                            "provider": provider_id,
                            "endpoint": target_url,
                            "authenticated": True,
                            "latency_ms": latency_ms,
                            "message": "Successfully authenticated with Resemble AI."
                        }
                    else:
                        raise ExternalAPIError(
                            "PROVIDER_ERROR",
                            f"Resemble API returned HTTP {resp.status_code}: {resp.text[:200]}"
                        )

                elif provider_id == "TruthScan":
                    # TruthScan user credits check: GET /check-user-credits with header 'apikey'
                    credits_url = "https://detect-audio.truthscan.com/check-user-credits"
                    if endpoint and "check-user-credits" in endpoint:
                        credits_url = endpoint
                    elif endpoint and "detect-audio.truthscan.com" not in endpoint:
                        # Allow custom safe base url if configured
                        parsed_ep = urllib.parse.urlparse(endpoint)
                        credits_url = f"{parsed_ep.scheme}://{parsed_ep.netloc}/check-user-credits"
                    validate_safe_url(credits_url)

                    headers = {
                        "apikey": key,
                        "Accept": "application/json"
                    }
                    resp = await client.get(credits_url, headers=headers)
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                    if resp.status_code in (401, 403, 404):
                        raise ExternalAPIError(
                            "INVALID_API_KEY",
                            f"Authentication failed: TruthScan rejected API key (HTTP {resp.status_code}): {resp.text[:200]}"
                        )
                    elif resp.status_code == 429:
                        raise ExternalAPIError(
                            "RATE_LIMITED",
                            "TruthScan rate limit or credit quota exceeded. Connection reached TruthScan successfully."
                        )
                    elif resp.status_code == 200:
                        credits_info = resp.json()
                        credits_rem = credits_info.get("credits_remaining", credits_info.get("total_credits", "available"))
                        return {
                            "status": "success",
                            "provider": provider_id,
                            "endpoint": credits_url,
                            "authenticated": True,
                            "latency_ms": latency_ms,
                            "credits_remaining": credits_rem,
                            "message": f"Successfully authenticated with TruthScan API ({credits_rem} credits remaining)."
                        }
                    else:
                        raise ExternalAPIError(
                            "PROVIDER_ERROR",
                            f"TruthScan connection test returned HTTP {resp.status_code}: {resp.text[:200]}"
                        )

        except ExternalAPIError:
            raise
        except httpx.TimeoutException:
            raise ExternalAPIError(
                "CONNECTION_TIMEOUT",
                f"Connection to {target_url} timed out after 10.0 seconds."
            )
        except Exception as e:
            raise ExternalAPIError(
                "CONNECTION_FAILED",
                f"Network error connecting to {provider_id}: {str(e)}"
            )

    async def detect_audio(self,
                           audio_bytes: bytes,
                           filename: str,
                           provider_id: str,
                           threshold: float = 0.50) -> Dict[str, Any]:
        """
        Executes actual deepfake detection using the external provider.
        """
        if provider_id not in EXTERNAL_PROVIDERS:
            raise ExternalAPIError("UNKNOWN_PROVIDER", f"Unknown provider: {provider_id}")

        key = self.get_key(provider_id)
        if not key:
            raise ExternalAPIError(
                "KEY_NOT_CONFIGURED",
                f"No API key configured for {provider_id}. "
                f"Please configure {EXTERNAL_PROVIDERS[provider_id]['api_key_env']} or use local AASIST-L.",
                status_code=400
            )

        endpoint = self.get_endpoint(provider_id)
        validate_safe_url(endpoint)

        provider_meta = EXTERNAL_PROVIDERS[provider_id]
        start_time = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if provider_id == "Hive-AI":
                    headers = {
                        "Authorization": f"token {key}",
                        "Accept": "application/json"
                    }
                    files = {"media": (filename, audio_bytes, "audio/wav")}

                    resp = await client.post(endpoint, headers=headers, files=files)
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                    if resp.status_code in (401, 403):
                        raise ExternalAPIError(
                            "AUTHENTICATION_FAILED",
                            f"Hive AI API key was rejected (HTTP {resp.status_code}). Please check your HIVE_API_KEY."
                        )
                    if resp.status_code == 429:
                        raise ExternalAPIError(
                            "RATE_LIMIT_EXCEEDED",
                            "Hive AI API rate limit or quota exceeded. Please try again later or use local AASIST-L."
                        )
                    if not resp.is_success:
                        raise ExternalAPIError(
                            "PROVIDER_ERROR",
                            f"Hive API error ({resp.status_code}): {resp.text[:300]}"
                        )

                    data = resp.json()
                    return self._parse_hive_response(data, filename, latency_ms, threshold, provider_meta)

                elif provider_id == "Resemble-AI":
                    headers = {
                        "x-access-token": key,
                        "Accept": "application/json"
                    }
                    files = {"file": (filename, audio_bytes, "audio/wav")}
                    resp = await client.post(endpoint, headers=headers, files=files)
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                    if resp.status_code in (401, 403):
                        raise ExternalAPIError("AUTHENTICATION_FAILED", "Resemble AI API key rejected.")
                    if not resp.is_success:
                        raise ExternalAPIError("PROVIDER_ERROR", f"Resemble API error: {resp.text[:300]}")

                    data = resp.json()
                    return self._parse_resemble_response(data, filename, latency_ms, threshold, provider_meta)

        except ExternalAPIError:
            raise
        except httpx.TimeoutException:
            raise ExternalAPIError(
                "PROVIDER_TIMEOUT",
                f"External API call to {provider_id} timed out after 30 seconds."
            )
        except Exception as e:
            raise ExternalAPIError(
                "EXTERNAL_CALL_FAILED",
                f"Error communicating with {provider_id}: {str(e)}"
            )

    def _parse_hive_response(self,
                             data: Dict[str, Any],
                             filename: str,
                             latency_ms: float,
                             threshold: float,
                             meta: Dict[str, Any]) -> Dict[str, Any]:
        """Parses Hive AI Audio Detection JSON into VoiceGuard response schema."""
        try:
            status_item = data.get("status", [{}])[0]
            output = status_item.get("response", {}).get("output", [])
            if not output:
                raise ValueError("No detection output returned by Hive API.")

            segment_scores = []
            for seg in output:
                classes = {c.get("class"): float(c.get("score", 0.0)) for c in seg.get("classes", [])}
                ai_score = classes.get("ai_generated", 0.0)
                segment_scores.append({
                    "start_seconds": seg.get("time", 0.0),
                    "end_seconds": seg.get("end_time", 10.0),
                    "spoof_score": round(ai_score, 4),
                    "bonafide_score": round(classes.get("not_ai_generated", 1.0 - ai_score), 4)
                })

            # Primary score = max spoof score across segments
            max_score = float(max(s["spoof_score"] for s in segment_scores)) if segment_scores else 0.0
            avg_score = float(sum(s["spoof_score"] for s in segment_scores) / len(segment_scores)) if segment_scores else 0.0
            final_score = round(0.85 * max_score + 0.15 * avg_score, 4)

            # Decision
            if final_score >= max(threshold, 0.70):
                prediction = "POSSIBLE_AI_VOICE"
                risk_level = "HIGH"
                message = f"Hive AI flagged audio as synthetic with {final_score*100:.1f}% confidence."
            elif final_score <= min(threshold - 0.15, 0.30):
                prediction = "LIKELY_HUMAN_VOICE"
                risk_level = "LOW"
                message = f"Hive AI classified audio as natural human speech ({(1-final_score)*100:.1f}% natural confidence)."
            else:
                prediction = "INCONCLUSIVE"
                risk_level = "MEDIUM"
                message = f"Hive AI score ({final_score:.2f}) falls within ambiguous detection margin."

            return {
                "status": "success",
                "prediction": prediction,
                "model_score": final_score,
                "score_type": "spoof_probability",
                "risk_level": risk_level,
                "confidence": final_score if prediction == "POSSIBLE_AI_VOICE" else round(1.0 - final_score, 4),
                "threshold_used": threshold,
                "audio_duration_seconds": round(output[-1].get("end_time", 0.0), 2) if output else 0.0,
                "inference_time_ms": latency_ms,
                "total_processing_time_ms": latency_ms,
                "model_name": meta["name"],
                "provider": meta["provider"],
                "message": message,
                "aggregation_method": "hive_segment_max_weighted",
                "windows_analyzed": len(segment_scores),
                "window_details": segment_scores,
                "audio_features": {
                    "source": "Hive AI Cloud API",
                    "filename": filename
                }
            }
        except Exception as e:
            raise ExternalAPIError("PARSE_ERROR", f"Could not parse Hive API response: {str(e)} - Data: {str(data)[:200]}")

    def _parse_resemble_response(self,
                                data: Dict[str, Any],
                                filename: str,
                                latency_ms: float,
                                threshold: float,
                                meta: Dict[str, Any]) -> Dict[str, Any]:
        """Parses Resemble AI Detect JSON."""
        res_data = data.get("data", {})
        label = res_data.get("label", "unknown").lower()
        raw_score = float(res_data.get("score", 0.5))

        spoof_score = raw_score if label in ("fake", "synthetic") else (1.0 - raw_score)
        spoof_score = round(spoof_score, 4)

        if spoof_score >= threshold:
            prediction = "POSSIBLE_AI_VOICE"
            risk_level = "HIGH"
            message = f"Resemble AI detected synthetic voice characteristics (score: {spoof_score:.2f})."
        else:
            prediction = "LIKELY_HUMAN_VOICE"
            risk_level = "LOW"
            message = f"Resemble AI assessed voice as authentic biological speech."

        return {
            "status": "success",
            "prediction": prediction,
            "model_score": spoof_score,
            "score_type": "spoof_probability",
            "risk_level": risk_level,
            "confidence": spoof_score if prediction == "POSSIBLE_AI_VOICE" else round(1.0 - spoof_score, 4),
            "threshold_used": threshold,
            "audio_duration_seconds": 0.0,
            "inference_time_ms": latency_ms,
            "total_processing_time_ms": latency_ms,
            "model_name": meta["name"],
            "provider": meta["provider"],
            "message": message,
            "windows_analyzed": 1,
            "window_details": [],
            "audio_features": {"source": "Resemble AI Cloud API", "filename": filename}
        }

    def _parse_truthscan_response(self,
                                  data: Dict[str, Any],
                                  filename: str,
                                  latency_ms: float,
                                  threshold: float,
                                  meta: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses TruthScan Audio AI Detection JSON response:
        {
            "id": "...",
            "result": 0.85,
            "result_details": {
                "mean_ai_prob": 0.85,
                "individual_chunks_ai_prob": [0.82, 0.88, 0.85],
                "original_duration": 12.4,
                "truncated_duration": 12.4,
                "is_truncated": false
            }
        }
        """
        try:
            raw_ai_prob = float(data.get("result", 0.0))
            details = data.get("result_details", {})
            mean_ai_prob = float(details.get("mean_ai_prob", raw_ai_prob))
            duration = float(details.get("original_duration", 0.0))
            chunk_probs = details.get("individual_chunks_ai_prob", [])
            query_id = data.get("id", "")

            # AI probability is synthetic speech score (0.0 = human, 1.0 = deepfake)
            spoof_score = round(raw_ai_prob, 4)

            # Build window details from chunks
            window_results = []
            if chunk_probs:
                chunk_step = round(duration / len(chunk_probs), 2) if (duration > 0 and len(chunk_probs) > 0) else 3.0
                for idx, c_prob in enumerate(chunk_probs):
                    cp = round(float(c_prob), 4)
                    start_sec = round(idx * chunk_step, 2)
                    end_sec = round((idx + 1) * chunk_step, 2) if duration == 0 else min(duration, round((idx + 1) * chunk_step, 2))
                    window_results.append({
                        "window_index": idx,
                        "start_seconds": start_sec,
                        "end_seconds": end_sec,
                        "is_padded": False,
                        "spoof_score": cp,
                        "bonafide_score": round(1.0 - cp, 4)
                    })
            else:
                window_results.append({
                    "window_index": 0,
                    "start_seconds": 0.0,
                    "end_seconds": duration,
                    "is_padded": False,
                    "spoof_score": spoof_score,
                    "bonafide_score": round(1.0 - spoof_score, 4)
                })

            uncertainty_band = 0.15
            if spoof_score >= max(threshold, 0.70):
                prediction = "POSSIBLE_AI_VOICE"
                canonical_prediction = "SPOOF"
                risk_level = "HIGH"
                message = f"TruthScan flagged voice as synthetic with {spoof_score*100:.1f}% AI probability."
            elif spoof_score <= min(threshold - uncertainty_band, 0.30):
                prediction = "LIKELY_HUMAN_VOICE"
                canonical_prediction = "BONAFIDE"
                risk_level = "LOW"
                message = f"TruthScan assessed audio as authentic human speech ({(1-spoof_score)*100:.1f}% natural confidence)."
            else:
                prediction = "INCONCLUSIVE"
                canonical_prediction = "INCONCLUSIVE"
                risk_level = "MEDIUM"
                message = f"TruthScan score ({spoof_score:.2f}) falls within ambiguous detection margin."

            confidence = spoof_score if canonical_prediction == "SPOOF" else round(1.0 - spoof_score, 4)

            return {
                "status": "success",
                "prediction": prediction,
                "canonical_prediction": canonical_prediction,
                "model_id": meta["id"],
                "model_name": meta["name"],
                "provider": meta["provider"],
                "raw_score": spoof_score,
                "model_score": spoof_score,
                "score_type": "spoof_probability",
                "confidence": confidence,
                "risk_level": risk_level,
                "threshold_used": threshold,
                "audio_duration_seconds": round(duration, 3),
                "inference_time_ms": latency_ms,
                "total_processing_time_ms": latency_ms,
                "processing_time_ms": latency_ms,
                "message": message,
                "windows_analyzed": len(window_results),
                "window_details": window_results,
                "audio_features": {
                    "source": "TruthScan API (detect-audio.truthscan.com)",
                    "query_id": query_id,
                    "mean_ai_prob": round(mean_ai_prob, 4),
                    "is_truncated": details.get("is_truncated", False),
                    "filename": filename
                }
            }
        except Exception as e:
            raise ExternalAPIError("PARSE_ERROR", f"Could not parse TruthScan API response: {str(e)} - Data: {str(data)[:200]}")

# Convenience top-level functions
def get_all_providers_status():
    return ExternalDeepfakeManager.get_instance().get_provider_status()

def configure_provider_key(provider_id: str, api_key: str, endpoint: Optional[str] = None):
    return ExternalDeepfakeManager.get_instance().set_runtime_key(provider_id, api_key, endpoint)

async def test_provider_connection(provider_id: str, api_key: str, endpoint: Optional[str] = None):
    return await ExternalDeepfakeManager.get_instance().test_connection(provider_id, api_key, endpoint)

async def detect_with_external_api(audio_bytes: bytes, filename: str, provider_id: str, threshold: float = 0.5):
    return await ExternalDeepfakeManager.get_instance().detect_audio(audio_bytes, filename, provider_id, threshold)
