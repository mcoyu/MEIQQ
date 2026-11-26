const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

function cashPage(){
  const ui=setup();
  ui.click('enter-setup',{mode:'guided'});
  ui.click('setup-step',{step:'3'});
  const update=expression=>vm.runInContext(expression+';cashInputs()',ui.ctx);
  return {update};
}

test('a restaurant deposit on a half cent matches the receipt and the balance collected at delivery',()=>{
 const ui=setup();
 const page=vm.runInContext(`draft={...QQ.clone(QQ.DEFAULT),months:1,deposit:.5,paymentDays:0,
   ownerHours:60,designerHours:60,conversion:1,profileStrength:0,customerMix:{food:100,retail:0,services:0},
   services:[{...QQServiceCatalog.createService('menu-refresh'),price:2.55,weight:100}]};cashInputs()`,ui.ctx);
 assert.match(page,/<dt>At acceptance<\/dt><dd>\$1\.28</);
 assert.match(page,/<dt>Due on delivery<\/dt><dd>\$1\.27</);
 const postings=vm.runInContext(`state=QQ.fresh(draft);while(QQ.step(state)){}
   const completed=state.projects.find(job=>job.stage==='complete');
   state.ledger.filter(entry=>entry.project===completed.id&&entry.type==='receipt').map(entry=>entry.amount)`,ui.ctx);
 assert.deepEqual(Array.from(postings),[1.28,1.27]);
});

test('a fractional-cent source quote uses the agreed cents for the balance and the collection date',()=>{
 const {update}=cashPage();
 const html=update(`const item={...QQ.DEFAULT.services[0],weight:100,price:10.0149,print:.004};
   draft.services=[item];draft.deposit=.9995;draft.paymentDays=5;draft.leadDays=14`);
 assert.match(html,/<dt>At acceptance<\/dt><dd>\$10</);
 assert.match(html,/<dt>Due 5 days after delivery<\/dt><dd>\$0\.01</);
 assert.match(html,/any balance is due 19 days after acceptance/);
 assert.doesNotMatch(html,/No balance remains after acceptance|Printed work window/);
});

test('cash reserves use the first payable charge and full run length even with an unfinished offer',()=>{
  const {update}=cashPage();
  let html=update('Object.assign(draft,{startingCash:42.10,overhead:12.09,months:2})');
  assert.match(html,/<dt>Cash after the first charge<\/dt><dd>\$30.01</);
  assert.match(html,/<dt>Overhead over the run<\/dt><dd>\$24.18</);
  html=update('draft.overhead=60');
  assert.match(html,/<dt>Needed for the first charge<\/dt><dd>\$17.90</);
  assert.match(html,/pauses on day 1/);
  html=update('draft.startingCash=null;draft.months=null');
  assert.match(html,/<dt>Cash after the first charge<\/dt><dd>—</);
  assert.match(html,/<dt>Overhead over the run<\/dt><dd>—</);
  html=update('draft.startingCash=0;draft.overhead=0;draft.months=3');
  assert.match(html,/<dt>Cash after the first charge<\/dt><dd>\$0</);
  assert.doesNotMatch(html,/pauses on day 1/);
});

