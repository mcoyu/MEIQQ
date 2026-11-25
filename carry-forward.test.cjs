const test=require('node:test');
const assert=require('node:assert/strict');
const q=require('./engine.js');

function studio(overrides={}){
 return q.fresh({...q.clone(q.DEFAULT),months:3,acquisition:'preset',inquiries:6,conversion:1,designers:1,
  designerHours:0,designerRate:10,ownerHours:120,overhead:100,startingCash:10000,deposit:.5,realism:false,
  repeat:0,approvalDays:0,paymentDays:0,quoteHours:0,deliveryHours:0,
  services:[{...q.DEFAULT.services[0],weight:100,hours:6,print:0,review:0,price:400,recurring:false}],...overrides});
}
function advance(run,day){while(run.day<day)assert.equal(q.step(run),true);}
function finish(session){
 while(session.phase!=='done')q.stepCapacityReplay(session);
 return session;
}
function replay(source,month=1,key='designerHours',value=8){
 const target=source.projects.find(p=>p.created<=month*30);
 const pair=finish(q.startCapacityReplay(source,{month,key,value,demandId:target?.demandId}));
 assert.equal(q.capacityReplayResult(pair).comparable,true);
 return pair;
}
function carry(source,pair){
 const session=q.startCapacityCarry(source,pair.baseline,pair.alternative,pair);
 while(session.phase!=='done')q.stepCapacityCarry(session);
 return {session,result:q.capacityCarryResult(session)};
}

test('an initial loss crosses into sustained profit at month two with the actual operating costs included',()=>{
 const source=studio({approvalDays:28});advance(source,17);
 const pair=replay(source);
 const original=JSON.stringify([source,pair.baseline,pair.alternative]);
 const {session,result:r}=carry(source,pair);
 assert.equal(JSON.stringify([source,pair.baseline,pair.alternative]),original);
 assert.equal(r.comparable,true,r.reason);
 assert.deepEqual([r.firstDay,r.sourceDay,r.projectionFromDay,r.endDay,r.paybackMonth],[1,17,18,90,2]);
 assert.deepEqual(r.rows.map(row=>row.cumulativeProfit),[-316,1332,3396]);
 assert.equal(r.rows[0].delta.profit,q.capacityReplayResult(pair).delta.profit);
 assert.equal(r.delta.profit,q.round(r.delta.revenue-r.delta.cost));
 assert.equal(r.delta.cost,r.delta.designLabor);
 assert.notEqual(r.delta.profit,r.delta.closingCash);
 assert.deepEqual(r.jobTiming,{baselineDay:null,alternativeDay:34,daysEarlier:null});
 assert.equal(r.baseline.inquiries,r.alternative.inquiries);
 assert.deepEqual(q.capacityCarryPairResult(q.restore(session.baseline),q.restore(session.alternative),pair),r);
 // An old pair from a partially observed month already contains the applied
 // settings and all available decisions. Its projection is reproducible.
 assert.deepEqual(carry(null,pair).result,r);
});

test('the original can catch up on the very same job and erase its earlier profit gap',()=>{
 const source=studio({designerHours:1});advance(source,8);
 q.applyConfig(source,{...source.config,inquiries:0});advance(source,90);
 const pair=replay(source,1,'designerHours',24);
 const {session,result:r}=carry(source,pair);
 assert.equal(r.comparable,true,r.reason);
 assert.deepEqual(r.rows.map(row=>row.cumulativeProfit),[382,0,0]);
 assert.deepEqual(r.jobTiming,{baselineDay:44,alternativeDay:4,daysEarlier:40});
 assert.equal(r.delta.profit,0);assert.equal(r.delta.delivered,0);assert.equal(r.paybackMonth,null);
 assert.equal(r.projectionFromDay,null);
 assert.equal(session.baseline.cash,source.cash);assert.deepEqual(session.baseline.projects,source.projects);
 assert.throws(()=>carry(null,pair),/original run was not kept/i);
});

