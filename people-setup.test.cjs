const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const engine=require('./engine.js');
const {setup}=require('./ui-test-host.cjs');

function people(path='restaurant'){
 const ui=setup();
 ui.click('start-'+path);
 ui.click('enter-setup',{mode:'guided'});
 ui.click('setup-step',{step:'2'});
 return ui;
}
function set(ui,key,value){
 ui.handlers.input({target:{dataset:{input:key},id:'input-'+key,type:'number',value:String(value)}});
}
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
function value(ui,label){
 const start='<dt>'+label+'</dt><dd>',html=ui.elements['#root'].innerHTML;
 assert.ok(html.includes(start),label);
 return html.split(start)[1].split('</dd>')[0];
}

test('weekly staffing is visible in an unfinished draft, with a conditional cost at full capacity',()=>{
 const ui=people('business');
 set(ui,'ownerHours',8);
 set(ui,'outreachHours',2.5);
 set(ui,'designers',3);
 set(ui,'designerHours',6);
 set(ui,'designerRate',12);
 assert.equal(value(ui,'Outreach / week'),'2.5 h');
 assert.equal(value(ui,'Available for clients / week'),'5.5 h');
 assert.match(ui.elements['#root'].innerHTML,/<meter class="decision-meter"[^>]*max="8" value="2.5"/);
 assert.equal(value(ui,'Design capacity / week'),'18 h');
 assert.equal(value(ui,'Average design work / week'),'—');
 assert.equal(value(ui,'Design cost if all expected orders ship'),'—');
 assert.match(ui.elements['#root'].innerHTML,/One week at full design capacity would cost<\/span> <strong>\$216/);
 set(ui,'ownerHours',1);
 assert.equal(value(ui,'Outreach / week'),'1 h');
 assert.equal(value(ui,'Available for clients / week'),'0 h');
 set(ui,'designerHours','');
 assert.equal(value(ui,'Design capacity / week'),'—');
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/One week at full design capacity would cost/);
});

test('a larger team increases capacity while the labor estimate follows expected work and pay rate',()=>{
 const ui=people();
 set(ui,'designers',1);
 set(ui,'designerHours',10);
 set(ui,'designerRate',10);
 const labor=read(ui,'getDraftEstimate().hours');
 const expected=read(ui,'effortHours(getDraftEstimate().hours / (getDraftEstimate().workdays / 5))')+' h';
 assert.equal(value(ui,'Design capacity / week'),'10 h');
 assert.equal(value(ui,'Average design work / week'),expected);
 assert.equal(value(ui,'Design cost if all expected orders ship'),read(ui,'offerAmount('+labor+' * 10)'));
 set(ui,'designers',3);
 assert.equal(value(ui,'Design capacity / week'),'30 h');
 assert.equal(value(ui,'Design cost if all expected orders ship'),read(ui,'offerAmount('+labor+' * 10)'));
 set(ui,'designerRate',20);
 assert.equal(value(ui,'Design cost if all expected orders ship'),read(ui,'offerAmount('+labor+' * 20)'));
 set(ui,'designers',0);
 assert.equal(value(ui,'Design capacity / week'),'0 h');
 assert.match(ui.elements['#root'].innerHTML,/Jobs that require design hours must wait for a designer/);
 assert.equal(value(ui,'Design labor charged at zero capacity'),'$0');
 assert.equal(value(ui,'Design cost if all expected orders ship'),read(ui,'offerAmount('+labor+' * 20)'));
 set(ui,'designerRate',0);
 assert.equal(value(ui,'Design cost if all expected orders ship'),'$0');
});

test('fixed inquiry volume reserves the full working week for clients and owner valuation stays economic',()=>{
 const ui=people();
 ui.handlers.change({target:{id:'input-acquisition',dataset:{input:'acquisition'},tagName:'SELECT',type:'select-one',value:'preset'}});
 set(ui,'ownerHours',8);
 set(ui,'outreachHours',6);
 assert.equal(value(ui,'Outreach / week'),'0 h');
 assert.equal(value(ui,'Available for clients / week'),'8 h');
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/<meter class="decision-meter"/);
 const before=read(ui,'getDraftEstimate().profit');
 set(ui,'ownerTarget',25);
 const ownerCost=read(ui,'offerAmount(getDraftEstimate().owner * 25)');
 assert.ok(ui.elements['#root'].innerHTML.includes('Value of owner time for the expected workload</span> <strong>'+ownerCost));
 assert.equal(read(ui,'getDraftEstimate().profit'),before);
 assert.ok(Math.abs(read(ui,'getDraftEstimate().surplus - (getDraftEstimate().profit - getDraftEstimate().owner * 25)'))<.001);
});

