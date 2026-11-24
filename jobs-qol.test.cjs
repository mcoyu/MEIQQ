const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs'),J=require('./jobs.js');
const read=(h,code)=>vm.runInContext(code,h.ctx);
async function start(initial){const h=setup(initial,{built:true});await read(h,'Promise.all([appReady,studioReady,jobsReady])');h.click('view',{view:'jobs'});return h;}
function edit(h,field,value,type){h.handlers.input({target:{id:'qa-'+field,tagName:'INPUT',value,dataset:type?{jobsDraft:field,entryType:type,jobId:read(h,'jobsController.ui.selectedId')}:{jobsField:field,jobId:read(h,'jobsController.ui.selectedId')}}});}
test('practice reuse, deliberate copies, trash, undo and restore keep unrelated jobs and saved form text intact',async()=>{
 const h=await start();h.click('jobs-practice');const first=read(h,'jobsController.ui.selectedId');h.click('jobs-practice');assert.equal(read(h,'jobsSession.data.jobs.length'),1);
 for(let i=0;i<4;i++)h.click('jobs-practice-new');assert.equal(read(h,'jobsSession.data.jobs.length'),5);
 const selected=read(h,'jobsController.ui.selectedId');edit(h,'amount','awaiting bank confirmation','receipt');const before=read(h,'JSON.stringify(jobsSession.data.jobs.slice(0,4))');
 h.click('jobs-trash');assert.equal(read(h,'jobsSession.data.jobs.at(-1).location'),'trash');assert.notEqual(read(h,'jobsController.ui.selectedId'),selected);assert.match(h.elements['#root'].innerHTML,/Undo/);
 assert.equal(read(h,'JSON.stringify(jobsSession.data.jobs.slice(0,4))'),before);h.click('jobs-restore',{id:selected});assert.equal(read(h,'jobsController.ui.selectedId'),selected);assert.equal(read(h,'jobsSession.data.jobs.at(-1).forms.receipt.amount'),'awaiting bank confirmation');
 h.click('jobs-trash');h.click('jobs-select',{id:first});h.click('jobs-trash');assert.equal(read(h,"jobsSession.data.jobs.filter(j=>j.location==='active').length"),3);
 h.click('jobs-filter',{filter:'trash'});assert.match(h.elements['#root'].innerHTML,/Restore draft/);assert.doesNotMatch(h.elements['#root'].innerHTML,/data-jobs-field=|data-jobs-draft=|data-action="jobs-post"/);
 await read(h,'jobsSession.flush()');const reopened=await start([...h.storage]);assert.equal(read(reopened,'jobsController.ui.filter'),'trash');assert.equal(read(reopened,"jobsSession.data.jobs.filter(j=>j.location==='trash').length"),2);
 reopened.click('jobs-restore',{id:selected});assert.equal(read(reopened,'jobsController.ui.selectedId'),selected);assert.equal(read(reopened,'jobsSession.data.jobs.at(-1).forms.receipt.amount'),'awaiting bank confirmation');
 reopened.click('jobs-backup');const raw=await(await fetch(reopened.downloads.at(-1).href)).text();const restored=J.parseText(raw);assert.equal(restored.jobs.filter(j=>j.location==='trash').length,1);assert.equal(restored.jobs.at(-1).forms.receipt.amount,'awaiting bank confirmation');
});
test('last draft removal has a true empty state and remains recoverable',async()=>{
 const h=await start();h.click('jobs-add');const id=read(h,'jobsController.ui.selectedId');h.click('jobs-trash');assert.equal(read(h,'jobsController.ui.selectedId'),null);assert.doesNotMatch(h.elements['#root'].innerHTML,/data-jobs-field=/);
 h.click('jobs-filter',{filter:'trash'});assert.equal(read(h,'jobsController.ui.selectedId'),id);h.click('jobs-restore',{id});assert.equal(read(h,'jobsController.ui.selectedId'),id);assert.equal(read(h,'jobsController.ui.filter'),'active');
});
test('a job with money but no agreement can be archived, never draft-deleted; archive restores all history',async()=>{
 const h=await start();h.click('jobs-add');const id=read(h,'jobsController.ui.selectedId');h.click('jobs-tab',{tab:'money'});h.click('jobs-form',{type:'receipt'});edit(h,'amount','40','receipt');h.click('jobs-today',{type:'receipt'});h.click('jobs-post',{type:'receipt'});
 assert.equal(read(h,'QQJobs.metrics(jobsSession.data.jobs[0]).status'),'draft');assert.match(h.elements['#root'].innerHTML,/data-action="jobs-archive"/);assert.doesNotMatch(h.elements['#root'].innerHTML,/data-action="jobs-trash"/);
 h.click('jobs-trash');assert.equal(read(h,'jobsSession.data.jobs[0].location'),'active');assert.equal(read(h,'QQJobs.metrics(jobsSession.data.jobs[0]).received'),4000);
 h.click('jobs-archive');h.click('jobs-filter',{filter:'archive'});assert.match(h.elements['#root'].innerHTML,/Restore job/);assert.doesNotMatch(h.elements['#root'].innerHTML,/data-action="jobs-post"|data-action="jobs-void"/);
 const original=read(h,'JSON.stringify(jobsSession.data.jobs[0].entries)');h.click('jobs-restore',{id});assert.equal(read(h,'JSON.stringify(jobsSession.data.jobs[0].entries)'),original);
});
test('reopen returns to selected job and unfinished entry; invalid posting leaves a persistent inline error',async()=>{
 const h=await start();h.click('jobs-add');edit(h,'title','First job');h.click('jobs-add');edit(h,'title','Second job');const id=read(h,'jobsController.ui.selectedId');h.click('jobs-tab',{tab:'money'});h.click('jobs-form',{type:'receipt'});
 edit(h,'amount','not sure','receipt');edit(h,'reference','Keep this unfinished reference','receipt');h.click('jobs-post',{type:'receipt'});h.drainTimers();assert.match(h.elements['#root'].innerHTML,/id="jobs-form-error"/);assert.ok(read(h,'jobsController.ui.error').length>0);assert.equal(read(h,'jobsSession.data.jobs.at(-1).entries.length'),0);
 await read(h,'jobsSession.flush()');const r=await start([...h.storage]);assert.equal(read(r,'jobsController.ui.selectedId'),id);assert.equal(read(r,'jobsController.ui.tab'),'money');assert.equal(read(r,'jobsController.ui.form'),'receipt');assert.match(r.elements['#root'].innerHTML,/value="not sure"/);
 edit(r,'amount','25','receipt');r.click('jobs-today',{type:'receipt'});r.click('jobs-post',{type:'receipt'});assert.equal(read(r,'jobsSession.data.jobs.at(-1).entries.length'),1);assert.equal(read(r,'jobsController.ui.error'),'');assert.equal(read(r,'jobsSession.data.jobs.at(-1).forms.receipt.date'),'');
 r.click('jobs-post',{type:'receipt'});assert.equal(read(r,'jobsSession.data.jobs.at(-1).entries.length'),1);
});
test('search keeps displayed and selected job aligned and cannot post to a hidden result',async()=>{
 const h=await start();h.click('jobs-add');edit(h,'title','Menu update');h.click('jobs-add');edit(h,'title','Analytics brief');const analyticsId=read(h,'jobsController.ui.selectedId');
 h.handlers.input({target:{dataset:{jobsSearch:''},value:'Menu',id:'jobs-search'}});assert.equal(read(h,'jobsController.ui.selectedId'),'job-1');assert.match(h.elements['#root'].innerHTML,/Menu update/);assert.doesNotMatch(h.elements['#root'].innerHTML,/Analytics brief/);
 h.handlers.input({target:{dataset:{jobsSearch:''},value:'no such job',id:'jobs-search'}});assert.equal(read(h,'jobsController.ui.selectedId'),null);assert.doesNotMatch(h.elements['#root'].innerHTML,/data-action="jobs-post"/);
 h.handlers.input({target:{dataset:{jobsSearch:''},value:analyticsId,id:'jobs-search'}});assert.equal(read(h,'jobsController.ui.selectedId'),analyticsId);
});

test('renaming a search result keeps the editor and selected job through the first keystroke',async()=>{
 const h=await start();h.click('jobs-add');edit(h,'title','Menu refresh');const id=read(h,'jobsController.ui.selectedId');h.click('jobs-add');edit(h,'title','Different job');
 h.handlers.input({target:{dataset:{jobsSearch:''},value:'Menu',id:'jobs-search'}});assert.equal(read(h,'jobsController.ui.selectedId'),id);
 edit(h,'title','A');assert.equal(read(h,'jobsController.ui.selectedId'),id);assert.equal(read(h,'jobsController.ui.search'),'');assert.match(h.elements['#root'].innerHTML,/data-jobs-field="title"/);
 edit(h,'title','Analytics refresh');assert.equal(read(h,'jobsSession.data.jobs[0].draft.title'),'Analytics refresh');assert.equal(read(h,'jobsSession.data.jobs[1].draft.title'),'Different job');
});
