"""Public entry, navigation, assets, and sample boundaries."""
import io
import json
from html.parser import HTMLParser

import soundfile as sf
from fastapi.testclient import TestClient
from voiceguard_addon.app import app

client=TestClient(app)


class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.links=[];self.assets=[]
    def handle_starttag(self,tag,attrs):
        attributes=dict(attrs)
        if 'id' in attributes:self.ids.append(attributes['id'])
        if tag=='a':self.links.append(attributes.get('href',''))
        if tag in ('script','img','audio') and 'src' in attributes:self.assets.append(attributes['src'])
        if tag=='link' and attributes.get('rel') in ('stylesheet','icon','apple-touch-icon'):self.assets.append(attributes.get('href',''))


def test_public_homepage_is_separate_from_dashboard():
    home=client.get('/');dashboard=client.get('/dashboard')
    assert home.status_code==dashboard.status_code==200
    assert 'A voice has' in home.text
    assert 'spatial-ui' in home.text and '/assets/spatial.css' in home.text
    assert 'id="modelSelect"' not in home.text
    assert 'id="modelSelect"' in dashboard.text
    assert 'id="signinDialog"' in home.text
    assert 'data-signin' in home.text
    for model in ('pella','nii','forensics','prosdd'):
        assert f'data-model="{model}"' in home.text
    assert 'id="project"' in home.text and 'SQLite' in home.text
    assert 'they stay unavailable' not in home.text
    assert 'href="/dashboard"' in home.text
    assert client.get('/index.html').text==home.text


def test_homepage_links_and_assets():
    page=Page();page.feed(client.get('/').text)
    assert len(page.ids)==len(set(page.ids))
    for href in set(page.links):
        if href.startswith('#'):assert href[1:] in page.ids
        elif href.startswith('/'):assert client.get(href).status_code==200
    for path in set(page.assets):
        if path.startswith('/'):assert client.get(path).status_code==200,path
    assert client.get('/assets/three.module.js').status_code==200
    assert 'not independently verified' in client.get('/').text


def test_public_samples_are_only_allowlisted_project_audio():
    for label in ('human','synthetic'):
        response=client.get('/api/public-demo/'+label)
        assert response.status_code==200
        audio,rate=sf.read(io.BytesIO(response.content))
        assert len(audio)>0 and rate>0
    assert client.get('/api/public-demo/private-recording.wav').status_code==404


def test_only_public_firebase_configuration_is_exposed():
    response=client.get('/public-config.js')
    config=json.loads(response.text.split('=',1)[1].rstrip(';'))
    assert set(config)=={'apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'}
    assert config['projectId']=='voiceguard-61a95'
    assert 'private_key' not in response.text
def test_landing_gsap_assets_are_scoped_to_home():
    from fastapi.testclient import TestClient
    from voiceguard_addon.app import app
    client = TestClient(app)
    home = client.get('/').text
    assets = ['/assets/vendor/gsap/gsap.min.js', '/assets/vendor/gsap/ScrollTrigger.min.js', '/assets/landing-motion.js?v=3']
    assert home.index(assets[0]) < home.index(assets[1]) < home.index(assets[2])
    assert '/assets/text-scroll.js' not in home
    assert '/assets/spatial.js' not in home
    for asset in assets + ['/assets/landing-motion.css?v=1']:
        assert client.get(asset).status_code == 200
    dashboard = client.get('/dashboard').text
    assert '/assets/landing-motion.js' not in dashboard
    assert '/assets/text-scroll.js' in dashboard
