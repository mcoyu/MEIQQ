/* Traceable scenario recipes. Every applied value resolves to either a frozen
   public-context record or an explicitly uncalibrated model-policy record. */
(function(root){
'use strict';
const EVIDENCE=root.QQPresetEvidence||(typeof require==='function'?require('./preset-evidence.js'):null);if(!EVIDENCE)throw Error('Preset evidence ledger is required.');
const ENGINE=root.QQ||(typeof require==='function'?require('./engine.js'):null);
const SERVICE_CATALOG=root.QQServiceCatalog||(typeof require==='function'?require('./service-catalog.js'):null);
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),round=x=>Math.round(x*100)/100;
const CATALOG={id:'metro-detroit-2026-v2',version:2,ledger:EVIDENCE.LEDGER.id,ledgerHash:EVIDENCE.LEDGER.sha256};
const MARKETS=[
 {id:'metro',name:'Metro Detroit balanced',note:'Regional middle case across food, retail and local services.',outreachFactor:1,conversion:.30,paymentDays:7,approvalDays:2,overhead:180,mix:{food:45,retail:30,services:25}},
 {id:'detroit',name:'Detroit neighborhood corridor',note:'A lower-income neighborhood-business scenario with more payment friction.',outreachFactor:.90,conversion:.26,paymentDays:12,approvalDays:3,overhead:150,mix:{food:45,retail:25,services:30}},
 {id:'dearborn',name:'Dearborn food + retail corridor',note:'A modeled food-heavy local-business scenario.',outreachFactor:1.05,conversion:.31,paymentDays:8,approvalDays:2,overhead:200,mix:{food:65,retail:20,services:15}},
 {id:'annarbor',name:'Ann Arbor university + independent',note:'A modeled independent-shop and professional-service scenario.',outreachFactor:1.08,conversion:.32,paymentDays:6,approvalDays:2,overhead:240,mix:{food:50,retail:25,services:25}},
 {id:'royaloak',name:'Royal Oak walkable downtown',note:'A modeled downtown dining, retail and promotion scenario.',outreachFactor:1.10,conversion:.33,paymentDays:5,approvalDays:2,overhead:260,mix:{food:50,retail:35,services:15}},
 {id:'pontiac',name:'Pontiac value + services',note:'A modeled value-conscious local-service scenario.',outreachFactor:.88,conversion:.27,paymentDays:12,approvalDays:3,overhead:150,mix:{food:35,retail:20,services:45}}
];
const OPERATIONS=[
 {id:'side',name:'Side-hustle studio',note:'Six owner hours with two hours of active weekly outreach.',ownerHours:6,ownerTarget:34,designers:1,designerHours:12,designerRate:15,overheadFactor:.7,outreachHours:2,leadsPerHour:.24},
 {id:'solo',name:'Solo owner + remote designer',note:'Fifteen owner hours with four hours of active weekly outreach.',ownerHours:15,ownerTarget:38,designers:1,designerHours:24,designerRate:18,overheadFactor:1,outreachHours:4,leadsPerHour:.30},
 {id:'lean',name:'Lean two-person studio',note:'Broader outreach and two remote design capacity slots.',ownerHours:24,ownerTarget:42,designers:2,designerHours:28,designerRate:22,overheadFactor:1.6,outreachHours:6,leadsPerHour:.36},
 {id:'growth',name:'Growth studio',note:'Full-time owner attention, active outreach and a three-seat team.',ownerHours:36,ownerTarget:50,designers:3,designerHours:32,designerRate:25,overheadFactor:2.6,outreachHours:8,leadsPerHour:.42}
];
const MIXES=[
 {id:'balanced',name:'Balanced local businesses',note:'A broad modeled mix without one favored shop type.',mix:null,focusType:'none',profileStrength:.5},
 {id:'food',name:'Food corridor',note:'A modeled mix of restaurants, cafés, bakeries and takeout shops.',mix:{food:70,retail:15,services:15},focusType:'none',profileStrength:.5},
 {id:'cafe',name:'Cafés + bakeries',note:'A modeled focus on menus, seasonal offers and counter signage.',mix:{food:75,retail:10,services:15},focusType:'cafe',profileStrength:1},
 {id:'restaurant',name:'Restaurant-heavy',note:'A modeled focus on menus, table pieces and recurring campaigns.',mix:{food:80,retail:10,services:10},focusType:'dining',profileStrength:1},
 {id:'retail',name:'Retail main street',note:'A modeled focus on boutiques, markets and window promotions.',mix:{food:20,retail:65,services:15},focusType:'boutique',profileStrength:1},
 {id:'services',name:'Local-service district',note:'A modeled focus on salons, fitness, tutoring and appointments.',mix:{food:15,retail:15,services:70},focusType:'salon',profileStrength:1}
];
const on={rushDeadlines:true,supplierReprints:true,repeatedRevisions:true,extendedLatePayments:true},baselineRates={rushDeadlines:.10,supplierReprints:.03,repeatedRevisions:.15,extendedLatePayments:.15};
const CONDITIONS=[
 {id:'steady',name:'Steady month',note:'Neutral modeled demand; capacity overload remains possible.',outreachFactor:1,conversionDelta:0,repeat:.12,retention:.70,paymentDelta:0,approvalDelta:0,printDays:3,leadDays:14,realism:true,disruptions:on,disruptionRates:baselineRates},
 {id:'slow',name:'Slow / price-sensitive month',note:'Lower modeled response, acceptance and repeat demand.',outreachFactor:.65,conversionDelta:-.05,repeat:.08,retention:.60,paymentDelta:7,approvalDelta:1,printDays:4,leadDays:14,realism:true,disruptions:on,disruptionRates:baselineRates},
 {id:'busy',name:'Busy local season',note:'Higher modeled response with queue pressure and some rush work.',outreachFactor:1.45,conversionDelta:.03,repeat:.15,retention:.75,paymentDelta:2,approvalDelta:1,printDays:4,leadDays:16,realism:true,disruptions:on,disruptionRates:baselineRates},
 {id:'campaign',name:'Event + seasonal campaign',note:'A modeled short demand surge with rush and revision risk.',outreachFactor:1.70,conversionDelta:.02,repeat:.18,retention:.78,paymentDelta:2,approvalDelta:1,printDays:5,leadDays:18,realism:true,disruptions:on,disruptionRates:baselineRates},
 {id:'stress',name:'Delay stress test',note:'Heavy modeled demand with higher optional disruption rates.',outreachFactor:1.50,conversionDelta:-.03,repeat:.10,retention:.65,paymentDelta:14,approvalDelta:3,printDays:7,leadDays:14,realism:true,disruptions:on,disruptionRates:{rushDeadlines:.25,supplierReprints:.10,repeatedRevisions:.30,extendedLatePayments:.35}}
];
const SOURCES=EVIDENCE.RECORDS.filter(v=>v.kind==='published-context').map(v=>({id:v.id,label:v.title,url:v.url,scope:v.scope,supports:'Frozen observation supplies context only',doesNotSupport:v.scope}));
const find=(rows,id)=>rows.find(v=>v.id===id)||rows[0],safeSelection=s=>s&&typeof s==='object'&&!Array.isArray(s)?s:{};
const pathValue=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function serviceFromApplied(applied,index){
 const service={},prefix=`services.${index}.`;for(const [path,value]of Object.entries(applied)){if(!path.startsWith(prefix))continue;const parts=path.slice(prefix.length).split('.');let target=service;for(let i=0;i<parts.length-1;i++){const key=parts[i],next=parts[i+1];if(target[key]===undefined)target[key]=Number.isInteger(Number(next))?[]:{};target=target[key];}target[parts.at(-1)]=clone(value);}return service;
}
function fingerprint(value){let hash=2166136261;for(const ch of JSON.stringify(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16).padStart(8,'0');}
function selected(selection){selection=safeSelection(selection);return{market:find(MARKETS,selection.market),operation:find(OPERATIONS,selection.operation),mix:find(MIXES,selection.mix),condition:find(CONDITIONS,selection.condition)};}
function leaf(path,value,recordIds,derivation){return{path,value:clone(value),recordIds,kind:'modeled-assumption',confidence:'low',derivation};}
function lineage(selection){
 const choices=selected(selection),{operation:o,mix:x,condition:k}=choices;
 // Previously saved recipes used location-specific coefficients. Preserve their derivations.
 const m=selection?.profile==='business-conditions'?MARKETS[0]:choices.market;
 const rows=[],newWorkspace=selection?.profile==='new-workspace',marketRecords=['model.market.v2','public.census.quickfacts.2020-2024'],operationRecords=['model.operation.v2','public.bls.detroit-wages.2025-05','public.michigan.minimum-wage.2026','public.china-nbs.urban-wages.2025','marketplace.upwork.graphic-design.2026'],conditionRecords=['model.condition.v2'];
 const add=(path,value,records,why)=>rows.push(leaf(path,value,records,why));
 add('ownerHours',o.ownerHours,operationRecords,`Literal ${o.id} operating-model assumption.`);add('ownerTarget',o.ownerTarget,operationRecords,`Literal ${o.id} owner-time target; public wages are context, not calibration.`);add('designers',o.designers,operationRecords,`Literal ${o.id} capacity assumption.`);add('designerHours',o.designerHours,operationRecords,`Literal ${o.id} weekly availability assumption.`);add('designerRate',o.designerRate,operationRecords,`Literal ${o.id} remote-freelancer cost assumption; public employee wages do not calibrate it.`);
 add('overhead',round(m.overhead*o.overheadFactor),[...marketRecords,'model.operation.v2'],`${m.id} modeled overhead ${m.overhead} × ${o.id} scale ${o.overheadFactor}.`);add('acquisition','sales',['model.operation.v2'],'Recipe policy uses active owner outreach rather than automatic inquiries.');add('outreachHours',o.outreachHours,['model.operation.v2'],`Literal ${o.id} weekly outreach assumption.`);add('leadsPerHour',round(o.leadsPerHour*m.outreachFactor*k.outreachFactor),['model.operation.v2','model.market.v2','model.condition.v2'],`${o.id} qualified inquiries/hour ${o.leadsPerHour} × market response ${m.outreachFactor} × condition response ${k.outreachFactor}. Base prior is 6 contacts/hour × 5% contact-to-qualified-inquiry.`);add('conversion',round(Math.max(0,Math.min(1,m.conversion+k.conversionDelta))),[...marketRecords,'model.condition.v2'],`${m.id} qualified-quote acceptance ${m.conversion} + ${k.id} delta ${k.conversionDelta}; not cold-contact conversion.`);
 add('paymentDays',Math.min(90,m.paymentDays+k.paymentDelta),[...marketRecords,'model.condition.v2'],`${m.id} payment-days assumption ${m.paymentDays} + ${k.id} delta ${k.paymentDelta}.`);add('approvalDays',Math.min(30,m.approvalDays+k.approvalDelta),[...marketRecords,'model.condition.v2'],`${m.id} approval-days assumption ${m.approvalDays} + ${k.id} delta ${k.approvalDelta}.`);for(const name of ['printDays','leadDays','retention','repeat','realism'])add(name,k[name],conditionRecords,`Literal ${k.id} ${name} assumption.`);
 const customer=clone(x.mix||m.mix);for(const group of ['food','retail','services'])add(`customerMix.${group}`,customer[group],['model.mix.v2',...marketRecords],`${x.id==='balanced'?m.id:x.id} modeled customer share.`);add('focusType',x.focusType,['model.mix.v2'],`Literal ${x.id} niche focus.`);add('profileStrength',x.profileStrength,['model.mix.v2'],`Literal ${x.id} workflow-variation strength.`);for(const [name,value]of Object.entries(k.disruptions))add(`disruptions.${name}`,newWorkspace?true:value,conditionRecords,`${newWorkspace?'New-workspace realistic baseline enables':'Literal '+k.id} disruption switch.`);for(const [name,value]of Object.entries(k.disruptionRates))add(`disruptionRates.${name}`,value,conditionRecords,`Literal ${k.id} low-confidence disruption probability.`);
 return rows;
}
function compose(selection,base,options={preserveServices:true}){
 const profile=selection?.profile==='new-workspace'?'new-workspace':'business-conditions';
 const chosen=selected(selection),c=clone(base),rows=lineage({...safeSelection(selection),profile}),applied={};for(const row of rows){const parts=row.path.split('.');let target=c;for(const key of parts.slice(0,-1))target=target[key]||(target[key]={});target[parts.at(-1)]=clone(row.value);applied[row.path]=clone(row.value);}
 c.name=base.name;c.seed=base.seed;c.months=base.months;c.startingCash=base.startingCash;c.services=clone(base.services);
 if(base.acquisition==='preset'&&base.fixedInquiriesEntered===undefined&&profile!=='new-workspace')c.fixedInquiriesEntered=true;
 // Keep a bounded snapshot of the commercial inputs carried over from the draft.
 for(const [index,service] of c.services.entries()){
  for(const key of ['id','name','deliverable','price','hours','review','print','weight','audience','recurring','fulfillment','campaign']){
   if(service[key]!==undefined)flatten(service[key],`services.${index}.${key}`,applied);
  }
 }
 c.recipe={profile,catalog:CATALOG.id,version:CATALOG.version,ledger:CATALOG.ledger,ledgerHash:CATALOG.ledgerHash,market:chosen.market.id,operation:chosen.operation.id,mix:chosen.mix.id,condition:chosen.condition.id,applied,appliedHash:fingerprint(applied)};return ENGINE.withCurrentAssumptionRecords(c);
}
function flatten(value,prefix='',out={}){if(value&&typeof value==='object'){if(Array.isArray(value))value.forEach((item,index)=>flatten(item,`${prefix}.${index}`,out));else for(const [key,item]of Object.entries(value))if(key!=='recipe')flatten(item,prefix?`${prefix}.${key}`:key,out);}else if(prefix)out[prefix]=clone(value);return out;}
function newWorkspaceConfig(defaults,mix='balanced'){
 const c=compose({market:'metro',operation:'solo',mix,condition:'steady',profile:'new-workspace'},defaults);
 const all=flatten(c);c.recipe.applied=all;c.recipe.appliedHash=fingerprint(all);return c;
}
function audit(config){
 const recipe=config?.recipe;
 if(!recipe||recipe.catalog!==CATALOG.id||recipe.version!==CATALOG.version||recipe.ledger!==CATALOG.ledger||recipe.ledgerHash!==CATALOG.ledgerHash)return{hasRecipe:Boolean(recipe),compatible:false,empiricallyCalibrated:false,coverage:0,edited:[],lineage:[],limitations:['Recipe provenance is missing or belongs to an unknown catalog/evidence ledger; current records were not substituted silently.']};
 const applied=recipe.applied&&typeof recipe.applied==='object'&&!Array.isArray(recipe.applied)?recipe.applied:{},rows=lineage(recipe),known=new Set(rows.map(v=>v.path)),catalogRecords=new Map(),serviceIndexes=[...new Set(Object.keys(applied).map(path=>/^services\.(\d+)\./.exec(path)?.[1]).filter(value=>value!==undefined))];
 const services=new Map(serviceIndexes.map(index=>[index,{service:serviceFromApplied(applied,index),audit:null,currentIndex:null}]));
 for(const entry of services.values()){entry.audit=SERVICE_CATALOG?.auditService?.(entry.service)||{compatible:false,records:[],derivation:'Service catalog is unavailable.'};for(const record of entry.audit.records||[])catalogRecords.set(record.id,record);}
 const unmatched=new Set((config.services||[]).map((_,index)=>index));for(const entry of services.values()){const candidates=[...unmatched],packageId=entry.service.spec?.packageId;entry.currentIndex=candidates.find(index=>config.services[index]?.id===entry.service.id);if(entry.currentIndex===undefined)entry.currentIndex=candidates.find(index=>{const service=config.services[index];return packageId&&service?.spec?.packageId===packageId&&service?.spec?.catalogId===entry.service.spec?.catalogId;});if(entry.currentIndex!==undefined)unmatched.delete(entry.currentIndex);else entry.currentIndex=null;}
 for(const path of Object.keys(applied))if(!known.has(path)){
  const match=/^services\.(\d+)\.(.+)$/.exec(path),entry=match&&services.get(match[1]);
  if(!entry){rows.push(leaf(path,applied[path],['model.new-workspace.v2'],'Value frozen in the new-workspace applied snapshot; this is a modeled default, not published evidence.'));continue;}
  const serviceId=entry.service.id,records=entry.audit.compatible?(entry.service.spec?.evidenceIds||[]):['model.new-workspace.v2'],derivation=entry.audit.compatible?`Frozen ${entry.service.name} catalog leaf. ${entry.audit.derivation}`:'Frozen custom, legacy, or unknown-catalog service leaf; no current catalog evidence was substituted.';
  const row=leaf(path,applied[path],records,derivation);if(recipe.profile==='business-conditions'){row.kind='inherited-assumption';row.recordIds=[];row.derivation='Carried over from the draft when this recipe was loaded.';}row.serviceId=serviceId;row.catalogId=entry.service.spec?.catalogId||null;row.packageId=entry.service.spec?.packageId||null;row.currentPath=entry.currentIndex===null?null:`services.${entry.currentIndex}.${match[2]}`;rows.push(row);
 }
 // Earlier recipe files omit a service snapshot, so their service edit history is unknown.
 if(recipe.profile||serviceIndexes.length)for(const index of unmatched){const service=config.services[index],serviceAudit=SERVICE_CATALOG?.auditService?.(service),records=serviceAudit?.compatible?(service.spec?.evidenceIds||[]):['model.new-workspace.v2'],row=leaf(`services.added.${index}`,undefined,records,serviceAudit?.compatible?`Current-only ${service.name} catalog instance; it was not present in the applied snapshot. ${serviceAudit.derivation}`:'Current-only custom, legacy, or unknown-catalog service; it was not present in the applied snapshot.');row.serviceId=service.id;row.catalogId=service.spec?.catalogId||null;row.packageId=service.spec?.packageId||null;row.currentPath=`services.${index}`;rows.push(row);for(const record of serviceAudit?.records||[])catalogRecords.set(record.id,record);}
 const edited=[];for(const row of rows){row.appliedValue=clone(applied[row.path]);row.currentValue=row.currentPath===null?undefined:clone(pathValue(config,row.currentPath||row.path));row.edited=!equal(row.currentValue,row.appliedValue);if(row.edited)edited.push(row.path);}const snapshotRows=rows.filter(row=>!row.path.startsWith('services.added.')),covered=snapshotRows.filter(row=>Object.hasOwn(applied,row.path)).length;
 return{hasRecipe:true,compatible:true,catalog:CATALOG.id,ledger:CATALOG.ledger,ledgerHash:CATALOG.ledgerHash,appliedHash:recipe.appliedHash,appliedHashValid:recipe.appliedHash===fingerprint(applied),coverage:snapshotRows.length?covered/snapshotRows.length:0,empiricallyCalibrated:false,modeledAssumptionCount:rows.length,edited,lineage:rows,records:[...EVIDENCE.RECORDS,...catalogRecords.values()],limitations:["No public source measures this studio's qualified inquiries, quote acceptance, revision/reprint behavior, supplier reliability or overseas contractor cost.",'Provider and printer observations bound to service packages are comparables with scope caveats, not guaranteed quotes or market averages.','All recipe-setting values remain low-confidence modeled assumptions until replaced with studio and vendor history.']};
}
function describe(selection){const {market,operation,mix,condition}=selected(selection);return{market,operation,mix,condition,title:`${market.name} · ${operation.name}`,note:`${mix.name} · ${condition.name}. Conditions apply for the full run.`,get evidence(){return audit(compose(selection,{name:'Evidence preview',seed:1,months:1,startingCash:0,services:[]}));}};}
const api={CATALOG,MARKETS,OPERATIONS,MIXES,CONDITIONS,SOURCES,EVIDENCE_RECORDS:EVIDENCE.RECORDS,compose,newWorkspaceConfig,lineage,audit,describeEvidence:audit,describe};root.QQPresets=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
