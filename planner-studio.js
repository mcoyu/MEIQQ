/* Shared studio assumptions live in one plan. Alternatives remain independent. */
(function(root){
 'use strict';
 const Model=typeof module!=='undefined'?require('./planner.js'):root.QQPlanner;
 const Explorer=typeof module!=='undefined'?require('./planner-explorer.js'):root.QQPlannerExplorer;
 function number(raw,max){const s=typeof raw==='string'?raw.trim():'';return /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(s)&&Number(s)<=max?Number(s):null;}
 const decimal=n=>String(Math.round(n*100)/100);
 function open(book){
  const current=book.plans.find(p=>p.id===book.studio?.planId);if(current)return current;
  const next=Model.validate(book),p=Model.create(next);
  Object.assign(p,{name:'Studio plan',notes:'Income target and weekly limits are your editable starting preferences. Service price, sales volume, costs, effort, admin time, reserve and retained-profit target are illustrative placeholders to research. Both partners share the combined income target; the Partner cash rate starts at zero to avoid counting that income twice.',ownerHours:'32',nonProjectHours:'6',bufferPct:'10',ownerTarget:'2000',profitTarget:'400',nextPoolId:2,nextServiceId:2,pools:[{id:'pool-1',name:'Partner',hours:'26',rate:'0'}],expenses:[{id:'expense-1',name:'Recurring studio costs · placeholder',amount:'200'}],services:[{id:'service-1',name:'Exploratory studio service · placeholder',unit:'scoped engagement',quantity:'4',setupCount:'2',price:'600',directCost:'20',setupCost:'0',ownerHours:'3',setupOwnerHours:'1',allocations:[{name:'Partner delivery',poolId:'pool-1',hours:'5',setupHours:'2'}],source:null}]});
  next.studio={planId:p.id,partnerPoolId:'pool-1',ownerWeeklyHours:'8',partnerWeeklyHours:'8',partnerAdminHours:'6'};
  Model.serialize(next);Object.assign(book,next);return book.plans.find(v=>v.id===p.id);
 }
 function initialize(book){return book.studio===null?open(book):book.plans.find(p=>p.id===book.studio?.planId)||null;}
 function update(book,key,value){
  if(!['ownerWeeklyHours','partnerWeeklyHours','partnerAdminHours'].includes(key)||typeof value!=='string'||value.length>80)throw Error('Choose an editable studio capacity field.');
  const next=Model.validate(book),meta=next.studio,p=next.plans.find(p=>p.id===meta?.planId);if(!p)throw Error('Open the Studio plan first.');
  if(meta[key]===value)return false;meta[key]=value;
  if(key==='ownerWeeklyHours'){const n=number(value,168);Model.update(next,p.id,'ownerHours',n===null?'':decimal(n*4));}
  else {const index=p.pools.findIndex(pool=>pool.id===meta.partnerPoolId);if(index<0)throw Error('The partner pool was removed. Use Restore partner capacity in Earnings lab to plan that capacity.');const weekly=number(meta.partnerWeeklyHours,168),admin=number(meta.partnerAdminHours,1000000);Model.update(next,p.id,'pools.'+index+'.hours',weekly===null||admin===null?'':decimal(weekly*4-admin));}
  Model.serialize(next);Object.assign(book,next);return true;
 }
 function updateField(book,id,path,value){
  const next=Model.validate(book);Model.update(next,id,path,value);
  if(next.studio?.planId===id){
   const p=next.plans.find(p=>p.id===id),meta=next.studio;
   if(path==='ownerHours'){const n=number(value,1000000);meta.ownerWeeklyHours=n===null?'':decimal(n/4);}
   const index=p.pools.findIndex(pool=>pool.id===meta.partnerPoolId);
   if(index>=0&&path==='pools.'+index+'.hours'){const n=number(value,1000000),admin=number(meta.partnerAdminHours,1000000);meta.partnerWeeklyHours=n===null||admin===null?'':decimal((n+admin)/4);}
  }
  Model.serialize(next);Object.assign(book,next);
 }
 function tryScenario(book,id,serviceId,quantity,when){
  const next=Model.validate(book),p=next.plans.find(p=>p.id===id);if(!p)throw Error('Select a plan first.');
  const row=Explorer.scenarios(p,serviceId,{quantities:[quantity]}).find(row=>row.quantity===quantity);
  if(!row||row.requiredPrice===null||!row.pricedMetrics)throw Error('Confirm the missing costs and targets before trying this scenario.');
  const copy=Model.duplicate(next,id,{date:when}),index=copy.services.findIndex(s=>s.id===serviceId);
  Model.update(next,copy.id,'services.'+index+'.quantity',String(row.quantity));
  Model.update(next,copy.id,'services.'+index+'.setupCount',String(row.setupCount));
  Model.update(next,copy.id,'services.'+index+'.price',(row.requiredPrice/100).toFixed(2));
  Model.update(next,copy.id,'name',(p.name||'Studio plan').slice(0,250)+' · '+row.quantity+' at $'+(row.requiredPrice/100).toFixed(2));
  Model.serialize(next);Object.assign(book,next);return book.plans.find(p=>p.id===copy.id);
 }
 function restorePartner(book){
  const next=Model.validate(book),meta=next.studio,p=next.plans.find(p=>p.id===meta?.planId);if(!p)throw Error('Open the Studio plan first.');
  if(p.pools.some(pool=>pool.id===meta.partnerPoolId))return false;
  const weekly=number(meta.partnerWeeklyHours,168),admin=number(meta.partnerAdminHours,1000000);
  const pool=Model.addPool(next,p.id,{name:'Partner',hours:weekly===null||admin===null?'':decimal(weekly*4-admin),rate:'0'});meta.partnerPoolId=pool.id;
  Model.serialize(next);Object.assign(book,next);return true;
 }
 function fromIdea(book,idea,when){
  const next=Model.validate(book),p=open(next);
  const copies=p.services.filter(s=>s.source?.ideaVersion===idea.version);
  const existing=copies.find(s=>idea.linkKey&&s.source.ideaKey===idea.linkKey)||
   copies.find(s=>!s.source.ideaKey&&s.source.ideaId===idea.id&&s.source.name===idea.name);
  const linked=Boolean(existing&&idea.linkKey&&!existing.source.ideaKey);
  if(linked){existing.source.ideaKey=idea.linkKey;p.revision++;}
  if(!existing)Model.fromIdea(next,p.id,idea,when);
  Model.serialize(next);Object.assign(book,next);return {planId:p.id,serviceId:existing?.id||book.plans.find(v=>v.id===p.id).services.at(-1).id,added:!existing,linked};
 }
 const api={open,initialize,update,updateField,tryScenario,fromIdea,restorePartner};root.QQPlannerStudio=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
