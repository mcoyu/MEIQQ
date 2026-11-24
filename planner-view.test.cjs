const test=require('node:test'),assert=require('node:assert/strict');
const Planner=require('./planner.js'),Studio=require('./studio.js'),View=require('./planner-view.js'),Explorer=require('./planner-explorer.js');

function fixture(){
 const ideas=Studio.fresh(),idea=Studio.create(ideas,{name:'One decision brief',unit:'one source, one period and one decision',price:'600',directCost:'20',ownerHours:'3',setupOwnerHours:'1',setupCost:'0',roles:[{name:'Analyst',hours:'5',setupHours:'2',rate:'30'}]});
 const book=Planner.fresh(),plan=Planner.create(book),id=plan.id;
 for(const [path,value]of Object.entries({name:'A bounded monthly mix',ownerHours:'24',nonProjectHours:'6',bufferPct:'0',ownerTarget:'1000',profitTarget:'400'}))Planner.update(book,id,path,value);
 const pool=Planner.addPool(book,id,{name:'Analyst',hours:'24',rate:'30'});
 Planner.update(book,id,'expenses.0.name','Recurring software');Planner.update(book,id,'expenses.0.amount','200');
 Planner.fromIdea(book,id,idea,'2026-11-20');
 for(const [path,value]of Object.entries({'services.0.quantity':'4','services.0.setupCount':'2','services.0.allocations.0.poolId':pool.id}))Planner.update(book,id,path,value);
 return {book,id,ideas,idea,pool,current:()=>book.plans.find(value=>value.id===id)};
}

test('blank-first planner offers explicit blank and fictional example actions',()=>{
 const book=Planner.fresh(),before=Planner.serialize(book),html=View.render(book);
 assert.match(html,/data-action="planner-add"/);assert.match(html,/Add fictional example/);
 assert.match(html,/Start with your own assumptions/);
 assert.equal(Planner.serialize(book),before);
});

test('results distinguish owner income from retained target and expose the limiting workload',()=>{
 const f=fixture(),html=View.render(f.book,{tab:'results'});
 assert.match(html,/entered workload fits the capacity budget/);
 assert.match(html,/Available for owner \+ retained amount<\/dt><dd>\$1,400\.00/);
 assert.match(html,/Owner income target<\/dt><dd>\$1,000\.00/);
 assert.match(html,/Remaining after owner target<\/dt><dd>\$400\.00/);
 assert.match(html,/Extra retained amount target<\/dt><dd>\$400\.00/);
 assert.match(html,/Shortfall against both targets<\/dt><dd>\$0\.00/);
 assert.match(html,/Limiting capacity<\/dt><dd>Analyst/);
 assert.match(html,/<th scope="row">Owner<\/th><td>18 h<\/td><td>14 h/);
 assert.match(html,/<th scope="row">Analyst<\/th><td>24 h<\/td><td>24 h/);
 assert.match(html,/income target is deducted once/);
 assert.match(html,/does not establish demand or guarantee earnings/);
 assert.match(html,/data-action="planner-bridge"/);
 Planner.update(f.book,f.id,'services.0.quantity','6');
 const overloaded=View.render(f.book,{tab:'results'});
 assert.match(overloaded,/entered workload exceeds capacity/);
 assert.match(overloaded,/10 h<\/td>/);
 assert.match(overloaded,/before treating this mix as deliverable/);
});

test('unknown or invalid rates remain named and visible without erasing known workload',()=>{
 const f=fixture();Planner.update(f.book,f.id,'pools.0.rate','awaiting quote');
 const baseline=View.render(f.book,{tab:'baseline'}),results=View.render(f.book,{tab:'results'});
 assert.match(baseline,/data-planner-field="pools\.0\.rate"[^>]*value="awaiting quote"/);
 assert.match(results,/Analyst · Cost per hour/);
 assert.match(results,/Available for owner \+ retained amount<\/dt><dd>—/);
 assert.match(results,/<th scope="row">Analyst<\/th><td>24 h<\/td><td>24 h/);
 assert.doesNotMatch(results,/NaN|Infinity/);
});

