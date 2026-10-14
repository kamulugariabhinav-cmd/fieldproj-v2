"use strict";



// Same-origin FastAPI endpoints: GET /health, POST /api/detect.

// For Google sign-in, replace null with your Firebase web app config and

// enable Google provider + authorized domains in Firebase Console.

// Never place a Firebase service-account private key in browser code.

const firebaseConfig = {
  apiKey: "AIzaSyCF3i3R7dQqZUGCFCF4SnGDRcajMAH0q5A",
  authDomain: "voiceguard-61a95.firebaseapp.com",
  projectId: "voiceguard-61a95",
  storageBucket: "voiceguard-61a95.firebasestorage.app",
  messagingSenderId: "79100872827",
  appId: "1:79100872827:web:ced9510ec6770e376afade"
};

const API_BASE = window.location.origin;

const AI_THRESHOLD = 99.70488;

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const $ = id => document.getElementById(id);

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let selectedFile = null, previewUrl = null, mediaRecorder = null;

let microphoneStream = null, recordingTimer = null, recordingStart = 0;

let busy = false, currentUser = null, auth = null, scanning = false;

let audioContext = null, analyser = null, audioSource = null, microphoneSource = null;

let audioBytes = new Uint8Array(128);



function message(text, error = false) {

  $("message").textContent = text;

  $("message").classList.toggle("error", error);

}

function updateNavIndicator() {

  const activeLink = document.querySelector(".nav-link.active");

  const indicator = $("navIndicator");

  if (activeLink && indicator) {

    indicator.style.transform = `translateY(${activeLink.offsetTop}px)`;

    indicator.style.height = `${activeLink.offsetHeight}px`;

  }

}

function setPage(name) {

  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `${name}Page`));

  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === name));

  $("currentPageLabel").textContent = name.toUpperCase();

  $("sidebar").classList.remove("open");

  updateNavIndicator();

  if (name === "history") renderHistory();

  window.scrollTo({top: 0, behavior: reducedMotion ? "instant" : "smooth"});

}

document.querySelectorAll(".nav-link").forEach(b => b.addEventListener("click", () => setPage(b.dataset.page)));

$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));

$("accountBtn").addEventListener("click", () => setPage("profile"));



async function checkServer() {

  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), 10000);

  try {

    const response = await fetch(`${API_BASE}/health`, {cache: "no-store", signal: controller.signal});

    if (!response.ok) throw Error(`HTTP ${response.status}`);

    $("statusText").textContent = "API CONNECTED";

    $("statusDot").classList.add("ready");

  } catch {

    $("statusText").textContent = "API OFFLINE";

    $("statusDot").classList.remove("ready");

  } finally { clearTimeout(timer); }

}



function clearResults() {

  $("resultContent").classList.add("hidden");

  $("emptyResult").classList.remove("hidden");

  $("analyzingDisplay")?.classList.add("hidden");

  $("warnings").replaceChildren();

}

function selectFile(file) {

  if (!file || busy || liveActive) return;

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {

    message(file.size === 0 ? "The selected file is empty." : "Maximum file size is 25 MB.", true);

    return;

  }

  selectedFile = file;

  $("fileName").textContent = file.name;

  $("fileSize").textContent = `${(file.size / 1048576).toFixed(2)} MB`;

  $("fileDetails").classList.remove("hidden");

  $("analyzeBtn").disabled = false;

  $("audioPreview").pause();

  if (previewUrl) URL.revokeObjectURL(previewUrl);

  previewUrl = URL.createObjectURL(file);

  $("audioPreview").src = previewUrl;

  $("audioPreview").classList.remove("hidden");

  clearResults();

  const heading = $("awaitingHeading");

  const subtext = $("awaitingSubtext");

  if (heading) heading.textContent = `SIGNAL LOADED: ${file.name.toUpperCase()}`;

  if (subtext) subtext.textContent = `Audio signal ready for AI forensic scan. Click INITIATE SCAN to run model.`;

  message("Audio loaded. Select an engine and initiate a scan.");

}

