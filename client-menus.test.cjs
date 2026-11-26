const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const catalog=require('./service-catalog.js');
const engine=require('./engine.js');

test('any combination of role swaps gives the chosen client three distinct, eligible, estimable offers',()=>{
 const profiles=catalog.CLIENT_MENUS;
 assert.ok(Object.isFrozen(profiles));
 assert.equal(new Set(profiles.map(p=>p.id)).size,profiles.length);
 for(const {id,audience,slots} of profiles){
  assert.deepEqual(new Set(slots.map(s=>s.id)).size,3,id);
  assert.equal(slots.length,3,id);
  for(const role of slots){
   assert.ok(role.options.length>=2,role.label);
   assert.equal(new Set(role.options.map(o=>o.id)).size,role.options.length,role.label);
   for(const choice of role.options)assert.ok(Object.isFrozen(choice),choice.id);
  }
  for(const a of slots[0].options)for(const b of slots[1].options)for(const c of slots[2].options){
   const services=[a,b,c].map((item,index)=>({...catalog.createService(item.id),weight:[33.34,33.33,33.33][index]}));
   const names=services.map(s=>s.id).join(', ');
   assert.equal(new Set(services.map(s=>s.id)).size,3,names);
   assert.ok(services.every(s=>s.audience==='all'||s.audience===audience),id+' · '+names);
   const config={...engine.clone(engine.DEFAULT),services,customerMix:{food:0,retail:0,services:0,[audience]:100}};
   assert.deepEqual(engine.configIssues(config),[],names);
   const estimate=engine.estimate(config);
   assert.ok(estimate.services.every(row=>row.effectiveShare>0),names);
   assert.equal(estimate.unservedShare,0,names);
   assert.ok(Number.isFinite(estimate.profit),names);
  }
 }
});

test('profile descriptions, menu roles and explanations are available in both interface languages',()=>{
 const ctx=vm.createContext({document:{documentElement:{}}});
 for(const name of ['zh-CN.js','i18n.js','service-catalog.js'])vm.runInContext(fs.readFileSync(name,'utf8'),ctx);
 ctx.QQI18n.choose('zh-CN');
 for(const profile of catalog.CLIENT_MENUS){
  const text=[profile.name,profile.description,...profile.slots.flatMap(role=>[role.label,...role.options.map(o=>o.why)])];
  for(const value of text){
   assert.ok(value.trim(),profile.id);
   assert.match(ctx.QQI18n.text(value),/[\u3400-\u9fff]/,value);
  }
 }
});

test('every client has distinct outreach routes connected to its own swappable menu roles',()=>{
 const ctx=vm.createContext({document:{documentElement:{}}});
 for(const name of ['zh-CN.js','i18n.js','service-catalog.js'])vm.runInContext(fs.readFileSync(name,'utf8'),ctx);
 ctx.QQI18n.choose('zh-CN');
 for(const profile of catalog.CLIENT_MENUS){
  const reach=catalog.clientReach(profile.id);
  assert.ok(Object.isFrozen(reach)&&Object.isFrozen(reach.channels),profile.id);
  assert.equal(new Set(reach.channels.map(ch=>ch.id)).size,reach.channels.length);
  assert.deepEqual(reach.channels.map(ch=>ch.slot).sort(),[0,1,2],profile.id);
  for(const ch of reach.channels){
   assert.ok(Object.isFrozen(ch)&&profile.slots[ch.slot].options.length>1,ch.id);
   for(const s of [ch.title,ch.where,ch.approach,reach.measurement]){
    assert.equal(typeof s,'string',ch.id);
    assert.match(ctx.QQI18n.text(s),/[\u3400-\u9fff]/,s);
   }
  }
 }
 for(const id of ['unknown','constructor','__proto__',null])assert.equal(catalog.clientReach(id),null);
});
