const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup,startBalancedRestaurant}=require('./ui-test-host.cjs');

const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const visibleOverview=ui=>ui.elements['#root'].innerHTML.split('<details class="result-details"')[0];
const chooseMonth=(ui,month)=>ui.handlers.change({target:{id:'result-month',value:String(month),dataset:{}}});

test('contract receipts and the monthly table retain the same cents as the cash ledger',()=>{
 const ui=setup();
 read(ui,`const service={...QQ.clone(QQ.DEFAULT.services[0]),price:.49,weight:100,hours:0,review:0,print:0,recurring:false};
  state=QQ.fresh({...QQ.clone(QQ.DEFAULT),months:1,inquiries:30,conversion:1,quoteHours:0,deliveryHours:0,
   approvalDays:0,overhead:0,profileStrength:0,services:[service]});
  while(QQ.step(state)){};draft=QQ.clone(state.config);view='finances';render()`);
 ui.click('analytics-tab',{tab:'contracts'});
 const contracts=ui.elements['#root'].innerHTML;
 assert.match(contracts,/Booked value<\/span><b>\$0\.49</);
 assert.match(contracts,/Collected, including deposits<\/span><b>\$0\.49</);
 ui.click('analytics-tab',{tab:'performance'});
 const revenue=read(ui,'offerAmount(QQ.monthResult(state,1).revenue)');
 assert.match(revenue,/\.\d\d$/);
 assert.ok(ui.elements['#root'].innerHTML.includes('<td>'+revenue+'</td>'));
});

test('the restaurant month explains profit, ranked spending, owner time and cash without expanding a control',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('view',{view:'map'});ui.click('finish');ui.drainTimers();ui.click('view',{view:'finances'});
 const html=visibleOverview(ui);
 assert.match(html,/Month 1 made \$380\.52/);
 assert.match(html,/2 deliveries earned <b>\$1,250<\/b>/);
 assert.match(html,/Design labor accounted for <b>\$539\.48<\/b> of the <b>\$869\.48<\/b>/);
 assert.match(html,/\$1,049\.56 .*\-\$669\.04/);
 assert.match(html,/Monthly physical offer kit earned \$1,250 from 2 deliveries/);
 assert.match(html,/\$5,755\.52.*Down \$244\.48 from \$6,000/);
 assert.match(html,/\$625 remained due/);
 assert.match(html,/data-action="month-cash" data-month="1"/);
 assert.match(ui.elements['#root'].innerHTML,/<details class="result-details"[^>]*><summary>Run-to-date financial details/);
});

test('month zero and a partially elapsed month tell distinct stories and changing the period changes the evidence',()=>{
 const ui=setup();
 read(ui,"state=QQ.fresh({...QQ.clone(QQ.DEFAULT),months:3,inquiries:0,startingCash:100000,overhead:2000});draft=QQ.clone(state.config);view='finances';render()");
 assert.match(visibleOverview(ui),/Month 1 has not started/);
 assert.doesNotMatch(visibleOverview(ui),/broke even/);
 read(ui,'for(let day=1;day<=30;day++)QQ.step(state);QQ.applyConfig(state,{...state.config,overhead:350});for(let day=31;day<=35;day++)QQ.step(state);render()');
 let html=visibleOverview(ui);
 assert.match(html,/Days 31–35 · 5 of 30 days/);
 assert.match(html,/Month 2 lost \$350 so far/);
 assert.match(html,/No jobs were delivered in this period\. Shared overhead accounted for all <b>\$350/);
 assert.match(html,/data-action="month-cash" data-month="2"/);
 chooseMonth(ui,1);html=visibleOverview(ui);
 assert.match(html,/Month 1 lost \$2,000/);
 assert.match(html,/\$98,000/);
 assert.match(html,/data-action="month-cash" data-month="1"/);
 assert.doesNotMatch(html,/so far|Days 31–35/);
 read(ui,'state=QQ.restore(state);render()');
 assert.match(visibleOverview(ui),/Month 2 lost \$350 so far/);
});

