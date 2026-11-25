const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

function withTwoSavedRuns(){
 const ui=setup();
 vm.runInContext("for(let i=0;i<5;i++)QQ.step(state);checkpoint('manual');for(let i=0;i<5;i++)QQ.step(state);checkpoint('manual');view='scenarios';render()",ui.ctx);
 return ui;
}

test('comparison UI downloads saved-versus-saved self-contained HTML without mutating runs',async()=>{
 const ui=withTwoSavedRuns(),{ctx,click,elements,downloads}=ui;
 const before=vm.runInContext('JSON.stringify({state,saved,checkpointInfo,draft})',ctx);
 click('comparison-report');
 assert.match(elements['#modal'].innerHTML,/Choose any two runs/);
 elements['#report-baseline']={value:'0'};elements['#report-current']={value:'1'};
 click('download-comparison');
 assert.equal(downloads.length,1);assert.match(downloads[0].download,/\.html$/);
 const response=await fetch(downloads[0].href),html=await response.text();
 assert.match(response.headers.get('content-type')||'',/^text\/html;charset=utf-8$/i);
 assert.match(html,/MEIQQ offline comparison report/);assert.match(html,/Exact assumption changes/);
 assert.equal(vm.runInContext('JSON.stringify({state,saved,checkpointInfo,draft})',ctx),before);
});

test('comparison UI rejects selecting the same run and creates no download',()=>{
 const {click,elements,downloads}=withTwoSavedRuns();
 click('comparison-report');elements['#report-baseline']={value:'0'};elements['#report-current']={value:'0'};
 click('download-comparison');
 assert.equal(downloads.length,0);assert.match(elements['#toast'].textContent,/two different runs/);
});

test('comparison dialog defaults to the pinned baseline without moving the pin',()=>{
 const ui=withTwoSavedRuns(),{ctx,click,elements}=ui;click('pin-baseline',{index:'1'});const before=vm.runInContext('JSON.stringify(checkpointInfo)',ctx);
 click('comparison-report');assert.match(elements['#modal'].innerHTML,/id="report-baseline"[\s\S]*?<option value="1" selected/);assert.match(elements['#modal'].innerHTML,/id="report-current"[\s\S]*?<option value="-1" selected/);assert.equal(vm.runInContext('JSON.stringify(checkpointInfo)',ctx),before);
});

test('saved replay report keeps the selected job, month-only earnings and projected cutoff',async()=>{
 const {ctx,click,elements,downloads}=setup();
 const read=code=>vm.runInContext(code,ctx);
 read(`state=QQ.fresh({...QQ.clone(QQ.DEFAULT),acquisition:'preset',inquiries:2,conversion:1,designers:0,designerHours:40,
  designerRate:10,ownerHours:120,overhead:100,startingCash:10000,deposit:.5,realism:false,repeat:0,approvalDays:0,
  paymentDays:0,quoteHours:0,deliveryHours:0,months:3,services:[{...QQ.DEFAULT.services[0],weight:100,hours:6,
  print:0,review:0,price:400,recurring:false}]});draft=QQ.clone(state.config);
  for(let day=0;day<42;day++)QQ.step(state);
  const experiment=QQ.startCapacityReplay(state,{month:2,key:'designers',value:1,demandId:state.projects[0].demandId});
  while(experiment.phase!=='done')QQ.stepCapacityReplay(experiment);
  const descriptor={month:2,key:'designers',before:0,after:1,demandId:experiment.demandId,firstDay:31,endDay:60,sourceDay:42};
  persistReplayPair(experiment.baseline,experiment.alternative,{...descriptor,demandId:state.projects[1].demandId});
  const pair=persistReplayPair(experiment.baseline,experiment.alternative,descriptor);
  showSavedComparison(pair.baselineRun,pair.alternativeRun,pair.record)`);
 async function download(base,current){
  click('comparison-report');
  elements['#report-baseline']={value:String(base)};elements['#report-current']={value:String(current)};
  click('download-comparison');
  return (await fetch(downloads.at(-1).href)).text();
 }
 const html=await download(0,1),replay=html.match(/<section><h2>One-change replay[\s\S]*?<\/section>/)?.[0];
 assert.ok(replay);
 for(const text of ['Month 2','Days 31–60','Number of designers · 0 → 1','P001 · Design · 6 h left','P001 · Delivered day 32',
  'The changed run cleared the backlog.','Operating profit increased by $2,029.50.','Delivered revenue rose by $2,400.00 and costs rose by $370.50.',
  'Undelivered jobs at period end</th><td>6</td><td>0',
  'Operating profit this period</th><td>-$100.00</td><td>$1,929.50','Owner hours this period','Profit after owner time',
  'Closing cash</th><td>$11,000.00</td><td>$11,829.50','day 42','project days 43–60','2 matching external inquiries']){
  assert.ok(replay.includes(text),text);
 }
 assert.ok(html.indexOf('One-change replay')<html.indexOf('Run-to-date results'));
 const reversed=await download(1,0);
 assert.doesNotMatch(reversed,/One-change replay|The changed run cleared/);
 const ordinary=await download(-1,1);
 assert.doesNotMatch(ordinary,/One-change replay|The changed run cleared/);
 assert.match(ordinary,/different-day/);
});
