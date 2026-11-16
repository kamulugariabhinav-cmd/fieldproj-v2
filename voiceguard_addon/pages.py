"""Shared frontend rendering for FastAPI and the static deployment build."""

import json
import re
from pathlib import Path
from voiceguard_addon.ui import refine_html, refine_script
from voiceguard_addon.presentation import polish
ROOT = Path(__file__).resolve().parent.parent

def render_dashboard(base_url="/", recovered_model_ready=None, missing_model_weights=lambda name: ""):
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    marker = '<select id="modelSelect" class="field">'
    if html.count(marker) != 1:
        raise RuntimeError("Original model selector changed; update the optional add-on")
    html = html.replace(marker, marker + '\n<option value="pella">Pella // PellaV2</option>'
                        '\n<option value="nii">NII // AntiDeepfake MMS-300M</option>')
    forensics_option = '<option value="forensics">Forensics // XLS-R Wild</option>'
    html = html.replace(forensics_option, '').replace(marker, marker + '\n' + forensics_option)
    default_model = 'forensics' if recovered_model_ready is None or recovered_model_ready('forensics') else 'pella'
    html = html.replace(f'<option value="{default_model}">', f'<option value="{default_model}" selected>')
    if recovered_model_ready is None or recovered_model_ready('prosdd'):
        html=re.sub(r'(<option value="prosdd">).*?(</option>)',r'\1ProSDD // Official ASVspoof2019\2',html)
    for name in ('prosdd', 'forensics'):
        if missing_model_weights(name):
            html = re.sub(r'<option value="' + name + r'">(.*?)</option>',
                lambda match: '<option value="' + name + '" disabled>' + match[1] + ' (checkpoint missing)</option>', html)
    return (refine_html(html).replace('content="/assets/voiceguard-social.png"',
        f'content="{base_url}assets/voiceguard-social.png"'))


def render_home(base_url="/", recovered_model_ready=lambda name: False):
    html = (ROOT / 'voiceguard_addon/assets/homepage.html').read_text(encoding='utf-8')
    if recovered_model_ready('prosdd') and recovered_model_ready('forensics'):
        html=html.replace('2 trained detectors','4 trained detectors')
        html=html.replace('PellaV2 and NII AntiDeepfake have trained weights installed. The dashboard also lists ProSDD and Forensics; they stay unavailable until their required checkpoints are supplied.',
            'Forensics XLS-R Wild, PellaV2, NII AntiDeepfake, and the official ProSDD ASVspoof2019 release are installed and have passed project-sample inference checks. The public ProSDD release is distinct from the private epoch-4 fine-tune previously configured here.')
    return (polish(html,'home').replace('content="/assets/voiceguard-social.png"',
        f'content="{base_url}assets/voiceguard-social.png"'))


def render_script():
    source = (ROOT / "voiceguard.js").read_text(encoding="utf-8")
    # The original points at a fixed external tunnel. The opt-in server must
    # send uploads to its own Pella/NII endpoints instead.
    source, count = re.subn(r'^const API_BASE = [^\n]+;', 'const API_BASE = "";', source,
                            count=1, flags=re.MULTILINE)
    if count != 1:
        raise RuntimeError("Original API configuration changed; update the optional add-on")
    replacements = {
        'const forensics = data.model_name === "Forensics-XLSR-Wild";':
        'const addon = ["PellaV2", "NII-AntiDeepfake", "ProSDD-Official-ASV2019"].includes(data.model_name);\n'
        '  const forensics = addon || data.model_name === "Forensics-XLSR-Wild";',
        'forensics ? "XLS-R Wild" : "ProSDD"':
        'addon ? data.model_name : (forensics ? "XLS-R Wild" : "ProSDD")',
    }
    for old, new in replacements.items():
        if source.count(old) != 1:
            raise RuntimeError("Original result renderer changed; update the optional add-on")
        source = source.replace(old, new)
    return refine_script(source)


def render_public_config():
    source = (ROOT / 'voiceguard.js').read_text(encoding='utf-8')
    config = {}
    for key in ('apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'):
        match = re.search(r'\b' + key + r':\s*"([^"]+)"', source)
        if match:
            config[key] = match[1]
    return 'window.VOICEGUARD_FIREBASE_CONFIG=' + json.dumps(config).replace('<','\\u003c') + ';'

