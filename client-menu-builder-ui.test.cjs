const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,script)=>vm.runInContext(script,ui.ctx);
const markup=ui=>ui.elements['#modal'].innerHTML;
function open(type='business'){
 const ui=setup();ui.click('start-'+type);ui.click('enter-setup',{mode:'guided'});ui.click('build-client-menu');return ui;
}
function choose(ui,profile='restaurant'){ui.click('choose-menu-client',{profile});}
function swap(ui,index,id){
 ui.click('show-menu-swaps',{slot:String(index)});
 assert.match(markup(ui),/Offer alternatives/);
 ui.click('swap-menu-offer',{slot:String(index),id});
}

test('profile choice previews all three rationales and a first swap against the starter even with an incomplete original',()=>{
 const ui=open();
 assert.match(markup(ui),/Who do you want to serve/);
 assert.doesNotMatch(markup(ui),/id="apply-client-menu"/);
 const original=read(ui,'JSON.stringify(draft)'),run=read(ui,'JSON.stringify(state)');
 choose(ui);
 assert.equal((markup(ui).match(/class="cm-slot"/g)||[]).length,3);
 assert.match(markup(ui),/compare it with this starting estimate/);
 assert.match(markup(ui),/first orders over the run period/);
 swap(ui,0,'monthly-sales-brief');
 assert.match(markup(ui),/vs\. recommended menu/);
 assert.match(markup(ui),/Monthly sales decision brief/);assert.match(markup(ui),/Last swap/);
 assert.equal(read(ui,'JSON.stringify(draft)'),original);
 ui.click('menu-client-list');choose(ui,'wholesale');ui.click('menu-client-list');choose(ui);
 assert.match(markup(ui),/Monthly sales decision brief/);
 ui.click('apply-client-menu');
 assert.equal(markup(ui),'');assert.equal(read(ui,'JSON.stringify(state)'),run);
 assert.equal(read(ui,'currentClientMenu().packageIds[0]'),'monthly-sales-brief');
 ui.click('build-client-menu');assert.ok(!markup(ui).includes('Who do you want to serve?'));assert.match(markup(ui),/This menu matches your setup./);
 swap(ui,0,'menu-sales-mix');assert.match(markup(ui),/Leaves your menu on Apply/);
 ui.click('close');
 assert.equal(read(ui,'currentClientMenu().packageIds[0]'),'monthly-sales-brief');
});

test('current, starter and last-swap estimates stay distinct while keeping or explicitly replacing the draft',()=>{
 const ui=open('restaurant');
 choose(ui,'wholesale');assert.match(markup(ui),/id="client-menu-retain" type="checkbox" checked/);
 assert.match(markup(ui),/vs\. current menu/);
 ui.click('menu-compare-with',{reference:'recommended'});assert.match(markup(ui),/vs\. recommended menu/);
 const original=read(ui,'JSON.stringify(draft)');
 ui.handlers.change({target:{id:'client-menu-retain',checked:false,dataset:{}}});
 assert.match(markup(ui),/Leaves your menu on Apply/);assert.match(markup(ui),/Table-tent promo/);
 assert.equal(read(ui,'JSON.stringify(draft)'),original);
 ui.click('apply-client-menu');
 assert.equal(read(ui,'draft.services.length'),3);
 ui.click('undo-services');assert.equal(read(ui,'JSON.stringify(draft)'),original);
});

test('incomplete inputs and capacity constraints are exposed during comparison',()=>{
 const ui=open('restaurant');
 read(ui,'draft.designerHours=.1');choose(ui);
 assert.match(markup(ui),/Production capacity exceeded by/);
 read(ui,'draft.designerRate=null');choose(ui);
 assert.match(markup(ui),/Estimate needs more inputs/);
 assert.ok(!markup(ui).includes('id="apply-client-menu" disabled'));
});
