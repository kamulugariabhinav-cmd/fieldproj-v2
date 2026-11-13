const menu=document.getElementById('homeMenu'),navigation=document.getElementById('homeNavigation');
menu.addEventListener('click',()=>{const open=navigation.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
navigation.addEventListener('click',event=>{if(event.target.closest('a')){navigation.classList.remove('open');menu.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){navigation.classList.remove('open');menu.setAttribute('aria-expanded','false');}});

// Sign-in uses the same Firebase project and actual authentication as the app.
const dialog=document.getElementById('signinDialog'),signinStatus=document.getElementById('signinStatus'),googleButton=document.getElementById('homepageGoogle');
let authentication=null,lastTrigger=null;
function openSignin(trigger){
  if(authentication?.currentUser){location.assign('/dashboard');return;}
  lastTrigger=trigger;dialog.showModal();
  if(!authentication)signinStatus.textContent='Google sign-in is unavailable. Check your connection and try again.';
}
try{
  if(window.firebase?.auth&&window.VOICEGUARD_FIREBASE_CONFIG){
    const app=firebase.apps.length?firebase.app():firebase.initializeApp(window.VOICEGUARD_FIREBASE_CONFIG);
    authentication=app.auth();
    authentication.onAuthStateChanged(user=>{
      document.querySelectorAll('.header-signin').forEach(button=>button.innerHTML=user?'Open dashboard <span aria-hidden="true">↗</span>':'Sign in <span aria-hidden="true">↗</span>');
      if(!window.VOICEGUARD_REGISTRATION_PENDING&&new URLSearchParams(location.search).get('signin')==='1'){
        if(user)location.assign('/dashboard');else openSignin(document.querySelector('[data-signin]'));
      }
    });
  }
}catch(error){signinStatus.textContent='Sign-in could not be initialized. You can still explore as a guest.';}
document.querySelectorAll('[data-signin]').forEach(button=>button.addEventListener('click',()=>{
  openSignin(button);
}));
// Delegation also covers dashboard links changed by the workflow explorer.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');
  if(!link)return;
  // Guest access is an explicit choice after seeing the sign-in dialog.
  if(link.closest('#signinDialog'))return;
  const destination=new URL(link.href,location.href);
  if(destination.origin===location.origin&&/^\/dashboard\/?$/.test(destination.pathname)){
    event.preventDefault();openSignin(link);
  }
});
if(!authentication&&new URLSearchParams(location.search).get('signin')==='1')openSignin(document.querySelector('[data-signin]'));
document.getElementById('closeSignin').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>lastTrigger?.focus());
googleButton.addEventListener('click',async()=>{
  if(!authentication){signinStatus.textContent='Google sign-in is unavailable. Continue as a guest or check your internet connection.';return;}
  googleButton.disabled=true;signinStatus.textContent='Waiting for Google sign-in…';
  try{await authentication.signInWithPopup(new firebase.auth.GoogleAuthProvider());location.assign('/dashboard');}
  catch(error){signinStatus.textContent=error.code==='auth/popup-closed-by-user'?'Sign-in closed. You can try again or continue as a guest.':'Sign-in failed. Check that this address is authorized in Firebase, then try again.';}
  finally{googleButton.disabled=false;}
});

