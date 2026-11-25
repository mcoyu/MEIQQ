const test=require('node:test'),assert=require('node:assert/strict');
const Ideas=require('./studio.js'),Jobs=require('./jobs.js'),Planner=require('./planner.js'),StudioPlan=require('./planner-studio.js');
const date='2026-11-20';

function service(studio=Ideas.fresh()){
 return Ideas.create(studio,{name:'Menu refresh',scope:'One location',deliverables:'Print-ready menu',price:'450',ownerHours:'3'});
}
function accept(book,job){
 Jobs.updateDraft(book,job.id,{client:'Cafe'});
 Jobs.recordAgreement(book,job.id,{date,reference:'Signed scope'});
}
function work(book,job,hours,kind='owner'){
 return Jobs.postEntry(book,job.id,{type:'work',date,person:'Designer',kind,hours:String(hours)});
}
function deliver(book,job,date){
 return Jobs.postEntry(book,job.id,{type:'delivery',date,description:'Final menu sent'});
}
function finished(book,idea,hours,date){
 const job=Jobs.fromIdea(book,idea);accept(book,job);work(book,job,hours);deliver(book,job,date);return job;
}

test('starting a job copies the full offer into an independent unaccepted draft',()=>{
 const studio=Ideas.fresh(),idea=service(studio),book=Jobs.fresh();
 const job=Jobs.fromIdea(book,idea);
 assert.equal(job.draft.title,idea.name);assert.equal(job.draft.price,'450');
 assert.equal(job.draft.scope,'One location\n\nPrint-ready menu');assert.equal(job.draft.client,'');
 assert.equal(job.mode,'real');assert.equal(job.agreements.length,0);assert.equal(job.entries.length,0);
 accept(book,job);Ideas.update(studio,idea.id,{name:'New name',price:'650',scope:'Two locations'});
 Jobs.updateDraft(book,job.id,{scope:'Two menus'});
 const restored=Jobs.parseText(Jobs.serialize(book)).jobs[0];
 assert.equal(restored.source.name,'Menu refresh');assert.equal(restored.source.ideaVersion,1);
 assert.equal(restored.agreements[0].snapshot.scope,'One location\n\nPrint-ready menu');assert.equal(restored.agreements[0].priceCents,45000);
 assert.equal(studio.offerings[0].scope,'Two locations');
 const longIdea=Ideas.update(studio,idea.id,{scope:'s'.repeat(10000),deliverables:'d'.repeat(10000),price:''});
 const full=Jobs.fromIdea(book,longIdea);assert.equal(full.draft.scope,longIdea.scope+'\n\n'+longIdea.deliverables);assert.equal(full.draft.price,'');
 assert.equal(Jobs.create(book).source,undefined);
});

test('Planner shows the three latest delivered real jobs with recorded owner hours, including corrections and archives',()=>{
 const studio=Ideas.fresh(),idea=service(studio),book=Jobs.fresh();
 const first=finished(book,idea,3,'2026-11-20');finished(book,idea,4,'2026-11-21');
 const archived=finished(book,idea,5,'2026-11-22');Jobs.move(book,archived.id,'archive');
 const latest=finished(book,idea,4,'2026-11-23');work(book,latest,8,'external');
 const extra=work(book,latest,1.5);Jobs.voidEntry(book,latest.id,extra.id,{date,reason:'Duplicate time'});
 const mistaken=deliver(book,first,'2026-11-24');Jobs.voidEntry(book,first.id,mistaken.id,{date:'2026-11-24',reason:'Wrong job'});
 const unagreed=Jobs.fromIdea(book,idea);work(book,unagreed,8);deliver(book,unagreed,'2026-11-24');
 const unfinished=Jobs.fromIdea(book,idea);accept(book,unfinished);work(book,unfinished,8);
 const external=Jobs.fromIdea(book,idea);accept(book,external);work(book,external,7,'external');deliver(book,external,'2026-11-24');
 const corrected=finished(book,idea,12,'2026-11-25');Jobs.voidEntry(book,corrected.id,'entry-2',{date:'2026-11-25',reason:'Delivery withdrawn'});
 const noHours=finished(book,idea,11,'2026-11-25');Jobs.voidEntry(book,noHours.id,'entry-1',{date,reason:'Wrong person'});
 const practice=Jobs.create(book,{mode:'practice',draft:latest.draft,source:{...latest.source,jobKey:Ideas.newLinkKey()}});
 accept(book,practice);work(book,practice,6);deliver(book,practice,'2026-11-25');
 const unrelated=service();assert.equal(unrelated.id,idea.id);finished(book,unrelated,22,'2026-11-25');
 const plan=Planner.fresh(),planId=Planner.create(plan).id,row=Planner.fromIdea(plan,planId,idea,date);
 const copy=structuredClone(plan);
 const actuals=Jobs.recentOwnerHours(book,row.source.ideaKey);
 assert.deepEqual(actuals.map(s=>[s.delivered,s.hours]),[['2026-11-23',4],['2026-11-22',5],['2026-11-21',4]]);
 assert.deepEqual(Jobs.recentOwnerHours(Jobs.merge(book,book),row.source.ideaKey),actuals);
 assert.deepEqual(plan,copy);assert.deepEqual(Jobs.recentOwnerHours(book,undefined),[]);
});

