const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js');
const run=(over={},days=30)=>{
 const s=q.fresh({...q.clone(q.DEFAULT),months:3,startingCash:100000,ownerHours:80,designerHours:80,retention:0,repeat:0,...over});
 for(let i=0;i<days;i++)assert.equal(q.step(s),true);
 return s;
};
test('import rejects moving delivered revenue into a different client contract',()=>{
 const s=run(),a=s.projects.find(p=>p.delivered),b=s.projects.find(p=>p.delivered&&p.clientId!==a.clientId);
 assert.ok(a&&b);a.contractId=b.contractId;
 assert.throws(()=>q.restore(s),/contract identity/);
});
test('import verifies contract service identity for accepted work',()=>{
 const s=run(),p=s.projects.find(p=>p.accepted!==undefined),c=s.contracts.find(c=>c.id===p.contractId);
 c.serviceId='different-service';assert.throws(()=>q.restore(s),/contract identity/);
});
test('pending confirmed repeats cannot refer to another client contract',()=>{
 const s=run({retention:1,repeat:1});
 q.applyConfig(s,{...s.config,ownerHours:0});
 for(let i=0;i<35;i++)assert.equal(q.step(s),true);
 const p=s.projects.find(p=>p.renewal&&p.accepted===undefined);assert.ok(p);
 assert.deepEqual(q.restore(s),s,'valid unaccepted repeat retains its existing contract');
 p.contractId=s.contracts.find(c=>c.clientId!==p.clientId).id;
 assert.throws(()=>q.restore(s),/contract identity/);
});
test('legacy fully prepaid work restores before delivery and remains idempotent',()=>{
 const s=run({deposit:1,designerHours:0},1);
 assert.ok(s.projects.some(p=>p.accepted!==undefined&&!p.delivered&&p.paid===p.price));
 delete s.modelVersion;delete s.clients;delete s.contracts;delete s.workloadId;
 for(const p of s.projects)for(const key of ['demandId','random','commitments','fulfillmentStatus','paymentStatus','renewalStatus','contractId','cycle','orderKind'])delete p[key];
 const restored=q.restore(s),p=restored.projects.find(p=>p.accepted!==undefined);
 assert.equal(p.paymentStatus,'paid');assert.equal(p.fulfillmentStatus,'open');assert.deepEqual(q.restore(restored),restored);
 assert.equal(restored.cash,s.cash);assert.equal(restored.revenue,s.revenue);assert.deepEqual(restored.ledger,s.ledger);
});
test('import rejects unsupported simulation models instead of silently downgrading them',()=>{
 const s=run();
 for(const modelVersion of [0,-1,1.5,3,999,'2',null])assert.throws(()=>q.restore({...s,modelVersion}),/Unsupported simulation model version/);
 assert.deepEqual(q.restore(s),s);
});
test('missing and explicit model 1 versions still migrate the stock legacy fixture',()=>{
 const fixture=require('./fixtures/prototype-02-run.json');
 for(const modelVersion of [undefined,1]){
  const old=q.clone(fixture);if(modelVersion===undefined)delete old.modelVersion;else old.modelVersion=modelVersion;
  const restored=q.restore(old);assert.equal(restored.modelVersion,q.MODEL_VERSION);assert.equal(restored.cash,old.cash);assert.deepEqual(q.restore(restored),restored);
 }
});
test('duplicate queued demand identities are rejected even across different contracts',()=>{
 const s=run({retention:1,repeat:1});assert.ok(s.repeatQueue.length>1);
 assert.deepEqual(q.restore(s),s);
 s.repeatQueue[1].demandId=s.repeatQueue[0].demandId;
 assert.throws(()=>q.restore(s),/duplicate demand or contract cycle/);
});
test('duplicate queued contract cycles are rejected even with different demand IDs and dates',()=>{
 const s=run({retention:1,repeat:1}),copy=q.clone(s.repeatQueue[0]);assert.ok(copy);
 copy.demandId+=':duplicate';copy.day++;s.repeatQueue.push(copy);
 assert.throws(()=>q.restore(s),/duplicate demand or contract cycle/);
});
test('legacy queued orders sharing an inferred contract receive distinct stable identities',()=>{
 const old=q.clone(require('./fixtures/prototype-02-run.json'));
 old.repeatQueue.push({...old.repeatQueue[0],day:old.repeatQueue[0].day+1});
 const restored=q.restore(old),[first,second]=restored.repeatQueue;
 assert.equal(restored.repeatQueue.length,2);assert.equal(first.contractId,second.contractId);
 const contract=restored.contracts.find(c=>c.id===first.contractId);
 assert.equal(first.cycle,contract.cycles+1);assert.equal(second.cycle,first.cycle+1);assert.notEqual(first.demandId,second.demandId);
 assert.deepEqual(restored.repeatQueue.map(r=>r.day),old.repeatQueue.map(r=>r.day));assert.deepEqual(restored.ledger,old.ledger);assert.equal(restored.cash,old.cash);
 assert.deepEqual(q.restore(restored),restored);
});
test('legacy missing queue identities avoid supplied cycles and preserve supplied identities',()=>{
 const old=q.clone(require('./fixtures/prototype-02-run.json')),base=q.restore(old).repeatQueue[0];
 old.repeatQueue.push({...old.repeatQueue[0],day:old.repeatQueue[0].day+1,cycle:base.cycle,demandId:'preserved-demand'});
 const restored=q.restore(old);
 assert.equal(restored.repeatQueue[1].cycle,base.cycle);assert.equal(restored.repeatQueue[1].demandId,'preserved-demand');
 assert.notEqual(restored.repeatQueue[0].cycle,base.cycle);assert.deepEqual(q.restore(restored),restored);
});
test('legacy migration still rejects duplicate identities explicitly supplied by the save',()=>{
 const old=q.clone(require('./fixtures/prototype-02-run.json')),base=q.restore(old).repeatQueue[0];
 old.repeatQueue=[{...old.repeatQueue[0],cycle:base.cycle,demandId:'same-demand'},{...old.repeatQueue[0],cycle:base.cycle+1,demandId:'same-demand'}];
 assert.throws(()=>q.restore(old),/duplicate demand or contract cycle/);
 old.repeatQueue[1].demandId='different-demand';old.repeatQueue[1].cycle=base.cycle;
 assert.throws(()=>q.restore(old),/duplicate demand or contract cycle/);
});
test('legacy cycle allocation rejects unsafe counters instead of looping without progress',()=>{
 const old=q.clone(require('./fixtures/prototype-02-run.json'));
 old.repeatQueue[0].cycle=Number.MAX_SAFE_INTEGER;old.repeatQueue.push({day:75,serviceId:old.repeatQueue[0].serviceId,client:old.repeatQueue[0].client});
 assert.throws(()=>q.restore(old),/cycle is invalid/);
});
