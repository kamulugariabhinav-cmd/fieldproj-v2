"""Strict inference adapters for the authors' published model releases."""
import importlib.util
import time
from pathlib import Path
from unittest.mock import patch

import numpy as np
import torch
from safetensors.torch import load_file
from transformers import Wav2Vec2Config, Wav2Vec2Model

ROOT=Path(__file__).resolve().parent


def build_from_source(path,class_name,**kwargs):
    spec=importlib.util.spec_from_file_location('voiceguard_recovered_'+class_name,str(path))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    config=Wav2Vec2Config.from_json_file(str(ROOT/'weights/xlsr-config.json'))
    config._attn_implementation='eager'
    # Full checkpoints contain the backbone. Never download or initialize a
    # second 300M model, and never run any parameter left on the meta device.
    with torch.device('meta'),patch.object(module.Wav2Vec2Model,'from_pretrained',side_effect=lambda *a,**k:Wav2Vec2Model(config)):
        model=getattr(module,class_name)(**kwargs)
    return model


class RecoveredDetector:
    def __init__(self,name):
        self.name=name
        if name=='forensics':
            self.model=build_from_source(ROOT.parent/'backend/models/forensics/model.py','DeepfakeDetector')
            state=load_file(str(ROOT/'weights/forensics/checkpoint_epoch_4.safetensors'))
            unused={'projection.0.bias','projection.0.weight','projection.2.bias','projection.2.weight'}
            actual=set(state)-set(self.model.state_dict())
            if actual!=unused:raise RuntimeError(f'Unexpected Forensics extra weights: {actual}')
            for key in unused:state.pop(key)
            self.model_id='Forensics-XLSR-Wild'
        elif name=='prosdd':
            self.model=build_from_source(ROOT.parent/'backend/models/prosdd/model_stage2realfake.py','ProSDDStage2',classifier_pool='mean',T_target=200,num_classes=2)
            state=torch.load(ROOT/'weights/prosdd/official_asv2019.pth',map_location='cpu',weights_only=True,mmap=True)
            if 'state_dict' in state:state=state['state_dict']
            state={key.removeprefix('module.'):value for key,value in state.items()}
            self.model_id='ProSDD-Official-ASV2019'
        else:raise ValueError('Unknown recovered model')
        self.model.load_state_dict(state,strict=True,assign=True)
        if any(parameter.is_meta for parameter in self.model.parameters()):raise RuntimeError('Unloaded model parameter')
        self.model.eval()

    @torch.inference_mode()
    def detect_waveform(self,waveform):
        started=time.perf_counter();audio=np.asarray(waveform,dtype=np.float32).reshape(-1)
        if not audio.size or not np.isfinite(audio).all():raise ValueError('Audio must contain finite samples')
        duration=len(audio)/16000
        if self.name=='forensics':
            audio=audio/(np.max(np.abs(audio))+1e-8);target=80000
            if len(audio)<target:audio=np.tile(audio,(target+len(audio)-1)//len(audio))[:target]
            else:start=(len(audio)-target)//2;audio=audio[start:start+target]
            human=torch.sigmoid(self.model(torch.from_numpy(audio.copy()).unsqueeze(0)).float()).item();score=1-human
            warnings=['Uses the published five-second center crop or repetition preprocessing.']
        else:
            target=64000
            if len(audio)>=target:start=(len(audio)-target)//2;audio=audio[start:start+target]
            else:left=(target-len(audio))//2;audio=np.pad(audio,(left,target-len(audio)-left))
            wav=torch.from_numpy(audio.copy()).unsqueeze(0)
            z=self.model.ssl.feature_extractor(wav).transpose(1,2)
            z=self.model.ssl.feature_projection(z)[0]
            if z.shape[1]>200:z=z[:,:200,:]
            elif z.shape[1]<200:z=torch.cat([z,z.new_zeros(z.shape[0],200-z.shape[1],z.shape[2])],dim=1)
            context=self.model.ssl.encoder(z,attention_mask=None,output_hidden_states=False,return_dict=True).last_hidden_state
            score=torch.softmax(self.model.cls_head(context.mean(dim=1)).float(),dim=1)[0,0].item()
            warnings=['Official ASVspoof2019 release, not the private epoch-4 fine-tuned classifier.',
                      'Uses the authors\' center four-second crop or centered zero padding.',
                      'The 0.5 decision point is uncalibrated; the private model threshold does not apply.']
        if not np.isfinite(score):raise RuntimeError('Model returned a non-finite score')
        return {'model_name':self.model_id,'prediction':'AI Detected' if score>=.5 else 'Human Detected',
                'ai_probability':score,'human_probability':1-score,'confidence':max(score,1-score),
                'score_calibrated':False,'audio_duration_seconds':duration,'windows_analyzed':1,
                'inference_time_ms':(time.perf_counter()-started)*1000,
                'warnings':warnings+['Experimental score; verify against independent evidence.']}
