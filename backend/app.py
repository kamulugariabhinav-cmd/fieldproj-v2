"""
VoiceGuard FastAPI Application
==============================
High-performance asynchronous API for deepfake detection.
Serves:
- AASIST-L (Default active model)
- AASIST, RawNet2, Wav2Vec2 Deepfake
- Model Registry inspection (/api/models)
- Multi-Model Comparison mode (/api/compare)
- Optional external deepfake APIs (Hive AI, Resemble AI)
- Complete static frontend hosting
"""

import time
import os
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.config import (
    DEFAULT_MODEL_NAME,
    DEFAULT_SPOOF_THRESHOLD,
    MAX_UPLOAD_SIZE_MB,
    ALLOWED_EXTENSIONS,
    ALLOWED_ORIGINS
)
from backend.models.registry import (
    MODEL_REGISTRY,
    get_all_models_summary,
    get_model_status,
    ModelStatus
)
from backend.detector import VoiceGuardDetector, ModelUnavailableError
from backend.audio_processor import AudioProcessingError
from backend.external_api import (
    EXTERNAL_PROVIDERS,
    ExternalAPIError,
    ExternalDeepfakeManager
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("voiceguard.api")

# Initialize FastAPI application
app = FastAPI(
    title="VoiceGuard Deepfake Detection API",
    description="Multi-model voice anti-spoofing and deepfake forensics system",
    version="2.5.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent.parent

# Serve index.html
@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "VoiceGuard API is online. Static frontend not found."}

@app.get("/dashboard.html", include_in_schema=False)
async def serve_dashboard():
    dash_file = STATIC_DIR / "dashboard.html"
    if dash_file.exists():
        return FileResponse(dash_file)
    raise HTTPException(status_code=404, detail="Dashboard not found")

@app.get("/style.css", include_in_schema=False)
async def serve_style():
    f = STATIC_DIR / "style.css"
    if f.exists():
        return FileResponse(f, media_type="text/css")
    raise HTTPException(status_code=404, detail="style.css not found")

@app.get("/script.js", include_in_schema=False)
async def serve_script():
    f = STATIC_DIR / "script.js"
    if f.exists():
        return FileResponse(f, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="script.js not found")



# ==============================================================================
# Model Registry Endpoints
# ==============================================================================

@app.get("/api/models")
async def list_models():
    """
    Returns full model registry with real-time status, licenses, and architecture details.
    """
    return {
        "status": "success",
        "default_model": DEFAULT_MODEL_NAME,
        "models": get_all_models_summary()
    }


# ==============================================================================
# Health and System Info
# ==============================================================================

@app.get("/health")
async def health_check():
    """Application health and default model readiness."""
    default_status, msg = get_model_status(DEFAULT_MODEL_NAME)
    is_ready = (default_status == ModelStatus.READY)
    return {
        "status": "healthy",
        "model_name": DEFAULT_MODEL_NAME,
        "default_model": DEFAULT_MODEL_NAME,
        "model_ready": is_ready,
        "ready": is_ready,
        "default_model_status": default_status.value,
        "status_message": msg,
        "timestamp": time.time()
    }

@app.get("/api/info")
async def system_info():
    """System specifications, limits, and registered models."""
    return {
        "project": "VoiceGuard — AI Deepfake Detection System",
        "service": "VoiceGuard AI Deepfake Detection System",
        "version": "2.5.0",
        "model_name": DEFAULT_MODEL_NAME,
        "default_model": DEFAULT_MODEL_NAME,
        "architecture": "AASIST (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks)",
        "input_sampling_rate_hz": 16000,
        "models": get_all_models_summary(),
        "audio_requirements": {
            "sample_rate_hz": 16000,
            "min_duration_seconds": 0.5,
            "max_duration_seconds": 120.0,
            "max_upload_size_mb": MAX_UPLOAD_SIZE_MB,
            "supported_formats": sorted(list(ALLOWED_EXTENSIONS))
        }
    }


# ==============================================================================
# Audio Detection Endpoint
# ==============================================================================

@app.post("/api/detect")
@app.post("/detect")
async def detect_audio(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    threshold: Optional[float] = Form(DEFAULT_SPOOF_THRESHOLD),
    model_name: Optional[str] = Form(DEFAULT_MODEL_NAME)
):
    """
    Primary forensic deepfake detection endpoint.
    Accepts audio file (under either 'audio' or 'file' parameter) and runs real model inference.
    """
    upload_file = audio or file
    if not upload_file:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No audio file provided in request (provide 'audio' or 'file')."
        )

    # 1. Validate file extension
    filename = upload_file.filename or "audio.wav"
    suffix = Path(filename).suffix.lower()
    if not suffix or suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "error": "UNSUPPORTED_FORMAT",
                "message": f"Unsupported format '{suffix}'. Allowed formats: {sorted(list(ALLOWED_EXTENSIONS))}"
            }
        )

    # 2. Read bytes and enforce size limits
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await upload_file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "error": "EMPTY_FILE",
                "message": "The uploaded audio file is empty (0 bytes)."
            }
        )
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "status": "error",
                "error": "FILE_TOO_LARGE",
                "message": f"File size exceeds maximum upload limit of {MAX_UPLOAD_SIZE_MB}MB."
            }
        )

    # 3. Validate threshold
    thresh = float(threshold) if threshold is not None else DEFAULT_SPOOF_THRESHOLD
    if thresh < 0.0 or thresh > 1.0:
        thresh = DEFAULT_SPOOF_THRESHOLD

    # 4. Resolve selected model
    target_model = (model_name or DEFAULT_MODEL_NAME).strip()

    # 5. Route to External API if selected
    if target_model in EXTERNAL_PROVIDERS:
        manager = ExternalDeepfakeManager.get_instance()
        try:
            res = await manager.detect_audio(content, filename, target_model, thresh)
            res["filename"] = filename
            return JSONResponse(status_code=status.HTTP_200_OK, content=res)
        except ExternalAPIError as ext_err:
            raise HTTPException(
                status_code=ext_err.status_code,
                detail={
                    "status": "error",
                    "error": ext_err.code,
                    "message": ext_err.message,
                    "fallback_available": DEFAULT_MODEL_NAME, "fallback_hint": f"Consider falling back to local {DEFAULT_MODEL_NAME}."
                }
            )

    # 6. Run local inference
    try:
        detector = VoiceGuardDetector.get_instance(target_model)
        result = detector.detect(
            audio_bytes=content,
            filename=filename,
            model_name=target_model,
            threshold=thresh
        )
        result["filename"] = filename
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)

    except ModelUnavailableError as mod_err:
        logger.warning(f"Model unavailable: {mod_err.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "error": "MODEL_UNAVAILABLE",
                "message": f"Selected model '{target_model}' is currently unavailable ({mod_err.status}): {mod_err.message}"
            }
        )
    except AudioProcessingError as audio_err:
        logger.warning(f"Audio processing error ({audio_err.code}): {audio_err.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "error": audio_err.code,
                "message": audio_err.message
            }
        )
    except Exception as e:
        logger.exception("Unexpected error during detection inference.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "error": "INFERENCE_FAILURE",
                "message": f"Internal inference failure: {str(e)}"
            }
        )


