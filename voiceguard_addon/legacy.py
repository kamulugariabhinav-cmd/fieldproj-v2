"""Load optional legacy model libraries only when legacy inference is requested."""
from pathlib import Path
import time
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

ROOT=Path(__file__).resolve().parent.parent
MAX_UPLOAD_BYTES=25*1024*1024
ALLOWED_EXTENSIONS={'.wav','.mp3','.flac','.ogg','.m4a','.aac','.mp4','.webm'}
app=FastAPI()


async def detect_audio(*,audio,model):
    try:
        from backend.app import detect_audio as detect
    except (ImportError,OSError) as exc:
        raise HTTPException(503,'The model runtime could not load. Check backend logs for the blocked or missing audio dependency.') from exc
    return await detect(audio=audio,model=model)


@app.get('/style.css',include_in_schema=False)
def stylesheet():
    return FileResponse(ROOT/'style.css',media_type='text/css')


@app.get('/health')
@app.get('/api/health')
def health():
    return {'status':'healthy','model_ready':False,'ready':False,
            'inference_loading':'on demand','timestamp':time.time()}
