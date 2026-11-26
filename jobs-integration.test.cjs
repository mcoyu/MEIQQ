const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs'),{database}=require('./storage-test-host.cjs');
const Jobs=require('./jobs.js'),Session=require('./studio-session.js');
const get=(h,source)=>vm.runInContext(source,h.ctx);
function edit(h,field,value,type){h.handlers.input({target:{id:'jobs-test-'+field,tagName:'INPUT',value,dataset:type?{jobsDraft:field,entryType:type,jobId:get(h,'jobsController.ui.selectedId')}:{jobsField:field,jobId:get(h,'jobsController.ui.selectedId')}}});}
function post(h,type,fields){h.click('jobs-today',{type});for(const [key,value]of Object.entries(fields))edit(h,key,value,type);h.click('jobs-post',{type});}
test('backdated refunds cannot spend a later receipt, and the latest handoff uses its event date',async()=>{
 const h=setup();await get(h,'jobsReady');h.click('view',{view:'jobs'});h.click('jobs-practice');
 h.click('jobs-tab',{tab:'money'});h.click('jobs-form',{type:'receipt'});
 post(h,'receipt',{date:'2026-11-25',amount:'100'});
 h.click('jobs-form',{type:'refund'});post(h,'refund',{date:'2026-11-20',amount:'100'});
 assert.match(h.elements['#root'].innerHTML,/Refunds cannot exceed customer receipts available on 2026-11-20/);
 assert.equal(get(h,'jobsSession.data.jobs[0].entries.length'),1);
 assert.equal(get(h,'jobsSession.data.jobs[0].forms.refund.amount'),'100');
 edit(h,'date','2026-11-25','refund');h.click('jobs-post',{type:'refund'});
 assert.equal(get(h,'QQJobs.metrics(jobsSession.data.jobs[0]).jobCash'),0);
 h.click('jobs-tab',{tab:'work'});
 for(const type of ['delivery','approval']){
  h.click('jobs-form',{type});
  for(const date of ['2026-11-24','2026-11-21'])post(h,type,{date,reference:'Dated handoff'});
 }
 await get(h,'jobsSession.flush()');
 const reopened=setup([...h.storage]);await get(reopened,'jobsReady');reopened.click('view',{view:'jobs'});reopened.click('jobs-tab',{tab:'overview'});
 for(const label of ['Latest delivery','Latest approval']){
  assert.ok(reopened.elements['#root'].innerHTML.includes(label+'</dt><dd>2026-11-24</dd>'));
 }
});
test('packaged Jobs flow posts only explicit actions, survives reopening and keeps all three domains separate',async()=>{
 const h=setup(undefined,{built:true});await get(h,'Promise.all([jobsReady,studioReady,appReady])');
 const simulator=get(h,'JSON.stringify(currentWorkspace())'),ideas=get(h,'QQStudio.serialize(studioSession.data)');
 h.click('view',{view:'jobs'});assert.doesNotMatch(h.elements['#root'].innerHTML,/data-action="play"|Branch scenario/);assert.equal(get(h,'jobsSession.data.jobs.length'),0);
 h.click('jobs-practice');assert.equal(get(h,'jobsSession.data.jobs[0].mode'),'practice');assert.equal(get(h,'jobsSession.data.jobs[0].entries.length'),0);
 h.click('jobs-today',{type:'agreement'});h.click('jobs-post',{type:'agreement'});assert.equal(get(h,'jobsSession.data.jobs[0].agreements.length'),1);
 edit(h,'price','700');assert.equal(get(h,'QQJobs.metrics(jobsSession.data.jobs[0]).acceptedPrice'),60000);
 edit(h,'price','600');h.click('jobs-tab',{tab:'money'});edit(h,'amount','200','receipt');h.click('jobs-today',{type:'receipt'});assert.equal(get(h,'QQJobs.metrics(jobsSession.data.jobs[0]).received'),0);
 await get(h,'jobsSession.flush()');const r=setup([...h.storage],{built:true});await get(r,'jobsReady');r.click('view',{view:'jobs'});
 assert.equal(get(r,'jobsSession.data.jobs[0].forms.receipt.amount'),'200');assert.equal(get(r,'jobsSession.data.jobs[0].entries.length'),0);
 r.click('jobs-post',{type:'receipt'});assert.equal(get(r,'QQJobs.metrics(jobsSession.data.jobs[0]).outstanding'),40000);assert.equal(get(r,'jobsSession.data.jobs[0].forms.receipt.amount'),'');
 post(r,'cost',{amount:'170',supplier:'Example analyst',description:'Analysis and software'});post(r,'work',{person:'Owner',kind:'owner',hours:'3'});
 post(r,'approval',{reference:'Practice approval of findings'});post(r,'delivery',{reference:'Practice final handoff'});
 assert.equal(get(r,'QQJobs.metrics(jobsSession.data.jobs[0]).outstanding'),40000);assert.equal(get(r,'QQJobs.metrics(jobsSession.data.jobs[0]).unpaidCosts'),17000);
 const costId=get(r,"jobsSession.data.jobs[0].entries.find(e=>e.type==='cost').id");post(r,'cost-payment',{costId,amount:'170'});post(r,'receipt',{amount:'450'});
 const wrongId=get(r,'jobsSession.data.jobs[0].entries.at(-1).id');r.click('jobs-tab',{tab:'history'});r.click('jobs-void',{entryId:wrongId});
 assert.equal(get(r,'modalFocus.action'),'jobs-void');edit(r,'reason','Entered 450 instead of 400','void');r.click('jobs-void-confirm');post(r,'receipt',{amount:'400'});
 const metrics=get(r,'QQJobs.metrics(jobsSession.data.jobs[0])');assert.equal(metrics.status,'settled');assert.equal(metrics.jobCash,43000);assert.equal(metrics.remainderAfterAllowances,28000);assert.ok(metrics.voidedIds.includes(wrongId));
 assert.equal(get(h,'JSON.stringify(currentWorkspace())'),simulator);assert.equal(get(h,'QQStudio.serialize(studioSession.data)'),ideas);
 const jobsBefore=get(r,'QQJobs.serialize(jobsSession.data)');r.click('view',{view:'setup'});r.click('finish');r.drainTimers();assert.equal(get(r,'QQJobs.serialize(jobsSession.data)'),jobsBefore);
 r.click('jobs-backup');const raw=await(await fetch(r.downloads.at(-1).href)).text();assert.equal(Jobs.parseText(raw).jobs[0].entries.length,9);
 const imported=setup(undefined,{built:true});await get(imported,'jobsReady');imported.ctx.jobsRaw=raw;get(imported,'jobsController.previewImport(jobsRaw)');assert.match(imported.elements['#modal'].innerHTML,/new copies/);imported.click('jobs-confirm-import');
 assert.equal(get(imported,'QQJobs.metrics(jobsSession.data.jobs[0]).jobCash'),43000);assert.equal(get(imported,'jobsSession.data.jobs[0].mode'),'practice');
 get(imported,'jobsController.previewImport(jobsRaw)');imported.click('jobs-confirm-import');assert.equal(get(imported,'new Set(jobsSession.data.jobs.map(j=>j.id)).size'),2);
 imported.click('jobs-add');assert.equal(get(imported,'jobsSession.data.jobs.at(-1).mode'),'real');assert.equal(get(imported,'jobsSession.data.jobs.at(-1).entries.length'),0);assert.equal(get(imported,'jobsSession.data.jobs.at(-1).draft.price'),'');
 await get(imported,'jobsSession.flush()');assert.throws(()=>get(imported,'jobsController.previewImport(QQStudio.serialize(studioSession.data))'));
});
test('invalid UI posting retains unfinished form, agreement and prior totals',async()=>{
 const h=setup();await get(h,'jobsReady');h.click('jobs-add');h.click('jobs-post',{type:'agreement'});assert.equal(get(h,'jobsSession.data.jobs[0].agreements.length'),0);
 edit(h,'amount','not decided','receipt');h.click('jobs-post',{type:'receipt'});assert.equal(get(h,'jobsSession.data.jobs[0].entries.length'),0);assert.equal(get(h,'jobsSession.data.jobs[0].forms.receipt.amount'),'not decided');
 assert.equal(get(h,'QQJobs.metrics(jobsSession.data.jobs[0]).outstanding'),null);await get(h,'jobsSession.flush()');
});
test('import into a write-blocked Jobs session makes its recovery limit explicit and protects the original',async()=>{
 const h=setup([[Jobs.STORAGE_KEY,'broken original']]);await get(h,'jobsReady');const book=Jobs.fresh();Jobs.create(book,{draft:{title:'Recovered job'}});h.ctx.recoveredJobs=Jobs.serialize(book);
 get(h,'jobsController.previewImport(recoveredJobs)');assert.match(h.elements['#modal'].innerHTML,/Importing does not repair/);h.click('jobs-confirm-import');assert.match(h.elements['#toast'].textContent,/this tab only/);
 assert.equal(get(h,'jobsSession.data.jobs[0].draft.title'),'Recovered job');assert.equal(await get(h,'jobsSession.flush()'),false);assert.equal(h.storage.get(Jobs.STORAGE_KEY),'broken original');
 assert.equal(Jobs.parseText(get(h,'QQJobs.serialize(jobsSession.data)')).jobs.length,1);
});
test('Jobs primary persistence protects stale saves, corrupt originals and domain keys',async()=>{
 const db=database(),values=new Map([['qq-studio-lab-v1','simulator'],['meiqq-studio-v1','ideas']]),local={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const options={model:Jobs,label:'Jobs',local,indexedDB:db.factory};const a=Session.create(options);await a.open();Jobs.create(a.data,{draft:{title:'Real job'}});a.changed();assert.equal(await a.flush(),true);
 const b=Session.create(options);await b.open();await b.flush();Jobs.setForm(a.data,'job-1','receipt',{amount:'unfinished'});a.changed();assert.equal(await a.flush(),true);
 Jobs.updateDraft(b.data,'job-1',{title:'Stale change'});b.changed();assert.equal(await b.flush(),false);assert.match(b.error,/Another window saved Jobs/);
 const c=Session.create(options);await c.open();assert.equal(c.data.jobs[0].forms.receipt.amount,'unfinished');assert.equal(c.data.jobs[0].draft.title,'Real job');assert.equal(values.get('qq-studio-lab-v1'),'simulator');assert.equal(values.get('meiqq-studio-v1'),'ideas');
 db.records.set(Jobs.STORAGE_KEY,{revision:5,text:'broken original'});const d=Session.create(options);await d.open();assert.equal(await d.flush(),false);assert.equal(d.originals[0].text,'broken original');assert.equal(db.records.get(Jobs.STORAGE_KEY).text,'broken original');
});
