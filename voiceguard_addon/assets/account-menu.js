(() => {
  const trigger=document.getElementById('accountBtn');if(!trigger)return;
  const wrapper=trigger.closest('.account-menu'),panel=document.getElementById('accountMenuPanel');
  const email=document.getElementById('accountMenuEmail'),caption=document.getElementById('accountMenuCaption');
  const logout=document.getElementById('accountMenuLogout'),signin=document.getElementById('accountMenuSignin');
  const status=document.getElementById('accountMenuStatus');
  const auth=window.firebase?.apps?.length?window.firebase.auth():null;
  let hideTimer;
  function show(){clearTimeout(hideTimer);panel.hidden=false;trigger.setAttribute('aria-expanded','true');}
  function close(){clearTimeout(hideTimer);panel.hidden=true;trigger.setAttribute('aria-expanded','false');}
  function render(user){
    email.textContent=user?.email||'Not signed in';
    caption.textContent=user?'Signed in as':'Guest session';
    logout.hidden=!user;signin.hidden=!!user;status.textContent='';
  }
  render(auth?.currentUser);
  auth?.onAuthStateChanged(user=>{render(user);close();});
  trigger.addEventListener('click',show);
  trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();show();document.getElementById('accountMenuProfile').focus();}});
  wrapper.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')show();});
  wrapper.addEventListener('pointerleave',()=>{hideTimer=setTimeout(()=>{if(!wrapper.contains(document.activeElement))close();},180);});
  wrapper.addEventListener('focusout',event=>{if(!wrapper.contains(event.relatedTarget))close();});
  document.addEventListener('click',event=>{if(!wrapper.contains(event.target))close();});
  wrapper.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();trigger.focus();}});
  document.getElementById('accountMenuProfile').addEventListener('click',()=>{close();setPage('profile');});
  logout.addEventListener('click',async()=>{
    logout.disabled=true;status.textContent='Signing out...';
    try{
      if(typeof cancelRecording==='function')cancelRecording();
      if(typeof stopLive==='function')stopLive();
      await auth.signOut();close();
    }catch(error){status.textContent=`Sign-out failed: ${error.message||'Please try again.'}`;}
    finally{logout.disabled=false;}
  });
})();
