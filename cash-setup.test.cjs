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
  let html=update('Object.assign(draft,{leadDays:9,approvalDays:3,printDays:8,paymentDays:2,deposit:.5})');
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
