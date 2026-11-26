const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup,startBalancedRestaurant}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const dialog=ui=>ui.elements['#modal'].innerHTML;

function monthReplay({observed=90,hours=6,value=12,months=3}={}){
 const ui=setup();
 startBalancedRestaurant(ui,{designerHours:hours,months});
 read(ui,`while(state.day<${observed}&&QQ.step(state)){}
  draft=QQ.clone(state.config);draft.ownerHours=null;view='map';render();`);
 ui.click('open-replay',{id:'P003'});
 if(observed>30)ui.handlers.change({target:{id:'replay-month',value:'1',dataset:{}}});
 ui.elements['#replay-value']={value:String(value)};
 ui.click('run-replay');ui.drainTimers();
 assert.match(dialog(ui),/Replay result · Month 1/);
 return ui;
}

test('a month-one lead can reverse by day 90 even though the selected job ships earlier',()=>{
 const ui=monthReplay(),before=read(ui,'JSON.stringify(currentWorkspace())');
 assert.match(dialog(ui),/Carry this change forward/);
 ui.click('carry-replay');
 assert.match(dialog(ui),/Carrying the change through day 90/);
 ui.drainTimers();
 const output=dialog(ui);
 assert.match(output,/earned \$405.26 less in operating profit/);
 assert.match(output,/Delivered revenue held steady and costs rose by \$405.26/);
 assert.match(output,/day 30 the changed run had been \$419.95 ahead/);
 assert.match(output,/P003 delivered 14 days earlier with the change \(day 33 versus day 47\)/);
 assert.match(output,/Month 2/);assert.match(output,/\+\$300.38/);assert.match(output,/Month 3/);
 assert.match(output,/Closing cash/);assert.match(output,/Designer labor is charged for hours worked/);
 assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),before);
 ui.click('back-replay-month');
 assert.match(dialog(ui),/Replay result · Month 1/);assert.match(dialog(ui),/View through day 90/);
});

test('the carry verdict reconciles unfinished spending to the exact posted cost and keeps the two cycles distinct',()=>{
 const ui=monthReplay();
 ui.click('carry-replay');ui.drainTimers();
 const output=dialog(ui);
 const breakdown=output.match(/<div class="carry-cost-section">[\s\S]*?<\/details><\/div>/)?.[0];
 assert.ok(breakdown);
 assert.match(breakdown,/unfinished jobs carried <strong>\$405\.27 more/);
 assert.match(breakdown,/Original \$199\.53 · Changed \$604\.80/);
 assert.match(breakdown,/Trace the \$405\.26 cost increase/);
 assert.match(breakdown,/unfinished in the changed run<\/dt><dd>\+\$405\.27/);
 assert.match(breakdown,/delivered in the changed run<\/dt><dd>-\$0\.01/);
 assert.match(breakdown,/Net change in costs<\/dt><dd>\+\$405\.26/);
 assert.match(breakdown,/22\.52 more designer hours/);
 const jobs=Array.from(breakdown.matchAll(/<li class="carry-cost-row">([\s\S]*?)<\/li>/g),m=>m[1]);
 const job=client=>jobs.find(r=>r.includes(client));
 assert.match(job('Sunrise Books'),/\+\$248\.18[\s\S]*Cycle 3[\s\S]*No matching job[\s\S]*P018[\s\S]*\+13\.79 h/);
 assert.match(job('Sunrise Cleaning'),/\+\$209\.75[\s\S]*Cycle 2[\s\S]*P021[\s\S]*P019[\s\S]*\+11\.65 h/);
 assert.match(job('Little Lotus'),/-\$52\.66[\s\S]*P017[\s\S]*P020[\s\S]*-2\.93 h/);
 assert.match(job('Maple Dumpling'),/-\$0\.01[\s\S]*Same hours/);
 assert.match(breakdown,/Selected job P003 used 14\.33 designer hours in both runs/);
 assert.doesNotMatch(breakdown,/NaN|undefined/);
 ui.click('save-replay');
 const reopened=setup(ui.storage);
 reopened.click('open-saved-replay',{index:'1',record:'0'});reopened.drainTimers();
 assert.ok(dialog(reopened).includes(breakdown));
});

