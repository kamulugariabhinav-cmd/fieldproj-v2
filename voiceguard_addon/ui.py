"""Presentation changes applied only by the optional local server."""
import re
from pathlib import Path
from html import escape
from voiceguard_addon.presentation import polish

DESCRIPTION = "Upload or record speech in VoiceGuard, compare trained deepfake detection models, and review model scores and local analysis history."
LIQUID = '<canvas id="liquidBackdrop" aria-hidden="true" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none"></canvas><script src="/assets/liquid-background.js?v=3" defer></script>'
LOGO = '<img src="/assets/voiceguard.svg" width="28" height="28" alt="" aria-hidden="true">'
NAV = '<nav class="support-nav" aria-label="Project information"><a href="/">Home</a><a href="/?signin=1">Dashboard</a><a href="/about">About the project</a><a href="/guide">Recording guide</a><a href="/contact">Contact</a><button id="showDeveloperLinks" type="button">Show developer links</button></nav>'


def metadata(title="VoiceGuard | Speech deepfake detection", description=DESCRIPTION):
    return f'''<meta name="description" content="{escape(description)}">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/voiceguard-social.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="VoiceGuard waveform logo. Speech deepfake detection.">
<link rel="icon" type="image/svg+xml" href="/assets/voiceguard.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
'''


