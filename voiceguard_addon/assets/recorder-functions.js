// Injected into the existing application scope by the add-on server.
let recordingGeneration=0,recordingPending=false,recordedMs=0,segmentStarted=0;
function updateRecordingTimer(){
  const elapsed=recordedMs+(mediaRecorder?.state==='recording'?Date.now()-segmentStarted:0);
  const seconds=Math.max(0,Math.floor(elapsed/1000));
  $('recordTimer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function stopMicrophone(){
  clearInterval(recordingTimer);recordingTimer=null;
  try{microphoneSource?.disconnect();}catch{}
  microphoneSource=null;
  microphoneStream?.getTracks().forEach(track=>track.stop());microphoneStream=null;
}
function cancelRecording(){
  recordingGeneration++;recordingPending=false;
  if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();
  stopMicrophone();mediaRecorder=null;recordedMs=0;segmentStarted=0;recordingStart=0;
  $('recordTimer').textContent='00:00';$('startRecord').disabled=false;$('stopRecord').disabled=true;
}
function recordingError(error){
  if(error.name==='NotReadableError'||error.name==='AbortError')return 'The microphone could not start. Close other apps using it, check the system’s selected input device, then try again. If it still fails, reconnect the microphone or upload an audio file.';
  if(error.name==='NotAllowedError'||error.name==='SecurityError')return 'Microphone access was denied. Allow microphone access in this site’s browser settings, then try again.';
  if(error.name==='NotFoundError')return 'No microphone was found. Connect or enable an input device, then try again.';
  return error.message||'Recording could not start. Check your microphone or upload an audio file.';
}
async function startRecording(){
  if(busy||liveActive||recordingPending||mediaRecorder&&mediaRecorder.state!=='inactive')return;
  const generation=++recordingGeneration;recordingPending=true;
  $('startRecord').disabled=true;$('stopRecord').disabled=true;$('recordTimer').textContent='00:00';
  recordedMs=0;message('Opening microphone…');
  try{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Recording is unsupported. Use localhost or HTTPS in a browser that supports microphone recording.');
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(generation!==recordingGeneration){stream.getTracks().forEach(track=>track.stop());return;}
    microphoneStream=stream;
    // Audio visualization is optional; its failure must not block recording.
    try{ensureAudioContext();if(analyser){microphoneSource=audioContext.createMediaStreamSource(stream);microphoneSource.connect(analyser);}}catch(error){console.warn('Microphone visualization unavailable:',error);}
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
    const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);mediaRecorder=recorder;
    const chunks=[];
    recorder.addEventListener('dataavailable',event=>{if(event.data.size)chunks.push(event.data);});
    recorder.addEventListener('pause',()=>{recordedMs+=Date.now()-segmentStarted;updateRecordingTimer();});
    recorder.addEventListener('resume',()=>{segmentStarted=Date.now();});
    recorder.addEventListener('stop',()=>{
      if(generation!==recordingGeneration)return;
      stopMicrophone();$('startRecord').disabled=false;$('stopRecord').disabled=true;
      const type=recorder.mimeType||'audio/webm',extension=type.includes('mp4')?'m4a':'webm';
      if(chunks.length)selectFile(new File([new Blob(chunks,{type})],`voiceguard-recording.${extension}`,{type}));
      else message('The microphone returned an empty recording. Try again or upload a file.',true);
    },{once:true});
    recorder.addEventListener('error',event=>{
      if(generation!==recordingGeneration)return;
      cancelRecording();message(recordingError(event.error||{}),true);
    },{once:true});
    recorder.start();segmentStarted=recordingStart=Date.now();recordingTimer=setInterval(updateRecordingTimer,250);
    $('stopRecord').disabled=false;message('Recording live microphone signal…');
  }catch(error){
    if(generation!==recordingGeneration)return;
    cancelRecording();message(recordingError(error),true);
  }finally{if(generation===recordingGeneration)recordingPending=false;}
}
function stopRecording(){
  if(!mediaRecorder||mediaRecorder.state==='inactive')return;
  if(mediaRecorder.state==='recording')recordedMs+=Date.now()-segmentStarted;
  segmentStarted=Date.now();mediaRecorder.stop();updateRecordingTimer();stopMicrophone();
  $('stopRecord').disabled=true;
}
$('startRecord').addEventListener('click',startRecording);
$('stopRecord').addEventListener('click',stopRecording);
