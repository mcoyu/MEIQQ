const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const engine = require('./engine.js');
const {setup} = require('./ui-test-host.cjs');

const read = (ui, code) => vm.runInContext(code, ui.ctx);
const selectLength = (ui, months, live = false) => ui.handlers.change({target:{
 id:live ? 'horizon' : 'input-months', dataset:live ? {} : {input:'months'},
 tagName:'SELECT', type:'select-one', value:String(months)
}});

test('whole-run estimates scale fixed monthly inputs and continuous weekdays independently', () => {
 const base = {...engine.DEFAULT, acquisition:'preset', inquiries:11, conversion:0, overhead:137};
 for (let months = 1; months <= 12; months++) {
  const state = engine.fresh({...base, months});
  assert.equal(engine.restore(state).config.months, months);
  const e = engine.estimate(state.config);
  assert.equal(e.days, months * 30);
  assert.equal(e.leads, 11 * months);
  assert.equal(e.expense, 137 * months);
  assert.deepEqual(e.services[0].perProject, engine.estimate({...base, months:1}).services[0].perProject);
 }
 for (const months of [0, 13, 1.5]) assert.throws(() => engine.fresh({...base, months}));
 const outreach = {...base, acquisition:'sales', outreachHours:3, leadsPerHour:2};
 const quarter = engine.estimate({...outreach, months:3});
 assert.equal(quarter.workdays, 65);
 assert.equal(quarter.leads, 3 * 65 / 5 * 2);
 assert.equal(engine.estimate({...base, months:2}).workdays, 44);
});

test('both setup paths begin at ninety days and a two-month draft survives a complete run and reload', () => {
 const own = setup();
 own.click('start-business');
 assert.equal(read(own, 'draft.months'), 3);
 assert.match(own.elements['#root'].innerHTML, /90-day estimate/);
 const ui = setup();
 ui.click('start-restaurant');
 assert.match(ui.elements['#root'].innerHTML, /Simulate 90 days/);
 const monthlyOverhead = read(ui, 'draft.overhead');
 selectLength(ui, 2);
 const draftPage = ui.elements['#root'].innerHTML;
 assert.match(draftPage, /Simulate 60 days/);
 assert.match(draftPage, /Days 1–60 · 44 working days/);
 assert.equal(read(ui, 'state.config.months'), 3);
 assert.equal(read(ui, 'draft.overhead'), monthlyOverhead);
 ui.click('simulate');
 assert.match(ui.elements['#modal'].innerHTML, /Apply and simulate 60 days/);
 ui.click('apply', {mode:'future', resume:'simulate'});
 ui.drainTimers();
 assert.equal(read(ui, 'state.day'), 60);
 assert.equal(read(ui, 'view'), 'finances');
 assert.equal(read(ui, 'QQ.step(state)'), false);
 const reopened = setup([...ui.storage]);
 assert.equal(read(reopened, 'state.day'), 60);
 assert.equal(read(reopened, 'state.config.months'), 2);
});

test('finishing a month respects the billing boundary and live length keeps an independent draft', () => {
 const ui = setup();
 ui.click('start-restaurant');
 ui.click('view', {view:'map'});
 ui.click('step');
 ui.click('finish');
 ui.drainTimers();
 assert.equal(read(ui, 'state.day'), 30);
 ui.click('step');
 selectLength(ui, 1, true);
 assert.equal(read(ui, 'state.config.months'), 3);
 ui.click('view', {view:'setup'});
 selectLength(ui, 4);
 ui.click('view', {view:'map'});
 selectLength(ui, 2, true);
 assert.equal(read(ui, 'state.config.months'), 2);
 assert.equal(read(ui, 'draft.months'), 4);
 ui.click('discard');
 ui.click('finish-run');
 ui.drainTimers();
 assert.equal(read(ui, 'state.day'), 60);
});

test('an explicit one-month workspace keeps its shorter horizon when reopened', () => {
 const ui = setup();
 ui.click('start-restaurant');
 selectLength(ui, 1, true);
 const reopened = setup([...ui.storage]);
 assert.equal(read(reopened, 'draft.months'), 1);
 assert.match(reopened.elements['#root'].innerHTML, /Simulate 30 days/);
});

test('a year charges twelve model months and a cash shortfall interrupts a longer run at the next bill', () => {
 const config = {...engine.DEFAULT, months:12, acquisition:'preset', inquiries:0, overhead:100};
 const year = engine.fresh(config);
 for (let day = 1; day <= 360; day++) assert.equal(engine.step(year), true);
 assert.equal(engine.step(year), false);
 assert.equal(year.expenses, 1200);
 assert.equal(year.cash, config.startingCash - 1200);
 const ui = setup();
 ui.click('start-restaurant');
 read(ui, "Object.assign(draft,{months:3,acquisition:'preset',inquiries:0,overhead:100,startingCash:150})");
 ui.click('simulate');
 ui.click('apply', {mode:'future', resume:'simulate'});
 ui.drainTimers();
 assert.equal(read(ui, 'state.day'), 30);
 assert.equal(read(ui, 'state.cash'), 50);
 assert.equal(read(ui, 'state.blocked.gap'), 50);
 assert.match(ui.elements['#modal'].innerHTML, /payment needs funding/i);
});