# ==============================================================================
# Multi-Model Comparison Endpoint
# ==============================================================================

@app.post("/api/compare")
async def compare_audio_models(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    threshold: Optional[float] = Form(DEFAULT_SPOOF_THRESHOLD)
):
    """
    Evaluates the uploaded audio across all available, ready deepfake models.
    Does not average or invent consensus predictions. Reports agreement or disagreement.
    """
    upload_file = audio or file
    if not upload_file:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No audio file provided for comparison."
        )

    filename = upload_file.filename or "audio.wav"
    suffix = Path(filename).suffix.lower()
    if not suffix or suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "error": "UNSUPPORTED_FORMAT",
                "message": f"Unsupported format '{suffix}'. Allowed: {sorted(list(ALLOWED_EXTENSIONS))}"
            }
        )

    content = await upload_file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "error": "EMPTY_FILE",
                "message": "The uploaded audio file is empty (0 bytes)."
            }
        )

    thresh = float(threshold) if threshold is not None else DEFAULT_SPOOF_THRESHOLD

    try:
        detector = VoiceGuardDetector.get_instance(DEFAULT_MODEL_NAME)
        comparison = detector.compare_models(
            audio_bytes=content,
            filename=filename,
            threshold=thresh
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=comparison)
    except AudioProcessingError as audio_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "error": audio_err.code,
                "message": audio_err.message
            }
        )
    except Exception as e:
        logger.exception("Multi-model comparison error.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "error": "COMPARISON_FAILURE",
                "message": f"Comparison failed: {str(e)}"
            }
        )


# ==============================================================================
# External API Settings Endpoints
# ==============================================================================

class ConfigureAPIRequest(BaseModel):
    provider_id: str = Field(..., description="Provider identifier (e.g. Hive-AI, Resemble-AI)")
    api_key: Optional[str] = Field(None, description="API Key for provider (kept server-side only)")
    endpoint: Optional[str] = Field(None, description="Optional custom HTTPS endpoint (validated against SSRF)")

class TestConnectionRequest(BaseModel):
    provider_id: str = Field(..., description="Provider identifier")
    api_key: Optional[str] = Field(None, description="API Key to test")
    endpoint: Optional[str] = Field(None, description="Endpoint to test")


@app.get("/api/external/providers")
def get_external_providers():
    """Returns available external deepfake detection providers with masked credentials."""
    manager = ExternalDeepfakeManager.get_instance()
    return manager.get_provider_status()

@app.get("/api/external-api/status")
def get_external_providers_alt():
    manager = ExternalDeepfakeManager.get_instance()
    return {
        "status": "success",
        "providers": manager.get_provider_status()
    }

@app.post("/api/external/configure")
@app.post("/api/external-api/configure")
def configure_external_provider(req: ConfigureAPIRequest):
    """Configures server-side credentials for an external provider."""
    if req.provider_id not in EXTERNAL_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown external provider '{req.provider_id}'."
        )

    manager = ExternalDeepfakeManager.get_instance()
    try:
        manager.set_runtime_key(req.provider_id, req.api_key or "", req.endpoint)
    except ExternalAPIError as e:
        raise HTTPException(status_code=e.status_code, detail={"status": "error", "error": e.code, "message": e.message})

    status_info = manager.get_provider_status()[req.provider_id]
    return {
        "status": "success",
        "message": f"Successfully updated server credentials for {req.provider_id}.",
        "provider": status_info
    }

@app.post("/api/external/test-connection")
@app.post("/api/external-api/test")
async def test_external_connection(req: TestConnectionRequest):
    """Executes an authentic connection test against the external provider."""
    manager = ExternalDeepfakeManager.get_instance()
    try:
        result = await manager.test_connection(req.provider_id, req.api_key, req.endpoint)
        return result
    except ExternalAPIError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={
                "status": "error",
                "error": e.code,
                "message": e.message
            }
        )
    except Exception as e:
        logger.error(f"External connection test failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "error": "CONNECTION_TEST_FAILED",
                "message": f"Connection test failed: {str(e)}"
            }
        )


# Mount static assets directory
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")