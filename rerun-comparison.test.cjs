const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const QQ=require('./engine.js');
const {setup}=require('./ui-test-host.cjs');

function fresh(overrides={}){
 return QQ.fresh({...QQ.clone(QQ.DEFAULT),months:2,startingCash:50000,acquisition:'preset',
  inquiries:24,conversion:1,ownerHours:35,designerHours:40,realism:false,...overrides});
}
function advance(s,day){while(s.day<day)assert.ok(QQ.step(s));return s;}
function overview(original,revised){
 const ui=setup();Object.assign(ui.ctx,{original,revised});
 return vm.runInContext('state=revised; variantResultsOverview({original,revised},{comparison:QQ.runEstimateComparison(revised)})',ui.ctx);
}

test('a revised overhead result shows the exact edited input, matching actuals and the related expense',()=>{
 const original=advance(fresh({inquiries:0,overhead:19.99}),60);
 const revised=advance(fresh({inquiries:0,overhead:24.99}),60);
 const report=overview(original,revised);
 assert.match(report,/Operating result fell by \$10<\/h2>/);
 assert.match(report,/data-variant-input data-path="overhead"[^>]*>Test monthly overhead .*?<\/button><b>\$19\.99 .*?\$24\.99<\/b>/);
 assert.match(report,/<th scope="col">Original run<\/th><th scope="col">Revised run<\/th>/);
 assert.match(report,/<th scope="row">Operating result<\/th><td>-\$39\.98<\/td><td>-\$49\.98<\/td>/);
 assert.match(report.split('<details class="variant-breakdown"')[0],/<th scope="row">Shared overhead<\/th>/);
 assert.match(report,/Total cost rose by \$10\./);
 assert.match(report,/Both runs used the same seed and received the same new inquiries\./);
 assert.doesNotMatch(report,/Settings also changed during the comparison period/);
});

test('different durations compare matched closes, report common-period arrivals, and retain historical owner rates',()=>{
 const short=advance(fresh({months:1}),30),long=advance(fresh({months:3}),30);
 const firstClose=QQ.runActualsThrough(long,30);
 QQ.applyConfig(long,{...long.config,ownerTarget:110,inquiries:1});
 QQ.fund(long,321.99); // Funding on the close belongs to that closing balance.
 advance(long,60);
 QQ.applyConfig(long,{...long.config,ownerTarget:220});
 QQ.fund(long,4321);
 advance(long,90);
 const through30=QQ.runActualsThrough(long,30),through60=QQ.runActualsThrough(long,60);
 assert.equal(through30.afterOwner,firstClose.afterOwner);
 assert.equal(through30.designHours,firstClose.designHours);
 assert.equal(through30.funding,321.99);
 assert.equal(through30.closingCash,QQ.round(firstClose.closingCash+321.99));
 assert.equal(through60.afterOwner,QQ.round(QQ.monthResult(long,1).afterOwner+QQ.monthResult(long,2).afterOwner));
 assert.notEqual(through60.afterOwner,QQ.round(through60.profit-through60.ownerHours*220));
 for(const [a,b] of [[short,long],[long,short]]){
  const result=overview(a,b);
  assert.match(result,/Operating result was unchanged/);
  assert.match(result,new RegExp('The original ran for '+a.day+' days and the revised run for '+b.day+'\\. Both columns stop at day 30\\.'));
  assert.match(result,/same new inquiries through day 30/);
  assert.doesNotMatch(result,/Settings also changed during the comparison period/);
 }
 assert.throws(()=>QQ.runActualsThrough(short,60),/completed reporting month/);
});

test('different demand, changed seeds, mid-period edits and missing inquiry evidence are identified independently',()=>{
 const original=advance(fresh({inquiries:0}),60),changed=advance(fresh({inquiries:35}),20);
 QQ.applyConfig(changed,{...changed.config,designerRate:39});advance(changed,60);
 const report=overview(original,changed);
 assert.match(report,/same workload seed/);assert.match(report,/recorded new inquiries differed/);
 assert.match(report,/Settings also changed during the comparison period/);
 const legacy=QQ.clone(changed);delete legacy.replayJournal;delete legacy.demandHistory;
 for(const h of legacy.history)delete h.externalArrivals;
 const alternate=advance(fresh({seed:2}),60);
 const older=overview(legacy,alternate);
 assert.match(older,/different workload seeds/);assert.match(older,/could not verify the incoming inquiries/);
 assert.match(older,/original input values come from its saved settings/);
 assert.match(older,/New inquiries<\/th><td>—<\/td>/);
});

