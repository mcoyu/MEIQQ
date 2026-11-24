const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./planner.js'),S=require('./planner-studio.js'),Ideas=require('./studio.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const current=book=>book.plans.find(plan=>plan.id===book.studio?.planId);
function legacyBook(){const book=P.fresh(),p=P.create(book,{example:true});P.captureBaseline(book,p.id,'2026-11-20');P.duplicate(book,p.id,{date:'2026-11-20'});const legacy=clone(book);legacy.version=1;delete legacy.studio;return legacy;}

test('v1 migration preserves every existing plan and frozen baseline before a separate studio plan is initialized once',()=>{
 const legacy=legacyBook(),original=clone(legacy),migrated=P.parseText(JSON.stringify({format:'meiqq-planner',version:1,planner:legacy}));
 assert.equal(migrated.version,2);assert.equal(migrated.studio,null);assert.deepEqual(migrated.plans,original.plans);assert.deepEqual(legacy,original);
 const studio=S.initialize(migrated);assert.equal(migrated.plans.length,3);assert.equal(studio.id,'plan-3');assert.deepEqual(migrated.plans.slice(0,2),original.plans);
 const initialized=clone(migrated);assert.equal(S.initialize(migrated).id,studio.id);assert.equal(S.open(migrated).id,studio.id);assert.deepEqual(migrated,initialized,'opening the studio twice does not replace edits or seed duplicates');
 assert.deepEqual(P.parseText(P.serialize(migrated)),migrated);assert.equal(P.STORAGE_KEY,'meiqq-planner-v1','migration retains the existing browser key');
});

test('the studio uses conservative four-week capacity and preserves edited values across reopening',()=>{
 const book=P.fresh(),p=S.initialize(book);assert.equal(p.ownerHours,'32');assert.equal(p.nonProjectHours,'6');assert.equal(p.pools[0].hours,'26');
 assert.equal(p.ownerTarget,'2000');assert.equal(p.pools[0].rate,'0');assert.equal(book.studio.ownerWeeklyHours,'8');assert.equal(book.studio.partnerWeeklyHours,'8');
 let m=P.metrics(p);assert.equal(m.owner.budgetHours,23.4);assert.equal(m.pools[0].budgetHours,23.4);assert.equal(m.pools[0].usedHours,24);assert.equal(m.capacityStatus,'overloaded');
 S.update(book,'ownerWeeklyHours','7.5');assert.equal(current(book).ownerHours,'30');
 S.update(book,'partnerWeeklyHours','9');assert.equal(current(book).pools[0].hours,'30');
 S.update(book,'partnerAdminHours','4');assert.equal(current(book).pools[0].hours,'32');
 const saved=clone(book);assert.equal(S.update(book,'partnerAdminHours','4'),false);S.open(book);assert.deepEqual(book,saved);
});

test('unfinished weekly capacity stays editable and never becomes a known feasible budget',()=>{
 const book=P.fresh();S.initialize(book);S.update(book,'ownerWeeklyHours','waiting for calendar');
 assert.equal(book.studio.ownerWeeklyHours,'waiting for calendar');assert.equal(current(book).ownerHours,'');assert.equal(P.metrics(current(book)).owner.budgetHours,null);
 S.update(book,'ownerWeeklyHours','8');S.update(book,'partnerWeeklyHours','');assert.equal(current(book).pools[0].hours,'');assert.equal(P.metrics(current(book)).pools[0].budgetHours,null);
 S.update(book,'partnerWeeklyHours','8');S.update(book,'partnerAdminHours','to confirm');assert.equal(book.studio.partnerAdminHours,'to confirm');assert.equal(current(book).pools[0].hours,'');
 const reopened=P.parseText(P.serialize(book));assert.deepEqual(reopened,book);assert.notEqual(P.metrics(current(reopened)).feasibleAtCurrentVolume,true);
 const original=clone(book);assert.throws(()=>S.update(book,'ownerWeeklyHours',8));assert.throws(()=>S.update(book,'notEditable','5'));assert.deepEqual(book,original);
});

