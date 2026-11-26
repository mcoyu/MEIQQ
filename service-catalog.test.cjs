const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js'),catalog=require('./service-catalog.js'),presets=require('./presets.js');
const opportunities=catalog.SERVICES.filter(service=>service.spec.catalogId===catalog.OPPORTUNITY_CATALOG.id);

test('new offerings preserve the frozen legacy scopes, economics and starter mixes',()=>{
 const legacy=catalog.SERVICES.filter(service=>service.spec.catalogId===catalog.CATALOG.id);
 const derivations=Object.fromEntries(legacy.map(service=>[service.id,catalog.DERIVATIONS[service.id]]));
 const frozen=JSON.stringify({services:legacy,derivations,bundles:catalog.BUNDLES});
 assert.equal(require('node:crypto').createHash('sha256').update(frozen).digest('hex'),'ed120aba96b52d5f1701e99cd307a93b0bada558475d2276c81d2b0d563c919b');
 assert.ok(opportunities.length>=26);
 assert.equal(new Set(catalog.SERVICES.map(item=>item.id)).size,catalog.SERVICES.length);
 assert.ok(opportunities.every(service=>service.weight===0));
 assert.equal(catalog.recommendation('no-such-package'),null);
 for(const id of catalog.FEATURED_IDS)assert.ok(catalog.recommendation(id));
});

test('planning records, workflow references and print-price observations retain their own provenance',()=>{
 for(const service of opportunities){
  const audit=catalog.auditService(service);
  assert.equal(audit.compatible,true);assert.deepEqual(audit.edited,[]);
  assert.equal(audit.records.length,service.spec.evidenceIds.length);
  assert.ok(audit.records.some(record=>record.kind==='planning-assumptions'));
  for(const record of audit.records)assert.equal(q.recipeFingerprint(record.observations),record.observationHash);
  if(service.print)assert.ok(audit.records.some(record=>record.kind==='printer-price-list'));
  const wrong=catalog.createService(service.id);wrong.spec.catalogId=catalog.CATALOG.id;
  assert.equal(catalog.auditService(wrong).compatible,false);
 }
});

test('each new package can be priced, sold and restored with its accepted terms and an independent editable draft',()=>{
 const workspace=require('./workspace.js');
 for(const item of opportunities){
  const offer=catalog.createService(item.id);offer.weight=100;offer.price+=25;
  const audience=offer.audience==='all'?'services':offer.audience;
  const customerMix={food:0,retail:0,services:0,[audience]:100};
  const config={...q.clone(q.DEFAULT),months:1,startingCash:10000,realism:false,acquisition:'preset',
   inquiries:10,conversion:1,profileStrength:0,focusType:'none',customerMix,services:[offer]};
  assert.deepEqual(q.configIssues(config),[],item.id);
  const state=q.fresh(config);for(let day=0;day<30;day++)assert.ok(q.step(state));
  const won=state.projects.find(project=>project.accepted!==undefined);
  assert.equal(won?.service.spec.packageId,item.id);assert.equal(won.service.price,item.price+25);
  const draft=q.clone(config);draft.services[0].price=null;
  const saved=workspace.parseText(workspace.serialize({state,draft,saved:[],checkpointInfo:[],recoveryFiles:[]}));
  assert.deepEqual(saved.state,q.restore(state));assert.deepEqual(saved.draft,draft);
  assert.deepEqual(saved.recoveryFiles,[]);assert.deepEqual(catalog.auditService(offer).edited,['price']);
 }
});

test('all packages have localized decision guidance and new scopes translate with the standalone script order',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),ctx=vm.createContext({document:{documentElement:{}}});
 for(const name of ['zh-CN.js','i18n.js','service-catalog.js'])vm.runInContext(fs.readFileSync(name,'utf8'),ctx);
 ctx.QQI18n.choose('zh-CN');
 for(const item of catalog.SERVICES){
  const guide=catalog.recommendation(item.id);assert.ok(Object.isFrozen(guide));
  const copy=[guide.buyer,guide.benefit,guide.inputs,guide.boundary];
  if(item.spec.catalogId===catalog.OPPORTUNITY_CATALOG.id){
   copy.push(item.name,item.spec.scope,...item.spec.deliverables,catalog.DERIVATIONS[item.id].explanation);
   if(item.filesOnlyScope)copy.push(item.filesOnlyScope);
  }
  for(const value of copy)assert.match(ctx.QQI18n.text(value),/[\u3400-\u9fff]/,item.id+' · '+value);
 }
});

