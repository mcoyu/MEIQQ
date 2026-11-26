const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const q=require('./engine.js');
const {setup}=require('./ui-test-host.cjs');

function singleOffer(changes={}){
 const config=q.clone(q.DEFAULT);
 const offer={...config.services[0],weight:100,hours:2,review:0};
 return {...config,months:1,inquiries:30,conversion:1,quoteHours:0,deliveryHours:0,
  approvalDays:0,repeat:0,profileStrength:0,services:[offer],...changes};
}
function run(config){
 const state=q.fresh(config);
 while(q.step(state)){}
 return state;
}
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
function restaurant(){
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('setup-step',{step:'2'});
 return ui;
}
function edit(ui,key,value){
 ui.handlers.input({target:{id:'input-'+key,dataset:{input:key},tagName:'INPUT',type:'number',value:String(value)}});
}
function summary(ui){return ui.elements['#root'].innerHTML.split('id="draft-summary"')[1].split('</aside>')[0];}
function headline(ui){return summary(ui).split('<details')[0];}

test('setup explains the actual limit in offer details and in the run summary',()=>{
 const ui=restaurant();
 edit(ui,'designerHours',0);ui.click('setup-step',{step:'0'});
 const offerDetails=()=>ui.elements['#root'].innerHTML;
 assert.match(offerDetails(),/Design capacity<\/span><b>No design time is available/);
 assert.doesNotMatch(offerDetails(),/Infinity%/);
 edit(ui,'designerHours',20);edit(ui,'outreachHours',15);
 assert.match(offerDetails(),/Your service capacity<\/span><b>No owner time remains for project work/);
 const config=singleOffer({approvalDays:30,profileStrength:0,ownerHours:100,designers:4,designerHours:40});
 ui.ctx.sampleConfig=config;
 read(ui,'state=QQ.fresh(sampleConfig);draft=QQ.clone(state.config);render()');
 assert.match(headline(ui),/required work and waiting time extend past the end of the run/);
 assert.doesNotMatch(headline(ui),/Operating result/);
});

test('each offer uses the owner hours remaining after outreach as its available capacity',()=>{
 const c=singleOffer({acquisition:'sales',ownerHours:10,outreachHours:5,leadsPerHour:2,quoteHours:1});
 // Half of the owner's 44 hours go to outreach, which generates 44 quotes.
 let e=q.estimate(c);
 assert.equal(e.ownerCapacity,44);assert.equal(e.outreach,22);
 assert.equal(e.services[0].ownerHours,44);
 assert.equal(e.services[0].ownerCapacityShare,2);
 for(const outreach of [10,20]){
  c.outreachHours=outreach;
  assert.equal(q.estimate(c).services[0].ownerCapacityShare,Infinity);
 }
 c.quoteHours=0;assert.equal(q.estimate(c).services[0].ownerCapacityShare,0);
 c.acquisition='preset';c.quoteHours=1;e=q.estimate(c);
 assert.equal(e.outreach,0);assert.equal(e.services[0].ownerCapacityShare,30/44);
});

test('a single job must fit the owner hours and the calendar before the close',()=>{
 const scheduled=singleOffer({ownerHours:1,approvalDays:0});
 const offer=scheduled.services[0];
 Object.assign(offer,{hours:0,review:10,price:100});
 let result=q.deliveryCapacity(scheduled);
 assert.equal(result.status,'blocked');assert.deepEqual(result.ownerTimeOffers,[offer.id]);
 assert.equal(q.metrics(run(scheduled)).delivered,0);
 offer.review=0;scheduled.approvalDays=30;
 result=q.deliveryCapacity(scheduled);
 assert.equal(result.status,'blocked');assert.deepEqual(result.timingOffers,[offer.id]);
 assert.equal(q.metrics(run(scheduled)).delivered,0);
 scheduled.approvalDays=29;
 assert.equal(q.deliveryCapacity(scheduled).status,'fits');assert.equal(q.metrics(run(scheduled)).delivered,1);
 // The owner can quote and deliver on the same day, sharing the available hours.
 scheduled.ownerHours=5;scheduled.quoteHours=1;scheduled.deliveryHours=1;
 scheduled.approvalDays=28;scheduled.printDays=1;offer.print=10;
 assert.notEqual(q.deliveryCapacity(scheduled).status,'blocked');
 assert.equal(q.metrics(run(scheduled)).delivered,1);
 scheduled.printDays=2;
 assert.equal(q.deliveryCapacity(scheduled).status,'blocked');
 assert.equal(q.metrics(run(scheduled)).delivered,0);
 // A buyer allowed to take the files can skip the entire printer wait.
 offer.fulfillment={mode:'customer-choice',managedShare:.5,designOnlyPrice:80};
 assert.notEqual(q.deliveryCapacity(scheduled).status,'blocked');
 offer.fulfillment.managedShare=1;
 assert.equal(q.deliveryCapacity(scheduled).status,'blocked');
});

