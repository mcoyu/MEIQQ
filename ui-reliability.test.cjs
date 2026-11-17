const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
test('import preserves old snapshots and unfinished draft in a reopenable workspace',()=>{
  const {ctx,click}=setup();
  vm.runInContext("checkpoint('manual');QQ.step(state);checkpoint('manual');draft.ownerHours=null;pendingImport=parseBackup({format:'qq-studio-setup',version:1,config:QQ.DEFAULT})",ctx);
  click('confirm-import');assert.equal(vm.runInContext('archives[0].workspace.saved.length',ctx),2);
  assert.equal(vm.runInContext('archives[0].workspace.draft.ownerHours',ctx),null);
  click('open-archive',{index:'0'});assert.equal(vm.runInContext('saved.length',ctx),2);assert.equal(vm.runInContext('draft.ownerHours',ctx),null);
  assert.equal(vm.runInContext('archives.length',ctx),1);
});
test('invalid draft does not block backup or disappear when opening an example',()=>{
  const {ctx,click,elements}=setup();vm.runInContext('draft.ownerHours=null',ctx);click('backup');
  assert.match(elements['#toast'].textContent,/download requested/);
  click('confirm-example');assert.equal(vm.runInContext('state.day',ctx),12);
  assert.equal(vm.runInContext('archives[0].workspace.draft.ownerHours',ctx),null);
});
test('malformed stored draft cannot crash startup or overwrite its original data',()=>{
  const q=require('./engine.js'),state=q.fresh();const raw=JSON.stringify({state,saved:[],draft:{...state.config,services:null}});
  const {ctx,elements}=setup([['qq-studio-lab-v1',raw]]);
  assert.equal(vm.runInContext('state.cash',ctx),6000);assert.equal(vm.runInContext('recoveryFiles.length',ctx),1);
  assert.match(elements['#root'].innerHTML,/preserved for recovery/);
});
test('ledger text is escaped even if an internal caller bypasses import validation',()=>{
  const {ctx}=setup();const html=vm.runInContext("state.ledger.push({day:0,type:'expense',amount:0,note:'test',project:'<b>unsafe</b>'});financeView(QQ.metrics(state))",ctx);
  assert.ok(!html.includes('<b>unsafe</b>'));assert.match(html,/&lt;b&gt;unsafe/);
});
test('quota failures preserve previous saved bytes and leave backup available',()=>{
  const {ctx,click,storage,options,elements}=setup();vm.runInContext('save()',ctx);const previous=storage.get('qq-studio-lab-v1');
  options.failWrites=true;vm.runInContext('draft.ownerHours=null;save()',ctx);
  assert.equal(storage.get('qq-studio-lab-v1'),previous);assert.match(elements['#save-status'].textContent,/not saved/);
  click('backup');assert.match(elements['#toast'].textContent,/download requested/);
});
test('fallback saving refuses to overwrite bytes changed by another window',()=>{
  const {ctx,storage,elements}=setup();vm.runInContext('save()',ctx);
  storage.set('qq-studio-lab-v1','newer external save');vm.runInContext('draft.ownerHours=30;save()',ctx);
  assert.equal(storage.get('qq-studio-lab-v1'),'newer external save');
  assert.match(elements['#save-status'].textContent,/Another MEIQQ window/);
});
test('manual snapshot names pin them and deletions require confirmation',()=>{
  const {ctx,click,elements}=setup();click('checkpoint');click('rename-checkpoint',{index:'0'});
  elements['#checkpoint-name']={value:'Baseline to keep'};click('confirm-rename',{index:'0'});
  assert.equal(vm.runInContext('checkpointInfo[0].label',ctx),'Baseline to keep');
  click('delete-checkpoint',{index:'0'});assert.equal(vm.runInContext('saved.length',ctx),1);
  click('confirm-delete',{index:'0',kind:'checkpoint'});assert.equal(vm.runInContext('saved.length',ctx),0);
});
