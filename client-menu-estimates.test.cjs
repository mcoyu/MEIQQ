const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const data=(ui,code)=>JSON.parse(read(ui,'JSON.stringify('+code+')'));
function editor(type='business'){
 const ui=setup();
 ui.click('start-'+type);ui.click('enter-setup',{mode:'guided'});
 read(ui,"var profile=QQServiceCatalog.CLIENT_MENUS.find(p=>p.id==='restaurant'),ids=profile.slots.map(s=>s.options[0].id);");
 return ui;
}

test('every recommended menu and swap uses the actual estimator on the current horizon without touching the draft',()=>{
 const ui=editor();
 read(ui,'var unchanged=JSON.stringify(currentWorkspace());draft.months=6;');
 for(const profile of data(ui,'QQServiceCatalog.CLIENT_MENUS')){
  const cases=read(ui,`var p=QQServiceCatalog.CLIENT_MENUS.find(p=>p.id===${JSON.stringify(profile.id)}),base=p.slots.map(s=>s.options[0].id);
   p.slots.every((slot,i)=>slot.options.every(option=>{
    const ids=[...base];ids[i]=option.id;
    const candidate=clientMenuCandidate(p,ids),e=clientMenuProjection(candidate.config),a=QQ.estimate(draftRunConfig(candidate.config));
    return !candidate.error&&candidate.pristineRemoved&&candidate.added.length===3&&candidate.removed.length===1&&e.valid&&e.days===180&&
      e.profit===a.profit&&e.orders===a.orders&&e.productionHours===a.hours&&e.ownerHours===a.owner&&e.surplus===a.surplus&&e.unservedShare===a.unservedShare&&
      Math.round(candidate.config.services.reduce((sum,s)=>sum+s.weight,0)*100)===10000&&candidate.config.services.every(s=>s.weight>0);
   }))`);
  assert.equal(cases,true,profile.id);
 }
 read(ui,'draft.months=3');assert.equal(read(ui,'unchanged===JSON.stringify(currentWorkspace())'),true);
 assert.equal(read(ui,'serviceUndoDraft'),null);assert.equal(read(ui,'currentClientMenu()'),null);
});

test('preview and Apply share service IDs and numbers, strip menu membership from run input and Undo restores the whole starting draft',()=>{
 const ui=editor(),before=data(ui,'draft'),state=data(ui,'state');
 read(ui,"var preview=clientMenuCandidate(profile,ids);");
 assert.deepEqual(data(ui,'clientMenuCandidate(profile,ids).config'),data(ui,'preview.config'));
 read(ui,"clientMenuCandidate(profile,[profile.slots[0].options[1].id,...ids.slice(1)]);");
 read(ui,"var committed=applyClientMenu(profile,ids);");
 assert.deepEqual(data(ui,'draft'),data(ui,'preview.config'));
 assert.deepEqual(data(ui,'clientMenuProjection(draft)'),data(ui,'clientMenuProjection(preview.config)'));
 assert.deepEqual(data(ui,'currentClientMenu().packageIds'),data(ui,'ids'));
 assert.equal(read(ui,'draftRunConfig().clientMenu'),undefined);
 assert.equal(read(ui,'applyClientMenu(profile,ids).changed'),false);
 assert.deepEqual(data(ui,'serviceUndoDraft'),before);
 assert.deepEqual(data(ui,'state'),state);
 ui.click('undo-services');
 assert.deepEqual(data(ui,'draft'),before);
});

