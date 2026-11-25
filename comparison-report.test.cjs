const test=require('node:test'),assert=require('node:assert/strict'),q=require('./engine.js'),catalog=require('./service-catalog.js'),presets=require('./presets.js'),report=require('./comparison-report.js');
function run(config,days){const state=q.fresh(config);for(let i=0;i<days;i++)q.step(state);return state;}
test('comparison report is self-contained, escaped and delegates comparison warnings',()=>{
 const base=run({...q.clone(q.DEFAULT),name:'Baseline <script>',months:3},30),current=run({...q.clone(q.DEFAULT),name:'Current & changed',months:3,ownerHours:20},20);
 current.projects[0].client='<img src=x onerror=alert(1)>';
 const out=report.create(current,base,{currentLabel:'Current <b>',baselineLabel:'Base & old',generatedAt:'2026-11-18T12:00:00Z'});
 assert.match(out.filename,/^MEIQQ-Comparison-/);assert.match(out.html,/<!doctype html>/i);assert.doesNotMatch(out.html,/<script|<img|<link/i);assert.match(out.html,/Current &lt;b&gt;/);assert.match(out.html,/different-day/);assert.match(out.html,/Exact assumption changes/);assert.match(out.html,/ownerHours/);assert.match(out.html,/Operating-result difference bridge/);
});
test('comparison report includes recipe origin, services, projects and source limits',()=>{
 const selection={market:'dearborn',operation:'lean',mix:'food',condition:'busy'},config=presets.compose(selection,q.DEFAULT),recipe=q.clone(config.recipe);delete config.recipe;const base=run(config,30);base.config.recipe=q.clone(recipe);const next=q.clone(config);next.services[0].price+=100;const current=run(next,30);current.config.recipe=q.clone(recipe);const out=report.create(current,base);
 assert.match(out.html,/Recipe origin/);assert.match(out.html,/Dearborn food \+ retail corridor/);assert.match(out.html,/Service financial results/);assert.match(out.html,/Current accepted projects/);assert.match(out.html,/Per-value recipe derivation/);assert.match(out.html,/Literal lean capacity assumption/);assert.match(out.html,/model\.operation\.v2/);assert.match(out.html,/Edited after recipe/);assert.match(out.html,/services\.design\.price/);assert.match(out.html,/Like-for-like/);
});
test('comparison report rejects missing run selection',()=>{assert.throws(()=>report.create(q.fresh()),/current run and a baseline/);});

test('job cost attribution escapes the supplied service name and uses each verified comparison interval',()=>{
 const config=presets.newWorkspaceConfig({...q.DEFAULT,services:catalog.starterServices()});
 const name='Custom <b>scope</b> & artwork';
 const source=run({...config,designerHours:6,services:config.services.map(s=>({...s,name}))},30);
 const pair=q.startCapacityReplay(source,{month:1,key:'designerHours',value:12,demandId:source.projects.find(p=>p.id==='P003').demandId});
 while(pair.phase!=='done')q.stepCapacityReplay(pair);
 const replay={month:1,key:'designerHours',before:6,after:12,sourceDay:30,firstDay:1,endDay:30,demandId:pair.demandId,carriedThrough:90};
 const carry=q.startCapacityCarry(source,pair.baseline,pair.alternative,replay);
 while(carry.phase!=='done')q.stepCapacityCarry(carry);
 const html=report.create(pair.alternative,pair.baseline,{carry,replay}).html;
 const costs=html.match(/<section class="job-costs" id="job-costs">[\s\S]*?<\/section>/)?.[0];
 assert.ok(costs);
 assert.match(costs,/Custom &lt;b&gt;scope&lt;\/b&gt; &amp; artwork/);
 assert.doesNotMatch(costs,/<b>scope<\/b>|NaN|undefined/);
 assert.ok(html.indexOf('Job costs and unfinished work')<html.indexOf('One-change replay · Month 1'));
 const monthly=report.create(pair.alternative,pair.baseline,{replay}).html;
 assert.match(monthly,/id="month-job-costs"/);
 assert.match(monthly,/Costs posted during days 1–30/);
 assert.doesNotMatch(monthly,/id="job-costs"|Costs posted during days 1–90/);
 assert.doesNotMatch(report.create(pair.alternative,pair.baseline).html,/Job costs and unfinished work/);
});

