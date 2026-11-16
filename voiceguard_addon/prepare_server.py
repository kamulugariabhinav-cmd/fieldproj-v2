"""Explicit first-server setup: download real releases, then smoke-test all models."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def main():
    from voiceguard_addon.worker_client import runtime_ready
    if not runtime_ready():
        raise RuntimeError('The isolated CPU runtime is not installed and checked')
    from huggingface_hub import snapshot_download
    from voiceguard_addon.models import PELLA_REPO, PELLA_REV
    (ROOT / 'weights').mkdir(parents=True, exist_ok=True)
    (ROOT / 'recovery').mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'configs/xlsr-config.json', ROOT / 'weights/xlsr-config.json')
    snapshot_download(PELLA_REPO, revision=PELLA_REV,
                      allow_patterns=['config.json', 'preprocessor_config.json', 'model.safetensors', 'pytorch_model.bin'])
    for module in ('download_nii', 'recover_forensics', 'recover_prosdd', 'validate_recovered'):
        subprocess.run([sys.executable, '-B', '-m', 'voiceguard_addon.' + module],
                       cwd=ROOT.parent, check=True)
    print('All four real model releases passed project-sample smoke checks; not an accuracy benchmark.', flush=True)


if __name__ == '__main__':
    main()
