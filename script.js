// VoiceGuard Frontend Logic - Three.js UI

let scene, camera, renderer, sphere, clock;
let isCallActive = true;
let detectionInterval = null;
let callStartTime = null;
let callInterval = null;

// Three.js initialization
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0c29); // dark blue gradient start

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Add a sphere (Earth-like)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    // Use a simple texture: we can use a flat color for now
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        metalness: 0.2,
        roughness: 0.6,
    });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    clock = new THREE.Clock();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Rotate sphere slowly
    sphere.rotation.y = elapsed * 0.1;
    sphere.rotation.x = elapsed * 0.05;

    // Optional: pulsate color based on call state
    if (sphere.material) {
        if (isCallActive) {
            // Normal state: cyan
            sphere.material.color.setHex(0x00ffff);
        } else {
            // Call ended: we will change color based on detection result later
        }
    }

    renderer.render(scene, camera);
}

// Call timer and monitoring functions
function startCall() {
    callStartTime = Date.now();
    updateTimer();
    callInterval = setInterval(updateTimer, 1000);
    startAudioVisualizer();
    startMonitoring();

    // Simulate call connection
    statusText.textContent = 'Monitoring call…';
    statusDot.style.backgroundColor = 'var(--success-color)';
    isCallActive = true;
    // Reset sphere color to normal
    if (sphere && sphere.material) sphere.material.color.setHex(0x00ffff);
}

function updateTimer() {
    const elapsed = Date.now() - callStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    callTimer.textContent =
        String(minutes).padStart(2, '0') + ':' +
        String(remainingSeconds).padStart(2, '0');
}

function startAudioVisualizer() {
    function animateWaves() {
        if (!isCallActive) return;
        const waves = [
            document.getElementById('wave1'),
            document.getElementById('wave2'),
            document.getElementById('wave3'),
            document.getElementById('wave4'),
            document.getElementById('wave5')
        ];
        waves.forEach(wave => {
            const height = Math.random() * 60 + 20; // 20-80px
            wave.style.height = height + 'px';
        });
        requestAnimationFrame(animateWaves);
    }
    animateWaves();
}

function startMonitoring() {
    if (detectionInterval) clearInterval(detectionInterval);
    function scheduleNextCheck() {
        const delay = 3000 + Math.random() * 4000; // 3-7 seconds
        detectionInterval = setTimeout(() => {
            if (Math.random() < 0.1) {
                triggerDeepfakeAlert();
            }
            scheduleNextCheck();
        }, delay);
    }
    scheduleNextCheck();
}

function triggerDeepfakeAlert() {
    if (detectionInterval) clearInterval(detectionInterval);
    const alertBanner = document.getElementById('voiceguard-alert');
    alertBanner.classList.add('show');
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    statusText.textContent = '⚠️ Potential synthetic voice detected';
    statusDot.style.backgroundColor = 'var(--danger-color)';
    // Change sphere color to red to indicate alert
    if (sphere && sphere.material) sphere.material.color.setHex(0xff0000);
    setTimeout(() => {
        if (alertBanner.classList.contains('show')) {
            hideDeepfakeAlert();
        }
    }, 8000);
}

function hideDeepfakeAlert() {
    const alertBanner = document.getElementById('voiceguard-alert');
    alertBanner.classList.remove('show');
    if (isCallActive) {
        statusText.textContent = 'Monitoring call…';
        statusDot.style.backgroundColor = 'var(--success-color)';
        startMonitoring();
        // Reset sphere color
        if (sphere && sphere.material) sphere.material.color.setHex(0x00ffff);
    }
}

function endCall() {
    isCallActive = false;
    if (callInterval) clearInterval(callInterval);
    if (detectionInterval) clearInterval(detectionInterval);
    statusText.textContent = 'Call ended';
    statusDot.style.backgroundColor = 'var(--danger-color)';
    hideDeepfakeAlert();
    // Change sphere to gray while we detect
    if (sphere && sphere.material) sphere.material.color.setHex(0x888888);
    // Perform detection on a sample after call ends
    detectSample();
}