test('the first month opens its verified P002/P003 waits, launches that month’s replay and returns focus',()=>{
 const ui=setup(),modal=()=>ui.elements['#modal'].innerHTML;
 startBalancedRestaurant(ui,{designerHours:6});
 read(ui,"while(QQ.step(state)){}draft=QQ.clone(state.config);view='finances';render()");
 chooseMonth(ui,1);
 const before=read(ui,'JSON.stringify(currentWorkspace())');
 const trigger={dataset:{action:'month-jobs',month:'1'},focus(){this.focused=true;}};
 ui.ctx.document.querySelectorAll=s=>s.startsWith('#root [id]')?[trigger]:[];
 assert.match(visibleOverview(ui),/See 2 unfinished jobs at day 30/);
 ui.click('month-jobs',{month:'1'});ui.drainTimers();
 assert.match(modal(),/P002 .*Supplier .*1 calendar day remaining[\s\S]*?\$292\.74/);
 assert.match(modal(),/P003 .*Design team .*7\.23 hours of design remaining[\s\S]*?\$127\.86/);
 assert.match(modal(),/\$420\.60 in costs on these jobs/);
 assert.match(modal(),/data-demand-id="lead:10:0" data-key="designerHours">Replay month 1 for P003/);
 assert.doesNotMatch(modal(),/Replay month 1 for P002/);
 ui.click('open-replay',{month:'1',demandId:'lead:10:0',key:'designerHours'});
 assert.deepEqual(Array.from(read(ui,'[replayDialog.month,replayDialog.project.id,replayDialog.key]')),[1,'P003','designerHours']);
 ui.elements['#replay-value']={value:'12'};ui.click('run-replay');ui.drainTimers();ui.click('carry-replay');ui.drainTimers();
 assert.match(modal(),/P003 delivered 14 days earlier with the change \(day 33 versus day 47\)/);
 ui.click('close');ui.drainTimers();assert.equal(trigger.focused,true);
 assert.match(visibleOverview(ui),/Days 1–30/);
 trigger.focused=false;
 ui.click('month-jobs',{month:'1'});ui.drainTimers();ui.click('month-job-current',{id:'P002'});
 assert.equal(read(ui,'selection.id'),'P002');assert.equal(read(ui,'view'),'map');
 ui.click('unselect');ui.drainTimers();assert.equal(trigger.focused,true);
 assert.match(visibleOverview(ui),/Days 1–30/);
 assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),before);
});

test('a historical view without usable setup history shows dated facts and current records only',()=>{
 const ui=setup();
 startBalancedRestaurant(ui,{designerHours:6});
 read(ui,"while(state.day<30)QQ.step(state);QQ.applyConfig(state,{...state.config,ownerTarget:100});while(QQ.step(state)){};delete state.replayJournal;draft=QQ.clone(state.config);view='finances';render()");
 chooseMonth(ui,1);
 assert.match(visibleOverview(ui),/rate history unavailable, current target \$100/);
 ui.click('month-jobs',{month:'1'});ui.drainTimers();
 const html=ui.elements['#modal'].innerHTML;
 assert.match(html,/Stage and remaining work unavailable/);
 assert.match(html,/P002[\s\S]*?\$292\.74/);assert.match(html,/View P003 at current day 90/);
 assert.doesNotMatch(html,/Replay month 1 for|7\.23 hours|calendar day remaining/);
});

test('a genuine break-even period and owner funding remain distinct from operating earnings',()=>{
 const ui=setup();
 read(ui,"state=QQ.fresh({...QQ.clone(QQ.DEFAULT),inquiries:0,overhead:0});QQ.step(state);QQ.fund(state,1000);draft=QQ.clone(state.config);view='finances';render()");
 const html=visibleOverview(ui);
 assert.match(html,/Month 1 broke even so far/);
 assert.match(html,/No costs were incurred/);
 assert.match(html,/Owner funding added <b>\$1,000<\/b>/);
 assert.doesNotMatch(html,/earned <b>\$1,000/);
});

