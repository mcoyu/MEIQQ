const test = require('node:test');
const assert = require('node:assert/strict');
const q = require('./engine.js');
const run = (over = {}, days = 30) => {
  const s = q.fresh({...q.clone(q.DEFAULT), ...over});
  for (let i = 0; i < days; i++) if (!q.step(s)) break;
  return s;
};

test('rejects project receipts that disagree with the ledger or contract', () => {
  const s = run();
  s.projects.find(p => p.accepted !== undefined).paid += 1000;
  assert.throws(() => q.restore(s), /paid|receipt|balance/i);
});
test('rejects delivered projects moved back into production work', () => {
  const s = run();
  s.projects.find(p => p.delivered).stage = 'design';
  assert.throws(() => q.restore(s), /stage|delivered/i);
});
test('rejects invalid ledger references including markup', () => {
  const s = run(); s.ledger[0].project = '<b>untrusted</b>';
  assert.throws(() => q.restore(s), /reference|project/i);
});
test('rejects forged daily cash, profit, expenses and delivery revenue', () => {
  for (const key of ['cash', 'profit', 'expenses', 'revenue']) {
    const s = run(); s.history[5][key] += 500;
    assert.throws(() => q.restore(s), /histor|daily|reconcile/i, key);
  }
});
test('rejects backward payment dates and future ledger entries', () => {
  const s = run({paymentDays:30, ownerHours:80, designerHours:80});
  const p = s.projects.find(p => p.stage === 'payment'); p.receiveDay = p.paymentDue - 1;
  assert.throws(() => q.restore(s), /payment|date/i);
  const other = run(); other.ledger[0].day = 99;
  assert.throws(() => q.restore(other), /ledger|date/i);
});
test('fully prepaid deliveries complete immediately without zero-value final receipts', () => {
  const s = q.fresh({...q.clone(q.DEFAULT), deposit:1, realism:true, ownerHours:80, designerHours:80});
  for (let i=0;i<30;i++) {
    q.step(s);
    assert.equal(q.metrics(s).overduePayments,0);
    assert.ok(s.projects.filter(p=>p.delivered).every(p=>p.stage==='complete'));
  }
  assert.ok(s.projects.some(p=>p.delivered));
  assert.ok(!s.ledger.some(e=>e.note==='Final payment'));
});
test('funding immediately appears in current-day history and chart', () => {
  const s = run({},10); q.fund(s,1000);
  assert.equal(s.history.at(-1).cash,s.cash);
  assert.equal(q.cashSeries(s).at(-1).cash,s.cash);
  const zero=q.fresh();q.fund(zero,500);
  assert.equal(q.cashSeries(zero).at(-1).cash,zero.cash);
});
test('funding total and per-project expenses reconcile on restore', () => {
  const s=run();q.fund(s,100);s.funding+=1;
  assert.throws(()=>q.restore(s),/funding|reconcile/i);
  const other=run();other.projects.find(p=>p.cost>0).cost+=1;
  assert.throws(()=>q.restore(other),/cost|reconcile/i);
});
test('sub-cent funding is rejected and fractional receipts use consistent cents',()=>{
  assert.throws(()=>q.fund(q.fresh(),0.001),/positive|cent|amount/i);
  const c=q.clone(q.DEFAULT);c.services.forEach(v=>v.price=290.55);c.deposit=.333;
  const s=run(c);assert.deepEqual(q.restore(s),s);
});
test('day-zero starting-cash edits retain valid monetary precision',()=>{
  const s=q.fresh();q.applyConfig(s,{...s.config,startingCash:1000.125});
  assert.equal(s.initialCash,1000.13);assert.deepEqual(q.restore(s),s);
});
test('all supported horizons survive restore with revisions, funding and commitment edits',()=>{
  for(const months of [1,3,6,12]){
    const s=q.fresh({...q.clone(q.DEFAULT),months,realism:true,startingCash:100000});
    for(let i=0;i<months*30;i++){
      if(i===15)q.fund(s,400.37);
      if(i===20)q.applyConfig(s,{...s.config,designerRate:13.17});
      assert.equal(q.step(s),true);
    }
    assert.deepEqual(q.restore(s),s);
  }
});
