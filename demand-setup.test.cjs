const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const engine=require('./engine.js');
const {setup}=require('./ui-test-host.cjs');

test('the Demand readout uses the same working days, outreach cap and eligible offers as the full estimate',()=>{
 const draft={...engine.clone(engine.DEFAULT),months:2,acquisition:'sales',ownerHours:2,outreachHours:10,leadsPerHour:1.5,conversion:.4,
  customerMix:{food:20,retail:55,services:25},profileStrength:0,focusType:'none'};
 draft.services=[{...draft.services[0],weight:100,audience:'food'}];
 const counts=engine.estimateDemand(draft),full=engine.estimate(draft);
 assert.equal(counts.leads,2*44/5*1.5);
 assert.equal(counts.matched,counts.leads*.2);
 assert.equal(counts.leads,full.leads);
 assert.equal(counts.orders,full.orders);
 assert.equal(counts.unserved,full.unserved);
 draft.services[0].audience='all';delete draft.customerMix;delete draft.profileStrength;delete draft.focusType;
 Object.assign(draft,{acquisition:'preset',inquiries:7.25});
 assert.deepEqual(engine.estimateDemand(draft),{leads:14.5,matched:14.5,orders:14.5*.4,unserved:0});
});

test('missing Demand inputs invalidate only the counts which depend on them',()=>{
 const draft={...engine.clone(engine.DEFAULT),months:1,acquisition:'preset',inquiries:10,outreachHours:null,conversion:.2};
 draft.services=[{...draft.services[0],weight:100,audience:'all',price:null}];
 assert.deepEqual(engine.estimateDemand(draft),{leads:10,matched:10,orders:2,unserved:0});
 draft.conversion=null;
 assert.deepEqual(engine.estimateDemand(draft),{leads:10,matched:10,orders:null,unserved:0});
 draft.services[0].weight=null;
 assert.deepEqual(engine.estimateDemand(draft),{leads:10,matched:null,orders:null,unserved:null});
 draft.inquiries=null;
 assert.deepEqual(engine.estimateDemand(draft),{leads:null,matched:null,orders:null,unserved:null});
 Object.assign(draft,{inquiries:0,conversion:0});draft.services[0].weight=100;
 assert.deepEqual(engine.estimateDemand(draft),{leads:0,matched:0,orders:0,unserved:0});
});

test('changing the Demand method and acceptance immediately updates an unfinished business draft',()=>{
 const ui=setup(),html=()=>ui.elements['#root'].innerHTML;
 ui.click('enter-setup',{mode:'guided'});ui.click('setup-step',{step:'1'});
 const applied=vm.runInContext('JSON.stringify(state.config)',ui.ctx);
 ui.handlers.change({target:{id:'input-acquisition',dataset:{input:'acquisition'},type:'select-one',tagName:'SELECT',value:'preset'}});
 const input=(key,value,percent=false)=>ui.handlers.input({target:{id:'input-'+key,dataset:{input:key,...(percent?{percent:'true'}:{})},type:'number',tagName:'INPUT',value}});
 input('inquiries','12.5');input('conversion','40',true);
 assert.match(html(),/<dt>New inquiries over 90 days<\/dt><dd>37.5<\/dd>/);
 assert.match(html(),/<dt>Expected new orders over 90 days<\/dt><dd>15<\/dd>/);
 input('conversion','',true);
 assert.match(html(),/<dt>Inquiries with a matching offer<\/dt><dd>37.5<\/dd>/);
 assert.match(html(),/<dt>Expected new orders over 90 days<\/dt><dd>—<\/dd>/);
 assert.equal(vm.runInContext('JSON.stringify(state.config)',ui.ctx),applied);
});
