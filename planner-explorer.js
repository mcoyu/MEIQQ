/* Pure, whole-studio what-if calculations. No plan or baseline is modified. */
(function(root){
 'use strict';
 const Planner=typeof module!=='undefined'?require('./planner.js'):root.QQPlanner;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const MAX_QUANTITY=10000,MAX_PRICE_CENTS=10000000000;
 function scaled(raw,{integer=false,max=100000000}={}){
  if(typeof raw!=='string')return null;
  const value=raw.trim(),pattern=integer?/^\d+$/:/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
  if(!value||!pattern.test(value)||!Number.isFinite(Number(value))||Number(value)>max)return null;
  if(integer)return Number(value);
  const [whole,fraction='']=value.split('.');return Number(whole||0)*100+Number((fraction+'00').slice(0,2));
 }
 function defaults(service){
  const current=scaled(service.quantity,{integer:true,max:MAX_QUANTITY});
  const start=current===null?3:Math.max(1,Math.min(MAX_QUANTITY-2,current-1));
  return [start,start+1,start+2];
 }
 function safeSum(values){
  if(values.some(value=>value===null||!Number.isSafeInteger(value)))return null;
  const sum=values.reduce((total,value)=>total+BigInt(value),0n);
  return sum>BigInt(Number.MAX_SAFE_INTEGER)||sum<BigInt(Number.MIN_SAFE_INTEGER)?null:Number(sum);
 }
 function priceRequired(metrics,serviceId,quantity){
  const required=safeSum([metrics.ownerTarget,metrics.profitTarget,metrics.recurringCosts,metrics.externalCosts]);
  const others=safeSum(metrics.services.filter(service=>service.id!==serviceId).map(service=>service.revenue));
  if(required===null||others===null)return null;
  const difference=BigInt(required)-BigInt(others);
  if(difference<=0n)return 0;
  const price=(difference+BigInt(quantity)-1n)/BigInt(quantity);
  return price>BigInt(Number.MAX_SAFE_INTEGER)?null:Number(price);
 }
 function hoursLimit(resource,quantity,forceUnknown=false){
  const budget=resource?.budgetHours,used=resource?.usedHours;
  if(forceUnknown||budget===null||used===null||!Number.isFinite(budget)||!Number.isFinite(used))return {hoursLimit:null,status:'unknown'};
  // Capacities have at most six decimal places. Effort has two. Use integers
  // before division so an editable limit never rounds above available time.
  const capacityMicros=Math.round(budget*1000000),usedHundredths=Math.round(used*100);
  if(!Number.isSafeInteger(capacityMicros)||!Number.isSafeInteger(usedHundredths))return {hoursLimit:null,status:'unknown'};
  const remaining=BigInt(capacityMicros)-BigInt(usedHundredths)*10000n;
  if(remaining<0n)return {hoursLimit:null,status:'setup-over-capacity'};
  const hundredths=remaining/(BigInt(quantity)*10000n);
  if(hundredths>BigInt(Number.MAX_SAFE_INTEGER))return {hoursLimit:null,status:'unknown'};
  return {hoursLimit:Number(hundredths)/100,status:'known'};
 }
 function scenarios(plan,serviceId,{quantities}={}){
  const index=plan?.services?.findIndex(service=>service.id===serviceId);
  if(index===undefined||index<0)throw Error('Choose a service in this plan.');
  const selected=plan.services[index],values=quantities===undefined?defaults(selected):quantities;
  if(!Array.isArray(values)||!values.length||values.length>100||values.some(value=>!Number.isInteger(value)||value<1||value>MAX_QUANTITY))throw Error('Use between 1 and 100 whole-job quantities, each from 1 to 10000.');
  const requestedSetup=scaled(selected.setupCount,{integer:true,max:MAX_QUANTITY}),currentPrice=scaled(selected.price);
  return [...new Set(values)].map(quantity=>{
   const candidate=clone(plan),service=candidate.services[index],setupCount=requestedSetup===null?null:Math.min(requestedSetup,quantity),changedSetup=setupCount!==null&&setupCount!==requestedSetup,notices=[];
   service.quantity=String(quantity);if(setupCount!==null)service.setupCount=String(setupCount);
   if(changedSetup)notices.push('Setup count changes from '+requestedSetup+' to '+setupCount+' because it cannot exceed the '+quantity+' planned units.');
   if(requestedSetup===null)notices.push('Confirm how many units need setup; that assumption remains unknown.');
   const metrics=Planner.metrics(candidate),requiredPrice=priceRequired(metrics,serviceId,quantity);
   if(requiredPrice===null)notices.push('The required price needs known studio targets, recurring and direct costs, paid-role costs, and revenue from the other services.');
   let pricedMetrics=null;
   if(requiredPrice!==null&&requiredPrice<=MAX_PRICE_CENTS){const priced=clone(candidate);priced.services[index].price=(requiredPrice/100).toFixed(2);pricedMetrics=Planner.metrics(priced);}
   else if(requiredPrice!==null)notices.push('The required price exceeds the planner’s supported price limit.');
   // Set only the selected service's per-unit delivery effort to zero. Its
   // setup work and every other service stay fixed, revealing residual time.
   const residual=clone(candidate),residualService=residual.services[index];residualService.ownerHours='0';for(const allocation of residualService.allocations)allocation.hours='0';
   const residualMetrics=Planner.metrics(residual),ownerLimit=hoursLimit(residualMetrics.owner,quantity);
   const fixedWorkUnmapped=residualMetrics.services.some(row=>row.allocations.some(allocation=>!allocation.poolId&&allocation.hours!==0));
   const poolHourLimits=[],seen=new Set();
   for(const allocation of service.allocations){
    const key=allocation.poolId||'unmapped:'+allocation.name;if(seen.has(key))continue;seen.add(key);
    const pool=residualMetrics.pools.find(row=>row.id===allocation.poolId),limit=hoursLimit(pool,quantity,fixedWorkUnmapped||!allocation.poolId);
    poolHourLimits.push({poolId:allocation.poolId,name:pool?.name||allocation.name||'Unmapped responsibility',...limit});
   }
   if(ownerLimit.status==='setup-over-capacity'||poolHourLimits.some(pool=>pool.status==='setup-over-capacity'))notices.push('Other work and fixed setup already exceed a capacity budget; reducing this service’s per-unit effort alone cannot make it fit.');
   if(metrics.capacityStatus==='overloaded')notices.push('At the current effort, this quantity exceeds capacity. A higher price alone cannot fix that workload.');
   return {serviceId,quantity,setupCount,changedSetup,requiredPrice,currentPrice,metrics,pricedMetrics,ownerHoursLimit:ownerLimit.hoursLimit,ownerLimitStatus:ownerLimit.status,poolHourLimits,notices};
  });
 }
 function evaluate(plan){return {metrics:Planner.metrics(plan),services:plan.services.map(service=>({serviceId:service.id,name:service.name,rows:scenarios(plan,service.id)}))};}
 function periodOptions(options={}){const days=options.workDays===undefined?22:options.workDays;if(!Number.isInteger(days)||days<1||days>366)throw Error('Use a whole number of modeled workdays from 1 to 366.');return days;}
 function toPeriodHours(raw,options={}){const days=periodOptions(options),weekly=scaled(raw,{max:168});return weekly===null?null:(Math.floor(weekly*days/5)/100).toFixed(2);}
 function toWeeklyHours(raw,options={}){const days=periodOptions(options),period=scaled(raw,{max:1000000});return period===null?null:(Math.floor(period*5/days)/100).toFixed(2);}
 const api={scenarios,evaluate,toPeriodHours,toWeeklyHours};root.QQPlannerExplorer=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
