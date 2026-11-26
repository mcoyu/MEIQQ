const test=require('node:test'),assert=require('node:assert/strict');
const Jobs=require('./jobs.js');
const View=require('./jobs-view.js');

function fixture(mode='real'){
 const workspace=Jobs.fresh(),job=Jobs.create(workspace,{mode,draft:{title:'One decision brief',client:'Example buyer',scope:'One source, one reporting period, one owner decision, a brief and review.',owner:'Director',nextAction:'Check the source',price:'600',estimatedDirectCost:'170',ownerHours:'3',ownerRate:'40',overhead:'0'}});
 return {workspace,id:job.id,current:()=>workspace.jobs.find(item=>item.id===job.id)};
}
function agree(f){Jobs.recordAgreement(f.workspace,f.id,{date:'2026-11-20',reference:'Client accepted scope v1'});}
function post(f,type,values={}){return Jobs.postEntry(f.workspace,f.id,{type,date:'2026-11-20',...values});}

test('empty jobs starts with explicit real or practice creation, without seeded actuals',()=>{
 const workspace=Jobs.fresh(),before=Jobs.serialize(workspace),html=View.render(workspace);
 assert.match(html,/data-action="jobs-add"/);
 assert.match(html,/Blank real job/);
 assert.match(html,/data-action="jobs-practice"/);
 assert.match(html,/Start with a job of your own/);
 assert.equal(Jobs.serialize(workspace),before);
});

test('practice context remains visible on every job tab and rendering never posts',()=>{
 const f=fixture('practice'),before=Jobs.serialize(f.workspace);
 for(const tab of ['overview','work','money','history']){
  const html=View.render(f.workspace,{selectedId:f.id,tab});
  assert.match(html,/Practice example\./);
  assert.match(html,/not actual customer work or money/);
  assert.match(html,/No simulation controls affect these jobs/);
  assert.doesNotMatch(html,/data-action="(?:step|finish|run|play)"/);
 }
 assert.equal(Jobs.serialize(f.workspace),before);
});

test('every rendered draft input follows the model contract and has a unique label target',()=>{
 const f=fixture();
 const views=[{tab:'overview'},...['work','approval','delivery'].map(form=>({tab:'work',form})),...['cost','cost-payment','receipt','refund'].map(form=>({tab:'money',form}))];
 for(const ui of views){
  const html=View.render(f.workspace,{selectedId:f.id,...ui}),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const match of html.matchAll(/<label[^>]*for="([^"]+)"/g))assert.ok(ids.includes(match[1]));
  for(const match of html.matchAll(/data-jobs-field="([^"]+)"/g))assert.ok(Jobs.DRAFT_FIELDS.includes(match[1]),match[1]);
  for(const match of html.matchAll(/data-jobs-draft="([^"]+)" data-entry-type="([^"]+)"/g))assert.ok(Jobs.FORM_FIELDS[match[2]].includes(match[1]),`${match[2]}.${match[1]}`);
 }
});

test('unposted money drafts survive rendering and do not become receipts or calculated income',()=>{
 const f=fixture();agree(f);
 Jobs.setForm(f.workspace,f.id,'receipt',{date:'2026-11-20',amount:'20.',reference:'Still checking this amount'});
 const before=Jobs.serialize(f.workspace),html=View.render(f.workspace,{selectedId:f.id,tab:'money',form:'receipt'});
 assert.match(html,/data-jobs-draft="amount"[^>]*value="20\."/);
 assert.match(html,/Draft · not posted/);
 assert.match(html,/data-action="jobs-post"[^>]*data-type="receipt"/);
 assert.match(html,/Customer receipts<\/dt><dd>\$0\.00/);
 assert.match(html,/Customer balance due<\/dt><dd>\$600\.00/);
 assert.equal(Jobs.serialize(f.workspace),before);
 assert.equal(f.current().entries.length,0);
});

test('unknown estimates and malformed draft numbers stay visible without inventing allowances',()=>{
 const f=fixture();Jobs.updateDraft(f.workspace,f.id,{estimatedDirectCost:'not known',ownerHours:'',ownerRate:'',overhead:''});agree(f);
 post(f,'work',{person:'Director',kind:'owner',hours:'1',description:'Initial review'});
 const overview=View.render(f.workspace,{tab:'overview'}),money=View.render(f.workspace,{tab:'money'});
 assert.match(overview,/data-jobs-field="estimatedDirectCost"[^>]*value="not known"/);
 assert.match(money,/Estimated direct costs<\/dt><dd>—/);
 assert.match(money,/Recorded owner-time allowance<\/dt><dd>—/);
 assert.match(money,/Remainder from records to date<\/dt><dd>—/);
 assert.match(money,/Zero recorded costs or hours does not mean the job needs none/);
 assert.doesNotMatch(money,/NaN|Infinity/);
});

