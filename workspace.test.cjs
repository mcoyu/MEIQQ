const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js'),w=require('./workspace.js');
const fresh=()=>({state:q.fresh(),saved:[],checkpointInfo:[],draft:q.clone(q.DEFAULT),recoveryFiles:[]});
test('unfinished numeric inputs survive full backup round trips',()=>{
  const a=fresh();a.draft.ownerHours=null;a.draft.conversion=2;
  const b=w.parseText(w.serialize(a));assert.equal(b.draft.ownerHours,null);assert.equal(b.draft.conversion,2);assert.equal(b.state.config.ownerHours,10);
});
test('older workspaces keep an unfinished draft when optional customer profiles are absent',()=>{
  const config=q.clone(q.DEFAULT);delete config.customerMix;delete config.profileStrength;delete config.focusType;
  const state=q.fresh(config),draft=q.clone(config);draft.services[0].price=150;
  const imported=w.parseText(JSON.stringify({version:2,state,saved:[],draft}));
  assert.equal(imported.draft.services[0].price,150);
  assert.equal(imported.state.config.services[0].price,290);
  assert.equal(imported.recoveryFiles.length,0);
  assert.equal(w.parseText(w.serialize(imported)).draft.services[0].price,150);
});
test('malformed drafts are quarantined intact while valid applied work remains available',()=>{
  const a=fresh();a.draft.services=null;
  const b=w.parseText(w.serialize(a));assert.deepEqual(b.draft,b.state.config);assert.equal(JSON.parse(b.recoveryFiles[0].text).services,null);
  const c=w.parseText(w.serialize(b));assert.equal(c.recoveryFiles.length,1);
});
test('catalog service scope survives draft backup and malformed metadata is quarantined',()=>{
  const catalog=require('./service-catalog.js'),a=fresh();a.draft.services=catalog.starterServices('restaurant-starter');
  const b=w.parseText(w.serialize(a));assert.deepEqual(b.draft.services,a.draft.services);assert.equal(b.recoveryFiles.length,0);
  b.draft.services[0].spec.deliverables=[{markup:'bad'}];const recovered=w.parseText(w.serialize(b));
  assert.deepEqual(recovered.draft,recovered.state.config);assert.equal(recovered.recoveryFiles.length,1);assert.deepEqual(JSON.parse(recovered.recoveryFiles[0].text).services[0].spec.deliverables,[{markup:'bad'}]);
});
test('unfinished service-option numbers survive backup while malformed option shapes are quarantined',()=>{
  const catalog=require('./service-catalog.js'),a=fresh(),seasonal=catalog.createService('seasonal-campaign');seasonal.price=925;seasonal.weight=0;seasonal.fulfillment.managedShare=1.01;seasonal.fulfillment.designOnlyPrice=null;seasonal.campaign.cadenceDays=null;seasonal.campaign.relationshipDays=400;a.draft.services.push(seasonal);const original=q.clone(a.draft);
  const b=w.parseText(w.serialize(a));assert.deepEqual(b.draft,original);assert.equal(b.recoveryFiles.length,0);assert.ok(q.configIssues(b.draft).some(issue=>issue.path.endsWith('managedShare')));assert.ok(q.configIssues(b.draft).some(issue=>issue.path.endsWith('designOnlyPrice')));
  for(const mutate of [service=>service.fulfillment.mode='forged',service=>service.fulfillment.extra=true,service=>service.campaign.extra=true]){const malformed=fresh(),offer=catalog.createService('seasonal-campaign');offer.weight=0;mutate(offer);malformed.draft.services.push(offer);const recovered=w.parseText(w.serialize(malformed));assert.deepEqual(recovered.draft,recovered.state.config);assert.equal(recovered.recoveryFiles.length,1);}
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
test('a pinned comparison baseline survives backup and archive round trips',()=>{
  const a=fresh();w.checkpoint(a,'manual');a.checkpointInfo[0].baseline=true;
  const archives=[];w.archive(archives,a,'Pinned experiment');
  const b=w.parseText(w.serialize(a,archives));
  assert.equal(b.checkpointInfo[0].baseline,true);
  assert.equal(b.archives[0].workspace.checkpointInfo[0].baseline,true);
});
test('older checkpoint metadata defaults to an unpinned baseline flag',()=>{
  const a=fresh();w.checkpoint(a,'manual');delete a.checkpointInfo[0].baseline;
  const b=w.parseText(w.serialize(a));
  assert.deepEqual(b.checkpointInfo[0],{label:'Studio baseline · day 0',kind:'manual',baseline:false});
});
test('workspace rejects malformed or multiple comparison baselines',()=>{
  const a=fresh();w.checkpoint(a,'manual');q.step(a.state);w.checkpoint(a,'manual');
  a.checkpointInfo[0].baseline=true;a.checkpointInfo[1].baseline=true;
  assert.throws(()=>w.parseText(w.serialize(a)),/more than one comparison baseline/);
  a.checkpointInfo[1].baseline='yes';
  assert.throws(()=>w.parseText(w.serialize(a)),/Checkpoint label/);
});
test('automatic retention never evicts a pinned comparison baseline',()=>{
  const a=fresh();w.checkpoint(a);a.checkpointInfo[0].baseline=true;
  for(let i=0;i<30;i++){q.step(a.state);w.checkpoint(a);}
  assert.equal(a.saved.some((s,i)=>s.day===0&&a.checkpointInfo[i].baseline),true);
  assert.equal(a.checkpointInfo.filter(info=>info.kind==='automatic'&&!info.baseline).length,w.AUTO_LIMIT);
});
test('deduplicating and promoting a checkpoint preserves its baseline',()=>{
  const a=fresh();w.checkpoint(a);a.checkpointInfo[0].baseline=true;
  w.checkpoint(a,'manual');
  assert.equal(a.saved.length,1);assert.equal(a.checkpointInfo[0].kind,'manual');assert.equal(a.checkpointInfo[0].baseline,true);
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
test('legacy browser backup restores checkpoints with missing delivery dates and double-shifted due dates',()=>{
  const active=q.fresh({...q.clone(q.DEFAULT),ownerHours:80,designerHours:80});
  for(let i=0;i<30;i++)q.step(active);
  const old=q.clone(active);old.version=2;
  const complete=old.projects.filter(p=>p.stage==='complete');
  assert.ok(complete.length);
  for(const p of old.projects.filter(p=>p.delivered)){
    delete p.deliveredDay;
    if(p.stage==='complete'){
      p.paymentDue+=p.terms.paymentDays;
      p.receiveDay+=p.terms.paymentDays;
    }
  }
  const imported=w.parseText(JSON.stringify({version:2,state:active,saved:[old],draft:active.config}));
  assert.equal(imported.saved.length,1);
  assert.deepEqual(imported.saved[0],active);
  assert.deepEqual(w.parseText(w.serialize(imported)).saved[0],active);
  const forged=q.clone(old);
  forged.projects.find(p=>p.delivered).log=forged.projects.find(p=>p.delivered).log.filter(e=>e.text!=='Delivered; revenue recognized');
  assert.throws(()=>q.restore(forged),/delivery date cannot be recovered/);
  const current=q.clone(active);delete current.projects.find(p=>p.delivered).deliveredDay;
  assert.throws(()=>q.restore(current),/Payment or delivery dates/);
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

test('recipe provenance is validated and survives checkpoints, export and import',()=>{
  const presets=require('./presets.js'),a=fresh();
  a.state=q.fresh(presets.compose({market:'dearborn',operation:'lean',mix:'food',condition:'busy'},q.DEFAULT));
  const expectedRecipe=q.clone(a.state.config.recipe);
  a.draft=q.clone(a.state.config);w.checkpoint(a,'manual');
  const b=w.parseText(w.serialize(a));
  assert.deepEqual(b.state.config.recipe,expectedRecipe);
  assert.deepEqual(b.saved[0].config.recipe,expectedRecipe);
  const malformed=q.clone(a.state);malformed.config.recipe.operation='<script>';
  assert.throws(()=>q.restore(malformed),/recipe provenance/i);
});
