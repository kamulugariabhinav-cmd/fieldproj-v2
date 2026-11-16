(() => {
  const audio=document.getElementById('sampleAudio'),seek=document.getElementById('sampleSeek'),volume=document.getElementById('sampleVolume');
  audio.volume=.8;
  seek.disabled=true;
  audio.addEventListener('loadedmetadata',()=>{seek.disabled=!Number.isFinite(audio.duration)||audio.duration<=0;});
  seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(seek.value)/100*audio.duration;});
  volume.addEventListener('input',()=>{audio.volume=Number(volume.value)/100;});
  audio.addEventListener('timeupdate',()=>{seek.value=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration*100:0;});
  audio.addEventListener('emptied',()=>{seek.value=0;seek.disabled=true;});
  const steps=[
    ['Start with the original recording.','Choose a supported audio file under 25 MB. Keep the original rather than repeatedly converting it. You can also record in your browser after granting microphone permission.','Open the upload workspace ↗','/dashboard'],
    ['Compare trained detectors on the same audio.','Choose Forensics, PellaV2, NII AntiDeepfake, or ProSDD. Start the scan and wait for the backend result. Different models can disagree, and a high score can still be wrong.','Explore the available models ↓','#models'],
    ['Keep the result and its context together.','Review the model name, score, recording length, and warnings. Your saved history can be searched and exported as PDF, Excel, Word, or JSON.','Read the recording and results guide ↗','/guide']
  ];
  const buttons=[...document.querySelectorAll('[data-step]')];
  function select(button){
    buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    const [title,description,label,href]=steps[Number(button.dataset.step)];
    document.getElementById('stepTitle').textContent=title;document.getElementById('stepDescription').textContent=description;
    const link=document.getElementById('stepAction');link.textContent=label;link.href=href;
  }
  buttons.forEach(button=>button.addEventListener('click',()=>select(button)));
  const checks=[...document.querySelectorAll('[data-readiness]')];
  checks.forEach(check=>check.addEventListener('change',()=>{
    const count=checks.filter(item=>item.checked).length;
    const tip=!checks[0].checked?'Start with permission to use the audio.':!checks[1].checked?'Try a clearer recording with one speaker.':!checks[2].checked?'Plan to review independent evidence alongside the score.':'Checklist complete. You can move to the dashboard; model results still need careful review.';
    document.getElementById('readinessStatus').textContent=`${count} of 3 checked. ${tip}`;
  }));
})();