function resetApplication() {

  if (busy || liveActive || mediaRecorder?.state === "recording") return;

  selectedFile = null;

  $("fileInput").value = "";

  $("fileDetails").classList.add("hidden");

  $("analyzeBtn").disabled = true;

  $("audioPreview").pause();

  $("audioPreview").removeAttribute("src");

  $("audioPreview").load();

  $("audioPreview").classList.add("hidden");

  if (previewUrl) URL.revokeObjectURL(previewUrl);

  previewUrl = null;

  clearResults();

  const heading = $("awaitingHeading");

  const subtext = $("awaitingSubtext");

  if (heading) heading.textContent = "AWAITING AUDIO SIGNAL";

  if (subtext) subtext.textContent = "Upload a voice recording or record from microphone to run AI forensic detection.";

}

$("fileInput").addEventListener("change", e => selectFile(e.target.files[0]));

$("removeFile").addEventListener("click", resetApplication);

$("resetBtn").addEventListener("click", resetApplication);

const dropzone = $("dropzone");

dropzone.addEventListener("dragover", e => {e.preventDefault();dropzone.classList.add("dragover");});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

dropzone.addEventListener("drop", e => {e.preventDefault();dropzone.classList.remove("dragover");selectFile(e.dataTransfer.files[0]);});

function switchTab(record) {

  if (busy || liveActive || mediaRecorder?.state === "recording") return;

  $("uploadTab").classList.toggle("active", !record);

  $("recordTab").classList.toggle("active", record);

  $("uploadPanel").classList.toggle("hidden", record);

  $("recordPanel").classList.toggle("hidden", !record);

}

$("uploadTab").addEventListener("click", () => switchTab(false));

$("recordTab").addEventListener("click", () => switchTab(true));



function ensureAudioContext() {

  if (!audioContext) {

    const Context = window.AudioContext || window.webkitAudioContext;

    if (!Context) return;

    audioContext = new Context();

    analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;

    analyser.smoothingTimeConstant = .8;

    audioBytes = new Uint8Array(analyser.frequencyBinCount);

  }

  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

}

function connectPreviewAudio() {

  try {

    ensureAudioContext();

    if (!analyser) return;

    if (!audioSource) {

      audioSource = audioContext.createMediaElementSource($("audioPreview"));

      audioSource.connect(analyser);

      analyser.connect(audioContext.destination);

    }

  } catch (error) { console.warn("Audio visualization unavailable:", error); }

}

$("audioPreview").addEventListener("play", connectPreviewAudio);

function stopMicrophone() {

  if (recordingTimer) clearInterval(recordingTimer);

  recordingTimer = null;

  if (microphoneSource) { microphoneSource.disconnect(); microphoneSource = null; }

  if (microphoneStream) microphoneStream.getTracks().forEach(t => t.stop());

  microphoneStream = null;

}

