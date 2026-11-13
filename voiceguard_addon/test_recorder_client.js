const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0,requests=0,stopped=0,tick,resolveMic,fail=false,files=0,lastMessage='';
const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,textContent:'',addEventListener(){}});return nodes.get(id);};
const stream=()=>({getTracks:()=>[{stop(){stopped++;}}]});
class Recorder{
  static isTypeSupported(){return true;}
  constructor(){this.state='inactive';this.mimeType='audio/webm';this.events={};}
  addEventListener(name,fn){this.events[name]=fn;}
  start(){this.state='recording';}
  stop(){this.state='inactive';queueMicrotask(()=>this.events.stop());}
  pause(){this.state='paused';this.events.pause();}
  resume(){this.state='recording';this.events.resume();}
}
const context=vm.createContext({$,busy:false,liveActive:false,mediaRecorder:null,recordingTimer:null,recordingStart:0,microphoneSource:null,microphoneStream:null,analyser:null,
  window:{MediaRecorder:Recorder},MediaRecorder:Recorder,navigator:{mediaDevices:{getUserMedia(){requests++;if(fail)return Promise.reject(Object.assign(Error('Could not start audio source'),{name:'NotReadableError'}));return new Promise(resolve=>resolveMic=resolve);}}},
  Date:{now:()=>now},setInterval:fn=>(tick=fn,1),clearInterval(){tick=null;},ensureAudioContext(){},message:text=>lastMessage=text,selectFile(){files++;},File:class{},Blob,console});
function $(id){return node(id);}
vm.runInContext(fs.readFileSync(__dirname+'/assets/recorder-functions.js','utf8'),context);
const run=code=>vm.runInContext(code,context);
(async()=>{
  let start=run('startRecording()');await run('startRecording()');assert.equal(requests,1,'Pending start is guarded');resolveMic(stream());await start;
  now=2500;tick();assert.equal(node('recordTimer').textContent,'00:02');
  context.mediaRecorder.pause();now=8000;tick();assert.equal(node('recordTimer').textContent,'00:02','Paused time is excluded');
  context.mediaRecorder.resume();now=9000;tick();assert.equal(node('recordTimer').textContent,'00:03');
  context.mediaRecorder.events.dataavailable({data:new Blob(['audio'])});run('stopRecording()');await Promise.resolve();assert.equal(files,1);assert(stopped>0);
  run('cancelRecording()');assert.equal(node('recordTimer').textContent,'00:00');assert.equal(tick,null);
  start=run('startRecording()');run('cancelRecording()');const before=stopped;resolveMic(stream());await start;assert(stopped>before,'Late permission stream is released');assert.equal(node('recordTimer').textContent,'00:00');
  fail=true;await run('startRecording()');assert.match(lastMessage,/Close other apps/);assert.equal(node('startRecord').disabled,false);assert.equal(node('recordTimer').textContent,'00:00');
  console.log('Recorder: duplicate-start guard, pause timing, stream cleanup, reset, late permission cancellation, and device-error recovery passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
