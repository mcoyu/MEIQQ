const test=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./ui-test-host.cjs');

test('service additions and removals produce one readable comparison row each',()=>{
 const {ctx}=setup(),result=JSON.parse(require('node:vm').runInContext(`(()=>{
  const before=QQ.clone(QQ.DEFAULT),added=QQ.clone(QQ.DEFAULT.services[0]);added.id='new-offer';added.name='Counter offer';
  const add=configDiff(before,{...QQ.clone(before),services:[...QQ.clone(before.services),added]}).filter(row=>row.path.startsWith('services.new-offer'));
  const remove=configDiff(before,{...QQ.clone(before),services:QQ.clone(before.services.slice(1))}).filter(row=>row.path.startsWith('services.design'));
  return JSON.stringify({add,remove});
 })()`,ctx));
 assert.equal(result.add.length,1);assert.equal(result.add[0].before,'Not included');assert.match(result.add[0].after,/^Included · \$290 per project/);assert.match(result.add[0].after,/45% inquiry share/);
 assert.equal(result.remove.length,1);assert.match(result.remove[0].before,/^Included · /);assert.equal(result.remove[0].after,'Removed');
});

test('existing package scope changes use named values instead of serialized spec JSON',()=>{
 const {ctx}=setup(),rows=JSON.parse(require('node:vm').runInContext(`(()=>{
  const before=QQ.clone(QQ.DEFAULT),service=QQServiceCatalog.createService('menu-refresh');service.id=before.services[0].id;service.weight=before.services[0].weight;
  const base={...QQ.clone(before),services:[service,...QQ.clone(before.services.slice(1))]},next=QQ.clone(base);next.services[0].spec.scope='Two supplied menu panels';next.services[0].spec.includedRevisions=3;
  return JSON.stringify(configDiff(base,next).filter(row=>row.path.includes('.spec')));
 })()`,ctx));
 assert.ok(rows.some(row=>/scope/i.test(row.label)));
 assert.ok(rows.some(row=>/feedback rounds/i.test(row.label)));
 for(const row of rows){assert.doesNotMatch(row.before,/^\s*[\[{]/);assert.doesNotMatch(row.after,/^\s*[\[{]/);}
});

test('modal behavior includes visible native focusables and excludes invalid stops',()=>{
 const {ctx,handlers,elements}=setup(),vm=require('node:vm');elements['#modal']={innerHTML:'open',firstChild:{}};
 vm.runInContext(`
  const modalNode=(id,options={})=>({id,disabled:Boolean(options.disabled),tabIndex:options.tabIndex??0,closest:()=>options.hidden?{}:null,getClientRects:()=>options.visible===false?[]:[{}],focus(){document.activeElement=this;}});
  modalStops=[modalNode('summary'),modalNode('source-link'),modalNode('notes'),modalNode('button'),modalNode('hidden',{hidden:true}),modalNode('collapsed',{visible:false}),modalNode('disabled',{disabled:true}),modalNode('negative',{tabIndex:-1})];
  document.querySelectorAll=selector=>selector.startsWith('#modal ')?modalStops:[];
 `,ctx);
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(modalTabStops().map(node=>node.id))',ctx)),['summary','source-link','notes','button']);
 const press=(shiftKey=false)=>{let prevented=false;handlers.keydown({key:'Tab',shiftKey,target:{closest:()=>null},preventDefault(){prevented=true;}});assert.equal(prevented,true);return vm.runInContext('document.activeElement.id',ctx);};
 vm.runInContext("document.activeElement=modalStops[0]",ctx);assert.equal(press(),'source-link');assert.equal(press(),'notes');assert.equal(press(),'button');assert.equal(press(),'summary');
 assert.equal(press(true),'button');assert.equal(press(true),'notes');assert.equal(press(true),'source-link');assert.equal(press(true),'summary');
 vm.runInContext("document.activeElement={id:'outside'}",ctx);assert.equal(press(),'summary');vm.runInContext("document.activeElement={id:'outside'}",ctx);assert.equal(press(true),'button');
});

test('Safari-style pointer click retains the root opener through nested modal and Escape',()=>{
 const ui=setup(),{ctx,elements,handlers}=ui,vm=require('node:vm');
 vm.runInContext(`document.activeElement={id:'body'};focusRestored=false;rootOpener={dataset:{action:'service-library'},focus(){focusRestored=true;document.activeElement=this;}};document.querySelectorAll=selector=>selector.startsWith('#root [id]')?[rootOpener]:[]`,ctx);
 ui.click('service-library');elements['#modal'].firstChild={};assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(modalFocus)',ctx)),{action:'service-library'});
 ui.click('catalog-package',{id:'menu-refresh'});elements['#modal'].firstChild={};assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(modalFocus)',ctx)),{action:'service-library'});assert.match(elements['#modal'].innerHTML,/Menu refresh/);
 handlers.keydown({key:'Escape',target:{closest:()=>null},preventDefault(){}});ui.drainTimers();
 assert.equal(vm.runInContext('focusRestored',ctx),true);assert.equal(elements['#modal'].innerHTML,'');
});

test('evidence opener data-id is not confused with an unrelated DOM id on focus return',()=>{
 const ui=setup(),{ctx,elements,handlers}=ui,vm=require('node:vm');
 vm.runInContext(`
  draft.services=[QQServiceCatalog.createService('menu-refresh')];document.activeElement={id:'body'};wrongFocused=false;exactFocused=false;
  wrong={id:'menu-refresh',dataset:{action:'other'},focus(){wrongFocused=true;document.activeElement=this;}};
  evidenceOpener={id:'',dataset:{action:'service-evidence',id:'menu-refresh'},focus(){exactFocused=true;document.activeElement=this;}};
  document.querySelectorAll=selector=>selector.startsWith('#root [id]')?[wrong,evidenceOpener]:[];
 `,ctx);
 handlers.click({target:{closest:()=>vm.runInContext('evidenceOpener',ctx)}});elements['#modal'].firstChild={};
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(modalFocus)',ctx)),{action:'service-evidence',id:'menu-refresh'});assert.match(elements['#modal'].innerHTML,/Menu refresh/);
 handlers.keydown({key:'Escape',target:{closest:()=>null},preventDefault(){}});ui.drainTimers();
 assert.equal(vm.runInContext('exactFocused',ctx),true);assert.equal(vm.runInContext('wrongFocused',ctx),false);
});

test('a completed close or modal refresh cannot steal focus back from the next keyboard action',()=>{
 const ui=setup(),vm=require('node:vm');
 vm.runInContext(`
  function control(id){return {id,dataset:{},tabIndex:0,closest:()=>null,getClientRects:()=>[{}],focus(){document.activeElement=this;}};}
  const opener=control('month-job-list'),first=control('cancel-report'),downloadButton=control('download-report');
  document.querySelectorAll=selector=>selector.startsWith('#modal ')?[first,downloadButton]:selector.startsWith('#root [id]')?[opener]:[];
  opener.focus();modal('<h2>Download comparison</h2>');downloadButton.focus();
 `,ui.ctx);
 ui.drainTimers();
 assert.equal(vm.runInContext('document.activeElement.id',ui.ctx),'download-report');
 vm.runInContext('closeModal();first.focus()',ui.ctx);
 ui.drainTimers();
 assert.equal(vm.runInContext('document.activeElement.id',ui.ctx),'cancel-report');
});

test('same-value blur does not rerender, rewrite preview, or consume undo state',()=>{
 const {ctx}=setup(),vm=require('node:vm');
 const result=JSON.parse(vm.runInContext(`(()=>{
  renderCalls=0;previewCalls=0;render=()=>renderCalls++;updatePreview=()=>previewCalls++;view='setup';
  const input=(path,value,extra={})=>({dataset:{input:path,...extra},type:'number',value,id:path.replaceAll('.','-'),checkValidity:()=>true});
  const changed=Number(draft.ownerHours)+1;serviceUndoDraft={marker:'old-services'};presetUndoDraft={marker:'old-preset'};
  handleInput(input('ownerHours',String(changed)));const first={value:draft.ownerHours,renderCalls,previewCalls,serviceUndoDraft,presetUndoDraft};
  serviceUndoDraft={marker:'keep-services'};presetUndoDraft={marker:'keep-preset'};handleInput(input('ownerHours',changed+'.0'));
  const same={renderCalls,previewCalls,serviceUndoDraft,presetUndoDraft};
  draft.services[0].review=.5;serviceUndoDraft={marker:'decimal-services'};presetUndoDraft={marker:'decimal-preset'};handleInput(input('services.0.review','.5'));
  return JSON.stringify({first,same,decimal:{renderCalls,previewCalls,serviceUndoDraft,presetUndoDraft,value:draft.services[0].review}});
 })()`,ctx));
 assert.deepEqual(result.first,{value:16,renderCalls:1,previewCalls:1,serviceUndoDraft:null,presetUndoDraft:null});
 assert.deepEqual(result.same,{renderCalls:1,previewCalls:1,serviceUndoDraft:{marker:'keep-services'},presetUndoDraft:{marker:'keep-preset'}});
 assert.deepEqual(result.decimal,{renderCalls:1,previewCalls:1,serviceUndoDraft:{marker:'decimal-services'},presetUndoDraft:{marker:'decimal-preset'},value:.5});
});
