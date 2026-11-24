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
