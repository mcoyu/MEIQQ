/* MEIQQ simulation engine. No network or external dependencies. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const round=x=>Math.round(x*100)/100;
const STAGES=['inquiry','quote','design','review','approval','production','delivery','payment','complete'];
const LABELS={inquiry:'Inquiry',quote:'Quote & deposit',design:'Design',review:'Internal review',approval:'Client approval',production:'Print production',delivery:'Delivery',payment:'Final payment',complete:'Complete'};
const CUSTOMER_TYPES=[
 {id:'bakery',group:'food',label:'Bakery',suffix:'Bakery',context:'Seasonal pastries and counter specials',effort:1.05,approval:1,repeat:1.1,revision:.25},
 {id:'tea',group:'food',label:'Bubble tea shop',suffix:'Bubble Tea',context:'New drinks and limited-time flavors',effort:1.1,approval:1,repeat:1.15,revision:.35},
 {id:'noodle',group:'food',label:'Noodle shop',suffix:'Noodle House',context:'Lunch combos and menu updates',effort:1.15,approval:2,repeat:1.05,revision:.35},
 {id:'dumpling',group:'food',label:'Dumpling shop',suffix:'Dumpling Kitchen',context:'Family bundles and takeout menu',effort:1.1,approval:2,repeat:1.05,revision:.35},
 {id:'cafe',group:'food',label:'Café',suffix:'Café',context:'Coffee specials and weekend traffic',effort:1,approval:1,repeat:1.1,revision:.25},
 {id:'pizza',group:'food',label:'Pizzeria',suffix:'Pizza',context:'Delivery deals and neighborhood offers',effort:1.05,approval:1,repeat:1.05,revision:.3},
 {id:'fast_casual',group:'food',label:'Fast-casual restaurant',suffix:'Kitchen',context:'Combo meals and ordering signage',effort:1.1,approval:2,repeat:1.1,revision:.3},
 {id:'dining',group:'food',label:'Sit-down restaurant',suffix:'Dining Room',context:'Dinner menu and event promotions',effort:1.2,approval:2,repeat:1,revision:.4},
 {id:'food_truck',group:'food',label:'Food truck',suffix:'Food Truck',context:'Pop-up locations and daily specials',effort:.9,approval:0,repeat:1.1,revision:.2},
 {id:'dessert',group:'food',label:'Dessert shop',suffix:'Desserts',context:'Seasonal treats and gift boxes',effort:1.05,approval:1,repeat:1.1,revision:.3},
 {id:'market',group:'retail',label:'Neighborhood market',suffix:'Market',context:'Weekly specials and shelf signs',effort:1.1,approval:1,repeat:1.1,revision:.3},
 {id:'florist',group:'retail',label:'Florist',suffix:'Flowers',context:'Holiday arrangements and walk-in offers',effort:1,approval:1,repeat:1.1,revision:.25},
 {id:'boutique',group:'retail',label:'Clothing boutique',suffix:'Boutique',context:'New arrivals and window promotion',effort:1.05,approval:1,repeat:1,revision:.3},
 {id:'gift',group:'retail',label:'Gift shop',suffix:'Gifts',context:'Seasonal displays and local events',effort:1,approval:1,repeat:1.05,revision:.3},
 {id:'bookstore',group:'retail',label:'Bookstore',suffix:'Books',context:'Author events and reading displays',effort:.95,approval:1,repeat:1.05,revision:.25},
 {id:'pet',group:'retail',label:'Pet supply shop',suffix:'Pet Supply',context:'Loyalty offers and product launches',effort:1,approval:1,repeat:1.05,revision:.25},
 {id:'salon',group:'services',label:'Hair salon',suffix:'Salon',context:'Appointments and service packages',effort:1,approval:1,repeat:1.05,revision:.3},
 {id:'barber',group:'services',label:'Barbershop',suffix:'Barbers',context:'Walk-in hours and neighborhood offers',effort:.9,approval:0,repeat:1.05,revision:.2},
 {id:'fitness',group:'services',label:'Fitness studio',suffix:'Fitness',context:'Class schedules and trial memberships',effort:1.05,approval:1,repeat:1.1,revision:.3},
 {id:'tutoring',group:'services',label:'Tutoring center',suffix:'Tutoring',context:'Enrollment dates and family outreach',effort:1.05,approval:2,repeat:1,revision:.35},
 {id:'auto',group:'services',label:'Auto detailer',suffix:'Auto Detail',context:'Service packages and booking',effort:.95,approval:1,repeat:1,revision:.25},
 {id:'cleaning',group:'services',label:'Cleaning service',suffix:'Cleaning',context:'Local bookings and referral offers',effort:.9,approval:1,repeat:1,revision:.2}
];
const CUSTOMER_PREFIXES=['Maple','Eastside','Garden','Corner','Northline','Bluebird','Cedar','Sunrise','Lakeside','Jade','Hearthside','Oak & Willow','Riverside','Little Lotus','Elm Street','Market Street'];
const CUSTOMER_LOCATIONS=['',' on Main',' on River Road',' at the Plaza',' on Park Avenue',' near the Square'];
const MODEL_VERSION=2;
const DISRUPTION_RULES={rushDeadlines:{defaultRate:.10,leadFactor:.5,minLeadDays:2},supplierReprints:{defaultRate:.03,extraDaysMin:2,extraDaysMax:5,costFactor:1},repeatedRevisions:{defaultRate:.15,minRounds:2,maxRounds:3,designFactor:.35,reviewFactor:.5},extendedLatePayments:{defaultRate:.15,minDays:30,maxDays:60}};
const DEFAULT_DISRUPTION_RATES=Object.fromEntries(Object.entries(DISRUPTION_RULES).map(([key,rule])=>[key,rule.defaultRate]));
const RECIPE_V2={catalog:'metro-detroit-2026-v2',version:2,ledger:'meiqq-preset-evidence-2026-11-18-v2',ledgerHash:'b1addbcf08a57e7cd1d00f53303862028154d7376bc737e82c3beb383232c587'};
const SERVICE_SPEC_KEYS=['catalogId','deliverables','evidenceIds','includedRevisions','modeledPriceRange','modeledPrintCostRange','packageId','printCostBasis','printQuantity','printSpec','scope','version'];
const DEFAULT={name:'Studio baseline',seed:2417,months:1,startingCash:6000,ownerHours:10,ownerTarget:30,designers:1,designerHours:24,designerRate:12,overhead:180,inquiries:45,conversion:0.7,deposit:0.5,paymentDays:5,approvalDays:2,printDays:3,quoteHours:0.6,deliveryHours:0.5,leadDays:14,priority:'deadline',acquisition:'preset',outreachHours:3,leadsPerHour:3.5,retention:0.8,repeat:0.15,customerMix:{food:55,retail:25,services:20},profileStrength:.5,focusType:'none',realism:false,uncertainty:{complexity:true,revisions:true,approval:true,supplier:true,payment:true},disruptions:{rushDeadlines:false,supplierReprints:false,repeatedRevisions:false,extendedLatePayments:false},disruptionRates:DEFAULT_DISRUPTION_RATES,services:[
{id:'design',name:'Design only',deliverable:'Menu, poster or promotional graphic',price:290,hours:5,review:1,print:0,weight:45,recurring:false,color:'#287d77'},
{id:'print',name:'Design + print',deliverable:'Design and a batch of printed menus',price:540,hours:6,review:1.5,print:140,weight:35,recurring:false,color:'#8871b1'},
{id:'monthly',name:'Monthly promotion',deliverable:'Four promotional graphics per cycle',price:720,hours:10,review:2,print:0,weight:20,recurring:true,color:'#bd8753'}]};
function random(seed,key){let h=seed|0;for(const c of String(key))h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return(h>>>0)/4294967296;}
function demandDraw(c,demandId,stream){return random(c.seed,'model2:'+demandId+':'+stream);}
function recipeFingerprint(value){let hash=2166136261;for(const ch of JSON.stringify(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16).padStart(8,'0');}
function validRecipeV2(recipe){
 const baseKeys=['applied','appliedHash','catalog','condition','ledger','ledgerHash','market','mix','operation','version'],keys=Object.keys(recipe||{}).sort(),validKeys=[baseKeys,[...baseKeys,'profile'].sort()].some(expected=>keys.join(',')===expected.join(','));
 if(!recipe||typeof recipe!=='object'||Array.isArray(recipe)||!validKeys)return false;
 if(recipe.catalog!==RECIPE_V2.catalog||recipe.version!==RECIPE_V2.version||recipe.ledger!==RECIPE_V2.ledger||typeof recipe.ledgerHash!=='string'||!/^[0-9a-f]{64}$/.test(recipe.ledgerHash))return false;
 if(recipe.profile!==undefined&&recipe.profile!=='new-workspace')return false;
 if(!['market','operation','mix','condition'].every(key=>typeof recipe[key]==='string'&&/^[a-z0-9_-]{1,40}$/.test(recipe[key])))return false;
 if(!recipe.applied||typeof recipe.applied!=='object'||Array.isArray(recipe.applied))return false;
 const entries=Object.entries(recipe.applied);if(!entries.length||entries.length>1000||JSON.stringify(recipe.applied).length>262144)return false;
 const safePath=/^[a-zA-Z][a-zA-Z0-9]*(?:\.(?:[a-zA-Z][a-zA-Z0-9]*|[0-9]+))*$/;
 for(const [path,value] of entries){
  if(path.length>160||!safePath.test(path)||path.split('.').some(key=>['__proto__','prototype','constructor'].includes(key)))return false;
  if(value!==null&&!['string','number','boolean'].includes(typeof value)||(typeof value==='number'&&!Number.isFinite(value))||(typeof value==='string'&&value.length>1000))return false;
 }
 return typeof recipe.appliedHash==='string'&&/^[0-9a-f]{8}$/.test(recipe.appliedHash)&&recipe.appliedHash===recipeFingerprint(recipe.applied);
}
function validServiceSpec(spec){
 if(!spec||typeof spec!=='object'||Array.isArray(spec)||SERVICE_SPEC_KEYS.some(key=>!Object.hasOwn(spec,key))||Object.keys(spec).some(key=>!SERVICE_SPEC_KEYS.includes(key)&&key!=='printUnit'))return false;
 const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9._:-]{1,120}$/.test(value),text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
 const range=value=>Array.isArray(value)&&value.length===2&&value.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e6)&&value[0]<=value[1];
 if(!safeId(spec.catalogId)||!safeId(spec.packageId)||spec.version!==1||!text(spec.scope,500))return false;
 if(!Array.isArray(spec.deliverables)||!spec.deliverables.length||spec.deliverables.length>12||!spec.deliverables.every(value=>text(value,200)))return false;
 if(!Number.isInteger(spec.includedRevisions)||spec.includedRevisions<0||spec.includedRevisions>10)return false;
 if(!Array.isArray(spec.evidenceIds)||!spec.evidenceIds.length||spec.evidenceIds.length>12||!spec.evidenceIds.every(safeId))return false;
 if(!range(spec.modeledPriceRange))return false;
 const printed=Number.isInteger(spec.printQuantity)&&spec.printQuantity>=1&&spec.printQuantity<=100000;
 if(spec.printQuantity!==null&&!printed)return false;
 if(spec.printUnit!==undefined&&spec.printUnit!==null&&!['pieces','sq ft'].includes(spec.printUnit))return false;
 if(printed)return text(spec.printSpec,500)&&text(spec.printCostBasis,500)&&range(spec.modeledPrintCostRange);
 return (spec.printUnit===undefined||spec.printUnit===null)&&spec.printSpec===null&&spec.printCostBasis===null&&spec.modeledPrintCostRange===null;
}
function validServiceFulfillment(value,service){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')==='designOnlyPrice,managedShare,mode'&&value.mode==='customer-choice'&&typeof value.managedShare==='number'&&Number.isFinite(value.managedShare)&&value.managedShare>=0&&value.managedShare<=1&&typeof value.designOnlyPrice==='number'&&Number.isFinite(value.designOnlyPrice)&&value.designOnlyPrice>=0&&value.designOnlyPrice<=service.price&&service.print>0;}
function validServiceCampaign(value,service){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')==='cadenceDays,relationshipDays'&&[30,90].includes(value.cadenceDays)&&value.relationshipDays===365&&service.recurring===true;}
function normalize(config){const c=clone(config);for(const key of ['quoteHours','deliveryHours','leadDays'])if(c[key]===undefined)c[key]=DEFAULT[key];c.uncertainty={...DEFAULT.uncertainty,...c.uncertainty};if(c.disruptions===undefined)c.disruptions=clone(DEFAULT.disruptions);else if(c.disruptions&&typeof c.disruptions==='object'&&!Array.isArray(c.disruptions))c.disruptions={...DEFAULT.disruptions,...c.disruptions};if(c.disruptionRates===undefined)c.disruptionRates=clone(DEFAULT_DISRUPTION_RATES);else if(c.disruptionRates&&typeof c.disruptionRates==='object'&&!Array.isArray(c.disruptionRates))c.disruptionRates={...DEFAULT_DISRUPTION_RATES,...c.disruptionRates};return c;}
function variable(c,key){return c.realism&&c.uncertainty?.[key]!==false;}
function disruption(c,key){return c.realism&&c.disruptions?.[key]===true;}
function disruptionDraw(c,p,key){return demandDraw(c,p.demandId,'disruption:'+key);}
function profileFor(id){return CUSTOMER_TYPES.find(t=>t.id===id);}
function profileFactor(c,p,key){const profile=profileFor(p.clientType);return profile?1+(profile[key]-1)*(c.profileStrength??0):1;}
function selectProfile(c,key){
 if(!c.customerMix)return null;
 let pick=random(c.seed,key+'group')*100,group='services';
 for(const name of ['food','retail','services']){pick-=c.customerMix[name];if(pick<0){group=name;break;}}
 const types=CUSTOMER_TYPES.filter(t=>t.group===group);
 const focus=types.find(t=>t.id===c.focusType);
 if(focus&&random(c.seed,key+'focus')<.5)return focus;
 const pool=focus?types.filter(t=>t!==focus):types;
 return pool[Math.floor(random(c.seed,key+'type')*pool.length)];
}
function customerName(s,profile,id){
 const used=new Set(s.projects.map(p=>p.client));
 const start=Math.floor(random(s.config.seed,id+'name')*CUSTOMER_PREFIXES.length*CUSTOMER_LOCATIONS.length);
 for(let i=0;i<CUSTOMER_PREFIXES.length*CUSTOMER_LOCATIONS.length;i++){
  const index=(start+i)%(CUSTOMER_PREFIXES.length*CUSTOMER_LOCATIONS.length);
  const name=CUSTOMER_PREFIXES[index%CUSTOMER_PREFIXES.length]+' '+profile.suffix+CUSTOMER_LOCATIONS[Math.floor(index/CUSTOMER_PREFIXES.length)];
  if(!used.has(name))return name;
 }
 return CUSTOMER_PREFIXES[start%CUSTOMER_PREFIXES.length]+' '+profile.suffix+' · '+id;
}
function averageProfileFactor(c,key){
 if(!c.customerMix)return 1;
 return ['food','retail','services'].reduce((sum,group)=>{
  const types=CUSTOMER_TYPES.filter(t=>t.group===group);
  const factor=t=>1+(t[key]-1)*c.profileStrength,focus=types.find(t=>t.id===c.focusType);
  const average=focus ? 0.5*factor(focus)+0.5*types.filter(t=>t!==focus).reduce((n,t)=>n+factor(t),0)/(types.length-1) : types.reduce((n,t)=>n+factor(t),0)/types.length;
  return sum+c.customerMix[group]/100*average;
 },0);
}
function workingDays(days=30){let n=0;for(let d=0;d<days;d++)if(d%7<5)n++;return n;}
function fresh(config=DEFAULT){let c=normalize(config);validateConfig(c);return{version:3,modelVersion:MODEL_VERSION,workloadId:'model2-seed-'+c.seed,config:c,day:0,projects:[],clients:[],contracts:[],cash:round(c.startingCash),initialCash:round(c.startingCash),revenue:0,expenses:0,ownerHours:0,designHours:0,funding:0,ledger:[],history:[],events:[],blocked:null,nextId:1,repeatQueue:[],lost:0,unserved:0};}
function event(s,p,text){const e={day:s.day,text};if(p)p.log.push(e);s.events.unshift({...e,project:p?.id||null});s.events=s.events.slice(0,120);}
function entry(s,amount,type,p,note){amount=round(amount);if(!Number.isFinite(amount)||(type==='receipt'&&amount<0))throw Error('Invalid cash transaction.');s.cash=round(s.cash+amount);s.ledger.push({day:s.day,amount:round(amount),type,project:p?.id||null,note});if(type==='expense'){s.expenses=round(s.expenses-amount);if(p)p.cost=round(p.cost-amount);}if(type==='receipt'&&p)p.paid=round(p.paid+amount);}
function pay(s,amount,p,note){amount=round(amount);if(s.cash+0.001<amount){s.blocked={amount,cash:s.cash,gap:round(amount-s.cash),project:p?.id||null,note};event(s,p,'Cash decision required: '+note);return false;}entry(s,-amount,'expense',p,note);return true;}
function move(s,p,stage){p.stage=stage;p.entered=s.day;p.wait=0;event(s,p,'Moved to '+LABELS[stage]);}
function suitableServices(c,group){return c.services.filter(v=>v.weight>0&&(!group||!v.audience||v.audience==='all'||v.audience===group));}
function projectRandomness(c,demandId){return Object.fromEntries(['conversion','complexity','revision','approval','supplier','payment','return'].map(stream=>[stream,demandDraw(c,demandId,stream)]));}
function create(s,service,id,client,renewal=false,identity=null){
 const c=s.config,projectId=id||'P'+String(s.nextId++).padStart(3,'0'),demandId=identity?.demandId||'legacy:'+projectId;
 const profile=identity?.clientType?profileFor(identity.clientType):!client?selectProfile(c,demandId):null;
 let clientId=identity?.clientId;
 if(!clientId)clientId='C_'+demandId.replace(/[^a-zA-Z0-9_-]/g,'_');
 let record=s.clients?.find(v=>v.id===clientId);
 if(!record){
  const name=client||(profile?customerName(s,profile,demandId):['Maple Bakery','Eastside Tea','Garden Noodle','Oak & Willow','Jade Market','Corner Café','Northline Salon','Little Lotus'][Math.floor(demandDraw(c,demandId,'name')*8)]);
  record={id:clientId,name,brief:profile?.context||'',created:s.day};if(profile)record.type=profile.id;
  (s.clients||(s.clients=[])).push(record);
 }
 const effort=profile?profileFactor(c,{clientType:profile.id},'effort'):1,quoteHours=c.quoteHours*effort;
 const p={id:projectId,demandId,serviceId:service.id,service:clone(service),client:record.name,clientId,brief:record.brief,cycle:identity?.cycle||1,orderKind:renewal?(identity?.orderKind||'confirmed-repeat'):'new-business',stage:'quote',created:s.day,entered:s.day,due:s.day+c.leadDays,work:{quote:quoteHours,design:0,review:0,delivery:0},commitments:{quoteHours,quoteSetDay:s.day},random:projectRandomness(c,demandId),price:0,paid:0,cost:0,ownerHours:0,designHours:0,priority:false,log:[],renewal,wait:0,revised:false,revisionCount:0,reprintCount:0,delivered:false,fulfillmentStatus:'open',paymentStatus:'unpaid',renewalStatus:'ineligible'};
 if(record.type!==undefined)p.clientType=record.type;if(identity?.contractId)p.contractId=identity.contractId;
 event(s,p,renewal?'Confirmed repeat cycle entered quote intake':'Inquiry received; entered quote intake');s.projects.push(p);return p;
}
function accept(s,p){
 const c=s.config,svc=c.services.find(x=>x.id===p.serviceId)||p.service,profile=profileFor(p.clientType);
 const choice=svc.fulfillment,fulfillmentMode=choice&&(demandDraw(c,p.demandId,'fulfillment-choice')<choice.managedShare?'agency-managed':'design-only');
 const effectivePrice=round(fulfillmentMode==='design-only'?choice.designOnlyPrice:svc.price),effectivePrint=round(fulfillmentMode==='design-only'?0:svc.print);
 const integer=(key,min,max)=>min+Math.floor(disruptionDraw(c,p,key)*(max-min+1)),rush=disruption(c,'rushDeadlines')&&disruptionDraw(c,p,'rush-selected')<c.disruptionRates.rushDeadlines;
 const leadDays=rush?Math.min(c.leadDays,Math.max(DISRUPTION_RULES.rushDeadlines.minLeadDays,Math.round(c.leadDays*DISRUPTION_RULES.rushDeadlines.leadFactor))):c.leadDays;
 const reprint=effectivePrint>0&&disruption(c,'supplierReprints')&&disruptionDraw(c,p,'reprint-selected')<c.disruptionRates.supplierReprints;
 const repeated=disruption(c,'repeatedRevisions')&&disruptionDraw(c,p,'revisions-selected')<c.disruptionRates.repeatedRevisions;
 const extended=c.deposit<1&&disruption(c,'extendedLatePayments')&&disruptionDraw(c,p,'late-payment-selected')<c.disruptionRates.extendedLatePayments;
 const disruptionTerms={rushDeadline:rush,supplierReprint:reprint,revisionRounds:repeated?integer('revision-rounds',DISRUPTION_RULES.repeatedRevisions.minRounds,DISRUPTION_RULES.repeatedRevisions.maxRounds):0,extendedPaymentDays:extended?integer('late-payment-days',DISRUPTION_RULES.extendedLatePayments.minDays,DISRUPTION_RULES.extendedLatePayments.maxDays):0,reprintDays:reprint?integer('reprint-days',DISRUPTION_RULES.supplierReprints.extraDaysMin,DISRUPTION_RULES.supplierReprints.extraDaysMax)+c.printDays:0};
 p.service=clone(svc);p.price=effectivePrice;p.accepted=s.day;p.due=s.day+leadDays;
 p.terms={paymentDays:c.paymentDays,approvalDays:c.approvalDays+(profile?Math.round(profile.approval*(c.profileStrength??0)):0),printDays:c.printDays,deliveryHours:c.deliveryHours,leadDays,disruptions:disruptionTerms};
 if(choice)p.terms.fulfillment={mode:fulfillmentMode,managedShare:choice.managedShare,managedPrice:round(svc.price),managedPrintCost:round(svc.print),designOnlyPrice:round(choice.designOnlyPrice)};
 const complexity=variable(c,'complexity')?0.75+p.random.complexity*0.75:1;
 p.work.design=svc.hours*complexity*profileFactor(c,p,'effort');p.work.review=svc.review*profileFactor(c,p,'effort');p.work.delivery=c.deliveryHours;p.printCost=effectivePrint;
 if(!p.contractId){
  p.contractId='K_'+p.demandId.replace(/[^a-zA-Z0-9_-]/g,'_');
  const contract={id:p.contractId,clientId:p.clientId,serviceId:p.serviceId,kind:svc.campaign?'campaign-relationship':svc.recurring?'paid-cycle':'repeat-purchase',started:s.day,cycles:1,status:'active'};
  if(svc.campaign)contract.skipped=0;
  if(svc.campaign)contract.campaign={...clone(svc.campaign),endDay:s.day+svc.campaign.relationshipDays};
  (s.contracts||(s.contracts=[])).push(contract);
 }else{
  const contract=s.contracts?.find(v=>v.id===p.contractId);if(contract)contract.cycles=Math.max(contract.cycles,p.cycle);
 }
 entry(s,p.price*c.deposit,'receipt',p,'Client deposit');p.paymentStatus=round(p.price-p.paid)===0?'paid':p.paid>0?'partial':'unpaid';
 event(s,p,'Quote accepted at $'+p.price+(fulfillmentMode?' for '+(fulfillmentMode==='agency-managed'?'agency-managed printing':'design only / client self-print'):'')+'; deposit received; delivery due day '+p.due+(rush?' under a modeled rush-event promise':''));move(s,p,'design');
}
function estimate(input){
 const c=normalize(input),days=30,workdays=workingDays(days),weeks=workdays/5;
 const expectedPrice=service=>service.fulfillment?service.price*service.fulfillment.managedShare+service.fulfillment.designOnlyPrice*(1-service.fulfillment.managedShare):service.price;
 const expectedPrint=service=>service.fulfillment?service.print*service.fulfillment.managedShare:service.print;
 const outreach=c.acquisition==='sales'?Math.min(c.outreachHours,c.ownerHours)*weeks:0,leads=c.acquisition==='preset'?c.inquiries:outreach*c.leadsPerHour;
 let orders=0,revenue=0,hours=0,owner=outreach,print=0,unserved=0;
 const serviceRows=new Map(c.services.map(v=>[v.id,{id:v.id,name:v.name,inquiries:0,orders:0,revenue:0,designerHours:0,ownerHours:0,designerCost:0,printCost:0,directCost:0,contribution:0,ownerTimeValue:0,afterOwnerTime:0}]));
 for(const group of c.customerMix?['food','retail','services']:[null]){
  const groupLeads=leads*(group?c.customerMix[group]/100:1),eligible=suitableServices(c,group);
  if(!eligible.length){unserved+=groupLeads;continue;}
  const total=eligible.reduce((n,v)=>n+v.weight,0),weighted=f=>eligible.reduce((n,v)=>n+f(v)*v.weight/total,0);
  const effort=group?averageProfileFactor({...c,customerMix:{food:group==='food'?100:0,retail:group==='retail'?100:0,services:group==='services'?100:0}},'effort'):1;
  const groupOrders=groupLeads*c.conversion;orders+=groupOrders;
  hours+=groupOrders*weighted(v=>v.hours)*effort;
  owner+=groupLeads*c.quoteHours*effort+groupOrders*(weighted(v=>v.review)*effort+c.deliveryHours);
  revenue+=groupOrders*weighted(expectedPrice);print+=groupOrders*weighted(expectedPrint);
  for(const v of eligible){
   const share=v.weight/total,row=serviceRows.get(v.id),serviceLeads=groupLeads*share,serviceOrders=groupOrders*share;
   row.inquiries+=serviceLeads;row.orders+=serviceOrders;row.revenue+=serviceOrders*expectedPrice(v);
   row.designerHours+=serviceOrders*v.hours*effort;row.ownerHours+=serviceLeads*c.quoteHours*effort+serviceOrders*(v.review*effort+c.deliveryHours);
   row.printCost+=serviceOrders*expectedPrint(v);
  }
 }
 const expense=hours*c.designerRate+print+c.overhead,ownerCapacity=c.ownerHours*weeks,designCapacity=c.designers*c.designerHours*weeks;
 const ratio=(used,cap)=>cap?used/cap:used?Infinity:0;
 const services=[...serviceRows.values()].map(row=>{
  const service=c.services.find(v=>v.id===row.id),baseOwnerHours=c.quoteHours+service.review+c.deliveryHours;
  const unit=(price,printCost)=>{const value={price:round(price),designerHours:round(service.hours),ownerHours:round(baseOwnerHours),designerCost:round(service.hours*c.designerRate),printCost:round(printCost)};value.directCost=round(value.designerCost+value.printCost);value.contribution=round(value.price-value.directCost);value.ownerTimeValue=round(value.ownerHours*c.ownerTarget);value.afterOwnerTime=round(value.contribution-value.ownerTimeValue);return value;};
  row.designerCost=row.designerHours*c.designerRate;row.directCost=row.designerCost+row.printCost;row.contribution=row.revenue-row.directCost;
  row.ownerTimeValue=row.ownerHours*c.ownerTarget;row.afterOwnerTime=row.contribution-row.ownerTimeValue;
  row.ownerCapacityShare=ratio(row.ownerHours,ownerCapacity);row.designCapacityShare=ratio(row.designerHours,designCapacity);
  row.perProject=unit(expectedPrice(service),expectedPrint(service));
  row.fulfillmentOptions=service.fulfillment?{mode:service.fulfillment.mode,managedShare:service.fulfillment.managedShare,agencyManaged:unit(service.price,service.print),designOnly:unit(service.fulfillment.designOnlyPrice,0)}:null;
  row.spec=service.spec?clone(service.spec):null;
  row.costBasis={designer:{hours:round(service.hours),hourlyRate:round(c.designerRate),cost:row.perProject.designerCost},owner:{salesQuoteHours:round(c.quoteHours),coordinationReviewHours:round(service.review),deliveryHours:round(c.deliveryHours),totalHours:round(baseOwnerHours),hourlyValue:round(c.ownerTarget),value:row.perProject.ownerTimeValue},print:{batchQuantity:service.spec?.printQuantity??null,unit:service.spec?.printUnit??null,cost:row.perProject.printCost}};
  row.renewalBasis=service.campaign?{kind:'separately-quoted-campaign',baseProbability:round(c.retention),cadenceDays:service.campaign.cadenceDays,relationshipDays:service.campaign.relationshipDays,maxCampaigns:Math.floor(service.campaign.relationshipDays/service.campaign.cadenceDays),onlyAfterCompletion:true,committed:false}:{kind:service.recurring?'optional-paid-cycle':'optional-repeat-purchase',baseProbability:round(service.recurring?c.retention:c.repeat),earliestDaysFromCreation:30,onlyAfterCompletion:true,committed:false};
  for(const key of ['inquiries','orders','revenue','designerHours','ownerHours','designerCost','printCost','directCost','contribution','ownerTimeValue','afterOwnerTime'])row[key]=round(row[key]);
  return row;
 });
 return{days,workdays,leads,unserved,orders,revenue,expense,profit:revenue-expense,owner,hours,outreach,ownerCapacity,designCapacity,ownerLoad:ratio(owner,ownerCapacity),designLoad:ratio(hours,designCapacity),surplus:revenue-expense-owner*c.ownerTarget,services};
}
function analytics(s){
 const ratio=(n,d)=>d>0?n/d:null, sum=(rows,key)=>rows.reduce((n,p)=>n+(p[key]||0),0);
 const delivered=s.projects.filter(p=>p.delivered), accepted=s.projects.filter(p=>p.accepted!==undefined);
 const directCost=sum(s.projects,'cost'), deliveredCost=sum(delivered,'cost'), contribution=round(s.revenue-deliveredCost);
 const overhead=round(s.expenses-directCost), unfinishedCost=round(directCost-deliveredCost), profit=round(s.revenue-s.expenses);
 const group=projects=>{
  const booked=projects.filter(p=>p.accepted!==undefined), done=projects.filter(p=>p.delivered);
  const revenue=round(sum(done,'price')), cost=round(sum(projects,'cost')), completedCost=round(sum(done,'cost'));
  const earned=round(revenue-completedCost), ownerHours=sum(projects,'ownerHours');
  return {cycles:booked.length,delivered:done.length,open:booked.filter(p=>!p.delivered).length,booked:round(sum(booked,'price')),revenue,cost,deliveredCost:completedCost,contribution:earned,margin:ratio(earned,revenue),unfinishedCost:round(cost-completedCost),collected:round(sum(projects,'paid')),receivable:round(done.reduce((n,p)=>n+p.price-p.paid,0)),backlog:round(booked.filter(p=>!p.delivered).reduce((n,p)=>n+p.price,0)),ownerHours,designHours:sum(projects,'designHours'),afterOwner:round(revenue-cost-ownerHours*s.config.ownerTarget)};
 };
 const serviceGroups=new Map(),contractGroups=new Map();
 for(const p of s.projects){
  if(!serviceGroups.has(p.serviceId))serviceGroups.set(p.serviceId,[]);serviceGroups.get(p.serviceId).push(p);
  if(p.contractId){if(!contractGroups.has(p.contractId))contractGroups.set(p.contractId,[]);contractGroups.get(p.contractId).push(p);}
 }
 const services=[...serviceGroups].map(([id,ps])=>({id,name:ps.at(-1).service.name,...group(ps)})).sort((a,b)=>b.contribution-a.contribution);
 const contractRecords=new Map(s.contracts.map(c=>[c.id,c]));
 const contracts=[...contractGroups].map(([id,ps])=>{const record=contractRecords.get(id),campaign=record?.campaign,next=s.repeatQueue.find(item=>item.contractId===id);return{id,client:ps[0].client,kind:record?.kind||'repeat-purchase',status:record?.status||'active',currentCycle:record?.cycles||Math.max(...ps.map(p=>p.cycle||1)),skippedCampaigns:record?.skipped||0,cadenceDays:campaign?.cadenceDays??null,relationshipEndDay:campaign?.endDay??null,nextQuoteDay:next?.day??null,campaignCharges:campaign?ps.filter(p=>p.accepted!==undefined).map(p=>({cycle:p.cycle,project:p.id,price:p.price,fulfillment:p.terms?.fulfillment?.mode||null})):[],projects:ps.map(p=>p.id),...group(ps)};}).sort((a,b)=>b.contribution-a.contribution);
 const external=s.projects.filter(p=>p.orderKind==='new-business'), won=external.filter(p=>p.accepted!==undefined).length, lost=external.filter(p=>p.stage==='lost').length;
 const repeat=accepted.filter(p=>p.orderKind!=='new-business'), uniqueClients=new Set(accepted.map(p=>p.clientId)).size;
 const monthly=Array.from({length:Math.max(1,Math.ceil(s.day/30))},(_,i)=>{
  const start=i*30,end=Math.min(s.day,(i+1)*30), before=s.history.find(h=>h.day===start)||{revenue:0,expenses:0,ownerHours:0}, last=s.history.filter(h=>h.day>start&&h.day<=end).at(-1)||before;
  const revenue=round(last.revenue-before.revenue),cost=round(last.expenses-before.expenses),result=round(revenue-cost),ownerHours=last.ownerHours-before.ownerHours;
  return {month:i+1,days:Math.max(0,end-start),revenue,cost,profit:result,margin:ratio(result,revenue),ownerHours,afterOwner:round(result-ownerHours*s.config.ownerTarget),delivered:delivered.filter(p=>p.deliveredDay>start&&p.deliveredDay<=end).length};
 });
 return {directCost:round(directCost),deliveredCost:round(deliveredCost),contribution,contributionMargin:ratio(contribution,s.revenue),overhead,unfinishedCost,profit,operatingMargin:ratio(profit,s.revenue),ownerTime:round(s.ownerHours*s.config.ownerTarget),afterOwner:round(profit-s.ownerHours*s.config.ownerTarget),afterOwnerMargin:ratio(profit-s.ownerHours*s.config.ownerTarget,s.revenue),services,contracts,monthly,external:external.length,won,lost,pending:external.length-won-lost,conversion:ratio(won,won+lost),uniqueClients,repeatCycles:repeat.length,repeatShare:ratio(repeat.length,accepted.length),skippedCampaigns:contracts.reduce((total,contract)=>total+contract.skippedCampaigns,0),averageOrder:ratio(sum(accepted,'price'),accepted.length),backlog:round(sum(accepted.filter(p=>!p.delivered),'price')),revenuePerOwnerHour:ratio(s.revenue,s.ownerHours),profitPerOwnerHour:ratio(profit,s.ownerHours)};
}
function metrics(s){
 const active=s.projects.filter(p=>!['complete','lost'].includes(p.stage)),delivered=s.projects.filter(p=>p.delivered),profit=s.revenue-s.expenses;
 const lateOpen=active.filter(p=>p.accepted!==undefined&&!p.delivered&&s.day>p.due),lateDelivered=delivered.filter(p=>p.deliveredDay>p.due),quotes=active.filter(p=>p.stage==='quote');
 const ownerOpenHours=active.reduce((n,p)=>n+(p.work.quote||0)+(p.work.review||0)+(p.work.delivery||0),0),designerOpenHours=active.reduce((n,p)=>n+(p.work.design||0),0);
 const totalLead=delivered.reduce((n,p)=>n+p.deliveredDay-p.created,0),acceptedLead=delivered.reduce((n,p)=>n+p.deliveredDay-p.accepted,0),onTime=delivered.length-lateDelivered.length;
 return{profit,ownerTimeValue:s.ownerHours*s.config.ownerTarget,surplus:profit-s.ownerHours*s.config.ownerTarget,effective:s.ownerHours?profit/s.ownerHours:0,active:active.length,late:lateOpen.length,lateCompleted:lateDelivered.length,onTimeRate:delivered.length?onTime/delivered.length:null,averageLeadDays:delivered.length?totalLead/delivered.length:null,averageAcceptedLeadDays:delivered.length?acceptedLead/delivered.length:null,quoteCount:quotes.length,oldestQuoteAge:quotes.length?Math.max(...quotes.map(p=>s.day-p.created)):0,ownerOpenHours,designerOpenHours,externalWaits:active.filter(p=>['approval','production','payment'].includes(p.stage)).length,throughput30:delivered.filter(p=>p.deliveredDay>Math.max(0,s.day-30)).length,overduePayments:active.filter(p=>p.delivered&&round(p.price-p.paid)>0&&s.day>p.paymentDue).length,complete:s.projects.filter(p=>p.stage==='complete').length,delivered:delivered.length,receivable:delivered.reduce((a,p)=>a+p.price-p.paid,0),unserved:s.unserved||0};
}
function demandSignature(config){
 const c=normalize(config);
 return JSON.stringify({seed:c.seed,acquisition:c.acquisition,inquiries:c.inquiries,outreachHours:c.outreachHours,leadsPerHour:c.leadsPerHour,customerMix:c.customerMix||null,focusType:c.focusType||'none',profileStrength:c.profileStrength??0,services:c.services.map(v=>({id:v.id,weight:v.weight,audience:v.audience||'all'}))});
}
function compareRuns(current,baseline){
 const a=analytics(current),b=analytics(baseline),am=metrics(current),bm=metrics(baseline),delta=(x,y)=>round((x||0)-(y||0));
 const flags={sameElapsedDay:current.day===baseline.day,sameWorkloadIdentity:current.workloadId===baseline.workloadId,sameExternalDemandAssumptions:demandSignature(current.config)===demandSignature(baseline.config)};
 flags.likeForLike=flags.sameElapsedDay&&flags.sameWorkloadIdentity&&flags.sameExternalDemandAssumptions;
 const warnings=[];
 if(!flags.sameElapsedDay)warnings.push({code:'different-day',message:'Runs are at different elapsed days; result deltas are descriptive, not causal.'});
 if(!flags.sameWorkloadIdentity)warnings.push({code:'different-workload',message:'Runs do not share a workload identity; customer-level outcomes are not directly comparable.'});
 if(!flags.sameExternalDemandAssumptions)warnings.push({code:'different-demand-assumptions',message:'External-demand assumptions differ even if the workload seed matches.'});
 const deltas={cash:delta(current.cash,baseline.cash),revenue:delta(current.revenue,baseline.revenue),deliveredDirectCost:delta(a.deliveredCost,b.deliveredCost),unfinishedCost:delta(a.unfinishedCost,b.unfinishedCost),overhead:delta(a.overhead,b.overhead),operatingResult:delta(a.profit,b.profit),ownerTimeValue:delta(a.ownerTime,b.ownerTime),afterOwnerTime:delta(a.afterOwner,b.afterOwner),delivered:am.delivered-bm.delivered,lateOpenDeliveries:am.late-bm.late,receivable:delta(am.receivable,bm.receivable),ownerOpenHours:delta(am.ownerOpenHours,bm.ownerOpenHours),designerOpenHours:delta(am.designerOpenHours,bm.designerOpenHours)};
 const bridge=[{code:'delivered-revenue',label:'Delivered revenue',amount:deltas.revenue},{code:'delivered-direct-cost',label:'Delivered direct cost',amount:round(-deltas.deliveredDirectCost)},{code:'unfinished-cost',label:'Unfinished-work cost',amount:round(-deltas.unfinishedCost)},{code:'overhead',label:'Shared overhead',amount:round(-deltas.overhead)}];
 const dominantDriver=[...bridge].sort((x,y)=>Math.abs(y.amount)-Math.abs(x.amount))[0]||null;
 return{flags,warnings,deltas,bridge,dominantDriver,reconciles:round(bridge.reduce((n,v)=>n+v.amount,0))===deltas.operatingResult};
}
function projectDiagnostic(s,project){
 const p=typeof project==='string'?s.projects.find(v=>v.id===project):project;
 if(!p||!s.projects.includes(p))throw Error('Project not found');
 const stage=p.stage,done=['complete','lost'].includes(stage),lateDays=p.accepted!==undefined&&!p.delivered?Math.max(0,s.day-p.due):0;
 const committedDisruptions=p.terms?.disruptions||{},contract=s.contracts.find(value=>value.id===p.contractId);
 const result={projectId:p.id,stage,kind:done?'done':['approval','production','payment'].includes(stage)?'external':'resource',responsible:{inquiry:'client',quote:'owner',design:'design-team',review:'owner',approval:'client',production:'supplier',delivery:'owner',payment:'client',complete:'none',lost:'none'}[stage],waitDays:Math.max(0,s.day-p.entered),lateDays,remainingWorkHours:round(p.work?.[stage]||0),remainingCalendarDays:0,dailyCapacity:0,queueAheadCount:0,queueAheadHours:0,estimatedWorkdays:null,reasonCode:done?stage:'waiting',fulfillment:p.terms?.fulfillment?clone(p.terms.fulfillment):null,campaign:contract?.campaign?{cycle:p.cycle,cadenceDays:contract.campaign.cadenceDays,relationshipEndDay:contract.campaign.endDay,status:contract.status,skippedCampaigns:contract.skipped||0}:null,disruptions:{rushDeadline:committedDisruptions.rushDeadline===true,supplierReprint:committedDisruptions.supplierReprint===true,reprintCount:p.reprintCount||0,revisionRounds:committedDisruptions.revisionRounds||0,revisionCount:p.revisionCount??(p.revised?1:0),extendedPaymentDays:committedDisruptions.extendedPaymentDays||0}};
 if(done)return result;
 if(stage==='approval'){
  const committed=(p.terms?.approvalDays??s.config.approvalDays)+(variable(s.config,'approval')?Math.floor(p.random.approval*3):0);
  result.remainingCalendarDays=p.approvalConfirmed?0:Math.max(0,committed-result.waitDays);result.reasonCode=p.approvalConfirmed?'approval-confirmed':'client-approval';return result;
 }
 if(stage==='production'){result.remainingCalendarDays=Math.max(0,(p.printDuration||0)-result.waitDays);result.reasonCode=(p.reprintCount||0)>0?'supplier-reprint':'supplier-production';return result;}
 if(stage==='payment'){result.remainingCalendarDays=Math.max(0,(p.receiveDay??s.day)-s.day);result.reasonCode=committedDisruptions.extendedPaymentDays?'extended-late-payment':s.day>(p.paymentDue??Infinity)?'late-payment':'scheduled-payment';return result;}
 if(stage==='inquiry'){result.responsible='owner';result.reasonCode='quote-intake';return result;}
 const ownerStages=['quote','review','delivery'],resourceStages=stage==='design'?['design']:ownerStages;
 result.reasonCode=stage==='design'?'design-capacity':'owner-capacity';
 result.dailyCapacity=stage==='design'?s.config.designers*s.config.designerHours/5:(s.config.ownerHours-(s.config.acquisition==='sales'?Math.min(s.config.outreachHours,s.config.ownerHours):0))/5;
 const ordered=orderedProjects(s),position=ordered.indexOf(p),ahead=ordered.slice(0,Math.max(0,position)).filter(v=>resourceStages.includes(v.stage));
 result.queueAheadCount=ahead.length;result.queueAheadHours=round(ahead.reduce((n,v)=>n+(v.work[v.stage]||0),0));
 if(result.dailyCapacity>0){const ownDaily=stage==='design'?Math.min(result.dailyCapacity,s.config.designerHours/5):result.dailyCapacity;result.estimatedWorkdays=Math.ceil(result.queueAheadHours/result.dailyCapacity+result.remainingWorkHours/Math.max(ownDaily,Number.EPSILON));}
 return result;
}
function bottleneck(s){
 const c=s.config,describe=(resource,stages,capacity)=>{
  const breakdown=stages.map(stage=>{const projects=s.projects.filter(p=>p.stage===stage),hours=projects.reduce((n,p)=>n+(p.work[stage]||0),0);return{stage,count:projects.length,hours,oldest:projects.length?Math.max(...projects.map(p=>s.day-p.entered)):0};});
  const hours=breakdown.reduce((n,v)=>n+v.hours,0),count=breakdown.reduce((n,v)=>n+v.count,0),leading=[...breakdown].sort((a,b)=>b.hours-a.hours||b.oldest-a.oldest)[0];
  return{resource,stage:leading?.stage||stages[0],stages:breakdown,count:leading?.count||0,hours:leading?.hours||0,combinedCount:count,combinedHours:hours,capacity,days:capacity>0?hours/capacity:hours>0?Infinity:0,oldest:Math.max(0,...breakdown.map(v=>v.oldest))};
 };
 const ownerCapacity=(c.ownerHours-(c.acquisition==='sales'?Math.min(c.outreachHours,c.ownerHours):0))/5;
 const ranked=[describe('owner',['quote','review','delivery'],ownerCapacity),describe('design',['design'],c.designers*c.designerHours/5)].filter(v=>v.count).sort((a,b)=>b.days-a.days);
 if(ranked.length)return ranked[0];
 const waits=['approval','production','payment'].map(stage=>{const ps=s.projects.filter(p=>p.stage===stage);return{resource:'external',stage,count:ps.length,hours:0,capacity:0,days:0,oldest:ps.length?Math.max(...ps.map(p=>s.day-p.entered)):0,stages:[]};}).filter(v=>v.count).sort((a,b)=>b.oldest-a.oldest);
 return waits[0]||null;
}
function orderedProjects(s){const c=s.config;return [...s.projects].sort((a,b)=>Number(b.priority)-Number(a.priority)||(c.priority==='deadline'?(a.accepted===undefined)-(b.accepted===undefined)||a.due-b.due:a.created-b.created)||a.demandId.localeCompare(b.demandId)||a.id.localeCompare(b.id));}
// Daily updates are atomic. If any payment fails, discard the proposed day's
// work, preserve the diagnostic, then retry after an explicit funding decision.
function step(s){if(s.blocked||s.day>=s.config.months*30)return false;let draft=clone(s);draft.day++;if(!advance(draft)){
 // A newly created project disappears with the rolled-back day. Its ID stays
 // in the payment note, but only committed projects can be linked or saved.
 s.blocked={...draft.blocked,project:s.projects.some(p=>p.id===draft.blocked.project)?draft.blocked.project:null};return false;
}Object.assign(s,draft);return true;}
function collectPayment(s,p){const balance=round(p.price-p.paid);if(balance<0)throw Error('Project balance cannot be negative.');if(balance>0)entry(s,balance,'receipt',p,'Final payment');p.paymentStatus='paid';completePaid(s,p);}
function scheduleCampaign(s,p,contract,cycle){
 const cadence=contract.campaign.cadenceDays,maxCycles=Math.floor(contract.campaign.relationshipDays/cadence),day=Math.max(contract.started+(cycle-1)*cadence,s.day+1),demandId=contract.id+':cycle:'+cycle;
 if(cycle>maxCycles||day>contract.campaign.endDay){contract.status='ended';return null;}
 const existing=s.repeatQueue.find(item=>item.contractId===contract.id&&(item.cycle===cycle||item.demandId===demandId));if(existing)return existing.day;
 s.repeatQueue.push({day,serviceId:p.serviceId,client:p.client,clientType:p.clientType,clientId:p.clientId,contractId:contract.id,cycle,demandId,orderKind:'campaign-reoffer'});contract.status='active';return day;
}
function advanceProject(s,p,capacity){
 const c=s.config;
 for(let transitions=0;transitions<16;transitions++){
  if(['complete','lost'].includes(p.stage))return true;p.wait=s.day-p.entered;
  if(p.stage==='inquiry'){move(s,p,'quote');continue;}
  if(['quote','design','review','delivery'].includes(p.stage)){
   const stage=p.stage,isDesign=stage==='design',available=isDesign?Math.min(capacity.design,Math.max(0,capacity.perDesigner-(capacity.designByProject.get(p.id)||0))):capacity.owner;
   const h=Math.min(available,p.work[stage]);
   if(h>0){
    if(isDesign){if(!pay(s,h*c.designerRate,p,'Design labor for '+p.id))return false;capacity.design-=h;capacity.designByProject.set(p.id,(capacity.designByProject.get(p.id)||0)+h);s.designHours+=h;p.designHours+=h;}
    else{capacity.owner-=h;s.ownerHours+=h;p.ownerHours+=h;}
    p.work[stage]=Math.max(0,p.work[stage]-h);
   }
   if(p.work[stage]>0.00001)return true;
   if(stage==='quote'){
    const campaignReoffer=p.orderKind==='campaign-reoffer',campaignAcceptance=Math.min(1,c.retention*profileFactor(c,p,'repeat'));
    if(campaignReoffer?p.random.return<campaignAcceptance:p.renewal||p.random.conversion<c.conversion){accept(s,p);continue;}
    p.stage='lost';s.lost++;
    if(campaignReoffer){const contract=s.contracts.find(v=>v.id===p.contractId);if(contract){contract.skipped=(contract.skipped||0)+1;contract.cycles=Math.max(contract.cycles,p.cycle);const nextDay=scheduleCampaign(s,p,contract,p.cycle+1);p.renewalStatus='skipped';event(s,p,nextDay===null?'Client declined this campaign; yearly relationship reached its end':'Client declined this campaign; next separate quote scheduled for day '+nextDay);}else{p.renewalStatus='not-returning';event(s,p,'Client declined campaign quote');}return true;}
    p.renewalStatus='not-returning';event(s,p,'Client declined quote');return true;
   }
   if(stage==='design'){move(s,p,'review');continue;}
   if(stage==='review'){move(s,p,'approval');continue;}
   p.delivered=true;p.fulfillmentStatus='delivered';p.deliveredDay=s.day;p.paymentDue=s.day+(p.terms?.paymentDays??c.paymentDays);
   const extendedDelay=p.terms?.disruptions?.extendedPaymentDays||0,paymentDelay=extendedDelay||(variable(c,'payment')?Math.floor(p.random.payment*6):0);p.receiveDay=p.paymentDue+paymentDelay;s.revenue=round(s.revenue+p.price);event(s,p,'Delivered; revenue recognized');
   if(extendedDelay)event(s,p,'Modeled late-payment incident: collection expected '+extendedDelay+' days after the contractual due date');
   if(round(p.price-p.paid)===0){p.paymentStatus='paid';completePaid(s,p);return true;}
   p.paymentStatus=p.paid>0?'partial':'unpaid';move(s,p,'payment');continue;
  }
  if(p.stage==='approval'){
   const wait=(p.terms?.approvalDays??c.approvalDays)+(variable(c,'approval')?Math.floor(p.random.approval*3):0);
   if(!p.approvalConfirmed&&p.wait<wait)return true;
   const revisionChance=0.3+((profileFor(p.clientType)?.revision??0.3)-0.3)*(c.profileStrength??0);
   const revisionCount=p.revisionCount??(p.revised?1:0),committedRounds=p.terms?.disruptions?.revisionRounds||0;
   const baseRevision=!committedRounds&&variable(c,'revisions')&&revisionCount<1&&p.random.revision<revisionChance,repeatedRevision=committedRounds>revisionCount;
   if(!p.approvalConfirmed&&(baseRevision||repeatedRevision)){p.revisionCount=revisionCount+1;p.revised=true;p.work.design=p.service.hours*DISRUPTION_RULES.repeatedRevisions.designFactor*profileFactor(c,p,'effort');p.work.review=p.service.review*DISRUPTION_RULES.repeatedRevisions.reviewFactor*profileFactor(c,p,'effort');event(s,p,committedRounds?'Client requested modeled revision '+p.revisionCount+' of '+committedRounds:'Client requested one additional revision');move(s,p,'design');continue;}
   if(p.printCost>0){if(!pay(s,p.printCost,p,'Print order for '+p.id))return false;p.printDuration=(p.terms?.printDays??c.printDays)+(variable(c,'supplier')?Math.floor(p.random.supplier*4):0);event(s,p,'Print order committed at $'+p.printCost);move(s,p,'production');continue;}
   move(s,p,'delivery');continue;
  }
  if(p.stage==='production'){
   if(p.wait<p.printDuration)return true;
   if(p.terms?.disruptions?.supplierReprint&&(p.reprintCount||0)<1){const reprintCost=round(p.printCost*DISRUPTION_RULES.supplierReprints.costFactor);if(!pay(s,reprintCost,p,'Supplier reprint for '+p.id))return false;p.reprintCount=(p.reprintCount||0)+1;p.printDuration=p.terms.disruptions.reprintDays;event(s,p,'Modeled supplier reprint added '+p.printDuration+' days and $'+reprintCost+' direct cost');move(s,p,'production');continue;}
   move(s,p,'delivery');continue;
  }
  if(p.stage==='payment'){if(s.day<p.receiveDay)return true;collectPayment(s,p);return true;}
  return true;
 }
 throw Error('Project transition loop exceeded its safe limit.');
}
function advance(s){
 const c=s.config,weekday=(s.day-1)%7<5,dayInMonth=(s.day-1)%30;
 // Model 2 day order: due collections, fixed obligations, confirmed cycles,
 // external demand, outreach, then scheduled work and same-day transitions.
 for(const p of orderedProjects(s).filter(p=>p.stage==='payment'&&s.day>=p.receiveDay))collectPayment(s,p);
 if(dayInMonth===0&&!pay(s,c.overhead,null,'Monthly software and overhead'))return false;
 const returns=s.repeatQueue.filter(r=>r.day<=s.day);s.repeatQueue=s.repeatQueue.filter(r=>r.day>s.day);
 for(const r of returns){const svc=c.services.find(x=>x.id===r.serviceId)||[...s.projects].reverse().find(p=>p.serviceId===r.serviceId&&p.clientId===r.clientId)?.service;if(svc)create(s,svc,null,r.client,true,r);}
 const mean=c.acquisition==='preset'?c.inquiries/30:(weekday?Math.min(c.outreachHours/5,c.ownerHours/5)*c.leadsPerHour:0);
 const arrivals=Math.floor(mean)+(demandDraw(c,'day:'+s.day,'arrival')<mean%1?1:0),total=c.services.reduce((a,v)=>a+v.weight,0);
 if(total>0)for(let i=0;i<arrivals;i++){
  const demandId='lead:'+s.day+':'+i,profile=selectProfile(c,demandId),eligible=suitableServices(c,profile?.group),available=eligible.reduce((n,v)=>n+v.weight,0);
  if(!available){s.unserved=(s.unserved||0)+1;event(s,null,(profile?.label||'Customer')+' inquiry could not be served by the current offerings');continue;}
  let pick=demandDraw(c,demandId,'service')*available,svc=eligible.at(-1);for(const v of eligible){pick-=v.weight;if(pick<0){svc=v;break;}}
  create(s,svc,null,null,false,{demandId,clientType:profile?.id});
 }
 const capacity={owner:weekday?c.ownerHours/5:0,design:weekday?c.designers*c.designerHours/5:0,perDesigner:weekday?c.designerHours/5:0,designByProject:new Map()};
 if(weekday&&c.acquisition==='sales'){const h=Math.min(capacity.owner,c.outreachHours/5);capacity.owner-=h;s.ownerHours+=h;}
 for(const p of orderedProjects(s))if(!advanceProject(s,p,capacity))return false;
 const m=metrics(s);s.history.push({day:s.day,cash:s.cash,revenue:s.revenue,expenses:s.expenses,profit:m.profit,ownerHours:s.ownerHours,complete:m.complete,active:m.active,late:m.late,onTimeRate:m.onTimeRate,oldestQuoteAge:m.oldestQuoteAge});return true;
}
function completePaid(s,p){
 if(p.stage==='complete')return;
 if(!p.delivered||round(p.price-p.paid)!==0)throw Error('Project must be delivered and fully paid.');
 p.fulfillmentStatus='delivered';p.paymentStatus='paid';move(s,p,'complete');
 const recur=p.service.recurring,c=s.config,contract=s.contracts.find(value=>value.id===p.contractId);
 if(contract?.campaign){
  const nextDay=scheduleCampaign(s,p,contract,(p.cycle||1)+1);p.renewalStatus=nextDay===null?'not-returning':'scheduled';
  return;
 }
 const probability=Math.min(1,(recur?c.retention:c.repeat)*profileFactor(c,p,'repeat'));
 if(p.random.return<probability){
  const cycle=(p.cycle||1)+1,demandId=p.contractId+':cycle:'+cycle;
  s.repeatQueue.push({day:recur?Math.max(p.created+30,s.day+1):s.day+30,serviceId:p.serviceId,client:p.client,clientType:p.clientType,clientId:p.clientId,contractId:p.contractId,cycle,demandId,orderKind:recur?'paid-cycle-renewal':'confirmed-repeat'});p.renewalStatus='scheduled';
 }else p.renewalStatus='not-returning';
}
function cashSeries(s){
 const changes=new Map();for(const e of s.ledger)changes.set(e.day,(changes.get(e.day)||0)+Math.round(e.amount*100));
 let cash=Math.round(s.initialCash*100);const points=[];
 for(let day=0;day<=s.day;day++){cash+=changes.get(day)||0;points.push({day,cash:cash/100});}return points;
}
function fund(s,amount){if(!Number.isFinite(amount)||round(amount)<0.01)throw Error('Enter a positive funding amount of at least one cent.');amount=round(amount);entry(s,amount,'funding',null,'Owner funding');s.funding=round(s.funding+amount);s.blocked=null;event(s,null,'Owner funding added: $'+amount);if(s.history.length)s.history.at(-1).cash=s.cash;}

function intervene(s,id,action,value){const p=s.projects.find(v=>v.id===id);if(!p)throw Error('Project not found');if(action==='priority'){p.priority=!p.priority;event(s,p,p.priority?'Manually prioritized':'Priority removed');}else if(action==='deadline'){if(p.accepted===undefined)throw Error('A delivery deadline can be changed only after the quote is accepted.');if(!Number.isFinite(value)||value<=p.due)throw Error('Choose a later deadline');p.due=value;event(s,p,'Agreed deadline changed to day '+value);}else if(action==='approve'){if(p.stage!=='approval')throw Error('Only client approval can be expedited');p.approvalConfirmed=true;event(s,p,'Client approval confirmed manually');}else throw Error('Unknown action');}
function configIssues(c){
  const issues=[],add=(path,message)=>issues.push({path,message});
  if(!c||typeof c!=="object"||Array.isArray(c))return[{path:'',message:'Choose valid simulation settings.'}];
  if(typeof c.name!=="string"||!c.name.trim()||c.name.length>100)add('name','Give this scenario a name (up to 100 characters).');
  if(!Array.isArray(c.services)||!c.services.length||c.services.length>20)add('services','Include between 1 and 20 services.');
  const fields={seed:[0,1e9,"Workload seed"],months:[1,12,"Simulation months"],startingCash:[0,1e8,"Starting cash"],ownerHours:[0,120,"Your weekly hours"],ownerTarget:[0,1000,"Your hourly target"],designers:[0,50,"Number of designers"],designerHours:[0,120,"Weekly hours per designer"],designerRate:[0,1000,"Designer hourly cost"],overhead:[0,1e7,"Monthly overhead"],inquiries:[0,500,"Monthly inquiries"],conversion:[0,1,"Conversion rate"],deposit:[0,1,"Client deposit"],paymentDays:[0,90,"Payment terms"],approvalDays:[0,30,"Approval time"],printDays:[0,90,"Print time"],outreachHours:[0,120,"Weekly outreach hours"],leadsPerHour:[0,100,"Inquiries per outreach hour"],retention:[0,1,"Renewal rate"],repeat:[0,1,"Repeat purchase rate"],quoteHours:[0,24,"Hours per quote"],deliveryHours:[0,24,"Hours per delivery"],leadDays:[1,180,"Promised delivery time"]};
  for(const [k,[lo,hi,label]]of Object.entries(fields)){if(c[k]===undefined&&['quoteHours','deliveryHours','leadDays'].includes(k))continue;if(typeof c[k]!=="number"||!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)add(k,label+" must be between "+lo+" and "+hi+".");}
  for(const key of ['seed','months','designers','paymentDays','approvalDays','printDays','leadDays'])if(c[key]!==undefined&&Number.isFinite(c[key])&&!Number.isInteger(c[key]))add(key,fields[key][2]+" must be a whole number.");
  if(![1,3,6,12].includes(c.months))add('months','Choose a 1, 3, 6 or 12 month simulation horizon.');
  if(!['preset','sales'].includes(c.acquisition))add('acquisition','Choose how inquiries arrive.');
  if(!['deadline','fifo'].includes(c.priority))add('priority','Choose a valid queue order.');
  if(typeof c.realism!=='boolean')add('realism','Choose valid uncertainty settings.');
  if(c.recipe!==undefined){
    const legacyKeys=['catalog','condition','market','mix','operation','version'],legacy=c.recipe&&typeof c.recipe==='object'&&!Array.isArray(c.recipe)&&
      Object.keys(c.recipe).sort().join(',')===legacyKeys.join(',')&&c.recipe.catalog==='metro-detroit-2026-v1'&&c.recipe.version===1&&
      ['market','operation','mix','condition'].every(k=>typeof c.recipe[k]==='string'&&/^[a-z0-9_-]{1,40}$/.test(c.recipe[k]));
    if(!legacy&&!validRecipeV2(c.recipe))
      add('recipe','Scenario recipe provenance is invalid.');
  }
  if(c.customerMix!==undefined){
    if(!c.customerMix||typeof c.customerMix!=='object'||Array.isArray(c.customerMix)||Object.keys(c.customerMix).sort().join(',')!=='food,retail,services'||
       !['food','retail','services'].every(k=>Number.isInteger(c.customerMix[k])&&c.customerMix[k]>=0&&c.customerMix[k]<=100)||
       c.customerMix.food+c.customerMix.retail+c.customerMix.services!==100)add('customerMix','Customer shares must be whole percentages adding to 100%.');
    if(typeof c.profileStrength!=='number'||![0,.5,1].includes(c.profileStrength))add('profileStrength','Choose a valid business-type variation.');
    if(c.focusType!==undefined&&c.focusType!=='none'&&!CUSTOMER_TYPES.some(t=>t.id===c.focusType))add('focusType','Choose a valid customer niche.');
  }else if(c.profileStrength!==undefined||c.focusType!==undefined)add('customerMix','Customer profiles require a customer mix.');
  if(c.uncertainty)for(const key of Object.keys(DEFAULT.uncertainty))if(typeof c.uncertainty[key]!=='boolean')add('uncertainty.'+key,'Choose a valid uncertainty switch.');
  if(c.disruptions!==undefined){
    if(!c.disruptions||typeof c.disruptions!=='object'||Array.isArray(c.disruptions))add('disruptions','Choose valid modeled disruption settings.');
    else for(const key of Object.keys(DEFAULT.disruptions))if(typeof c.disruptions[key]!=='boolean')add('disruptions.'+key,'Choose a valid modeled disruption switch.');
  }
  if(c.disruptionRates!==undefined){
    if(!c.disruptionRates||typeof c.disruptionRates!=='object'||Array.isArray(c.disruptionRates))add('disruptionRates','Choose valid modeled disruption rates.');
    else for(const key of Object.keys(DEFAULT_DISRUPTION_RATES))if(typeof c.disruptionRates[key]!=='number'||!Number.isFinite(c.disruptionRates[key])||c.disruptionRates[key]<0||c.disruptionRates[key]>1)add('disruptionRates.'+key,'Modeled disruption rates must be between 0 and 1.');
  }
  const ids=new Set();
  for(const [index,v] of (Array.isArray(c.services)?c.services:[]).entries()){
    const base='services.'+index;
    if(!v||typeof v!=='object'){add(base,'Check this service.');continue;}
    if(typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v.id)||ids.has(v.id))add(base+'.id','Each service needs a unique valid identifier.');else ids.add(v.id);
    if(typeof v.name!=='string'||!v.name.trim()||v.name.length>100)add(base+'.name','Give this service a name (up to 100 characters).');
    if(typeof v.deliverable!=='string'||v.deliverable.length>500)add(base+'.deliverable','Describe the deliverable in up to 500 characters.');
    if(typeof v.recurring!=='boolean')add(base+'.recurring','Choose a valid purchase pattern.');
    if(typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))add(base+'.color','Choose a valid service color.');
    if(v.audience!==undefined&&!['all','food','retail','services'].includes(v.audience))add(base+'.audience','Choose a valid service audience.');
    if(v.spec!==undefined&&!validServiceSpec(v.spec))add(base+'.spec','Check this service scope, evidence and modeled ranges.');
    if(v.fulfillment!==undefined){
      const option=v.fulfillment,shape=option&&typeof option==='object'&&!Array.isArray(option)&&Object.keys(option).sort().join(',')==='designOnlyPrice,managedShare,mode'&&option.mode==='customer-choice';
      if(!shape)add(base+'.fulfillment','Choose a valid customer print option.');
      else{
        if(typeof option.managedShare!=='number'||!Number.isFinite(option.managedShare)||option.managedShare<0||option.managedShare>1)add(base+'.fulfillment.managedShare','Managed-print share must be between 0 and 1.');
        if(typeof option.designOnlyPrice!=='number'||!Number.isFinite(option.designOnlyPrice)||option.designOnlyPrice<0||option.designOnlyPrice>v.price)add(base+'.fulfillment.designOnlyPrice','Design-only price must be between 0 and the managed-print price.');
        if(!(typeof v.print==='number'&&Number.isFinite(v.print)&&v.print>0))add(base+'.print','Customer print choice requires a positive managed-print cost.');
      }
    }
    if(v.campaign!==undefined){
      const campaign=v.campaign,shape=campaign&&typeof campaign==='object'&&!Array.isArray(campaign)&&Object.keys(campaign).sort().join(',')==='cadenceDays,relationshipDays';
      if(!shape)add(base+'.campaign','Choose valid separately quoted campaign terms.');
      else{
        if(![30,90].includes(campaign.cadenceDays))add(base+'.campaign.cadenceDays','Campaign cadence must be 30 or 90 days.');
        if(campaign.relationshipDays!==365)add(base+'.campaign.relationshipDays','Campaign relationship must cover 365 days.');
        if(v.recurring!==true)add(base+'.recurring','Campaign relationships must use recurring purchase behavior.');
      }
    }
    for(const [key,max]of [['price',1e6],['hours',500],['review',100],['print',1e6],['weight',100]])if(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]<0||v[key]>max)add(base+'.'+key,(typeof v.name==='string'&&v.name.trim()?v.name:'Service')+': '+key+' must be between 0 and '+max+'.');
  }
  if(Array.isArray(c.services)&&c.services.length){const total=c.services.reduce((n,v)=>n+(typeof v?.weight==='number'&&Number.isFinite(v.weight)?v.weight:0),0);if((c.services.length===1&&total<=0)||(c.services.length>1&&Math.abs(total-100)>.01))add('services',c.services.length===1?'Assign an inquiry share to the service.':'Service inquiry shares must add up to 100%.');}
  if(!c.customerMix&&Array.isArray(c.services)&&c.services.some(v=>v?.audience&&v.audience!=='all'))add('customerMix','Enable business types before targeting a service to one group.');
  return issues;
}
function validateConfig(c){
  const issue=configIssues(c)[0];if(issue)throw Error(issue.message);
  return c;
}
function applyConfig(s,next){
  const c=normalize(next);validateConfig(c);
  if(s.day>0&&(c.startingCash!==s.config.startingCash||c.seed!==s.config.seed))throw Error('Starting cash and workload seed require a new run.');
  if(c.months*30<s.day)throw Error('The horizon must include the current simulation day.');
  if(s.day===0){s.cash=round(s.cash+round(c.startingCash)-s.initialCash);s.initialCash=round(c.startingCash);}
  s.config=clone(c);s.blocked=null;event(s,null,'Business settings updated. Existing quotes retain agreed prices and terms.');return s;
}
function restore(input){return (root.MEIQQValidation||(typeof require==='function'?require('./validation.js'):null)).restore(input,api);}
const api={MODEL_VERSION,DEFAULT,DISRUPTION_RULES,RECIPE_V2,CUSTOMER_TYPES,STAGES,LABELS,clone,round,random,demandDraw,recipeFingerprint,validServiceSpec,validServiceFulfillment,validServiceCampaign,fresh,step,metrics,analytics,estimate,compareRuns,projectDiagnostic,bottleneck,orderedProjects,fund,intervene,configIssues,validateConfig,normalize,workingDays,applyConfig,restore,completePaid,cashSeries};root.QQ=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
