const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,source)=>vm.runInContext(source,ui.ctx);
const html=ui=>ui.elements['#root'].innerHTML;
function openResults(ui,config){
 read(ui,`state=QQ.fresh({...QQ.clone(QQ.DEFAULT),startingCash:100000,...${config}});
  draft=QQ.clone(state.config);view='finances';analyticsTab='overview';render()`);
}
function finish(ui){
 read(ui,'while(QQ.step(state)){}render()');
}

function restaurantRun(ui,options){
 openResults(ui,`{seed:23,months:1,inquiries:11,conversion:1,profileStrength:0,repeat:0,
  customerMix:{food:100,retail:0,services:0},designers:2,designerHours:28,ownerHours:36,
  services:[{...QQServiceCatalog.createService('menu-refresh'),weight:100}],...${options}}`);
 finish(ui);
}

test('a restaurant that booked every expected dollar and is waiting on delivery explains the whole revenue gap',()=>{
 const ui=setup();
 restaurantRun(ui,"{approvalDays:30,inquiries:30,designerHours:60,designers:20,ownerHours:100}");
 const page=html(ui);
 assert.match(page,/Accepted first orders worth \$10,500 were still awaiting delivery/);
 assert.match(page,/Deposits received for undelivered work<\/span> <b>\$5,250</);
 assert.match(page,/The undelivered first orders account for the entire gap in delivery revenue/);
 assert.match(page,/Test approval time/);
 assert.doesNotMatch(page,/Test client price|Test quote acceptance/);
});

test('whole-run Results reconcile prepaid café jobs and show inquiries excluded by the offer mix',()=>{
 const ui=setup();
 restaurantRun(ui,`{months:5,deposit:1,retention:.6,services:[
  {...QQServiceCatalog.createService('bilingual-order-guide'),weight:50},
  {...QQServiceCatalog.createService('counter-screen-loop'),weight:25},
  {...QQServiceCatalog.createService('seasonal-preorder-kit'),weight:25}]}`);
 let notes=html(ui).split('class="run-work-notes">')[1].split('class="run-owner-line"')[0];
 assert.match(notes,/Client payments collected<\/span> <b>\$23,490</);
 assert.match(notes,/Deposits received for undelivered work<\/span> <b>\$480</);
 assert.equal(read(ui,'state.revenue'),23010);
 restaurantRun(ui,"{customerMix:{food:55,retail:25,services:20},paymentDays:2}");
 notes=html(ui).split('class="run-work-notes">')[1].split('class="run-owner-line"')[0];
 assert.match(notes,/Inquiries with no matching offer<\/span> <b>5</);
 assert.match(notes,/Delivered balances to collect<\/span> <b>\$175</);
 assert.doesNotMatch(notes,/First quotes declined by buyers/);
});

test('unquoted inquiries and buyer declines lead to different actions at the recorded close',()=>{
 const ui=setup();
 openResults(ui,"{months:1,acquisition:'preset',inquiries:30,conversion:0,ownerHours:0}");
 finish(ui);
 assert.match(html(ui),/Inquiries still awaiting a first quote<\/span> <b>30</);
 assert.doesNotMatch(html(ui),/First quotes declined by buyers|Test quote acceptance|Test client price/);
 ui.click('test-assumption',{path:'ownerHours'});
 assert.equal(read(ui,'workspaceRoute()'),'setup/rerun/people');
 ui.click('return-rerun-results');
 read(ui,"state.config.months=2;QQ.applyConfig(state,{...state.config,ownerHours:100});while(QQ.step(state)){};render()");
 const atEnd=read(ui,'QQ.runActualsThrough(state,60)');
 assert.ok(atEnd.declinedQuotes>=30);
 const atFirstClose=read(ui,'QQ.runActualsThrough(state,30)');
 assert.equal(atFirstClose.declinedQuotes,0);assert.equal(atFirstClose.awaitingQuote,30);
 read(ui,"state.projects.find(p=>p.stage==='lost').log=[]");
 assert.equal(read(ui,'QQ.runActualsThrough(state,30).awaitingQuote'),null);
 openResults(ui,"{months:1,acquisition:'preset',inquiries:30,conversion:0,ownerHours:100}");
 finish(ui);
 assert.match(html(ui),/First quotes declined by buyers<\/span> <b>30</);
 assert.match(html(ui),/Test quote acceptance/);
 assert.doesNotMatch(html(ui),/Inquiries still awaiting a first quote/);
});

