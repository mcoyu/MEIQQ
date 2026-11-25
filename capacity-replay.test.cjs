const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js');

function scenario(overrides={}){
 return q.fresh({...q.clone(q.DEFAULT),months:3,inquiries:12,conversion:1,startingCash:50000,
  designers:1,designerHours:0,ownerHours:75,overhead:200,deposit:.5,realism:false,...overrides});
}
function advance(run,day){while(run.day<day)assert.equal(q.step(run),true);}
function finish(source,settings){
 const session=q.startCapacityReplay(source,settings);
 for(let n=0;n<=360&&session.phase!=='done';n++)q.stepCapacityReplay(session);
 assert.equal(session.phase,'done');
 return {session,result:q.capacityReplayResult(session)};
}

test('a single capacity change replays two matching months, clears the actual job and measures incurred costs',()=>{
 const s=scenario();advance(s,30);
 const target=s.projects.find(p=>p.stage==='design'),before=JSON.stringify(s);
 const {session,result:r}=finish(s,{month:1,key:'designerHours',value:50,demandId:target.demandId});
 assert.equal(JSON.stringify(s),before);
 assert.equal(r.comparable,true,r.reason);
 assert.deepEqual([r.firstDay,r.endDay,r.sourceDay,r.baseline.profit],[1,30,30,-200]);
 assert.equal(r.baseline.backlog,s.projects.filter(p=>p.accepted!==undefined&&!p.delivered).length);
 assert.equal(r.baseline.job.stage,'design');
 assert.equal(r.alternative.job.delivered,true);
 assert.ok(r.delta.backlog<0&&r.delta.delivered>0&&r.delta.profit>0);
 assert.ok(session.alternative.expenses>session.baseline.expenses);
 assert.notEqual(r.delta.profit,r.delta.closingCash);
 assert.notEqual(r.delta.afterOwner,r.delta.profit);
 assert.equal(r.alternative.inquiries,r.baseline.inquiries);
 assert.equal(r.baseline.inquiries,s.history.reduce((n,h)=>n+h.externalArrivals,0));
 assert.deepEqual(q.capacityPairResult(q.restore(session.baseline),q.restore(session.alternative),session),r);
 const reordered=q.clone(session.alternative),settings=reordered.demandHistory[0].settings;
 reordered.demandHistory[0].settings=Object.fromEntries(Object.entries(settings).reverse());
 assert.deepEqual(q.capacityPairResult(session.baseline,reordered,session),r);
});

test('a later month forks from the same opening backlog, dated funding and starting settings',()=>{
 const s=scenario({designerHours:25});advance(s,30);
 q.fund(s,611.35);q.applyConfig(s,{...s.config,designerHours:0,overhead:400});
 const opening=q.clone(s),target=opening.projects.find(p=>p.accepted!==undefined&&!p.delivered);
 advance(s,47);q.fund(s,91);advance(s,60);
 q.applyConfig(s,{...s.config,designerHours:75,ownerTarget:999});q.fund(s,13);
 const a=q.capacityReplaySetup(s,2);assert.equal(a.config.designerHours,0);assert.deepEqual(a.conflicts,[]);
 const session=q.startCapacityReplay(s,{month:2,key:'designerHours',value:35,demandId:target.demandId});
 while(session.phase==='opening')q.stepCapacityReplay(session);
 assert.deepEqual(session.baseline.projects,opening.projects);
 assert.equal(session.alternative.cash,opening.cash);assert.equal(session.alternative.day,30);
 while(session.phase!=='done')q.stepCapacityReplay(session);
 const r=q.capacityReplayResult(session);
 assert.equal(r.comparable,true,r.reason);
 assert.deepEqual([r.firstDay,r.endDay,session.baseline.config.designerHours,session.alternative.config.designerHours],[31,60,0,35]);
 const month=q.monthResult(s,2);assert.equal(r.baseline.profit,month.profit);assert.equal(r.baseline.closingCash,month.closingCash);
 assert.equal(q.monthResult(session.baseline,2).funding,104);
 assert.equal(session.baseline.config.ownerTarget,opening.config.ownerTarget);
 assert.equal(q.monthResult(session.baseline,1).revenue,q.monthResult(session.alternative,1).revenue);
});

