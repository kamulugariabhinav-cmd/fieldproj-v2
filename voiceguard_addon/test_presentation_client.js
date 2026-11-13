const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map(),probes=[],copied=[];
const node=id=>{if(!nodes.has(id))nodes.set(id,{events:{},dataset:{},textContent:'',value:'',files:[],setAttribute(){},addEventListener(name,fn){this.events[name]=fn;}});return nodes.get(id);};
const models=['pella','nii','forensics','prosdd'].map(name=>{const item=node(name);item.dataset.aboutModel=name;return item;});
const context=vm.createContext({window:{addEventListener(){}},matchMedia:()=>({matches:true}),
document:{getElementById:node,querySelectorAll:selector=>selector==='[data-about-model]'?models:[]},
URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
Audio:class{constructor(){this.duration=8;probes.push(this);}removeAttribute(){}load(){}},
navigator:{clipboard:{writeText:async text=>copied.push(text)}},location:{href:''}});
(async()=>{
vm.runInContext(fs.readFileSync(__dirname+'/assets/presentation.js','utf8'),context);
models[3].events.click();assert.match(node('aboutModelTitle').textContent,/ProSDD/);assert.match(node('aboutModelDetail').textContent,/private epoch-4/);
node('guideFile').files=[{name:'wrong.exe',size:4000}];node('guideFile').events.change();assert.match(node('guideFileResult').textContent,/supported/);assert.equal(probes.length,0);
node('guideFile').files=[{name:'speech.wav',size:1048576}];node('guideFile').events.change();probes[0].onloadedmetadata();assert.match(node('guideFileResult').textContent,/Within upload limits/);
node('reportModel').value='NII';node('reportIssue').value='Example error';node('reportBuilder').events.input();assert.match(node('prepareGithubIssue').href,/issues\/new\?/);
await node('copyIssue').events.click();assert.match(copied[0],/NII/);assert.match(copied[0],/Example error/);
node('reportBuilder').events.submit({preventDefault(){}});assert.match(context.location.href,/^mailto:/);
console.log('Supporting pages: model explorer, local file checks, issue drafts, and copy report passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
