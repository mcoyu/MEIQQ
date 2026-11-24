const test=require('node:test');
const assert=require('node:assert/strict');
const q=require('./engine.js');

const config=over=>({...q.clone(q.DEFAULT),...over});
const run=(c,days)=>{const s=q.fresh(c);for(let i=0;i<days;i++){if(!q.step(s))break;}return s;};

test('capacity comparisons keep external demand identities and random streams fixed',()=>{
 const low=run(config({months:3,startingCash:100000,ownerHours:8,designerHours:8,retention:1,repeat:1,realism:true}),90);
 const high=run(config({months:3,startingCash:100000,ownerHours:80,designerHours:80,retention:1,repeat:1,realism:true}),90);
 const workload=s=>s.projects.filter(p=>p.orderKind==='new-business').map(p=>({demandId:p.demandId,clientId:p.clientId,clientType:p.clientType,serviceId:p.serviceId,random:p.random}));
 assert.deepEqual(workload(low),workload(high));
 assert.notEqual(low.projects.length,high.projects.length,'renewal timing may still change confirmed repeat cycles');
 assert.equal(low.workloadId,high.workloadId);
});

test('due collections happen before monthly overhead',()=>{
 const c=config({months:3,startingCash:0,overhead:100,inquiries:0}),s=q.fresh(c);
 s.day=30;s.cash=0;s.initialCash=0;
 s.clients.push({id:'C_test',name:'Test client',brief:'',created:0});
 s.contracts.push({id:'K_test',clientId:'C_test',serviceId:'design',kind:'repeat-purchase',started:0,cycles:1,status:'active'});
 s.projects.push({id:'P001',demandId:'test',serviceId:'design',service:q.clone(c.services[0]),client:'Test client',clientId:'C_test',brief:'',contractId:'K_test',cycle:1,orderKind:'new-business',stage:'payment',created:0,entered:30,due:30,work:{quote:0,design:0,review:0,delivery:0},commitments:{quoteHours:0,quoteSetDay:0},random:Object.fromEntries(['conversion','complexity','revision','approval','supplier','payment','return'].map(k=>[k,.5])),price:200,paid:0,cost:0,ownerHours:0,designHours:0,priority:false,log:[],renewal:false,wait:0,revised:false,delivered:true,fulfillmentStatus:'delivered',paymentStatus:'unpaid',renewalStatus:'ineligible',accepted:0,terms:{paymentDays:1,approvalDays:0,printDays:0,deliveryHours:0,leadDays:1},printCost:0,deliveredDay:30,paymentDue:31,receiveDay:31});
 assert.equal(q.step(s),true);assert.equal(s.cash,100);
 assert.deepEqual(s.ledger.map(e=>e.type),['receipt','expense']);
});

test('zero-duration work and waits can complete on the same day',()=>{
 const c=config({inquiries:30,conversion:1,quoteHours:0,deliveryHours:0,approvalDays:0,paymentDays:0,overhead:0,deposit:1,ownerHours:40,designerHours:40});
 delete c.customerMix;delete c.profileStrength;delete c.focusType;
 c.services=[{...c.services[0],hours:0,review:0,print:0,weight:100,recurring:false}];
 const s=run(c,1),p=s.projects[0];
 assert.equal(p.stage,'complete');assert.equal(p.accepted,1);assert.equal(p.deliveredDay,1);
});

test('one design project uses at most one designer-day while projects run in parallel',()=>{
 const c=config({inquiries:60,conversion:1,quoteHours:0,deliveryHours:0,approvalDays:0,overhead:0,deposit:0,ownerHours:40,designers:2,designerHours:40});
 delete c.customerMix;delete c.profileStrength;delete c.focusType;
 c.services=[{...c.services[0],hours:100,review:0,print:0,weight:100,recurring:false}];
 const s=run(c,1);
 assert.equal(s.projects.length,2);assert.deepEqual(s.projects.map(p=>p.designHours),[8,8]);assert.equal(s.designHours,16);
 const many=run({...c,inquiries:30,designers:20},1);assert.equal(many.projects[0].designHours,8);
});

test('quote effort is committed at inquiry while delivery effort locks at acceptance',()=>{
 const c=config({inquiries:30,conversion:1,quoteHours:1,deliveryHours:1,ownerHours:1,overhead:0}),s=run(c,1),p=s.projects[0],remaining=p.work.quote;
 assert.ok(remaining>0&&p.accepted===undefined);assert.throws(()=>q.intervene(s,p.id,'deadline',30),/after the quote is accepted/);
 q.applyConfig(s,{...s.config,ownerHours:80,quoteHours:5,deliveryHours:5});q.step(s);
 assert.equal(p.commitments.quoteHours,1);assert.equal(s.projects[0].terms.deliveryHours,5);
});

test('clients, contracts, payment and renewal eligibility are explicit',()=>{
 const s=run(config({months:6,startingCash:100000,ownerHours:80,designerHours:80,retention:1,repeat:1}),90),renewal=s.projects.find(p=>p.orderKind==='paid-cycle-renewal');
 assert.ok(renewal);const first=s.projects.find(p=>p.contractId===renewal.contractId&&p.cycle===1),client=s.clients.find(c=>c.id===renewal.clientId),contract=s.contracts.find(c=>c.id===renewal.contractId);
 assert.equal(first.paymentStatus,'paid');assert.equal(first.renewalStatus,'scheduled');assert.equal(renewal.client,client.name);assert.equal(contract.kind,'paid-cycle');assert.ok(contract.cycles>=2);
});

test('delay metrics retain completed lateness, quote age and combined resource workload',()=>{
 const s=run(config({months:3,startingCash:100000,ownerHours:8,designerHours:8,leadDays:1}),60),m=q.metrics(s),b=q.bottleneck(s);
 assert.ok(m.quoteCount>0);assert.ok(m.oldestQuoteAge>0);assert.ok(m.lateCompleted>=0);assert.ok(m.ownerOpenHours>=0&&m.designerOpenHours>=0);
 assert.ok(['owner','design','external'].includes(b.resource));assert.ok(Array.isArray(b.stages));
});
