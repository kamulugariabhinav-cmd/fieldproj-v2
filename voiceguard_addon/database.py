"""Durable per-user SQLite storage with verified Firebase or private guest IDs."""
import hashlib
import json
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from voiceguard_addon.exports import validate

router = APIRouter()
COOKIE = 'voiceguard_session'
DEFAULT_DB = Path(__file__).resolve().parent / 'data' / 'voiceguard.sqlite3'


@contextmanager
def connect():
    path = Path(os.getenv('VOICEGUARD_DB_PATH', str(DEFAULT_DB)))
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript('''
      CREATE TABLE IF NOT EXISTS users (
        user_key TEXT PRIMARY KEY, kind TEXT NOT NULL, display_name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, last_seen TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS history (
        user_key TEXT NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
        record_id TEXT NOT NULL, recorded_at TEXT NOT NULL, data TEXT NOT NULL,
        PRIMARY KEY(user_key,record_id));
      CREATE INDEX IF NOT EXISTS history_owner_date ON history(user_key,recorded_at DESC);
      CREATE TABLE IF NOT EXISTS account_profiles (
        user_key TEXT PRIMARY KEY REFERENCES users(user_key) ON DELETE CASCADE,
        username TEXT UNIQUE, full_name TEXT NOT NULL DEFAULT '',
        mobile TEXT NOT NULL DEFAULT '', avatar INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS auth_attempts (
        bucket TEXT PRIMARY KEY, started REAL NOT NULL, attempts INTEGER NOT NULL);
    ''')
    try:
        with db:
            yield db
    finally:
        db.close()


def firebase_api_key():
    configured = os.getenv('VOICEGUARD_FIREBASE_API_KEY')
    if configured:
        return configured
    # Firebase's web API key is public configuration, not an admin credential.
    source = (Path(__file__).resolve().parent.parent / 'voiceguard.js').read_text(encoding='utf-8')
    match = re.search(r'apiKey:\s*"([^"]+)"', source)
    if not match:
        raise HTTPException(503, 'Firebase sign-in is not configured on the server.')
    return match[1]


async def verify_firebase(token):
    # Google validates the token; never trust a UID supplied by the browser.
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            result = await client.post('https://identitytoolkit.googleapis.com/v1/accounts:lookup',
                params={'key': firebase_api_key()}, json={'idToken': token})
    except httpx.HTTPError as exc:
        raise HTTPException(503, 'Firebase verification is temporarily unavailable.') from exc
    if result.status_code != 200:
        if result.status_code >= 500:
            raise HTTPException(503, 'Firebase verification is temporarily unavailable.')
        raise HTTPException(401, 'Your sign-in could not be verified. Sign in again.')
    try:
        data = result.json()
        if not isinstance(data, dict) or not isinstance(data.get('users', []), list):
            raise ValueError('Invalid account response')
        users = data.get('users', [])
        if any(not isinstance(user, dict) for user in users):
            raise ValueError('Invalid account response')
        for user in users:
            if any(not isinstance(user.get(field, ''), str) for field in ('localId', 'displayName', 'email')):
                raise ValueError('Invalid account fields')
    except (ValueError, TypeError) as exc:
        raise HTTPException(503, 'Firebase returned an unreadable account response. Try again later.') from exc
    if len(users) != 1 or not users[0].get('localId') or users[0].get('disabled'):
        raise HTTPException(401, 'Invalid Firebase account.')
    return users[0]


async def identity(request, response):
    authorization = request.headers.get('authorization')
    if authorization:
        scheme, _, token = authorization.partition(' ')
        if scheme.lower() != 'bearer' or not 1 <= len(token) <= 8192:
            raise HTTPException(401, 'Invalid authorization header.')
        account = await verify_firebase(token)
        key = 'firebase:' + account['localId']
        kind, name, email = 'firebase', account.get('displayName', '')[:200], account.get('email', '')[:320]
    else:
        session = request.cookies.get(COOKIE, '')
        if not re.fullmatch(r'[A-Za-z0-9_-]{43}', session):
            session = secrets.token_urlsafe(32)
            response.set_cookie(COOKIE, session, max_age=60*60*24*30, httponly=True,
                secure=request.url.scheme == 'https', samesite='strict', path='/')
        key = 'guest:' + hashlib.sha256(session.encode()).hexdigest()
        kind, name, email = 'guest', 'Guest', ''
    now = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute('''INSERT INTO users(user_key,kind,display_name,email,created_at,last_seen)
          VALUES(?,?,?,?,?,?) ON CONFLICT(user_key) DO UPDATE SET
          display_name=excluded.display_name,email=excluded.email,last_seen=excluded.last_seen''',
          (key,kind,name,email,now,now))
    response.headers['Cache-Control'] = 'no-store'
    return key


