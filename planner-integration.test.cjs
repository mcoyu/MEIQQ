const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const run=(host,code)=>vm.runInContext(code,host.ctx);
async function open(initial,options){const host=setup(initial,options);await run(host,'Promise.all([appReady,studioReady,jobsReady,plannerReady])');host.click('view',{view:'planner'});return host;}
function edit(host,path,value,id){host.handlers.input({target:{dataset:{plannerField:path,planId:id||run(host,'plannerController.ui.selectedId')},value:String(value)}});}

test('offline planner actions preserve other domains, raw unknowns, dated alternatives and backups through reload',async()=>{
 const h=await open();
 const unrelated=run(h,'JSON.stringify([currentWorkspace(),studioSession.data,jobsSession.data])');
 assert.match(h.elements['#root'].innerHTML,/Studio capacity and earnings/);
 h.click('planner-example');const example=run(h,'plannerController.ui.selectedId');
 h.click('planner-example');assert.equal(run(h,'plannerSession.data.plans.length'),2,'example opens existing copy');
 h.click('planner-tab',{tab:'mix'});edit(h,'services.0.price','awaiting customer research');
 h.click('planner-tab',{tab:'results'});assert.match(h.elements['#root'].innerHTML,/unknown|invalid|Missing/i);assert.ok(!h.elements['#root'].innerHTML.includes('NaN'));
 edit(h,'services.0.price','600');h.click('planner-capture');h.elements['#planner-baseline-date']={value:'2026-11-20'};h.click('planner-confirm-capture');
 const baseline=run(h,'JSON.stringify(plannerSession.data.plans.find(p=>p.id===plannerController.ui.selectedId).baseline)');
 h.click('planner-duplicate');const alternative=run(h,'plannerController.ui.selectedId');edit(h,'services.0.quantity','6');
 assert.equal(run(h,'JSON.stringify(plannerSession.data.plans.find(p=>p.id===plannerController.ui.selectedId).baseline)'),baseline);
 assert.notEqual(alternative,example);
 h.click('planner-tab',{tab:'compare'});h.click('planner-compare',{id:alternative});
 assert.match(h.elements['#root'].innerHTML,/changed assumption/);
 h.click('planner-backup');const downloaded=h.downloads.at(-1);assert.equal(downloaded.download,'MEIQQ-Planner.json');const text=await(await fetch(downloaded.href)).text();
 h.ctx.backupText=text;const before=run(h,'JSON.stringify(plannerSession.data)');assert.equal(run(h,'JSON.stringify(QQPlanner.parseText(backupText))'),before);
 h.drainTimers();await run(h,'plannerSession.flush()');
 const reopened=await open([...h.storage]);assert.equal(run(reopened,'JSON.stringify(plannerSession.data)'),before);
 assert.equal(run(reopened,'plannerController.ui.tab'),'compare');assert.equal(run(reopened,'plannerController.ui.selectedId'),alternative);
 assert.equal(run(h,'JSON.stringify([currentWorkspace(),studioSession.data,jobsSession.data])'),unrelated);
 run(h,'plannerController.previewImport(backupText)');h.click('planner-confirm-import');assert.equal(run(h,'plannerSession.data.plans.length'),6);
 assert.equal(run(h,'JSON.stringify(plannerSession.data.plans.at(-1).baseline)'),baseline);
});

test('deleting the final plan can be cancelled and undone with its entire baseline intact',async()=>{
 const h=await open();edit(h,'name','Draft capacity plan');h.click('planner-capture');h.elements['#planner-baseline-date']={value:'2026-11-20'};h.click('planner-confirm-capture');
 const baseline=run(h,'JSON.stringify(plannerSession.data.plans[0].baseline)');h.click('planner-delete');h.click('close');assert.equal(run(h,'plannerSession.data.plans.length'),1);
 h.click('planner-delete');h.click('planner-confirm-delete');assert.equal(run(h,'plannerSession.data.plans.length'),0);assert.match(h.elements['#root'].innerHTML,/Undo deletion/);
 h.click('planner-undo-delete');assert.equal(run(h,'plannerSession.data.plans.length'),1);assert.equal(run(h,'JSON.stringify(plannerSession.data.plans[0].baseline)'),baseline);
});

