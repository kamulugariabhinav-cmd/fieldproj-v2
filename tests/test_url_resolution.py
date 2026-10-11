"""
Test Suite: Frontend Production API URL Resolution and Fallback Logic
=====================================================================
Verifies that:
1. Production deployment on Vercel resolves to https://fieldproj-v2.onrender.com by default.
2. Stale 'http://localhost:8000' in browser localStorage is safely discarded on production.
3. Stale frontend same-origin URL in localStorage is safely discarded on production.
4. Valid custom HTTPS remote URLs in localStorage are respected.
5. Local development on localhost/127.0.0.1 defaults to http://localhost:8000.
6. Local development custom URLs in localStorage are respected.
"""

import subprocess
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_JS = REPO_ROOT / "config.js"
BUILD_JS = REPO_ROOT / "build.js"


def run_node_eval(setup_code: str) -> dict:
    """Evaluates config.js in Node with simulated browser window and localStorage."""
    runner = f"""
    const fs = require('fs');

    let storage = {{}};
    global.window = {{
        location: {{
            hostname: 'localhost',
            protocol: 'http:',
            origin: 'http://localhost:3000',
            port: '3000'
        }}
    }};
    global.localStorage = {{
        getItem: (k) => (storage[k] !== undefined ? storage[k] : null),
        setItem: (k, v) => {{ storage[k] = String(v); }},
        removeItem: (k) => {{ delete storage[k]; }},
        clear: () => {{ storage = {{}}; }}
    }};

    {setup_code}

    const configSource = fs.readFileSync({json.dumps(str(CONFIG_JS))}, 'utf-8');
    eval(configSource);

    const resolvedUrl = window.getVoiceGuardApiBaseUrl();
    console.log(JSON.stringify({{
        resolvedUrl: resolvedUrl,
        storageAfter: storage
    }}));
    """
    res = subprocess.run(
        ["node", "-e", runner],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        check=True
    )
    return json.loads(res.stdout.strip())


def test_production_default_resolution():
    """On Vercel without localStorage, resolves to Render backend."""
    setup = """
    window.location.hostname = 'fieldproj-v2.vercel.app';
    window.location.protocol = 'https:';
    window.location.origin = 'https://fieldproj-v2.vercel.app';
    window.location.port = '';
    """
    out = run_node_eval(setup)
    assert out["resolvedUrl"] == "https://fieldproj-v2.onrender.com"


def test_production_discards_stale_localhost():
    """On Vercel with stale 'http://localhost:8000' in localStorage, discards it and returns Render."""
    setup = """
    window.location.hostname = 'fieldproj-v2.vercel.app';
    window.location.protocol = 'https:';
    window.location.origin = 'https://fieldproj-v2.vercel.app';
    window.location.port = '';
    localStorage.setItem('voiceguard_api_url', 'http://localhost:8000');
    """
    out = run_node_eval(setup)
    assert out["resolvedUrl"] == "https://fieldproj-v2.onrender.com"
    assert "voiceguard_api_url" not in out["storageAfter"]


def test_production_discards_stale_same_origin():
    """On Vercel with stale Vercel URL in localStorage, discards it and returns Render."""
    setup = """
    window.location.hostname = 'fieldproj-v2.vercel.app';
    window.location.protocol = 'https:';
    window.location.origin = 'https://fieldproj-v2.vercel.app';
    window.location.port = '';
    localStorage.setItem('voiceguard_api_url', 'https://fieldproj-v2.vercel.app');
    """
    out = run_node_eval(setup)
    assert out["resolvedUrl"] == "https://fieldproj-v2.onrender.com"
    assert "voiceguard_api_url" not in out["storageAfter"]


def test_production_respects_custom_remote_backend():
    """On Vercel with valid custom remote HTTPS backend, respects user configuration."""
    setup = """
    window.location.hostname = 'fieldproj-v2.vercel.app';
    window.location.protocol = 'https:';
    window.location.origin = 'https://fieldproj-v2.vercel.app';
    window.location.port = '';
    localStorage.setItem('voiceguard_api_url', 'https://custom-backend.railway.app');
    """
    out = run_node_eval(setup)
    assert out["resolvedUrl"] == "https://custom-backend.railway.app"
    assert out["storageAfter"].get("voiceguard_api_url") == "https://custom-backend.railway.app"


def test_local_development_defaults_to_localhost_8000():
    """On localhost without localStorage, defaults to http://localhost:8000."""
    setup = """
    window.location.hostname = 'localhost';
    window.location.protocol = 'http:';
    window.location.origin = 'http://localhost:3000';
    window.location.port = '3000';
    """
    out = run_node_eval(setup)
    assert out["resolvedUrl"] == "http://localhost:8000"


