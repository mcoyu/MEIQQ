const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js'),presets=require('./presets.js'),vm=require('node:vm');
const {setup,startBalancedRestaurant}=require('./ui-test-host.cjs');

test('every local scenario recipe produces a valid transparent configuration',()=>{
 let count=0;const distinct=new Set();
 for(const market of presets.MARKETS)for(const operation of presets.OPERATIONS)for(const mix of presets.MIXES)for(const condition of presets.CONDITIONS){
  const config=presets.compose({market:market.id,operation:operation.id,mix:mix.id,condition:condition.id},q.DEFAULT);
  assert.doesNotThrow(()=>q.validateConfig(config),`${market.id}/${operation.id}/${mix.id}/${condition.id}`);
  assert.equal(config.services.reduce((n,v)=>n+v.weight,0),100);
  assert.equal(Object.values(config.customerMix).reduce((n,v)=>n+v,0),100);
  const assumptions=q.clone(config);delete assumptions.name;delete assumptions.recipe;distinct.add(JSON.stringify(assumptions));
  count++;
 }
 assert.equal(count,6*4*6*5);
 assert.equal(distinct.size,4*6*5,'location supplies context without changing the operational assumptions');
});

test('market, operation, shop mix and conditions vary independent assumptions',()=>{
 const base={market:'metro',operation:'solo',mix:'balanced',condition:'steady'};
 const detroit=presets.compose({...base,market:'detroit'},q.DEFAULT),royalOak=presets.compose({...base,market:'royaloak'},q.DEFAULT);
 assert.equal(detroit.leadsPerHour,royalOak.leadsPerHour);assert.equal(detroit.paymentDays,royalOak.paymentDays);assert.equal(detroit.conversion,royalOak.conversion);assert.deepEqual(detroit.services,q.DEFAULT.services);
 const side=presets.compose({...base,operation:'side'},q.DEFAULT),growth=presets.compose({...base,operation:'growth'},q.DEFAULT);
 assert.ok(side.ownerHours<growth.ownerHours);assert.ok(side.designers<growth.designers);assert.equal(side.startingCash,growth.startingCash);assert.ok(side.outreachHours<growth.outreachHours);
 const food=presets.compose({...base,mix:'food'},q.DEFAULT),services=presets.compose({...base,mix:'services'},q.DEFAULT);
 assert.ok(food.customerMix.food>services.customerMix.food);assert.ok(services.customerMix.services>food.customerMix.services);
 const slow=presets.compose({...base,condition:'slow'},q.DEFAULT),busy=presets.compose({...base,condition:'busy'},q.DEFAULT);
 assert.ok(slow.leadsPerHour<busy.leadsPerHour);assert.ok(slow.conversion<busy.conversion);assert.ok(slow.paymentDays>royalOak.paymentDays);assert.ok(busy.leadDays>slow.leadDays);
});

test('operating reach keeps steady recipes plausible while surge conditions create intentional pressure',()=>{
 const steadyLoads=[],campaignLoads=[];
 for(const market of presets.MARKETS)for(const operation of presets.OPERATIONS)for(const mix of presets.MIXES){
  const select={market:market.id,operation:operation.id,mix:mix.id};
  const steady=q.estimate(presets.compose({...select,condition:'steady'},q.DEFAULT)),campaign=q.estimate(presets.compose({...select,condition:'campaign'},q.DEFAULT));
  steadyLoads.push(Math.max(steady.ownerLoad,steady.designLoad));campaignLoads.push(Math.max(campaign.ownerLoad,campaign.designLoad));
 }
 assert.ok(Math.max(...steadyLoads)<2,'steady recipes should not begin at catastrophic multi-year capacity loads');
 assert.ok(campaignLoads.every((load,index)=>load>steadyLoads[index]),'campaigns should create more capacity pressure');
});

test('shop focus controls profile variation without rewriting service terms',()=>{
 for(const mix of presets.MIXES){
  const steady=presets.compose({market:'metro',operation:'solo',mix:mix.id,condition:'steady'},q.DEFAULT),campaign=presets.compose({market:'metro',operation:'solo',mix:mix.id,condition:'campaign'},q.DEFAULT);
  assert.equal(steady.profileStrength,mix.profileStrength);assert.equal(campaign.profileStrength,mix.profileStrength);
  assert.deepEqual(steady.services,q.DEFAULT.services);assert.deepEqual(campaign.services,q.DEFAULT.services);
 }
});

