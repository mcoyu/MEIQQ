const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,script)=>vm.runInContext(script,ui.ctx);
const page=ui=>ui.elements['#root'].innerHTML;
function editor(mode){
 const ui=setup();
 ui.click('start-business');
 ui.click('enter-setup',{mode});
 return ui;
}

test('both setup styles expose the catalog, three one-click pilots and a direct path to writing the first offer',()=>{
 for(const mode of ['guided','analyst']){
  const ui=editor(mode);
  assert.match(page(ui),/data-action="build-client-menu" id="client-menu-entry" aria-haspopup="dialog"/);
  assert.ok(page(ui).indexOf('data-action="browse-offers"')<page(ui).indexOf('class="first-offer"'));
  for(const id of ['menu-sales-mix','wholesale-line-sheet','service-comparison-sheet']){
   assert.ok(page(ui).includes('data-action="add-featured-offer" data-id="'+id+'"'));
  }
  let nameFocused=false;
  ui.elements['[data-input="services.0.name"]']={focus(){nameFocused=true;}};
  ui.click('write-first-offer');
  assert.equal(nameFocused,true);
  assert.equal(read(ui,'draft.services.length'),1);
  ui.click('add-featured-offer',{id:'menu-sales-mix'});
  assert.equal(read(ui,'draft.services[0].weight'),100);
  assert.equal(read(ui,'draft.services[0].spec.packageId'),'menu-sales-mix');
  assert.equal(read(ui,'draftError()'),'');
  assert.match(page(ui),/data-action="simulate"/);
  assert.ok(!page(ui).includes('class="first-offer"'));
  ui.click('undo-services');
  assert.ok(page(ui).includes('class="first-offer"'));
 }
});

test('production, review, scope and per-job contribution are available in the first expansion and use current inputs',()=>{
 const ui=editor('guided');
 ui.click('add-featured-offer',{id:'wholesale-line-sheet'});
 const before=read(ui,'serviceUnit(draft.services[0]).contribution');
 const mainFields=()=>page(ui).split('<div class="service-fields">')[1].split('data-disclosure="setup-advanced-delivery-')[0];
 for(const key of ['name','price','deliverable','hours','review']){
  assert.match(mainFields(),new RegExp('data-input="services.0.'+key+'"'));
 }
 assert.match(mainFields(),/class="offer-unit-result"/);
 assert.equal(read(ui,"serviceInputBasis(draft.services[0],'price')"),'Example estimate');
 const current=read(ui,'draft.services[0].price');
 const renderPrice=value=>ui.handlers.input({target:{type:'number',value:String(value),id:'input-services-0-price',dataset:{input:'services.0.price'}}});
 renderPrice(current+100);
 assert.equal(read(ui,"serviceInputBasis(draft.services[0],'price')"),'Your estimate');
 assert.equal(read(ui,'serviceUnit(draft.services[0]).contribution'),before+100);
 assert.ok(mainFields().includes(read(ui,'offerAmount(serviceUnit(draft.services[0]).contribution)')));
 assert.equal(read(ui,'state.config.services.some(s=>s.spec?.packageId==="wholesale-line-sheet")'),false);
});

test('an offer saved for later survives a revised run and backup while only included services receive inquiries',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('simulate');ui.drainTimers();
 ui.click('test-assumption',{path:'designerRate'});
 ui.handlers.input({target:{type:'number',value:'31',id:'input-designerRate',dataset:{input:'designerRate'}}});
 read(ui,"appendCatalogService(null);draft.services.at(-1).name='Undecided photography package'");
 ui.click('simulate-again');ui.drainTimers();
 const backup=JSON.parse(read(ui,'JSON.stringify(MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives)))'));
 assert.equal(backup.state.day,90);
 const extra=backup.draft.services.at(-1);
 assert.equal(extra.name,'Undecided photography package');
 assert.equal(extra.weight,0);
 assert.equal(extra.price,null);
 assert.ok(!backup.state.config.services.some(s=>s.id===extra.id));
 assert.ok(!backup.state.projects.some(p=>p.serviceId===extra.id));
});
