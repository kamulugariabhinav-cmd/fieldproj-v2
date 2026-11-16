"""Route/error checks; real model inference is checked separately."""
import io
from unittest.mock import patch

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

from voiceguard_addon.app import app

client = TestClient(app)


def sample():
    buffer = io.BytesIO()
    sf.write(buffer, np.sin(np.arange(16000) * 0.05) * 0.1, 16000, format="WAV")
    return buffer.getvalue()


def test_interface_additions():
    html = client.get("/dashboard").text
    for model in ("pella", "nii", "prosdd", "forensics"):
        assert f'value="{model}"' in html
    js = client.get("/voiceguard.js").text
    assert '/voiceguard.js?v=local-8' in html
    assert client.get('/dashboard').headers['cache-control'] == 'no-store'
    assert client.get('/voiceguard.js?v=local-8').headers['cache-control'] == 'no-store'
    assert 'AI SPEECH SCORE' not in html and 'id="aiScore"' not in html
    assert 'id="scoreBar"' not in html
    assert '"AI voice detected" : "Human voice detected"' in js
    assert '$("aiScore")' not in js and '$("scoreBar")' not in js
    assert '/assets/dashboard-usability.css?v=6' in html
    for metric in ('resultModel', 'duration', 'windows', 'inferenceTime'):
        assert f'id="{metric}"' in html
    assert 'liveActive=false;liveToken++;\n  clearResults();' in js
    assert js.count('fetchDetection(`${API_BASE}/api/detect`,') == 2
    assert 'id="accountMenuEmail"' in html and 'id="accountMenuLogout"' in html
    assert '/assets/account-menu.js?v=1' in html
    assert '$("accountBtn").addEventListener("click", () => setPage("profile"));' not in js
    assert 'const API_BASE = "";' in js
    assert 'const API_BASE = "https://' not in js
    assert 'const addon = ["PellaV2", "NII-AntiDeepfake", "ProSDD-Official-ASV2019"]' in js
    assert client.get("/style.css").status_code == 200


def test_existing_models_delegated():
    async def existing(**kwargs):
        return {"delegated": kwargs["model"]}
    with patch("voiceguard_addon.app.original.detect_audio", existing), patch("voiceguard_addon.app.missing_model_weights", return_value=''), patch('voiceguard_addon.app.recovered_model_ready',return_value=False):
        for name in ("prosdd", "forensics"):
            response = client.post("/api/detect", data={"model": name},
                                   files={"audio": ("test.wav", sample(), "audio/wav")})
            assert response.json() == {"delegated": name}


def test_unavailable_model_is_not_default_or_fabricated():
    with patch('voiceguard_addon.app.missing_model_weights',return_value='missing.pth'), patch('voiceguard_addon.app.recovered_model_ready',return_value=False):
        html=client.get('/dashboard').text
        assert '<option value="pella" selected>' in html
        assert '<option value="prosdd" disabled>' in html
        assert '<option value="forensics" disabled>' in html
        response=client.post('/api/detect',data={'model':'prosdd'},files={'audio':('sample.wav',sample(),'audio/wav')})
        assert response.status_code==503
        assert 'checkpoint missing' in response.json()['detail']
        assert 'ai_probability' not in response.json()


def test_missing_checkpoint_no_prediction():
    with patch("voiceguard_addon.app.get_detector", side_effect=FileNotFoundError("missing")):
        response = client.post("/api/detect", data={"model": "nii"},
                               files={"audio": ("test.wav", sample(), "audio/wav")})
    assert response.status_code == 503
    assert "ai_probability" not in response.json()


def test_invalid_uploads():
    for model, filename, content, expected in [
        ("nope", "test.wav", b"x", 400),
        ("pella", "test.exe", b"x", 400),
        ("nii", "test.wav", b"", 400),
        ("pella", "test.wav", b"invalid", 400),
    ]:
        response = client.post("/detect", data={"model": model},
                               files={"audio": (filename, content, "audio/wav")})
        assert response.status_code == expected


def test_supporting_pages_and_brand_assets():
    for path in ("/dashboard", "/about", "/guide", "/contact"):
        response = client.get(path)
        assert response.status_code == 200
        assert 'property="og:title"' in response.text
        assert 'content="http://testserver/assets/voiceguard-social.png"' in response.text
        assert 'rel="apple-touch-icon"' in response.text
        assert 'href="/about"' in response.text
        assert 'href="/guide"' in response.text
        assert response.text.index('style.css') < response.text.index('/assets/refinements.css')
    for path in ("voiceguard.svg", "favicon-32.png", "apple-touch-icon.png",
                 "voiceguard-social.png", "manrope-latin.woff2", "refinements.css", "interactions.js"):
        assert client.get('/assets/' + path).status_code == 200
    assert client.get('/assets/manrope-latin.woff2').content.startswith(b'wOF2')
    assert '—' not in client.get('/dashboard').text
    assert 'aria-label="Toggle navigation"' in client.get('/dashboard').text
    assert '<button class="voice-orb"' in client.get('/dashboard').text


