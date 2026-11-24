const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./planner.js');
const copy=v=>JSON.parse(JSON.stringify(v));
const current=(book,id)=>book.plans.find(p=>p.id===id);
function fixture(example=false){
 const book=P.fresh(),id=P.create(book,{example}).id;
 const set=(path,value)=>P.update(book,id,path,value),get=()=>current(book,id),metrics=()=>P.metrics(get());
 if(!example){for(const [path,value]of Object.entries({ownerHours:'100',nonProjectHours:'0',bufferPct:'0',ownerTarget:'0',profitTarget:'0','expenses.0.amount':'0'}))set(path,value);}
 return {book,id,set,get,metrics};
}
function offer(f,values={}){return P.addService(f.book,f.id,{name:'Planned work',unit:'engagement',quantity:'1',setupCount:'0',price:'100',directCost:'0',setupCost:'0',ownerHours:'1',setupOwnerHours:'0',...values});}

test('blank planning assumptions remain unknown, example data is explicit, and raw unfinished inputs survive backup',()=>{
 const book=P.fresh(),blank=P.create(book),example=P.create(book,{example:true});
 assert.equal(blank.origin,'blank');assert.equal(example.origin,'example');
 assert.equal(blank.expenses.length,1);assert.equal(blank.expenses[0].amount,'');
 let m=P.metrics(blank);assert.equal(m.revenue,0);assert.equal(m.recurringCosts,null);assert.equal(m.availableForOwner,null);assert.equal(m.capacityStatus,'unknown');
 P.update(book,blank.id,'ownerHours','waiting for calendar');
 const reopened=P.parseText(P.serialize(book));assert.deepEqual(reopened,book);assert.equal(reopened.plans[0].ownerHours,'waiting for calendar');
 m=P.metrics(reopened.plans[0]);assert.ok(m.issues.some(i=>i.path==='ownerHours'&&i.kind==='invalid'));
 assert.equal(P.PERIOD_DAYS,30);assert.equal(P.WORK_DAYS,22);
});

test('shared pools aggregate services and setup work, with one monthly draw and one recurring expense',()=>{
 const f=fixture(true);f.set('bufferPct','0');f.set('ownerHours','24');f.set('pools.0.hours','24');
 let m=f.metrics();
 assert.deepEqual([m.revenue,m.directCosts,m.externalLaborCosts,m.externalCosts,m.recurringCosts,m.availableForOwner,m.afterOwnerTarget,m.targetGap],[240000,8000,72000,80000,20000,140000,40000,0]);
 assert.equal(m.owner.usedHours,14);assert.equal(m.ownerTotalHours,20);assert.equal(m.totalTeamHours,44);assert.equal(m.pools[0].usedHours,24);assert.equal(m.pools[0].rate,3000);
 assert.equal(m.requiredScale,1);assert.equal(m.maxScale,1);assert.equal(m.goalFeasible,true);
 offer(f,{quantity:'2',price:'200',ownerHours:'2',allocations:[{name:'Analyst follow-up',poolId:f.get().pools[0].id,hours:'3',setupHours:'0'}]});
 m=f.metrics();assert.equal(m.pools[0].usedHours,30);assert.equal(m.pools[0].cost,90000);assert.equal(m.externalLaborCosts,90000);assert.equal(m.owner.usedHours,18);assert.equal(m.ownerTotalHours,24);
 assert.equal(m.capacityStatus,'overloaded');assert.equal(m.pools[0].overHours,6);assert.equal(m.recurringCosts,20000);
});

