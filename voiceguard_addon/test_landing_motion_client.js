const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync(__dirname+'/assets/landing-motion.js','utf8');
function run(conditions,fail=false){
  const calls=[],events={};let reverted=0,mediaReverted=0,refreshes=0;
  const section={querySelectorAll:()=>[{}]};
  const gsap={registerPlugin(){},utils:{selector:()=>selector=>selector.startsWith('main>section')?[section]:[{}]},
    context(){return {add(fn){fn();},revert(){reverted++;}};},
    matchMedia(){return {add(queries,fn){assert(queries.mobile&&queries.reduce);fn({conditions});},revert(){mediaReverted++;}};},
    timeline(){return {from(target,vars){calls.push({kind:'hero',target,vars});if(fail)throw Error('Setup failed');return this;}};},
    from(target,vars){calls.push({kind:'reveal',target,vars});},to(target,vars){calls.push({kind:'scrub',target,vars});},
    set(target,vars){calls.push({kind:'set',target,vars});},fromTo(target,start,vars){calls.push({kind:'workflow',target,vars});}};
  vm.runInNewContext(script,{window:{gsap,ScrollTrigger:{refresh(){refreshes++;}},addEventListener:(name,fn)=>events[name]=fn},document:{body:{},getElementById:()=>({})},innerHeight:900,console:{warn(){}}});
  return {calls,events,get reverted(){return reverted;},get mediaReverted(){return mediaReverted;},get refreshes(){return refreshes;}};
}
const desktop=run({desktop:true,mobile:false,reduce:false});
assert(desktop.calls.some(c=>c.kind==='workflow'&&c.vars.scrollTrigger.scrub===.6));
assert(desktop.calls.some(c=>c.kind==='scrub'&&c.target==='#heroSignal'));
assert(desktop.calls.filter(c=>c.kind==='reveal').every(c=>(c.vars.scrollTrigger.once||c.vars.scrollTrigger.toggleActions==='restart none none restart')&&c.vars.immediateRender===false));
assert(desktop.calls.some(c=>c.vars.ease==='bounce.out'&&c.vars.scrollTrigger?.toggleActions==='restart none none restart'),'Headings bounce on entering from either scroll direction');
desktop.events.pagehide();assert.equal(desktop.reverted,1);assert.equal(desktop.mediaReverted,1);
desktop.events.pageshow({persisted:true});assert(desktop.refreshes>=2,'Recreate animations after browser back');
const mobile=run({desktop:false,mobile:true,reduce:false});assert(!mobile.calls.some(c=>c.kind==='scrub'||c.kind==='workflow'));
const reduced=run({desktop:true,mobile:false,reduce:true});assert(reduced.calls.filter(c=>c.kind==='hero'||c.kind==='reveal').every(c=>c.vars.y===undefined||c.vars.y===0));assert(!reduced.calls.some(c=>c.kind==='scrub'));
const failure=run({desktop:true,mobile:false,reduce:false},true);assert.equal(failure.reverted,1,'Revert partial setup so content stays usable');
console.log('Landing GSAP: desktop, mobile, reduced motion, scoped teardown, back navigation, and failure recovery passed.');
