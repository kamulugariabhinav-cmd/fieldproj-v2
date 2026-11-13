/* Small UI enhancements for the optional VoiceGuard server. */
(() => {
  const sidebar = document.getElementById('sidebar');
  const navigation = document.getElementById('menuBtn');
  if (sidebar && navigation) {
    const shell=document.querySelector('.app-shell');
    const syncNavigation=()=>navigation.setAttribute('aria-expanded',String(innerWidth<=760?sidebar.classList.contains('open'):!shell.classList.contains('sidebar-collapsed')));
    const observer=new MutationObserver(syncNavigation);
    observer.observe(sidebar,{attributes:true,attributeFilter:['class']});
    observer.observe(shell,{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',syncNavigation);syncNavigation();
  }
  const orb = document.getElementById('voiceOrb');
  const panel = document.querySelector('.live-panel');
  if (orb && panel) {
    orb.addEventListener('pointermove', event => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = orb.getBoundingClientRect();
      orb.style.setProperty('--orb-x', `${(event.clientX - rect.left - rect.width / 2) * .09}px`);
      orb.style.setProperty('--orb-y', `${(event.clientY - rect.top - rect.height / 2) * .09}px`);
    });
    orb.addEventListener('pointerleave', () => {
      orb.style.setProperty('--orb-x', '0px'); orb.style.setProperty('--orb-y', '0px');
    });
    orb.addEventListener('click', () => {
      const active = !document.getElementById('stopLive').disabled;
      document.getElementById(active ? 'stopLive' : 'startLive').click();
    });
    const sync = () => {
      const active = panel.classList.contains('is-live');
      orb.setAttribute('aria-pressed', String(active));
      orb.setAttribute('aria-label', active ? 'Stop live microphone detection' : 'Start live microphone detection');
    };
    new MutationObserver(sync).observe(panel, {attributes: true, attributeFilter: ['class']});
    sync();
  }
  const fab = document.getElementById('developerFab');
  if (fab) document.body.appendChild(fab);
  const show = document.getElementById('showDeveloperLinks');
  let idleTimer;
  const wakeLinks = () => {
    if (!fab) return;
    clearTimeout(idleTimer); fab.classList.remove('is-idle');
    idleTimer = setTimeout(() => {
      if (fab.matches(':focus-within,:hover')) return;
      fab.classList.add('is-idle'); fab.classList.remove('open');
      document.getElementById('fabToggle').setAttribute('aria-expanded', 'false');
    }, 4000);
  };
  ['pointerdown','pointermove','keydown','scroll'].forEach(type => document.addEventListener(type, wakeLinks, {passive:true}));
  fab?.addEventListener('pointerleave', wakeLinks);
  fab?.addEventListener('focusout', wakeLinks);
  wakeLinks();
  show?.addEventListener('click', () => {
    if (!fab) { location.href = '/contact'; return; }
    wakeLinks(); fab.classList.remove('hidden'); fab.classList.add('open');
    document.getElementById('fabToggle').setAttribute('aria-expanded', 'true');
    document.getElementById('fabToggle').focus();
  });
  // Keep the original modal available; email is a direct link in this menu.
  const contact = document.getElementById('fabContact');
  contact?.addEventListener('click', event => {
    event.stopImmediatePropagation();
    location.href = 'mailto:abhinavkamulugari@gmail.com?subject=VoiceGuard%20feedback';
  }, true);
  document.addEventListener('click', event => {
    if (fab && !fab.contains(event.target) && event.target !== show) {
      fab.classList.remove('open');
      document.getElementById('fabToggle').setAttribute('aria-expanded', 'false');
    }
  });

  const exportButton = document.getElementById('exportHistory');
  const formats = document.getElementById('exportFormats');
  const exportStatus = document.getElementById('exportStatus');
  exportButton?.addEventListener('click', () => {
    const open = formats.classList.toggle('hidden') === false;
    exportButton.setAttribute('aria-expanded',String(open));
    if (open) formats.querySelector('button').focus();
  });
  const closeExport = () => { formats?.classList.add('hidden');exportButton?.setAttribute('aria-expanded','false'); };
  document.addEventListener('keydown', event => { if(event.key==='Escape'){closeExport();fab?.classList.remove('open');} });
  document.addEventListener('click',event=>{if(formats&&!formats.contains(event.target)&&event.target!==exportButton)closeExport();});
  formats?.addEventListener('click', async event => {
    const button = event.target.closest('[data-export-format]');
    if (!button) return;
    const format = button.dataset.exportFormat;
    const query = document.getElementById('historySearch').value.trim().toLowerCase();
    const filter = document.getElementById('historyFilter').value;
    const records = getHistory().filter(record => {
      const matches = `${record.filename} ${record.model}`.toLowerCase().includes(query);
      const ai = record.prediction === 'AI Detected';
      return matches && (filter==='all'||(filter==='ai'?ai:!ai));
    });
    if (!records.length) { exportStatus.textContent='No matching records to export.';closeExport();exportButton.focus();return; }
    exportButton.disabled=true;exportStatus.textContent=`Preparing ${format.toUpperCase()} for ${records.length} records…`;closeExport();
    try {
      let blob;
      if(format==='json') blob=new Blob([JSON.stringify(records,null,2)],{type:'application/json'});
      else {
        const response=await fetch(`/api/history/export/${format}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({records})});
        if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.detail||'Export failed.');}
        blob=await response.blob();
      }
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`voiceguard-history.${format}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      exportStatus.textContent=`Downloaded ${records.length} records as ${format.toUpperCase()}.`;
    } catch(error){exportStatus.textContent=error.message;}
    finally{exportButton.disabled=false;exportButton.focus();}
  });
})();
