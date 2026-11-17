const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
test('distributed HTML exactly matches the source modules and has no external assets',()=>{
  let expected=fs.readFileSync('index.template.html','utf8');
  for(const [tag,file]of [['STYLE','style.css'],['VALIDATION','validation.js'],['ENGINE','engine.js'],['WORKSPACE','workspace.js'],['STORAGE','storage.js'],['APP','app.js']])expected=expected.replace('/* '+tag+' */',()=>fs.readFileSync(file,'utf8'));
  expected=expected.replace('</style>',()=>fs.readFileSync('themes.css','utf8')+'\n</style>');
  const html=fs.readFileSync('MEIQQ.html','utf8');assert.equal(html,expected);assert.ok(!/<script[^>]+src=|<link[^>]+href=|url\(https?:/i.test(html));
});
test('packaged offline scripts run, fund, back up and restore through the UI',()=>{
  const {ctx,click,elements}=setup(undefined,{built:true});click('finish');assert.equal(vm.runInContext('state.day',ctx),30);
  click('fund');elements['#funding']={value:'1000',checkValidity:()=>true};click('confirm-fund');
  assert.equal(vm.runInContext('QQ.cashSeries(state).at(-1).cash===state.cash',ctx),true);
  vm.runInContext('draft.ownerHours=null;pendingImport=parseBackup(JSON.parse(JSON.stringify(backupPayload())))',ctx);
  click('confirm-import');assert.equal(vm.runInContext('state.day',ctx),30);assert.equal(vm.runInContext('draft.ownerHours',ctx),null);
  for(const view of ['setup','map','projects','finances','scenarios','about']){vm.runInContext(`view='${view}';render()`,ctx);assert.ok(!elements['#root'].innerHTML.includes('NaN'));}
});