test('the theoretical ceiling scales the same setup mix and keeps studio expenses fixed',()=>{
 const f=fixture(true);f.set('ownerHours','22');f.set('nonProjectHours','2');f.set('pools.0.hours','30');
 let m=f.metrics();assert.equal(m.owner.budgetHours,18);assert.equal(m.pools[0].budgetHours,27);assert.equal(m.maxScale,1.125);
 assert.equal(m.ceilingRevenue,270000);assert.equal(m.ceilingContribution,180000);assert.equal(m.ceilingAvailableForOwner,160000);assert.equal(m.ceilingAfterOwnerTarget,60000);
 f.set('profitTarget','600');assert.equal(f.metrics().goalFeasible,true);
 f.set('profitTarget','601');m=f.metrics();assert.ok(m.requiredScale>m.maxScale);assert.equal(m.goalFeasible,false);
 f.set('services.0.setupCount','0');m=f.metrics();assert.equal(m.pools[0].usedHours,20);assert.equal(m.owner.usedHours,12);assert.equal(m.externalLaborCosts,60000);
});

test('zero volume suppresses irrelevant unknowns, while contradictory setup counts remain invalid',()=>{
 const f=fixture();offer(f,{quantity:'0',setupCount:'',price:'',directCost:'',ownerHours:'',setupCost:'',setupOwnerHours:'',allocations:[{name:'Unresearched role',poolId:'',hours:'',setupHours:''}]});
 let m=f.metrics();assert.equal(m.revenue,0);assert.equal(m.externalCosts,0);assert.equal(m.owner.usedHours,0);assert.equal(m.capacityStatus,'within');assert.equal(m.issues.length,0);
 f.set('services.0.setupCount','1');m=f.metrics();assert.equal(m.externalCosts,null);assert.ok(m.issues.some(i=>i.path==='services.0.setupCount'&&i.kind==='invalid'));
 f.set('services.0.setupCount','pending');assert.ok(f.metrics().issues.some(i=>i.path==='services.0.setupCount'&&i.kind==='invalid'));
 f.set('services.0.quantity','1.5');assert.equal(f.metrics().quantityTotal,null);
});

test('missing rates, work and capacity retain independent known facts; a zero rate does not pretend unknown work is zero',()=>{
 const f=fixture(),pool=P.addPool(f.book,f.id,{name:'Partner',hours:'',rate:''});
 offer(f,{allocations:[{name:'Partner',poolId:pool.id,hours:'3',setupHours:'0'}]});
 let m=f.metrics();assert.equal(m.revenue,10000);assert.equal(m.pools[0].usedHours,3);assert.equal(m.externalCosts,null);assert.equal(m.capacityStatus,'unknown');assert.equal(m.goalFeasible,null);
 f.set('pools.0.rate','0');m=f.metrics();assert.equal(m.externalCosts,0);assert.equal(m.availableForOwner,10000);assert.equal(m.goalFeasible,null,'zero targets do not erase unknown capacity');
 f.set('pools.0.hours','10');f.set('services.0.allocations.0.hours','');m=f.metrics();assert.equal(m.pools[0].usedHours,null);assert.equal(m.externalCosts,0);assert.equal(m.capacityStatus,'unknown');assert.equal(m.goalFeasible,null);
 f.set('services.0.allocations.0.hours','3');assert.equal(f.metrics().goalFeasible,true);
});

test('nonproject overcommitment remains overloaded even with a 100 percent buffer and zero project effort',()=>{
 const f=fixture();f.set('ownerHours','4');f.set('nonProjectHours','5');f.set('bufferPct','100');
 const m=f.metrics();assert.equal(m.owner.overHours,1);assert.equal(m.capacityStatus,'overloaded');assert.equal(m.feasibleAtCurrentVolume,false);assert.equal(m.maxScale,0);assert.equal(m.goalFeasible,false);
});