test('matching incoming work alone never labels arbitrary checkpoints a one-change replay',()=>{
 const config={...q.clone(q.DEFAULT),acquisition:'preset',startingCash:1e6,designers:1};
 const baseline=run(config,30),current=run({...config,designers:2,designerRate:config.designerRate+5},30);
 assert.ok(q.compareRuns(current,baseline).flags.likeForLike);
 const replay={month:1,key:'designers',before:1,after:2,firstDay:1,endDay:30,sourceDay:22};
 for(const options of [{},{replay},{replay:{...replay,month:8}}]){
  const {html}=report.create(current,baseline,options);
  assert.doesNotMatch(html,/One-change replay|Both copies project/);
  assert.match(html,/Exact assumption changes/);
 }
});

test('comparison report separates modeled route economics from realized locked choices',()=>{
 const service=catalog.createService('postcard-250'),config={...q.clone(q.DEFAULT),months:3,inquiries:100,conversion:1,services:[{...service,weight:100}]},baseline=run(config,30),current=q.clone(baseline),accepted=current.projects.find(project=>project.accepted!==undefined);
 assert.ok(accepted?.terms?.fulfillment);const html=report.create(current,baseline).html;
 assert.match(html,/Modeled unit choices/);assert.match(html,/Managed-print assumption/);assert.match(html,/Agency-managed print|Design only \/ client self-print/);assert.match(html,/Locked terms/);assert.match(html,/not realized sales, guaranteed revenue/);
});

test('comparison report never relabels or injects an unknown future fulfillment route',()=>{
 const service=catalog.createService('postcard-250'),config={...q.clone(q.DEFAULT),months:3,inquiries:100,conversion:1,services:[{...service,weight:100}]},baseline=run(config,30),current=q.clone(baseline),accepted=current.projects.find(project=>project.accepted!==undefined);
 accepted.terms.fulfillment.mode='<img src=x onerror=alert(1)>';const html=report.create(current,baseline).html;
 assert.match(html,/Unsupported fulfillment route/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img/i);
});

test('comparison report reconciles accepted and skipped campaigns through the cutoff',()=>{
 const service=catalog.createService('monthly-promo-5'),config={...q.clone(q.DEFAULT),months:3,startingCash:1e6,inquiries:20,conversion:1,retention:0,ownerHours:120,designers:4,designerHours:120,services:[{...service,weight:100}]},baseline=run(config,90),current=q.clone(baseline),analytics=q.analytics(current),html=report.create(current,baseline).html;
 assert.ok(analytics.skippedCampaigns>0);assert.match(html,/Campaign relationships/);assert.match(html,/Relationship cutoff/);assert.match(html,/Skipped campaigns/);assert.match(html,new RegExp(`<td>${analytics.skippedCampaigns}<\\/td>`));assert.match(html,/Skipped campaign quotes/);assert.match(html,/decline skips that campaign and preserves later quote opportunities through the cutoff/);assert.match(html,/Skipped quotes produce no ledger entry or revenue/);assert.match(html,/does not guarantee revenue/);
});

test('custom service changes stay in exact differences without being misclassified as recipe edits',()=>{
 const composed=presets.compose({market:'metro',operation:'solo',mix:'balanced',condition:'steady'},q.DEFAULT),recipe=q.clone(composed.recipe),plain=q.clone(composed);delete plain.recipe;
 const baseline=run(plain,1);baseline.config.recipe=q.clone(recipe);
 const changed=q.clone(plain);changed.services[0].price+=75;const current=run(changed,1);current.config.recipe=q.clone(recipe);
 const html=report.create(current,baseline).html;
 assert.match(html,/services\.design\.price/);assert.doesNotMatch(html,/Edited after recipe<\/th><td>[^<]*services\.design\.price/);
 assert.doesNotMatch(html,/services\.added\.0/);
});

