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
 assert.match(html,/services\.added\.0/);
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
