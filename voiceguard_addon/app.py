"""Opt-in server extending the original app without editing its source."""
import asyncio
import gc
import logging
import threading
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from voiceguard_addon.ui import supporting_page
from voiceguard_addon.pages import render_dashboard, render_home, render_script, render_public_config

from voiceguard_addon import legacy as original
from backend.audio_processor import decode_audio_bytes, AudioProcessingError
from voiceguard_addon.worker_client import runtime_ready

ROOT = Path(__file__).resolve().parent.parent


def recovered_model_ready(name):
    directory=ROOT/'voiceguard_addon/weights'/name
    checkpoint={'prosdd':'official_asv2019.pth','forensics':'checkpoint_epoch_4.safetensors'}.get(name)
    return bool(checkpoint and (directory/checkpoint).is_file() and (directory/'validation.json').is_file()
                and runtime_ready())


def missing_model_weights(name):
    if recovered_model_ready(name):return ''
    required = {
        'prosdd': [ROOT / 'backend/models/prosdd/classifier_epoch_04.pth',
                   ROOT / 'backend/models/prosdd/pro_sdd_ready.pth'],
        'forensics': [ROOT / 'backend/models/forensics/checkpoint_epoch_4.safetensors'],
    }
    missing = [path.name for path in required.get(name, []) if not path.is_file()]
    return ', '.join(missing)


app = FastAPI(title="VoiceGuard with Pella and NII")
from voiceguard_addon.exports import router as export_router
app.include_router(export_router)
from voiceguard_addon.database import router as database_router
app.include_router(database_router)
from voiceguard_addon.accounts import router as accounts_router
app.include_router(accounts_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["GET", "POST"], allow_headers=["*"])
detectors = {}
load_lock = threading.Lock()
inference_lock = threading.Lock()


def get_detector(name):
    with load_lock:
        if name not in detectors:
            # This machine has limited RAM; retain only one optional model.
            detectors.clear()
            gc.collect()
            if runtime_ready():
                from voiceguard_addon.worker_client import DetectorProxy
                detectors[name] = DetectorProxy(name)
            else:
                from voiceguard_addon.models import Detector
                detectors[name] = Detector(name)
    return detectors[name]


def run_inference(name, waveform):
    # Serialize switching/loading as well as inference to bound resident memory.
    with inference_lock:
        return get_detector(name).detect_waveform(waveform)


@app.get("/dashboard", include_in_schema=False)
def dashboard(request: Request):
    return HTMLResponse(render_dashboard(str(request.base_url), recovered_model_ready, missing_model_weights), headers={"Cache-Control": "no-store"})


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def home(request: Request):
    return HTMLResponse(render_home(str(request.base_url), recovered_model_ready))


@app.get('/public-config.js', include_in_schema=False)
def public_firebase_config():
    return Response(render_public_config(), media_type="application/javascript")


@app.get('/api/public-demo/{sample}', include_in_schema=False)
def public_audio_sample(sample: str):
    paths = {'human': ROOT / 'dataset/bonafide/bonafide_001.wav',
             'synthetic': ROOT / 'dataset/spoof/spoof_001.wav'}
    path = paths.get(sample)
    if path is None or not path.is_file():
        raise HTTPException(404, 'Project audio sample unavailable.')
    return FileResponse(path, media_type='audio/wav')


@app.get("/voiceguard.js", include_in_schema=False)
def javascript():
    return Response(render_script(), media_type="application/javascript", headers={"Cache-Control": "no-store"})


@app.get("/config.js", include_in_schema=False)
def config_file():
    return FileResponse(ROOT / "config.js", media_type="application/javascript")


@app.get("/firebase-config.js", include_in_schema=False)
def firebase_config_file():
    return FileResponse(ROOT / "firebase-config.js", media_type="application/javascript")


@app.post("/api/detect")
@app.post("/detect")
async def detect(audio: UploadFile = File(...), model: str = Form("prosdd")):
    name = model.strip().lower()
    if name in {"prosdd", "forensics"} and not recovered_model_ready(name):
        missing = missing_model_weights(name)
        if missing:
            raise HTTPException(503, f"{name} is unavailable: trained checkpoint missing ({missing}). Choose Pella or NII.")
        return await original.detect_audio(audio=audio, model=name)
    if name not in {"pella", "nii", "prosdd", "forensics"}:
        raise HTTPException(400, "Choose prosdd, forensics, pella, or nii.")
    filename = audio.filename or "recording.wav"
    if Path(filename).suffix.lower() not in original.ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Unsupported audio format")
    content = await audio.read(original.MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(400, "Uploaded audio file is empty.")
    if len(content) > original.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Maximum file size is 25 MB.")
    try:
        waveform, sample_rate, _, _ = await asyncio.to_thread(decode_audio_bytes, content, filename)
        if sample_rate != 16000:
            raise ValueError("Expected decoded audio at 16000 Hz")
        result = await asyncio.to_thread(run_inference, name, waveform)
        result["filename"] = filename
        return result
    except (AudioProcessingError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except (FileNotFoundError, OSError) as exc:
        logging.exception("Add-on checkpoint unavailable")
        raise HTTPException(503, f"{name} model runtime or checkpoint could not load. Check backend logs.") from exc
    except Exception as exc:
        logging.exception("Add-on inference failed")
        raise HTTPException(500, f"{name} inference failed; check backend logs.") from exc


@app.get("/api/addon/status")
def status():
    isolated=runtime_ready()
    return {"pella_loaded": not isolated and "pella" in detectors, "nii_loaded": not isolated and "nii" in detectors,
            "inference_mode": "isolated worker per request" if isolated else "in-process",
            "pipeline_checked": {name:(ROOT/'voiceguard_addon/weights'/name/'validation.json').is_file() for name in ('pella','nii','prosdd','forensics')},
            "nii_checkpoint_present": (ROOT / "voiceguard_addon/weights/nii/model.safetensors").is_file()}


@app.get("/about", response_class=HTMLResponse)
def about_page(request: Request):
    return supporting_page("about").replace('content="/assets/voiceguard-social.png"', f'content="{request.base_url}assets/voiceguard-social.png"')


@app.get("/guide", response_class=HTMLResponse)
def guide_page(request: Request):
    return supporting_page("guide").replace('content="/assets/voiceguard-social.png"', f'content="{request.base_url}assets/voiceguard-social.png"')


@app.get("/contact", response_class=HTMLResponse)
def contact_page(request: Request):
    return supporting_page("contact").replace('content="/assets/voiceguard-social.png"', f'content="{request.base_url}assets/voiceguard-social.png"')


app.mount("/assets", StaticFiles(directory=ROOT / "voiceguard_addon" / "assets"), name="addon-assets")
# All other existing routes and existing model behavior remain available.
app.mount("/", original.app)