test('starter bundles are focused valid mixes with immutable catalog provenance',()=>{
 for(const bundle of catalog.BUNDLES){
  const services=catalog.starterServices(bundle.id);assert.equal(services.length,3);assert.equal(services.reduce((n,v)=>n+v.weight,0),100);
  assert.doesNotThrow(()=>q.validateConfig({...q.clone(q.DEFAULT),services}));
  assert.ok(services.every(service=>service.spec.catalogId===catalog.CATALOG.id&&service.spec.version===catalog.CATALOG.version&&service.spec.packageId));
 }
 const first=catalog.starterServices();first[0].price=1;assert.notEqual(catalog.starterServices()[0].price,1);
});

test('service audit binds known packages and never substitutes unknown catalog values',()=>{
 const service=catalog.createService('menu-refresh'),clean=catalog.auditService(service);assert.equal(clean.compatible,true);assert.deepEqual(clean.edited,[]);assert.ok(clean.records.length>=2);
 service.price+=75;assert.deepEqual(catalog.auditService(service).edited,['price']);
 const unknown=q.clone(service);unknown.spec.catalogId='future-catalog';const audit=catalog.auditService(unknown);assert.equal(audit.compatible,false);assert.equal(audit.records.length,0);assert.match(audit.derivation,/no catalog evidence was substituted/i);
});

test('new-workspace audit attributes catalog service leaves to package records and survives reorder',()=>{
 const config=presets.newWorkspaceConfig({...q.clone(q.DEFAULT),services:catalog.starterServices()}),audit=presets.audit(config),price=audit.lineage.find(row=>row.path==='services.0.price');
 assert.equal(audit.compatible,true);assert.equal(price.catalogId,catalog.CATALOG.id);assert.equal(price.packageId,config.services[0].spec.packageId);assert.ok(price.recordIds.some(id=>id.startsWith('mi.')||id.startsWith('us.')));assert.doesNotMatch(price.derivation,/generic|inherited engine/i);
 const reordered=q.clone(config);reordered.services.reverse();const reorderedAudit=presets.audit(reordered);assert.equal(reorderedAudit.edited.some(path=>/^services\./.test(path)),false);
});

test('custom services remain frozen custom assumptions without borrowed catalog evidence',()=>{
 const services=catalog.starterServices(),custom={...q.clone(q.DEFAULT.services[0]),id:'custom-offer',weight:0};services.push(custom);const config=presets.newWorkspaceConfig({...q.clone(q.DEFAULT),services}),audit=presets.audit(config),index=config.services.findIndex(v=>v.id==='custom-offer'),row=audit.lineage.find(v=>v.path===`services.${index}.price`);
 assert.deepEqual(row.recordIds,['model.new-workspace.v2']);assert.match(row.derivation,/custom, legacy, or unknown-catalog/i);
});

test('duplicated catalog instances keep provenance by package id and expose spec edits',()=>{
 const duplicate=catalog.createService('window-promo-12sf');duplicate.id='user-copy-42';
 assert.equal(catalog.auditService(duplicate).compatible,true);assert.deepEqual(catalog.auditService(duplicate).edited,[]);
 assert.equal(duplicate.spec.printUnit,'sq ft');duplicate.spec.scope='Changed by user';assert.deepEqual(catalog.auditService(duplicate).edited,['spec']);
});

test('every service publishes explicit cost-floor arithmetic and bundle weights disclaim demand calibration',()=>{
 for(const service of catalog.SERVICES){const model=catalog.DERIVATIONS[service.id];assert.equal(model.costFloor,Math.round((model.designLabor+model.ownerTime+model.supplierCost)*100)/100);assert.ok(service.price>=model.costFloor);assert.ok(model.explanation.length>80);}
 for(const bundle of catalog.BUNDLES)assert.match(bundle.note,/example weights apply within each eligible customer group/);
});

test('physical packages expose a valid managed-print versus self-print choice',()=>{
 const physical=catalog.SERVICES.filter(service=>service.print>0);assert.ok(physical.length>=6);
 for(const service of physical){assert.deepEqual(Object.keys(service.fulfillment).sort(),['designOnlyPrice','managedShare','mode']);assert.equal(service.fulfillment.mode,'customer-choice');assert.ok(service.fulfillment.designOnlyPrice>0&&service.fulfillment.designOnlyPrice<service.price);assert.equal(service.fulfillment.managedShare,.70);}
 assert.ok(catalog.SERVICES.filter(service=>service.print===0).every(service=>service.fulfillment===undefined));
});