def test_pause_freezes_wave_time_and_rotation():
    import re
    import subprocess
    import json
    source = client.get('/voiceguard.js').text
    frame = re.search(r'function frame\(\)\{[^\n]+', source).group(0)
    script = '''const vm=require('node:vm');const assert=require('node:assert/strict');
const context=vm.createContext({document:{hidden:false},coreVisible:true,requestAnimationFrame:()=>{},clock:{getDelta:()=>.02},
motionTime:0,spin:true,drag:false,scanning:false,signalShape:'wave',group:{rotation:{y:0}},
updateWaves:t=>{},renderer:{render:()=>{}},scene:{},camera:{}});
vm.runInContext(FRAME,context);vm.runInContext('frame()',context);
const t=context.motionTime,r=context.group.rotation.y;
assert(t>0);assert.equal(r,0,'Wave ripples animate without rotating');context.spin=false;vm.runInContext('frame()',context);
assert.equal(context.motionTime,t);assert.equal(context.group.rotation.y,r);
context.spin=true;vm.runInContext('frame()',context);assert(context.motionTime>t);
const activeTime=context.motionTime;context.document.hidden=true;vm.runInContext('frame()',context);assert.equal(context.motionTime,activeTime);
context.document.hidden=false;context.coreVisible=false;vm.runInContext('frame()',context);assert.equal(context.motionTime,activeTime);
context.coreVisible=true;context.signalShape='orb';vm.runInContext('frame()',context);assert(context.group.rotation.y>0,'Orb rotation is retained');
'''.replace('FRAME', json.dumps(frame))
    subprocess.run(['node', '-e', script], check=True, capture_output=True)


def test_navigation_analysis_and_exports_markup():
    from html.parser import HTMLParser
    html=client.get('/dashboard').text
    assert 'id="openNavigation"' not in html
    assert 'id="hideDeveloperLinks"' not in html
    assert 'id="analysisWaveform"' in html
    assert 'id="scannerInteractive"' not in html
    assert 'class="fab-tooltip"' not in html
    assert 'id="analysisMotion"' not in html
    assert 'Pause analysis animation' not in html
    assert 'id="analysisElapsed"' not in html
    assert 'class="analysis-controls"' not in html
    assert 'class="project-footer"' in html
    assert 'id="thresholdMetric"' not in html
    assert '3D INTERACTIVE' not in html
    assert 'id="settingsPage"' in html and 'data-page="settings"' in html
    assert 'id="settingsExport"' in html and 'id="settingsClear"' in html
    assert '$("threshold").textContent' not in client.get('/voiceguard.js').text
    for kind in ('pdf','xlsx','docx','json'):
        assert f'data-export-format="{kind}"' in html
    # Check transformed scanner markup has no nested/unclosed buttons.
    class Parser(HTMLParser):
        active=False
        def handle_starttag(self,tag,attrs):
            if tag=='button':
                assert not self.active
                self.active=True
        def handle_endtag(self,tag):
            if tag=='button':
                assert self.active
                self.active=False
    parser=Parser();parser.feed(html);assert not parser.active
    js=client.get('/voiceguard.js').text
    assert 'cancelRecording();message("Ready to upload or record audio.");' in js
    assert "$('recordTimer').textContent='00:00'" in js
    assert 'a.download = "voiceguard-history.json"' not in js


def test_native_export_formats(tmp_path):
    import subprocess,sys,zipfile,io
    from pathlib import Path
    from voiceguard_addon.exports import runtime
    records=[{'date':'2026-11-12T10:00:00+05:30','filename':'speech & sample.wav',
              'model':'NII-AntiDeepfake','score':93.125,'prediction':'AI Detected'},
             {'date':'2026-11-12T10:01:00Z','filename':'=HYPERLINK("bad")',
              'model':'PellaV2','score':2.5,'prediction':'Human Detected'}]
    for kind in ('pdf','xlsx','docx'):
        response=client.post('/api/history/export/'+kind,json={'records':records})
        assert response.status_code==200,response.text
        assert 'attachment;' in response.headers['content-disposition']
        if kind=='pdf':assert response.content.startswith(b'%PDF-')
        else:
            with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
                assert ('word/document.xml' if kind=='docx' else 'xl/workbook.xml') in archive.namelist()
                if kind=='xlsx':assert b'<f>' not in archive.read('xl/worksheets/sheet1.xml')
        (tmp_path/f'history.{kind}').write_bytes(response.content)
    assert client.post('/api/history/export/pdf',json={'records':[]}).status_code==400
    assert client.post('/api/history/export/exe',json={'records':records}).status_code==400
    assert client.post('/api/history/export/docx',json={'records':[dict(records[0],score=-1)]}).status_code==400
