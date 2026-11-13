"""Real HTTP uploads to the running local service, with no mocked detectors."""
import json
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parent
EXPECTED={'pella':'PellaV2','nii':'NII-AntiDeepfake','prosdd':'ProSDD-Official-ASV2019','forensics':'Forensics-XLSR-Wild'}


def main():
    results=[]
    for name in ('forensics','prosdd','pella','nii'):
        for label in ('bonafide','spoof'):
            path=ROOT.parent/'dataset'/label/f'{label}_001.wav'
            response=requests.post('http://127.0.0.1:8001/api/detect',data={'model':name},
                files={'audio':(path.name,path.read_bytes(),'audio/wav')},timeout=240)
            response.raise_for_status();result=response.json()
            assert result['model_name']==EXPECTED[name]
            assert 0<=result['ai_probability']<=1 and abs(result['ai_probability']+result['human_probability']-1)<1e-6
            results.append({'model':name,'supplied_label':label,'file':path.name,'http_status':response.status_code,'result':result})
            print(name,label,response.status_code,result['prediction'],flush=True)
            (ROOT/'recovery/api_validation.json').write_text(json.dumps(results,indent=2),encoding='utf-8')


if __name__=='__main__':main()