test('a capacity reserve never discounts owner time already overcommitted to nonproject work',()=>{
 for(const buffer of ['0','50','100']){
  const f=fixture();f.set('ownerHours','4');f.set('nonProjectHours','5');f.set('bufferPct',buffer);
  let m=f.metrics();assert.equal(m.owner.budgetHours,-1);assert.equal(m.owner.remainingHours,-1);assert.equal(m.owner.overHours,1);
  offer(f,{ownerHours:'2'});m=f.metrics();
  assert.equal(m.ownerTotalHours,7);assert.equal(m.owner.usedHours,2);assert.equal(m.owner.budgetHours,-1);
  assert.equal(m.owner.remainingHours,-3);assert.equal(m.owner.overHours,3);assert.equal(m.capacityStatus,'overloaded');
  assert.equal(m.maxScale,0);assert.equal(m.goalFeasible,false);assert.equal(m.feasibleAtCurrentVolume,false);
 }
 const f=fixture();f.set('ownerHours','4');f.set('nonProjectHours','5');f.set('bufferPct','');offer(f,{ownerHours:'2'});
 assert.equal(f.metrics().owner.budgetHours,null,'an unknown reserve remains unknown');
 assert.equal(f.metrics().capacityStatus,'overloaded','known nonproject overcommitment still blocks the plan');
});

test('known zero-effort positive contribution is unbounded arithmetic, and nonpositive contribution cannot fund a positive target',()=>{
 const f=fixture();offer(f,{ownerHours:'0'});f.set('ownerTarget','1000');
 let m=f.metrics();assert.equal(m.scaleStatus,'unbounded');assert.equal(m.maxScale,null);assert.equal(m.ceilingRevenue,null);assert.equal(m.requiredScale,10);assert.equal(m.goalFeasible,true);assert.equal(m.feasibleAtCurrentVolume,false);
 f.set('services.0.directCost','100');m=f.metrics();assert.equal(m.contribution,0);assert.equal(m.requiredScale,null);assert.equal(m.goalFeasible,false);
 f.set('services.0.directCost','101');assert.equal(f.metrics().goalFeasible,false);
});

test('fractional cents are rounded once per shared role pool and reconcile to service costs',()=>{
 const f=fixture(),pool=P.addPool(f.book,f.id,{name:'Micro task',hours:'10',rate:'.50'});
 for(let i=0;i<2;i++)offer(f,{price:'.01',ownerHours:'0',allocations:[{name:'Micro task',poolId:pool.id,hours:'.01',setupHours:'0'}]});
 const m=f.metrics();assert.equal(m.pools[0].usedHours,.02);assert.equal(m.pools[0].cost,1);assert.equal(m.externalLaborCosts,1);assert.equal(m.services.reduce((total,s)=>total+s.laborCosts,0),1);assert.equal(m.contribution,1);
});

test('removing a pool preserves unresolved role work and names; IDs are not reused',()=>{
 const f=fixture(),pool=P.addPool(f.book,f.id,{name:'Analyst',hours:'10',rate:'30'}),s=offer(f);
 P.setAllocation(f.book,f.id,s.id,pool.id,{name:'Research analyst',hours:'2',setupHours:'0'});
 P.setAllocation(f.book,f.id,s.id,pool.id,{hours:'3'});assert.equal(f.get().services[0].allocations.length,1);
 P.removePool(f.book,f.id,pool.id);const a=f.get().services[0].allocations[0];assert.deepEqual(a,{name:'Research analyst',poolId:'',hours:'3',setupHours:'0'});assert.equal(f.metrics().externalCosts,null);assert.equal(f.metrics().capacityStatus,'unknown');
 const replacement=P.addPool(f.book,f.id,{name:'New analyst',hours:'10',rate:'30'});assert.notEqual(replacement.id,pool.id);
 f.set('services.0.allocations.0.poolId',replacement.id);assert.equal(f.metrics().externalLaborCosts,9000);
 P.removeAllocation(f.book,f.id,s.id,0);assert.equal(f.get().services[0].allocations.length,0);
 P.removeService(f.book,f.id,s.id);assert.notEqual(offer(f).id,s.id);
});

