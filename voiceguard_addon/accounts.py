"""Username profiles and Firebase-backed authentication/deletion. No password storage."""
import base64
import binascii
import hashlib
import json
import re
import sqlite3
import time
import httpx
from fastapi import APIRouter,HTTPException,Request,Response
from voiceguard_addon.database import connect,identity,payload,firebase_api_key,COOKIE

router=APIRouter()

async def account_payload(request):
    data=await payload(request)
    if not isinstance(data,dict):raise HTTPException(400,'Expected a JSON object.')
    return data

async def firebase_call(method,data):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response=await client.post('https://identitytoolkit.googleapis.com/v1/accounts:'+method,params={'key':firebase_api_key()},json=data)
    except httpx.HTTPError as exc:
        raise HTTPException(503,'Firebase could not be reached. Check your connection and try again.') from exc
    try:
        result=response.json()
        if not isinstance(result,dict):raise ValueError('Invalid Firebase response')
        return response.status_code,result
    except ValueError as exc:raise HTTPException(503,'Firebase returned an unreadable response. Try again later.') from exc

def username(value):
    if not isinstance(value,str) or not re.fullmatch(r'[a-zA-Z0-9_]{3,30}',value):
        raise HTTPException(400,'Use a username of 3–30 letters, numbers, or underscores.')
    return value.lower()

def throttle(request,name):
    now=time.time()
    # Persist limits across server restarts; never retain usernames/passwords in this table.
    with connect() as db:
        db.execute('DELETE FROM auth_attempts WHERE started<?',(now-900,))
        for prefix,value,limit in [('ip',request.client.host if request.client else 'unknown',30),('username',name,10)]:
            key=hashlib.sha256((prefix+':'+value).encode()).hexdigest()
            row=db.execute('SELECT attempts FROM auth_attempts WHERE bucket=?',(key,)).fetchone()
            if row and row[0]>=limit:raise HTTPException(429,'Too many sign-in attempts. Wait 15 minutes before trying again.')
            db.execute('INSERT INTO auth_attempts VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1',(key,now))

@router.post('/api/auth/check-username')
async def check_username(request:Request,response:Response):
    data=await account_payload(request)
    name=username(data.get('username'))
    with connect() as db:
        taken=db.execute('SELECT 1 FROM account_profiles WHERE username=?',(name,)).fetchone()
    response.headers['Cache-Control']='no-store'
    if taken:raise HTTPException(409,'This username is already taken. Choose another.')
    return {'available':True}

@router.post('/api/auth/username-login')
async def username_login(request:Request,response:Response):
    data=await account_payload(request);name=username(data.get('username'));password=data.get('password')
    if not isinstance(password,str) or not 1<=len(password)<=4096:raise HTTPException(400,'Enter your password.')
    throttle(request,name)
    with connect() as db:
        row=db.execute('SELECT u.email,u.user_key FROM users u JOIN account_profiles p ON p.user_key=u.user_key WHERE p.username=?',(name,)).fetchone()
    email=row['email'] if row else 'missing-account@invalid.example'
    status,result=await firebase_call('signInWithPassword',{'email':email,'password':password,'returnSecureToken':True})
    response.headers['Cache-Control']='no-store'
    if status>=500:raise HTTPException(503,'The sign-in service is temporarily unavailable.')
    if status!=200 or not row or 'firebase:'+result.get('localId','')!=row['user_key']:
        raise HTTPException(401,'The username or password is incorrect.')
    # Reveal the email only after Firebase validates this username/password pair.
    # The browser then establishes its normal Firebase SDK session.
    return {'email':row['email']}

@router.post('/api/user/profile')
async def save_profile(request:Request,response:Response):
    data=await account_payload(request);key=await identity(request,response)
    if not key.startswith('firebase:'):raise HTTPException(401,'Sign in to save an account profile.')
    with connect() as db:
        old=db.execute('SELECT * FROM account_profiles WHERE user_key=?',(key,)).fetchone()
        old=dict(old) if old else {'username':None,'full_name':'','mobile':'','avatar':0}
        name=username(data['username']) if data.get('username') else old['username']
        full_name=data.get('full_name',old['full_name']);mobile=data.get('mobile',old['mobile']);avatar=data.get('avatar',old['avatar'])
        if not isinstance(full_name,str) or len(full_name)>100:raise HTTPException(400,'Name must be at most 100 characters.')
        if not isinstance(mobile,str) or (mobile and not re.fullmatch(r'\+?[0-9]{8,15}',mobile)):raise HTTPException(400,'Enter an 8–15 digit mobile number, optionally starting with +.')
        if type(avatar) is not int or not 0<=avatar<=6:raise HTTPException(400,'Choose a valid profile picture.')
        try:db.execute('INSERT INTO account_profiles VALUES(?,?,?,?,?) ON CONFLICT(user_key) DO UPDATE SET username=excluded.username,full_name=excluded.full_name,mobile=excluded.mobile,avatar=excluded.avatar',(key,name,full_name.strip(),mobile,avatar))
        except sqlite3.IntegrityError as exc:raise HTTPException(409,'This username is already taken. Choose another.') from exc
    return {'saved':True}

def require_recent_login(token):
    try:
        body=token.split('.')[1];claims=json.loads(base64.urlsafe_b64decode(body+'='*(-len(body)%4)))
        age=time.time()-float(claims['auth_time'])
        if not -60<=age<=300:raise ValueError()
    except (ValueError,KeyError,IndexError,TypeError,binascii.Error):
        raise HTTPException(401,'Sign out and sign in again, then delete your account within five minutes.')

@router.delete('/api/user/account')
async def delete_account(request:Request,response:Response):
    data=await account_payload(request)
    if data.get('confirmation')!='DELETE':raise HTTPException(400,'Type DELETE to confirm account deletion.')
    key=await identity(request,response)
    if not key.startswith('firebase:'):raise HTTPException(401,'Sign in before deleting an account.')
    token=request.headers['authorization'].partition(' ')[2]
    require_recent_login(token) # Token was validated by Firebase in identity().
    with connect() as db:
        status,result=await firebase_call('delete',{'idToken':token})
        if status!=200:raise HTTPException(503 if status>=500 else 401,'Account deletion did not complete. Your server data was retained. Sign in again and retry; contact the developer if the account is no longer accessible.')
        db.execute('DELETE FROM users WHERE user_key=?',(key,))
    response.delete_cookie(COOKIE,path='/');response.headers['Cache-Control']='no-store'
    return {'deleted':True}
