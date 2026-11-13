/* Server storage. Authentication tokens and raw audio are never persisted here. */
(() => {
  const status = document.getElementById('databaseStatus');
  if (!status) return;
  let user = null, generation = 0, queue = Promise.resolve();
  const pending = new Map();
  const scope = account => account?.uid || 'guest';
  const state = window.vgDatabase = {records: [], ready: false};
  const tell = text => {
    status.textContent = text;
    const indicator=document.getElementById('databaseIndicator');
    const failed=/unavailable|not saved|not ready/i.test(text);
    if(indicator)indicator.textContent=failed?'Needs attention':text.startsWith('Connecting')?'Connecting':'Connected';
    if(failed){const details=status.closest('details');if(details)details.open=true;}
  };
  const redraw = () => { if (typeof renderHistory === 'function') renderHistory(); };
  const authHeaders = async account => {
    const headers = {'Content-Type':'application/json','X-VoiceGuard-Client':'1'};
    if (account) headers.Authorization = `Bearer ${await account.getIdToken()}`;
    return headers;
  };
  async function request(path, method='GET', body, account=user) {
    const response = await fetch(path,{method,credentials:'same-origin',headers:await authHeaders(account),
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result = await response.json().catch(()=>({}));
    if (!response.ok) throw Error(result.detail || 'Database request failed.');
    return result;
  }
  function enqueue(operation) {
    const account=user, version=generation;
    queue=queue.catch(()=>{}).then(async()=>{
      if(version!==generation) return;
      await operation(account);
      if(version===generation) tell(account?'Account history saved to server database.':'Guest history saved to server database for this browser.');
    }).catch(error=>{if(version===generation) tell(`Not saved to database: ${error.message} Retry after checking the connection.`);});
    return queue;
  }
  state.save = record => {
    if(!pending.has(scope(user)))pending.set(scope(user),new Map());
    pending.get(scope(user)).set(record.id,record);
    if(!state.ready){tell('Database is not ready. Press Reconnect to save pending scans.');return;}
    state.records=[record,...state.records.filter(item=>item.id!==record.id)].slice(0,100);redraw();
    return enqueue(async account=>{
      await request('/api/user/history','POST',{records:[record]},account);
      pending.get(scope(account))?.delete(record.id);
    });
  };
  state.remove = id => {
    if(!state.ready)return;
    return enqueue(async account=>{
      await request(`/api/user/history/${encodeURIComponent(id)}`,'DELETE',{},account);
      pending.get(scope(account))?.delete(id);
      if(user===account){state.records=state.records.filter(record=>record.id!==id);redraw();}
    });
  };
  state.clear = () => {
    if(!state.ready)return;
    return enqueue(async account=>{
      await request('/api/user/history','DELETE',{},account);
      pending.get(scope(account))?.clear();
      if(user===account){state.records=[];redraw();}
    });
  };
  async function load(account) {
    const version=++generation;user=account;state.ready=false;state.records=[];redraw();
    document.getElementById('retryDatabase').disabled=true;
    tell('Connecting to the user database…');
    try {
      await request('/api/user','GET',undefined,account);
      const unsaved=[...(pending.get(scope(account))?.values()||[])].slice(-100);
      if(unsaved.length){
        await request('/api/user/history','POST',{records:unsaved},account);
        unsaved.forEach(record=>pending.get(scope(account))?.delete(record.id));
      }
      const result=await request('/api/user/history','GET',undefined,account);
      if(version!==generation)return;
      state.records=result.records;state.ready=true;redraw();
      tell(account?'Account history loaded from server database.':'Guest history loaded from server database. Sign in to use the same history on other devices.');
      // Offer an explicit, one-time import; do not silently upload old browser data.
      const key=`voiceguard-history-${account?.uid || 'guest'}`;
      let local=[];try{local=JSON.parse(localStorage.getItem(key)||'[]');}catch{}
      const button=document.getElementById('importBrowserHistory');
      if(button){button.classList.toggle('hidden',!Array.isArray(local)||!local.length);}
    } catch(error) {
      if(version===generation){tell(`Database unavailable: ${error.message}`);state.ready=false;}
    } finally { if(version===generation)document.getElementById('retryDatabase').disabled=false; }
  }
  document.getElementById('retryDatabase')?.addEventListener('click',()=>load(user));
  document.getElementById('importBrowserHistory')?.addEventListener('click',()=>{
    if(!state.ready)return;
    const key=`voiceguard-history-${user?.uid || 'guest'}`;
    let records;try{records=JSON.parse(localStorage.getItem(key)||'[]');}catch{return;}
    if(!Array.isArray(records)||!records.length)return;
    enqueue(async account=>{
      await request('/api/user/history','POST',{records:records.slice(0,100)},account);
      const result=await request('/api/user/history','GET',undefined,account);
      if(user===account){state.records=result.records;redraw();document.getElementById('importBrowserHistory').classList.add('hidden');}
    });
  });
  if(window.firebase?.apps?.length && window.firebase?.auth){
    firebase.auth().onAuthStateChanged(account=>load(account));
  } else load(null);
  document.getElementById('signOut')?.addEventListener('click',()=>{
    state.records=[];state.ready=false;redraw();
  });
})();