test('an earnings shortfall stays distinct from a capacity overload',()=>{
 const f=fixture();Planner.update(f.book,f.id,'ownerTarget','1600');
 const html=View.render(f.book,{tab:'results'});
 assert.match(html,/entered workload fits the capacity budget/);
 assert.match(html,/Shortfall against both targets<\/dt><dd>\$600\.00/);
 assert.match(html,/entered volume does not meet both earnings targets/);
 assert.doesNotMatch(html,/before treating this mix as deliverable/);
});

test('a fractional capacity ceiling never claims a feasible whole-unit workload',()=>{
 const f=fixture();
 for(const [path,value]of Object.entries({'services.0.quantity':'1','services.0.setupCount':'0','pools.0.hours':'1','expenses.0.amount':'0',ownerTarget:'1',profitTarget:'0'}))Planner.update(f.book,f.id,path,value);
 assert.equal(Planner.metrics(f.current()).goalFeasible,true);
 assert.equal(Planner.metrics(f.current()).feasibleAtCurrentVolume,false);
 const results=View.render(f.book,{tab:'results'});
 assert.match(results,/entered workload exceeds capacity/);
 assert.match(results,/Targets within proportional ceiling\?<\/dt><dd>Yes, before whole-unit rounding/);
 assert.match(results,/before treating this mix as deliverable/);
 Planner.captureBaseline(f.book,f.id,'2026-11-20');
 const compare=View.render(f.book,{tab:'compare'});
 assert.match(compare,/Targets within proportional ceiling\?/);
 assert.match(compare,/Yes, before whole-unit rounding/);
 assert.doesNotMatch(compare,/Targets within capacity\?/);
});

test('service mix preserves priced units and requires explicit role-pool mapping',()=>{
 const f=fixture();Planner.update(f.book,f.id,'services.0.allocations.0.poolId','');
 const before=Planner.serialize(f.book),sourceBefore=Studio.serialize(f.ideas),html=View.render(f.book,{tab:'mix',ideaId:f.idea.id},f.ideas);
 assert.match(html,/one source, one period and one decision/);
 assert.match(html,/Choose a pool — not mapped/);
 assert.match(html,/does not assign a person or establish capacity/);
 assert.match(html,/data-planner-idea/);
 assert.match(html,new RegExp(`data-action="planner-idea-add"[^>]*data-idea-id="${f.idea.id}"`));
 assert.match(html,/data-planner-field="services\.0\.setupCount"/);
 assert.match(html,/data-planner-field="services\.0\.allocations\.0\.setupHours"/);
 assert.equal(Planner.serialize(f.book),before);assert.equal(Studio.serialize(f.ideas),sourceBefore);
});

test('dated baseline comparison retains frozen numbers and marks different-baseline plans',()=>{
 const f=fixture();Planner.captureBaseline(f.book,f.id,'2026-11-20');
 const alternative=Planner.duplicate(f.book,f.id,{date:'2026-11-20'});
 Planner.update(f.book,alternative.id,'services.0.quantity','6');
 const baselineBefore=JSON.stringify(f.current().baseline),html=View.render(f.book,{selectedId:f.id,tab:'compare',compareId:alternative.id});
 assert.match(html,/2026-11-20/);assert.match(html,/\$1,400\.00/);assert.match(html,/\$2,260\.00/);
 assert.match(html,/Units per 30 days/);assert.doesNotMatch(html,/Different baseline:/);
 const other=Planner.create(f.book);
 assert.match(View.render(f.book,{selectedId:f.id,tab:'compare',compareId:other.id}),/Different baseline:/);
 assert.equal(JSON.stringify(f.current().baseline),baselineBefore);
});

