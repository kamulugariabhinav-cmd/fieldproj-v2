/* Additional Firebase providers. Credentials are passed only to Firebase SDK. */
(() => {
  const dialog=document.getElementById('signinDialog'),status=document.getElementById('signinStatus');
  if(!dialog||!status)return;
  const description=dialog.querySelector('h2 + p');
  if(description)description.textContent='Sign in with Google, GitHub, or email to save your profile and access your analysis history on this server.';
  const options=document.createElement('section');options.className='additional-signin';options.setAttribute('aria-label','More sign-in options');
  options.innerHTML=`<button class="button github-signin" id="homepageGithub" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1a11 11 0 0 0-3.5 21.4c.5.1.7-.2.7-.5v-2c-2.9.6-3.5-1.2-3.5-1.2-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.5 1.2 3.1.9.1-.7.4-1.2.7-1.5-2.3-.3-4.8-1.2-4.8-5.4 0-1.2.4-2.2 1.1-2.9-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3 1.1a10.3 10.3 0 0 1 5.5 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.7 1.1 1.7 1.1 2.9 0 4.2-2.5 5.1-4.9 5.4.4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A11 11 0 0 0 12 1Z"/></svg>Continue with GitHub</button><div class="signin-divider"><span>or use email or username</span></div><form id="homepageEmailForm"><label for="homepageEmail" id="homeIdentityLabel">Email or username</label><input id="homepageEmail" type="text" autocomplete="username" maxlength="254" required placeholder="Email address or username"><div id="signupFields" hidden><label for="signupName">Full name</label><input id="signupName" autocomplete="name" maxlength="100" disabled><label for="signupMobile">Mobile number (not SMS-verified)</label><input id="signupMobile" type="tel" autocomplete="tel" placeholder="+919876543210" pattern="[+0-9]{8,16}" disabled><label for="signupUsername">Create username</label><input id="signupUsername" autocomplete="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_]{3,30}" disabled><p class="settings-note">Choose a unique username: 3-30 letters, numbers, or underscores. Usernames are not case-sensitive.</p></div><label for="homepagePassword" id="homePasswordLabel">Password</label><div class="password-field"><input id="homepagePassword" type="password" autocomplete="current-password" minlength="6" required><button id="toggleHomePassword" type="button" aria-label="Show password" aria-pressed="false">Show</button></div><div id="confirmPasswordField" hidden><label for="homepageConfirmPassword">Confirm password</label><input id="homepageConfirmPassword" type="password" autocomplete="new-password" disabled></div><button id="homepageEmailSubmit" type="submit" class="button primary">Sign in</button><div class="email-account-actions"><button id="homepageCreateAccount" type="button">Create account</button><button id="homepageResetPassword" type="button">Forgot password?</button></div></form>`;
  status.before(options);
  const auth=()=>window.firebase?.apps?.length?firebase.auth():null;
  const github=document.getElementById('homepageGithub'),form=document.getElementById('homepageEmailForm');
  const submit=document.getElementById('homepageEmailSubmit'),create=document.getElementById('homepageCreateAccount'),reset=document.getElementById('homepageResetPassword');
  const email=document.getElementById('homepageEmail'),password=document.getElementById('homepagePassword');let creating=false,pendingRegistration=null;
  const rules=document.createElement('p');rules.id='signupPasswordRules';rules.className='settings-note';rules.hidden=true;
  rules.textContent='Use at least 8 characters, including an uppercase letter (A-Z), a lowercase letter (a-z), a number, and a symbol. Passwords must match.';
  document.getElementById('confirmPasswordField').before(rules);
  password.setAttribute('aria-describedby',rules.id);
  function passwordIssue(value){
    if(value.length<8)return 'Use at least 8 characters.';
    if(!/[A-Z]/.test(value))return 'Add an uppercase letter (A-Z).';
    if(!/[a-z]/.test(value))return 'Add a lowercase letter (a-z).';
    if(!/[0-9]/.test(value))return 'Add a number.';
    if(!/[^A-Za-z0-9\s]/.test(value))return 'Add a symbol, such as !, @, #, or _.';
    return '';
  }
  password.addEventListener('input',()=>password.setCustomValidity(creating?passwordIssue(password.value):''));
  function feedback(error){
    const messages={
      'auth/operation-not-allowed':'This provider is not enabled in Firebase Authentication. Check the provider settings.',
      'auth/unauthorized-domain':'This website address is not authorized in Firebase Authentication.',
      'auth/account-exists-with-different-credential':'This email already uses another sign-in method. Sign in with the original provider.',
      'auth/popup-closed-by-user':'Sign-in was closed. You can try again.',
      'auth/popup-blocked':'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
      'auth/invalid-credential':'The email or password is incorrect.',
      'auth/wrong-password':'The email or password is incorrect.',
      'auth/user-not-found':'The email or password is incorrect.',
      'auth/email-already-in-use':'An account already uses this email. Sign in or reset your password.',
      'auth/weak-password':'Use a stronger password that meets the Firebase password policy.',
      'auth/password-does-not-meet-requirements':'Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.',
      'auth/too-many-requests':'Too many attempts. Please wait before trying again.',
      'auth/network-request-failed':'The sign-in service could not be reached. Check your connection.'
    };
    status.textContent=messages[error.code]||'Sign-in did not complete. Please try again.';
  }
  const busy=value=>{[github,submit,create,reset,document.getElementById('homepageGoogle')].forEach(button=>{if(button)button.disabled=value;});};
  github.addEventListener('click',async()=>{
    if(!auth()){status.textContent='Firebase sign-in is unavailable. Check your connection.';return;}
    busy(true);status.textContent='Waiting for GitHub sign-in…';
    try{await auth().signInWithPopup(new firebase.auth.GithubAuthProvider());location.assign('/dashboard');}
    catch(error){feedback(error);}finally{busy(false);}
  });
  create.addEventListener('click',()=>{
    creating=!creating;document.getElementById('signupFields').hidden=!creating;document.getElementById('confirmPasswordField').hidden=!creating;['signupName','signupMobile','signupUsername','homepageConfirmPassword'].forEach(id=>{const field=document.getElementById(id);field.disabled=!creating;field.required=creating;});document.getElementById('homeIdentityLabel').textContent=creating?'Email address':'Email or username';document.getElementById('homePasswordLabel').textContent=creating?'Create password (at least 8 characters)':'Password';email.type=creating?'email':'text';email.autocomplete=creating?'email':'username';password.minLength=creating?8:1;submit.textContent=creating?'Create account':'Sign in';
    create.textContent=creating?'Use an existing account':'Create account';
    password.autocomplete=creating?'new-password':'current-password';status.textContent='';email.focus();
    rules.hidden=!creating;password.setCustomValidity('');
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    if(!auth()){status.textContent='Firebase sign-in is unavailable. Check your connection.';return;}
    busy(true);status.textContent=creating?'Creating your account…':'Signing in…';
    try{
      if(creating){
        const confirm=document.getElementById('homepageConfirmPassword');
        if(password.value!==confirm.value){status.textContent='Passwords do not match.';return;}
        const issue=passwordIssue(password.value);
        if(issue){status.textContent=issue;password.setCustomValidity(issue);password.reportValidity();return;}
        if(!pendingRegistration){
          const check=await fetch('/api/auth/check-username',{method:'POST',headers:{'Content-Type':'application/json','X-VoiceGuard-Client':'1'},body:JSON.stringify({username:document.getElementById('signupUsername').value.trim()})});
          const availability=await check.json();
          if(!check.ok){status.textContent=availability.detail||'The username could not be checked. Try again.';return;}
        }
        window.VOICEGUARD_REGISTRATION_PENDING=true;
        const result=pendingRegistration?{user:pendingRegistration}:await auth().createUserWithEmailAndPassword(email.value.trim(),password.value);
        pendingRegistration=result.user;
        if(result.user.email.toLowerCase()!==email.value.trim().toLowerCase()){status.textContent='Finish this account with its original email, or sign in with that email and edit your profile in Settings.';return;}
        await result.user.updateProfile({displayName:document.getElementById('signupName').value.trim()});
        const response=await fetch('/api/user/profile',{method:'POST',headers:{'Content-Type':'application/json','X-VoiceGuard-Client':'1',Authorization:'Bearer '+await result.user.getIdToken()},body:JSON.stringify({username:document.getElementById('signupUsername').value.trim(),full_name:document.getElementById('signupName').value.trim(),mobile:document.getElementById('signupMobile').value.replace(/[\s()-]/g,'')})});
        const data=await response.json();if(!response.ok){status.textContent=(data.detail||'Profile could not be saved.')+' Your email account exists; correct the fields and retry, or sign in with your email.';return;}
        await result.user.sendEmailVerification().catch(()=>{});pendingRegistration=null;
      }else{
        let identity=email.value.trim();
        if(!identity.includes('@')){
          const response=await fetch('/api/auth/username-login',{method:'POST',headers:{'Content-Type':'application/json','X-VoiceGuard-Client':'1'},body:JSON.stringify({username:identity,password:password.value})});
          const data=await response.json();if(!response.ok){status.textContent=data.detail||'The username or password is incorrect.';return;}identity=data.email;
        }
        await auth().signInWithEmailAndPassword(identity,password.value);
      }
      password.value='';document.getElementById('homepageConfirmPassword').value='';
      window.VOICEGUARD_REGISTRATION_PENDING=false;
      location.assign('/dashboard');
    }catch(error){feedback(error);}finally{window.VOICEGUARD_REGISTRATION_PENDING=false;busy(false);}
  });
  reset.addEventListener('click',async()=>{
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())){status.textContent='Enter your email address to request a password reset.';email.focus();return;}
    if(!auth()){status.textContent='Firebase sign-in is unavailable. Check your connection.';return;}
    busy(true);
    try{await auth().sendPasswordResetEmail(email.value.trim());status.textContent='If an account exists for this email, a reset link will be sent.';}
    catch(error){feedback(error);}finally{busy(false);}
  });
  document.getElementById('toggleHomePassword').addEventListener('click',event=>{
    const show=password.type==='password';password.type=show?'text':'password';
    event.currentTarget.textContent=show?'Hide':'Show';event.currentTarget.setAttribute('aria-pressed',String(show));event.currentTarget.setAttribute('aria-label',show?'Hide password':'Show password');
  });
  dialog.addEventListener('close',()=>{password.value='';document.getElementById('homepageConfirmPassword').value='';password.type='password';const toggle=document.getElementById('toggleHomePassword');toggle.textContent='Show';toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Show password');});
})();
