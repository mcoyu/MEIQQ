const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const data=(ui,code)=>JSON.parse(read(ui,'JSON.stringify('+code+')'));
function editor(type='restaurant'){
 const ui=setup();ui.click('start-'+type);ui.click('enter-setup',{mode:'guided'});return ui;
}

test('one batch replaces only the untouched starter and is ready to simulate, undo, or reopen',()=>{
 const ui=editor('business'),before=data(ui,'draft'),run=data(ui,'state');
 const result=data(ui,"applyCatalogSelection(['digital-flyer','table-tents-100','brand-starter','digital-flyer'])");
 assert.equal(result.added.length,3);assert.deepEqual(result.removed,[before.services[0].id]);
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[33.34,33.33,33.33]);
 assert.equal(read(ui,'draftError()'),'');
 assert.ok(read(ui,'QQ.estimate(draftRunConfig()).services.every(s=>s.effectiveShare>0)'));
 read(ui,'save()');ui.drainTimers();
 const reopened=setup([...ui.storage]);
 assert.deepEqual(data(reopened,'draft.services'),data(ui,'draft.services'));
 ui.click('undo-services');assert.deepEqual(data(ui,'draft'),before);assert.deepEqual(data(ui,'state'),run);
});

test('adding and deliberately removing exact instances preserves partial custom work, repeated packages and serving ratios',()=>{
 const ui=editor();
 read(ui,`var [one,two,three]=draft.services;
  var copy={...QQ.clone(two),id:'my-second-table-offer',name:'My premium tent',price:430,weight:10};
  two.weight=20;draft.services.push(copy);
  appendCatalogService(null);var parked=draft.services.at(-1);parked.name='Work in progress';
  var retained='services.'+copy.id+'.price',removed='services.'+two.id+'.price';
  draft.assumptionRecords={[retained]:{source:'Client A',sample:'Three orders',date:'2026-11-01',value:430},[removed]:{source:'Client B',sample:'One order',date:'2026-11-02',value:two.price}};
  draft.ownerHours=null;`);
 const before=data(ui,'draft');
 const result=data(ui,"applyCatalogSelection(['digital-flyer','table-tents-100','postcard-250'],[two.id])");
 assert.equal(result.added.length,2);assert.deepEqual(result.removed,[before.services[1].id]);
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[30,22.5,7.5,0,20,20]);
 assert.equal(read(ui,"draft.services.find(s=>s.id===copy.id).price"),430);
 assert.equal(read(ui,'draft.assumptionRecords[retained].source'),'Client A');assert.equal(read(ui,'draft.assumptionRecords[removed]'),undefined);
 assert.equal(read(ui,'draft.ownerHours'),null);
 assert.equal(read(ui,'draft.services.find(s=>s.id===parked.id).price'),null);
 const saved=data(ui,'draft');
 assert.deepEqual(data(ui,"applyCatalogSelection(['postcard-250','postcard-250'])"),{added:[],removed:[]});
 assert.deepEqual(data(ui,'draft'),saved);
 ui.click('undo-services');assert.deepEqual(data(ui,'draft'),before);
});

test('a partially entered first service is kept, including unpriced inputs and locally recorded evidence',()=>{
 const ui=editor('business');
 read(ui,"draft.services[0].hours=0;var id=draft.services[0].id");
 read(ui,"applyCatalogSelection(['digital-flyer'])");
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[50,50]);
 assert.equal(read(ui,'draft.services[0].id'),read(ui,'id'));
 assert.equal(read(ui,'draft.services[0].price'),null);
 ui.click('undo-services');
 read(ui,"draft.services[0].hours=null;draft.assumptionRecords={['services.'+id+'.price']:{source:'Observation',sample:'One',date:'2026-11-01',value:10}}");
 assert.equal(read(ui,'pristineOfferStarter(draft)'),null);
});

test('last active offer, stale IDs and the row limit reject the whole change before draft or undo changes',()=>{
 const ui=editor('business');
 read(ui,"applyCatalogSelection(['digital-flyer'])");
 const before=data(ui,'draft'),undo=data(ui,'serviceUndoDraft');
 for(const command of ["applyCatalogSelection([],draft.services.map(s=>s.id))","applyCatalogSelection(['postcard-250'],['missing-id'])","applyCatalogSelection(['postcard-250','missing-template'])"]){
  assert.throws(()=>read(ui,command));assert.deepEqual(data(ui,'draft'),before);assert.deepEqual(data(ui,'serviceUndoDraft'),undo);
 }
 read(ui,"while(draft.services.length<20)appendCatalogService(null)");
 const full=data(ui,'draft');
 assert.throws(()=>read(ui,"applyCatalogSelection(['postcard-250'])"),/20/);assert.deepEqual(data(ui,'draft'),full);
 assert.throws(()=>read(ui,"applyCatalogSelection([],[draft.services[0].id])"),/active offer/);assert.deepEqual(data(ui,'draft'),full);
 assert.throws(()=>read(ui,"removeDraftService(0)"),/active offer/);assert.deepEqual(data(ui,'draft'),full);
 read(ui,"applyCatalogSelection(['postcard-250'],[draft.services[0].id])");
 assert.equal(read(ui,'draft.services.length'),20);assert.equal(read(ui,'draft.services.at(-1).weight'),100);
});

test('include reactivates one parked instance, preserves the others and supports very small positive shares',()=>{
 const ui=editor();
 read(ui,`draft.services[0].weight=.000001;draft.services[1].weight=99.999999;draft.services[2].weight=0;
  appendCatalogService(null);var custom=draft.services.at(-1);custom.name='Custom service';`);
 assert.equal(read(ui,'includeDraftOffer(custom.id)'),true);
 assert.equal(read(ui,'draft.services.length'),4);
 assert.equal(read(ui,'draft.services.at(-1).id'),read(ui,'custom.id'));
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[.01,66.66,0,33.33]);
 assert.equal(read(ui,'includeDraftOffer(custom.id)'),false);
 ui.click('undo-services');assert.equal(read(ui,'draft.services.at(-1).weight'),0);
});

