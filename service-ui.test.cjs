const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);
const input=(ui,path,value,percent=false)=>ui.handlers.input({target:{dataset:{input:path,...(percent?{percent:'true'}:{})},type:'number',value:String(value),id:'input-'+path.replaceAll('.','-')}});

test('fresh service menu has defined scopes and customer printing choice with no live mutation from browsing',()=>{
 const ui=setup(),before=read(ui,'JSON.stringify(state.config)');
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 assert.equal(read(ui,'draft.services.length'),3);assert.match(ui.elements['#root'].innerHTML,/What do you sell\?/);
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

test('price alternatives for a files-only mix edit the quoted fee and show the fixed win assumption',()=>{
 const ui=setup();
 read(ui,'var print=draft.services[1];print.price=400;print.fulfillment.managedShare=0;print.fulfillment.designOnlyPrice=200;draft.conversion=.37;');
 ui.click('price-experiment',{index:'1'});
 const dialog=ui.elements['#modal'].innerHTML;
 assert.match(dialog,/Files-only fee/);
 assert.match(dialog,/Assumed share of first quotes accepted<\/span> <strong>37%/);
 assert.match(dialog,/data-price="230" data-route="files"/);
 ui.click('use-service-price',{index:'1',price:'230',route:'files'});
 assert.equal(read(ui,'draft.services[1].fulfillment.designOnlyPrice'),230);
 assert.equal(read(ui,'draft.services[1].price'),400);
 assert.equal(read(ui,'draft.conversion'),.37);
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
 assert.match(ui.elements['#root'].innerHTML,/Print-ready poster and postcard artwork/);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/Quarterly poster\/postcard campaign, quoted per cycle/);
 assert.match(ui.elements['#root'].innerHTML,/Quoted print options/);
 assert.match(ui.elements['#root'].innerHTML,/Seasonal · separately quoted/);
 ui.click('view',{view:'finances'});ui.click('analytics-tab',{tab:'contracts'});
 assert.match(ui.elements['#root'].innerHTML,/Yearly campaign relationship/);
 assert.match(ui.elements['#root'].innerHTML,/Skipped campaigns/);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/Day undefined/);
});

test('a custom first offer stays unfinished across reload until each required assumption is supplied',()=>{
 const ui=setup();ui.click('start-business');ui.click('enter-setup',{mode:'guided'});
 const first=read(ui,'draft.services[0]');
 assert.equal(first.weight,100);assert.equal(first.name,'');assert.equal(first.deliverable,'');
 for(const key of ['price','hours','review','print'])assert.equal(first[key],null);
 assert.equal(first.supplierMode,'choose');
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/data-input="services\.0\.print"/);
 assert.ok(read(ui,'draftError()'));ui.drainTimers();
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'draft.services[0].price'),null);
 const text=(path,value)=>reopened.handlers.input({target:{dataset:{input:path},type:'text',value,id:'input-'+path.replaceAll('.','-')}});
 text('services.0.name','Audit');text('services.0.deliverable','One written analysis');
 input(reopened,'services.0.price',350);input(reopened,'services.0.hours',0);input(reopened,'services.0.review',1.5);
 reopened.handlers.change({target:{dataset:{input:'services.0.supplierMode'},id:'input-services-0-supplierMode',type:'select-one',value:'none'}});
 assert.equal(read(reopened,'draft.services[0].print'),0);assert.equal(read(reopened,'draftError()'),'');
 reopened.click('apply',{mode:'restart'});assert.equal(read(reopened,'state.config.services[0].name'),'Audit');
});

test('parked custom offers survive edits, month runs and workspace recovery without affecting demand',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('add-blank-service');
 const parked=read(ui,'draft.services.at(-1).id');
 assert.equal(read(ui,'dirty()'),false);assert.equal(read(ui,'draftError()'),'');
 assert.equal(read(ui,'draftRunConfig().services.length'),3);assert.equal(read(ui,'draft.services.length'),4);
 input(ui,'services.0.price',375);ui.click('apply',{mode:'restart'});ui.click('finish');ui.drainTimers();
 assert.equal(read(ui,'state.day'),30);assert.equal(read(ui,'draft.services.at(-1).id'),parked);
 assert.equal(read(ui,'state.config.services.length'),3);assert.equal(read(ui,'state.config.services[0].price'),375);
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'draft.services.at(-1).id'),parked);assert.equal(read(reopened,'draft.services.at(-1).price'),null);
 assert.equal(read(reopened,'MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives)).draft.services.at(-1).id'),parked);
});

