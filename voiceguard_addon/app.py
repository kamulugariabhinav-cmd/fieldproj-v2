"""Opt-in server extending the original app without editing its source."""
import asyncio
import gc
import json
import logging
import re
import threading
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from voiceguard_addon.ui import refine_html, refine_script, supporting_page
from voiceguard_addon.presentation import polish

from voiceguard_addon import legacy as original
from backend.audio_processor import decode_audio_bytes, AudioProcessingError

ROOT = Path(__file__).resolve().parent.parent


def recovered_model_ready(name):
    directory=ROOT/'voiceguard_addon/weights'/name
    checkpoint={'prosdd':'official_asv2019.pth','forensics':'checkpoint_epoch_4.safetensors'}.get(name)
    return bool(checkpoint and (directory/checkpoint).is_file() and (directory/'validation.json').is_file()
                and (ROOT/'voiceguard_addon/.inference-env/ready.json').is_file())


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
            if (ROOT/'voiceguard_addon/.inference-env/ready.json').is_file():
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
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    marker = '<select id="modelSelect" class="field">'
    if html.count(marker) != 1:
        raise RuntimeError("Original model selector changed; update the optional add-on")
    html = html.replace(marker, marker + '\n<option value="pella">Pella // PellaV2</option>'
                        '\n<option value="nii">NII // AntiDeepfake MMS-300M</option>')
    html = html.replace('<option value="pella">', '<option value="pella" selected>')
    if recovered_model_ready('prosdd'):
        html=re.sub(r'(<option value="prosdd">).*?(</option>)',r'\1ProSDD // Official ASVspoof2019\2',html)
    for name in ('prosdd', 'forensics'):
        if missing_model_weights(name):
            html = re.sub(r'<option value="' + name + r'">(.*?)</option>',
                lambda match: '<option value="' + name + '" disabled>' + match[1] + ' (checkpoint missing)</option>', html)
    return HTMLResponse(refine_html(html).replace('content="/assets/voiceguard-social.png"',
        f'content="{request.base_url}assets/voiceguard-social.png"'))


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def home(request: Request):
    html = (ROOT / 'voiceguard_addon/assets/homepage.html').read_text(encoding='utf-8')
    if recovered_model_ready('prosdd') and recovered_model_ready('forensics'):
        html=html.replace('2 trained detectors','4 trained detectors')
        html=html.replace('PellaV2 and NII AntiDeepfake have trained weights installed. The dashboard also lists ProSDD and Forensics; they stay unavailable until their required checkpoints are supplied.',
            'PellaV2, NII AntiDeepfake, Forensics XLS-R Wild, and the official ProSDD ASVspoof2019 release are installed and have passed project-sample inference checks. The public ProSDD release is distinct from the private epoch-4 fine-tune previously configured here.')
    return HTMLResponse(polish(html,'home').replace('content="/assets/voiceguard-social.png"',
        f'content="{request.base_url}assets/voiceguard-social.png"'))


@app.get('/public-config.js', include_in_schema=False)
def public_firebase_config():
    source = (ROOT / 'voiceguard.js').read_text(encoding='utf-8')
    config = {}
    for key in ('apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'):
        match = re.search(r'\b' + key + r':\s*"([^"]+)"', source)
        if match:
            config[key] = match[1]
    return Response('window.VOICEGUARD_FIREBASE_CONFIG=' + json.dumps(config).replace('<','\\u003c') + ';',
                    media_type='application/javascript')


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
    source = (ROOT / "voiceguard.js").read_text(encoding="utf-8")
    # The original points at a fixed external tunnel. The opt-in server must
    # send uploads to its own Pella/NII endpoints instead.
    source, count = re.subn(r'^const API_BASE = [^\n]+;', 'const API_BASE = "";', source,
                            count=1, flags=re.MULTILINE)
    if count != 1:
        raise RuntimeError("Original API configuration changed; update the optional add-on")
    replacements = {
        'const forensics = data.model_name === "Forensics-XLSR-Wild";':
        'const addon = ["PellaV2", "NII-AntiDeepfake", "ProSDD-Official-ASV2019"].includes(data.model_name);\n'
        '  const forensics = addon || data.model_name === "Forensics-XLSR-Wild";',
        'forensics ? "XLS-R Wild" : "ProSDD"':
        'addon ? data.model_name : (forensics ? "XLS-R Wild" : "ProSDD")',
    }
    for old, new in replacements.items():
        if source.count(old) != 1:
            raise RuntimeError("Original result renderer changed; update the optional add-on")
        source = source.replace(old, new)
    return Response(refine_script(source), media_type="application/javascript")


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
    isolated=(ROOT/'voiceguard_addon/.inference-env/ready.json').is_file()
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