test('effective outreach, dated changes and incoming requests govern comparison validity',()=>{
 const base={...q.clone(q.DEFAULT),acquisition:'sales',outreachHours:4,leadsPerHour:.3,ownerHours:15};
 const full=run(base,30),capped=run({...base,ownerHours:1},30);
 const cappedReport=report.create(capped,full);
 assert.equal(q.compareRuns(capped,full).flags.likeForLike,false);
 assert.match(cappedReport.html,/different-demand-assumptions/);
 assert.match(cappedReport.html,/different-inquiries/);
 const changed=run({...base,leadsPerHour:0},29);
 q.applyConfig(changed,base);q.step(changed);
 const compared=q.compareRuns(changed,full);
 assert.equal(compared.flags.sameExternalDemandAssumptions,true);
 assert.equal(compared.flags.sameDemandHistory,false);
 assert.equal(compared.flags.sameRealizedInquiries,false);
 // A silent history change can matter even if no leads happened on either run.
 const empty=run({...base,outreachHours:0},1),other=run({...base,leadsPerHour:0},1);
 q.applyConfig(empty,base);q.applyConfig(other,base);
 assert.equal(q.compareRuns(empty,other).flags.sameRealizedInquiries,true);
 assert.equal(q.compareRuns(empty,other).flags.likeForLike,false);
 const equivalent=run({...base,ownerHours:18,inquiries:499,conversion:.08,profileStrength:0},30);
 assert.equal(q.compareRuns(equivalent,full).flags.likeForLike,true);
 assert.deepEqual(q.restore(changed),changed);
});

test('unmatched inquiries retain identities, dates and business types across restoration',()=>{
 const service={...q.DEFAULT.services[0],weight:100,audience:'food'};
 const base={...q.clone(q.DEFAULT),inquiries:30,services:[service],customerMix:{food:0,retail:100,services:0}};
 const retail=run(base,5),locals=run({...base,customerMix:{food:0,retail:0,services:100}},5);
 assert.equal(retail.unserved,5);assert.equal(retail.projects.length,0);
 assert.equal(q.compareRuns(retail,locals).flags.sameRealizedInquiries,false);
 assert.equal(q.compareRuns(q.restore(retail),retail).flags.likeForLike,true);
 const corrupt=q.clone(retail);corrupt.history[0].unservedInquiries[0][0]=10;
 assert.throws(()=>q.restore(corrupt),/daily demand/);
 const altered=q.clone(retail);altered.demandHistory[0].settings.inquiries=60;
 assert.throws(()=>q.restore(altered),/daily demand/);
});

test('legacy days remain unverified on continuation and day-zero seed edits align identities',()=>{
 const saved=run(q.DEFAULT,3);
 delete saved.demandHistory;
 for(const row of saved.history){delete row.externalArrivals;delete row.unservedInquiries;}
 const next=q.restore(saved);q.step(next);
 assert.equal(next.demandHistory[0].day,4);
 assert.equal(q.compareRuns(q.restore(next),next).flags.sameDemandHistory,null);
 assert.match(report.create(next,next).html,/unverified-demand-history/);
 const dayZero=q.fresh();q.applyConfig(dayZero,{...q.clone(q.DEFAULT),seed:7});
 const fresh=q.fresh({...q.clone(q.DEFAULT),seed:7});
 assert.equal(dayZero.workloadId,fresh.workloadId);
 assert.equal(q.restore({...dayZero,workloadId:'model2-seed-2417'}).workloadId,fresh.workloadId);
 q.step(dayZero);q.step(fresh);
 assert.equal(q.compareRuns(dayZero,fresh).flags.likeForLike,true);
 const first=q.fresh();q.step(first);
 assert.match(report.create(first,fresh).html,/different-workload/);
});

