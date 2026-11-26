const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,source)=>vm.runInContext(source,ui.ctx);
const page=ui=>ui.elements['#root'].innerHTML;
function choose(ui,profile){
 ui.click('build-client-menu');ui.click('choose-menu-client',{profile});ui.click('apply-client-menu');
}
function restaurant(){
 const ui=setup();ui.click('start-business');ui.click('enter-setup',{mode:'guided'});
 choose(ui,'restaurant');
 read(ui,"draft.acquisition='preset';draft.inquiries=20;draft.months=3;draft.conversion=.5;render()");
 ui.click('setup-step',{step:'1'});return ui;
}
function input(ui,id,value,commit=false){
 const target={id,value:String(value),dataset:{},type:id.endsWith('range')?'range':'number',tagName:'INPUT'};
 ui.handlers[commit?'change':'input']({target});return target;
}
function metric(ui,key){
 return page(ui).match(new RegExp('data-client-demand-metric="'+key+'">([^<]*)<'))?.[1];
}
test('Demand opens the menu composer in place, follows each edited offer, and preserves the generic starting estimate',()=>{
 const ui=setup();ui.click('start-business');ui.click('enter-setup',{mode:'analyst'});ui.click('setup-step',{step:'1'});
 assert.match(page(ui),/Who do you want to reach/);assert.match(page(ui),/id="demand-menu-entry"/);
 const old=read(ui,'JSON.stringify(state)');
 choose(ui,'restaurant');
 assert.match(page(ui),/Visit between services/);
 assert.equal(read(ui,'stepIndex'),1);
 assert.equal(read(ui,'draft.clientDemand'),undefined);
 assert.equal(read(ui,'JSON.stringify(state)'),old);
 read(ui,"draft.services.find(s=>s.id===draft.clientMenu.serviceIds[0]).name='Seasonal pricing & scope';render()");
 assert.match(page(ui),/Offer from your menu<\/span><strong>Seasonal pricing &amp; scope/);
 assert.equal(metric(ui,'targeted'),'0');
});

test('slider, exact entry and observed counts yield the same live horizon estimate and save only the applied share',()=>{
 const ui=restaurant();
 input(ui,'client-demand-range',40);
 assert.deepEqual(['targeted','other','matched','orders'].map(key=>metric(ui,key)),['24','36','24','12']);
 assert.equal(metric(ui,'result'),read(ui,'setupResultAmount(QQ.estimate(draftRunConfig()).profit)'));
 assert.equal(metric(ui,'delta'),read(ui,'clientMenuDifference(QQ.round(QQ.estimate(draftRunConfig()).profit)-QQ.round(QQ.estimate({...draftRunConfig(),clientDemand:undefined}).profit))'));
 input(ui,'client-demand-share','');
 assert.equal(metric(ui,'targeted'),'24');assert.equal(read(ui,'draft.clientDemand.share'),40);
 const invalid=input(ui,'client-demand-share','101',true);assert.equal(invalid.value,'40');
 input(ui,'client-demand-share','0',true);assert.equal(metric(ui,'other'),'60');
 input(ui,'client-demand-count-target','6');input(ui,'client-demand-count-total','20');
 assert.equal(read(ui,'draft.clientDemand.share'),0);
 ui.click('apply-client-demand-counts');
 assert.equal(read(ui,'draft.clientDemand.share'),30);assert.equal(metric(ui,'targeted'),'18');
 assert.match(page(ui),/Applied 30%/);
 input(ui,'client-demand-count-target','21');ui.click('apply-client-demand-counts');
 assert.match(page(ui),/Client inquiries cannot exceed total inquiries/);assert.equal(metric(ui,'targeted'),'18');
 input(ui,'client-demand-count-target','1');input(ui,'client-demand-count-total','0');ui.click('apply-client-demand-counts');
 assert.match(page(ui),/Enter a total of at least one inquiry/);
 input(ui,'client-demand-count-total','3');ui.click('apply-client-demand-counts');assert.equal(read(ui,'draft.clientDemand.share'),33);
 ui.drainTimers();const restored=setup([...ui.storage]);
 assert.equal(read(restored,'draft.clientDemand.share'),33);assert.equal(read(restored,"demandCalculation('restaurant').target"),'');
});