test('swapping an applied role retires that instance and transfers its inquiry share while preserving customized copies and their record evidence',()=>{
 const ui=editor();
 read(ui,`var a=applyClientMenu(profile,ids),selected=currentClientMenu(),old=selected.serviceIds[0],other=selected.serviceIds[1];
  draft.services[0].weight=40;draft.services[1].weight=20;draft.services[2].weight=25;
  var duplicate={...QQ.clone(draft.services[0]),id:'named-copy',name:'My other sales project',price:805,weight:15};
  draft.services.push(duplicate);var oldPath='services.'+old+'.price',copyPath='services.'+duplicate.id+'.price';
  const rec=value=>({value,source:'Paid pilot',sample:'One',date:'2026-11-20'});
  draft.assumptionRecords={[oldPath]:rec(draft.services[0].price),[copyPath]:rec(805)};
  var swapped=[profile.slots[0].options[1].id,...ids.slice(1)],before=QQ.clone(draft);
  var candidate=clientMenuCandidate(profile,swapped,true);`);
 assert.deepEqual(data(ui,'candidate.removed.map(s=>s.id)'),[read(ui,'old')]);
 assert.equal(read(ui,'candidate.config.services.find(s=>s.id==="named-copy").weight'),15);
 assert.equal(read(ui,'candidate.added[0].weight'),40);
 assert.equal(read(ui,'candidate.config.assumptionRecords[copyPath].value'),805);
 assert.equal(read(ui,'candidate.config.assumptionRecords[oldPath]'),undefined);
 read(ui,'applyClientMenu(profile,swapped,true)');
 assert.equal(read(ui,'currentClientMenu().serviceIds[1]===other'),true);
 assert.equal(read(ui,"clientMenuCandidate(profile,ids).config.clientMenu.serviceIds[0]"),'named-copy');
 assert.equal(read(ui,"clientMenuCandidate(profile,ids).config.services.find(s=>s.id==='named-copy').weight"),55);
 ui.click('undo-services');assert.deepEqual(data(ui,'draft'),data(ui,'before'));
 // Without a second copy to reuse, adding the old package again creates a new agreement identity.
 read(ui,"draft.services.pop();applyClientMenu(profile,swapped);applyClientMenu(profile,ids)");
 assert.notEqual(read(ui,'currentClientMenu().serviceIds[0]'),read(ui,'old'));
});

test('combining keeps partial inputs, explicit replacement lists them, projections surface real missing inputs',()=>{
 const ui=editor();
 read(ui,"draft.services[0].name='My half-written project';var unfinished=draft.services[0].id;");
 const keep=data(ui,'clientMenuCandidate(profile,ids,true)');
 assert.equal(keep.removed.length,0);assert.equal(keep.retained.length,1);assert.equal(keep.pristineRemoved,false);
 assert.equal(read(ui,'clientMenuProjection(clientMenuCandidate(profile,ids,true).config).profit'),null);
 assert.ok(data(ui,'clientMenuProjection(clientMenuCandidate(profile,ids,true).config).issues').some(i=>i.path==='services.0.price'));
 const replace=data(ui,'clientMenuCandidate(profile,ids,false)');
 assert.equal(replace.removed[0].id,read(ui,'unfinished'));assert.equal(replace.config.services.length,3);
 read(ui,'draft.ownerHours=null;applyClientMenu(profile,ids,false)');
 assert.equal(read(ui,'draft.ownerHours'),null);
 assert.equal(read(ui,'clientMenuProjection(draft).valid'),false);
 assert.ok(data(ui,'clientMenuProjection(draft).issues').some(i=>i.path==='ownerHours'));
 assert.deepEqual(data(ui,'currentClientMenu().packageIds'),data(ui,'ids'));
});

