"""Validate strict loading and real inference before enabling recovered models."""
import json
import argparse
from pathlib import Path

from backend.audio_processor import decode_audio_bytes
from voiceguard_addon.worker_client import inference

ROOT=Path(__file__).resolve().parent


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--models',nargs='+',default=['forensics','prosdd','pella','nii']);args=parser.parse_args()
    reports={}
    for name in args.models:
        results=[]
        for label in ('bonafide','spoof'):
            path=ROOT.parent/'dataset'/label/f'{label}_001.wav'
            waveform,rate,_,_=decode_audio_bytes(path.read_bytes(),path.name)
            assert rate==16000
            result=inference(name,waveform)
            ai=result['ai_probability'];human=result['human_probability']
            assert 0<=ai<=1 and 0<=human<=1 and abs(ai+human-1)<1e-6
            results.append({'file':str(path.relative_to(ROOT.parent)),'supplied_label':label,'result':result})
            print(name,label,result['prediction'],round(ai,6),flush=True)
        report={'scope':'Checkpoint architecture/loading and labeled-project-sample inference smoke checks; not an independent accuracy benchmark',
                'model':name,'samples':results}
        reports[name]=report
        directory=ROOT/'weights'/name;directory.mkdir(parents=True,exist_ok=True)
        (directory/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    for name in ('forensics','prosdd','pella','nii'):
        path=ROOT/'weights'/name/'validation.json'
        if path.is_file():reports[name]=json.loads(path.read_text(encoding='utf-8'))
    (ROOT/'recovery/model_validation.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')


if __name__=='__main__':main()