test('mid-month settings and manual decisions are reproduced unless they conflict with the experiment',()=>{
 const s=scenario();advance(s,7);
 const target=s.projects.find(p=>p.stage==='design');
 q.intervene(s,target.id,'priority');q.intervene(s,target.id,'deadline',target.due+7);
 q.fund(s,100.01);q.applyConfig(s,{...s.config,ownerHours:50,designerRate:20});
 advance(s,19);
 assert.throws(()=>q.startCapacityReplay(s,{key:'ownerHours',value:90}),/changed during/);
 const {session,result:r}=finish(s,{key:'designerHours',value:20,demandId:target.demandId});
 assert.equal(r.comparable,true,r.reason);assert.equal(r.sourceDay,19);assert.equal(r.endDay,30);
 assert.equal(session.alternative.funding,100.01);assert.equal(session.alternative.config.designerRate,20);
 assert.equal(session.baseline.projects.find(p=>p.demandId===target.demandId).priority,true);
 assert.equal(session.alternative.projects.find(p=>p.demandId===target.demandId).due,target.due);
});

test('changing effective outreach, changing nothing and tampering with either saved arm cannot give a one-change verdict',()=>{
 const s=scenario({acquisition:'sales',ownerHours:3,outreachHours:5});
 assert.throws(()=>q.startCapacityReplay(s,{key:'ownerHours',value:10}),/change outreach/);
 assert.throws(()=>q.startCapacityReplay(s,{key:'designerHours',value:0}),/different/);
 assert.throws(()=>q.startCapacityReplay(s,{key:'seed',value:100}),/one capacity/);
 const {session,result}=finish(s,{key:'designerHours',value:20});
 assert.equal(result.comparable,true,result.reason);
 q.fund(session.alternative,200);
 assert.equal(q.capacityReplayResult(session).comparable,false);
 const other=q.clone(session.baseline);other.config.designerRate++;
 assert.equal(q.capacityPairResult(other,session.alternative,session).delta,null);
});

test('unfunded arms keep their actual stop and never compare against a later completed day',()=>{
 const s=scenario({startingCash:200,deposit:0,designerRate:200});advance(s,30);
 const {result:r}=finish(s,{key:'designerHours',value:40});
 assert.ok(r.alternative.blocked?.gap>0);assert.ok(r.alternative.day<r.baseline.day);
 assert.equal(r.comparable,false);assert.equal(r.delta,null);assert.match(r.reason,/funding/);
 const held=scenario({startingCash:100,overhead:200});assert.equal(q.step(held),false);
 const both=finish(held,{key:'designerHours',value:8}).result;
 assert.deepEqual([both.baseline.day,both.alternative.day,both.baseline.profit,both.delta],[0,0,0,null]);
 held.blocked.note+=' changed';
 assert.throws(()=>finish(held,{key:'designerHours',value:8}),/recorded funding pause/);
});

test('legacy usage requires recoverable setup and verified observed facts; damaged journals are rejected',()=>{
 const s=scenario({inquiries:1});advance(s,5);delete s.replayJournal;
 assert.equal(finish(s,{key:'designerHours',value:10}).result.comparable,true);
 const changed=q.clone(s);changed.events.push({day:3,text:'Business settings updated. Existing quotes retain agreed prices and terms.'});
 assert.throws(()=>q.capacityReplaySetup(changed,1),/complete setup history/);
 const inconsistent=q.clone(s);inconsistent.history[2].cash-=.01;
 assert.throws(()=>finish(inconsistent,{key:'designerHours',value:10}),/did not reproduce/);
 assert.equal(q.step(s),true);assert.ok(s.replayJournal);
 const invalid=scenario();advance(invalid,1);q.applyConfig(invalid,{...invalid.config,designerHours:9});invalid.replayJournal.changes[0].day=2;
 assert.throws(()=>q.validateReplayJournal(invalid),/dates/);
});
