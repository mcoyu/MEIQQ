const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const storage=require('./storage.js'),{database}=require('./storage-test-host.cjs'),{setup}=require('./ui-test-host.cjs');
test('factory reset clears app storage, preserves unrelated data, and rejects stale writes',async()=>{
  const db=database(),ui=setup([['unrelated','keep'],['qq-studio-setup-mode','analyst']],{indexedDB:db.factory});
  const read=code=>vm.runInContext(code,ui.ctx);
  await read('Promise.all([appReady,studioReady,jobsReady,plannerReady])');
  ui.click('reset-app');
  assert.match(ui.elements['#modal'].innerHTML,/Erase progress and reset/);
  ui.click('close');
  assert.equal(ui.storage.get('qq-studio-setup-mode'),'analyst');
  const keys=read('[KEY,QQStudio.STORAGE_KEY,QQJobs.STORAGE_KEY,QQPlanner.STORAGE_KEY]');
  const stale=await storage.connect(db.factory,keys[0]);
  await stale.write('old progress');
  ui.storage.set(keys[0],'old fallback');
  const session=new Map([['meiqq-last-page','map'],['unrelated','keep']]);
  const browser=ui.ctx.window;
  let hash,reloaded=false;
  browser.location={reload(){reloaded=true;}};
  browser.history={replaceState(_state,_title,url){hash=url;}};
  browser.sessionStorage={getItem:key=>session.get(key)??null,removeItem:key=>session.delete(key)};
  ui.ctx.localStorage.removeItem=key=>ui.storage.delete(key);
  ui.click('reset-app');
  await read('resetApp()');
  assert.equal(hash,'#sky');assert.equal(reloaded,true);
  assert.deepEqual([...ui.storage],[['unrelated','keep']]);
  assert.deepEqual([...session],[['unrelated','keep']]);
  for(const key of keys)assert.equal((await storage.connect(db.factory,key)).raw,undefined);
  await assert.rejects(stale.write('resurrected progress'),{code:'STALE_WORKSPACE'});
});
test('failed atomic writes retain the previous committed workspace',async()=>{
  const db=database(),backend=await storage.connect(db.factory,'test');await backend.write('old');
  db.options.failWrites=true;await assert.rejects(backend.write('new'),/Quota/);assert.equal(db.records.get('test').text,'old');
});
test('a stale browser window cannot overwrite a newer committed workspace',async()=>{
  const db=database(),a=await storage.connect(db.factory,'test'),b=await storage.connect(db.factory,'test');
  await a.write('latest');await assert.rejects(b.write('stale'),{code:'STALE_WORKSPACE'});
  assert.equal(db.records.get('test').text,'latest');
});
test('opening an unchanged simulator in another window preserves editing rights until a real edit',async()=>{
  const db=database(),key='qq-studio-lab-v1';
  const open=async()=>{
    const ui=setup(undefined,{indexedDB:db.factory});await vm.runInContext('appReady',ui.ctx);
    assert.equal(await vm.runInContext('saveWriter.flush()',ui.ctx),true);return ui;
  };
  const first=await open(),revision=db.records.get(key).revision,second=await open();
  assert.equal(db.records.get(key).revision,revision);
  vm.runInContext('draft.ownerHours=37;save()',first.ctx);
  assert.equal(await vm.runInContext('saveWriter.flush()',first.ctx),true);
  vm.runInContext('draft.ownerHours=25;save()',second.ctx);
  assert.equal(await vm.runInContext('saveWriter.flush()',second.ctx),false);
  assert.match(vm.runInContext('saveLabel()',second.ctx),/Another MEIQQ window/);
  assert.equal(require('./workspace.js').parseText(db.records.get(key).text).draft.ownerHours,37);
});
test('unchanged text still records a new fallback fingerprint and upgrades a legacy string',async()=>{
  const db=database();db.records.set('test','unchanged');
  const backend=await storage.connect(db.factory,'test');
  await backend.write('unchanged','first');await backend.write('unchanged','second');
  assert.deepEqual(db.records.get('test'),{revision:2,text:'unchanged',fallbackFingerprint:'second'});
  await backend.write('unchanged','second');assert.equal(db.records.get('test').revision,2);
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
test('reverting to the committed version while a newer write fails leaves the workspace saved',async()=>{
  let rejectWrite;const statuses=[];
  const w=storage.writer(text=>text==='kept'?Promise.resolve():new Promise((resolve,reject)=>{rejectWrite=reject;}),s=>statuses.push(s));
  w.push('kept');await w.flush();
  w.push('new edit');w.push('kept');const flushed=w.flush();rejectWrite(Error('Quota exceeded'));
  assert.equal(await flushed,true);assert.equal(statuses.at(-1),'saved');
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
