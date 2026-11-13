"""Isolated CPU worker; keeps model dependencies out of the web server."""
import contextlib
import json
import os
import sys

import numpy as np
import torch


def main():
    torch.set_num_threads(min(4,max(1,os.cpu_count() or 1)))
    name,path=sys.argv[1:3]
    waveform=np.load(path,allow_pickle=False)
    with contextlib.redirect_stdout(sys.stderr):
        if name in {'pella','nii'}:
            from voiceguard_addon.models import Detector
            detector=Detector(name)
        else:
            from voiceguard_addon.recovered_models import RecoveredDetector
            detector=RecoveredDetector(name)
        result=detector.detect_waveform(waveform)
    print(json.dumps(result),flush=True)


if __name__=='__main__':main()