test('the project list retains the cents in an accepted fee',()=>{
 const ui=setup();
 read(ui,`var sample=restaurantConfig();state=QQ.fresh({...sample,months:1,acquisition:'preset',inquiries:30,conversion:1,
  services:[{...sample.services[0],audience:'all',price:325.49,weight:100}]});while(QQ.step(state)){};`);
 ui.click('view',{view:'projects'});
 assert.match(html(ui),/<td>\$325\.49<\/td>/);
});

test('completed results carry the setup estimate, explain the actual gap, and retain the monthly reports',()=>{
 const ui=setup();
 openResults(ui,'{months:2}');
 read(ui,'QQ.step(state);render()');
 assert.doesNotMatch(html(ui),/class="run-comparison"/);
 finish(ui);
 const comparison=read(ui,'QQ.runEstimateComparison(state)');
 const original=read(ui,'setupResultAmount(QQ.runLaunchEstimate(state).profit)');
 const largest=Array.from(comparison.drivers).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact))[0];
 assert.ok(html(ui).includes('data-run-estimate="profit">'+original+'</dd>'));
 assert.equal(comparison.basis,'launch');
 assert.match(html(ui),/What moved the operating result\?/);
 assert.match(html(ui),/<b>Delivered revenue<\/b>/);
 const impact=read(ui,'dollars('+largest.impact+')');
 assert.ok(html(ui).includes('<strong>'+(largest.impact>0?'+':'')+impact+'</strong>'));
 assert.ok(html(ui).includes('<dt>Delivered first orders</dt><dd>'+comparison.actual.newDelivered+'</dd>'));
 assert.ok(html(ui).includes('Design hours estimated '+comparison.estimate.designHours+' · recorded '+comparison.actual.designHours));
 assert.ok(html(ui).includes('Owner hours estimated '+comparison.estimate.ownerHours+' · recorded '+comparison.actual.ownerHours));
 assert.ok(comparison.actual.newBacklog>0);
 assert.ok(html(ui).includes('Accepted first orders worth '+read(ui,'dollars('+comparison.actual.newBacklog+')')+' were still awaiting delivery.'));
 assert.ok(html(ui).indexOf('class="run-comparison"')<html(ui).indexOf('class="panel padded month-summary"'));
 ui.handlers.change({target:{id:'result-month',value:'1',dataset:{}}});
 assert.match(html(ui),/Days 1–60/);
 assert.match(html(ui),/Operating result · Days 1–30/);
 ui.click('analytics-tab',{tab:'contracts'});assert.doesNotMatch(html(ui),/class="run-comparison"/);
});

test('a matched zero-activity run explains that no net difference arose, including owner time',()=>{
 const ui=setup();openResults(ui,"{months:1,acquisition:'preset',inquiries:0,overhead:0}");finish(ui);
 assert.match(html(ui),/id="run-comparison-title" tabindex="-1" aria-describedby="run-comparison-period">On estimate</);
 assert.match(html(ui),/Delivered revenue and costs matched the estimate\./);
 assert.match(html(ui),/\$0 actual against \$0 estimated\./);
 assert.doesNotMatch(html(ui),/class="run-driver-list"/);
 assert.match(html(ui),/class="run-exact"[^<]*[\s\S]*?data-action="test-assumption" data-path="inquiries"/);
});

