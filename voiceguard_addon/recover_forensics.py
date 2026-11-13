"""Recover the official Forensics release into add-on storage with SHA256."""
import hashlib
import json
import time
from pathlib import Path
import requests

REPO='eliya/forensics_0.3B_xlsr_wild_deepfake_classifier'
REV='0cbc87b3fbd683ff8c8c961bcf244a8d5f1bcf02'
ROOT=Path(__file__).resolve().parent/'weights'/'forensics'


def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    metadata=requests.get(f'https://huggingface.co/api/models/{REPO}/revision/{REV}',params={'blobs':'true'},timeout=60)
    metadata.raise_for_status();metadata=metadata.json()
    file=next(item for item in metadata['siblings'] if item['rfilename']=='checkpoint_epoch_4.safetensors')
    target=ROOT/file['rfilename'];partial=target.with_suffix('.safetensors.part')
    if not target.exists():
        for attempt in range(5):
            offset=partial.stat().st_size if partial.exists() else 0
            try:
                with requests.get(f'https://huggingface.co/{REPO}/resolve/{REV}/{file["rfilename"]}',
                    headers={'Range':f'bytes={offset}-'},stream=True,timeout=(30,90)) as stream:
                    stream.raise_for_status()
                    with partial.open('ab' if offset and stream.status_code==206 else 'wb') as output:
                        for chunk in stream.iter_content(4*1024*1024):output.write(chunk)
                break
            except requests.RequestException:
                if attempt==4:raise
                time.sleep(2**attempt)
        candidate=partial
    else:candidate=target
    with candidate.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
    if digest!=file['lfs']['sha256']:raise RuntimeError('Forensics checkpoint SHA256 mismatch')
    if candidate==partial:partial.rename(target)
    for name in ('config.json','README.md','model.py','inference.py'):
        response=requests.get(f'https://huggingface.co/{REPO}/resolve/{REV}/{name}',timeout=60)
        response.raise_for_status();(ROOT/name).write_bytes(response.content)
    (ROOT/'verification.json').write_text(json.dumps({'repository':REPO,'revision':REV,'sha256':digest,'bytes':target.stat().st_size},indent=2))
    print('Official Forensics weights recovered and verified:',digest,flush=True)


if __name__=='__main__':main()
