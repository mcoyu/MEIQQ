const test = require('node:test');
const assert = require('node:assert/strict');
const q = require('./engine.js');
const presets = require('./presets.js');
const catalog = require('./service-catalog.js');

const restaurant = () => presets.newWorkspaceConfig({...q.DEFAULT,services:catalog.starterServices()});
const cents = amount => Math.round(amount * 100);
function advance(run,day) { while (run.day < day) assert.ok(q.step(run)); }
function prepare(source,month,value,demandId=null) {
  const pair=q.startCapacityReplay(source,{month,key:'designerHours',value,demandId});
  while (pair.phase!=='done') q.stepCapacityReplay(pair);
  const carry=q.startCapacityCarry(source,pair.baseline,pair.alternative,pair);
  while (carry.phase!=='done') q.stepCapacityCarry(carry);
  return carry;
}
function reconcile(a) {
  for (const side of ['baseline','alternative','delta']) {
    const t=a[side];
    const jobCents=a.rows.reduce((n,r)=>n+cents(r[side]?.cost??0),0);
    assert.equal(jobCents+cents(t.overhead),cents(t.cost));
    assert.equal(cents(t.deliveredCost)+cents(t.unfinishedCost),jobCents);
    for (const field of ['designLabor','supplierCost','otherDirectCost']) {
      assert.equal(a.rows.reduce((n,r)=>n+cents(r[side]?.[field]??0),0),cents(t[field]));
    }
  }
  const statusCents=Object.values(a.byChangedStatus).reduce((n,v)=>n+cents(v),0);
  assert.equal(statusCents+cents(a.delta.overhead),cents(a.delta.cost));
}

test('the $405.26 restaurant cost difference reconciles by paired job cycle, labor, and ending delivery status',()=>{
  const s=q.fresh({...restaurant(),designerHours:6});
  advance(s,30);
  const carry=prepare(s,1,12,'lead:10:0'),r=q.capacityCarryResult(carry),a=r.costAttribution;
  assert.ok(r.comparable,r.reason);
  assert.deepEqual([a.firstDay,a.endDay,a.delta.cost,r.delta.cost],[1,90,405.26,405.26]);
  assert.deepEqual([a.baseline.designHours,a.alternative.designHours,a.delta.designHours],[66.39,88.90,22.52]);
  assert.deepEqual([a.baseline.unfinishedCost,a.alternative.unfinishedCost,a.delta.unfinishedCost],[199.53,604.80,405.27]);
  assert.deepEqual([a.delta.designLabor,a.delta.supplierCost,a.delta.overhead],[405.26,0,0]);
  assert.deepEqual(a.byChangedStatus,{unfinished:405.27,delivered:-.01,absent:0,unaccepted:0});
  const rows=a.rows.filter(row=>row.delta.cost).map(({baseline:b,alternative:c,delta:d})=>[b?.id,c.id,c.cycle,d.designHours,d.cost]);
  assert.deepEqual(rows,[[undefined,'P018',3,13.79,248.18],['P021','P019',2,11.65,209.75],['P017','P020',1,-2.93,-52.66],['P008','P008',1,0,-.01]]);
  const target=a.rows.find(row=>row.demandId==='lead:10:0');
  assert.deepEqual([target.baseline.id,target.alternative.id,target.baseline.deliveredDay,target.alternative.deliveredDay],['P003','P003',47,33]);
  assert.deepEqual([target.baseline.designHours,target.alternative.designHours,target.delta.cost],[14.33,14.33,0]);
  reconcile(a);
  assert.deepEqual(q.capacityCarryPairResult(q.restore(carry.baseline),q.restore(carry.alternative),carry).costAttribution,a);
});

