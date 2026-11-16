"""The deployed site must contain the rendered UI, never Python or checkpoints."""
import json
import re

import pytest
from voiceguard_addon.build_frontend import build, backend_origin
from voiceguard_addon.pages import render_dashboard, render_script


def test_frontend_contains_local_ui_and_all_referenced_assets(tmp_path):
    build(tmp_path)
    static = tmp_path / 'static'
    assert (static / 'dashboard.html').read_text(encoding='utf-8') == render_dashboard()
    assert (static / 'voiceguard.js').read_text(encoding='utf-8') == render_script()
    for page in static.glob('*.html'):
        content = page.read_text(encoding='utf-8')
        for asset in re.findall(r'(?:src|href)=["\'](/[^"\'?#]+)', content):
            if asset.startswith('/assets/') or asset.endswith(('.js', '.css')):
                assert (static / asset.lstrip('/')).is_file(), (page.name, asset)
    assert 'landing-motion.js' in (static / 'index.html').read_text(encoding='utf-8')
    assert not list(static.rglob('*.py'))
    assert not list(static.rglob('*.pth'))
    assert json.loads((tmp_path / 'config.json').read_text())['routes'][1]['status'] == 503


def test_backend_proxy_preserves_api_paths(tmp_path):
    build(tmp_path, 'https://voiceguard.example.com/')
    routes = json.loads((tmp_path / 'config.json').read_text())['routes']
    proxy = routes[1]
    assert proxy['dest'] == 'https://voiceguard.example.com/$1'
    for path in ('/api/detect', '/api/db/profile', '/api/health', '/health', '/detect'):
        assert re.fullmatch(proxy['src'], path).group(1) == path.lstrip('/')
    assert re.fullmatch(proxy['src'], '/dashboard') is None


@pytest.mark.parametrize('value', ['http://127.0.0.1:8001', 'https://localhost',
    'https://192.168.1.1', 'https://user:secret@example.com', 'https://example.com/api'])
def test_backend_must_be_public_https_origin(value):
    with pytest.raises(ValueError):
        backend_origin(value)