test('zero design time replaces conditional earnings with deliverable revenue and full-run overhead on input',()=>{
 const ui=restaurant();
 edit(ui,'designerHours',0);
 assert.match(headline(ui),/No new jobs can ship/);
 assert.match(headline(ui),/Revenue from new deliveries<\/span><b>\$0</);
 assert.match(headline(ui),/Scheduled overhead for the full run<\/span><b>\$540</);
 assert.doesNotMatch(headline(ui),/Operating result|After owner time/);
 assert.match(summary(ui),/<details[^>]*>.*If all expected new orders ship/s);
 ui.click('simulate');ui.drainTimers();
 assert.equal(read(ui,'state.day'),90);
 assert.equal(read(ui,'state.revenue'),0);
 assert.equal(read(ui,'state.projects.filter(p=>p.delivered).length'),0);
 assert.equal(read(ui,'state.expenses'),540);
});

test('insufficient opening cash distinguishes scheduled overhead from the first unposted charge',()=>{
 const ui=restaurant();
 edit(ui,'designers',0);edit(ui,'startingCash',20);
 const html=headline(ui);
 assert.match(html,/Scheduled overhead for the full run<\/span><b>\$540</);
 assert.match(html,/A new run pauses before the first overhead charge/);
 assert.match(html,/Funding needed<\/span> <strong>\$160</);
 ui.click('simulate');ui.drainTimers();
 assert.equal(read(ui,'state.day'),0);
 assert.equal(read(ui,'state.expenses'),0);
 assert.equal(read(ui,'state.blocked.gap'),160);
});

test('zero-work and ineligible offers preserve the same delivery possibilities as the daily scheduler',()=>{
 const config=singleOffer({designerHours:0,ownerHours:0,customerMix:{food:100,retail:0,services:0}});
 const design={...config.services[0],id:'design',weight:50,audience:'food'};
 const files={...design,id:'files',name:'Prepared files',hours:0};
 config.services=[design,files];
 const assessment=q.deliveryCapacity(config);
 assert.equal(assessment.status,'partial');
 assert.deepEqual(assessment.blockedOffers,['design']);
 const finished=run(config).projects.filter(p=>p.delivered);
 assert.ok(finished.length>0);
 assert.ok(finished.every(p=>p.serviceId==='files'));
 config.services=[design,{...files,audience:'retail'}];
 assert.equal(q.deliveryCapacity(config).status,'blocked');
 assert.equal(run(config).revenue,0);
 config.services=[{...files,weight:100}];
 assert.equal(q.deliveryCapacity(config).status,'fits');
 assert.ok(run(config).revenue>0);
});

test('each required owner stage can block shipping even with positive designer capacity',()=>{
 const base=singleOffer({ownerHours:0});
 for(const config of [{...base,quoteHours:.5},{...base,deliveryHours:.5},
  {...base,services:[{...base.services[0],review:.5}]}]){
  const result=q.deliveryCapacity(config);
  assert.equal(result.status,'blocked');
  assert.deepEqual(result.blockedBy,{owner:true,design:false});
  assert.equal(run(config).revenue,0);
 }
 const outreach=singleOffer({acquisition:'sales',outreachHours:2,ownerHours:2,quoteHours:.5});
 assert.equal(q.deliveryCapacity(outreach).status,'blocked');
 assert.equal(run(outreach).revenue,0);
});