test('changed assumptions show pool names and omit internal ID counters',()=>{
 const f=fixture();Planner.captureBaseline(f.book,f.id,'2026-11-20');
 const alternative=Planner.duplicate(f.book,f.id,{date:'2026-11-20'}),pool=Planner.addPool(f.book,alternative.id,{name:'Second analyst',hours:'24',rate:'45'});
 Planner.update(f.book,alternative.id,'services.0.allocations.0.poolId',pool.id);
 const html=View.render(f.book,{selectedId:f.id,tab:'compare',compareId:alternative.id}),differences=html.match(/<ul class="planner-differences">([\s\S]*?)<\/ul>/)?.[1];
 assert.ok(differences);assert.match(differences,/Analyst → Second analyst/);
 assert.doesNotMatch(differences,/nextPoolId|nextServiceId|nextExpenseId|pool-1|pool-2/);
});

test('all rendered inputs have unique associated labels and only supported field paths',()=>{
 const f=fixture();
 for(const tab of ['baseline','mix','earnings']){
  const html=View.render(f.book,{tab},f.ideas),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const match of html.matchAll(/<label[^>]*for="([^"]+)"/g))assert.ok(ids.includes(match[1]));
  for(const match of html.matchAll(/data-planner-field="([^"]+)"/g)){
   const value=match[1].split('.').reduce((value,key)=>value?.[key],f.current());
   assert.equal(typeof value,'string',match[1]);
   assert.doesNotThrow(()=>Planner.update(f.book,f.id,match[1],value),match[1]);
  }
 }
});

test('rendering tabs escapes arbitrary plan and source text without mutating estimates',()=>{
 const f=fixture(),unsafe='<img src=x onerror="alert(1)">';
 Planner.update(f.book,f.id,'name',unsafe);Planner.update(f.book,f.id,'notes',unsafe);Planner.update(f.book,f.id,'services.0.name',unsafe);
 Planner.captureBaseline(f.book,f.id,'2026-11-20');
 const before=Planner.serialize(f.book);
 for(const tab of ['baseline','mix','results','compare','earnings']){
  const html=View.render(f.book,{tab,error:unsafe},f.ideas);
  assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|<script|href="javascript:/);
  assert.match(html,/id="planner-error"[^>]*role="alert"[^>]*tabindex="-1"/);
 }
 assert.equal(Planner.serialize(f.book),before);
});

test('empty-plan undo remains available and alternatives require a captured baseline in the view',()=>{
 const f=fixture(),html=View.render(f.book);
 assert.match(html,/data-action="planner-duplicate"[^>]*disabled/);
 const empty=View.render(Planner.fresh(),{undoName:'Deleted plan'});
 assert.match(empty,/data-action="planner-undo-delete"/);
 assert.match(empty,/Deleted Deleted plan/);
 assert.match(View.render(f.book,{tab:'compare'}),/Capture the current plan as a dated baseline first/);
});

test('removing an earlier service reports removal without inventing changes to a surviving service',()=>{
 const f=fixture(),second=Planner.addService(f.book,f.id,{name:'Unchanged follow-up',unit:'call',quantity:'1',setupCount:'0',price:'100',directCost:'0',ownerHours:'1'});
 Planner.captureBaseline(f.book,f.id,'2026-11-20');
 const original=f.current().services[0].id;Planner.removeService(f.book,f.id,original);
 const html=View.render(f.book,{selectedId:f.id,tab:'compare'}),differences=html.match(/<ul class="planner-differences">([\s\S]*?)<\/ul>/)?.[1];
 assert.match(html,/1 changed assumption/);assert.match(differences,/Removed service · One decision brief/);
 assert.doesNotMatch(differences,/Unchanged follow-up|600 → 100|NaN|Not specified → Not specified/);
 assert.equal(f.current().services[0].id,second.id);
});