test('delivery, customer balance, incurred expense and cash remain visibly distinct',()=>{
 const f=fixture();agree(f);
 post(f,'receipt',{amount:'200',reference:'Deposit'});
 const cost=post(f,'cost',{amount:'170',supplier:'Delivery partners',description:'Analysis and software'});
 post(f,'work',{person:'Director',kind:'owner',hours:'3',description:'Review and coordination'});
 post(f,'approval',{reference:'Client approved brief v2',description:'One decision confirmed'});
 post(f,'delivery',{reference:'Brief v2 sent',description:'Review completed'});
 const overview=View.render(f.workspace,{tab:'overview'}),beforePayment=View.render(f.workspace,{tab:'money',form:'cost-payment'});
 assert.match(overview,/Latest delivery<\/dt><dd>2026-11-20/);
 assert.match(overview,/Balance still due<\/dt><dd>\$400\.00/);
 assert.match(beforePayment,/Costs incurred<\/dt><dd>\$170\.00/);
 assert.match(beforePayment,/Cost payments<\/dt><dd>\$0\.00/);
 assert.match(beforePayment,/Job cash movement<\/dt><dd>\$200\.00/);
 assert.match(beforePayment,new RegExp(`value="${cost.id}"`));
 post(f,'cost-payment',{costId:cost.id,amount:'170',reference:'Paid partners'});
 post(f,'receipt',{amount:'400',reference:'Final receipt'});
 const after=View.render(f.workspace,{tab:'money'});
 assert.match(after,/Customer balance due<\/dt><dd>\$0\.00/);
 assert.match(after,/Job cash movement<\/dt><dd>\$430\.00/);
 assert.match(after,/Remainder from records to date<\/dt><dd>\$310\.00/);
 assert.match(after,/not your bank balance or profit/);
});

test('history preserves agreement amendments, original entries and correction reasons',()=>{
 const f=fixture();agree(f);
 Jobs.updateDraft(f.workspace,f.id,{price:'650',scope:'Proposed additional source'});
 assert.match(View.render(f.workspace),/working scope or terms differ from this agreement/);
 Jobs.recordAgreement(f.workspace,f.id,{date:'2026-11-21',reference:'Client accepted v2',reason:'Added one source'});
 const wrong=post(f,'receipt',{amount:'450',reference:'Wrong amount'});
 Jobs.voidEntry(f.workspace,f.id,wrong.id,{date:'2026-11-21',reason:'Transcription error: should be 400'});
 const html=View.render(f.workspace,{tab:'history'});
 assert.match(html,/Current agreement · 2026-11-21/);
 assert.match(html,/Earlier agreement · 2026-11-20/);
 assert.match(html,/Added one source/);
 assert.match(html,/\$450\.00/);
 assert.match(html,/Transcription error: should be 400/);
 assert.match(html,/Original entry retained; excluded from totals/);
 assert.doesNotMatch(html,new RegExp(`data-action="jobs-void"[^>]*data-entry-id="${wrong.id}"`));
 assert.match(html,/Estimated direct costs · USD/);
});