// Model tabs expose the actual installed architectures, not invented scores.
const modelData={
  pella:{name:'PellaV2',architecture:'WAV2VEC2 BASE',description:'A fine-tuned Wav2Vec2 Base classifier that compares patterns learned from real and synthetic speech. Run it on an uploaded file or browser recording.'},
  nii:{name:'NII AntiDeepfake',architecture:'MMS-300M + TRAINED CLASSIFIER',description:'A post-trained MMS-300M speech model from NII Yamagishi Lab, with a trained binary classifier. It uses waveform normalization and pooled speech features to produce real and fake scores.'},
  forensics:{name:'Forensics XLS-R Wild',architecture:'XLS-R + AASIST GRAPH ATTENTION',description:'A trained XLS-R speech frontend with AASIST graph-attention pooling. VoiceGuard uses the publisher’s Wild Deepfake classifier checkpoint, loaded strictly against the model architecture.'},
  prosdd:{name:'ProSDD ASVspoof2019',architecture:'XLS-R + PROSDD STAGE-2 CLASSIFIER',description:'The authors’ public ProSDD_Trained2019 release for real/fake speech classification. This is the official ASVspoof2019 checkpoint, separate from the private epoch-4 fine-tune originally referenced by the project.'}
};
const modelDetails={
  pella:{preparation:'Feature-extractor normalization. Recordings longer than 10 seconds are split into windows, with duration-weighted scores.',scope:'Wav2Vec2 Base fine-tuned for binary speech classification. Scores are uncalibrated; compare with another detector and independent evidence.',source:'https://huggingface.co/mo-thecreator/Deepfake-audio-detection'},
  nii:{preparation:'Waveform layer normalization, mean-pooled speech features and a trained linear classifier. Longer recordings use duration-weighted 10-second windows.',scope:'MMS-300M AntiDeepfake release from NII Yamagishi Lab. Recording domain and quality can affect results; a score is not a verified probability.',source:'https://huggingface.co/nii-yamagishilab/mms-300m-anti-deepfake'},
  forensics:{preparation:'Peak normalization followed by a five-second center crop. Shorter recordings are repeated to fill the input.',scope:'The score describes the model’s fixed input crop, not every moment in a long recording. Published under CC BY-NC 4.0; review the model terms before reuse.',source:'https://huggingface.co/eliya/forensics_0.3B_xlsr_wild_deepfake_classifier'},
  prosdd:{preparation:'A centered four-second crop, or centered zero padding for shorter audio. The classifier pools 200 latent speech-feature frames.',scope:'The installed public ASVspoof2019 checkpoint produces uncalibrated scores. The private fine-tune’s thresholds and evaluation claims do not apply to this release.',source:'https://github.com/ProSDD/codes'}
};
const modelButtons=[...document.querySelectorAll('[data-model]')];
function selectModel(button){
  modelButtons.forEach(tab=>{tab.setAttribute('aria-selected',String(tab===button));tab.tabIndex=tab===button?0:-1;});
  const data=modelData[button.dataset.model];
  document.getElementById('modelName').textContent=data.name;
  document.getElementById('modelArchitecture').textContent=data.architecture;
  document.getElementById('modelDescription').textContent=data.description;
  const detail=modelDetails[button.dataset.model];
  document.getElementById('modelPreparation').textContent=detail.preparation;
  document.getElementById('modelScope').textContent=detail.scope;
  document.getElementById('modelSource').setAttribute('href',detail.source);
  document.getElementById('modelPanel').setAttribute('aria-labelledby',button.id);
}
modelButtons.forEach((button,index)=>{
  button.addEventListener('click',()=>selectModel(button));
  button.addEventListener('keydown',event=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?modelButtons.length-1:(index+(event.key==='ArrowRight'?1:-1)+modelButtons.length)%modelButtons.length;
    selectModel(modelButtons[next]);modelButtons[next].focus();
  }});
});

