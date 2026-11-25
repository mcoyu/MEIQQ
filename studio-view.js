/* Pure rendering for the Studio service-ideas launchpad. */
(function(root){
'use strict';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dom=value=>encodeURIComponent(String(value??''));
const money=value=>value===null||value===undefined?'—':root.QQI18n?.language==='zh-CN'?root.QQI18n.yuan(value/100):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(value/100);
const hours=value=>value===null||value===undefined?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value)+' h';
const statusLabels={idea:'Idea',research:'Researching',ready:'Ready to test'};

function model(){if(!root.QQStudio)throw Error('The Studio model must load before its view.');return root.QQStudio;}
function button(label,action,extra='',cls=''){return `<button type="button" class="studio-button ${cls}" data-action="studio-${action}" ${extra}>${label}</button>`;}
function issueFor(issues,path){return (issues||[]).find(item=>item.path===path&&item.kind==='invalid');}
const examplesById=new Map();
function ideaValue(idea,path,value){
 if(root.QQI18n?.language!=='zh-CN'||!value||idea.origin?.kind!=='example')return value;
 const id=idea.origin.ref;
 if(!examplesById.has(id)){
  if(!root.QQStudioSeeds?.EXAMPLES.some(example=>example.id===id))return value;
  examplesById.set(id,root.QQStudioSeeds.create(id));
 }
 const original=path.split('.').reduce((record,key)=>record?.[key],examplesById.get(id));
 return original===value && typeof value==='string' ? value.split('\n').map(line=>root.QQI18n.text(line)).join('\n') : value;
}
function field(idea,path,label,options={}){
 const id='studio-field-'+dom(idea.id)+'-'+dom(path),value=ideaValue(idea,path,options.value??path.split('.').reduce((v,k)=>v?.[k],idea)??''),issue=issueFor(options.issues,path);
 const help=options.help||'',description=[help?id+'-help':'',issue?id+'-error':''].filter(Boolean).join(' ');
 const attrs=`id="${id}"${options.numeric?(root.QQI18n?.moneyField(label)||''):''} data-studio-field="${esc(path)}" data-idea-id="${esc(idea.id)}"${description?` aria-describedby="${description}"`:''}${issue?' aria-invalid="true"':''}`;
 let control;
 if(options.options)control=`<select ${attrs}>${options.options.map(([key,text])=>`<option value="${esc(key)}"${key===value?' selected':''}>${esc(text)}</option>`).join('')}</select>`;
 else if(options.area)control=`<textarea ${attrs} rows="${options.rows||3}" maxlength="${options.maxLength||10000}"${options.placeholder?` placeholder="${esc(options.placeholder)}"`:''}>${esc(value)}</textarea>`;
 else control=`<input ${attrs} type="text"${options.numeric?' inputmode="decimal" maxlength="32"':` maxlength="${options.maxLength||300}"`} value="${esc(value)}"${options.placeholder?` placeholder="${esc(options.placeholder)}"`:''}>`;
 return `<label class="studio-field${options.wide?' wide':''}" for="${id}"><span class="studio-field-label">${esc(label)}</span>${control}${help?`<small id="${id}-help">${esc(help)}</small>`:''}${issue?`<small id="${id}-error" class="studio-field-error">${esc(issue.message)}</small>`:''}</label>`;
}
function numeric(idea,path,label,issues,help='',wide=false){return field(idea,path,label,{numeric:true,issues,help,wide,placeholder:'Unknown'});}
function originLabel(idea){return idea.origin?.kind==='example'?'Editable example':idea.origin?.kind==='catalog'?'From service catalog':'Your idea';}
function originNote(idea){
 if(idea.origin?.kind==='example')return 'This began as example context. Edit or replace it; its demand, delivery effort and prices still need your research.';
 if(idea.origin?.kind==='catalog')return 'Copied catalog details are starting assumptions. Check the scope and source dates before using them for your studio.';
 return 'A working idea for research and planning. Its status does not establish demand or record a customer agreement.';
}
function ideaText(idea,path,fallback){
 const value=ideaValue(idea,path,path.split('.').reduce((record,key)=>record?.[key],idea));
 return value ? (root.QQI18n?.literal(value) ?? value) : fallback;
}
function examplesMenu(){
 const examples=root.QQStudioSeeds?.EXAMPLES||[];
 if(!examples.length)return '';
 return `<details class="studio-examples" data-disclosure="studio-examples"><summary>Add an example</summary><div class="studio-example-options">${examples.map(example=>button(`<strong>${esc(example.name)}</strong><span>${esc(example.summary||'Editable starting context')}</span>`,'example',`id="studio-example-${dom(example.id)}" data-id="${esc(example.id)}"`)).join('')}</div></details>`;
}
function library(studio){
 const rows=studio.offerings.map(idea=>{
  const contents=`<span class="studio-row-name">${esc(ideaText(idea,'name','Untitled idea'))}</span><span class="studio-row-family">${esc(ideaText(idea,'family',''))}</span><span class="studio-row-arrow" aria-hidden="true">→</span>`;
  return `<li>${button(contents,'select',`id="studio-select-${dom(idea.id)}" data-id="${esc(idea.id)}"`,'studio-idea-row')}</li>`;
 }).join('');
 return `<section aria-labelledby="studio-heading"><div class="studio-home-heading"><h1 id="studio-heading" tabindex="-1">Your ideas</h1>${button('<span aria-hidden="true">＋</span> New idea','add','id="studio-add"','studio-new')}</div>
 ${rows?`<ul class="studio-ideas">${rows}</ul>`:'<p class="studio-empty">Start with an idea of your own, or choose an example below.</p>'}
 <div class="studio-work-links">${rows?button('Compare ideas','tab','id="studio-compare" data-tab="compare"','studio-link'):''}${examplesMenu()}</div></section>`;
}
function offer(idea){
 return `<div class="studio-fields">
 ${field(idea,'name','Idea name',{placeholder:'A working title',maxLength:200,wide:true})}
 ${field(idea,'buyer','Possible buyer',{area:true,placeholder:'Who has the problem and could pay for help?'})}
 ${field(idea,'deliverables','What the buyer receives',{area:true,placeholder:'Outputs the buyer can inspect and use'})}
 </div>
 <details class="studio-more" data-disclosure="studio-scope-${esc(idea.id)}"><summary>Scope and pricing unit</summary><div class="studio-fields">
 ${field(idea,'unit','One priced engagement means…',{placeholder:'For example: one brief, one batch, or one review',help:'Defines the unit compared in Numbers. A possible repeat does not guarantee another sale.',wide:true})}
 ${field(idea,'problem','Problem or decision to help with',{area:true,placeholder:'What would become easier or clearer?'})}
 ${field(idea,'scope','Scope and exclusions',{area:true,placeholder:'What is included, and where does this job stop?'})}
 ${field(idea,'family','Service family',{placeholder:'Your own grouping',help:'Free text; use any family that fits this idea.'})}
 </div></details>
 <details class="studio-more" data-disclosure="studio-delivery-${esc(idea.id)}"><summary>Inputs, handoffs and completion checks</summary><div class="studio-fields">
 ${field(idea,'inputs','Required files, data or materials',{area:true,help:'Include access, quality and permissions that need checking.'})}
 ${field(idea,'handoffs','Who does what, and in what order?',{area:true,help:'A planning checklist. These notes do not create new simulator stages.'})}
 ${field(idea,'acceptance','How would you know the work is done?',{area:true,wide:true,placeholder:'Review, approval and quality checks'})}
 </div></details>`;
}
function phases(ui){return `<div class="studio-phases" role="group" aria-label="Engagement cost basis">${[['first','First engagement'],['repeat','Later engagement']].map(([phase,label])=>button(label,'phase',`id="studio-phase-${phase}" data-phase="${phase}" aria-pressed="${ui.phase===phase}"`)).join('')}</div>`;}
function phaseResults(idea,c,phase){
 const first=phase==='first';
 return {first,price:c.price,direct:first?c.firstDirectCosts:c.directCosts,ownerAllowance:first?(c.ownerAllowance===null||c.setupOwnerAllowance===null?null:c.ownerAllowance+c.setupOwnerAllowance):c.ownerAllowance,overhead:c.overhead,total:first?c.firstTotalCost:c.repeatTotalCost,remainder:first?c.firstDelivery:c.afterOwner,workHours:first?c.firstHours:c.deliveryHours,ownerHours:first?c.firstOwnerHours:c.ownerHours,ownerReturn:first?c.firstOwnerReturn:c.repeatOwnerReturn,ownerHourly:first?c.firstOwnerHourly:c.repeatOwnerHourly};
}
function row(label,value,cls=''){return `<div class="${cls}"><dt>${label}</dt><dd>${value}</dd></div>`;}
function economicsSummary(idea,c,ui){
 const r=phaseResults(idea,c,ui.phase),missing=c.issues.filter(issue=>issue.kind==='unknown'&&(r.first||!/(^setup|\.setupHours$)/.test(issue.path))),invalid=c.issues.filter(issue=>issue.kind==='invalid'&&(r.first||!/(^setup|\.setupHours$)/.test(issue.path)));
 const meaning=r.remainder===null||r.remainder===undefined?'Some required estimates are unknown. Complete them to compare the full result.':r.remainder<0?money(-r.remainder)+' below your stated cost and time allowances.':r.remainder===0?'Covers these estimates and allowances with no remainder.':'Available for profit or contingency within these assumptions.';
 return `<aside class="studio-economics" aria-label="Selected engagement estimate"><h3>${r.first?'First engagement':'Later engagement'} estimate</h3><p>${r.first?'Includes setup once, plus one delivery.':'One further delivery that can reuse the same preparation; setup is excluded. Another sale is not assumed.'}</p><dl>
 ${row('Proposed price',money(r.price))}${row('Direct costs'+(r.first?' including setup':''),money(r.direct))}${row('Total work hours',hours(r.workHours))}${row('Your estimated time',hours(r.ownerHours))}${row('Your time allowance',money(r.ownerAllowance))}${row('Allocated overhead',money(r.overhead))}${row('All stated costs & time allowances',money(r.total))}${row('Left after your time & overhead',money(r.remainder),'studio-total '+(r.remainder<0?'studio-negative':''))}
 </dl><p>${esc(meaning)}</p><p>Total work hours sum your time and paid-role time${r.first?', including setup':''}; they do not estimate elapsed turnaround.</p><dl>${row('Available per owner hour',r.ownerHourly===null||r.ownerHourly===undefined?'—':money(r.ownerHourly)+'/h')}</dl><p>Per-hour amount is after direct costs and overhead, before valuing your time. It is not a wage or guaranteed income. Zero or unknown owner hours give no hourly result.</p><p>Before tax and unlisted costs. Time and overhead are planning allowances, not recorded payments.</p>
 ${invalid.length?`<div class="studio-callout warning">Correct ${invalid.length} invalid ${invalid.length===1?'value':'values'} to complete this estimate.</div>`:missing.length?`<div class="studio-callout unknown">${missing.length} ${missing.length===1?'estimate is':'estimates are'} still unknown. Blank does not mean zero.</div>`:''}</aside>`;
}
function roleFields(idea,c,setup=false){
 const roles=idea.roles||[];
 if(!roles.length)return '<p class="studio-muted">No paid delivery roles are included. Add one if a partner or specialist will do work.</p>';
 return roles.map((role,index)=>`<div class="studio-role" data-render-key="studio-role-${esc(idea.id)}-${esc(role.id||index)}"><div class="studio-role-heading"><strong>${setup?esc(ideaText(idea,`roles.${index}.name`,'Delivery role '+(index+1))):'Delivery role '+(index+1)}</strong>${setup?'':button('Remove','role-remove',`id="studio-role-remove-${dom(idea.id)}-${index}" data-id="${esc(idea.id)}" data-index="${index}" aria-label="Remove delivery role ${index+1}"`,'small')}</div><div class="studio-fields">${setup?numeric(idea,`roles.${index}.setupHours`,'Setup hours once',c.issues,'Enter 0 only if no separate preparation is needed.',true):field(idea,`roles.${index}.name`,'Role / partner',{placeholder:'For example: analyst, designer or researcher',wide:true})+numeric(idea,`roles.${index}.hours`,'Hours per engagement',c.issues)+numeric(idea,`roles.${index}.rate`,'Cost per hour · $',c.issues)}</div></div>`).join('');
}
function numbers(idea,ui){
 const c=model().economics(idea);
 return `<div class="studio-section-heading"><div><h3>What could one engagement leave?</h3><p>Editable estimates in USD. Blank stays unknown; enter zero only when you mean no cost or effort.</p></div>${phases(ui)}</div>
 <div class="studio-numbers-layout"><div><div class="studio-fields">
 ${numeric(idea,'price','Proposed price per engagement · $',c.issues,'For one unit as defined in Idea details.',true)}
 ${numeric(idea,'directCost','Other direct costs · $',c.issues,'Supplier, materials, software, shipping or other job costs. Excludes the paid roles below.',true)}
 ${numeric(idea,'ownerHours','Your hours per engagement',c.issues,'Include scoping, coordination, review and delivery.')}
 ${numeric(idea,'ownerRate','Your time target · $/hour',c.issues,'What you want your time to earn; not a cash payment.')}
 ${numeric(idea,'overhead','Overhead allocated to this engagement · $',c.issues,'A share of business overhead, counted once.',true)}
 </div><div class="studio-role-section"><div class="studio-section-heading"><h3>Paid delivery roles</h3>${button('Add role','role-add',`id="studio-role-add-${dom(idea.id)}" data-id="${esc(idea.id)}"`,'small')}</div><p class="studio-muted">These are responsibilities, not required hires. Combine or remove roles to fit your plan. Keep your own work in your hours above; do not count it again here. Count each task once, including review and rework.</p>${roleFields(idea,c)}</div>
 <details class="studio-more" data-disclosure="studio-setup-${esc(idea.id)}"${ui.phase==='first'?' open':''}><summary>Setup needed once</summary><p class="studio-muted">Preparation before the first delivery, separate from the effort above. The same proposed price is used for both comparisons.</p><div class="studio-fields">
 ${numeric(idea,'setupCost','Other setup costs · $',c.issues,'Excludes setup labor below.',true)}
 ${numeric(idea,'setupOwnerHours','Your setup hours',c.issues,'Valued at the same owner-time target.',true)}
 </div>${roleFields(idea,c,true)}</details></div>${economicsSummary(idea,c,ui)}</div>`;
}
function sourceLinks(value){
 const found=[...new Set((String(value||'').match(/https?:\/\/[^\s<>"']+/g)||[]).map(url=>url.replace(/[.,;)]+$/,'')))].slice(0,12);
 const links=[];for(const value of found){try{const url=new URL(value);if(['http:','https:'].includes(url.protocol))links.push({url:url.href,label:url.hostname});}catch(e){}}
 return links;
}
function research(idea){
 const links=sourceLinks(idea.sources);
 return `<div class="studio-section-heading"><div><h3>What have you learned, and what comes next?</h3><p>Keep the source, date and scope of a claim. Your notes can stay unfinished.</p></div></div><div class="studio-fields">
 ${field(idea,'researchNotes','Research notes and open questions',{area:true,rows:6,wide:true,placeholder:'Buyer conversations, delivery tests, assumptions, limitations, and what you still need to learn'})}
 ${field(idea,'sources','Sources and references',{area:true,rows:5,wide:true,placeholder:'A URL or reference, date, what it supports, and any limits. One source per line works well.',help:'Links you enter are opened only when you choose them. A source about a market does not validate this idea’s revenue.'})}
 ${field(idea,'nextAction','Next validation step',{area:true,rows:3,wide:true,placeholder:'A small action, who will do it, and what evidence would help you decide'})}
 </div>${links.length?`<div class="studio-source-links"><h3>Open referenced sources</h3><ul>${links.map((link,index)=>`<li><a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}${links.filter(other=>other.label===link.label).length>1?' · source '+(index+1):''} <span class="studio-muted">(opens a new tab)</span></a></li>`).join('')}</ul></div>`:''}
 <div class="studio-callout unknown">Keep an observation separate from a prediction. A possible repeat service does not establish demand, renewal or monthly earnings.</div>`;
}
function ideaOptions(idea){
 return `<details class="studio-more" data-disclosure="studio-idea-options-${esc(idea.id)}"><summary>Idea options</summary><div class="studio-identity"><p class="studio-muted"><strong>${esc(originLabel(idea))}</strong><br>${esc(originNote(idea))}</p>${field(idea,'status','Working status',{options:Object.entries(statusLabels),help:'Your organization label; not a verified outcome.'})}</div>
 <div class="studio-editor-actions">${button('Duplicate','duplicate',`id="studio-duplicate-${dom(idea.id)}" data-id="${esc(idea.id)}"`)}${button('Delete','delete',`id="studio-delete-${dom(idea.id)}" data-id="${esc(idea.id)}"`,'ghost')}</div></details>`;
}
function backToIdeas(){
 return button('← Your ideas','tab','id="studio-back" data-tab="ideas"','studio-link studio-back');
}
function editor(idea,ui){
 const work=ui.section==='offer';
 const back=work?backToIdeas():button('← Back to idea','section','id="studio-back" data-section="offer"','studio-link studio-back');
 const next=field(idea,'nextAction','Next action',{area:true,rows:3,placeholder:'What’s the next thing to do?'});
 const detailKey='studio-details-'+idea.id;
 const surface=work?`<div class="studio-next">${next}</div>
 <details class="studio-details" data-disclosure="${esc(detailKey)}"${!idea.name?' open':''}><summary>Idea details</summary>${offer(idea)}${ideaOptions(idea)}</details>
 <div class="studio-work-links">${button('Numbers','section','id="studio-go-numbers" data-section="numbers"','studio-link')}${button('Research','section','id="studio-go-research" data-section="research"','studio-link')}${button('Plan this idea','plan',`id="studio-plan-${dom(idea.id)}" data-id="${esc(idea.id)}"`,'studio-link')}${button('Start a job from this idea','job',`id="studio-job-${dom(idea.id)}" data-id="${esc(idea.id)}"`,'studio-link')}</div>`:
 ui.section==='numbers'?numbers(idea,ui):research(idea);
 return `<section class="studio-editor" aria-label="Selected service idea" data-render-key="studio-editor-${esc(idea.id)}">${back}<h1 id="studio-heading" tabindex="-1">${esc(ideaText(idea,'name','Untitled idea'))}</h1>${!work&&idea.origin?.kind==='example'?'<p class="studio-origin">Editable example</p>':''}<div id="studio-editor-content">${surface}</div></section>`;
}
function compare(studio,ui){
 return `<section class="studio-compare" aria-labelledby="studio-heading">${backToIdeas()}<div class="studio-section-heading"><div><h1 id="studio-heading" tabindex="-1">Compare ideas</h1><p>Different scopes and evidence still matter. These figures use your estimates, without assuming sales volume.</p></div>${phases(ui)}</div>
 <div class="tablewrap" tabindex="0" role="region" aria-label="Scrollable service idea comparison"><table><caption>${ui.phase==='first'?'First engagement includes preparation once.':'Later engagement assumes the same preparation can be reused.'} USD · — means unknown or unavailable</caption><thead><tr><th scope="col">Idea / buyer / priced unit</th><th scope="col">Price</th><th scope="col">Direct costs</th><th scope="col">Total work hours</th><th scope="col">Your time value</th><th scope="col">All costs + time</th><th scope="col">Left after allowances</th><th scope="col">Available / owner hour</th><th scope="col">Next validation</th></tr></thead><tbody>${studio.offerings.map(idea=>{
 const c=model().economics(idea),r=phaseResults(idea,c,ui.phase);
 return `<tr data-render-key="studio-compare-${esc(idea.id)}"><td>${button(esc(ideaText(idea,'name','Untitled idea')),'select',`id="studio-compare-select-${dom(idea.id)}" data-id="${esc(idea.id)}"`,'table-link')}<small>${esc(ideaText(idea,'buyer','Buyer unknown'))}</small><small>Priced unit: ${esc(ideaText(idea,'unit','Not defined yet'))}</small><small>${esc(statusLabels[idea.status]||'Idea')} · ${esc(originLabel(idea))}</small></td><td>${money(r.price)}</td><td>${money(r.direct)}</td><td>${hours(r.workHours)}<small>Your hours: ${hours(r.ownerHours)}</small></td><td>${money(r.ownerAllowance)}</td><td>${money(r.total)}</td><td class="${r.remainder<0?'studio-negative':''}">${money(r.remainder)}</td><td>${r.ownerHourly===null||r.ownerHourly===undefined?'—':money(r.ownerHourly)+'/h'}</td><td class="studio-next-validation">${esc(ideaText(idea,'nextAction','Choose a next check'))}</td></tr>`;
 }).join('')}</tbody></table></div><p class="studio-footer-note">Total work hours sum your time and paid-role time${ui.phase==='first'?', including setup':''}; they do not estimate elapsed turnaround. All costs include direct costs, allocated overhead and your time allowance. Available per owner hour is before valuing your time, after direct costs and overhead; it is unavailable for zero owner hours. Results exclude tax and unlisted costs. A higher price does not imply a buyer will accept it.</p></section>`;
}
function render(studio,options={}){
 const offerings=Array.isArray(studio?.offerings)?studio.offerings:[],selected=offerings.find(idea=>idea.id===options.selectedId);
 const ui={section:['numbers','research'].includes(options.section)?options.section:'offer',phase:options.phase==='repeat'?'repeat':'first'};
 const content=options.tab==='compare'&&offerings.length?compare({offerings},ui):selected?editor(selected,ui):library({offerings});
 return `<div class="studio-workbench">${content}</div>`;
}

const api={render,sourceLinks};
root.QQStudioView=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