test('a larger crew cannot shorten a single job below the per-designer horizon',()=>{
 const config=singleOffer({designers:10,designerHours:5,designerRate:0,inquiries:3});
 config.services[0].hours=30;
 const estimate=q.estimate(config),result=q.deliveryCapacity(config,estimate);
 assert.ok(estimate.designCapacity>estimate.hours);
 assert.equal(result.status,'blocked');
 assert.equal(result.blockedBy.design,false);
 assert.deepEqual(result.overlongOffers,['design']);
 assert.equal(result.perJobDesignHours,22);
 const stopped=run(config);
 assert.ok(stopped.projects.some(p=>p.accepted!==undefined));
 assert.equal(stopped.projects.filter(p=>p.delivered).length,0);
 const ui=restaurant();ui.ctx.horizonConfig=config;
 read(ui,'draft=QQ.clone(horizonConfig);render()');
 assert.match(headline(ui),/Maximum design hours for one job in this run<\/span><b>22 h/);
 assert.doesNotMatch(headline(ui),/No design time is available/);

 const small={...config.services[0],id:'small',hours:4,weight:50};
 config.services=[{...config.services[0],weight:50},small];
 assert.equal(q.deliveryCapacity(config).status,'partial');
 assert.ok(run(config).projects.some(p=>p.serviceId==='small'&&p.delivered));
 config.services=[{...small,weight:100,hours:22}];
 config.inquiries=60;config.designers=2;
 assert.deepEqual(q.deliveryCapacity(config).overlongOffers,[]);
 assert.equal(run(config).projects.filter(p=>p.delivered).length,2);
});

test('horizon check allows short buyer jobs, lower complexity and the scheduler tolerance',()=>{
 const config=singleOffer({designerHours:5,profileStrength:1,customerMix:{food:100,retail:0,services:0},clientDemand:{profileId:'restaurant',share:100}});
 config.services[0].hours=23;
 assert.equal(q.deliveryCapacity(config).status,'blocked');
 config.clientDemand.share=0;
 assert.deepEqual(q.deliveryCapacity(config).overlongOffers,[]);
 config.clientDemand.share=100;config.realism=true;
 assert.deepEqual(q.deliveryCapacity(config).overlongOffers,[]);
 config.realism=false;config.services[0].hours=22.000005;
 assert.deepEqual(q.deliveryCapacity(config).overlongOffers,[]);
});

test('partial mixes name blocked offers and positive but insufficient hours show a workload gap',()=>{
 const ui=restaurant();
 ui.ctx.capacityTestConfig=singleOffer({designerHours:0});
 read(ui,`draft=QQ.clone(capacityTestConfig); const primary=draft.services[0];
  primary.weight=50;draft.services.push({...primary,id:'files',name:'Prepared files',weight:50,hours:0});render()`);
 assert.match(headline(ui),/Some offers cannot ship within this run/);
 assert.match(headline(ui),/Offers that cannot ship<\/span><b>Design only<\/b>/);
 assert.doesNotMatch(headline(ui),/Revenue from new deliveries|Operating result/);
 edit(ui,'designerHours',1);
 assert.match(headline(ui),/Expected work exceeds available hours/);
 assert.match(headline(ui),/Additional design hours needed/);
 assert.doesNotMatch(headline(ui),/cannot ship|Operating result/);
 edit(ui,'designerHours',24);
 assert.match(headline(ui),/If all expected new orders ship.*Operating result/s);
 edit(ui,'designerHours','');
 assert.match(summary(ui),/estimate-pending/);
 assert.doesNotMatch(headline(ui),/No new jobs can ship|Revenue from new deliveries/);
 assert.match(headline(ui),/Scheduled overhead for the full run<\/span><b>\$180/);
 edit(ui,'overhead','');
 assert.doesNotMatch(headline(ui),/Scheduled overhead for the full run/);
});

test('a zero acceptance rate or unmatched demand explains zero sales separately from staffing',()=>{
 const ui=restaurant();
 ui.ctx.capacityTestConfig=singleOffer({conversion:0});
 read(ui,'draft=QQ.clone(capacityTestConfig);render()');
 assert.match(headline(ui),/Quote acceptance is set to 0%/);
 read(ui,`draft.conversion=1;draft.services[0].audience='retail';
  draft.customerMix={food:100,retail:0,services:0};render()`);
 assert.match(headline(ui),/Incoming inquiries have no matching offer/);
 edit(ui,'inquiries',0);
 assert.match(headline(ui),/No inquiries are expected from this setup/);
 assert.doesNotMatch(headline(ui),/No design time|No owner time/);
});
