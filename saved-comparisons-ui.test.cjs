const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const dialog=ui=>ui.elements['#modal'].innerHTML;
const id='comparison-reader-test';
function fixture(){
 const ui=setup();ui.ctx.pairId=id;
 read(ui,`var original=QQ.fresh({...QQ.DEFAULT,name:'Harbor <Desk>',months:1,inquiries:0,acquisition:'preset',overhead:100});
  var revised=QQ.fresh({...original.config,overhead:125});
  while(QQ.step(original)){}while(QQ.step(revised)){}
  var stored={state:revised,saved:[],checkpointInfo:[],draft:revised.config,recoveryFiles:[],rerunLink:{path:'overhead',original,comparisonId:pairId,keptVersion:'original'}};
  archives=[{label:'Earlier pair',workspace:stored}];
  state=QQ.fresh({...original.config,name:'New scenario'});draft={...state.config,name:'My edits'};
  setupOrigin='business';setupChoicePending=false;view='setup';stepIndex=2;render();`);
 return ui;
}
function browser(ui,start,initialState=null){
 const win=ui.ctx.window;
 let position=0;
 const entries=[{hash:start,state:initialState}];
 win.location={hash:start};
 function move(to){
  if(to<0||to>=entries.length)return;
  position=to;win.location.hash=entries[to].hash;win.history.state=entries[to].state;
  read(ui,'readWorkspaceRoute()');
 }
 win.history={
  state:initialState,
  pushState(state,_title,hash){entries.splice(++position,Infinity,{hash,state});this.state=state;win.location.hash=hash;},
  replaceState(state,_title,hash=win.location.hash){entries[position]={hash,state};this.state=state;win.location.hash=hash;},
  back(){move(position-1);},forward(){move(position+1);}
 };
 read(ui,'routeReady=true;readWorkspaceRoute()');
 return {entries,win};
}
test('both libraries show one row per durable comparison and opening reads only its own archived runs',()=>{
 const ui=fixture();
 read(ui,`archives.push({label:'Duplicate snapshot',workspace:QQ.clone(stored)},
  {label:'In progress',workspace:{...stored,state:QQ.fresh(revised.config)}},
  {label:'Older pair',workspace:{...stored,rerunLink:{path:'overhead',original}}});
  var active=state,unsaved=draft;`);
 for(const section of ['scenariosTableView()','scenariosView()']){
  const html=read(ui,section);
  assert.equal((html.match(/data-comparison-id="comparison-reader-test"/g)||[]).length,1);
  assert.equal((html.match(/data-action="open-saved-comparison"/g)||[]).length,2);
  assert.match(html,/Harbor &lt;Desk&gt;/);assert.match(html,/Monthly overhead/);assert.match(html,/\$100 → \$125/);
 }
 ui.click('open-saved-comparison',{comparisonId:id});
 assert.match(dialog(ui),/id="saved-variant-result-title"/);
 ui.click('close');
 ui.click('open-saved-comparison',{index:'3'});
 assert.match(dialog(ui),/id="saved-variant-result-title"/);
 assert.match(dialog(ui),/<th scope="row">Operating result<\/th><td>-\$100<\/td><td>-\$125<\/td>/);
 assert.doesNotMatch(dialog(ui),/data-action="(?:keep-run-setup|test-assumption|open-archive)"/);
 ui.click('close');
 assert.equal(read(ui,'state===active&&draft===unsaved&&stepIndex===2'),true);
});
test('browser Back, Forward, Close and reload preserve the setup step and the durable saved pair',()=>{
 const ui=fixture(),{win,entries}=browser(ui,'#setup/edit/people');
 const unchanged=read(ui,'JSON.stringify(currentWorkspace())');
 ui.click('open-saved-comparison',{comparisonId:id});
 const hash=win.location.hash,marker=win.history.state;
 assert.equal(hash,'#setup/edit/people?comparison='+id);assert.equal(entries.length,2);
 assert.match(dialog(ui),/id="saved-variant-result-title"/);
 win.history.back();assert.equal(dialog(ui),'');assert.equal(read(ui,'stepIndex'),2);
 win.history.forward();assert.match(dialog(ui),/id="saved-variant-result-title"/);
 ui.click('close');assert.equal(win.location.hash,'#setup/edit/people');assert.equal(dialog(ui),'');
 assert.equal(read(ui,'JSON.stringify(currentWorkspace())'),unchanged);
 const refreshed=fixture();browser(refreshed,hash,marker);
 assert.match(dialog(refreshed),/id="saved-variant-result-title"/);assert.equal(read(refreshed,'stepIndex'),2);
});
test('a direct comparison link has a return entry and a deleted comparison cannot open another archive',()=>{
 const ui=fixture(),{win,entries}=browser(ui,'#finances?comparison='+id);
 assert.equal(entries.length,2);assert.equal(entries[0].hash,'#finances');
 assert.equal(read(ui,'analyticsTab'),'compare');assert.match(dialog(ui),/id="saved-variant-result-title"/);
 ui.click('close');assert.equal(win.location.hash,'#finances');assert.equal(dialog(ui),'');
 read(ui,'archives=[]');win.history.forward();
 assert.equal(win.location.hash,'#finances');assert.equal(dialog(ui),'');
 assert.match(ui.elements['#toast'].textContent,/comparison is unavailable/);
});
test('Back from the newly kept setup opens the completed comparison with its library behind it',()=>{
 const ui=fixture(),{win,entries}=browser(ui,'#finances');
 read(ui,"rememberKeptComparison(pairId);view='setup';stepIndex=0;render()");
 assert.deepEqual(entries.map(item=>item.hash),['#finances','#finances?comparison='+id,'#setup/edit/offers']);
 win.history.back();
 assert.match(dialog(ui),/id="saved-variant-result-title"/);
 assert.equal(read(ui,'analyticsTab'),'compare');
 ui.click('close');assert.equal(dialog(ui),'');assert.equal(win.location.hash,'#finances');
 assert.match(ui.elements['#root'].innerHTML,/Saved comparisons/);
});