test('unpriced services and unfinished cash terms retain known workload and staffing costs',()=>{
 const ui=people();
 const hoursLabels=['Average client work / week','Average design work / week','Design cost if all expected orders ship'];
 const complete=hoursLabels.map(label=>value(ui,label));
 const ownerValue=read(ui,'offerAmount(getDraftEstimate().owner*draft.ownerTarget)');
 read(ui,"Object.assign(draft.services[0],{name:'',price:null});Object.assign(draft,{startingCash:null,paymentDays:null,leadDays:null});render()");
 assert.deepEqual(hoursLabels.map(label=>value(ui,label)),complete);
 assert.ok(ui.elements['#root'].innerHTML.includes('Value of owner time for the expected workload</span> <strong>'+ownerValue));
 set(ui,'designerRate','');
 assert.equal(value(ui,'Design cost if all expected orders ship'),'—');
 assert.deepEqual(hoursLabels.slice(0,2).map(label=>value(ui,label)),complete.slice(0,2));
 set(ui,'ownerTarget','');
 assert.equal(value(ui,'Average client work / week'),complete[0]);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/Value of owner time for the expected workload/);
});

test('capacity and each kind of work use their own inputs after a parked service is skipped',()=>{
 const ui=people();
 const design=value(ui,'Average design work / week'),client=value(ui,'Average client work / week');
 const originalHours=read(ui,'draft.services[0].hours');
 read(ui,`draft.services.unshift({...draft.services[0],id:'parked',name:'',customOffer:true,weight:0,hours:null,review:null});
  draft.services[1].hours=null;render()`);
 assert.equal(value(ui,'Average client work / week'),client);
 assert.equal(value(ui,'Average design work / week'),'—');
 assert.equal(value(ui,'Design cost if all expected orders ship'),'—');
 assert.notEqual(value(ui,'Design capacity / week'),'—');
 read(ui,`draft.services[1].hours=${originalHours};draft.services[1].review=null;render()`);
 assert.equal(value(ui,'Average client work / week'),'—');
 assert.equal(value(ui,'Average design work / week'),design);
 assert.notEqual(value(ui,'Design cost if all expected orders ship'),'—');
 set(ui,'designers',0);
 assert.match(ui.elements['#root'].innerHTML,/Additional design time needed \/ week<\/span> <strong>[\d.]+ h/);
 set(ui,'designers',50);
 assert.match(ui.elements['#root'].innerHTML,/Spare design time \/ week<\/span> <strong>[\d.]+ h/);
});

test('known zero staffing survives other unfinished fields and zero-work offers can still deliver',()=>{
 const ui=people();
 set(ui,'designers',0);set(ui,'designerHours','');set(ui,'designerRate','');
 assert.equal(value(ui,'Design capacity / week'),'0 h');
 assert.equal(value(ui,'Design labor charged at zero capacity'),'$0');
 assert.equal(value(ui,'Design cost if all expected orders ship'),'—');
 set(ui,'designerHours',10);
 read(ui,`Object.assign(draft,{acquisition:'preset',ownerHours:0,quoteHours:0,deliveryHours:0});
  draft.services.forEach(offer=>Object.assign(offer,{hours:0,review:0}));render()`);
 assert.equal(value(ui,'Available for clients / week'),'0 h');
 assert.equal(value(ui,'Design cost if all expected orders ship'),'$0');
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/must wait for a designer|must wait\.<\/p>/);
 set(ui,'quoteHours',.5);
 assert.match(ui.elements['#root'].innerHTML,/Jobs that need your time for a quote, review or handoff must wait/);
});

test('partial workload matches the full forecast for focused and unserved groups at every run length',()=>{
 for(const acquisition of ['sales','preset']){
  for(const months of [1,3,12]){
   const c=Object.assign(engine.clone(engine.DEFAULT),{acquisition,months,customerMix:{food:70,retail:30,services:0},profileStrength:1,focusType:'bakery'});
   delete c.quoteHours;delete c.deliveryHours;
   c.services.forEach((v,i)=>{v.audience=i===0?'food':'services';});
   const full=engine.estimate(c);
   c.services[1].hours=null;c.services[2].review=null;
   c.startingCash=null;
   const {hours,owner,outreach,workdays}=engine.estimateWorkload(c);
   assert.equal(hours,full.hours);
   assert.equal(owner,full.owner);
   assert.equal(outreach,full.outreach);
   assert.equal(workdays,full.workdays);
   c.conversion=null;
   assert.equal(engine.estimateWorkload(c).hours,null);
  }
 }
});
