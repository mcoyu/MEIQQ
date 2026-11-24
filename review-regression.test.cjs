const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {setup} = require('./ui-test-host.cjs');
const {database} = require('./storage-test-host.cjs');

test('an empty primary save is preserved as corrupt data rather than overwritten', async () => {
  const db = database();
  db.records.set('qq-studio-lab-v1', '');
  const ui = setup(undefined, {indexedDB: db.factory});
  await vm.runInContext('appReady', ui.ctx);
  await vm.runInContext('saveWriter.flush()', ui.ctx);
  assert.equal(db.records.get('qq-studio-lab-v1'), '');
  assert.equal(vm.runInContext('recoveryRaw', ui.ctx), '');
  assert.match(ui.elements['#root'].innerHTML, /Saved workspace needs recovery/);
  ui.click('backup');
  assert.equal(vm.runInContext('parseBackup(backupPayload()).recoveryFiles[0].text', ui.ctx), '');
});

test('an empty fallback save is also preserved until explicit recovery', () => {
  const ui = setup([['qq-studio-lab-v1','']]);
  vm.runInContext('save()', ui.ctx);
  assert.equal(ui.storage.get('qq-studio-lab-v1'), '');
  ui.click('confirm-example');
  assert.equal(vm.runInContext('archives[0].workspace.recoveryFiles[0].text', ui.ctx), '');
});

test('primary read failure cannot silently select and overwrite a stale fallback', async () => {
  const q = require('./engine.js');
  const legacy = JSON.stringify({state:q.fresh(),saved:[],draft:q.clone(q.DEFAULT)});
  const db = database();
  db.options.failReads = true;
  db.records.set('qq-studio-lab-v1', {revision:5,text:'unread primary workspace'});
  const ui = setup([['qq-studio-lab-v1',legacy]], {indexedDB:db.factory});
  await vm.runInContext('appReady', ui.ctx);
  vm.runInContext('draft.ownerHours=33;save()', ui.ctx);
  assert.equal(ui.storage.get('qq-studio-lab-v1'), legacy);
  assert.equal(db.records.get('qq-studio-lab-v1').text, 'unread primary workspace');
  assert.match(ui.elements['#save-status'].textContent, /could not be read/);
  ui.click('backup');
  assert.match(ui.elements['#toast'].textContent, /download requested/);
});

test('blank saved percentages stay blank after navigating back to their fields', () => {
  const ui = setup();
  vm.runInContext('draft.conversion=null;draft.deposit=null', ui.ctx);
  assert.match(vm.runInContext('customerInputs()', ui.ctx), /id="input-conversion" type="number" value=""/);
  assert.match(vm.runInContext('cashInputs()', ui.ctx), /id="input-deposit" type="number" value=""/);
  assert.equal(vm.runInContext('draft.conversion', ui.ctx), null);
});

test('successful recovery keeps original files in Scenarios without a persistent alert', () => {
  const ui = setup();
  vm.runInContext("recoveryFiles.push({name:'Recovered draft',text:'{}'});render()", ui.ctx);
  assert.doesNotMatch(vm.runInContext('clock()', ui.ctx), /Original files/);
  assert.doesNotMatch(ui.elements['#root'].innerHTML, /Earlier save restored|View originals/);
  assert.match(vm.runInContext('scenariosView()', ui.ctx), /<details class="original-files"[^>]*><summary>Original files \(1\)<\/summary>/);
  assert.match(vm.runInContext('scenariosView()', ui.ctx), /Recovered draft.*Download/);
});

test('settled saves are quiet while failed saves remain visible', () => {
  const ui = setup();
  assert.match(ui.elements['#root'].innerHTML, /id="save-status"[^>]*hidden/);
  vm.runInContext('draft.ownerHours=21;save()', ui.ctx);
  assert.equal(ui.elements['#save-status'].hidden, true);
  ui.storage.set('qq-studio-lab-v1', 'newer save');
  vm.runInContext('draft.ownerHours=22;save()', ui.ctx);
  assert.equal(ui.elements['#save-status'].hidden, false);
  assert.match(ui.elements['#save-status'].textContent, /Another MEIQQ window/);
});