async def payload(request):
    origin = request.headers.get('origin')
    if origin and (urlparse(origin).scheme, urlparse(origin).netloc) != (request.url.scheme, request.url.netloc):
        raise HTTPException(403, 'Cross-origin database writes are not allowed.')
    if request.headers.get('x-voiceguard-client') != '1':
        raise HTTPException(403, 'Missing client request header.')
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 512000:
            raise HTTPException(413, 'Database request is too large.')
    try:
        return json.loads(body) if body else {}
    except (ValueError, UnicodeError) as exc:
        raise HTTPException(400, 'Invalid database request.') from exc


@router.get('/api/user')
async def profile(request: Request, response: Response):
    key = await identity(request, response)
    with connect() as db:
        user = dict(db.execute('SELECT kind,display_name,email,created_at,last_seen FROM users WHERE user_key=?', (key,)).fetchone())
        count = db.execute('SELECT count(*) FROM history WHERE user_key=?', (key,)).fetchone()[0]
        extra=db.execute('SELECT username,full_name,mobile,avatar FROM account_profiles WHERE user_key=?',(key,)).fetchone()
        user.update(dict(extra) if extra else {'username':None,'full_name':'','mobile':'','avatar':0})
    return {'profile': user, 'history_count': count, 'storage': 'sqlite'}


@router.get('/api/user/history')
async def history(request: Request, response: Response):
    key = await identity(request, response)
    with connect() as db:
        rows = db.execute('SELECT data FROM history WHERE user_key=? ORDER BY recorded_at DESC,record_id DESC LIMIT 100', (key,)).fetchall()
    return {'records': [json.loads(row[0]) for row in rows]}


@router.post('/api/user/history')
async def save_history(request: Request, response: Response):
    data = await payload(request)
    clean = validate(data)
    for raw, record in zip(data['records'], clean):
        record_id = raw.get('id', '')
        if not isinstance(record_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', record_id):
            raise HTTPException(400, 'History records require valid IDs.')
        try:
            date = datetime.fromisoformat(record['date'].replace('Z', '+00:00'))
            if date.tzinfo is None:
                raise ValueError()
            record['date'] = date.astimezone(timezone.utc).isoformat()
        except ValueError as exc:
            raise HTTPException(400, 'History dates must include a valid timezone.') from exc
        record['id'] = record_id
    key = await identity(request, response)
    with connect() as db:
        for record in clean:
            db.execute('''INSERT INTO history(user_key,record_id,recorded_at,data) VALUES(?,?,?,?)
              ON CONFLICT(user_key,record_id) DO UPDATE SET recorded_at=excluded.recorded_at,data=excluded.data''',
              (key, record['id'], record['date'], json.dumps(record)))
        db.execute('''DELETE FROM history WHERE user_key=? AND record_id NOT IN
          (SELECT record_id FROM history WHERE user_key=? ORDER BY recorded_at DESC,record_id DESC LIMIT 100)''', (key,key))
    return {'saved': len(clean)}


@router.delete('/api/user/history/{record_id}')
async def remove_history(record_id: str, request: Request, response: Response):
    await payload(request)
    key = await identity(request, response)
    with connect() as db:
        db.execute('DELETE FROM history WHERE user_key=? AND record_id=?', (key,record_id))
    return {'deleted': True}


@router.delete('/api/user/history')
async def clear_history(request: Request, response: Response):
    await payload(request)
    key = await identity(request, response)
    with connect() as db:
        db.execute('DELETE FROM history WHERE user_key=?', (key,))
    return {'deleted': True}
