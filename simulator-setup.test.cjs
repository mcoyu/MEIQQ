const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {setup} = require('./ui-test-host.cjs');
const engine = require('./engine.js');
const presets = require('./presets.js');
const catalog = require('./service-catalog.js');

const read = (ui, expr) => vm.runInContext(expr, ui.ctx);
const edit = (ui, path, value, extra = {}) => {
  const target = {id:'input-'+path.replaceAll('.','-'),dataset:{input:path,...extra},value:String(value),type:'number',tagName:'INPUT'};
  if(path==='acquisition') {target.type='select-one';target.tagName='SELECT';ui.handlers.change({target});}
  else ui.handlers.input({target});
};

test('day-zero opening, autosave and reload keep the first choice until a path is selected', () => {
  const first=setup();
  read(first,'save()');
  const unopened=setup([...first.storage]);
  assert.match(unopened.elements['#root'].innerHTML,/Restaurant example/);
  unopened.click('start-restaurant');unopened.click('enter-setup',{mode:'guided'});
  assert.doesNotMatch(unopened.elements['#root'].innerHTML,/data-action="start-business"/);
  const reopened=setup([...unopened.storage]);
  assert.match(reopened.elements['#root'].innerHTML,/data-action="simulate"/);
  assert.doesNotMatch(reopened.elements['#root'].innerHTML,/id="preset-market"/);
});

test('each business path waits for an explicit detail level before creating the draft', () => {
  for(const path of ['business','restaurant'])for(const mode of ['guided','analyst']){
    const ui=setup([['qq-studio-setup-mode',mode==='guided'?'analyst':'guided']]);
    const initial=read(ui,'JSON.stringify(currentWorkspace())');
    ui.click('start-'+path);
    assert.match(ui.elements['#root'].innerHTML,/Choose your setup style/);
    assert.match(ui.elements['#root'].innerHTML,/>Guided</);
    assert.match(ui.elements['#root'].innerHTML,/>All assumptions</);
    assert.doesNotMatch(ui.elements['#root'].innerHTML,/id="setup-panel"/);
    assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),initial);
    ui.click(path==='business'?'start-restaurant':'start-business');
    assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),initial);
    ui.click('start-'+path);ui.click('enter-setup',{mode});
    assert.match(ui.elements['#root'].innerHTML,new RegExp('setup-mode-'+mode));
    const editor=ui.elements['#root'].innerHTML;
    assert.match(editor,/<header class="sky-header">/);
    assert.match(editor,/<main class="workspace setup-editing"[^>]*>[\s\S]*?id="setup-panel"[\s\S]*?What do you sell\?/);
    assert.doesNotMatch(editor,/<aside class="sidebar">/);
    assert.equal(read(ui,'draft.services.length'),path==='business'?1:3);
    assert.equal(read(ui,'draft.services[0].name')==='',path==='business');
    assert.equal(ui.storage.get('qq-studio-setup-mode'),mode);
  }
});

test('all four setup steps keep the sky header, step tabs and setup options in both directions',()=>{
 for(const mode of ['guided','analyst']){
  const ui=setup(),attributes=new Map(),stages=[];
  const host=ui.elements['aero-shards'];
  host.getAttribute=name=>attributes.get(name);
  host.setAttribute=(name,value)=>{attributes.set(name,value);if(name==='sky-stage')stages.push(value);};
  read(ui,'render()');ui.click('start-restaurant');ui.click('enter-setup',{mode});
  for(const step of [0,1,2,3,2,1,0]){
   ui.click('setup-step',{step:String(step)});
   const html=ui.elements['#root'].innerHTML;
   assert.match(html,/<header class="sky-header">/);
   assert.match(html,/data-disclosure="offer-setup-options"/);
   assert.match(html,new RegExp('aria-labelledby="setup-tab-'+step+'"'));
   assert.deepEqual([...html.matchAll(/data-setup-page="(\d+)"/g)].map(match=>Number(match[1])),[step]);
   read(ui,'render()');
  }
  assert.deepEqual(stages,['night','offers','demand','people','cash','people','demand','offers']);
 }
});

