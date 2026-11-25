const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const q = require('./engine.js');
const workspaces = require('./workspace.js');
const {setup} = require('./ui-test-host.cjs');

function experiment(cutoff=47) {
  const source = q.fresh({...q.clone(q.DEFAULT), months:3, ownerHours:40, designers:1, designerHours:0,
    conversion:1, inquiries:3, startingCash:10000, realism:false});
  while (source.day < cutoff) {
    assert.ok(q.step(source));
    if (source.day === 35) {
      q.fund(source,500);
      q.applyConfig(source,{...source.config,overhead:345});
    }
  }
  const replay = q.startCapacityReplay(source,{month:1,key:'designerHours',value:8});
  while (replay.phase !== 'done') q.stepCapacityReplay(replay);
  assert.ok(q.capacityReplayResult(replay).comparable);
  const descriptor = {month:1,key:'designerHours',before:0,after:8,firstDay:1,endDay:30,sourceDay:cutoff,demandId:null};
  const current = {state:source,saved:[],checkpointInfo:[],draft:q.clone(source.config),recoveryFiles:[]};
  return {current,source,base:replay.baseline,alt:replay.alternative,descriptor};
}

test('a saved carry preserves the original day, later decisions and horizon even after the active run changes',()=>{
  const {current,source,base,alt,descriptor} = experiment();
  const monthly = workspaces.saveReplayPair(current,base,alt,descriptor,source);
  const carried = workspaces.saveReplayPair(monthly,base,alt,{...descriptor,carriedThrough:90},source);
  assert.equal(carried.checkpointInfo[1].replays.length,1);
  assert.equal(carried.record.carriedThrough,90);
  assert.equal(monthly.record.carriedThrough,undefined);
  const resaved = workspaces.saveReplayPair(carried,base,alt,descriptor,source);
  assert.equal(resaved.record.carriedThrough,90);
  const original = q.clone(source);
  const packed = workspaces.pack({...current,...carried});
  assert.equal(packed.runs.length,3);
  assert.deepEqual(packed.current.replaySources,[{checkpoint:1,record:0,run:packed.current.state}]);
  assert.equal(packed.current.checkpointInfo[1].replays[0].source,undefined);

  assert.ok(q.step(source));
  q.applyConfig(source,{...source.config,months:4,overhead:999});
  const next = {...current,...carried};
  const restored = workspaces.parseText(workspaces.serialize(next,[{label:'Copy',workspace:next}]));
  assert.equal(restored.state.day,48);
  assert.equal(restored.state.config.months,4);
  const record = restored.checkpointInfo[1].replays[0];
  assert.deepEqual(record.source,original);
  assert.equal(record.source,restored.archives[0].workspace.checkpointInfo[1].replays[0].source);
  assert.equal(restored.saved.length,2);
  assert.equal(record.carriedThrough,90);
  const rerun = q.startCapacityCarry(record.source,restored.saved[0],restored.saved[1],record);
  while (rerun.phase !== 'done') q.stepCapacityCarry(rerun);
  const result = q.capacityCarryResult(rerun);
  assert.ok(result.comparable,result.reason);
  assert.equal(result.endDay,90);
  assert.equal(rerun.baseline.funding,500);
  assert.equal(rerun.alternative.funding,500);
  assert.equal(rerun.baseline.config.overhead,345);
  assert.equal(restored.state.config.overhead,999);
});

test('distinct later decisions keep separate saved carries even when they have identical month endpoints',()=>{
  const {current,source,base,alt,descriptor} = experiment();
  const first = workspaces.saveReplayPair(current,base,alt,descriptor,source);
  q.fund(source,25);
  const second = workspaces.saveReplayPair(first,base,alt,descriptor,source);
  assert.equal(second.saved.length,2);
  assert.equal(second.checkpointInfo[1].replays.length,2);
  assert.equal(second.checkpointInfo[1].replays[0].source.cash+25,second.record.source.cash);
  const packed = workspaces.pack({...current,...second});
  assert.equal(packed.runs.length,4);
  for (const invalidate of [
    copy => {copy.current.replaySources[0].run=copy.current.saved[1];},
    copy => {copy.current.replaySources[0].record=99;},
    copy => {copy.current.replaySources.push({...copy.current.replaySources[0]});},
    copy => {copy.current.checkpointInfo[1].replays[0].carriedThrough=60;},
    copy => {copy.current.checkpointInfo[1].replays[0].source=source;},
  ]) {
    const broken = q.clone(packed);
    invalidate(broken);
    assert.throws(()=>workspaces.parse(broken),/replay/i);
  }
  workspaces.removeCheckpoint(second.saved,second.checkpointInfo,0);
  assert.equal(workspaces.pack({...current,...second}).current.replaySources,undefined);
});

test('legacy pairs project from the retained close without attributing later original funding or decisions to either copy',()=>{
  const ui=setup();
  for(const cutoff of [17,30,47]){
    const {current,base,alt,descriptor}=experiment(cutoff);
    const legacy=workspaces.saveReplayPair(current,base,alt,descriptor);
    const reopened=workspaces.parseText(workspaces.serialize({...current,...legacy}));
    ui.ctx.record=reopened.checkpointInfo[1].replays[0];
    const result=vm.runInContext('savedCarrySource(record)',ui.ctx);
    assert.equal(result.source,null);
    assert.equal(result.available,true);
    assert.equal(Boolean(result.projectFromClose),cutoff>=30);
    if(cutoff<30)continue;
    assert.match(result.reason,/month-end settings/);
    const record=reopened.checkpointInfo[1].replays[0];
    const carry=q.startCapacityCarry(result.source,...reopened.saved,{...record,projectFromClose:result.projectFromClose});
    while(carry.phase!=='done')q.stepCapacityCarry(carry);
    const forecast=q.capacityCarryResult(carry);
    assert.ok(forecast.comparable,forecast.reason);
    assert.equal(forecast.sourceDay,cutoff);
    assert.equal(forecast.projectionFromDay,31);
    assert.equal(carry.baseline.funding,0);
    assert.equal(carry.alternative.funding,0);
    const upgrade=workspaces.saveReplayPair(reopened,...reopened.saved,{...record,carriedThrough:90,projectFromClose:true});
    assert.equal(upgrade.checkpointInfo[1].replays.length,1);
    const packed=workspaces.pack({...reopened,...upgrade});
    const stored=packed.current.checkpointInfo[1].replays[0];
    assert.equal(stored.carriedThrough,90);
    assert.equal(stored.sourceDay,cutoff);
    assert.equal(stored.projectFromClose,undefined);
    assert.equal(packed.current.replaySources,undefined);
  }
});
