const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./planner.js'),E=require('./planner-explorer.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const book=P.fresh(),id=P.create(book,{example:true}).id;
 const set=(path,value)=>P.update(book,id,path,String(value)),plan=()=>book.plans[0];
 for(const [path,value]of Object.entries({ownerHours:'35.2',nonProjectHours:'6',bufferPct:'10',ownerTarget:'2000',profitTarget:'400','pools.0.hours':'29.2','pools.0.rate':'0'}))set(path,value);
 return {book,id,set,plan};
}

test('price floors cover studio targets and all costs without changing the saved plan or baseline',()=>{
 const f=fixture();P.captureBaseline(f.book,f.id,'2026-11-20');const original=JSON.stringify(f.book);
 const rows=E.scenarios(f.plan(),'service-1',{quantities:[3,4,5,6]});
 assert.deepEqual(rows.map(row=>row.requiredPrice),[88667,67000,54000,45334]);
 assert.deepEqual(rows.map(row=>row.metrics.capacityStatus),['within','within','overloaded','overloaded']);
 assert.equal(rows[1].currentPrice,60000);assert.equal(rows[1].metrics.afterOwnerTarget,12000);
 assert.equal(rows[1].pricedMetrics.afterOwnerTarget,40000);assert.equal(rows[1].pricedMetrics.feasibleAtCurrentVolume,true);
 assert.equal(rows[3].pricedMetrics.afterOwnerTarget,40004);assert.equal(rows[3].pricedMetrics.feasibleAtCurrentVolume,false,'a price increase cannot eliminate a capacity shortage');
 assert.equal(rows[2].poolHourLimits[0].hoursLimit,4.45);assert.equal(rows[3].poolHourLimits[0].hoursLimit,3.71);
 assert.equal(JSON.stringify(f.book),original,'exploration must not mutate assumptions or a frozen baseline');
});

test('other service revenues, shared roles, setup costs and separate pools remain in every scenario',()=>{
 const f=fixture();f.set('pools.0.rate','30');const designer=P.addPool(f.book,f.id,{name:'Designer',hours:'20',rate:'25'});
 P.addService(f.book,f.id,{name:'Other service',unit:'batch',quantity:'2',setupCount:'1',price:'700',directCost:'40',setupCost:'10',ownerHours:'2',setupOwnerHours:'1',allocations:[{name:'Analysis check',poolId:'pool-1',hours:'2',setupHours:'1'},{name:'Design',poolId:designer.id,hours:'3',setupHours:'2'}]});
 const before=clone(f.plan()),row=E.scenarios(f.plan(),'service-1',{quantities:[4]})[0];
 // Costs: selected analyst24h*$30=$720, other analyst5h*$30=$150,
 // designer8h*$25=$200, selected direct$80, other direct/setup$90.
 // $2,000+$400+$200+$1,240−$1,400 other revenue = $2,440 / 4.
 assert.equal(row.metrics.externalCosts,124000);assert.equal(row.requiredPrice,61000);
 assert.equal(row.poolHourLimits[0].hoursLimit,4.32,'shared pool deducts five hours for the other service and four setup hours');
 assert.equal(row.ownerHoursLimit,4.82,'owner limit deducts other service five hours and selected setup two hours');
 assert.equal(row.metrics.pools.find(pool=>pool.id===designer.id).usedHours,8);
 const all=E.evaluate(f.plan());assert.equal(all.services.length,2);assert.equal(all.services[1].serviceId,before.services[1].id);assert.deepEqual(f.plan(),before);
});

test('a missing selected price can be solved, but unknown costs, targets or other revenue cannot be invented',()=>{
 const f=fixture();f.set('services.0.price','');let row=E.scenarios(f.plan(),'service-1',{quantities:[4]})[0];
 assert.equal(row.currentPrice,null);assert.equal(row.metrics.revenue,null);assert.equal(row.requiredPrice,67000);assert.equal(row.pricedMetrics.revenue,268000);
 f.set('ownerTarget','');assert.equal(E.scenarios(f.plan(),'service-1',{quantities:[4]})[0].requiredPrice,null);
 f.set('ownerTarget','2000');f.set('services.0.directCost','awaiting supplier quote');assert.equal(E.scenarios(f.plan(),'service-1',{quantities:[4]})[0].requiredPrice,null);
 f.set('services.0.directCost','20');P.addService(f.book,f.id,{name:'Unknown revenue',quantity:'1',setupCount:'0',price:'',directCost:'0',ownerHours:'0'});
 row=E.scenarios(f.plan(),'service-1',{quantities:[4]})[0];assert.equal(row.requiredPrice,null);assert.equal(row.pricedMetrics,null);
 assert.match(row.notices.join(' '),/other services/);
});

test('price floors reach zero when other services already fund the entire studio',()=>{
 const f=fixture();P.addService(f.book,f.id,{name:'Other revenue',quantity:'1',setupCount:'0',price:'10000',directCost:'0',ownerHours:'0'});
 const row=E.scenarios(f.plan(),'service-1',{quantities:[4]})[0];assert.equal(row.requiredPrice,0);assert.ok(row.pricedMetrics.afterOwnerTarget>=40000);
});

