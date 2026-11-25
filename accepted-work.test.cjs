const test = require('node:test');
const assert = require('node:assert/strict');
const q = require('./engine.js');
const presets = require('./presets.js');
const catalog = require('./service-catalog.js');

function advance(s,day) {
  while (s.day<day) assert.equal(q.step(s),true);
}
function finish(session) {
  while (session.phase==='running') q.stepAcceptedProjection(session);
  assert.equal(q.stepAcceptedProjection(session),false);
  return q.acceptedProjectionResult(session);
}
function singleOrder({months=1,hours=5,price=100,...settings}={}) {
  const service={...q.DEFAULT.services[0],hours,price,review:0,print:0,weight:100,recurring:true};
  const s=q.fresh({...q.clone(q.DEFAULT),months,startingCash:10000,designers:1,designerHours:5,designerRate:0,
    ownerHours:40,quoteHours:0,deliveryHours:0,approvalDays:0,paymentDays:0,leadDays:14,
    inquiries:0,conversion:1,deposit:0,overhead:0,profileStrength:0,retention:1,services:[service],...settings});
  advance(s,months*30-1);
  q.applyConfig(s,{...s.config,inquiries:30});advance(s,months*30);
  assert.equal(s.projects.length,1);
  assert.equal(s.projects[0].accepted,s.day);
  return s;
}
function restaurantCarry() {
  const source=q.fresh({...presets.newWorkspaceConfig({...q.DEFAULT,services:catalog.starterServices()}),designerHours:6});
  advance(source,30);
  const month=q.startCapacityReplay(source,{month:1,key:'designerHours',value:12,demandId:'lead:10:0'});
  while(month.phase!=='done')q.stepCapacityReplay(month);
  const carry=q.startCapacityCarry(source,month.baseline,month.alternative,month);
  while(carry.phase!=='done')q.stepCapacityCarry(carry);
  return carry;
}

test('both day-90 books run through the last settlement, including the already accepted changed-only campaign',()=>{
  const carry=restaurantCarry(),before=JSON.stringify([carry.baseline,carry.alternative]);
  const session=q.startAcceptedProjection(carry.baseline,carry.alternative);
  assert.equal(session.sourceBaseline,carry.baseline);assert.equal(session.sourceAlternative,carry.alternative);
  assert.throws(()=>q.acceptedProjectionResult(session),/Finish/);
  const result=finish(session);
  assert.deepEqual([result.settled,result.cutoffDay,result.endDay,result.profitDelta],[true,90,142,271.31]);
  const row=s=>[s.openingJobs,s.openingUnpaidInvoices,s.bookedValue,s.openingReceivable,s.cutoffProfit,s.openingCash,
    s.settledDay,s.lastDeliveryDay,s.lastCollectionDay,s.subsequentRevenue,s.collections,s.furtherCosts,s.profit,s.closingCash];
  assert.deepEqual(row(result.baseline),[2,1,975,312.5,465.04,6640.04,142,134,142,975,800,835.79,604.25,6604.25]);
  assert.deepEqual(row(result.alternative),[3,0,1600,0,59.78,6859.78,116,108,116,1600,800,784.22,875.56,6875.56]);
  for(const side of ['baseline','alternative']){
    const original=carry[side],run=session[side],r=result[side];
    assert.equal(run.day,142);assert.deepEqual(run.config,original.config);
    assert.deepEqual([r.openJobs,r.unpaidInvoices,r.ownerHours,r.designers,r.designerRate,r.outreachHours,r.overhead],[0,0,15,1,18,4,180]);
    assert.equal(r.profit,q.round(r.cutoffProfit+r.subsequentRevenue-r.furtherCosts));
    assert.equal(r.closingCash,q.round(r.openingCash+r.collections-r.furtherCosts));
    assert.deepEqual(run.ledger.slice(0,original.ledger.length),original.ledger);
    assert.deepEqual(run.history.slice(0,90),original.history);
    assert.deepEqual(run.events.filter(e=>e.day<=90),original.events);
    assert.deepEqual(run.projects.map(p=>p.demandId),original.projects.map(p=>p.demandId));
    assert.deepEqual(run.projects.filter(p=>p.accepted===undefined),original.projects.filter(p=>p.accepted===undefined));
    assert.deepEqual(run.repeatQueue,original.repeatQueue);
    assert.ok(run.history.slice(90).every(h=>h.externalArrivals===0));
    assert.deepEqual(run.ledger.filter(e=>e.day>90&&e.note==='Monthly software and overhead').map(e=>[e.day,e.amount]),[[91,-180],[121,-180]]);
  }
  const campaign=carry.alternative.projects.find(p=>p.id==='P018');
  assert.equal(campaign.cycle,3);
  assert.ok(!carry.baseline.projects.some(p=>p.demandId===campaign.demandId));
  assert.equal(session.alternative.projects.find(p=>p.demandId===campaign.demandId).stage,'complete');
  assert.equal(JSON.stringify([carry.baseline,carry.alternative]),before);
});