test('a zero-capacity loss links to accepted work even when its direct cost is zero',()=>{
 const ui=setup();
 read(ui,"state=QQ.fresh({...QQ.clone(QQ.DEFAULT),inquiries:30,conversion:1,designers:0});for(let i=0;i<30;i++)QQ.step(state);draft=QQ.clone(state.config);view='finances';render()");
 const r=read(ui,'QQ.monthResult(state)');
 assert.equal(r.delivered,0);assert.equal(r.unfinishedCost,0);assert.ok(r.awaitingDelivery>0);
 assert.match(visibleOverview(ui),/still awaiting delivery at day 30/);
 ui.click('month-jobs',{month:'1'});ui.drainTimers();
 assert.match(ui.elements['#modal'].innerHTML,/\$0 in costs during this period/);
 ui.click('month-job-current',{id:r.openProjectId});
 assert.match(ui.elements['#root'].innerHTML,/Available design time is zero|No design capacity/);
});

test('the carried historical owner valuation reconciles on screen, on reopening and in an offline report',async()=>{
 const ui=setup();
 startBalancedRestaurant(ui,{designerHours:6});
 read(ui,"while(state.day<30)QQ.step(state);QQ.applyConfig(state,{...state.config,ownerTarget:100});while(QQ.step(state)){};draft=QQ.clone(state.config);view='finances';render()");
 ui.click('open-replay',{id:'P003',month:'1'});
 ui.elements['#replay-value']={value:'12'};ui.click('run-replay');ui.drainTimers();ui.click('carry-replay');ui.drainTimers();
 const expected=/after owner time at each period’s closing target[\s\S]*?days 1–90[\s\S]*?-\$538\.71/i;
 assert.match(ui.elements['#modal'].innerHTML,expected);
 ui.click('save-replay');
 const reopened=setup(ui.storage);
 reopened.click('open-saved-replay',{index:'1',record:'0'});reopened.drainTimers();
 assert.match(reopened.elements['#modal'].innerHTML,expected);
 reopened.click('close');reopened.click('comparison-report');
 reopened.elements['#report-baseline']={value:'0'};reopened.elements['#report-current']={value:'1'};
 reopened.click('download-comparison');
 for(let n=0;n<200&&!reopened.downloads.length;n++)reopened.runNextTimer();
 assert.equal(reopened.downloads.length,1);
 const html=await (await fetch(reopened.downloads[0].href)).text();
 assert.match(html,/original earned -\$5,689\.28 and the changed schedule earned -\$6,227\.99 over days 1–90\. The difference was −\$538\.71/);
 assert.match(html,/All hours at today[^<]*target<\/th><td>-\$7,162\.71 at \$100\.00\/h<\/td><td>-\$7,850\.22 at \$100\.00\/h/);
 const month2=read(ui,`(()=>{
  const pair=QQ.startCapacityReplay(state,{month:2,key:'designerHours',value:12});
  while(pair.phase!=='done')QQ.stepCapacityReplay(pair);
  const carry=QQ.startCapacityCarry(state,pair.baseline,pair.alternative,pair);
  while(carry.phase!=='done')QQ.stepCapacityCarry(carry);
  const record={month:2,firstDay:31,endDay:60,key:'designerHours',before:6,after:12,sourceDay:90,carriedThrough:90};
  const result=QQ.capacityCarryResult(carry);
  return {html:QQComparisonReport.create(pair.alternative,pair.baseline,{replay:record,carry}).html,
   interval:result.baseline.afterOwner,whole:QQ.analytics(carry.baseline).periodAfterOwner};
 })()`);
 assert.match(month2.html,/over days 31–90/);
 assert.notEqual(month2.interval,month2.whole);
});