test('unknown future recipe ledger is explicit unsupported provenance, never no-edits',()=>{
 const baseline=run(q.clone(q.DEFAULT),1),current=q.clone(baseline);
 current.config.recipe={catalog:'metro-detroit-2099-v99',version:99,ledger:'future-ledger',market:'metro',operation:'solo',mix:'balanced',condition:'steady'};
 const html=report.create(current,baseline).html;
 assert.match(html,/Unsupported recipe provenance/);assert.match(html,/Unavailable — unsupported recipe catalog or ledger/);assert.match(html,/Derivation unavailable/);
});

test('legacy missing terms and added or removed leaves stay explicit without crashing',()=>{
 const baseline=run({...q.clone(q.DEFAULT),months:3,conversion:1},30),current=q.clone(baseline),project=current.projects.find(item=>item.accepted!==undefined);delete project.terms;current.config.services[0].legacyNote='preserved';delete current.config.services[0].color;
 const html=report.create(current,baseline).html;
 assert.match(html,/services\.design\.legacyNote/);assert.match(html,/not set/);assert.match(html,/services\.design\.color/);assert.match(html,/Single route/);assert.match(html,/—d payment/);
});

test('missing future financial fields render unavailable rather than invented zero dollars',()=>{
 const baseline=run(q.clone(q.DEFAULT),1),current=q.clone(baseline);current.projects.push({id:'future',demandId:'future',client:'Future',serviceId:'future',service:{name:'Future'},accepted:0,stage:'complete',price:null,cost:undefined,ownerHours:0,designHours:0,due:1,delivered:true});
 const html=report.create(current,baseline).html,fragment=html.slice(html.indexOf('future<small>'));
 assert.match(fragment,/—/);assert.doesNotMatch(fragment.slice(0,500),/\$0\.00/);
});

test('recipe metadata changes are provenance, not numeric assumption differences',()=>{
 const baseline=run(q.clone(q.DEFAULT),1),current=q.clone(baseline);baseline.config.recipe={catalog:'old',version:1,ledger:'old'};current.config.recipe={catalog:'future',version:99,ledger:'future'};
 const html=report.create(current,baseline).html;
 assert.match(html,/Unsupported recipe provenance/);assert.match(html,/No applied assumptions changed/);assert.doesNotMatch(html,/Assumption path<\/th><th>Baseline<\/th><th>Current<\/th><\/tr><tr><th>recipe\./);
});

test('exports include route scope, supplier references and dated studio observations without a preset',()=>{
 const offer={...catalog.createService('table-tents-100'),weight:100};
 const base=run({...q.clone(q.DEFAULT),services:[offer]},1),current=q.clone(base);
 current.config.services[0].filesOnlyScope='Updated art files for the customer';
 current.config.services[0].supplierMode='print';
 const source='Reviewed quotes <sample>';
 base.config.assumptionRecords={conversion:{value:.35,date:'2026-11-10',source,sample:'7 wins / 20 decided'}};
 current.config.assumptionRecords={conversion:{value:.4,date:'2026-11-20',source,sample:'10 wins / 25 decided'}};
 const html=report.create(current,base).html;
 assert.match(html,/services\.table-tents-100\.filesOnlyScope/);
 assert.match(html,/services\.table-tents-100\.supplierMode/);
 assert.match(html,/assumptionRecords\.conversion\.value/);
 assert.match(html,/Studio assumption records/);
 assert.match(html,/Reviewed quotes &lt;sample&gt;/);assert.match(html,/10 wins \/ 25 decided/);
 assert.match(html,/Supplier allowances and original package references/);
 assert.match(html,/Printyco/);assert.match(html,/Public product page gives limited stock/);
});