function detectSample() {
    // Choose a sample file from dataset; we'll alternate real/fake for demo
    const samples = [
        'dataset/real/real_001.wav',
        'dataset/fake/fake_001.wav'
    ];
    const file = samples[Math.floor(Math.random() * samples.length)];
    const formData = new FormData();
    // Since we cannot read file from frontend without user upload, we'll simulate by fetching the file as blob
    // For simplicity, we'll just call the endpoint with a placeholder and fake result.
    // In a real scenario, you'd need to serve these files via the backend or have the frontend read them.
    // We'll simulate detection by calling a mock endpoint or just using a timeout.
    // We'll use fetch to POST to /detect with a dummy file if we can fetch the audio.
    // Let's attempt to fetch the audio file as blob.
    fetch(file)
        .then(resp => {
            if (!resp.ok) throw new Error('Failed to fetch sample');
            return resp.blob();
        })
        .then(blob => {
            const form = new FormData();
            form.append('audio', blob, file.split('/').pop());
            form.append('threshold', 0.5);
            return fetch('http://localhost:5000/detect', {
                method: 'POST',
                body: form
            });
        })
        .then(resp => resp.json())
        .then(result => {
            // Update UI with result
            showDetectionResult(result);
        })
        .catch(err => {
            console.error('Detection error:', err);
            // Fallback: simulate result
            const fakeResult = Math.random() < 0.5;
            showDetectionResult({
                audio_file: file,
                is_fake: fakeResult,
                confidence: Math.random(),
                prediction: fakeResult ? 'DEEPFAKE DETECTED' : 'VOICE APPEARS TO BE GENUINE'
            });
        });
}

function showDetectionResult(result) {
    // Change sphere color based on result
    if (sphere && sphere.material) {
        if (result.is_fake) {
            sphere.material.color.setHex(0xff0000); // red for fake
        } else {
            sphere.material.color.setHex(0x00ff00); // green for real
        }
    }
    // Optionally show a banner or alert
    const msg = result.is_fake ?
        `⚠️ Deepfake detected! Confidence: ${result.confidence.toFixed(2)}` :
        `✅ Voice appears genuine. Confidence: ${result.confidence.toFixed(2)}`;
    alert(msg);
    // Also update status text temporarily
    statusText.textContent = msg;
    setTimeout(() => {
        if (isCallActive) {
            statusText.textContent = 'Monitoring call…';
            statusDot.style.backgroundColor = 'var(--success-color)';
            if (sphere && sphere.material) sphere.material.color.setHex(0x00ffff);
        } else {
            statusText.textContent = 'Call ended';
        }
    }, 3000);
}

function flagNumber() {
    alert('Number flagged for community review. Thank you for helping improve VoiceGuard!');
    hideDeepfakeAlert();
}

function openSettings() {
    alert('Settings would open here:\n\n- Detection sensitivity\n- Alert preferences\n- Reporting options\n- About VoiceGuard');
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// DOM event listeners
document.addEventListener('DOMContentLoaded', () => {
    const endCallBtn = document.getElementById('end-call-btn');
    const endCallAlertBtn = document.getElementById('end-call-alert-btn');
    const flagNumberBtn = document.getElementById('flag-number-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');

    endCallBtn.addEventListener('click', endCall);
    endCallAlertBtn.addEventListener('click', endCall);
    flagNumberBtn.addEventListener('click', flagNumber);
    settingsBtn.addEventListener('click', openSettings);
    dashboardBtn.addEventListener('click', goToDashboard);

    // Handle visibility changes (for tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (callInterval) clearInterval(callInterval);
            if (detectionInterval) clearInterval(detectionInterval);
        } else {
            if (isCallActive) {
                callInterval = setInterval(updateTimer, 1000);
                startMonitoring();
            }
        }
    });

    // Handle back button on mobile (optional)
    history.pushState(null, null, location.href);
    window.onpopstate = function () {
        history.pushState(null, null, location.href);
        // In a real app, you might confirm before ending call
        // endCall();
    };
});

// Initialize Three.js and start everything
initThreeJS();
animate();
startCall();

// Expose for debugging if needed
window.VoiceGuard = {
    triggerDeepfakeAlert,
    hideDeepfakeAlert,
    endCall,
    flagNumber,
    detectSample
};