test('legacy demand stays unsegmented and parked copies selected for a role can be activated with their saved terms',()=>{
 const ui=editor();
 read(ui,`delete draft.customerMix;delete draft.profileStrength;delete draft.focusType;
  var unseg=clientMenuCandidate(profile,ids);
  var c=QQServiceCatalog.createService(ids[0]);c.id='parked-customized-copy';c.name='Booked diagnostic';c.price=625;c.audience='all';c.weight=0;
  draft.services=[{...QQServiceCatalog.createService('digital-flyer'),weight:100,audience:'all'},c];`);
 assert.equal(read(ui,'unseg.unsegmented'),true);
 assert.equal(read(ui,'unseg.config.customerMix'),undefined);
 assert.equal(read(ui,"unseg.config.services.every(s=>s.audience==='all')"),true);
 assert.equal(read(ui,'clientMenuProjection(unseg.config).valid'),true);
 read(ui,'var candidate=applyClientMenu(profile,ids,true)');
 assert.deepEqual(data(ui,'candidate.activated.map(s=>s.id)'),['parked-customized-copy']);
 assert.equal(read(ui,'draft.services.find(s=>s.id===c.id).price'),625);
 assert.equal(read(ui,'draft.services.find(s=>s.id===c.id).weight'),25);
 assert.equal(read(ui,'draft.customerMix'),undefined);
 assert.equal(read(ui,'clientMenuProjection(draft).valid'),true);
});

test('invalid slots and over-cap menus fail atomically, a replace can still fit, and incomplete memberships never identify the wrong services',()=>{
 const ui=editor('restaurant');
 read(ui,`for(let i=draft.services.length;i<20;i++)draft.services.push({...QQServiceCatalog.createService('digital-flyer'),id:'old-'+i,weight:0});
  var original=JSON.stringify(draft),priorUndo=serviceUndoDraft;`);
 for(const idList of ['ids.slice(1)','[ids[0],ids[0],ids[2]]','["missing",...ids.slice(1)]']){
  assert.ok(read(ui,'clientMenuCandidate(profile,'+idList+').error'));
  assert.throws(()=>read(ui,'applyClientMenu(profile,'+idList+')'));
 }
 assert.ok(read(ui,'clientMenuCandidate(profile,ids,true).error'));
 assert.throws(()=>read(ui,'applyClientMenu(profile,ids,true)'));
 assert.equal(read(ui,'JSON.stringify(draft)===original&&serviceUndoDraft===priorUndo'),true);
 read(ui,'applyClientMenu(profile,ids,false);');
 assert.equal(read(ui,'draft.services.length'),3);
 read(ui,'draft.services[0].weight=0');assert.equal(read(ui,'currentClientMenu()'),null);
 read(ui,"draft.services[0].weight=30;draft.clientMenu.serviceIds.reverse()");assert.equal(read(ui,'currentClientMenu()'),null);
});

test('an applied menu survives reload and portable backup without changing accepted jobs or the active run',()=>{
 const ui=editor('restaurant');
 read(ui,`for(let day=0;day<45;day++)QQ.step(state);
  var original=JSON.stringify(state),accepted=state.projects.filter(p=>p.terms).length;
  applyClientMenu(profile,ids,false);save();`);
 assert.ok(read(ui,'accepted>0'));
 assert.equal(read(ui,'JSON.stringify(state)===original'),true);
 ui.drainTimers();
 const re=setup([...ui.storage]);
 assert.deepEqual(data(re,'currentClientMenu().serviceIds'),data(ui,'currentClientMenu().serviceIds'));
 assert.equal(read(re,'state.day'),45);
 assert.deepEqual(data(re,'state.projects'),data(ui,'state.projects'));
 const saved=JSON.parse(read(re,'JSON.stringify(MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives)))'));
 assert.deepEqual(saved.draft.clientMenu,data(ui,'draft.clientMenu'));
 assert.equal(saved.state.config.clientMenu,undefined);
});

test('two equivalent choices can link a previously unlinked menu without changing its displayed estimate',()=>{
 const ui=editor();
 read(ui,`applyClientMenu(profile,ids);var terms=JSON.stringify(draft.services),before=clientMenuProjection(draft);
  delete draft.clientMenu;serviceUndoDraft=null;
  var candidate=clientMenuCandidate(profile,ids,true);`);
 assert.equal(read(ui,'candidate.changed'),true);
 assert.equal(read(ui,'candidate.added.length+candidate.removed.length'),0);
 assert.equal(read(ui,'JSON.stringify(candidate.config.services)===terms'),true);
 assert.deepEqual(data(ui,'clientMenuProjection(candidate.config)'),data(ui,'before'));
 read(ui,'applyClientMenu(profile,ids)');assert.equal(read(ui,'currentClientMenu().profile.id'),read(ui,'profile.id'));
 ui.click('undo-services');assert.equal(read(ui,'currentClientMenu()'),null);
});

