/**
 * VoiceGuard Frontend Controller
 * =============================
 * Handles:
 * - Real microphone recording with Web Audio API & MediaRecorder
 * - Oscilloscope waveform visualization
 * - Audio file upload & drag-and-drop
 * - Live continuous microphone monitoring
 * - Real API inference calls with honest response rendering
 * - Three.js cybernetic background
 * - Session history persistence in localStorage
 */

// Application State
const state = {
    selectedFile: null,
    audioBlob: null,
    audioUrl: null,
    isRecording: false,
    mediaRecorder: null,
    audioContext: null,
    analyserNode: null,
    micStream: null,
    recordingStartTime: null,
    recordingTimerId: null,
    
    // Live continuous monitor state
    isLiveMonitoring: false,
    liveStream: null,
    liveAudioContext: null,
    liveAnalyser: null,
    liveIntervalId: null,
    liveWindowCount: 0,
    
    // Config
    apiBaseUrl: (typeof window.getVoiceGuardApiBaseUrl === 'function')
        ? window.getVoiceGuardApiBaseUrl()
        : ((function() {
            try {
                var h = window.location.hostname;
                if (h === 'localhost' || h === '127.0.0.1' || window.location.protocol === 'file:') {
                    return 'http://localhost:8000';
                }
            } catch (e) {}
            return 'https://fieldproj-v2.onrender.com';
        })()),
    threshold: 0.50,
    modelName: 'AASIST-L',
    history: JSON.parse(localStorage.getItem('voiceguard_history') || '[]')
};

// ==============================================================================
// Centralized API Client & Endpoint Resolution
// ==============================================================================
function getApiEndpoint(path) {
    const base = (state.apiBaseUrl || '').trim().replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
}

function isMixedContentError(url) {
    const target = url || state.apiBaseUrl;
    return window.location.protocol === 'https:' && target.startsWith('http://') && !target.includes('localhost') && !target.includes('127.0.0.1');
}

function formatNetworkErrorMessage(err, url) {
    const targetUrl = url || state.apiBaseUrl;
    if (isMixedContentError(targetUrl)) {
        return `Mixed-Content Blocked: The frontend is loaded over HTTPS, but the backend URL is HTTP (${targetUrl}). Web browsers strictly block insecure HTTP requests from HTTPS sites. Please connect to an HTTPS backend (e.g. Render, Railway, or an HTTPS tunnel) or run both locally via http://localhost:3000.`;
    }
    if (targetUrl.includes('.vercel.app')) {
        return `Backend Unreachable: The API URL is currently pointing to Vercel (${targetUrl}), which only hosts static frontend files. A separate Python FastAPI/PyTorch backend is required. Click the settings gear icon to configure your remote backend URL or set VITE_API_BASE_URL in Vercel.`;
    }
    return `Could not connect to backend at ${targetUrl}. Please verify the server is running, publicly accessible, and has CORS allowed. (${err ? err.message || err : 'NetworkError'})`;
}

// ==============================================================================
// 1. Three.js Background Ambient Sphere
// ==============================================================================
let scene, camera, renderer, particlesSphere;

function initThreeJS() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4.5;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle Cloud Sphere
    const geometry = new THREE.BufferGeometry();
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const baseColor = new THREE.Color(0x00f2fe);

    for (let i = 0; i < count; i++) {
        // Uniform sphere distribution
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 2.0 + (Math.random() - 0.5) * 0.4;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
    });

    particlesSphere = new THREE.Points(geometry, material);
    scene.add(particlesSphere);

    function animateThree() {
        requestAnimationFrame(animateThree);
        if (particlesSphere) {
            particlesSphere.rotation.y += 0.0012;
            particlesSphere.rotation.x += 0.0006;
        }
        renderer.render(scene, camera);
    }
    animateThree();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function updateThreeSphereColor(hexColor) {
    if (!particlesSphere) return;
    const colors = particlesSphere.geometry.attributes.color.array;
    const c = new THREE.Color(hexColor);
    for (let i = 0; i < colors.length / 3; i++) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    particlesSphere.geometry.attributes.color.needsUpdate = true;
}

// ==============================================================================
// 2. Backend Health & Connectivity
// ==============================================================================
async function checkBackendHealth() {
    const statusPill = document.getElementById('backend-status-pill');
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');

    try {
        const resp = await fetch(getApiEndpoint("/health"), { signal: AbortSignal.timeout(4000) });
        if (resp.ok) {
            const data = await resp.json();
            statusDot.className = 'status-dot online';
            statusLabel.textContent = `Online: ${data.model_name || 'AASIST-L'}`;
            statusPill.title = `Backend active at ${state.apiBaseUrl} (${data.device})`;
            return true;
        }
    } catch (e) {
        // Backend not reached
    }

    statusDot.className = 'status-dot offline';
    statusLabel.textContent = 'Backend Offline';
    statusPill.title = `Cannot reach backend at ${state.apiBaseUrl}. Click gear icon to configure URL.`;
    return false;
}

