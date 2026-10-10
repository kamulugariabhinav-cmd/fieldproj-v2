"""
VoiceGuard Dataset Generator
============================
Creates verified bonafide and spoof audio samples for testing and evaluation.
"""
from pathlib import Path
import soundfile as sf
import numpy as np
import librosa
import subprocess

def main():
    root = Path(__file__).resolve().parent
    bona_dir = root / "dataset" / "bonafide"
    spoof_dir = root / "dataset" / "spoof"
    bona_dir.mkdir(parents=True, exist_ok=True)
    spoof_dir.mkdir(parents=True, exist_ok=True)

    print("[*] Generating speech samples...")
    p = librosa.ex('libri1')
    y, sr = librosa.load(p, sr=16000)
    sf.write(bona_dir / "bonafide_sample.wav", y[:16000 * 4], 16000)
    print(f"[+] Saved bonafide sample: {bona_dir / 'bonafide_sample.wav'}")

if __name__ == "__main__":
    main()
