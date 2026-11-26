const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js');

test('contract analytics keep repeated client names separate and aggregate cycles by contract identity',()=>{
 const s=q.fresh();
 s.contracts=[{id:'K2',kind:'repeat-purchase'},{id:'K1',kind:'paid-cycle'}];
 const base={serviceId:'design',service:{name:'Design'},client:'Same display name',orderKind:'new-business',accepted:1,delivered:true,ownerHours:1,designHours:2,cost:30,paid:100,price:100};
 s.projects=[{...base,id:'P1',clientId:'C1',contractId:'K1'},{...base,id:'P2',clientId:'C2',contractId:'K2'},{...base,id:'P3',clientId:'C1',contractId:'K1',orderKind:'paid-cycle-renewal'}];
 const a=q.analytics(s).contracts;
 assert.equal(a.length,2);
 assert.deepEqual(a.map(c=>[c.id,c.kind,c.cycles,c.revenue,c.contribution]),[['K1','paid-cycle',2,200,140],['K2','repeat-purchase',1,100,70]]);
 s.contracts.reverse();assert.deepEqual(q.analytics(s).contracts,a);
});

test('owner bottleneck capacity accounts for sales outreach without fabricating clearance dates',()=>{
 const s=q.fresh({...q.clone(q.DEFAULT),acquisition:'sales',ownerHours:10,outreachHours:10});s.day=1;
 s.projects=[{id:'quote',stage:'quote',entered:0,work:{quote:1}},{id:'design',stage:'design',entered:0,work:{design:100}}];
 let b=q.bottleneck(s);assert.equal(b.resource,'owner');assert.equal(b.capacity,0);assert.equal(b.days,Infinity);
 s.config.outreachHours=5;s.projects[1].work.design=0;
 b=q.bottleneck(s);assert.equal(b.capacity,1);assert.equal(b.days,1);
 s.config.acquisition='preset';b=q.bottleneck(s);assert.equal(b.capacity,2);assert.equal(b.days,.5);
 s.config.ownerHours=0;s.projects[0].work.quote=0;
 b=q.bottleneck(s);assert.equal(b.days,0);
});

test('design wait estimates follow parallel work and the per-job limit in the daily schedule',()=>{
 const offer={...q.clone(q.DEFAULT.services[0]),print:0,review:0,recurring:false,weight:50};
 const s=q.fresh({...q.clone(q.DEFAULT),months:1,seed:3,acquisition:'preset',inquiries:60,conversion:1,
  ownerHours:40,designers:2,designerHours:0,quoteHours:0,deliveryHours:0,approvalDays:0,profileStrength:0,
  repeat:0,retention:0,services:[{...offer,id:'long',hours:18},{...offer,id:'short',hours:2}]});
 q.step(s);
 assert.deepEqual(s.projects.map(p=>p.serviceId),['long','short']);
 assert.equal(q.projectDiagnostic(s,s.projects[0]).estimatedWorkdays,null);
 q.applyConfig(s,{...s.config,designerHours:20,inquiries:0});
 const [long,short]=s.projects.map(p=>q.projectDiagnostic(s,p));
 assert.equal(short.queueAheadCount,1);
 assert.equal(short.estimatedWorkdays,1);
 assert.equal(long.estimatedWorkdays,5);
 assert.equal(q.bottleneck(s).days,4.5);
 const reopened=q.restore(s);
 for(const run of [s,reopened]){
  while(!run.projects.every(p=>p.delivered))assert.equal(q.step(run),true);
  assert.deepEqual(run.projects.map(p=>q.workingDays(p.deliveredDay)-1),[long.estimatedWorkdays,short.estimatedWorkdays]);
 }
});

test('design wait estimates reuse spare hours on the same day in priority order',()=>{
 const offer={...q.clone(q.DEFAULT.services[0]),hours:6,print:0,review:0,weight:100};
 const s=q.fresh({...q.clone(q.DEFAULT),months:1,acquisition:'preset',inquiries:120,conversion:1,
  ownerHours:40,designers:2,designerHours:0,quoteHours:0,deliveryHours:0,approvalDays:0,profileStrength:0,
  repeat:0,retention:0,services:[offer]});
 q.step(s);
 q.intervene(s,s.projects.at(-1).id,'priority');
 q.applyConfig(s,{...s.config,designerHours:20,inquiries:0});
 const estimates=s.projects.map(p=>q.projectDiagnostic(s,p).estimatedWorkdays);
 assert.deepEqual(estimates,[2,3,4,2]);
 assert.equal(q.bottleneck(s).days,3.5);
 for(let i=0;i<4;i++)assert.equal(q.step(s),true);
 assert.deepEqual(s.projects.map(p=>p.deliveredDay-1),estimates);
});