test('fast background saves stay hidden instead of shifting the running view', () => {
  const ui = setup();
  vm.runInContext("persistenceStatus('saving')", ui.ctx);
  assert.equal(vm.runInContext('showSaveStatus()', ui.ctx), false);
  assert.equal(ui.elements['#save-status'].hidden, true);
  vm.runInContext('showSavingNotice=true;updateSaveStatus()', ui.ctx);
  assert.equal(ui.elements['#save-status'].hidden, false);
  vm.runInContext("persistenceStatus('saved')", ui.ctx);
  assert.equal(ui.elements['#save-status'].hidden, true);
});

test('an original save can restore only its unfinished draft while preserving current work',()=>{
  const ui=setup(),q=require('./engine.js');
  const currentPrice=vm.runInContext('state.config.services[0].price',ui.ctx);
  const previous=q.fresh(),old=q.clone(previous),draft=q.clone(old.config);
  old.version=2;draft.services[0].price=150;
  const raw=JSON.stringify({version:2,state:old,saved:[],draft});
  vm.runInContext(`recoveryFiles.push({name:'Original save before migration',text:${JSON.stringify(raw)}});render()`,ui.ctx);
  assert.match(vm.runInContext('scenariosView()',ui.ctx),/Restore draft/);
  ui.click('restore-original-draft',{index:'0'});ui.click('confirm-restore-draft');
  assert.equal(vm.runInContext('draft.services[0].price',ui.ctx),150);
  assert.equal(vm.runInContext('state.config.services[0].price',ui.ctx),currentPrice);
  assert.equal(vm.runInContext('archives[0].workspace.draft.services[0].price',ui.ctx),currentPrice);
  assert.equal(vm.runInContext('state.day',ui.ctx),0);
  assert.equal(vm.runInContext('MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives)).draft.services[0].price',ui.ctx),150);
});

test('duplicate enforces the same 20-service limit as add service', () => {
  const ui = setup();
  vm.runInContext("for(let i=0;i<17;i++)draft.services.push({...draft.services[0],id:'extra'+i,weight:0})", ui.ctx);
  ui.click('duplicate', {index:'0'});
  assert.equal(vm.runInContext('draft.services.length', ui.ctx), 20);
  assert.match(ui.elements['#toast'].textContent, /20 services/);
});

test('rapidly added and duplicated services remain independently valid', () => {
  const ui = setup();
  vm.runInContext('Date.now=()=>1000', ui.ctx);
  ui.click('add-service');
  ui.click('duplicate', {index:'0'});
  assert.equal(vm.runInContext('new Set(draft.services.map(s=>s.id)).size', ui.ctx), 5);
  assert.doesNotThrow(() => vm.runInContext('QQ.validateConfig(draft)', ui.ctx));
});

test('opening a cash dialog pauses the clock and updates its visible control', () => {
  const ui = setup();
  vm.runInContext('running=true;render();state.blocked={amount:100,cash:0,gap:100,note:"Payment",project:null};cashModal()', ui.ctx);
  assert.equal(vm.runInContext('running', ui.ctx), false);
  assert.doesNotMatch(ui.elements['#root'].innerHTML, />Pause<\/button>/);
});

test('an older write finishing cannot clear a newer backup serialization failure', async () => {
  const db = database();
  const ui = setup(undefined, {indexedDB:db.factory});
  await vm.runInContext('appReady', ui.ctx);
  await vm.runInContext('saveWriter.flush()', ui.ctx);
  vm.runInContext(`
    draft.ownerHours=30;save();
    draft.ownerHours=31;
    MEIQQWorkspace.serialize=()=>{throw Error('Workspace exceeds 128 MiB.');};
    save();
  `, ui.ctx);
  await vm.runInContext('saveWriter.flush()', ui.ctx);
  assert.equal(vm.runInContext('storeError', ui.ctx), true);
  assert.match(ui.elements['#save-status'].textContent, /not saved/);
});