test('recipes preserve custom services, identity, cash and horizon',()=>{
 const reordered=q.clone(q.DEFAULT);reordered.services.reverse();
 reordered.name='My studio';reordered.seed=99;reordered.months=6;reordered.startingCash=1234;
 const config=presets.compose({market:'metro',operation:'solo',mix:'restaurant',condition:'steady'},reordered);
 assert.deepEqual(config.services,reordered.services);for(const key of ['name','seed','months','startingCash'])assert.equal(config[key],reordered[key]);
});

test('unknown browser preferences fall back to a safe valid recipe',()=>{
 const config=presets.compose({market:'missing',operation:'missing',mix:'missing',condition:'missing'},q.DEFAULT),description=presets.describe({market:'missing',operation:'missing',mix:'missing',condition:'missing'});
 assert.doesNotThrow(()=>q.validateConfig(config));assert.equal(description.market.id,presets.MARKETS[0].id);assert.equal(description.operation.id,presets.OPERATIONS[0].id);assert.equal(description.mix.id,presets.MIXES[0].id);assert.equal(description.condition.id,presets.CONDITIONS[0].id);
});

test('torn or malformed preference payloads fall back compositionally',()=>{
 for(const selection of [null,undefined,'steady',42,true,[]]){
  const config=presets.compose(selection,q.DEFAULT),description=presets.describe(selection);
  assert.doesNotThrow(()=>q.validateConfig(config));
  assert.equal(description.market.id,presets.MARKETS[0].id);assert.equal(description.operation.id,presets.OPERATIONS[0].id);
  assert.equal(description.mix.id,presets.MIXES[0].id);assert.equal(description.condition.id,presets.CONDITIONS[0].id);
 }
 const partial=presets.compose({market:'dearborn'},q.DEFAULT);
 assert.equal(partial.name,q.DEFAULT.name);assert.doesNotThrow(()=>q.validateConfig(partial));
});

test('using a recipe changes only the saved draft until explicit apply',()=>{
 const {ctx,click,elements,storage,handlers}=setup();
 const expected=presets.compose({market:'dearborn',operation:'solo',mix:'food',condition:'steady'},q.DEFAULT);
 handlers.change({target:{id:'preset-market',value:'dearborn',dataset:{}}});
 handlers.change({target:{id:'preset-mix',value:'food',dataset:{}}});
 click('apply-preset');
 assert.match(elements['#modal'].innerHTML,/Load this recipe into your draft/);
 assert.equal(vm.runInContext('draft.inquiries',ctx),45);
 click('confirm-preset');
 assert.equal(vm.runInContext('state.config.inquiries',ctx),45);
 assert.equal(vm.runInContext('draft.inquiries',ctx),expected.inquiries);
 assert.equal(vm.runInContext('draft.customerMix.food',ctx),expected.customerMix.food);
 assert.match(elements['#root'].innerHTML,/90-day estimate/);
 assert.match(elements['#root'].innerHTML,/Undo recipe/);
 assert.ok(storage.get('qq-studio-lab-v1'));
 vm.runInContext('review()',ctx);assert.match(elements['#modal'].innerHTML,/Apply your business setup/);
});
test('recipe UI preserves a custom catalog before replacing only scoped settings',()=>{
 const {ctx,elements,click}=setup();
 vm.runInContext(`draft.services=[{...QQ.clone(draft.services[0]),id:'custom-catalog-item',name:'Custom retained service'}];render()`,ctx);click('apply-preset');
 click('confirm-preset');assert.equal(vm.runInContext('draft.services[0].id',ctx),'custom-catalog-item');assert.equal(vm.runInContext('draft.services.length',ctx),1);
});

