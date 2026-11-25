const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {setup} = require('./ui-test-host.cjs');

test('an exported saved carry reconciles the early gain with both terminal runs after reopening', async () => {
  const first = setup(undefined,{built:true});
  vm.runInContext(`
    state=QQ.fresh({...restaurantConfig(),designerHours:6});
    while(state.day<30)QQ.step(state);
    draft=QQ.clone(state.config);
  `,first.ctx);
  first.click('open-replay',{id:'P003'});
  first.elements['#replay-value']={value:'12'};
  first.click('run-replay');first.drainTimers();
  first.click('carry-replay');first.drainTimers();
  first.click('save-replay');
  const reopened=setup([...first.storage],{built:true});
  const read=code=>vm.runInContext(code,reopened.ctx);
  const originalWorkspace=read('JSON.stringify(currentWorkspace())');
  const records=read('checkpointInfo');
  const a=records.findIndex(info=>info.replays?.length);
  const b=records.findIndex(info=>info.replayId===records[a].replays[0].baselineId);
  assert.equal(records[a].replays[0].carriedThrough,90);
  function exportPair() {
    reopened.click('comparison-report');
    reopened.elements['#report-baseline']={value:String(b)};
    reopened.elements['#report-current']={value:String(a)};
    reopened.click('download-comparison');
  }
  exportPair();reopened.click('close');reopened.drainTimers();
  assert.equal(reopened.downloads.length,0);
  exportPair();
  // Stop once the download is ready, before the test clock revokes its blob.
  for(let i=0;i<150&&!reopened.downloads.length;i++)reopened.runNextTimer();
  assert.equal(reopened.downloads.length,1);
  const html=await (await fetch(reopened.downloads[0].href)).text();
  assert.match(html,/Carried forward through day 90/);
  assert.match(html,/earned \$405\.26 less in operating profit/);
  assert.match(html,/<a href="#job-costs">Where did the extra costs go\?/);
  const costs=html.match(/<section class="job-costs" id="job-costs">[\s\S]*?<\/section>/)?.[0];
  assert.ok(costs);
  for(const value of ['$604.80','$199.53','+$405.27','+$405.26','−$0.01',
    'Sunrise Books on Park Avenue','+$248.18','Sunrise Cleaning at the Plaza','+$209.75',
    'Little Lotus Noodle House on River Road','−$52.66','Maple Dumpling Kitchen near the Square',
    'Original P021','Changed P019','Original P017','Changed P020','Original P003','Changed P003']) {
    assert.ok(costs.includes(value),value);
  }
  assert.match(costs,/66\.39 h to 88\.90 h/);
  assert.match(costs,/Designer labor<\/th><td>\$1,194\.96<\/td><td>\$1,600\.22<\/td><td>\+\$405\.26/);
  assert.match(costs,/Jobs unfinished in the changed run<\/th><td>\+\$405\.27/);
  assert.match(costs,/Jobs delivered in the changed run<\/th><td>−\$0\.01/);
  assert.match(html,/Original delivered day 47\. Changed delivered day 33/);
  assert.match(html,/Month 1 · day 30[\s\S]*?\+\$419\.95/);
  assert.match(html,/Month 3 · day 90[\s\S]*?−\$405\.26/);
  assert.match(html,/Days 31–90 are projected/);
  assert.match(html,/Elapsed day<\/th><td>90<\/td><td>90/);
  assert.match(html,/One-change replay · Month 1/);
  assert.doesNotMatch(html,/<script\b/);
  assert.equal(read('JSON.stringify(currentWorkspace())'),originalWorkspace);
});

test('export of an older saved pair labels the forecast from month close even when the original ran longer', async () => {
  const ui=setup(undefined,{built:true});
  vm.runInContext(`
    state=QQ.fresh({...restaurantConfig(),designerHours:6});
    while(state.day<60)QQ.step(state);
    const pair=QQ.startCapacityReplay(state,{month:1,key:'designerHours',value:12});
    while(pair.phase!=='done')QQ.stepCapacityReplay(pair);
    const record={month:1,key:'designerHours',before:6,after:12,demandId:null,sourceDay:60,firstDay:1,endDay:30,carriedThrough:90};
    persistReplayPair(pair.baseline,pair.alternative,record,null);
  `,ui.ctx);
  ui.click('comparison-report');
  ui.elements['#report-baseline']={value:'0'};
  ui.elements['#report-current']={value:'1'};
  ui.click('download-comparison');
  for(let i=0;i<150&&!ui.downloads.length;i++)ui.runNextTimer();
  assert.equal(ui.downloads.length,1);
  const html=await (await fetch(ui.downloads[0].href)).text();
  assert.match(html,/Days 31–90 are projected in both runs/);
  assert.match(html,/Later decisions in the original scenario were unavailable/);
  assert.match(html,/had reached day 60 when this replay was requested/);
});