async function startRecording() {

  if (busy || liveActive) return;

  try {

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw Error("Recording is unsupported in this browser.");

    microphoneStream = await navigator.mediaDevices.getUserMedia({audio:true});

    ensureAudioContext();

    if (analyser) {

      microphoneSource = audioContext.createMediaStreamSource(microphoneStream);

      microphoneSource.connect(analyser); // Do not connect microphone to speakers.

    }

    const types = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];

    const mime = types.find(t => MediaRecorder.isTypeSupported(t));

    mediaRecorder = new MediaRecorder(microphoneStream, mime ? {mimeType:mime} : undefined);

    const recorder = mediaRecorder;

    const chunks = [];

    recorder.addEventListener("dataavailable", e => {if (e.data.size) chunks.push(e.data);});

    recorder.addEventListener("stop", () => {

      const type = recorder.mimeType || "audio/webm";

      const ext = type.includes("mp4") ? "m4a" : "webm";

      stopMicrophone();

      selectFile(new File([new Blob(chunks,{type})], `voiceguard-recording.${ext}`, {type}));

    }, {once:true});

    recorder.start();

    recordingStart = Date.now();

    recordingTimer = setInterval(() => {

      const s = Math.floor((Date.now() - recordingStart) / 1000);

      $("recordTimer").textContent = `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

    }, 250);

    $("startRecord").disabled = true;

    $("stopRecord").disabled = false;

    message("Recording live microphone signal...");

  } catch (error) {

    stopMicrophone();

    $("startRecord").disabled = false;

    $("stopRecord").disabled = true;

    message(`Microphone error: ${error.message}`, true);

  }

}

function stopRecording() {

  if (mediaRecorder?.state === "recording") mediaRecorder.stop();

  $("startRecord").disabled = false;

  $("stopRecord").disabled = true;

}

$("startRecord").addEventListener("click", startRecording);

$("stopRecord").addEventListener("click", stopRecording);



function showResult(data) {

  const forensics = data.model_name === "Forensics-XLSR-Wild";

  const prosdd = data.model_name === "ProSDD-Stage2-Epoch4";

  if (!forensics && !prosdd) throw Error("Unexpected detection model returned by the server.");

  const score = forensics ? Number(data.ai_probability) * 100 : Number(data.ai_score_percent);

  if (!Number.isFinite(score) || score < 0 || score > 100) throw Error("Invalid score returned by backend.");

  const ai = forensics ? data.prediction === "AI Detected" : score >= AI_THRESHOLD;

  $("aiScore").textContent = score.toFixed(3);

  $("scoreBar").style.width = `${score}%`;

  $("prediction").textContent = ai ? "⚠ AI DETECTED" : "✓ HUMAN DETECTED";

  $("prediction").style.color = ai ? "var(--pink)" : "var(--lime)";

  $("resultModel").textContent = forensics ? "XLS-R Wild" : "ProSDD";

  const duration = data.audio_duration_seconds == null ? NaN : Number(data.audio_duration_seconds);

  const time = data.inference_time_ms == null ? NaN : Number(data.inference_time_ms);

  $("durationMetric").classList.toggle("hidden", !Number.isFinite(duration));

  $("windowsMetric").classList.toggle("hidden", data.windows_analyzed == null);

  $("inferenceMetric").classList.toggle("hidden", !Number.isFinite(time));

  $("duration").textContent = Number.isFinite(duration) ? `${duration.toFixed(2)} s` : "—";

  $("windows").textContent = data.windows_analyzed ?? "—";

  $("inferenceTime").textContent = Number.isFinite(time) ? `${time.toFixed(0)} ms` : "—";

  $("threshold").textContent = forensics ? "50%" : `${AI_THRESHOLD}%`;

  $("warnings").replaceChildren();

  const warnings = ["Scores are experimental and can be unreliable on compressed, noisy, or unfamiliar speech."];

  if (Array.isArray(data.warnings)) warnings.push(...data.warnings.map(String));

  for (const text of warnings) {

    const item = document.createElement("div"); item.className = "warning"; item.textContent = text;

    $("warnings").appendChild(item);

  }

  $("analyzingDisplay")?.classList.add("hidden");

  $("emptyResult").classList.add("hidden");

  $("resultContent").classList.remove("hidden");

  return {score, ai};

}

async function analyzeAudio() {

  if (!selectedFile || busy || liveActive) return;

  busy = scanning = true;

  $("analyzeBtn").disabled = true;

  $("analyzeBtn").classList.add("is-scanning");

  $("analyzeBtn").querySelector(".scan-label").textContent = "◌ SCANNING SIGNAL...";

  $("coreMode").textContent = "ANALYZING";

  $("coreState").textContent = "SCAN ACTIVE";

  $("resultContent").classList.add("hidden");

  $("emptyResult").classList.add("hidden");

  $("analyzingDisplay")?.classList.remove("hidden");

  const selModel = $("modelSelect");

  const modelText = selModel.options[selModel.selectedIndex]?.text || selModel.value;

  if ($("analyzingSubtitle")) $("analyzingSubtitle").textContent = `Running ${modelText} neural detection...`;

  $("warnings").replaceChildren();

  message("Uploading audio and running selected detection engine...");

  const file = selectedFile;

  try {

    const form = new FormData();

    form.append("audio", file, file.name);

    form.append("model", $("modelSelect").value);

    const response = await fetch(`${API_BASE}/api/detect`, {method:"POST", body:form});

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {

      const detail = data.detail;

      throw Error(typeof detail === "string" ? detail : detail?.message || data.message || `HTTP ${response.status}`);

    }

    const result = showResult(data);

    saveHistory({id:crypto.randomUUID(),date:new Date().toISOString(),filename:file.name,model:data.model_name,score:result.score,prediction:result.ai ? "AI Detected" : "Human Detected"});

    message(`Analysis completed using ${data.model_name}.`);

    $("coreMode").textContent = result.ai ? "AI SIGNAL" : "HUMAN SIGNAL";

  } catch (error) {

    message(`Analysis failed: ${error.message}`, true);

    $("coreMode").textContent = "ERROR";

    $("analyzingDisplay")?.classList.add("hidden");

    $("emptyResult")?.classList.remove("hidden");

  } finally {

    busy = scanning = false;

    $("coreState").textContent = "STANDBY";

    $("analyzeBtn").disabled = !selectedFile;

    $("analyzeBtn").classList.remove("is-scanning");

    $("analyzeBtn").querySelector(".scan-label").textContent = "⚡ INITIATE SCAN";

    $("analyzingDisplay")?.classList.add("hidden");

  }

}

$("analyzeBtn").addEventListener("click", analyzeAudio);



// Local-only metadata; not a server-side account history or access control.

const historyKey = () => `voiceguard-history-${currentUser?.uid || "guest"}`;

function getHistory() {

  try { const value = JSON.parse(localStorage.getItem(historyKey()) || "[]"); return Array.isArray(value) ? value : []; }

  catch { return []; }

}

function saveHistory(record) {

  try {localStorage.setItem(historyKey(), JSON.stringify([record, ...getHistory()].slice(0,100)));}

  catch {message("Scan completed, but browser history could not be saved.", true);}

}

function renderHistory() {

  const list = $("historyList"); list.replaceChildren();

  const query = $("historySearch").value.toLowerCase().trim();

  const filter = $("historyFilter").value;

  const rows = getHistory().filter(r => {

    const matches = `${r.filename} ${r.model}`.toLowerCase().includes(query);

    return matches && (filter === "all" || (filter === "ai" ? r.prediction === "AI Detected" : r.prediction === "Human Detected"));

  });

  $("historyCount").textContent = `${rows.length} matching record${rows.length === 1 ? "" : "s"}`;

  if (!rows.length) {

    const empty = document.createElement("div"); empty.className = "history-empty";

    empty.textContent = "No matching records. Run an analysis to create a history entry.";

    list.appendChild(empty); return;

  }

  for (const r of rows) {

    const row = document.createElement("div"); row.className = "history-row";

    const file = document.createElement("div");

    const name = document.createElement("strong"); name.textContent = r.filename;

    const date = document.createElement("small"); date.textContent = new Date(r.date).toLocaleString();

    file.append(name,date);

    const model = document.createElement("div"); model.textContent = r.model;

    const score = document.createElement("strong"); score.textContent = `${Number(r.score).toFixed(2)}%`;

    const verdict = document.createElement("strong"); verdict.textContent = r.prediction;

    verdict.className = r.prediction === "AI Detected" ? "ai" : "human";

    const remove = document.createElement("button"); remove.className = "ghost-button"; remove.textContent = "Delete";

    remove.addEventListener("click", () => {

      localStorage.setItem(historyKey(), JSON.stringify(getHistory().filter(item => item.id !== r.id)));

      renderHistory();

    });

    row.append(file,model,score,verdict,remove); list.appendChild(row);

  }

}

$("historySearch").addEventListener("input", renderHistory);

$("historyFilter").addEventListener("change", renderHistory);

$("clearHistory").addEventListener("click", () => {

  if (confirm("Delete all locally stored history for this profile?")) {localStorage.removeItem(historyKey());renderHistory();}

});

$("exportHistory").addEventListener("click", () => {

  const blob = new Blob([JSON.stringify(getHistory(),null,2)], {type:"application/json"});

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a"); a.href = url; a.download = "voiceguard-history.json"; a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

});



function updateProfile(user) {

  currentUser = user;

  $("profileName").textContent = user?.displayName || "Guest Operator";

  $("profileEmail").textContent = user?.email || "Not signed in";

  $("authStatus").textContent = user ? "ACCOUNT CONNECTED" : "GUEST SESSION";

  $("accountLabel").textContent = user?.displayName?.split(" ")[0] || "Guest";

  $("googleLogin").classList.toggle("hidden", !!user);

  $("signOut").classList.toggle("hidden", !user);

  for (const target of [$("profileAvatar"), $("accountAvatar")]) {

    target.replaceChildren();

    if (user?.photoURL) {

      const img = document.createElement("img"); img.src = user.photoURL; img.alt = "Profile";

      img.referrerPolicy = "no-referrer"; target.appendChild(img);

    } else target.textContent = user?.displayName?.[0] || "G";

  }

  renderHistory();

}

function setupFirebase() {

  if (!firebaseConfig) {

    $("authMessage").textContent = "Firebase not configured. Add your Firebase web app config in voiceguard.js to enable Google sign-in.";

    return;

  }

  if (!window.firebase?.auth) {$("authMessage").textContent = "Firebase SDK failed to load. Check your internet connection.";return;}

  try {

    firebase.initializeApp(firebaseConfig);

    auth = firebase.auth();

    auth.onAuthStateChanged(user => {

      updateProfile(user);

      $("authMessage").textContent = user ? "Account connected." : "You are browsing as a guest.";

    });

  } catch (e) {$("authMessage").textContent = `Firebase setup error: ${e.message}`;}

}

$("googleLogin").addEventListener("click", async () => {

  if (!auth) {$("authMessage").textContent = "Configure Firebase first.";return;}

  try {await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());}

  catch (e) {$("authMessage").textContent = `Sign-in failed: ${e.message}`;}

});

$("signOut").addEventListener("click", async () => {

  try {await auth?.signOut();} catch (e) {$("authMessage").textContent = `Sign-out failed: ${e.message}`;}

});



// True interactive Three.js scene. Uses remote ES module only for 3D; API still works if it fails.

async function setup3D() {

  const mount = $("coreCanvas");

  try {

    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js");

    const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});

    renderer.setPixelRatio(Math.min(devicePixelRatio,2));

    renderer.setClearColor(0x000000,0);

    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40,1,.1,100);

    camera.position.z = 7.8;

    const group = new THREE.Group(); scene.add(group);

    // Layered holographic waves replace the previous sphere entirely.

    const waveLines = [];

    const colors = [0x00f5ff, 0xff2daa, 0xa46aff, 0x5ab9ff];

    const samples = 120;

    for (let layer = 0; layer < 26; layer++) {

      const points = new Float32Array(samples * 3);

      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));

      const material = new THREE.LineBasicMaterial({color: colors[layer % colors.length], transparent:true, opacity:.25 + (layer % 5)*.09});

      const line = new THREE.Line(geometry, material);

      group.add(line);

      waveLines.push({line, layer, points});

    }

    function updateWaves(t) {

      const energy = scanning ? 1.8 : .8;

      for (const {line, layer, points} of waveLines) {

        const depth = (layer - 12.5)*.11;

        for (let i=0;i<samples;i++) {

          const x=(i/(samples-1)-.5)*7.2;

          const envelope=Math.pow(Math.max(0,1-Math.abs(x)/4),1.4);

          const y=Math.sin(x*1.65+t*1.2+layer*.19)*Math.cos(x*.75-t*.48+layer*.16)*envelope*energy;

          points[i*3]=x;

          points[i*3+1]=y+Math.sin(layer*.3+t*.3)*.1;

          points[i*3+2]=depth+Math.sin(x*.6+t*.55)*.25;

        }

        line.geometry.attributes.position.needsUpdate=true;

      }

    }

    const stage = $("coreStage");

    let drag=false,px=0,py=0,spin=true,zoom=7.8;

    stage.addEventListener("pointerdown",e=>{drag=true;px=e.clientX;py=e.clientY;stage.setPointerCapture(e.pointerId);});

    stage.addEventListener("pointerup",()=>drag=false);

    stage.addEventListener("pointercancel",()=>drag=false);

    stage.addEventListener("pointermove",e=>{if(!drag)return;group.rotation.y+=(e.clientX-px)*.009;group.rotation.x+=(e.clientY-py)*.009;px=e.clientX;py=e.clientY;});

    stage.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.max(4.5,Math.min(12,zoom+e.deltaY*.008));camera.position.z=zoom;},{passive:false});

    $("resetCore").addEventListener("click",()=>{group.rotation.set(0,0,0);zoom=7.8;camera.position.z=zoom;});

    $("toggleSpin").addEventListener("click",()=>{spin=!spin;$("toggleSpin").textContent=spin?"Ⅱ Pause Rotation":"▶ Resume Rotation";});

    function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}

    const observer=new ResizeObserver(resize);observer.observe(stage);resize();

    const clock=new THREE.Clock();

    function frame(){requestAnimationFrame(frame);const t=clock.getElapsedTime();if(spin&&!drag&&!reducedMotion)group.rotation.y+=scanning?.018:.003;updateWaves(t);renderer.render(scene,camera);}

    frame();

  } catch (e) {

    $("coreFallback").classList.remove("hidden");

    $("coreFallback").textContent = "3D unavailable: check WebGL and your internet connection. Audio detection remains usable.";

    $("resetCore").disabled = true;$("toggleSpin").disabled = true;

    console.warn("3D renderer unavailable:",e);

  }

}



// Live voice detection: consecutive microphone samples sent to existing FastAPI.

let liveActive=false, liveToken=0, liveStream=null, liveRecorder=null, liveController=null, liveCount=0, liveMicSource=null, liveWaveRaf=null;



function updateLiveWaveBars() {

  if (!liveActive) {

    document.querySelectorAll("#liveAudioWaves span").forEach(s => s.style.transform = "");

    return;

  }

  if (analyser) {

    analyser.getByteFrequencyData(audioBytes);

    const spans = document.querySelectorAll("#liveAudioWaves span");

    const count = spans.length;

    if (count) {

      const step = Math.max(1, Math.floor(audioBytes.length / count / 2));

      for (let i = 0; i < count; i++) {

        const val = audioBytes[i * step] / 255;

        const scale = Math.max(0.3, Math.min(1.5, val * 1.8 + 0.3));

        spans[i].style.transform = `scaleY(${scale.toFixed(2)})`;

      }

    }

  }

  liveWaveRaf = requestAnimationFrame(updateLiveWaveBars);

}



function liveUI(active,text){

  document.querySelector(".live-panel").classList.toggle("is-live",active);

  $("startLive").disabled=active;$("stopLive").disabled=!active;

  $("modelSelect").disabled=active;

  $("liveBadge").textContent=active?"MIC ACTIVE":"OFFLINE";

  $("listeningText").textContent=active?"Listening...":"Ready to listen";

  $("liveStatus").textContent=text;

}

function stopLive(){

  liveActive=false;liveToken++;

  if(liveWaveRaf) { cancelAnimationFrame(liveWaveRaf); liveWaveRaf = null; }

  if(liveMicSource) { try { liveMicSource.disconnect(); } catch(e){} liveMicSource = null; }

  document.querySelectorAll("#liveAudioWaves span").forEach(s => s.style.transform = "");

  if(liveRecorder?.state==="recording")liveRecorder.stop();

  liveRecorder=null;

  if(liveController)liveController.abort();liveController=null;

  if(liveStream)liveStream.getTracks().forEach(t=>t.stop());liveStream=null;

  scanning=false;$("coreState").textContent="STANDBY";

  liveUI(false,"Microphone stopped.");

}

function recordChunk(stream,token){

  const types=["audio/webm;codecs=opus","audio/webm","audio/mp4"];

  const mime=types.find(t=>MediaRecorder.isTypeSupported(t));

  const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);

  liveRecorder=recorder;

  return new Promise((resolve,reject)=>{

    const chunks=[];let timer;

    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};

    recorder.onerror=e=>{clearTimeout(timer);reject(Error(e.error?.message||"Microphone recording failed"));};

    recorder.onstop=()=>{clearTimeout(timer);resolve(liveActive&&token===liveToken?new Blob(chunks,{type:recorder.mimeType||mime||"audio/webm"}):null);};

    recorder.start();timer=setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},6000);

  });

}

async function startLive(){

  if(liveActive||busy||mediaRecorder?.state==="recording")return;

  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){liveUI(false,"Microphone recording unsupported.");return;}

  const token=++liveToken;

  try{

    const stream=await navigator.mediaDevices.getUserMedia({audio:true});

    if(token!==liveToken){stream.getTracks().forEach(t=>t.stop());return;}

    liveStream=stream;liveActive=true;liveCount=0;$("liveCount").textContent="0 samples";

    ensureAudioContext();

    if (analyser) {

      try {

        liveMicSource = audioContext.createMediaStreamSource(stream);

        liveMicSource.connect(analyser);

      } catch (e) { console.warn("Live mic stream connect error", e); }

    }

    updateLiveWaveBars();

    liveUI(true,"Recording a 6-second sample...");

    while(liveActive&&token===liveToken){

      const blob=await recordChunk(stream,token);

      if(!blob||!liveActive||token!==liveToken)break;

      if(blob.size>MAX_FILE_SIZE)throw Error("Sample too large");

      scanning=true;$("coreMode").textContent="LIVE SCAN";$("coreState").textContent="INFERENCE";

      $("liveStatus").textContent="Analyzing microphone sample on server...";

      const ext=blob.type.includes("mp4")?"m4a":"webm";

      const form=new FormData();form.append("audio",blob,`live-sample.${ext}`);form.append("model",$("modelSelect").value);

      liveController=new AbortController();

      const response=await fetch(`${API_BASE}/api/detect`,{method:"POST",body:form,signal:liveController.signal});

      const data=await response.json().catch(()=>({}));liveController=null;

      if(!liveActive||token!==liveToken)break;

      if(!response.ok){const d=data.detail;throw Error(typeof d==="string"?d:d?.message||data.message||`HTTP ${response.status}`);}

      const result=showResult(data);liveCount++;

      $("liveCount").textContent=`${liveCount} sample${liveCount===1?"":"s"}`;

      $("liveStatus").textContent=`${result.ai?"AI":"Human"} indication · ${result.score.toFixed(2)}% AI score · listening again...`;

      $("coreMode").textContent=result.ai?"AI SIGNAL":"HUMAN SIGNAL";

      saveHistory({id:crypto.randomUUID(),date:new Date().toISOString(),filename:`Live sample ${liveCount}`,model:data.model_name,score:result.score,prediction:result.ai?"AI Detected":"Human Detected"});

      scanning=false;

    }

  }catch(error){if(token===liveToken){$("liveStatus").textContent=`Stopped: ${error.message}`;message(`Live detection error: ${error.message}`,true);}}

  finally{if(token===liveToken){const errorText=$("liveStatus").textContent;stopLive();if(errorText.startsWith("Stopped:"))$("liveStatus").textContent=errorText;}}

}

$("startLive").addEventListener("click",startLive);

$("stopLive").addEventListener("click",stopLive);

window.addEventListener("beforeunload",stopLive);

$("brandToggle").addEventListener("click",()=>{

  if(matchMedia("(max-width:760px)").matches){

    $("sidebar").classList.toggle("open");

    $("brandToggle").setAttribute("aria-expanded",String($("sidebar").classList.contains("open")));

  }else{

    const collapsed=document.querySelector(".app-shell").classList.toggle("sidebar-collapsed");

    $("brandToggle").setAttribute("aria-expanded",String(!collapsed));

    $("brandToggle").setAttribute("aria-label",collapsed?"Expand sidebar":"Collapse sidebar");

  }

});

// Liquid Flowing Canvas Background Animation

function setupLiquidBackground() {

  const canvas = $("liquidCanvas");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;



  let width = 0, height = 0;

  function resize() {

    width = canvas.width = window.innerWidth;

    height = canvas.height = window.innerHeight;

  }

  window.addEventListener("resize", resize);

  resize();



  let step = 0;

  const waves = [

    { color: "rgba(0, 245, 255, 0.12)", length: 0.0028, speed: 0.018, amp: 60, yRatio: 0.62 },

    { color: "rgba(59, 130, 246, 0.14)", length: 0.0022, speed: 0.013, amp: 75, yRatio: 0.70 },

    { color: "rgba(164, 106, 255, 0.13)", length: 0.0025, speed: 0.009, amp: 90, yRatio: 0.78 },

    { color: "rgba(255, 45, 170, 0.10)", length: 0.0019, speed: 0.016, amp: 65, yRatio: 0.86 }

  ];



  const orbs = Array.from({ length: 9 }, (_, i) => ({

    x: Math.random() * (width || 1000),

    y: Math.random() * (height || 800),

    radius: 90 + Math.random() * 120,

    vx: (Math.random() - 0.5) * 0.7,

    vy: (Math.random() - 0.5) * 0.7,

    color: i % 3 === 0 ? "rgba(0, 245, 255, 0.10)" : i % 3 === 1 ? "rgba(164, 106, 255, 0.10)" : "rgba(59, 130, 246, 0.10)"

  }));



  function draw() {

    if (reducedMotion) return;

    ctx.clearRect(0, 0, width, height);

    step += 1;



    for (const orb of orbs) {

      orb.x += orb.vx;

      orb.y += orb.vy;

      if (orb.x < -150) orb.x = width + 150;

      if (orb.x > width + 150) orb.x = -150;

      if (orb.y < -150) orb.y = height + 150;

      if (orb.y > height + 150) orb.y = -150;



      const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);

      grad.addColorStop(0, orb.color);

      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;

      ctx.beginPath();

      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);

      ctx.fill();

    }



    for (let w = 0; w < waves.length; w++) {

      const wave = waves[w];

      ctx.fillStyle = wave.color;

      ctx.beginPath();

      ctx.moveTo(0, height);



      const baseY = height * wave.yRatio;

      for (let x = 0; x <= width; x += 16) {

        const y = baseY + 

          Math.sin(x * wave.length + step * wave.speed + w * 1.5) * wave.amp +

          Math.cos(x * 0.0012 - step * 0.009 + w) * (wave.amp * 0.5);

        ctx.lineTo(x, y);

      }



      ctx.lineTo(width, height);

      ctx.closePath();

      ctx.fill();

    }



    requestAnimationFrame(draw);

  }



  draw();

}



checkServer();

setupFirebase();

setup3D();

setupLiquidBackground();

renderHistory();



// Landing page: guest access is explicit, Google button uses actual Firebase login.

function closeWelcome() {

  $("welcomeScreen").classList.add("hidden");

  sessionStorage.setItem("voiceguard-welcome-dismissed", "1");

}

if (sessionStorage.getItem("voiceguard-welcome-dismissed") === "1") closeWelcome();

$("welcomeGuest").addEventListener("click", closeWelcome);

$("welcomeGoogle").addEventListener("click", async () => {

  if (!auth) {

    $("welcomeMessage").textContent = "Google sign-in is not configured. Add Firebase web config in voiceguard.js and enable Google Authentication, or explore as a guest.";

    return;

  }

  try {

    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

    closeWelcome();

  } catch (error) {

    $("welcomeMessage").textContent = "Google sign-in failed: " + error.message;

  }

});

$("fabToggle").addEventListener("click", () => {

  const open = $("developerFab").classList.toggle("open");

  $("fabToggle").setAttribute("aria-expanded", String(open));

  $("fabToggle").setAttribute("aria-label", open ? "Close developer links" : "Open developer links");

});



// Contact Developer Modal

const contactModal = $("contactModal");

const fabContact = $("fabContact");

const contactModalClose = $("contactModalClose");

const contactModalBackdrop = $("contactModalBackdrop");



function openContactModal() {

  contactModal?.classList.remove("hidden");

  $("developerFab")?.classList.remove("open");

  $("fabToggle")?.setAttribute("aria-expanded", "false");

}

function closeContactModal() {

  contactModal?.classList.add("hidden");

}



fabContact?.addEventListener("click", openContactModal);

contactModalClose?.addEventListener("click", closeContactModal);

contactModalBackdrop?.addEventListener("click", closeContactModal);



document.addEventListener("keydown", event => {

  if (event.key === "Escape") {

    $("developerFab")?.classList.remove("open");

    $("fabToggle")?.setAttribute("aria-expanded", "false");

    closeContactModal();

  }

});



window.addEventListener("resize", updateNavIndicator);

setTimeout(updateNavIndicator, 100);




// Email/password sign-in, account creation and password reset (Firebase compat).
const emailForm = $("emailAuthForm");
const emailMessage = $("emailAuthMessage");
function showEmailMessage(value) { emailMessage.textContent = value; }
function emailCredentials() {
  const email = $("emailAuthEmail").value.trim();
  const password = $("emailAuthPassword").value;
  if (!email || !password) throw new Error("Enter an email address and password.");
  return {email, password};
}
emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return showEmailMessage("Firebase is not configured yet.");
  try {
    const {email, password} = emailCredentials();
    await auth.signInWithEmailAndPassword(email, password);
    showEmailMessage("Signed in successfully.");
    closeWelcome();
  } catch (error) { showEmailMessage(`Sign-in failed: ${error.message}`); }
});
$("emailRegister").addEventListener("click", async () => {
  if (!auth) return showEmailMessage("Firebase is not configured yet.");
  try {
    const {email, password} = emailCredentials();
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.sendEmailVerification();
    showEmailMessage("Account created! Check your inbox to verify your email.");
    closeWelcome();
  } catch (error) { showEmailMessage(`Registration failed: ${error.message}`); }
});
$("emailReset").addEventListener("click", async () => {
  if (!auth) return showEmailMessage("Firebase is not configured yet.");
  const email = $("emailAuthEmail").value.trim();
  if (!email) return showEmailMessage("Enter your email address first.");
  try {
    await auth.sendPasswordResetEmail(email);
    showEmailMessage("If the account exists, a reset email will arrive shortly.");
  } catch (error) { showEmailMessage(`Password reset failed: ${error.message}`); }
});
$("openEmailLogin")?.addEventListener("click", () => {
  $("welcomeScreen").classList.remove("hidden");
  $("emailAuthEmail").focus();
});
