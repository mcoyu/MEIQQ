const test=require('node:test'),assert=require('node:assert/strict'),P=require('./planner.js'),B=require('./planner-bridge.js'),Q=require('./engine.js');
function supported(){const b=P.fresh(),p=P.create(b);for(const [k,v]of Object.entries({ownerHours:'44',nonProjectHours:'0',bufferPct:'0',ownerTarget:'1000',profitTarget:'200'}))P.update(b,p.id,k,v);P.update(b,p.id,'expenses.0.amount','100');const pool=P.addPool(b,p.id,{name:'Creative delivery',hours:'88',rate:'25'});const s=P.addService(b,p.id,{name:'Design concept',quantity:'4',setupCount:'0',price:'500',directCost:'0',ownerHours:'2'});P.setAllocation(b,p.id,s.id,pool.id,{hours:'5',setupHours:''});return{b,id:p.id,get p(){return b.plans[0];}};}
const assumptions={startingCash:'2500',inquiries:'8',conversion:'50',deposit:'50',approvalDays:'2',paymentDays:'5',leadDays:'14',seed:'2417'};
test('adapter preserves capacity, used-hour rate, mix and review assumptions without modifying its source',()=>{const f=supported(),before=JSON.stringify(f.b),r=B.prepare(f.p,assumptions,'2026-11-20');assert.equal(JSON.stringify(f.b),before);assert.equal(r.config.ownerHours,10);assert.equal(r.config.designerHours,20);assert.equal(r.config.designerRate,25);assert.equal(r.config.services[0].hours,5);assert.equal(r.config.services[0].weight,100);assert.equal(r.config.overhead,100);assert.equal(r.config.services[0].recurring,false);assert.deepEqual(Q.configIssues(r.config),[]);assert.deepEqual(r.record.plan,f.p);});
test('adapter refuses to flatten distinct roles, setup or generic costs into the print workflow',()=>{const f=supported();P.update(f.b,f.id,'services.0.setupCount','1');assert.match(B.inspect(f.p).reasons.join(' '),/setup/);P.update(f.b,f.id,'services.0.setupCount','0');P.update(f.b,f.id,'services.0.directCost','20');assert.match(B.inspect(f.p).reasons.join(' '),/generic direct costs/);P.update(f.b,f.id,'services.0.directCost','0');const p=P.addPool(f.b,f.id,{name:'Analyst',hours:'10',rate:'30'});P.setAllocation(f.b,f.id,f.p.services[0].id,p.id,{hours:'1',setupHours:'0'});assert.match(B.inspect(f.p).reasons.join(' '),/multiple paid roles/);assert.throws(()=>B.prepare(f.p,assumptions,'2026-11-20'),/multiple paid roles/);});
test('adapter requires market and cash assumptions and respects simulator bounds',()=>{const f=supported();assert.throws(()=>B.prepare(f.p,{},'2026-11-20'),/starting cash/);assert.throws(()=>B.prepare(f.p,{...assumptions,inquiries:'501'},'2026-11-20'),/between 0 and 500/);P.update(f.b,f.id,'ownerHours','1000');assert.throws(()=>B.prepare(f.p,assumptions,'2026-11-20'),/Simulator limit/);});

test('new restaurant clients with zero extra setup can be simulated through delivery and collection',()=>{
 const f=supported(),poolId=f.p.pools[0].id;
 const fields={name:'Café lunch board',unit:'one digital board',setupCount:'4',setupCost:'0.00',setupOwnerHours:'0',price:'370',ownerHours:'0.25','allocations.0.hours':'0.50','allocations.0.setupHours':'0.0'};
 for(const [key,value] of Object.entries(fields))P.update(f.b,f.id,'services.0.'+key,value);
 const second=P.addService(f.b,f.id,{name:'Bakery email',unit:'one email',quantity:'4',setupCount:'2',setupCost:'0',setupOwnerHours:'0',price:'240',directCost:'0',ownerHours:'0.50'});
 P.setAllocation(f.b,f.id,second.id,poolId,{hours:'1',setupHours:'0'});
 const {config}=B.prepare(f.p,{...assumptions,inquiries:'20',conversion:'100',approvalDays:'0',paymentDays:'0'},'2026-11-26');
 assert.deepEqual(config.services.map(s=>[s.price,s.deliverable,s.weight]),[[370,'one digital board',50],[240,'one email',50]]);
 const run=Q.fresh(config);while(Q.step(run)){}
 assert.equal(run.day,30);assert.equal(run.blocked,null);
 for(const service of config.services){
  const paid=run.projects.filter(p=>p.serviceId===service.id&&p.stage==='complete');
  assert.ok(paid.length>0);assert.ok(paid.every(p=>p.delivered&&p.paid===service.price&&p.designHours===service.hours&&p.ownerHours===service.review));
 }
 assert.equal(run.cash,Math.round((run.initialCash+run.ledger.reduce((total,e)=>total+e.amount,0))*100)/100);
 for(const key of ['setupCost','setupOwnerHours','allocations.0.setupHours']){
  P.update(f.b,f.id,'services.0.'+key,'.01');
  assert.match(B.inspect(f.p).reasons.join(' '),/setup work/);
  P.update(f.b,f.id,'services.0.'+key,'0');
 }
});

test('review catches unrepresentable owner time and overhead before asking for demand and payment assumptions',()=>{
 const f=supported(),plan=()=>f.p;
 P.update(f.b,f.id,'ownerHours','8');P.update(f.b,f.id,'nonProjectHours','10');
 assert.equal(B.inspect(plan()).supported,false);
 assert.match(B.inspect(plan()).reasons.join(' '),/non-project time exceeds/);
 assert.throws(()=>B.prepare(plan(),{},'2026-11-26'),/non-project time exceeds/);
 P.update(f.b,f.id,'nonProjectHours','8');
 assert.equal(B.prepare(plan(),assumptions,'2026-11-26').config.ownerHours,0);
 P.update(f.b,f.id,'expenses.0.amount','10000001');
 assert.equal(B.inspect(plan()).supported,false);assert.match(B.inspect(plan()).reasons.join(' '),/overhead/i);
});
