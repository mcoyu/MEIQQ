const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {setup} = require('./ui-test-host.cjs');

test('the standalone app remembers Simplified Chinese independently of workspace data', () => {
  const ui = setup(undefined, {built:true});
  const i18n = ui.ctx.QQI18n;
  const saved = () => vm.runInContext('JSON.stringify([state,draft,saved,archives])', ui.ctx);
  const original = saved();
  assert.equal(i18n.language, 'en');
  ui.handlers.change({target:{id:'language', value:'zh-CN'}});
  assert.equal(ui.ctx.document.documentElement.lang, 'zh-CN');
  assert.equal(i18n.text('Jobs'), '客户项目');
  assert.equal(saved(), original);
  assert.equal(setup(ui.storage, {built:true}).ctx.QQI18n.language, 'zh-CN');
  assert.equal(i18n.choose('invalid'), false);
  i18n.choose('en');
  assert.equal(i18n.text('Jobs'), 'Jobs');
  assert.equal(saved(), original);
});

test('dynamic messages can reorder values and preserve literal project names exactly', () => {
  const {ctx} = setup();
  const t = ctx.QQI18n;
  t.choose('zh-CN');
  assert.equal(t.text('· Day 8 of 90'), '· 第 8 天，共 90 天');
  assert.equal(t.text('40 h/week per designer'), '每名设计师每周 40 小时');
  for (const name of ['Jobs', '  Names  with spaces  ', '<b>Jobs</b> & 项目', '\uFFF9inside\uFFFB']) {
    assert.equal(t.text(t.literal(name)), name);
  }
  assert.equal(t.text(t.literal('Jobs') + ' earned $50 from 2 deliveries.').includes('Jobs'),true);
});

test('the setup review keeps the wording and currency of custom service descriptions',()=>{
  const ui=setup();ui.ctx.QQI18n.choose('zh-CN');
  const values=vm.runInContext(`const first=QQ.clone(state.config),next=QQ.clone(first);
    next.services[0].name='Jobs';next.services[0].deliverable='Print $100 USD on the flyer';
    configDiff(first,next).filter(row=>row.path.endsWith('.name')||row.path.endsWith('.deliverable'))
     .map(row=>QQI18n.text(row.after))`,ui.ctx);
  assert.deepEqual(Array.from(values),['Jobs','Print $100 USD on the flyer']);
});

test('restaurant payment terms and campaign periods stay intact in Chinese',()=>{
  const t=setup().ctx.QQI18n;
  t.choose('zh-CN');
  assert.equal(t.text('Quote accepted at $275 for design only / client self-print; no deposit collected; delivery due day 12'),
    '客户接受了 '+t.yuan(275)+' 的报价（仅设计/客户自行印刷），未收取定金，约定第 12 天交付');
  assert.equal(t.text('Quote accepted at $395 for agency-managed printing; deposit received; delivery due day 8 under a modeled rush-event promise'),
    '客户接受了 '+t.yuan(395)+' 的报价（代理管理印刷），已收定金，加急交付日为第 8 天');
  assert.equal(t.text('Up to 12 separately quoted cycles over 365 days, planned 30 days apart. Accepted work must be delivered and paid before the next quote.'),
    '365 天合作期内最多有 12 期，每期单独报价，计划间隔 30 天。已接受的工作必须在交付并收清款项后才能进入下一次报价。');
});

test('RMB uses the same offline rate for amounts, input and reports while notes retain their original currency', () => {
  const {ctx} = setup(undefined, {built:true});
  const t = ctx.QQI18n;
  t.choose('zh-CN');
  assert.equal(t.text('USD'), '人民币');
  assert.equal(t.text('$100'), '¥666.45');
  assert.equal(t.text('-$100'), '-¥666.45');
  assert.equal(t.text('$0.01'), '¥0.07');
  assert.equal(t.text('100美元'), '¥666.45');
  assert.equal(t.text(t.literal('Cost $100 USD')), 'Cost $100 USD');
  const field = (value, originalUsd) => ({value, type:'text', dataset:{originalUsd}});
  assert.equal(t.inputValue(field('666.45','')), '100');
  assert.equal(t.inputValue(field('666.45','100.00')), '100.00');
  assert.equal(t.inputValue(field('','100')), '');
  assert.equal(t.inputValue({value:'42', dataset:{}}), '42');
  const run = vm.runInContext('QQ.clone(state)',ctx);
  const altered = structuredClone(run);
  altered.config.startingCash += 100;
  const report = ctx.QQComparisonReport.create(altered,run).html;
  assert.ok(report.includes('<th>startingCash</th><td>'+t.yuan(run.config.startingCash)+'</td><td>'+t.yuan(altered.config.startingCash)+'</td>'));
  t.choose('en');
  assert.equal(t.text('$100'), '$100');
  assert.equal(t.inputValue(field('100','100')), '100');
});
