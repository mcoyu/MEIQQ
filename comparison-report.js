/* Self-contained, human-readable comparison report generation; no DOM required. */
(function(root){
'use strict';
const q=root.QQ||(typeof require==='function'?require('./engine.js'):null);
const presets=root.QQPresets||(typeof require==='function'?require('./presets.js'):null);
const evidence=root.QQPresetEvidence||(typeof require==='function'?require('./preset-evidence.js'):null);
const catalog=root.QQServiceCatalog||(typeof require==='function'?require('./service-catalog.js'):null);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function reportName(value){
 if(root.QQI18n?.language!=='zh-CN')return esc(value);
 const known=value==='Restaurant studio example'||value===q.DEFAULT.name||catalog.SERVICES.some(item=>item.name===value);
 return esc(known?root.QQI18n.text(value):root.QQI18n.literal(value));
}
const money=value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value));
const number=value=>Number(value||0).toFixed(1);
const rate=value=>value==null?'—':(value*100).toFixed(1)+'%';
const safeName=value=>String(value||'comparison').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').slice(0,80)||'comparison';
function recipe(config){
 const r=config?.recipe;if(!r)return 'Custom assumptions (no saved recipe origin)';
 const audit=presets?.audit?.(config);if(audit?.compatible!==true)return `Unsupported recipe provenance · catalog ${r.catalog||'unknown'} · ledger ${r.ledger||'unknown'}`;
 const groups=[presets?.MARKETS,presets?.OPERATIONS,presets?.MIXES,presets?.CONDITIONS],ids=[r.market,r.operation,r.mix,r.condition];
 const found=groups.map((items,i)=>items?.find(v=>v.id===ids[i]));
 return found.every(Boolean)?found.map(v=>v.name).join(' · '):`${r.catalog} · ${ids.join(' · ')}`;
}
function recipeAudit(config){return presets?.audit?.(config)||{hasRecipe:false,edited:[],lineage:[],records:[],limitations:['Recipe audit API is unavailable.']};}
function editSummary(config,audit){if(!config?.recipe)return 'No recipe origin';if(audit.compatible!==true)return 'Unavailable — unsupported recipe catalog or ledger';return audit.edited.length?audit.edited.join(', '):'No detected edits';}
function flatten(value,path='',out={}){
 if(path==='recipe')return out;
 if(Array.isArray(value)){
  if(path==='services')for(const item of value)flatten(item,`services.${item?.id||'unknown'}`,out);
  else value.forEach((item,index)=>flatten(item,`${path}.${index}`,out));
 }else if(value&&typeof value==='object')for(const key of Object.keys(value).sort())flatten(value[key],path?`${path}.${key}`:key,out);
 else out[path]=value;
 return out;
}
function valueText(value,path=''){
 if(root.QQI18n?.language==='zh-CN' && typeof value==='number' && /(?:^|\.)(startingCash|ownerTarget|designerRate|overhead|price|print|designOnlyPrice|modeledPriceRange\.\d+)$/.test(path))return root.QQI18n.yuan(value);
 return value===undefined?'not set':value===null?'none':typeof value==='boolean'?(value?'On':'Off'):String(value);}
