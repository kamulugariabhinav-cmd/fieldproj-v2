const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/assets/homepage.js','utf8');
const nodes=new Map();
function element(id){
  const classes=new Set();return{id,events:{},attributes:{},dataset:{},textContent:'',tabIndex:0,
    addEventListener(name,handler){this.events[name]=handler;},
    setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;},
    showModal(){this.open=true;},close(){this.open=false;},
    classList:{toggle(name){if(classes.has(name)){classes.delete(name);return false;}classes.add(name);return true;},remove(name){classes.delete(name);},contains(name){return classes.has(name);}}};
}
const node=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id);};
const tabs=['pella','nii','forensics','prosdd'].map(name=>{const tab=node(name+'Tab');tab.dataset.model=name;return tab;});
const signin=node('openSignin');
const context=vm.createContext({window:{},URLSearchParams,location:{search:'',assign(){throw Error('Unexpected navigation');}},
  document:{getElementById:node,addEventListener(){},querySelectorAll(selector){return selector==='[data-model]'?tabs:selector==='[data-signin]'?[signin]:[];}}});
vm.runInContext(source.slice(0,source.indexOf('// Explicit sample playback')),context);
node('homeMenu').events.click();assert.equal(node('homeMenu').attributes['aria-expanded'],'true');
node('homeNavigation').events.click({target:{closest:()=>true}});assert.equal(node('homeMenu').attributes['aria-expanded'],'false');
tabs[1].events.click();assert.equal(node('modelName').textContent,'NII AntiDeepfake');assert.equal(tabs[1].attributes['aria-selected'],'true');
tabs[1].events.keydown({key:'ArrowLeft',preventDefault(){}});assert.equal(node('modelName').textContent,'PellaV2');assert(tabs[0].focused);
tabs[2].events.click();assert.equal(node('modelName').textContent,'Forensics XLS-R Wild');assert.match(node('modelPreparation').textContent,/five-second/);assert.match(node('modelScope').textContent,/CC BY-NC/);
tabs[0].events.keydown({key:'End',preventDefault(){}});assert.equal(node('modelName').textContent,'ProSDD ASVspoof2019');assert.match(node('modelPreparation').textContent,/four-second/);assert.equal(node('modelSource').attributes.href,'https://github.com/ProSDD/codes');assert.equal(node('modelPanel').attributes['aria-labelledby'],'prosddTab');
tabs[3].events.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(node('modelName').textContent,'PellaV2');
signin.events.click();assert.equal(node('signinDialog').open,true);assert.match(node('signinStatus').textContent,/unavailable/);
node('closeSignin').events.click();assert.equal(node('signinDialog').open,false);
console.log('Homepage client: mobile navigation, model tabs, keyboard selection, sign-in dialog, and unavailable-auth feedback passed.');
const stepButtons=[0,1,2].map(i=>{const item=node('step'+i);item.dataset.step=String(i);return item;});
const checks=[0,1,2].map(i=>{const item=node('check'+i);item.checked=false;return item;});
context.document.querySelectorAll=selector=>selector==='[data-step]'?stepButtons:selector==='[data-readiness]'?checks:[];
const audio=node('sampleAudio');audio.duration=12;audio.currentTime=0;
vm.runInContext(fs.readFileSync(__dirname+'/assets/homepage-explore.js','utf8'),context);
assert.equal(node('sampleSeek').disabled,true);audio.events.loadedmetadata();assert.equal(node('sampleSeek').disabled,false);
node('sampleSeek').value=25;node('sampleSeek').events.input();assert.equal(audio.currentTime,3);
node('sampleVolume').value=40;node('sampleVolume').events.input();assert.equal(audio.volume,.4);
stepButtons[2].events.click();assert.equal(node('stepAction').href,'/guide');assert.match(node('stepTitle').textContent,/context/);
checks.forEach(check=>check.checked=true);checks[0].events.change();assert.match(node('readinessStatus').textContent,/3 of 3 checked/);
checks[0].checked=false;checks[0].events.change();assert.match(node('readinessStatus').textContent,/permission/);
console.log('Homepage explorer: real audio seeking/volume, workflow steps, and checklist feedback passed.');