def refine_html(html):
    html=html.replace('NEURAL DEFENSE // V2','NEURAL DEFENSE')
    html=html.replace('Holographic Wave Field','Holographic Signal')
    html=html.replace('<button class="ghost-button" id="resetCore">',
        '<button class="ghost-button" id="coreShape" aria-pressed="true">Orb view</button><button class="ghost-button" id="resetCore">')
    html=html.replace('Interactive 3D neon waves; drag to rotate and scroll to zoom','Animated signal waves; Ctrl-scroll to zoom')
    html=html.replace('DRAG TO ROTATE WAVES','<span id="coreInteractionHint">ANIMATED SIGNAL WAVES</span>')
    account_panel='''<div class="account-menu-panel" id="accountMenuPanel" role="region" aria-label="Account options" hidden>
<span class="account-menu-caption" id="accountMenuCaption">Guest session</span>
<strong id="accountMenuEmail">Not signed in</strong>
<button type="button" id="accountMenuProfile">View profile</button>
<button type="button" id="accountMenuLogout" hidden>Log out</button>
<a id="accountMenuSignin" href="/?signin=1">Sign in</a>
<p id="accountMenuStatus" role="status"></p></div>'''
    html=re.sub(r'(<button class="account-button" id="accountBtn"[^>]*>.*?</button>)',
        lambda m:'<div class="account-menu">'+m[1]+account_panel+'</div>',html,flags=re.S)
    html=html.replace('id="accountBtn" aria-label="Open profile"',
        'id="accountBtn" aria-label="Account options" aria-expanded="false" aria-controls="accountMenuPanel"')
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/account-menu.css?v=1"></head>')
    html=html.replace('</body>','<script src="/assets/account-menu.js?v=1" defer></script></body>')
    settings=(Path(__file__).parent/'assets/settings.html').read_text(encoding='utf-8')
    html=html.replace('<section class="page" id="profilePage">',settings+'<section class="page" id="profilePage">')
    settings_nav='<div class="settings-nav"><button class="nav-link" data-page="settings" aria-label="Settings"><span><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3z"/><circle cx="12" cy="12" r="3"/></svg></span><span class="settings-nav-label">Settings</span><small>04</small></button></div>'
    html=html.replace('<div class="side-bottom">',settings_nav+'<div class="side-bottom">')
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/settings.css?v=2"></head>')
    html=html.replace('</body>','<script src="/assets/settings.js?v=2" defer></script></body>')
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/model-select.css?v=3"></head>')
    html=html.replace('</body>','<script src="/assets/model-select.js?v=3" defer></script></body>')
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/dashboard-usability.css?v=6"></head>')
    html=re.sub(r'<div class="result-top">.*?<div class="score-track"><div id="scoreBar"></div></div>',
        '<div class="result-top"><div class="verdict" id="prediction" role="status" aria-live="polite">Awaiting analysis</div></div>',html,flags=re.S)
    html=re.sub(r'<span[^>]*>[^<]*3D INTERACTIVE</span>', '', html)
    html=html.replace('SCROLL TO ZOOM','CTRL + SCROLL TO ZOOM')
    html = re.sub(r'<div class="metric" id="thresholdMetric">.*?</div>', '', html, flags=re.S)
    html = re.sub(r'<meta name="description"[^>]*>', metadata(), html)
    html = html.replace('</head>', '<link rel="stylesheet" href="/assets/refinements.css"></head>')
    html = html.replace('<script src="voiceguard.js" defer></script>', '<script src="/voiceguard.js?v=local-8" defer></script><script src="/assets/database.js" defer></script>')
    html = html.replace('</head>', '<script src="/assets/waveform.js" defer></script></head>')
    html = html.replace('</body>', '<section class="database-panel" aria-label="User data storage"><p id="databaseStatus" role="status">Connecting to user database…</p><button id="retryDatabase" type="button">Reconnect</button><button id="importBrowserHistory" class="hidden" type="button">Import existing browser history</button></section></body>')
    html = html.replace('</body>', NAV + '<script src="/assets/interactions.js" defer></script></body>')
    html = re.sub(r'<div class="empty-result" id="emptyResult">.*?(?=<div class="analyzing-display)',
        '<div class="empty-result waiting-frame" id="emptyResult"><div class="analysis-controls"><span>STANDBY</span><span>Record or upload audio to begin.</span></div>'
        '<div class="audio-trace"><canvas id="awaitingWaveform" aria-label="Audio input waveform"></canvas><p id="awaitingWaveformStatus">No audio playing</p></div>'
        '<div class="analyzing-meta"><strong class="awaiting-heading" id="awaitingHeading">AWAITING AUDIO SIGNAL</strong>'
        '<p class="awaiting-subtext" id="awaitingSubtext">Upload a voice recording or record from microphone to run AI forensic detection.</p></div></div>\n\n', html, flags=re.S)
    html = html.replace('aria-label="Toggle menu">☰', 'aria-label="Toggle navigation" aria-controls="sidebar" aria-expanded="false" title="Toggle VoiceGuard sidebar">' + LOGO)
    icons = {
        "dashboard": '<path d="M3 10 12 3l9 7v11h-6v-7H9v7H3z"/>',
        "history": '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/><path d="M12 7v5l3 2"/>',
        "profile": '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    }
    for page, paths in icons.items():
        svg = f'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>'
        html = re.sub(r'(data-page="' + page + r'"><span>).*?(</span>)', r'\g<1>' + svg + r'\2', html)
    html = html.replace('<div class="voice-orb" id="voiceOrb" aria-hidden="true"></div>',
        '<button class="voice-orb" id="voiceOrb" aria-label="Start live microphone detection" aria-pressed="false" title="Tap to start or stop live detection"></button>')
    html = html.replace('<div class="analyzing-display hidden" id="analyzingDisplay">',
        '<div class="analyzing-display hidden" id="analyzingDisplay" aria-busy="true"><div class="analysis-controls"><span id="analysisElapsed" role="timer">Elapsed: 0s</span><span id="scannerHint">Drag to rotate. Tap for a pulse.</span></div>')
    html = html.replace('<div class="scanner-core">', '<button type="button" class="scanner-core" id="scannerInteractive" aria-label="Pulse the interactive scanner" title="Drag to rotate. Tap or press Enter for a pulse.">')
    html = html.replace('<span class="scanner-icon">⌁</span>\n\n                </div>', '<span class="scanner-icon">⌁</span>\n\n                </button>')
    html = html.replace('<span class="scanner-icon">⌁</span>', '<img class="scanner-icon" src="/assets/voiceguard.svg" width="44" height="44" alt="" aria-hidden="true">')
    html = re.sub(r'<div class="scanner-hologram">.*?<div class="analyzing-meta">',
        '<div class="audio-trace"><canvas id="analysisWaveform" role="button" tabindex="0" aria-label="Pause or resume the audio waveform" aria-pressed="false"></canvas><p id="waveformStatus" role="status">Waiting for audio</p></div><div class="analyzing-meta">', html, flags=re.S)
    html = html.replace('Drag to rotate. Tap for a pulse.', 'Tap waveform to pause or resume.')
    html = re.sub(r'<span class="fab-tooltip">.*?</span>', '', html, flags=re.S)
    html = html.replace('↓ Export JSON', '↓ Export history ▾')
    html = html.replace('id="exportHistory"', 'id="exportHistory" aria-expanded="false" aria-controls="exportFormats"')
    export_menu = '<div id="exportFormats" class="export-formats hidden" role="group" aria-label="Export history format">' + ''.join(f'<button type="button" data-export-format="{fmt}">{label}</button>' for fmt,label in [('pdf','PDF'),('xlsx','Excel (.xlsx)'),('docx','Word (.docx)'),('json','JSON')]) + '</div><p id="exportStatus" role="status" class="export-status"></p>'
    html = re.sub(r'(<button[^>]+id="exportHistory"[^>]*>.*?</button>)', lambda m:m[0]+export_menu, html, flags=re.S)
    html = html.replace('id="fabContact" aria-label="Contact Developer" title="Contact Developer"',
                        'id="fabContact" aria-label="Email developer" title="Email developer"')
    html = html.replace('>Contact Developer</span>', '>Email developer</span>')
    html = html.replace('two research detection engines', 'four research detection engines')
    html = html.replace('DUAL ENGINE', 'FOUR MODELS').replace('TWO RESEARCH ENGINES', 'FOUR RESEARCH ENGINES')
    html = html.replace('HISTORY STORED IN THIS BROWSER', 'HISTORY SAVED TO SERVER DATABASE')
    html = html.replace('Browse, filter, revisit, and remove your locally saved analysis records.', 'Browse, filter, export, and remove your database history.')
    html = html.replace('History is currently stored in this browser only. Google sign-in does not synchronize it or protect the detection API.',
        'History and profile details are saved in the server database. Sign in to access the same history from other devices connected to this server. Guest history belongs to this browser session. Audio files and passwords are not stored in the database.')
    html = html.replace('SPECTROGRAM MAPPING', '16 KHZ AUDIO').replace('ACOUSTIC PATTERNS', 'SELECTED MODEL')
    html = html.replace("Discover what's behind the voice. VoiceGuard uses advanced AI speech-forensics neural engines to analyze voice authenticity, detect synthetic voice spoofing, and safeguard audio communications in real time.",
                        'Upload a recording or use your microphone to check for synthetic speech. Compare model scores, listen to the audio, and save results in your browser. Research scores can be wrong.')
    storage = re.search(r'<section class="database-panel".*?</section>', html, flags=re.S)
    if storage:
        html = html.replace(storage[0], '').replace(NAV, '')
        footer = '<footer class="project-footer">' + NAV + '<details class="storage-details"><summary>User data <span id="databaseIndicator">Connecting</span></summary>' + storage[0] + '</details><p class="footer-disclaimer">Experimental audio forensics. Do not use results alone for identity, fraud, or authenticity decisions.</p></footer>'
        html = re.sub(r'<footer>.*?</footer>', lambda match: footer, html, flags=re.S)
    html = re.sub(r'<div class="bottom-note">.*?</div>', '', html, flags=re.S)
    html = re.sub(r'<div class="analysis-controls">.*?</div>', '', html, flags=re.S)
    # The six flagged em dashes are empty-result placeholders, not prose.
    html = html.replace('</head>', '<link rel="stylesheet" href="/assets/liquid-background.css?v=3"></head>')
    html = html.replace('<body>', '<body>' + LIQUID)
    return polish(html.replace('—', 'Not analyzed'),'dashboard')


def refine_script(source):
    source=source.replace('const waveLines = [];', '''const waveLines = [];
    let signalShape='wave';
    const signalCenter=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshBasicMaterial({color:0x00e0ee,wireframe:true,transparent:true,opacity:.35}));
    signalCenter.visible=false;
    group.add(signalCenter);''')
    source=source.replace('const x=(i/(samples-1)-.5)*7.2;', '''if(signalShape==='orb'){
            const angle=i/(samples-1)*Math.PI*2,longitude=layer/26*Math.PI;
            const ripple=(scanning?.23:.13)*Math.sin(angle*7+t*1.15+layer*.3)*Math.sin(angle*3-t*.35);
            const radius=1.63+ripple;
            points[i*3]=Math.cos(angle)*Math.sin(longitude)*radius;
            points[i*3+1]=Math.sin(angle)*radius;
            points[i*3+2]=Math.cos(angle)*Math.cos(longitude)*radius;
            continue;
          }
          const x=(i/(samples-1)-.5)*7.2;''')
    source=source.replace('const stage = $("coreStage");', '''const stage = $("coreStage");
    $("coreShape").addEventListener('click',()=>{
      signalShape=signalShape==='orb'?'wave':'orb';signalCenter.visible=signalShape==='orb';
      $("coreShape").textContent=signalShape==='orb'?'Wave view':'Orb view';
      $("coreShape").setAttribute('aria-pressed',String(signalShape==='wave'));
      $("coreInteractionHint").textContent=signalShape==='orb'?'DRAG TO ROTATE ORB':'ANIMATED SIGNAL WAVES';
      stage.setAttribute('aria-label',signalShape==='orb'?'Interactive signal orb; drag to rotate and Ctrl-scroll to zoom':'Animated signal waves; Ctrl-scroll to zoom');
      group.rotation.set(0,0,0);zoom=fitCoreZoom();camera.position.z=zoom;
      updateWaves(0);
    });''')
    source=source.replace('$("accountBtn").addEventListener("click", () => setPage("profile"));','')
    source=source.replace('liveActive=false;liveToken++;','liveActive=false;liveToken++;\n  clearResults();')
    source=source.replace('fetch(`${API_BASE}/api/detect`,','fetchDetection(`${API_BASE}/api/detect`,')
    activity=(Path(__file__).parent/'assets/detection-status.js').read_text(encoding='utf-8')
    source += '\n' + activity
    source=re.sub(r'^\s*\$\("(?:aiScore|scoreBar)"\)[^\n]+;', '', source, flags=re.MULTILINE)
    source=re.sub(r'^\s*\$\("prediction"\)\.textContent = [^\n]+;',
        '\n  $("prediction").textContent = ai ? "AI voice detected" : "Human voice detected";',source,flags=re.MULTILINE)
    source=source.replace('row.append(file,model,score,verdict,remove)', 'row.append(file,model,verdict,remove)')
    source=re.sub(r'\$\("liveStatus"\)\.textContent=`\$\{result\.ai\?"AI":"Human"\} indication[^`]+`;',
        '$("liveStatus").textContent=result.ai?"AI voice detected · listening again...":"Human voice detected · listening again...";',source)
    source=source.replace('if (activeLink && indicator) {','if(indicator)indicator.style.opacity=activeLink?.dataset.page==="settings"?"0":"1";\n  if (activeLink && indicator) {')
    recording=(Path(__file__).parent/'assets/recorder-functions.js').read_text(encoding='utf-8')
    source=re.sub(r'function stopMicrophone\(\).*?\$\("stopRecord"\)\.addEventListener\("click", stopRecording\);',lambda match:recording,source,flags=re.S)
    source=re.sub(r'(function resetApplication\(\)\s*\{)\s*if \(busy \|\| liveActive \|\| mediaRecorder\?\.state === "recording"\) return;',r'\1\n  if(busy||liveActive)return;\n  cancelRecording();message("Ready to upload or record audio.");',source,count=1)
    source=source.replace('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js','/assets/three.module.js')
    source=source.replace('Math.min(devicePixelRatio,2)','Math.min(devicePixelRatio,1.5)')
    source=source.replace('stage.addEventListener("wheel",e=>{e.preventDefault();','stage.addEventListener("wheel",e=>{if(!e.ctrlKey)return;e.preventDefault();')
    source=source.replace('const clock=new THREE.Clock();','let coreVisible=true;new IntersectionObserver(entries=>{coreVisible=entries[0].isIntersecting;}).observe(stage);const clock=new THREE.Clock();')
    source=source.replace('function frame(){requestAnimationFrame(frame);const t=clock.getElapsedTime();','function frame(){requestAnimationFrame(frame);if(document.hidden||!coreVisible){clock.getDelta();return;}const t=clock.getElapsedTime();')
    source = source.replace('setupLiquidBackground();', '')
    source = re.sub(r'^\s*\$\("threshold"\)\.textContent = [^\n]+;', '', source, flags=re.MULTILINE)
    source = source.replace('mediaRecorder?.state === "recording"', '["recording","paused"].includes(mediaRecorder?.state)')
    source = source.replace('mediaRecorder?.state==="recording"', '["recording","paused"].includes(mediaRecorder?.state)')
    source = source.replace('selectedFile = file;', 'selectedFile = file;\nwindow.dispatchEvent(new CustomEvent("voiceguard-file",{detail:file}));')
    source = source.replace('function getHistory() {', 'function getHistory() {\n  if(window.vgDatabase) return window.vgDatabase.records;')
    source = source.replace('function saveHistory(record) {', 'function saveHistory(record) {\n  if(window.vgDatabase) return window.vgDatabase.save(record);')
    source = source.replace('localStorage.setItem(historyKey(), JSON.stringify(getHistory().filter(item => item.id !== r.id)));',
        'if(window.vgDatabase){window.vgDatabase.remove(r.id);return;}\nlocalStorage.setItem(historyKey(), JSON.stringify(getHistory().filter(item => item.id !== r.id)));')
    source = source.replace('localStorage.removeItem(historyKey());renderHistory();',
        'if(window.vgDatabase){window.vgDatabase.clear();}else{localStorage.removeItem(historyKey());renderHistory();}')
    source = source.replace('Delete all locally stored history for this profile?', 'Delete all database history for this profile?')
    source = source.replace('$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));',
        '$("menuBtn").addEventListener("click", () => { if(innerWidth<=760){$("sidebar").classList.toggle("open");}else{document.querySelector(".app-shell").classList.toggle("sidebar-collapsed");} });')
    source = re.sub(r'\$\("exportHistory"\).addEventListener\("click", \(\) => \{.*?\n\}\);', '', source, flags=re.S)
    source = source.replace('let drag=false,px=0,py=0,spin=true,zoom=7.8;',
        'let drag=false,px=0,py=0,spin=true,zoom=7.8,motionTime=0;\n'
        '$("toggleSpin").textContent=spin?"Ⅱ Pause Motion":"▶ Resume Motion";\n'
        '$("toggleSpin").setAttribute("aria-pressed",String(!spin));')
    source = re.sub(r'\$\("toggleSpin"\).addEventListener\("click",\(\)=>\{spin=!spin;.*?\}\);',
        '$("toggleSpin").addEventListener("click",()=>{spin=!spin;$("toggleSpin").textContent=spin?"Ⅱ Pause Motion":"▶ Resume Motion";$("toggleSpin").setAttribute("aria-pressed",String(!spin));});', source)
    source = source.replace('const t=clock.getElapsedTime();if(spin&&!drag&&!reducedMotion)',
        'const dt=Math.min(clock.getDelta(),.05);if(spin)motionTime+=dt;const t=motionTime;if(spin&&!drag&&signalShape==="orb")')
    source=source.replace('stage.addEventListener("pointerdown",e=>{drag=true;',
        'stage.addEventListener("pointerdown",e=>{if(signalShape!=="orb")return;drag=true;')
    source=source.replace('if(!drag)return;group.rotation.y+=',
        'if(!drag||signalShape!=="orb")return;group.rotation.y+=')
    source = source.replace('"—"', '"Not available"')
    source=source.replace('function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}',
        '''function fitCoreZoom(){
      const tangent=Math.tan(20*Math.PI/180);
      return signalShape==='wave'
        ? Math.max(4.5,3.9/(tangent*camera.aspect),2/tangent)
        : Math.max(4.5,1.95/(tangent*Math.min(1,camera.aspect)));
    }
    function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;zoom=fitCoreZoom();camera.position.z=zoom;camera.updateProjectionMatrix();}''')
    source=source.replace('group.rotation.set(0,0,0);zoom=7.8;camera.position.z=zoom;',
        'group.rotation.set(0,0,0);zoom=fitCoreZoom();camera.position.z=zoom;')
    source=source.replace('Math.min(12,zoom+e.deltaY*.008)',
        'Math.min(Math.max(12,fitCoreZoom()*1.8),zoom+e.deltaY*.008)')
    return source


PAGES = {
    "about": ("About VoiceGuard", '''<p>VoiceGuard is an academic project for investigating AI-generated speech. Upload a recording, choose a detector, and compare its output with what you hear.</p>
<h2>What the models do</h2><p>Forensics XLS-R Wild uses a trained XLS-R frontend with AASIST graph-attention pooling. PellaV2 uses a trained Wav2Vec2 Base classifier. NII AntiDeepfake uses a trained MMS-300M frontend and binary classifier. The official ProSDD ASVspoof2019 release uses a recovered public checkpoint. Each model produces an experimental score for fake and real speech. The public ProSDD release is separate from the private epoch-4 fine-tune previously configured here.</p>
<h2>What a score means</h2><p>A score is the model's output for that recording. It is not a measured probability that a speaker is lying, and it cannot establish someone's identity. Compression, background noise, language, and unfamiliar synthesis methods can change the result.</p>
<h2>Data and privacy</h2><p>Audio is sent to the backend that serves this local dashboard. Profile details and analysis history are stored in a SQLite database on that server. Passwords and raw audio are not stored in the database. Google sign-in uses Firebase. Guest history is scoped to a private browser cookie; signed-in history belongs to the verified Firebase account. Do not upload a recording without permission from the people involved.</p>
<h2>Research limits</h2><p>The installed models passed upload smoke checks with the supplied samples. That is not a representative accuracy benchmark. A separate, labeled evaluation is needed before reporting accuracy.</p>'''),
    "guide": ("Recording and results guide", '''<h2>Upload a file</h2><p>Choose a detection engine, select Upload File, and use a WAV, MP3, FLAC, OGG, M4A, AAC, MP4, or WebM recording. Files must be under 25 MB and no longer than five minutes. Press Initiate Scan after the file is ready.</p>
<h2>Record speech</h2><p>Use Record Voice for a single recording. For repeated short samples, press the live orb or Start live detection. Your browser will ask for microphone permission. Stop detection when you finish. A localhost address or HTTPS is required for microphone access.</p>
<h2>Make a useful recording</h2><p>Record several seconds of clear speech. Keep the microphone at a steady distance and avoid music or overlapping speakers. Keep the original file when comparing models; repeated conversion can affect their scores.</p>
<h2>Read the result</h2><p>Pella and NII use a 50% fake-score decision point. Their scores are uncalibrated. Longer clips are split into ten-second windows and combined by duration. A high score can still be wrong. Compare multiple recordings and retain the source audio.</p>
<h2>If analysis fails</h2><p>Check the API status, file format, and file size. Each scan loads its selected model in an isolated CPU worker, which can take time. Missing checkpoints or runtime failures produce an error rather than a substitute score. One model request runs at a time to limit memory use.</p>'''),
    "contact": ("Contact the developer", '''<p>VoiceGuard is developed by Kamulugari Abhinav. For a reproducible bug report, include the model name, audio format, recording length, error message, and what you expected to happen. Share audio only if you have permission.</p>
<p><a href="mailto:abhinavkamulugari@gmail.com?subject=VoiceGuard%20feedback">abhinavkamulugari@gmail.com</a></p>
<p><a href="https://github.com/kamulugariabhinav-cmd" rel="noopener noreferrer">Developer GitHub profile</a></p>
<p><a href="https://github.com/kamulugariabhinav-cmd/fieldproj-v2/issues/new" rel="noopener noreferrer">Report an issue on GitHub</a></p>'''),
}


def supporting_page(slug):
    title, content = PAGES[slug]
    html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | VoiceGuard</title>{metadata(title + ' | VoiceGuard')}<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/assets/refinements.css"><link rel="stylesheet" href="/assets/liquid-background.css?v=3"></head><body class="support-page">{LIQUID}<header><a class="support-brand" href="/">{LOGO} VOICEGUARD</a></header><main><p class="eyebrow">VOICEGUARD / PROJECT NOTES</p><h1>{title}</h1>{content}</main>{NAV}<script src="/assets/interactions.js" defer></script></body></html>'''
    return polish(html,slug)
