/* MEIQQ simulation engine. No network or external dependencies. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const round=x=>Math.round(x*100)/100;
// Apply the entered decimal rate to an agreed fee in cents and round a
// half-cent up. Binary multiplication alone can turn an exact tie into .49999.
function depositAmount(price,rate,legacy=false){
 if(!Number.isFinite(price)||price<0||!Number.isFinite(rate)||rate<0||rate>1)return null;
 const cents=Math.round(price*100);
 if(!Number.isSafeInteger(cents))return null;
 if(legacy)return round(cents/100*rate);
 const [coefficient,exponent='0']=String(rate).split('e');
 const [whole,fraction='']=coefficient.split('.');
 const denominator=10n**BigInt(fraction.length-Number(exponent));
 const numerator=BigInt(cents)*BigInt(whole+fraction);
 return Number((2n*numerator+denominator)/(2n*denominator))/100;
}
const WORK_EPSILON=0.00001;
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
// These identities belong to explicitly targeted inquiries. Keeping them out of
// CUSTOMER_TYPES preserves the original subtype probabilities for general demand.
const CLIENT_DEMAND_TYPES=[
 ['restaurant','food','Independent restaurant','Kitchen','Independent restaurant planning its next menu'],
 ['counter-service','food','Bilingual café','Café','Counter ordering in two languages'],
 ['wholesale','retail','Wholesale product brand','Wholesale','Preparing a product line for retail buyers'],
 ['retailer','retail','Neighborhood retailer','Shop','Merchandising a neighborhood storefront'],
 ['maker','retail','Maker sourcing packaging','Goods','Sourcing packaging for a product run'],
 ['appointments','services','Appointment-based studio','Studio','Helping clients choose and book an appointment'],
 ['home-services','services','Home service business','Home Services','Reaching homeowners in a local service area']
].map(([profileId,group,label,suffix,context])=>Object.freeze({
 profileId,id:'target-'+profileId,group,label,suffix,context,effort:1,approval:0,repeat:1,revision:.3
}));
const MODEL_VERSION=2;
const DISRUPTION_RULES={rushDeadlines:{defaultRate:.10,leadFactor:.5,minLeadDays:2},supplierReprints:{defaultRate:.03,extraDaysMin:2,extraDaysMax:5,costFactor:1},repeatedRevisions:{defaultRate:.15,minRounds:2,maxRounds:3,designFactor:.35,reviewFactor:.5},extendedLatePayments:{defaultRate:.15,minDays:30,maxDays:60}};
const DEFAULT_DISRUPTION_RATES=Object.fromEntries(Object.entries(DISRUPTION_RULES).map(([key,rule])=>[key,rule.defaultRate]));
const RECIPE_V2={catalog:'metro-detroit-2026-v2',version:2,ledger:'meiqq-preset-evidence-2026-11-18-v2',ledgerHash:'b1addbcf08a57e7cd1d00f53303862028154d7376bc737e82c3beb383232c587'};
const SERVICE_SPEC_KEYS=['catalogId','deliverables','evidenceIds','includedRevisions','modeledPriceRange','modeledPrintCostRange','packageId','printCostBasis','printQuantity','printSpec','scope','version'];
const DEFAULT={name:'Studio baseline',seed:2417,months:3,startingCash:6000,ownerHours:10,ownerTarget:30,designers:1,designerHours:24,designerRate:12,overhead:180,inquiries:45,conversion:0.7,deposit:0.5,paymentDays:5,approvalDays:2,printDays:3,quoteHours:0.6,deliveryHours:0.5,leadDays:14,priority:'deadline',acquisition:'preset',outreachHours:3,leadsPerHour:3.5,retention:0.8,repeat:0.15,customerMix:{food:55,retail:25,services:20},profileStrength:.5,focusType:'none',realism:false,uncertainty:{complexity:true,revisions:true,approval:true,supplier:true,payment:true},disruptions:{rushDeadlines:false,supplierReprints:false,repeatedRevisions:false,extendedLatePayments:false},disruptionRates:DEFAULT_DISRUPTION_RATES,services:[
{id:'design',name:'Design only',deliverable:'Menu, poster or promotional graphic',price:290,hours:5,review:1,print:0,weight:45,recurring:false,color:'#287d77'},
{id:'print',name:'Design + print',deliverable:'Design and a batch of printed menus',price:540,hours:6,review:1.5,print:140,weight:35,recurring:false,color:'#8871b1'},
{id:'monthly',name:'Monthly promotion',deliverable:'Four promotional graphics per cycle',price:720,hours:10,review:2,print:0,weight:20,recurring:true,color:'#bd8753'}]};
function random(seed,key){let h=seed|0;for(const c of String(key))h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return(h>>>0)/4294967296;}
function demandDraw(c,demandId,stream){return random(c.seed,'model2:'+demandId+':'+stream);}
function recipeFingerprint(value){let hash=2166136261;for(const ch of JSON.stringify(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16).padStart(8,'0');}
const ASSUMPTION_FIELDS={
 demand:{inquiries:'New inquiries per month',leadsPerHour:'Qualified inquiries per outreach hour','clientDemand.share':'Target client inquiry share',conversion:'Quote acceptance',retention:'Campaign quote acceptance',repeat:'One-off repeat orders'},
 people:{ownerHours:'Weekly owner hours',designerHours:'Weekly hours per designer',designerRate:'Designer hourly cost',quoteHours:'Owner hours per quote',deliveryHours:'Owner hours per delivery'},
 cash:{overhead:'Monthly overhead',deposit:'Deposit',paymentDays:'Final payment terms',approvalDays:'Client approval time',printDays:'Supplier turnaround'},
 service:{price:'Customer price',hours:'Designer hours per project',review:'Owner review hours',print:'Supplier batch cost','fulfillment.managedShare':'Managed-print share','fulfillment.designOnlyPrice':'Files-only price'}
};
function assumptionRecordValue(c,path){
 if(path==='clientDemand.share')return c.clientDemand?.share;
 const parts=path.split('.');
 if(parts[0]==='services'&&parts.length>=3){
  const service=Array.isArray(c.services)?c.services.find(s=>s?.id===parts[1]):undefined;
  return parts.slice(2).reduce((value,key)=>value?.[key],service);
 }
 return c[path];
}
function validAssumptionRecords(records){
 if(!records||typeof records!=='object'||Array.isArray(records)||Object.keys(records).length>200)return false;
 for(const [path,r] of Object.entries(records)){
  const parts=path.split('.');
  const allowed=parts[0]==='services'?parts.length>=3&&/^[a-zA-Z0-9_-]{1,60}$/.test(parts[1])&&Object.hasOwn(ASSUMPTION_FIELDS.service,parts.slice(2).join('.')):['demand','people','cash'].some(group=>Object.hasOwn(ASSUMPTION_FIELDS[group],path));
  const targeted=path==='clientDemand.share',keys=targeted?'date,profileId,sample,source,value':'date,sample,source,value';
  if(!allowed||!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join(',')!==keys||!Number.isFinite(r.value))return false;
  if(targeted&&(!clientDemandType(r.profileId)||!Number.isInteger(r.value)||r.value<0||r.value>100))return false;
  if(typeof r.source!=='string'||!r.source.trim()||r.source.length>160||typeof r.sample!=='string'||!r.sample.trim()||r.sample.length>120||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date))return false;
  const date=new Date(r.date+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==r.date)return false;
 }
 return true;
}
function withCurrentAssumptionRecords(c){
 const records=c.assumptionRecords;
 if(!records||!validAssumptionRecords(records))return c;
 const entries=Object.entries(records),matching=entries.filter(([path,r])=>r.value===assumptionRecordValue(c,path)&&
  (path!=='clientDemand.share'||r.profileId===c.clientDemand?.profileId));
 if(matching.length===entries.length)return c;
 const next={...c};
 if(matching.length)next.assumptionRecords=Object.fromEntries(matching);else delete next.assumptionRecords;
 return next;
}
function validRecipeV2(recipe){
 const baseKeys=['applied','appliedHash','catalog','condition','ledger','ledgerHash','market','mix','operation','version'],keys=Object.keys(recipe||{}).sort(),validKeys=[baseKeys,[...baseKeys,'profile'].sort()].some(expected=>keys.join(',')===expected.join(','));
 if(!recipe||typeof recipe!=='object'||Array.isArray(recipe)||!validKeys)return false;
 if(recipe.catalog!==RECIPE_V2.catalog||recipe.version!==RECIPE_V2.version||recipe.ledger!==RECIPE_V2.ledger||typeof recipe.ledgerHash!=='string'||!/^[0-9a-f]{64}$/.test(recipe.ledgerHash))return false;
 if(recipe.profile!==undefined&&!['new-workspace','business-conditions'].includes(recipe.profile))return false;
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
function clientDemandType(profileId){return CLIENT_DEMAND_TYPES.find(t=>t.profileId===profileId);}
function profileFor(id){return CUSTOMER_TYPES.find(t=>t.id===id)||CLIENT_DEMAND_TYPES.find(t=>t.id===id);}
function profileFactor(c,p,key){const profile=profileFor(p.clientType);return profile?1+(profile[key]-1)*(c.profileStrength??0):1;}
function selectProfile(c,key){
 if(c.clientDemand?.share>0&&demandDraw(c,key,'client-menu-target')<c.clientDemand.share/100)return clientDemandType(c.clientDemand.profileId);
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
function fresh(config=DEFAULT){let c=normalize(config);validateConfig(c);return{version:3,modelVersion:MODEL_VERSION,campaignCalendarFromDay:1,depositRoundingFromDay:1,workloadId:'model2-seed-'+c.seed,config:c,replayJournal:{version:1,changes:[]},day:0,projects:[],clients:[],contracts:[],cash:round(c.startingCash),initialCash:round(c.startingCash),revenue:0,expenses:0,ownerHours:0,designHours:0,funding:0,ledger:[],history:[],events:[],blocked:null,nextId:1,repeatQueue:[],lost:0,unserved:0};}
function event(s,p,text){const e={day:s.day,text};if(p)p.log.push(e);s.events.unshift({...e,project:p?.id||null});s.events=s.events.slice(0,120);}
function entry(s,amount,type,p,note,designHours){
 amount=round(amount);
 if(!Number.isFinite(amount)||(type==='receipt'&&amount<0))throw Error('Invalid cash transaction.');
 s.cash=round(s.cash+amount);
 const posting={day:s.day,amount,type,project:p?.id||null,note};
 if(designHours!==undefined)posting.designHours=designHours;
 s.ledger.push(posting);
 if(type==='expense'){s.expenses=round(s.expenses-amount);if(p)p.cost=round(p.cost-amount);}
 if(type==='receipt'&&p)p.paid=round(p.paid+amount);
}
function pay(s,amount,p,note,designHours){amount=round(amount);if(s.cash+0.001<amount){s.blocked={amount,cash:s.cash,gap:round(amount-s.cash),project:p?.id||null,note};event(s,p,'Cash decision required: '+note);return false;}entry(s,-amount,'expense',p,note,designHours);return true;}
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
 const intake=p.orderKind==='campaign-reoffer'?'Campaign entered quote intake for a new decision':renewal?'Confirmed repeat cycle entered quote intake':'Inquiry received; entered quote intake';
 event(s,p,intake);s.projects.push(p);return p;
}
function accept(s,p){
 const c=s.config,svc=c.services.find(x=>x.id===p.serviceId)||p.service,profile=profileFor(p.clientType);
 const choice=svc.fulfillment,fulfillmentMode=choice&&(demandDraw(c,p.demandId,'fulfillment-choice')<choice.managedShare?'agency-managed':'design-only');
 const effectivePrice=round(fulfillmentMode==='design-only'?choice.designOnlyPrice:svc.price),effectivePrint=round(fulfillmentMode==='design-only'?0:svc.print);
 const integer=(key,min,max)=>min+Math.floor(disruptionDraw(c,p,key)*(max-min+1)),rush=disruption(c,'rushDeadlines')&&disruptionDraw(c,p,'rush-selected')<c.disruptionRates.rushDeadlines;
 const leadDays=rush?Math.min(c.leadDays,Math.max(DISRUPTION_RULES.rushDeadlines.minLeadDays,Math.round(c.leadDays*DISRUPTION_RULES.rushDeadlines.leadFactor))):c.leadDays;
 const reprint=effectivePrint>0&&disruption(c,'supplierReprints')&&disruptionDraw(c,p,'reprint-selected')<c.disruptionRates.supplierReprints;
 const repeated=disruption(c,'repeatedRevisions')&&disruptionDraw(c,p,'revisions-selected')<c.disruptionRates.repeatedRevisions;
 const deposit=depositAmount(effectivePrice,c.deposit,s.day<(s.depositRoundingFromDay??Infinity));
 const extended=deposit<effectivePrice&&disruption(c,'extendedLatePayments')&&disruptionDraw(c,p,'late-payment-selected')<c.disruptionRates.extendedLatePayments;
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
 if(deposit>0)entry(s,deposit,'receipt',p,'Client deposit');
 p.paymentStatus=round(p.price-p.paid)===0?'paid':p.paid>0?'partial':'unpaid';
 event(s,p,'Quote accepted at $'+p.price+(fulfillmentMode?' for '+(fulfillmentMode==='agency-managed'?'agency-managed printing':'design only / client self-print'):'')+(deposit>0?'; deposit received':'; no deposit collected')+'; delivery due day '+p.due+(rush?' under a modeled rush-event promise':''));move(s,p,'design');
}
function inquiryVolume(c){
 const days=c.months*30,workdays=workingDays(days),weeks=workdays/5;
 const outreach=c.acquisition==='sales'?Math.min(c.outreachHours,c.ownerHours)*weeks:0;
 const leads=c.acquisition==='preset'?c.inquiries*c.months:outreach*c.leadsPerHour;
 return {days,workdays,weeks,outreach,leads};
}
function inquirySegments(c){
 const targetShare=(c.clientDemand?.share||0)/100;
 const segments=(c.customerMix?['food','retail','services']:[null]).map(group=>({
  group,groupShare:(group?c.customerMix[group]/100:1)*(1-targetShare)
 }));
 if(targetShare>0)segments.push({group:clientDemandType(c.clientDemand.profileId).group,groupShare:targetShare,target:true});
 return segments;
}
function effectiveCustomerMix(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||configIssues(c).some(i=>i.path==='customerMix'||i.path.startsWith('clientDemand')))return null;
 // A legacy general inquiry has no sector. Don't assign it an invented mix.
 const mix={food:0,retail:0,services:0,unsegmented:0};
 for(const segment of inquirySegments(c)){
  const key=segment.group||'unsegmented';
  mix[key]=round(mix[key]+segment.groupShare*100);
 }
 return mix;
}
function inquiryGroups(c,leads){
 return inquirySegments(c).map(segment=>{
  const {group,groupShare}=segment,groupLeads=leads*groupShare;
  const eligible=suitableServices(c,group);
  return {...segment,groupLeads,eligible,groupOrders:eligible.length?groupLeads*c.conversion:0};
 });
}
function invalidServiceRouting(issue){
 return issue.path==='services'||/^services\.\d+(?:\.(?:weight|audience))?$/.test(issue.path);
}
// Drafts can have valid inquiry and acceptance assumptions before services
// have prices. Each count depends only on the inputs used to produce it.
function estimateDemand(c,issues=configIssues(c)){
 const counts={leads:null,matched:null,orders:null,unserved:null};
 if(!c||typeof c!=='object'||Array.isArray(c))return counts;
 const source=c.acquisition==='sales'?['outreachHours','ownerHours','leadsPerHour']:['inquiries'];
 if(issues.some(i=>i.path==='months'||i.path==='acquisition'||source.includes(i.path)))return counts;
 const {leads}=inquiryVolume(c);
 counts.leads=leads;
 if(issues.some(i=>i.path.startsWith('clientDemand')||i.path==='customerMix'||invalidServiceRouting(i)))return counts;
 const groups=inquiryGroups(c,leads);
 counts.matched=groups.reduce((sum,row)=>sum+(row.eligible.length?row.groupLeads:0),0);
 counts.unserved=groups.reduce((sum,row)=>sum+(row.eligible.length?0:row.groupLeads),0);
 if(!issues.some(i=>i.path==='conversion'))counts.orders=groups.reduce((sum,row)=>sum+row.groupOrders,0);
 return counts;
}
function clientDemandForecast(c,issues=configIssues(c)){
 const setting=c?.clientDemand,valid=c&&typeof c==='object'&&!Array.isArray(c)&&!issues.some(i=>i.path.startsWith('clientDemand'));
 const share=valid?(setting?.share??0):null,profileId=valid?(setting?.profileId??null):null;
 const row={profileId,share,active:share>0,targeted:null,other:null,matched:null,orders:null};
 if(!valid)return row;
 const demand=estimateDemand(c,issues);
 if(share===0)Object.assign(row,{targeted:0,matched:0,orders:0});
 if(demand.leads===null)return row;
 row.targeted=demand.leads*(share/100);row.other=demand.leads-row.targeted;
 if(!row.targeted){row.matched=0;row.orders=0;return row;}
 if(issues.some(invalidServiceRouting))return row;
 row.matched=suitableServices(c,clientDemandType(profileId).group).length?row.targeted:0;
 if(!row.matched)row.orders=0;
 else if(!issues.some(i=>i.path==='conversion'))row.orders=row.matched*c.conversion;
 return row;
}
function groupWorkload(c,{group,groupLeads,groupOrders,eligible,target},designKnown=true,ownerKnown=true){
 const total=eligible.reduce((sum,v)=>sum+v.weight,0);
 const weighted=amount=>eligible.reduce((sum,v)=>sum+amount(v)*v.weight/total,0);
 const effort=group&&!target?averageProfileFactor({...c,customerMix:{food:group==='food'?100:0,retail:group==='retail'?100:0,services:group==='services'?100:0}},'effort'):1;
 const hours=designKnown?groupOrders*weighted(v=>v.hours)*effort:null;
 const clientHours=ownerKnown?groupLeads*c.quoteHours*effort+groupOrders*(weighted(v=>v.review)*effort+c.deliveryHours):null;
 return {total,weighted,effort,hours,clientHours};
}
// Time can be projected before the draft has prices, cash or pay rates.
function estimateWorkload(input){
 const issues=configIssues(input),paths=new Set(issues.map(issue=>issue.path));
 const {leads,orders}=estimateDemand(input,issues);
 if(orders===null||paths.has('profileStrength')||paths.has('focusType'))return {workdays:null,outreach:null,hours:null,owner:null};
 const c=normalize(input),{workdays,outreach}=inquiryVolume(c);
 const groups=inquiryGroups(c,leads).filter(group=>group.groupShare>0&&group.eligible.length);
 const used=new Set(groups.flatMap(group=>group.eligible));
 const validServiceHours=field=>c.services.every((service,index)=>!used.has(service)||!paths.has('services.'+index+'.'+field));
 const designKnown=validServiceHours('hours');
 const ownerKnown=validServiceHours('review')&&!paths.has('quoteHours')&&!paths.has('deliveryHours');
 let hours=designKnown?0:null,owner=ownerKnown?outreach:null;
 for(const group of groups){
  const work=groupWorkload(c,group,designKnown,ownerKnown);
  if(designKnown)hours+=work.hours;
  if(ownerKnown)owner+=work.clientHours;
 }
 return {workdays,outreach,hours,owner};
}
function estimate(input){
 const c=normalize(input);
 if(!Number.isInteger(c.months)||c.months<1||c.months>12)throw Error('Choose a run length from 1 to 12 whole months.');
 const {days,workdays,weeks,outreach,leads}=inquiryVolume(c);
 // The daily engine commits each agreement and supplier batch in cents.
 // Weight those committed amounts before multiplying by the number of orders.
 const expectedPrice=service=>service.fulfillment?round(service.price)*service.fulfillment.managedShare+round(service.fulfillment.designOnlyPrice)*(1-service.fulfillment.managedShare):round(service.price);
 const expectedPrint=service=>round(service.print)*(service.fulfillment?.managedShare??1);
 let orders=0,revenue=0,hours=0,owner=outreach,print=0,unserved=0,unservedShare=0;
 const serviceRows=new Map(c.services.map(v=>[v.id,{id:v.id,name:v.name,effectiveShare:0,inquiries:0,orders:0,revenue:0,designerHours:0,ownerHours:0,designerCost:0,printCost:0,directCost:0,contribution:0,ownerTimeValue:0,afterOwnerTime:0}]));
 for(const demand of inquiryGroups(c,leads)){
  const {groupShare,groupLeads,eligible,groupOrders}=demand;
  if(!eligible.length){unserved+=groupLeads;unservedShare+=groupShare;continue;}
  const work=groupWorkload(c,demand),{total,weighted,effort}=work;
  orders+=groupOrders;
  hours+=work.hours;
  owner+=work.clientHours;
  revenue+=groupOrders*weighted(expectedPrice);print+=groupOrders*weighted(expectedPrint);
  for(const v of eligible){
   const share=v.weight/total,row=serviceRows.get(v.id),serviceLeads=groupLeads*share,serviceOrders=groupOrders*share;
   row.effectiveShare+=groupShare*share;
   row.inquiries+=serviceLeads;row.orders+=serviceOrders;row.revenue+=serviceOrders*expectedPrice(v);
   row.designerHours+=serviceOrders*v.hours*effort;row.ownerHours+=serviceLeads*c.quoteHours*effort+serviceOrders*(v.review*effort+c.deliveryHours);
   row.printCost+=serviceOrders*expectedPrint(v);
  }
 }
 const expense=hours*c.designerRate+print+round(c.overhead)*c.months,ownerCapacity=c.ownerHours*weeks,designCapacity=c.designers*c.designerHours*weeks;
 const projectCapacity=Math.max(0,ownerCapacity-outreach);
 const ratio=(used,cap)=>cap?used/cap:used?Infinity:0;
 const services=[...serviceRows.values()].map(row=>{
  const service=c.services.find(v=>v.id===row.id),baseOwnerHours=c.quoteHours+service.review+c.deliveryHours;
  const unit=(price,printCost)=>{const value={price:round(price),designerHours:round(service.hours),ownerHours:round(baseOwnerHours),designerCost:round(service.hours*c.designerRate),printCost:round(printCost)};value.directCost=round(value.designerCost+value.printCost);value.contribution=round(value.price-value.directCost);value.ownerTimeValue=round(value.ownerHours*c.ownerTarget);value.afterOwnerTime=round(value.contribution-value.ownerTimeValue);return value;};
  row.designerCost=row.designerHours*c.designerRate;row.directCost=row.designerCost+row.printCost;row.contribution=row.revenue-row.directCost;
  row.ownerTimeValue=row.ownerHours*c.ownerTarget;row.afterOwnerTime=row.contribution-row.ownerTimeValue;
  row.ownerCapacityShare=ratio(row.ownerHours,projectCapacity);row.designCapacityShare=ratio(row.designerHours,designCapacity);
  row.perProject=unit(expectedPrice(service),expectedPrint(service));
  row.fulfillmentOptions=service.fulfillment?{mode:service.fulfillment.mode,managedShare:service.fulfillment.managedShare,agencyManaged:unit(service.price,service.print),designOnly:unit(service.fulfillment.designOnlyPrice,0)}:null;
  row.spec=service.spec?clone(service.spec):null;
  row.costBasis={designer:{hours:round(service.hours),hourlyRate:round(c.designerRate),cost:row.perProject.designerCost},owner:{salesQuoteHours:round(c.quoteHours),coordinationReviewHours:round(service.review),deliveryHours:round(c.deliveryHours),totalHours:round(baseOwnerHours),hourlyValue:round(c.ownerTarget),value:row.perProject.ownerTimeValue},print:{batchQuantity:service.spec?.printQuantity??null,unit:service.spec?.printUnit??null,cost:row.perProject.printCost}};
  row.renewalBasis=service.campaign?{kind:'separately-quoted-campaign',baseProbability:round(c.retention),cadenceDays:service.campaign.cadenceDays,relationshipDays:service.campaign.relationshipDays,maxCampaigns:Math.floor(service.campaign.relationshipDays/service.campaign.cadenceDays),onlyAfterCompletion:true,committed:false}:{kind:service.recurring?'optional-paid-cycle':'optional-repeat-purchase',baseProbability:round(service.recurring?c.retention:c.repeat),earliestDaysFromCreation:30,onlyAfterCompletion:true,committed:false};
  for(const key of ['inquiries','orders','revenue','designerHours','ownerHours','designerCost','printCost','directCost','contribution','ownerTimeValue','afterOwnerTime'])row[key]=round(row[key]);
  return row;
 });
 return{days,workdays,leads,unserved,unservedShare,orders,revenue,expense,profit:revenue-expense,owner,hours,outreach,ownerCapacity,designCapacity,ownerLoad:ratio(owner,ownerCapacity),designLoad:ratio(hours,designCapacity),surplus:revenue-expense-owner*c.ownerTarget,services};
}
// Earliest possible delivery for one inquiry arriving on day one. Other work,
// cash limits, revisions and optional delays can only make this date later.
function canShipOneJob(config,offer,profile,minComplexity,horizon){
 const daily=workCapacity(config),perDesigner=config.designers>0?config.designerHours/5:0;
 let day=1,ownerLeft=daily.owner,designLeft=perDesigner;
 const advanceBy=days=>{
  if(!days)return;
  day+=days;
  const weekday=(day-1)%7<5;
  ownerLeft=weekday?daily.owner:0;
  designLeft=weekday?perDesigner:0;
 };
 const work=(hours,owner)=>{
  while(day<=horizon){
   const used=Math.min(hours,owner?ownerLeft:designLeft);
   if(owner)ownerLeft-=used;
   else designLeft-=used;
   hours-=used;
   if(hours<=WORK_EPSILON)return;
   advanceBy(1);
  }
 };
 const effort=profileFactor(config,{clientType:profile?.id},'effort');
 work((config.quoteHours??DEFAULT.quoteHours)*effort,true);
 work(offer.hours*effort*minComplexity,false);
 work(offer.review*effort,true);
 const approval=config.approvalDays+Math.round((profile?.approval||0)*(config.profileStrength??0));
 const mustPrint=round(offer.print)>0&&(!offer.fulfillment||offer.fulfillment.managedShare===1);
 advanceBy(approval+(mustPrint?config.printDays:0));
 work(config.deliveryHours??DEFAULT.deliveryHours,true);
 return day<=horizon;
}
// The estimate prices a fully delivered workload. An offer is impossible only
// when even its fastest eligible customer and route cannot finish by the close.
function deliveryCapacity(config,work=estimate(config)){
 const designShortfall=Math.max(0,work.hours-work.designCapacity);
 const ownerShortfall=Math.max(0,work.owner-work.ownerCapacity);
 const blockedBy={owner:false,design:false},blockedOffers=[],overlongOffers=[],ownerTimeOffers=[],timingOffers=[];
 const perJobDesignHours=config.designers>0?work.workdays*(config.designerHours/5):0;
 const result={status:'no-orders',blockedBy,blockedOffers,overlongOffers,ownerTimeOffers,timingOffers,perJobDesignHours,designShortfall,ownerShortfall};
 if(!work.orders)return result;
 const noOwner=work.ownerCapacity<=work.outreach,noDesigner=work.designCapacity===0;
 const eligible=new Map();
 for(const group of inquiryGroups(config,work.leads)){
  if(group.groupShare<=0||!group.eligible.length)continue;
  const types=group.target?[clientDemandType(config.clientDemand.profileId)]:CUSTOMER_TYPES.filter(type=>type.group===group.group);
  for(const offer of group.eligible){
   if(!eligible.has(offer))eligible.set(offer,new Set());
   for(const type of types.length?types:[null])eligible.get(offer).add(type);
  }
 }
 // Give each offer its least demanding eligible buyer and the whole working
 // period to itself. Other designers can process different jobs in parallel.
 const minComplexity=variable(config,'complexity') ? 0.75 : 1;
 for(const [offer,types] of eligible){
  const minEffort=Math.min(...Array.from(types,type=>profileFactor(config,{clientType:type?.id},'effort')));
  const ownerStages=[(config.quoteHours??DEFAULT.quoteHours)*minEffort,offer.review*minEffort,config.deliveryHours??DEFAULT.deliveryHours];
  const needsOwner=noOwner&&ownerStages.some(hours=>hours>WORK_EPSILON);
  const minDesign=offer.hours*minEffort*minComplexity;
  const needsDesign=noDesigner&&minDesign>WORK_EPSILON;
  const overlong=!noDesigner&&minDesign-perJobDesignHours>WORK_EPSILON;
  if(overlong)overlongOffers.push(offer.id);
  const ownerWork=ownerStages.reduce((sum,hours)=>sum+Math.max(0,hours-WORK_EPSILON),0);
  const exceedsOwner=!noOwner&&ownerWork>work.ownerCapacity-work.outreach;
  if(exceedsOwner)ownerTimeOffers.push(offer.id);
  if(needsOwner||needsDesign||overlong||exceedsOwner)blockedOffers.push(offer.id);
  else if(!Array.from(types).some(profile=>canShipOneJob(config,offer,profile,minComplexity,work.days))){
   timingOffers.push(offer.id);
   blockedOffers.push(offer.id);
  }
  if(needsOwner)blockedBy.owner=true;
  if(needsDesign)blockedBy.design=true;
 }
 if(blockedOffers.length)result.status=blockedOffers.length===eligible.size?'blocked':'partial';
 else result.status=designShortfall>WORK_EPSILON||ownerShortfall>WORK_EPSILON?'overloaded':'fits';
 return result;
}
// Charge costs in the month they were incurred and recognize the agreed price
// on delivery. A later payment or delivery cannot rewrite an earlier month.
function directExpenseKind(posting){
 if(posting.note==='Design labor for '+posting.project)return 'designLabor';
 if(posting.note==='Print order for '+posting.project||posting.note==='Supplier reprint for '+posting.project)return 'supplierCost';
 return 'otherDirectCost';
}
function periodOwnerValue(s,endDay,profit,hours){
 // Each entry preserves the inputs through that day. Changes apply on the next step.
 const closing=s.replayJournal?.changes.find(change=>change.day>=endDay)?.config||s.config;
 const ownerRate=closing.ownerTarget,afterOwner=round(profit-hours*ownerRate);
 return {ownerRate,rateHistoryAvailable:Boolean(s.replayJournal),afterOwner,ownerTime:round(profit-afterOwner)};
}
// Save the numbers displayed at launch. Later input edits and changes to the
// estimator itself must not rewrite the forecast a person actually ran.
function captureForecast(config){
 const e=estimate(config),labor=e.hours*config.designerRate,overhead=config.months*round(config.overhead);
 const amount=value=>round(value)||0;
 const forecast={version:1,days:e.days,deliveryStatus:deliveryCapacity(config,e).status,leads:amount(e.leads),orders:amount(e.orders),ownerHours:amount(e.owner),designHours:amount(e.hours),
  revenue:amount(e.revenue),designLabor:amount(labor),supplierCost:amount(e.expense-labor-overhead),overhead:amount(overhead),
  cost:amount(e.expense),profit:amount(e.profit),afterOwner:amount(e.surplus)};
 if(config.clientDemand){
  const target=clientDemandForecast(config);
  forecast.clientDemand={...target,targeted:amount(target.targeted),other:amount(target.other),matched:amount(target.matched),orders:amount(target.orders)};
 }
 return forecast;
}
function runLaunchEstimate(s){
 if(s.launchEstimate)return {...clone(s.launchEstimate),basis:'launch'};
 if(!s.day)return {...captureForecast(s.config),basis:'launch'};
 // Older versions recorded setup changes but not changes made directly to
 // the horizon. Reconstruct for this duration and identify the basis.
 if(!s.replayJournal&&!legacyReplaySetupKnown(s))return null;
 return {...captureForecast(replayConfigAt(s,0)),basis:'reconstructed'};
}
function captureRunLaunch(s){
 if(!s.day)s.launchEstimate=captureForecast(s.config);
 return runLaunchEstimate(s);
}
function monthResult(s,month=Math.max(1,Math.ceil(s.day/30))){
 const latest=Math.max(1,Math.ceil(s.day/30));
 if(!Number.isInteger(month)||month<1||month>latest)throw Error('Choose a month that has started.');
 const firstDay=(month-1)*30+1,endDay=Math.min(s.day,month*30);
 const cents=value=>Math.round(value*100);
 let opening=cents(s.initialCash),receipts=0,funding=0,overhead=0,designLabor=0,supplierCost=0,otherProjectCost=0;
 const projectCosts=new Map(),paymentsToDate=new Map();
 for(const entry of s.ledger){
  if(entry.day>endDay)break;
  const amount=cents(entry.amount);
  if(entry.type==='receipt')paymentsToDate.set(entry.project,(paymentsToDate.get(entry.project)||0)+amount);
  if(entry.day<firstDay){opening+=amount;continue;}
  if(entry.type==='receipt'){receipts+=amount;continue;}
  if(entry.type==='funding'){funding+=amount;continue;}
  if(!entry.project){overhead-=amount;continue;}
  projectCosts.set(entry.project,(projectCosts.get(entry.project)||0)-amount);
  const kind=directExpenseKind(entry);
  if(kind==='designLabor')designLabor-=amount;
  else if(kind==='supplierCost')supplierCost-=amount;
  else otherProjectCost-=amount;
 }
 const serviceGroups=new Map();
 const unfinishedJobs=[];
 let delivered=0,revenue=0,receivable=0,depositsHeld=0,deliveredCost=0,unfinishedCost=0;
 for(const p of s.projects){
  if(p.created>endDay)continue;
  const deliveredByEnd=p.deliveredDay!==undefined&&p.deliveredDay<=endDay;
  const deliveredThisMonth=deliveredByEnd&&p.deliveredDay>=firstDay;
  if(p.accepted!==undefined&&p.accepted<=endDay&&!deliveredByEnd){
   unfinishedJobs.push({id:p.id,demandId:p.demandId,service:p.service.name,accepted:p.accepted,cost:(projectCosts.get(p.id)||0)/100});
  }
  const price=cents(p.price),paid=paymentsToDate.get(p.id)||0,cost=projectCosts.get(p.id)||0;
  if(deliveredByEnd)receivable+=price-paid;else depositsHeld+=paid;
  if(!deliveredThisMonth&&!cost)continue;
  let group=serviceGroups.get(p.serviceId);
  if(!group){
   group={id:p.serviceId,name:p.service.name,delivered:0,revenue:0,deliveredCost:0,unfinishedCost:0,
    largestDelivery:null,largestCost:null,largestUnfinished:null};
   serviceGroups.set(p.serviceId,group);
  }
  if(deliveredThisMonth){
   delivered++;revenue+=price;group.delivered++;group.revenue+=price;
   if(!group.largestDelivery||price>group.largestDelivery.amount)group.largestDelivery={id:p.id,amount:price};
  }
  if(cost){
   if(deliveredByEnd){deliveredCost+=cost;group.deliveredCost+=cost;}
   else{
    unfinishedCost+=cost;group.unfinishedCost+=cost;
    if(!group.largestUnfinished||cost>group.largestUnfinished.amount)group.largestUnfinished={id:p.id,amount:cost};
   }
   if(!group.largestCost||cost>group.largestCost.amount)group.largestCost={id:p.id,amount:cost};
  }
 }
 const services=Array.from(serviceGroups.values(),group=>{
  const cost=group.deliveredCost+group.unfinishedCost;
  return {id:group.id,name:group.name,delivered:group.delivered,revenue:group.revenue/100,cost:cost/100,
   deliveredCost:group.deliveredCost/100,unfinishedCost:group.unfinishedCost/100,contribution:(group.revenue-cost)/100,
   deliveredProjectId:group.largestDelivery?.id??null,costProjectId:group.largestCost?.id??null,unfinishedProjectId:group.largestUnfinished?.id??null};
 }).sort((a,b)=>b.contribution-a.contribution||a.id.localeCompare(b.id));
 const cost=deliveredCost+unfinishedCost+overhead,profit=(revenue-cost)/100,cashChange=receipts+funding-cost;
 const ownerHours=(s.history[endDay-1]?.ownerHours||0)-(s.history[firstDay-2]?.ownerHours||0);
 return {month,firstDay,endDay,days:Math.max(0,endDay-firstDay+1),delivered,revenue:revenue/100,cost:cost/100,profit,
  ownerHours,...periodOwnerValue(s,endDay,profit,ownerHours),openingCash:opening/100,closingCash:(opening+cashChange)/100,
  receipts:receipts/100,funding:funding/100,cashChange:cashChange/100,overhead:overhead/100,designLabor:designLabor/100,
  supplierCost:supplierCost/100,otherProjectCost:otherProjectCost/100,deliveredCost:deliveredCost/100,unfinishedCost:unfinishedCost/100,
  receivable:receivable/100,depositsHeld:depositsHeld/100,awaitingDelivery:unfinishedJobs.length,openProjectId:unfinishedJobs[0]?.id??null,unfinishedJobs,services};
}
// Day-one through a completed month, with money and deliveries as recorded at that close.
function runActualsThrough(s,days){
 if(!Number.isInteger(days)||days<30||days%30||days>s.day)throw Error('Choose a completed reporting month.');
 const periods=Array.from({length:days/30},(_,i)=>monthResult(s,i+1)),closing=periods.at(-1);
 const sum=key=>round(periods.reduce((total,row)=>total+row[key],0));
 const history=s.history.slice(0,days);
 const leads=history.every(day=>Number.isInteger(day.externalArrivals))?history.reduce((count,day)=>count+day.externalArrivals,0):null;
 const booked=s.projects.filter(p=>p.accepted!==undefined&&p.accepted<=days);
 const firstOrders=booked.filter(p=>p.orderKind==='new-business');
 const inquiries=s.projects.filter(p=>p.orderKind==='new-business'&&p.created<=days);
 let declinedQuotes=0;
 for(const p of inquiries){
  if(p.stage!=='lost')continue;
  if(days===s.day){declinedQuotes++;continue;}
  // A later decline must not travel back into an earlier month's results.
  const decision=p.log.find(e=>e.text==='Client declined quote');
  if(!decision){declinedQuotes=null;break;}
  if(decision.day<=days)declinedQuotes++;
 }
 const awaitingQuote=declinedQuotes===null?null:inquiries.length-firstOrders.length-declinedQuotes;
 const isDelivered=p=>p.deliveredDay!==undefined&&p.deliveredDay<=days;
 const open=booked.filter(p=>!isDelivered(p)),returning=booked.filter(p=>p.orderKind!=='new-business'&&isDelivered(p));
 const value=projects=>round(projects.reduce((n,p)=>n+p.price,0));
 let projectDecisions=0;
 for(const actions of replayActions(s,days).values()){
  projectDecisions+=actions.filter(action=>action.kind!=='settings'&&action.kind!=='funding').length;
 }
 let designHours=s.designHours;
 if(days<s.day){
  const postings=s.ledger.filter(e=>e.day<=days&&e.type==='expense'&&e.project&&directExpenseKind(e)==='designLabor');
  designHours=postings.every(e=>e.designHours!==undefined)?postings.reduce((n,e)=>n+e.designHours,0):null;
 }
 return {profit:sum('profit'),afterOwner:sum('afterOwner'),rateHistoryAvailable:Boolean(s.replayJournal),revenue:sum('revenue'),cost:sum('cost'),
  ownerHours:sum('ownerHours'),designHours:designHours===null?null:round(designHours),leads,unservedInquiries:leads===null?null:leads-inquiries.length,orders:firstOrders.length,declinedQuotes,awaitingQuote,
  designLabor:sum('designLabor'),supplierCost:sum('supplierCost'),overhead:sum('overhead'),otherCost:sum('otherProjectCost'),
  delivered:sum('delivered'),newDelivered:firstOrders.filter(isDelivered).length,newBooked:value(firstOrders),
  newBacklog:value(open.filter(p=>p.orderKind==='new-business')),returnDelivered:returning.length,returnRevenue:value(returning),
  awaitingDelivery:open.length,backlog:value(open),receivable:closing.receivable,depositsHeld:closing.depositsHeld,closingCash:closing.closingCash,
  receipts:sum('receipts'),funding:sum('funding'),projectDecisions};
}
function runEstimateComparison(s){
 if(!s.day||s.day<s.config.months*30)return null;
 const forecast=runLaunchEstimate(s),launchDays=forecast?.basis==='launch'?forecast.days:null;
 const shortened=launchDays!==null&&s.day<launchDays;
 const days=Math.min(s.day,launchDays??s.day),estimate=shortened?null:forecast;
 const actual=runActualsThrough(s,days);
 const drivers=[];
 if(estimate){
  for(const key of ['revenue','designLabor','supplierCost','overhead','otherCost']){
   const planned=key==='otherCost'?0:estimate[key],incurred=actual[key];
   const impact=round(key==='revenue'?incurred-planned:planned-incurred);
   if(key!=='otherCost'||incurred)drivers.push({key,estimate:planned,actual:incurred,impact});
  }
  // The headline forecast and its cost components round independently.
  const residual=round(actual.profit-estimate.profit-drivers.reduce((n,row)=>n+row.impact,0));
  if(residual)drivers.push({key:'rounding',estimate:-residual,actual:0,impact:residual});
 }
 return {basis:shortened?'shortened':forecast?.basis||'unavailable',launchDays,days,estimate,actual,drivers,
  changes:s.replayJournal?.changes.filter(row=>row.day<days).length??0};
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
 const currentServices=new Map(s.config.services.map(service=>[service.id,service]));
 for(const id of currentServices.keys())if(!serviceGroups.has(id))serviceGroups.set(id,[]);
 const services=[...serviceGroups].map(([id,ps])=>({id,name:ps.at(-1)?.service.name??currentServices.get(id).name,inquiries:ps.filter(p=>p.orderKind==='new-business').length,...group(ps)})).sort((a,b)=>b.contribution-a.contribution);
 const contractRecords=new Map(s.contracts.map(c=>[c.id,c]));
 const contracts=[...contractGroups].map(([id,ps])=>{const record=contractRecords.get(id),campaign=record?.campaign,next=s.repeatQueue.find(item=>item.contractId===id);return{id,client:ps[0].client,kind:record?.kind||'repeat-purchase',status:record?.status||'active',currentCycle:record?.cycles||Math.max(...ps.map(p=>p.cycle||1)),skippedCampaigns:(record?.skipped||0)+(record?.missedCadences||0),missedCadences:record?.missedCadences||0,cadenceDays:campaign?.cadenceDays??null,relationshipEndDay:campaign?.endDay??null,nextQuoteDay:next?.day??null,campaignCharges:campaign?ps.filter(p=>p.accepted!==undefined).map(p=>({cycle:p.cycle,project:p.id,price:p.price,fulfillment:p.terms?.fulfillment?.mode||null})):[],projects:ps.map(p=>p.id),...group(ps)};}).sort((a,b)=>b.contribution-a.contribution);
 const external=s.projects.filter(p=>p.orderKind==='new-business'), won=external.filter(p=>p.accepted!==undefined).length, lost=external.filter(p=>p.stage==='lost').length;
 const repeat=accepted.filter(p=>p.orderKind!=='new-business'), uniqueClients=new Set(accepted.map(p=>p.clientId)).size;
 const monthly=Array.from({length:Math.max(1,Math.ceil(s.day/30))},(_,i)=>{
  const start=i*30,end=Math.min(s.day,(i+1)*30), before=s.history.find(h=>h.day===start)||{revenue:0,expenses:0,ownerHours:0}, last=s.history.filter(h=>h.day>start&&h.day<=end).at(-1)||before;
  const revenue=round(last.revenue-before.revenue),cost=round(last.expenses-before.expenses),result=round(revenue-cost),ownerHours=last.ownerHours-before.ownerHours;
  return {month:i+1,days:Math.max(0,end-start),revenue,cost,profit:result,margin:ratio(result,revenue),ownerHours,...periodOwnerValue(s,end,result,ownerHours),delivered:delivered.filter(p=>p.deliveredDay>start&&p.deliveredDay<=end).length};
 });
 return {periodAfterOwner:round(sum(monthly,'afterOwner')),directCost:round(directCost),deliveredCost:round(deliveredCost),contribution,contributionMargin:ratio(contribution,s.revenue),overhead,unfinishedCost,profit,operatingMargin:ratio(profit,s.revenue),ownerTime:round(s.ownerHours*s.config.ownerTarget),afterOwner:round(profit-s.ownerHours*s.config.ownerTarget),afterOwnerMargin:ratio(profit-s.ownerHours*s.config.ownerTarget,s.revenue),services,contracts,monthly,external:external.length,won,lost,pending:external.length-won-lost,conversion:ratio(won,won+lost),uniqueClients,repeatCycles:repeat.length,repeatShare:ratio(repeat.length,accepted.length),skippedCampaigns:contracts.reduce((total,contract)=>total+contract.skippedCampaigns,0),averageOrder:ratio(sum(accepted,'price'),accepted.length),backlog:round(sum(accepted.filter(p=>!p.delivered),'price')),revenuePerOwnerHour:ratio(s.revenue,s.ownerHours),profitPerOwnerHour:ratio(profit,s.ownerHours)};
}
function metrics(s){
 const active=s.projects.filter(p=>!['complete','lost'].includes(p.stage)),delivered=s.projects.filter(p=>p.delivered),profit=s.revenue-s.expenses;
 const lateOpen=active.filter(p=>p.accepted!==undefined&&!p.delivered&&s.day>p.due),lateDelivered=delivered.filter(p=>p.deliveredDay>p.due),quotes=active.filter(p=>p.stage==='quote');
 const ownerOpenHours=active.reduce((n,p)=>n+(p.work.quote||0)+(p.work.review||0)+(p.work.delivery||0),0),designerOpenHours=active.reduce((n,p)=>n+(p.work.design||0),0);
 const totalLead=delivered.reduce((n,p)=>n+p.deliveredDay-p.created,0),acceptedLead=delivered.reduce((n,p)=>n+p.deliveredDay-p.accepted,0),onTime=delivered.length-lateDelivered.length;
 return{profit,ownerTimeValue:s.ownerHours*s.config.ownerTarget,surplus:profit-s.ownerHours*s.config.ownerTarget,effective:s.ownerHours?profit/s.ownerHours:0,active:active.length,late:lateOpen.length,lateCompleted:lateDelivered.length,onTimeRate:delivered.length?onTime/delivered.length:null,averageLeadDays:delivered.length?totalLead/delivered.length:null,averageAcceptedLeadDays:delivered.length?acceptedLead/delivered.length:null,quoteCount:quotes.length,oldestQuoteAge:quotes.length?Math.max(...quotes.map(p=>s.day-p.created)):0,ownerOpenHours,designerOpenHours,externalWaits:active.filter(p=>['approval','production','payment'].includes(p.stage)).length,throughput30:delivered.filter(p=>p.deliveredDay>Math.max(0,s.day-30)).length,overduePayments:active.filter(p=>p.delivered&&round(p.price-p.paid)>0&&s.day>p.paymentDue).length,complete:s.projects.filter(p=>p.stage==='complete').length,delivered:delivered.length,receivable:delivered.reduce((a,p)=>a+p.price-p.paid,0),unserved:s.unserved||0};
}
function externalDemandSettings(c){
 const settings={acquisition:c.acquisition};
 if(c.acquisition==='sales'){
  settings.outreachHours=Math.min(c.ownerHours,c.outreachHours);
  settings.leadsPerHour=c.leadsPerHour;
 }else settings.inquiries=c.inquiries;
 if(c.clientDemand?.share>0)settings.clientDemand={profileId:c.clientDemand.profileId,share:c.clientDemand.share};
 if(c.customerMix){
  const {food,retail,services}=c.customerMix;
  settings.customerMix={food,retail,services};
  settings.focusType=c.focusType||'none';
 }
 settings.services=c.services.filter(v=>v.weight>0).map(v=>({
  id:v.id,weight:v.weight,audience:c.customerMix?(v.audience||'all'):'all'
 }));
 return settings;
}
function completeDemandHistory(s,days=s.day){
 return days===0 || (s.demandHistory?.[0]?.day===1 && s.history.length>=days && s.history.slice(0,days).every(h=>Number.isInteger(h.externalArrivals)));
}
function clientDemandActuals(s,profileId,days=s.day){
 const type=clientDemandType(profileId);
 if(!type||!Number.isInteger(days)||days<0||days>s.day||!completeDemandHistory(s,days))return {targeted:null,matched:null,orders:null};
 const matched=s.projects.filter(p=>p.orderKind==='new-business'&&p.created<=days&&p.clientType===type.id);
 const unserved=s.history.slice(0,days).reduce((count,row)=>count+(row.unservedInquiries||[]).filter(([,id])=>id===type.id).length,0);
 return {targeted:matched.length+unserved,matched:matched.length,orders:matched.filter(p=>p.accepted!==undefined&&p.accepted<=days).length};
}
function sameInquiries(current,baseline,days=current.day){
 // An arrival's ID is its calendar day and index, even when no service fits.
 // Returning cycles are an outcome of the business and deliberately excluded.
 const external=s=>s.projects.filter(p=>p.orderKind==='new-business'&&p.created<=days);
 const currentProjects=external(current),baseProjects=external(baseline);
 if(currentProjects.length!==baseProjects.length)return false;
 if(days===current.day&&days===baseline.day&&(current.unserved??0)!==(baseline.unserved??0))return false;
 const prior=new Map(baseProjects.map(p=>[p.demandId,p]));
 if(prior.size!==baseProjects.length)return false;
 for(const p of currentProjects){
  const other=prior.get(p.demandId);
  if(!other || other.created!==p.created || other.serviceId!==p.serviceId || other.clientId!==p.clientId || other.clientType!==p.clientType)return false;
  prior.delete(p.demandId);
 }
 return current.history.slice(0,days).every((h,i)=>h.externalArrivals===baseline.history[i].externalArrivals &&
  JSON.stringify(h.unservedInquiries||[])===JSON.stringify(baseline.history[i].unservedInquiries||[]));
}
// Compare the relative order of retained offers; additions and removals are
// already reported individually. The seeded draw assigns inquiries in menu order.
function changedOfferOrder(before,after){
 const left=before.services.map(offer=>offer.id),right=after.services.map(offer=>offer.id);
 const leftIds=new Set(left),rightIds=new Set(right);
 const prior=left.filter(id=>rightIds.has(id)),next=right.filter(id=>leftIds.has(id));
 return prior.some((id,index)=>id!==next[index])?{before:prior,after:next}:null;
}
const ORDER_RULE_STARTS=['campaignCalendarFromDay','depositRoundingFromDay'];
const ORDER_RULE_WARNING='Campaign scheduling or deposit rounding used different rules during the compared days.';
function sameOrderRules(left,right,days){
 const start=(run,key)=>Math.min(days+1,run[key]??run.day+1);
 return ORDER_RULE_STARTS.every(key=>start(left,key)===start(right,key));
}
function workloadComparison(current,baseline,throughDay){
 const flags={sameElapsedDay:current.day===baseline.day,sameWorkloadIdentity:current.config.seed===baseline.config.seed && Boolean(current.workloadId) && current.workloadId===baseline.workloadId,
  sameExternalDemandAssumptions:JSON.stringify(externalDemandSettings(current.config))===JSON.stringify(externalDemandSettings(baseline.config)),
  sameDemandHistory:null,sameRealizedInquiries:null};
 const commonDays=Math.min(throughDay??Infinity,current.day,baseline.day);
 flags.sameOrderRules=sameOrderRules(current,baseline,commonDays);
 const days=throughDay??(flags.sameElapsedDay?current.day:null);
 if(Number.isInteger(days)&&days>=0&&days<=Math.min(current.day,baseline.day)&&completeDemandHistory(current,days)&&completeDemandHistory(baseline,days)){
  const periods=s=>(s.demandHistory||[]).filter(row=>row.day<=days);
  const currentPeriods=periods(current),baselinePeriods=periods(baseline);
  flags.sameDemandHistory=currentPeriods.length===baselinePeriods.length && currentPeriods.every((period,i)=>
   period.day===baselinePeriods[i].day && sameReplayValue(period.settings,baselinePeriods[i].settings));
  flags.sameRealizedInquiries=sameInquiries(current,baseline,days);
 }
 flags.likeForLike=flags.sameElapsedDay && flags.sameWorkloadIdentity && flags.sameOrderRules && flags.sameExternalDemandAssumptions && flags.sameDemandHistory===true && flags.sameRealizedInquiries===true;
 return flags;
}
function compareRuns(current,baseline){
 const a=analytics(current),b=analytics(baseline),am=metrics(current),bm=metrics(baseline),delta=(x,y)=>round((x||0)-(y||0));
 const flags=workloadComparison(current,baseline);
 const warnings=[];
 if(!flags.sameOrderRules)warnings.push({code:'different-order-rules',message:ORDER_RULE_WARNING});
 if(!flags.sameElapsedDay)warnings.push({code:'different-day',message:'Runs are at different elapsed days; result deltas are descriptive, not causal.'});
 if(!flags.sameWorkloadIdentity)warnings.push({code:'different-workload',message:'Runs do not share a workload identity; customer-level outcomes are not directly comparable.'});
 if(!flags.sameExternalDemandAssumptions)warnings.push({code:'different-demand-assumptions',message:'The current effective demand settings differ. Check the arrival method, available outreach hours and customer or service mix.'});
 if(flags.sameElapsedDay && flags.sameDemandHistory===null)warnings.push({code:'unverified-demand-history',message:'At least one run began before daily demand tracking. Its earlier workload cannot be verified.'});
 if(flags.sameDemandHistory===false)warnings.push({code:'different-demand-history',message:'Different demand settings were in effect during the simulated days.'});
 if(flags.sameRealizedInquiries===false)warnings.push({code:'different-inquiries',message:'The recorded new inquiries differ by arrival, customer type or requested service, including inquiries with no matching offer.'});
 const deltas={cash:delta(current.cash,baseline.cash),revenue:delta(current.revenue,baseline.revenue),deliveredDirectCost:delta(a.deliveredCost,b.deliveredCost),unfinishedCost:delta(a.unfinishedCost,b.unfinishedCost),overhead:delta(a.overhead,b.overhead),operatingResult:delta(a.profit,b.profit),ownerTimeValue:delta(a.profit-a.periodAfterOwner,b.profit-b.periodAfterOwner),afterOwnerTime:delta(a.periodAfterOwner,b.periodAfterOwner),delivered:am.delivered-bm.delivered,lateOpenDeliveries:am.late-bm.late,receivable:delta(am.receivable,bm.receivable),ownerOpenHours:delta(am.ownerOpenHours,bm.ownerOpenHours),designerOpenHours:delta(am.designerOpenHours,bm.designerOpenHours)};
 const bridge=[{code:'delivered-revenue',label:'Delivered revenue',amount:deltas.revenue},{code:'delivered-direct-cost',label:'Delivered direct cost',amount:round(-deltas.deliveredDirectCost)},{code:'unfinished-cost',label:'Unfinished-work cost',amount:round(-deltas.unfinishedCost)},{code:'overhead',label:'Shared overhead',amount:round(-deltas.overhead)}];
 const dominantDriver=[...bridge].sort((x,y)=>Math.abs(y.amount)-Math.abs(x.amount))[0]||null;
 return{flags,warnings,deltas,bridge,dominantDriver,reconciles:round(bridge.reduce((n,v)=>n+v.amount,0))===deltas.operatingResult};
}
function workCapacity(config){
 const outreach=config.acquisition==='sales'?Math.min(config.ownerHours,config.outreachHours):0;
 return {owner:(config.ownerHours-outreach)/5,design:config.designers*config.designerHours/5};
}
// Drain the current design queue in scheduler order. Each job can use one
// designer's daily hours, while unused hours go to the next job that day.
// This estimate excludes future arrivals, revisions and cash decisions.
function designQueueDays(projects,config,target=null){
 const daily=config.designers*config.designerHours/5,perJob=config.designerHours/5;
 const remaining=new Map();
 for(const p of projects){
  if(p.stage==='design'&&p.work.design>WORK_EPSILON)remaining.set(p,p.work.design);
  if(p===target)break;
 }
 if(!remaining.size||target&&!remaining.has(target))return 0;
 if(!daily)return Infinity;
 let elapsed=0;
 while(remaining.size){
  let available=daily,days=Infinity,longest=0;
  const allocations=[];
  for(const [p,hours] of remaining){
   const work=Math.min(perJob,available,hours);
   allocations.push({p,hours,work});
   longest=Math.max(longest,work);
   days=Math.min(days,Math.floor(hours/work));
   available-=work;
   if(available<=0)break;
  }
  // Full workdays with identical allocations can be advanced together.
  if(!Number.isFinite(days))return Infinity;
  for(const {p,hours,work} of allocations){
   const left=hours-days*work;
   if(left<=WORK_EPSILON)remaining.delete(p);
   else remaining.set(p,left);
  }
  if(!remaining.size||target&&!remaining.has(target)){
   const lastDayLoad=Math.max(longest/perJob,(daily-available)/daily);
   return elapsed+days-1+lastDayLoad;
  }
  elapsed+=days;
 }
}
function projectDiagnostic(s,project,workOrder){
 const p=typeof project==='string'?s.projects.find(v=>v.id===project):project;
 if(!p||!s.projects.includes(p))throw Error('Project not found');
 const stage=p.stage,done=['complete','lost'].includes(stage),lateDays=p.accepted!==undefined&&!p.delivered?Math.max(0,s.day-p.due):0;
 const committedDisruptions=p.terms?.disruptions||{},contract=s.contracts.find(value=>value.id===p.contractId);
 const result={projectId:p.id,stage,kind:done?'done':['approval','production','payment'].includes(stage)?'external':'resource',responsible:{inquiry:'client',quote:'owner',design:'design-team',review:'owner',approval:'client',production:'supplier',delivery:'owner',payment:'client',complete:'none',lost:'none'}[stage],waitDays:Math.max(0,s.day-p.entered),lateDays,remainingWorkHours:round(p.work?.[stage]||0),remainingCalendarDays:0,dailyCapacity:0,queueAheadCount:0,queueAheadHours:0,estimatedWorkdays:null,reasonCode:done?stage:'waiting',fulfillment:p.terms?.fulfillment?clone(p.terms.fulfillment):null,campaign:contract?.campaign?{cycle:p.cycle,cadenceDays:contract.campaign.cadenceDays,relationshipEndDay:contract.campaign.endDay,status:contract.status,skippedCampaigns:(contract.skipped||0)+(contract.missedCadences||0),missedCadences:contract.missedCadences||0}:null,disruptions:{rushDeadline:committedDisruptions.rushDeadline===true,supplierReprint:committedDisruptions.supplierReprint===true,reprintCount:p.reprintCount||0,revisionRounds:committedDisruptions.revisionRounds||0,revisionCount:p.revisionCount??(p.revised?1:0),extendedPaymentDays:committedDisruptions.extendedPaymentDays||0}};
 // Older accepted terms could record a collection delay even when the
 // deposit had already paid the whole fee. A real delayed final receipt stays visible.
 if(result.disruptions.extendedPaymentDays&&p.paymentStatus==='paid'&&
    (p.price===0||s.ledger.some(e=>e.project===p.id&&e.type==='receipt'&&e.amount===p.price&&e.note==='Client deposit'))){
  result.disruptions.extendedPaymentDays=0;
 }
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
 result.dailyCapacity=workCapacity(s.config)[stage==='design'?'design':'owner'];
 const ordered=workOrder||orderedProjects(s),position=ordered.indexOf(p),ahead=ordered.slice(0,Math.max(0,position)).filter(v=>resourceStages.includes(v.stage));
 result.queueAheadCount=ahead.length;result.queueAheadHours=round(ahead.reduce((n,v)=>n+(v.work[v.stage]||0),0));
 if(result.dailyCapacity>0){
  const days=stage==='design'?designQueueDays(ordered,s.config,p):(ahead.reduce((hours,job)=>hours+job.work[job.stage],0)+p.work[stage])/result.dailyCapacity;
  result.estimatedWorkdays=Math.ceil(days);
 }
 return result;
}
function bottleneck(s){
 const c=s.config,describe=(resource,stages,capacity)=>{
  const breakdown=stages.map(stage=>{const projects=s.projects.filter(p=>p.stage===stage),hours=projects.reduce((n,p)=>n+(p.work[stage]||0),0);return{stage,count:projects.length,hours,oldest:projects.length?Math.max(...projects.map(p=>s.day-p.entered)):0};});
  const hours=breakdown.reduce((n,v)=>n+v.hours,0),count=breakdown.reduce((n,v)=>n+v.count,0),leading=[...breakdown].sort((a,b)=>b.hours-a.hours||b.oldest-a.oldest)[0];
  return{resource,stage:leading?.stage||stages[0],stages:breakdown,count:leading?.count||0,hours:leading?.hours||0,combinedCount:count,combinedHours:hours,capacity,days:capacity>0?hours/capacity:hours>0?Infinity:0,oldest:Math.max(0,...breakdown.map(v=>v.oldest))};
 };
 const capacity=workCapacity(c);
 const design=describe('design',['design'],capacity.design);
 if(design.count)design.days=designQueueDays(orderedProjects({...s,projects:s.projects.filter(p=>p.stage==='design')}),c);
 const ranked=[describe('owner',['quote','review','delivery'],capacity.owner),design].filter(v=>v.count).sort((a,b)=>b.days-a.days);
 if(ranked.length)return ranked[0];
 const waits=['approval','production','payment'].map(stage=>{const ps=s.projects.filter(p=>p.stage===stage);return{resource:'external',stage,count:ps.length,hours:0,capacity:0,days:0,oldest:ps.length?Math.max(...ps.map(p=>s.day-p.entered)):0,stages:[]};}).filter(v=>v.count).sort((a,b)=>b.oldest-a.oldest);
 return waits[0]||null;
}
function orderedProjects(s){const c=s.config;return [...s.projects].sort((a,b)=>Number(b.priority)-Number(a.priority)||(c.priority==='deadline'?(a.accepted===undefined)-(b.accepted===undefined)||a.due-b.due:a.created-b.created)||a.demandId.localeCompare(b.demandId)||a.id.localeCompare(b.id));}
// Daily updates are atomic. If any payment fails, discard the proposed day's
// work, preserve the diagnostic, then retry after an explicit funding decision.
function nextDayDraft(s,closedIntake=false){
 const draft=clone(s);
 if(!s.day&&!s.launchEstimate&&!closedIntake)draft.launchEstimate=captureForecast(s.config);
 if(!draft.replayJournal&&legacyReplaySetupKnown(draft))draft.replayJournal={version:1,changes:[]};
 draft.day++;if(!advance(draft,closedIntake)){
 // A newly created project disappears with the rolled-back day. Its ID stays
 // in the payment note, but only committed projects can be linked or saved.
 s.blocked={...draft.blocked,project:s.projects.some(p=>p.id===draft.blocked.project)?draft.blocked.project:null};return null;
 }
 if(closedIntake)draft.events=[...draft.events.filter(e=>e.day===draft.day),...s.events];
 return draft;
}
function step(s){
 if(s.blocked||s.day>=s.config.months*30)return false;
 const draft=nextDayDraft(s);
 if(!draft)return false;
 Object.assign(s,draft);return true;
}
function collectPayment(s,p,closedIntake){const balance=round(p.price-p.paid);if(balance<0)throw Error('Project balance cannot be negative.');if(balance>0)entry(s,balance,'receipt',p,'Final payment');p.paymentStatus='paid';completePaid(s,p,closedIntake);}
function scheduleCampaign(s,p,contract,cycle){
 const cadence=contract.campaign.cadenceDays,maxWindows=Math.floor(contract.campaign.relationshipDays/cadence);
 let window=cycle;
 if(s.day>=s.campaignCalendarFromDay){
  // Cycle counts actual quotes and identifies the customer's seeded decision.
  // A late settlement can miss whole calendar windows without generating offers.
  const previousWindow=1+Math.floor(Math.max(0,p.created-contract.started)/cadence);
  const nextWindow=Math.max(cycle,previousWindow+1);
  const tomorrowWindow=1+Math.floor((s.day+1-contract.started)/cadence);
  window=Math.max(nextWindow,tomorrowWindow);
  const missed=Math.max(0,Math.min(window,maxWindows+1)-nextWindow);
  if(missed){
   contract.missedCadences=(contract.missedCadences||0)+missed;
   event(s,p,'Campaign periods missed while prior work was open: '+missed);
  }
 }
 const day=Math.max(contract.started+(window-1)*cadence,s.day+1),demandId=contract.id+':cycle:'+cycle;
 if(window>maxWindows||day>contract.campaign.endDay){contract.status='ended';return null;}
 const existing=s.repeatQueue.find(item=>item.contractId===contract.id&&(item.cycle===cycle||item.demandId===demandId));if(existing)return existing.day;
 s.repeatQueue.push({day,serviceId:p.serviceId,client:p.client,clientType:p.clientType,clientId:p.clientId,contractId:contract.id,cycle,demandId,orderKind:'campaign-reoffer'});contract.status='active';return day;
}
function advanceProject(s,p,capacity,closedIntake){
 const c=s.config;
 for(let transitions=0;transitions<16;transitions++){
  if(['complete','lost'].includes(p.stage))return true;p.wait=s.day-p.entered;
  if(p.stage==='inquiry'){move(s,p,'quote');continue;}
  if(['quote','design','review','delivery'].includes(p.stage)){
   const stage=p.stage,isDesign=stage==='design',available=isDesign?Math.min(capacity.design,Math.max(0,capacity.perDesigner-(capacity.designByProject.get(p.id)||0))):capacity.owner;
   const h=Math.min(available,p.work[stage]);
   if(h>0){
    if(isDesign){if(!pay(s,h*c.designerRate,p,'Design labor for '+p.id,h))return false;capacity.design-=h;capacity.designByProject.set(p.id,(capacity.designByProject.get(p.id)||0)+h);s.designHours+=h;p.designHours+=h;}
    else{capacity.owner-=h;s.ownerHours+=h;p.ownerHours+=h;}
    p.work[stage]=Math.max(0,p.work[stage]-h);
   }
   if(p.work[stage]>WORK_EPSILON)return true;
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
   const hasBalance=round(p.price-p.paid)>0,extendedDelay=hasBalance?(p.terms?.disruptions?.extendedPaymentDays||0):0;
   const paymentDelay=extendedDelay||(hasBalance&&variable(c,'payment')?Math.floor(p.random.payment*6):0);p.receiveDay=p.paymentDue+paymentDelay;s.revenue=round(s.revenue+p.price);event(s,p,'Delivered; revenue recognized');
   if(extendedDelay)event(s,p,'Modeled late-payment incident: collection expected '+extendedDelay+' days after the contractual due date');
   if(!hasBalance){p.paymentStatus='paid';completePaid(s,p,closedIntake);return true;}
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
  if(p.stage==='payment'){if(s.day<p.receiveDay)return true;collectPayment(s,p,closedIntake);return true;}
  return true;
 }
 throw Error('Project transition loop exceeded its safe limit.');
}
function visitExternalInquiries(c,day,visit){
 const weekday=(day-1)%7<5;
 const mean=c.acquisition==='preset'?c.inquiries/30:(weekday?Math.min(c.outreachHours/5,c.ownerHours/5)*c.leadsPerHour:0);
 const arrivals=Math.floor(mean)+(demandDraw(c,'day:'+day,'arrival')<mean%1?1:0);
 for(let index=0;index<arrivals;index++){
  const demandId='lead:'+day+':'+index,profile=selectProfile(c,demandId);
  const eligible=suitableServices(c,profile?.group);
  const total=eligible.reduce((sum,service)=>sum+service.weight,0);
  let pick=demandDraw(c,demandId,'service')*total,service=eligible.at(-1);
  for(const candidate of eligible){pick-=candidate.weight;if(pick<0){service=candidate;break;}}
  visit(demandId,profile,service,index);
 }
 return arrivals;
}
function advance(s,closedIntake=false){
 const c=s.config,weekday=(s.day-1)%7<5,dayInMonth=(s.day-1)%30;
 // Model 2 day order: due collections, fixed obligations, confirmed cycles,
 // external demand, outreach, then scheduled work and same-day transitions.
 for(const p of orderedProjects(s).filter(p=>p.stage==='payment'&&s.day>=p.receiveDay))collectPayment(s,p,closedIntake);
 if(dayInMonth===0&&!pay(s,c.overhead,null,'Monthly software and overhead'))return false;
 if(!closedIntake){
  const returns=s.repeatQueue.filter(r=>r.day<=s.day);s.repeatQueue=s.repeatQueue.filter(r=>r.day>s.day);
  for(const r of returns){const svc=c.services.find(x=>x.id===r.serviceId)||[...s.projects].reverse().find(p=>p.serviceId===r.serviceId&&p.clientId===r.clientId)?.service;if(svc)create(s,svc,null,r.client,true,r);}
 }
 const unservedInquiries=[];
 const arrivals=closedIntake?0:visitExternalInquiries(c,s.day,(demandId,profile,service,index)=>{
  if(service){create(s,service,null,null,false,{demandId,clientType:profile?.id});return;}
  s.unserved=(s.unserved||0)+1;unservedInquiries.push([index,profile?.id||null]);
  event(s,null,(profile?.label||'Customer')+' inquiry could not be served by the current offerings');
 });
 const capacity={owner:weekday?c.ownerHours/5:0,design:weekday?c.designers*c.designerHours/5:0,perDesigner:weekday?c.designerHours/5:0,designByProject:new Map()};
 if(weekday&&c.acquisition==='sales'){const h=Math.min(capacity.owner,c.outreachHours/5);capacity.owner-=h;s.ownerHours+=h;}
 const book=closedIntake?{...s,projects:s.projects.filter(p=>p.accepted!==undefined)}:s;
 for(const p of orderedProjects(book))if(!advanceProject(s,p,capacity,closedIntake))return false;
 if(!closedIntake){
  const settings=externalDemandSettings(c);
  s.demandHistory??=[];
  if(JSON.stringify(settings)!==JSON.stringify(s.demandHistory.at(-1)?.settings))s.demandHistory.push({day:s.day,settings});
 }
 const m=metrics(closedIntake?{...s,projects:book.projects}:s);s.history.push({day:s.day,cash:s.cash,revenue:s.revenue,expenses:s.expenses,profit:m.profit,ownerHours:s.ownerHours,complete:m.complete,active:m.active,late:m.late,onTimeRate:m.onTimeRate,oldestQuoteAge:m.oldestQuoteAge,externalArrivals:arrivals,...(unservedInquiries.length?{unservedInquiries}:{})});return true;
}
function completePaid(s,p,closedIntake=false){
 if(p.stage==='complete')return;
 if(!p.delivered||round(p.price-p.paid)!==0)throw Error('Project must be delivered and fully paid.');
 p.fulfillmentStatus='delivered';p.paymentStatus='paid';move(s,p,'complete');
 if(closedIntake)return;
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
  if(!['preset','sales'].includes(c.acquisition))add('acquisition','Choose how inquiries arrive.');
  if(!['deadline','fifo'].includes(c.priority))add('priority','Choose a valid queue order.');
  if(typeof c.realism!=='boolean')add('realism','Choose valid uncertainty settings.');
  if(c.clientDemand!==undefined){
    const target=c.clientDemand;
    if(!target||typeof target!=='object'||Array.isArray(target)||Object.keys(target).sort().join(',')!=='profileId,share'||!clientDemandType(target.profileId))
      add('clientDemand.profileId','Choose a client from the starter menus.');
    if(!Number.isInteger(target?.share)||target.share<0||target.share>100)add('clientDemand.share','Enter a whole target share between 0 and 100%.');
  }
  if(c.fixedInquiriesEntered!==undefined&&typeof c.fixedInquiriesEntered!=='boolean')add('inquiries','Fixed inquiry preference is invalid.');
  if(c.assumptionRecords!==undefined&&(!validAssumptionRecords(c.assumptionRecords)||withCurrentAssumptionRecords(c)!==c))add('assumptionRecords','An assumption record has an invalid source, sample, date or matching value.');
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
    else if(v.customOffer===true&&!v.deliverable.trim())add(base+'.deliverable','Describe what the client receives for one project.');
    if(v.customOffer!==undefined&&typeof v.customOffer!=='boolean')add(base+'.customOffer','Check this custom service.');
    if(v.supplierMode!==undefined&&!['none','print'].includes(v.supplierMode))add(base+'.supplierMode','Choose whether this project uses a print supplier.');
    if(v.supplierMode==='none'&&v.print!==0)add(base+'.print','A project without a supplier has zero printing cost.');
    if(v.supplierMode==='print'&&!(v.print>0))add(base+'.print','Enter the supplier batch cost for this print route.');
    if(v.filesOnlyScope!==undefined&&(typeof v.filesOnlyScope!=='string'||v.filesOnlyScope.length>500))add(base+'.filesOnlyScope','Use up to 500 characters for the files-only deliverable.');
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
  if(s.day===0){s.cash=round(s.cash+round(c.startingCash)-s.initialCash);s.initialCash=round(c.startingCash);s.workloadId='model2-seed-'+c.seed;}
  recordReplaySetup(s,c);
  s.config=clone(c);s.blocked=null;event(s,null,'Business settings updated. Existing quotes retain agreed prices and terms.');return s;
}
const capacityFields=['designers','designerHours','ownerHours'];
function sameReplayValue(a,b){
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&sameReplayValue(a[key],b[key]));
}
function legacyReplaySetupKnown(s){
 return s.events.length<120&&!s.events.some(e=>e.day>0&&e.text.startsWith('Business settings updated.'));
}
// Capture the inputs before the first edit on each day. Edits take effect on the
// next simulated day. The final inputs already live in state.config.
function recordReplaySetup(s,c){
 if(!s.replayJournal){
  if(!legacyReplaySetupKnown(s))return;
  s.replayJournal={version:1,changes:[]};
 }
 if(!s.day||sameReplayValue(c,s.config))return;
 const changes=s.replayJournal.changes;
 if(changes.at(-1)?.day!==s.day)changes.push({day:s.day,config:clone(s.config)});
}
function validateReplayJournal(s){
 const j=s.replayJournal;
 if(j===undefined)return;
 if(!j||j.version!==1||!Array.isArray(j.changes)||j.changes.length>s.day)throw Error('The saved replay setup history is invalid.');
 let previous=0;
 for(const row of j.changes){
  if(!row||!Number.isInteger(row.day)||row.day<=previous||row.day>s.day||!row.config)throw Error('The saved replay setup dates are invalid.');
  validateConfig(row.config);
  if(row.config.seed!==s.config.seed||row.config.startingCash!==s.config.startingCash)throw Error('Replay history must keep the same starting cash and workload seed.');
  previous=row.day;
 }
}
function replayConfigAt(s,day){
 const next=s.replayJournal?.changes.find(c=>c.day>day);
 // A horizon extension changes when the clock stops, not the work on earlier days.
 return {...clone(next?.config||s.config),months:s.config.months};
}
function capacityReplaySetup(s,month=Math.max(1,Math.ceil(s.day/30))){
 if(!Number.isInteger(month)||month<1||month>Math.max(1,Math.ceil(s.day/30)))throw Error('Choose a month that has started.');
 if(!s.replayJournal&&!legacyReplaySetupKnown(s))throw Error('This saved run does not contain its complete setup history. Start a new run to record a replayable month.');
 validateReplayJournal(s);
 const firstDay=(month-1)*30+1,endDay=Math.min(month*30,s.config.months*30);
 const config=replayConfigAt(s,firstDay-1),conflicts=new Set();
 for(const row of s.replayJournal?.changes||[]){
  if(row.day<firstDay||row.day>=endDay)continue;
  const next=replayConfigAt(s,row.day);
  for(const key of capacityFields)if(row.config[key]!==next[key])conflicts.add(key);
 }
 return {month,firstDay,endDay,sourceDay:s.day,config,conflicts:[...conflicts]};
}
function changedCapacity(config,key,value){
 const next=withCurrentAssumptionRecords({...config,[key]:value});
 validateConfig(next);
 if(key==='ownerHours'&&config.acquisition==='sales'&&Math.min(config.ownerHours,config.outreachHours)!==Math.min(value,config.outreachHours)){
  throw Error('Those owner hours would also change outreach and incoming demand. Choose a value that covers the same outreach, or test designer capacity.');
 }
 return next;
}
function replayActions(s,endDay){
 const byDay=new Map();
 function add(day,action){
  if(day>endDay)return;
  if(!byDay.has(day))byDay.set(day,[]);
  byDay.get(day).push(action);
 }
 // A day-30 edit starts on day 31; day-30 funding and project decisions are
 // already posted and belong to the closing month.
 for(const row of s.replayJournal?.changes||[])if(row.day<endDay)add(row.day,{kind:'settings',config:replayConfigAt(s,row.day)});
 for(const e of s.ledger)if(e.type==='funding')add(e.day,{kind:'funding',amount:e.amount});
 for(const p of s.projects){
  for(const e of p.log){
   let kind,value;
   if(e.text==='Manually prioritized'||e.text==='Priority removed'){kind='priority';value=e.text==='Manually prioritized';}
   else if(e.text==='Client approval confirmed manually')kind='approve';
   else if(e.text.startsWith('Agreed deadline changed to day ')){kind='deadline';value=Number(e.text.slice('Agreed deadline changed to day '.length));}
   if(kind)add(e.day,{kind,value,demandId:p.demandId});
  }
 }
 return byDay;
}
function applyReplayActions(session,s,alternative){
 for(const action of session.actions.get(s.day)||[]){
  if(action.kind==='funding'){fund(s,action.amount);continue;}
  if(action.kind==='settings'){
   const config=alternative?changedCapacity(action.config,session.key,session.value):action.config;
   applyConfig(s,config);
   continue;
  }
  const p=s.projects.find(project=>project.demandId===action.demandId);
  const settled=p&&(p.stage==='lost'||p.stage==='complete');
  if(!p||(alternative&&settled)||(action.kind==='approve'&&p.stage!=='approval')||(action.kind==='deadline'&&(p.accepted===undefined||p.delivered||action.value<=p.due))){
   throw Error('The recorded '+action.kind+' decision on day '+s.day+' cannot be repeated on the same job in this replay. Choose another month or change.');
  }
  if(action.kind!=='priority'||action.value!==p.priority)intervene(s,p.id,action.kind,action.value);
 }
}
// Older runs used the same intake wording for confirmed repeats and undecided
// campaigns. Use the recorded deposit to interpret their payment messages.
function projectEventText(project,text,deposit){
 if(project?.orderKind==='campaign-reoffer'&&text==='Confirmed repeat cycle entered quote intake')return 'Campaign entered quote intake for a new decision';
 if(deposit===0&&text.startsWith('Quote accepted at $'))return text.replace('; deposit received; delivery due day ','; no deposit collected; delivery due day ');
 if(project?.accepted!==undefined&&deposit===project.price&&/^Modeled late-payment incident: collection expected \d+ days after the contractual due date$/.test(text))return null;
 return text;
}
// Cross-check the unchanged replay against the saved business, including accepted
// work that had no cash entries and all daily economics through the observed date.
function verifyObservedReplay(source,control,end=control.day){
 const daily=h=>[h.cash,h.revenue,h.expenses,h.ownerHours,h.active,h.complete,h.late];
 const originalDemand=(source.demandHistory||[]).filter(e=>e.day<=end);
 const sameDemand=originalDemand.every(e=>sameReplayValue(externalDemandSettings(replayConfigAt(source,e.day-1)),e.settings));
 // A legacy zero-dollar deposit was a placeholder, with no cash movement.
 const events=s=>s.ledger.filter(e=>e.day<=end&&!(e.type==='receipt'&&e.note==='Client deposit'&&e.amount===0));
 const recorded=events(source),replayed=events(control);
 const samePostings=recorded.length===replayed.length&&recorded.every((e,i)=>{
  const other=replayed[i];
  return e.day===other.day&&e.type===other.type&&e.amount===other.amount&&e.project===other.project&&e.note===other.note&&
   (e.designHours===undefined||other.designHours===undefined||Math.abs(e.designHours-other.designHours)<1e-8);
 });
 const compareCurrent=end===source.day&&end===control.day;
 const projects=s=>{
  const deposits=new Map(s.ledger.filter(e=>e.day<=end&&e.type==='receipt'&&e.note==='Client deposit').map(e=>[e.project,e.amount]));
  return s.projects.filter(p=>p.created<=end).map(p=>{
   const deposit=deposits.get(p.id)??0;
   const log=[];
   for(const e of p.log){
    if(e.day>end)break;
    const text=projectEventText(p,e.text,deposit);
    if(text!==null)log.push([e.day,text]);
   }
   const facts=[p.id,p.demandId,p.clientId,p.serviceId,p.created,p.accepted<=end?p.accepted:null,p.accepted<=end?p.price:null,p.deliveredDay<=end?p.deliveredDay:null,log];
   if(compareCurrent){
    let terms=p.terms;
    if(terms?.disruptions?.extendedPaymentDays&&deposit===p.price)terms={...terms,disruptions:{...terms.disruptions,extendedPaymentDays:0}};
    facts.push(p.stage,p.work,p.entered,p.due,p.priority,p.approvalConfirmed||false,terms,p.paid,p.cost,p.designHours);
   }
   return facts;
  });
 };
 const sameDay=(h,original)=>original&&sameReplayValue(daily(h),daily(original))&&
  (original.externalArrivals===undefined||h.externalArrivals===original.externalArrivals&&sameReplayValue(h.unservedInquiries||[],original.unservedInquiries||[]));
 if(!sameDemand||!control.history.slice(0,end).every((h,i)=>sameDay(h,source.history[i]))||
   !samePostings||!sameReplayValue(projects(control),projects(source))){
  throw Error('The unchanged replay did not reproduce the recorded month. Its saved history cannot support a one-change comparison.');
 }
}
function freshComparison(config,source){
 const run=fresh(config);
 for(const key of ORDER_RULE_STARTS)run[key]=source[key]??source.day+1;
 return run;
}
function replayOpening(source){
 const opening=freshComparison(replayConfigAt(source,0),source);
 if(source.launchEstimate)opening.launchEstimate={...source.launchEstimate};
 return opening;
}
// Yield after each simulated day so the history dialog can be closed while verifying a long run.
function* recordedMonthClose(source,month){
 const period=capacityReplaySetup(source,month),end=Math.min(period.endDay,source.day);
 const close=replayOpening(source),session={actions:replayActions(source,end)};
 applyReplayActions(session,close,false);
 while(close.day<end){
  if(!step(close))throw Error('The recorded work could not be reconstructed through day '+end+'.');
  applyReplayActions(session,close,false);
  yield close.day;
 }
 verifyObservedReplay(source,close,end);
 return close;
}
function forkCapacityReplay(session){
 const alternative=clone(session.baseline);
 applyConfig(alternative,changedCapacity(alternative.config,session.key,session.value));
 // A first-month alternative changes the business from the beginning. A
 // later fork inherits its original forecast just as a live setup edit does.
 if(!alternative.day){
  const months=alternative.launchEstimate?alternative.launchEstimate.days/30:alternative.config.months;
  alternative.launchEstimate=captureForecast({...alternative.config,months});
 }
 session.alternative=alternative;
 session.phase='running';
}
function startCapacityReplay(source,{month,key,value,demandId=null}={}){
 const period=capacityReplaySetup(source,month);
 if(!capacityFields.includes(key))throw Error('Choose one capacity assumption to change.');
 if(period.conflicts.includes(key))throw Error('This assumption changed during the recorded month. Choose a different assumption or month.');
 if(value===period.config[key])throw Error('Enter a value different from the opening setup.');
 changedCapacity(period.config,key,value);
 if(demandId!==null&&!source.projects.some(p=>p.demandId===demandId&&p.created<=period.endDay))throw Error('The selected job had not arrived in this month.');
 const observed=clone(source),baseline=replayOpening(observed);
 const session={phase:'opening',month:period.month,firstDay:period.firstDay,endDay:period.endDay,sourceDay:source.day,
  key,before:period.config[key],value,demandId,source:observed,actions:replayActions(observed,period.endDay),baseline,alternative:null};
 applyReplayActions(session,baseline,false);
 if(!source.day)verifyObservedReplay(observed,baseline);
 if(period.firstDay===1)forkCapacityReplay(session);
 return session;
}
function stepCapacityReplay(session){
 if(session.phase==='done')return false;
 if(session.phase==='error')throw Error(session.error);
 try{
  const advanceSide=(run,alternative)=>{
   if(run.blocked||run.day>=session.endDay)return;
   const observedDay=session.source.day;
   const recordedHold=!alternative&&session.source.blocked&&run.day===observedDay;
   const advanced=step(run);
   if(recordedHold&&(advanced||['amount','cash','gap','note','project'].some(k=>run.blocked?.[k]!==session.source.blocked[k]))){
    throw Error('The unchanged replay did not reproduce the recorded funding pause.');
   }
   if(!advanced){
    if(!alternative&&run.day<Math.min(observedDay,session.endDay))throw Error('The unchanged replay paused before the recorded day. Its saved history cannot support this comparison.');
    return;
   }
   applyReplayActions(session,run,alternative);
   if(!alternative&&run.day===Math.min(observedDay,session.endDay))verifyObservedReplay(session.source,run);
  };
  advanceSide(session.baseline,false);
  if(session.phase==='opening'){
   if(session.baseline.day===session.firstDay-1)forkCapacityReplay(session);
  }else{
   advanceSide(session.alternative,true);
   if([session.baseline,session.alternative].every(s=>s.blocked||s.day>=session.endDay))session.phase='done';
  }
  return session.phase!=='done';
 }catch(error){
  session.error=error.message;session.phase='error';throw error;
 }
}
function replayJob(s,demandId){
 const p=demandId?s.projects.find(item=>item.demandId===demandId):null;
 return p?{id:p.id,stage:p.stage,accepted:p.accepted!==undefined,delivered:p.delivered,deliveredDay:p.deliveredDay??null,
  remainingWorkHours:round(p.work[p.stage]||0)}:null;
}
function capacityEndpoint(s,month,demandId){
 const firstDay=(month-1)*30+1;
 const result=s.day>=firstDay?monthResult(s,month):null;
 const days=s.history.filter(h=>h.day>=firstDay&&h.day<firstDay+30);
 const inquiries=days.every(h=>Number.isInteger(h.externalArrivals))?days.reduce((n,h)=>n+h.externalArrivals,0):null;
 return {day:s.day,blocked:s.blocked?clone(s.blocked):null,inquiries,
  backlog:s.projects.filter(item=>item.accepted!==undefined&&!item.delivered).length,
  delivered:result?.delivered||0,revenue:result?.revenue||0,cost:result?.cost||0,
  profit:result?.profit||0,afterOwner:result?.afterOwner||0,closingCash:s.cash,
  job:replayJob(s,demandId)};
}
function verifyCapacityPair(control,variant,firstDay,key,before,value){
 if(!capacityFields.includes(key)||before===value)throw Error('The saved change is missing or invalid.');
 const opening=firstDay-1;
 const changeDays=new Set([0,opening,control.day]);
 for(const run of [control,variant]){
  validateReplayJournal(run);
  if(!run.replayJournal)throw Error('The paired setup history is missing.');
  for(const c of run.replayJournal.changes)changeDays.add(c.day);
 }
 for(const day of changeDays){
  const base=replayConfigAt(control,day),alt=replayConfigAt(variant,day);
  if(day===opening&&base[key]!==before)throw Error('The recorded change does not match the opening setup.');
  const expected=day>=opening?changedCapacity(base,key,value):base;
  expected.name=alt.name;
  if(!sameReplayValue(expected,alt))throw Error('The paired setups differ beyond the selected change.');
 }
 verifyObservedReplay(control,variant,opening);
 const decisions=s=>{
  const rows=[];
  for(const [day,actions] of replayActions(s,s.day))for(const a of actions)if(a.kind!=='settings')rows.push(JSON.stringify([day,a]));
  return rows.sort();
 };
 if(JSON.stringify(decisions(control))!==JSON.stringify(decisions(variant)))throw Error('Funding or manual decisions differ between the paired runs.');
}
function capacityPairResult(control,variant,{month,key,before,value,demandId=null,sourceDay}){
 const firstDay=(month-1)*30+1,endDay=month*30;
 const baseline=capacityEndpoint(control,month,demandId),alternative=capacityEndpoint(variant,month,demandId);
 let reason='';
 if(control.blocked||variant.blocked)reason='At least one replay paused for funding. Its figures stop at the last completed day.';
 else if(control.day!==endDay||variant.day!==endDay)reason='Both replays must reach the end of the same month to compare outcomes.';
 else if(!sameOrderRules(variant,control,endDay))reason=ORDER_RULE_WARNING;
 else if(!workloadComparison(variant,control).likeForLike)reason='Incoming demand did not match. The difference cannot be attributed to one change.';
 else{
  try{verifyCapacityPair(control,variant,firstDay,key,before,value);}
  catch(error){reason=error.message;}
 }
 const delta=reason?null:Object.fromEntries(['backlog','delivered','revenue','cost','profit','afterOwner','closingCash'].map(field=>[field,round(alternative[field]-baseline[field])]));
 const costAttribution=reason?null:carryJobCosts(control,variant,firstDay,demandId);
 const decision=reason?null:replayDecision(control,variant,firstDay,key,costAttribution);
 return {comparable:!reason,reason,month,key,before,value,demandId,sourceDay,firstDay,endDay,baseline,alternative,delta,costAttribution,decision};
}
function capacityReplayResult(session){
 if(session.phase!=='done')throw Error('Finish both replays to see the comparison.');
 return capacityPairResult(session.baseline,session.alternative,session);
}
// Continue from the two settled month-end states. Funding and project decisions
// on the closing day have been posted. Settings entered that day govern tomorrow.
function startCapacityCarry(source,control,variant,descriptor){
 const {month,key,before,demandId=null,sourceDay,projectFromClose=false}=descriptor,value=descriptor.after??descriptor.value;
 const close=month*30,endDay=control.config.months*30,firstDay=close-29;
 if(!Number.isInteger(month)||month<1||close>=endDay)throw Error('This replay already reaches the end of the configured run.');
 if(!Number.isInteger(sourceDay)||sourceDay<(month===1?0:firstDay)||sourceDay>endDay)throw Error('The recorded source day is outside this experiment.');
 const matching=capacityPairResult(control,variant,{month,key,before,value,demandId,sourceDay});
 if(!matching.comparable)throw Error(matching.reason);
 if(demandId&&!matching.baseline.job)throw Error('The selected job is missing from the original month.');
 if(projectFromClose&&(projectFromClose!==true||source||sourceDay<close))throw Error('A projection from month close requires a saved pair with unavailable subsequent history.');
 if(!source&&sourceDay>=close&&!projectFromClose)throw Error('The original run was not kept with this saved replay. Its decisions from the month close forward are unavailable.');
 const observed=source||control;
 if(source){
  if(source.day!==sourceDay||source.config.months!==control.config.months||source.config.seed!==control.config.seed)throw Error('The source run no longer matches the saved experiment.');
  capacityReplaySetup(source,month);
  const cutoff=Math.min(close-1,sourceDay);
  const dates=new Set([0,cutoff]);
  for(const s of [source,control])for(const row of s.replayJournal?.changes||[])if(row.day<=cutoff)dates.add(row.day);
  for(const day of dates){
   if(!sameReplayValue(replayConfigAt(source,day),replayConfigAt(control,day)))throw Error('The source settings do not match the original replay.');
  }
  verifyObservedReplay(source,control,Math.min(sourceDay,close));
 }
 const actions=replayActions(observed,endDay);
 // Reject a future conflict before starting either copy, including an edit
 // entered exactly at the prior month close for the first continuation day.
 for(const [day,entries] of actions){
  if(day<close)continue;
  for(const action of entries){
   if(action.kind!=='settings')continue;
   if(action.config[key]!==before)throw Error('The original run changed the selected capacity setting after the replay month. A single sustained change cannot be compared.');
   changedCapacity(action.config,key,value);
  }
 }
 actions.set(close,(actions.get(close)||[]).filter(a=>a.kind==='settings'));
 const session={phase:'running',month,key,before,value,demandId,sourceDay,projectFromClose,firstDay,endDay,
  source:clone(observed),actions,baseline:clone(control),alternative:clone(variant)};
 applyReplayActions(session,session.baseline,false);
 applyReplayActions(session,session.alternative,true);
 return session;
}
function carryPeriods(s,firstMonth,demandId){
 const periods=[],sumKeys=['delivered','revenue','cost','designLabor','profit','afterOwner','ownerHours','inquiries'];
 const totals=Object.fromEntries(sumKeys.map(key=>[key,0]));
 const last=Math.ceil(s.day/30);
 for(let month=firstMonth;month<=last;month++){
  const r=monthResult(s,month);
  const inquiries=s.history.slice(r.firstDay-1,r.endDay).reduce((count,h)=>count+h.externalArrivals,0);
  const p={month,day:r.endDay,delivered:r.delivered,backlog:r.awaitingDelivery,revenue:r.revenue,
   cost:r.cost,designLabor:r.designLabor,profit:r.profit,afterOwner:r.afterOwner,ownerHours:r.ownerHours,
   closingCash:r.closingCash,inquiries};
  for(const key of sumKeys)totals[key]+=p[key];
  periods.push(p);
 }
 for(const key of sumKeys)totals[key]=round(totals[key]);
 return {periods,totals:{...totals,day:s.day,closingCash:s.cash,backlog:periods.at(-1)?.backlog??0,
  job:replayJob(s,demandId),blocked:s.blocked?clone(s.blocked):null}};
}
function carryDelta(base,alt){
 const fields=['delivered','backlog','revenue','cost','designLabor','profit','afterOwner','ownerHours','closingCash'];
 return Object.fromEntries(fields.map(k=>[k,round(alt[k]-base[k])]));
}
// A comparison's money and work cover the selected interval. Receivables,
// deposits and accepted orders are positions measured at the two boundaries.
function replayCash(run,firstDay){
 const firstMonth=Math.ceil(firstDay/30),lastMonth=Math.ceil(run.day/30);
 const opening=firstMonth>1?monthResult(run,firstMonth-1):null;
 const first=monthResult(run,firstMonth),last=lastMonth===firstMonth?first:monthResult(run,lastMonth);
 const cents=n=>Math.round(n*100);
 let receipts=0,funding=0;
 for(const entry of run.ledger){
  if(entry.day<firstDay)continue;
  if(entry.type==='receipt')receipts+=cents(entry.amount);
  if(entry.type==='funding')funding+=cents(entry.amount);
 }
 const lowest=cashSeries(run).slice(firstDay).reduce((low,point)=>point.cash<low.cash?point:low);
 return {openingCash:first.openingCash,closingCash:last.closingCash,openingReceivable:opening?.receivable??0,
  closingReceivable:last.receivable,openingDeposits:opening?.depositsHeld??0,closingDeposits:last.depositsHeld,
  receipts:receipts/100,funding:funding/100,lowest};
}
function replayBacklog(control,variant){
 const left=new Map(control.projects.map(p=>[p.demandId,p])),right=new Map(variant.projects.map(p=>[p.demandId,p]));
 const groups={shared:[],cleared:[],additional:[],delayed:[],originalOnly:[]};
 const open=p=>p?.accepted!==undefined&&!p.delivered;
 let originalValue=0,changedValue=0;
 for(const id of [...new Set([...left.keys(),...right.keys()])].sort()){
  const a=left.get(id),b=right.get(id),originalOpen=open(a),changedOpen=open(b);
  if(!originalOpen&&!changedOpen)continue;
  if(originalOpen)originalValue+=Math.round(a.price*100);
  if(changedOpen)changedValue+=Math.round(b.price*100);
  const group=originalOpen?(changedOpen?'shared':b?.delivered?'cleared':'originalOnly'):(a?.delivered?'delayed':'additional');
  const p=changedOpen?b:a;
  groups[group].push({demandId:id,originalId:a?.id??null,changedId:b?.id??null,service:p.service.name,cycle:p.cycle||1,price:p.price});
 }
 return {groups,originalValue:originalValue/100,changedValue:changedValue/100};
}
function replayAvailableHours(run,firstDay,key){
 let previous=firstDay-1,hours=0;
 for(const {day,config} of [...run.replayJournal.changes,{day:run.day,config:run.config}]){
  if(day<=previous)continue;
  const weekdays=workingDays(day)-workingDays(previous);
  const weekly=key==='ownerHours'?config.ownerHours:config.designers*config.designerHours;
  hours+=weekdays*weekly/5;
  previous=day;
 }
 return hours;
}
function replayDecision(control,variant,firstDay,key,costs){
 const baseline=replayCash(control,firstDay),alternative=replayCash(variant,firstDay);
 const difference=field=>Math.round(alternative[field]*100)-Math.round(baseline[field]*100);
 const cash={baseline,alternative,opening:difference('openingCash')/100,closing:difference('closingCash')/100,
  receipts:difference('receipts')/100,funding:difference('funding')/100,spending:costs.delta.cost,
  deposits:(difference('closingDeposits')-difference('openingDeposits'))/100,
  receivables:(difference('openingReceivable')-difference('closingReceivable'))/100};
 const baselineAvailable=replayAvailableHours(control,firstDay,key),alternativeAvailable=replayAvailableHours(variant,firstDay,key);
 const ownerHours=s=>s.ownerHours-(s.history[firstDay-2]?.ownerHours||0);
 const owner=key==='ownerHours';
 const capacity={owner,baselineAvailable:round(baselineAvailable),alternativeAvailable:round(alternativeAvailable),
  availableDifference:round(alternativeAvailable-baselineAvailable),
  baselineWorked:owner?round(ownerHours(control)):costs.baseline.designHours,
  alternativeWorked:owner?round(ownerHours(variant)):costs.alternative.designHours,
  workedDifference:owner?round(ownerHours(variant)-ownerHours(control)):costs.delta.designHours};
 return {cash,capacity,backlog:replayBacklog(control,variant)};
}
// Only needed for an older job with undated labor on both sides of the
// period boundary. The two schedules shared this opening work.
function openingDesignerHours(control,day){
 try{
  const opening=replayOpening(control),session={actions:replayActions(control,day)};
  applyReplayActions(session,opening,false);
  while(opening.day<day){
   if(!step(opening))return null;
   applyReplayActions(session,opening,false);
  }
  verifyObservedReplay(control,opening,day);
  return new Map(opening.projects.map(p=>[p.demandId,p.designHours]));
 }catch{return null;}
}
function jobExpenseBasis(run,firstDay,getOpening){
 const byId=new Map(),jobs=new Map(),totals={designLabor:0,supplierCost:0,otherDirectCost:0,overhead:0,unfinishedCost:0,deliveredCost:0};
 let totalHours=0;
 for(const p of run.projects){
  const figures={designLabor:0,supplierCost:0,otherDirectCost:0,openingHours:0,periodHours:0,missingOpening:false,missingPeriod:false};
  byId.set(p.id,figures);
 }
 for(const posting of run.ledger){
  if(posting.type!=='expense')continue;
  const inPeriod=posting.day>=firstDay,cents=-Math.round(posting.amount*100);
  if(!posting.project){
   if(inPeriod)totals.overhead+=cents;
   continue;
  }
  const kind=directExpenseKind(posting),figures=byId.get(posting.project);
  if(inPeriod){figures[kind]+=cents;totals[kind]+=cents;}
  if(kind==='designLabor'){
   if(posting.designHours===undefined)figures[inPeriod?'missingPeriod':'missingOpening']=true;
   else figures[inPeriod?'periodHours':'openingHours']+=posting.designHours;
  }
 }
 for(const p of run.projects){
  const f=byId.get(p.id);
  const delivered=p.deliveredDay!==undefined,unfinished=p.accepted!==undefined&&!delivered;
  const direct=f.designLabor+f.supplierCost+f.otherDirectCost;
  totals[delivered?'deliveredCost':'unfinishedCost']+=direct;
  let hours=f.periodHours;
  if(!f.missingOpening)hours=p.designHours-f.openingHours;
  else if(f.missingPeriod){
   const opening=getOpening();
   hours=opening?p.designHours-(opening.get(p.demandId)||0):null;
  }
  if(hours!==null)hours=hours>=-1e-6?Math.max(0,hours):null;
  if(hours===null)totalHours=null;
  else if(totalHours!==null)totalHours+=hours;
  const side={id:p.id,client:p.client,service:p.service.name,cycle:p.cycle||1,stage:p.stage,
   deliveredDay:p.deliveredDay??null,unfinished,designHours:hours,designLabor:f.designLabor/100,
   supplierCost:f.supplierCost/100,otherDirectCost:f.otherDirectCost/100,cost:direct/100};
  jobs.set(p.demandId,{side,lifetimeHours:p.designHours});
 }
 totals.cost=totals.overhead+totals.deliveredCost+totals.unfinishedCost;
 for(const key of Object.keys(totals))totals[key]/=100;
 totals.designHours=totalHours===null?null:round(totalHours);
 return {jobs,totals};
}
function carryJobCosts(control,variant,firstDay,demandId){
 let opening;
 const getOpening=()=>{if(opening===undefined)opening=openingDesignerHours(control,firstDay-1);return opening;};
 const original=jobExpenseBasis(control,firstDay,getOpening),changed=jobExpenseBasis(variant,firstDay,getOpening);
 const baseline=original.totals,alternative=changed.totals;
 const differences=(a,b,fields)=>Object.fromEntries(fields.map(k=>[k,round((b?.[k]||0)-(a?.[k]||0))]));
 const delta=differences(baseline,alternative,Object.keys(baseline));
 // The common opening cancels even when an old posting omitted its hours.
 const hourDifference=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?round(b-a)||0:null;
 delta.designHours=hourDifference(control.designHours,variant.designHours);
 const byChangedStatus={unfinished:0,delivered:0,absent:0,unaccepted:0},rows=[];
 for(const id of new Set([...original.jobs.keys(),...changed.jobs.keys()])){
  const left=original.jobs.get(id),right=changed.jobs.get(id);
  const base=left?.side??null,alt=right?.side??null;
  const change=differences(base,alt,['designLabor','supplierCost','otherDirectCost','cost']);
  change.designHours=hourDifference(left?left.lifetimeHours:0,right?right.lifetimeHours:0);
  const status=alt===null?'absent':alt.unfinished?'unfinished':alt.deliveredDay!==null?'delivered':'unaccepted';
  byChangedStatus[status]+=Math.round(change.cost*100);
  if(!base?.cost&&!alt?.cost&&!base?.designHours&&!alt?.designHours&&!change.designHours&&id!==demandId)continue;
  for(const side of [base,alt])if(side&&side.designHours!==null)side.designHours=round(side.designHours);
  rows.push({demandId:id,baseline:base,alternative:alt,delta:change});
 }
 for(const key of Object.keys(byChangedStatus))byChangedStatus[key]/=100;
 rows.sort((a,b)=>Math.abs(b.delta.cost)-Math.abs(a.delta.cost)||Math.abs(b.delta.designHours)-Math.abs(a.delta.designHours)||a.demandId.localeCompare(b.demandId));
 return {firstDay,endDay:control.day,baseline,alternative,delta,byChangedStatus,rows};
}
function capacityCarryPairResult(control,variant,descriptor){
 const {month,key,before,sourceDay,demandId=null,projectFromClose=false}=descriptor,value=descriptor.after??descriptor.value;
 const firstDay=(month-1)*30+1,endDay=control.config.months*30;
 if(!Number.isInteger(month)||month<1||month*30>=endDay||!Number.isInteger(sourceDay)||sourceDay<(month===1?0:firstDay)||sourceDay>endDay)throw Error('The carry-forward period is invalid.');
 const b=carryPeriods(control,month,demandId),a=carryPeriods(variant,month,demandId),baseline=b.totals,alternative=a.totals;
 let reason='';
 if(baseline.blocked||alternative.blocked)reason='At least one run paused for funding. The payoff through day '+endDay+' is unknown.';
 else if(baseline.day!==endDay||alternative.day!==endDay)reason='Both runs must reach day '+endDay+' to compare the result.';
 else if(!sameOrderRules(variant,control,endDay))reason=ORDER_RULE_WARNING;
 else if(!workloadComparison(variant,control).likeForLike)reason='Incoming demand did not match through the end of the run.';
 else{
  try{
   verifyCapacityPair(control,variant,firstDay,key,before,value);
   if(control.config[key]!==before||control.replayJournal.changes.some(r=>r.day>=firstDay&&r.config[key]!==before))throw Error('The original capacity setting changed during the experiment.');
   if(demandId&&!baseline.job)throw Error('The selected job is missing from the original run.');
  }catch(error){reason=error.message;}
 }
 const rows=[];
 let cumulativeProfit=0,paybackMonth=null;
 for(let i=0;i<Math.min(b.periods.length,a.periods.length);i++){
  const base=b.periods[i],alt=a.periods[i];
  if(base.day!==base.month*30||alt.day!==base.day)break;
  const delta=reason?null:carryDelta(base,alt);
  if(delta){
   cumulativeProfit=round(cumulativeProfit+delta.profit);
   if(cumulativeProfit<=0)paybackMonth=null;
   else if(paybackMonth===null)paybackMonth=base.month;
  }
  rows.push({month:base.month,endDay:base.day,baseline:base,alternative:alt,delta,cumulativeProfit:delta?cumulativeProfit:null});
 }
 const delta=reason?null:carryDelta(baseline,alternative);
 const baselineDay=baseline.job?.deliveredDay??null,alternativeDay=alternative.job?.deliveredDay??null;
 const jobTiming=demandId&&!reason?{baselineDay,alternativeDay,daysEarlier:baselineDay!==null&&alternativeDay!==null?baselineDay-alternativeDay:null}:null;
 const projectionFromDay=projectFromClose?month*30+1:sourceDay<endDay?Math.max(firstDay,sourceDay+1):null;
 const costAttribution=reason?null:carryJobCosts(control,variant,firstDay,demandId);
 const decision=reason?null:replayDecision(control,variant,firstDay,key,costAttribution);
 return {comparable:!reason,reason,month,firstDay,endDay,sourceDay,projectionFromDay,projectFromClose,key,before,value,demandId,baseline,alternative,delta,rows,paybackMonth,jobTiming,costAttribution,decision};
}
function capacityCarryResult(session){
 if(session.phase!=='done')throw Error('Finish both runs to see the carry-forward result.');
 return capacityCarryPairResult(session.baseline,session.alternative,session);
}
const projectionSides=['baseline','alternative'];
function acceptedBook(run){
 const open=run.projects.filter(p=>p.accepted!==undefined&&!p.delivered);
 const unpaid=run.projects.filter(p=>p.delivered&&round(p.price-p.paid)>0);
 return {open,unpaid};
}
function projectionOpening(run){
 const {open,unpaid}=acceptedBook(run);
 return {openingJobs:open.length,openingUnpaidInvoices:unpaid.length,
  bookedValue:round(open.reduce((n,p)=>n+p.price,0)),openingReceivable:round(unpaid.reduce((n,p)=>n+p.price-p.paid,0)),
  cash:run.cash,revenue:run.revenue,expenses:run.expenses,cutoffProfit:round(run.revenue-run.expenses)};
}
function checkProjection(session){
 const reasons=[];
 for(const side of projectionSides){
  const run=session[side],{open,unpaid}=acceptedBook(run),capacity=workCapacity(run.config);
  if(!open.length&&!unpaid.length)session.settledDays[side]??=run.day;
  let reason='';
  if(run.blocked)reason='needs $'+run.blocked.gap.toFixed(2)+' in funding for '+run.blocked.note+' on day '+(run.day+1)+'.';
  else{
   const stuck=open.find(p=>p.work[p.stage]>0.00001&&(p.stage==='design'&&capacity.design===0||
    ['review','delivery'].includes(p.stage)&&capacity.owner===0));
   if(stuck)reason='cannot finish '+stuck.id+' with zero '+(stuck.stage==='design'?'designer':'available owner')+' hours for its remaining '+stuck.stage+' work.';
  }
  session.reasons[side]=reason;
  if(reason)reasons.push((side==='baseline'?'Original schedule ':'Changed schedule ')+reason);
 }
 if(reasons.length)session.reason=reasons.join(' ');
 else if(projectionSides.some(side=>session.settledDays[side]===null)){
  if(session.baseline.day<session.endDay)return;
  session.reason='The limit of 360 additional model days was reached with accepted work or invoices still open.';
 }
 session.phase='done';
}
function startAcceptedProjection(baseline,alternative){
 if(!baseline||!alternative||baseline.day<1||baseline.day!==alternative.day||
    [baseline,alternative].some(run=>run.blocked||run.day!==run.config.months*30)){
  throw Error('Finish both runs through the same configured horizon before projecting accepted work.');
 }
 if(!sameOrderRules(alternative,baseline,baseline.day))throw Error(ORDER_RULE_WARNING);
 if(!workloadComparison(alternative,baseline).likeForLike)throw Error('The projection requires a completed comparison with matching incoming demand.');
 const cutoffDay=baseline.day;
 const session={phase:'running',reason:'',cutoffDay,endDay:cutoffDay+360,sourceBaseline:baseline,sourceAlternative:alternative,
  baseline:clone(baseline),alternative:clone(alternative),opening:{baseline:projectionOpening(baseline),alternative:projectionOpening(alternative)},
  settledDays:{baseline:null,alternative:null},reasons:{baseline:'',alternative:''}};
 checkProjection(session);
 return session;
}
function stepAcceptedProjection(session){
 if(session.phase==='done')return false;
 // Both schedules must pay through the same date. Never commit one side's day
 // if the other cannot fund it, even after the first side settled its last job.
 const base=nextDayDraft(session.baseline,true),alt=nextDayDraft(session.alternative,true);
 if(base&&alt){session.baseline=base;session.alternative=alt;}
 checkProjection(session);
 return session.phase!=='done';
}
function acceptedProjectionResult(session){
 if(session.phase!=='done')throw Error('Finish the accepted-work projection to see the result.');
 const {cutoffDay}=session;
 function summarize(side){
  const run=session[side],opening=session.opening[side],c=run.config;
  const {open,unpaid}=acceptedBook(run);
  const receipts=run.ledger.filter(e=>e.day>cutoffDay&&e.type==='receipt'&&e.amount>0);
  const lastDeliveryDay=run.projects.reduce((day,p)=>p.deliveredDay>cutoffDay?Math.max(day||0,p.deliveredDay):day,null);
  return {openingJobs:opening.openingJobs,openingUnpaidInvoices:opening.openingUnpaidInvoices,bookedValue:opening.bookedValue,
   openingReceivable:opening.openingReceivable,cutoffProfit:opening.cutoffProfit,openingCash:opening.cash,closingCash:run.cash,
   settledDay:session.settledDays[side],lastDeliveryDay,lastCollectionDay:receipts.at(-1)?.day??null,
   openJobs:open.length,unpaidInvoices:unpaid.length,subsequentRevenue:round(run.revenue-opening.revenue),
   collections:round(receipts.reduce((n,e)=>n+e.amount,0)),furtherCosts:round(run.expenses-opening.expenses),
   profit:round(run.revenue-run.expenses),designers:c.designers,designerHours:c.designerHours,designerRate:c.designerRate,
   ownerHours:c.ownerHours,outreachHours:c.acquisition==='sales'?Math.min(c.ownerHours,c.outreachHours):0,overhead:c.overhead,
   reason:session.reasons[side],blocked:run.blocked?clone(run.blocked):null};
 }
 const baseline=summarize('baseline'),alternative=summarize('alternative'),settled=!session.reason;
 return {settled,reason:session.reason,cutoffDay,endDay:session.baseline.day,baseline,alternative,
  profitDelta:settled?round(alternative.profit-baseline.profit):null};
}
function restore(input){return (root.MEIQQValidation||(typeof require==='function'?require('./validation.js'):null)).restore(input,api);}
const api={freshComparison,depositAmount,projectEventText,changedOfferOrder,ASSUMPTION_FIELDS,assumptionRecordValue,validAssumptionRecords,withCurrentAssumptionRecords,MODEL_VERSION,DEFAULT,DISRUPTION_RULES,RECIPE_V2,CUSTOMER_TYPES,STAGES,LABELS,clone,round,random,demandDraw,recipeFingerprint,validServiceSpec,validServiceFulfillment,validServiceCampaign,fresh,step,metrics,analytics,monthResult,estimate,estimateDemand,estimateWorkload,compareRuns,workCapacity,projectDiagnostic,bottleneck,orderedProjects,fund,intervene,configIssues,validateConfig,normalize,workingDays,applyConfig,restore,completePaid,cashSeries};
Object.assign(api,{clientDemandType,profileFor,clientDemandForecast,clientDemandActuals,effectiveCustomerMix,deliveryCapacity,directExpenseKind,captureRunLaunch,runLaunchEstimate,runActualsThrough,runEstimateComparison,workloadComparison,recordedMonthClose,externalDemandSettings,visitExternalInquiries,validateReplayJournal,capacityReplaySetup,startCapacityReplay,stepCapacityReplay,capacityReplayResult,capacityPairResult,
 replayConfigAt,startCapacityCarry,stepCapacityCarry:stepCapacityReplay,capacityCarryResult,capacityCarryPairResult,
 startAcceptedProjection,stepAcceptedProjection,acceptedProjectionResult});
root.QQ=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
