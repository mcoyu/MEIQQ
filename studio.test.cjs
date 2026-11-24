const test = require('node:test');
const assert = require('node:assert/strict');
const studio = require('./studio.js');

const refresh = () => ({name:'Refresh experiment', family:'Design', status:'idea',
  price:'350', directCost:'200', overhead:'20', ownerHours:'2', ownerRate:'40', setupOwnerHours:'0', setupCost:'0',
  roles:[{name:'Designer', hours:'3', setupHours:'0', rate:'25'}]});

test('blank ideas preserve unknown estimates and do not promise earnings', () => {
  const state = studio.fresh();
  const idea = studio.create(state);
  assert.equal(idea.status, 'idea');
  assert.equal(idea.name, '');
  assert.equal(idea.id, 'idea-1');
  const result = studio.economics(idea);
  assert.equal(result.price, null);
  assert.equal(result.afterOwner, null);
  assert.equal(result.firstDelivery, null);
  assert.equal(result.scenarioResult, null);
  assert.equal(result.validity.repeat, false);
  assert.ok(result.issues.some(issue => issue.path === 'roles.0.hours' && issue.kind === 'unknown'));
  assert.ok(!result.issues.some(issue => issue.path === 'scenarioQuantity'));
});

test('repeat economics distinguish direct costs, owner allowance and overhead without hiding loss', () => {
  const idea = studio.create(studio.fresh(), refresh());
  const result = studio.economics(idea);
  assert.equal(result.laborCost, 7500);
  assert.equal(result.directCosts, 27500);
  assert.equal(result.afterDirect, 7500);
  assert.equal(result.ownerAllowance, 8000);
  assert.equal(result.afterOwner, -2500);
  assert.equal(result.firstDelivery, -2500);
  assert.equal(result.deliveryHours, 5);
  assert.equal(result.firstHours, 5);
  assert.equal(result.validity.first, true);
  assert.equal(result.repeatOwnerReturn, 5500);
  assert.equal(result.repeatOwnerHourly, 2750);
  assert.equal(result.firstOwnerHourly, 2750);
});

test('initial preparation is charged once and kept separate from repeated delivery', () => {
  const idea = studio.create(studio.fresh(), {...refresh(), price:'600', setupCost:'30', setupOwnerHours:'1', scenarioQuantity:'3',
    roles:[{name:'Designer', hours:'3', setupHours:'2', rate:'25'}]});
  const result = studio.economics(idea);
  assert.equal(result.afterOwner, 22500);
  assert.equal(result.setupLaborCost, 5000);
  assert.equal(result.setupCosts, 8000);
  assert.equal(result.setupOwnerAllowance, 4000);
  assert.equal(result.setupTotal, 12000);
  assert.equal(result.firstDelivery, 10500);
  assert.equal(result.scenarioResult, 55500);
  assert.equal(result.setupHours, 3);
  assert.equal(result.firstHours, 8);
  assert.equal(result.firstOwnerHours, 3);
  assert.equal(result.repeatOwnerReturn, 30500);
  assert.equal(result.firstOwnerReturn, 22500);
  assert.equal(result.repeatOwnerHourly, 15250);
  assert.equal(result.firstOwnerHourly, 7500);
});

test('missing setup estimates do not conceal known repeat economics', () => {
  const idea = studio.create(studio.fresh(), {...refresh(), setupCost:'', setupOwnerHours:'',
    roles:[{name:'Designer', hours:'3', setupHours:'', rate:'25'}]});
  const result = studio.economics(idea);
  assert.equal(result.afterOwner, -2500);
  assert.equal(result.firstDelivery, null);
  assert.equal(result.validity.repeat, true);
  assert.equal(result.validity.setup, false);
});

