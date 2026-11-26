const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
test('distributed HTML exactly matches the source modules and has no external assets',()=>{
  let expected=fs.readFileSync('index.template.html','utf8');
  for(const [tag,file]of [['STYLE','style.css'],['CHINESE','zh-CN.js'],['I18N','i18n.js'],['VALIDATION','validation.js'],['ENGINE','engine.js'],['SERVICE_CATALOG','service-catalog.js'],['PRESET_EVIDENCE','preset-evidence.js'],['PRESETS','presets.js'],['COMPARISON_REPORT','comparison-report.js'],['WORKSPACE','workspace.js'],['STORAGE','storage.js'],['STUDIO','studio.js'],['STUDIO_SEEDS','studio-seeds.js'],['STUDIO_SESSION','studio-session.js'],['STUDIO_VIEW','studio-view.js'],['STUDIO_STYLE','studio.css'],['JOBS','jobs.js'],['JOBS_VIEW','jobs-view.js'],['JOBS_CONTROLLER','jobs-controller.js'],['JOBS_STYLE','jobs.css'],['PLANNER','planner.js'],['PLANNER_EXPLORER','planner-explorer.js'],['PLANNER_STUDIO','planner-studio.js'],['PLANNER_BRIDGE','planner-bridge.js'],['PLANNER_VIEW','planner-view.js'],['PLANNER_CONTROLLER','planner-controller.js'],['PLANNER_STYLE','planner.css'],['STUDIO_FLIGHT','studio-flight.js'],['APP','app.js'],['SUNSET_SCENE','sunset-scene.js'],['SHARD_FLIGHT','shard-flight.js'],['SKY_CAMERA','sky-camera.js'],['GALAXY','galaxy.js'],['WATERFRONT_MODEL','waterfront-model.js'],['WATERFRONT','waterfront.js'],['SKY_EDITOR','sky-editor.js']])expected=expected.replace('/* '+tag+' */',()=>fs.readFileSync(file,'utf8'));
  let theme=fs.readFileSync('themes.css','utf8');
  for(const sector of ['food','retail','services']){
    const file='assets/client-menus/'+sector+'.jpg';
    assert.ok(theme.includes('url("'+file+'")'));
    theme=theme.replace(file,'data:image/jpeg;base64,'+fs.readFileSync(file).toString('base64'));
  }
  expected=expected.replace('</style>',()=>theme+'\n</style>');
  const html=fs.readFileSync('MEIQQ.html','utf8');assert.equal(html,expected);assert.ok(!/<script[^>]+src=|<link[^>]+href=|url\(https?:/i.test(html));
});
test('packaged HTML loads the versioned service catalog before creating the starter workspace',()=>{
  const {ctx}=setup(undefined,{built:true});
  assert.equal(vm.runInContext('QQServiceCatalog.BUNDLES.length>=3',ctx),true);
  assert.equal(vm.runInContext('state.config.services.length',ctx),3);
  assert.equal(vm.runInContext('state.config.services.every(service=>service.spec.catalogId===QQServiceCatalog.CATALOG.id)',ctx),true);
  assert.equal(vm.runInContext('QQPresets.audit(state.config).lineage.find(row=>row.path==="services.0.price").recordIds.length>0',ctx),true);
});
test('packaged offline scripts run, fund, back up and restore through the UI',()=>{
  const {ctx,click,elements,drainTimers}=setup(undefined,{built:true});click('start-restaurant');click('enter-setup',{mode:'guided'});click('view',{view:'map'});click('finish');drainTimers();assert.equal(vm.runInContext('state.day',ctx),30);
  click('fund');elements['#funding']={value:'1000',checkValidity:()=>true};click('confirm-fund');
  assert.equal(vm.runInContext('QQ.cashSeries(state).at(-1).cash===state.cash',ctx),true);
  vm.runInContext('draft.ownerHours=null;pendingImport=parseBackup(JSON.parse(JSON.stringify(backupPayload())))',ctx);
  click('confirm-import');assert.equal(vm.runInContext('state.day',ctx),30);assert.equal(vm.runInContext('draft.ownerHours',ctx),null);
  for(const view of ['setup','map','projects','finances','scenarios','about']){vm.runInContext(`view='${view}';render()`,ctx);assert.ok(!elements['#root'].innerHTML.includes('NaN'));}
});

test('packaged HTML completes the Phase C delayed-project comparison journey',async()=>{
  const {ctx,handlers,click,elements,storage,downloads,drainTimers}=setup(undefined,{built:true});
  click('example');click('confirm-example');
  const edit=(id,path,value)=>handlers.input({target:{id,dataset:{input:path},type:'number',tagName:'INPUT',value:String(value),checkValidity:()=>true}});
  edit('input-services-0-price','services.0.price',625);
  edit('input-services-0-hours','services.0.hours',7.5);
  edit('input-designerHours','designerHours',1);
  vm.runInContext('review()',ctx);assert.match(elements['#modal'].innerHTML,/\$290 → \$625/);
  click('apply',{mode:'restart'});click('finish');drainTimers();
  const delayed=vm.runInContext("state.projects.find(p=>p.accepted!==undefined&&!p.delivered&&p.stage==='design'&&state.day>p.due)",ctx);
  assert.ok(delayed);assert.ok(delayed.due<30);
  vm.runInContext(`selection={type:'project',id:${JSON.stringify(delayed.id)}};view='map';render()`,ctx);
  assert.match(elements['#root'].innerHTML,/design team needs .* more work hours/i);
  click('compare-runs');
  assert.match(elements['#root'].innerHTML,/Compared with pinned baseline/);
  assert.match(elements['#root'].innerHTML,/Exact assumption changes/);
  click('backup');assert.equal(downloads[0].download,'MEIQQ-Backup-Day-30.json');
  const downloadedText=await (await fetch(downloads[0].href)).text();
  ctx.downloadedText=downloadedText;
  const opened=vm.runInContext('MEIQQWorkspace.parseText(downloadedText)',ctx);
  assert.equal(opened.state.day,30);assert.equal(opened.checkpointInfo.filter(v=>v.baseline).length,1);
  const imported=setup(undefined,{built:true});imported.ctx.downloadedText=downloadedText;
  vm.runInContext('pendingImport=MEIQQWorkspace.parseText(downloadedText)',imported.ctx);imported.click('confirm-import');
  assert.equal(vm.runInContext('state.day',imported.ctx),30);
  assert.equal(vm.runInContext('checkpointInfo.filter(v=>v.baseline).length',imported.ctx),1);
  vm.runInContext('save()',ctx);drainTimers();
  const refreshed=setup([...storage],{built:true});
  assert.equal(vm.runInContext('state.day',refreshed.ctx),30);
  assert.equal(vm.runInContext('checkpointInfo.filter(v=>v.baseline).length',refreshed.ctx),1);
});

test('packaged HTML includes preset evidence and preserves composed values',()=>{
  const {ctx,handlers,click,elements,storage,drainTimers}=setup(undefined,{built:true});
  assert.equal(vm.runInContext('QQPresets.MARKETS.length*QQPresets.OPERATIONS.length*QQPresets.MIXES.length*QQPresets.CONDITIONS.length',ctx),720);
  assert.equal(vm.runInContext('QQPresets.SOURCES.every(v=>v.url.startsWith("https://"))',ctx),true);
  click('start-restaurant');click('enter-setup',{mode:'guided'});click('toggle-recipe');click('recipe-evidence');
  assert.match(elements['#modal'].innerHTML,/Values, sources and derivations/);
  assert.equal(vm.runInContext('QQPresetEvidence.RECORDS.length>=7',ctx),true);
  assert.match(elements['#modal'].innerHTML,/Published comparisons and context/);
  assert.equal(vm.runInContext('QQPresets.SOURCES.every(source=>document.querySelector("#modal").innerHTML.includes(source.url))',ctx),true);
  click('close');handlers.change({target:{id:'preset-market',value:'dearborn',dataset:{}}});
  handlers.change({target:{id:'preset-operation',value:'lean',dataset:{}}});
  handlers.change({target:{id:'preset-mix',value:'food',dataset:{}}});
  handlers.change({target:{id:'preset-condition',value:'busy',dataset:{}}});
  const expected=vm.runInContext('JSON.stringify(QQPresets.compose({market:"dearborn",operation:"lean",mix:"food",condition:"busy"},draft))',ctx);
  click('apply-preset');assert.match(elements['#modal'].innerHTML,/Load this recipe into your draft/);click('confirm-preset');
  assert.equal(vm.runInContext('state.config.inquiries',ctx),45);
  assert.equal(vm.runInContext('JSON.stringify(draft)',ctx),expected);
  vm.runInContext('save()',ctx);drainTimers();
  const refreshed=setup([...storage],{built:true});
  assert.equal(vm.runInContext('JSON.stringify(draft)',refreshed.ctx),expected);
  assert.equal(vm.runInContext('presetSelection.market',refreshed.ctx),'dearborn');
  const exported=vm.runInContext('MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives))',refreshed.ctx);
  assert.equal(JSON.stringify(exported.draft),expected);
});

test('the permanent backdrop switches between Studio waterfront and simulator sky and remembers motion', async () => {
  const contents = fs.readFileSync('MEIQQ.html','utf8');
  const sky = contents.match(/<body><aero-shards aria-hidden="true">([\s\S]*?)<\/aero-shards><div id="root">/);
  assert.ok(sky);
  assert.match(sky[1], /class="sunset-environment"/);
  assert.match(sky[1], /class="sunset-horizon"/);
  assert.match(sky[1], /class="studio-waterfront"/);
  assert.doesNotMatch(sky[1], /<img|<picture/);
  assert.doesNotMatch(contents,/function loadAeroShardsGPU\(|function mountAeroShards\(/);
  const ui = setup(undefined,{built:true});
  const settings = value => ui.handlers.change({target:{id:'shard-motion',value}});
  const host = ui.elements['aero-shards'];
  let suspended;
  host.toggleAttribute = (key,value) => {if(key==='suspended') suspended=value;};
  for (const hidden of [true,false]) {
    ui.ctx.document.hidden=hidden;
    ui.handlers.visibilitychange();
    assert.equal(suspended,hidden);
  }
  let applied;
  host.setAttribute = (key,value) => {if (key==='motion') applied=value;};
  settings('animate');
  assert.equal(applied,'animate');
  assert.equal(ui.storage.get('qq-studio-shard-motion'),'animate');
  await vm.runInContext('Promise.all([studioReady,jobsReady,plannerReady])',ui.ctx);
  const attributes=new Map();
  host.getAttribute=key=>attributes.get(key)??null;
  host.setAttribute=(key,value)=>attributes.set(key,value);
  host.removeAttribute=key=>attributes.delete(key);
  for (const view of ['studio','jobs','planner','setup']) {
    ui.click('view',{view});
    assert.equal(host.getAttribute('waterfront'),view==='setup'?null:view);
    assert.equal(ui.elements['#root'].innerHTML.includes('data-action="view-waterfront"'),view!=='setup');
    assert.doesNotMatch(ui.elements['#root'].innerHTML,/<aero-shards|class="studio-waterfront"/);
    assert.match(ui.elements['#root'].innerHTML,/<option value="animate" selected>Animate<\/option>/);
  }
  settings('unsupported');
  assert.equal(applied,'animate');
  settings('still');
  const restored=setup(ui.storage,{built:true});
  assert.match(restored.elements['#root'].innerHTML,/<option value="still" selected>Still<\/option>/);
});
