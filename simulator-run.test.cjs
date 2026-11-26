const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);

test('Simulate commits a fresh draft, enters the live run and opens reconciled results once',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 read(ui,'draft.months=1;draft.services[0].price=365');
 ui.click('simulate');
 assert.equal(ui.elements['#modal'].innerHTML,'');
 assert.match(ui.elements['#root'].innerHTML,/class="run-passage"/);
 assert.match(ui.elements['#root'].innerHTML,/<progress value="0" max="30"/);
 assert.equal(read(ui,'view'),'map');assert.equal(read(ui,'state.day'),0);
 assert.equal(read(ui,'state.config.services[0].price'),365);
 const forecast=read(ui,'state.launchEstimate.profit');
 assert.equal(read(setup([...ui.storage]),'state.launchEstimate.profit'),forecast);
 const generation=read(ui,'runGeneration');
 ui.click('simulate');assert.equal(read(ui,'runGeneration'),generation);
 ui.drainTimers();
 assert.equal(read(ui,'view'),'finances');
 assert.equal(read(ui,'state.day'),30);
 const page=ui.elements['#root'].innerHTML;
 for(const amount of ['$6,131.85','$937.50','$444.35','-$568.92','$312.50'])assert.ok(page.includes(amount),amount);
 const rows=read(ui,'QQ.analytics(state).services');
 assert.deepEqual(Array.from(rows,r=>[r.id,r.inquiries]).sort(),[['menu-refresh',2],['monthly-promo-5',5],['table-tents-100',0]]);
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'state.day'),30);
});

test('setup review remains optional and Simulate pauses on the actual day of a cash shortfall',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});read(ui,'draft.startingCash=0');ui.click('review');ui.click('close');ui.drainTimers();
 assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'state.config.startingCash'),6000);
 ui.click('simulate');ui.drainTimers();
 assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'running'),false);
 assert.ok(read(ui,'state.blocked.gap')>0);assert.match(ui.elements['#modal'].innerHTML,/payment needs funding/i);
 assert.match(ui.elements['#modal'].innerHTML,/Add funding and continue/);
 const estimate=read(ui,'state.launchEstimate.profit');
 ui.click('close');assert.match(ui.elements['#root'].innerHTML,/Resolve shortfall/);
 ui.click('toggle-passage');ui.elements['#funding']={value:'10000',dataset:{},checkValidity:()=>true};
 ui.click('confirm-fund',{resume:'finish-run'});ui.drainTimers();
 assert.equal(read(ui,'state.day'),90);assert.equal(read(ui,'view'),'finances');
 assert.equal(read(ui,'state.launchEstimate.profit'),estimate);
});

test('pausing a full run leaves the current day available to inspect, resume or leave',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('simulate');
 while(read(ui,'state.day')===0)assert.equal(ui.runNextTimer(),true);
 const day=read(ui,'state.day');
 assert.ok(day<90);assert.match(ui.elements['#root'].innerHTML,new RegExp('Day '+day+' of 90'));
 ui.click('toggle-passage');ui.drainTimers();assert.equal(read(ui,'state.day'),day);
 assert.match(ui.elements['#root'].innerHTML,/Continue simulation/);
 ui.click('toggle-passage');ui.click('view',{view:'setup'});ui.drainTimers();
 assert.equal(read(ui,'view'),'setup');assert.equal(read(ui,'state.day'),day);
 assert.equal(read(ui,'runPassage'),null);
 ui.click('finish-run');ui.click('inspect-run');ui.drainTimers();
 assert.equal(read(ui,'view'),'map');assert.equal(read(ui,'state.day'),day);
 assert.match(ui.elements['#root'].innerHTML,/Jobs to watch/);
 ui.click('finish-run');ui.drainTimers();assert.equal(read(ui,'view'),'finances');
 ui.click('view',{view:'setup'});assert.match(ui.elements['#root'].innerHTML,/View results/);
});

test('a day-zero run with recorded funding and pending changes keeps its explicit review',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 read(ui,'QQ.fund(state,250);draft.months=1');ui.click('simulate');
 assert.match(ui.elements['#modal'].innerHTML,/Apply and simulate 30 days/);
 assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'state.config.months'),3);
 ui.click('apply',{mode:'future',resume:'simulate'});ui.drainTimers();
 assert.equal(read(ui,'state.day'),30);assert.equal(read(ui,'state.funding'),250);
});

test('advance to next project event stops on the first active day and preserves quieter days',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('view',{view:'map'});ui.click('next-event');ui.drainTimers();
 assert.equal(read(ui,'state.day'),2);assert.equal(read(ui,'state.history.length'),2);
 assert.equal(read(ui,'running'),false);assert.match(ui.elements['#root'].innerHTML,/Client declined quote/i);
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'state.day'),2);
});

test('project details return to the invoking result section and ledger item key',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('simulate');ui.drainTimers();ui.click('analytics-tab',{tab:'cash'});
 const id=read(ui,'state.ledger.find(e=>e.project).project');
 ui.click('project',{id,ledgerIndex:'3'});assert.equal(read(ui,'view'),'map');
 assert.equal(read(ui,'inspectorTrail[0].key.ledgerIndex'),'3');
 ui.click('unselect');assert.equal(read(ui,'view'),'finances');assert.equal(read(ui,'analyticsTab'),'cash');
 assert.equal(read(ui,'selection'),null);assert.match(ui.elements['#root'].innerHTML,/Cash ledger/);
});

test('the live map entry reopens paused at committed days and the manual map keeps its own entry',()=>{
 const attach=(ui,hash,historyState=null)=>{
  ui.ctx.testHash=hash;ui.ctx.testHistoryState=historyState;
  read(ui,`window.location={hash:testHash};window.history={state:testHistoryState,
    pushState(value,title,hash){this.state=value;window.location.hash=hash;},
    replaceState(value,title,hash){this.state=value;if(hash)window.location.hash=hash;}
   };routeReady=true;`);
 };
 const reload=(ui,marker)=>{
  const fresh=setup([...ui.storage]);attach(fresh,'#map',marker);
  read(fresh,'readWorkspaceRoute()');return fresh;
 };
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 attach(ui,'#setup/edit/offers',{source:'editor'});read(ui,'lastRoute=workspaceRoute()');
 ui.click('simulate');
 const entry=read(ui,'window.history.state');
 assert.equal(entry.runPassage,true);
 function pausedAt(saved,day){
  assert.equal(read(saved,'state.day'),day);assert.equal(read(saved,'running'),false);
  assert.match(saved.elements['#root'].innerHTML,/Continue simulation/);
 }
 pausedAt(reload(ui,entry),0);
 while(!read(ui,'state.day'))assert.ok(ui.runNextTimer());
 const day=read(ui,'state.day'),resume=reload(ui,entry);
 pausedAt(resume,day);
 resume.click('inspect-run');assert.equal(read(resume,'window.history.state?.runPassage'),undefined);
 const manual=reload(resume,null);
 assert.match(manual.elements['#root'].innerHTML,/Jobs to watch/);
 assert.doesNotMatch(manual.elements['#root'].innerHTML,/class="run-passage"/);
 read(manual,'state.config.months=1;while(state.day<29)QQ.step(state);draft=QQ.clone(state.config)');
 manual.click('step');assert.equal(read(manual,'view'),'map');
 assert.match(read(manual,'clock()'),/data-action="review-latest-results"[^>]*>View results/);
 const complete=reload(manual,entry);assert.equal(read(complete,'runPassage'),null);
 complete.click('review-latest-results');assert.equal(read(complete,'view'),'finances');
});
