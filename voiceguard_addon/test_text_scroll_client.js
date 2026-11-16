const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let entries;const observed=[],unobserved=[];
const classes=new Set(),handlers={};
const heading={contains:()=>false,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},addEventListener:(name,fn)=>handlers[name]=fn};
vm.runInNewContext(fs.readFileSync(__dirname+'/assets/text-scroll.js','utf8'),{
  window:{IntersectionObserver:true},document:{activeElement:null,querySelectorAll:()=>[heading]},
  IntersectionObserver:class{constructor(fn){entries=fn;}observe(t){observed.push(t);}unobserve(t){unobserved.push(t);}}
});
assert.equal(observed[0],heading);assert.equal(classes.size,0,'Text stays readable before it enters view');
entries([{target:heading,isIntersecting:false}]);assert.equal(classes.size,0);
entries([{target:heading,isIntersecting:true}]);assert(classes.has('text-scroll-enter'));assert.equal(unobserved[0],heading);
handlers.animationend();assert.equal(classes.size,0,'Remove transforms after the reveal');
console.log('Text scroll: visible fallback, viewport entry, one-time reveal, and animation cleanup passed.');
