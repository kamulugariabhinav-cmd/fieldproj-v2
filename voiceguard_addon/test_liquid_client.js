const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let drawCount=0,nextFrame,preferenceListener,visibilityListener;
const ctx={clearRect(){drawCount++;},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){}};
const canvas={style:{},getContext:()=>ctx},preference={matches:false,addEventListener(event,listener){preferenceListener=listener;}};
const context=vm.createContext({document:{hidden:false,getElementById:()=>canvas,addEventListener(event,listener){visibilityListener=listener;}},
window:{addEventListener(){}},matchMedia:()=>preference,innerWidth:1920,innerHeight:1080,performance:{now:()=>0},
requestAnimationFrame:fn=>(nextFrame=fn,1),cancelAnimationFrame(){}});
vm.runInContext(fs.readFileSync(__dirname+'/assets/liquid-background.js','utf8'),context);
assert.equal(canvas.style.position,'fixed');assert.equal(canvas.style.pointerEvents,'none');assert.equal(canvas.width,900);
const initial=drawCount;nextFrame(60);assert(drawCount>initial);
preference.matches=true;nextFrame=null;preferenceListener();assert.equal(nextFrame,null);
preference.matches=false;preferenceListener();assert.equal(typeof nextFrame,'function');
context.document.hidden=true;nextFrame=null;visibilityListener();assert.equal(nextFrame,null);
console.log('Liquid background: fixed layout, viewport sizing, rendering, reduced motion, and hidden-tab suspension passed.');
