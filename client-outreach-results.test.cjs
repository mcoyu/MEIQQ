const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,source)=>vm.runInContext(source,ui.ctx);
const html=ui=>ui.elements['#root'].innerHTML;
function setShare(ui,share){
 ui.handlers.input({target:{id:'client-demand-share',value:String(share),dataset:{input:'clientDemand.share'}}});
}
test('a removed menu role keeps the other outreach links and the chosen client after reload',()=>{
 const ui=setup();ui.click('start-business');ui.click('enter-setup',{mode:'guided'});
 ui.click('build-client-menu');ui.click('choose-menu-client',{profile:'restaurant'});ui.click('apply-client-menu');
 read(ui,"draft.services=draft.services.filter(s=>s.id!==draft.clientMenu.serviceIds[0]);save()");
 ui.drainTimers();
 const restored=setup([...ui.storage]);
 restored.click('continue-setup');restored.click('setup-step',{step:'1'});
 assert.equal(read(restored,'demandAudience().menu.profile.id'),'restaurant');
 assert.equal(read(restored,'demandAudience().menu.serviceIds[0]'),null);
 assert.equal((html(restored).match(/class="reach-offer"/g)||[]).length,2);
 restored.click('build-client-menu');assert.match(restored.elements['#modal'].innerHTML,/Independent restaurant/);
});
function restaurantRun(){
 const ui=setup();
 ui.click('start-business');ui.click('enter-setup',{mode:'guided'});
 ui.click('build-client-menu');ui.click('choose-menu-client',{profile:'restaurant'});ui.click('apply-client-menu');
 assert.match(html(ui),/id="plan-client-outreach"/);
 read(ui,"draft.acquisition='preset';draft.inquiries=20;draft.startingCash=50000;draft.services[0].name='Spring menu audit'");
 ui.click('setup-step',{step:'1'});setShare(ui,30);
 ui.click('simulate');ui.drainTimers();
 assert.equal(read(ui,'state.day'),90);
 return ui;
}
test('the actual client funnel uses the launch window and keeps the original on a share retest',()=>{
 const ui=restaurantRun();
 const recorded=read(ui,"QQ.clientDemandActuals(state,'restaurant',90)");
 assert.ok(html(ui).includes('<tr data-client-outcome="targeted"><th scope="row">New inquiries</th><td>18</td><td>'+recorded.targeted+'</td>'));
 assert.match(html(ui),/Recorded share/);
 assert.ok(recorded.targeted>0&&recorded.orders<=recorded.matched);
 const old=read(ui,'JSON.stringify(state)');
 ui.click('test-assumption',{path:'clientDemand.share'});
 assert.equal(read(ui,'workspaceRoute()'),'setup/rerun/demand');
 assert.equal(read(ui,'canSimulateRerun()'),false);
 assert.match(html(ui),/Spring menu audit/);
 setShare(ui,100);
 assert.equal(read(ui,'canSimulateRerun()'),true);
 assert.equal(read(ui,'JSON.stringify(state)'),old);
 ui.click('simulate-again');ui.drainTimers();
 assert.equal(read(ui,'JSON.stringify(rerunLink.original)'),old);
 assert.deepEqual(Array.from(read(ui,'[state.launchEstimate.clientDemand.targeted,rerunLink.original.launchEstimate.clientDemand.targeted]')),[60,18]);
 const after=read(ui,"QQ.clientDemandActuals(state,'restaurant').targeted");
 assert.equal(after,read(ui,'QQ.runActualsThrough(state,90).leads'));
 assert.ok(html(ui).includes('<th scope="row">Independent restaurant · New inquiries</th><td>'+recorded.targeted+'</td><td>'+after+'</td>'));
 assert.match(html(ui),/data-variant-input data-path="clientDemand.share"/);
 ui.click('keep-run-setup',{version:'original'});
 assert.equal(read(ui,'draft.clientDemand.share'),30);
 assert.equal(read(ui,'currentClientMenu().profile.id'),'restaurant');
 const loaded=setup([...ui.storage]);
 assert.equal(read(loaded,'draft.clientDemand.share'),30);
 assert.equal(read(loaded,'currentClientMenu().profile.id'),'restaurant');
 assert.deepEqual(Array.from(read(loaded,"archives.filter(a=>a.workspace.rerunLink?.keptVersion==='original').map(a=>a.workspace.state.launchEstimate.clientDemand.share)")),[100]);
});

test('a zero allocation preserves the economic baseline and a retarget compares like clients across both columns',()=>{
 const ui=restaurantRun();
 const differences=(a,b)=>Array.from(read(ui,`configDiff({...state.config,clientDemand:${a}},{...state.config,clientDemand:${b}}).map(d=>d.path)`));
 const zero="{profileId:'restaurant',share:0}";
 assert.deepEqual(differences('undefined',zero),[]);
 assert.deepEqual(differences(zero,"{profileId:'maker',share:0}"),[]);
 assert.deepEqual(differences("{profileId:'restaurant',share:30}",'undefined'),['clientDemand.share']);
 ui.click('test-assumption',{path:'clientDemand.share'});
 read(ui,"draft.clientDemand={profileId:'maker',share:30};render()");
 assert.equal(read(ui,'canSimulateRerun()'),true);
 ui.click('simulate-again');ui.drainTimers();
 const markup=html(ui),count=read(ui,"QQ.clientDemandActuals(state,'maker',90).targeted");
 assert.ok(markup.includes('<th scope="row">Maker sourcing packaging · New inquiries</th><td>0</td><td>'+count+'</td>'));
 assert.ok(markup.includes('<th scope="row">Independent restaurant · New inquiries</th><td>'+read(ui,"QQ.clientDemandActuals(rerunLink.original,'restaurant',90).targeted")+'</td><td>0</td>'));
 assert.match(markup,/<span>Target client<\/span>/);
});
