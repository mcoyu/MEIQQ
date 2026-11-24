const test=require('node:test'),assert=require('node:assert/strict');
const Jobs=require('./jobs.js'),Session=require('./studio-session.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const scope={title:'Client diagnostic',client:'Example buyer',scope:'One reporting source and one business question',price:'600',estimatedDirectCost:'170',ownerHours:'3',ownerRate:'40',overhead:'30'};
function fixture(mode='real'){const book=Jobs.fresh(),job=Jobs.create(book,{mode,draft:scope});return {book,id:job.id,current:()=>book.jobs.find(v=>v.id===job.id)};}
function agreement(f){Jobs.recordAgreement(f.book,f.id,{date:'2026-11-20',reference:'Written acceptance'});}
function legacy(book){const old=clone(book);old.version=1;for(const job of old.jobs)delete job.location;return {format:'meiqq-jobs',version:1,jobs:old};}
function exceptLocation(job){const {location,...rest}=job;return rest;}

test('v1 backup migration preserves every draft, unfinished form and recorded fact without mutating its source',()=>{
 const f=fixture('practice');agreement(f);Jobs.postEntry(f.book,f.id,{type:'receipt',date:'2026-11-20',amount:'200',reference:'Deposit'});Jobs.setForm(f.book,f.id,'cost',{amount:'not confirmed',supplier:'To check',description:'Pending vendor cost'});
 const old=legacy(f.book),original=JSON.stringify(old),migrated=Jobs.parseText(original);
 assert.equal(migrated.version,2);assert.equal(migrated.jobs[0].location,'active');assert.deepEqual(exceptLocation(migrated.jobs[0]),old.jobs.jobs[0]);assert.equal(JSON.stringify(old),original);
 assert.equal(Jobs.metrics(migrated.jobs[0]).outstanding,40000);assert.equal(migrated.jobs[0].mode,'practice');assert.equal(Jobs.validate(old.jobs).version,2);
 const exported=JSON.parse(Jobs.serialize(migrated));assert.equal(exported.version,2);assert.equal(exported.jobs.version,2);assert.equal(Jobs.STORAGE_KEY,'meiqq-jobs-v1');
});

test('migration rejects version mixtures, v1 location fields and incomplete v2 jobs',()=>{
 const f=fixture(),v1=legacy(f.book),v2=JSON.parse(Jobs.serialize(f.book));
 const mixedEnvelope=clone(v1);mixedEnvelope.version=2;assert.throws(()=>Jobs.parse(mixedEnvelope),/versions must match/);
 const mixedBook=clone(v2);mixedBook.jobs.version=1;assert.throws(()=>Jobs.parse(mixedBook),/versions must match/);
 const disguised=clone(v1);disguised.jobs.jobs[0].location='trash';assert.throws(()=>Jobs.parse(disguised),/unsupported structure/);
 const missing=clone(v2);delete missing.jobs.jobs[0].location;assert.throws(()=>Jobs.parse(missing),/unsupported structure/);
 const invalid=clone(v2);invalid.jobs.jobs[0].location='deleted';assert.throws(()=>Jobs.parse(invalid),/location/);
 const future=clone(v2);future.version=3;future.jobs.version=3;assert.throws(()=>Jobs.parse(future),/supported Jobs/);
});

test('moving an unposted draft to Trash and restoring keeps its ID, working notes and unfinished payment input',()=>{
 const f=fixture();Jobs.updateDraft(f.book,f.id,{price:'price to discuss',nextAction:'Review source file'});Jobs.setForm(f.book,f.id,'receipt',{date:'2026-11-20',amount:'20.',reference:'Unposted note'});
 const before=clone(f.current());assert.equal(Jobs.canTrash(f.current()),true);Jobs.move(f.book,f.id,'trash');
 assert.equal(f.current().location,'trash');assert.equal(f.book.jobs.length,1);assert.deepEqual(exceptLocation(f.current()),exceptLocation(before));
 const next=Jobs.create(f.book,{draft:{title:'Another job'}});assert.notEqual(next.id,f.id);assert.equal(next.location,'active');
 Jobs.move(f.book,f.id,'active');assert.equal(f.current().id,before.id);assert.deepEqual(f.current(),before);
});

test('recorded jobs cannot be trashed even when their derived status says draft or all entries are voided',()=>{
 const f=fixture(),entry=Jobs.postEntry(f.book,f.id,{type:'cost',date:'2026-11-20',amount:'20',supplier:'Software vendor',description:'Research tool'});
 assert.equal(Jobs.metrics(f.current()).status,'draft');assert.equal(Jobs.canTrash(f.current()),false);const before=Jobs.serialize(f.book);
 assert.throws(()=>Jobs.move(f.book,f.id,'trash'),/recorded history/);assert.equal(Jobs.serialize(f.book),before);
 Jobs.voidEntry(f.book,f.id,entry.id,{date:'2026-11-20',reason:'Duplicate cost record'});assert.equal(Jobs.metrics(f.current()).hasActualEntries,false);assert.equal(Jobs.canTrash(f.current()),false);assert.throws(()=>Jobs.move(f.book,f.id,'trash'),/recorded history/);
 Jobs.move(f.book,f.id,'archive');assert.equal(f.current().location,'archive');assert.equal(f.current().entries.length,2);
 const agreed=fixture();agreement(agreed);assert.equal(Jobs.canTrash(agreed.current()),false);assert.throws(()=>Jobs.move(agreed.book,agreed.id,'trash'),/recorded history/);
});

test('archiving and restoring a recorded job preserve accepted terms, history and financial totals',()=>{
 const f=fixture();agreement(f);Jobs.postEntry(f.book,f.id,{type:'receipt',date:'2026-11-20',amount:'200',reference:'Deposit'});const before=clone(f.current()),totals=Jobs.metrics(f.current());
 Jobs.move(f.book,f.id,'archive');assert.equal(f.current().location,'archive');assert.deepEqual(Jobs.metrics(f.current()),totals);assert.deepEqual(exceptLocation(f.current()),exceptLocation(before));
 Jobs.move(f.book,f.id,'active');assert.deepEqual(f.current(),before);
 const unrecorded=fixture();assert.throws(()=>Jobs.move(unrecorded.book,unrecorded.id,'archive'),/Unrecorded drafts/);
});

test('hidden jobs reject every editing or posting action until explicitly restored',()=>{
 for(const location of ['trash','archive']){
  const f=fixture();if(location==='archive')agreement(f);Jobs.move(f.book,f.id,location);const before=Jobs.serialize(f.book);
  const actions=[()=>Jobs.updateDraft(f.book,f.id,{title:'Hidden edit'}),()=>Jobs.setForm(f.book,f.id,'receipt',{amount:'100'}),()=>Jobs.recordAgreement(f.book,f.id,{date:'2026-11-20',reason:'Hidden amendment'}),()=>Jobs.postEntry(f.book,f.id,{type:'receipt',date:'2026-11-20',amount:'100',reference:''}),()=>Jobs.voidEntry(f.book,f.id,'entry-1',{date:'2026-11-20',reason:'Hidden correction'})];
  for(const action of actions){assert.throws(action,/Restore this job/);assert.equal(Jobs.serialize(f.book),before);}
  assert.throws(()=>Jobs.move(f.book,f.id,location==='trash'?'archive':'trash'),/Restore this job/);assert.equal(Jobs.serialize(f.book),before);
  Jobs.move(f.book,f.id,'active');Jobs.updateDraft(f.book,f.id,{nextAction:'Resumed work'});assert.equal(f.current().draft.nextAction,'Resumed work');
 }
});

test('strict imports cannot conceal recorded history in Trash or mark an empty draft as Archive',()=>{
 const f=fixture();agreement(f);const bad=JSON.parse(Jobs.serialize(f.book));bad.jobs.jobs[0].location='trash';assert.throws(()=>Jobs.parse(bad),/recorded history/);
 const blank=fixture(),archived=JSON.parse(Jobs.serialize(blank.book));archived.jobs.jobs[0].location='archive';assert.throws(()=>Jobs.parse(archived),/Unrecorded drafts/);
});

test('backup and merge retain Trash, Archive, internal references and practice identity',()=>{
 const f=fixture('practice');Jobs.setForm(f.book,f.id,'receipt',{amount:'200'});Jobs.move(f.book,f.id,'trash');
 const recorded=Jobs.create(f.book,{draft:scope});Jobs.recordAgreement(f.book,recorded.id,{date:'2026-11-20',reference:'Accepted'});const cost=Jobs.postEntry(f.book,recorded.id,{type:'cost',date:'2026-11-20',amount:'20',supplier:'Supplier',description:'Recorded cost'});Jobs.postEntry(f.book,recorded.id,{type:'cost-payment',date:'2026-11-20',costId:cost.id,amount:'20',reference:'Payment'});Jobs.move(f.book,recorded.id,'archive');
 const restored=Jobs.parseText(Jobs.serialize(f.book)),before=Jobs.serialize(f.book),merged=Jobs.merge(f.book,restored);
 assert.equal(Jobs.serialize(f.book),before);assert.deepEqual(merged.jobs.map(v=>v.location),['trash','archive','trash','archive']);assert.equal(new Set(merged.jobs.map(v=>v.id)).size,4);
 assert.equal(merged.jobs[2].mode,'practice');assert.equal(merged.jobs[2].forms.receipt.amount,'200');assert.equal(merged.jobs[3].entries[1].costId,merged.jobs[3].entries[0].id);assert.equal(Jobs.metrics(merged.jobs[3]).paidCosts,2000);
 assert.deepEqual(Jobs.parseText(Jobs.serialize(merged)),merged);
});

test('existing browser saves upgrade through the same key and retain recoverable drafts across reload',async()=>{
 const f=fixture();Jobs.setForm(f.book,f.id,'work',{hours:'unfinished',person:'Partner'});const original=JSON.stringify(legacy(f.book));
 const values=new Map([[Jobs.STORAGE_KEY,original]]),local={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const session=Session.create({model:Jobs,label:'Jobs',local});await session.open();assert.equal(session.data.version,2);assert.equal(session.data.jobs[0].location,'active');
 Jobs.move(session.data,f.id,'trash');session.changed();assert.equal(await session.flush(),true);const saved=JSON.parse(values.get(Jobs.STORAGE_KEY));assert.equal(saved.version,2);assert.equal(saved.jobs.jobs[0].location,'trash');assert.equal(values.size,1);
 const reopened=Session.create({model:Jobs,label:'Jobs',local});await reopened.open();assert.equal(reopened.data.jobs[0].forms.work.hours,'unfinished');assert.equal(reopened.data.jobs[0].location,'trash');Jobs.move(reopened.data,f.id,'active');reopened.changed();assert.equal(await reopened.flush(),true);assert.equal(Jobs.parseText(values.get(Jobs.STORAGE_KEY)).jobs[0].location,'active');assert.equal(legacy(f.book).jobs.jobs[0].forms.work.person,'Partner');
});