test('a lower quantity caps setup count explicitly while setup costs and work still count',()=>{
 const f=fixture(),row=E.scenarios(f.plan(),'service-1',{quantities:[1]})[0];
 assert.equal(row.setupCount,1);assert.equal(row.changedSetup,true);assert.match(row.notices.join(' '),/from 2 to 1/);
 assert.equal(row.metrics.owner.usedHours,4);assert.equal(row.metrics.pools[0].usedHours,7);assert.equal(f.plan().services[0].setupCount,'2');
 f.set('services.0.setupCount','');const unknown=E.scenarios(f.plan(),'service-1',{quantities:[1]})[0];assert.equal(unknown.setupCount,null);assert.equal(unknown.changedSetup,false);assert.equal(unknown.requiredPrice,null);assert.equal(unknown.ownerHoursLimit,null);
});

test('per-unit effort limits retain fixed work, aggregate shared allocations and do not round above capacity',()=>{
 const f=fixture();P.setAllocation(f.book,f.id,'service-1','',{name:'Second analyst task',hours:'1',setupHours:'0'});f.set('services.0.allocations.1.poolId','pool-1');
 let row=E.scenarios(f.plan(),'service-1',{quantities:[5]})[0];assert.equal(row.poolHourLimits.length,1);assert.equal(row.poolHourLimits[0].hoursLimit,4.45);
 f.set('services.0.allocations.0.hours','4.45');f.set('services.0.allocations.1.hours','0');f.set('services.0.quantity','5');assert.equal(P.metrics(f.plan()).capacityStatus,'within');
 f.set('services.0.allocations.0.hours','4.46');assert.equal(P.metrics(f.plan()).capacityStatus,'overloaded');
 f.set('pools.0.hours','2');row=E.scenarios(f.plan(),'service-1',{quantities:[5]})[0];assert.equal(row.poolHourLimits[0].hoursLimit,null);assert.equal(row.poolHourLimits[0].status,'setup-over-capacity');assert.match(row.notices.join(' '),/fixed setup already exceed/);
});

test('unmapped fixed work and missing capacity keep role limits unknown, independently of known owner effort',()=>{
 const f=fixture();f.set('pools.0.hours','');let row=E.scenarios(f.plan(),'service-1',{quantities:[4]})[0];assert.equal(row.poolHourLimits[0].status,'unknown');assert.equal(row.poolHourLimits[0].hoursLimit,null);assert.equal(row.ownerHoursLimit,6.07);
 f.set('pools.0.hours','29.2');P.addService(f.book,f.id,{name:'Unmapped work',quantity:'1',setupCount:'0',price:'100',directCost:'0',ownerHours:'0',allocations:[{name:'Unmapped task',poolId:'',hours:'1',setupHours:'0'}]});
 row=E.scenarios(f.plan(),'service-1',{quantities:[4]})[0];assert.equal(row.poolHourLimits[0].status,'unknown');assert.equal(row.requiredPrice,null);
});

test('unknown selected delivery effort can have a capacity limit without pretending current effort is known',()=>{
 const f=fixture();f.set('services.0.ownerHours','');f.set('services.0.allocations.0.hours','');
 const row=E.scenarios(f.plan(),'service-1',{quantities:[4]})[0];assert.equal(row.metrics.capacityStatus,'unknown');assert.equal(row.ownerHoursLimit,6.07);assert.equal(row.poolHourLimits[0].hoursLimit,5.57);assert.equal(row.requiredPrice,67000,'zero hourly cash rate keeps cost known without inventing work');
});

test('nearby quantities are whole, bounded, deduplicated and sensible when quantity is unfinished',()=>{
 const f=fixture();assert.deepEqual(E.scenarios(f.plan(),'service-1').map(row=>row.quantity),[3,4,5]);
 f.set('services.0.quantity','');assert.deepEqual(E.scenarios(f.plan(),'service-1').map(row=>row.quantity),[3,4,5]);
 f.set('services.0.quantity','1');assert.deepEqual(E.scenarios(f.plan(),'service-1').map(row=>row.quantity),[1,2,3]);
 f.set('services.0.quantity','10000');assert.deepEqual(E.scenarios(f.plan(),'service-1').map(row=>row.quantity),[9998,9999,10000]);
 assert.equal(E.scenarios(f.plan(),'service-1',{quantities:[3,3,4]}).length,2);
 assert.throws(()=>E.scenarios(f.plan(),'missing'),/Choose a service/);assert.throws(()=>E.scenarios(f.plan(),'service-1',{quantities:[0,1.5]}),/whole-job/);
});

test('weekly conversion makes the modeled workweeks explicit and rounds down to supported precision',()=>{
 assert.equal(E.toPeriodHours('8'),'35.20');assert.equal(E.toPeriodHours('8',{workDays:20}),'32.00');assert.equal(E.toPeriodHours('4.33'),'19.05');
 assert.equal(E.toWeeklyHours('35.2'),'8.00');assert.equal(E.toWeeklyHours('32',{workDays:20}),'8.00');
 assert.equal(E.toPeriodHours(''),null);assert.equal(E.toPeriodHours('later'),null);assert.equal(E.toWeeklyHours(''),null);assert.equal(E.toPeriodHours('169'),null);assert.throws(()=>E.toPeriodHours('8',{workDays:0}),/workdays/);
});
