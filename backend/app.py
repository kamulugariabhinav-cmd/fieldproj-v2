"""
VoiceGuard API
==============
AI-generated speech detection using fine-tuned ProSDD Stage-2 Epoch-4.
"""

import asyncio
import logging
import threading
import time
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.audio_processor import AudioProcessingError, decode_audio_bytes
from backend.models.prosdd.prosdd_epoch4 import (
    MODEL_ID,
    ProSDDEpoch4Detector,
)
from backend.models.forensics.forensics_detector import (
    ForensicsDetector,
)

# --------------------------------------------------
# Configuration
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voiceguard")

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MAX_UPLOAD_SIZE_MB = 25
MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a",
    ".aac",
    ".mp4",
    ".webm",
}

# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="VoiceGuard API",
    description="AI-generated speech detection using ProSDD Stage-2 Epoch-4",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# --------------------------------------------------
# ProSDD detector
# --------------------------------------------------

_detector = None
_detector_lock = threading.Lock()


def get_detector():
    global _detector

    if _detector is None:
        with _detector_lock:
            if _detector is None:
                logger.info("Loading ProSDD Stage-2 Epoch-4 model...")
                _detector = ProSDDEpoch4Detector()
                logger.info("ProSDD model loaded successfully.")

    return _detector


# --------------------------------------------------
# Forensics detector
# --------------------------------------------------

_forensics_detector = None
_forensics_lock = threading.Lock()


def get_forensics_detector():
    global _forensics_detector

    if _forensics_detector is None:
        with _forensics_lock:
            if _forensics_detector is None:
                logger.info("Loading Forensics XLS-R Wild model...")
                _forensics_detector = ForensicsDetector()
                logger.info("Forensics model loaded successfully.")

    return _forensics_detector


# --------------------------------------------------
# Health endpoint
# --------------------------------------------------

@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "model_name": MODEL_ID,
        "model_ready": _detector is not None,
        "ready": _detector is not None,
        "timestamp": time.time(),
    }


# --------------------------------------------------
# Audio detection
# --------------------------------------------------

@app.post("/api/detect")
@app.post("/detect")
async def detect_audio(
    audio: UploadFile = File(...),
    model: str = Form("prosdd"),
):

    filename = audio.filename or "recording.wav"
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {extension}",
        )

    content = await audio.read(MAX_UPLOAD_BYTES + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty.",
        )

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Maximum file size is {MAX_UPLOAD_SIZE_MB} MB.",
        )

    try:
        waveform, sample_rate, duration, stats = decode_audio_bytes(
            content,
            filename,
        )

        if sample_rate != 16000:
            raise ValueError(
                f"Expected 16000 Hz audio, received {sample_rate} Hz."
            )

        loop = asyncio.get_running_loop()

        selected_model = model.strip().lower()

        if selected_model == "prosdd":
            detector_factory = get_detector

        elif selected_model == "forensics":
            detector_factory = get_forensics_detector

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid model. Choose 'prosdd' or 'forensics'.",
            )

        detector = await loop.run_in_executor(
            None,
            detector_factory,
        )

        result = await loop.run_in_executor(
            None,
            detector.detect_waveform,
            waveform,
        )

        result["filename"] = filename

        return result
    
    except HTTPException:
        raise
    
    except AudioProcessingError as exc:
        logger.warning("Audio processing failed: %s", exc)
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception:
        logger.exception("ProSDD inference failed.")
        raise HTTPException(
            status_code=500,
            detail="Audio analysis failed. Check backend logs.",
        )


# --------------------------------------------------
# Frontend files for local testing
# --------------------------------------------------

@app.get("/", include_in_schema=False)
async def serve_home():
    return FileResponse(PROJECT_ROOT / "index.html")


@app.get("/index.html", include_in_schema=False)
async def serve_index():
    return FileResponse(PROJECT_ROOT / "index.html")


@app.get("/style.css", include_in_schema=False)
async def serve_css():
    return FileResponse(
        PROJECT_ROOT / "style.css",
        media_type="text/css",
    )


@app.get("/voiceguard.js", include_in_schema=False)
async def serve_javascript():
    return FileResponse(
        PROJECT_ROOT / "voiceguard.js",
        media_type="application/javascript",
    )