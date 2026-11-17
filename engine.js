/* MEIQQ simulation engine. No network or external dependencies. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const round=x=>Math.round(x*100)/100;
const STAGES=['inquiry','quote','design','review','approval','production','delivery','payment','complete'];
const LABELS={inquiry:'Inquiry',quote:'Quote & deposit',design:'Design',review:'Internal review',approval:'Client approval',production:'Print production',delivery:'Delivery',payment:'Final payment',complete:'Complete'};
const DEFAULT={name:'Studio baseline',seed:2417,months:1,startingCash:6000,ownerHours:10,ownerTarget:30,designers:1,designerHours:24,designerRate:12,overhead:180,inquiries:45,conversion:0.7,deposit:0.5,paymentDays:5,approvalDays:2,printDays:3,quoteHours:0.6,deliveryHours:0.5,leadDays:14,priority:'deadline',acquisition:'preset',outreachHours:3,leadsPerHour:3.5,retention:0.8,repeat:0.15,realism:false,uncertainty:{complexity:true,revisions:true,approval:true,supplier:true,payment:true},services:[
{id:'design',name:'Design only',deliverable:'Menu, poster or promotional graphic',price:290,hours:5,review:1,print:0,weight:45,recurring:false,color:'#287d77'},
{id:'print',name:'Design + print',deliverable:'Design and a batch of printed menus',price:540,hours:6,review:1.5,print:140,weight:35,recurring:false,color:'#8871b1'},
{id:'monthly',name:'Monthly promotion',deliverable:'Four promotional graphics per cycle',price:720,hours:10,review:2,print:0,weight:20,recurring:true,color:'#bd8753'}]};
function random(seed,key){let h=seed|0;for(const c of String(key))h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return(h>>>0)/4294967296;}
function normalize(config){const c=clone(config);for(const key of ['quoteHours','deliveryHours','leadDays'])if(c[key]===undefined)c[key]=DEFAULT[key];c.uncertainty={...DEFAULT.uncertainty,...c.uncertainty};return c;}
function variable(c,key){return c.realism&&c.uncertainty?.[key]!==false;}
function workingDays(days=30){let n=0;for(let d=0;d<days;d++)if(d%7<5)n++;return n;}
function fresh(config=DEFAULT){let c=normalize(config);validateConfig(c);return{version:3,config:c,day:0,projects:[],cash:round(c.startingCash),initialCash:round(c.startingCash),revenue:0,expenses:0,ownerHours:0,designHours:0,funding:0,ledger:[],history:[],events:[],blocked:null,nextId:1,repeatQueue:[],lost:0};}
function event(s,p,text){const e={day:s.day,text};if(p)p.log.push(e);s.events.unshift({...e,project:p?.id||null});s.events=s.events.slice(0,120);}
function entry(s,amount,type,p,note){amount=round(amount);if(!Number.isFinite(amount)||(type==='receipt'&&amount<0))throw Error('Invalid cash transaction.');s.cash=round(s.cash+amount);s.ledger.push({day:s.day,amount:round(amount),type,project:p?.id||null,note});if(type==='expense'){s.expenses=round(s.expenses-amount);if(p)p.cost=round(p.cost-amount);}if(type==='receipt'&&p)p.paid=round(p.paid+amount);}
function pay(s,amount,p,note){amount=round(amount);if(s.cash+0.001<amount){s.blocked={amount,cash:s.cash,gap:round(amount-s.cash),project:p?.id||null,note};event(s,p,'Cash decision required: '+note);return false;}entry(s,-amount,'expense',p,note);return true;}
function move(s,p,stage){p.stage=stage;p.entered=s.day;p.wait=0;event(s,p,'Moved to '+LABELS[stage]);}
function create(s,service,id,client,renewal=false){let c=s.config;let p={id:id||'P'+String(s.nextId++).padStart(3,'0'),serviceId:service.id,service:clone(service),client:client||['Maple Bakery','Eastside Tea','Garden Noodle','Oak & Willow','Jade Market','Corner Café','Northline Salon','Little Lotus'][Math.floor(random(c.seed,'client'+s.day+s.nextId)*8)],stage:'inquiry',created:s.day,entered:s.day,due:s.day+c.leadDays,work:{quote:c.quoteHours,design:0,review:0,delivery:c.deliveryHours},price:0,paid:0,cost:0,ownerHours:0,designHours:0,priority:false,log:[],renewal,wait:0,revised:false,delivered:false};
event(s,p,renewal?'Returning client begins a new cycle':'New inquiry received');s.projects.push(p);return p;}
function accept(s,p){const c=s.config;const svc=c.services.find(x=>x.id===p.serviceId)||p.service;p.service=clone(svc);p.price=round(svc.price);p.accepted=s.day;p.due=s.day+c.leadDays;p.terms={paymentDays:c.paymentDays,approvalDays:c.approvalDays,printDays:c.printDays};const complexity=variable(c,'complexity')?0.75+random(c.seed,p.id+'complexity')*0.75:1;p.work.design=svc.hours*complexity;p.work.review=svc.review;p.printCost=svc.print;entry(s,p.price*c.deposit,'receipt',p,'Client deposit');event(s,p,'Quote accepted at $'+p.price+'; deposit received; delivery due day '+p.due);move(s,p,'design');}
function estimate(input){const c=normalize(input),days=30,workdays=workingDays(days),weeks=workdays/5;const outreach=c.acquisition==='sales'?Math.min(c.outreachHours,c.ownerHours)*weeks:0;const leads=c.acquisition==='preset'?c.inquiries:outreach*c.leadsPerHour;const orders=leads*c.conversion,total=c.services.reduce((a,v)=>a+v.weight,0)||1;const weighted=f=>c.services.reduce((a,v)=>a+f(v)*v.weight/total,0);const hours=orders*weighted(v=>v.hours),owner=leads*c.quoteHours+orders*weighted(v=>v.review+c.deliveryHours)+outreach;const revenue=orders*weighted(v=>v.price),expense=hours*c.designerRate+orders*weighted(v=>v.print)+c.overhead;const ownerCapacity=c.ownerHours*weeks,designCapacity=c.designers*c.designerHours*weeks;const ratio=(used,cap)=>cap?used/cap:used?Infinity:0;return{days,workdays,leads,orders,revenue,expense,profit:revenue-expense,owner,hours,outreach,ownerCapacity,designCapacity,ownerLoad:ratio(owner,ownerCapacity),designLoad:ratio(hours,designCapacity),surplus:revenue-expense-owner*c.ownerTarget};}
function metrics(s){const active=s.projects.filter(p=>!['complete','lost'].includes(p.stage));const profit=s.revenue-s.expenses;return{profit,surplus:profit-s.ownerHours*s.config.ownerTarget,effective:s.ownerHours?profit/s.ownerHours:0,active:active.length,late:active.filter(p=>p.accepted!==undefined&&!p.delivered&&s.day>p.due).length,overduePayments:active.filter(p=>p.delivered&&round(p.price-p.paid)>0&&s.day>p.paymentDue).length,complete:s.projects.filter(p=>p.stage==='complete').length,delivered:s.projects.filter(p=>p.delivered).length,receivable:s.projects.filter(p=>p.delivered).reduce((a,p)=>a+p.price-p.paid,0)};}
function bottleneck(s){const c=s.config;const stages=['quote','design','review','delivery'];const ranked=stages.map(stage=>{const ps=s.projects.filter(p=>p.stage===stage);const work=ps.reduce((a,p)=>a+(p.work[stage]||0),0);const cap=stage==='design'?c.designers*c.designerHours/5:c.ownerHours/5;return{stage,count:ps.length,hours:work,days:work/(cap||0.001),oldest:ps.length?Math.max(...ps.map(p=>s.day-p.entered)):0};}).sort((a,b)=>b.days-a.days);return ranked[0]?.count?ranked[0]:null;}
// Daily updates are atomic. If any payment fails, discard the proposed day's
// work, preserve the diagnostic, then retry after an explicit funding decision.
function step(s){if(s.blocked||s.day>=s.config.months*30)return false;let draft=clone(s);draft.day++;if(!advance(draft)){s.blocked=draft.blocked;return false;}Object.assign(s,draft);return true;}
function advance(s){const c=s.config;const weekday=(s.day-1)%7<5;const dayInMonth=(s.day-1)%30;
if(dayInMonth===0&&!pay(s,c.overhead,null,'Monthly software and overhead'))return false;
let ownerCap=weekday?c.ownerHours/5:0,designCap=weekday?c.designers*c.designerHours/5:0;
if(weekday&&c.acquisition==='sales'){const h=Math.min(ownerCap,c.outreachHours/5);ownerCap-=h;s.ownerHours+=h;}
const mean=c.acquisition==='preset'?c.inquiries/30:(weekday?Math.min(c.outreachHours/5,c.ownerHours/5)*c.leadsPerHour:0);
const arrivals=Math.floor(mean)+(random(c.seed,'arrival'+s.day)<mean%1?1:0);const total=c.services.reduce((a,v)=>a+v.weight,0);
if(total>0)for(let i=0;i<arrivals;i++){let pick=random(c.seed,'service'+s.day+':'+i)*total,svc=c.services[c.services.length-1];for(const v of c.services){pick-=v.weight;if(pick<=0){svc=v;break;}}create(s,svc);}
const returns=s.repeatQueue.filter(r=>r.day<=s.day);s.repeatQueue=s.repeatQueue.filter(r=>r.day>s.day);for(const r of returns){const svc=c.services.find(x=>x.id===r.serviceId);if(svc)create(s,svc,null,r.client,true);}
const list=[...s.projects].sort((a,b)=>Number(b.priority)-Number(a.priority)||(c.priority==='deadline'?a.due-b.due:a.created-b.created)||a.id.localeCompare(b.id));
for(const p of list){if(['complete','lost'].includes(p.stage))continue;p.wait=s.day-p.entered;
if(p.stage==='inquiry'){move(s,p,'quote');continue;}
if(['quote','design','review','delivery'].includes(p.stage)){
const stage=p.stage;const cap=stage==='design'?designCap:ownerCap;const h=Math.min(cap,p.work[stage]);
if(h>0){if(stage==='design'){if(!pay(s,h*c.designerRate,p,'Design labor for '+p.id))return false;designCap-=h;s.designHours+=h;p.designHours+=h;}else{ownerCap-=h;s.ownerHours+=h;p.ownerHours+=h;}p.work[stage]=Math.max(0,p.work[stage]-h);}
if(p.work[stage]>0.00001)continue;
if(stage==='quote'){if(p.renewal||random(c.seed,p.id+'conversion')<c.conversion)accept(s,p);else{p.stage='lost';s.lost++;event(s,p,'Client declined quote');}}
else if(stage==='design')move(s,p,'review');
else if(stage==='review')move(s,p,'approval');
else {p.delivered=true;p.deliveredDay=s.day;p.paymentDue=s.day+(p.terms?.paymentDays??c.paymentDays);p.receiveDay=p.paymentDue+(variable(c,'payment')?Math.floor(random(c.seed,p.id+'payment')*6):0);s.revenue=round(s.revenue+p.price);event(s,p,'Delivered; revenue recognized');if(round(p.price-p.paid)===0)completePaid(s,p);else move(s,p,'payment');}
continue;
}
if(p.stage==='approval'&&(p.approvalConfirmed||p.wait>=(p.terms?.approvalDays??c.approvalDays)+(variable(c,'approval')?Math.floor(random(c.seed,p.id+'approval')*3):0))){
if(!p.approvalConfirmed&&variable(c,'revisions')&&!p.revised&&random(c.seed,p.id+'revision')<0.3){p.revised=true;p.work.design=p.service.hours*0.35;p.work.review=p.service.review*0.5;event(s,p,'Client requested one additional revision');move(s,p,'design');}
else if(p.printCost>0){if(!pay(s,p.printCost,p,'Print order for '+p.id))return false;p.printDuration=(p.terms?.printDays??c.printDays)+(variable(c,'supplier')?Math.floor(random(c.seed,p.id+'print')*4):0);event(s,p,'Print order committed at $'+p.printCost);move(s,p,'production');}else move(s,p,'delivery');
}else if(p.stage==='production'&&p.wait>=p.printDuration)move(s,p,'delivery');
else if(p.stage==='payment'&&s.day>=p.receiveDay){
const balance=round(p.price-p.paid);if(balance<0)throw Error('Project balance cannot be negative.');if(balance>0)entry(s,balance,'receipt',p,'Final payment');completePaid(s,p);
}}
const m=metrics(s);s.history.push({day:s.day,cash:s.cash,revenue:s.revenue,expenses:s.expenses,profit:m.profit,ownerHours:s.ownerHours,complete:m.complete,active:m.active,late:m.late});return true;}
function completePaid(s,p){
 if(p.stage==='complete')return;
 if(!p.delivered||round(p.price-p.paid)!==0)throw Error('Project must be delivered and fully paid.');
 move(s,p,'complete');
 const recur=p.service.recurring,c=s.config,probability=recur?c.retention:c.repeat;
 if(random(c.seed,p.id+'return')<probability)s.repeatQueue.push({day:recur?Math.max(p.created+30,s.day+1):s.day+30,serviceId:p.serviceId,client:p.client});
}
function cashSeries(s){
 const changes=new Map();for(const e of s.ledger)changes.set(e.day,(changes.get(e.day)||0)+Math.round(e.amount*100));
 let cash=Math.round(s.initialCash*100);const points=[];
 for(let day=0;day<=s.day;day++){cash+=changes.get(day)||0;points.push({day,cash:cash/100});}return points;
}
function fund(s,amount){if(!Number.isFinite(amount)||round(amount)<0.01)throw Error('Enter a positive funding amount of at least one cent.');amount=round(amount);entry(s,amount,'funding',null,'Owner funding');s.funding=round(s.funding+amount);s.blocked=null;event(s,null,'Owner funding added: $'+amount);if(s.history.length)s.history.at(-1).cash=s.cash;}

function intervene(s,id,action,value){const p=s.projects.find(v=>v.id===id);if(!p)throw Error('Project not found');if(action==='priority'){p.priority=!p.priority;event(s,p,p.priority?'Manually prioritized':'Priority removed');}else if(action==='deadline'){if(!Number.isFinite(value)||value<=p.due)throw Error('Choose a later deadline');p.due=value;event(s,p,'Agreed deadline changed to day '+value);}else if(action==='approve'){if(p.stage!=='approval')throw Error('Only client approval can be expedited');p.approvalConfirmed=true;event(s,p,'Client approval confirmed manually');}else throw Error('Unknown action');}
function validateConfig(c){
  if(!c||typeof c!=="object"||typeof c.name!=="string"||!c.name.trim()||c.name.length>100)throw Error("Give this scenario a name (up to 100 characters).");
  if(!Array.isArray(c.services)||!c.services.length||c.services.length>20)throw Error("Include between 1 and 20 services.");
  const fields={seed:[0,1e9,"Workload seed"],months:[1,12,"Simulation months"],startingCash:[0,1e8,"Starting cash"],ownerHours:[0,120,"Your weekly hours"],ownerTarget:[0,1000,"Your hourly target"],designers:[0,50,"Number of designers"],designerHours:[0,120,"Weekly hours per designer"],designerRate:[0,1000,"Designer hourly cost"],overhead:[0,1e7,"Monthly overhead"],inquiries:[0,500,"Monthly inquiries"],conversion:[0,1,"Conversion rate"],deposit:[0,1,"Client deposit"],paymentDays:[0,90,"Payment terms"],approvalDays:[0,30,"Approval time"],printDays:[0,90,"Print time"],outreachHours:[0,120,"Weekly outreach hours"],leadsPerHour:[0,100,"Inquiries per outreach hour"],retention:[0,1,"Renewal rate"],repeat:[0,1,"Repeat purchase rate"],quoteHours:[0,24,"Hours per quote"],deliveryHours:[0,24,"Hours per delivery"],leadDays:[1,180,"Promised delivery time"]};
  for(const [k,[lo,hi,label]]of Object.entries(fields)){if(c[k]===undefined&&['quoteHours','deliveryHours','leadDays'].includes(k))continue;if(typeof c[k]!=="number"||!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error(label+" must be between "+lo+" and "+hi+".");}
  for(const key of ['seed','months','designers','paymentDays','approvalDays','printDays','leadDays'])if(c[key]!==undefined&&!Number.isInteger(c[key]))throw Error(fields[key][2]+" must be a whole number.");
  if(![1,3,6,12].includes(c.months)||!['preset','sales'].includes(c.acquisition)||!['deadline','fifo'].includes(c.priority)||typeof c.realism!=='boolean')throw Error('Choose valid simulation settings.');
  if(c.uncertainty)for(const key of Object.keys(DEFAULT.uncertainty))if(typeof c.uncertainty[key]!=='boolean')throw Error('Choose valid uncertainty switches.');
  const ids=new Set();
  for(const v of c.services){
    if(typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v.id)||ids.has(v.id))throw Error('Each service needs a unique valid identifier.');ids.add(v.id);
    if(typeof v.name!=='string'||!v.name.trim()||v.name.length>100||typeof v.deliverable!=='string'||v.deliverable.length>500||typeof v.recurring!=='boolean'||!/^#[0-9a-f]{6}$/i.test(v.color))throw Error('Check each service name, deliverable and purchase pattern.');
    for(const [key,max]of [['price',1e6],['hours',500],['review',100],['print',1e6],['weight',10000]])if(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]<0||v[key]>max)throw Error(v.name+': '+key+' must be between 0 and '+max+'.');
  }
  if(c.services.reduce((n,v)=>n+v.weight,0)<=0)throw Error('Assign an inquiry share to at least one service.');
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
const api={DEFAULT,STAGES,LABELS,clone,round,random,fresh,step,metrics,estimate,bottleneck,fund,intervene,validateConfig,normalize,workingDays,applyConfig,restore,completePaid,cashSeries};root.QQ=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
