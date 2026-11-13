const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),groups=[],events={};let nextFrame,clock=0,id=0,disposed=false;
const node=name=>{if(!nodes.has(name))nodes.set(name,{clientWidth:450,clientHeight:450,value:45,events:{},classList:{add(){}},
appendChild(){},setAttribute(){},addEventListener(event,fn){this.events[event]=fn;},querySelector:()=>({textContent:''}),getBoundingClientRect:()=>({left:0,top:0,width:450,height:450})});return nodes.get(name);};
class Group{constructor(){this.rotation={x:0,y:0,z:0};groups.push(this);}add(){}traverse(){}}
class Geometry{constructor(){this.attributes={};}setAttribute(name,value){this.attributes[name]=value;}dispose(){}}
class Renderer{constructor(){this.domElement={};}setPixelRatio(){}setSize(){}render(){}dispose(){disposed=true;}}
const THREE={WebGLRenderer:Renderer,Scene:class{add(){}traverse(){}},Group,PerspectiveCamera:class{constructor(){this.position={};}updateProjectionMatrix(){}},
BufferGeometry:Geometry,BufferAttribute:class{constructor(array){this.array=array;}},LineBasicMaterial:class{},Line:class{},
Mesh:class{constructor(){this.rotation={x:0,y:0,z:0};this.position={set(){}};}},IcosahedronGeometry:Geometry,TorusGeometry:Geometry,MeshBasicMaterial:class{},MeshStandardMaterial:class{},HemisphereLight:class{},PointLight:class{constructor(){this.position={set(){}};}}};
const context=vm.createContext({THREE,document:{hidden:false,getElementById:node},devicePixelRatio:1,
window:{addEventListener(event,fn){events[event]=fn;}},matchMedia:()=>({matches:false,addEventListener(){}}),
ResizeObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}},
performance:{now:()=>clock},requestAnimationFrame:fn=>(nextFrame=fn,++id),cancelAnimationFrame(){nextFrame=null;},console});
let source=fs.readFileSync(__dirname+'/assets/homepage.js','utf8');source=source.slice(source.indexOf('async function setupSignal()'));
source=source.replace("await import('/assets/three.module.js')",'await Promise.resolve(globalThis.THREE)');
(async()=>{
vm.runInContext(source,context);await new Promise(resolve=>setImmediate(resolve));
assert.equal(typeof node('signalMotion').events.click,'function');
clock=100;nextFrame(clock);const moving=groups[0].rotation.y;assert(moving>0);
node('signalMotion').events.click();clock=200;nextFrame(clock);assert.equal(groups[0].rotation.y,moving);assert.match(node('signalMotion').textContent,/Resume/);
node('signalMotion').events.click();clock=300;nextFrame(clock);assert(groups[0].rotation.y>moving);assert.match(node('signalMotion').textContent,/Pause/);
events.pagehide({persisted:true});assert.equal(disposed,false);assert.equal(nextFrame,null);
events.pageshow({persisted:true});assert.equal(typeof nextFrame,'function');
console.log('Signal motion: rotation advances, pause freezes, resume restarts, and browser-back restoration passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