test('starting another scenario preserves and can reopen the previous run including its unfinished draft', () => {
  const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('simulate');ui.drainTimers();
  read(ui,"view='setup';draft.name='Unfinished November draft';draft.services[0].hours=null;render()");
  const previous=read(ui,'JSON.stringify(currentWorkspace())');
  ui.click('new-scenario');ui.click('cancel-new-setup');assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),previous);
  ui.click('new-scenario');ui.click('start-business');ui.click('enter-setup',{mode:'guided'});
  assert.equal(read(ui,'draft.name'),'My business');assert.equal(read(ui,'draft.services[0].price'),null);
  assert.equal(read(ui,'draft.services.length'),1);assert.match(read(ui,'draftError()'),/.+/);
  assert.equal(read(ui,'JSON.stringify(archives[0].workspace)'),previous);
  const reopened=setup([...ui.storage]);reopened.click('open-archive',{index:'0'});
  assert.equal(read(reopened,'state.day'),90);assert.equal(read(reopened,'draft.name'),'Unfinished November draft');
  assert.equal(read(reopened,'draft.services[0].hours'),null);
});

test('fixed-volume switch uses current outreach and retains an explicit fixed estimate through reload', () => {
  const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('setup-step',{step:'1'});
  edit(ui,'outreachHours',3);edit(ui,'acquisition','preset');assert.equal(read(ui,'draft.inquiries'),3.9);
  edit(ui,'inquiries',45);edit(ui,'acquisition','sales');ui.drainTimers();
  const re=setup([...ui.storage]);edit(re,'acquisition','preset');
  assert.equal(read(re,'draft.inquiries'),45);
  const old=setup();read(old,'draft.acquisition="sales";draft.inquiries=13;delete draft.fixedInquiriesEntered;delete draft.recipe');
  edit(old,'acquisition','preset');assert.equal(read(old,'draft.inquiries'),13);
});

test('draft preview exposes owner-time economics and explains an impossible delivery', () => {
  const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
  let html=read(ui,'draftSummary()');
  assert.match(html,/\+\$789/);assert.match(html,/-\$1,962/);assert.match(html,/Expected new inquiries/);
  edit(ui,'designers',0);html=read(ui,'draftSummary()');
  assert.ok(html.indexOf('No design capacity')<html.indexOf('Operating result'));
  edit(ui,'designers',1);edit(ui,'ownerHours',4);html=read(ui,'draftSummary()');
  assert.match(html,/No owner time remains/);
});

test('demand evidence is linked to the exact estimate, reported on review, and saved in the draft', () => {
  const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
  ui.click('input-evidence',{group:'demand'});ui.handlers.change({target:{id:'record-field',value:'conversion',dataset:{}}});
  for(const [id,value] of [['#record-source','Quote log <April>'],['#record-date','2026-04-30'],['#record-sample','6 wins / 20 decided quotes']])ui.elements[id]={value};
  ui.click('save-input-evidence');
  assert.match(read(ui,'inputBasis("conversion")'),/Your records · Quote log &lt;April&gt;/);
  ui.click('current-evidence');
  const modal=ui.elements['#modal'].innerHTML,recipe=modal.indexOf('Original recipe and published comparisons');
  assert.ok(recipe>0);
  assert.match(modal.slice(0,recipe),/Quote acceptance · 30%<\/b><small>Your records · Quote log &lt;April&gt; · 2026-04-30 · 6 wins \/ 20 decided quotes/);
  assert.match(modal.slice(recipe),/modeled-assumption · low confidence/);
  ui.click('close');
  assert.equal(read(ui,'state.config.assumptionRecords'),undefined);
  ui.click('review');assert.match(ui.elements['#modal'].innerHTML,/Source for Conversion/);
  const reopened=setup([...ui.storage]);
  assert.equal(read(reopened,'draft.assumptionRecords.conversion.value'),.3);
  reopened.click('current-evidence');
  assert.match(reopened.elements['#modal'].innerHTML,/Quote log &lt;April&gt;/);reopened.click('close');
  edit(reopened,'conversion',35,{percent:'true'});assert.equal(read(reopened,'draft.assumptionRecords'),undefined);
  assert.match(read(reopened,'inputBasis("conversion")'),/Your estimate/);
  reopened.click('current-evidence');
  assert.match(reopened.elements['#modal'].innerHTML,/Quote acceptance · 35%<\/b><small>Your estimate/);
  assert.doesNotMatch(reopened.elements['#modal'].innerHTML,/Quote log &lt;April&gt;/);
});

test('the first Run action identifies the restaurant example and a chosen workspace resumes directly',()=>{
  const ui=setup();ui.click('view',{view:'map'});
  assert.match(ui.elements['#root'].innerHTML,/data-action="play"[^>]*>[\s\S]*?Run restaurant example<\/button>/);
  ui.click('play');ui.click('play');
  assert.equal(read(ui,'state.day'),0);
  assert.doesNotMatch(ui.elements['#root'].innerHTML,/Run restaurant example/);
  const reopened=setup([...ui.storage]);reopened.click('view',{view:'map'});
  assert.doesNotMatch(reopened.elements['#root'].innerHTML,/Run restaurant example/);
  reopened.click('step');assert.equal(read(reopened,'state.day'),1);
});

