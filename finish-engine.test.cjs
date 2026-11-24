const test=require('node:test');
const assert=require('node:assert/strict');
const q=require('./engine.js');
const w=require('./workspace.js');

const setup=over=>({...q.clone(q.DEFAULT),months:3,startingCash:0,overhead:0,
  deposit:0,conversion:1,inquiries:30,profileStrength:0,ownerHours:15,
  designers:1,designerHours:20,designerRate:18,quoteHours:.5,
  approvalDays:0,printDays:0,paymentDays:0,deliveryHours:.5,repeat:0,retention:0,
  services:[{id:'menu',name:'Restaurant menu refresh',deliverable:'Updated menu and one print batch',
    price:650,hours:6,review:.75,print:85,weight:100,recurring:false,color:'#224466'}],...over});
const reopen=state=>w.parseText(w.serialize({state,saved:[],checkpointInfo:[],draft:q.clone(state.config),recoveryFiles:[]})).state;

test('a new-project cash pause survives backup and an atomic funded retry',()=>{
  for(const kind of ['labor','print']){
    const c=setup();
    if(kind==='print')Object.assign(c,{quoteHours:0,deliveryHours:0,services:[{...c.services[0],hours:0,review:0}]});
    const state=q.fresh(c),before=q.clone(state);
    assert.equal(q.step(state),false,kind);
    assert.equal(state.day,0);
    assert.equal(state.projects.length,0);
    assert.equal(state.blocked.project,null);
    assert.match(state.blocked.note,/P001/);
    assert.deepEqual({...state,blocked:null},before);
    const restored=reopen(state);
    assert.deepEqual(restored,state);
    const gap=state.blocked.gap;
    q.fund(restored,gap/2);
    assert.equal(q.step(restored),false);
    assert.equal(restored.blocked.gap,q.round(gap/2));
    assert.equal(restored.day,0);
    assert.equal(restored.projects.length,0);
    const pausedAgain=reopen(restored);
    q.fund(pausedAgain,pausedAgain.blocked.gap);
    assert.equal(q.step(pausedAgain),true);
    const fundedAtStart=q.fresh({...c,startingCash:gap});
    assert.equal(q.step(fundedAtStart),true);
    assert.equal(pausedAgain.cash,fundedAtStart.cash);
    assert.equal(pausedAgain.expenses,fundedAtStart.expenses);
    assert.deepEqual(pausedAgain.projects,fundedAtStart.projects);
    assert.deepEqual(reopen(pausedAgain),q.clone(pausedAgain));
  }
});

test('a cash pause on an existing project keeps its inspectable reference after reopen',()=>{
  const state=q.fresh(setup({startingCash:72}));
  assert.equal(q.step(state),true);
  const id=state.projects[0].id;
  assert.equal(q.step(state),false);
  assert.equal(state.blocked.project,id);
  const restored=reopen(state);
  assert.equal(restored.blocked.project,id);
  q.fund(restored,1000);
  assert.equal(q.step(restored),true);
  assert.deepEqual(reopen(restored),q.clone(restored));
});

test('reopening an older rollback repairs only a reproducible orphaned payment diagnostic',()=>{
  const state=q.fresh(setup());
  assert.equal(q.step(state),false);
  const legacy=q.clone(state);legacy.blocked.project='P001';
  assert.deepEqual(reopen(legacy),state);
  for(const change of [
    value=>{value.blocked.project='P999';value.blocked.note='Design labor for P999';},
    value=>{value.blocked.amount++;value.blocked.gap++;},
    value=>{value.blocked.note='Unrecognized payment';}
  ]){
    const malformed=q.clone(legacy);change(malformed);
    assert.throws(()=>q.restore(malformed),/Cash decision is invalid/);
  }
});
