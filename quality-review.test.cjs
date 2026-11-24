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