test('fixing a setup error opens its step and enclosing disclosures and focuses its control',()=>{
  const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
  const focusIssue=(path,step,depth)=>{
    const selector='[data-input="'+path+'"]',details=[];
    for(let i=0;i<depth;i++){
      const parent=details.at(-1);
      details.push({open:false,parentElement:{closest:()=>parent}});
    }
    let focused=false;
    ui.elements[selector]={closest:()=>details.at(-1),focus(){focused=true;}};
    ui.click('setup-step',{step:'3'});ui.click('fix-setup-issue');
    assert.equal(read(ui,'stepIndex'),step);
    assert.ok(focused&&details.every(d=>d.open));
    assert.ok(ui.elements['#root'].innerHTML.includes('data-input="'+path+'"'));
  };
  ui.click('setup-step',{step:'1'});edit(ui,'leadsPerHour','');
  assert.match(ui.elements['#root'].innerHTML,/Fix inquiries per outreach hour/);
  focusIssue('leadsPerHour',1,0);edit(ui,'leadsPerHour',.3);
  edit(ui,'services.1.fulfillment.managedShare',140,{percent:'true'});
  focusIssue('services.1.fulfillment.managedShare',0,1);
  edit(ui,'services.1.fulfillment.managedShare',70,{percent:'true'});
  read(ui,"draft.services[1].filesOnlyScope='x'.repeat(501);render()");
  focusIssue('services.1.filesOnlyScope',0,2);
  read(ui,"draft.services[1].filesOnlyScope=state.config.services[1].filesOnlyScope;render()");
  edit(ui,'services.0.weight',5);
  assert.match(ui.elements['#root'].innerHTML,/Fix service mix/);
  focusIssue('services.0.weight',0,1);
  assert.equal(read(ui,'draft.services[0].weight'),5);
  assert.equal(read(ui,'state.config.services[0].weight'),40);
});

test('an invalid dormant input can be fixed without changing the selected demand mode or enabling a disruption',()=>{
  const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('setup-step',{step:'1'});
  edit(ui,'acquisition','preset');edit(ui,'inquiries','');edit(ui,'acquisition','sales');
  ui.click('setup-step',{step:'2'});ui.click('fix-setup-issue');
  assert.match(ui.elements['#root'].innerHTML,/id="input-inquiries"/);
  edit(ui,'inquiries',21);assert.equal(read(ui,'draft.acquisition'),'sales');
  ui.click('setup-step',{step:'3'});
  edit(ui,'disruptionRates.rushDeadlines',125,{percent:'true'});
  ui.handlers.change({target:{id:'',dataset:{input:'realism'},type:'checkbox',checked:false}});
  ui.click('fix-setup-issue');
  const field=ui.elements['#root'].innerHTML.match(/<input [^>]*id="input-disruptionRates-rushDeadlines"[^>]*>/)[0];
  assert.doesNotMatch(field,/disabled/);
  edit(ui,'disruptionRates.rushDeadlines',10,{percent:'true'});
  assert.equal(read(ui,'draft.realism'),false);assert.equal(read(ui,'draftError()'),'');
});

test('invalid source records are rejected and a recipe retains evidence only for matching values',()=>{
  const base=presets.newWorkspaceConfig({...engine.DEFAULT,services:catalog.starterServices()});
  const good={value:.3,date:'2026-11-01',source:'Quote log',sample:'6 / 20'};
  base.assumptionRecords={conversion:good};assert.doesNotThrow(()=>engine.validateConfig(base));
  for(const change of [{value:.4},{date:'2026-02-31'},{source:''},{sample:''}]){
    assert.throws(()=>engine.validateConfig({...base,assumptionRecords:{conversion:{...good,...change}}}),/assumption record/i);
  }
  const changed=presets.compose({condition:'stress'},base);assert.equal(changed.assumptionRecords,undefined);
  const same=presets.compose({market:'royaloak'},base);assert.deepEqual(same.assumptionRecords,base.assumptionRecords);
  const report=presets.audit(same);
  assert.ok(!report.edited.some(v=>v.startsWith('services.')));
  assert.equal(report.lineage.find(v=>v.path==='services.0.price').kind,'inherited-assumption');
  same.services[0].price++;assert.ok(presets.audit(same).edited.includes('services.0.price'));
});

