/* Real PCM waveform display. No generated peaks or fabricated progress. */
(() => {
  const analysis=document.getElementById('analyzingDisplay');
  const canvas=document.getElementById('analysisWaveform');
  if(!analysis||!canvas)return;
  const status=document.getElementById('waveformStatus'),preview=document.getElementById('audioPreview');
  const recordPanel=document.getElementById('recordPanel');
  const recorderTrace=document.createElement('div');recorderTrace.className='audio-trace recorder-trace';
  recorderTrace.innerHTML='<canvas id="recordingWaveform" aria-label="Microphone audio levels"></canvas><p id="recordingWaveformStatus">Microphone is off</p><button type="button" id="pauseRecording" class="ghost-button" disabled>Pause recording</button>';
  recordPanel?.appendChild(recorderTrace);
  const recordCanvas=document.getElementById('recordingWaveform'),pauseRecording=document.getElementById('pauseRecording');
  const awaitingCanvas=document.getElementById('awaitingWaveform');
  let buffer=null,decodedFile=null,decodeVersion=0,decodeError=false,paused=false,started=0,activeBefore=false,frameId,lastDraw=0;
  let elapsedTimer,elapsedStart=0,liveSamples=new Uint8Array(256),wrappedWindow=null;
  const flat=()=>new Float32Array(256);
  const isRecording=()=>typeof mediaRecorder!=='undefined'&&mediaRecorder?.state==='recording';
  const isLive=()=>typeof liveActive!=='undefined'&&liveActive;
  async function decode(file){
    const version=++decodeVersion;buffer=null;decodedFile=file;decodeError=false;
    if(!file)return;
    try{
      ensureAudioContext();
      const decoded=await audioContext.decodeAudioData(await file.arrayBuffer());
      if(version===decodeVersion){buffer=decoded;started=performance.now();}
    }catch(error){if(version===decodeVersion)decodeError=true;}
  }
  window.addEventListener('voiceguard-file',event=>decode(event.detail));
  function setPaused(value){paused=value;canvas.setAttribute('aria-pressed',String(value));}
  canvas.addEventListener('click',()=>setPaused(!paused));
  canvas.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setPaused(!paused);}});
  preview?.addEventListener('pause',()=>setPaused(true));
  preview?.addEventListener('play',()=>setPaused(false));
  pauseRecording?.addEventListener('click',()=>{
    if(typeof mediaRecorder==='undefined'||!mediaRecorder)return;
    if(mediaRecorder.state==='recording')mediaRecorder.pause();
    else if(mediaRecorder.state==='paused')mediaRecorder.resume();
  });
  function draw(target,samples){
    if(!target||!target.clientWidth)return;
    const width=target.clientWidth,height=target.clientHeight||140,dpr=Math.min(devicePixelRatio||1,2);
    if(target.width!==Math.round(width*dpr)||target.height!==Math.round(height*dpr)){target.width=Math.round(width*dpr);target.height=Math.round(height*dpr);}
    const ctx=target.getContext('2d');if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const color=ctx.createLinearGradient(0,height,0,0);color.addColorStop(0,'#3479ca');color.addColorStop(1,'#00d9ed');
    const count=15,stride=Math.min(11,width/22),start=(width-(count-1)*stride)/2;
    let power=0;for(const sample of samples)power+=sample*sample;
    ctx.strokeStyle=color;ctx.lineCap='round';ctx.beginPath();
    if(power/Math.max(samples.length,1)<.000001){
      ctx.lineWidth=2;ctx.moveTo(start,height/2);ctx.lineTo(width-start,height/2);
    }else{
      ctx.lineWidth=Math.min(5,stride*.46);ctx.shadowColor='#00d9ed66';ctx.shadowBlur=6;
      // Each rounded bar measures a real segment of the audio window.
      for(let bar=0;bar<count;bar++){
        const first=Math.floor(bar*samples.length/count),last=Math.max(first+1,Math.floor((bar+1)*samples.length/count));
        let energy=0;for(let i=first;i<last;i++)energy+=samples[i]*samples[i];
        const level=Math.min(1,Math.sqrt(energy/(last-first))*2);
        const envelope=.28+.72*Math.sin(Math.PI*bar/(count-1));
        const length=Math.max(2,level*envelope*(height*.68)),x=start+bar*stride;
        ctx.moveTo(x,(height-length)/2);ctx.lineTo(x,(height+length)/2);
      }
    }
    ctx.stroke();
    ctx.shadowBlur=0;
  }
  function microphoneSamples(){
    if(typeof analyser==='undefined'||!analyser)return flat();
    if(liveSamples.length!==analyser.fftSize)liveSamples=new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(liveSamples);
    return Float32Array.from(liveSamples,value=>(value-128)/128);
  }
  const syncAnalysis=()=>{
    const active=!analysis.classList.contains('hidden');
    analysis.setAttribute('aria-busy',String(active));
    if(active&&!activeBefore){setPaused(false);started=performance.now();elapsedStart=started;
      if(typeof selectedFile!=='undefined'&&selectedFile!==decodedFile)decode(selectedFile);
    }
    if(!active&&activeBefore){clearInterval(elapsedTimer);elapsedTimer=null;}
    activeBefore=active;
  };
  new MutationObserver(syncAnalysis).observe(analysis,{attributes:true,attributeFilter:['class']});syncAnalysis();
  function frame(now){
    frameId=requestAnimationFrame(frame);
    if(document.hidden||now-lastDraw<50)return;lastDraw=now;
    const recording=isRecording(),live=isLive(),recordPaused=typeof mediaRecorder!=='undefined'&&mediaRecorder?.state==='paused';
    if(pauseRecording){pauseRecording.disabled=!recording&&!recordPaused;pauseRecording.textContent=recordPaused?'Resume recording':'Pause recording';}
    if(recordCanvas){draw(recordCanvas,recording?microphoneSamples():flat());document.getElementById('recordingWaveformStatus').textContent=recording?'Recording microphone levels':recordPaused?'Recording paused':'Microphone is off';}
    if(awaitingCanvas){
      const playing=preview&&!preview.paused&&!preview.ended;
      draw(awaitingCanvas,(recording||live||playing)&&!recordPaused?microphoneSamples():flat());
      const awaitingStatus=document.getElementById('awaitingWaveformStatus');
      if(awaitingStatus)awaitingStatus.textContent=recordPaused?'Recording paused':recording||live?'Live microphone waveform':playing?'Audio playback waveform':'No audio playing';
    }
    if(!activeBefore)return;
    let samples=flat(),label;
    if(paused||recordPaused)label='Waveform paused. Detection continues.';
    else if(recording||live){samples=microphoneSamples();label='Live microphone waveform';}
    else if(preview&&!preview.paused&&!preview.ended){samples=microphoneSamples();label='Audio playback waveform';}
    else if(buffer){
      const seconds=(now-started)/1000,channel=buffer.getChannelData(0),span=Math.min(channel.length,Math.floor(buffer.sampleRate*2));
      const position=Math.floor((seconds%Math.max(buffer.duration,0.01))*buffer.sampleRate);
      if(position+span<=channel.length)samples=channel.subarray(position,position+span);
      else{
        if(!wrappedWindow||wrappedWindow.length!==span)wrappedWindow=new Float32Array(span);
        const tail=channel.subarray(position);wrappedWindow.set(tail);
        wrappedWindow.set(channel.subarray(0,span-tail.length),tail.length);samples=wrappedWindow;
      }
      label='Scanning file waveform silently. Tap to pause.';
    }else label=decodeError?'Audio visualization unavailable. Detection continues.':'Reading audio for waveform…';
    draw(canvas,samples);if(status.textContent!==label)status.textContent=label;
  }
  frameId=requestAnimationFrame(frame);
  window.addEventListener('beforeunload',()=>{cancelAnimationFrame(frameId);clearInterval(elapsedTimer);});
})();
