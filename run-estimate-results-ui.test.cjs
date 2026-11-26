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