test('the app home and setup chapters have restorable addresses, and browser Back edits the same draft',async()=>{
 const ui=setup(),url=new URL('file:///MEIQQ.html#'),entries=[url.href],session=new Map();
 ui.ctx.window.location=url;
 ui.ctx.window.history={
  pushState(_state,_title,hash){url.hash=hash;entries.push(url.href);},
  replaceState(_state,_title,hash){url.hash=hash;entries[entries.length-1]=url.href;}
 };
 ui.ctx.window.sessionStorage={setItem:(k,v)=>session.set(k,v),getItem:k=>session.get(k)};
 await read(ui,'appReady');
 assert.equal(url.hash,'#sky');
 assert.match(ui.elements['#root'].innerHTML,/href="#planner"/);
 const visit=hash=>{url.hash=hash;read(ui,'readWorkspaceRoute()');};
 visit('#setup');ui.click('start-business');assert.equal(url.hash,'#setup/business');
 ui.click('enter-setup',{mode:'guided'});assert.equal(url.hash,'#setup/edit/offers');
 assert.ok(entries.at(-2).endsWith('#setup/style'));
 read(ui,"draft.services[0].name='Local design';save()");
 ui.click('setup-step',{step:'2'});assert.equal(url.hash,'#setup/edit/people');
 const saved=read(ui,'JSON.stringify(currentWorkspace())');
 for(const page of ['#sky','#jobs','#planner','#studio','#setup/style'])visit(page);
 ui.click('enter-setup',{mode:'analyst'});
 assert.equal(url.hash,'#setup/edit/people');assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),saved);
 visit('#setup');assert.equal(url.hash,'#setup/edit/people');
 assert.equal(read(ui,'archives.length'),0);assert.equal(read(ui,'draft.services[0].name'),'Local design');
 visit('#setup/new/business');ui.click('enter-setup',{mode:'guided'});
 assert.equal(read(ui,'archives.length'),1);assert.equal(read(ui,'archives[0].workspace.draft.services[0].name'),'Local design');
 assert.equal(read(ui,'draft.services[0].name'),'');
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'setupOrigin'),'business');
});

test('every workspace uses the shared navigator, identifies its location and offers its own backup', async () => {
  const ui=setup();
  await read(ui,'Promise.all([appReady,studioReady])');
  ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
  const routes=['setup','map','finances','projects','scenarios','about','studio','planner','jobs'];
  for(const route of [...routes,'sky','sky/view']){
    ui.ctx.testRoute=route;
    const nav=read(ui,'view=testRoute;render();workspaceNavigator()');
    const html=ui.elements['#root'].innerHTML;
    assert.match(html,/<header class="sky-header">/);
    assert.equal((html.match(/id="navigator-trigger"/g)||[]).length,1);
    assert.doesNotMatch(html,/<aside class="sidebar"|data-action="mobile-nav"/);
    for(const id of ['sky',...routes])assert.ok(nav.includes('href="#'+id+'"'),id+' from '+route);
    if(routes.includes(route)){
      const active=route==='setup'?'location':'page';
      assert.ok(nav.includes('href="#'+route+'" aria-current="'+active+'"'));
    }
    const studioArea=['studio','planner','jobs'].includes(route);
    for(const action of studioArea?[route+'-backup',route+'-import']:['backup','import']){
      assert.ok(nav.includes('data-action="'+action+'"'),route+' '+action);
    }
  }
});

test('starting with the default business exposes the first offer and links missing groups to their fields',()=>{
  const ui=setup();
  ui.click('enter-setup',{mode:'guided'});
  const page=()=>ui.elements['#root'].innerHTML;
  assert.equal(read(ui,'setupOrigin'),'business');
  assert.match(page(),/class="first-offer"/);
  assert.doesNotMatch(page(),/class="service-editor"|data-action="simulate"|class="estimate-ready"/);
  for(const name of ['name','hours','supplierMode']){
    assert.ok(page().includes('data-path="services.0.'+name+'"'));
  }
  let focused=false;
  ui.elements['[data-input="services.0.hours"]']={focus:()=>{focused=true;}};
  ui.click('fix-setup-issue',{path:'services.0.hours'});
  assert.ok(focused);
  assert.equal(read(ui,'setupRepairPath'),'services.0.hours');
  read(ui,"Object.assign(draft.services[0],{name:'Design',price:250,deliverable:'One layout',hours:2,review:0,supplierMode:'print',print:null});render()");
  assert.equal((page().match(/<li class="ready">/g)||[]).length,2);
  assert.match(page(),/data-path="services.0.print"/);
  edit(ui,'services.0.print',30);
  assert.match(page(),/class="panel summary-card estimate-ready"/);
  assert.match(page(),/data-action="simulate"/);
  assert.doesNotMatch(page(),/class="offer-readiness"/);
});

