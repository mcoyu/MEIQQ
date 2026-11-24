const test=require('node:test'),assert=require('node:assert/strict');
const Planner=require('./planner.js'),Studio=require('./studio.js');

const snapshot=value=>JSON.stringify(value);
const planAt=(book,id)=>book.plans.find(plan=>plan.id===id);

function diagnosticPlan(){
 const ideas=Studio.fresh(),idea=Studio.create(ideas,{
  name:'Possible analytics diagnostic',unit:'One source, one period and one business question',
  buyer:'A possible small-business client',scope:'A checked findings brief and one review call.',
  price:'600',directCost:'20',setupCost:'0',ownerHours:'3',setupOwnerHours:'1',
  ownerRate:'40',overhead:'30',scenarioQuantity:'99',
  roles:[{name:'Analyst',hours:'5',setupHours:'2',rate:'30'}]
 });
 const sourceBefore=snapshot(ideas),book=Planner.fresh(),created=Planner.create(book),id=created.id;
 for(const [path,value]of Object.entries({ownerHours:'24',nonProjectHours:'6',bufferPct:'0',ownerTarget:'1000',profitTarget:'400'}))Planner.update(book,id,path,value);
 const analyst=Planner.addPool(book,id,{name:'Analyst',hours:'24',rate:'30'});
 // Replace placeholder expenses explicitly rather than treating unknown rows as zero.
 for(const expense of [...planAt(book,id).expenses])Planner.removeExpense(book,id,expense.id);
 Planner.addExpense(book,id,{name:'Studio software and recurring expenses',amount:'200'});
 Planner.fromIdea(book,id,idea,'2026-11-20');
 // A copied idea does not silently supply the plan's sales volume or shared pool.
 assert.equal(planAt(book,id).services[0].quantity,'');
 assert.equal(planAt(book,id).services[0].setupCount,'');
 assert.equal(planAt(book,id).services[0].allocations[0].poolId,'');
 Planner.update(book,id,'services.0.quantity','4');
 Planner.update(book,id,'services.0.setupCount','2');
 Planner.update(book,id,'services.0.allocations.0.poolId',analyst.id);
 assert.equal(snapshot(ideas),sourceBefore,'copying an idea cannot change its scope, status, rates or research');
 return {book,id,ideas,ideaId:idea.id,current:()=>planAt(book,id)};
}