// Explicit sample playback with real waveform amplitudes. No audio autoplays.
const audio=document.getElementById('sampleAudio'),play=document.getElementById('playSample'),sampleCanvas=document.getElementById('sampleWave');
const sampleState=document.getElementById('sampleState'),sampleTime=document.getElementById('sampleTime');
let audioContext=null,audioAnalyser=null,audioSource=null,sampleFrame=0;
function playbackButton(playing){play.querySelector('span').textContent=playing?'Pause sample':'Play sample';play.setAttribute('aria-label',playing?'Pause selected audio sample':'Play selected audio sample');}
function drawSample(){
  const width=sampleCanvas.clientWidth,height=105,dpr=Math.min(devicePixelRatio||1,2);
  if(!width)return;
  sampleCanvas.width=Math.round(width*dpr);sampleCanvas.height=Math.round(height*dpr);
  const ctx=sampleCanvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const playing=!audio.paused&&!audio.ended;
  const values=new Uint8Array(256);values.fill(128);if(playing&&audioAnalyser)audioAnalyser.getByteTimeDomainData(values);
  ctx.lineWidth=3;ctx.lineCap='round';const gradient=ctx.createLinearGradient(0,height,0,0);gradient.addColorStop(0,'#5083d0');gradient.addColorStop(1,'#00e0ee');ctx.strokeStyle=gradient;
  const count=35,gap=Math.min(width/(count+3),11),start=(width-(count-1)*gap)/2;
  ctx.beginPath();
  if(!playing){ctx.lineWidth=1;ctx.moveTo(start,height/2);ctx.lineTo(width-start,height/2);}
  else for(let i=0;i<count;i++){
    const a=Math.floor(i*values.length/count),b=Math.floor((i+1)*values.length/count);let sum=0;
    for(let j=a;j<b;j++)sum+=Math.pow((values[j]-128)/128,2);
    const level=Math.min(1,Math.sqrt(sum/(b-a))*3),bar=Math.max(2,level*height*.8);
    ctx.moveTo(start+i*gap,(height-bar)/2);ctx.lineTo(start+i*gap,(height+bar)/2);
  }
  ctx.stroke();
}
function sampleLoop(){drawSample();if(!audio.paused&&!document.hidden)sampleFrame=requestAnimationFrame(sampleLoop);}
play.addEventListener('click',async()=>{
  if(!audio.paused){audio.pause();return;}
  try{
    if(!audioContext){
      const Context=window.AudioContext||window.webkitAudioContext;
      if(Context){audioContext=new Context();audioAnalyser=audioContext.createAnalyser();audioAnalyser.fftSize=256;audioSource=audioContext.createMediaElementSource(audio);audioSource.connect(audioAnalyser);audioAnalyser.connect(audioContext.destination);}
    }
    await audioContext?.resume();await audio.play();
  }catch(error){sampleState.textContent='Playback unavailable. Try again, or open the dashboard.';}
});
audio.addEventListener('play',()=>{playbackButton(true);sampleState.textContent='Playing project sample';cancelAnimationFrame(sampleFrame);sampleLoop();});
audio.addEventListener('pause',()=>{playbackButton(false);sampleState.textContent=audio.ended?'Sample finished':'Playback paused';cancelAnimationFrame(sampleFrame);drawSample();});
audio.addEventListener('ended',()=>{playbackButton(false);sampleState.textContent='Sample finished';drawSample();});
audio.addEventListener('error',()=>{sampleState.textContent='The sample could not be loaded. Please try again.';playbackButton(false);});
audio.addEventListener('timeupdate',()=>{const t=Math.floor(audio.currentTime);sampleTime.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;});
document.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{
  audio.pause();audio.src=`/api/public-demo/${button.dataset.sample}`;sampleTime.textContent='0:00';sampleState.textContent='Ready to listen';
  document.querySelectorAll('[data-sample]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));drawSample();
}));
new ResizeObserver(drawSample).observe(sampleCanvas);drawSample();
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();});

