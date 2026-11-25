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
  assert.match(unopened.elements['#root'].innerHTML,/Try the restaurant example/);
  unopened.click('start-restaurant');
  assert.doesNotMatch(unopened.elements['#root'].innerHTML,/data-action="start-business"/);
  const reopened=setup([...unopened.storage]);
  assert.match(reopened.elements['#root'].innerHTML,/data-action="simulate"/);
  assert.doesNotMatch(reopened.elements['#root'].innerHTML,/id="preset-market"/);
});

test('starting another scenario preserves and can reopen the previous run including its unfinished draft', () => {
  const ui=setup();ui.click('start-restaurant');ui.click('simulate');ui.drainTimers();
  read(ui,"view='setup';draft.name='Unfinished November draft';draft.services[0].hours=null;render()");
  const previous=read(ui,'JSON.stringify(currentWorkspace())');
  ui.click('new-scenario');ui.click('close');assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),previous);
  ui.click('new-scenario');ui.click('new-business');
  assert.equal(read(ui,'draft.name'),'My business');assert.equal(read(ui,'draft.services[0].price'),null);
  assert.equal(read(ui,'draft.services.length'),1);assert.match(read(ui,'draftError()'),/.+/);
  assert.equal(read(ui,'JSON.stringify(archives[0].workspace)'),previous);
  const reopened=setup([...ui.storage]);reopened.click('open-archive',{index:'0'});
  assert.equal(read(reopened,'state.day'),90);assert.equal(read(reopened,'draft.name'),'Unfinished November draft');
  assert.equal(read(reopened,'draft.services[0].hours'),null);
});

test('fixed-volume switch uses current outreach and retains an explicit fixed estimate through reload', () => {
  const ui=setup();ui.click('start-restaurant');ui.click('setup-step',{step:'1'});
  edit(ui,'outreachHours',3);edit(ui,'acquisition','preset');assert.equal(read(ui,'draft.inquiries'),3.9);
  edit(ui,'inquiries',45);edit(ui,'acquisition','sales');ui.drainTimers();
  const re=setup([...ui.storage]);edit(re,'acquisition','preset');
  assert.equal(read(re,'draft.inquiries'),45);
  const old=setup();read(old,'draft.acquisition="sales";draft.inquiries=13;delete draft.fixedInquiriesEntered;delete draft.recipe');
  edit(old,'acquisition','preset');assert.equal(read(old,'draft.inquiries'),13);
});

test('draft preview exposes owner-time economics and explains an impossible delivery', () => {
  const ui=setup();ui.click('start-restaurant');
  let html=read(ui,'draftSummary()');
  assert.match(html,/\+\$789/);assert.match(html,/-\$1,962/);assert.match(html,/Expected new inquiries/);
  edit(ui,'designers',0);html=read(ui,'draftSummary()');
  assert.ok(html.indexOf('No design capacity')<html.indexOf('Operating result'));
  edit(ui,'designers',1);edit(ui,'ownerHours',4);html=read(ui,'draftSummary()');
  assert.match(html,/No owner time remains/);
});

test('demand evidence is linked to the exact estimate, reported on review, and saved in the draft', () => {
  const ui=setup();ui.click('start-restaurant');
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
  const ui=setup();ui.click('start-restaurant');
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
  const ui=setup();ui.click('start-restaurant');ui.click('setup-step',{step:'1'});
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