test('Task 2 compares a sustainable arithmetic baseline, an overloaded sales plan and a capacity alternative from one preserved source',()=>{
 const f=diagnosticPlan(),m=Planner.metrics(f.current());
 assert.equal(m.quantityTotal,4);
 assert.equal(m.revenue,240000);
 assert.equal(m.externalLaborCosts,72000,'twenty-four analyst hours include setup twice');
 assert.equal(m.directCosts,8000,'other direct spending is four deliveries at $20');
 assert.equal(m.externalCosts,80000);
 assert.equal(m.recurringCosts,20000,'shared studio expenses are deducted once');
 assert.equal(m.contribution,160000);
 assert.equal(m.availableForOwner,140000,'per-idea overhead and hourly owner allowances are not charged again');
 assert.equal(m.ownerTarget,100000);
 assert.equal(m.profitTarget,40000);
 assert.equal(m.afterOwnerTarget,40000);
 assert.equal(m.targetGap,0);
 assert.equal(m.owner.usedHours,14);
 assert.equal(m.owner.budgetHours,18);
 assert.equal(m.ownerTotalHours,20,'owner project work and six nonproject hours are counted once');
 assert.equal(m.pools[0].usedHours,24);
 assert.equal(m.capacityStatus,'within');
 assert.equal(m.feasibleAtCurrentVolume,true);

 Planner.captureBaseline(f.book,f.id,'2026-11-20');
 const baseline=snapshot(f.current().baseline),base=snapshot(f.current());
 const moreSales=Planner.duplicate(f.book,f.id,{date:'2026-11-20'});
 const moreCapacity=Planner.duplicate(f.book,f.id,{date:'2026-11-20'});
 const copy=id=>planAt(f.book,id);
 assert.equal(snapshot(copy(moreSales.id).baseline),baseline);
 assert.equal(snapshot(copy(moreCapacity.id).baseline),baseline);
 Planner.update(f.book,moreSales.id,'services.0.quantity','6');
 const constrained=Planner.metrics(copy(moreSales.id));
 assert.equal(constrained.revenue,360000);
 assert.equal(constrained.externalCosts,114000);
 assert.equal(constrained.afterOwnerTarget,126000);
 assert.equal(constrained.owner.overHours,2);
 assert.equal(constrained.pools[0].overHours,10);
 assert.equal(constrained.capacityStatus,'overloaded');
 assert.equal(constrained.feasibleAtCurrentVolume,false,'larger projected earnings do not make an overloaded plan feasible');

 Planner.update(f.book,moreCapacity.id,'services.0.quantity','6');
 Planner.update(f.book,moreCapacity.id,'pools.0.hours','34');
 Planner.update(f.book,moreCapacity.id,'ownerHours','26');
 const expanded=Planner.metrics(copy(moreCapacity.id));
 assert.equal(expanded.afterOwnerTarget,126000);
 assert.equal(expanded.owner.usedHours,20);
 assert.equal(expanded.ownerTotalHours,26);
 assert.equal(expanded.owner.overHours,0);
 assert.equal(expanded.pools[0].overHours,0);
 assert.equal(expanded.capacityStatus,'within');
 assert.equal(expanded.feasibleAtCurrentVolume,true);
 assert.equal(snapshot(f.current()),base,'alternatives cannot rewrite the baseline working plan');
 assert.equal(snapshot(copy(moreSales.id).baseline),baseline);
 assert.equal(snapshot(copy(moreCapacity.id).baseline),baseline);

 const allPlansBefore=snapshot(f.book);
 Studio.setField(f.ideas,f.ideaId,'price','900');
 Studio.setField(f.ideas,f.ideaId,'roles.0.hours','8');
 assert.equal(snapshot(f.book),allPlansBefore,'later source-idea edits cannot rewrite reviewed planning copies');
 const alternativeBefore=snapshot(copy(moreCapacity.id));
 Planner.update(f.book,f.id,'services.0.price','650');
 assert.equal(snapshot(f.current().baseline),baseline,'editing the working plan does not revise its captured source');
 assert.equal(snapshot(copy(moreCapacity.id)),alternativeBefore);

 const reopened=Planner.parseText(Planner.serialize(f.book));
 assert.deepEqual(reopened,f.book,'backup retains all alternatives, copied service context and raw assumptions');
 assert.deepEqual(Planner.metrics(planAt(reopened,moreSales.id)),constrained);
 assert.deepEqual(Planner.metrics(planAt(reopened,moreCapacity.id)),expanded);
});

test('an unfinished planning rate survives reopen without inventing earnings or hiding known workload',()=>{
 const f=diagnosticPlan();
 Planner.update(f.book,f.id,'pools.0.rate','');
 let m=Planner.metrics(f.current());
 assert.equal(m.revenue,240000,'known sales arithmetic remains available');
 assert.equal(m.pools[0].usedHours,24,'a missing rate does not erase known work');
 assert.equal(m.owner.usedHours,14);
 assert.equal(m.externalLaborCosts,null);
 assert.equal(m.availableForOwner,null);
 assert.equal(m.afterOwnerTarget,null);
 assert.ok(m.issues.some(issue=>issue.path==='pools.0.rate'&&issue.kind==='unknown'));
 Planner.update(f.book,f.id,'pools.0.rate','awaiting supplier quote');
 const reopened=Planner.parseText(Planner.serialize(f.book));
 assert.equal(planAt(reopened,f.id).pools[0].rate,'awaiting supplier quote');
 assert.equal(Planner.metrics(planAt(reopened,f.id)).availableForOwner,null);

 Planner.update(reopened,f.id,'pools.0.rate','30');
 Planner.update(reopened,f.id,'ownerHours','');
 m=Planner.metrics(planAt(reopened,f.id));
 assert.equal(m.availableForOwner,140000);
 assert.equal(m.capacityStatus,'unknown');
 assert.equal(m.feasibleAtCurrentVolume,null,'earnings arithmetic cannot establish feasibility while owner capacity is unknown');
 assert.equal(f.ideas.offerings[0].roles[0].rate,'30','working on planner assumptions does not edit the source idea');
});
