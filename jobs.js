/* Offline job records. Planning drafts, accepted terms and posted actuals stay distinct. */
(function(root){
 'use strict';
 const VERSION=2,FORMAT='meiqq-jobs',STORAGE_KEY='meiqq-jobs-v1',MAX_BYTES=8*1024*1024,MAX_JOBS=500,MAX_ENTRIES=10000,MAX_AGREEMENTS=1000;
 const DRAFT_FIELDS=['title','client','scope','owner','nextAction','nextActionDate','dueDate','paymentTerms','price','estimatedDirectCost','ownerHours','ownerRate','overhead'];
 const FORM_FIELDS={agreement:['date','reference','reason'],work:['date','person','kind','hours','description'],cost:['date','amount','supplier','description'],'cost-payment':['date','costId','amount','reference'],receipt:['date','amount','reference'],refund:['date','amount','reference'],approval:['date','reference','description'],delivery:['date','reference','description'],void:['date','targetId','reason']};
 const ENTRY_FIELDS={work:['person','kind','hoursHundredths','description'],cost:['amountCents','supplier','description'],'cost-payment':['costId','amountCents','reference'],receipt:['amountCents','reference'],refund:['amountCents','reference'],approval:['reference','description'],delivery:['reference','description'],void:['targetId','reason']};
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const clone=v=>JSON.parse(JSON.stringify(v));
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
 function shape(value,allowed,label,required=allowed){if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!own(value,k)))throw Error(label+' has an unsupported structure.');}
 function text(value,max,label){if(typeof value!=='string'||value.length>max)throw Error(label+' must be text of at most '+max+' characters.');return value;}
 function nonempty(value,label){if(!value.trim())throw Error('Enter '+label+'.');return value;}
 function validDate(value,label='a date'){text(value,10,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.slice(0,4)==='0000')throw Error('Enter '+label+' as YYYY-MM-DD.');const d=new Date(value+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('Enter a valid '+label+'.');return value;}
 function optionalDate(value,label){return value===''?'':validDate(value,label);}
 function ordinal(value,prefix){if(typeof value!=='string'||!new RegExp('^'+prefix+'-[1-9]\\d*$').test(value))return null;const n=Number(value.slice(prefix.length+1));return Number.isSafeInteger(n)&&n<Number.MAX_SAFE_INTEGER?n:null;}
 function counter(value,label){if(!Number.isSafeInteger(value)||value<1||value>=Number.MAX_SAFE_INTEGER)throw Error(label+' is invalid.');return value;}
 function decimal(value,max=100000000){
  const raw=typeof value==='number'&&Number.isFinite(value)?String(value):value;
  if(typeof raw!=='string'||! /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw.trim()))return null;
  const [whole,fraction='']=raw.trim().split('.'),scaled=Number(whole||0)*100+Number((fraction+'00').slice(0,2));
  return Number.isSafeInteger(scaled)&&scaled<=max*100?scaled:null;
 }
 function postedNumber(value,label,max=100000000){const n=decimal(value,max);if(n===null||n<=0)throw Error('Enter '+label+' greater than zero, with at most two decimals.');return n;}
 function storedNumber(value,label,max=10000000000){if(!Number.isSafeInteger(value)||value<=0||value>max)throw Error(label+' is invalid.');return value;}
 function normalizeDraft(value={},strict=false){shape(value,DRAFT_FIELDS,'Job draft',strict?DRAFT_FIELDS:[]);return Object.fromEntries(DRAFT_FIELDS.map(k=>[k,text(value[k]??'', ['scope','paymentTerms','nextAction'].includes(k)?10000:300,k)]));}
 function emptyForms(){return Object.fromEntries(Object.entries(FORM_FIELDS).map(([type,fields])=>[type,Object.fromEntries(fields.map(k=>[k,type==='work'&&k==='kind'?'owner':'']))]));}
 function normalizeForms(value){shape(value,Object.keys(FORM_FIELDS),'Unposted job forms');const result={};for(const [type,fields]of Object.entries(FORM_FIELDS)){shape(value[type],fields,type+' form');result[type]=Object.fromEntries(fields.map(k=>[k,text(value[type][k],['description','reason'].includes(k)?10000:500,type+' '+k)]));}return result;}
 function fresh(){return {version:VERSION,nextId:1,jobs:[]};}
 function find(book,id,active=false){const job=book.jobs.find(v=>v.id===id);if(!job)throw Error('Job not found.');if(active&&job.location!=='active')throw Error('Restore this job to Active before changing its drafts or records.');return job;}
 function canTrash(job){return Array.isArray(job?.agreements)&&job.agreements.length===0&&Array.isArray(job?.entries)&&job.entries.length===0;}
 function validateAgreement(agreement){
  shape(agreement,['id','date','reference','reason','snapshot','priceCents'],'Agreement');
  if(ordinal(agreement.id,'agreement')===null)throw Error('Agreement ID is invalid.');
  validDate(agreement.date,'agreement date');text(agreement.reference,500,'Agreement reference');text(agreement.reason,10000,'Amendment reason');
  const snapshot=normalizeDraft(agreement.snapshot,true);nonempty(snapshot.title,'a job title');nonempty(snapshot.client,'a client');nonempty(snapshot.scope,'the agreed scope');optionalDate(snapshot.dueDate,'due date');optionalDate(snapshot.nextActionDate,'next action date');
  const price=decimal(snapshot.price);if(price===null||agreement.priceCents!==price)throw Error('The agreed price must be a valid nonnegative amount.');
  return {...agreement,snapshot};
 }
 function normalizeStoredEntry(value){
  if(!object(value)||!own(ENTRY_FIELDS,value.type))throw Error('Entry type is unsupported.');
  shape(value,['id','type','date',...ENTRY_FIELDS[value.type]],'Job entry');
  if(ordinal(value.id,'entry')===null)throw Error('Entry ID is invalid.');validDate(value.date,'entry date');
  const result={id:value.id,type:value.type,date:value.date};
  for(const field of ENTRY_FIELDS[value.type]){
   result[field]=field==='amountCents'?storedNumber(value[field],'Posted amount'):field==='hoursHundredths'?storedNumber(value[field],'Posted work hours',100000000):text(value[field],['description','reason'].includes(field)?10000:500,'Entry '+field);
  }
  if(value.type==='work'){nonempty(result.person,'the person who did the work');if(!['owner','external'].includes(result.kind))throw Error('Work must be owner or external effort.');}
  if(value.type==='cost'){nonempty(result.supplier,'the supplier or payee');nonempty(result.description,'a cost description');}
  if(['approval','delivery'].includes(value.type)&&!result.reference.trim()&&!result.description.trim())throw Error('Enter a reference or description for this '+value.type+'.');
  if(value.type==='void')nonempty(result.reason,'a correction reason');
  return result;
 }
 function ledger(entries){
  const seen=new Map(),voided=new Set(),costs=new Map(),paid=new Map();let received=0,refunded=0;
  function adjust(entry,sign){
   if(entry.type==='receipt')received+=sign*entry.amountCents;
   if(entry.type==='refund')refunded+=sign*entry.amountCents;
   if(entry.type==='cost-payment')paid.set(entry.costId,(paid.get(entry.costId)||0)+sign*entry.amountCents);
   if(entry.type==='cost'){if(sign>0)costs.set(entry.id,entry);else costs.delete(entry.id);}
  }
  for(const entry of entries){
   if(seen.has(entry.id))throw Error('Job entry IDs must be unique.');
   if(entry.type==='void'){
    const original=seen.get(entry.targetId);if(!original||original.type==='void'||voided.has(entry.targetId))throw Error('Choose an active posted entry to void.');
    if(entry.date<original.date)throw Error('A correction cannot predate the original entry.');
    if(original.type==='cost'&&(paid.get(original.id)||0)>0)throw Error('Void linked supplier payments before voiding their cost.');
    if(original.type==='receipt'&&received-original.amountCents<refunded)throw Error('Void related refunds before removing receipts they depend on.');
    voided.add(entry.targetId);adjust(original,-1);
   }else{
    if(entry.type==='cost-payment'){
     const cost=costs.get(entry.costId);if(!cost)throw Error('Choose an active incurred cost for this supplier payment.');
     if(entry.date<cost.date)throw Error('A supplier payment cannot predate its recorded cost.');
     if((paid.get(entry.costId)||0)+entry.amountCents>cost.amountCents)throw Error('Supplier payments cannot exceed the linked cost.');
    }
    if(entry.type==='refund'&&refunded+entry.amountCents>received)throw Error('Refunds cannot exceed recorded customer receipts.');
    adjust(entry,1);
   }
   seen.set(entry.id,entry);
  }
  return {activeEntries:entries.filter(v=>v.type!=='void'&&!voided.has(v.id)),voidedIds:[...voided],costs:[...costs.values()].map(v=>({...v,paidCents:paid.get(v.id)||0,unpaidCents:v.amountCents-(paid.get(v.id)||0)}))};
 }
 function validateJob(value,version){
  const fields=['id','mode','draft','forms','nextAgreementId','agreements','nextEntryId','entries'];
  shape(value,version===1?fields:[...fields,'location'],'Job');
  if(ordinal(value.id,'job')===null)throw Error('Job ID is invalid.');if(!['real','practice'].includes(value.mode))throw Error('Choose a real or practice job.');
  const location=version===1?'active':value.location;if(!['active','trash','archive'].includes(location))throw Error('Job location is invalid.');
  counter(value.nextAgreementId,'Next agreement ID');counter(value.nextEntryId,'Next entry ID');
  if(!Array.isArray(value.agreements)||value.agreements.length>MAX_AGREEMENTS)throw Error('Too many agreement versions.');
  if(!Array.isArray(value.entries)||value.entries.length>MAX_ENTRIES)throw Error('Too many posted job entries.');
  const agreements=value.agreements.map(validateAgreement),entries=value.entries.map(normalizeStoredEntry);
  let previous=0,previousDate='';for(const [index,agreement]of agreements.entries()){const n=ordinal(agreement.id,'agreement');if(n<=previous||n>=value.nextAgreementId)throw Error('Agreement IDs must be ordered below the next ID.');if(index&&!agreement.reason.trim())throw Error('An amendment needs a reason.');if(agreement.date<previousDate)throw Error('An amendment cannot predate the prior agreement.');previous=n;previousDate=agreement.date;}
  previous=0;for(const entry of entries){const n=ordinal(entry.id,'entry');if(n<=previous||n>=value.nextEntryId)throw Error('Entry IDs must be ordered below the next ID.');previous=n;}
  ledger(entries);
  if(location==='trash'&&!canTrash({agreements,entries}))throw Error('Jobs with recorded history cannot be placed in Trash. Archive them instead.');
  if(location==='archive'&&canTrash({agreements,entries}))throw Error('Unrecorded drafts belong in Trash, not Archive.');
  return {id:value.id,mode:value.mode,location,draft:normalizeDraft(value.draft,true),forms:normalizeForms(value.forms),nextAgreementId:value.nextAgreementId,agreements,nextEntryId:value.nextEntryId,entries};
 }
 function validate(value){
  shape(value,['version','nextId','jobs'],'Jobs workspace');if(![1,VERSION].includes(value.version))throw Error('Unsupported Jobs workspace version.');counter(value.nextId,'Next job ID');
  if(!Array.isArray(value.jobs)||value.jobs.length>MAX_JOBS)throw Error('The Jobs workspace supports up to '+MAX_JOBS+' jobs.');
  const used=new Set(),jobs=value.jobs.map(job=>validateJob(job,value.version));for(const job of jobs){const n=ordinal(job.id,'job');if(n>=value.nextId||used.has(job.id))throw Error('Job IDs must be unique and below the next ID.');used.add(job.id);}return {version:VERSION,nextId:value.nextId,jobs};
 }
 function serialize(book){const raw=JSON.stringify({format:FORMAT,version:VERSION,jobs:validate(book)});if(new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw Error('Jobs backup exceeds the 8 MiB limit.');return raw;}
 function parse(value){shape(value,['format','version','jobs'],'Jobs backup');if(value.format!==FORMAT||![1,VERSION].includes(value.version))throw Error('Choose a supported Jobs backup. Studio ideas and Simulator backups are separate.');if(!object(value.jobs)||value.jobs.version!==value.version)throw Error('Jobs backup and workspace versions must match.');return validate(value.jobs);}
 function parseText(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw Error('Jobs backup must be JSON text within 8 MiB.');let value;try{value=JSON.parse(raw);}catch(e){throw Error('Jobs backup is not valid JSON.');}return parse(value);}
 function commit(book,id,next){const candidate={...book,jobs:book.jobs.map(v=>v.id===id?next:v)};serialize(candidate);book.jobs[book.jobs.findIndex(v=>v.id===id)]=next;return next;}
 function create(book,options={}){
  shape(options,['mode','draft'],'New job options',[]);validate(book);if(book.nextId>=Number.MAX_SAFE_INTEGER-1)throw Error('Job IDs are exhausted.');
  const job={id:'job-'+book.nextId,mode:options.mode??'real',location:'active',draft:normalizeDraft(options.draft),forms:emptyForms(),nextAgreementId:1,agreements:[],nextEntryId:1,entries:[]};
  serialize({...book,nextId:book.nextId+1,jobs:[...book.jobs,job]});book.nextId++;book.jobs.push(job);return job;
 }
 function updateDraft(book,id,patch){shape(patch,DRAFT_FIELDS,'Draft changes',[]);const job=find(book,id,true);return commit(book,id,{...job,draft:normalizeDraft({...job.draft,...patch},true)});}
 function setForm(book,id,type,patch){if(!own(FORM_FIELDS,type))throw Error('Unknown job form.');shape(patch,FORM_FIELDS[type],'Unposted form changes',[]);const job=find(book,id,true);return commit(book,id,{...job,forms:normalizeForms({...job.forms,[type]:{...job.forms[type],...patch}})});}
 function move(book,id,location){
  const job=find(book,id);if(!['active','trash','archive'].includes(location))throw Error('Choose Active, Trash or Archive.');
  if(job.location==='active'){
   if(location==='active')throw Error('This job is already active.');
   if(location==='trash'&&!canTrash(job))throw Error('Jobs with recorded history cannot be placed in Trash. Archive them instead.');
   if(location==='archive'&&canTrash(job))throw Error('Unrecorded drafts belong in Trash, not Archive.');
  }else if(location!=='active')throw Error('Restore this job to Active before moving it elsewhere.');
  return commit(book,id,{...job,location});
 }
 function recordAgreement(book,id,input){
  shape(input,FORM_FIELDS.agreement,'Agreement form',[]);const job=find(book,id,true),form={date:'',reference:'',reason:'',...input};
  const agreement={id:'agreement-'+job.nextAgreementId,date:form.date,reference:form.reference,reason:form.reason,snapshot:clone(job.draft),priceCents:decimal(job.draft.price)};
  commit(book,id,{...job,nextAgreementId:job.nextAgreementId+1,agreements:[...job.agreements,agreement]});return agreement;
 }
 function postEntry(book,id,input){
  if(!object(input)||!own(ENTRY_FIELDS,input.type)||input.type==='void')throw Error('Choose a supported entry type.');
  const type=input.type;shape(input,['type',...FORM_FIELDS[type]],'Entry form', ['type']);const form={...emptyForms()[type],...input},job=find(book,id,true),entry={id:'entry-'+job.nextEntryId,type,date:form.date};
  for(const field of ENTRY_FIELDS[type])entry[field]=field==='amountCents'?postedNumber(form.amount,'an amount'):field==='hoursHundredths'?postedNumber(form.hours,'work hours',1000000):form[field];
  commit(book,id,{...job,nextEntryId:job.nextEntryId+1,entries:[...job.entries,entry]});return entry;
 }
 function voidEntry(book,id,entryId,input){shape(input,['date','reason'],'Correction form',[]);const job=find(book,id,true),entry={id:'entry-'+job.nextEntryId,type:'void',date:input.date??'',targetId:entryId,reason:input.reason??''};commit(book,id,{...job,nextEntryId:job.nextEntryId+1,entries:[...job.entries,entry]});return entry;}
 function merge(book,incoming){const candidate=validate(book),source=validate(incoming);for(const sourceJob of source.jobs){if(candidate.nextId>=Number.MAX_SAFE_INTEGER-1)throw Error('Job IDs are exhausted.');candidate.jobs.push({...clone(sourceJob),id:'job-'+candidate.nextId++});}serialize(candidate);return candidate;}
 function metrics(job){
  const {activeEntries,voidedIds,costs}=ledger(job.entries),agreement=job.agreements.at(-1)||null,snapshot=agreement?.snapshot;
  const sum=(type,key)=>activeEntries.filter(v=>v.type===type).reduce((n,v)=>n+v[key],0);
  const acceptedPrice=agreement?.priceCents??null,received=sum('receipt','amountCents'),refunded=sum('refund','amountCents'),netReceipts=received-refunded,incurredCosts=sum('cost','amountCents'),paidCosts=sum('cost-payment','amountCents');
  const ownerHundredths=activeEntries.filter(v=>v.type==='work'&&v.kind==='owner').reduce((n,v)=>n+v.hoursHundredths,0),externalHundredths=activeEntries.filter(v=>v.type==='work'&&v.kind==='external').reduce((n,v)=>n+v.hoursHundredths,0);
  const safe=value=>Number.isSafeInteger(value)?value:null,mul=(hours,rate)=>hours===null||rate===null?null:safe(Math.round(hours*rate/100)),minus=(amount,...deductions)=>amount===null||deductions.includes(null)?null:safe(deductions.reduce((n,v)=>n-v,amount));
  const estimatedDirectCost=snapshot?decimal(snapshot.estimatedDirectCost):null,ownerRate=snapshot?decimal(snapshot.ownerRate,1000000):null,overhead=snapshot?decimal(snapshot.overhead):null,estimatedHours=snapshot?decimal(snapshot.ownerHours,1000000):null;
  const estimatedOwnerAllowance=mul(estimatedHours,ownerRate),actualOwnerAllowance=ownerHundredths===0?0:mul(ownerHundredths,ownerRate),remainderAfterIncurredCosts=minus(acceptedPrice,incurredCosts),remainderAfterOwnerTime=minus(remainderAfterIncurredCosts,actualOwnerAllowance),remainderAfterAllowances=minus(remainderAfterOwnerTime,overhead);
  const outstanding=acceptedPrice===null?null:Math.max(0,acceptedPrice-netReceipts),overpayment=acceptedPrice===null?null:Math.max(0,netReceipts-acceptedPrice),unpaidCosts=incurredCosts-paidCosts;
  const has=type=>activeEntries.some(v=>v.type===type),hasDelivery=has('delivery'),hasActualEntries=activeEntries.length>0;
  const status=!agreement?'draft':hasDelivery&&outstanding===0&&overpayment===0&&unpaidCosts===0?'settled':hasDelivery?'delivered':hasActualEntries?'working':'agreed';
  return {status,agreement,acceptedPrice,estimatedDirectCost,estimatedOwnerHours:estimatedHours===null?null:estimatedHours/100,ownerRate,overhead,estimatedOwnerAllowance,estimatedRemainder:minus(acceptedPrice,estimatedDirectCost,estimatedOwnerAllowance,overhead),received,refunded,netReceipts,outstanding,overpayment,incurredCosts,paidCosts,unpaidCosts,jobCash:netReceipts-paidCosts,ownerHours:ownerHundredths/100,externalHours:externalHundredths/100,totalHours:(ownerHundredths+externalHundredths)/100,actualOwnerAllowance,remainderAfterIncurredCosts,remainderAfterOwnerTime,remainderAfterAllowances,costs,activeEntries,voidedIds,hasReceipts:has('receipt'),hasCosts:has('cost'),hasWork:has('work'),hasApproval:has('approval'),hasDelivery,hasActualEntries};
 }
 const api={VERSION,FORMAT,STORAGE_KEY,MAX_BYTES,MAX_JOBS,MAX_ENTRIES,MAX_AGREEMENTS,DRAFT_FIELDS:Object.freeze([...DRAFT_FIELDS]),FORM_FIELDS:Object.freeze(Object.fromEntries(Object.entries(FORM_FIELDS).map(([k,v])=>[k,Object.freeze([...v])]))),fresh,create,updateDraft,setForm,canTrash,move,recordAgreement,postEntry,voidEntry,metrics,merge,validate,serialize,parse,parseText};
 root.QQJobs=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
