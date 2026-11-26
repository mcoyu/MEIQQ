/* Pure views for manually recorded jobs. Rendering never posts an entry. */
(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dom=value=>encodeURIComponent(String(value??''));
const money=value=>value===null||value===undefined?'—':root.QQI18n?.language==='zh-CN'?root.QQI18n.yuan(value/100):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value/100);
const hours=value=>value===null||value===undefined?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value)+' h';
const text=(value,fallback='Not recorded')=>esc(value ? (root.QQI18n?.literal(value) ?? value) : fallback);
function draftValue(job,key,source=job.draft){
 const value=source?.[key];
 return job.mode==='practice' && value && value===root.QQJobsController?.practiceDraft?.[key] ? (root.QQI18n?.text(value) ?? value) : value;
}
function retainedValue(job,key,record){
 const value=draftValue(job,key,record);
 if(root.QQI18n?.language==='zh-CN' && /USD/.test(draftLabels[key]) && value && Number.isFinite(Number(value)))return root.QQI18n.yuan(value);
 return text(value,'Not specified');
}
const labels={work:'Work hours',cost:'Incurred cost','cost-payment':'Cost payment',receipt:'Customer receipt',refund:'Customer refund',approval:'Approval',delivery:'Delivery',void:'Correction'};
const tabs=[['overview','Overview'],['work','Work'],['money','Money'],['history','History']];
const statusLabels={draft:'Draft',agreed:'Agreed',working:'In progress',delivered:'Delivered · review balances',settled:'Settled on recorded entries'};
const filterLabels={active:'Active',archive:'Archived',trash:'Trash'};
const workTypes=['work','approval','delivery'],moneyTypes=['cost','cost-payment','receipt','refund'];
const draftLabels={title:'Job name',client:'Client',scope:'Scope',owner:'Responsible person',nextAction:'Next action',nextActionDate:'Next action date',dueDate:'Delivery date',paymentTerms:'Payment terms',price:'Proposed price · USD',estimatedDirectCost:'Estimated direct costs · USD',ownerHours:'Estimated owner hours',ownerRate:'Owner-time target · USD/hour',overhead:'Allocated overhead · USD'};
function model(){if(!root.QQJobs)throw Error('The Jobs model must load before its view.');return root.QQJobs;}
function button(label,action,attrs='',cls=''){return `<button type="button" class="${cls}" data-action="jobs-${action}" ${attrs}>${label}</button>`;}
function row(label,value,cls=''){return `<div class="${cls}"><dt>${label}</dt><dd>${value}</dd></div>`;}
function field(job,path,label,options={}){
 const type=options.entryType,id=`jobs-${dom(job.id)}-${type?'form-'+dom(type):'draft'}-${dom(path)}`,value=(type?job.forms?.[type]?.[path]:draftValue(job,path))??'';
 const help=options.help||'',maxLength=type?(['description','reason'].includes(path)?10000:500):model().draftLimit(path),attrs=`id="${id}"${options.numeric?(root.QQI18n?.moneyField(label)||''):''} data-job-id="${esc(job.id)}" ${type?`data-jobs-draft="${esc(path)}" data-entry-type="${esc(type)}"`:`data-jobs-field="${esc(path)}"`}${help?` aria-describedby="${id}-help"`:''}`;
 let control;
 if(options.options)control=`<select ${attrs}>${value&&!options.options.some(([key])=>key===value)?`<option value="${esc(value)}" selected>Unavailable selection: ${esc(value)}</option>`:''}${options.options.map(([key,name])=>`<option value="${esc(key)}"${key===value?' selected':''}>${esc(name)}</option>`).join('')}</select>`;
 else if(options.area)control=`<textarea ${attrs} rows="${options.rows||3}" maxlength="${maxLength}"${options.placeholder?` placeholder="${esc(options.placeholder)}"`:''}>${esc(value)}</textarea>`;
 else control=`<input ${attrs} type="text"${options.numeric?' inputmode="decimal"':''} maxlength="${options.numeric?80:maxLength}" value="${esc(value)}"${options.placeholder?` placeholder="${esc(options.placeholder)}"`:''}>`;
 return `<label class="jobs-field${options.wide?' wide':''}" for="${id}"><span>${esc(label)}</span>${control}${help?`<small id="${id}-help">${esc(help)}</small>`:''}</label>`;
}
function numeric(job,path,label,options={}){return field(job,path,label,{numeric:true,placeholder:'Unknown',...options});}
function postingField(job,type,path,label,options={}){return field(job,path,label,{entryType:type,...options});}
function dateField(job,type,label){const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),date=job.forms?.[type]?.date||'';return `<div class="jobs-date-field">${postingField(job,type,'date',label,{placeholder:'YYYY-MM-DD',help:date&&date!==today?'Check this date before posting a new event.':'Use YYYY-MM-DD, or choose Use today.'})}${button('Use today','today',`id="jobs-today-${dom(job.id)}-${type}" data-type="${type}" data-job-id="${esc(job.id)}"`,'small')}</div>`;}
function errorBanner(ui){return ui.error?`<div id="jobs-form-error" class="jobs-banner error" role="alert" tabindex="-1">${esc(ui.error)}</div>`:'';}
function location(job){return job.location||'active';}
function canTrash(job){return typeof model().canTrash==='function'?model().canTrash(job):!job.agreements?.length&&!job.entries?.length;}
function activeEntries(job){const voided=new Set((job.entries||[]).filter(entry=>entry.type==='void').map(entry=>entry.targetId));return (job.entries||[]).filter(entry=>entry.type!=='void'&&!voided.has(entry.id));}
function latestAgreement(job){return job.agreements?.[job.agreements.length-1]||null;}
function modeTag(job){return `<span class="jobs-tag${job.mode==='practice'?' practice':''}">${job.mode==='practice'?'Practice example':'Real job'}</span>`;}
function library(jobs,selected){
 return `<aside class="jobs-library" aria-label="Saved jobs"><div class="jobs-library-heading"><h3>Your jobs</h3><small>${jobs.length} shown</small></div><div class="jobs-list">${['real','practice'].map(mode=>jobs.filter(job=>job.mode===mode).map(job=>button(`<strong>${text(draftValue(job,'title'),'Untitled job')}</strong><small>${text(draftValue(job,'client'),'Client not entered')} · ${esc(job.id)}</small>${modeTag(job)}<small>${text(draftValue(job,'nextAction'),'Set a next action')}</small>`,'select',`id="jobs-select-${dom(job.id)}" data-id="${esc(job.id)}" aria-pressed="${job.id===selected}"`,'jobs-job')).join('')).join('')}</div></aside>`;
}
function nextAction(job){return `<div class="jobs-next"><span>Next action</span><span>${text(draftValue(job,'nextActionDate'),'Date not set')}</span><strong>${text(draftValue(job,'nextAction'),'Choose the next practical step')}</strong><small>Responsible: ${text(draftValue(job,'owner'),'Not assigned')} · Target delivery: ${text(draftValue(job,'dueDate'),'Not set')}</small></div>`;}
function agreementCard(job){
 const agreement=latestAgreement(job);
 if(!agreement)return '<div class="jobs-banner warning">No agreement recorded. The scope and price below are a working draft.</div>';
 const changed=['title','client','scope','price','dueDate','paymentTerms'].some(key=>(job.draft?.[key]||'')!==(agreement.snapshot?.[key]||''));
 return `<div class="jobs-review"><h3>Recorded agreement · ${text(agreement.date)}</h3><dl>${row('Agreed price',money(agreement.priceCents))}${row('Client',text(draftValue(job,'client',agreement.snapshot)))}${row('Delivery date',text(draftValue(job,'dueDate',agreement.snapshot),'Not specified'))}</dl><p>${text(draftValue(job,'scope',agreement.snapshot))}</p><p>Payment terms: ${text(draftValue(job,'paymentTerms',agreement.snapshot),'Not specified')}</p><p>Evidence: ${text(agreement.reference)}</p>${changed?'<p class="jobs-negative">Your working scope or terms differ from this agreement. Record an amendment only after the change is agreed.</p>':''}</div>`;
}
function agreementForm(job,ui){
 const amendment=!!latestAgreement(job);
 return `<div class="jobs-draft-form">${errorBanner(ui)}<div class="jobs-form-heading"><div><h3>${amendment?'Record an agreed amendment':'Record the agreement'}</h3><p>Copies the current working scope, price and estimates into a preserved snapshot. This does not send a quote or record a payment.</p></div><span class="jobs-tag">Draft · not posted</span></div><div class="jobs-fields">
 ${dateField(job,'agreement','Date agreed')}
 ${postingField(job,'agreement','reference','Agreement evidence / reference',{placeholder:'Email date, signed quote or file reference'})}
 ${postingField(job,'agreement','reason',amendment?'Reason for amendment':'Agreement note (optional)',{area:true,wide:true,help:amendment?'Required. The earlier agreement remains in History.':'For example: how the scope and price were accepted.'})}
 </div><div class="jobs-actions">${button(amendment?'Record agreed amendment':'Record agreement','post',`id="jobs-post-${dom(job.id)}-agreement" data-type="agreement" data-job-id="${esc(job.id)}"`,'primary')}</div></div>`;
}
function overview(job,m,ui){
 const entries=activeEntries(job),approved=entries.filter(e=>e.type==='approval').at(-1),delivered=entries.filter(e=>e.type==='delivery').at(-1);
 return `${agreementCard(job)}<div class="jobs-section"><div class="jobs-form-heading"><div><h3>Working scope and next action</h3><p>These planning fields save as you type. They do not alter a recorded agreement.</p></div></div><div class="jobs-fields">
 ${field(job,'title','Job name')}${field(job,'client','Client / business')}
 ${field(job,'scope','Scope and deliverables',{area:true,wide:true,help:'Include required inputs, exclusions and the completion or approval checks.'})}
 ${field(job,'owner','Person responsible for the next action')}${field(job,'nextActionDate','Next action date',{placeholder:'YYYY-MM-DD'})}
 ${field(job,'nextAction','Next action',{area:true,wide:true})}
 ${field(job,'dueDate','Target delivery date',{placeholder:'YYYY-MM-DD'})}${field(job,'paymentTerms','Payment terms',{area:true,help:'Deposit, balance, due dates and any agreed conditions.'})}
 ${numeric(job,'price','Proposed total price · USD',{wide:true})}
 </div></div><details class="jobs-disclosure" data-disclosure="jobs-estimates-${esc(job.id)}"><summary>Planned cost and owner-time estimates</summary><p class="jobs-muted">Blank means unknown. These are planning allowances, not actual expenses or payments.</p><div class="jobs-fields">
 ${numeric(job,'estimatedDirectCost','Estimated direct costs · $',{help:'External labor, materials and other job costs.'})}
 ${numeric(job,'ownerHours','Estimated owner hours')}${numeric(job,'ownerRate','Owner-time target · $/hour')}${numeric(job,'overhead','Allocated overhead · $')}
 </div></details>${agreementForm(job,ui)}<div class="jobs-section"><h3>Recorded progress</h3><div class="jobs-review-grid"><div class="jobs-review"><dl>${row('Latest approval',approved?text(approved.date):'Not recorded')}${row('Latest delivery',delivered?text(delivered.date):'Not recorded')}</dl><p>Approval and delivery are recorded separately. Neither creates a customer receipt.</p><div class="jobs-actions">${button('Record work or a handoff','tab','data-tab="work"')}</div></div>${briefMoney(job,m)}</div></div>`;
}
function briefMoney(job,m){return `<div class="jobs-review"><h3>Customer money recorded to date</h3><dl>${row('Agreed price',money(m.acceptedPrice))}${row('Net receipts',money(m.netReceipts))}${row('Balance still due',money(m.outstanding))}${m.overpayment>0?row('Customer overpayment',money(m.overpayment)):''}</dl><p>Based only on entries for this job. No payment is inferred from its status.</p>${button('Open money records','tab','data-tab="money"')}</div>`;}
function entryPicker(types,selected){return `<div class="jobs-entry-picker" role="group" aria-label="Entry to record">${types.map(type=>button(labels[type],'form',`id="jobs-form-${type}" data-type="${type}" aria-pressed="${type===selected}"`)).join('')}</div>`;}
function entryForm(job,type,ui){
 let fields=dateField(job,type,'Date this happened'),help='';
 if(type==='work'){
  fields+=postingField(job,type,'person','Person who did the work')+postingField(job,type,'kind','Whose time?',{options:[['','Choose owner or external'],['owner','Owner time'],['external','External partner time']]})+postingField(job,type,'hours','Hours worked',{numeric:true,placeholder:'Enter hours'});
  help='Time records show effort. External work does not create an expense; record its cost separately in Money.';
 }else if(type==='cost'){
  fields+=postingField(job,type,'amount','Cost incurred · USD',{numeric:true,placeholder:'Enter amount'})+postingField(job,type,'supplier','Supplier / person owed')+postingField(job,type,'description','What this cost is for',{area:true});
  help='Record a cost when it is incurred, then record its payment separately. This entry alone does not say it was paid.';
 }else if(type==='cost-payment'){
  const costs=model().metrics(job).costs,selected=job.forms?.[type]?.costId,unpaid=costs.filter(cost=>cost.unpaidCents>0),options=costs.filter(cost=>cost.unpaidCents>0||cost.id===selected).map(cost=>[cost.id,`${cost.id} · ${cost.supplier} · ${money(cost.unpaidCents)} unpaid${cost.unpaidCents===0?' — already paid; choose another cost':''}`]);
  fields+=postingField(job,type,'costId','Cost being paid',{options:[['','Choose an unpaid cost'],...options],help:'This payment settles an existing cost; it does not add another expense.'})+postingField(job,type,'amount','Amount paid · USD',{numeric:true,placeholder:'Enter amount'})+postingField(job,type,'reference','Payment reference');
  help=unpaid.length?'A cost payment changes recorded cash, not the incurred-cost total.':costs.length?'All recorded costs are fully paid. Review any previous selection before posting.':'Record an incurred cost before you post its payment.';
 }else if(type==='receipt'||type==='refund'){
  fields+=postingField(job,type,'amount',type==='receipt'?'Amount received · USD':'Amount refunded · USD',{numeric:true,placeholder:'Enter amount'})+postingField(job,type,'reference','Payment reference',{wide:true});
  help=type==='receipt'?'Use only money actually received from this customer. An agreed deposit or balance is not a receipt.':'Use only money actually returned to the customer. A refund reduces net customer receipts.';
 }else{
  fields+=postingField(job,type,'reference',type==='approval'?'What was approved, by whom, and evidence':'What was delivered, to whom, and evidence',{area:true,wide:true,placeholder:'Include the file/version or delivery reference'});
  help=type==='approval'?'Record the specific version and decision. This does not mark the job delivered or paid.':'Record the handoff and evidence. Delivery does not create a customer receipt or settle the balance.';
 }
 if(['work','approval','delivery'].includes(type))fields+=postingField(job,type,'description',type==='work'?'Work description (optional)':'Additional detail (optional)',{area:true,wide:true});
 return `<div class="jobs-draft-form">${errorBanner(ui)}<div class="jobs-form-heading"><h3>${labels[type]}</h3><span class="jobs-tag">Draft · not posted</span></div><p>${esc(help)}</p><div class="jobs-fields">${fields}</div><div class="jobs-actions">${button('Post '+labels[type].toLowerCase(),'post',`id="jobs-post-${dom(job.id)}-${type}" data-type="${type}" data-job-id="${esc(job.id)}"`,'primary')}</div><p>Post only after checking the details. Posted entries stay in History; correct a mistake by voiding it with a reason.</p></div>`;
}
function entryDescription(entry){
 if(entry.type==='work')return `${text(entry.person)} · ${entry.kind==='owner'?'Owner':'External'} · ${hours(entry.hoursHundredths/100)}`;
 if(entry.type==='cost')return `${money(entry.amountCents)} · ${text(entry.supplier,'Supplier not entered')} · ${text(entry.description)}`;
 if(entry.type==='cost-payment')return `${money(entry.amountCents)} · Cost ${text(entry.costId)} · ${text(entry.reference,'No reference')}`;
 if(entry.type==='receipt'||entry.type==='refund')return `${money(entry.amountCents)} · ${text(entry.reference,'No reference')}`;
 if(entry.type==='void')return `Voided ${text(entry.targetId)} · ${text(entry.reason)}`;
 return text(entry.reference);
}
function records(job,entries,withVoid=false){
 if(!entries.length)return '<p class="jobs-footer">No posted entries here yet.</p>';
 const voids=new Map((job.entries||[]).filter(e=>e.type==='void').map(e=>[e.targetId,e]));
 return `<div class="jobs-record-list">${entries.map(entry=>{const correction=voids.get(entry.id);return `<article class="jobs-record${correction?' voided':''}" data-render-key="jobs-entry-${esc(job.id)}-${esc(entry.id)}"><div class="jobs-record-header"><strong>${esc(labels[entry.type]||entry.type)} · ${text(entry.date)}${correction?' · Voided':''}</strong>${withVoid&&!correction&&entry.type!=='void'?button('Void entry','void',`id="jobs-void-${dom(job.id)}-${dom(entry.id)}" data-job-id="${esc(job.id)}" data-entry-id="${esc(entry.id)}"`,'small'):''}</div><p>${entryDescription(entry)}</p>${entry.description&&entry.type!=='cost'?`<small>${esc(entry.description)}</small>`:''}${correction?`<small>Correction on ${text(correction.date)}: ${text(correction.reason)}. Original entry retained; excluded from totals.</small>`:''}<small>Entry ${text(entry.id)}</small></article>`;}).join('')}</div>`;
}
function work(job,ui){const type=workTypes.includes(ui.form)?ui.form:'work';return `<h3>Record work and handoffs</h3><p class="jobs-muted">Enter events that happened. Unposted drafts do not change recorded progress.</p>${entryPicker(workTypes,type)}${entryForm(job,type,ui)}<div class="jobs-section"><h3>Posted work and handoffs</h3>${records(job,activeEntries(job).filter(e=>workTypes.includes(e.type)).slice().reverse())}</div>`;}
function moneyReview(job,m){return `<div class="jobs-review-grid"><div class="jobs-review"><h3>Money recorded to date · this job only</h3><dl>${row('Agreed price',money(m.acceptedPrice))}${row('Customer receipts',money(m.received))}${row('Customer refunds',money(m.refunded))}${row('Net customer receipts',money(m.netReceipts))}${row('Customer balance due',money(m.outstanding))}${m.overpayment>0?row('Customer overpayment',money(m.overpayment)):''}${row('Costs incurred',money(m.incurredCosts))}${row('Cost payments',money(m.paidCosts))}${row('Costs still unpaid',money(m.unpaidCosts))}${row('Job cash movement',money(m.jobCash),'jobs-total')}</dl><p>Job cash movement is receipts less refunds and cost payments. It is not your bank balance or profit.</p></div><div class="jobs-review"><h3>Estimates versus records to date</h3><dl>${row('Estimated direct costs',money(m.estimatedDirectCost))}${row('Costs incurred to date',money(m.incurredCosts))}${row('Estimated owner hours',hours(m.estimatedOwnerHours))}${row('Owner hours recorded',hours(m.ownerHours))}${row('External hours recorded',hours(m.externalHours))}${row('Recorded owner-time allowance',money(m.actualOwnerAllowance))}${row('Allocated overhead',money(m.overhead))}${row('Estimated remainder',money(m.estimatedRemainder))}${row('Remainder from records to date',money(m.remainderAfterAllowances),'jobs-total')}</dl><p>Estimates come from the recorded agreement. The recorded remainder uses agreed price, incurred costs, recorded owner hours at the agreed time target, and overhead. Unpaid costs still count.</p><p>Zero recorded costs or hours does not mean the job needs none. Before tax and unlisted costs; incomplete records can overstate the result.</p></div></div>`;}
function moneyTab(job,m,ui){const type=moneyTypes.includes(ui.form)?ui.form:'cost';return `${moneyReview(job,m)}<div class="jobs-section"><h3>Record a money event</h3>${entryPicker(moneyTypes,type)}${entryForm(job,type,ui)}</div><div class="jobs-section"><h3>Posted money entries</h3>${records(job,activeEntries(job).filter(e=>moneyTypes.includes(e.type)).slice().reverse())}</div>`;}
function history(job,readOnly=false){return `<h3>Agreements and correction history</h3><p class="jobs-muted">Posted records are preserved. ${readOnly?'Restore this job before making corrections.':'A correction voids an entry with a reason; post a replacement separately if needed.'} Unposted form drafts are not entries.</p><div class="jobs-record-list">${(job.agreements||[]).slice().reverse().map((agreement,index)=>`<article class="jobs-record" data-render-key="jobs-agreement-${esc(job.id)}-${esc(agreement.id)}"><div class="jobs-record-header"><strong>${index===0?'Current agreement':'Earlier agreement'} · ${text(agreement.date)}</strong><span class="jobs-tag">${money(agreement.priceCents)}</span></div><p>${text(draftValue(job,'client',agreement.snapshot))} · ${text(draftValue(job,'scope',agreement.snapshot))}</p><p>Terms: ${text(draftValue(job,'paymentTerms',agreement.snapshot),'Not specified')}</p><small>Reference: ${text(agreement.reference)}</small>${agreement.reason?`<small>Reason / note: ${esc(agreement.reason)}</small>`:''}<details class="jobs-disclosure" data-disclosure="jobs-agreement-${esc(job.id)}-${esc(agreement.id)}"><summary>View preserved scope and estimates</summary><dl>${Object.keys(agreement.snapshot||{}).map(key=>row(esc(draftLabels[key]||key),retainedValue(job,key,agreement.snapshot))).join('')}</dl></details></article>`).join('')}</div>${!job.agreements?.length?'<p class="jobs-footer">No recorded agreement yet.</p>':''}<div class="jobs-section"><h3>Posted entries</h3>${records(job,(job.entries||[]).slice().reverse(),!readOnly)}</div>`;}
function hiddenJob(job,ui){
 const trashed=location(job)==='trash';
 return `${errorBanner(ui)}<div class="jobs-banner${trashed?' warning':''}"><strong>${trashed?'Draft in Trash':'Archived job'}.</strong> Its working fields, unposted drafts and any history are retained. Restore it to Active before editing.</div><div class="jobs-actions">${button(trashed?'Restore draft':'Restore job','restore',`id="jobs-restore-${dom(job.id)}" data-job-id="${esc(job.id)}"`,'primary')}</div><div class="jobs-section"><h3>Retained working scope</h3><div class="jobs-review"><dl>${Object.keys(job.draft||{}).map(key=>row(esc(draftLabels[key]||key),retainedValue(job,key,job.draft))).join('')}</dl></div></div><details class="jobs-disclosure" data-disclosure="jobs-retained-history-${esc(job.id)}"><summary>View retained agreements and posted entries</summary>${history(job,true)}</details>`;
}
function headerActions(job){
 if(location(job)!=='active')return '';
 const draft=canTrash(job);
 return `<div class="jobs-actions">${job.mode==='practice'?button('New practice copy','practice-new',`id="jobs-practice-new-${dom(job.id)}" data-job-id="${esc(job.id)}"`,'small'):''}${button(draft?'Delete draft':'Archive job',draft?'trash':'archive',`id="jobs-${draft?'trash':'archive'}-${dom(job.id)}" data-job-id="${esc(job.id)}"`,'small')}</div>`;
}
function provenance(job,findIdea){
 if(!job.source)return '';
 const idea=findIdea(job.source.ideaKey),name=text(job.source.name,'Untitled idea');
 const origin=idea?`<button type="button" class="jobs-idea-link" data-action="studio-select" data-id="${esc(idea.id)}">${name}</button>`:name;
 return `<p><span>From idea</span> · ${origin} · <span>Revision ${job.source.ideaVersion}</span></p>`;
}
function editor(job,ui,findIdea){
 const m=model().metrics(job),tab=tabs.some(([key])=>key===ui.tab)?ui.tab:'overview',hidden=location(job)!=='active';
 return `<section class="jobs-editor panel" aria-label="Selected job"><div class="jobs-heading"><div><h2 id="jobs-selected-heading" tabindex="-1">${text(draftValue(job,'title'),'Untitled job')}</h2><p>${text(draftValue(job,'client'),'Client not entered')} · ${esc(job.id)}</p>${provenance(job,findIdea)}</div><div class="jobs-actions">${modeTag(job)}<span class="jobs-tag" aria-label="Job status based on recorded entries">${esc(statusLabels[m.status]||'Review records')}</span></div>${headerActions(job)}</div>${job.mode==='practice'?'<div class="jobs-banner practice"><strong>Practice example.</strong> These entries are rehearsal data, not actual customer work or money. Create a blank real job when you are ready.</div>':''}${hidden?hiddenJob(job,ui):`${nextAction(job)}<div class="jobs-tabs" role="group" aria-label="Job sections">${tabs.map(([key,label])=>button(label,'tab',`id="jobs-tab-${key}" data-tab="${key}" aria-pressed="${tab===key}"`)).join('')}</div><div id="jobs-editor-content">${tab==='work'?work(job,ui):tab==='money'?moneyTab(job,m,ui):tab==='history'?errorBanner(ui)+history(job):overview(job,m,ui)}</div>`}</section>`;
}
function visibleJobs(workspace,ui={}){const filter=Object.hasOwn(filterLabels,ui.filter)?ui.filter:'active',query=String(ui.search||'').trim().toLowerCase();return (workspace?.jobs||[]).filter(job=>location(job)===filter&&(!query||[job.id,...['title','client','scope','owner','nextAction'].flatMap(key=>[job.draft?.[key],draftValue(job,key)])].some(value=>String(value||'').toLowerCase().includes(query)))).sort((a,b)=>Number(a.mode==='practice')-Number(b.mode==='practice'));}
function listTools(jobs,ui){
 const filter=Object.hasOwn(filterLabels,ui.filter)?ui.filter:'active';
 return `<div class="jobs-list-tools"><div class="jobs-filters" role="group" aria-label="Job location">${Object.entries(filterLabels).map(([value,label])=>button(`${label} <span>${jobs.filter(job=>location(job)===value).length}</span>`,'filter',`id="jobs-filter-${value}" data-filter="${value}" aria-pressed="${value===filter}"`)).join('')}</div><label class="jobs-search" for="jobs-search"><span>Search jobs</span><input id="jobs-search" type="search" data-jobs-search maxlength="300" value="${esc(ui.search||'')}" placeholder="Name, client or job ID"></label></div>`;
}
function render(workspace,ui={},findIdea=()=>null){
 const jobs=Array.isArray(workspace?.jobs)?workspace.jobs:[],visible=visibleJobs({jobs},ui),job=visible.find(item=>item.id===ui.selectedId)||visible[0],filter=Object.hasOwn(filterLabels,ui.filter)?ui.filter:'active',searching=!!String(ui.search||'').trim();
 const empty=searching?'<h3>No jobs match</h3><p>Try another search or location. Clearing the search shows every job in the selected location.</p>':jobs.length===0?'<h3>Start with a job of your own</h3><p>Add a blank real job to record your client, scope and next action. Or use the clearly marked practice example to try the workflow first.</p>':filter==='trash'?'<h3>Trash is empty</h3><p>Deleted drafts appear here and can be restored.</p>':filter==='archive'?'<h3>No archived jobs</h3><p>Archive a job to keep it out of Active while retaining its history.</p>':'<h3>No active jobs</h3><p>Add a new job, or restore one from Archived or Trash.</p>';
 return `<div class="jobs-workspace"><div class="jobs-toolbar" role="group" aria-label="Studio jobs"><p class="jobs-intro">Track what you agreed with each client, what happens next and what they’ve paid.</p><div class="jobs-actions">${button('+ Blank real job','add','id="jobs-add"','primary')}${button(jobs.some(job=>job.mode==='practice'&&location(job)==='active')?'Open practice example':'Add practice example','practice','id="jobs-practice"')}</div></div>${listTools(jobs,ui)}${ui.undo?`<div class="jobs-undo" role="status"><span>${text(ui.undo.title,'Untitled job')} moved to ${ui.undo.location==='trash'?'Trash':'Archived'}.</span>${button('Undo','restore',`id="jobs-undo" data-id="${esc(ui.undo.id)}"`,'small')}</div>`:''}${job?`<div class="jobs-layout">${library(visible,job.id)}${editor(job,ui,findIdea)}</div>`:`<div class="jobs-empty">${empty}</div>`}<p class="jobs-footer">Nothing is sent to clients or suppliers. Typing saves drafts; only an explicit record or post action adds an agreement or event. No simulation controls affect these jobs.</p></div>`;
}
const api={render,visibleJobs};root.QQJobsView=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