test('recipe loading preserves seed and horizon and can restore the prior draft',()=>{
 const {ctx,click}=setup();
 vm.runInContext('draft.seed=9981;draft.months=6;draft.ownerHours=17',ctx);
 click('apply-preset');click('confirm-preset');
 assert.equal(vm.runInContext('draft.seed',ctx),9981);assert.equal(vm.runInContext('draft.months',ctx),6);
 assert.notEqual(vm.runInContext('draft.ownerHours',ctx),17);
 click('undo-preset');
 assert.equal(vm.runInContext('draft.ownerHours',ctx),17);assert.equal(vm.runInContext('draft.seed',ctx),9981);assert.equal(vm.runInContext('draft.months',ctx),6);
});

test('both detail modes keep one draft preview and open a separate scenario comparison on request',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 const html=()=>ui.elements['#root'].innerHTML;
 for(const mode of ['guided','analyst']){
  ui.click('setup-density',{mode});
  assert.match(html(),/After owner time/);assert.match(html(),/Try a scenario/);
  assert.doesNotMatch(html(),/id="preset-market"/);
  ui.click('toggle-recipe');assert.match(html(),/id="preset-market"/);assert.match(html(),/Inspect recipe sources/);
  assert.equal((html().match(/Assumes delivery of all expected new orders/g)||[]).length,1);
  ui.click('toggle-recipe');
 }
});

test('preset selection persists independently from the workspace',()=>{
 const first=setup();first.handlers.change({target:{id:'preset-market',value:'annarbor',dataset:{}}});first.handlers.change({target:{id:'preset-condition',value:'campaign',dataset:{}}});
 const next=setup([...first.storage]);
 assert.equal(vm.runInContext('presetSelection.market',next.ctx),'annarbor');assert.equal(vm.runInContext('presetSelection.condition',next.ctx),'campaign');
 assert.equal(vm.runInContext('state.config.inquiries',next.ctx),45);
});

test('unknown browser recipe preferences fall back without breaking setup',()=>{
 const ui=setup([['qq-studio-preset-selection',JSON.stringify({market:'missing',operation:'growth',mix:'unknown',condition:'steady'})]]);
 assert.equal(vm.runInContext('presetSelection.market',ui.ctx),'metro');
 assert.equal(vm.runInContext('presetSelection.operation',ui.ctx),'growth');
 assert.equal(vm.runInContext('presetSelection.mix',ui.ctx),'balanced');
 assert.equal(vm.runInContext('presetSelection.condition',ui.ctx),'steady');
 assert.match(ui.elements['#root'].innerHTML,/Restaurant example/);
});

test('source register is explicit, official and safe to embed offline',()=>{
 assert.ok(presets.SOURCES.length>=6);
 const urls=new Set(),ids=new Set(),officialHosts=new Set(['www.census.gov','www.bls.gov','www.michigan.gov','detroitmi.gov','www.a2gov.org','www.romi.gov']);
 for(const source of presets.SOURCES){
 assert.match(source.id,/^[a-z0-9.-]+$/);assert.equal(ids.has(source.id),false);ids.add(source.id);
  assert.equal(typeof source.label,'string');assert.ok(source.label.length>12);
  for(const field of ['scope','supports','doesNotSupport'])assert.ok(typeof source[field]==='string'&&source[field].length>12,`${source.id} needs ${field}`);
  const url=new URL(source.url);assert.equal(url.protocol,'https:');
  assert.ok(officialHosts.has(url.hostname)||['www.stats.gov.cn','www.upwork.com','blog.hubspot.com'].includes(url.hostname),`${source.id} must use a reviewed source host`);
  assert.equal(urls.has(source.url),false);urls.add(source.url);
 }
 assert.ok(presets.SOURCES.some(v=>v.id==='public.census.quickfacts.2020-2024'));
 assert.ok(presets.SOURCES.some(v=>v.id==='public.bls.detroit-wages.2025-05'));
 assert.ok(presets.SOURCES.some(v=>v.id==='public.china-nbs.urban-wages.2025'));assert.ok(presets.SOURCES.some(v=>v.id==='marketplace.upwork.graphic-design.2026'));
});

