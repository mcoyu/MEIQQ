const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),q=require('./engine.js');
const {setup}=require('./ui-test-host.cjs');
test('known margin bridge distinguishes costs, cash, backlog and owner time',()=>{
 const s=q.fresh();s.revenue=1000;s.expenses=550;s.ownerHours=10;s.config.ownerTarget=30;
 const p={serviceId:'design',service:{name:'Design'},client:'Test',clientId:'C1',contractId:'K1',orderKind:'new-business',accepted:1,ownerHours:2,designHours:5};
 s.projects=[{...p,id:'P1',price:1000,paid:600,cost:300,delivered:true,deliveredDay:5},{...p,id:'P2',price:800,paid:400,cost:150,delivered:false,orderKind:'confirmed-repeat'}];s.contracts=[{id:'K1',kind:'paid-cycle'}];
 const a=q.analytics(s);assert.equal(a.contribution,700);assert.equal(a.contributionMargin,.7);assert.equal(a.unfinishedCost,150);assert.equal(a.overhead,100);assert.equal(a.profit,450);assert.equal(a.operatingMargin,.45);assert.equal(a.afterOwner,150);assert.equal(a.afterOwnerMargin,.15);
 const c=a.contracts[0];assert.equal(c.booked,1800);assert.equal(c.revenue,1000);assert.equal(c.collected,1000);assert.equal(c.receivable,400);assert.equal(c.afterOwner,430);assert.equal(a.backlog,800);assert.equal(a.repeatShare,.5);
 q.fund(s,10000);assert.equal(q.analytics(s).profit,450);
});
test('zero denominators are unavailable and conversion excludes undecided quotes',()=>{
 const s=q.fresh();assert.equal(q.analytics(s).operatingMargin,null);assert.equal(q.analytics(s).averageOrder,null);
 const p={serviceId:'x',service:{name:'X'},orderKind:'new-business',price:0,cost:0,paid:0};
 s.projects=[{...p,id:'P1',stage:'quote'},{...p,id:'P2',stage:'lost'},{...p,id:'P3',stage:'design',accepted:1}];
 const a=q.analytics(s);assert.equal(a.pending,1);assert.equal(a.conversion,.5);
});
test('analytics reconcile over all supported horizons, including restored runs',()=>{
 for(const months of [1,3,6,12]){
  const s=q.fresh({...q.clone(q.DEFAULT),months,startingCash:100000});for(let i=0;i<months*30;i++)assert.equal(q.step(s),true);
  const before=JSON.stringify(s),a=q.analytics(s),sum=(rows,key)=>q.round(rows.reduce((n,r)=>n+r[key],0));
  assert.equal(sum(a.services,'revenue'),s.revenue);assert.equal(sum(a.contracts,'revenue'),s.revenue);assert.equal(sum(a.monthly,'revenue'),s.revenue);assert.equal(sum(a.monthly,'cost'),s.expenses);assert.equal(q.round(a.contribution-a.unfinishedCost-a.overhead),a.profit);
  assert.deepEqual(q.analytics(q.restore(s)),a);assert.equal(JSON.stringify(s),before);
 }
});
test('partial-month costs and owner target changes retain a consistent margin bridge',()=>{
 const s=q.fresh({...q.clone(q.DEFAULT),months:3,startingCash:100000});for(let i=0;i<35;i++)q.step(s);
 const a=q.analytics(s);assert.equal(a.monthly[1].days,5);s.config.ownerTarget=100;
 const b=q.analytics(s);assert.equal(b.profit,a.profit);assert.equal(b.afterOwner,q.round(b.profit-s.ownerHours*100));
 assert.ok(Math.abs(b.monthly.reduce((n,r)=>n+r.afterOwner,0)-b.afterOwner)<=.01);
});
for(const built of [false,true])test((built?'packaged':'source')+' analytics navigation, filtering, pagination and project links work',()=>{
 const {ctx,elements,click,handlers}=setup(undefined,{built});
 vm.runInContext("state=QQ.fresh({...QQ.clone(QQ.DEFAULT),months:3,startingCash:100000,ownerHours:80,designerHours:80});for(let i=0;i<90;i++)QQ.step(state);draft=QQ.clone(state.config);view='finances';render()",ctx);
 for(const tab of ['overview','contracts','performance','cash']){click('analytics-tab',{tab});assert.ok(!/NaN|Infinity/.test(elements['#root'].innerHTML));assert.match(elements['#root'].innerHTML,new RegExp('data-tab="'+tab+'" aria-pressed="true"'));}
 click('analytics-tab',{tab:'contracts'});assert.ok(vm.runInContext('QQ.analytics(state).contracts.length>20',ctx));click('contract-page',{delta:'1'});assert.equal(vm.runInContext('contractPage',ctx),1);
 handlers.change({target:{id:'contract-search',value:'NO SUCH CLIENT',dataset:{}}});assert.match(elements['#root'].innerHTML,/No contracts match/);assert.equal(vm.runInContext('contractPage',ctx),0);
 handlers.change({target:{id:'contract-search',value:'',dataset:{}}});handlers.change({target:{id:'contract-filter',value:'receivable',dataset:{}}});assert.ok(vm.runInContext('filteredContracts(QQ.analytics(state)).every(c=>c.receivable>0)',ctx));
 const id=vm.runInContext('state.projects.find(p=>p.accepted!==undefined).id',ctx);click('project',{id});assert.equal(vm.runInContext('selection.id',ctx),id);assert.equal(vm.runInContext('view',ctx),'map');
});
test('contract display escapes names and sorting leaves source analytics intact',()=>{
 const {ctx}=setup();vm.runInContext("for(let i=0;i<30;i++)QQ.step(state);state.projects.forEach(p=>p.client='<img src=x>');analyticsTab='contracts'",ctx);
 const html=vm.runInContext('financeView(QQ.metrics(state))',ctx);assert.match(html,/&lt;img src=x&gt;/);assert.ok(!html.includes('<img src=x>'));
 vm.runInContext("contractSort='margin'",ctx);assert.equal(vm.runInContext('const a=QQ.analytics(state),before=JSON.stringify(a);filteredContracts(a);JSON.stringify(a)===before',ctx),true);
});
test('same seed comparison never asserts identical external demand',()=>{
 const {ctx}=setup();
 const html=vm.runInContext("saved=[QQ.fresh({...QQ.clone(QQ.DEFAULT),inquiries:100})];checkpointInfo=[{label:'Pinned',kind:'manual',baseline:true}];state=QQ.fresh({...QQ.clone(QQ.DEFAULT),inquiries:10});scenariosTableView()",ctx);
 assert.match(html,/same seed identity/);assert.match(html,/Matching seed identities|associations between runs/);assert.ok(!html.includes('same external demand'));
});
