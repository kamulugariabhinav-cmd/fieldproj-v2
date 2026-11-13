/* Browser-independent behavior checks for storage switching and retry. */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/assets/database.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let i=0;i<12;i++)await tick();}
(async()=>{
  const rows=new Map(),nodes=new Map();let listener,failSave=false;
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,events:{},closest:()=>null,classList:{toggle(){},add(){}},addEventListener(event,fn){this.events[event]=fn;}});
    return nodes.get(id);
  };
  const context=vm.createContext({window:{firebase:{apps:[{}],auth:true}},
    document:{getElementById:node},localStorage:{getItem:()=>null},renderHistory(){},
    firebase:{auth:()=>({onAuthStateChanged(fn){listener=fn;}})},
    fetch:async(path,options)=>{
      const key=options.headers.Authorization||'guest',records=rows.get(key)||[];
      if(path==='/api/user')return{ok:true,json:async()=>({})};
      if(options.method==='POST'){
        if(failSave)return{ok:false,json:async()=>({detail:'offline'})};
        const incoming=JSON.parse(options.body).records;
        rows.set(key,[...incoming,...records.filter(r=>!incoming.some(item=>item.id===r.id))]);
      }
      if(options.method==='DELETE')rows.set(key,path.endsWith('/history')?[]:records.filter(r=>r.id!==path.split('/').pop()));
      return{ok:true,json:async()=>({records:rows.get(key)||[]})};
    }});
  vm.runInContext(source,context);
  await listener(null);await settle();
  const storage=context.window.vgDatabase;
  assert.equal(storage.ready,true);
  await storage.save({id:'guest-result'});assert.equal(rows.get('guest').length,1);
  const alice={uid:'alice',getIdToken:async()=>'alice-token'};
  await listener(alice);await settle();assert.equal(storage.records.length,0);
  await storage.save({id:'alice-result'});assert.equal(rows.get('Bearer alice-token')[0].id,'alice-result');
  failSave=true;await storage.save({id:'pending-result'});
  assert.match(node('databaseStatus').textContent,/Not saved/);
  failSave=false;await node('retryDatabase').events.click();await settle();
  assert(rows.get('Bearer alice-token').some(record=>record.id==='pending-result'));
  await listener(null);await settle();assert.equal(storage.records.length,1);assert.equal(storage.records[0].id,'guest-result');
  await storage.clear();assert.equal(rows.get('guest').length,0);
  assert.equal(rows.get('Bearer alice-token').length,2);
  console.log('Storage client: account switching, retry, isolation, and deletion passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
