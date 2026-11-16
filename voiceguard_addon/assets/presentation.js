(() => {
  const descriptions={
    pella:['PellaV2','Wav2Vec2 Base, fine-tuned for real/fake speech classification. Audio is normalized by its feature extractor.'],
    nii:['NII AntiDeepfake','MMS-300M with a trained binary classifier. Uses waveform layer normalization and mean-pooled speech features.'],
    forensics:['Forensics XLS-R Wild','XLS-R speech representations with AASIST graph-attention pooling. Uses peak normalization and a five-second center crop or repetition.'],
    prosdd:['Official ProSDD ASVspoof2019','XLS-R representations and a trained classifier. Uses a centered four-second crop or zero padding. This is separate from the private epoch-4 fine-tune.']
  };
  document.querySelectorAll('[data-about-model]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-about-model]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    const [title,detail]=descriptions[button.dataset.aboutModel];document.getElementById('aboutModelTitle').textContent=title;document.getElementById('aboutModelDetail').textContent=detail;
  }));
  const fileInput=document.getElementById('guideFile');let objectUrl=null,probe=null,version=0;
  fileInput?.addEventListener('change',()=>{
    const token=++version;if(probe){probe.removeAttribute('src');probe.load();}if(objectUrl)URL.revokeObjectURL(objectUrl);
    const file=fileInput.files[0],result=document.getElementById('guideFileResult');if(!file){result.textContent='Choose a file to check.';return;}
    const extension=file.name.split('.').pop().toLowerCase(),valid=['wav','mp3','flac','ogg','m4a','aac','mp4','webm'].includes(extension);
    if(!valid||file.size>25*1024*1024||file.size===0){result.textContent=!valid?'Choose a supported audio format.':file.size===0?'This file is empty.':'This file exceeds 25 MB.';return;}
    result.textContent=`${file.name}: format and size accepted. Reading duration locally…`;
    probe=new Audio();objectUrl=URL.createObjectURL(file);
    probe.onloadedmetadata=()=>{if(token!==version)return;const d=probe.duration;result.textContent=Number.isFinite(d)?`${file.name}: ${d.toFixed(1)} seconds, ${(file.size/1024/1024).toFixed(2)} MB. ${d>300?'Too long: maximum five minutes.':d<.5?'Too short: record at least half a second.':'Within upload limits. This does not assess recording quality or authenticity.'}`:'Format and size accepted. Duration could not be read here; the backend must validate it.';};
    probe.onerror=()=>{if(token===version)result.textContent='Format and size accepted. This browser cannot read the duration; the backend must validate it.';};probe.src=objectUrl;
  });
  const reportForm=document.getElementById('reportBuilder');
  function report(){return `VoiceGuard issue\nModel: ${document.getElementById('reportModel').value}\n\n${document.getElementById('reportIssue').value.trim()}`;}
  const issue=document.getElementById('prepareGithubIssue');
  function updateIssue(){if(issue)issue.href='https://github.com/kamulugariabhinav-cmd/fieldproj-v2/issues/new?title='+encodeURIComponent('VoiceGuard issue')+'&body='+encodeURIComponent(report());}
  reportForm?.addEventListener('input',updateIssue);reportForm?.addEventListener('change',updateIssue);if(reportForm)updateIssue();
  reportForm?.addEventListener('submit',event=>{event.preventDefault();location.href='mailto:abhinavkamulugari@gmail.com?subject=VoiceGuard%20issue&body='+encodeURIComponent(report());});
  document.getElementById('copyIssue')?.addEventListener('click',async()=>{const status=document.getElementById('reportStatus');try{await navigator.clipboard.writeText(report());status.textContent='Report copied. Review it before sharing.';}catch{status.textContent='Clipboard access is unavailable. You can use Prepare email or the GitHub issue link.';}});
  const icons={email:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',github:'<path d="M9 20c-4 1-4-2-6-2m12 4v-4a3 3 0 0 0-.8-2.3c3-.3 6-1.5 6-6.5A5 5 0 0 0 19 5.7a4.7 4.7 0 0 0-.1-3.2S17.7 2.2 15 4a13 13 0 0 0-6 0C6.3 2.2 5.1 2.5 5.1 2.5A4.7 4.7 0 0 0 5 5.7a5 5 0 0 0-1.2 3.5c0 5 3 6.2 6 6.5A3 3 0 0 0 9 18v4"/>',issue:'<path d="M8 4h8l4 5-2 11H6L4 9zM9 1v3m6-3v3M1 10h4m14 0h4M1 16h5m12 0h5M12 8v7m0 3v1"/>'};
  document.querySelectorAll('.support-page main a[href]').forEach(link=>{const href=link.getAttribute('href'),kind=href.startsWith('mailto:')?'email':href.includes('/issues/')?'issue':href.includes('github.com')?'github':null;if(kind){link.classList.add('contact-link-icon');link.insertAdjacentHTML('afterbegin',`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[kind]}</svg>`);}});
  window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);},{once:true});
})();