test('pool and expense removals match persistent rows rather than shifted indexes',()=>{
 const f=fixture();Planner.addPool(f.book,f.id,{name:'Unchanged design pool',hours:'10',rate:'20'});Planner.addExpense(f.book,f.id,{name:'Unchanged hosting',amount:'40'});
 Planner.captureBaseline(f.book,f.id,'2026-11-20');
 Planner.removePool(f.book,f.id,f.pool.id);Planner.removeExpense(f.book,f.id,f.current().expenses[0].id);
 const html=View.render(f.book,{tab:'compare'}),differences=html.match(/<ul class="planner-differences">([\s\S]*?)<\/ul>/)?.[1];
 assert.match(differences,/Removed role pool · Analyst/);assert.match(differences,/Removed recurring cost · Recurring software/);
 assert.match(differences,/Analyst → Not mapped/);
 assert.doesNotMatch(differences,/Unchanged design pool|Unchanged hosting|NaN/);
});

test('changed responsibility lists use named summaries, including an empty list',()=>{
 const f=fixture();Planner.captureBaseline(f.book,f.id,'2026-11-20');Planner.removeAllocation(f.book,f.id,f.current().services[0].id,0);
 let html=View.render(f.book,{tab:'compare'}),differences=html.match(/<ul class="planner-differences">([\s\S]*?)<\/ul>/)?.[1];
 assert.match(differences,/One decision brief · Paid-role work/);assert.match(differences,/Analyst → Analyst; 5 hours per unit, 2 extra hours per setup → No paid-role work/);
 assert.doesNotMatch(differences,/NaN|allocations|\[\]/);
 Planner.setAllocation(f.book,f.id,f.current().services[0].id,f.pool.id,{name:'New analyst responsibility',hours:'4',setupHours:'0'});
 html=View.render(f.book,{tab:'compare'});differences=html.match(/<ul class="planner-differences">([\s\S]*?)<\/ul>/)?.[1];
 assert.match(differences,/New analyst responsibility → Analyst/);assert.doesNotMatch(differences,/NaN/);
});

test('empty-plan import errors stay visible and escaped beside the recovery controls',()=>{
 const message='Planner backup is not valid JSON. <script>unsafe</script>',html=View.render(Planner.fresh(),{error:message,undoName:'Prior plan'});
 assert.match(html,/id="planner-error"[^>]*role="alert"[^>]*tabindex="-1"/);assert.match(html,/Planner backup is not valid JSON/);
 assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Undo deletion/);
});

test('co-owner guidance separates combined income from paid delivery and names counted-hours exclusions',()=>{
 const f=fixture();
 for(const [path,value]of Object.entries({ownerHours:'35.2',nonProjectHours:'6',bufferPct:'10','pools.0.name':'Partner analytics','pools.0.hours':'29.2','pools.0.rate':'0'}))Planner.update(f.book,f.id,path,value);
 const baseline=View.render(f.book,{tab:'baseline'});
 assert.match(baseline,/Can cover combined co-owner income/);
 assert.match(baseline,/Net delivery hours after this person’s sales\/admin time/);
 assert.match(baseline,/capacity buffer is applied afterward/);
 assert.match(baseline,/Use 0 for a co-owner paid from the combined income target/);
 const results=View.render(f.book,{tab:'results'});
 assert.match(results,/Counted work hours: 44 h/);
 assert.match(results,/Total owner work including non-project time: 20 h/);
 assert.match(results,/other roles’ sales\/admin time is excluded/);
 assert.doesNotMatch(results,/Total team work/);
 Planner.captureBaseline(f.book,f.id,'2026-11-20');
 const comparison=View.render(f.book,{tab:'compare'});
 assert.match(comparison,/Counted work hours/);
 assert.match(comparison,/owner’s project and non-project work plus role delivery/);
 assert.match(comparison,/Other roles’ sales\/admin time is excluded/);
 assert.doesNotMatch(comparison,/Total team work/);
});