function assumptionRows(current,baseline){
 const a=flatten(baseline.config),b=flatten(current.config),keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
 return keys.filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key])).map(key=>`<tr><th>${esc(key)}</th><td>${esc(valueText(a[key],key))}</td><td>${esc(valueText(b[key],key))}</td></tr>`).join('')||'<tr><td colspan="3">No applied assumptions changed.</td></tr>';
}
function results(run){const a=q.analytics(run),m=q.metrics(run);return{a,m,rows:[['Elapsed day',run.day],['Cash',money(run.cash)],['Delivered revenue',money(run.revenue)],['Operating result',money(a.profit)],['Operating margin',rate(a.operatingMargin)],['Owner hours',number(run.ownerHours)],['Result after owner time',money(a.periodAfterOwner)+(run.replayJournal?' · period-end targets':' · current target, rate history unavailable')],["All hours at today's target",money(a.afterOwner)+' at '+money(run.config.ownerTarget)+'/h'],['Delivered projects',m.delivered],['Skipped campaign quotes',a.skippedCampaigns??0],['Late open deliveries',m.late],['Receivables',money(m.receivable)]]};}
function serviceRows(current,baseline){
 const a=q.analytics(current).services,b=q.analytics(baseline).services,ids=[...new Set([...a,...b].map(v=>v.id))];
 const by=(rows,id)=>rows.find(v=>v.id===id)||{};
 return ids.map(id=>{const x=by(b,id),y=by(a,id);return `<tr><th>${reportName(y.name||x.name||id)}</th><td>${x.delivered||0}</td><td>${money(x.revenue)}</td><td>${money(x.deliveredCost)}</td><td>${money(x.contribution)}</td><td>${y.delivered||0}</td><td>${money(y.revenue)}</td><td>${money(y.deliveredCost)}</td><td>${money(y.contribution)}</td></tr>`;}).join('')||'<tr><td colspan="9">No service results yet.</td></tr>';
}
function choiceRows(config,label){
 let estimate;try{estimate=q.estimate(config);}catch(error){return `<tr><th>${esc(label)}</th><td colspan="7">Unit choices unavailable: ${esc(error.message)}</td></tr>`;}
 return estimate.services.map(row=>{const option=row.fulfillmentOptions,campaign=row.renewalBasis?.kind==='separately-quoted-campaign'?`${row.renewalBasis.cadenceDays}-day cadence within ${row.renewalBasis.relationshipDays}-day relationship; up to ${row.renewalBasis.maxCampaigns??'the modeled'} cadence slots; each cycle separately quoted`:(row.renewalBasis?.kind||'one-off');if(!option)return `<tr><th>${esc(label)} · ${reportName(row.name)}</th><td>Single route</td><td>—</td><td>—</td><td>${money(row.perProject.price)}</td><td>${money(row.perProject.directCost)}</td><td>${money(row.perProject.contribution)}</td><td>${esc(campaign)}</td></tr>`;return `<tr><th>${esc(label)} · ${reportName(row.name)}</th><td>${rate(option.managedShare)}</td><td>${money(option.agencyManaged.price)} / ${money(option.agencyManaged.directCost)} / ${money(option.agencyManaged.contribution)}</td><td>${money(option.designOnly.price)} / ${money(option.designOnly.directCost)} / ${money(option.designOnly.contribution)}</td><td>${money(row.perProject.price)}</td><td>${money(row.perProject.directCost)}</td><td>${money(row.perProject.contribution)}</td><td>${esc(campaign)}</td></tr>`;}).join('');
}
function fulfillmentText(project){const route=project.terms?.fulfillment;if(!route)return 'Single route';if(route.mode==='agency-managed')return `Agency-managed print · ${money(route.managedPrice)} bundle · ${money(route.managedPrintCost)} supplier cost`;if(route.mode==='design-only')return `Design only / client self-print · ${money(route.designOnlyPrice)} fee · no agency print purchase`;return `Unsupported fulfillment route · ${String(route.mode??'unknown')}`;}
function termsText(project){const terms=project.terms||{},campaign=project.service?.campaign;return `${terms.paymentDays??'—'}d payment · ${terms.approvalDays??'—'}d approval · ${terms.printDays??'—'}d print · ${terms.leadDays??'—'}d promise${campaign?` · ${campaign.cadenceDays}d cadence / ${campaign.relationshipDays}d relationship`:''}`;}
function campaignRows(run,label){return q.analytics(run).contracts.filter(row=>row.kind==='campaign-relationship').map(row=>{const charges=Array.isArray(row.campaignCharges)?row.campaignCharges:[];return `<tr><th>${esc(label)} · ${esc(row.client)}<small>${esc(row.id)}</small></th><td>${esc(row.status||'unknown')}</td><td>${esc(row.cadenceDays==null?'Unavailable':row.cadenceDays+' days')}</td><td>${esc(row.relationshipEndDay==null?'Unavailable':'Day '+row.relationshipEndDay)}</td><td>${esc(row.nextQuoteDay==null?'None scheduled':'Day '+row.nextQuoteDay)}</td><td>${esc(row.skippedCampaigns??0)}</td><td>${charges.length}</td><td>${money(charges.reduce((sum,charge)=>sum+(Number(charge.price)||0),0))}</td></tr>`;}).join('');}
function projectRows(current,baseline,comparison){
 const prior=new Map(comparison.flags.sameWorkloadIdentity?baseline.projects.map(p=>[p.demandId,p]):[]),accepted=current.projects.filter(p=>p.accepted!==undefined).sort((a,b)=>(Number(b.delivered)-Number(a.delivered))||(a.due-b.due)||a.id.localeCompare(b.id)),limit=1000;
 const rows=accepted.slice(0,limit).map(p=>{const match=prior.get(p.demandId),old=match?.clientId===p.clientId&&match?.serviceId===p.serviceId?match:null,late=!p.delivered&&current.day>p.due;return `<tr><th>${esc(p.id)}<small>${esc(p.client)} · ${reportName(p.service?.name||p.serviceId)}</small></th><td>${esc(p.stage)}${late?' · late':''}</td><td>${esc(fulfillmentText(p))}</td><td>${esc(termsText(p))}</td><td>${money(p.price)}</td><td>${money(p.cost)}</td><td>${number(p.ownerHours)} / ${number(p.designHours)}</td><td>${p.due}</td><td>${old?`${money(old.price)} / ${money(old.cost)} / ${esc(old.stage)} · ${esc(fulfillmentText(old))}`:'No verified match'}</td></tr>`;}).join('');
 return {html:rows||'<tr><td colspan="9">No accepted projects yet.</td></tr>',note:accepted.length>limit?`Showing ${limit} of ${accepted.length} accepted current projects; aggregate totals above include all projects.`:''};
}
function lineageTable(label,audit){
 if(audit.compatible!==true)return `<h3>${esc(label)}</h3><p class="warn">Derivation unavailable: ${esc((audit.limitations||[]).join(' ')||'unsupported recipe provenance')} The saved exact assumptions remain readable above, but this build cannot verify their recipe ledger.</p>`;
 return `<h3>${esc(label)}</h3><p>Coverage ${(audit.coverage*100).toFixed(0)}% · applied fingerprint ${audit.appliedHashValid?'verified':'not verified'} · empirically calibrated: no.</p><table><tr><th>Value</th><th>Applied</th><th>Current</th><th>Status</th><th>Derivation</th><th>Evidence records</th></tr>${audit.lineage.map(row=>`<tr><th>${esc(row.path)}</th><td>${esc(valueText(row.appliedValue,row.path))}</td><td>${esc(valueText(row.currentValue,row.path))}</td><td>${row.edited?'Edited after recipe':'As applied'}</td><td>${esc(row.derivation)}</td><td>${esc((row.recordIds||[]).join(', '))}<small>${esc(row.confidence||'unknown')} confidence · ${esc(row.kind||'modeled-assumption')}</small></td></tr>`).join('')}</table>${(audit.limitations||[]).map(v=>`<p>${esc(v)}</p>`).join('')}`;
}
function sources(configs,audits){
 const labels=['Baseline','Current'];
 const observed=configs.flatMap((config,index)=>{
  return Object.entries(config.assumptionRecords||{}).map(([path,record])=>`<tr><th>${labels[index]} · ${esc(path)}</th><td>${esc(valueText(q.assumptionRecordValue(config,path),path))}</td><td>${esc(valueText(record.value,path))}</td><td>${esc(record.date)}</td><td translate="no">${esc(record.source)}</td><td translate="no">${esc(record.sample)}</td></tr>`);
 });
 const observations=observed.length?`<section><h2>Studio assumption records</h2><table><tr><th>Run and assumption</th><th>Applied value</th><th>Recorded value</th><th>As of</th><th>Source</th><th>Sample</th></tr>${observed.join('')}</table></section>`:'';
 const scopeRows=configs.flatMap((config,index)=>config.services.filter(s=>s.spec?.printCostBasis).map(s=>`<tr><th>${labels[index]} · ${reportName(s.name)}</th><td>${money(s.print)}</td><td>${esc(s.spec.printCostBasis)}</td><td>${esc(s.spec.printSpec)}</td></tr>`));
 const scopes=scopeRows.length?`<section><h2>Supplier allowances and original package references</h2><table><tr><th>Run and offer</th><th>Scenario allowance per batch</th><th>Published comparison</th><th>Reference specification</th></tr>${scopeRows.join('')}</table></section>`:'';
 const serviceRecords=configs.flatMap(config=>config.services.flatMap(s=>catalog?.auditService(s)?.records||[]));
 const records=[...new Map([...audits.flatMap(a=>a.records||[]),...serviceRecords].map(record=>[record.id,record])).values()];
 const hasRecipe=configs.some(c=>c.recipe),ledger=hasRecipe?evidence?.LEDGER:null;
 const recipes=hasRecipe?`<section><h2>Per-value recipe derivation</h2><p>Each supported row shows its frozen applied value, current value, edit status, derivation and evidence-record IDs.</p>${lineageTable('Baseline recipe',audits[0])}${lineageTable('Current recipe',audits[1])}</section>`:'';
 if(!records.length&&!hasRecipe)return observations+scopes;
 const sourceRows=records.map(record=>`<article><h3>${esc(record.title)}</h3><p>${esc(record.publisher)} · ${esc(record.kind)}${record.sourceDate?` · source date ${esc(record.sourceDate)}`:''} · retrieved ${esc(record.retrieved)}</p><p>${esc(record.scope||record.caveat)}</p>${record.url?`<p>${esc(record.url)}</p>`:''}<details><summary>Frozen values used or recorded</summary><pre translate="no">${esc(JSON.stringify(record.snapshot||record.observations,null,2))}</pre></details></article>`).join('');
 return observations+scopes+recipes+`<section><h2>Evidence records</h2>${ledger?`<p>${esc(ledger.id)} · version ${esc(ledger.version)} · SHA-256 ${esc(ledger.sha256)}</p>`:''}${sourceRows||'<p>No compatible frozen evidence records are available for the selected recipe provenance.</p>'}</section>`;
}
function decisionDetails(result){
 if(!result.comparable||!result.decision)return '';
 const {cash,capacity,backlog}=result.decision;
 const {baseline:a,alternative:b}=cash;
 const signed=(n,format=money)=>n==null?'Unavailable':(n<0?'−':n>0?'+':'')+format(Math.abs(n));
 const hours=n=>n==null?'Unavailable':n.toLocaleString('en-US',{maximumFractionDigits:2})+' h';
 const row=(label,left,right)=>'<tr><th scope="row">'+label+'</th><td>'+left+'</td><td>'+right+'</td></tr>';
 const cashLines=[
  ['Opening cash','openingCash'],['Client payments received','receipts'],['Owner funding','funding'],
 ].map(([label,key])=>row(label,money(a[key]),money(b[key])));
 cashLines.push(row('Spending',money(result.baseline.cost),money(result.alternative.cost)),row('Closing cash',money(a.closingCash),money(b.closingCash)));
 for(const [label,key] of [['Opening deposits on unfinished work','openingDeposits'],['Closing deposits on unfinished work','closingDeposits'],['Opening balances owed on delivered work','openingReceivable'],['Closing balances owed on delivered work','closingReceivable']]){
  cashLines.push(row(label,money(a[key]),money(b[key])));
 }
 cashLines.push(row('Lowest daily closing cash',money(a.lowest.cash)+' · day '+a.lowest.day,money(b.lowest.cash)+' · day '+b.lowest.day));
 const changes=[['opening cash',cash.opening],['operating profit',result.delta.profit],
  [(cash.deposits>=0?'more':'less')+' in deposits on unfinished work',cash.deposits],
  [(cash.receivables>=0?'less':'more')+' owed by clients on delivered work',cash.receivables],['owner funding',cash.funding]];
 const bridge=changes.filter(([,value])=>value!==0).map(([label,value])=>signed(value)+' '+label).join(', ');
 const groupLabels={shared:'Open in both runs',cleared:'Open in the original, delivered in the changed run',additional:'Additional accepted work still open in the changed run',delayed:'Delivered in the original, open in the changed run',originalOnly:'Open in the original only and unaccepted or absent in the changed run'};
 const groupRows=Object.entries(backlog.groups).filter(([,jobs])=>jobs.length).map(([key,jobs])=>{
  const items=jobs.map(p=>'<li>'+esc(p.service)+' · cycle '+p.cycle+' · '+money(p.price)+'<small>Original '+esc(p.originalId||'—')+' · Changed '+esc(p.changedId||'—')+'</small></li>').join('');
  return '<p><strong>'+groupLabels[key]+' · '+jobs.length+'</strong></p><ul>'+items+'</ul>';
 });
 const role=capacity.owner?'Owner':'Designer';
 const availability=capacity.owner?'Available hours include reserved outreach. Owner time is valued separately from operating expenses.':'Designer labor is charged for hours worked.';
 const staffing='<p class="replay-staffing">'+role+' capacity '+signed(capacity.availableDifference,hours)+' available · '+signed(capacity.workedDifference,hours)+' worked. '+availability+'</p>';
 const g=backlog.groups;
 const groupsSummary=[[g.shared,'open in both'],[g.cleared,'originally open, now delivered'],[g.additional,'newly accepted and still open'],
  [g.delayed,'originally delivered, now open'],[g.originalOnly,'open only in the original and unaccepted or absent in the changed run']]
  .filter(([jobs])=>jobs.length).map(([jobs,label])=>jobs.length+' '+label).join(' · ')||'Neither run had accepted work awaiting delivery';
 return '<div class="replay-decision">'+staffing+
  '<details><summary>Why did cash change?</summary><p>Closing cash difference <strong>'+signed(cash.closing)+'</strong>. '+(bridge?bridge+'.':'All cash bridge components held steady.')+'</p>'+
  '<p>Changed minus original over days '+result.firstDay+'–'+result.endDay+' · opening cash '+signed(cash.opening)+', receipts '+signed(cash.receipts)+', owner funding '+signed(cash.funding)+', spending impact '+signed(-cash.spending)+'.</p>'+
  '<table class="replay-metrics"><thead><tr><th scope="col">Cash and timing</th><th scope="col">Original</th><th scope="col">Changed</th></tr></thead><tbody>'+cashLines.join('')+'</tbody></table></details>'+
  '<details><summary>Which jobs make up the backlog?</summary><p>'+groupsSummary+'.</p><p>Accepted value awaiting delivery on day '+result.endDay+' · '+money(backlog.originalValue)+' original · '+money(backlog.changedValue)+' changed. Revenue is earned on delivery.</p>'+groupRows.join('')+'</details></div>';
}
function replaySection(current,baseline,record){
 if(!record)return '';
 const labels={designerHours:'Weekly hours per designer',designers:'Number of designers',ownerHours:'Owner hours per week'};
 const {month,key,before,after,demandId,sourceDay,firstDay,endDay}=record;
 if(!Object.hasOwn(labels,key)||!Number.isInteger(month)||month<1||month>12||firstDay!==(month-1)*30+1||endDay!==month*30||
    !Number.isInteger(sourceDay)||sourceDay<0||sourceDay>360||!Number.isFinite(before)||!Number.isFinite(after)||
    baseline.config[key]!==before||current.config[key]!==after||baseline.day!==endDay||current.day!==endDay)return '';
 const replay=q.capacityPairResult(baseline,current,{month,key,before,value:after,demandId,sourceDay});
 if(!replay.comparable)return '';
 const baseMonth=q.monthResult(baseline,month),currentMonth=q.monthResult(current,month);
 const {baseline:original,alternative:changed,delta}=replay;
 const difference=(value,format)=>value===0?'No change':(value>0?'+':'−')+format(Math.abs(value));
 const metric=(label,a,b,gap,format)=>`<tr><th scope="row">${label}</th><td>${format(a)}</td><td>${format(b)}</td><td>${difference(gap,format)}</td></tr>`;
 const jobText=job=>{
  if(!job)return 'No matching job';
  const stage=job.delivered?'Delivered day '+job.deliveredDay:(q.LABELS[job.stage]||job.stage);
  return job.id+' · '+stage+(!job.delivered&&job.remainingWorkHours>0?' · '+job.remainingWorkHours+' h left':'');
 };
 const job=demandId?`<tr><th scope="row">Selected job</th><td>${esc(jobText(original.job))}</td><td>${esc(jobText(changed.job))}</td><td>—</td></tr>`:'';
 const backlog=changed.backlog===0?(original.backlog?'The changed run cleared the backlog.':'Both runs ended with an empty backlog.'):
  (delta.backlog===0?'The backlog stayed at '+changed.backlog+' undelivered.':'Undelivered jobs went from '+original.backlog+' to '+changed.backlog+'.');
 const earnings=delta.profit===0?'Operating profit stayed the same.':'Operating profit '+(delta.profit>0?'increased':'decreased')+' by '+money(Math.abs(delta.profit))+'.';
 const movement=amount=>amount===0?'held steady':(amount>0?'rose by ':'fell by ')+money(Math.abs(amount));
 const drivers=delta.revenue||delta.cost?' Delivered revenue '+movement(delta.revenue)+' and costs '+movement(delta.cost)+'.':'';
 const projection=sourceDay<endDay?` Both copies project days ${Math.max(firstDay,sourceDay+1)}–${endDay} beyond that cutoff.`:'';
 return `<section><h2>One-change replay · Month ${month}</h2><p>Days ${firstDay}–${endDay} · ${labels[key]} · ${before} → ${after}</p>
 <p><strong>${backlog} ${earnings}</strong>${drivers}</p>
 <table><thead><tr><th scope="col">Measure</th><th scope="col">Original</th><th scope="col">Changed</th><th scope="col">Change</th></tr></thead><tbody>${job}
 ${metric('Undelivered jobs at period end',original.backlog,changed.backlog,delta.backlog,String)}
 ${metric('Jobs delivered this period',original.delivered,changed.delivered,delta.delivered,String)}
 ${metric('Operating profit this period',original.profit,changed.profit,delta.profit,money)}
 ${metric('Owner hours this period',baseMonth.ownerHours,currentMonth.ownerHours,currentMonth.ownerHours-baseMonth.ownerHours,number)}
 ${metric('Profit after owner time',original.afterOwner,changed.afterOwner,delta.afterOwner,money)}
 ${metric('Closing cash',original.closingCash,changed.closingCash,delta.closingCash,money)}</tbody></table>
 <p>Backlog counts accepted jobs still awaiting delivery on day ${endDay}. The two runs started with the same opening workload and received ${Number.isInteger(original.inquiries)?original.inquiries+' matching external '+(original.inquiries===1?'inquiry':'inquiries'):'matching external inquiries'} during the replay.</p>
 <p>The active run had reached day ${sourceDay} when this replay was requested.${projection}</p>${decisionDetails(replay)}</section>${jobCostSection(replay,'month-job-costs')}`;
}
function jobCostSection(result,anchor='job-costs'){
 const {firstDay,endDay,baseline,alternative,delta,rows,byChangedStatus}=result.costAttribution;
 const hours=n=>n==null?'Unavailable':n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' h';
 const change=(n,format=money)=>n==null?'Unavailable':(n===0?'':n>0?'+':'−')+format(Math.abs(n));
 const measures=[['Designer labor','designLabor'],['Supplier costs','supplierCost'],['Other direct job costs','otherDirectCost'],['Shared overhead','overhead'],['Total incurred costs','cost']];
 const totals=measures.map(([label,key])=>`<tr><th scope="row">${label}</th><td>${money(baseline[key])}</td><td>${money(alternative[key])}</td><td>${change(delta[key])}</td></tr>`).join('');
 const status=job=>{
  if(!job)return 'No matching job';
  const stage=job.deliveredDay!=null?'delivered day '+job.deliveredDay:(q.LABELS[job.stage]||job.stage);
  return job.id+' · '+stage;
 };
 const jobs=rows.filter(row=>row.demandId===result.demandId||Object.values(row.delta).some(n=>n!=null&&n!==0)||
  (row.baseline?.unfinished?row.baseline.cost:0)!==(row.alternative?.unfinished?row.alternative.cost:0));
 const details=jobs.map(row=>{
  const a=row.baseline,b=row.alternative,d=row.delta,job=b||a;
  const measured=(side,key,format)=>side?format(side[key]):'—';
  return `<tr><th scope="row">${esc(job.client)}<small>${esc(job.service)}${job.cycle>1?' · cycle '+esc(job.cycle):''}${row.demandId===result.demandId?' · selected job':''}</small><small>Original ${esc(status(a))}</small><small>Changed ${esc(status(b))}</small></th>
   <td>${change(d.designHours,hours)}<small>${measured(a,'designHours',hours)} → ${measured(b,'designHours',hours)}</small></td>
   <td>${change(d.designLabor)}</td><td>${change(d.supplierCost)}</td><td>${change(d.otherDirectCost)}</td>
   <td>${change(d.cost)}<small>${measured(a,'cost',money)} → ${measured(b,'cost',money)}</small></td></tr>`;
 }).join('');
 const statusSplit=[['Jobs unfinished in the changed run',byChangedStatus.unfinished],['Jobs delivered in the changed run',byChangedStatus.delivered]];
 if(byChangedStatus.unaccepted)statusSplit.push(['Jobs unaccepted in the changed run',byChangedStatus.unaccepted]);
 if(byChangedStatus.absent)statusSplit.push(['Jobs absent from the changed run',byChangedStatus.absent]);
 if(delta.overhead)statusSplit.push(['Shared overhead',delta.overhead]);
 statusSplit.push(['Total change in incurred costs',delta.cost]);
 const statusRows=statusSplit.map(([label,value])=>`<tr><th scope="row">${label}</th><td>${change(value)}</td></tr>`).join('');
 const time=baseline.designHours!=null&&alternative.designHours!=null?`Designer time worked went from ${hours(baseline.designHours)} to ${hours(alternative.designHours)} (${change(delta.designHours,hours)}).`:`Designer-hour history is incomplete for this period.${delta.designHours!=null?' The recorded difference between schedules is '+change(delta.designHours,hours)+'.':''}`;
 return `<section class="job-costs" id="${anchor}"><h2>Job costs and unfinished work</h2><details><summary>What changed the cost?</summary>
 <p>Costs posted during days ${firstDay}–${endDay} changed by <strong>${change(delta.cost)}</strong>. Jobs still awaiting delivery on day ${endDay} accounted for <strong>${money(alternative.unfinishedCost)}</strong> of the changed run’s costs during those days, compared with ${money(baseline.unfinishedCost)} in the original (${change(delta.unfinishedCost)}). These costs enter operating profit when incurred. Revenue is recognized at delivery.</p>
 <table><thead><tr><th>Cost</th><th>Original</th><th>Changed</th><th>Difference</th></tr></thead><tbody>${totals}</tbody></table>
 <h3>Cost difference by job status on day ${endDay}</h3><p>Each job contributes its changed cost less its original cost. Jobs are grouped by their status in the changed run.</p>
 <table><thead><tr><th>Closing status</th><th>Cost difference</th></tr></thead><tbody>${statusRows}</tbody></table>
 <h3>Which jobs used the hours</h3><p>${time} Hours are rounded independently to two decimals. Labor dollars use the posted charges for each job.</p>
 ${details?`<table class="job-ledger"><thead><tr><th>Job and closing status</th><th>Designer hours difference</th><th>Designer labor difference</th><th>Supplier cost difference</th><th>Other costs difference</th><th>Total job cost difference</th></tr></thead><tbody>${details}</tbody></table><p>The smaller figures show original and changed values for hours and direct job cost. A dash marks a job absent from that schedule.</p>`:'<p>No job-level differences were recorded during this period.</p>'}</details></section>`;
}
function carrySection(result){
 const {baseline,alternative,delta}=result;
 const gap=n=>n===0?money(0):(n>0?'+':'−')+money(Math.abs(n));
 const rows=result.rows.map(row=>`<tr><th scope="row">Month ${row.month} · day ${row.endDay}</th><td>${money(row.baseline.profit)}</td><td>${money(row.alternative.profit)}</td><td>${gap(row.delta.profit)}</td><td>${gap(row.cumulativeProfit)}</td></tr>`).join('');
 const projected=result.projectionFromDay!=null?` Days ${result.projectionFromDay}–${result.endDay} are projected in both runs.${result.projectFromClose?' This older comparison continues under the saved closing assumptions. Later decisions in the original scenario were unavailable.':''}`:'';
 const delivery=job=>!job?'absent at close':job.delivered?'delivered day '+job.deliveredDay:'undelivered at close';
 const timing=baseline.job||alternative.job?`<p>Selected job ${esc(baseline.job?.id||alternative.job?.id)} · Original ${delivery(baseline.job)}. Changed ${delivery(alternative.job)}.</p>`:'';
 const finish=delta.profit===0?'Both schedules earned the same operating profit.':`The changed schedule earned ${money(Math.abs(delta.profit))} ${delta.profit>0?'more':'less'} in operating profit.`;
 return `<section><h2>Carried forward through day ${result.endDay}</h2><p>Days ${result.firstDay}–${result.endDay}. ${finish} Delivered revenue changed by ${gap(delta.revenue)} and incurred costs by ${gap(delta.cost)}. ${result.paybackMonth?`The profit advantage held at every month-end from month ${result.paybackMonth} through the horizon.`:''}</p>${timing}
 <p>After owner time at each period’s closing target, the original earned ${money(baseline.afterOwner)} and the changed schedule earned ${money(alternative.afterOwner)} over days ${result.firstDay}–${result.endDay}. The difference was ${gap(delta.afterOwner)}.</p>
 <p><a href="#job-costs">${delta.cost>0?'Where did the extra costs go?':'View cost changes by job'}</a></p>
 <table><thead><tr><th>Month-end</th><th>Original profit</th><th>Changed profit</th><th>Monthly difference</th><th>Cumulative difference</th></tr></thead><tbody>${rows}</tbody></table>
 <p>Over this period the original delivered ${baseline.delivered} and the changed run delivered ${alternative.delivered}. At the close, ${baseline.backlog} and ${alternative.backlog} accepted jobs respectively were still awaiting delivery. Paid design labor follows hours worked.${projected}</p>${decisionDetails(result)}</section>`;
}
function acceptedWorkSection(result){
 const {cutoffDay,endDay,baseline,alternative,settled}=result;
 const signed=n=>(n<0?'−':n>0?'+':'')+money(Math.abs(n));
 const date=n=>n==null?'None during projection':'Day '+n;
 const cutoffDifference=(Math.round(alternative.cutoffProfit*100)-Math.round(baseline.cutoffProfit*100))/100;
 const compare=(label,field,format=String)=>'<tr><th scope="row">'+label+'</th><td>'+format(baseline[field])+'</td><td>'+format(alternative[field])+'</td></tr>';
 const table=rows=>'<table class="replay-metrics"><thead><tr><th scope="col">Measure</th><th scope="col">Original</th><th scope="col">Changed</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
 const cutoff='<div><dt>Original horizon · day '+cutoffDay+'</dt><dd>'+signed(cutoffDifference)+'</dd></div>';
 const projection='<div><dt>Conditional projection'+(settled?'':' stopped')+' · day '+endDay+'</dt><dd>'+(settled?signed(result.profitDelta):'Unknown')+'</dd></div>';
 const payoff='<p class="projection-measure">Cumulative operating profit difference · changed minus original</p><dl class="projection-payoffs">'+cutoff+projection+'</dl>';
 const outcome=settled?'<p>The original book settled on day <strong>'+baseline.settledDay+'</strong> and the changed book on day <strong>'+alternative.settledDay+'</strong>. Both schedules incurred costs through day '+endDay+'.</p>':
  '<p>'+esc(result.reason)+' The settlement payoff is unknown.</p>';
 const accounts=[
  compare('Accepted jobs awaiting delivery at cutoff','openingJobs'),compare('Booked value awaiting delivery at cutoff','bookedValue',money),
  compare('Delivered invoices outstanding at cutoff','openingUnpaidInvoices'),compare('Balances still to collect on delivered work at cutoff','openingReceivable',money),
  compare('Cumulative operating profit at cutoff','cutoffProfit',money),compare('Cash at cutoff','openingCash',money),compare('Revenue earned after cutoff','subsequentRevenue',money),
  compare('Client payments collected after cutoff','collections',money),compare('Further costs incurred','furtherCosts',money),compare('Cash at projection close','closingCash',money),
  compare('Last projected delivery','lastDeliveryDay',date),compare('Last projected collection','lastCollectionDay',date),
 ];
 if(settled){
  accounts.push(compare('Accepted work and invoices settled','settledDay',n=>'Day '+n),compare('Cumulative operating profit through common day '+endDay,'profit',money));
 }else{
  accounts.push(compare('Accepted jobs still awaiting delivery','openJobs'),compare('Delivered invoices still awaiting collection','unpaidInvoices'));
  if(baseline.blocked||alternative.blocked){
   accounts.push(compare('Cash when payment was attempted','blocked',x=>x?money(x.cash):'—'),compare('Pending payment amount','blocked',x=>x?money(x.amount):'—'));
  }
 }
 const terms=table([compare('Designer count','designers'),compare('Weekly hours per designer','designerHours'),compare('Designer hourly rate','designerRate',money),
  compare('Weekly owner hours','ownerHours'),compare('Weekly owner hours reserved for outreach','outreachHours'),compare('Monthly overhead','overhead',money)]);
 return '<section class="accepted-work-result"><h3 id="accepted-work-heading" tabindex="-1">Finish the accepted work</h3>'+payoff+outcome+
  '<p>Intake closes at day '+cutoffDay+'. The projection follows orders already accepted and outstanding invoices. Earlier deposits are counted once. New inquiries, undecided quotes and future repeat offers are excluded.</p>'+
  '<details><summary>Delivery, collections and costs</summary>'+table(accounts)+'</details><details><summary>Staffing, costs and timing assumptions</summary><p>Each schedule uses its cutoff staffing, reserved outreach time, customer and supplier commitments, delays and monthly overhead. Designer labor is charged as worked.</p>'+terms+'</details></section>';
}
function create(current,baseline,options={}){
 if(!current||!baseline)throw Error('Choose a current run and a baseline run.');
 const monthly=replaySection(current,baseline,options.replay);
 let carry='';
 if(options.carry){
  const result=q.capacityCarryResult(options.carry),r=options.replay;
  if(!result.comparable)throw Error(result.reason);
  if(!monthly||r.carriedThrough!==result.endDay||result.month!==r.month||result.key!==r.key||result.before!==r.before||
     result.value!==r.after||result.sourceDay!==r.sourceDay||result.demandId!==(r.demandId??null))throw Error('The carried comparison could not be verified for this report.');
  carry=carrySection(result)+jobCostSection(result);baseline=options.carry.baseline;current=options.carry.alternative;
 }
 let projection='';
 if(options.replay?.finishAcceptedWork===true||options.acceptedProjection){
  const session=options.acceptedProjection;
  if(!monthly||options.replay?.finishAcceptedWork!==true||session?.phase!=='done'||session.sourceBaseline!==baseline||
     session.sourceAlternative!==current||baseline.day!==baseline.config.months*30||current.day!==baseline.day){
   throw Error('The accepted-work projection must be recomputed from this completed replay before exporting.');
  }
  projection=acceptedWorkSection(q.acceptedProjectionResult(session));
 }
 const replay=projection+carry+monthly;
 const comparison=q.compareRuns(current,baseline),cr=results(current),br=results(baseline),currentLabel=options.currentLabel||current.config.name,baselineLabel=options.baselineLabel||baseline.config.name,generatedAt=options.generatedAt||new Date().toISOString(),projects=projectRows(current,baseline,comparison);
 const pairs=br.rows.map((row,i)=>`<tr><th>${esc(row[0])}</th><td>${esc(row[1])}</td><td>${esc(cr.rows[i][1])}</td></tr>`).join('');
 const warnings=comparison.warnings.length?comparison.warnings.map(v=>`<li><b>${esc(v.code)}</b>: ${esc(v.message)}</li>`).join(''):'<li>Like-for-like comparison. Both runs share the elapsed day, seed, effective demand history and recorded external inquiries.</li>';
 const check=value=>value===null?'Unverified':value?'Match':'Different';
 const bridge=comparison.bridge.map(v=>`<tr><th>${esc(v.label)}</th><td>${money(v.amount)}</td></tr>`).join('');
 const baselineAudit=recipeAudit(baseline.config),currentAudit=recipeAudit(current.config),baselineEdits=editSummary(baseline.config,baselineAudit),currentEdits=editSummary(current.config,currentAudit),choices=choiceRows(baseline.config,'Baseline')+choiceRows(current.config,'Current');
 const choiceSection=`<section><h2>Modeled unit choices</h2><table><tr><th>Scenario / service</th><th>Managed-print assumption</th><th>Managed price / cost / contribution</th><th>Design-only price / cost / contribution</th><th>Expected price</th><th>Expected direct cost</th><th>Expected contribution</th><th>Repeat basis</th></tr>${choices}</table><p>Expected unit figures weight the available quote routes by the modeled customer-choice share. They are assumptions, not realized sales, guaranteed revenue, subscriptions, or prepaid annual commitments.</p></section>`;
 const campaigns=campaignRows(baseline,'Baseline')+campaignRows(current,'Current'),campaignSection=`<section><h2>Campaign relationships</h2>${campaigns?`<table><tr><th>Scenario / client</th><th>Relationship status</th><th>Quote cadence</th><th>Relationship cutoff</th><th>Next quote</th><th>Skipped campaigns</th><th>Accepted campaigns</th><th>Accepted value</th></tr>${campaigns}</table>`:'<p>No campaign relationships have started in either run.</p>'}<p>Each cadence date is a new quote opportunity. A decline skips that campaign and preserves later quote opportunities through the cutoff; it is not customer churn. Skipped quotes produce no ledger entry or revenue. Only accepted campaigns contribute value, so the relationship does not guarantee revenue.</p></section>`;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${reportName(currentLabel)} compared with ${reportName(baselineLabel)}</title><style>.projection-payoffs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}.projection-payoffs>div{background:#f1f5ed;border:1px solid #d9e2d4;border-radius:8px;padding:10px}.projection-payoffs dt,.projection-measure{font-size:13px;color:#53645c}.projection-payoffs dd{margin:4px 0 0;font-size:22px;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.accepted-work-result summary{padding:7px 0;font-weight:650;cursor:pointer}@media(max-width:330px){.projection-payoffs{grid-template-columns:1fr}}@media print{details::details-content{display:contents;content-visibility:visible}details>summary{font-weight:bold}}body{font:15px/1.5 system-ui,sans-serif;color:#17201d;background:#f6f3ed;margin:0}main{max-width:1180px;margin:auto;padding:32px}header,section{background:#fff;border:1px solid #d8d5cd;border-radius:12px;padding:22px;margin:0 0 18px}h1{margin:.2em 0}h2{margin-top:0}table{border-collapse:collapse;width:100%;display:block;overflow:auto}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:9px 12px;white-space:nowrap}th{font-weight:650}small{display:block;color:#59645f}.meta{color:#59645f}.warn{border-left:4px solid #ad6a18;padding-left:14px}.good{border-left:4px solid #287d77;padding-left:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f3ef;padding:12px}.job-ledger th,.job-ledger td{white-space:normal;overflow-wrap:anywhere}.job-ledger td{font-variant-numeric:tabular-nums}@media(min-width:800px),print{.job-ledger{display:table;table-layout:fixed}.job-ledger th:first-child{width:31%}}@media screen and (max-width:799px){.job-ledger th,.job-ledger td{min-width:6rem}.job-ledger th:first-child{min-width:13rem}}@media print{body{background:#fff}main{max-width:none;padding:0}header,section{break-inside:avoid;border-color:#bbb}.job-costs{break-inside:auto}.job-ledger tr{break-inside:avoid}}</style></head><body><main><header><p class="meta">MEIQQ offline comparison report · generated ${esc(generatedAt)}</p><h1>${reportName(currentLabel)} compared with ${reportName(baselineLabel)}</h1><p>${carry?'The carried comparison and its starting month appear first. Run-to-date tables cover both schedules through day '+current.day+'.':replay?'The selected month appears first. The remaining tables cover both runs from day one.':'This report describes two saved simulation states. It does not claim that an assumption caused a result.'}</p></header>${replay}<section><h2>Run identity and derivation</h2><table><tr><th></th><th>Baseline</th><th>Current</th></tr><tr><th>Scenario</th><td>${reportName(baselineLabel)}</td><td>${reportName(currentLabel)}</td></tr><tr><th>Recipe origin</th><td>${esc(recipe(baseline.config))}</td><td>${esc(recipe(current.config))}</td></tr><tr><th>Edited after recipe</th><td>${esc(baselineEdits)}</td><td>${esc(currentEdits)}</td></tr><tr><th>Model</th><td>${esc(baseline.modelVersion||1)}</td><td>${esc(current.modelVersion||1)}</td></tr><tr><th>Workload identity</th><td>${esc(baseline.workloadId||'legacy')}</td><td>${esc(current.workloadId||'legacy')}</td></tr><tr><th>Seed</th><td>${esc(baseline.config.seed)}</td><td>${esc(current.config.seed)}</td></tr></table></section><section class="${comparison.flags.likeForLike?'good':'warn'}"><h2>Comparison validity</h2><ul>${warnings}</ul><p>Elapsed day · ${check(comparison.flags.sameElapsedDay)}. Workload identity · ${check(comparison.flags.sameWorkloadIdentity)}. Current demand settings · ${check(comparison.flags.sameExternalDemandAssumptions)}. Demand history · ${check(comparison.flags.sameDemandHistory)}. Recorded new inquiries · ${check(comparison.flags.sameRealizedInquiries)}.</p></section><section><h2>${replay?'Run-to-date results':'Measured results'}</h2><table><tr><th>Measure</th><th>Baseline</th><th>Current</th></tr>${pairs}</table><h3>Operating-result difference bridge</h3><table>${bridge}</table><p>The bridge ${comparison.reconciles?'reconciles':'does not reconcile'} to an operating-result difference of ${money(comparison.deltas.operatingResult)}. The largest measured component is ${esc(comparison.dominantDriver?.label||'none')} (${money(comparison.dominantDriver?.amount||0)}). This is an accounting explanation, not causal proof.</p></section><section><h2>Exact assumption changes</h2><table><tr><th>Assumption path</th><th>Baseline</th><th>Current</th></tr>${assumptionRows(current,baseline)}</table></section><section><h2>Service financial results</h2><table><tr><th rowspan="2">Service</th><th colspan="4">Baseline</th><th colspan="4">Current</th></tr><tr><th>Delivered</th><th>Revenue</th><th>Direct cost</th><th>Contribution</th><th>Delivered</th><th>Revenue</th><th>Direct cost</th><th>Contribution</th></tr>${serviceRows(current,baseline)}</table><p>Direct costs cover delivered design labor and print/shipping. Shared overhead and owner-time value are excluded from service contribution.</p></section>${choiceSection}${campaignSection}<section><h2>Current accepted projects</h2><table><tr><th>Project</th><th>Status</th><th>Chosen route</th><th>Locked terms</th><th>Price</th><th>Cost incurred</th><th>Owner / design hours</th><th>Due day</th><th>Matching baseline price / cost / status / route</th></tr>${projects.html}</table>${projects.note?`<p>${esc(projects.note)}</p>`:''}<p>Accepted rows show the quote route and terms locked on acceptance. Future campaigns are quoted individually.</p></section>${sources([baseline.config,current.config],[baselineAudit,currentAudit])}<section><h2>Method</h2><p>Results and comparability flags were generated by the simulator's <code>analytics</code>, <code>metrics</code>, and <code>compareRuns</code> functions. Exact assumptions came from the two saved configuration snapshots. The demand check compares each run’s effective acquisition settings across its elapsed days and the recorded arrival identities, customer types and requested services, including unmatched inquiries. Capacity can also change the timing of returning cycles.</p></section></main></body></html>`;
 return {html,filename:`MEIQQ-Comparison-${safeName(currentLabel)}-vs-${safeName(baselineLabel)}.html`};
}
const api={create,decisionDetails,acceptedWorkSection};root.QQComparisonReport=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