test('partner admin overcommitment remains visible in raw assumptions and cannot yield a feasible result',()=>{
 const book=P.fresh();S.initialize(book);S.update(book,'partnerWeeklyHours','2');S.update(book,'partnerAdminHours','10');
 assert.equal(current(book).pools[0].hours,'-2');assert.equal(book.studio.partnerWeeklyHours,'2');assert.equal(book.studio.partnerAdminHours,'10');
 const m=P.metrics(current(book));assert.equal(m.pools[0].budgetHours,-2);assert.equal(m.capacityStatus,'overloaded');assert.ok(m.issues.some(issue=>issue.path==='pools.0.hours'&&issue.kind==='invalid'));assert.notEqual(m.feasibleAtCurrentVolume,true);
});

test('advanced capacity edits synchronize only canonical weekly controls and leave alternatives independent',()=>{
 const book=P.fresh(),p=S.initialize(book);S.updateField(book,p.id,'ownerHours','40');assert.equal(book.studio.ownerWeeklyHours,'10');
 S.updateField(book,p.id,'pools.0.hours','34');assert.equal(book.studio.partnerWeeklyHours,'10','thirty-four delivery hours plus six admin hours span four weeks');
 const copy=P.duplicate(book,p.id,{date:'2026-11-20'}),meta=clone(book.studio);S.updateField(book,copy.id,'ownerHours','12');S.updateField(book,copy.id,'pools.0.hours','10');assert.deepEqual(book.studio,meta);assert.equal(current(book).ownerHours,'40');
 S.updateField(book,p.id,'ownerHours','pending');assert.equal(book.studio.ownerWeeklyHours,'');assert.equal(current(book).ownerHours,'pending');
});

test('deleting a canonical plan stops automatic recreation and an additive undo restores its metadata and snapshot',()=>{
 const book=P.fresh(),p=S.initialize(book);S.update(book,'ownerWeeklyHours','7');P.captureBaseline(book,p.id,'2026-11-20');const saved=clone(book),baseline=clone(current(book).baseline);
 P.remove(book,p.id);assert.equal(book.studio.planId,null);assert.equal(book.studio.partnerPoolId,null);assert.equal(S.initialize(book),null);assert.equal(book.plans.length,0);
 const restored=P.merge(book,saved);assert.equal(restored.plans.length,1);assert.notEqual(restored.studio.planId,p.id);assert.equal(restored.studio.ownerWeeklyHours,'7');assert.equal(current(restored).ownerHours,'28');assert.deepEqual(current(restored).baseline,baseline);assert.deepEqual(P.validate(restored),restored);
});

test('import and alternative recovery do not steal the existing canonical studio identity',()=>{
 const book=P.fresh(),p=S.initialize(book),copy=P.duplicate(book,p.id,{date:'2026-11-20'}),meta=clone(book.studio);
 const recovery={...clone(book),plans:[clone(copy)],studio:null};P.remove(book,copy.id);const merged=P.merge(book,recovery);assert.deepEqual(merged.studio,meta);assert.equal(merged.plans.length,2);
 const incoming=P.fresh();S.initialize(incoming);S.update(incoming,'ownerWeeklyHours','12');const again=P.merge(merged,incoming);assert.deepEqual(again.studio,meta);assert.equal(current(again).ownerHours,'32');
 const invalid={...clone(recovery),studio:clone(meta)};assert.throws(()=>P.validate(invalid),/missing plan/,'single-plan recovery files cannot retain a different plan reference');
});

test('removing the designated partner pool retains its unresolved work and valid studio metadata',()=>{
 const book=P.fresh(),p=S.initialize(book);P.removePool(book,p.id,'pool-1');assert.equal(book.studio.partnerPoolId,null);assert.equal(current(book).services[0].allocations[0].poolId,'');assert.equal(current(book).services[0].allocations[0].hours,'5');
 assert.deepEqual(P.validate(book),book);const before=clone(book);assert.throws(()=>S.update(book,'partnerWeeklyHours','10'),/partner pool/);assert.deepEqual(book,before,'a failed weekly edit does not partly update the metadata');
});

test('restoring partner capacity uses saved weekly limits without silently reassigning unresolved service work',()=>{
 const book=P.fresh(),p=S.initialize(book);S.update(book,'partnerWeeklyHours','9');S.update(book,'partnerAdminHours','4');P.removePool(book,p.id,'pool-1');
 assert.equal(S.restorePartner(book),true);assert.notEqual(book.studio.partnerPoolId,'pool-1');
 const pool=current(book).pools.find(pool=>pool.id===book.studio.partnerPoolId);assert.equal(pool.hours,'32');assert.equal(pool.rate,'0');
 assert.equal(current(book).services[0].allocations[0].poolId,'','the deleted assignment requires an explicit new choice');
 const saved=clone(book);assert.equal(S.restorePartner(book),false);assert.deepEqual(book,saved);
 S.update(book,'partnerWeeklyHours','10');assert.equal(current(book).pools[0].hours,'36');
 P.removePool(book,p.id,book.studio.partnerPoolId);book.studio.partnerWeeklyHours='awaiting schedule';assert.equal(S.restorePartner(book),true);assert.equal(current(book).pools[0].hours,'');assert.equal(book.studio.partnerWeeklyHours,'awaiting schedule');
});

