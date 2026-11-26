const test=require('node:test');
const assert=require('node:assert/strict');
const q=require('./engine.js');
const workspace=require('./workspace.js');

function run(overrides={}){
 return q.fresh({...q.clone(q.DEFAULT),months:2,startingCash:50000,acquisition:'preset',inquiries:15,
  ownerHours:30,designerHours:20,overhead:19.99,conversion:.74,designerRate:11.32,repeat:1,realism:false,...overrides});
}
function advance(state,day){while(state.day<day)assert.ok(q.step(state));}
function book(state){return {state,draft:q.clone(state.config),saved:[],checkpointInfo:[],recoveryFiles:[]};}
function verifyBridge(report){
 assert.equal(q.round(report.drivers.reduce((sum,row)=>sum+row.impact,0)),q.round(report.actual.profit-report.estimate.profit));
 const a=report.actual;
 assert.equal(q.round(a.newBooked-a.newBacklog+a.returnRevenue),a.revenue);
 assert.equal(a.newDelivered+a.returnDelivered,a.delivered);
}

test('the estimate and its accounting bridge stay anchored to the starting setup after edits, checkpoints, archives and backups',()=>{
 const s=run(),estimate=q.estimate(s.config);
 assert.equal(q.runEstimateComparison(s),null);
 advance(s,15);
 q.applyConfig(s,{...s.config,designerRate:31,ownerTarget:17,overhead:350,conversion:1});
 advance(s,60);
 const report=q.runEstimateComparison(s),analytics=q.analytics(s);
 assert.equal(report.basis,'launch');assert.equal(report.launchDays,60);
 assert.equal(report.estimate.profit,q.round(estimate.profit));assert.equal(report.estimate.afterOwner,q.round(estimate.surplus));
 assert.notEqual(report.estimate.profit,q.round(q.estimate(s.config).profit));
 assert.equal(report.actual.profit,analytics.profit);assert.equal(report.actual.afterOwner,analytics.periodAfterOwner);
 assert.equal(report.actual.leads,s.history.reduce((total,day)=>total+day.externalArrivals,0));
 assert.equal(report.actual.orders,analytics.won);assert.equal(report.actual.designHours,q.round(s.designHours));
 assert.ok(report.actual.returnDelivered>0);assert.ok(report.actual.newBacklog>0);
 assert.equal(report.changes,1);verifyBridge(report);
 const b=book(s);workspace.checkpoint(b,'manual');const archives=[];workspace.archive(archives,b);
 const restored=workspace.parseText(workspace.serialize(b,archives));
 for(const restoredRun of [restored.state,restored.saved[0],restored.archives[0].workspace.state])assert.deepEqual(q.runEstimateComparison(restoredRun),report);
});

test('a paused first-day launch survives funding and reload, while another explicit day-zero launch replaces its estimate',()=>{
 const s=run({startingCash:0,months:1});
 const first=q.captureRunLaunch(s);
 assert.equal(q.step(s),false);assert.ok(s.blocked);assert.equal(s.day,0);
 const reopened=workspace.parseText(workspace.serialize(book(s))).state;
 assert.deepEqual(q.runLaunchEstimate(reopened),first);
 q.fund(reopened,50000);
 q.applyConfig(reopened,{...reopened.config,overhead:25.25});
 advance(reopened,30);
 assert.equal(q.runEstimateComparison(reopened).estimate.overhead,19.99);
 const relaunched=q.restore(s);
 q.applyConfig(relaunched,{...relaunched.config,overhead:15.56});
 assert.equal(q.captureRunLaunch(relaunched).overhead,15.56);
 q.fund(relaunched,50000);advance(relaunched,30);
 assert.equal(q.runEstimateComparison(relaunched).estimate.overhead,15.56);
});

test('a longer horizon compares original days only, including historical work, costs, receipts and still-undelivered jobs',()=>{
 const s=run({months:1,designers:0});advance(s,30);
 const first=q.runEstimateComparison(s);
 s.config.months=2;
 q.applyConfig(s,{...s.config,designers:6,designerHours:65,ownerHours:60});
 advance(s,60);
 const report=q.runEstimateComparison(s);
 assert.equal(report.days,30);assert.deepEqual(report,first);
 assert.ok(s.revenue>first.actual.revenue);assert.ok(first.actual.awaitingDelivery>0);
 const shortened=run();advance(shortened,9);shortened.config.months=1;advance(shortened,30);
 const result=q.runEstimateComparison(shortened);
 assert.equal(result.basis,'shortened');assert.equal(result.launchDays,60);assert.equal(result.days,30);
 assert.equal(result.estimate,null);assert.deepEqual(result.drivers,[]);
});

test('older workspaces distinguish recovered starting inputs from absent history and missing daily inquiry totals',()=>{
 const s=run({months:1});advance(s,5);const original=q.clone(s.config);
 q.applyConfig(s,{...s.config,overhead:500});advance(s,30);
 delete s.launchEstimate;
 let result=q.runEstimateComparison(q.restore(s));
 assert.equal(result.basis,'reconstructed');assert.equal(result.launchDays,null);
 assert.equal(result.estimate.profit,q.round(q.estimate(original).profit));
 delete s.replayJournal;delete s.demandHistory;
 for(const h of s.history){delete h.externalArrivals;delete h.unservedInquiries;}
 result=q.runEstimateComparison(q.restore(s));
 assert.equal(result.basis,'unavailable');assert.equal(result.estimate,null);
 assert.equal(result.actual.leads,null);assert.equal(result.actual.profit,q.analytics(s).profit);
});

test('the saved launch forecast rejects malformed amounts, mismatched cost breakdowns and invalid horizons',()=>{
 const s=run();advance(s,1);
 for(const [key,value] of [['cost',9999],['profit','100'],['overhead',-1],['days',45],['version',2]]){
  const bad=q.clone(s);bad.launchEstimate[key]=value;
  assert.throws(()=>q.restore(bad),/launch estimate/);
 }
});

test('replaying an extended run preserves its launch period and later forks keep the same original forecast',()=>{
 const source=run({months:1});const original=q.captureRunLaunch(source);
 q.applyConfig(source,{...source.config,overhead:40});advance(source,30);
 source.config.months=2;advance(source,60);
 for(const month of [1,2]){
  const replay=q.startCapacityReplay(source,{month,key:'designerHours',value:28});
  while(q.stepCapacityReplay(replay)){}
  assert.deepEqual(q.runLaunchEstimate(replay.baseline),original);
  const fork=q.runLaunchEstimate(q.restore(replay.alternative));
  assert.equal(fork.days,30);assert.equal(fork.overhead,month===1?40:original.overhead);
 }
});