test('a carried projection keeps both horizons visible, cancels independently and reopens its saved result',()=>{
 const ui=monthReplay();
 assert.doesNotMatch(dialog(ui),/data-action="finish-accepted-work"/);
 ui.click('carry-replay');ui.drainTimers();
 const original=read(ui,'JSON.stringify(currentWorkspace())');
 ui.click('finish-accepted-work');
 assert.match(dialog(ui),/earned \$405\.26 less/);
 assert.match(dialog(ui),/Finishing the work accepted by day 90/);
 for(let i=0;i<5;i++)ui.runNextTimer();
 ui.click('cancel-accepted-work');ui.drainTimers();
 assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),original);
 assert.match(dialog(ui),/data-action="finish-accepted-work"/);
 assert.doesNotMatch(dialog(ui),/Conditional projection · day/);
 ui.click('finish-accepted-work');ui.drainTimers(300);
 assert.match(dialog(ui),/Original horizon · day 90[\s\S]*?−\$405\.26[\s\S]*?Conditional projection · day 142[\s\S]*?\+\$271\.31/);
 assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),original);
 ui.click('save-replay');
 const marker=read(ui,'checkpointInfo[1].replays[0]');
 assert.equal(marker.finishAcceptedWork,true);assert.equal(marker.carriedThrough,90);
 const reopened=setup(ui.storage);reopened.click('open-saved-replay',{index:'1',record:'0'});reopened.drainTimers(300);
 assert.match(dialog(reopened),/Through day 90[\s\S]*?Conditional projection · day 142[\s\S]*?\+\$271\.31/);
 assert.equal(read(reopened,'state.day'),90);
});

test('a final-month saved pair can run and remember its projection without a carry record',()=>{
 const ui=monthReplay({months:1,observed:30});
 assert.match(dialog(ui),/Finish the accepted work/);
 ui.click('save-replay');
 assert.equal(read(ui,'checkpointInfo[1].replays[0].finishAcceptedWork'),undefined);
 ui.click('finish-saved-work');ui.drainTimers(300);
 assert.match(dialog(ui),/Original horizon · day 30[\s\S]*?Conditional projection · day/);
 ui.click('save-replay');
 const record=read(ui,'checkpointInfo[1].replays[0]');
 assert.equal(record.finishAcceptedWork,true);assert.equal(record.carriedThrough,undefined);
 assert.equal(read(ui,'checkpointInfo[1].replays.length'),1);
 const reopened=setup(ui.storage);reopened.click('open-saved-replay',{index:'1',record:'0'});reopened.drainTimers(300);
 assert.match(dialog(reopened),/Replay result · Month 1[\s\S]*?Conditional projection · day/);
});

test('an unreachable projection leaves its original horizon pair saveable and unmarked',()=>{
 const ui=monthReplay({months:1,observed:30,hours:0});
 ui.click('finish-accepted-work');ui.drainTimers(300);
 assert.match(dialog(ui),/Conditional projection stopped/);
 assert.doesNotMatch(dialog(ui),/Conditional projection · day/);
 ui.click('save-replay');
 assert.equal(read(ui,'checkpointInfo[1].replays[0].finishAcceptedWork'),undefined);
 const reopened=setup(ui.storage);reopened.click('open-saved-replay',{index:'1',record:'0'});
 assert.match(reopened.elements['#root'].innerHTML,/One-change replay · Month 1/);
 assert.equal(dialog(reopened),'');
});

test('the saved outlook reopens from its original source and a timing-only result does not claim a profit gain',()=>{
 const ui=monthReplay({hours:24,value:32});
 ui.click('carry-replay');ui.drainTimers();
 assert.match(dialog(ui),/same operating profit|caught up in operating profit/);
 assert.match(dialog(ui),/P003 delivered 1 day earlier/);
 ui.click('save-replay');
 assert.match(dialog(ui),/Through day 90/);
 assert.match(dialog(ui),/Added to Saved replays/);
 assert.doesNotMatch(dialog(ui),/data-action="save-replay"/);
 assert.equal(read(ui,'saved.length'),2);
 assert.match(ui.elements['#root'].innerHTML,/View through day 90/);
 const saved=setup(ui.storage);
 saved.click('open-saved-replay',{index:'1',record:'0'});
 assert.match(saved.elements['#root'].innerHTML,/View through day 90/);
 saved.drainTimers();
 assert.match(dialog(saved),/P003 delivered 1 day earlier/);
 assert.match(dialog(saved),/Back to month 1/);
 saved.click('back-replay-month');
 assert.equal(dialog(saved),'');
 assert.match(saved.elements['#root'].innerHTML,/One-change replay · Month 1/);
});

