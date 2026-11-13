"""Bounded history export API, using an isolated document runtime."""
import json
import logging
import math
import os
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

router=APIRouter()
TYPES={"pdf":"application/pdf","xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
       "docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


def runtime():
    configured=os.getenv("VOICEGUARD_EXPORT_PYTHON")
    if configured:return configured
    config=Path(__file__).with_name('export_runtime.json')
    if config.exists():
        candidate=Path(json.loads(config.read_text(encoding='utf-8'))['python'])
        if candidate.is_file():return str(candidate)
    roots=Path(os.getenv("ProgramFiles","C:/Program Files")) / "WindowsApps"
    candidates=sorted(roots.glob('OpenAI.CodexPrimaryRuntime.*/dependencies/python/python.exe'))
    return str(candidates[-1]) if candidates else sys.executable


def validate(data):
    records=data.get('records') if isinstance(data,dict) else None
    if not isinstance(records,list) or not 1<=len(records)<=100:
        raise HTTPException(400,"Export requires between 1 and 100 history records.")
    clean=[]
    for record in records:
        if not isinstance(record,dict):raise HTTPException(400,"Invalid history record.")
        row={}
        for key in ('date','filename','model','prediction'):
            value=record.get(key,'')
            if not isinstance(value,str) or len(value)>1000 or any(ord(c)<32 for c in value):
                raise HTTPException(400,"History fields must be plain text, up to 1000 characters.")
            row[key]=value
        score=record.get('score')
        if isinstance(score,bool) or not isinstance(score,(float,int)) or not math.isfinite(score) or not 0<=score<=100:
            raise HTTPException(400,"History scores must be finite percentages from 0 to 100.")
        row['score']=score;clean.append(row)
    return clean


@router.post('/api/history/export/{kind}')
async def export_history(kind:str,request:Request):
    if kind not in TYPES:raise HTTPException(400,"Choose PDF, XLSX, or DOCX.")
    content=bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content)>512000:raise HTTPException(413,"Export payload is too large.")
    try:data=json.loads(content)
    except (ValueError,UnicodeError):raise HTTPException(400,"Invalid export data.")
    records=validate(data)
    import asyncio
    def generate():
        return subprocess.run([runtime(),'-B',str(Path(__file__).with_name('export_history.py')),kind],
            input=json.dumps({'records':records}).encode('utf-8'),capture_output=True,timeout=60,
            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    try:result=await asyncio.to_thread(generate)
    except (OSError,subprocess.TimeoutExpired) as exc:raise HTTPException(503,"Export runtime unavailable or timed out.") from exc
    if result.returncode:
        logging.error("History export failed: %s",result.stderr.decode('utf-8',errors='replace'))
        raise HTTPException(503,"Export could not be generated. Install the add-on export requirements or configure VOICEGUARD_EXPORT_PYTHON.")
    return Response(result.stdout,media_type=TYPES[kind],headers={
        'Content-Disposition':f'attachment; filename="voiceguard-history.{kind}"','Cache-Control':'no-store'})