def test_local_development_respects_custom_local_port():
    """On localhost with custom user port, respects user setting."""
    setup = """
    window.location.hostname = 'localhost';
    window.location.protocol = 'http:';
    window.location.origin = 'http://localhost:3000';
    window.location.port = '3000';
    localStorage.setItem('voiceguard_api_url', 'http://localhost:8080');
    """
    out = run_node_eval(setup)
    assert out["resolvedUrl"] == "http://localhost:8080"


from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_backend_api_health_route():
    """Verify /api/health route responds with 200 and healthy status (ad-blocker-safe alternative)."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["default_model"] == "AASIST-L"

def test_backend_api_status_route():
    """Verify /api/status route responds with 200 and healthy status."""
    resp = client.get("/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"

def test_backend_detect_accepts_audio_and_file_parameters():
    """Verify /api/detect accepts both audio parameter and file parameter seamlessly."""
    audio_file = REPO_ROOT / "tests" / "test_data" / "bonafide_001.wav"
    with open(audio_file, "rb") as f:
        resp = client.post(
            "/api/detect",
            files={"audio": ("bonafide_001.wav", f, "audio/wav")},
            data={"threshold": 0.50, "model_name": "AASIST-L"}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "prediction" in data


def run_script_eval(js_code: str) -> str:
    """Evaluates a snippet in Node with script.js loaded."""
    script_file = REPO_ROOT / "script.js"
    runner = f"""
    const fs = require('fs');
    global.window = {{
        location: {{
            hostname: 'fieldproj-v2.vercel.app',
            protocol: 'https:',
            origin: 'https://fieldproj-v2.vercel.app'
        }}
    }};
    global.document = {{
        getElementById: () => null,
        addEventListener: () => null
    }};
    global.localStorage = {{
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null
    }};

    // Stub Three.js and navigator
    global.THREE = {{}};
    global.navigator = {{ mediaDevices: {{}} }};

    const scriptSrc = fs.readFileSync({json.dumps(str(script_file))}, 'utf-8');
    eval(scriptSrc);

    {js_code}
    """
    res = subprocess.run(
        ["node", "-e", runner],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        check=True
    )
    return res.stdout.strip()


def test_format_network_error_no_false_ad_blocker_on_generic_fetch_failure():
    """Generic 'Failed to fetch' must NOT claim a browser extension / ad blocker is responsible."""
    js = """
    const err = new TypeError('Failed to fetch');
    const msg = formatNetworkErrorMessage(err, 'https://fieldproj-v2.onrender.com');
    console.log(JSON.stringify({ msg: msg }));
    """
    out = json.loads(run_script_eval(js))
    msg = out["msg"]
    assert "Request Filtered by Client" not in msg
    assert "ad blocker" not in msg
    assert "Render free-tier" in msg or "wake up" in msg


def test_format_network_error_genuine_extension_filter():
    """Only genuine ERR_BLOCKED_BY_CLIENT is attributed to client-side filtering."""
    js = """
    const err = new Error('net::ERR_BLOCKED_BY_CLIENT');
    const msg = formatNetworkErrorMessage(err, 'https://fieldproj-v2.onrender.com');
    console.log(JSON.stringify({ msg: msg }));
    """
    out = json.loads(run_script_eval(js))
    assert "Request Filtered by Client" in out["msg"]


def test_format_network_error_mixed_content():
    """Mixed content warning is generated when HTTP is accessed from HTTPS."""
    js = """
    const err = new TypeError('Failed to fetch');
    const msg = formatNetworkErrorMessage(err, 'http://my-insecure-backend.com');
    console.log(JSON.stringify({ msg: msg }));
    """
    out = json.loads(run_script_eval(js))
    assert "Mixed-Content Blocked" in out["msg"]


def test_format_network_error_vercel_target():
    """Warning is generated if the user mistakenly points to Vercel instead of FastAPI."""
    js = """
    const err = new TypeError('Failed to fetch');
    const msg = formatNetworkErrorMessage(err, 'https://fieldproj-v2.vercel.app');
    console.log(JSON.stringify({ msg: msg }));
    """
    out = json.loads(run_script_eval(js))
    assert "Backend Unreachable" in out["msg"]
    assert "only hosts static frontend files" in out["msg"]


def test_backend_cors_preflight_for_vercel_origin():
    """Verify backend returns required CORS headers for OPTIONS preflight from Vercel."""
    headers = {
        "Origin": "https://fieldproj-v2.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
    }
    resp = client.options("/api/detect", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://fieldproj-v2.vercel.app"
    assert "POST" in resp.headers.get("access-control-allow-methods", "")
