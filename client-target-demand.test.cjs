const test=require('node:test');
const assert=require('node:assert/strict');
const q=require('./engine.js');
const w=require('./workspace.js');
const {CLIENT_MENUS}=require('./service-catalog.js');

function config(overrides={}){
 const base=q.clone(q.DEFAULT);
 return {...base,months:1,inquiries:30,conversion:1,startingCash:50000,ownerHours:80,designerHours:80,
  customerMix:{food:0,retail:100,services:0},services:[{...base.services[0],weight:100,audience:'food'}],...overrides};
}
function through(state,day){
 while(state.day<day)assert.equal(q.step(state),true);
 return state;
}
function visit(c,days){
 const result=[];
 for(let day=1;day<=days;day++)q.visitExternalInquiries(c,day,(id,type,service)=>result.push([id,type?.id,service?.id]));
 return result;
}
function backup(state,draft){
 return w.parseText(w.serialize({state,draft,saved:[],checkpointInfo:[],recoveryFiles:[]}));
}

test('all seven target identities route inquiries to offers in the corresponding client sector',()=>{
 const food=config().services[0];
 const services=['food','retail','services'].map((audience,i)=>({...food,id:audience,audience,weight:i?30:40}));
 assert.equal(CLIENT_MENUS.length,7);
 for(const menu of CLIENT_MENUS){
  const client=q.clientDemandType(menu.id);
  assert.equal(client.label,menu.name);
  assert.equal(client.group,menu.audience);
  assert.equal(q.profileFor(client.id),client);
  assert.ok(!q.CUSTOMER_TYPES.includes(client));
  const c=config({services,clientDemand:{profileId:menu.id,share:100}});
  assert.deepEqual(visit(c,1),[['lead:1:0',client.id,menu.audience]]);
  assert.deepEqual(q.clientDemandForecast(c),{profileId:menu.id,share:100,active:true,targeted:30,other:0,matched:30,orders:30});
  const state=through(q.fresh(c),1);
  assert.equal(state.projects[0].clientType,client.id);
  assert.deepEqual(q.restore(state),state);
 }
});

test('share divides the same incoming volume in both acquisition modes; service eligibility, economics and workload use the same split',()=>{
 const c=config({inquiries:100,conversion:.6,profileStrength:1,clientDemand:{profileId:'restaurant',share:35}});
 const demand=q.estimateDemand(c),full=q.estimate(c),work=q.estimateWorkload(c),service=c.services[0];
 assert.deepEqual(q.clientDemandForecast(c),{profileId:'restaurant',share:35,active:true,targeted:35,other:65,matched:35,orders:21});
 assert.deepEqual(demand,{leads:100,matched:35,orders:21,unserved:65});
 assert.deepEqual(q.effectiveCustomerMix(c),{food:35,retail:65,services:0,unsegmented:0});
 assert.equal(full.orders,demand.orders);assert.equal(full.unserved,demand.unserved);
 assert.equal(full.revenue,21*service.price);
 assert.equal(full.hours,21*service.hours);
 assert.equal(work.hours,full.hours);
 assert.equal(work.owner,35*c.quoteHours+21*(service.review+c.deliveryHours));
 assert.equal(work.owner,full.owner);
 const sales={...c,acquisition:'sales',ownerHours:4,outreachHours:10,leadsPerHour:2,clientDemand:{profileId:'restaurant',share:50}};
 const salesLeads=q.workingDays(30)/5*4*2;
 assert.equal(q.clientDemandForecast(sales).targeted,salesLeads/2);
 assert.equal(q.clientDemandForecast(sales).other,salesLeads/2);
 assert.deepEqual(visit(sales,30).map(r=>r[0]),visit({...sales,clientDemand:undefined},30).map(r=>r[0]));
});

