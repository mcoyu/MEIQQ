const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const input=(ui,path,value,percent=false)=>ui.handlers.input({target:{dataset:{input:path,...(percent?{percent:'true'}:{})},type:'number',value:String(value),id:'input-'+path.replaceAll('.','-')}});

test('fresh service menu has defined scopes and customer printing choice with no live mutation from browsing',()=>{
 const ui=setup(),before=read(ui,'JSON.stringify(state.config)');
 assert.equal(read(ui,'draft.services.length'),3);assert.match(ui.elements['#root'].innerHTML,/Build your service menu/);
 ui.click('service-library');assert.match(ui.elements['#modal'].innerHTML,/Customer need/);
 ui.handlers.change({target:{id:'catalog-audience',value:'food',dataset:{}}});
 assert.match(ui.elements['#catalog-results'].innerHTML,/Menu refresh/);
 ui.click('catalog-package',{id:'window-promo-12sf'});
 assert.match(ui.elements['#modal'].innerHTML,/12 sq ft/);assert.match(ui.elements['#modal'].innerHTML,/files only/);
 assert.equal(read(ui,'JSON.stringify(state.config)'),before);
});

test('proposed catalog price updates economics and adds a preserved zero-share draft offering',()=>{
 const ui=setup();ui.click('catalog-package',{id:'postcard-250'});
 ui.handlers.input({target:{id:'catalog-price',value:'400'}});
 assert.match(ui.elements['#catalog-economics'].innerHTML,/\$340/);
 ui.elements['#catalog-price']={value:'400'};ui.click('confirm-catalog-service');
 assert.equal(read(ui,'draft.services.at(-1).price'),400);assert.equal(read(ui,'draft.services.at(-1).weight'),0);
 assert.equal(read(ui,'state.config.services.length'),3);
 ui.click('review');assert.match(ui.elements['#modal'].innerHTML,/Promo postcards · 250:/);assert.match(ui.elements['#modal'].innerHTML,/Not included → Included/);assert.match(ui.elements['#modal'].innerHTML,/\$400 per project/);assert.match(ui.elements['#modal'].innerHTML,/files-only/);
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'draft.services.at(-1).price'),400);
 assert.equal(read(reopened,'draft.services.at(-1).spec.packageId'),'postcard-250');
});

test('printing-choice edits explain both routes and lock only after applying',()=>{
 const ui=setup();input(ui,'services.1.fulfillment.managedShare',0,true);
 assert.equal(read(ui,'draft.services[1].fulfillment.managedShare'),0);assert.equal(read(ui,'state.config.services[1].fulfillment.managedShare'),.7);
 assert.equal(read(ui,'QQ.estimate(draft).services[1].perProject.printCost'),0);
 ui.click('review');assert.match(ui.elements['#modal'].innerHTML,/managed-print choice/);assert.match(ui.elements['#modal'].innerHTML,/70%.*0%/);
 ui.click('apply',{mode:'restart'});const reopened=setup([...ui.storage]);
 assert.equal(read(reopened,'state.config.services[1].fulfillment.managedShare'),0);
});

test('starter replacement requires explicit review and undo preserves custom work',()=>{
 const ui=setup();read(ui,"draft.services[0].name='My custom menu';var oldServices=JSON.stringify(draft.services)");
 ui.click('review-starter',{id:'retail-starter'});assert.match(ui.elements['#modal'].innerHTML,/My custom menu/);
 assert.equal(read(ui,'JSON.stringify(draft.services)===oldServices'),true);
 ui.click('confirm-starter');assert.equal(read(ui,'JSON.stringify(draft.services)===oldServices'),false);
 ui.click('undo-services');assert.equal(read(ui,'JSON.stringify(draft.services)===oldServices'),true);
 ui.click('add-starter',{id:'retail-starter'});assert.equal(read(ui,'draft.services.length'),6);
 assert.equal(read(ui,'draft.services.slice(3).every(s=>s.weight===0)'),true);
 input(ui,'services.0.price',450);assert.equal(read(ui,'serviceUndoDraft'),null);
});

