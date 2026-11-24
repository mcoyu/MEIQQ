const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);

test('invalid fulfillment values cannot produce authoritative unit or 30-day previews',()=>{
 const ui=setup();
 for(const change of ['managedShare=1.01','managedShare=2','designOnlyPrice=999']){
  read(ui,'draft=QQ.clone(state.config);draft.services[1].fulfillment.'+change+';render()');
  assert.equal(read(ui,'serviceUnit(draft.services[1])'),null);
  assert.doesNotMatch(read(ui,'serviceFulfillment(draft.services[1],1)'),/Contribution per accepted project/);
  assert.doesNotMatch(read(ui,'serviceInputs()'),/Expected first 30 days/);
  if(change.startsWith('managedShare')){assert.match(read(ui,'draftError()'),/between 0% and 100%/);assert.match(ui.elements['#root'].innerHTML,/between 0% and 100%/);}
 }
});

test('legacy repeat-service guidance keeps its confirmed renewal semantics',()=>{
 const ui=setup();read(ui,'draft=QQ.clone(QQ.DEFAULT);render()');
 assert.match(ui.elements['#root'].innerHTML,/failed renewal ends this legacy relationship/);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/A declined campaign is skipped/);
});

test('catalog source navigation preserves a proposed price and exports the unadded package',async()=>{
 const ui=setup();ui.click('catalog-package',{id:'postcard-250'});
 ui.handlers.input({target:{id:'catalog-price',value:'400'}});
 ui.click('service-evidence',{id:'postcard-250',catalog:'postcard-250'});
 assert.match(ui.elements['#modal'].innerHTML,/Back to package/);
 assert.match(ui.elements['#modal'].innerHTML,/Current managed-print customer price: \$400/);
 ui.click('download-service-evidence',{id:'postcard-250',catalog:'postcard-250'});
 assert.equal(ui.downloads.length,1);
 const data=await (await fetch(ui.downloads[0].href)).json();
 assert.equal(data.service.price,400);assert.equal(data.service.spec.packageId,'postcard-250');assert.ok(data.audit.edited.includes('price'));
 ui.click('catalog-package',{id:'postcard-250'});assert.match(ui.elements['#modal'].innerHTML,/value="400"/);
 assert.equal(read(ui,'draft.services.some(s=>s.spec?.packageId==="postcard-250")'),false);
 ui.handlers.input({target:{id:'catalog-price',value:''}});ui.click('service-evidence',{id:'postcard-250',catalog:'postcard-250'});ui.click('catalog-package',{id:'postcard-250'});
 assert.match(ui.elements['#modal'].innerHTML,/value=""/);assert.match(ui.elements['#modal'].innerHTML,/Enter a complete price/);
});

test('an imported custom service id cannot be confused with a catalog evidence reference',async()=>{
 const ui=setup();read(ui,"draft.services[0].id='catalog-menu-refresh';draft.services[0].price=999");
 ui.click('service-evidence',{id:'catalog-menu-refresh'});assert.match(ui.elements['#modal'].innerHTML,/Current customer price: \$999/);
 ui.click('download-service-evidence',{id:'catalog-menu-refresh'});const data=await (await fetch(ui.downloads[0].href)).json();
 assert.equal(data.service.id,'catalog-menu-refresh');assert.equal(data.service.price,999);
});

test('library categories group alternatives instead of acting as one-package selectors',()=>{
 const ui=setup();ui.click('service-library');
 ui.handlers.change({target:{id:'catalog-goal',value:'recurring',dataset:{}}});
 const html=ui.elements['#catalog-results'].innerHTML;
 assert.match(html,/Monthly physical offer kit/);assert.match(html,/Seasonal storefront campaign/);assert.doesNotMatch(html,/Digital promo flyer/);
 ui.handlers.change({target:{id:'catalog-goal',value:'menu',dataset:{}}});
 assert.match(ui.elements['#catalog-results'].innerHTML,/Menu refresh/);assert.match(ui.elements['#catalog-results'].innerHTML,/Takeout menus/);
});

test('unknown catalog versions do not borrow current catalog pricing for experiments',()=>{
 const ui=setup();read(ui,"draft.services[0].spec.catalogId='future-catalog';draft.services[0].price=777");
 ui.click('price-experiment',{index:'0'});assert.match(ui.elements['#modal'].innerHTML,/Current custom price/);assert.doesNotMatch(ui.elements['#modal'].innerHTML,/Catalog starting price/);
 read(ui,"delete draft.services[0].spec;draft.services[0].price=900000");ui.click('price-experiment',{index:'0'});
 assert.match(ui.elements['#modal'].innerHTML,/Outside valid range/);assert.doesNotMatch(ui.elements['#modal'].innerHTML,/data-price="1035000"/);
});