test('an explicit legacy projection starts from the saved close and excludes every unavailable later decision',()=>{
 const source=studio();advance(source,37);q.fund(source,321);
 q.applyConfig(source,{...source.config,designerHours:3});advance(source,62);
 const pair=replay(source);
 assert.throws(()=>carry(source,pair),/changed the selected capacity/i);
 assert.throws(()=>carry(null,pair),/original run was not kept/i);
 const projected={...pair,projectFromClose:true};
 assert.throws(()=>carry(source,projected),/unavailable subsequent history/i);
 const {session,result}=carry(null,projected);
 assert.equal(result.comparable,true,result.reason);
 assert.deepEqual([result.projectFromClose,result.sourceDay,result.projectionFromDay,result.endDay],[true,62,31,90]);
 for(const run of [session.baseline,session.alternative])assert.equal(run.funding,0);
 assert.deepEqual([session.baseline.config.designerHours,session.alternative.config.designerHours],[0,8]);
 assert.deepEqual(q.capacityCarryPairResult(session.baseline,session.alternative,projected),result);
});

test('later experiments tally results from the selected month and replay closing-day settings, funding and prior work exactly once',()=>{
 const source=studio({months:4,designerHours:12});advance(source,30);
 q.applyConfig(source,{...source.config,designerHours:0});q.fund(source,70);
 advance(source,60);q.fund(source,50);q.applyConfig(source,{...source.config,overhead:150,ownerTarget:97});
 advance(source,70);q.fund(source,99);advance(source,80);q.applyConfig(source,{...source.config,designerRate:19});
 advance(source,97);
 const pair=replay(source,2);
 const {session,result:r}=carry(source,pair);
 assert.equal(r.comparable,true,r.reason);
 assert.deepEqual([r.month,r.firstDay,r.endDay,r.sourceDay],[2,31,120,97]);
 assert.deepEqual(r.rows.map(v=>v.month),[2,3,4]);
 assert.equal(r.rows[0].baseline.afterOwner,q.capacityReplayResult(pair).baseline.afterOwner);
 for(const run of [session.baseline,session.alternative]){
  assert.equal(run.funding,219);
  assert.deepEqual(run.ledger.filter(e=>e.type==='funding').map(e=>[e.day,e.amount]),[[30,70],[60,50],[70,99]]);
 }
 assert.equal(r.baseline.profit,q.round(q.metrics(session.baseline).profit-q.monthResult(session.baseline,1).profit));
 assert.equal(r.delta.afterOwner,q.round(r.rows.reduce((sum,v)=>sum+v.delta.afterOwner,0)));
});

test('changed settings, missing source, a later outreach conflict or an incompatible recorded decision suppress a payoff comparison',()=>{
 const source=studio();advance(source,30);
 const pair=replay(source);
 assert.throws(()=>carry(null,pair),/original run was not kept/i);
 assert.throws(()=>carry({...source,day:29},pair),/source run no longer matches/i);
 q.applyConfig(source,{...source.config,designerHours:9});
 assert.throws(()=>carry(source,pair),/changed the selected capacity/i);
 const sales=studio({acquisition:'sales',ownerHours:8,outreachHours:2});advance(sales,35);
 q.applyConfig(sales,{...sales.config,outreachHours:12});
 assert.throws(()=>carry(sales,replay(sales,1,'ownerHours',30)),/change outreach/i);
 const decisions=studio();advance(decisions,43);
 q.intervene(decisions,decisions.projects[0].id,'priority');
 assert.throws(()=>carry(decisions,replay(decisions,1,'designerHours',40)),/decision on day 43/i);
 const short=studio({months:1});advance(short,30);
 assert.throws(()=>carry(short,replay(short)),/reaches the end/i);
});

test('funding decisions stop a copy on its actual day and suppress end-of-horizon deltas',()=>{
 const source=studio({startingCash:330,inquiries:0,deposit:0,designerRate:200});advance(source,30);
 q.applyConfig(source,{...source.config,inquiries:20});
 const pair=replay(source),before=JSON.stringify(source);
 const {result:r}=carry(source,pair);
 assert.equal(JSON.stringify(source),before);assert.equal(r.baseline.day,90);
 assert.ok(r.alternative.day<90);assert.ok(r.alternative.blocked.gap>0);
 assert.deepEqual([r.comparable,r.delta,r.paybackMonth,r.jobTiming],[false,null,null,null]);
 assert.match(r.reason,/funding/i);
 assert.ok(r.rows.every(row=>row.endDay<=r.alternative.day&&row.delta===null));
});