test('changing the Offers menu leaves the selected stream in place until it is explicitly moved or reset',()=>{
 const ui=restaurant();input(ui,'client-demand-range',65);
 choose(ui,'wholesale');
 assert.match(page(ui),/id="demand-audience-title">Independent restaurant/);
 assert.match(page(ui),/data-action="switch-client-demand"/);assert.equal(read(ui,'draft.clientDemand.profileId'),'restaurant');
 ui.click('switch-client-demand');
 assert.equal(read(ui,'draft.clientDemand.profileId'),'wholesale');assert.equal(read(ui,'draft.clientDemand.share'),65);
 assert.doesNotMatch(page(ui),/data-action="switch-client-demand"/);
 assert.equal(metric(ui,'targeted'),'39');
 ui.click('clear-client-demand');assert.equal(read(ui,'draft.clientDemand'),undefined);assert.equal(metric(ui,'other'),'60');
});

test('a restored blank or invalid client share stays visible and can be repaired with exactly zero',()=>{
 for(const savedShare of [null,101]){
  const ui=restaurant();
  read(ui,`draft.clientDemand={profileId:'restaurant',share:${savedShare}};save()`);
  const reopened=setup([...ui.storage]);reopened.click('view',{view:'setup'});reopened.click('setup-step',{step:'1'});
  const field=page(reopened).match(/<input[^>]+id="client-demand-share"[^>]+>/)[0];
  assert.match(field,new RegExp('value="'+(savedShare??'')+'"'));assert.match(field,/aria-invalid="true"/);
  assert.equal(metric(reopened,'targeted'),'—');
  input(reopened,'client-demand-share','-10',true);
  assert.match(reopened.elements['#client-demand-error'].textContent,/Enter a whole percentage/);
  input(reopened,'client-demand-share',0,true);
  assert.equal(read(reopened,'draft.clientDemand.share'),0);assert.equal(read(reopened,'draftError()'),'');
  assert.equal(metric(reopened,'targeted'),'0');assert.equal(metric(reopened,'other'),'60');
  ui.drainTimers();reopened.drainTimers();
  assert.equal(read(setup([...reopened.storage]),'draft.clientDemand.share'),0);
 }
});

test('a rerun without menu metadata can still tune a known client and reports missing volume separately from a known zero',()=>{
 const ui=restaurant();input(ui,'client-demand-share',50);
 read(ui,"delete draft.clientMenu; draft.inquiries=null;draft.customerMix=undefined;render()");
 assert.match(page(ui),/Your target client/);assert.match(page(ui),/Other inquiries use generic customers/);
 assert.equal(metric(ui,'targeted'),'—');assert.equal(metric(ui,'other'),'—');
 assert.match(page(ui),/Ways to reach this client/);assert.doesNotMatch(page(ui),/class="reach-offer"/);
 read(ui,"draft.inquiries=0;render()");assert.equal(metric(ui,'targeted'),'0');assert.equal(metric(ui,'orders'),'0');
 read(ui,"draft.inquiries=10;draft.services[0].price=null;draft.conversion=null;render()");
 assert.equal(metric(ui,'targeted'),'15');assert.equal(metric(ui,'matched'),'15');assert.equal(metric(ui,'orders'),'—');assert.equal(metric(ui,'result'),'—');
 ui.click('clear-client-demand');assert.match(page(ui),/Who do you want to reach/);
});

test('recording the client share preserves its identity and changing that share retires the old source',()=>{
 const ui=restaurant();input(ui,'client-demand-share',35);
 ui.click('input-evidence',{group:'demand'});
 ui.handlers.change({target:{id:'record-field',dataset:{},value:'clientDemand.share'}});
 assert.match(ui.elements['#modal'].innerHTML,/Independent restaurant · Target client inquiry share/);
 assert.match(ui.elements['#modal'].innerHTML,/35%/);
 read(ui,"$('#record-date').value='2026-10-01';$('#record-source').value='September outreach log';$('#record-sample').value='7 of 20 inquiries'");
 ui.click('save-input-evidence');
 assert.equal(read(ui,"draft.assumptionRecords['clientDemand.share'].profileId"),'restaurant');
 assert.equal(read(ui,"formatEvidenceValue('clientDemand.share',35)"),'35%');
 input(ui,'client-demand-range',36);
 assert.equal(read(ui,"draft.assumptionRecords?.['clientDemand.share']"),undefined);
});

test('the live driver explains the zero-share counterfactual for matching, financial changes and equal results',()=>{
 const ui=restaurant();input(ui,'client-demand-share',30);
 read(ui,"draft.services.forEach(s=>s.audience='food');draft.customerMix={food:50,retail:50,services:0};render()");
 assert.match(page(ui),/matching inquiries change from 30 to 39/);
 read(ui,"draft.services.forEach(s=>s.audience='all');draft.profileStrength=1;render()");
 assert.match(page(ui),/the largest change is in<\/span> <strong>Designer labor/);
 read(ui,"draft.profileStrength=0;render()");
 assert.match(page(ui),/total matching inquiries and operating result stay the same/);
});
