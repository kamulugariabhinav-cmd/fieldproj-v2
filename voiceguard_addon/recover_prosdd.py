"""Download the public ASVspoof2019 ProSDD release linked by its authors."""
import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

FILE_ID='1RHY-VELyi4XH-L1egeRcgWjHdkdWV2bO'
EXPECTED_BYTES=1265875476
ROOT=Path(__file__).resolve().parent/'weights'/'prosdd'


def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    target=ROOT/'official_asv2019.pth';partial=ROOT/'official_asv2019.pth.part'
    if not target.exists():
        offset=partial.stat().st_size if partial.exists() else 0
        chunk_size=8*1024*1024
        def fetch(start):
            end=min(EXPECTED_BYTES-1,start+chunk_size-1)
            for attempt in range(4):
                try:
                    response=requests.get('https://drive.usercontent.google.com/download',
                        params={'id':FILE_ID,'export':'download','confirm':'t'},
                        headers={'Range':f'bytes={start}-{end}'},timeout=(30,90))
                    response.raise_for_status()
                    expected=f'bytes {start}-{end}/{EXPECTED_BYTES}'
                    if response.status_code!=206 or response.headers.get('Content-Range')!=expected or len(response.content)!=end-start+1:
                        raise RuntimeError('Google Drive returned an invalid checkpoint range')
                    return response.content
                except requests.RequestException:
                    if attempt==3:raise
                    time.sleep(2**attempt)
        with ThreadPoolExecutor(max_workers=4) as pool,partial.open('ab') as output:
            while offset<EXPECTED_BYTES:
                positions=list(range(offset,min(EXPECTED_BYTES,offset+chunk_size*4),chunk_size))
                chunks=list(pool.map(fetch,positions))
                for chunk in chunks:output.write(chunk);offset+=len(chunk)
                output.flush();print(f'ProSDD download: {offset}/{EXPECTED_BYTES} bytes',flush=True)
        if partial.stat().st_size!=EXPECTED_BYTES:raise RuntimeError('Official ProSDD download size mismatch')
        partial.rename(target)
    with target.open('rb') as checkpoint:digest=hashlib.file_digest(checkpoint,'sha256').hexdigest()
    (ROOT/'verification.json').write_text(json.dumps({'source':'https://github.com/ProSDD/codes',
        'drive_file_id':FILE_ID,'release':'ProSDD_Trained2019','bytes':target.stat().st_size,
        'sha256':digest,'hash_status':'Locally computed; authors do not publish a reference SHA256',
        'private_epoch4_classifier_recovered':False},indent=2))
    print('Official ProSDD ASV2019 release recovered:',digest,flush=True)


if __name__=='__main__':main()