test('the experiment appears ahead of the ordinary estimate only for the currently linked result',()=>{
 const original=advance(fresh({months:1}),30),revised=advance(fresh({months:1,ownerTarget:88}),30);
 const ui=setup();Object.assign(ui.ctx,{original,revised});
 const evaluate=source=>vm.runInContext(source,ui.ctx);
 const page=()=>evaluate('marginAnalyticsView(QQ.analytics(state),QQ.metrics(state))');
 evaluate("state=revised; rerunLink={original,run:state,path:'ownerTarget'}");
 let html=page();
 assert.ok(html.includes('id="variant-result-title"')&&html.indexOf('id="variant-result-title"')<html.indexOf('id="run-comparison-title"'));
 assert.match(html,/Result after owner time fell by/);
 evaluate('state=original; saved=[revised]');
 html=page();
 assert.doesNotMatch(html,/id="variant-result-title"/);assert.match(html,/id="run-comparison-title"/);
});

test('the live revision shows the original at the same day and Compare runs reopens the finished pair',()=>{
 const ui=setup(),run=code=>vm.runInContext(code,ui.ctx);
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('simulate');ui.drainTimers();
 ui.click('test-assumption',{path:'designerRate'});
 run('draft.designerRate=24');ui.click('simulate-again');
 assert.match(ui.elements['#root'].innerHTML,/Revised 90-day run/);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/Original on day 0/);
 run('QQ.step(state);render()');
 assert.ok(ui.elements['#root'].innerHTML.includes('Original on day 1</dt><dd>'+run('setupResultAmount(rerunLink.original.history[0].profit)')));
 ui.drainTimers();ui.click('analytics-tab',{tab:'compare'});
 assert.match(ui.elements['#root'].innerHTML,/id="variant-result-title"/);
 run('checkpointInfo[0].baseline=true;render()');
 assert.match(ui.elements['#root'].innerHTML,/View original and revised runs/);
 assert.match(ui.elements['#root'].innerHTML,/Compared with pinned baseline/);
 ui.click('review-latest-results');
 assert.match(ui.elements['#root'].innerHTML,/id="variant-result-title"/);
});

test('the active comparison ends with exactly two setup choices and each shows the corresponding input',()=>{
 const original=advance(fresh({months:1,designerRate:8.33}),30);
 const revised=advance(fresh({months:1,designerRate:17.75}),30);
 const html=overview(original,revised);
 const choice=html.slice(html.indexOf('<section class="variant-decision"'));
 assert.match(choice,/Which setup do you want to keep/);
 assert.equal((choice.match(/<button /g)||[]).length,2);
 const actions=[...choice.matchAll(/data-action="keep-run-setup" data-version="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
 assert.deepEqual(actions.map(action=>action[1]),['original','revised']);
 assert.match(actions[0][2],/Keep original setup.*Designer labor cost.*\$8\.33/);
 assert.match(actions[1][2],/Keep revised setup.*Designer labor cost.*\$17\.75/);
 const broader=advance(fresh({months:1,designerRate:17.75,inquiries:22}),30);
 const multiple=overview(original,broader).split('id="variant-decision-title"')[1];
 assert.match(multiple,/Keep original setup.*Operating result/);
 assert.match(multiple,/Keep revised setup.*Operating result/);
});

test('an archived decision renders only its own assumptions, actual results and kept version',()=>{
 const original=advance(fresh({months:1,inquiries:0,overhead:25}),30);
 const revised=advance(fresh({months:1,inquiries:0,overhead:45}),30);
 const ui=setup();Object.assign(ui.ctx,{pair:{original,revised,keptVersion:'revised',comparisonId:'decision-one'}});
 const render=kept=>{
  ui.ctx.version=kept;
  return vm.runInContext(`state=null; draft=null;
   variantResultsOverview(pair,{readOnly:true,kept:version,comparison:{days:30,actual:null},targets:{get(){throw Error('historical data read an active edit target')}}})`,ui.ctx);
 };
 const html=render();
 assert.match(html,/id="saved-variant-result-title" tabindex="-1" aria-describedby="saved-variant-period">Operating result fell by \$20/);
 assert.match(html,/Revised setup kept/);assert.doesNotMatch(html,/Original setup kept/);
 assert.match(html,/Monthly overhead<\/span><b>\$25.*?> \$45<\/b>/);
 assert.match(html,/scope="row">Operating result<\/th><td>-\$25<\/td><td>-\$45<\/td>/);
 assert.match(html,/data-disclosure="saved-variant-decision-one-outcome-detail"/);
 assert.doesNotMatch(html,/<button|data-action|id="variant-(?:period|result-title|decision-title)"/);
 const originalKept=render('original');assert.match(originalKept,/Original setup kept/);assert.doesNotMatch(originalKept,/Revised setup kept/);
});
