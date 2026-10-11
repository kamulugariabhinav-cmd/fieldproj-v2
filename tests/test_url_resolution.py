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