test('campaign relationships use separately quoted monthly or seasonal cycles',()=>{
 assert.deepEqual(catalog.createService('monthly-promo-5').campaign,{cadenceDays:30,relationshipDays:365});
 assert.deepEqual(catalog.createService('seasonal-campaign').campaign,{cadenceDays:90,relationshipDays:365});
 assert.equal(catalog.createService('seasonal-campaign').weight,0);
});

test('audit flags fulfillment route assumptions and campaign cadence edits',()=>{
 const printed=catalog.createService('postcard-250');printed.fulfillment.managedShare=.5;assert.deepEqual(catalog.auditService(printed).edited,['fulfillment']);
 const monthly=catalog.createService('monthly-promo-5');monthly.campaign.cadenceDays=90;assert.deepEqual(catalog.auditService(monthly).edited,['campaign']);
 monthly.campaign.cadenceDays=30;monthly.fulfillment.designOnlyPrice=1;assert.deepEqual(catalog.auditService(monthly).edited,['fulfillment']);
});

test('every operational numeric default has an explicit non-published basis',()=>{
 for(const service of catalog.SERVICES.filter(v=>v.fulfillment)){const model=catalog.DERIVATIONS[service.id];assert.equal(model.designOnlyPrice,service.fulfillment.designOnlyPrice);assert.equal(model.managedShare,service.fulfillment.managedShare);assert.ok(model.designOnlyPrice>=model.designOnlyCostFloor);assert.match(model.designOnlyBasis,/not a published provider observation/);assert.match(model.managedShareBasis,/Unmeasured model prior/);}
 for(const service of catalog.SERVICES.filter(v=>v.campaign)){const policy=catalog.DERIVATIONS[service.id].campaignPolicy;assert.deepEqual({cadenceDays:policy.cadenceDays,relationshipDays:policy.relationshipDays},service.campaign);assert.match(policy.basis,/User-directed/);}
 for(const bundle of catalog.BUNDLES){assert.deepEqual(catalog.BUNDLE_DERIVATIONS[bundle.id].weights,Object.fromEntries(bundle.items.map(v=>[v.id,v.weight])));assert.match(catalog.BUNDLE_DERIVATIONS[bundle.id].basis,/Unmeasured/);}
});

test('catalog exports are immutable and every service numeric has a basis',()=>{
 assert.equal(Object.isFrozen(catalog.SOURCES),true);assert.equal(Object.isFrozen(catalog.SOURCES[0].observations),true);assert.equal(Object.isFrozen(catalog.SERVICES[0].spec),true);
 for(const service of catalog.SERVICES){const numeric=catalog.DERIVATIONS[service.id].numericAssumptions;assert.deepEqual(Object.keys(numeric).sort(),['hours','includedRevisions','modeledPriceRange','modeledPrintCostRange','price','print','printQuantity','review','weight']);for(const row of Object.values(numeric))assert.ok(row.basis.length>25);}
});

test('recipe audit reports added and duplicated instances instead of silently ignoring them',()=>{
 const config=presets.newWorkspaceConfig({...q.clone(q.DEFAULT),services:catalog.starterServices()}),added=catalog.createService('brand-starter');added.id='added-brand';added.weight=0;config.services.push(added);
 let audit=presets.audit(config);assert.ok(audit.edited.includes('services.added.3'));assert.equal(audit.lineage.find(v=>v.path==='services.added.3').packageId,'brand-starter');
 const duplicate=catalog.createService(config.services[0].spec.packageId);duplicate.id='duplicate-instance';duplicate.weight=0;config.services.push(duplicate);audit=presets.audit(config);assert.ok(audit.edited.includes('services.added.4'));
});

test('recipe audit remains truthful for removal, reorder and incompatible current specs',()=>{
 const config=presets.newWorkspaceConfig({...q.clone(q.DEFAULT),services:catalog.starterServices()}),removed=config.services.shift();
 let audit=presets.audit(config);assert.ok(audit.edited.some(path=>path.startsWith('services.0.')));assert.ok(audit.lineage.filter(row=>row.serviceId===removed.id).every(row=>row.currentValue===undefined));
 config.services.reverse();audit=presets.audit(config);assert.ok(audit.edited.some(path=>path.startsWith('services.0.')));assert.equal(audit.edited.some(path=>path.startsWith('services.1.')||path.startsWith('services.2.')),false);
 config.services[0].spec.version=99;assert.equal(catalog.auditService(config.services[0]).compatible,false);audit=presets.audit(config);assert.ok(audit.edited.some(path=>path.endsWith('.spec.version')));
});