test('a partial source labels the projection, cancellation preserves the month and the last month has no carry action',()=>{
 const ui=monthReplay({observed:23});
 const before=read(ui,'JSON.stringify([state,draft,replayDialog.session])');
 ui.click('carry-replay');
 for(let i=0;i<5;i++)ui.runNextTimer();
 ui.click('back-replay-month');ui.drainTimers();
 assert.match(dialog(ui),/Replay result · Month 1/);
 assert.equal(read(ui,'JSON.stringify([state,draft,replayDialog.session])'),before);
 ui.click('carry-replay');ui.drainTimers();
 assert.match(dialog(ui),/Days 24–90 are projected in both copies/);
 assert.equal(read(ui,'saved.length'),0);
 const short=monthReplay({months:1,observed:30});
 assert.match(dialog(short),/last day of this run/);
 assert.doesNotMatch(dialog(short),/data-action="carry-replay"/);
});

test('funding that runs out after the replayed month stops the verdict at the funding decision',()=>{
 const ui=setup();
 read(ui,`state=QQ.fresh({...restaurantConfig(),inquiries:0,acquisition:'preset',overhead:100,startingCash:150});
  for(let i=0;i<15;i++)QQ.step(state);draft=QQ.clone(state.config);render();`);
 ui.click('open-replay');ui.elements['#replay-value']={value:'32'};
 ui.click('run-replay');ui.drainTimers();ui.click('carry-replay');ui.drainTimers();
 assert.match(dialog(ui),/Original paused before day 31 with a \$50 shortfall/);
 assert.match(dialog(ui),/Changed paused before day 31 with a \$50 shortfall/);
 assert.doesNotMatch(dialog(ui),/Save comparison|Operating profit difference|stayed ahead/);
 ui.click('back-replay-month');
 assert.match(dialog(ui),/Replay result · Month 1/);
 assert.equal(read(ui,'state.day'),15);
});

test('a later edit to the tested assumption explains why the experiment cannot continue',()=>{
 const ui=setup();
 read(ui,`state=QQ.fresh({...restaurantConfig(),designerHours:6});
  for(let i=0;i<40;i++)QQ.step(state);
  QQ.applyConfig(state,{...state.config,designerHours:8});
  while(state.day<60&&QQ.step(state)){}
  draft=QQ.clone(state.config);render();`);
 ui.click('open-replay',{id:'P003'});
 ui.handlers.change({target:{id:'replay-month',value:'1',dataset:{}}});
 ui.elements['#replay-value']={value:'12'};
 ui.click('run-replay');ui.drainTimers();ui.click('carry-replay');ui.drainTimers();
 assert.match(dialog(ui),/Carry-forward stopped/);
 assert.match(dialog(ui),/original run changed the selected capacity setting/);
 assert.doesNotMatch(dialog(ui),/Save comparison|Operating profit difference/);
 ui.click('back-replay-month');
 assert.match(dialog(ui),/Replay result · Month 1/);
});

test('a legacy pair explicitly projects from month close and keeps the projection label after saving and reopening',()=>{
 const ui=monthReplay();
 ui.click('save-replay');
 read(ui,'delete checkpointInfo[1].replays[0].source;save();render()');
 const legacy=setup(ui.storage);
 legacy.click('open-saved-replay',{index:'1',record:'0'});
 const summary=legacy.elements['#root'].innerHTML;
 assert.match(summary,/Project from saved month-end/);
 assert.match(summary,/Later settings, funding and project decisions/);
 assert.doesNotMatch(summary,/data-action="carry-saved-replay"[^>]*>Carry this change forward/);
 legacy.click('carry-saved-replay');
 assert.match(dialog(legacy),/Projecting from saved month-end through day 90/);
 legacy.drainTimers();
 assert.match(dialog(legacy),/Projection through day 90/);
 assert.match(dialog(legacy),/Days 31–90 are projected from the saved month-end settings/);
 assert.doesNotMatch(dialog(legacy),/matched the recorded run through day 90/);
 legacy.click('save-replay');
 assert.match(dialog(legacy),/Projection through day 90/);
 const reopened=setup(legacy.storage);
 reopened.click('open-saved-replay',{index:'1',record:'0'});reopened.drainTimers();
 assert.match(dialog(reopened),/Days 31–90 are projected from the saved month-end settings/);
});
