const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),events={};let authChanged,fail=false,stopped=0;
function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:true,events:{},textContent:'',attributes:{},addEventListener(k,v){this.events[k]=v;},setAttribute(k,v){this.attributes[k]=v;},focus(){}});return nodes.get(id);}
const wrapper=node('wrapper');wrapper.contains=target=>target===wrapper||[...nodes.values()].some(n=>n===target&&n!==node('outside'));
node('accountBtn').closest=()=>wrapper;
const auth={currentUser:{email:'reader@example.com'},onAuthStateChanged(fn){authChanged=fn;fn(this.currentUser);},async signOut(){if(fail)throw Error('Network unavailable');this.currentUser=null;authChanged(null);}};
const context=vm.createContext({document:{getElementById:node,activeElement:null,addEventListener:(k,v)=>events[k]=v},window:{firebase:{apps:[{}],auth:()=>auth}},clearTimeout(){},setTimeout(){},stopLive(){stopped++;},setPage(){}});
vm.runInContext(fs.readFileSync(__dirname+'/assets/account-menu.js','utf8'),context);
(async()=>{
  assert.equal(node('accountMenuEmail').textContent,'reader@example.com');assert.equal(node('accountMenuLogout').hidden,false);
  wrapper.events.pointerenter({pointerType:'mouse'});assert.equal(node('accountMenuPanel').hidden,false);
  events.click({target:node('outside')});assert.equal(node('accountMenuPanel').hidden,true);
  node('accountBtn').events.click();wrapper.events.keydown({key:'Escape',preventDefault(){}});assert.equal(node('accountMenuPanel').hidden,true);
  node('accountBtn').events.click();fail=true;await node('accountMenuLogout').events.click();assert.match(node('accountMenuStatus').textContent,/Network unavailable/);assert.equal(node('accountMenuLogout').disabled,false);
  fail=false;await node('accountMenuLogout').events.click();assert.equal(auth.currentUser,null);assert(stopped>0);assert.equal(node('accountMenuEmail').textContent,'Not signed in');assert.equal(node('accountMenuLogout').hidden,true);assert.equal(node('accountMenuSignin').hidden,false);
  console.log('Account popup: email, hover, outside click, Escape, logout errors, and guest reset passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
