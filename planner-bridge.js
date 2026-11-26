/* Explicit, reviewed adapter from a capacity plan to a supported simulator draft. */
(function(root){
 'use strict';
 const Planner=typeof module!=='undefined'?require('./planner.js'):root.QQPlanner;
 const Engine=typeof module!=='undefined'?require('./engine.js'):root.QQ;
 const FIELDS=[
  ['startingCash','Starting cash ($)',0,1e8,false],
  ['inquiries','Inquiries per 30 days',0,500,false],
  ['conversion','Quote acceptance (%)',0,100,false],
  ['deposit','Deposit (%)',0,100,false],
  ['approvalDays','Client approval days',0,30,true],
  ['paymentDays','Final payment days',0,90,true],
  ['leadDays','Promised delivery days',1,180,true],
  ['seed','Workload seed',0,1e9,true]
 ];
 const clone=value=>JSON.parse(JSON.stringify(value));
 function mappedConfig(plan,m,services,pool){
  const total=services.reduce((n,s)=>n+Number(s.quantity),0),c=clone(Engine.DEFAULT);
  delete c.recipe;
  Object.assign(c,{name:(plan.name||'Studio plan').slice(0,80)+' · planner copy',months:1,ownerHours:m.owner.budgetHours/4.4,ownerTarget:0,designers:pool?1:0,designerHours:pool?pool.budgetHours/4.4:0,designerRate:pool?pool.rate/100:0,overhead:m.recurringCosts/100,quoteHours:0,deliveryHours:0,acquisition:'preset',outreachHours:0,leadsPerHour:0,retention:0,repeat:0,profileStrength:0,focusType:'none',realism:false,priority:'deadline'});
  c.services=services.map((s,i)=>({id:'planner-'+(i+1),name:(s.name||'Service '+(i+1)).slice(0,100),deliverable:(s.unit||'engagement').slice(0,500),recurring:false,color:['#4c8878','#7189b2','#aa8651','#9774a6'][i%4],audience:'all',price:Number(s.price),hours:s.allocations.reduce((n,a)=>n+Number(a.hours||0),0),review:Number(s.ownerHours),print:0,weight:Number(s.quantity)/total*100}));
  return c;
 }
 function inspect(plan){
  const m=Planner.metrics(plan),reasons=[],services=plan.services.filter(s=>Number(s.quantity)>0),poolIds=new Set();
  if(m.issues.length)reasons.push('Resolve the planner’s missing or invalid assumptions before copying.');
  if(!services.length)reasons.push('Plan at least one delivery.');
  if(services.length>20)reasons.push('The simulator supports at most 20 services.');
  for(const s of services){
   const setupValues=[s.setupCost,s.setupOwnerHours,...s.allocations.map(a=>a.setupHours)];
   if(Number(s.setupCount)>0&&setupValues.some(value=>!value.trim()||Number(value)!==0))reasons.push((s.name||'Service')+': setup work needs a separate workflow; the simulator cannot represent it yet.');
   if(Number(s.directCost)>0)reasons.push((s.name||'Service')+': generic direct costs cannot be treated as print orders. Keep this scenario in the planner for now.');
   for(const a of s.allocations)if(Number(a.hours)>0)poolIds.add(a.poolId);
  }
  if(poolIds.size>1)reasons.push('This mix needs multiple paid roles. The simulator currently has one shared design-work pool and cannot preserve separate role constraints.');
  const pool=m.pools.find(p=>poolIds.has(p.id));
  const quantity=services.reduce((sum,s)=>sum+Number(s.quantity),0);
  if(m.owner.budgetHours<0)reasons.push('Owner non-project time exceeds available hours. Increase availability or reduce non-project work before copying.');
  const config=reasons.length?null:mappedConfig(plan,m,services,pool);
  if(config)reasons.push(...Engine.configIssues(config).map(issue=>'Simulator limit: '+issue.message));
  if(reasons.length)return {metrics:m,services,pool,config:null,reasons,mapping:[],supported:false};
  const mapping=[
   ['Period','30 modeled days / 22 workdays (4.4 weeks)'],
   ['Owner capacity',m.owner.budgetHours===null?'Unknown':m.owner.budgetHours+' delivery hours after non-project time and reserve → '+(m.owner.budgetHours/4.4).toFixed(3)+' hours/week'],
   ['Paid role',pool?pool.name+' → simulator “design team”, '+pool.budgetHours+' delivery hours / 30 days at $'+(pool.rate===null?'unknown':pool.rate/100)+'/hour':'No paid-role work in this mix'],
   ['Recurring costs',m.recurringCosts===null?'Unknown':'$'+(m.recurringCosts/100).toFixed(2)+' → monthly overhead'],
   ['Service mix','Planned delivery quantities become inquiry shares. They do not guarantee sales or completions.'],
   ...services.map(s=>[s.name||'Unnamed service',s.quantity+' × '+(s.unit||'engagement')+'; $'+s.price+' per unit → client price; '+s.ownerHours+' owner hours → review; '+s.allocations.reduce((sum,a)=>sum+Number(a.hours),0)+' paid-role hours → design work; '+(Number(s.quantity)/quantity*100).toFixed(2)+'% inquiry share']),
   ['Owner work','Per-delivery owner hours become the simulator’s internal-review stage. Separate quote and delivery hours are zero.'],
   ['Income goals','Monthly owner and retained-profit targets stay in the planner. Simulator hourly owner allowance is zero; its remainder is before your pay.'],
   ['Workflow limits','Design → owner review → client approval → delivery → payment. No print, setup, recurring purchases, customer-profile variation or random disruptions.']
  ];
  return {metrics:m,services,pool,config,reasons,mapping,supported:true};
 }
 function prepare(plan,assumptions,date){
  const review=inspect(plan);if(!review.supported)throw Error(review.reasons.join(' '));
  const values={};
  for(const [key,label,min,max,whole]of FIELDS){const raw=assumptions[key];if(typeof raw!=='string'||!raw.trim()||!/^\d+(?:\.\d+)?$/.test(raw.trim()))throw Error('Enter '+label.toLowerCase()+'.');const n=Number(raw);if(!Number.isFinite(n)||n<min||n>max||whole&&!Number.isInteger(n))throw Error(label+' must be '+(whole?'a whole number ':'')+'between '+min+' and '+max+'.');values[key]=n;}
  const c={...review.config,...values,conversion:values.conversion/100,deposit:values.deposit/100};
  const errors=Engine.configIssues(c);if(errors.length)throw Error('Simulator limit: '+errors.map(e=>e.message).join(' '));
  return {config:c,record:{format:'meiqq-planner-scenario-source',version:1,date,plan:clone(plan),assumptions:clone(assumptions),mapping:review.mapping}};
 }
 const api={FIELDS,inspect,prepare};root.QQPlannerBridge=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
