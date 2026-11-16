"""Persistence, isolation, and identity validation against a real temporary DB."""
import sqlite3
from unittest.mock import AsyncMock, patch

import pytest
import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient

from voiceguard_addon.app import app

HEADERS = {'X-VoiceGuard-Client':'1'}
RECORD = {'id':'sample-1','date':'2026-11-12T10:00:00Z','filename':'sample.wav',
          'model':'PellaV2','score':2.5,'prediction':'Human Detected'}


@pytest.mark.parametrize('body', [b'not-json', b'[]', b'{"users":{}}', b'{"users":[null]}', b'{"users":[{"localId":{},"email":[]}]}'])
def test_malformed_firebase_lookup_is_unavailable_not_an_internal_error(body):
    upstream = httpx.Response(200, content=body)
    with patch('httpx.AsyncClient.post', new=AsyncMock(return_value=upstream)):
        response = TestClient(app).get('/api/user', headers={'Authorization':'Bearer example'})
    assert response.status_code == 503
    assert 'unreadable' in response.json()['detail']


@pytest.fixture
def database(tmp_path,monkeypatch):
    path=tmp_path/'users.sqlite3'
    monkeypatch.setenv('VOICEGUARD_DB_PATH',str(path))
    return path


def test_guest_data_persists_and_is_isolated(database):
    alice,bob=TestClient(app),TestClient(app)
    profile=alice.get('/api/user')
    assert profile.status_code==200
    assert profile.json()['storage']=='sqlite'
    assert 'HttpOnly' in profile.headers['set-cookie']
    assert alice.post('/api/user/history',headers=HEADERS,json={'records':[RECORD]}).status_code==200
    assert bob.get('/api/user/history').json()['records']==[]
    # New client reusing the private cookie finds the persisted server record.
    reopened=TestClient(app);reopened.cookies.update(alice.cookies)
    assert reopened.get('/api/user/history').json()['records'][0]['id']==RECORD['id']
    with sqlite3.connect(database) as db:
        assert db.execute('SELECT count(*) FROM history').fetchone()[0]==1
    assert bob.request('DELETE','/api/user/history/sample-1',headers=HEADERS,json={}).status_code==200
    assert len(alice.get('/api/user/history').json()['records'])==1
    assert alice.request('DELETE','/api/user/history/sample-1',headers=HEADERS,json={}).status_code==200
    assert alice.get('/api/user/history').json()['records']==[]


def test_firebase_identity_is_verified_not_client_supplied(database):
    account={'localId':'firebase-alice','email':'alice@example.test','displayName':'Alice'}
    token_headers=dict(HEADERS,Authorization='Bearer test-token')
    with patch('voiceguard_addon.database.verify_firebase',new=AsyncMock(return_value=account)) as verify:
        alice=TestClient(app)
        response=alice.get('/api/user',headers=token_headers)
        assert response.json()['profile']['email']=='alice@example.test'
        assert alice.post('/api/user/history',headers=token_headers,json={'uid':'someone-else','records':[RECORD]}).status_code==200
        verify.assert_awaited_with('test-token')
    with patch('voiceguard_addon.database.verify_firebase',new=AsyncMock(return_value=dict(account,localId='firebase-bob'))):
        assert TestClient(app).get('/api/user/history',headers=token_headers).json()['records']==[]
    with patch('voiceguard_addon.database.verify_firebase',new=AsyncMock(side_effect=HTTPException(401,'Invalid token'))):
        assert TestClient(app).get('/api/user/history',headers=token_headers).status_code==401
    with sqlite3.connect(database) as db:
        assert db.execute('SELECT user_key FROM history').fetchone()[0]=='firebase:firebase-alice'


def test_invalid_writes_and_history_limit(database):
    client=TestClient(app)
    client.get('/api/user')
    assert client.post('/api/user/history',json={'records':[RECORD]}).status_code==403
    assert client.post('/api/user/history',headers=dict(HEADERS,Origin='https://other.test'),json={'records':[RECORD]}).status_code==403
    assert client.post('/api/user/history',headers=HEADERS,json={'records':[dict(RECORD,date='invalid')]}).status_code==400
    assert client.post('/api/user/history',headers=HEADERS,json={'records':[dict(RECORD,id='../x')]}).status_code==400
    records=[dict(RECORD,id=f'row-{i:03}') for i in range(100)]
    assert client.post('/api/user/history',headers=HEADERS,json={'records':records}).status_code==200
    assert client.post('/api/user/history',headers=HEADERS,json={'records':[dict(RECORD,id='newest')]}).status_code==200
    assert len(client.get('/api/user/history').json()['records'])==100
    assert client.request('DELETE','/api/user/history',headers=HEADERS,json={}).status_code==200
    assert client.get('/api/user/history').json()['records']==[]