test('earnings lab exposes every service with live earnings and explicit unknown sliders',()=>{
 const f=fixture();Planner.addService(f.book,f.id,{name:'Print design',unit:'layout',quantity:'1',setupCount:'0',price:'150',directCost:'0',ownerHours:'2',allocations:[]});
 let html=View.render(f.book,{tab:'earnings'});
 assert.match(html,/data-action="planner-studio"/);assert.match(html,/Combined owner income per 30 days/);
 assert.match(html,/One decision brief/);assert.match(html,/Print design/);
 for(const path of ['services.0.price','services.0.directCost','services.0.quantity','services.0.ownerHours','services.0.allocations.0.hours','services.1.price','services.1.directCost','services.1.quantity','services.1.ownerHours','expenses.0.amount'])assert.equal([...html.matchAll(new RegExp('data-planner-field="'+path.replace(/\./g,'\\.')+'"','g'))].length,2,path+' needs exact input and slider');
 assert.match(html,/Available for owners \+ retention<\/span><strong>\$1,550\.00/);
 Planner.update(f.book,f.id,'services.1.price','not yet quoted');html=View.render(f.book,{tab:'earnings'});
 assert.match(html,/data-planner-field="services\.1\.price"[^>]*value="not yet quoted"/);
 assert.match(html,/<input[^>]*type="range"[^>]*data-planner-field="services\.1\.price"[^>]*disabled/);
 assert.match(html,/Available for owners \+ retention<\/span><strong>—/);assert.doesNotMatch(html,/NaN|Infinity/);
});

test('sliders preserve exact cents and extend their range for existing larger estimates',()=>{
 const f=fixture();Planner.update(f.book,f.id,'services.0.price','2500.50');Planner.update(f.book,f.id,'ownerTarget','12000');
 const before=Planner.serialize(f.book),html=View.render(f.book,{tab:'earnings'});
 assert.match(html,/<input[^>]*type="range"[^>]*max="2500\.5"[^>]*step="0\.01"[^>]*value="2500\.5"[^>]*data-planner-field="services\.0\.price"/);
 assert.match(html,/<input[^>]*type="range"[^>]*max="12000"[^>]*data-planner-field="ownerTarget"/);
 assert.match(html,/data-planner-field="services\.0\.price"[^>]*value="2500\.50"/);assert.equal(Planner.serialize(f.book),before);
 Planner.update(f.book,f.id,'services.0.quantity','1.5');const invalid=View.render(f.book,{tab:'earnings'});
 assert.match(invalid,/<input[^>]*type="range"[^>]*data-planner-field="services\.0\.quantity"[^>]*disabled/);
});

test('canonical Studio plan uses explicit weekly metadata while independent plans retain monthly controls',()=>{
 const f=fixture();f.book.studio={planId:f.id,partnerPoolId:f.pool.id,ownerWeeklyHours:'8',partnerWeeklyHours:'8',partnerAdminHours:'6'};
 let html=View.render(f.book,{selectedId:f.id,tab:'earnings'});
 assert.match(html,/Four-week budget inside the 30-day plan/);assert.match(html,/This is not a weekly schedule/);
 for(const path of ['ownerWeeklyHours','partnerWeeklyHours','partnerAdminHours'])assert.equal([...html.matchAll(new RegExp('data-planner-studio="'+path+'"','g'))].length,2);
 assert.doesNotMatch(html,/data-planner-field="ownerHours"/);assert.doesNotMatch(html,/data-planner-field="pools\.0\.hours"/);
 assert.match(html,/data-planner-field="nonProjectHours"/);assert.match(html,/Your non-project hours in the four-week budget/);
 const independent={...f.book,studio:null};html=View.render(independent,{tab:'earnings'});
 assert.match(html,/Return to Studio plan/);assert.match(html,/data-planner-field="ownerHours"/);assert.doesNotMatch(html,/data-planner-studio=/);
});