test('row actions and copied ideas use explicit pool mapping without changing source records',async()=>{
 const h=await open();run(h,"{const b=plannerSession.data;QQPlanner.removeService(b,b.plans[0].id,b.plans[0].services[0].id);}");const original=run(h,'JSON.stringify(studioSession.data)');h.click('planner-pool-add');h.click('planner-tab',{tab:'mix'});
 const idea=run(h,'studioSession.data.offerings[0].id');h.handlers.change({target:{dataset:{plannerIdea:''},value:idea}});h.click('planner-idea-add',{ideaId:idea});
 assert.equal(run(h,'plannerSession.data.plans[0].services.length'),1);assert.equal(run(h,'plannerSession.data.plans[0].services[0].allocations[0].poolId'),'');
 const sid=run(h,'plannerSession.data.plans[0].services[0].id'),roleCount=run(h,'plannerSession.data.plans[0].services[0].allocations.length');h.click('planner-allocation-add',{serviceId:sid});assert.equal(run(h,'plannerSession.data.plans[0].services[0].allocations.length'),roleCount+1);
 h.click('planner-allocation-remove',{serviceId:sid,index:'1'});h.click('planner-pool-remove',{index:'0'});h.click('planner-service-remove',{index:'0'});
 assert.equal(run(h,'plannerSession.data.plans[0].services.length'),0);assert.equal(run(h,'JSON.stringify(studioSession.data)'),original);
});

test('reviewed simulator copy preserves the active run, earlier draft, planner baseline and source record',async()=>{
 const h=await open();
 run(h,`{const b=plannerSession.data,p=b.plans[0];QQPlanner.removeService(b,p.id,p.services[0].id);for(const [k,v]of Object.entries({name:'Review-only service',ownerHours:'40',nonProjectHours:'4',bufferPct:'10',ownerTarget:'1000',profitTarget:'200'}))QQPlanner.update(b,p.id,k,v);QQPlanner.update(b,p.id,'expenses.0.amount','100');QQPlanner.addService(b,p.id,{name:'Owner consultation',unit:'one consultation',quantity:'4',setupCount:'0',price:'500',directCost:'0',setupCost:'0',ownerHours:'2',setupOwnerHours:'0'});QQPlanner.captureBaseline(b,p.id,'2026-11-20');}`);
 const current=run(h,'JSON.stringify(currentWorkspace())'),planner=run(h,'JSON.stringify(plannerSession.data)'),active=run(h,'JSON.stringify(state)');
 h.click('planner-bridge');assert.match(h.elements['#modal'].innerHTML,/do not guarantee sales/);assert.match(h.elements['#modal'].innerHTML,/Copy to simulator draft/);
 h.click('planner-confirm-bridge');assert.equal(run(h,'JSON.stringify(currentWorkspace())'),current,'empty demand/cash assumptions cannot create a copy');
 for(const [key,value]of Object.entries({startingCash:'2000',inquiries:'6',conversion:'75',deposit:'50',approvalDays:'2',paymentDays:'5',leadDays:'14',seed:'2417'}))h.handlers.input({target:{dataset:{plannerBridge:key},value}});
 h.click('planner-confirm-bridge');assert.equal(run(h,'view'),'setup');assert.equal(run(h,'JSON.stringify(state)'),active);assert.equal(run(h,'JSON.stringify(plannerSession.data)'),planner);
 assert.equal(run(h,'JSON.stringify(archives.at(-1).workspace)'),current);assert.equal(run(h,'draft.services[0].review'),2);assert.equal(run(h,'draft.inquiries'),6);assert.equal(run(h,'draft.conversion'),0.75);
 assert.equal(run(h,'draft.ownerTarget'),0);assert.equal(run(h,'QQ.configIssues(draft).length'),0);
 const reopened=run(h,'MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives))');assert.equal(JSON.parse(reopened.recoveryFiles.at(-1).text).format,'meiqq-planner-scenario-source');assert.equal(reopened.archives.length,1);
});

test('new, reopened example and restored plans compare their own current assumptions by default',async()=>{
 const h=await open();
 h.click('planner-example');const example=run(h,'plannerController.ui.selectedId');
 h.click('planner-add');const blank=run(h,'plannerController.ui.selectedId');
 assert.notEqual(blank,example);assert.equal(run(h,'plannerController.ui.compareId'),blank);
 h.click('planner-capture');h.elements['#planner-baseline-date']={value:'2026-11-20'};h.click('planner-confirm-capture');h.click('planner-tab',{tab:'compare'});
 assert.doesNotMatch(h.elements['#root'].innerHTML,/Different baseline:/);
 h.click('planner-example');assert.equal(run(h,'plannerController.ui.compareId'),example);
 h.click('planner-delete');h.click('planner-confirm-delete');h.click('planner-undo-delete');assert.equal(run(h,'plannerController.ui.compareId'),run(h,'plannerController.ui.selectedId'));
});

test('planner save failures retain editable data with a warning and downloadable backup',async()=>{
 const h=await open(undefined,{failWrites:true});edit(h,'name','Keep this local draft');h.drainTimers();await run(h,'plannerSession.flush()');
 assert.equal(run(h,'plannerSession.status'),'error');assert.equal(run(h,'plannerSession.data.plans[0].name'),'Keep this local draft');h.click('planner-backup');assert.equal(h.downloads.at(-1).download,'MEIQQ-Planner.json');
});
