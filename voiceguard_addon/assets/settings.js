(() => {
  const page=document.getElementById('settingsPage');if(!page)return;
  const byId=id=>document.getElementById(id),status=byId('settingsStatus');
  const firebaseAuth=()=>window.firebase?.apps?.length?firebase.auth():null;
  const account=()=>firebaseAuth()?.currentUser||null;
  let generation=0;
  const providers=user=>user?.providerData?.map(item=>item.providerId)||[];
  async function request(path,user=account(),method='GET',body){
    const headers={'X-VoiceGuard-Client':'1'};if(user)headers.Authorization=`Bearer ${await user.getIdToken()}`;if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(path,{method,credentials:'same-origin',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await response.json();if(!response.ok)throw Error(result.detail||'Could not read saved data.');return result;
  }
  let selectedAvatar=0;const avatarButtons=[];
  function applyAvatar(value){
    selectedAvatar=value;avatarButtons.forEach((button,index)=>button.setAttribute('aria-pressed',String(index+1===value)));
    ['profileAvatar','accountAvatar'].forEach(id=>{const target=byId(id);if(!target)return;target.textContent=value?'':(account()?.displayName||'Guest').slice(0,1).toUpperCase();target.style.backgroundImage=value?"url('/assets/ai-avatars.png')":'';target.style.backgroundSize=value?'300% 300%':'';target.style.backgroundPosition=value?`${((value-1)%3)*50}% ${value>3?87.5:12.5}%`:'';});
  }
  for(let index=1;index<=6;index++){
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`AI avatar ${index}`);button.setAttribute('aria-pressed','false');button.style.backgroundPosition=`${((index-1)%3)*50}% ${index>3?87.5:12.5}%`;
    button.addEventListener('click',async()=>{if(!account())return;button.disabled=true;try{await request('/api/user/profile',account(),'POST',{avatar:index});applyAvatar(index);status.textContent='Profile picture saved.';}catch(error){status.textContent=error.message;}finally{button.disabled=!account();}});avatarButtons.push(button);byId('settingsAvatars').append(button);
  }
  function snapshot(user){return user?{uid:user.uid,displayName:user.displayName,email:user.email,emailVerified:user.emailVerified,providers:providers(user),createdAt:user.metadata?.creationTime,lastSignIn:user.metadata?.lastSignInTime}:{kind:'guest'};}
  function rows(user){
    const container=byId('settingsAccount');container.replaceChildren();
    const values=user?{'Display name':user.displayName||'Not set','Email':user.email||'Not provided','Email verified':user.emailVerified?'Yes':'No','Sign-in methods':providers(user).join(', ')||'Not provided','Account ID':user.uid,'Created':user.metadata?.creationTime||'Not provided','Last sign-in':user.metadata?.lastSignInTime||'Not provided'}:{Session:'Guest',Storage:'This browser’s private guest cookie'};
    Object.entries(values).forEach(([key,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;container.append(dt,dd);});
  }
  async function render(){
    const version=++generation,user=account(),password=providers(user).includes('password');rows(user);
    byId('settingsName').value=user?.displayName||'';
    ['settingsName','settingsUsername','settingsMobile','settingsSaveName','settingsSignOut','settingsDeleteAccount','settingsResetAvatar'].forEach(id=>byId(id).disabled=!user);avatarButtons.forEach(button=>button.disabled=!user);
    byId('settingsVerify').disabled=!user?.email||user.emailVerified;
    byId('settingsPassword').disabled=!user?.email||!password;
    page.querySelector('.settings-signin').hidden=!!user;
    byId('settingsSecurityNote').textContent=user?(password?'Reset links are sent to your account email address.': 'This account uses an external sign-in provider. Manage its password with that provider.'):'Sign in to manage account security.';
    byId('settingsClear').disabled=!window.vgDatabase?.ready;
    try{const data=await request('/api/user',user);if(version!==generation)return;byId('settingsUsername').value=data.profile.username||'';byId('settingsMobile').value=data.profile.mobile||'';applyAvatar(data.profile.avatar||0);byId('settingsStorage').textContent=`Storage: ${data.storage}. Saved history: ${data.history_count} records. Server profile last seen: ${data.profile.last_seen}.`;status.textContent=user?'Account settings loaded.':'Guest settings loaded. Preferences stay in this browser.';}
    catch(error){if(version===generation)status.textContent=error.message;}
  }
  function action(id,operation){byId(id).addEventListener('click',async()=>{const button=byId(id);button.disabled=true;try{await operation();}catch(error){status.textContent=error.code==='auth/requires-recent-login'?'Sign out and sign in again before making this account change.':error.message||'This action could not be completed.';}finally{const user=account(),locked={settingsDeleteAccount:!user,settingsResetAvatar:!user,settingsSignOut:!user,settingsVerify:!user?.email||user.emailVerified,settingsPassword:!user?.email||!providers(user).includes('password'),settingsClear:!window.vgDatabase?.ready};button.disabled=locked[id]??false;}});}
  byId('settingsProfileForm').addEventListener('submit',async event=>{
    event.preventDefault();const user=account(),name=byId('settingsName').value.trim();if(!user)return;if(!name){status.textContent='Enter a display name.';return;}
    byId('settingsSaveName').disabled=true;
    try{await request('/api/user/profile',user,'POST',{full_name:name,username:byId('settingsUsername').value.trim(),mobile:byId('settingsMobile').value.replace(/[\s()-]/g,'')});await user.updateProfile({displayName:name});if(account()!==user)return;if(typeof updateProfile==='function')updateProfile(user);await render();status.textContent='Profile saved.';}catch(error){status.textContent=error.message;}finally{byId('settingsSaveName').disabled=!account();}
  });
  action('settingsResetAvatar',async()=>{if(!account())return;await request('/api/user/profile',account(),'POST',{avatar:0});applyAvatar(0);status.textContent='Profile picture reset to your initial.';});
  action('settingsDeleteAccount',async()=>{
    const user=account();if(!user)throw Error('Sign in before deleting an account.');
    if(typeof busy!=='undefined'&&busy)throw Error('Wait for the current analysis to finish before deleting your account.');
    if(byId('settingsDeleteConfirm').value!=='DELETE')throw Error('Type DELETE exactly to confirm permanent deletion.');
    if(!confirm('Permanently delete your account and all server history? Export any data you need first.'))return;
    const methods=providers(user);
    if(methods.includes('password')){
      const password=byId('settingsDeletePassword').value;if(!password)throw Error('Enter your current password to confirm deletion.');
      try{await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email,password));}finally{byId('settingsDeletePassword').value='';}
    }else if(methods.includes('google.com'))await user.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
    else if(methods.includes('github.com'))await user.reauthenticateWithPopup(new firebase.auth.GithubAuthProvider());
    else throw Error('Sign out and sign in again with a supported provider to delete your account.');
    await user.getIdToken(true);await request('/api/user/account',user,'DELETE',{confirmation:'DELETE'});
    if(typeof cancelRecording==='function')cancelRecording();if(typeof stopLive==='function')stopLive();await firebaseAuth().signOut();location.assign('/');
  });
  action('settingsVerify',async()=>{const user=account();if(!user||user.emailVerified)return;await user.sendEmailVerification();status.textContent='Verification email sent. Follow the link, then sign in again to refresh your status.';});
  action('settingsPassword',async()=>{const user=account();if(!user?.email||!providers(user).includes('password'))return;await firebaseAuth().sendPasswordResetEmail(user.email);status.textContent='Password reset email sent. Follow the link to choose a new password.';});
  action('settingsSignOut',async()=>{if(typeof cancelRecording==='function')cancelRecording();if(typeof stopLive==='function')stopLive();await firebaseAuth()?.signOut();await render();status.textContent='Signed out of this browser.';});
  action('settingsExport',async()=>{
    const user=account();const [profile,history]=await Promise.all([request('/api/user',user),request('/api/user/history',user)]);if(account()!==user)throw Error('Your account changed. Try the export again.');
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),account:snapshot(user),server:profile,records:history.records},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='voiceguard-personal-data.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Your personal-data download is ready. Store it somewhere private.';
  });
  action('settingsClear',async()=>{
    if(!window.vgDatabase?.ready)throw Error('Reconnect the database before deleting history.');
    if(!confirm('Delete all saved analysis history for this account or guest session on this server? This cannot be undone.'))return;
    const user=account();await window.vgDatabase.clear();if(account()!==user)throw Error('Your account changed. Check the history page.');
    const result=await request('/api/user/history',user);if(result.records.length)throw Error('History could not be fully cleared. Check the database connection and try again.');await render();status.textContent='Saved analysis history deleted. Your sign-in account remains active.';
  });
  action('settingsCheckMic',async()=>{try{const permission=await navigator.permissions.query({name:'microphone'});byId('settingsMicStatus').textContent=`Microphone permission: ${permission.state}. Change it using the browser’s site settings.`;}catch{byId('settingsMicStatus').textContent='This browser does not expose microphone permission status. Check its site settings.';}});
  action('settingsStopMic',async()=>{if(typeof cancelRecording==='function')cancelRecording();if(typeof stopLive==='function')stopLive();byId('settingsMicStatus').textContent='Microphone use stopped in this tab. Browser permission was not revoked.';status.textContent='Microphone stopped and recording timer reset.';});
  const model=byId('modelSelect'),preferred=byId('settingsDefaultModel');
  [...model.options].forEach(item=>{const option=document.createElement('option');option.value=item.value;option.textContent=item.textContent;option.disabled=item.disabled;preferred.append(option);});
  try{const saved=localStorage.getItem('voiceguard-default-model');if([...model.options].some(option=>option.value===saved&&!option.disabled)){model.value=saved;model.dispatchEvent(new Event('change',{bubbles:true}));}preferred.value=model.value;byId('settingsReduceMotion').checked=localStorage.getItem('voiceguard-reduce-transitions')==='1';}catch{}
  document.documentElement.classList.toggle('reduce-transitions',byId('settingsReduceMotion').checked);
  action('settingsSavePreferences',async()=>{localStorage.setItem('voiceguard-default-model',preferred.value);localStorage.setItem('voiceguard-reduce-transitions',byId('settingsReduceMotion').checked?'1':'0');document.documentElement.classList.toggle('reduce-transitions',byId('settingsReduceMotion').checked);status.textContent='Browser preferences saved. The default model will be used next time you open the workspace.';});
  document.querySelector('[data-page="settings"]').addEventListener('click',render);
  if(firebaseAuth())firebaseAuth().onAuthStateChanged(render);else render();
})();
