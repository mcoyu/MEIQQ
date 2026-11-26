const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
const read=(ui,code)=>vm.runInContext(code,ui.ctx);

test('confirming the day-zero month action runs once and opens reconciled results',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});
 read(ui,'draft.months=1;draft.services[0].price=365');
 ui.click('simulate');
 assert.match(ui.elements['#modal'].innerHTML,/Apply and simulate 30 days/);
 ui.click('apply',{mode:'future',resume:'simulate'});
 ui.drainTimers();
 assert.equal(read(ui,'view'),'finances');
 assert.equal(read(ui,'state.day'),30);
 const page=ui.elements['#root'].innerHTML;
 for(const amount of ['$6,131.85','$937.50','$444.35','-$568.92','$312.50'])assert.ok(page.includes(amount),amount);
 const rows=read(ui,'QQ.analytics(state).services');
 assert.deepEqual(Array.from(rows,r=>[r.id,r.inquiries]).sort(),[['menu-refresh',2],['monthly-promo-5',5],['table-tents-100',0]]);
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'state.day'),30);
});

test('a reviewed month pauses for a real funding decision and cancel keeps day zero',()=>{
 const ui=setup();
 ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});read(ui,'draft.startingCash=0');ui.click('simulate');ui.click('close');ui.drainTimers();
 assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'state.config.startingCash'),6000);
 ui.click('simulate');ui.click('apply',{mode:'future',resume:'simulate'});ui.drainTimers();
 assert.equal(read(ui,'state.day'),0);assert.equal(read(ui,'running'),false);
 assert.ok(read(ui,'state.blocked.gap')>0);assert.match(ui.elements['#modal'].innerHTML,/payment needs funding/i);
});

test('advance to next project event stops on the first active day and preserves quieter days',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('view',{view:'map'});ui.click('next-event');ui.drainTimers();
 assert.equal(read(ui,'state.day'),2);assert.equal(read(ui,'state.history.length'),2);
 assert.equal(read(ui,'running'),false);assert.match(ui.elements['#root'].innerHTML,/Client declined quote/i);
 const reopened=setup([...ui.storage]);assert.equal(read(reopened,'state.day'),2);
});

test('project details return to the invoking result section and ledger item key',()=>{
 const ui=setup();ui.click('start-restaurant');ui.click('enter-setup',{mode:'guided'});ui.click('simulate');ui.drainTimers();ui.click('analytics-tab',{tab:'cash'});
 const id=read(ui,'state.ledger.find(e=>e.project).project');
 ui.click('project',{id,ledgerIndex:'3'});assert.equal(read(ui,'view'),'map');
 assert.equal(read(ui,'inspectorTrail[0].key.ledgerIndex'),'3');
 ui.click('unselect');assert.equal(read(ui,'view'),'finances');assert.equal(read(ui,'analyticsTab'),'cash');
 assert.equal(read(ui,'selection'),null);assert.match(ui.elements['#root'].innerHTML,/Cash ledger/);
});
