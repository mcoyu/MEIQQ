const test=require('node:test');
const assert=require('node:assert/strict');
const q=require('./engine.js');

function acrossMonthEnd(){
 const s=q.fresh({...q.clone(q.DEFAULT),startingCash:1000,ownerTarget:40});
 const project=(id,name,created,deliveredDay,price)=>({id,serviceId:name,service:{name},created,accepted:created,deliveredDay,price});
 s.day=39;
 s.projects=[
  project('P1','Print',4,31,450),
  project('P2','Digital',6,29,200),
  project('P3','Print',36,undefined,100)
 ];
 s.history=Array.from({length:s.day},(_,i)=>({day:i+1,ownerHours:(i+1)/4}));
 s.ledger=[
  [0,100,'funding',null],[1,-70,'expense',null],
  [10,75,'receipt','P1'],[14,50,'receipt','P2'],
  [16,-25,'expense','P2','Design labor for P2'],[17,-120,'expense','P1','Design labor for P1'],
  [30,25,'funding',null],[31,-70,'expense',null],
  [31,-64,'expense','P1','Print order for P1'],[31,-16,'expense','P1','Supplier reprint for P1'],
  [33,150,'receipt','P2'],[34,375,'receipt','P1'],
  [36,10,'funding',null],[36,-63.55,'expense','P3','Archived project expense'],
  [37,40,'receipt','P3']
 ].map(([day,amount,type,project,note])=>({day,amount,type,project,note}));
 return s;
}

test('the first month closes before later deliveries and final payments, including funding on the boundary',()=>{
 const s=acrossMonthEnd(),r=q.monthResult(s,1);
 assert.deepEqual([r.firstDay,r.endDay,r.days],[1,30,30]);
 assert.deepEqual([r.openingCash,r.receipts,r.cost,r.funding,r.cashChange,r.closingCash],[1100,125,215,25,-65,1035]);
 assert.deepEqual([r.delivered,r.revenue,r.profit,r.ownerHours,r.ownerTime,r.afterOwner],[1,200,-15,7.5,300,-315]);
 assert.deepEqual([r.receivable,r.depositsHeld,r.overhead,r.deliveredCost,r.unfinishedCost],[150,75,70,25,120]);
 assert.equal(r.designLabor,145);
 assert.deepEqual([r.awaitingDelivery,r.openProjectId],[1,'P1']);
 assert.deepEqual(r.services.map(v=>[v.id,v.contribution,v.deliveredProjectId,v.unfinishedProjectId]),[
  ['Digital',175,'P2',null],['Print',-120,null,'P1']
 ]);
});

test('a partial second month reports only its incurred cost and recognized deliveries',()=>{
 const s=acrossMonthEnd(),r=q.monthResult(s);
 assert.deepEqual([r.firstDay,r.endDay,r.days],[31,39,9]);
 assert.deepEqual([r.openingCash,r.receipts,r.funding,r.cashChange,r.closingCash],[1035,565,10,361.45,1396.45]);
 assert.deepEqual([r.revenue,r.cost,r.profit,r.ownerHours,r.ownerTime,r.afterOwner],[450,213.55,236.45,2.25,90,146.45]);
 assert.deepEqual([r.overhead,r.deliveredCost,r.unfinishedCost,r.designLabor,r.supplierCost,r.otherProjectCost],[70,80,63.55,0,80,63.55]);
 assert.deepEqual([r.receivable,r.depositsHeld,r.delivered],[0,40,1]);
 assert.equal(r.services.length,1);
 assert.deepEqual(r.services[0],{id:'Print',name:'Print',delivered:1,revenue:450,cost:143.55,deliveredCost:80,
  unfinishedCost:63.55,contribution:306.45,deliveredProjectId:'P1',costProjectId:'P1',unfinishedProjectId:'P3'});
});