test('later replay months exclude opening hours and dollars across a zero-rate interval, including undated legacy labor',()=>{
  const s=q.fresh({...q.clone(q.DEFAULT),designerHours:2,designerRate:17.37,conversion:1,inquiries:9,
    ownerHours:50,realism:false,startingCash:20000,services:[{...q.DEFAULT.services[0],hours:35,weight:100}]});
  advance(s,30);
  const opening=new Map(s.projects.map(p=>[p.demandId,p.designHours]));
  assert.ok([...opening.values()].some(n=>n>0));
  q.applyConfig(s,{...s.config,designerRate:0});
  advance(s,47);
  q.applyConfig(s,{...s.config,designerRate:23.39});advance(s,76);
  const carry=prepare(s,2,14);
  const current=q.capacityCarryResult(carry),a=current.costAttribution;
  assert.deepEqual([a.firstDay,a.endDay,a.delta.cost],[31,90,current.delta.cost]);
  for(const side of ['baseline','alternative']) {
    const run=carry[side],hours=run.projects.reduce((n,p)=>n+p.designHours-(opening.get(p.demandId)??0),0);
    assert.equal(a[side].designHours,q.round(hours));
    assert.equal(a[side].cost,q.round(run.expenses-run.history[29].expenses));
    assert.ok(run.ledger.some(e=>e.day>=31&&e.day<=47&&e.designHours>0&&e.amount===0));
    for(const row of a.rows.filter(r=>r[side])){
      const p=run.projects.find(p=>p.demandId===row.demandId);
      assert.equal(row[side].designHours,q.round(p.designHours-(opening.get(p.demandId)??0)));
    }
  }
  reconcile(a);
  // Older month-end pairs and mixed-version runs lack the optional hours
  // on early expense postings, including the zero-dollar shifts.
  const old=run=>{const copy=q.clone(run);for(const e of copy.ledger)if(e.day<=60)delete e.designHours;return q.restore(copy);};
  const legacy=q.capacityCarryPairResult(old(carry.baseline),old(carry.alternative),carry);
  assert.deepEqual(legacy.costAttribution,a);
  // Totals and dollar postings still balance, but the recorded common
  // opening workforce must also match on the days both copies recorded it.
  const altered=q.clone(carry.alternative),first=altered.ledger.find(e=>e.day<30&&e.designHours>.01);
  const other=altered.ledger.find(e=>e!==first&&e.day<=30&&e.project===first.project&&e.designHours>.01);
  first.designHours+=.0001;other.designHours-=.0001;
  const mismatched=q.capacityCarryPairResult(carry.baseline,q.restore(altered),carry);
  assert.equal(mismatched.comparable,false);assert.equal(mismatched.costAttribution,null);
});

test('different closing statuses separate work-in-progress movement from incremental spending on still-open work',()=>{
  const s=q.fresh({...q.clone(q.DEFAULT),designerHours:1,designerRate:11.75,months:3,conversion:1,
    inquiries:12,ownerHours:80,realism:false,startingCash:30000,services:[{...q.DEFAULT.services[0],
    weight:100,hours:15,print:55,price:550,recurring:false}]});
  advance(s,30);q.applyConfig(s,{...s.config,inquiries:0});
  advance(s,90);
  const r=q.capacityCarryResult(prepare(s,1,40)),a=r.costAttribution;
  assert.ok(r.comparable);
  assert.ok(a.delta.supplierCost>0);
  assert.notEqual(a.delta.unfinishedCost,a.byChangedStatus.unfinished);
  assert.ok(a.rows.some(row=>row.baseline?.unfinished&&row.alternative?.deliveredDay));
  reconcile(a);
});

test('bad optional labor records reject on restore, unsigned legacy postings still restore, and funding holds suppress attribution',()=>{
  const s=q.fresh({...restaurant(),designerHours:6});advance(s,30);
  const name='Designer hours on';
  const invalid=patch=>{const t=q.clone(s);patch(t);assert.throws(()=>q.restore(t),error=>error.message.startsWith(name));};
  invalid(t=>{t.ledger.find(e=>e.designHours).designHours=-1;});
  invalid(t=>{t.ledger.find(e=>e.designHours).designHours*=.5;});
  invalid(t=>{t.ledger.find(e=>e.type==='receipt').designHours=3;});
  for(const e of s.ledger)delete e.designHours;
  assert.equal(q.restore(s).designHours,s.designHours);
  const held=q.fresh({...q.clone(q.DEFAULT),overhead:100,startingCash:150,inquiries:0});
  advance(held,16);
  const interrupted=q.capacityCarryResult(prepare(held,1,32));
  assert.equal(interrupted.comparable,false);assert.equal(interrupted.costAttribution,null);
});