test('general inquiries keep their seeded identity and offer selection as the target share changes',()=>{
 const c=config({inquiries:120,services:q.clone(q.DEFAULT.services),focusType:'gift'});
 const none=visit(c,30),zero={...c,clientDemand:{profileId:'maker',share:0}};
 assert.deepEqual(visit(zero,30),none);
 assert.deepEqual(q.externalDemandSettings(c),q.externalDemandSettings(zero));
 assert.deepEqual(q.estimate(c),q.estimate(zero));
 const samples=[25,75].map(share=>visit({...c,clientDemand:{profileId:'maker',share}},30));
 let count=0;
 for(const [i,arrival] of samples[0].entries()){
  if(arrival[1]==='target-maker'){assert.equal(samples[1][i][1],arrival[1]);count++;}
  else assert.deepEqual(arrival,none[i]);
  if(samples[1][i][1]!=='target-maker')assert.deepEqual(samples[1][i],none[i]);
 }
 assert.ok(count>0&&count<none.length);
 const legacy=config({services:q.clone(q.DEFAULT.services)});
 delete legacy.customerMix;delete legacy.focusType;delete legacy.profileStrength;
 assert.deepEqual(q.effectiveCustomerMix(legacy),{food:0,retail:0,services:0,unsegmented:100});
 legacy.clientDemand={profileId:'restaurant',share:25};
 assert.deepEqual(q.effectiveCustomerMix(legacy),{food:25,retail:0,services:0,unsegmented:75});
 const state=through(q.fresh(legacy),30);
 assert.ok(state.projects.some(p=>p.clientType===undefined));
 assert.ok(state.projects.some(p=>p.clientType==='target-restaurant'));
 assert.deepEqual(q.restore(state),state);
});

test('unfinished drafts keep independently known counts and reject malformed shares before running',()=>{
 const c=config({clientDemand:{profileId:'restaurant',share:100}});
 c.services[0].price=null;c.conversion=null;
 assert.deepEqual(q.clientDemandForecast(c),{profileId:'restaurant',share:100,active:true,targeted:30,other:0,matched:30,orders:null});
 c.services[0].audience='services';
 assert.equal(q.clientDemandForecast(c).orders,0);
 c.services[0].weight=null;
 assert.equal(q.clientDemandForecast(c).matched,null);
 c.inquiries=null;assert.equal(q.clientDemandForecast(c).targeted,null);
 const base=config();
 for(const invalid of [null,{},'restaurant',{profileId:'food',share:75},{profileId:'restaurant',share:101},{profileId:'restaurant',share:.5},{profileId:'restaurant',share:-1}]){
  const value={...base,clientDemand:invalid};
  assert.throws(()=>q.validateConfig(value));
  assert.deepEqual(q.estimateDemand(value),{leads:30,matched:null,orders:null,unserved:null});
  assert.equal(q.clientDemandForecast(value).share,null);
  assert.equal(q.effectiveCustomerMix(value),null);
 }
 const state=q.fresh(config({clientDemand:{profileId:'restaurant',share:50}}));
 assert.ok(!Object.hasOwn(backup(state,base).draft,'clientDemand'));
 const unfinished={...base,clientDemand:{profileId:'maker',share:null}};
 assert.deepEqual(backup(state,unfinished).draft.clientDemand,unfinished.clientDemand);
});

