const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs'),q=require('./engine.js');
const read=(ui,source)=>vm.runInContext(source,ui.ctx);
function openStats(){
 const ui=setup();
 ui.click('start-restaurant');
 ui.drainTimers();
 ui.click('view',{view:'finances'});
 ui.click('analytics-tab',{tab:'performance'});
 ui.drainTimers();
 return ui;
}

test('opt-in month sample runs independent reproducible seeds without editing the workspace',()=>{
 const ui=openStats();
 read(ui,'for(let i=0;i<10;i++)QQ.step(state);draft.services[0].price=null;checkpoint();render()');
 const before=read(ui,'JSON.stringify(currentWorkspace())'),saved=[...ui.storage];
 assert.equal(read(ui,'monthSample'),null);
 ui.click('sample-months');assert.equal(read(ui,'monthSample.runs.length'),0);
 ui.drainTimers(300);
 const runs=JSON.parse(read(ui,'JSON.stringify(monthSample.runs)'));
 assert.deepEqual(runs.map(r=>r.seed),Array.from({length:20},(_,i)=>i+1));
 const config=JSON.parse(read(ui,'JSON.stringify(state.config)'));
 for(const row of runs){
  const replay=q.fresh({...config,seed:row.seed});
  while(replay.day<30&&q.step(replay)){}
  assert.equal(row.cash,replay.cash);
  assert.equal(row.profit,q.metrics(replay).profit);
  assert.equal(row.delivered,q.metrics(replay).delivered);
 }
 assert.match(read(ui,'monthSampleView()'),/20 of 20 reached day 30/);
 assert.match(read(ui,'monthSampleView()'),/Median/);
 assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),before);assert.deepEqual([...ui.storage],saved);
});

test('sample cancellation yields promptly and leaving stats stops the batch',()=>{
 const ui=openStats();ui.click('sample-months');ui.runNextTimer();
 assert.ok(read(ui,'monthSample.run.day')<=5);
 ui.click('cancel-sample');ui.drainTimers();assert.equal(read(ui,'monthSample.status'),'cancelled');
 ui.click('sample-months');ui.click('analytics-tab',{tab:'cash'});ui.drainTimers();
 assert.equal(read(ui,'monthSample.status'),'cancelled');assert.equal(read(ui,'monthSample.run'),null);
 ui.click('analytics-tab',{tab:'performance'});assert.match(read(ui,'monthSampleView()'),/Run 20 sample months/);
});

test('cash-blocked sample seeds are reported separately from day-30 ranges',()=>{
 const ui=openStats();
 read(ui,'state=QQ.fresh({...state.config,startingCash:10,deposit:0,overhead:0});draft=QQ.clone(state.config);render()');
 ui.click('sample-months');ui.drainTimers(300);
 assert.match(read(ui,'monthSampleView()'),/4 of 20 reached day 30/);
 assert.match(read(ui,'monthSampleView()'),/16 paused for funding/);
 assert.match(read(ui,'monthSampleView()'),/Seed \d+ · day \d+ · \$/);
 const blocked=JSON.parse(read(ui,'JSON.stringify(monthSample.runs.filter(r=>r.blockedDay))'));
 assert.ok(blocked.every(r=>r.profit===undefined&&r.shortfall>0));
 read(ui,'state=QQ.fresh({...state.config,overhead:1000});render()');
 assert.match(read(ui,'monthSampleView()'),/Run 20 sample months/);
 ui.click('sample-months');ui.drainTimers(300);
 assert.match(read(ui,'monthSampleView()'),/No sample reached day 30/);
 assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'state.blocked'),null);
});

test('high-volume batch guard leaves the configured live workload intact',()=>{
 const ui=openStats();
 read(ui,'state=QQ.fresh({...state.config,ownerHours:120,outreachHours:120,leadsPerHour:100});render()');
 assert.match(read(ui,'monthSampleView()'),/up to 600 possible new inquiries/);
 ui.click('sample-months');
 assert.equal(read(ui,'monthSample'),null);assert.equal(read(ui,'state.config.leadsPerHour'),100);
});
