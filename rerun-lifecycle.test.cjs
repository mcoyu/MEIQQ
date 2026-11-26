const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const workspace=require('./workspace.js');
const read=(ui,script)=>vm.runInContext(script,ui.ctx);
const html=ui=>ui.elements['#root'].innerHTML;
const edit=(ui,path,value)=>ui.handlers.input({target:{id:'input-'+path.replaceAll('.','-'),dataset:{input:path},value:String(value),type:'number',tagName:'INPUT'}});
function original(){
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 ui.click('simulate');ui.drainTimers();assert.equal(read(ui,'state.day'),90);return ui;
}

test('changing overhead on an older restaurant run preserves its recorded deposit and campaign rules',()=>{
 const ui=setup();
 read(ui,`const config={...QQ.clone(QQ.DEFAULT),months:1,conversion:1,deposit:.5,startingCash:10000,
  services:[{...QQServiceCatalog.createService('menu-refresh'),audience:'all',weight:100,price:2.55}]};
  state=QQ.fresh(config);state.campaignCalendarFromDay=31;state.depositRoundingFromDay=31;
  QQ.captureRunLaunch(state);while(QQ.step(state)){};draft=QQ.clone(config);view='finances';render()`);
 const receipts=read(ui,"JSON.stringify(state.ledger.filter(e=>e.type==='receipt'))");
 assert.ok(receipts.includes('"amount":1.27'));
 ui.click('test-assumption',{path:'overhead'});
 assert.match(read(ui,'cashInputs()'),/<dt>At acceptance<\/dt><dd>\$1\.27</);
 edit(ui,'overhead',20);
 ui.click('simulate-again');ui.drainTimers();
 assert.equal(read(ui,'state.campaignCalendarFromDay'),31);
 assert.equal(read(ui,'state.depositRoundingFromDay'),31);
 assert.equal(read(ui,"JSON.stringify(state.ledger.filter(e=>e.type==='receipt'))"),receipts);
});
test('opening an assumption parks an unrelated unfinished draft and restores both independently across a reload',()=>{
 const ui=original();
 read(ui,"draft.name='Unfinished source draft';draft.services[0].hours=null;");
 const originalRun=read(ui,'JSON.stringify(state)');
 ui.click('test-assumption',{path:'designerRate'});
 assert.equal(read(ui,'workspaceRoute()'),'setup/rerun/people');assert.equal(read(ui,'canSimulateRerun()'),false);
 const rate=read(ui,'draft.designerRate');edit(ui,'designerRate',rate+7);
 assert.equal(read(ui,'canSimulateRerun()'),true);assert.equal(read(ui,'JSON.stringify(state)'),originalRun);
 ui.click('return-rerun-results');assert.equal(read(ui,'view'),'finances');assert.equal(read(ui,'draft.services[0].hours'),null);
 assert.equal(read(ui,'draft.name'),'Unfinished source draft');
 const re=setup([...ui.storage]);re.click('view',{view:'finances'});
 re.click('test-assumption',{path:'overhead'});
 assert.equal(read(re,'draft.designerRate'),rate+7);assert.equal(read(re,'workspaceRoute()'),'setup/rerun/cash');
 edit(re,'overhead','');assert.equal(read(re,'canSimulateRerun()'),false);re.click('simulate-again');
 assert.equal(read(re,'state.day'),90);assert.equal(read(re,'editingRerun'),true);
 re.click('view',{view:'finances'});assert.equal(read(re,'draft.name'),'Unfinished source draft');
 assert.equal(read(re,'currentWorkspace().rerunDraft.draft.overhead'),null);
});
test('simulating again starts from day zero, keeps the completed original and draft, and reopens the pair from a backup',()=>{
 const ui=original();read(ui,"old=JSON.stringify(state);draft.name='Keep this draft';checkpoint('manual');checkpointInfo[0].baseline=true;");
 const rate=read(ui,'state.config.designerRate');
 ui.click('test-assumption',{path:'designerRate'});edit(ui,'designerRate',rate+5);
 ui.click('simulate-again');assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'view'),'map');
 assert.equal(read(ui,'state.config.designerRate'),rate+5);assert.equal(read(ui,'completedVariantPair()'),null);
 assert.equal(read(ui,'JSON.stringify(rerunLink.original)===old'),true);
 ui.click('simulate-again');ui.drainTimers();assert.equal(read(ui,'view'),'finances');assert.equal(read(ui,'state.day'),90);
 assert.equal(read(ui,'completedVariantPair().original.config.designerRate'),rate);
 assert.equal(read(ui,'JSON.stringify(completedVariantPair().original)===old'),true);
 assert.equal(read(ui,'archives[0].workspace.draft.name'),'Keep this draft');
 assert.equal(read(ui,'checkpointInfo.filter(c=>c.baseline).length'),1);
 let parsed=workspace.parseText(read(ui,'MEIQQWorkspace.serialize(currentWorkspace(),archives)'));
 assert.equal(parsed.rerunLink.original.config.designerRate,rate);
 assert.equal(parsed.rerunLink.original.day,90);assert.equal(parsed.state.config.designerRate,rate+5);
 assert.equal(parsed.rerunLink.original===parsed.state,false);
 const re=setup([...ui.storage]);assert.equal(read(re,'completedVariantPair().original.day'),90);
 re.click('view',{view:'finances'});re.click('test-assumption',{path:'overhead'});edit(re,'overhead',read(re,'draft.overhead')+35);
 re.click('simulate-again');re.drainTimers();
 assert.equal(read(re,'completedVariantPair().original.config.designerRate'),rate+5);
 parsed=workspace.parseText(read(re,'MEIQQWorkspace.serialize(currentWorkspace(),archives)'));
 assert.ok(parsed.archives.some(a=>a.workspace.rerunLink?.original.config.designerRate===rate));
 re.click('load',{index:0});assert.equal(read(re,'completedVariantPair()'),null);
 const archive=read(re,'archives.findIndex(a=>a.workspace.rerunLink?.path==="overhead")');
 assert.ok(archive>=0);re.click('open-archive',{index:archive});
 assert.equal(read(re,'completedVariantPair().path'),'overhead');
});
test('a result revises recorded opening settings and targets the intended service when a parked menu has a different order',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'analyst'});
 read(ui,"initial=QQ.clone(state.config);QQ.captureRunLaunch(state);for(let i=0;i<4;i++)QQ.step(state);QQ.applyConfig(state,{...state.config,designerRate:initial.designerRate+1});while(state.day<90){if(state.blocked)QQ.fund(state,state.blocked.gap);QQ.step(state)}draft=QQ.clone(state.config);view='finances';render()");
 assert.equal(read(ui,'state.day'),90);
 const id=read(ui,'initial.services[0].id');
 ui.click('test-assumption',{path:'services.0.price',serviceId:id});
 assert.equal(read(ui,'draft.designerRate'),read(ui,'initial.designerRate'));
 read(ui,'draft.services.reverse()');ui.click('return-rerun-results');
 const index=read(ui,'rerunDraft.draft.services.length-1');
 ui.click('test-assumption',{path:'services.0.price',serviceId:id});
 assert.equal(read(ui,'rerunDraft.path'),'services.'+index+'.price');
 assert.equal(read(ui,'expandedService'),index);
 assert.ok(html(ui).includes('data-input="services.'+index+'.price"'));
});
test('discard and new-scenario navigation isolate the ordinary draft from a revision',()=>{
 const ui=original();read(ui,"draft.name='Reserved ordinary draft'");
 ui.click('test-assumption',{path:'designerRate'});
 const rate=read(ui,'draft.designerRate');
 read(ui,"draft.name='Cosmetic rename';draft.services[0].deliverable='New label';");
 assert.equal(read(ui,'canSimulateRerun()'),false);
 edit(ui,'designerRate',rate+3);ui.click('discard');
 assert.equal(read(ui,'draft.designerRate'),rate);assert.equal(read(ui,'canSimulateRerun()'),false);
 edit(ui,'designerRate',rate+4);ui.click('new-scenario');
 assert.equal(read(ui,'draft.name'),'Reserved ordinary draft');assert.equal(read(ui,'editingRerun'),false);
 ui.click('cancel-new-setup');
 assert.equal(read(ui,'workspaceRoute()'),'setup/rerun/people');assert.equal(read(ui,'draft.designerRate'),rate+4);
 ui.click('new-scenario');ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'editingRerun'),false);
 assert.equal(read(ui,'archives[0].workspace.draft.name'),'Reserved ordinary draft');
 assert.equal(read(ui,'archives[0].workspace.rerunDraft.draft.designerRate'),rate+4);
});
test('a revision address reopens its saved draft and an expired address resolves to the run it launched',()=>{
 const source=original();source.click('test-assumption',{path:'overhead'});
 const overhead=read(source,'draft.overhead')+10;edit(source,'overhead',overhead);source.drainTimers();
 const ui=setup([...source.storage]);
 const route=hash=>{
  ui.ctx.window.location={hash};
  ui.ctx.window.history={
   pushState(_state,_title,value){ui.ctx.window.location.hash=value;},
   replaceState(_state,_title,value){if(value)ui.ctx.window.location.hash=value;}
  };
  read(ui,'routeReady=true;readWorkspaceRoute()');
 };
 route('#setup/rerun/cash');assert.equal(read(ui,'editingRerun'),true);assert.equal(read(ui,'draft.overhead'),overhead);
 route('#finances');assert.equal(read(ui,'draft.overhead'),overhead-10);
 route('#setup/rerun/cash');ui.click('simulate-again');assert.equal(read(ui,'state.day'),0);
 route('#setup/rerun/cash');assert.equal(read(ui,'view'),'map');assert.equal(read(ui,'editingRerun'),false);
 ui.click('finish-run');ui.drainTimers();
 route('#setup/rerun/cash');assert.equal(read(ui,'view'),'finances');
 assert.equal(read(ui,'completedVariantPair().revised.config.overhead'),overhead);
});
