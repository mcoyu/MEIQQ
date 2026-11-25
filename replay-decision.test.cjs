const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const q=require('./engine');
const presets=require('./presets');
const catalog=require('./service-catalog');
const report=require('./comparison-report');
const {setup}=require('./ui-test-host.cjs');

const restaurant=overrides=>q.fresh({...presets.newWorkspaceConfig({...q.DEFAULT,services:catalog.starterServices()}),...overrides});
const advance=(s,to)=>{while(s.day<to)assert.ok(q.step(s));};
function replay(s,month,key,value){
 const session=q.startCapacityReplay(s,{month,key,value});
 while(session.phase!=='done')q.stepCapacityReplay(session);
 return session;
}
function carry(s,pair){
 const session=q.startCapacityCarry(s,pair.baseline,pair.alternative,pair);
 while(session.phase!=='done')q.stepCapacityCarry(session);
 return session;
}
const cents=n=>Math.round(n*100);
function checkCash(r){
 const c=r.decision.cash;
 assert.equal(cents(c.closing),cents(c.opening)+cents(c.receipts)+cents(c.funding)-cents(c.spending));
 assert.equal(cents(c.closing),cents(c.opening)+cents(r.delta.profit)+cents(c.deposits)+cents(c.receivables)+cents(c.funding));
 for(const [which,run] of [['baseline',r.baseline],['alternative',r.alternative]]){
  const arm=c[which];
  assert.equal(cents(arm.closingCash),cents(arm.openingCash)+cents(arm.receipts)+cents(arm.funding)-cents(run.cost));
  assert.ok(arm.lowest.day>=r.firstDay&&arm.lowest.day<=r.endDay);
 }
}

test('the day-90 decision reconciles cash, first daily lows, incremental work and booked cycles',()=>{
 const s=restaurant({designerHours:6});advance(s,30);
 const pair=replay(s,1,'designerHours',12),session=carry(s,pair),r=q.capacityCarryResult(session);
 checkCash(r);
 const {cash,capacity,backlog}=r.decision;
 assert.deepEqual([r.delta.profit,cash.closing,cash.receipts,cash.deposits,cash.receivables],[-405.26,219.74,625,312.5,312.5]);
 assert.deepEqual([cash.baseline.lowest,cash.alternative.lowest],[{day:76,cash:5727.07},{day:31,cash:5639.35}]);
 assert.deepEqual([capacity.baselineAvailable,capacity.alternativeAvailable,capacity.availableDifference,capacity.workedDifference],[78,156,78,22.52]);
 assert.deepEqual([backlog.originalValue,backlog.changedValue,backlog.groups.shared.length],[975,1600,2]);
 assert.deepEqual(backlog.groups.additional.map(v=>[v.demandId,v.originalId,v.changedId,v.price]),[['K_lead_9_0:cycle:3',null,'P018',625]]);
 const text=report.decisionDetails(r);
 for(const value of ['Why did cash change?','−$405.26 operating profit','+$312.50 less owed by clients','+$219.74','$5,727.07 · day 76','2 open in both','1 newly accepted','+78 h available','+22.52 h worked'])assert.ok(text.includes(value),value);
 const saved=q.capacityCarryPairResult(q.restore(session.baseline),q.restore(session.alternative),session);
 assert.equal(report.decisionDetails(saved),text);
});

test('a completed final month uses opening positions, shows a neutral mixed verdict and exports the same decision lines',()=>{
 const s=restaurant({designerHours:24});advance(s,90);
 const pair=replay(s,3,'designerHours',6),r=q.capacityReplayResult(pair),c=r.decision.cash;
 const descriptor={...pair,after:pair.value};
 checkCash(r);
 assert.deepEqual([r.firstDay,r.endDay,c.baseline.openingReceivable,c.baseline.openingCash],[61,90,937.5,5907.08]);
 assert.deepEqual([r.delta.profit,c.closing,r.decision.backlog.groups.delayed.length],[-609.78,640.22,2]);
 const ui=setup();ui.ctx.result=r;ui.ctx.descriptor=descriptor;
 const screen=vm.runInContext('replayOutcome(result,descriptor)',ui.ctx);
 const html=report.create(pair.alternative,pair.baseline,{replay:descriptor}).html;
 const explanation=report.decisionDetails(r);
 assert.ok(screen.includes(explanation));assert.ok(html.includes(explanation));
 assert.match(screen,/replay-outcome mixed/);
 for(const output of [screen,html]){assert.match(output,/What changed the cost\?/);assert.match(output,/640\.22/);}
 assert.equal(r.costAttribution.firstDay,61);
});

test('one-month comparisons track real weekday availability, zero design rates, actual funding and owner hours',()=>{
 const s=restaurant({months:1,designerHours:6,designerRate:0});advance(s,7);
 q.applyConfig(s,{...s.config,designers:2});
 q.fund(s,98.76);advance(s,30);
 const pair=replay(s,1,'designerHours',12),r=q.capacityReplayResult(pair);
 checkCash(r);
 assert.deepEqual([r.decision.cash.baseline.funding,r.decision.cash.alternative.funding],[98.76,98.76]);
 assert.equal(r.decision.capacity.availableDifference,(22*2-5)*6/5);
 assert.equal(r.costAttribution.delta.designLabor,0);assert.ok(r.costAttribution.alternative.designHours>0);
 const owner=q.capacityReplayResult(replay(s,1,'ownerHours',25));
 assert.equal(owner.decision.capacity.owner,true);assert.equal(owner.decision.capacity.baselineWorked,q.round(s.ownerHours));
 const unequal=q.capacityPairResult(pair.baseline,q.fresh(pair.alternative.config),pair);
 assert.equal(unequal.comparable,false);assert.equal(unequal.decision,null);assert.equal(unequal.costAttribution,null);
 assert.equal(report.decisionDetails(unequal),'');
});
