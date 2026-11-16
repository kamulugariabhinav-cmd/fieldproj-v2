const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const all=[],documentEvents={};let observer,changes=0;
function element(){const classes=new Set();const node={children:[],attributes:{},events:{},hidden:false,className:'',textContent:'',classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]||null;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,v){this.events[k]=v;},contains(other){return this===other||this.children.some(child=>child.contains(other));},scrollIntoView(){},focus(){this.focused=true;}};all.push(node);return node;}
const panel=element(),select=element();select.options=['Pella // PellaV2','NII // MMS-300M','ProSDD // ASVspoof2019','Forensics // XLS-R Wild'].map((textContent,index)=>({textContent,disabled:index===1}));select.selectedIndex=0;select.before=()=>{};select.closest=()=>panel;select.dispatchEvent=event=>{changes++;select.events[event.type]?.();};
select.id='modelSelect';
const preferences=element();preferences.id='settingsDefaultModel';preferences.options=select.options;preferences.selectedIndex=0;preferences.before=()=>{};preferences.closest=()=>null;preferences.dispatchEvent=event=>preferences.events[event.type]?.();
vm.runInNewContext(fs.readFileSync(__dirname+'/assets/model-select.js','utf8'),{document:{querySelectorAll:()=>[select,preferences],createElement:element,querySelector:()=>null,addEventListener:(k,v)=>{const previous=documentEvents[k];documentEvents[k]=event=>{previous?.(event);v(event);};}},Event:class{constructor(type){this.type=type;}},MutationObserver:class{constructor(fn){this.callback=fn;}observe(target){if(target===select)observer=this.callback;}}});
const trigger=all.find(node=>node.id==='modelPickerTrigger'),list=all.find(node=>node.id==='modelPickerList');
assert.equal(select.hidden,true);assert.match(trigger.textContent,/Pella/);
const preferencesTrigger=all.find(node=>node.id==='settingsDefaultModelPickerTrigger');
const preferencesList=all.find(node=>node.id==='settingsDefaultModelPickerList');
assert.equal(preferences.hidden,true);preferencesTrigger.events.click();preferencesList.children[2].events.click();assert.equal(preferences.selectedIndex,2);assert.equal(select.selectedIndex,0,'Dropdowns must keep independent selections');
trigger.events.click();assert.equal(list.hidden,false);assert.equal(trigger.attributes['aria-expanded'],'true');
const key=key=>trigger.events.keydown({key,preventDefault(){}});
key('ArrowDown');assert.equal(trigger.attributes['aria-activedescendant'],'modelPickerOption2','Unavailable models skipped');key('Enter');assert.equal(select.selectedIndex,2);assert.equal(changes,1);assert.equal(list.hidden,true);assert.match(trigger.textContent,/ProSDD/);
trigger.events.click();key('Escape');assert.equal(list.hidden,true);
trigger.events.click();documentEvents.click({target:element()});assert.equal(list.hidden,true);
// Browser order: mousedown can blur the trigger before the option's click.
trigger.events.click();
const wrapper=all.find(node=>node.className==='model-picker');
let focusMoved=true;
list.children[3].events.mousedown?.({preventDefault(){focusMoved=false;}});
if(focusMoved)wrapper.events.focusout({relatedTarget:null});
assert.equal(list.hidden,false,'Mouse press must not close the menu before selection');
list.children[3].events.click();
assert.equal(select.selectedIndex,3);assert.match(trigger.textContent,/Forensics/);assert.equal(list.hidden,true);
trigger.events.click();select.disabled=true;observer();assert.equal(trigger.disabled,true);assert.equal(list.hidden,true);
console.log('Model picker: original value/change integration, keyboard selection, unavailable states, outside click, Escape, and recording lock passed.');
