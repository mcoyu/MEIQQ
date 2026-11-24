/* Reproducible adversarial engine review; intentionally separate from the fast unit suite. */
'use strict';
const assert=require('node:assert/strict'),q=require('./engine.js'),catalog=require('./service-catalog.js');

let runs=0,projects=0,restores=0;
for(const serviceId of ['monthly-promo-5','seasonal-campaign'])for(let seed=1;seed<=12;seed++){
 const service=catalog.createService(serviceId);service.weight=100;service.fulfillment.managedShare=(seed%3)/2;
 const config={...q.clone(q.DEFAULT),seed,months:12,startingCash:1e7,inquiries:seed%2?3:6,conversion:.65,retention:(seed%5)/4,ownerHours:36,designers:3,designerHours:32,designerRate:25,approvalDays:3,printDays:5,paymentDays:30,leadDays:14,realism:true,disruptions:{rushDeadlines:true,supplierReprints:true,repeatedRevisions:true,extendedLatePayments:true},services:[service]};
 const state=q.fresh(config);
 for(let day=1;day<=360;day++){assert.equal(q.step(state),true);if(day%90===0){assert.deepEqual(q.restore(state),state);restores++;}}
 assert.equal(state.cash,q.round(state.initialCash+state.ledger.reduce((sum,entry)=>sum+entry.amount,0)));assert.ok(state.history.every(day=>day.cash>=0));
 const queued=new Set();for(const item of state.repeatQueue){const key=item.contractId+':'+item.cycle;assert.equal(queued.has(key),false);queued.add(key);}
 for(const contract of state.contracts.filter(value=>value.kind==='campaign-relationship')){
  assert.ok(contract.cycles<=Math.floor(contract.campaign.relationshipDays/contract.campaign.cadenceDays));
  const related=state.projects.filter(project=>project.contractId===contract.id);assert.equal(contract.skipped,related.filter(project=>project.orderKind==='campaign-reoffer'&&project.stage==='lost').length);
  for(const project of related.filter(project=>project.accepted!==undefined&&project.terms.fulfillment)){const terms=project.terms.fulfillment;assert.equal(project.price,terms.mode==='agency-managed'?terms.managedPrice:terms.designOnlyPrice);assert.equal(project.printCost,terms.mode==='agency-managed'?terms.managedPrintCost:0);}
 }
 runs++;projects+=state.projects.length;
}

// Exercise the atomic print-cost cash decision separately from the high-cash matrix.
const printed=catalog.createService('postcard-250');Object.assign(printed,{weight:100,hours:0,review:0,price:75,print:75});printed.fulfillment={mode:'customer-choice',managedShare:1,designOnlyPrice:0};
const constrained=q.fresh({...q.clone(q.DEFAULT),months:1,startingCash:0,overhead:0,inquiries:30,conversion:1,ownerHours:120,designers:1,designerHours:120,designerRate:0,quoteHours:0,deliveryHours:0,approvalDays:0,printDays:0,paymentDays:0,deposit:0,realism:false,services:[printed]});
while(!constrained.blocked)q.step(constrained);const blockedDay=constrained.day,projectId=constrained.blocked.project;q.fund(constrained,constrained.blocked.gap);assert.equal(q.step(constrained),true);assert.equal(constrained.day,blockedDay+1);while(constrained.day<30&&!constrained.blocked)q.step(constrained);assert.equal(constrained.ledger.filter(entry=>entry.project===projectId&&entry.type==='expense').length,1);assert.ok(constrained.history.every(day=>day.cash>=0));assert.deepEqual(q.restore(constrained),constrained);

console.log(`review experiments passed: ${runs} annual runs, ${projects} projects, ${restores} replay checks, 1 funded cash block`);
