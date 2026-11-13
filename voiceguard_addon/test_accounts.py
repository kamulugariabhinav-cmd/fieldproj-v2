import base64,json,sqlite3,time
from unittest.mock import AsyncMock,patch
import pytest
from fastapi.testclient import TestClient
from voiceguard_addon.app import app
from voiceguard_addon.test_database import database

HEADERS={'X-VoiceGuard-Client':'1','Authorization':'Bearer token'}
ALICE={'localId':'alice','displayName':'Alice','email':'alice@example.test'}

def test_profiles_are_unique_and_private(database):
    client=TestClient(app)
    with patch('voiceguard_addon.database.verify_firebase',new=AsyncMock(return_value=ALICE)):
        assert client.post('/api/user/profile',headers=HEADERS,json={'username':'Reader_1','full_name':'Alice','mobile':'+919876543210','avatar':3}).status_code==200
        profile=client.get('/api/user',headers=HEADERS).json()['profile'];assert profile['username']=='reader_1' and profile['avatar']==3
        assert client.post('/api/user/profile',headers=HEADERS,json={'avatar':99}).status_code==400
        assert client.post('/api/user/profile',headers=HEADERS,json={'mobile':'invalid'}).status_code==400
    with patch('voiceguard_addon.database.verify_firebase',new=AsyncMock(return_value=dict(ALICE,localId='bob',email='bob@example.test'))):
        assert client.post('/api/user/profile',headers=HEADERS,json={'username':'READER_1'}).status_code==409
        assert client.get('/api/user',headers=HEADERS).json()['profile']['mobile']==''
    assert client.post('/api/user/profile',headers={'X-VoiceGuard-Client':'1'},json={'avatar':1}).status_code==401

def test_username_login_validates_password_before_returning_email(database):
    client=TestClient(app)
    with patch('voiceguard_addon.database.verify_firebase',new=AsyncMock(return_value=ALICE)):
        client.post('/api/user/profile',headers=HEADERS,json={'username':'reader_1'})
    with patch('voiceguard_addon.accounts.firebase_call',new=AsyncMock(return_value=(400,{'error':'invalid'}))):
        bad=client.post('/api/auth/username-login',headers={'X-VoiceGuard-Client':'1'},json={'username':'reader_1','password':'wrong'});assert bad.status_code==401;assert ALICE['email'] not in bad.text
    with patch('voiceguard_addon.accounts.firebase_call',new=AsyncMock(return_value=(200,{'localId':'alice','idToken':'secret'}))):
        good=client.post('/api/auth/username-login',headers={'X-VoiceGuard-Client':'1'},json={'username':'READER_1','password':'correct'});assert good.json()=={'email':ALICE['email']}
        for _ in range(10):response=client.post('/api/auth/username-login',headers={'X-VoiceGuard-Client':'1'},json={'username':'reader_1','password':'correct'})
        assert response.status_code==429
    with sqlite3.connect(database) as db:assert 'password' not in str(db.execute('PRAGMA table_info(account_profiles)').fetchall())

def token(age=0):
    body=base64.urlsafe_b64encode(json.dumps({'auth_time':time.time()-age}).encode()).decode().rstrip('=');return 'header.'+body+'.signature'

def test_deletion_requires_recent_login_and_rolls_back_on_firebase_failure(database):
    client=TestClient(app);headers=dict(HEADERS,Authorization='Bearer '+token())
    with patch('voiceguard_addon.database.verify_firebase',new=AsyncMock(return_value=ALICE)):
        client.post('/api/user/profile',headers=headers,json={'username':'reader_1','avatar':4})
        assert client.request('DELETE','/api/user/account',headers=headers,json={'confirmation':'no'}).status_code==400
        old=dict(headers,Authorization='Bearer '+token(900));assert client.request('DELETE','/api/user/account',headers=old,json={'confirmation':'DELETE'}).status_code==401
        with patch('voiceguard_addon.accounts.firebase_call',new=AsyncMock(return_value=(400,{}))):
            assert client.request('DELETE','/api/user/account',headers=headers,json={'confirmation':'DELETE'}).status_code==401
        with sqlite3.connect(database) as db:assert db.execute('SELECT count(*) FROM account_profiles').fetchone()[0]==1
        with patch('voiceguard_addon.accounts.firebase_call',new=AsyncMock(return_value=(200,{}))):
            assert client.request('DELETE','/api/user/account',headers=headers,json={'confirmation':'DELETE'}).json()=={'deleted':True}
    with sqlite3.connect(database) as db:
        assert db.execute('SELECT count(*) FROM account_profiles').fetchone()[0]==0
        assert db.execute('SELECT count(*) FROM users').fetchone()[0]==0
