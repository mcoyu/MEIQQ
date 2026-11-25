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
