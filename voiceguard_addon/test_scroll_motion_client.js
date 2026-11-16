const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let observeEntries,preferenceChanged,settingsChanged,mobile=false,reduced=false,setting=false;
const animations=[],documentEvents={},toggle={events:{},setAttribute(){},addEventListener(k,fn){this.events[k]=fn;}};
const element={parentElement:{children:[]},getBoundingClientRect:()=>({top:100,bottom:200}),matches:()=>false,contains:target=>target==='focused-child',animate(frames,options){
  const events={};const animation={frames,options,addEventListener:(name,fn)=>events[name]=fn,cancel(){this.cancelled=true;events.cancel?.();},finish(){events.finish?.();}};
  animations.push(animation);return animation;
}};element.parentElement.children=[element];
const preference={get matches(){return reduced;},addEventListener:(name,fn)=>preferenceChanged=fn};
const context=vm.createContext({window:{IntersectionObserver:true},Element:{prototype:{animate(){}}},
  matchMedia:query=>query.includes('reduced-motion')?preference:{matches:mobile},
  innerHeight:800,localStorage:{getItem:()=>null,setItem(){}},
  document:{body:{append(){}},createElement:()=>toggle,activeElement:null,documentElement:{classList:{contains:()=>setting}},querySelectorAll:()=>[element],addEventListener:(name,fn)=>documentEvents[name]=fn},
  IntersectionObserver:class{constructor(fn){observeEntries=fn;}observe(){}},
  MutationObserver:class{constructor(fn){settingsChanged=fn;}observe(){}}});
vm.runInContext(fs.readFileSync(__dirname+'/assets/scroll-motion.js','utf8'),context);
const enter=()=>observeEntries([{target:element,isIntersecting:true}]);
enter();assert.equal(animations.length,1);assert.equal(animations[0].options.duration,650);
enter();assert.equal(animations.length,1,'Do not restart a reveal while it runs');
animations[0].finish();observeEntries([{target:element,isIntersecting:false}]);enter();assert.equal(animations.length,2,'Replay when scrolling back to the element');
animations[1].finish();reduced=true;setting=true;mobile=true;
enter();assert.equal(animations[2].options.duration,420,'Mobile uses shorter motion');
documentEvents.focusin({target:'focused-child'});assert(animations[2].cancelled);
enter();assert.equal(animations.length,4,'Scroll effects stay enabled as explicitly requested');
console.log('Scroll effects: replay, mobile timing, always enabled, and focus safety passed.');