function compareOnStep(ui){
  return [...ui.elements['#root'].innerHTML.matchAll(/<span class="estimate-delta(?: gain| loss)?">([^<]+)<\/span>/g)].map(match=>match[1]);
}
function enterRestaurantStep(step){
  const ui=setup();
  ui.click('start-restaurant');
  ui.click('enter-setup',{mode:'guided'});
  ui.click('setup-step',{step:String(step)});
  return ui;
}

test('a step compares against its first complete estimate for this visit and the selected run length',()=>{
  const ui=enterRestaurantStep(3),overhead=read(ui,'draft.overhead');
  assert.deepEqual(compareOnStep(ui),[]);
  edit(ui,'overhead',overhead+10);
  assert.deepEqual(compareOnStep(ui),['-$30','-$30']);
  edit(ui,'overhead','');
  assert.match(ui.elements['#root'].innerHTML,/summary-card estimate-pending/);
  assert.deepEqual(compareOnStep(ui),[]);
  edit(ui,'overhead',overhead+15);
  assert.deepEqual(compareOnStep(ui),['-$45','-$45']);

  ui.handlers.change({target:{id:'input-months',dataset:{input:'months'},tagName:'SELECT',type:'select-one',value:'2'}});
  assert.match(ui.elements['#root'].innerHTML,/60-day estimate/);
  assert.deepEqual(compareOnStep(ui),[]);
  edit(ui,'overhead',overhead+20);
  assert.deepEqual(compareOnStep(ui),['-$10','-$10']);

  ui.click('setup-step',{step:'2'});
  assert.deepEqual(compareOnStep(ui),[]);
  const ownerValueChange=read(ui,'offerAmount(QQ.round(-getDraftEstimate().owner))');
  edit(ui,'ownerTarget',read(ui,'draft.ownerTarget')+1);
  assert.deepEqual(compareOnStep(ui),['$0',ownerValueChange]);
  ui.click('setup-step',{step:'3'});
  assert.deepEqual(compareOnStep(ui),[]);
  edit(ui,'overhead',overhead+10);
  assert.deepEqual(compareOnStep(ui),['+$20','+$20']);

  ui.click('view',{view:'map'});ui.click('view',{view:'setup'});
  assert.deepEqual(compareOnStep(ui),[]);
  assert.equal(read(ui,'draft.months'),2);
  assert.equal(read(ui,'state.config.overhead'),overhead);
});

test('cash timing edits change the quote collection schedule while both estimated results stay level',()=>{
  const ui=enterRestaurantStep(3);
  const results=()=>read(ui,'JSON.stringify([getDraftEstimate().profit,getDraftEstimate().surplus])');
  const before=results();
  edit(ui,'deposit',0,{percent:'true'});
  edit(ui,'paymentDays',0);
  assert.match(ui.elements['#root'].innerHTML,/<dt>At acceptance<\/dt><dd>\$0</);
  assert.match(ui.elements['#root'].innerHTML,/<dt>Due on delivery<\/dt><dd>\$[1-9]/);
  edit(ui,'paymentDays',17);
  edit(ui,'leadDays',12);
  assert.match(ui.elements['#root'].innerHTML,/due 29 days after acceptance/);
  assert.deepEqual(compareOnStep(ui),[]);
  assert.equal(results(),before);
});

test('an incomplete draft prioritizes repairs for this step and starts comparison only when the draft becomes valid',()=>{
  const ui=enterRestaurantStep(1);
  edit(ui,'startingCash','');edit(ui,'conversion','');
  assert.equal(read(ui,'draftValidationIssues()[0].path'),'startingCash');
  const summary=()=>ui.elements['#root'].innerHTML.split('id="draft-summary"')[1];
  function repair(path,step){
    const current=summary().match(/data-action="fix-setup-issue"[^>]*data-path="([^"]+)"/);
    assert.ok(current,'rendered issue action');assert.equal(current[1],path);
    let focused=false;
    ui.elements['[data-input="'+path+'"]']={focus:()=>{focused=true;}};
    ui.click('fix-setup-issue',{path:current[1]});
    assert.ok(focused);assert.equal(read(ui,'stepIndex'),step);
  }
  repair('conversion',1);
  edit(ui,'conversion',45,{percent:'true'});
  assert.match(summary(),/<strong>Cash &(?:amp;)? timing<\/strong>/);
  assert.deepEqual(compareOnStep(ui),[]);
  repair('startingCash',3);
  edit(ui,'startingCash',6000);
  assert.match(summary(),/summary-card estimate-ready/);
  assert.deepEqual(compareOnStep(ui),[]);
  edit(ui,'overhead',read(ui,'draft.overhead')+2);
  assert.deepEqual(compareOnStep(ui),['-$6','-$6']);
});
