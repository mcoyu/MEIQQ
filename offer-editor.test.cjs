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

test('per-job prices and print routes stay usable with an unfinished business scenario',()=>{
 const ui=editor('guided');
 read(ui,'draft.months=null;draft.designerHours=null;draft.designerRate=20;render()');
 ui.click('catalog-package',{id:'postcard-250'});
 assert.doesNotMatch(ui.elements['#modal'].innerHTML,/0 projects\/week maximum/);
 ui.elements['#catalog-price']={value:'325'};
 ui.click('confirm-catalog-service');
 const index=read(ui,"draft.services.findIndex(service=>service.spec?.packageId==='postcard-250')");
 assert.match(page(ui),/\$325 price · \$190 direct cost/);
 assert.match(page(ui),/\$90 direct cost/);
 ui.click('price-experiment',{index:String(index)});
 assert.match(ui.elements['#modal'].innerHTML,/Experiment with Promo postcards/);
 ui.click('use-service-price',{index:String(index),price:'425',route:'offered'});
 assert.equal(read(ui,`draft.services[${index}].price`),425);
 assert.equal(read(ui,'draft.months'),null);
 assert.equal(read(ui,'draft.designerHours'),null);
 assert.doesNotMatch(page(ui),/NaN|Infinity/);

 // A partially restored target can be invalid while this offer has a known price and cost.
 read(ui,"draft.clientDemand={profileId:'unknown',share:50};render()");
 assert.match(page(ui),/\$425 price · \$190 direct cost/);
 read(ui,'draft.designerRate=null;render()');
 assert.match(page(ui),/\$425 price · — direct cost/);
});

test('restaurant menu and package prices agree with the work delivered and the payments posted for each print choice',()=>{
 const QQ=require('./engine.js');
 for(const share of [0,.5,1]){
  const ui=editor('guided');
  ui.click('build-client-menu');ui.click('choose-menu-client',{profile:'restaurant'});ui.click('apply-client-menu');
  const id=read(ui,'draft.services.find(s=>s.spec?.packageId==="table-tents-100").id');
  const index=read(ui,`draft.services.findIndex(s=>s.id===${JSON.stringify(id)})`);
  const path='services.'+index+'.fulfillment.managedShare';
  ui.handlers.input({target:{type:'number',value:String(share*100),id:'input-'+path.replaceAll('.','-'),dataset:{input:path,percent:'1'}}});
  assert.equal(read(ui,`draft.services[${index}].fulfillment.managedShare`),share);
  const heading=page(ui).split('id="offer-edit-'+id+'"')[1].split('</summary>')[0];
  const fileScope=read(ui,`draft.services[${index}].filesOnlyScope`);
  const managedScope=read(ui,`draft.services[${index}].deliverable`);
  assert.ok(heading.includes(share===0?fileScope:managedScope));
  ui.click('browse-offers');
  const card=ui.elements['#modal'].innerHTML.split('id="choose-saved-'+id+'"')[1].split('</article>')[0];
  const pickerRate=card.split('class="offer-pick-rate">')[1].split('</div>')[0];
  assert.ok(card.includes(share===0?'Supplier allowance</span> · $0':'Supplier allowance per managed batch'));
  if(share===.5)assert.ok(card.includes('<dt>Files-only deliverable</dt><dd>'+fileScope));
  assert.equal(read(ui,`offerDeliveryScope(draft.services[${index}],'design-only')`),fileScope);
  assert.equal(read(ui,`offerDeliveryScope(draft.services[${index}],'agency-managed')`),managedScope);
  ui.click('close');ui.click('build-client-menu');
  const menuSlot=ui.elements['#modal'].innerHTML.split('class="cm-slot"')[3].split('</article>')[0];
  for(const html of [heading,pickerRate,menuSlot]){
   assert.equal(html.includes('$395'),share>0);
   assert.equal(html.includes('$275'),share<1);
  }
  const service=JSON.parse(read(ui,`JSON.stringify(draft.services[${index}])`));
  const config={...QQ.clone(QQ.DEFAULT),months:2,inquiries:30,ownerHours:120,designers:5,designerHours:60,profileStrength:0,
   conversion:1,customerMix:{food:100,retail:0,services:0},overhead:0,deposit:.3,paymentDays:9,services:[{...service,weight:100}]};
  const run=QQ.fresh(config);
  while(QQ.step(run)){}
  assert.equal(run.day,60);
  const paidJobs=run.projects.filter(p=>p.stage==='complete');
  assert.ok(paidJobs.length>0);
  const routes=new Set();
  for(const p of paidJobs){
   routes.add(p.terms.fulfillment.mode);
   const managed=p.terms.fulfillment.mode==='agency-managed';
   const fee=managed?395:275;
   const postings=run.ledger.filter(e=>e.project===p.id);
   assert.equal(p.price,fee);
   assert.equal(p.printCost,managed?service.print:0);
   assert.deepEqual(postings.filter(e=>e.type==='receipt').map(e=>e.amount),[fee*.3,fee*.7]);
   assert.equal(postings.at(-1).day,p.deliveredDay+9);
   assert.equal(p.paid,fee);
  }
  assert.equal(routes.has('agency-managed'),share>0);
  assert.equal(routes.has('design-only'),share<1);
 }
});

test('the monthly campaign picker describes why a late-paying restaurant can receive its next quote after day 30',()=>{
 const ui=editor('guided');
 ui.click('browse-offers');
 const card=ui.elements['#modal'].innerHTML.split('id="choose-new-monthly-promo-5"')[1].split('</article>')[0];
 assert.match(card,/Up to 12 separately quoted cycles over 365 days, planned 30 days apart/);
 assert.match(card,/Accepted work must be delivered and paid before the next quote/);
 const QQ=require('./engine.js'),catalog=require('./service-catalog.js');
 const config={...QQ.clone(QQ.DEFAULT),months:3,paymentDays:45,retention:1,conversion:1,ownerHours:120,designerHours:60,
  designers:5,inquiries:3,services:[{...catalog.createService('monthly-promo-5'),weight:100}],profileStrength:0};
 const run=QQ.fresh(config);while(QQ.step(run)){}
 const next=run.projects.find(p=>p.cycle===2);
 assert.ok(next);
 const first=run.projects.find(p=>p.contractId===next.contractId&&p.cycle===1);
 const finalPayment=run.ledger.find(e=>e.project===first.id&&e.note==='Final payment');
 assert.ok(next.created>=finalPayment.day+1);
 assert.ok(next.created>first.accepted+30);
});

test('the package picker distinguishes missing work estimates from zero and preserves small positive hours',()=>{
 const ui=editor('guided');
 ui.click('add-featured-offer',{id:'menu-sales-mix'});
 read(ui,'draft.services[0].hours=null;draft.services[0].review=.04');
 ui.click('browse-offers');
 const id=read(ui,'draft.services[0].id');
 const card=ui.elements['#modal'].innerHTML.split('id="choose-saved-'+id+'"')[1].split('</article>')[0];
 assert.match(card,/Production hours<\/span> · —/);
 assert.match(card,/Owner review hours<\/span> · 0\.04 h/);
 ui.click('close');read(ui,'draft.services[0].hours=0');ui.click('browse-offers');
 const updated=ui.elements['#modal'].innerHTML.split('id="choose-saved-'+id+'"')[1].split('</article>')[0];
 assert.match(updated,/Production hours<\/span> · 0 h/);
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
