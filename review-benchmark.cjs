// Run manually: node review-benchmark.cjs. Timing is evidence, not a CI threshold.
// No files or saved browser workspaces are modified.
const q=require('./engine.js'),vm=require('node:vm'),{performance}=require('node:perf_hooks'),{setup}=require('./ui-test-host.cjs');
const config={...q.clone(q.DEFAULT),months:12,inquiries:500,startingCash:10000000,ownerHours:120,quoteHours:0,deliveryHours:0,designers:50,designerHours:120,conversion:1,approvalDays:0,paymentDays:0,repeat:0,retention:0,realism:false};
config.services=config.services.map(s=>({...s,hours:.1,review:0,print:0}));
const state=q.fresh(config),started=performance.now();
for(let i=0;i<360;i++)if(!q.step(state))throw Error('Benchmark stopped before the full horizon.');
console.log(JSON.stringify({fixture:'Allowed maximum inquiry volume; small jobs isolate analytics cost',days:state.day,projects:state.projects.length,contracts:state.contracts.length,simulationMs:Math.round(performance.now()-started)}));
function measure(label,fn){
 const durations=[];let result;
 for(let i=0;i<3;i++){const start=performance.now();result=fn();durations.push(performance.now()-start);}
 durations.sort((a,b)=>a-b);console.log(JSON.stringify({label,medianMs:Number(durations[1].toFixed(1)),samplesMs:durations.map(v=>Number(v.toFixed(1))),htmlLength:typeof result==='string'?result.length:undefined}));
}
measure('engine analytics',()=>q.analytics(state));
const {ctx}=setup();ctx.fixture=state;
vm.runInContext('state=fixture;draft=QQ.clone(state.config);view="finances"',ctx);
for(const tab of ['overview','contracts','performance']){
 ctx.requestedTab=tab;measure(tab+' view (HTML generation only)',()=>vm.runInContext('analyticsTab=requestedTab;financeView(QQ.metrics(state))',ctx));
}
// Separate snapshot objects and names; immutable nested project/history arrays
// are shared to isolate aggregation cost from 50 full-history allocations.
vm.runInContext('saved=Array.from({length:50},(_,i)=>({...state,config:{...state.config,name:"Snapshot "+i}}))',ctx);
measure('performance view with 50 saved snapshots (HTML generation only)',()=>vm.runInContext('analyticsTab="performance";financeView(QQ.metrics(state))',ctx));
