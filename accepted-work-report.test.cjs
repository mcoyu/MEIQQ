const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const q=require('./engine');
const workspace=require('./workspace');
const report=require('./comparison-report');
const presets=require('./presets');
const catalog=require('./service-catalog');
const {setup}=require('./ui-test-host.cjs');

function fixture(months=3){
 const config=presets.newWorkspaceConfig({...q.DEFAULT,services:catalog.starterServices()});
 const source=q.fresh({...config,months,designerHours:6});
 while(source.day<30)assert.ok(q.step(source));
 const pair=q.startCapacityReplay(source,{month:1,key:'designerHours',value:12,demandId:'lead:10:0'});
 while(pair.phase!=='done')q.stepCapacityReplay(pair);
 const record={month:1,key:'designerHours',before:6,after:12,sourceDay:30,firstDay:1,endDay:30,demandId:pair.demandId};
 const raw={state:source,saved:[],checkpointInfo:[],draft:source.config,recoveryFiles:[]};
 return {source,pair,record,raw};
}
function finish(carrying,pair,source,record){
 let carry=null;
 if(carrying){
  carry=q.startCapacityCarry(source,pair.baseline,pair.alternative,record);
  while(carry.phase!=='done')q.stepCapacityCarry(carry);
 }
 const projection=q.startAcceptedProjection((carry||pair).baseline,(carry||pair).alternative);
 while(projection.phase!=='done')q.stepAcceptedProjection(projection);
 return {carry,acceptedProjection:projection};
}

test('saved projections keep only the optional horizon marker and frozen pair, with no invented accounting on import',()=>{
 for(const months of [1,3]){
  const {source,pair,record,raw}=fixture(months),args=[pair.baseline,pair.alternative];
  if(months===3)assert.throws(()=>workspace.saveReplayPair(raw,...args,{...record,finishAcceptedWork:true},source),/matching replay/);
  const requested={...record,...(months===3?{carriedThrough:90}:{}),finishAcceptedWork:true,profitDelta:999};
  const saved=workspace.saveReplayPair(raw,...args,requested,source);
  const again=workspace.saveReplayPair({...raw,...saved},...args,requested,source);
  assert.equal(again.saved.length,2);assert.equal(again.checkpointInfo[1].replays.length,1);
  const packed=workspace.pack({...raw,...again}),stored=packed.current.checkpointInfo[1].replays[0];
  assert.equal(stored.finishAcceptedWork,true);assert.equal(stored.profitDelta,undefined);
  stored.profitDelta=999;stored.acceptedProjection={settled:true,endDay:1000};
  const loaded=workspace.parse(packed).checkpointInfo[1].replays[0];
  assert.equal(loaded.finishAcceptedWork,true);assert.equal(loaded.profitDelta,undefined);assert.equal(loaded.acceptedProjection,undefined);
  stored.finishAcceptedWork='true';assert.throws(()=>workspace.parse(packed),/replay/i);
  delete stored.finishAcceptedWork;assert.equal(workspace.parse(packed).checkpointInfo[1].replays[0].finishAcceptedWork,undefined);
 }
});

test('offline output uses the settled projection of these exact horizon copies',()=>{
 for(const months of [1,3]){
  const {source,pair,record}=fixture(months);
  const replay={...record,...(months===3?{carriedThrough:90}:{}),finishAcceptedWork:true};
  const options=finish(months===3,pair,source,replay);
  const section=report.acceptedWorkSection(q.acceptedProjectionResult(options.acceptedProjection));
  const make=o=>report.create(pair.alternative,pair.baseline,{...o,replay}).html;
  assert.ok(make(options).includes(section));
  assert.throws(()=>make({...options,acceptedProjection:null}),/recomputed/);
  assert.throws(()=>make({...options,acceptedProjection:{...options.acceptedProjection,sourceBaseline:q.clone(options.acceptedProjection.sourceBaseline)}}),/recomputed/);
  if(months===3){
   for(const text of ['Original horizon · day 90','−$405.26','Conditional projection · day 142','+$271.31','$604.25','$875.56','Day 116','Monthly overhead','$180.00'])assert.ok(section.includes(text),text);
  }
  assert.doesNotMatch(section,/undefined|NaN/);
 }
});

test('an unreachable accepted job keeps the cutoff result and remaining work visible without a settled payoff',()=>{
 const {source}=fixture(1);
 const zero=q.fresh({...source.config,designerHours:0});
 while(zero.day<30)assert.ok(q.step(zero));
 const pair=q.startCapacityReplay(zero,{month:1,key:'designerHours',value:12});
 while(pair.phase!=='done')q.stepCapacityReplay(pair);
 const {acceptedProjection}=finish(false,pair,zero,{});
 const result=q.acceptedProjectionResult(acceptedProjection);
 assert.equal(result.settled,false);
 const html=report.acceptedWorkSection(result);
 assert.match(html,/Original horizon · day 30/);assert.match(html,/Conditional projection stopped/);
 assert.match(html,/still awaiting delivery/);assert.match(html,/payoff is unknown/);
 assert.doesNotMatch(html,/The original book settled|Cumulative operating profit through common day|NaN|undefined/);
});

test('cancel during the projection part of an export, reopen the same saved comparison and download it',async()=>{
 const {source,pair,record,raw}=fixture();
 const saved=workspace.saveReplayPair(raw,pair.baseline,pair.alternative,{...record,carriedThrough:90,finishAcceptedWork:true},source);
 const blank=setup(),key=vm.runInContext('KEY',blank.ctx);
 const ui=setup([[key,workspace.serialize({...raw,...saved})]]);
 const original=vm.runInContext('JSON.stringify(currentWorkspace())',ui.ctx);
 function download(){
  ui.click('comparison-report');
  ui.elements['#report-baseline']={value:'0'};ui.elements['#report-current']={value:'1'};
  ui.click('download-comparison');
 }
 download();
 for(let i=0;i<150&&!ui.elements['#modal'].innerHTML.includes('after day 90');i++)ui.runNextTimer();
 assert.match(ui.elements['#modal'].innerHTML,/Following accepted orders/);
 ui.click('close');ui.drainTimers();assert.equal(ui.downloads.length,0);
 download();
 for(let i=0;i<200&&!ui.downloads.length;i++)ui.runNextTimer();
 assert.equal(ui.downloads.length,1);
 const html=await (await fetch(ui.downloads[0].href)).text();
 assert.match(html,/Conditional projection · day 142/);assert.match(html,/\+\$271\.31/);
 assert.equal(vm.runInContext('JSON.stringify(currentWorkspace())',ui.ctx),original);
});