test('stable links survive separate backups, local renumbering and edits while duplicate ideas get independent history',()=>{
 const studio=Ideas.fresh(),idea=service(studio),plans=Planner.fresh(),book=Jobs.fresh();
 const edited=Ideas.update(studio,idea.id,{name:'Revised menu'});assert.equal(edited.linkKey,idea.linkKey);
 const {planId,serviceId}=StudioPlan.fromIdea(plans,edited,date);finished(book,edited,4,date);
 const newStudio=Ideas.fresh();service(newStudio);
 const restored=Ideas.merge(newStudio,Ideas.parseText(Ideas.serialize(studio))),restoredIdea=restored.offerings.at(-1);
 assert.notEqual(restoredIdea.id,edited.id);assert.equal(restoredIdea.version,edited.version);
 const restoredPlans=Planner.parseText(Planner.serialize(plans));
 const again=StudioPlan.fromIdea(restoredPlans,restoredIdea,date);assert.equal(again.planId,planId);assert.equal(again.serviceId,serviceId);assert.equal(again.added,false);
 const imported=Jobs.merge(Jobs.fresh(),Jobs.parseText(Jobs.serialize(book)));
 assert.equal(Jobs.recentOwnerHours(imported,restoredIdea.linkKey).length,1);
 const duplicate=Ideas.duplicate(restored,restoredIdea.id);assert.notEqual(duplicate.linkKey,restoredIdea.linkKey);
 const secondImport=Ideas.merge(restored,studio).offerings.at(-1);assert.deepEqual(Jobs.recentOwnerHours(imported,secondImport.linkKey),[]);
});

test('importing a later Jobs backup adds newly recorded time once and honors subsequent corrections',()=>{
 const idea=service(),drafts=Jobs.fresh(),job=Jobs.fromIdea(drafts,idea),later=structuredClone(drafts);
 accept(later,job);const entry=work(later,job,4);deliver(later,job,date);
 const restored=Jobs.merge(drafts,later);
 assert.deepEqual(Jobs.recentOwnerHours(restored,idea.linkKey).map(s=>s.hours),[4]);
 Jobs.voidEntry(later,job.id,entry.id,{date,reason:'Time logged against the wrong job'});
 const corrected=Jobs.merge(restored,later);
 assert.deepEqual(Jobs.recentOwnerHours(Jobs.merge(corrected,restored),idea.linkKey),[]);
});

test('legacy idea and plan can be linked explicitly without replacing existing edits or a frozen baseline',()=>{
 const studio=Ideas.fresh(),idea=service(studio);delete idea.linkKey;
 const plans=Planner.fresh(),original=StudioPlan.fromIdea(plans,idea,date);
 let plan=plans.plans.find(p=>p.id===original.planId),index=plan.services.findIndex(s=>s.id===original.serviceId);
 Planner.update(plans,plan.id,'services.'+index+'.ownerHours','6');Planner.captureBaseline(plans,plan.id,date);
 const baseline=structuredClone(plans.plans.find(p=>p.id===original.planId).baseline);
 const linked=Ideas.linkIdea(studio,idea.id);assert.equal(linked.version,1);
 const result=StudioPlan.fromIdea(plans,linked,date);assert.equal(result.added,false);assert.equal(result.linked,true);
 plan=Planner.parseText(Planner.serialize(plans)).plans.find(p=>p.id===original.planId);
 assert.equal(plan.services[index].ownerHours,'6');assert.equal(plan.services[index].source.ideaKey,linked.linkKey);assert.deepEqual(plan.baseline,baseline);
 const malformed=structuredClone(studio);malformed.offerings[0].linkKey='broken';assert.throws(()=>Ideas.validate(malformed),/identity/);
});
