/* Regression checks for the replacement real-audio waveform. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(){const events={};return{events,clientWidth:100,clientHeight:80,width:0,height:0,
textContent:'',disabled:false,classList:{contains:()=>false},attributes:{},
addEventListener(name,fn){events[name]=fn;},setAttribute(name,value){this.attributes[name]=value;},appendChild(){}};}
const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
const trace=[];const ctx={setTransform(){},clearRect(){trace.length=0;},beginPath(){},stroke(){},
moveTo(x,y){trace.push(y);},lineTo(x,y){trace.push(y);},createLinearGradient:()=>({addColorStop(){}})};
node('analysisWaveform').getContext=()=>ctx;node('recordingWaveform').getContext=()=>({...ctx});
node('awaitingWaveform').getContext=()=>({...ctx});
node('audioPreview').paused=true;
const events={},pcm=Float32Array.from({length:1000},(_,i)=>Math.sin(i*.15)*.7);
let pending;
const recorder={state:'inactive',pause(){this.state='paused';},resume(){this.state='recording';}};
const context=vm.createContext({document:{getElementById:node,createElement:element,hidden:false},
window:{addEventListener(name,fn){events[name]=fn;}},performance:{now:()=>0},devicePixelRatio:1,
requestAnimationFrame:fn=>(pending=fn,1),cancelAnimationFrame(){},setInterval:()=>1,clearInterval(){},
MutationObserver:class{observe(){}},ensureAudioContext(){},
audioContext:{decodeAudioData:async()=>({duration:1,sampleRate:1000,getChannelData:()=>pcm})},
mediaRecorder:recorder,liveActive:false,Uint8Array,Float32Array,console});
(async()=>{
  vm.runInContext(fs.readFileSync(__dirname+'/assets/waveform.js','utf8'),context);
  events['voiceguard-file']({detail:{arrayBuffer:async()=>new ArrayBuffer(4)}});
  for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
  pending(100);assert(trace.some(y=>y<20));assert(trace.some(y=>y>60));
  node('analysisWaveform').events.click();pending(200);
  assert(trace.every(y=>y===40));assert.match(node('waveformStatus').textContent,/paused/);
  node('analysisWaveform').events.keydown({key:'Enter',preventDefault(){}});pending(300);
  assert(trace.some(y=>y<20));
  recorder.state='recording';node('pauseRecording').events.click();assert.equal(recorder.state,'paused');
  pending(400);assert.match(node('recordingWaveformStatus').textContent,/paused/);
  node('pauseRecording').events.click();assert.equal(recorder.state,'recording');
  console.log('Waveform: actual PCM peaks, paused flat line, keyboard resume, and recorder pause/resume passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
