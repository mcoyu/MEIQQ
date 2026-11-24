const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const storage=require('./storage.js'),{database}=require('./storage-test-host.cjs'),{setup}=require('./ui-test-host.cjs');
test('failed atomic writes retain the previous committed workspace',async()=>{
  const db=database(),backend=await storage.connect(db.factory,'test');await backend.write('old');
  db.options.failWrites=true;await assert.rejects(backend.write('new'),/Quota/);assert.equal(db.records.get('test').text,'old');
});
test('a stale browser window cannot overwrite a newer committed workspace',async()=>{
  const db=database(),a=await storage.connect(db.factory,'test'),b=await storage.connect(db.factory,'test');
  await a.write('latest');await assert.rejects(b.write('stale'),{code:'STALE_WORKSPACE'});
  assert.equal(db.records.get('test').text,'latest');
});
test('save writer serializes transactions and coalesces pending versions to the newest',async()=>{
  const writes=[],statuses=[];let finish;
  const writer=storage.writer(text=>{writes.push(text);return new Promise(resolve=>{finish=resolve;});},s=>statuses.push(s));
  writer.push('one');writer.push('two');writer.push('three');const flushed=writer.flush();
  finish();await Promise.resolve();assert.deepEqual(writes,['one','three']);finish();assert.equal(await flushed,true);
  writer.push('three');assert.deepEqual(writes,['one','three']);assert.equal(statuses.at(-1),'saved');
});
test('write failures report unsaved state and can be retried',async()=>{
  let fail=true;const statuses=[],writer=storage.writer(async()=>{if(fail)throw Error('full');},s=>statuses.push(s));
  writer.push('new');assert.equal(await writer.flush(),false);assert.equal(await writer.flush(),false);assert.equal(statuses.at(-1),'error');
  fail=false;writer.push('new');assert.equal(await writer.flush(),true);assert.equal(statuses.at(-1),'saved');
});
test('startup waits for primary storage and migrates legacy storage without deleting it',async()=>{
  const q=require('./engine.js'),old=q.fresh();old.version=2;
  const legacy=JSON.stringify({state:old,saved:[],draft:{...q.clone(q.DEFAULT),ownerHours:null}}),db=database();
  const first=setup([['qq-studio-lab-v1',legacy]],{indexedDB:db.factory});first.click('step');assert.equal(vm.runInContext('state.day',first.ctx),0);
  await vm.runInContext('appReady',first.ctx);await vm.runInContext('saveWriter.flush()',first.ctx);
  assert.equal(first.storage.get('qq-studio-lab-v1'),legacy);assert.ok(db.records.has('qq-studio-lab-v1'));
  assert.equal(vm.runInContext('recoveryFiles.find(f=>f.name==="Original save before migration").text',first.ctx),legacy);
  assert.equal(require('./workspace.js').parseText(db.records.get('qq-studio-lab-v1').text).recoveryFiles.find(f=>f.name==='Original save before migration').text,legacy);
  vm.runInContext('draft.ownerHours=22;save()',first.ctx);await vm.runInContext('saveWriter.flush()',first.ctx);
  const second=setup([['qq-studio-lab-v1',legacy]],{indexedDB:db.factory});await vm.runInContext('appReady',second.ctx);
  assert.equal(vm.runInContext('draft.ownerHours',second.ctx),22);
});
test('primary migration retains its exact original before replacing the browser record',async()=>{
  const q=require('./engine.js'),w=require('./workspace.js'),old=q.fresh();old.version=2;
  const raw=JSON.stringify({version:2,state:old,saved:[],draft:q.clone(old.config)}),db=database();
  db.records.set('qq-studio-lab-v1',{revision:4,text:raw});
  const ui=setup(undefined,{indexedDB:db.factory});
  await vm.runInContext('appReady',ui.ctx);await vm.runInContext('saveWriter.flush()',ui.ctx);
  const migrated=w.parseText(db.records.get('qq-studio-lab-v1').text);
  assert.equal(migrated.state.version,3);
  assert.equal(migrated.recoveryFiles.find(f=>f.name==='Original save before migration').text,raw);
  assert.equal(vm.runInContext('recoveryRaw',ui.ctx),null);
});
test('unreadable primary data is preserved instead of overwritten by a fallback',async()=>{
  const db=database();db.records.set('qq-studio-lab-v1','{broken');const ui=setup(undefined,{indexedDB:db.factory});
  await vm.runInContext('appReady',ui.ctx);assert.equal(db.records.get('qq-studio-lab-v1'),'{broken');
  assert.equal(vm.runInContext('recoveryRaw',ui.ctx),'{broken');
  ui.click('confirm-example');await vm.runInContext('saveWriter.flush()',ui.ctx);
  assert.equal(vm.runInContext('archives[0].workspace.recoveryFiles[0].text',ui.ctx),'{broken');
});
test('unavailable primary storage falls back to explicit local saving',async()=>{
  const db=database();db.options.failOpen=true;const ui=setup(undefined,{indexedDB:db.factory});await vm.runInContext('appReady',ui.ctx);
  vm.runInContext('draft.ownerHours=31;save()',ui.ctx);assert.match(ui.storage.get('qq-studio-lab-v1'),/31/);assert.equal(vm.runInContext('storeError',ui.ctx),false);
});
test('a malformed storage envelope remains recoverable instead of being treated as empty',async()=>{
  const db=database(),broken={revision:2,unexpected:'preserve this'};db.records.set('qq-studio-lab-v1',broken);
  const ui=setup(undefined,{indexedDB:db.factory});await vm.runInContext('appReady',ui.ctx);
  assert.deepEqual(db.records.get('qq-studio-lab-v1'),broken);
  assert.equal(vm.runInContext('recoveryRaw',ui.ctx),JSON.stringify(broken));
});
test('draft edited during a save remains visibly pending after the older write completes',async()=>{
  const db=database(),ui=setup(undefined,{indexedDB:db.factory});await vm.runInContext('appReady',ui.ctx);await vm.runInContext('saveWriter.flush()',ui.ctx);
  vm.runInContext('draft.ownerHours=30;save();draft.ownerHours=null;scheduleSave()',ui.ctx);await vm.runInContext('saveWriter.flush()',ui.ctx);
  assert.match(ui.elements['#save-status'].textContent,/Unsaved draft/);
});
