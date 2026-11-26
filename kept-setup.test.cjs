const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const workspace=require('./workspace.js');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
function finishedComparison(){
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 ui.click('simulate');ui.drainTimers();
 ui.click('checkpoint');ui.click('pin-baseline',{index:0});
 ui.click('test-assumption',{path:'designerRate'});
 read(ui,'draft.designerRate+=1');
 ui.click('simulate-again');ui.drainTimers();
 assert.ok(read(ui,'completedVariantPair()'));return ui;
}
for(const version of ['original','revised']){
 test('keeping the '+version+' setup uses its opening assumptions, retains the full comparison and awaits an explicit launch',()=>{
  const ui=finishedComparison();
  read(ui,"draft.name='Unrelated unfinished setup';draft.services[0].price=null;");
  ui.click('test-assumption',{path:'overhead'});read(ui,'draft.overhead+=10');ui.click('return-rerun-results');
  // Mid-run edits and horizon extensions must be reflected in the saved
  // results. The setup for the next run uses the recorded opening settings.
  read(ui,"QQ.applyConfig(state,{...state.config,designerRate:state.config.designerRate+5});");
  const original=read(ui,'JSON.stringify(completedVariantPair().original)'),
   revised=read(ui,'JSON.stringify(completedVariantPair().revised)'),
   start=read(ui,"JSON.stringify(rerunStartingConfig(completedVariantPair()."+version+"))");
  const pins=read(ui,'JSON.stringify(checkpointInfo)');
  ui.click('keep-run-setup',{version});
  assert.equal(read(ui,'view'),'setup');assert.equal(read(ui,'workspaceRoute()'),'setup/edit/people');
  assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'running'),false);assert.equal(read(ui,'runPassage'),null);
  assert.equal(read(ui,'JSON.stringify(draft)'),start);assert.equal(read(ui,'draft===state.config'),false);
  assert.equal(read(ui,'editingRerun'),false);assert.equal(read(ui,'completedVariantPair()'),null);
  const id=read(ui,'keptComparisonId');assert.match(id,/^comparison-[a-z0-9-]+$/);
  assert.equal(read(ui,'JSON.stringify(checkpointInfo)'),pins);
  const checkSavedPair=source=>{
   const backup=workspace.parseText(read(source,'MEIQQWorkspace.serialize(currentWorkspace(),archives)'));
   assert.equal(backup.keptComparisonId,id);
   const snapshots=backup.archives.filter(item=>item.workspace.rerunLink?.comparisonId===id);
   assert.equal(snapshots.length,1);
   const frozen=snapshots[0].workspace;
   assert.equal(JSON.stringify(frozen.rerunLink.original),original);
   assert.equal(JSON.stringify(frozen.state),revised);assert.equal(frozen.rerunLink.keptVersion,version);
   assert.equal(frozen.draft.name,'Unrelated unfinished setup');assert.equal(frozen.draft.services[0].price,null);
   assert.equal(frozen.rerunDraft.path,'overhead');
  };
  checkSavedPair(ui);
  ui.click('keep-run-setup',{version});assert.equal(read(ui,'archives.filter(a=>a.workspace.rerunLink?.comparisonId).length'),1);
  const restored=setup([...ui.storage]);assert.equal(read(restored,'keptComparisonId'),id);
  read(restored,'draft.designerRate+=.5;');restored.click('simulate');assert.equal(read(restored,'keptComparisonId'),id);
  restored.drainTimers();assert.equal(read(restored,'state.day'),90);checkSavedPair(restored);
  restored.click('confirm-example');assert.equal(read(restored,'keptComparisonId'),null);
 });
}
test('a rejected workspace write leaves the completed pair and its revision draft available',()=>{
 const ui=finishedComparison();ui.click('test-assumption',{path:'overhead'});
 read(ui,'draft.overhead+=5');ui.click('return-rerun-results');
 const original=read(ui,'JSON.stringify(currentWorkspace())'),archives=read(ui,'JSON.stringify(archives)');
 ui.ctx.localStorage.setItem=()=>{throw Error('Quota exceeded');};
 ui.click('keep-run-setup',{version:'original'});
 assert.equal(read(ui,'view'),'finances');assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),original);
 assert.equal(read(ui,'JSON.stringify(archives)'),archives);
 assert.ok(read(ui,'completedVariantPair()'));assert.equal(read(ui,'storeError'),true);
});
test('the setup switches only after the browser writer commits and a failed choice can be retried',async()=>{
 const ui=finishedComparison(),pending=[];
 ui.ctx.controlledWrite=text=>new Promise((resolve,reject)=>pending.push({text,resolve,reject}));
 read(ui,'saveWriter=MEIQQStorage.writer(controlledWrite,persistenceStatus)');
 const source=read(ui,'JSON.stringify(currentWorkspace())');
 ui.click('keep-run-setup',{version:'original'});
 assert.equal(read(ui,'savingKeptSetup'),true);assert.equal(read(ui,'view'),'finances');
 ui.click('keep-run-setup',{version:'revised'});ui.click('view',{view:'map'});read(ui,'save()');
 assert.equal(pending.length,1);assert.equal(read(ui,'view'),'finances');
 const rejected=read(ui,'saveWriter.flush()');pending[0].reject(Error('Quota exceeded'));
 assert.equal(await rejected,false);assert.equal(read(ui,'savingKeptSetup'),false);
 assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),source);
 ui.click('keep-run-setup',{version:'revised'});
 assert.equal(read(ui,'editingRerun'),false);assert.equal(read(ui,'state.day'),90);
 const committed=read(ui,'saveWriter.flush()');pending[1].resolve();assert.equal(await committed,true);
 assert.equal(read(ui,'view'),'setup');assert.equal(read(ui,'state.day'),0);
 assert.equal(read(ui,'keptComparisonId'),workspace.parseText(pending[1].text).keptComparisonId);
 assert.equal(pending.length,2);
});
