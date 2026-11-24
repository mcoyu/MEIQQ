const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs'),P=require('./planner.js');
const run=(h,s)=>vm.runInContext(s,h.ctx);
async function open(initial,options){const h=setup(initial,options);await run(h,'Promise.all([appReady,studioReady,jobsReady,plannerReady])');h.click('view',{view:'planner'});return h;}
const edit=(h,field,value,studio=false)=>h.handlers.input({target:{dataset:{[studio?'plannerStudio':'plannerField']:field,planId:run(h,'plannerController.ui.selectedId')},value}});

test('packaged app opens native studio assumptions without an import and saves live edits across reload',async()=>{
 const h=await open(undefined,{built:true});const initial=run(h,'JSON.stringify([studioSession.data,jobsSession.data,currentWorkspace()])');
 assert.equal(run(h,'plannerController.ui.tab'),'earnings');assert.match(h.elements['#root'].innerHTML,/type="range"/);
 assert.equal(run(h,'plannerSession.data.plans[0].ownerTarget'),'2000');
 assert.equal(run(h,'plannerSession.data.studio.ownerWeeklyHours'),'8');assert.equal(run(h,'plannerSession.data.studio.partnerWeeklyHours'),'8');
 edit(h,'ownerTarget','2100');edit(h,'ownerWeeklyHours','7.5',true);edit(h,'partnerAdminHours','8',true);edit(h,'services.0.price','670');edit(h,'services.0.allocations.0.hours','4.5');
 assert.equal(run(h,'plannerSession.data.plans[0].ownerHours'),'30');assert.equal(run(h,'plannerSession.data.plans[0].pools[0].hours'),'24');
 assert.equal(run(h,'QQPlanner.metrics(plannerSession.data.plans[0]).availableForOwner'),240000);
 assert.equal(run(h,'QQPlanner.metrics(plannerSession.data.plans[0]).capacityStatus'),'overloaded');
 h.drainTimers();await run(h,'plannerSession.flush()');const before=run(h,'JSON.stringify(plannerSession.data)');
 const re=await open([...h.storage],{built:true});assert.equal(run(re,'JSON.stringify(plannerSession.data)'),before);
 assert.equal(run(h,'JSON.stringify([studioSession.data,jobsSession.data,currentWorkspace()])'),initial);
});

test('an existing v1 browser workspace gains the native studio plan once, retaining old plans and baselines',async()=>{
 const b=P.fresh(),p=P.create(b,{example:true});P.captureBaseline(b,p.id,'2026-11-20');const old=JSON.stringify(b.plans);delete b.studio;b.version=1;
 const raw=JSON.stringify({format:P.FORMAT,version:1,planner:b}),h=await open([[P.STORAGE_KEY,raw]]);
 assert.equal(run(h,'JSON.stringify(plannerSession.data.plans.slice(0,1))'),old);assert.equal(run(h,'plannerSession.data.plans.length'),2);assert.equal(run(h,'plannerController.ui.selectedId'),run(h,'plannerSession.data.studio.planId'));
 h.drainTimers();await run(h,'plannerSession.flush()');const re=await open([...h.storage]);assert.equal(run(re,'plannerSession.data.plans.length'),2);
});

test('trying a price option creates an independent baseline-preserving alternative and undo still works',async()=>{
 const h=await open();const before=run(h,'JSON.stringify(QQPlanner.metrics(plannerSession.data.plans[0]))');
 h.click('planner-try-scenario',{serviceId:'service-1',quantity:'3',price:'1'});
 assert.equal(run(h,'plannerSession.data.plans.length'),2);assert.equal(run(h,'plannerSession.data.plans[1].services[0].price'),'886.67','recompute rather than trust stale button values');
 assert.equal(run(h,'QQPlanner.metrics(plannerSession.data.plans[1]).feasibleAtCurrentVolume'),true);
 assert.equal(run(h,'JSON.stringify(QQPlanner.metrics(plannerSession.data.plans[0]))'),before);
 const baseline=run(h,'JSON.stringify(plannerSession.data.plans[1].baseline)');h.click('planner-delete');h.click('planner-confirm-delete');h.click('planner-undo-delete');
 assert.equal(run(h,'JSON.stringify(plannerSession.data.plans.at(-1).baseline)'),baseline);assert.equal(run(h,'plannerSession.data.studio.planId'),'plan-1');
});

test('Studio ideas flow directly into the studio mix without duplicating repeated clicks or rewriting their sources',async()=>{
 const h=await open();const ideas=run(h,'JSON.stringify(studioSession.data)'),id=run(h,'studioSession.data.offerings[0].id');
 h.click('view',{view:'studio'});assert.match(h.elements['#root'].innerHTML,/Plan this idea/);h.click('studio-plan',{id});
 assert.equal(run(h,'view'),'planner');assert.equal(run(h,'plannerController.ui.tab'),'mix');assert.equal(run(h,'plannerSession.data.plans[0].services.length'),2);
 assert.equal(run(h,'plannerSession.data.plans[0].services[1].quantity'),'');assert.equal(run(h,'plannerSession.data.plans[0].services[1].allocations[0].poolId'),'');
 h.click('studio-plan',{id});assert.equal(run(h,'plannerSession.data.plans[0].services.length'),2);assert.equal(run(h,'JSON.stringify(studioSession.data)'),ideas);
});

test('incomplete weekly inputs stay editable and deleted partner capacity can be restored without inventing mappings',async()=>{
 const h=await open();edit(h,'partnerWeeklyHours','',true);
 assert.equal(run(h,'plannerSession.data.plans[0].pools[0].hours'),'');assert.match(h.elements['#root'].innerHTML,/Enter an estimate above/);assert.doesNotMatch(h.elements['#root'].innerHTML,/NaN/);
 edit(h,'partnerWeeklyHours','8',true);h.click('planner-pool-remove',{index:'0'});assert.equal(run(h,'plannerSession.data.studio.partnerPoolId'),null);
 h.click('planner-partner-restore');assert.equal(run(h,'plannerSession.data.plans[0].pools[0].hours'),'26');assert.equal(run(h,'plannerSession.data.plans[0].services[0].allocations[0].poolId'),'');
});