test('invalid and unfinished numeric drafts round-trip without becoming zero or valid results', () => {
  const state = studio.fresh();
  const idea = studio.create(state, {...refresh(), price:'-10', ownerRate:'', directCost:'not quoted', overhead:'1e3', setupCost:'Infinity',
    roles:[{name:'Analyst', hours:'3.333', setupHours:'', rate:'NaN'}]});
  const restored = studio.parseText(studio.serialize(state));
  assert.deepEqual(restored, state);
  assert.equal(restored.offerings[0].directCost, 'not quoted');
  const result = studio.economics(idea);
  assert.equal(result.afterDirect, null);
  assert.equal(result.ownerAllowance, null);
  assert.equal(result.afterOwner, null);
  assert.ok(result.issues.some(issue => issue.path === 'price' && issue.kind === 'invalid'));
  assert.ok(result.issues.some(issue => issue.path === 'ownerRate' && issue.kind === 'unknown'));
});

test('half-cent labor rounds from decimal integers, with displayed lines reconciling', () => {
  const idea = studio.create(studio.fresh(), {...refresh(), roles:[{name:'Designer', hours:'0.50', setupHours:'0.50', rate:'20.15'}]});
  const result = studio.economics(idea);
  assert.equal(result.laborCost, 1008);
  assert.equal(result.setupLaborCost, 1008);
  assert.equal(result.afterOwner, result.price - result.laborCost - result.directCost - result.ownerAllowance - result.overhead);
  assert.equal(result.firstDelivery, result.afterOwner - result.setupTotal);
});

test('explicit zero costs and an empty external team are valid, while an absent owner target remains unknown', () => {
  const state = studio.fresh();
  const idea = studio.create(state, {price:'0', roles:[], directCost:'0', overhead:'0', ownerHours:'0', ownerRate:'0', setupOwnerHours:'0', setupCost:'0'});
  assert.equal(studio.economics(idea).firstDelivery, 0);
  assert.equal(studio.economics(idea).deliveryHours, 0);
  assert.equal(studio.economics(idea).repeatOwnerHourly, null);
  assert.equal(studio.economics(idea).firstOwnerHourly, null);
  const changed = studio.setField(state, idea.id, 'ownerRate', '');
  assert.equal(studio.economics(changed).afterDirect, 0);
  assert.equal(studio.economics(changed).afterOwner, null);
});

test('independent IDs survive deletion and duplication; editing or copying never changes the original version', () => {
  const state = studio.fresh();
  const first = studio.create(state, refresh());
  const second = studio.create(state, {name:'Research'});
  assert.equal(first.roles[0].id, 'role-1');
  studio.remove(state, first.id);
  const third = studio.create(state);
  assert.equal(third.id, 'idea-3');
  const updated = studio.setField(state, second.id, 'name', 'Changed research');
  assert.equal(updated.version, 2);
  assert.equal(second.name, 'Research');
  assert.equal(studio.update(state, second.id, {name:'Changed research'}).version, 2);
  studio.update(state, second.id, {status:'ready'});
  const copied = studio.duplicate(state, second.id);
  assert.equal(copied.id, 'idea-4');
  assert.equal(copied.version, 1);
  assert.equal(copied.status, 'idea');
  assert.equal(state.offerings.find(item => item.id === second.id).status, 'ready');
  copied.roles[0].name = 'Different role';
  assert.equal(state.offerings.find(item => item.id === second.id).roles[0].name, 'Delivery role');
});

test('role edits are bounded and new roles get unique normalized IDs', () => {
  const state = studio.fresh(), idea = studio.create(state, refresh());
  const updated = studio.update(state, idea.id, {roles:[idea.roles[0], {name:'Review', hours:'1', rate:'30', setupHours:'0'}]});
  assert.deepEqual(updated.roles.map(role => role.id), ['role-1', 'role-2']);
  assert.equal(studio.setField(state, idea.id, 'roles.1.hours', '2').roles[1].hours, '2');
  assert.throws(() => studio.setField(state, idea.id, '__proto__.polluted', 'yes'));
  assert.throws(() => studio.setField(state, idea.id, 'roles.80.hours', '1'));
  assert.throws(() => studio.update(state, idea.id, {roles:[updated.roles[0], updated.roles[0]]}));
  assert.equal({}.polluted, undefined);
});

