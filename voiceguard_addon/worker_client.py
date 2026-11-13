"""Bounded process isolation for memory-heavy model inference."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

import numpy as np

ROOT=Path(__file__).resolve().parent


class DetectorProxy:
    def __init__(self,name):self.name=name
    def detect_waveform(self,waveform):return inference(self.name,waveform)


def inference(name,waveform):
    python=Path(os.getenv('VOICEGUARD_INFERENCE_PYTHON',str(ROOT/'.inference-env/Scripts/python.exe')))
    if not python.is_file():raise OSError('The isolated inference runtime is not installed')
    with tempfile.TemporaryDirectory(prefix='voiceguard-inference-') as temporary:
        path=Path(temporary)/'audio.npy';np.save(path,np.asarray(waveform,dtype=np.float32),allow_pickle=False)
        process=subprocess.run([str(python),'-B','-m','voiceguard_addon.model_worker',name,str(path)],
            cwd=ROOT.parent,capture_output=True,timeout=240,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    if process.returncode:
        raise RuntimeError('Isolated inference failed: '+process.stderr.decode('utf-8',errors='replace')[-5000:])
    return json.loads(process.stdout)
