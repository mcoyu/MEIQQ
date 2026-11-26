const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,code)=>vm.runInContext(code,ui.ctx);

test('current-catalog workspace crosses export/import with pin, unfinished draft, archive and recovery original intact',()=>{
 const source=setup();
 read(source,`for(let i=0;i<8;i++)QQ.step(state);checkpoint('manual');checkpointInfo[0].baseline=true;
   draft.services[1].fulfillment.managedShare=null;draft.services[1].price=444;
   recoveryFiles.push({name:'Original <before migration>',text:'{broken'});
   MEIQQWorkspace.archive(archives,currentWorkspace(),'Archive <one>');
   exported=MEIQQWorkspace.serialize(currentWorkspace(),archives)`);
 const text=read(source,'exported'),parsed=read(source,'MEIQQWorkspace.parseText(exported)');
 assert.equal(parsed.state.day,8);assert.equal(parsed.checkpointInfo[0].baseline,true);
 assert.equal(parsed.draft.services[1].fulfillment.managedShare,null);assert.equal(parsed.draft.services[1].price,444);
 assert.equal(parsed.recoveryFiles[0].name,'Original <before migration>');assert.equal(parsed.archives.length,1);
 assert.equal(parsed.archives[0].workspace.checkpointInfo[0].baseline,true);
 assert.ok(parsed.state.config.services.every(service=>service.spec?.catalogId));

 const reopened=setup();reopened.ctx.exported=text;read(reopened,'pendingImport=MEIQQWorkspace.parseText(exported)');reopened.click('confirm-import');
 assert.equal(read(reopened,'state.day'),8);assert.equal(read(reopened,'checkpointInfo[0].baseline'),true);
 assert.equal(read(reopened,'draft.services[1].fulfillment.managedShare'),null);
 assert.equal(read(reopened,'archives.length'),2,'opening keeps the previous workspace and imported archive');
 assert.equal(read(reopened,'recoveryFiles[0].text'),'{broken');
});

test('standalone bundle and source boot the same modules when browser storage writes are unavailable',()=>{
 const source=setup(undefined,{failWrites:true}),built=setup(undefined,{failWrites:true,built:true});
 for(const ui of [source,built]){
  assert.equal(read(ui,'Boolean(QQ&&QQServiceCatalog&&QQPresets&&QQComparisonReport&&MEIQQWorkspace&&MEIQQStorage)'),true);
  assert.equal(read(ui,'QQ.configIssues(state.config).length'),0);assert.equal(read(ui,'state.config.services.length'),3);
  read(ui,'save()');ui.drainTimers();assert.equal(read(ui,'storeError'),true);
  assert.match(ui.elements['#save-status'].textContent,/not saved|unavailable/i);
 }
 assert.equal(read(source,'JSON.stringify(state.config)'),read(built,'JSON.stringify(state.config)'));
 assert.equal(read(source,'JSON.stringify(QQServiceCatalog.CATALOG)'),read(built,'JSON.stringify(QQServiceCatalog.CATALOG)'));
});

test('corrupt standalone storage enters recovery without replacing original bytes',()=>{
 const raw='<broken & saved>',ui=setup([['qq-studio-lab-v1',raw]],{built:true});
 assert.equal(read(ui,'recoveryRaw'),raw);assert.match(ui.elements['#root'].innerHTML,/Saved workspace needs recovery/);
 assert.equal(ui.storage.get('qq-studio-lab-v1'),raw);read(ui,'save()');ui.drainTimers();assert.equal(ui.storage.get('qq-studio-lab-v1'),raw);
 ui.click('recover');assert.equal(ui.downloads.length,1);assert.equal(ui.downloads[0].download,'MEIQQ-original-save.json');
});

test('workspaces with saved appearance preferences escape output and reports remain self-contained and printable',async()=>{
 for(const theme of ['terminal','dark']){
  const ui=setup([['qq-studio-appearance',theme]]);read(ui,`state.config.name='<img src=x onerror=alert(1)>';view='map';render()`);
  assert.equal(ui.ctx.document.documentElement.dataset.theme,'terminal');assert.match(ui.elements['#root'].innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(ui.elements['#root'].innerHTML,/<img/i);
 }
 const ui=setup();read(ui,`for(let i=0;i<3;i++)QQ.step(state);base=QQ.clone(state);for(let i=0;i<3;i++)QQ.step(state);
   reportOut=QQComparisonReport.create(state,base,{currentLabel:'Current <svg onload=bad>',baselineLabel:'Base & old',generatedAt:'2026-11-19T00:00:00Z'})`);
 const out=read(ui,'reportOut');assert.match(out.html,/@media print/);assert.match(out.html,/break-inside:avoid/);
 assert.match(out.html,/Current &lt;svg onload=bad&gt;/);assert.doesNotMatch(out.html,/<script|<svg|<img|<link/i);
 assert.match(out.html,/Exact assumption changes/);assert.match(out.html,/Comparison validity/);assert.match(out.html,/Per-value recipe derivation/);
 assert.ok(Buffer.byteLength(out.html)>1000);assert.match(out.filename,/\.html$/);
});