test('price options are selectable-service calculations and apply only reviewed price, volume and setup',()=>{
 const f=fixture();Planner.update(f.book,f.id,'ownerTarget','2000');Planner.update(f.book,f.id,'pools.0.rate','0');
 const before=Planner.serialize(f.book),service=f.current().services[0],rows=Explorer.scenarios(f.current(),service.id),html=View.render(f.book,{tab:'earnings',explorerServiceId:service.id});
 assert.match(html,/data-planner-explorer-service/);assert.match(html,/saves an independent alternative/);
 for(const option of rows)assert.ok(html.includes(`data-service-id="${service.id}" data-quantity="${option.quantity}" data-price="${(option.requiredPrice/100).toFixed(2)}" data-setup-count="${option.setupCount}"`));
 assert.match(html,/This price alone will not fix the capacity shortage/);assert.equal(Planner.serialize(f.book),before);
 const second=Planner.addService(f.book,f.id,{name:'Catalog check',unit:'catalog',quantity:'1',setupCount:'0',price:'300',directCost:'0',ownerHours:'1'}),secondHtml=View.render(f.book,{tab:'earnings',explorerServiceId:second.id});
 const proposals=secondHtml.slice(secondHtml.indexOf('<section class="planner-section planner-proposals">'));
 assert.match(proposals,new RegExp('data-service-id="'+second.id+'"'));assert.doesNotMatch(proposals,new RegExp('data-service-id="'+service.id+'"'));
});

test('live Studio summary shows each person’s delivery budget, non-project time and weekly preference',()=>{
 const f=fixture();Planner.update(f.book,f.id,'ownerHours','32');Planner.update(f.book,f.id,'pools.0.hours','26');Planner.update(f.book,f.id,'bufferPct','10');
 f.book.studio={planId:f.id,partnerPoolId:f.pool.id,ownerWeeklyHours:'8',partnerWeeklyHours:'8',partnerAdminHours:'6'};
 const html=View.render(f.book,{tab:'earnings'}),summary=html.slice(html.indexOf('<section class="planner-lab-summary"'),html.indexOf('<div class="planner-adjust-grid planner-goals">'));
 assert.match(html,/income goal and weekly hours are editable preferences/);assert.match(html,/recurring expenses are placeholders to research/);
 assert.equal([...summary.matchAll(/8 h\/week preference/g)].length,2);
 assert.match(summary,/Planned delivery: <b>14 h \/ 23\.4 h<\/b>/);
 assert.match(summary,/Planned delivery: <b>24 h \/ 23\.4 h<\/b>/);
 assert.match(summary,/Non-project: 6 h · total planned work: 20 h/);assert.match(summary,/Non-project: 6 h · total planned work: 30 h/);
 assert.match(summary,/0\.6 h over delivery budget/);assert.doesNotMatch(summary,/NaN|Infinity/);
});

test('partner non-project overload is explicit even when the service mix is idle',()=>{
 const f=fixture();
 for(const [path,value]of Object.entries({ownerHours:'32',ownerTarget:'0',profitTarget:'0','expenses.0.amount':'0','services.0.quantity':'0','services.0.setupCount':'0','pools.0.hours':'-8'}))Planner.update(f.book,f.id,path,value);
 f.book.studio={planId:f.id,partnerPoolId:f.pool.id,ownerWeeklyHours:'8',partnerWeeklyHours:'8',partnerAdminHours:'40'};
 const html=View.render(f.book,{tab:'earnings'});
 assert.match(html,/Partner non-project time exceeds available time by 8 h/);
 assert.match(html,/not feasible even with no service deliveries/);
 assert.doesNotMatch(html,/Work fits the current capacity budget|This entered mix fits capacity and covers both targets|Fits entered effort/);
 assert.match(html,/data-planner-studio="partnerAdminHours"[^>]*value="40"/);
 assert.doesNotMatch(html,/NaN|Infinity/);
});

test('removing canonical partner capacity leaves a visible restore action without implying remapped work',()=>{
 const f=fixture();Planner.removePool(f.book,f.id,f.pool.id);
 f.book.studio={planId:f.id,partnerPoolId:null,ownerWeeklyHours:'8',partnerWeeklyHours:'8',partnerAdminHours:'6'};
 const html=View.render(f.book,{tab:'earnings'});
 assert.match(html,/data-action="planner-partner-restore"/);assert.match(html,/Restore partner capacity/);
 assert.match(html,/Removed role work still needs mapping in Service mix/);
 assert.equal(f.current().services[0].allocations[0].poolId,'');
});