test('same-scope price experiment changes only the draft price and handles a raised design-only fee',()=>{
 const ui=setup();read(ui,'draft.services[1].price=700;draft.services[1].fulfillment.designOnlyPrice=600;var liveBefore=JSON.stringify(state.config)');
 ui.click('price-experiment',{index:'1'});assert.match(ui.elements['#modal'].innerHTML,/does not automatically change inquiry/);assert.doesNotMatch(ui.elements['#modal'].innerHTML,/NaN/);
 ui.click('use-service-price',{index:'1',price:'650'});
 assert.equal(read(ui,'draft.services[1].price'),650);assert.equal(read(ui,'draft.services[1].fulfillment.designOnlyPrice'),600);
 assert.equal(read(ui,'JSON.stringify(state.config)===liveBefore'),true);
});

test('blank and out-of-range print choices remain invalid and cannot be applied',()=>{
 const ui=setup();input(ui,'services.1.fulfillment.managedShare','',true);
 assert.equal(read(ui,'draft.services[1].fulfillment.managedShare'),null);assert.equal(read(ui,'serviceUnit(draft.services[1])'),null);
 ui.click('apply',{mode:'restart'});assert.equal(read(ui,'state.config.services[1].fulfillment.managedShare'),.7);
 input(ui,'services.1.fulfillment.managedShare',101,true);assert.equal(read(ui,'QQ.configIssues(draft).some(v=>v.path.endsWith("managedShare"))'),true);
});

test('added service and unfinished print-choice numbers survive save and reload intact',()=>{
 const ui=setup();ui.click('catalog-package',{id:'seasonal-campaign'});ui.elements['#catalog-price']={value:'925'};ui.click('confirm-catalog-service');
 assert.equal(read(ui,'draft.services.length'),4);input(ui,'services.3.fulfillment.managedShare',101,true);input(ui,'services.3.fulfillment.designOnlyPrice','');
 assert.equal(read(ui,'draft.services[3].fulfillment.managedShare'),1.01);assert.equal(read(ui,'draft.services[3].fulfillment.designOnlyPrice'),null);read(ui,'save()');ui.drainTimers();
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'draft.services.length'),4);assert.equal(read(reopened,'draft.services[3].price'),925);assert.equal(read(reopened,'draft.services[3].spec.packageId'),'seasonal-campaign');assert.equal(read(reopened,'draft.services[3].fulfillment.managedShare'),1.01);assert.equal(read(reopened,'draft.services[3].fulfillment.designOnlyPrice'),null);assert.equal(read(reopened,'state.config.services.length'),3);assert.equal(read(reopened,'QQ.configIssues(draft).some(v=>v.path.endsWith("managedShare"))'),true);assert.equal(read(reopened,'QQ.configIssues(draft).some(v=>v.path.endsWith("designOnlyPrice"))'),true);
});

test('new repeat offerings receive explicit separately quoted campaign cadence',()=>{
 const ui=setup();ui.handlers.change({target:{id:'input-services-0-recurring',type:'select-one',value:'true',dataset:{input:'services.0.recurring'}}});
 assert.equal(read(ui,'draft.services[0].campaign.cadenceDays'),30);
 ui.handlers.change({target:{id:'input-services-0-campaign-cadenceDays',type:'select-one',value:'90',dataset:{input:'services.0.campaign.cadenceDays'}}});
 assert.equal(read(ui,'draft.services[0].campaign.cadenceDays'),90);
 assert.match(ui.elements['#root'].innerHTML,/A declined campaign is skipped/);
});

test('accepted project inspector explains chosen print route and saved quoted options',()=>{
 const ui=setup();read(ui,`var offer=QQServiceCatalog.createService('seasonal-campaign');offer.weight=100;offer.fulfillment.managedShare=0;
 state=QQ.fresh({...QQ.clone(draft),acquisition:'preset',inquiries:40,conversion:1,services:[offer],startingCash:100000});
 for(var day=0;day<30;day++)QQ.step(state);var accepted=state.projects.find(p=>p.accepted!==undefined);`);
 assert.ok(read(ui,'accepted'));ui.click('project',{id:read(ui,'accepted.id')});
 assert.match(ui.elements['#root'].innerHTML,/Customer arranges printing/);
 assert.match(ui.elements['#root'].innerHTML,/Quoted print options/);
 assert.match(ui.elements['#root'].innerHTML,/Seasonal · separately quoted/);
 ui.click('view',{view:'finances'});ui.click('analytics-tab',{tab:'contracts'});
 assert.match(ui.elements['#root'].innerHTML,/Yearly campaign relationship/);
 assert.match(ui.elements['#root'].innerHTML,/Skipped campaigns/);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/Day undefined/);
});
