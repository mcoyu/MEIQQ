/* Offline 30-day studio planning. Estimates never create jobs, receipts or simulator state. */
(function(root){
 'use strict';
 const Ideas=typeof module!=='undefined'?require('./studio.js'):root.QQStudio;
 const VERSION=2,FORMAT='meiqq-planner',STORAGE_KEY='meiqq-planner-v1',MAX_BYTES=8*1024*1024,MAX_PLANS=100;
 const PERIOD_DAYS=30,WORK_DAYS=22;
 const EDIT_FIELDS=['name','notes','ownerHours','nonProjectHours','bufferPct','ownerTarget','profitTarget'];
 const POOL_FIELDS=['name','hours','rate'],EXPENSE_FIELDS=['name','amount'];
 const SERVICE_FIELDS=['name','unit','quantity','setupCount','price','directCost','setupCost','ownerHours','setupOwnerHours'];
 const ALLOCATION_FIELDS=['name','poolId','hours','setupHours'];
 const CONFIG_FIELDS=['origin',...EDIT_FIELDS,'nextPoolId','nextServiceId','nextExpenseId','pools','expenses','services'];
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),clone=v=>JSON.parse(JSON.stringify(v)),own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
 function shape(v,allowed,label,required=allowed){if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k))||required.some(k=>!own(v,k)))throw Error(label+' has an unsupported structure.');}
 function text(v,max,label){if(typeof v!=='string'||v.length>max)throw Error(label+' must be text of at most '+max+' characters.');return v;}
 function raw(v,key){return text(v,key==='notes'?10000:['name','unit'].includes(key)?300:80,key);}
 function date(v){text(v,10,'Snapshot date');if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||v.slice(0,4)==='0000')throw Error('Use a date in YYYY-MM-DD format.');const d=new Date(v+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error('Use a valid calendar date.');return v;}
 function count(v,label){if(!Number.isSafeInteger(v)||v<1||v>=Number.MAX_SAFE_INTEGER)throw Error(label+' is invalid.');return v;}
 function ordinal(v,prefix){if(typeof v!=='string'||!new RegExp('^'+prefix+'-[1-9]\\d*$').test(v))return null;const n=Number(v.slice(prefix.length+1));return Number.isSafeInteger(n)&&n<Number.MAX_SAFE_INTEGER?n:null;}
 function source(v){
  if(v===null)return null;
  const fields=['ideaId','ideaVersion','copiedAt','name'];
  shape(v,[...fields,'ideaKey'],'Idea source',fields);
  text(v.ideaId,300,'Idea ID');if(!v.ideaId||!Number.isSafeInteger(v.ideaVersion)||v.ideaVersion<1)throw Error('Idea source identity is invalid.');
  return {ideaId:v.ideaId,ideaVersion:v.ideaVersion,copiedAt:date(v.copiedAt),name:text(v.name,300,'Idea name'),...(own(v,'ideaKey')?{ideaKey:Ideas.linkKey(v.ideaKey)}:{})};
 }
 function allocation(v,strict=true){shape(v,ALLOCATION_FIELDS,'Role allocation',strict?ALLOCATION_FIELDS:[]);return {name:text(strict?v.name:v.name??'',300,'Allocation name'),poolId:text(strict?v.poolId:v.poolId??'',80,'Role pool'),hours:raw(strict?v.hours:v.hours??'','hours'),setupHours:raw(strict?v.setupHours:v.setupHours??'','setupHours')};}
 function service(v,id,drafting=false){
  shape(v,drafting?[...SERVICE_FIELDS,'allocations','source']:['id',...SERVICE_FIELDS,'allocations','source'],'Planned service',drafting?[]:['id',...SERVICE_FIELDS,'allocations','source']);
  const allocations=drafting?v.allocations??[]:v.allocations;if(!Array.isArray(allocations)||allocations.length>30)throw Error('A service supports up to 30 role allocations.');
  return {id,...Object.fromEntries(SERVICE_FIELDS.map(k=>[k,raw(drafting?v[k]??(k==='unit'?'engagement':''):v[k],k)])),allocations:allocations.map(a=>allocation(a,!drafting)),source:source(v.source??null)};
 }
 function config(v){
  shape(v,CONFIG_FIELDS,'Plan settings');if(!['blank','example'].includes(v.origin))throw Error('Plan origin is invalid.');
  const result={origin:v.origin,...Object.fromEntries(EDIT_FIELDS.map(k=>[k,raw(v[k],k)])),nextPoolId:count(v.nextPoolId,'Next pool ID'),nextServiceId:count(v.nextServiceId,'Next service ID'),nextExpenseId:count(v.nextExpenseId,'Next expense ID')};
  for(const [name,fields,prefix,next,max]of [['pools',POOL_FIELDS,'pool','nextPoolId',50],['expenses',EXPENSE_FIELDS,'expense','nextExpenseId',100]]){
   if(!Array.isArray(v[name])||v[name].length>max)throw Error('Too many '+name+' in this plan.');const used=new Set();
   result[name]=v[name].map(row=>{shape(row,['id',...fields],'Plan '+prefix);const n=ordinal(row.id,prefix);if(n===null||n>=result[next]||used.has(row.id))throw Error('Plan '+prefix+' IDs must be valid and unique.');used.add(row.id);return {id:row.id,...Object.fromEntries(fields.map(k=>[k,raw(row[k],k)]))};});
  }
  if(!Array.isArray(v.services)||v.services.length>100)throw Error('A plan supports up to 100 services.');const used=new Set(),poolIds=new Set(result.pools.map(p=>p.id));
  result.services=v.services.map(row=>{const n=ordinal(row?.id,'service');if(n===null||n>=result.nextServiceId||used.has(row.id))throw Error('Planned service IDs must be valid and unique.');used.add(row.id);const normalized=service(row,row.id);for(const a of normalized.allocations)if(a.poolId&&!poolIds.has(a.poolId))throw Error('An allocation references a missing role pool.');return normalized;});
  return result;
 }
 function settings(plan){return Object.fromEntries(CONFIG_FIELDS.map(k=>[k,clone(plan[k])]));}
 function baselineKey(snapshot,when){const input=when+'\n'+JSON.stringify(snapshot);let a=2166136261,b=0x9e3779b9;for(let i=0;i<input.length;i++){const n=input.charCodeAt(i);a=Math.imul(a^n,16777619);b=Math.imul(b+n+i,2246822519);}return 'baseline-'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 function baseline(v){if(v===null)return null;shape(v,['key','date','label','snapshot'],'Baseline');const snapshot=config(v.snapshot),when=date(v.date),key=baselineKey(snapshot,when);if(v.key!==key)throw Error('Baseline identity does not match its preserved snapshot.');return {key,date:when,label:text(v.label,300,'Baseline label'),snapshot};}
 function plan(v){shape(v,['id','revision',...CONFIG_FIELDS,'baseline'],'Plan');if(ordinal(v.id,'plan')===null)throw Error('Plan ID is invalid.');count(v.revision,'Plan revision');return {id:v.id,revision:v.revision,...config(Object.fromEntries(CONFIG_FIELDS.map(k=>[k,v[k]]))),baseline:baseline(v.baseline)};}
 function fresh(){return {version:VERSION,nextId:1,plans:[],studio:null};}
 function studioSettings(value,plans){
  if(value===null)return null;
  shape(value,['planId','partnerPoolId','ownerWeeklyHours','partnerWeeklyHours','partnerAdminHours'],'Studio settings');
  const p=value.planId===null?null:plans.find(p=>p.id===value.planId);
  if(value.planId!==null&&!p)throw Error('Studio settings reference a missing plan.');
  if(value.partnerPoolId!==null&&(!p||!p.pools.some(pool=>pool.id===value.partnerPoolId)))throw Error('Studio settings reference a missing partner pool.');
  return {planId:value.planId,partnerPoolId:value.partnerPoolId,...Object.fromEntries(['ownerWeeklyHours','partnerWeeklyHours','partnerAdminHours'].map(k=>[k,raw(value[k],k)]))};
 }
 function validate(v){
  if(!object(v)||![1,VERSION].includes(v.version))throw Error('Unsupported Planner version.');
  shape(v,v.version===1?['version','nextId','plans']:['version','nextId','plans','studio'],'Planner workspace');
  count(v.nextId,'Next plan ID');if(!Array.isArray(v.plans)||v.plans.length>MAX_PLANS)throw Error('The planner supports up to '+MAX_PLANS+' plans.');
  const used=new Set(),plans=v.plans.map(plan);for(const p of plans){if(ordinal(p.id,'plan')>=v.nextId||used.has(p.id))throw Error('Plan IDs must be unique and below the next ID.');used.add(p.id);}
  return {version:VERSION,nextId:v.nextId,plans,studio:v.version===1?null:studioSettings(v.studio,plans)};
 }
 function serialize(book){const raw=JSON.stringify({format:FORMAT,version:VERSION,planner:validate(book)});if(new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw Error('Planner backup exceeds the 8 MiB limit.');return raw;}
 function parse(v){shape(v,['format','version','planner'],'Planner backup');if(v.format!==FORMAT||![1,VERSION].includes(v.version)||v.planner?.version!==v.version)throw Error('Choose a supported Planner backup. Other MEIQQ workspaces have separate backups.');return validate(v.planner);}
 function parseText(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw Error('Planner backup must be JSON text within 8 MiB.');let data;try{data=JSON.parse(raw);}catch(e){throw Error('Planner backup is not valid JSON.');}return parse(data);}
 function find(book,id){const p=book.plans.find(v=>v.id===id);if(!p)throw Error('Plan not found.');return p;}
 function commit(book,id,next){const current=find(book,id);if(JSON.stringify(current)===JSON.stringify(next))return current;next={...next,revision:current.revision+1};serialize({...book,plans:book.plans.map(p=>p.id===id?next:p)});book.plans[book.plans.findIndex(p=>p.id===id)]=next;return next;}
 function create(book,options={}){
  shape(options,['example'],'New plan options',[]);if(options.example!==undefined&&typeof options.example!=='boolean')throw Error('Choose whether to create an example plan.');validate(book);
  const example=Boolean(options.example),p={id:'plan-'+book.nextId,revision:1,origin:example?'example':'blank',name:example?'Example studio month':'Untitled plan',notes:example?'Illustrative 30-day assumptions for practice. Replace these with your research and available capacity.':'',ownerHours:example?'80':'',nonProjectHours:example?'6':'',bufferPct:example?'10':'0',ownerTarget:example?'1000':'',profitTarget:example?'400':'',nextPoolId:example?2:1,nextServiceId:example?2:1,nextExpenseId:2,pools:example?[{id:'pool-1',name:'Analyst',hours:'32',rate:'30'}]:[],expenses:[{id:'expense-1',name:example?'Software and recurring studio costs':'Recurring costs to confirm',amount:example?'200':''}],services:[],baseline:null};
  if(example)p.services.push(service({name:'One business question',unit:'scoped diagnostic',quantity:'4',setupCount:'2',price:'600',directCost:'20',setupCost:'0',ownerHours:'3',setupOwnerHours:'1',allocations:[{name:'Analyst',poolId:'pool-1',hours:'5',setupHours:'2'}],source:null},'service-1',true));
  serialize({...book,nextId:book.nextId+1,plans:[...book.plans,p]});book.nextId++;book.plans.push(p);return p;
 }
 function update(book,id,path,value){
  const current=find(book,id),next=clone(current);let target=next,key=path;
  if(!EDIT_FIELDS.includes(path)){
   let match=/^(pools|expenses|services)\.(\d+)\.([A-Za-z]+)$/.exec(path);
   if(match){const [,section,index,field]=match,allowed=section==='pools'?POOL_FIELDS:section==='expenses'?EXPENSE_FIELDS:SERVICE_FIELDS;if(!allowed.includes(field)||!next[section][Number(index)])throw Error('This planner field cannot be edited.');target=next[section][Number(index)];key=field;}
   else {match=/^services\.(\d+)\.allocations\.(\d+)\.(name|poolId|hours|setupHours)$/.exec(path);if(!match||!next.services[Number(match[1])]?.allocations[Number(match[2])])throw Error('This planner field cannot be edited.');target=next.services[Number(match[1])].allocations[Number(match[2])];key=match[3];}
  }
  target[key]=raw(value,key);return commit(book,id,next);
 }
 function addRow(book,id,section,draft={}){const current=find(book,id),next=clone(current),isPool=section==='pools',fields=isPool?POOL_FIELDS:EXPENSE_FIELDS,prefix=isPool?'pool':'expense',counter=isPool?'nextPoolId':'nextExpenseId';shape(draft,fields,prefix+' draft',[]);const row={id:prefix+'-'+next[counter]++,...Object.fromEntries(fields.map(k=>[k,raw(draft[k]??'',k)]))};next[section].push(row);commit(book,id,next);return row;}
 function addPool(book,id,draft={}){return addRow(book,id,'pools',draft);}
 function addExpense(book,id,draft={}){return addRow(book,id,'expenses',draft);}
 function addService(book,id,draft={}){const next=clone(find(book,id)),row=service(draft,'service-'+next.nextServiceId++,true);next.services.push(row);commit(book,id,next);return row;}
 function removeRow(book,id,section,rowId){const next=clone(find(book,id)),index=next[section].findIndex(v=>v.id===rowId);if(index<0)return false;next[section].splice(index,1);if(section==='pools')for(const s of next.services)for(const a of s.allocations)if(a.poolId===rowId)a.poolId='';if(section==='pools'&&book.studio?.planId===id&&book.studio.partnerPoolId===rowId){const candidate=clone(book);candidate.studio.partnerPoolId=null;commit(candidate,id,next);Object.assign(book,candidate);}else commit(book,id,next);return true;}
 const removePool=(book,id,rowId)=>removeRow(book,id,'pools',rowId),removeExpense=(book,id,rowId)=>removeRow(book,id,'expenses',rowId),removeService=(book,id,rowId)=>removeRow(book,id,'services',rowId);
 function setAllocation(book,id,serviceId,poolId,patch={}){shape(patch,['name','hours','setupHours'],'Allocation changes',[]);const next=clone(find(book,id)),s=next.services.find(v=>v.id===serviceId);if(!s)throw Error('Planned service not found.');const index=poolId?s.allocations.findIndex(v=>v.poolId===poolId):-1,row=allocation({...(index<0?{name:'',hours:'',setupHours:''}:s.allocations[index]),...patch,poolId},false);if(index<0)s.allocations.push(row);else s.allocations[index]=row;commit(book,id,next);return row;}
 function removeAllocation(book,id,serviceId,index){const next=clone(find(book,id)),s=next.services.find(v=>v.id===serviceId);if(!s||!Number.isInteger(index)||!s.allocations[index])throw Error('Role allocation not found.');s.allocations.splice(index,1);commit(book,id,next);return true;}
 function fromIdea(book,id,idea,when){
  if(!object(idea)||!Array.isArray(idea.roles))throw Error('Choose a saved Studio idea.');const origin=source({ideaId:idea.id,ideaVersion:idea.version,copiedAt:when,name:idea.name,...(idea.linkKey?{ideaKey:idea.linkKey}:{})});
  return addService(book,id,{name:idea.name,unit:idea.unit||'engagement',quantity:'',setupCount:'',price:idea.price,directCost:idea.directCost,setupCost:idea.setupCost,ownerHours:idea.ownerHours,setupOwnerHours:idea.setupOwnerHours,allocations:idea.roles.map(role=>({name:role.name,poolId:'',hours:role.hours,setupHours:role.setupHours})),source:origin});
 }
 function makeBaseline(p,when){const snapshot=settings(p);return {key:baselineKey(snapshot,date(when)),date:when,label:p.name||'Untitled plan',snapshot};}
 function captureBaseline(book,id,when){const current=find(book,id),saved=makeBaseline(current,when);commit(book,id,{...current,baseline:saved});return saved;}
 function duplicate(book,id,options={}){shape(options,['date'],'Alternative options',[]);const current=find(book,id),saved=current.baseline?clone(current.baseline):makeBaseline(current,options.date),original=current.baseline?current:{...current,revision:current.revision+1,baseline:saved},copied={...clone(current),id:'plan-'+book.nextId,revision:1,name:(current.name||'Untitled plan').slice(0,285)+' · alternative',baseline:clone(saved)};const next={...book,nextId:book.nextId+1,plans:[...book.plans.map(v=>v.id===id?original:v),copied]};serialize(next);book.nextId=next.nextId;book.plans=next.plans;return copied;}
 function remove(book,id){const index=book.plans.findIndex(v=>v.id===id);if(index<0)return false;book.plans.splice(index,1);if(book.studio?.planId===id){book.studio.planId=null;book.studio.partnerPoolId=null;}return true;}
 function merge(book,incoming){const next=validate(book),source=validate(incoming);for(const p of source.plans){const id='plan-'+next.nextId++;next.plans.push({...clone(p),id});if(!next.studio?.planId&&source.studio?.planId===p.id)next.studio={...clone(source.studio),planId:id};}serialize(next);return next;}

 function metrics(p){
  const issues=[],seenIssues=new Set(),parsed={};
  function issue(path,kind,message){const key=path+'|'+kind;if(!seenIssues.has(key)){seenIssues.add(key);issues.push({path,kind,message});}}
  function read(raw,path,{max=100000000,integer=false,needed=true}={}){
   const input=typeof raw==='string'?raw.trim():'',pattern=integer?/^\d+$/:/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;let value=null;
   if(!input){if(needed)issue(path,'unknown','Enter an estimate; blank does not mean zero.');}
   else if(!pattern.test(input)||!Number.isFinite(Number(input))||Number(input)>max){if(needed)issue(path,'invalid',integer?'Enter a whole number from 0 to '+max+'.':'Enter a nonnegative number up to '+max+' with at most two decimals.');}
   else {const [whole,fraction='']=input.split('.');value=integer?Number(whole):Number(whole||0)*100+Number((fraction+'00').slice(0,2));}
   parsed[path]=value;return value;
  }
  const safe=(value,path)=>{if(value===null)return null;const n=typeof value==='bigint'?value:BigInt(value);if(n>BigInt(Number.MAX_SAFE_INTEGER)||n<BigInt(Number.MIN_SAFE_INTEGER)){issue(path,'invalid','This combination is too large to calculate safely.');return null;}return Number(n);};
  const sum=(values,path)=>values.includes(null)?null:safe(values.reduce((total,n)=>total+BigInt(n),0n),path);
  const times=(value,quantity,path)=>value===null||quantity===null?null:safe(BigInt(value)*BigInt(quantity),path);
  const subtract=(value,values,path)=>value===null||values.includes(null)?null:safe(values.reduce((n,v)=>n-BigInt(v),BigInt(value)),path);
  const repeated=(raw,path,quantity,opts={})=>quantity===0?0:times(read(raw,path,{...opts,needed:true}),quantity,path);
  const ownerAvailable=read(p.ownerHours,'ownerHours',{max:1000000}),nonProject=read(p.nonProjectHours,'nonProjectHours',{max:1000000}),buffer=read(p.bufferPct,'bufferPct',{max:100}),ownerTarget=read(p.ownerTarget,'ownerTarget'),profitTarget=read(p.profitTarget,'profitTarget');
  const poolData=new Map(p.pools.map((pool,index)=>[pool.id,{id:pool.id,name:pool.name,index,rate:read(pool.rate,'pools.'+index+'.rate',{max:100000,needed:false}),available:read(pool.hours,'pools.'+index+'.hours',{max:1000000,needed:false}),demands:[],unresolved:false}]));
  const services=p.services.map((s,index)=>{
   const base='services.'+index,quantity=read(s.quantity,base+'.quantity',{max:10000,integer:true});let setupCount=quantity===0&&!s.setupCount.trim()?0:read(s.setupCount,base+'.setupCount',{max:10000,integer:true});
   if(quantity!==null&&setupCount!==null&&setupCount>quantity){issue(base+'.setupCount','invalid','Setup count cannot exceed the planned number of engagements.');setupCount=null;}
   const idle=quantity===0&&setupCount===0;
   const revenue=idle?0:repeated(s.price,base+'.price',quantity),directCosts=idle?0:sum([repeated(s.directCost,base+'.directCost',quantity),repeated(s.setupCost,base+'.setupCost',setupCount)],base+'.directCost');
   const owner=idle?0:sum([repeated(s.ownerHours,base+'.ownerHours',quantity,{max:1000}),repeated(s.setupOwnerHours,base+'.setupOwnerHours',setupCount,{max:1000})],base+'.ownerHours');
   const row={id:s.id,name:s.name,unit:s.unit,quantity,setupCount,revenue,directCosts,laborCosts:null,externalCosts:null,contribution:null,ownerHours:owner===null?null:owner/100,allocations:[]};
   for(const [allocationIndex,a]of s.allocations.entries()){
    const path=base+'.allocations.'+allocationIndex,hours=idle?0:sum([repeated(a.hours,path+'.hours',quantity,{max:1000}),repeated(a.setupHours,path+'.setupHours',setupCount,{max:1000})],path+'.hours'),pool=poolData.get(a.poolId),item={name:a.name,poolId:a.poolId,hours:hours===null?null:hours/100,cost:hours===0?0:null};
    row.allocations.push(item);
    if(hours===0)continue;
    if(!pool){issue(path+'.poolId','unknown','Map this work to a role pool to include its cost and capacity.');continue;}
    pool.demands.push({hours,path,item});if(hours===null)pool.unresolved=true;
   }
   return row;
  });
  const pools=[];
  for(const pool of poolData.values()){
   const used=sum(pool.demands.map(v=>v.hours),'pools.'+pool.index+'.hours'),needed=used!==0;
   if(needed){pool.rate=read(p.pools[pool.index].rate,'pools.'+pool.index+'.rate',{max:100000});pool.available=read(p.pools[pool.index].hours,'pools.'+pool.index+'.hours',{max:1000000});}
   let cost=0;
   if(needed&&pool.rate===0){cost=0;for(const demand of pool.demands)demand.item.cost=0;}
   else if(needed&&(used===null||pool.rate===null))cost=null;
   else if(needed){
    // Round once per shared pool, then distribute fractional cents so rows reconcile.
    const exact=pool.demands.map((d,index)=>({d,index,n:BigInt(d.hours)*BigInt(pool.rate)})),numerator=exact.reduce((n,v)=>n+v.n,0n),rounded=(numerator+50n)/100n;
    cost=safe(rounded,'pools.'+pool.index+'.rate');
    if(cost!==null){let extras=Number(rounded-exact.reduce((n,v)=>n+v.n/100n,0n));const order=exact.slice().sort((a,b)=>Number(b.n%100n-a.n%100n)||a.index-b.index);for(const v of exact)v.d.item.cost=Number(v.n/100n);for(const v of order)if(extras>0){v.d.item.cost++;extras--;}}
   }
   // Negative net capacity records known non-project overcommitment, even if no delivery is planned.
   const rawHours=p.pools[pool.index].hours.trim(),negativeNet=/^-\d+(?:\.\d{0,2})?$/.test(rawHours)&&Number(rawHours)<0&&Number(rawHours)>=-1000000?Number(rawHours):null;
   if(negativeNet!==null)issue('pools.'+pool.index+'.hours','invalid','Non-project time exceeds this role’s available time by '+(-negativeNet)+' hours. Increase availability or reduce non-project work.');
   const availableHours=negativeNet!==null?negativeNet:pool.available===null?null:pool.available/100,usedHours=used===null?null:used/100,budgetHours=negativeNet!==null?negativeNet:pool.available===null||buffer===null?null:pool.available*(10000-buffer)/1000000;
   pools.push({id:pool.id,name:pool.name,availableHours,budgetHours,usedHours,remainingHours:budgetHours===null||usedHours===null?null:budgetHours-usedHours,overHours:budgetHours===null||usedHours===null?null:Math.max(0,usedHours-budgetHours),utilization:budgetHours===null||usedHours===null||budgetHours<=0?null:usedHours/budgetHours,rate:pool.rate,cost});
  }
  for(const row of services){row.laborCosts=sum(row.allocations.map(a=>a.cost),'services.'+row.id+'.labor');row.externalCosts=sum([row.directCosts,row.laborCosts],'services.'+row.id+'.cost');row.contribution=subtract(row.revenue,[row.externalCosts],'services.'+row.id+'.contribution');}
  const recurringCosts=sum(p.expenses.map((e,i)=>read(e.amount,'expenses.'+i+'.amount')),'expenses'),revenue=sum(services.map(s=>s.revenue),'revenue'),directCosts=sum(services.map(s=>s.directCosts),'directCosts'),externalLaborCosts=sum(services.map(s=>s.laborCosts),'externalLaborCosts'),externalCosts=sum([directCosts,externalLaborCosts],'externalCosts'),contribution=subtract(revenue,[externalCosts],'contribution'),availableForOwner=subtract(contribution,[recurringCosts],'availableForOwner'),afterOwnerTarget=subtract(availableForOwner,[ownerTarget],'afterOwnerTarget'),targetGap=subtract(afterOwnerTarget,[profitTarget],'targetGap');
  // A reserve reduces spare delivery time; it cannot discount an existing admin shortage.
  const ownerUsed=sum(services.map(s=>s.ownerHours===null?null:Math.round(s.ownerHours*100)),'ownerWork'),ownerUsedHours=ownerUsed===null?null:ownerUsed/100,ownerBudget=ownerAvailable===null||nonProject===null||buffer===null?null:ownerAvailable<nonProject?(ownerAvailable-nonProject)/100:(ownerAvailable-nonProject)*(10000-buffer)/1000000;
  const adminOver=ownerAvailable===null||nonProject===null?null:Math.max(0,(nonProject-ownerAvailable)/100);
  const owner={availableHours:ownerAvailable===null?null:ownerAvailable/100,nonProjectHours:nonProject===null?null:nonProject/100,budgetHours:ownerBudget,usedHours:ownerUsedHours,remainingHours:ownerBudget===null||ownerUsedHours===null?null:ownerBudget-ownerUsedHours,overHours:ownerBudget===null||ownerUsedHours===null?(adminOver>0?adminOver:null):Math.max(adminOver||0,ownerUsedHours-ownerBudget),utilization:ownerBudget===null||ownerUsedHours===null||ownerBudget<=0?null:ownerUsedHours/ownerBudget};
  const unmapped=services.some(s=>s.allocations.some(a=>a.hours!==0&&!a.poolId)),constraints=[owner,...pools.filter(pool=>pool.usedHours!==0||pool.budgetHours<0)],overloaded=constraints.some(c=>c.overHours!==null&&c.overHours>1e-9),unknown=unmapped||constraints.some(c=>c.usedHours===null||c.budgetHours===null),capacityStatus=overloaded?'overloaded':unknown?'unknown':'within';
  const limits=constraints.filter(c=>c.usedHours>0&&c.budgetHours!==null).map(c=>Math.max(0,c.budgetHours/c.usedHours));let scaleStatus=unknown?'unknown':limits.length?'known':'unbounded',maxScale=scaleStatus==='known'?Math.min(...limits):null;
  if(adminOver>0||pools.some(pool=>pool.budgetHours<0)){scaleStatus='known';maxScale=0;}
  const required=sum([recurringCosts,ownerTarget,profitTarget],'required'),requiredScale=required===null||contribution===null||contribution<=0?null:required/contribution;
  let goalFeasible=required===null||contribution===null?null:required>0&&contribution<=0?false:unknown?null:required===0&&contribution>=0?true:scaleStatus==='unbounded'&&contribution>0?true:requiredScale===null||maxScale===null?null:requiredScale<=maxScale+1e-9;
  if(adminOver>0||pools.some(pool=>pool.budgetHours<0))goalFeasible=false;
  const scaleMoney=value=>value===null||maxScale===null?null:(Number.isSafeInteger(Math.round(value*maxScale))?Math.round(value*maxScale):null),ceilingRevenue=scaleMoney(revenue),ceilingContribution=scaleMoney(contribution),ceilingAvailableForOwner=subtract(ceilingContribution,[recurringCosts],'ceilingAvailableForOwner'),ceilingAfterOwnerTarget=subtract(ceilingAvailableForOwner,[ownerTarget],'ceilingAfterOwnerTarget');
  const ownerTotal=sum([ownerUsed,nonProject],'ownerTotal'),externalHours=sum(pools.map(pool=>pool.usedHours===null?null:Math.round(pool.usedHours*100)),'externalHours');
  return {revenue,directCosts,externalLaborCosts,externalCosts,recurringCosts,contribution,availableForOwner,ownerTarget,profitTarget,afterOwnerTarget,targetGap,quantityTotal:sum(services.map(s=>s.quantity),'quantityTotal'),ownerTotalHours:ownerTotal===null?null:ownerTotal/100,totalTeamHours:unmapped?null:sum([ownerTotal,externalHours],'totalTeamHours')===null?null:(ownerTotal+externalHours)/100,owner,pools,services,capacityStatus,feasibleAtCurrentVolume:capacityStatus==='overloaded'||targetGap!==null&&targetGap<0?false:capacityStatus==='unknown'||targetGap===null?null:true,maxScale,scaleStatus,requiredScale,goalFeasible,ceilingRevenue,ceilingContribution,ceilingAvailableForOwner,ceilingAfterOwnerTarget,issues};
 }
 const api={VERSION,FORMAT,STORAGE_KEY,MAX_BYTES,MAX_PLANS,PERIOD_DAYS,WORK_DAYS,EDIT_FIELDS:Object.freeze([...EDIT_FIELDS]),fresh,create,update,addPool,removePool,addService,removeService,addExpense,removeExpense,setAllocation,removeAllocation,fromIdea,captureBaseline,duplicate,remove,merge,validate,serialize,parse,parseText,metrics};
 root.QQPlanner=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