// ==============================================================================
// 3. Audio Input Handling (File Dropzone)
// ==============================================================================
function initUploadHandlers() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('audio-file-input');
    const browseBtn = document.getElementById('browse-btn');

    if (browseBtn) browseBtn.addEventListener('click', () => fileInput.click());
    if (dropZone) {
        dropZone.addEventListener('click', (e) => {
            if (e.target !== browseBtn) fileInput.click();
        });
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFileSelection(fileInput.files[0]);
            }
        });
    }

    const removeBtn = document.getElementById('remove-audio-btn');
    if (removeBtn) removeBtn.addEventListener('click', clearSelectedAudio);
}

function handleFileSelection(file) {
    state.selectedFile = file;
    state.audioBlob = file;
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = URL.createObjectURL(file);

    // Update Preview UI
    const card = document.getElementById('selected-audio-card');
    const nameEl = document.getElementById('preview-filename');
    const sizeEl = document.getElementById('preview-filesize');
    const player = document.getElementById('audio-playback');
    const analyzeBtn = document.getElementById('analyze-btn');

    nameEl.textContent = file.name;
    sizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB • ${file.type || file.name.split('.').pop().toUpperCase()}`;
    player.src = state.audioUrl;
    card.style.display = 'block';

    analyzeBtn.disabled = false;
    const compareBtn = document.getElementById('compare-models-btn'); if (compareBtn) compareBtn.disabled = false;
    document.getElementById('result-status-hint').textContent = 'Ready to analyze';
}

function clearSelectedAudio() {
    state.selectedFile = null;
    state.audioBlob = null;
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = null;

    document.getElementById('selected-audio-card').style.display = 'none';
    document.getElementById('audio-playback').src = '';
    document.getElementById('analyze-btn').disabled = true;
    const compareBtn = document.getElementById('compare-models-btn'); if (compareBtn) compareBtn.disabled = true;
    document.getElementById('audio-file-input').value = '';
    document.getElementById('result-status-hint').textContent = 'Awaiting audio input';
}

// ==============================================================================
// 4. Microphone Recording (Real Web Audio API)
// ==============================================================================
function initMicrophoneHandlers() {
    const startBtn = document.getElementById('start-rec-btn');
    const stopBtn = document.getElementById('stop-rec-btn');
    const resetBtn = document.getElementById('reset-rec-btn');

    if (startBtn) startBtn.addEventListener('click', startRecording);
    if (stopBtn) stopBtn.addEventListener('click', stopRecording);
    if (resetBtn) resetBtn.addEventListener('click', resetRecording);

    // Sub-tab toggling
    const subUpload = document.getElementById('subtab-upload');
    const subRecord = document.getElementById('subtab-record');
    const dropZone = document.getElementById('drop-zone');
    const recStation = document.getElementById('record-station');

    if (subUpload && subRecord) {
        subUpload.addEventListener('click', () => {
            subUpload.classList.add('active');
            subRecord.classList.remove('active');
            dropZone.style.display = 'block';
            recStation.style.display = 'none';
        });
        subRecord.addEventListener('click', () => {
            subRecord.classList.add('active');
            subUpload.classList.remove('active');
            dropZone.style.display = 'none';
            recStation.style.display = 'block';
        });
    }
}

async function startRecording() {
    const statusMsg = document.getElementById('mic-status-msg');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        state.micStream = stream;
        state.isRecording = true;

        // Web Audio Analyser for oscilloscope waveform
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = state.audioContext.createMediaStreamSource(stream);
        state.analyserNode = state.audioContext.createAnalyser();
        state.analyserNode.fftSize = 256;
        source.connect(state.analyserNode);

        drawWaveform(document.getElementById('rec-waveform-canvas'), state.analyserNode);

        // MediaRecorder setup
        const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/wav'];
        let chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

        const recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : {});
        state.mediaRecorder = recorder;
        const chunks = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: chosenMime || 'audio/webm' });
            const recordedFile = new File([blob], `mic_recording_${Date.now()}.webm`, { type: blob.type });
            handleFileSelection(recordedFile);

            // Clean up audio tracks
            stream.getTracks().forEach(track => track.stop());
            if (state.audioContext && state.audioContext.state !== 'closed') {
                state.audioContext.close();
            }
        };

        recorder.start(100);
        state.recordingStartTime = Date.now();
        startTimer();

        // UI Updates
        document.getElementById('start-rec-btn').style.display = 'none';
        document.getElementById('stop-rec-btn').style.display = 'inline-flex';
        document.getElementById('reset-rec-btn').style.display = 'none';
        statusMsg.textContent = 'Recording microphone... Speak clearly.';
        statusMsg.style.color = 'var(--crimson-danger)';

    } catch (err) {
        console.error('Microphone access denied:', err);
        statusMsg.textContent = `Microphone Error: ${err.message || 'Permission denied. Please allow microphone access.'}`;
        statusMsg.style.color = 'var(--crimson-danger)';
    }
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        clearInterval(state.recordingTimerId);

        document.getElementById('start-rec-btn').style.display = 'none';
        document.getElementById('stop-rec-btn').style.display = 'none';
        document.getElementById('reset-rec-btn').style.display = 'inline-flex';
        document.getElementById('mic-status-msg').textContent = 'Recording captured. Ready to analyze.';
        document.getElementById('mic-status-msg').style.color = 'var(--emerald-green)';
    }
}

function resetRecording() {
    clearSelectedAudio();
    document.getElementById('recording-timer').textContent = '00:00.0';
    document.getElementById('start-rec-btn').style.display = 'inline-flex';
    document.getElementById('stop-rec-btn').style.display = 'none';
    document.getElementById('reset-rec-btn').style.display = 'none';
    document.getElementById('mic-status-msg').textContent = 'Microphone ready. Minimum recording: 0.5s';
    document.getElementById('mic-status-msg').style.color = 'var(--text-muted)';
}

function startTimer() {
    const timerEl = document.getElementById('recording-timer');
    clearInterval(state.recordingTimerId);
    state.recordingTimerId = setInterval(() => {
        const elapsed = Date.now() - state.recordingStartTime;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const tenths = Math.floor((elapsed % 1000) / 100);
        timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
    }, 100);
}

function drawWaveform(canvas, analyser) {
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
        if (!state.isRecording && !state.isLiveMonitoring) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        requestAnimationFrame(renderFrame);

        analyser.getByteTimeDomainData(dataArray);

        ctx.fillStyle = '#04070d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f2fe';
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }
    renderFrame();
}

// ==============================================================================
// 5. Real AI Detection Action
// ==============================================================================
function initAnalyzeHandler() {
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', runDetection);

    const threshSlider = document.getElementById('threshold-slider');
    const threshVal = document.getElementById('threshold-val');
    if (threshSlider) {
        threshSlider.addEventListener('input', () => {
            state.threshold = parseFloat(threshSlider.value);
            threshVal.textContent = state.threshold.toFixed(2);
        });
    }

    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            state.modelName = modelSelect.value;
        });
    }
}

async function runDetection() {
    if (!state.audioBlob) return;

    const analyzeBtn = document.getElementById('analyze-btn');
    const progressBox = document.getElementById('analysis-progress');
    const emptyBox = document.getElementById('empty-results-box');
    const resultCard = document.getElementById('detection-result-card');
    const telemetryStep = document.getElementById('telemetry-step');

    analyzeBtn.disabled = true;
    emptyBox.style.display = 'none';
    resultCard.style.display = 'none';
    progressBox.style.display = 'flex';
    telemetryStep.textContent = 'Uploading audio to AASIST backend...';

    const formData = new FormData();
    formData.append('audio', state.audioBlob, state.selectedFile ? state.selectedFile.name : 'audio.wav');
    formData.append('threshold', state.threshold);
    formData.append('model_name', state.modelName);

    try {
        setTimeout(() => { telemetryStep.textContent = 'AASIST neural inference on spectro-temporal graphs...'; }, 200);

        const resp = await fetch(getApiEndpoint("/api/detect"), {
            method: 'POST',
            body: formData
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const errMsg = (errData.detail && errData.detail.message) || errData.message || `Server responded with ${resp.status}`;
            throw new Error(errMsg);
        }

        const result = await resp.json();
        progressBox.style.display = 'none';
        renderDetectionResult(result);
        saveHistoryItem(result);

    } catch (err) {
        progressBox.style.display = 'none';
        emptyBox.style.display = 'block';
        if (err.message.includes('KEY_NOT_CONFIGURED') || err.message.includes('Authentication') || err.message.includes('API key')) {
            if (confirm(`External Model Notice: ${err.message}\n\nWould you like to switch to the local AASIST-L neural network and retry?`)) {
                document.getElementById('model-select').value = 'AASIST-L';
                state.modelName = 'AASIST-L';
                runDetection();
                return;
            }
        } else {
            alert(`Analysis Error:\n\n${formatNetworkErrorMessage(err, state.apiBaseUrl)}`);
        }
        document.getElementById('result-status-hint').textContent = 'Error during analysis';
    } finally {
        analyzeBtn.disabled = false;
    const compareBtn = document.getElementById('compare-models-btn'); if (compareBtn) compareBtn.disabled = false;
    }
}

function renderDetectionResult(res) {
    const card = document.getElementById('detection-result-card');
    const banner = document.getElementById('verdict-banner');
    const title = document.getElementById('verdict-title');
    const subtitle = document.getElementById('verdict-subtitle');
    const riskBadge = document.getElementById('risk-badge');
    const scoreCircle = document.getElementById('score-circle');
    const scoreText = document.getElementById('score-text');
    const assessmentMsg = document.getElementById('assessment-message');

    // Telemetry fields
    document.getElementById('res-model-name').textContent = `${res.model_name} (${res.device})`;
    document.getElementById('res-inf-time').textContent = `${res.inference_time_ms} ms`;
    document.getElementById('res-total-time').textContent = `${res.total_processing_time_ms} ms`;
    document.getElementById('res-duration').textContent = `${res.audio_duration_seconds} s`;
    document.getElementById('res-windows').textContent = res.windows_analyzed;
    document.getElementById('res-sr-rms').textContent = `${res.audio_features.target_sample_rate} Hz / ${res.audio_features.rms_energy}`;

    const scorePct = Math.round(res.model_score * 100);
    scoreText.textContent = `${scorePct}%`;
    scoreCircle.setAttribute('stroke-dasharray', `${scorePct}, 100`);

    // Reset classes
    banner.className = 'verdict-banner';
    riskBadge.className = 'risk-badge';
    scoreCircle.className = 'circle';

    if (res.prediction === 'POSSIBLE_AI_VOICE') {
        banner.classList.add('spoof');
        title.textContent = 'POSSIBLE AI-GENERATED VOICE DETECTED';
        subtitle.textContent = 'Synthetic acoustic & phase artifacts detected';
        riskBadge.classList.add('high');
        riskBadge.textContent = 'HIGH RISK';
        scoreCircle.classList.add('high');
        updateThreeSphereColor(0xff3366);
    } else if (res.prediction === 'LIKELY_HUMAN_VOICE') {
        banner.classList.add('genuine');
        title.textContent = 'LIKELY GENUINE HUMAN SPEECH';
        subtitle.textContent = 'Natural formant resonances and biological micro-prosody';
        riskBadge.classList.add('low');
        riskBadge.textContent = 'LOW RISK';
        scoreCircle.classList.add('low');
        updateThreeSphereColor(0x00e676);
    } else {
        banner.classList.add('inconclusive');
        title.textContent = 'INCONCLUSIVE DETECTION RESULT';
        subtitle.textContent = 'Acoustic cues ambiguous — cannot definitively classify';
        riskBadge.classList.add('medium');
        riskBadge.textContent = 'MEDIUM RISK';
        scoreCircle.classList.add('mid');
        updateThreeSphereColor(0xffb703);
    }

    assessmentMsg.textContent = res.message;

    // Window timeline chips
    const timelineBox = document.getElementById('windows-timeline-box');
    const timelineBars = document.getElementById('timeline-bars');
    timelineBars.innerHTML = '';

    if (res.windows_analyzed > 1 && res.window_details) {
        timelineBox.style.display = 'block';
        res.window_details.forEach(w => {
            const chip = document.createElement('div');
            const isSpoof = w.spoof_score >= res.threshold_used;
            chip.className = `timeline-win-chip ${isSpoof ? 'spoof' : 'bona'}`;
            chip.innerHTML = `
                <span>${w.start_seconds.toFixed(1)}s - ${w.end_seconds.toFixed(1)}s</span>
                <span class="win-score-num">${Math.round(w.spoof_score * 100)}%</span>
            `;
            chip.title = `Spoof Logit: ${w.spoof_logit}, Bona Logit: ${w.bonafide_logit}`;
            timelineBars.appendChild(chip);
        });
    } else {
        timelineBox.style.display = 'none';
    }

    card.style.display = 'block';
    document.getElementById('result-status-hint').textContent = 'Analysis Complete';
}

// ==============================================================================
// 6. Real-Time Live Microphone Monitor (Tab 2)
// ==============================================================================
function initLiveMonitor() {
    const tabStatic = document.getElementById('tab-static-scan');
    const tabLive = document.getElementById('tab-live-monitor');
    const secStatic = document.getElementById('static-scan-section');
    const secLive = document.getElementById('live-monitor-section');

    if (tabStatic && tabLive) {
        tabStatic.addEventListener('click', () => {
            tabStatic.classList.add('active');
            tabLive.classList.remove('active');
            secStatic.style.display = 'grid';
            secLive.style.display = 'none';
            if (state.isLiveMonitoring) stopLiveMonitoring();
        });
        tabLive.addEventListener('click', () => {
            tabLive.classList.add('active');
            tabStatic.classList.remove('active');
            secStatic.style.display = 'none';
            secLive.style.display = 'block';
        });
    }

    const startLiveBtn = document.getElementById('start-live-btn');
    const stopLiveBtn = document.getElementById('stop-live-btn');

    if (startLiveBtn) startLiveBtn.addEventListener('click', startLiveMonitoring);
    if (stopLiveBtn) stopLiveBtn.addEventListener('click', stopLiveMonitoring);
}

async function startLiveMonitoring() {
    const stateText = document.getElementById('live-state-text');
    const stateDesc = document.getElementById('live-state-desc');
    const startBtn = document.getElementById('start-live-btn');
    const stopBtn = document.getElementById('stop-live-btn');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.liveStream = stream;
        state.isLiveMonitoring = true;
        state.liveWindowCount = 0;

        state.liveAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = state.liveAudioContext.createMediaStreamSource(stream);
        state.liveAnalyser = state.liveAudioContext.createAnalyser();
        state.liveAnalyser.fftSize = 256;
        source.connect(state.liveAnalyser);

        drawWaveform(document.getElementById('live-oscilloscope-canvas'), state.liveAnalyser);

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        stateText.textContent = 'LISTENING & BUFFERING';
        stateDesc.textContent = 'Collecting consecutive 4-second audio windows for neural inference...';

        // Continuous window capture loop:
        // Every 3.5 seconds, record a chunk and send to backend
        runLiveAudioLoop();

    } catch (err) {
        stateText.textContent = 'ACCESS ERROR';
        stateDesc.textContent = `Could not access microphone: ${err.message}`;
    }
}

function runLiveAudioLoop() {
    if (!state.isLiveMonitoring || !state.liveStream) return;

    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/wav'];
    const chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
    const chunkRecorder = new MediaRecorder(state.liveStream, chosenMime ? { mimeType: chosenMime } : {});
    const chunkData = [];

    chunkRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunkData.push(e.data);
    };

    chunkRecorder.onstop = async () => {
        if (!state.isLiveMonitoring) return;
        const blob = new Blob(chunkData, { type: chosenMime || 'audio/webm' });
        
        // Analyze this window
        await sendLiveChunk(blob);

        // Schedule next window
        if (state.isLiveMonitoring) {
            runLiveAudioLoop();
        }
    };

    chunkRecorder.start();
    // Record for 3.5 seconds (gives ~4s window when tiled/padded)
    setTimeout(() => {
        if (chunkRecorder.state === 'recording') {
            chunkRecorder.stop();
        }
    }, 3500);
}

async function sendLiveChunk(blob) {
    const counterEl = document.getElementById('live-chunk-counter');
    const latencyEl = document.getElementById('live-window-latency');
    const badgeEl = document.getElementById('live-verdict-badge');
    const scoreValEl = document.getElementById('live-score-val');
    const stateText = document.getElementById('live-state-text');

    state.liveWindowCount++;
    counterEl.textContent = `Windows Analyzed: ${state.liveWindowCount}`;
    stateText.textContent = 'ANALYZING WINDOW...';

    const formData = new FormData();
    formData.append('audio', blob, 'live_chunk.webm');
    formData.append('threshold', state.threshold);
    formData.append('model_name', state.modelName);

    try {
        const t0 = performance.now();
        const resp = await fetch(getApiEndpoint("/api/detect"), {
            method: 'POST',
            body: formData
        });
        const lat = Math.round(performance.now() - t0);
        latencyEl.textContent = `Last Latency: ${lat} ms`;

        if (resp.ok) {
            const data = await resp.json();
            const pct = Math.round(data.model_score * 100);
            scoreValEl.textContent = `${pct}% (${data.risk_level} RISK)`;

            if (data.prediction === 'POSSIBLE_AI_VOICE') {
                badgeEl.textContent = 'POSSIBLE AI VOICE';
                badgeEl.style.background = 'rgba(255, 51, 102, 0.25)';
                badgeEl.style.color = 'var(--crimson-danger)';
                updateThreeSphereColor(0xff3366);
            } else if (data.prediction === 'LIKELY_HUMAN_VOICE') {
                badgeEl.textContent = 'LIKELY HUMAN';
                badgeEl.style.background = 'rgba(0, 230, 118, 0.2)';
                badgeEl.style.color = 'var(--emerald-green)';
                updateThreeSphereColor(0x00e676);
            } else {
                badgeEl.textContent = 'INCONCLUSIVE';
                badgeEl.style.background = 'rgba(255, 183, 3, 0.2)';
                badgeEl.style.color = 'var(--amber-warning)';
                updateThreeSphereColor(0xffb703);
            }
            stateText.textContent = 'MONITORING ACTIVE';
        }
    } catch (e) {
        latencyEl.textContent = 'Network timeout';
    }
}

function stopLiveMonitoring() {
    state.isLiveMonitoring = false;
    if (state.liveStream) {
        state.liveStream.getTracks().forEach(t => t.stop());
        state.liveStream = null;
    }
    if (state.liveAudioContext && state.liveAudioContext.state !== 'closed') {
        state.liveAudioContext.close();
    }

    document.getElementById('start-live-btn').style.display = 'inline-flex';
    document.getElementById('stop-live-btn').style.display = 'none';
    document.getElementById('live-state-text').textContent = 'STANDBY';
    document.getElementById('live-state-desc').textContent = 'Monitoring stopped.';
    document.getElementById('live-verdict-badge').textContent = 'IDLE';
    document.getElementById('live-verdict-badge').style.background = 'rgba(255, 255, 255, 0.05)';
    document.getElementById('live-verdict-badge').style.color = 'var(--text-secondary)';
}

// ==============================================================================
// 7. Session History Management
// ==============================================================================
function saveHistoryItem(res) {
    const item = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        filename: res.filename || 'recording.wav',
        duration: `${res.audio_duration_seconds}s`,
        model_name: res.model_name,
        prediction: res.prediction,
        model_score: res.model_score,
        risk_level: res.risk_level,
        inference_time_ms: res.inference_time_ms
    };

    state.history.unshift(item);
    if (state.history.length > 50) state.history.pop();
    localStorage.setItem('voiceguard_history', JSON.stringify(state.history));
    renderHistoryTable();
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    if (state.history.length === 0) {
        tbody.innerHTML = '<tr class="empty-history-row"><td colspan="8">No audio files analyzed in this session yet.</td></tr>';
        return;
    }

    tbody.innerHTML = state.history.map(item => {
        let tagClass = 'inconclusive';
        let label = 'INCONCLUSIVE';
        if (item.prediction === 'POSSIBLE_AI_VOICE') { tagClass = 'spoof'; label = 'AI VOICE'; }
        else if (item.prediction === 'LIKELY_HUMAN_VOICE') { tagClass = 'genuine'; label = 'HUMAN'; }

        return `
            <tr>
                <td>${item.timestamp}</td>
                <td><strong>${item.filename}</strong></td>
                <td>${item.duration}</td>
                <td>${item.model_name}</td>
                <td><span class="history-tag ${tagClass}">${label}</span></td>
                <td>${Math.round(item.model_score * 100)}%</td>
                <td>${item.risk_level}</td>
                <td><button class="btn-tiny" onclick="inspectHistoryItem(${item.id})">Inspect</button></td>
            </tr>
        `;
    }).join('');
}

window.inspectHistoryItem = function(id) {
    const item = state.history.find(h => h.id === id);
    if (item) {
        alert(
            `Session Scan Details:\n\n` +
            `File: ${item.filename}\n` +
            `Timestamp: ${item.timestamp}\n` +
            `Prediction: ${item.prediction}\n` +
            `Risk Level: ${item.risk_level}\n` +
            `Spoof Score: ${(item.model_score * 100).toFixed(1)}%\n` +
            `Inference Latency: ${item.inference_time_ms} ms\n` +
            `Model: ${item.model_name}`
        );
    }
};

function initHistoryActions() {
    const exportBtn = document.getElementById('export-history-btn');
    const clearBtn = document.getElementById('clear-history-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.history, null, 2));
            const a = document.createElement('a');
            a.setAttribute('href', dataStr);
            a.setAttribute('download', `voiceguard_session_history_${Date.now()}.json`);
            a.click();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear all scan history for this session?')) {
                state.history = [];
                localStorage.removeItem('voiceguard_history');
                renderHistoryTable();
            }
        });
    }
}

// ==============================================================================
// 8. Settings Modal (API URL Config)
// ==============================================================================
function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('settings-modal-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const saveBtn = document.getElementById('modal-save-btn');
    const testBtn = document.getElementById('test-conn-btn');
    const input = document.getElementById('api-url-input');
    const testResult = document.getElementById('test-conn-result');

    if (!modal) return;

    if (openBtn) openBtn.addEventListener('click', () => {
        input.value = state.apiBaseUrl;
        testResult.textContent = '';
        modal.style.display = 'flex';
    });

    const closeModal = () => { modal.style.display = 'none'; };
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            let url = input.value.trim().replace(/\/+$/, '');
            if (!url) {
                try { localStorage.removeItem('voiceguard_api_url'); } catch (e) {}
                state.apiBaseUrl = (typeof window.getVoiceGuardApiBaseUrl === 'function')
                    ? window.getVoiceGuardApiBaseUrl()
                    : 'https://fieldproj-v2.onrender.com';
            } else {
                state.apiBaseUrl = url;
                try { localStorage.setItem('voiceguard_api_url', url); } catch (e) {}
            }
            closeModal();
            checkBackendHealth();
        });
    }

    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            testResult.textContent = 'Testing...';
            testResult.style.color = 'var(--text-muted)';
            const testUrl = (input.value.trim().replace(/\/+$/, '')) || state.apiBaseUrl;
            try {
                const resp = await fetch(`${testUrl}/health`, { signal: AbortSignal.timeout(4000) });
                if (resp.ok) {
                    const data = await resp.json();
                    testResult.textContent = `✓ Connected (${data.model_name || "AASIST-L"})`;
                    testResult.style.color = 'var(--emerald-green)';
                } else {
                    testResult.textContent = `✗ HTTP Error ${resp.status}`;
                    testResult.style.color = 'var(--crimson-danger)';
                }
            } catch (e) {
                testResult.textContent = `✗ Failed to connect`;
                testResult.style.color = 'var(--crimson-danger)';
            }
        });
    }
}

// ==============================================================================
// Initialization on Load
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    initUploadHandlers();
    initMicrophoneHandlers();
    initAnalyzeHandler();
    initLiveMonitor();
    initHistoryActions();
    initSettingsModal();
    initExternalApiSettings();
    loadExternalProviders();
    renderHistoryTable();

    // Check health once on startup, and every 15 seconds
    checkBackendHealth();
    setInterval(checkBackendHealth, 15000);
});


// ==============================================================================
// 9. External Deepfake API Settings & Integration
// ==============================================================================
let externalProviders = {};

async function loadExternalProviders() {
    try {
        const resp = await fetch(getApiEndpoint("/api/external/providers"));
        if (resp.ok) {
            externalProviders = await resp.json();
            updateExternalSettingsUI();
        }
    } catch (e) {
        // Backend offline
    }
}

function updateExternalSettingsUI() {
    const provSelect = document.getElementById('ext-provider-select');
    const badge = document.getElementById('ext-provider-badge');
    const keyInput = document.getElementById('ext-api-key-input');
    const endpointInput = document.getElementById('ext-endpoint-input');
    const envHint = document.getElementById('env-var-hint');

    if (!provSelect || !badge) return;
    const selected = provSelect.value;
    const info = externalProviders[selected];

    if (!info) return;

    if (envHint) {
        if (info && info.api_key_env) {
            envHint.textContent = info.api_key_env;
        } else if (selected === 'TruthScan') {
            envHint.textContent = 'TRUTHSCAN_API_KEY';
        } else if (selected === 'Hive-AI') {
            envHint.textContent = 'HIVE_API_KEY';
        } else {
            envHint.textContent = 'RESEMBLE_API_KEY';
        }
    }

    if (info.configured) {
        badge.className = 'provider-status-badge ready';
        badge.textContent = `Configured: ${info.masked_key}`;
        keyInput.placeholder = `Configured (${info.masked_key}). Enter new key to change`;
    } else {
        badge.className = 'provider-status-badge unconfigured';
        badge.textContent = 'Not Configured (Requires API Key)';
        keyInput.placeholder = 'Enter API Key';
    }

    if (endpointInput && !endpointInput.value) {
        endpointInput.placeholder = info.endpoint;
    }
}

function initExternalApiSettings() {
    const mtabServer = document.getElementById('mtab-server');
    const mtabExternal = document.getElementById('mtab-external');
    const mcontentServer = document.getElementById('mcontent-server');
    const mcontentExternal = document.getElementById('mcontent-external');

    if (mtabServer && mtabExternal) {
        mtabServer.addEventListener('click', () => {
            mtabServer.classList.add('active');
            mtabExternal.classList.remove('active');
            if (mcontentServer) mcontentServer.style.display = 'block';
            if (mcontentExternal) mcontentExternal.style.display = 'none';
        });
        mtabExternal.addEventListener('click', () => {
            mtabExternal.classList.add('active');
            mtabServer.classList.remove('active');
            if (mcontentServer) mcontentServer.style.display = 'none';
            if (mcontentExternal) mcontentExternal.style.display = 'block';
            loadExternalProviders();
        });
    }

    const provSelect = document.getElementById('ext-provider-select');
    if (provSelect) provSelect.addEventListener('change', updateExternalSettingsUI);

    const saveCredBtn = document.getElementById('save-ext-cred-btn');
    const testExtBtn = document.getElementById('test-ext-conn-btn');
    const testExtResult = document.getElementById('test-ext-result');
    const keyInput = document.getElementById('ext-api-key-input');
    const endpointInput = document.getElementById('ext-endpoint-input');

    if (saveCredBtn) {
        saveCredBtn.addEventListener('click', async () => {
            const providerId = provSelect.value;
            const key = keyInput.value.trim();
            const endpoint = endpointInput.value.trim() || undefined;

            if (!key) {
                alert('Please enter an API key to save.');
                return;
            }

            try {
                const resp = await fetch(getApiEndpoint("/api/external/configure"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider_id: providerId, api_key: key, endpoint: endpoint })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    testExtResult.textContent = `✓ Saved (${data.provider.masked_key})`;
                    testExtResult.style.color = 'var(--emerald-green)';
                    keyInput.value = '';
                    await loadExternalProviders();
                } else {
                    const err = await resp.json();
                    testExtResult.textContent = `✗ ${err.detail || 'Error saving key'}`;
                    testExtResult.style.color = 'var(--crimson-danger)';
                }
            } catch (e) {
                testExtResult.textContent = `✗ Error: ${e.message}`;
                testExtResult.style.color = 'var(--crimson-danger)';
            }
        });
    }

    if (testExtBtn) {
        testExtBtn.addEventListener('click', async () => {
            const providerId = provSelect.value;
            const key = keyInput.value.trim() || undefined;
            const endpoint = endpointInput.value.trim() || undefined;

            testExtResult.textContent = 'Testing connection with provider...';
            testExtResult.style.color = 'var(--text-muted)';

            try {
                const resp = await fetch(getApiEndpoint("/api/external/test-connection"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider_id: providerId, api_key: key, endpoint: endpoint })
                });

                const data = await resp.json();
                if (resp.ok && data.status === 'success') {
                    testExtResult.textContent = `✓ Authenticated (${data.latency_ms} ms)`;
                    testExtResult.style.color = 'var(--emerald-green)';
                } else {
                    const errMsg = (data.detail && data.detail.message) || data.message || 'Validation failed';
                    testExtResult.textContent = `✗ ${errMsg}`;
                    testExtResult.style.color = 'var(--crimson-danger)';
                }
            } catch (e) {
                testExtResult.textContent = `✗ Network error: ${e.message}`;
                testExtResult.style.color = 'var(--crimson-danger)';
            }
        });
    }
}


// ==============================================================================
// Multi-Model Registry & Comparison Logic
// ==============================================================================
let cachedModelRegistry = [];

async function loadModelRegistry() {
    try {
        const resp = await fetch(getApiEndpoint("/api/models"));
        if (!resp.ok) return;
        const data = await resp.json();
        cachedModelRegistry = data.models || [];
        updateModelPill(document.getElementById('model-select').value);
    } catch (e) {
        console.warn('Could not fetch model registry:', e);
    }
}

function updateModelPill(selectedModelId) {
    const pillBadge = document.getElementById('pill-status');
    const pillDesc = document.getElementById('pill-desc');
    if (!pillBadge || !pillDesc) return;

    const m = cachedModelRegistry.find(x => x.model_id === selectedModelId);
    if (!m) {
        pillBadge.textContent = 'READY';
        pillBadge.className = 'pill-badge pill-ready';
        pillDesc.textContent = `${selectedModelId} configured.`;
        return;
    }

    if (m.is_ready) {
        pillBadge.textContent = 'READY';
        pillBadge.className = 'pill-badge pill-ready';
        pillDesc.textContent = `${m.short_name}: ${m.architecture} (${m.license})`;
    } else {
        pillBadge.textContent = m.status.toUpperCase();
        pillBadge.className = 'pill-badge pill-unready';
        pillDesc.textContent = m.blocker_reason || m.status_message || 'Model unavailable in current environment.';
    }
}

function initMultiModelComparison() {
    const compareBtn = document.getElementById('compare-models-btn');
    const modal = document.getElementById('compare-modal');
    const closeBtn = document.getElementById('close-compare-modal-btn');
    const closeFooterBtn = document.getElementById('close-compare-footer-btn');

    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            state.modelName = e.target.value;
            updateModelPill(state.modelName);
        });
    }

    if (compareBtn) {
        compareBtn.addEventListener('click', runMultiModelComparison);
    }
}

async function runMultiModelComparison() {
    if (!state.selectedFile && !state.audioBlob) {
        alert('Please select or record an audio file first.');
        return;
    }

    const modal = document.getElementById('compare-modal');
    const tbody = document.getElementById('compare-matrix-tbody');
    const titleEl = document.getElementById('compare-consensus-title');
    const descEl = document.getElementById('compare-consensus-desc');
    const indicator = document.getElementById('compare-status-indicator');
    const researchGrid = document.getElementById('research-grid');

    modal.style.display = 'flex';
    indicator.className = 'compare-status-indicator';
    titleEl.textContent = 'Evaluating Pretrained Models...';
    descEl.textContent = 'Running genuine forward pass inference across AASIST-L, AASIST, RawNet2, and Wav2Vec2...';
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--cyan-primary);">Executing real PyTorch & Transformers pipelines...</td></tr>';

    const formData = new FormData();
    const audioPayload = state.selectedFile || state.audioBlob;
    formData.append('audio', audioPayload, state.selectedFile ? state.selectedFile.name : 'audio.wav');
    formData.append('threshold', state.threshold);

    try {
        const resp = await fetch(getApiEndpoint("/api/compare"), {
            method: 'POST',
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error((err.detail && err.detail.message) || err.message || `Server responded with ${resp.status}`);
        }

        const data = await resp.json();
        renderComparisonResults(data);

    } catch (err) {
        titleEl.textContent = 'Comparison Failed';
        descEl.textContent = err.message;
        tbody.innerHTML = `<tr><td colspan="7" style="color: #ff4757; text-align: center; padding: 18px;">Error: ${err.message}</td></tr>`;
    }
}

function renderComparisonResults(data) {
    const tbody = document.getElementById('compare-matrix-tbody');
    const titleEl = document.getElementById('compare-consensus-title');
    const descEl = document.getElementById('compare-consensus-desc');
    const indicator = document.getElementById('compare-status-indicator');
    const researchGrid = document.getElementById('research-grid');

    tbody.innerHTML = '';

    const results = data.results || [];
    const unavailable = data.unavailable_models || [];

    // Header Consensus telemetry
    if (data.disagreement_detected) {
        indicator.className = 'compare-status-indicator disagreed';
        titleEl.textContent = `Model Disagreement Detected (${data.models_evaluated_count} Models Evaluated)`;
        descEl.textContent = 'Models produced differing classifications on this sample. Showing independent results without forced averaging.';
    } else {
        indicator.className = 'compare-status-indicator agreed';
        titleEl.textContent = `Unanimous Model Agreement (${data.models_evaluated_count} Models Evaluated)`;
        descEl.textContent = `All evaluated neural architectures independently arrived at the same forensic conclusion in ${data.total_processing_time_ms}ms total.`;
    }

    // Render Table Rows
    results.forEach(r => {
        const tr = document.createElement('tr');
        const isSpoof = (r.canonical_prediction === 'SPOOF');
        const isBona = (r.canonical_prediction === 'BONAFIDE');
        const verdictClass = isSpoof ? 'spoof' : (isBona ? 'bonafide' : 'inconclusive');
        const verdictLabel = isSpoof ? 'SPOOF (AI Voice)' : (isBona ? 'BONAFIDE (Human)' : 'INCONCLUSIVE');

        tr.innerHTML = `
            <td>
                <span class="model-cell-title">${r.model_name}</span>
                <span class="model-cell-sub">${r.architecture}</span>
            </td>
            <td><span class="pill-badge pill-ready">READY</span></td>
            <td><span class="verdict-tag ${verdictClass}">${verdictLabel}</span></td>
            <td><span class="score-badge">${(r.raw_score !== undefined ? (r.raw_score * 100).toFixed(1) + '%' : 'N/A')}</span></td>
            <td>${(r.confidence !== undefined ? (r.confidence * 100).toFixed(1) + '%' : 'N/A')}</td>
            <td>${r.processing_time_ms || r.inference_time_ms} ms</td>
            <td><span style="font-size:0.75rem; color: var(--text-muted);">${r.license}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Render Research / Incompatible Models
    if (researchGrid) {
        researchGrid.innerHTML = '';
        unavailable.forEach(u => {
            const item = document.createElement('div');
            item.className = 'research-item';
            const tagClass = u.status === 'dependency_unavailable' ? 'blocked' : 'missing';
            item.innerHTML = `
                <span class="research-tag ${tagClass}">${u.status.toUpperCase()}</span>
                <strong>${u.model_name}</strong>
                <p>${u.blocker_reason}</p>
                <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 4px;">License: ${u.license}</span>
            `;
            researchGrid.appendChild(item);
        });
    }
}