test('payment examples use an eligible route, preserve receipt rounding and distinguish missing from zero',()=>{
  const {update}=cashPage();
  let html=update(`var offer=QQ.clone(state.config.services.find(service=>service.fulfillment));
    Object.assign(offer,{name:'Press <A>',weight:100,price:101.01});
    Object.assign(offer.fulfillment,{managedShare:.8,designOnlyPrice:71.51});
    draft.services=[{...offer,id:'inactive',name:'Unused',weight:0},offer];
    draft.deposit=.25;draft.paymentDays=5`);
  assert.match(html,/Press &lt;A&gt;.*Managed printing.*\$101\.01/);
  assert.match(html,/<dt>At acceptance<\/dt><dd>\$25.25</);
  assert.match(html,/<dt>Due 5 days after delivery<\/dt><dd>\$75.76</);
  assert.match(html,/<meter[^>]*value="25"/);
  html=update('offer.fulfillment.managedShare=0');
  assert.match(html,/Files only.*\$71\.51/);
  assert.match(html,/<dt>At acceptance<\/dt><dd>\$17.88</);
  assert.match(html,/<dt>Due 5 days after delivery<\/dt><dd>\$53.63</);
  html=update('draft.deposit=0;draft.paymentDays=0');
  assert.match(html,/<meter[^>]*value="0"/);
  assert.match(html,/<dt>Due on delivery<\/dt><dd>\$71.51</);
  html=update('draft.deposit=1;draft.leadDays=null');
  assert.match(html,/<meter[^>]*value="100"/);
  assert.match(html,/<dt>Final balance<\/dt><dd>\$0</);
  assert.match(html,/No balance remains after acceptance\./);
  html=update('draft.deposit=null');
  assert.doesNotMatch(html,/<meter/);
  assert.match(html,/<dt>At acceptance<\/dt><dd>—</);
  html=update('offer.price=null;draft.deposit=.25');
  assert.match(html,/Add an offer price to see the payment amounts/);
  assert.match(html,/<dt>At acceptance<\/dt><dd>25%</);
});

test('base work windows distinguish supplier delays, contractual deadlines and unknown waits',()=>{
  const {update}=cashPage();
  let html=update('draft.services=[{...QQ.clone(state.config.services.find(s=>s.fulfillment)),weight:100}];Object.assign(draft,{leadDays:9,approvalDays:3,printDays:8,paymentDays:2,deposit:.5})');
  assert.match(html,/<dt>Files-only work window<\/dt><dd>6 days</);
  assert.match(html,/<dt>Printed work window<\/dt><dd>2 days short</);
  assert.match(html,/If delivered on the target date, any balance is due 11 days after acceptance/);
  html=update('draft.printDays=null');
  assert.match(html,/<dt>Files-only work window<\/dt><dd>6 days</);
  assert.match(html,/<dt>Printed work window<\/dt><dd>—</);
  html=update('draft.approvalDays=3.5');
  assert.match(html,/<dt>Files-only work window<\/dt><dd>—</);
  html=update('delete draft.leadDays;draft.approvalDays=0');
  assert.match(html,/<dt>Files-only work window<\/dt><dd>14 days</);
});

test('the cash example follows reachable buyers and displays both available payment routes',()=>{
 const {update}=cashPage();
 let html=update(`var print=QQ.clone(state.config.services.find(s=>s.fulfillment));
  Object.assign(print,{id:'food',name:'Lunch menus',weight:40,audience:'food',price:100.01});
  Object.assign(print.fulfillment,{managedShare:.01,designOnlyPrice:60.01});
  draft.customerMix={food:100,retail:0,services:0};
  draft.services=[{...print,id:'retail',name:'Retail-only package',weight:60,audience:'retail'},print];
  draft.deposit=.5;draft.paymentDays=3`);
 assert.doesNotMatch(html,/Retail-only package/);
 assert.match(html,/Managed printing[\s\S]*?At acceptance<\/dt><dd>\$50\.01<\/dd>[\s\S]*?Due 3 days after delivery<\/dt><dd>\$50</);
 assert.match(html,/Files only[\s\S]*?At acceptance<\/dt><dd>\$30\.01<\/dd>[\s\S]*?Due 3 days after delivery<\/dt><dd>\$30</);
 html=update('print.fulfillment.managedShare=0');
 assert.doesNotMatch(html,/Printed work window|Managed printing/);
 html=update('print.fulfillment.managedShare=1');
 assert.doesNotMatch(html,/Files-only work window|Files only/);
 html=update("draft.customerMix={food:0,retail:0,services:100}");
 assert.match(html,/No active offer matches these buyers/);
 assert.doesNotMatch(html,/One accepted quote|work window/);
});