test('alternatives retain the exact baseline across recaptures and merging independent copies',()=>{
 const f=fixture(true),first=P.duplicate(f.book,f.id,{date:'2026-11-20'}),initial=copy(f.get().baseline);
 assert.deepEqual(first.baseline,initial);assert.equal(first.origin,'example');
 f.set('services.0.price','650');assert.deepEqual(f.get().baseline,initial);
 P.captureBaseline(f.book,f.id,'2026-11-21');assert.notEqual(f.get().baseline.key,initial.key);assert.deepEqual(current(f.book,first.id).baseline,initial);
 const later=P.duplicate(f.book,f.id,{date:'2026-11-22'});assert.deepEqual(later.baseline,f.get().baseline);
 const before=copy(f.book),merged=P.merge(f.book,P.parseText(P.serialize(f.book)));assert.deepEqual(f.book,before);assert.equal(merged.plans.length,6);assert.equal(new Set(merged.plans.map(p=>p.id)).size,6);assert.deepEqual(merged.plans[4].baseline,initial);
 P.update(merged,merged.plans[4].id,'services.0.price','1');assert.equal(merged.plans[1].services[0].price,'600');assert.equal(merged.plans[4].baseline.snapshot.services[0].price,'600');
 const removed=merged.plans.at(-1).id;P.remove(merged,removed);assert.notEqual(P.create(merged).id,removed);
});

test('typed imports reject bad references, numeric types, changed snapshot identities and mixed formats atomically',()=>{
 const f=fixture(true);P.captureBaseline(f.book,f.id,'2026-11-20');const before=copy(f.book);
 const mutations=[
  b=>b.version=99,b=>b.plans[0].ownerHours=null,b=>b.plans[0].services[0].quantity=4,
  b=>b.plans[0].services[0].allocations[0].poolId='pool-99',
  b=>b.plans[0].baseline.snapshot.services[0].price='999',
  b=>b.plans[0].nextPoolId=1,b=>b.plans[0].extra='unsupported',b=>b.plans.push(copy(b.plans[0]))
 ];
 for(const change of mutations){const bad=copy(before);change(bad);assert.throws(()=>P.merge(f.book,bad));assert.deepEqual(f.book,before);}
 const envelope=JSON.parse(P.serialize(f.book));envelope.format='meiqq-jobs';assert.throws(()=>P.parseText(JSON.stringify(envelope)),/supported Planner/);
 assert.throws(()=>f.set('baseline.snapshot.name','changed'));assert.throws(()=>f.set('services.0.allocations.0.poolId','pool-99'));assert.throws(()=>f.set('ownerHours',null));assert.deepEqual(f.book,before);
 assert.throws(()=>P.captureBaseline(f.book,f.id,'2026-02-30'),/calendar/);assert.deepEqual(f.book,before);
});

test('backup size and plan-count limits reject whole operations without partial insertion',()=>{
 const f=fixture(),template=copy(f.get()),service=offer(f,{allocations:Array.from({length:30},()=>({name:'x'.repeat(300),poolId:'',hours:'',setupHours:''}))});
 template.services=Array.from({length:100},(_,i)=>({...copy(service),id:'service-'+(i+1)}));template.nextServiceId=101;
 const large={version:1,nextId:8,plans:Array.from({length:7},(_,i)=>({...copy(template),id:'plan-'+(i+1)}))};
 assert.ok(Buffer.byteLength(P.serialize(large))<P.MAX_BYTES);
 const before=JSON.stringify(large);assert.throws(()=>P.merge(large,large),/8 MiB/);assert.equal(JSON.stringify(large),before);
 assert.throws(()=>P.parseText(' '.repeat(P.MAX_BYTES+1)),/8 MiB/);
 const hundred={version:1,nextId:101,plans:Array.from({length:100},(_,i)=>({...copy(f.get()),id:'plan-'+(i+1)}))},previous=JSON.stringify(hundred);
 assert.throws(()=>P.create(hundred),/100 plans/);assert.throws(()=>P.duplicate(hundred,'plan-1',{date:'2026-11-20'}),/100 plans/);assert.equal(JSON.stringify(hundred),previous);
});
