const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),storage=new Map();let authCallback,exportBlob,history=[{id:'one'}],resetEmail='',verification=0,micStops=0,deletions=0,reauthentications=0,redirect='';
function element(){return {events:{},style:{},value:'',checked:false,disabled:false,children:[],textContent:'',setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.events[name]=fn;},dispatchEvent(){},click(){},querySelector:()=>node('signinLink')};}
const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
node('modelSelect').options=[{value:'pella',textContent:'Pella',disabled:false},{value:'nii',textContent:'NII',disabled:false}];node('modelSelect').value='pella';
const user={uid:'account1',email:'reader@example.com',displayName:'Reader',emailVerified:false,providerData:[{providerId:'password'}],metadata:{creationTime:'2026-11-01',lastSignInTime:'2026-11-13'},getIdToken:async()=> 'PRIVATE_TOKEN',updateProfile:async data=>user.displayName=data.displayName,sendEmailVerification:async()=>verification++};
const auth={currentUser:user,onAuthStateChanged(fn){authCallback=fn;fn();},sendPasswordResetEmail:async email=>resetEmail=email,signOut:async()=>{auth.currentUser=null;await authCallback();}};
const firebase={apps:[{}],auth:()=>auth};
firebase.auth.EmailAuthProvider={credential:(email,password)=>({email,password})};user.reauthenticateWithCredential=async()=>reauthentications++;
const context=vm.createContext({document:{getElementById:node,createElement:element,querySelector:()=>node('navSettings'),documentElement:{classList:{toggle(){}}}},window:{firebase,vgDatabase:{ready:true,clear:async()=>history=[]}},firebase,
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},fetch:async(path,options)=>{if(path==='/api/user/account'){deletions++;assert.equal(options.method,'DELETE');assert.equal(JSON.parse(options.body).confirmation,'DELETE');}return {ok:true,json:async()=>path.endsWith('/history')?{records:history}:{storage:'sqlite',history_count:history.length,profile:{last_seen:'today'}}};},location:{assign:value=>redirect=value},
 Blob,URL:{createObjectURL:blob=>(exportBlob=blob,'blob:test'),revokeObjectURL(){}},setTimeout:fn=>fn(),Event:class{},confirm:()=>true,navigator:{permissions:{query:async()=>({state:'denied'})}},cancelRecording:()=>micStops++,stopLive(){},console});
(async()=>{
 vm.runInContext(fs.readFileSync(__dirname+'/assets/settings.js','utf8'),context);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(node('settingsName').value,'Reader');assert.equal(node('settingsPassword').disabled,false);
 assert.equal(node('settingsAvatars').children.length,6);await node('settingsAvatars').children[2].events.click();assert.match(node('accountAvatar').style.backgroundImage,/ai-avatars/);
 await node('settingsVerify').events.click();assert.equal(verification,1);
 await node('settingsPassword').events.click();assert.equal(resetEmail,user.email);
 node('settingsName').value='New name';await node('settingsProfileForm').events.submit({preventDefault(){}});assert.equal(user.displayName,'New name');
 await node('settingsExport').events.click();const exported=await exportBlob.text();assert(exported.includes('reader@example.com'));assert(!exported.includes('PRIVATE_TOKEN'));
 await node('settingsClear').events.click();assert.equal(history.length,0);assert.match(node('settingsStatus').textContent,/deleted/);
 await node('settingsCheckMic').events.click();assert.match(node('settingsMicStatus').textContent,/denied/);
 await node('settingsStopMic').events.click();assert.equal(micStops,1);
 node('settingsDefaultModel').value='nii';node('settingsReduceMotion').checked=true;await node('settingsSavePreferences').events.click();assert.equal(storage.get('voiceguard-default-model'),'nii');
 await node('settingsDeleteAccount').events.click();assert.equal(deletions,0);assert.match(node('settingsStatus').textContent,/Type DELETE/);
 node('settingsDeleteConfirm').value='DELETE';node('settingsDeletePassword').value='current-password';await node('settingsDeleteAccount').events.click();assert.equal(reauthentications,1);assert.equal(deletions,1);assert.equal(redirect,'/');assert.equal(node('settingsDeletePassword').value,'');
 await node('settingsSignOut').events.click();assert.equal(node('settingsPassword').disabled,true);assert.equal(node('settingsSignOut').disabled,true);
 console.log('Settings: account updates, security actions, token-free data export, history deletion, permission checks, preferences, and guest controls passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