test('scenario alternatives recompute whole-studio costs and other revenue while preserving the source',()=>{
 const book=P.fresh(),p=S.initialize(book);P.addService(book,p.id,{name:'Second provisional service',unit:'engagement',quantity:'2',setupCount:'0',price:'500',directCost:'50',ownerHours:'1',allocations:[{name:'Partner support',poolId:'pool-1',hours:'2',setupHours:'0'}]});
 const source=clone(current(book)),meta=clone(book.studio),copy=S.tryScenario(book,p.id,'service-1',3,'2026-11-20');
 // Other revenue $1,000. Total direct costs $60+$100; recurring $200.
 // ($2,000 + $400 + $200 + $160 − $1,000) / 3 -> $586.67.
 assert.equal(copy.services[0].quantity,'3');assert.equal(copy.services[0].price,'586.67');assert.equal(copy.services[0].setupCount,'2');assert.deepEqual(copy.services[1],source.services[1]);
 assert.deepEqual(book.studio,meta);assert.deepEqual(current(book).services,source.services);assert.equal(current(book).baseline.key,copy.baseline.key);assert.equal(copy.baseline.snapshot.services[0].price,'600');
 const m=P.metrics(copy);assert.equal(m.pools[0].usedHours,23);assert.equal(m.availableForOwner,240001);assert.equal(m.afterOwnerTarget,40001);assert.equal(m.feasibleAtCurrentVolume,true);
});

test('copying a saved idea uses canonical studio assumptions without changing the idea or duplicating the same revision',()=>{
 const ideas=Ideas.fresh(),idea=Ideas.create(ideas,{name:'New service research',unit:'brief',price:'',roles:[{name:'Specialist',hours:'',setupHours:'',rate:''}]}),original=clone(ideas),book=P.fresh();
 const first=S.fromIdea(book,idea,'2026-11-20');assert.equal(first.added,true);assert.equal(first.planId,book.studio.planId);assert.equal(current(book).services.length,2);
 const saved=clone(book),second=S.fromIdea(book,idea,'2026-11-20');assert.equal(second.added,false);assert.equal(second.serviceId,first.serviceId);assert.deepEqual(book,saved);assert.deepEqual(ideas,original);
 const row=current(book).services.find(service=>service.id===first.serviceId);assert.equal(row.quantity,'');assert.equal(row.allocations[0].poolId,'');assert.equal(row.price,'');
});

test('studio initialization and scenario creation reject plan-limit failures atomically',()=>{
 const template=P.create(P.fresh()),hundred={version:2,nextId:101,plans:Array.from({length:100},(_,i)=>({...clone(template),id:'plan-'+(i+1)})),studio:null},before=clone(hundred);
 assert.throws(()=>S.initialize(hundred),/100 plans/);assert.deepEqual(hundred,before);
 const book=P.fresh(),p=S.initialize(book),row=clone(p);book.plans.push(...Array.from({length:99},(_,i)=>({...clone(row),id:'plan-'+(i+2)})));book.nextId=101;const prior=clone(book);
 assert.throws(()=>S.tryScenario(book,p.id,'service-1',3,'2026-11-20'),/100 plans/);assert.deepEqual(book,prior,'a failed alternative must not capture a new source baseline or insert a partial plan');
});

test('known partner administration overload remains overloaded in generic Results, even with no delivery',()=>{
 const b=P.fresh();S.initialize(b);S.update(b,'partnerWeeklyHours','1');S.update(b,'partnerAdminHours','8');const id=b.studio.planId;P.update(b,id,'services.0.quantity','0');P.update(b,id,'services.0.setupCount','0');const m=P.metrics(b.plans[0]);assert.equal(m.capacityStatus,'overloaded');assert.equal(m.goalFeasible,false);assert.equal(m.maxScale,0);assert.equal(m.pools[0].overHours,4);
});
