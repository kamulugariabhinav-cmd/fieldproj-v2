const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const classes=new Set(),pending=[];
const indicator={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute(){}};
const context=vm.createContext({document:{querySelector:()=>indicator},fetch:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))});
vm.runInContext(fs.readFileSync(__dirname+'/assets/detection-status.js','utf8'),context);
(async()=>{
  const first=context.fetchDetection('/api/detect');
  const second=context.fetchDetection('/api/detect');
  assert(classes.has('is-detecting'));
  pending[0].resolve({ok:true});await first;
  assert(classes.has('is-detecting'),'Keep pulsing while another scan is pending');
  pending[1].resolve({ok:true});await second;
  assert(!classes.has('is-detecting'));
  const failed=context.fetchDetection('/api/detect');
  pending[2].reject(new Error('Network error'));await assert.rejects(failed,/Network error/);
  assert(!classes.has('is-detecting'),'Clear the indicator after failure or cancellation');
  console.log('Detection indicator: pending, completion, overlap, and failure passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