test('mix editor shows effective audience shares, paired route costs and one group-level correction',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 const html=ui.elements['#root'].innerHTML;
 for(const value of ['32%','24%','44%'])assert.ok(html.includes(value+' of all new inquiries'));
 assert.match(html,/\$395 price · \$185 direct cost/);assert.match(html,/\$275 price · \$90 direct cost/);
 const q=require('./engine.js'),draft=JSON.parse(read(ui,'JSON.stringify(draft)'));
 const onlyFood={...draft.services[0],weight:100};const e=q.estimate({...draft,services:[onlyFood],acquisition:'preset',inquiries:0});
 assert.equal(e.services[0].effectiveShare,.8);assert.equal(e.unservedShare,.2);
 input(ui,'services.0.weight',39);
 assert.match(ui.elements['#root'].innerHTML,/1% left to assign/);
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/aria-invalid="true"/);
 ui.click('assign-remainder',{index:'1'});assert.equal(read(ui,'JSON.stringify(draft.services.map(s=>s.weight))'),'[39,31,30]');
 assert.equal(read(ui,'draftError()'),'');
});

test('guided setup keeps weights together and takes an inactive offer directly to its own weight',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('add-blank-service');
 const html=ui.elements['#root'].innerHTML,mix=html.indexOf('<details class="inquiry-mix"');
 assert.ok(mix>0);assert.doesNotMatch(html.slice(0,mix),/data-input="services\.\d+\.weight"/);
 assert.equal([...html.slice(mix).matchAll(/data-input="services\.\d+\.weight"/g)].length,4);
 let focused=false;const section={open:false};
 ui.elements['[data-input="services.3.weight"]']={closest:()=>section,focus(){focused=true;}};
 ui.click('edit-inquiry-weight',{index:'3'});
 assert.ok(focused&&section.open);assert.equal(read(ui,'draft.services[3].weight'),0);
 input(ui,'services.0.weight',35);
 ui.elements['#mix-recipient']={value:'2'};ui.click('assign-remainder');
 assert.equal(read(ui,'JSON.stringify(draft.services.map(s=>s.weight))'),'[35,30,35,0]');
});

test('removing and restoring draft offers keeps their identity, evidence and newer edits',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 read(ui,`var original=JSON.stringify(state.config),offer=draft.services[1],path='services.'+offer.id+'.price';
   draft.assumptionRecords={[path]:{source:'Supplier quote',sample:'One order',date:'2026-11-01',value:offer.price}};`);
 const id=read(ui,'offer.id');
 ui.click('remove-service',{id});
 assert.equal(read(ui,'draft.assumptionRecords'),undefined);
 assert.equal(read(ui,'JSON.stringify(draft.services.map(s=>s.weight))'),'[57.14,42.86]');
 assert.equal(read(ui,'JSON.stringify(state.config)'),read(ui,'original'));
 input(ui,'services.0.price',410);
 const nextId=read(ui,'draft.services[1].id');
 ui.click('remove-service',{id:nextId});
 assert.match(ui.elements['#root'].innerHTML,/Keep one service/);
 ui.click('remove-service',{id:read(ui,'draft.services[0].id')});
 assert.equal(read(ui,'draft.services.length'),1);
 ui.click('restore-service');ui.click('restore-service');
 assert.equal(read(ui,'draft.services[1]===offer'),true);
 assert.equal(read(ui,'draft.services[0].price'),410);
 assert.equal(read(ui,'draft.assumptionRecords[path].source'),'Supplier quote');
 assert.equal(read(ui,'JSON.stringify(state.config)'),read(ui,'original'));
 const reopened=setup([...ui.storage]);
 assert.equal(read(reopened,'draft.services[1].id'),id);
 assert.equal(read(reopened,'draft.services[0].price'),410);
 assert.equal(read(reopened,'draftError()'),'');
 ui.click('remove-service',{id});ui.click('discard');
 assert.doesNotMatch(ui.elements['#root'].innerHTML,/id="undo-service-removal"/);
});