test('launch keeps its forecast; results recover matched and unmatched target arrivals, even across setup changes and backups',()=>{
 const c=config({clientDemand:{profileId:'restaurant',share:100}});
 const state=through(q.fresh(c),10);
 const old=q.runLaunchEstimate(state).clientDemand;
 q.applyConfig(state,{...state.config,clientDemand:{profileId:'maker',share:100}});
 through(state,30);
 assert.deepEqual(q.runLaunchEstimate(state).clientDemand,old);
 assert.deepEqual(q.clientDemandActuals(state,'restaurant',10),{targeted:10,matched:10,orders:10});
 assert.deepEqual(q.clientDemandActuals(state,'maker'),{targeted:20,matched:0,orders:0});
 assert.deepEqual(q.clientDemandActuals(state,'restaurant'),{targeted:10,matched:10,orders:10});
 assert.deepEqual(state.demandHistory.map(p=>p.settings.clientDemand.profileId),['restaurant','maker']);
 const repeat=through(q.fresh(c),10);
 q.applyConfig(repeat,{...repeat.config,clientDemand:{profileId:'maker',share:100}});through(repeat,30);
 assert.deepEqual(repeat,state);assert.equal(q.workloadComparison(state,repeat).likeForLike,true);
 const different=through(q.fresh(c),30);
 const comparison=q.workloadComparison(state,different);
 assert.equal(comparison.sameRealizedInquiries,false);assert.equal(comparison.sameDemandHistory,false);
 assert.deepEqual(backup(state,state.config).state,state);
 const missing=q.clone(state);delete missing.demandHistory;
 assert.deepEqual(q.clientDemandActuals(missing,'restaurant'),{targeted:null,matched:null,orders:null});
 const invalid=q.clone(state);invalid.demandHistory[1].settings.clientDemand.profileId='restaurant';
 assert.throws(()=>q.restore(invalid),/inquiry|demand/i);
 const badLaunch=q.clone(state);badLaunch.launchEstimate.clientDemand.orders=99;
 assert.throws(()=>q.restore(badLaunch),/estimate/);
});

test('returns keep their original target, remain outside the new-inquiry count, and replay with the same demand',()=>{
 const c=config({months:3,inquiries:10,repeat:1,retention:1,clientDemand:{profileId:'restaurant',share:100}});
 const state=through(q.fresh(c),30);
 q.applyConfig(state,{...state.config,clientDemand:{profileId:'maker',share:100}});
 through(state,90);
 const returning=state.projects.filter(p=>p.renewal);
 assert.ok(returning.length);assert.ok(returning.every(p=>p.clientType==='target-restaurant'));
 assert.equal(q.clientDemandActuals(state,'restaurant').targeted,state.projects.filter(p=>!p.renewal).length);
 assert.deepEqual(q.restore(state),state);
 const session=q.startCapacityReplay(state,{month:2,key:'designerHours',value:90});
 while(session.phase!=='done')q.stepCapacityReplay(session);
 assert.equal(q.capacityReplayResult(session).comparable,true);
 assert.deepEqual(q.clientDemandActuals(session.alternative,'maker'),q.clientDemandActuals(session.baseline,'maker'));
});

test('target share source evidence belongs to the specific client and percentage, including in restored drafts',()=>{
 const path='clientDemand.share',record={profileId:'restaurant',source:'Intake log',sample:'12 of 30 new inquiries',date:'2026-11-01',value:40};
 const c=config({clientDemand:{profileId:'restaurant',share:40},assumptionRecords:{[path]:record}});
 assert.equal(q.ASSUMPTION_FIELDS.demand[path],'Target client inquiry share');
 assert.equal(q.assumptionRecordValue(c,path),40);
 assert.doesNotThrow(()=>q.validateConfig(c));
 const state=q.fresh(c);
 assert.deepEqual(backup(state,c).draft.assumptionRecords[path],record);
 for(const target of [{profileId:'maker',share:40},{profileId:'restaurant',share:20},undefined]){
  const edited={...c,clientDemand:target};
  assert.equal(q.withCurrentAssumptionRecords(edited).assumptionRecords,undefined);
  assert.throws(()=>q.validateConfig(edited),/assumption record/i);
  assert.equal(backup(state,edited).draft.assumptionRecords,undefined);
 }
 for(const patch of [{profileId:'food'},{profileId:undefined},{value:.4},{value:101}])assert.equal(q.validAssumptionRecords({[path]:{...record,...patch}}),false);
 const fresh=q.fresh(config({clientDemand:{profileId:'restaurant',share:40}}));
 assert.equal(fresh.config.assumptionRecords,undefined);
});