test('a broken client-menu link in a backup can be forgotten without losing any service edits',()=>{
 const ui=editor();
 read(ui,"applyClientMenu(profile,ids);draft.services[0].name='My tested scope';var originalRows=JSON.stringify(draft.services);");
 for(const broken of ['null',"['restaurant']","{profileId:'restaurant',serviceIds:['old','old','old']}","{profileId:'restaurant',serviceIds:draft.clientMenu.serviceIds,other:true}"]){
  read(ui,'var restoredMenuDraft=MEIQQWorkspace.editableDraft({...draft,clientMenu:'+broken+'},state.config)');
  assert.equal(read(ui,"Object.hasOwn(restoredMenuDraft,'clientMenu')"),false);
  assert.equal(read(ui,'JSON.stringify(restoredMenuDraft.services)===originalRows'),true);
 }
});

test('a restaurant role uses an eligible copy while keeping a retail customization as a separate offer',()=>{
 const ui=editor();
 read(ui,`applyClientMenu(profile,ids);var storeOffer=draft.services[0];storeOffer.audience='retail';storeOffer.price=815;
  draft.clientDemand={profileId:'restaurant',share:100};
  var originalDraft=JSON.stringify(draft),candidate=clientMenuCandidate(profile,ids);`);
 assert.equal(read(ui,'currentClientMenu()'),null);
 assert.equal(read(ui,'currentClientMenu(draft,true).serviceIds[0]'),null);
 assert.equal(read(ui,'candidate.added.length'),1);
 assert.equal(read(ui,'candidate.config.services.find(s=>s.id===storeOffer.id).price'),815);
 assert.equal(read(ui,'JSON.stringify(draft)'),read(ui,'originalDraft'));
 read(ui,`applyClientMenu(profile,ids);var menu=currentClientMenu(),config=draftRunConfig(),e=QQ.estimate(config);
   var actual=new Set();for(let day=1;day<=90;day++)QQ.visitExternalInquiries(config,day,(id,type,service)=>actual.add(service?.id));`);
 assert.notEqual(read(ui,'menu.serviceIds[0]'),read(ui,'storeOffer.id'));
 assert.ok(read(ui,'e.services.find(s=>s.id===menu.serviceIds[0]).inquiries>0'));
 assert.equal(read(ui,'e.services.find(s=>s.id===storeOffer.id).inquiries'),0);
 assert.equal(read(ui,'actual.has(storeOffer.id)'),false);
 ui.click('undo-services');
 assert.equal(read(ui,'JSON.stringify(draft)'),read(ui,'originalDraft'));
});

test('swapping a remaining role after removing a different role retires only its linked predecessor',()=>{
 const ui=editor();
 read(ui,`applyClientMenu(profile,ids);var prior=currentClientMenu(),retired=prior.serviceIds[1],retained=prior.serviceIds[2];
  removeDraftService(0);var old=JSON.stringify(draft),replacement=[ids[0],profile.slots[1].options[1].id,ids[2]];
  var candidate=applyClientMenu(profile,replacement);`);
 assert.deepEqual(data(ui,'candidate.removed.map(s=>s.id)'),[read(ui,'retired')]);
 assert.equal(read(ui,'draft.services.length'),3);
 assert.equal(read(ui,'currentClientMenu().serviceIds[2]'),read(ui,'retained'));
 assert.equal(read(ui,'draft.services.some(s=>s.id===retired)'),false);
 assert.deepEqual(data(ui,'currentClientMenu().packageIds'),data(ui,'replacement'));
 ui.click('undo-services');assert.equal(read(ui,'JSON.stringify(draft)'),read(ui,'old'));
});