// Procedural 3D signal sculpture. Decorative; it never claims to classify audio.
async function setupSignal(){
  const mount=document.getElementById('heroSignal'),stage=document.getElementById('signalStage'),motion=document.getElementById('signalMotion');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduce.matches,visible=true;
  const energyControl=document.getElementById('signalEnergy'),shapeControl=document.getElementById('signalShape');
  let energy=.13,shape='orb';
  function syncMotion(){motion.textContent=paused?'Resume motion ▷':'Pause motion Ⅱ';motion.setAttribute('aria-label',paused?'Resume signal animation':'Pause signal animation');motion.setAttribute('aria-pressed',String(paused));}
  syncMotion();
  try{
    const THREE=await import('/assets/three.module.js');
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));mount.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,50);camera.position.z=6.8;
    const group=new THREE.Group();scene.add(group);group.rotation.z=-.18;
    const lines=[],count=32,points=220;
    for(let layer=0;layer<count;layer++){
      const coordinates=new Float32Array(points*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(coordinates,3));
      const color=layer%11===0?0xff2daa:layer%5===0?0xa46aff:layer%2===0?0x00d6e8:0x386bb9;
      const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:layer%11===0?.6:.28});
      group.add(new THREE.Line(geometry,material));lines.push({coordinates,geometry,layer});
    }
    const center=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshBasicMaterial({color:0x00e0ee,wireframe:true,transparent:true,opacity:.35}));group.add(center);
    let time=0,last=performance.now(),targetX=.12,targetY=.2,frameId=0,fitDistance=6.8;
    function update(){
      for(const {coordinates,geometry,layer} of lines){
        const longitude=layer/count*Math.PI;
        for(let i=0;i<points;i++){
          const angle=i/(points-1)*Math.PI*2;
          const ripple=energy*Math.sin(angle*7+time*1.15+layer*.3)*Math.sin(angle*3-time*.35);
          const r=1.63+ripple;
          if(shape==='wave'){
            const x=(i/(points-1)-.5)*3.8;
            coordinates[i*3]=x;
            coordinates[i*3+1]=Math.sin(x*3+time+layer*.2)*(energy*3+.12)*Math.exp(-x*x*.35);
            coordinates[i*3+2]=(layer/count-.5)*1.8;
          }else{
            coordinates[i*3]=Math.cos(angle)*Math.sin(longitude)*r;
            coordinates[i*3+1]=Math.sin(angle)*r;
            coordinates[i*3+2]=Math.cos(angle)*Math.cos(longitude)*r;
          }
        }
        geometry.attributes.position.needsUpdate=true;
      }
    }
    function resize(){const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;fitDistance=Math.max(6.8,1.9/(Math.tan(37*Math.PI/360)*Math.min(1,camera.aspect)));camera.position.z=fitDistance;camera.updateProjectionMatrix();renderer.render(scene,camera);}
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:.05});observer.observe(stage);
    stage.tabIndex=0;stage.setAttribute('aria-label','Interactive voice signal illustration. Use arrow keys to rotate.');
    stage.addEventListener('pointermove',event=>{if(reduce.matches||paused||event.target.closest('button,input'))return;const rect=stage.getBoundingClientRect();targetY=(event.clientX-rect.left)/rect.width*.8-.4;targetX=(event.clientY-rect.top)/rect.height*.5-.25;});
    stage.addEventListener('keydown',event=>{if(event.target!==stage)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();targetY+=event.key==='ArrowRight'?.15:event.key==='ArrowLeft'?-.15:0;targetX+=event.key==='ArrowDown'?.15:event.key==='ArrowUp'?-.15:0;}});
    motion.addEventListener('click',()=>{
      paused=!paused;last=performance.now();syncMotion();
      if(!paused){visible=true;if(!frameId)frameId=requestAnimationFrame(frame);}
    });
    energyControl.addEventListener('input',()=>{energy=.02+Number(energyControl.value)/100*.25;document.getElementById('signalEnergyValue').textContent=energyControl.value;update();renderer.render(scene,camera);});
    shapeControl.addEventListener('click',()=>{shape=shape==='orb'?'wave':'orb';shapeControl.textContent=shape==='orb'?'Wave view':'Orb view';shapeControl.setAttribute('aria-pressed',String(shape==='wave'));center.visible=shape==='orb';update();renderer.render(scene,camera);});
    reduce.addEventListener('change',()=>{paused=reduce.matches;syncMotion();});
    function frame(now){
      frameId=requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.05);last=now;
      if(!visible||document.hidden)return;
      if(!paused){
        const scrollProgress=Number(stage.dataset?.scrollProgress||0);
        time+=delta;update();center.rotation.y+=delta*.25;
        group.rotation.x+=(targetX+Math.sin(time*.5)*.06+scrollProgress*.22-group.rotation.x)*.05;
        group.rotation.y+=(targetY+time*.3+scrollProgress*.45-group.rotation.y)*.05;
        camera.position.z+=(fitDistance+scrollProgress*.65-camera.position.z)*.06;
      }
      renderer.render(scene,camera);
    }
    update();resize();stage.classList.add('has-webgl');frameId=requestAnimationFrame(frame);
    window.addEventListener('pagehide',event=>{
      cancelAnimationFrame(frameId);frameId=0;
      if(!event.persisted){observer.disconnect();resizeObserver.disconnect();scene.traverse(obj=>{obj.geometry?.dispose();obj.material?.dispose();});renderer.dispose();}
    });
    window.addEventListener('pageshow',event=>{if(event.persisted){last=performance.now();visible=true;resize();if(!frameId)frameId=requestAnimationFrame(frame);}});
  }catch(error){motion.hidden=true;energyControl.disabled=true;shapeControl.disabled=true;stage.querySelector('.art-instruction').textContent='VoiceGuard / signal illustration';}
}
setupSignal();
