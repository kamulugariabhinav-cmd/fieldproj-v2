"""Export public frontend files only, without importing the ML runtime."""
import ipaddress
import json
import os
from pathlib import Path
import shutil
from urllib.parse import urlsplit

from voiceguard_addon.pages import render_dashboard, render_home, render_script, render_public_config
from voiceguard_addon.ui import supporting_page

ROOT = Path(__file__).resolve().parent.parent


def backend_origin(value):
    if not value:
        return ''
    url = urlsplit(value)
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ('', '/'):
        raise ValueError('VOICEGUARD_BACKEND_ORIGIN must be a public HTTPS origin without a path or credentials')
    host = url.hostname.lower()
    if host == 'localhost' or host.endswith(('.localhost', '.local')):
        raise ValueError('Vercel cannot reach a localhost backend')
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        if not address.is_global:
            raise ValueError('Vercel requires a publicly reachable backend')
    return value.rstrip('/')


def build(output, origin=''):
    origin = backend_origin(origin)
    static = output / 'static'
    static.mkdir(parents=True, exist_ok=True)
    pages = {'index.html': render_home(), 'dashboard.html': render_dashboard(),
             **{name + '.html': supporting_page(name) for name in ('about', 'guide', 'contact')},
             'voiceguard.js': render_script(), 'public-config.js': render_public_config()}
    pages['index.html'] = pages['index.html'].replace('2 trained detectors', '4 research detectors').replace(
        'PellaV2 and NII AntiDeepfake have trained weights installed. The dashboard also lists ProSDD and Forensics; they stay unavailable until their required checkpoints are supplied.',
        'Compare Forensics, Pella, NII AntiDeepfake, and ProSDD. Detection requires the connected backend and its trained checkpoints.')
    for name, content in pages.items():
        (static / name).write_text(content, encoding='utf-8')
    for name in ('style.css', 'config.js', 'firebase-config.js'):
        shutil.copy2(ROOT / name, static / name)
    shutil.copytree(ROOT / 'voiceguard_addon/assets', static / 'assets', dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('*.map', 'README*', '*.html'))
    (static / 'backend-unavailable.json').write_text(json.dumps({
        'detail': 'The public VoiceGuard backend is not connected. Configure VOICEGUARD_BACKEND_ORIGIN and redeploy.'
    }), encoding='utf-8')
    routes = [{'src': '/(.*)', 'headers': {'X-Content-Type-Options': 'nosniff',
               'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin'}, 'continue': True}]
    api = '/((?:api(?:/.*)?|health|detect|docs|openapi\\.json|redoc))'
    routes.append({'src': api, 'dest': origin + '/$1', 'headers': {'Cache-Control': 'no-store'}} if origin else
                  {'src': api, 'dest': '/backend-unavailable.json', 'status': 503,
                   'headers': {'Cache-Control': 'no-store', 'Content-Type': 'application/json'}})
    routes.extend([{'src': '/', 'dest': '/index.html'},
                   {'src': '/(dashboard|about|guide|contact)/?', 'dest': '/$1.html'},
                   {'handle': 'filesystem'}, {'src': '/.*', 'status': 404}])
    (output / 'config.json').write_text(json.dumps({'version': 3, 'routes': routes}, indent=2), encoding='utf-8')
    size = sum(p.stat().st_size for p in static.rglob('*') if p.is_file())
    print(f'VoiceGuard frontend: {size / 1024 / 1024:.2f} MB; backend: {origin or "not configured"}')


if __name__ == '__main__':
    build(ROOT / '.vercel/output', os.getenv('VOICEGUARD_BACKEND_ORIGIN', ''))
