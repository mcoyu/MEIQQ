const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const q=require('./engine.js'),w=require('./workspace.js'),{setup}=require('./ui-test-host.cjs');

function run(config,days){const s=q.fresh(config);for(let i=0;i<days;i++)assert.equal(q.step(s),true);return s;}

test('new inquiries cover distinct local business types and keep unique customer identities',()=>{
 const c={...q.clone(q.DEFAULT),months:3,startingCash:100000,ownerHours:80,designerHours:80};
 const a=run(c,30),b=run(c,30);
 assert.deepEqual(a,b);
 assert.ok(new Set(a.projects.map(p=>p.clientType)).size>=10);
 assert.ok(a.projects.some(p=>p.clientType==='tea'||p.clientType==='noodle'));
 assert.equal(new Set(a.projects.map(p=>p.client)).size,a.projects.length);
 assert.ok(a.projects.every(p=>p.demandId&&p.clientId&&p.brief));
 assert.equal(a.clients.length,new Set(a.projects.map(p=>p.clientId)).size);
 assert.deepEqual(q.restore(a),a);
});

test('customer mix and niche focus change the type of inquiry without changing its identity',()=>{
 const c={...q.clone(q.DEFAULT),months:3,inquiries:300,customerMix:{food:100,retail:0,services:0},focusType:'tea',startingCash:100000};
 const s=run(c,30),tea=s.projects.filter(p=>p.clientType==='tea').length;
 assert.ok(tea>100&&tea<s.projects.length);
 assert.ok(s.projects.every(p=>q.CUSTOMER_TYPES.find(t=>t.id===p.clientType).group==='food'));
 assert.equal(q.estimate(c).orders,300*c.conversion);
});

test('targeted offerings leave unmatched inquiries unserved and the preview accounts for them',()=>{
 const c=q.clone(q.DEFAULT);c.months=3;c.inquiries=90;c.customerMix={food:0,retail:100,services:0};
 c.services=[{...c.services[0],weight:100,audience:'food'}];
 const s=run(c,30),e=q.estimate(c);
 assert.equal(s.projects.length,0);assert.equal(s.unserved,90);
 assert.equal(e.unserved,90);assert.equal(e.orders,0);assert.equal(e.revenue,0);
 assert.deepEqual(q.restore(s),s);
 const invalid=q.clone(s);invalid.unserved=-1;assert.throws(()=>q.restore(invalid),/Unserved inquiry/);
});

test('returning clients retain their business identity and locked project terms',()=>{
 const c={...q.clone(q.DEFAULT),months:6,startingCash:100000,ownerHours:80,designerHours:80,repeat:1,retention:1,profileStrength:1};
 const s=run(c,90),returning=s.projects.find(p=>p.renewal&&p.clientType);
 assert.ok(returning);
 const original=s.clients.find(c=>c.id===returning.clientId),contract=s.contracts.find(c=>c.id===returning.contractId);
 assert.equal(returning.client,original.name);assert.equal(returning.clientType,original.type);
 assert.equal(contract.clientId,returning.clientId);assert.ok(returning.cycle>=2);
 const prof=q.CUSTOMER_TYPES.find(t=>t.id===returning.clientType);
 if(returning.accepted!==undefined)assert.equal(returning.terms.approvalDays,c.approvalDays+prof.approval);
 assert.deepEqual(q.restore(s),s);
 const backup=w.parseText(w.serialize({state:s,saved:[],draft:q.clone(c),checkpointInfo:[],recoveryFiles:[]}));
 assert.deepEqual(backup.state,s);
 const forged=q.clone(s);forged.projects.find(p=>p.id===returning.id).clientId='missing';
 assert.throws(()=>q.restore(forged),/client identity/);
});

test('older workspaces retain generic behavior until business profiles are enabled',()=>{
 const c=q.clone(q.DEFAULT);delete c.customerMix;delete c.profileStrength;delete c.focusType;
 const s=run(c,10);assert.ok(s.projects.length);assert.ok(s.projects.every(p=>p.clientType===undefined));
 assert.deepEqual(q.restore(s),s);
 const ui=setup();vm.runInContext('delete draft.customerMix;delete draft.profileStrength;delete draft.focusType',ui.ctx);
 ui.click('enable-profiles');assert.equal(vm.runInContext('draft.customerMix.food',ui.ctx),55);
 assert.equal(vm.runInContext('draft.profileStrength',ui.ctx),.5);
});

test('editable service templates start at zero share and respect business suitability',()=>{
 const ui=setup();ui.elements['#service-template']={value:'menu'};ui.click('add-service');
 const last=vm.runInContext('draft.services.at(-1)',ui.ctx);
 assert.equal(last.name,'Menu refresh · print-ready');assert.equal(last.audience,'food');assert.equal(last.weight,0);
 assert.match(vm.runInContext('customerInputs()',ui.ctx),/Focus on one niche/);
 const invalid=q.clone(q.DEFAULT);invalid.customerMix={food:20,retail:20,services:20};
 assert.throws(()=>q.validateConfig(invalid),/Customer shares/);
});