test('recipe catalog is four legible decisions rather than an opaque option list',()=>{
 const dimensions=[presets.MARKETS,presets.OPERATIONS,presets.MIXES,presets.CONDITIONS];
 assert.deepEqual(dimensions.map(v=>v.length),[6,4,6,5]);
 for(const rows of dimensions){
  assert.equal(new Set(rows.map(v=>v.id)).size,rows.length);
  assert.equal(new Set(rows.map(v=>v.name)).size,rows.length);
  for(const row of rows){assert.ok(row.name.length>=8);assert.ok(row.note.length>=30);}
 }
});

test('new workspace uses the conservative active-outreach funnel and audits every leaf',()=>{
 const config=presets.newWorkspaceConfig(q.DEFAULT),report=presets.audit(config);
 assert.equal(config.acquisition,'sales');assert.equal(config.outreachHours,4);assert.equal(config.leadsPerHour,.3);assert.equal(config.conversion,.3);assert.equal(config.ownerHours,15);assert.equal(config.designerRate,18);
 assert.ok(Math.abs(4*4.4*6*.05-5.28)<1e-9);assert.ok(Math.abs(5.28*.3-1.584)<1e-9);
 assert.ok(Object.values(config.disruptions).every(Boolean));assert.deepEqual(config.disruptionRates,{rushDeadlines:.1,supplierReprints:.03,repeatedRevisions:.15,extendedLatePayments:.15});
 assert.equal(report.compatible,true);assert.equal(report.coverage,1);assert.equal(report.edited.length,0);assert.equal(report.empiricallyCalibrated,false);assert.ok(report.lineage.length>60);assert.ok(report.lineage.every(row=>row.recordIds.length&&row.derivation));
 config.services[0].price+=1;assert.ok(presets.audit(config).edited.includes('services.0.price'));
});

test('the restaurant example serves the buyer mix named in setup and keeps the generic business separate',()=>{
 const ui=setup(),read=expression=>vm.runInContext(expression,ui.ctx);
 ui.click('start-restaurant');
 assert.match(ui.elements['#root'].innerHTML,/80% of inquiries come from food businesses, 10% from retailers and 10% from local services/);
 ui.click('enter-setup',{mode:'guided'});
 const restaurant=JSON.parse(read('JSON.stringify(draft)'));
 assert.equal(restaurant.recipe.mix,'restaurant');
 assert.equal(restaurant.focusType,'dining');
 assert.deepEqual(restaurant.customerMix,{food:80,retail:10,services:10});
 assert.equal(presets.audit(restaurant).edited.length,0);
 assert.deepEqual(q.estimate(restaurant).services.map(row=>[row.id,Math.round(row.effectiveShare*100)]),
  [['menu-refresh',32],['table-tents-100',24],['monthly-promo-5',44]]);
 for(const offer of restaurant.services)assert.ok(offer.spec.scope.length);
 ui.click('new-scenario');ui.click('start-business');ui.click('enter-setup',{mode:'guided'});
 assert.equal(read('draft.recipe.mix'),'balanced');
 assert.equal(read('draft.focusType'),'none');
 assert.equal(read('draft.services.length'),1);
 assert.equal(read('draft.services[0].price'),null);
});

test('the earlier restaurant starter resumes with its own mix, lineage and offer routing',()=>{
 const ui=setup();
 startBalancedRestaurant(ui);
 vm.runInContext('save()',ui.ctx);ui.drainTimers();
 const reopened=setup([...ui.storage]);
 reopened.click('start-restaurant');
 assert.match(reopened.elements['#root'].innerHTML,/45% of inquiries come from food businesses, 30% from retailers and 25% from local services/);
 reopened.click('enter-setup',{mode:'guided'});
 const config=JSON.parse(vm.runInContext('JSON.stringify(draft)',reopened.ctx));
 assert.equal(config.recipe.mix,'balanced');
 assert.deepEqual(config.customerMix,{food:45,retail:30,services:25});
 assert.ok(Math.abs(q.estimate(config).services.find(row=>row.id==='monthly-promo-5').effectiveShare-.685)<1e-8);
 assert.equal(presets.audit(config).edited.length,0);
});

