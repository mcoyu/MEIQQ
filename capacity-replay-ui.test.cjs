const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const dialog=ui=>ui.elements['#modal'].innerHTML;

function workload(days=30,overrides={}){
 const ui=setup();
 ui.ctx.overrides=overrides;
 read(ui,`state=QQ.fresh({...QQ.clone(QQ.DEFAULT),acquisition:'preset',inquiries:2,conversion:1,designers:0,designerHours:40,
  designerRate:10,ownerHours:120,overhead:100,startingCash:10000,deposit:.5,realism:false,repeat:0,approvalDays:0,
  paymentDays:0,quoteHours:0,deliveryHours:0,months:3,services:[{...QQ.DEFAULT.services[0],weight:100,hours:6,
  print:0,review:0,price:400,recurring:false}],...overrides});
  for(let day=0;day<${days};day++)QQ.step(state);
  draft=QQ.clone(state.config);view='map';render()`);
 return ui;
}
function runChange(ui,value=1){
 ui.elements['#replay-value']={value:String(value)};
 ui.click('run-replay');
}
test('a stopped design job prompts one change and replays its original workload without editing the scenario',()=>{
 const ui=workload();
 const before=read(ui,'JSON.stringify(state)');
 const job=read(ui,'state.projects[0]');
 assert.match(ui.elements['#root'].innerHTML,/class="replay-prompt"/);
 ui.click('open-replay',{id:job.id,origin:'watch'});
 assert.match(dialog(ui),/Month 1 · Days 1–30/);
 assert.match(dialog(ui),/0 designers/);
 assert.equal(read(ui,'replayDialog.key'),'designers');
 runChange(ui);
 assert.match(dialog(ui),/Cancel replay/);
 ui.drainTimers();
 assert.match(dialog(ui),/3 fewer jobs remained undelivered/);
 assert.match(dialog(ui),/Operating profit increased by \$954/);
 assert.match(dialog(ui),/In design · 6 h left/);
 assert.match(dialog(ui),/Delivered day 3/);
 assert.match(dialog(ui),/Save comparison/);
 assert.equal(read(ui,'JSON.stringify(state)'),before);
 assert.equal(read(ui,'saved.length'),0);
 ui.click('save-replay');
 assert.equal(read(ui,'analyticsTab'),'compare');
 assert.equal(read(ui,'saved.length'),2);
 assert.equal(read(ui,'JSON.stringify(state)'),before);
 assert.match(ui.elements['#root'].innerHTML,/One-change replay · Month 1/);
});

test('an in-progress replay can be cancelled and reversed before either copy is saved',()=>{
 const ui=workload(10);
 const before=read(ui,'JSON.stringify(state)');
 ui.click('open-replay',{id:'P001'});
 assert.match(dialog(ui),/days beyond your current day 10/);
 runChange(ui);ui.runNextTimer();
 ui.click('close');ui.drainTimers();
 assert.equal(dialog(ui),'');assert.equal(read(ui,'latestCapacityReplay.has(state)'),false);
 assert.equal(read(ui,'saved.length'),0);assert.equal(read(ui,'JSON.stringify(state)'),before);
});

test('changing an earlier period and changing the input are independent of the setup draft',()=>{
 const ui=workload(42);
 read(ui,'draft.ownerHours=90');
 ui.click('open-replay',{id:'P001'});assert.match(dialog(ui),/Pending setup edits/);
 const configure=(id,value)=>ui.handlers.change({target:{id,value,dataset:{}}});
 configure('replay-month','1');configure('replay-key','designerHours');
 assert.match(dialog(ui),/Extra hours alone leave the design team at zero capacity/);
 runChange(ui,48);ui.drainTimers();
 assert.match(dialog(ui),/Operating profit was unchanged/);
 assert.equal(read(ui,'replayDialog.descriptor.firstDay'),1);
 assert.equal(read(ui,'replayDialog.descriptor.endDay'),30);
 assert.equal(read(ui,'draft.ownerHours'),90);
 ui.click('close');
 ui.click('show-last-replay');
 assert.match(dialog(ui),/Replay result · Month 1/);
});

test('a funding stop in the alternative identifies its day and suppresses savings claims',()=>{
 const ui=workload(30,{startingCash:100,overhead:0,designerRate:100,deposit:0});
 ui.click('open-replay',{id:'P001'});runChange(ui);ui.drainTimers();
 assert.match(dialog(ui),/Changed paused before day \d+ with a \$[\d,.]+ cash shortfall/);
 assert.doesNotMatch(dialog(ui),/Save comparison|profit (increased|decreased)|cleared the backlog/);
 assert.equal(read(ui,'state.blocked'),null);assert.equal(read(ui,'saved.length'),0);
});