test('a blocked launch carries overhead and deliveries through the live run, results and reload',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 read(ui,'draft.designerHours=0;render()');ui.click('simulate');
 assert.match(html(ui),/Overhead in the opening plan<\/dt><dd>\$540</);
 assert.doesNotMatch(html(ui),/data-run-estimate="profit"/);
 ui.drainTimers();
 const reopened=setup([...ui.storage]);
 reopened.click('review-latest-results');
 for(const session of [ui,reopened]){
  assert.match(html(session),/id="run-comparison-title"[^>]*>0 jobs delivered</);
  assert.match(html(session),/Overhead incurred<\/dt><dd>\$540</);
  assert.match(html(session),/Simulated operating result<\/dt><dd>-\$540</);
  assert.match(html(session),/Deposits received for undelivered work/);
  assert.match(html(session),/If all expected new orders ship/);
  assert.doesNotMatch(html(session),/below estimate/);
 }
});

test('an extended or shortened run never presents mismatched time windows as an earnings gap',()=>{
 const ui=setup();openResults(ui,"{months:1,acquisition:'preset',inquiries:0,overhead:15}");
 read(ui,'QQ.step(state);QQ.applyConfig(state,{...state.config,months:2,overhead:300})');
 finish(ui);
 assert.match(html(ui),/The run continued to day 60\. This comparison ends at the original horizon\./);
 assert.match(html(ui),/data-run-estimate="profit">-\$15</);
 assert.match(html(ui),/Whole run · days 1–60/);
 openResults(ui,"{months:2,acquisition:'preset',inquiries:0}");
 read(ui,'QQ.step(state);QQ.applyConfig(state,{...state.config,months:1})');finish(ui);
 assert.match(html(ui),/The setup estimate covered 60 days\. This run ended on day 30\./);
 assert.doesNotMatch(html(ui),/data-run-estimate="profit"|What moved the operating result/);
});

test('older workspaces distinguish a reconstruction from a missing launch estimate',()=>{
 const ui=setup();openResults(ui,"{months:1,acquisition:'preset',inquiries:0}");finish(ui);
 read(ui,'delete state.launchEstimate;render()');assert.match(html(ui),/Reconstructed estimate/);
 read(ui,"delete state.replayJournal;state.events.push({day:5,text:'Business settings updated.'});render()");
 assert.match(html(ui),/opening assumptions are unavailable for this saved run/);
 assert.doesNotMatch(html(ui),/data-run-estimate="profit"|Reconstructed estimate/);
 assert.match(html(ui),/data-action="test-assumption" data-path="inquiries"/);
});

test('a completed restaurant run links its explanations to reachable setup fields',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('simulate');ui.drainTimers();
 const original=read(ui,'JSON.stringify(state)');
 const targets=[...html(ui).matchAll(/data-action="test-assumption" data-path="([^"]+)"(?: data-service-id="([^"]+)")?(?: data-results-month="(\d+)")?/g)];
 const paths=targets.map(([,path])=>path);
 for(const expected of ['designerRate','conversion','approvalDays','retention','ownerTarget','deposit','paymentDays','overhead'])assert.ok(paths.includes(expected),expected);
 assert.ok(paths.some(path=>path.endsWith('.print')));
 assert.equal(new Set(targets.map(([,path,,month])=>[path,month].join('/'))).size,paths.length);
 for(const [,path,serviceId,resultsMonth] of targets){
  let focused=false;
  ui.elements['[data-input="'+path+'"]']={focus(){focused=true}};
  ui.click('test-assumption',{path,...(serviceId?{serviceId}:{}),resultsMonth});
  assert.equal(read(ui,'editingRerun'),true,path);
  assert.ok(focused,path+' receives focus');
  assert.ok(html(ui).includes('data-input="'+path+'"'),path+' is editable');
  ui.click('return-rerun-results');
 }
 assert.equal(read(ui,'JSON.stringify(state)'),original);
});