test('every elapsed month reconciles to real daily snapshots, the ledger and restored project terms',()=>{
 const s=q.fresh({...q.clone(q.DEFAULT),months:3,startingCash:50000,realism:true});
 q.fund(s,25.31);
 let first;
 for(let i=1;i<=71;i++){
  assert.equal(q.step(s),true);
  if(i===30){q.fund(s,120.52);first=q.monthResult(s);}
 }
 assert.deepEqual(q.monthResult(s,1),first);
 const analytics=q.analytics(s),restored=q.restore(s);
 let prior=50025.31,totalProfit=0,totalReceipts=0;
 for(const month of analytics.monthly){
  const r=q.monthResult(s,month.month);
  assert.deepEqual(q.monthResult(restored,month.month),r);
  for(const key of ['days','delivered','revenue','cost','profit','ownerHours','afterOwner'])assert.equal(r[key],month[key],key);
  assert.equal(r.openingCash,prior);
  assert.equal(r.closingCash,s.history[r.endDay-1].cash);
  assert.equal(q.round(r.receipts+r.funding-r.cost),r.cashChange);
  assert.equal(q.round(r.profit-r.ownerTime),r.afterOwner);
  assert.equal(q.round(r.overhead+r.designLabor+r.supplierCost+r.otherProjectCost),r.cost);
  assert.equal(q.round(r.overhead+r.deliveredCost+r.unfinishedCost),r.cost);
  assert.equal(q.round(r.services.reduce((n,v)=>n+v.contribution,0)-r.overhead),r.profit);
  prior=r.closingCash;totalProfit+=r.profit;totalReceipts+=r.receipts;
 }
 assert.equal(prior,s.cash);
 assert.equal(q.round(totalProfit),analytics.profit);
 assert.equal(q.round(totalReceipts),q.round(s.projects.reduce((n,p)=>n+p.paid,0)));
 assert.equal(q.monthResult(s).receivable,q.round(q.metrics(s).receivable));
 const oldTarget=s.config.ownerTarget;
 s.config.ownerTarget=100;
 const revalued=q.monthResult(s,1);
 assert.equal(revalued.profit,first.profit);
 assert.equal(revalued.closingCash,first.closingCash);
 assert.ok(revalued.ownerTime>first.ownerTime&&oldTarget<100);
});

test('day zero and an unfunded rolled-back day include no invented monthly activity',()=>{
 const s=q.fresh({...q.clone(q.DEFAULT),startingCash:0,overhead:150});
 assert.equal(q.step(s),false);
 const r=q.monthResult(s);
 assert.deepEqual([r.month,r.firstDay,r.endDay,r.days,r.revenue,r.cost,r.profit,r.delivered],[1,1,0,0,0,0,0,0]);
 assert.deepEqual(r.services,[]);
 q.fund(s,175.25);
 const funded=q.monthResult(s);
 assert.deepEqual([funded.openingCash,funded.closingCash,funded.funding,funded.cashChange],[175.25,175.25,0,0]);
 for(const m of [0,2,-1,1.5])assert.throws(()=>q.monthResult(s,m),/month/);
});

test('historical owner time uses each period’s last simulated rate, including partial periods and end-day edits',()=>{
 const s=q.fresh({...q.clone(q.DEFAULT),ownerTarget:20,startingCash:100000});
 const advance=day=>{while(s.day<day)assert.ok(q.step(s));};
 advance(12);q.applyConfig(s,{...s.config,ownerTarget:38});advance(30);
 const close=q.monthResult(s,1);
 q.applyConfig(s,{...s.config,ownerTarget:100});
 assert.deepEqual(q.monthResult(s,1),close);
 advance(45);
 const partial=q.monthResult(s,2);
 q.applyConfig(s,{...s.config,ownerTarget:85});
 assert.equal(q.monthResult(s,2).ownerRate,100);
 advance(46);
 assert.equal(q.monthResult(s,2).ownerRate,85);
 for(const [r,rate] of [[close,38],[partial,100]]) {
  assert.equal(r.ownerRate,rate);
  assert.equal(r.afterOwner,q.round(r.profit-r.ownerHours*rate));
  assert.ok(r.rateHistoryAvailable);
 }
 const periods=q.analytics(s);
 assert.equal(periods.periodAfterOwner,q.round(q.monthResult(s,1).afterOwner+q.monthResult(s,2).afterOwner));
 assert.equal(periods.afterOwner,q.round(periods.profit-s.ownerHours*85));
 assert.deepEqual(q.analytics(q.restore(s)),periods);
 const legacy=q.clone(s);delete legacy.replayJournal;
 const fallback=q.monthResult(legacy,1);
 assert.equal(fallback.rateHistoryAvailable,false);assert.equal(fallback.ownerRate,85);
 assert.equal(fallback.profit,close.profit);assert.equal(fallback.closingCash,close.closingCash);
});