test('a detected storage conflict remains unsaved even if the user returns to an older snapshot', async () => {
  const storage = require('./storage.js');
  const statuses = [];
  let changedExternally = false;
  const writer = storage.writer(async () => {
    if (changedExternally) throw Object.assign(Error('Another window changed this workspace.'), {code:'STALE_WORKSPACE'});
  }, status => statuses.push(status));
  writer.push('original');
  assert.equal(await writer.flush(), true);
  changedExternally = true;
  writer.push('edit');
  assert.equal(await writer.flush(), false);
  writer.push('original');
  assert.equal(await writer.flush(), false);
  assert.equal(statuses.at(-1), 'error');
});

test('work saved during primary-storage outage remains recoverable when primary returns', async () => {
  const q = require('./engine.js'), w = require('./workspace.js');
  const primary = {state:q.fresh(),saved:[],draft:q.clone(q.DEFAULT),checkpointInfo:[],recoveryFiles:[]};
  const db = database();
  db.records.set('qq-studio-lab-v1', {revision:1,text:w.serialize(primary)});
  db.options.failOpen=true;
  const first = setup(undefined, {indexedDB:db.factory});
  await vm.runInContext('appReady', first.ctx);
  vm.runInContext("draft.ownerHours=37;checkpoint('manual');archiveCurrent('Fallback checkpoint');save()", first.ctx);
  db.options.failOpen=false;
  const second = setup([...first.storage], {indexedDB:db.factory});
  await vm.runInContext('appReady', second.ctx);
  await vm.runInContext('saveWriter.flush()', second.ctx);
  assert.equal(vm.runInContext('archives.some(a=>a.workspace.draft.ownerHours===37 && a.workspace.saved.length===1)', second.ctx), true);
  assert.equal(vm.runInContext("archives.some(a=>a.label==='Fallback checkpoint')", second.ctx), true);
  assert.match(second.elements['#root'].innerHTML, /different browser-local save/);
  // Reopening again must not accumulate another copy of the same fallback.
  const count = vm.runInContext('archives.length', second.ctx);
  const third = setup([...first.storage], {indexedDB:db.factory});
  await vm.runInContext('appReady', third.ctx);
  assert.equal(vm.runInContext('archives.length', third.ctx), count);
  await vm.runInContext('saveWriter.flush()', third.ctx);
  vm.runInContext('archives=[];save()', third.ctx);
  await vm.runInContext('saveWriter.flush()', third.ctx);
  const fourth=setup([...first.storage], {indexedDB:db.factory});
  await vm.runInContext('appReady', fourth.ctx);
  assert.equal(vm.runInContext('archives.length', fourth.ctx), 0, 'deleted preserved copies must not resurrect from an unchanged fallback');
});

test('unchanged fallback does not resurrect deleted archives without Web Crypto', async () => {
  const q = require('./engine.js'), w = require('./workspace.js');
  const primary={state:q.fresh(),saved:[],draft:q.clone(q.DEFAULT),checkpointInfo:[],recoveryFiles:[]};
  const fallback={...primary,draft:{...q.clone(q.DEFAULT),ownerHours:37}};
  const fallbackText=w.serialize(fallback),db=database(),key='qq-studio-lab-v1';
  db.records.set(key,{revision:1,text:w.serialize(primary)});
  const open=()=>setup([[key,fallbackText]],{indexedDB:db.factory,noCrypto:true});
  const first=open();await vm.runInContext('appReady',first.ctx);
  await vm.runInContext('saveWriter.flush()',first.ctx);
  assert.equal(vm.runInContext('archives.length',first.ctx),1);
  vm.runInContext('archives=[];save()',first.ctx);
  await vm.runInContext('saveWriter.flush()',first.ctx);
  const second=open();await vm.runInContext('appReady',second.ctx);
  assert.equal(vm.runInContext('archives.length',second.ctx),0);
});