test('posted work descriptions and safe plain-text evidence remain readable',()=>{
 const f=fixture(),attack='<img src=x onerror="alert(1)">';
 Jobs.updateDraft(f.workspace,f.id,{title:attack,scope:attack});
 post(f,'work',{person:'Director',kind:'owner',hours:'1',description:'Checked one reporting period'});
 post(f,'approval',{reference:attack,description:'Approved version 2'});
 for(const tab of ['overview','work','money','history']){
  const html=View.render(f.workspace,{tab,error:attack});
  assert.match(html,/&lt;img/);
  assert.doesNotMatch(html,/<img|<script|href="javascript:/);
 }
 const history=View.render(f.workspace,{tab:'history'});
 assert.match(history,/Checked one reporting period/);
 assert.match(history,/Approved version 2/);
});

test('derived status shows settlement only while recorded customer and supplier balances reconcile',()=>{
 const f=fixture(),status=()=>View.render(f.workspace).match(/aria-label="Job status based on recorded entries">([^<]+)<\/span>/)?.[1];
 assert.equal(status(),'Draft');
 agree(f);assert.equal(status(),'Agreed');
 post(f,'receipt',{amount:'200',reference:'Deposit'});assert.equal(status(),'In progress');
 post(f,'delivery',{reference:'Delivery v1'});assert.equal(status(),'Delivered · review balances');
 post(f,'receipt',{amount:'400',reference:'Balance'});assert.equal(status(),'Settled on recorded entries');
 const cost=post(f,'cost',{amount:'20',supplier:'Vendor',description:'Final job cost'});
 assert.equal(status(),'Delivered · review balances');
 post(f,'cost-payment',{costId:cost.id,amount:'20',reference:'Paid vendor'});
 assert.equal(status(),'Settled on recorded entries');
 post(f,'receipt',{amount:'1',reference:'Overpayment to review'});
 assert.equal(status(),'Delivered · review balances');
 post(f,'refund',{amount:'1',reference:'Overpayment returned'});
 assert.equal(status(),'Settled on recorded entries');
});

test('location controls and search use the same visible order as job selection',()=>{
 const f=fixture('practice'),real=Jobs.create(f.workspace,{draft:{title:'Real menu refresh',client:'North Café'}}),archived=Jobs.create(f.workspace,{draft:{title:'Archived sample'}}),trashed=Jobs.create(f.workspace,{draft:{title:'Deleted draft'}});
 Jobs.postEntry(f.workspace,archived.id,{type:'work',date:'2026-11-20',person:'Owner',kind:'owner',hours:'1'});
 Jobs.move(f.workspace,archived.id,'archive');Jobs.move(f.workspace,trashed.id,'trash');
 assert.deepEqual(View.visibleJobs(f.workspace).map(j=>j.id),[real.id,f.id]);
 assert.deepEqual(View.visibleJobs(f.workspace,{search:'NORTH'}).map(j=>j.id),[real.id]);
 assert.deepEqual(View.visibleJobs(f.workspace,{filter:'archive'}).map(j=>j.id),[archived.id]);
 assert.deepEqual(View.visibleJobs(f.workspace,{filter:'trash',search:trashed.id}).map(j=>j.id),[trashed.id]);
 const html=View.render(f.workspace);
 assert.match(html,/Active <span>2<\/span>/);assert.match(html,/Archived <span>1<\/span>/);assert.match(html,/Trash <span>1<\/span>/);
 assert.match(html,/for="jobs-search"><span>Search jobs/);
 assert.match(html,/id="jobs-selected-heading" tabindex="-1">Real menu refresh/);
 assert.match(html,new RegExp(`North Café · ${real.id}`));
 assert.match(View.render(f.workspace,{search:'no such client'}),/No jobs match/);
 const legacy=JSON.parse(JSON.stringify(f.workspace));delete legacy.jobs[0].location;
 assert.ok(View.visibleJobs(legacy).some(job=>job.id===f.id));
});

test('draft deletion and job archiving are distinct, while hidden records are read-only and restorable',()=>{
 const f=fixture();Jobs.setForm(f.workspace,f.id,'receipt',{amount:'unfinished'});
 assert.match(View.render(f.workspace),/data-action="jobs-trash"/);
 Jobs.move(f.workspace,f.id,'trash');
 const before=Jobs.serialize(f.workspace),trash=View.render(f.workspace,{filter:'trash',tab:'money'});
 assert.match(trash,/Restore draft/);assert.match(trash,/unposted drafts and any history are retained/);
 assert.doesNotMatch(trash,/data-jobs-field=|data-jobs-draft=|data-action="jobs-(post|void|trash|archive|practice-new)"/);
 assert.equal(Jobs.serialize(f.workspace),before);
 Jobs.move(f.workspace,f.id,'active');agree(f);post(f,'receipt',{amount:'200',reference:'Deposit'});
 assert.match(View.render(f.workspace),/data-action="jobs-archive"/);
 assert.doesNotMatch(View.render(f.workspace),/data-action="jobs-trash"/);
 Jobs.move(f.workspace,f.id,'archive');
 const archived=View.render(f.workspace,{filter:'archive',tab:'history'});
 assert.match(archived,/Restore job/);assert.match(archived,/\$200\.00/);
 assert.doesNotMatch(archived,/data-jobs-field=|data-jobs-draft=|data-action="jobs-(post|void)"/);
});

test('practice reopening, explicit new copies and undo have distinguishable controls',()=>{
 const f=fixture('practice'),html=View.render(f.workspace);
 assert.match(html,/Open practice example/);
 assert.match(html,/data-action="jobs-practice-new"[^>]*data-job-id="job-1"/);
 assert.match(html,/Example buyer · job-1/);
 Jobs.move(f.workspace,f.id,'trash');
 const removed=View.render(f.workspace,{undo:{id:f.id,title:'One decision brief',location:'trash'}});
 assert.match(removed,/Add practice example/);
 assert.match(removed,/One decision brief moved to Trash/);
 assert.match(removed,/data-action="jobs-restore" id="jobs-undo" data-id="job-1"/);
 assert.doesNotMatch(removed,/Empty trash|permanent/i);
});

test('archived jobs show open balances and actual cash without restoring the job or posting its unfinished entries',()=>{
 const f=fixture();post(f,'receipt',{amount:'200'});
 assert.match(View.render(f.workspace),/aria-label="Job status based on recorded entries">No recorded agreement yet\./);
 agree(f);
 const cost=post(f,'cost',{amount:'170',supplier:'Printer',description:'Short run'});
 const wrong=post(f,'cost-payment',{amount:'70',costId:cost.id});
 Jobs.voidEntry(f.workspace,f.id,wrong.id,{date:'2026-11-20',reason:'Wrong transfer amount'});
 post(f,'cost-payment',{amount:'50',costId:cost.id});
 Jobs.setForm(f.workspace,f.id,'receipt',{amount:'400',reference:'Awaiting confirmation'});
 Jobs.move(f.workspace,f.id,'archive');
 const before=Jobs.serialize(f.workspace),reopened=Jobs.parseText(before),html=View.render(reopened,{filter:'archive'});
 assert.match(html,/Customer balance due<\/dt><dd>\$400\.00/);
 assert.match(html,/Costs still unpaid<\/dt><dd>\$120\.00/);
 assert.match(html,/Job cash movement<\/dt><dd>\$150\.00/);
 assert.doesNotMatch(html,/data-action="jobs-(post|void)"|data-jobs-draft=/);
 assert.equal(Jobs.serialize(reopened),before);
});

test('preserved estimates keep unfinished numeric text when viewing a job in another currency',()=>{
 const f=fixture();Jobs.updateDraft(f.workspace,f.id,{estimatedDirectCost:'1e3'});agree(f);
 Jobs.move(f.workspace,f.id,'archive');
 const ui=require('./ui-test-host.cjs').setup();ui.ctx.QQI18n.choose('zh-CN');
 const html=ui.ctx.QQJobsView.render(f.workspace,{filter:'archive'});
 assert.match(html,/Estimated direct costs · USD<\/dt><dd>[^<]*1e3[^<]*<\/dd>/);
 assert.ok(html.includes(ui.ctx.QQI18n.yuan(600)));
 assert.ok(!html.includes(ui.ctx.QQI18n.yuan(1000)));
});

test('posting errors are persistent and focusable beside the retained form',()=>{
 const f=fixture();Jobs.setForm(f.workspace,f.id,'receipt',{amount:'not sure'});
 for(const ui of [{tab:'overview'},{tab:'work',form:'work'},{tab:'money',form:'receipt'}]){
  const html=View.render(f.workspace,{...ui,error:'Check the amount <please>'});
  assert.match(html,/<div class="jobs-draft-form"><div id="jobs-form-error" class="jobs-banner error" role="alert" tabindex="-1">Check the amount &lt;please&gt;/);
  assert.equal((html.match(/id="jobs-form-error"/g)||[]).length,1);
 }
 assert.match(View.render(f.workspace,{tab:'money',form:'receipt',error:'Check the amount'}),/value="not sure"/);
});

test('Use today is explicit and existing noncurrent raw dates get a check reminder without mutation',()=>{
 const f=fixture();Jobs.setForm(f.workspace,f.id,'receipt',{date:'2000-01-01'});
 const before=Jobs.serialize(f.workspace),html=View.render(f.workspace,{tab:'money',form:'receipt'});
 assert.match(html,/value="2000-01-01"/);
 assert.match(html,/Check this date before posting a new event/);
 assert.match(html,/data-action="jobs-today"[^>]*data-type="receipt"/);
 assert.match(View.render(f.workspace),/data-action="jobs-today"[^>]*data-type="agreement"/);
 assert.equal(Jobs.serialize(f.workspace),before);
});

test('cost-payment choices identify unpaid balances and preserve a stale fully paid selection for review',()=>{
 const f=fixture(),cost=post(f,'cost',{amount:'170',supplier:'Partner A',description:'Analysis'}),paid=post(f,'cost',{amount:'20',supplier:'Vendor B',description:'Software'});
 post(f,'cost-payment',{costId:cost.id,amount:'50'});post(f,'cost-payment',{costId:paid.id,amount:'20'});
 let html=View.render(f.workspace,{tab:'money',form:'cost-payment'});
 assert.match(html,new RegExp(`${cost.id} · Partner A · \\$120\\.00 unpaid`));
 assert.doesNotMatch(html,new RegExp(`<option value="${paid.id}"`));
 Jobs.setForm(f.workspace,f.id,'cost-payment',{costId:paid.id});
 html=View.render(f.workspace,{tab:'money',form:'cost-payment'});
 assert.match(html,new RegExp(`<option value="${paid.id}" selected>${paid.id} · Vendor B · \\$0\\.00 unpaid — already paid; choose another cost`));
});
