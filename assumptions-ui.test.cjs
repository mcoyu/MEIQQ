const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

test('a new workspace automatically uses the conservative outreach baseline with traceable defaults',()=>{
 const ui=setup();
 assert.equal(vm.runInContext('state.config.acquisition',ui.ctx),'sales');
 assert.equal(vm.runInContext('state.config.outreachHours',ui.ctx),4);
 assert.equal(vm.runInContext('state.config.leadsPerHour',ui.ctx),.30);
 assert.equal(vm.runInContext('state.config.conversion',ui.ctx),.30);
 assert.equal(vm.runInContext('state.config.designerRate',ui.ctx),18);
 assert.equal(vm.runInContext('QQ.estimate(state.config).orders',ui.ctx),1.584);
 ui.click('current-evidence');
 assert.match(ui.elements['#modal'].innerHTML,/services\.0\.price/);
 assert.match(ui.elements['#modal'].innerHTML,/low confidence/);
});

test('recipe merge preserves custom service economics and user identity through apply and reopen',()=>{
 const ui=setup();
 vm.runInContext(`draft.name='My shop';draft.seed=718;draft.months=3;draft.startingCash=9234;draft.services=[{...draft.services[0],id:'custom',name:'Custom menu',price:415,hours:7,print:55,weight:100}];var originalServices=JSON.stringify(draft.services);`,ui.ctx);
 ui.handlers.change({target:{id:'preset-market',value:'dearborn',dataset:{}}});
 ui.click('apply-preset');
 assert.match(ui.elements['#modal'].innerHTML,/custom services.*preserved/);
 ui.click('confirm-preset');
 assert.equal(vm.runInContext('JSON.stringify(draft.services)===originalServices',ui.ctx),true);
 assert.equal(vm.runInContext('draft.name',ui.ctx),'My shop');
 assert.equal(vm.runInContext('draft.startingCash',ui.ctx),9234);
 assert.equal(vm.runInContext('draft.acquisition',ui.ctx),'sales');
 ui.click('apply',{mode:'restart'});
 const reopened=setup([...ui.storage]);
 assert.equal(vm.runInContext('state.config.services[0].price',reopened.ctx),415);
 assert.equal(vm.runInContext('state.config.seed',reopened.ctx),718);
});

test('disruption frequencies edit the draft, appear in review and survive unfinished backups',()=>{
 const ui=setup();
 vm.runInContext("draft.realism=true;draft.disruptions.supplierReprints=true;stepIndex=3;render()",ui.ctx);
 assert.match(ui.elements['#root'].innerHTML,/Real-life disruptions/);
 ui.handlers.input({target:{dataset:{input:'disruptionRates.supplierReprints',percent:'true'},type:'number',value:'9',id:'input-disruptionRates-supplierReprints'}});
 assert.equal(vm.runInContext('draft.disruptionRates.supplierReprints',ui.ctx),.09);
 ui.click('review');assert.match(ui.elements['#modal'].innerHTML,/Share affected · Supplier reprints/);assert.match(ui.elements['#modal'].innerHTML,/9%/);
 ui.handlers.input({target:{dataset:{input:'disruptionRates.supplierReprints',percent:'true'},type:'number',value:'',id:'input-disruptionRates-supplierReprints'}});
 assert.equal(vm.runInContext('draft.disruptionRates.supplierReprints',ui.ctx),null);
 assert.equal(vm.runInContext('MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives)).draft.disruptionRates.supplierReprints',ui.ctx),null);
});

test('malformed saved disruption drafts are retained for recovery instead of breaking setup',()=>{
 const ui=setup();
 vm.runInContext("var broken=currentWorkspace();broken.draft.disruptions='bad';var recovered=MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(broken));",ui.ctx);
 assert.equal(vm.runInContext('recovered.recoveryFiles.length',ui.ctx),1);
 assert.equal(vm.runInContext('typeof recovered.draft.disruptions',ui.ctx),'object');
});
