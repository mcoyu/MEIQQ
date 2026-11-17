const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js'),w=require('./workspace.js');
const fresh=()=>({state:q.fresh(),saved:[],checkpointInfo:[],draft:q.clone(q.DEFAULT),recoveryFiles:[]});
test('unfinished numeric inputs survive full backup round trips',()=>{
  const a=fresh();a.draft.ownerHours=null;a.draft.conversion=2;
  const b=w.parseText(w.serialize(a));assert.equal(b.draft.ownerHours,null);assert.equal(b.draft.conversion,2);assert.equal(b.state.config.ownerHours,10);
});
test('malformed drafts are quarantined intact while valid applied work remains available',()=>{
  const a=fresh();a.draft.services=null;
  const b=w.parseText(w.serialize(a));assert.deepEqual(b.draft,b.state.config);assert.equal(JSON.parse(b.recoveryFiles[0].text).services,null);
  const c=w.parseText(w.serialize(b));assert.equal(c.recoveryFiles.length,1);
});
test('drafts cannot inject markup through service colors or identifiers',()=>{
  for(const key of ['id','color']){const a=fresh();a.draft.services[0][key]='\" onmouseover=bad';const b=w.parseText(w.serialize(a));assert.equal(b.recoveryFiles.length,1);assert.deepEqual(b.draft,b.state.config);}
});
test('complete archived workspaces retain drafts, snapshots and recovery originals',()=>{
  const a=fresh();q.step(a.state);w.checkpoint(a,'manual');a.draft.ownerHours=null;
  a.recoveryFiles.push({name:'Original',text:'{broken'});
  const archives=[];w.archive(archives,a);w.archive(archives,a);assert.equal(archives.length,1);
  const b=w.parseText(w.serialize(fresh(),archives));assert.deepEqual(b.archives[0].workspace,a);
});
test('identical checkpoints deduplicate; automatic retention never removes manual checkpoints',()=>{
  const a=fresh();w.checkpoint(a,'manual');w.checkpoint(a);assert.equal(a.saved.length,1);
  for(let i=0;i<30;i++){q.step(a.state);w.checkpoint(a);}
  assert.equal(a.saved.length,w.AUTO_LIMIT+1);assert.equal(a.saved[0].day,0);assert.equal(a.checkpointInfo[0].kind,'manual');
});
test('packed runs are independent from active mutable state',()=>{
  const a=fresh(),b=w.pack(a);b.runs[0].cash=1;b.current.draft.ownerHours=null;
  assert.equal(a.state.cash,6000);assert.equal(a.draft.ownerHours,10);
});
test('restored active state never shares mutable project data with its checkpoint',()=>{
  const a=fresh();for(let i=0;i<10;i++)q.step(a.state);w.checkpoint(a,'manual');
  const b=w.parseText(w.serialize(a)),previous=b.saved[0].cash;
  q.fund(b.state,100);b.state.projects[0].client='Changed';
  assert.equal(b.saved[0].cash,previous);assert.notEqual(b.saved[0].projects[0].client,'Changed');
});
test('readable original browser saves and legacy setup files are importable',()=>{
  const a=fresh(),b=w.parse({version:2,state:a.state,saved:[],draft:a.draft});assert.equal(b.state.cash,6000);
  const c=w.parse({format:'qq-studio-setup',version:1,config:q.DEFAULT});assert.equal(c.state.day,0);
});
test('Prototype 02 fixture migrates only the known missing funding observation',()=>{
  const old=require('./fixtures/prototype-02-run.json'),s=q.restore(old);
  assert.equal(s.version,3);assert.equal(s.cash,old.cash);assert.equal(s.history.at(-1).cash,s.cash);
  assert.equal(old.history.at(-1).cash+1000,s.cash);assert.deepEqual(q.restore(s),s);
  const bad=q.clone(old);bad.history[0].cash+=987654;assert.throws(()=>q.restore(bad),/Daily cash/);
});
test('old prepaid snapshots migrate to completed exactly once',()=>{
  const s=q.fresh({...q.clone(q.DEFAULT),deposit:1,ownerHours:80,designerHours:80,repeat:1,retention:1});
  for(let i=0;i<12;i++)q.step(s);
  const p=s.projects.find(p=>p.delivered);p.stage='payment';s.version=2;
  s.repeatQueue=s.repeatQueue.filter(r=>!(r.client===p.client&&r.serviceId===p.serviceId));
  const restored=q.restore(s),again=q.restore(restored);
  assert.equal(restored.projects.find(x=>x.id===p.id).stage,'complete');assert.deepEqual(again,restored);
});
test('a valid backup over the previous 25 MiB limit can be imported',()=>{
  const a=fresh();a.state=q.fresh({...q.clone(q.DEFAULT),months:12});for(let i=0;i<360;i++)q.step(a.state);
  a.draft=q.clone(a.state.config);
  for(let i=0;i<50;i++){a.state.config.name='Experiment '+i;w.checkpoint(a,'manual');}
  const text=w.serialize(a);assert.ok(Buffer.byteLength(text)>25*1024*1024);
  const b=w.parseText(text);assert.equal(b.saved.length,50);assert.equal(b.state.cash,a.state.cash);
  assert.equal(b.saved[0].config.name,'Experiment 0');
});
test('export and import use the same explicit upper bound',()=>{
  assert.doesNotThrow(()=>w.checkSize(w.MAX_BYTES));assert.throws(()=>w.checkSize(w.MAX_BYTES+1),/128 MiB/);
});
test('corrupt references and archived runs reject the whole import',()=>{
  const a=fresh(),archives=[];w.archive(archives,a);const b=w.pack(a,archives);b.archives[0].workspace.state=999;
  assert.throws(()=>w.parse(b),/reference/);assert.equal(a.state.cash,6000);
});