test('single-row undo keeps shares changed after removal and restores its original settings',()=>{
 const ui=editor();
 read(ui,"var removed=draft.services[1];removeDraftService(1);draft.services[0].weight=50;draft.services[0].price=555");
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[50,42.86]);
 read(ui,'restoreDraftService()');
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[50,25,25]);
 assert.equal(read(ui,'draft.services[1]===removed'),true);
 assert.equal(read(ui,'draft.services[0].price'),555);
});

test('Balance repairs incomplete weights and divides evenly while both catalog and custom zero-share rows stay parked',()=>{
 const ui=editor();
 read(ui,`draft.services[0].weight=null;draft.services[1].weight=0;draft.services[2].weight=-5;
  appendCatalogService(null);appendCatalogService(null);draft.services.at(-1).weight=200;render()`);
 assert.match(ui.elements['#root'].innerHTML,/To add a service at 0% to the split, choose Include in simulation/);
 ui.click('balance');
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[33.34,0,33.33,0,33.33]);
 read(ui,'draft.services.forEach(s=>s.weight=0);render()');
 assert.match(ui.elements['#root'].innerHTML,/data-action="balance" disabled/);
 ui.click('balance');assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[0,0,0,0,0]);
});

test('a parked sole custom service can be included and a blocked removal points to an actual alternative',()=>{
 const ui=editor('business');
 read(ui,'draft.services[0].weight=0;render()');
 assert.match(ui.elements['#root'].innerHTML,/data-action="include-offer"/);
 ui.click('include-offer',{id:read(ui,'draft.services[0].id')});
 assert.equal(read(ui,'draft.services[0].weight'),100);
 read(ui,'appendCatalogService(null);draft.services[0].weight=65;render()');
 const alternate=read(ui,'draft.services[1].id');let focused=false;
 ui.elements['[data-action="include-offer"][data-id="'+alternate+'"]']={focus(){focused=true;}};
 ui.click('remove-service',{id:read(ui,'draft.services[0].id')});
 assert.ok(focused);assert.match(ui.elements['#toast'].textContent,/Choose Include in simulation/);
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[65,0]);
 ui.click('include-offer',{id:alternate});ui.click('remove-service',{id:read(ui,'draft.services[0].id')});
 assert.deepEqual(data(ui,'draft.services.map(s=>[s.id,s.weight])'),[[alternate,100]]);
});

test('batching during an active run affects future work only after its draft is applied',()=>{
 const ui=editor();
 read(ui,`for(let d=0;d<25;d++)QQ.step(state);
  var terms=JSON.stringify(state.projects.map(p=>[p.serviceId,p.terms]));
  var active=JSON.stringify(state.config),old=draft.services[0].id;
  applyCatalogSelection(['digital-flyer','postcard-250'],[old]);`);
 assert.equal(read(ui,'JSON.stringify(state.config)===active'),true);
 assert.equal(read(ui,'JSON.stringify(state.projects.map(p=>[p.serviceId,p.terms]))===terms'),true);
 read(ui,'QQ.applyConfig(state,draftRunConfig())');
 assert.equal(read(ui,'state.config.services.some(s=>s.id===old)'),false);
 assert.equal(read(ui,'JSON.stringify(state.projects.map(p=>[p.serviceId,p.terms]))===terms'),true);
 assert.deepEqual(data(ui,'QQ.restore(QQ.clone(state)).config.services'),data(ui,'state.config.services'));
});

test('Finish later preserves partial custom work, points to Include, and frees the ready offers to simulate',()=>{
 const ui=editor('business');
 read(ui,`var first=draft.services[0];first.name='Photography audit';first.review=2;
  var record='services.'+first.id+'.review';
  draft.assumptionRecords={[record]:{source:'Prior job',sample:'One audit',date:'2026-11-01',value:2}};
  render()`);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/data-action="park-offer"/);
 read(ui,"applyCatalogSelection(['digital-flyer','postcard-250']);render()");
 const id=read(ui,'first.id'),before=data(ui,'draft');let focused=false;
 assert.match(ui.elements['#root'].innerHTML,/data-action="park-offer"/);assert.notEqual(read(ui,'draftError()'),'');
 ui.elements['[data-action="include-offer"][data-id="'+id+'"]']={focus(){focused=true}};
 ui.click('park-offer',{id});assert.ok(focused);
 assert.deepEqual(data(ui,'draft.services.map(s=>s.weight)'),[0,50,50]);
 assert.equal(read(ui,'draft.services[0].name'),'Photography audit');assert.equal(read(ui,'draft.services[0].price'),null);
 assert.equal(read(ui,'draft.assumptionRecords[record].source'),'Prior job');
 assert.equal(read(ui,'draftError()'),'');assert.equal(read(ui,'draftRunConfig().services.length'),2);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/data-action="park-offer"/);
 ui.drainTimers();const reopened=setup([...ui.storage]);
 assert.deepEqual(data(reopened,'draft.services'),data(ui,'draft.services'));
 ui.click('undo-services');assert.deepEqual(data(ui,'draft'),before);
 ui.click('park-offer',{id});ui.click('include-offer',{id});assert.ok(read(ui,'draft.services[0].weight>0'));
 read(ui,"Object.assign(draft.services[0],{deliverable:'Report',price:100,hours:1,print:0,supplierMode:'none'});render()");
 assert.equal(read(ui,'draftError()'),'');assert.doesNotMatch(ui.elements['#root'].innerHTML,/data-action="park-offer"/);
});