test('a final-month paid-in-full job only earns revenue on delivery; unfinished work and accepted renewals create no extra quotes',()=>{
  const source=singleOrder({deposit:1}),before=JSON.stringify(source);
  assert.equal(source.projects[0].paid,100);assert.equal(source.projects[0].delivered,false);
  const session=q.startAcceptedProjection(source,q.clone(source));
  q.stepAcceptedProjection(session);
  assert.equal(JSON.stringify(source),before);
  const r=finish(session).baseline;
  assert.equal(r.subsequentRevenue,100);assert.equal(r.collections,0);assert.equal(r.lastCollectionDay,null);
  assert.equal(r.openingJobs,1);assert.equal(r.lastDeliveryDay,r.settledDay);
  assert.deepEqual(session.baseline.repeatQueue,[]);assert.equal(session.baseline.projects.length,1);
  const free=singleOrder({hours:5,price:0});
  const freeResult=finish(q.startAcceptedProjection(free,free)).baseline;
  assert.equal(freeResult.lastCollectionDay,null);assert.equal(freeResult.subsequentRevenue,0);
  assert.ok(freeResult.lastDeliveryDay>30);
});

test('only the outstanding cash is collected on delivered invoices, and an empty book stops immediately',()=>{
  const source=singleOrder({hours:0,deposit:.3,paymentDays:5}),session=q.startAcceptedProjection(source,q.clone(source));
  const r=finish(session);
  assert.deepEqual([r.cutoffDay,r.endDay,r.baseline.openingJobs,r.baseline.openingUnpaidInvoices,r.baseline.bookedValue,
    r.baseline.openingReceivable,r.baseline.collections,r.baseline.subsequentRevenue,r.baseline.lastDeliveryDay,
    r.baseline.lastCollectionDay,r.baseline.settledDay],[30,35,0,1,0,70,70,0,null,35,35]);
  assert.equal(session.baseline.repeatQueue.length,0);
  const empty=singleOrder({hours:0,deposit:1});
  assert.equal(empty.repeatQueue.length,1);
  const immediate=q.startAcceptedProjection(empty,empty);
  assert.equal(immediate.phase,'done');
  const end=finish(immediate);
  assert.deepEqual([end.endDay,end.profitDelta,end.baseline.settledDay,end.baseline.furtherCosts],[30,0,30,0]);
  assert.equal(q.step(empty),false);
});

test('zero capacity and a failed funding day stop the common interval without a settlement verdict',()=>{
  const noDesign=singleOrder({designerHours:0}),stopped=finish(q.startAcceptedProjection(noDesign,noDesign));
  assert.equal(stopped.profitDelta,null);assert.equal(stopped.settled,false);assert.equal(stopped.endDay,30);
  assert.equal(stopped.baseline.openJobs,1);assert.equal(stopped.baseline.settledDay,null);
  assert.match(stopped.reason,/P001.*zero designer hours/);
  const noOwner=singleOrder({hours:0,ownerHours:0,deliveryHours:1});
  assert.match(finish(q.startAcceptedProjection(noOwner,noOwner)).reason,/zero available owner hours/);
  const base=singleOrder({hours:0,startingCash:0,paymentDays:1}),changed=q.clone(base);
  q.applyConfig(changed,{...changed.config,overhead:200});
  const session=q.startAcceptedProjection(base,changed),r=finish(session);
  assert.equal(r.endDay,30);assert.equal(session.baseline.day,session.alternative.day);
  assert.equal(r.profitDelta,null);assert.match(r.reason,/Changed schedule needs \$100\.00 in funding.*day 31/);
  assert.equal(r.baseline.blocked,null);assert.equal(r.alternative.blocked.gap,100);
  for(const side of ['baseline','alternative']){
    assert.equal(r[side].unpaidInvoices,1);assert.equal(r[side].collections,0);
    assert.equal(session[side].projects[0].stage,'payment');
    assert.ok(session[side].ledger.every(e=>e.day<=30));
  }
});

test('360-day runs project for up to 360 additional days without extending the live horizon',()=>{
  const slow=singleOrder({months:12,designerHours:.01,hours:100}),before=JSON.stringify(slow);
  const session=q.startAcceptedProjection(slow,slow),r=finish(session);
  assert.equal(session.endDay,720);assert.equal(r.endDay,720);assert.equal(r.cutoffDay,360);
  assert.equal(r.settled,false);assert.equal(r.profitDelta,null);assert.equal(r.baseline.openJobs,1);
  assert.match(r.reason,/360 additional model days/);
  assert.equal(JSON.stringify(slow),before);assert.equal(slow.config.months,12);
  assert.equal(session.baseline.config.months,12);
  assert.ok(session.baseline.projects[0].work.design<slow.projects[0].work.design);
});

test('partial horizons, uneven endpoints and unmatched external workloads are ineligible',()=>{
 const s=singleOrder({hours:0}),partial=q.fresh(s.config);
 assert.throws(()=>q.startAcceptedProjection(partial,s),/same configured horizon/);
 const different=singleOrder({hours:0,seed:s.config.seed+1});
 assert.throws(()=>q.startAcceptedProjection(s,different),/matching incoming demand/);
});