test('monthly cash and cost links follow the selected close and reopen that period after a cash edit',()=>{
 const ui=setup();openResults(ui,'restaurantConfig()');
 read(ui,'QQ.step(state);view="finances";render()');
 assert.doesNotMatch(html(ui),/data-results-month=/);
 finish(ui);
 const report=()=>html(ui).split('class="two-col month-explanation"')[1].split('class="result-details"')[0];
 assert.match(report(),/data-path="deposit" data-results-month="3"/);
 ui.handlers.change({target:{id:'result-month',value:'1',dataset:{}}});
 assert.doesNotMatch(report(),/data-path="deposit"/); // No unfinished-work deposits at this close.
 for(const path of ['designerRate','overhead','paymentDays'])assert.ok(report().includes('data-path="'+path+'" data-results-month="1"'));
 const path='paymentDays';let focused=false;
 ui.elements['[data-input="paymentDays"]']={focus(){focused=true}};
 ui.click('test-assumption',{path,resultsMonth:'1'});
 assert.ok(focused);assert.equal(read(ui,'stepIndex'),3);
 assert.match(html(ui),/data-input="paymentDays"/);
 ui.handlers.input({target:{id:'input-paymentDays',dataset:{input:path},value:'1',type:'number',tagName:'INPUT'}});
 assert.equal(read(ui,'draft.paymentDays'),1);
 ui.click('return-rerun-results');
 assert.equal(read(ui,'rerunDraft.draft.paymentDays'),1);
 assert.equal(read(ui,'resultsMonths.get(state)'),1);
 assert.match(report(),/data-path="paymentDays" data-results-month="1"/);
});

test('a price link uses the original offer and a reachable fulfillment route after service reordering',()=>{
 const ui=setup();
 read(ui,`var base=restaurantConfig(), offer=QQ.clone(base.services.find(s=>s.fulfillment));
   offer.name='Flyer <red>';offer.weight=100;offer.fulfillment.managedShare=0;
   var unused={...QQ.clone(base.services[0]),id:'unused',weight:0,name:'Other service'};
   base.services=[offer,unused];base.months=1;base.startingCash=100000;
   state=QQ.fresh(base);QQ.step(state);
   QQ.applyConfig(state,{...state.config,services:[unused,offer]});
   draft=QQ.clone(state.config);view='finances';analyticsTab='overview'`);
 finish(ui);
 const resultLinks=()=>read(ui,'resultAssumptionLinks(QQ.runEstimateComparison(state))');
 assert.match(resultLinks().revenue,/data-path="services\.0\.fulfillment\.designOnlyPrice"/);
 assert.ok(resultLinks().revenue.includes('data-service-id="'+read(ui,'offer.id')+'"'));
 assert.match(resultLinks().revenue,/Flyer &lt;red&gt;/);
 assert.equal(resultLinks().supplierCost,'');
 read(ui,`rerunDraft={run:state,draft:{...base,services:[{...unused,weight:100}]},path:'conversion'}`);
 assert.equal(resultLinks().revenue,'');
});

test('price and supplier links select the contributing service when the largest service met its estimate',()=>{
 const ui=setup();
 const links=read(ui,`var config=QQ.clone(QQ.DEFAULT);
  var common={...config.services[0],fulfillment:undefined,supplierMode:'print',audience:'all',weight:50};
  config={...config,months:1,acquisition:'preset',inquiries:10,conversion:1,services:[
   {...common,id:'larger',name:'Large account',price:1200,print:450},
   {...common,id:'smaller',name:'Small account',price:100,print:25}
  ]};
  state=QQ.fresh(config);
  var plan=QQ.estimate(config);
  state.projects=plan.services.map((service,index)=>({
   id:'job'+index,serviceId:service.id,accepted:1,deliveredDay:5,orderKind:'new-business',price:service.revenue-index*20
  }));
  state.ledger=plan.services.map((service,index)=>({
   day:4,type:'expense',project:'job'+index,note:'Print order for job'+index,amount:-service.printCost-index*30
  }));
  var printPlan=plan.services.reduce((n,service)=>n+service.printCost,0);
  resultAssumptionLinks({days:30,estimate:{revenue:plan.revenue,supplierCost:printPlan},actual:{revenue:plan.revenue-20,supplierCost:printPlan+30}})`);
 assert.match(links.revenue,/data-path="services\.1\.price" data-service-id="smaller"/);
 assert.match(links.supplierCost,/data-path="services\.1\.print" data-service-id="smaller"/);
});