test('Studio backups strictly reject mixed, future, malformed and duplicate records', () => {
  const state = studio.fresh(), idea = studio.create(state, refresh());
  const envelope = JSON.parse(studio.serialize(state));
  for (const bad of [
    {...envelope, format:'meiqq-workspace'}, {...envelope, version:2}, {...envelope, state:{}},
    {...envelope, studio:{...state, version:2}},
    {...envelope, studio:{...state, offerings:[idea, idea]}},
    {...envelope, studio:{...state, nextId:1}},
    {...envelope, studio:{...state, offerings:[{...idea, id:'../idea-1'}]}},
    {...envelope, studio:{...state, offerings:[{...idea, price:350}]}},
    {...envelope, studio:{...state, offerings:[{...idea, status:'active'}]}}
  ]) assert.throws(() => studio.parse(bad));
  assert.throws(() => studio.parseText('{broken'));
  assert.throws(() => studio.parseText(' '.repeat(studio.MAX_BYTES + 1)));
  const restored = studio.parse(envelope);
  restored.offerings[0].roles[0].name = 'Local edit';
  assert.equal(state.offerings[0].roles[0].name, 'Designer');
});

test('Studio edits and backups cannot mutate simulation runs or catalog definitions', () => {
  const q = require('./engine.js'), catalog = require('./service-catalog.js');
  const service = catalog.createService('digital-flyer');
  const run = q.fresh({...q.clone(q.DEFAULT), services:[{...service, weight:100}]});
  const before = JSON.stringify(run), catalogBefore = JSON.stringify(catalog.SERVICES);
  const state = studio.fresh();
  const idea = studio.create(state, {...refresh(), origin:{kind:'catalog', ref:service.id, label:'Catalog example'}, scope:service.spec.scope});
  studio.setField(state, idea.id, 'price', '999');
  studio.parseText(studio.serialize(state));
  assert.equal(JSON.stringify(run), before);
  assert.equal(JSON.stringify(catalog.SERVICES), catalogBefore);
  assert.notEqual(studio.STORAGE_KEY, 'qq-studio-lab-v1');
  assert.throws(() => studio.parse({format:'meiqq-workspace', version:3, current:{state:run}, runs:[run], archives:[]}));
});

test('extreme quantities cannot yield unsafe financial totals', () => {
  const idea = studio.create(studio.fresh(), {price:'1000000', directCost:'0', overhead:'0', ownerHours:'1000', ownerRate:'100000', setupOwnerHours:'0', setupCost:'0',
    scenarioQuantity:'1000000', roles:[]});
  const result = studio.economics(idea);
  assert.equal(result.validity.repeat, true);
  assert.equal(result.scenarioResult, null);
  assert.ok(result.issues.some(issue => issue.path === 'scenarioQuantity' && issue.kind === 'invalid'));
});

test('optional seed ideas import as editable hypotheses with unknown economics and independent identity', () => {
  const seeds = require('./studio-seeds.js');
  const state = studio.fresh('Research notebook');
  for (const example of seeds.EXAMPLES) {
    const draft = seeds.create(example.id), before = JSON.stringify(draft);
    const idea = studio.create(state, draft);
    assert.equal(idea.status, 'idea');
    assert.equal(idea.origin.kind, 'example');
    assert.equal(idea.origin.ref, example.id);
    assert.equal(studio.economics(idea).afterOwner, null);
    assert.equal(studio.economics(idea).firstDelivery, null);
    assert.equal(JSON.stringify(draft), before);
  }
  assert.deepEqual(studio.parseText(studio.serialize(state)), state);
  assert.equal(new Set(state.offerings.map(idea => idea.id)).size, seeds.EXAMPLES.length);
});
