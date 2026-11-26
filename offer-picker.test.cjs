const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const dialog=ui=>ui.elements['#modal'].innerHTML;
const filter=(ui,id,value)=>ui.handlers.change({target:{id,value,dataset:{}}});
const search=(ui,value)=>ui.handlers.input({target:{id:'offer-package-search',value,dataset:{}}});
const choose=(ui,key,checked)=>ui.handlers.change({target:{type:'checkbox',checked,dataset:{pickerKey:key}}});

test('a multi-package selection persists across query, need, selected-only and source detail until Apply',()=>{
 const ui=setup();
 ui.click('browse-offers');const original=read(ui,'JSON.stringify(draft)'),live=read(ui,'JSON.stringify(state)');
 assert.match(dialog(ui),/Choose services for your menu/);
 assert.match(dialog(ui),/data-action="apply-offer-selection"[^>]+disabled/);
 const initial=read(ui,'offerPickerSummary().selectedText');
 choose(ui,'new-monthly-sales-brief',true);
 search(ui,'supplier');assert.ok(!ui.elements['#catalog-results'].innerHTML.includes('new-monthly-sales-brief'));
 choose(ui,'new-supplier-quote-matrix',true);
 ui.click('picker-evidence',{key:'new-supplier-quote-matrix'});
 assert.match(dialog(ui),/editable planning estimates/);assert.match(dialog(ui),/Back to selection/);
 ui.click('picker-details-back',{key:'new-supplier-quote-matrix'});
 assert.equal(read(ui,'offerPicker.query'),'supplier');
 assert.match(dialog(ui),/data-picker-key="new-supplier-quote-matrix"[^>]+checked/);
 ui.click('reset-offer-filters');
 ui.handlers.change({target:{id:'offer-selection-only',checked:true,dataset:{}}});
 const visible=ui.elements['#catalog-results'].innerHTML;
 assert.match(visible,/new-monthly-sales-brief/);assert.match(visible,/new-supplier-quote-matrix/);
 assert.doesNotMatch(visible,/new-digital-flyer/);
 filter(ui,'catalog-goal','recurring');assert.match(ui.elements['#catalog-results'].innerHTML,/new-monthly-sales-brief/);
 assert.equal(read(ui,'JSON.stringify(draft)'),original);assert.equal(read(ui,'JSON.stringify(state)'),live);
 assert.notEqual(read(ui,'offerPickerSummary().selectedText'),initial);
 ui.click('apply-offer-selection');
 assert.equal(dialog(ui),'');assert.equal(read(ui,'offerPicker'),null);
 assert.equal(read(ui,"draft.services.filter(s=>['monthly-sales-brief','supplier-quote-matrix'].includes(catalogPackageId(s))).length"),2);
 assert.equal(read(ui,'JSON.stringify(state)'),live);
});

test('customized copies can be deselected independently and cancelling leaves the draft untouched',()=>{
 const ui=setup();
 read(ui,"var sample=QQServiceCatalog.createService('digital-flyer');draft.services=[{...sample,id:'v1',name:'Paper & <ink>',price:490,weight:50},{...sample,id:'v2',weight:50}]");
 const original=read(ui,'JSON.stringify(draft)');
 ui.click('browse-offers');
 assert.match(dialog(ui),/Paper &amp; &lt;ink&gt;/);assert.match(dialog(ui),/Customized in your menu/);
 assert.match(dialog(ui),/data-picker-key="saved-v1"[^>]+checked/);
 choose(ui,'saved-v1',false);ui.click('close');assert.equal(read(ui,'JSON.stringify(draft)'),original);
 ui.click('browse-offers');assert.equal(read(ui,'offerPicker.removed.size'),0);
 choose(ui,'saved-v1',false);choose(ui,'saved-v2',false);
 assert.equal(read(ui,'offerPickerSummary().canApply'),false);
 choose(ui,'saved-v2',true);ui.click('apply-offer-selection');
 assert.equal(read(ui,"draft.services.map(s=>s.id).join()"),'v2');
 assert.equal(read(ui,'draft.services[0].weight'),100);
});

test('localized search finds a translated service or client need and English search still works',()=>{
 const ui=setup();
 // The test host has no HTML parser. Live catalog filtering still uses the application's translator.
 read(ui,"QQI18n.choose('zh-CN');QQI18n.html=html=>html");
 ui.click('browse-offers');
 search(ui,'双语柜台');assert.match(ui.elements['#catalog-results'].innerHTML,/new-bilingual-order-guide/);
 search(ui,'bilingual counter');assert.match(ui.elements['#catalog-results'].innerHTML,/new-bilingual-order-guide/);
 search(ui,'no such package xyz');assert.match(ui.elements['#catalog-results'].innerHTML,/No packages match this view/);
 ui.click('reset-offer-filters');assert.equal(read(ui,'visibleOfferRows().length'),read(ui,'offerPicker.rows.length'));
});

test('the selection separates parked packages and custom work from an untouched starter',()=>{
 const ui=setup();
 read(ui,"var sample=QQServiceCatalog.createService('digital-flyer');draft.services=[{...sample,id:'parked',weight:0},{...sample,spec:undefined,id:'bespoke',name:'Bespoke work',weight:100}]");
 ui.click('browse-offers');
 assert.match(dialog(ui),/In your menu · Draft only \(0% share\)/);
 assert.match(dialog(ui),/One service outside this catalog stays in your menu/);
 assert.equal(read(ui,'offerPickerSummary().selectedText'),'1 package selected');
 ui.click('close');read(ui,"draft.services=[{...emptyCustomOffer(),id:'starter',weight:100}]");
 ui.click('browse-offers');assert.doesNotMatch(dialog(ui),/outside this catalog stays in your menu/);
 assert.equal(read(ui,'offerPickerSummary().selectedText'),'0 packages selected');
});