test('frozen evidence hashes and ledger projection are reproducible',()=>{
 const crypto=require('node:crypto'),hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
 for(const record of presets.EVIDENCE_RECORDS)assert.equal(record.sha256,hash(record.snapshot),record.id);
 const projection=presets.EVIDENCE_RECORDS.map(({id,kind,sourceDate,retrieved,snapshot})=>({id,kind,sourceDate,retrieved,snapshot}));assert.equal(presets.CATALOG.ledgerHash,hash(projection));
});

test('recipe values survive browser reopen, apply and workspace export',()=>{
 const first=setup(),{ctx,click,handlers,storage,drainTimers}=first;
 vm.runInContext('draft.seed=987654;draft.months=3',ctx);
 handlers.change({target:{id:'preset-market',value:'royaloak',dataset:{}}});
 handlers.change({target:{id:'preset-operation',value:'growth',dataset:{}}});
 handlers.change({target:{id:'preset-mix',value:'retail',dataset:{}}});
 handlers.change({target:{id:'preset-condition',value:'campaign',dataset:{}}});
 click('apply-preset');click('confirm-preset');
 assert.equal(vm.runInContext('state.config.inquiries',ctx),45,'a recipe must remain draft-only before apply');
 assert.equal(vm.runInContext('draft.seed',ctx),987654,'loading a recipe must retain the chosen workload identity');
 assert.equal(vm.runInContext('draft.months',ctx),3,'loading a recipe must retain the chosen horizon');
 const expected=vm.runInContext('JSON.stringify(draft)',ctx);
 vm.runInContext('save()',ctx);drainTimers();
 const reopened=setup([...storage]);
 assert.equal(vm.runInContext('JSON.stringify(draft)',reopened.ctx),expected);
 assert.equal(vm.runInContext('presetSelection.market',reopened.ctx),'royaloak');
 assert.equal(vm.runInContext('presetSelection.condition',reopened.ctx),'campaign');
 vm.runInContext('review()',reopened.ctx);reopened.click('apply',{mode:'future'});
 assert.equal(vm.runInContext('state.config.name',reopened.ctx),'Restaurant studio example');
 assert.equal(vm.runInContext('state.config.seed',reopened.ctx),987654);
 const exported=vm.runInContext('MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives))',reopened.ctx);
 assert.equal(JSON.stringify(exported.state.config),JSON.stringify(exported.draft));
 assert.equal(exported.state.config.name,'Restaurant studio example');assert.equal(exported.state.config.recipe.catalog,'metro-detroit-2026-v2');assert.equal(exported.state.config.recipe.version,2);assert.equal(presets.audit(exported.state.config).coverage,1);
 assert.equal(Object.hasOwn(exported,'presetSelection'),false,'backup schema stores composed values, not the browser recipe preference');
});

test('workspace import retains composed draft values without importing recipe preference',()=>{
 const source=setup();
 const expected=presets.compose({market:'detroit',operation:'side',mix:'balanced',condition:'stress'},JSON.parse(vm.runInContext('JSON.stringify(draft)',source.ctx)));
 source.handlers.change({target:{id:'preset-market',value:'detroit',dataset:{}}});
 source.handlers.change({target:{id:'preset-operation',value:'side',dataset:{}}});
 source.handlers.change({target:{id:'preset-condition',value:'stress',dataset:{}}});
 source.click('apply-preset');source.click('confirm-preset');
 const payload=vm.runInContext('JSON.parse(MEIQQWorkspace.serialize(currentWorkspace(),archives))',source.ctx);
 const target=setup();
 target.ctx.payload=payload;
 vm.runInContext('pendingImport=parseBackup(payload)',target.ctx);target.click('confirm-import');
 assert.equal(vm.runInContext('draft.name',target.ctx),'Restaurant studio example');
 assert.equal(vm.runInContext('draft.inquiries',target.ctx),expected.inquiries);
 assert.equal(vm.runInContext('JSON.stringify(draft.customerMix)',target.ctx),JSON.stringify(expected.customerMix));
 assert.equal(vm.runInContext('JSON.stringify(draft.recipe)',target.ctx),JSON.stringify(expected.recipe));
 assert.equal(vm.runInContext('presetSelection.market',target.ctx),'metro');
 assert.equal(vm.runInContext('presetSelection.operation',target.ctx),'solo');
});
