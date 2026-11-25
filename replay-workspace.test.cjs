const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const q = require('./engine.js');
const workspace = require('./workspace.js');
const {setup} = require('./ui-test-host.cjs');

function experiment() {
  const state = q.fresh({...q.clone(q.DEFAULT), months:3, designerHours:0, designers:1,
    inquiries:12, conversion:1, ownerHours:75, startingCash:50000, realism:false});
  while (state.day < 47) assert.ok(q.step(state));
  const target = state.projects.find(p => p.stage === 'design');
  const session = q.startCapacityReplay(state,{month:2,key:'designerHours',value:32,demandId:target.demandId});
  while (session.phase !== 'done') q.stepCapacityReplay(session);
  const r = q.capacityReplayResult(session);
  assert.ok(r.comparable,r.reason);
  assert.equal(q.round(r.delta.revenue-r.delta.cost),r.delta.profit);
  const descriptor = {month:2, key:r.key, before:r.before, after:r.value,
    demandId:target.demandId, firstDay:r.firstDay, endDay:r.endDay, sourceDay:r.sourceDay};
  const other = q.fresh();
  const current = {state, draft:{...q.clone(state.config),ownerHours:null}, saved:[other],
    checkpointInfo:[{label:'My pinned checkpoint',kind:'manual',baseline:true}], recoveryFiles:[]};
  return {current,base:session.baseline,alt:session.alternative,descriptor};
}

test('saving multiple job comparisons preserves the active run, draft, pinned checkpoint and selected subject', () => {
  const {current,base,alt,descriptor} = experiment();
  const untouched = JSON.stringify(current);
  const first = workspace.saveReplayPair(current,base,alt,descriptor);
  const nextJob = base.projects.find(p => p.demandId !== descriptor.demandId);
  const secondDescriptor = {...descriptor,demandId:nextJob.demandId};
  const second = workspace.saveReplayPair(first,base,alt,secondDescriptor);
  const repeated = workspace.saveReplayPair(second,base,alt,secondDescriptor);
  assert.equal(JSON.stringify(current),untouched);
  assert.equal(repeated.saved.length,3);
  assert.equal(repeated.checkpointInfo[2].replays.length,2);
  assert.equal(repeated.record,repeated.checkpointInfo[2].replays[1]);
  assert.equal(repeated.checkpointInfo[0].baseline,true);
  const packed = workspace.serialize({...current,...repeated});
  const reopened = workspace.parseText(packed);
  assert.deepEqual(reopened.state,current.state);
  assert.equal(reopened.draft.ownerHours,null);
  assert.deepEqual(reopened.checkpointInfo,repeated.checkpointInfo);
  const ui = setup();
  const storageKey = vm.runInContext('KEY',ui.ctx);
  const restoredUI = setup([[storageKey,packed]]);
  restoredUI.click('open-saved-replay',{index:'2',record:'1'});
  assert.match(restoredUI.elements['#root'].innerHTML,/One-change replay · Month 2/);
  assert.equal(vm.runInContext('comparedRuns().record.demandId',restoredUI.ctx),nextJob.demandId);
  restoredUI.elements['#checkpoint-name'] = {value:'Higher design capacity'};
  restoredUI.click('confirm-rename',{index:'2'});
  assert.equal(vm.runInContext('comparedRuns().record.demandId',restoredUI.ctx),nextJob.demandId);
  assert.equal(vm.runInContext('baselineIndex()',restoredUI.ctx),0);
});

test('deleting a baseline removes its links, and imports reject broken experiment references and retention metadata', () => {
  const {current,base,alt,descriptor} = experiment();
  const pair = workspace.saveReplayPair(current,base,alt,descriptor);
  const packed = workspace.pack({...current,...pair});
  for (const breakRecord of [
    infos => {infos[2].replays[0].baselineId = 'replay-999';},
    infos => {infos[2].replays[0].demandId = 'missing';},
    infos => {infos[2].replays[0].sourceDay = 17;},
    infos => {infos[1].kind = 'automatic';},
  ]) {
    const broken = q.clone(packed);
    breakRecord(broken.current.checkpointInfo);
    assert.throws(() => workspace.parse(broken),/replay/i);
  }
  workspace.removeCheckpoint(pair.saved,pair.checkpointInfo,1);
  assert.equal(pair.saved.length,2);
  assert.equal(pair.checkpointInfo[1].replays,undefined);
  assert.deepEqual(workspace.parseText(workspace.serialize({...current,...pair})).saved[1],alt);
});
