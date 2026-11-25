'use strict';
const $=s=>{const el=document.querySelector(s);return s==='#root'?patchableRoot(el):el;},esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>QQI18n.language==='zh-CN'?QQI18n.yuan(x||0):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x||0),num=x=>Number(x||0).toFixed(1),pct=x=>Math.round(x*100)+'%';
const icons={map:'M3 3h6v6H3z M15 15h6v6h-6z M15 3h6v6h-6z M6 9v9h9 M9 6h6',box:'M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11',chart:'M4 20V4 M4 20h17 M8 16v-4 M13 16V6 M18 16v-7',compare:'M5 3v18 M19 3v18 M5 7h9l-3-3 M14 7l-3 3 M19 17h-9l3-3 M10 17l3 3',settings:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',play:'M8 5l11 7-11 7z',pause:'M8 5v14 M16 5v14',step:'M5 5l10 7-10 7z M19 5v14',reset:'M4 10a8 8 0 1 1 1 8 M4 4v6h6',branch:'M7 3v14a3 3 0 1 0 3 3 M7 7h7a3 3 0 0 0 3-3 M17 2v4',arrow:'M5 12h14 M14 7l5 5-5 5',plus:'M12 5v14 M5 12h14',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',upload:'M12 16V4 M7 9l5-5 5 5 M4 17v4h16v-4',info:'M12 10v7 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M17 5a4 4 0 0 1 0 8 M19 16a5 5 0 0 1 3 5',user:'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2',close:'M6 6l12 12 M18 6L6 18',clock:'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',check:'M5 12l4 4L20 5',wallet:'M3 6h17v15H3z M3 6V3h14 M15 11h6v5h-6z',file:'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6'};
const icon=k=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[k]||icons.map}"/></svg>`;
const btn=(text,action,cls='',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;

// UI edits live in a separate draft. Only explicit apply actions affect the engine.
const KEY='qq-studio-lab-v1', THEME_KEY='qq-studio-appearance', MOTION_KEY='qq-studio-shard-motion', SETUP_MODE_KEY='qq-studio-setup-mode', PRESET_KEY='qq-studio-preset-selection';
const THEMES = {terminal: 'Terminal', dark: 'Dark'};
const MOTION = {system:'Follow device', animate:'Animate', still:'Still'};
let shardMotion='system';
const shardBackground=document.querySelector('aero-shards');
function applyShardMotion(){shardBackground?.setAttribute?.('motion',shardMotion);}
function syncBackgroundVisibility(){shardBackground?.toggleAttribute?.('suspended',document.hidden);}
document.addEventListener('visibilitychange',syncBackgroundVisibility);
syncBackgroundVisibility();
const RESTAURANT_EXAMPLE='Restaurant studio example', ENTRY_KEY='qq-simulator-setup-chosen';
let setupChoicePending=true,recipeOpen=false,setupCache=null,setupRepairPath=null;
function scenarioName(name){
 return esc(name===RESTAURANT_EXAMPLE||name===QQ.DEFAULT.name?name:QQI18n.literal(name));
}
function serviceCopy(service,key){
 const value=service[key];
 if(QQI18n.language==='en'||typeof value!=='string')return value;
 const original=QQServiceCatalog.SERVICES.find(item=>item.id===service.spec?.packageId || (key==='name'&&item.name===value));
 return original?.[key]===value ? QQI18n.text(value) : value;
}
function serviceName(service){return esc(QQI18n.literal(serviceCopy(service,'name')));}
function restaurantConfig(){return QQPresets.newWorkspaceConfig({...QQ.DEFAULT,name:RESTAURANT_EXAMPLE,fixedInquiriesEntered:false,services:QQServiceCatalog.starterServices()});}
let state=QQ.fresh(restaurantConfig()),saved=[],draft=QQ.clone(state.config),view='setup',stepIndex=0;
let analyticsTab='overview',contractSearch='',contractFilter='all',contractSort='contribution',contractPage=0;
const resultsMonths=new WeakMap();
let comparisonSelection=null;
let cashView={run:null,month:0,page:0};
const SAMPLE_SIZE=20;
let monthSample=null;
const latestCapacityReplay=new WeakMap();
let replayDialog=null,monthJobHistory=null;
let archives=[],checkpointInfo=[],recoveryFiles=[],saveTimer=null,saveNoticeTimer=null,showSavingNotice=false,backend=null,saveWriter=null;
let loading=typeof indexedDB!=='undefined',saveStatus='saved',storeReason='',localRevision=null,primaryReadFailed=false,savePreparationError=null,fallbackPreserved=false;
let inspectorTrail=[],mobileNavOpen=false;
let selection=null,running=false,timer=null,finishTarget=null,runGeneration=0,speed=1,theme='terminal',setupMode='guided',storeError=false,recoveryRaw=null,recoveryReason='';
let filter='active',search='',toastTimer,modalFocus=null,actionFocus=null,expandedService=-1,setupModeChanging=false;
let presetSelection={market:'metro',operation:'solo',mix:'balanced',condition:'steady'},pendingPreset=null,presetUndoDraft=null,pendingEvidence=null;
let catalogGoal='all',catalogAudience='all',pendingCatalogId=null,pendingStarterId=null,serviceUndoDraft=null;
const disclosureState=new Map(),catalogPrices=new Map();
let studioUI={selectedId:null,tab:'idea',section:'offer',phase:'first'},pendingStudioImport=null;
let studioLocal;try{studioLocal=localStorage;}catch(e){}
const studioSession=QQStudioSession.create({local:studioLocal,indexedDB:typeof indexedDB==='undefined'?undefined:indexedDB,seed:()=>{const studio=QQStudio.fresh();for(const item of QQStudioSeeds.EXAMPLES)QQStudio.create(studio,QQStudioSeeds.create(item.id));return studio;},onStatus:()=>updateStudioStatus()});
const jobsSession=QQStudioSession.create({local:studioLocal,indexedDB:typeof indexedDB==='undefined'?undefined:indexedDB,model:QQJobs,label:'Jobs',onStatus:()=>updateJobsStatus()});
const jobsController=QQJobsController.create({session:jobsSession,findIdea:key=>studioSession.ready?studioSession.data.offerings.find(idea=>idea.linkKey===key):null,openWorkspace:()=>{view='jobs';mobileNavOpen=false;},render,toast,modal,closeModal,download,esc,btn,document,local:studioLocal});
const plannerSession=QQStudioSession.create({local:studioLocal,indexedDB:typeof indexedDB==='undefined'?undefined:indexedDB,model:QQPlanner,label:'Planner',seed:()=>QQPlanner.fresh(),onStatus:()=>updatePlannerStatus()});
function linkStudioIdea(idea){
 if(idea.linkKey)return idea;
 const linked=QQStudio.linkIdea(studioSession.data,idea.id);studioSession.changed();return linked;
}
const plannerController=QQPlannerController.create({session:plannerSession,linkIdea:linkStudioIdea,recentHours:key=>jobsSession.ready?QQJobs.recentOwnerHours(jobsSession.data,key):[],ideas:()=>studioSession.ready?studioSession.data.offerings:[],render,toast,modal,closeModal,download,esc,btn,document,local:studioLocal,copyToSimulator});
try{
  setupChoicePending=localStorage.getItem(ENTRY_KEY)!=='true';
  const raw=localStorage.getItem(KEY);localRevision=raw??null;
  if(raw!=null){try{const parsed=MEIQQWorkspace.parseText(raw);retainLegacySource(raw,parsed);installWorkspace(parsed);}catch(e){recoveryRaw=raw;recoveryReason=e.message;storeError=true;saveStatus='error';}}
  const motion = localStorage.getItem(MOTION_KEY);
  if (Object.hasOwn(MOTION,motion)) shardMotion=motion;
  const chosen = localStorage.getItem(THEME_KEY);
  if (Object.hasOwn(THEMES, chosen)) theme = chosen;
  if (chosen === 'light') {
    try { localStorage.setItem(THEME_KEY, theme); }
    catch { /* The default still applies if preferences are read-only. */ }
  }
  const chosenSetupMode=localStorage.getItem(SETUP_MODE_KEY);if(['guided','analyst'].includes(chosenSetupMode))setupMode=chosenSetupMode;
  try{const chosenPreset=JSON.parse(localStorage.getItem(PRESET_KEY));if(chosenPreset&&typeof chosenPreset==='object'){for(const [key,rows]of [['market',QQPresets.MARKETS],['operation',QQPresets.OPERATIONS],['mix',QQPresets.MIXES],['condition',QQPresets.CONDITIONS]])if(rows.some(v=>v.id===chosenPreset[key]))presetSelection[key]=chosenPreset[key];}}catch(e){}
}catch(e){storeError=true;}
document.documentElement.dataset.theme=theme;
applyShardMotion();
QQI18n.syncDocument();
const steps=['Offers','Demand','People','Cash & timing'];
const DISRUPTION_LABELS={rushDeadlines:'Rush-event deadlines',supplierReprints:'Supplier reprints',repeatedRevisions:'Repeated client revisions',extendedLatePayments:'Payments 30–60 days late'};
function disruptionInputs(){
 const helps={rushDeadlines:'Some accepted projects have a shorter event deadline.',supplierReprints:'Some print jobs need another paid print batch and supplier wait.',repeatedRevisions:'Some clients request multiple rounds, consuming design and review time.',extendedLatePayments:'Some final balances arrive 30–60 days after their contractual due date.'};
 return `<section class="advanced"><h3>Real-life disruptions</h3><p class="helper">Each enabled situation can occur on selected projects when uncertainty is on. Frequencies are documented modeling estimates. New agreements lock their settings.</p>${Object.entries(DISRUPTION_LABELS).map(([key,label])=>`<div>${checkbox(label,'disruptions.'+key,draft.disruptions?.[key]||false,helps[key])}${draft.disruptions?.[key]||setupRepairPath==='disruptionRates.'+key?field('Share affected · '+label,key,draft.disruptionRates?.[key]??QQ.DEFAULT.disruptionRates?.[key],{path:'disruptionRates.'+key,percent:true,max:100,suffix:'%',disabled:!draft.realism&&setupRepairPath!=='disruptionRates.'+key,help:!draft.realism||!draft.disruptions?.[key]?'Used only when this disruption is enabled.':'An inferred frequency; adjust as actual project history becomes available.'}):''}</div>`).join('')}</section>`;
}
const WORKFLOW_LANES=[
 {id:'clients',name:'Clients',helper:'Briefs, decisions and payment',icon:'people'},
 {id:'owner',name:'You',helper:'Sales, quality and delivery',icon:'user'},
 {id:'design',name:'China team',helper:'Design and revisions',icon:'people'},
 {id:'supplier',name:'Suppliers',helper:'Printed work only',icon:'box'}
];
const WORKFLOW_STAGES={
 inquiry:{label:'New inquiry',owner:'Client',lane:'clients',order:0,queue:'New requests not yet quoted',wait:'Waiting to enter quote intake',handoff:'Client → You'},
 quote:{label:'Quote intake',owner:'You',lane:'owner',order:1,queue:'Quotes needing owner time',wait:'Waiting for quoting capacity',handoff:'Client brief → You'},
 design:{label:'Create design',owner:'China team',lane:'design',order:2,queue:'Accepted work needing design hours',wait:'Waiting for design capacity',handoff:'You → China team'},
 review:{label:'Review design',owner:'You',lane:'owner',order:3,queue:'Designs awaiting your review',wait:'Waiting for owner review time',handoff:'China team → You'},
 approval:{label:'Client approves',owner:'Client',lane:'clients',order:4,queue:'Designs sent for client approval',wait:'Waiting for a client decision',handoff:'You → Client'},
 production:{label:'Print order',owner:'Supplier',lane:'supplier',order:5,queue:'Approved printed work in production',wait:'Waiting for supplier turnaround',handoff:'Client approval → Supplier'},
 delivery:{label:'Deliver work',owner:'You',lane:'owner',order:6,queue:'Finished work awaiting handoff',wait:'Waiting for owner delivery time',handoff:'Team or supplier → You'},
 payment:{label:'Collect balance',owner:'Client',lane:'clients',order:7,queue:'Delivered work with balance due',wait:'Waiting for client payment',handoff:'You → Client'},
 complete:{label:'Complete',owner:'Complete',lane:'clients',order:8,queue:'Delivered and fully paid',wait:'No wait',handoff:'Payment → Complete'},
 lost:{label:'Declined',owner:'Declined',lane:'clients',order:9,queue:'Quotes not accepted',wait:'No wait',handoff:'Quote → Declined'}
};
const stageOwner=Object.fromEntries(Object.entries(WORKFLOW_STAGES).map(([id,v])=>[id,v.owner]));
const stageNumber=Object.fromEntries(Object.entries(WORKFLOW_STAGES).filter(([,v])=>v.order>0&&v.order<8).map(([id,v])=>[id,v.order]));
const shortLabels=Object.fromEntries(Object.entries(WORKFLOW_STAGES).map(([id,v])=>[id,v.label]));
const businessType=id=>QQ.CUSTOMER_TYPES.find(t=>t.id===id)?.label;
function draftRunConfig(source=draft){
 const services=source.services.filter(s=>!(s.customOffer===true&&s.weight===0));
 return QQ.withCurrentAssumptionRecords(services.length===source.services.length?source:{...source,services});
}
function draftValidationIssues(){
 if(setupCache?.issues)return setupCache.issues;
 const config=draftRunConfig(),issues=QQ.configIssues(config);
 if(config.services!==draft.services){
  for(const issue of issues){
   const match=/^services\.(\d+)(\..*)?$/.exec(issue.path);
   if(match)issue.path='services.'+draft.services.indexOf(config.services[Number(match[1])])+(match[2]||'');
  }
 }
 if(setupCache)setupCache.issues=issues;
 return issues;
}
function dirty(){return JSON.stringify(draftRunConfig())!==JSON.stringify(state.config);}
function currentWorkspace(){
 const files=QQ.clone(recoveryFiles);
 if(recoveryRaw!==null&&!files.some(f=>f.text===recoveryRaw))files.push({name:'Unreadable original save',text:recoveryRaw});
 return {state,saved,draft,checkpointInfo,recoveryFiles:files};
}
function retainLegacySource(raw,workspace){
 const source=JSON.parse(raw);
 const runs=source?.format==='meiqq-workspace'&&source.version===3?source.runs:[source?.state,...(source?.saved||[])];
 if(Array.isArray(runs)&&runs.some(run=>run?.version<3)&&!workspace.recoveryFiles.some(file=>file.text===raw)){
  workspace.recoveryFiles.push({name:'Original save before migration',text:raw});
 }
}
function installWorkspace(data){
 state=data.state;saved=data.saved;draft=data.draft;checkpointInfo=data.checkpointInfo;comparisonSelection=null;
 serviceUndoDraft=null;presetUndoDraft=null;
 recoveryFiles=data.recoveryFiles;archives=data.archives||[];recipeOpen=false;
 if(state.config.name!==RESTAURANT_EXAMPLE||state.day||saved.length||archives.length||dirty())setupChoicePending=false;
 view=state.day&&!dirty()?'map':'setup';
}
function saveLabel(){return loading?'Opening saved workspace…':recoveryRaw!==null?'Original save kept; changes in this tab are not saved.':storeError?(storeReason||'Changes are not saved. Download a backup before closing.'):saveStatus==='pending'?'Unsaved draft changes…':saveStatus==='saving'?'Saving workspace…':'Workspace saved in this browser.';}
function showSaveStatus(){return loading||recoveryRaw===null&&(storeError||saveStatus==='pending'||saveStatus==='saving'&&showSavingNotice);}
function updateSaveStatus(){const el=$('#save-status');if(el){el.textContent=QQI18n.text(saveLabel());el.className='save-status '+(storeError?'negative':'');el.hidden=!showSaveStatus();}}
function persistenceStatus(status,error){
 clearTimeout(saveNoticeTimer);saveNoticeTimer=null;showSavingNotice=false;
 if(savePreparationError){status='error';error=savePreparationError;}
 storeReason=error?.code==='STALE_WORKSPACE'?'Another MEIQQ window saved changes. Back up this window before reopening.':'';
 saveStatus=status==='saved'&&saveTimer!==null?'pending':status;storeError=status==='error';updateSaveStatus();
 if(saveStatus==='saving')saveNoticeTimer=setTimeout(()=>{if(saveStatus==='saving'){showSavingNotice=true;updateSaveStatus();}},500);
}
function save(){
 clearTimeout(saveTimer);saveTimer=null;
 if(loading||recoveryRaw!==null||primaryReadFailed){updateSaveStatus();return;}
 try{
  const text=MEIQQWorkspace.serialize(currentWorkspace(),archives);
  savePreparationError=null;
  if(saveWriter)saveWriter.push(text);
  else {if((localStorage.getItem(KEY)??null)!==localRevision){const e=Error('Another window changed this workspace.');e.code='STALE_WORKSPACE';throw e;}localStorage.setItem(KEY,text);localRevision=text;persistenceStatus('saved');}
 }catch(e){savePreparationError=e;persistenceStatus('error',e);}
}
function scheduleSave(){clearTimeout(saveTimer);saveStatus='pending';updateSaveStatus();saveTimer=setTimeout(save,300);}
async function initializeStorage(){
 if(!loading){updateSaveStatus();return;}
 try{
  const localFingerprint=await MEIQQStorage.fingerprint(localRevision);
  backend=await MEIQQStorage.connect(indexedDB,KEY);
  if(backend.raw!==undefined){
   try{
    const primary=MEIQQWorkspace.parseText(backend.raw);retainLegacySource(backend.raw,primary);
    const {state:run,saved:checkpoints,draft:setup,checkpointInfo:info,recoveryFiles:files}=primary;
    const current={state:run,saved:checkpoints,draft:setup,checkpointInfo:info,recoveryFiles:files};
    // The legacy/fallback store may contain newer work from an outage. Its age
    // cannot be inferred safely, so preserve both instead of dropping one.
    const combined=primary.archives;
    if(localRevision!==null&&localRevision!==backend.raw&&(!localFingerprint||localFingerprint!==backend.fallbackFingerprint)){
     for(const a of archives)MEIQQWorkspace.archive(combined,a.workspace,a.label);
     if(JSON.stringify(currentWorkspace())!==JSON.stringify(current)){
      MEIQQWorkspace.archive(combined,currentWorkspace(),'Browser fallback · '+state.config.name+' · day '+state.day);
      fallbackPreserved=true;
     }
    }
    installWorkspace({...primary,archives:combined});recoveryRaw=null;recoveryReason='';storeError=false;
   }catch(e){
    if(recoveryRaw!==null&&recoveryRaw!==backend.raw)recoveryFiles.push({name:'Unreadable fallback save',text:recoveryRaw});
    recoveryRaw=backend.raw;recoveryReason=e.message;storeError=true;
   }
  }
  saveWriter=MEIQQStorage.writer(text=>backend.write(text,localFingerprint),persistenceStatus);
 }catch(e){
  backend=null;
  if(e.code==='STORAGE_READ_FAILED'){
   primaryReadFailed=true;storeError=true;saveStatus='error';
   storeReason='Your primary save could not be read. Back up this session and reopen the app before continuing; browser saving is disabled.';
  }
 }
 loading=false;render();save();
}
function archiveCurrent(label){MEIQQWorkspace.archive(archives,currentWorkspace(),label);}
function openImportedWorkspace(data){
 const nextArchives=QQ.clone(archives);
 for(const a of data.archives||[])MEIQQWorkspace.archive(nextArchives,a.workspace,a.label);
 MEIQQWorkspace.archive(nextArchives,currentWorkspace());
 MEIQQWorkspace.serialize(data,nextArchives);
 installWorkspace({...data,archives:nextArchives});recoveryRaw=null;selection=null;
}

function stop(){runGeneration++;clearInterval(timer);clearTimeout(timer);timer=null;finishTarget=null;running=false;}
function copyToSimulator(prepared){
 if(loading)throw Error('Wait for the simulator workspace to finish opening.');
 if(storeError||recoveryRaw!==null||primaryReadFailed)throw Error('The simulator cannot save safely right now. Back it up and resolve its save warning before copying a plan.');
 const nextArchives=QQ.clone(archives),nextFiles=QQ.clone(recoveryFiles);
 MEIQQWorkspace.archive(nextArchives,currentWorkspace(),'Before planner copy · '+state.config.name+' · day '+state.day);
 nextFiles.push({name:'Planner source · '+prepared.record.date+' · '+(prepared.record.plan.name||'Untitled plan').slice(0,100),text:JSON.stringify(prepared.record,null,2)});
 const next={...currentWorkspace(),draft:prepared.config,recoveryFiles:nextFiles};
 MEIQQWorkspace.serialize(next,nextArchives);
 stop();archives=nextArchives;recoveryFiles=nextFiles;draft=QQ.clone(prepared.config);presetUndoDraft=null;serviceUndoDraft=null;view='setup';stepIndex=0;closeModal();save();render();toast('Plan copied to a simulator draft. Your previous workspace is preserved in Runs & backups. Review setup before applying.');
}
function toast(message){clearTimeout(toastTimer);$('#toast').className='toast';$('#toast').textContent=QQI18n.text(message);toastTimer=setTimeout(()=>{$('#toast').className='';$('#toast').textContent='';},4500);}
function badge(text,kind=''){return `<span class="badge ${kind}">${esc(text)}</span>`;}
function metric(label,value,note,kind=''){return `<div class="metric ${kind}"><label>${label}</label><strong>${value}</strong><small>${note}</small></div>`;}
function title(){return {planner:'Studio capacity and earnings',jobs:'Jobs',studio:'Studio workbench',setup:'Set up your business',map:'Watch the work move',projects:'Find a project',finances:'Scenario results',scenarios:'Runs and backups',about:'How this model works'}[view];}
function languagePicker() {
 const selected = QQI18n.language;
 const info=selected==='zh-CN'?`<details class="currency-info" data-disclosure="currency-rate"><summary>人民币 ¥</summary><p>${QQI18n.rateNote}</p></details>`:'';
 return `<div class="language-tools" translate="no"><label class="theme-picker language-picker"><span>Language / 语言</span><select id="language" aria-label="Language / 语言"><option value="en"${selected === 'en' ? ' selected' : ''}>English</option><option value="zh-CN"${selected === 'zh-CN' ? ' selected' : ''}>简体中文</option></select></label>${info}</div>`;
}
function appearancePicker() {
 const options = Object.entries(THEMES).map(([value, label]) =>
   `<option value="${value}"${theme === value ? ' selected' : ''}>${label}</option>`
 ).join('');
 const motionOptions=Object.entries(MOTION).map(([key,label])=>`<option value="${key}"${shardMotion===key?' selected':''}>${label}</option>`).join('');
 return `<label class="theme-picker"><span>Appearance</span><select id="appearance" aria-label="Appearance">${options}</select></label><label class="theme-picker motion-picker"><span>Background motion</span><select id="shard-motion" aria-label="Background motion">${motionOptions}</select></label><button type="button" class="small" data-edit-sky>Edit sky</button>`;
}
function workspaceHeading(simulator = false) {
 const actions = simulator && dirty() && view !== 'setup'
   ? `<div class="heading-actions"><span class="draft-indicator">Setup changes pending</span>${btn('Review setup','view','small','data-view="setup"')}</div>`
   : '';
 return `<div class="heading workspace-heading"><h1${simulator ? ' id="sim-heading" tabindex="-1"' : ''}>${title()}</h1>${actions}</div>`;
}
function sidebar(){return `<aside class="sidebar"><div class="brand"><div class="brandmark" aria-hidden="true">M</div><span>MEIQQ</span></div><div class="subbrand">STUDIO & SIMULATOR</div>${btn('Navigate','mobile-nav','nav-toggle',`aria-expanded="${mobileNavOpen}" aria-controls="main-navigation"`)}<nav id="main-navigation"><div role="group" aria-label="Studio"><div class="navlabel">STUDIO</div>${[['studio','box','Ideas'],['planner','chart','Planner'],['jobs','file','Jobs']].map(([v,i,n])=>btn(icon(i)+`<span>${n}</span>`,'view','navbutton '+(view===v?'active':''),`data-view="${v}" title="${n}" aria-label="${n}"`)).join('')}</div><div role="group" aria-label="Simulator"><div class="navlabel">SIMULATOR</div>${[['setup','settings','1. Set up'],['map','map','2. Run scenario'],['finances','chart','3. Review results'],['projects','file','Projects'],['scenarios','compare','Runs & backups'],['about','info','Model guide']].map(([v,i,n])=>btn(icon(i)+`<span>${n}</span>`,'view','navbutton '+(view===v?'active':''),`data-view="${v}" title="${n}" aria-label="${n}"`)).join('')}</div></nav></aside>`;}
function jobsStatusLabel(){return jobsSession.status==='opening'?'Opening jobs…':jobsSession.status==='error'?jobsSession.error+' Download a Jobs backup to keep this session.':jobsSession.status==='pending'?'Saving your latest job edits…':jobsSession.status==='saving'?'Saving jobs…':'Jobs saved in this browser · use Jobs backup for a portable copy.';}
function updateJobsStatus(){const el=$('#jobs-save-status');if(el){el.textContent=QQI18n.text(jobsStatusLabel());el.className='save-status '+(jobsSession.status==='error'?'negative':'');}}
function plannerStatusLabel(){return plannerSession.status==='opening'?'Opening planner…':plannerSession.status==='error'?plannerSession.error+' Download a Planner backup to keep this session.':plannerSession.status==='pending'?'Saving your latest planning edits…':plannerSession.status==='saving'?'Saving planner…':'Planner saved in this browser · use Planner backup for a portable copy.';}
function updatePlannerStatus(){const el=$('#planner-save-status');if(el){el.textContent=QQI18n.text(plannerStatusLabel());el.className='save-status '+(plannerSession.status==='error'?'negative':'');}}
function renderPlannerShell(){
 $('#root').innerHTML=`<div class="app planner-app">${sidebar()}<div class="shell"><header class="topbar"><div class="crumb"><b>Studio workspace</b></div>${languagePicker()}<div class="topactions">${appearancePicker()}${btn(icon('download')+'Planner backup','planner-backup','small')}${btn(icon('upload')+'Import plans','planner-import','small')}</div></header><div id="planner-save-status" class="save-status ${plannerSession.status==='error'?'negative':''}" role="status" aria-live="polite">${esc(plannerStatusLabel())}</div><main class="workspace" data-render-key="workspace">${workspaceHeading()}${plannerSession.originals.length?`<div class="banner warn">Original saves are preserved. ${plannerSession.originals.map((v,i)=>btn('Download '+esc(v.label),'planner-original','small',`data-index="${i}"`)).join('')}</div>`:''}${plannerSession.ready?plannerController.render():'<p>Opening your locally saved plans…</p>'}</main></div></div>`;
 $('#root').inert=Boolean($('#modal').firstChild);
}
function renderJobsShell(){
 $('#root').innerHTML=`<div class="app jobs-app">${sidebar()}<div class="shell"><header class="topbar"><div class="crumb"><b>Studio workspace</b></div>${languagePicker()}<div class="topactions">${appearancePicker()}${btn(icon('download')+'Jobs backup','jobs-backup','small')}${btn(icon('upload')+'Import jobs','jobs-import','small')}</div></header><div id="jobs-save-status" class="save-status ${jobsSession.status==='error'?'negative':''}" role="status" aria-live="polite">${esc(jobsStatusLabel())}</div><main class="workspace" data-render-key="workspace">${workspaceHeading()}${jobsSession.originals.length?`<div class="banner warn">Original saves are preserved. ${jobsSession.originals.map((v,i)=>btn('Download '+esc(v.label),'jobs-original','small',`data-index="${i}"`)).join('')}</div>`:''}${jobsSession.ready?jobsController.render():'<p>Opening your locally saved jobs…</p>'}</main></div></div>`;
 $('#root').inert=Boolean($('#modal').firstChild);
}
function studioStatusLabel(){return studioSession.status==='opening'?'Opening Studio ideas…':studioSession.status==='error'?studioSession.error+' Download a Studio backup to keep this session.':studioSession.status==='pending'?'Saving your latest idea edits…':studioSession.status==='saving'?'Saving Studio ideas…':'Studio ideas saved in this browser · use Studio backup for a portable copy.';}
function updateStudioStatus(){
 const label=QQI18n.text(studioStatusLabel()),error=document.querySelector('#studio-save-error'),detail=document.querySelector('#studio-save-status');
 if(error){error.hidden=studioSession.status!=='error';error.textContent=error.hidden?'':label;}
 if(detail)detail.textContent=label;
}
function renderStudioShell(){
 const data=studioSession.data,failed=studioSession.status==='error';
 const options=`<details class="workspace-options" data-disclosure="studio-workspace-options"><summary>Workspace options</summary><div class="topactions">${appearancePicker()}${btn(icon('download')+'Studio backup','studio-backup','small')}${btn(icon('upload')+'Import ideas','studio-import','small')}<small id="studio-save-status" role="status">${esc(studioStatusLabel())}</small></div></details>`;
 $('#root').innerHTML=`<div class="app studio-app">${sidebar()}<div class="shell"><header class="topbar"><div class="crumb"><b>Studio workbench</b></div>${languagePicker()}${options}</header>
 <div id="studio-save-error" class="save-status negative" role="alert" ${failed?'':'hidden'}>${failed?esc(studioStatusLabel()):''}</div><main class="workspace" data-render-key="workspace">${studioSession.originals.length?`<div class="banner warn">Original saves are preserved. ${studioSession.originals.map((v,i)=>btn('Download '+esc(v.label),'studio-original','small',`data-index="${i}"`)).join('')}</div>`:''}${studioSession.ready?QQStudioView.render(data,studioUI):'<p>Opening your locally saved ideas…</p>'}</main></div></div>`;
 $('#root').inert=Boolean($('#modal').firstChild);
}
function handleStudioInput(el){
 if(!el.dataset?.studioField||!studioSession.ready)return;
 try{QQStudio.setField(studioSession.data,el.dataset.ideaId,el.dataset.studioField,QQI18n.inputValue(el));studioSession.changed();render();}catch(e){toast(e.message);}
}
function importStudioFile(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>QQStudio.MAX_BYTES)throw Error('Choose a Studio backup smaller than 8 MiB.');pendingStudioImport=QQStudio.parseText(await file.text());modal(`<h2 id="dialog-title">Add these saved ideas?</h2><p>Add ${pendingStudioImport.offerings.length} ideas from this Studio backup as new copies. Your current ideas stay in place. Simulator backups open from the simulator workspace.</p><div class="actions">${btn('Cancel','close')}${btn('Add ideas','studio-confirm-import','primary')}</div>`);}catch(e){toast(e.message||'The Studio backup could not be opened.');}};input.click();
}
function handleStudioAction(a,el){
 if(!studioSession.ready)throw Error('Studio ideas are still opening. Wait for the saved ideas before downloading or editing.');
 if(a==='studio-backup'){download('MEIQQ-Studio-Ideas.json',QQStudio.serialize(studioSession.data));toast('Studio backup download requested. This contains ideas and research; simulator runs have their own backup.');return;}
 if(a==='studio-original'){const file=studioSession.originals[Number(el.dataset.index)];if(file)download('MEIQQ-Studio-Preserved-'+el.dataset.index+'.json',file.text);return;}
 let changed=false,focusAfter=null;const id=el.dataset.id||studioUI.selectedId,idea=studioSession.data.offerings.find(v=>v.id===id);
 if(a==='studio-job'){
  if(!idea)throw Error('Select an idea first.');
  const job=jobsController.startFromIdea(linkStudioIdea(idea));
  view='jobs';mobileNavOpen=false;render();
  const client=$('#jobs-'+job.id+'-draft-client');client?.focus();return;
 }
 if(a==='studio-plan'){if(!idea)throw Error('Select an idea first.');plannerController.planIdea(idea);view='planner';render();plannerController.focusService('quantity');return;}
 if(a==='studio-select'){
  if(!idea)throw Error('Select an idea first.');
  view='studio';mobileNavOpen=false;studioUI.selectedId=id;studioUI.tab='idea';studioUI.section='offer';
  disclosureState.delete('studio-details-'+id);focusAfter='#studio-heading';
 }else if(a==='studio-tab'){
  studioUI.tab=el.dataset.tab==='compare'?'compare':'idea';studioUI.selectedId=null;
  focusAfter=studioUI.tab==='compare'?'#studio-heading':id?'#studio-select-'+id:'#studio-compare';
 }else if(a==='studio-section'){
  const previous=studioUI.section;
  studioUI.section=['numbers','research'].includes(el.dataset.section)?el.dataset.section:'offer';
  focusAfter=studioUI.section==='offer'?'#studio-go-'+previous:'#studio-heading';
 }
 else if(a==='studio-phase')studioUI.phase=el.dataset.phase==='repeat'?'repeat':'first';
 else if(a==='studio-add'||a==='studio-example'||a==='studio-duplicate'){
  const created=a==='studio-duplicate'?QQStudio.duplicate(studioSession.data,id):QQStudio.create(studioSession.data,a==='studio-example'?QQStudioSeeds.create(el.dataset.id):{});
  studioUI={...studioUI,selectedId:created.id,tab:'idea',section:'offer'};changed=true;
  focusAfter=a==='studio-add'?'[data-studio-field="name"]':'#studio-heading';
 }else if(a==='studio-delete'){
  if(!idea)throw Error('Select an idea first.');
  modal(`<h2 id="dialog-title">Delete this idea?</h2><p>Remove ${esc(idea.name||'Untitled idea')} from this browser. Existing downloaded backups keep their copy.</p><div class="actions">${btn('Cancel','close')}${btn('Delete idea','studio-confirm-delete','primary',`data-id="${esc(id)}"`)}</div>`);return;
 }else if(a==='studio-confirm-delete'){QQStudio.remove(studioSession.data,id);studioUI.selectedId=null;changed=true;closeModal();focusAfter='#studio-heading';}
 else if(a==='studio-role-add'){if(!idea)throw Error('Select an idea first.');QQStudio.update(studioSession.data,id,{roles:[...idea.roles,{name:'',hours:'',setupHours:'',rate:''}]});changed=true;}
 else if(a==='studio-role-remove'){if(!idea)throw Error('Select an idea first.');QQStudio.update(studioSession.data,id,{roles:idea.roles.filter((v,i)=>i!==Number(el.dataset.index))});changed=true;}
 else if(a==='studio-import'){importStudioFile();return;}
 else if(a==='studio-confirm-import'){if(!pendingStudioImport)throw Error('Choose a Studio backup first.');const count=studioSession.merge(pendingStudioImport);pendingStudioImport=null;closeModal();toast(count+' saved ideas added as new copies.');}
 if(changed)studioSession.changed();render();
 if(focusAfter)document.querySelector(focusAfter)?.focus();
}
function renderKey(node){
 if(node?.nodeType!==1)return null;
 if(node.id)return 'id:'+node.id;
 for(const name of ['data-render-key','data-input','data-disclosure'])if(node.hasAttribute(name))return name+':'+node.getAttribute(name);
 if(node.hasAttribute('data-action')){
  const parts=['data-action','data-id','data-index','data-view','data-step','data-mode','data-kind','data-tab','data-type','data-entry-id','data-delta'].map(name=>node.getAttribute(name)||'');
  return 'action:'+parts.join(':');
 }
 return null;
}
function sameRenderNode(current,next){return current?.nodeType===next?.nodeType&&(current.nodeType!==1||current.localName===next.localName);}
function patchRenderNode(current,next){
 if(current.nodeType===3||current.nodeType===8){if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;return;}
 for(const attr of [...current.attributes])if(!next.hasAttribute(attr.name))current.removeAttribute(attr.name);
 for(const attr of [...next.attributes])if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
 patchRenderChildren(current,next);
 if(current.localName==='input'){
  if(document.activeElement!==current&&current.value!==next.value)current.value=next.value;
  current.checked=next.checked;
 }
 if(current.localName==='textarea'&&document.activeElement!==current&&current.value!==next.value)current.value=next.value;
 if(current.localName==='select'&&current.value!==next.value)current.value=next.value;
 if(current.localName==='details')current.open=next.open;
}
function patchRenderChildren(current,next){
 let cursor=current.firstChild;
 for(const nextChild of [...next.childNodes]){
  const key=renderKey(nextChild);let match=null;
  if(key){for(let candidate=cursor;candidate;candidate=candidate.nextSibling)if(renderKey(candidate)===key&&sameRenderNode(candidate,nextChild)){match=candidate;break;}}
  else if(cursor&&!renderKey(cursor)&&sameRenderNode(cursor,nextChild))match=cursor;
  if(!match){match=nextChild.cloneNode(true);current.insertBefore(match,cursor);}
  else {if(match!==cursor)current.insertBefore(match,cursor);patchRenderNode(match,nextChild);}
  cursor=match.nextSibling;
 }
 while(cursor){const stale=cursor;cursor=cursor.nextSibling;stale.remove();}
}
function patchableRoot(root){
 if(!root?.nodeType||typeof Proxy==='undefined')return root;
 return new Proxy(root,{get:(target,property)=>Reflect.get(target,property,target),set(target,property,value){
  if(property==='innerHTML'){
   const template=document.createElement('template');template.innerHTML=value;
   QQI18n.localize(template.content);
   patchRenderChildren(target,template.content);return true;
  }
  return Reflect.set(target,property,value,target);
 }});
}
function focusKey(el){
 if(!el)return null;
 if(el.id)return {domId:el.id};
 if(el.dataset?.input)return {input:el.dataset.input};
 if(el.dataset?.action)return {action:el.dataset.action,...el.dataset};
 return null;
}
function restoreFocus(key,scroll=false){
 if(!key)return;
 const candidates=document.querySelectorAll('#root [id], #root [data-input], #root [data-action]');
 const el=[...candidates].find(el=>key.domId?el.id===key.domId:Object.entries(key).every(([k,v])=>el.dataset?.[k]===v));
 el?.focus({preventScroll:!scroll});
 return Boolean(el);
}
function render(){
  const focus=focusKey(document.activeElement);
  for(const el of document.querySelectorAll('#root details[data-disclosure]'))if(!setupModeChanging)disclosureState.set(el.dataset.disclosure,el.open);
  if(view==='studio'||view==='jobs'||view==='planner'){if(view==='planner')renderPlannerShell();else if(view==='jobs')renderJobsShell();else renderStudioShell();for(const el of document.querySelectorAll('#root details[data-disclosure]'))if(disclosureState.has(el.dataset.disclosure))el.open=disclosureState.get(el.dataset.disclosure);if(!$('#root').inert)restoreFocus(focus);return;}
  const m=QQ.metrics(state);
  setupCache=view==='setup'?{}:null;
  $('#root').innerHTML=`<div class="app simulator-app ${running?'running':''}" data-screen="${view}">${sidebar()}<div class="shell"><header class="topbar"><div class="crumb"><b>${view==='setup'?'Simulator':scenarioName(state.config.name)}</b></div>${languagePicker()}<details class="workspace-options" data-disclosure="workspace-options"><summary>Workspace options</summary><div class="topactions">${appearancePicker()}${btn(icon('download')+'Backup','backup','small')}${btn(icon('upload')+'Open backup','import','small')}${view!=='setup'?btn(icon('branch')+'Branch scenario','branch','small'):''}</div></details></header><div id="save-status" class="save-status ${storeError?'negative':''}" role="status" aria-live="polite" ${showSaveStatus()?'':'hidden'}>${esc(saveLabel())}</div><main class="workspace" data-render-key="workspace">${workspaceHeading(true)}${recoveryRaw!==null?`<div class="banner danger"><b>Saved workspace needs recovery.</b> ${esc(recoveryReason||'The file could not be validated.')} The original is intact; changes here will not save. ${btn('Download original save','recover','small')} ${btn('Open another backup','import','small')}</div>`:''}${fallbackPreserved?`<div class="banner warn">A different browser-local save has been preserved under Runs & backups. Compare it with this run before continuing. ${btn('View preserved workspaces','view','small','data-view="scenarios"')}</div>`:''}${state.blocked&&view!=='map'?`<div class="banner warn"><b>Cash shortfall paused the run.</b> ${esc(state.blocked.note)} · ${offerAmount(state.blocked.gap)} needed. ${btn('Resolve shortfall','cash','small')}</div>`:''}${view==='setup'?setupView():view==='map'?mapView(m):view==='projects'?projectsView():view==='finances'?financeView(m):view==='scenarios'?scenariosView():aboutView()}</main>${view==='map'?clock():''}</div></div>`;
  for(const el of document.querySelectorAll('#root details[data-disclosure]'))if(setupMode==='analyst'&&el.dataset.disclosure.startsWith('setup-advanced-'))el.open=true;else if(disclosureState.has(el.dataset.disclosure))el.open=disclosureState.get(el.dataset.disclosure);
  $('#root').inert=Boolean($('#modal').firstChild);
  if(!$('#root').inert)restoreFocus(focus);
  setupCache=null;
  setupModeChanging=false;
}
function issueText(issue){
 if(!issue)return '';
 const percent=['conversion','deposit','retention','repeat'].includes(issue.path)||issue.path.startsWith('disruptionRates.')||issue.path.endsWith('.fulfillment.managedShare');
 return percent?issue.message.replace(/between 0 and 1(?=\D|$)/g,'between 0% and 100%'):issue.message;
}
function field(label,key,value,options={}){
 const path=options.path||key,id='input-'+path.replace(/\./g,'-');const suffix=options.suffix||'';
 const awaitingEntry=setupMode==='guided'&&path.startsWith('services.')&&(value==null||value===''||value==='choose')&&setupRepairPath!==path;
 const issue=awaitingEntry?null:draftValidationIssues().find(v=>v.path===path||path.startsWith('customerMix.')&&v.path==='customerMix');
 const attrs=`data-input="${esc(path)}"${QQI18n.moneyField(suffix)} ${options.percent?'data-percent="true"':''} id="${id}"`,invalid=issue?'aria-invalid="true" aria-describedby="error-'+id+'"':'';
 return `<div class="input-field"><label for="${id}">${label}</label>${options.options?`<select ${attrs} ${invalid}>${options.options.map(([v,n])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${n==='Monthly subscription'?'Paid-cycle subscription':n}</option>`).join('')}</select>`:`<div class="input-wrap"><input ${attrs} type="${options.text?'text':'number'}" value="${esc(value==null?'':options.percent?QQ.round(value*100):value)}" ${invalid} ${options.text?`maxlength="${options.maxlength||100}"`:`min="${options.min??0}" max="${options.max??1000000}" step="${options.step??1}"`} ${options.disabled?'disabled':''}>${suffix?`<span>${suffix}</span>`:''}</div>`}<small>${options.help||(key==='recurring'?'New repeat campaigns are quoted and paid separately.':' ')}</small><span class="field-error" id="error-${id}" aria-live="polite">${issue?esc(issueText(issue)):''}</span></div>`;
}
function checkbox(label,path,value,help=''){return `<label class="checkrow"><input type="checkbox" data-input="${path}" ${(path.startsWith('uncertainty.')||path.startsWith('disruptions.'))&&!draft.realism?'disabled':''} ${value?'checked':''}><span><b>${label}</b>${help?`<small>${help}</small>`:''}</span></label>`;}
function advancedBlock(id,label,html){return `<details class="guided-options" data-disclosure="setup-advanced-${id}" ${setupMode==='analyst'?'open':''}><summary>${label}</summary><div class="advanced-body">${html}</div></details>`;}
function presetSelect(id,label,rows,value){return `<label><span>${label}</span><select id="preset-${id}" aria-label="${label}">${rows.map(v=>`<option value="${v.id}" ${v.id===value?'selected':''}>${esc(v.name)}</option>`).join('')}</select></label>`;}
function recipeEvidenceDialog(scope='recipe'){
 const candidate=scope==='draft'?QQ.clone(draft):QQPresets.compose(presetSelection,draft,{preserveServices:true}),audit=QQPresets.audit(candidate);pendingEvidence={configuration:candidate,audit,ledger:QQPresetEvidence.LEDGER};
 const sources=(audit.records||[]).filter(v=>typeof v.url==='string'&&v.url.startsWith('https://'));
 const links=sources.length?`<details class="preset-sources"><summary>Published comparisons and context</summary><ul>${sources.map(v=>`<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a><small>${esc(v.scope||v.caveat||'')}</small></li>`).join('')}</ul></details>`:'';
 const recipe=`<p>${esc((audit.limitations||[]).join(' '))}</p><div class="tablewrap"><table><thead><tr><th>Assumption</th><th>Recipe value</th>${scope==='draft'?'<th>Current draft</th>':''}<th>Basis and derivation</th></tr></thead><tbody>${audit.lineage.map(row=>`<tr><td>${esc(row.path)}</td><td>${esc(formatDiffValue(row.path,row.value))}</td>${scope==='draft'?'<td>'+esc(row.currentValue&&typeof row.currentValue==='object'?row.currentValue.name:formatDiffValue(row.path,row.currentValue))+'</td>':''}<td>${row.edited?'Edited since the recipe · ':row.kind==='inherited-assumption'?'From your existing draft · ':''}${esc(row.kind)} · ${esc(row.confidence)} confidence<small>${esc(row.derivation)}</small><small>Records: ${esc(row.recordIds.join(', '))}</small></td></tr>`).join('')}</tbody></table></div>${links}`;
 const body=scope==='draft'?currentAssumptionSources()+`<details class="preset-sources"><summary>Original recipe and published comparisons</summary>${recipe}</details>`:recipe;
 modal(`<h2 id="dialog-title">${scope==='draft'?'Current assumption sources':'Values, sources and derivations'}</h2>${body}<div class="actions">${btn('Close','close')}${btn('Download evidence record','download-evidence','primary')}</div>`);
}
function presetWorkbench(){
 const info=QQPresets.describe(presetSelection),candidate=QQPresets.compose(presetSelection,draft);
 const changes=configDiff(draft,candidate);
 const controls=`<div class="preset-grid">${presetSelect('market','Market context',QQPresets.MARKETS,presetSelection.market)}${presetSelect('operation','Operating model',QQPresets.OPERATIONS,presetSelection.operation)}${presetSelect('mix','Customer mix',QQPresets.MIXES,presetSelection.mix)}${presetSelect('condition','Business conditions',QQPresets.CONDITIONS,presetSelection.condition)}</div>`;
 const preview=changes.length?`<ul class="change-list">${changes.slice(0,5).map(v=>`<li>${esc(v.label)} · ${esc(v.before)} → <b>${esc(v.after)}</b></li>`).join('')}</ul>${changes.length>5?`<p class="helper">${changes.length-5} more changes in review.</p>`:''}`:'<p class="helper">The proposed values match this draft.</p>';
 const sameOrigin=draft.recipe?.profile===candidate.recipe.profile&&['market','operation','mix','condition'].every(k=>draft.recipe[k]===candidate.recipe[k]);
 return `<section id="recipe-panel" class="panel preset-workbench" aria-labelledby="preset-title"><div class="preset-heading"><div><h2 id="preset-title">Try a scenario</h2><p>Market sets the location label. Operating model, customer mix and business conditions supply editable example values for the full run.</p></div></div><div class="preset-body">${controls}<div><b>${esc(info.title)}</b>${preview}</div><div class="actions">${btn('Inspect recipe sources','recipe-evidence','small')}${btn('Review proposed changes','apply-preset','soft',!changes.length&&sameOrigin?'disabled':'')}</div></div></section>`;
}
function firstExamplePending(){
 return setupChoicePending&&!state.day&&!saved.length&&!archives.length&&!recoveryFiles.length&&recoveryRaw===null&&state.config.name===RESTAURANT_EXAMPLE&&!dirty();
}
function setupNeedsChoice(){return view==='setup'&&!stepIndex&&firstExamplePending();}
function inputBasis(path,fallback='Scenario input'){
 const record=draft.assumptionRecords?.[path];
 if(record&&record.value===QQ.assumptionRecordValue(draft,path))return 'Your records · '+esc(QQI18n.literal(record.source))+' · '+esc(record.date)+' · '+esc(QQI18n.literal(record.sample));
 const applied=draft.recipe?.applied;
 if(!applied||!Object.hasOwn(applied,path))return esc(fallback);
 return applied[path]===draft[path]?'Example estimate':'Your estimate';
}
function recordOptions(group,id){
 const fields=QQ.ASSUMPTION_FIELDS[group];
 if(!fields)return [];
 const prefix=group==='service'?'services.'+id+'.':'';
 return Object.entries(fields).map(([key,label])=>({path:prefix+key,label})).filter(({path})=>Number.isFinite(QQ.assumptionRecordValue(draft,path)));
}
function serviceInputBasis(service,key){
 const original=QQServiceCatalog.SERVICES.find(s=>service.spec?.catalogId===QQServiceCatalog.CATALOG.id&&service.spec?.version===1&&s.id===service.spec.packageId);
 const path='services.'+service.id+'.'+key,value=QQ.assumptionRecordValue(draft,path);
 if(!Number.isFinite(value))return 'Enter an estimate';
 const example=key.split('.').reduce((v,k)=>v?.[k],original);
 return inputBasis(path,example===value?'Example estimate':'Your estimate');
}
function currentAssumptionSources(){
 const fields=['demand','people','cash'].flatMap(group=>recordOptions(group));
 for(const service of draft.services){
  for(const field of recordOptions('service',service.id)){
   fields.push({...field,label:(service.name||'New service')+' · '+field.label,basis:serviceInputBasis(service,field.path.slice(('services.'+service.id+'.').length))});
  }
 }
 const recorded=[],estimates=[];
 for(const {path,label,basis} of fields){
  const value=QQ.assumptionRecordValue(draft,path),source=basis||inputBasis(path);
  const list=draft.assumptionRecords?.[path]?.value===value?recorded:estimates;
  list.push(`<li class="record-line"><b>${esc(label)} · ${esc(formatEvidenceValue(path,value))}</b><small>${source}</small></li>`);
 }
 const list=rows=>'<ul>'+rows.join('')+'</ul>';
 return (recorded.length?`<h3>From your records</h3>${list(recorded)}`:'<p>No current estimates have a recorded source.</p>')+
  (estimates.length?`<details class="preset-sources"><summary>Estimates without a recorded source (${estimates.length})</summary>${list(estimates)}</details>`:'');
}
function formatEvidenceValue(path,value){
 const amount=v=>new Intl.NumberFormat('en-US',{maximumFractionDigits:12}).format(v);
 if(percentPaths.has(path)||path.endsWith('.managedShare'))return amount(value*100)+'%';
 if(['overhead','designerRate'].includes(path)||/\.(price|print|designOnlyPrice)$/.test(path))return '$'+amount(value);
 if(/(Hours|hours|review)$/.test(path))return amount(value)+' h';
 if(['paymentDays','approvalDays','printDays'].includes(path))return amount(value)+' days';
 return amount(value);
}
function evidenceControls(group,id=''){
 const options=recordOptions(group,id);
 if(!options.length)return '';
 const records=options.filter(({path})=>{const row=draft.assumptionRecords?.[path];return row&&row.value===QQ.assumptionRecordValue(draft,path);});
 return `<details class="guided-options evidence-inputs" data-disclosure="input-evidence-${esc(group)}-${esc(id)}"><summary>Sources for these estimates${records.length?' · '+records.length+' saved':''}</summary><div class="advanced-body">${records.map(({path,label})=>`<div class="record-line"><b>${esc(label)}</b><small>${inputBasis(path)}</small></div>`).join('')}${btn('Add or edit a source','input-evidence','small',`data-group="${esc(group)}" data-id="${esc(id)}"`)}</div></details>`;
}
let recordEditor=null;
function editInputRecord(group,id='',selectedPath){
 const options=recordOptions(group,id);
 if(!options.length)throw Error('Enter an estimate before recording its source.');
 const option=options.find(v=>v.path===selectedPath)||options[0];
 recordEditor={group,id,path:option.path};
 const value=QQ.assumptionRecordValue(draft,option.path),savedRecord=draft.assumptionRecords?.[option.path];
 const record=savedRecord?.value===value?savedRecord:null;
 modal(`<h2 id="dialog-title">Record an assumption source</h2><label class="input-field">Estimate<select id="record-field">${options.map(v=>`<option value="${esc(v.path)}" ${v===option?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label><p>Current value · <b>${esc(formatDiffValue(option.path,value))}</b></p><div class="formgrid"><label class="input-field">Source or reference<input id="record-source" maxlength="160" value="${esc(record?.source||'')}" placeholder="e.g. October quote log"></label><label class="input-field">Record date<input id="record-date" type="date" value="${esc(record?.date||'')}"></label><label class="input-field">Sample, quantity or period<input id="record-sample" maxlength="120" value="${esc(record?.sample||'')}" placeholder="e.g. 6 wins from 20 decided quotes"></label></div><div class="actions">${btn('Cancel','close')}${record?btn('Remove source','remove-input-evidence','ghost'):''}${btn('Save source','save-input-evidence','primary')}</div>`);
}
function saveInputRecord(remove=false){
 if(!recordEditor)throw Error('Choose an estimate first.');
 const {path}=recordEditor,value=QQ.assumptionRecordValue(draft,path);
 const records={...draft.assumptionRecords};
 if(remove)delete records[path];
 else{
  records[path]={value,date:$('#record-date').value,source:$('#record-source').value.trim(),sample:$('#record-sample').value.trim()};
  if(!QQ.validAssumptionRecords(records))throw Error('Enter a source, a real calendar date and the sample or period for this value.');
 }
 if(Object.keys(records).length)draft.assumptionRecords=records;else delete draft.assumptionRecords;
 recordEditor=null;presetUndoDraft=null;serviceUndoDraft=null;closeModal();save();render();
}
function outreachVolume(c){
 if(!validRunLength(c.months))return null;
 const values=[c.outreachHours,c.ownerHours,c.leadsPerHour];
 return values.every(Number.isFinite)?QQ.round(Math.min(c.outreachHours,c.ownerHours)*QQ.workingDays(c.months*30)/(5*c.months)*c.leadsPerHour):null;
}
function chooseSetup(ownBusiness,replacing=false){
 if(replacing){
  if(loading||storeError||recoveryRaw!==null||primaryReadFailed)throw Error('Resolve the current simulator save before starting another scenario.');
  const prior=QQ.clone(archives),nextState=QQ.fresh(restaurantConfig());
  MEIQQWorkspace.archive(prior,currentWorkspace(),state.config.name+' · prior scenario · day '+state.day);
  const next={state:nextState,draft:QQ.clone(nextState.config),saved:[],checkpointInfo:[],recoveryFiles:[]};
  MEIQQWorkspace.serialize(next,prior);
  stop();installWorkspace({...next,archives:prior});stepIndex=0;selection=null;expandedService=-1;disclosureState.clear();setupModeChanging=true;closeModal();
 }else if(!setupNeedsChoice())return;
 rememberSetupChoice();
 if(ownBusiness){
  draft=QQPresets.compose({}, {...QQ.clone(state.config),name:'My business',services:[],fixedInquiriesEntered:false});
  addCatalogService(null);
 }
 save();render();setTimeout(()=>document.querySelector(ownBusiness?'#input-services-0-name':'#setup-tab-0')?.focus(),0);
}
function rememberSetupChoice(){
 setupChoicePending=false;
 try{localStorage.setItem(ENTRY_KEY,'true');}catch(e){}
}
function validRunLength(months){return Number.isInteger(months)&&months>=1&&months<=12;}
function runLengthLabel(months){return months+' month'+(months===1?'':'s')+' · '+(months*30)+' days';}
function runLengthOptions(selected,elapsed=0){
 const prompt=validRunLength(selected)?'':'<option value="" selected disabled>Choose a run length</option>';
 return prompt+Array.from({length:12},(_,i)=>i+1).map(months=>`<option value="${months}" ${months===selected?'selected':''} ${months*30<elapsed?'disabled':''}>${runLengthLabel(months)}</option>`).join('');
}
function newScenarioDialog(){
 modal(`<h2 id="dialog-title">Start a new scenario</h2><p>Your current run, unfinished setup and checkpoints will be kept in Runs &amp; backups → Preserved workspaces.</p><div class="actions">${btn('Keep editing','close')}${btn('Try the restaurant example','new-example','soft')}${btn('Set up my business','new-business','primary')}</div>`);
}
function setupView(){
 if(setupNeedsChoice())return `<section class="panel setup-start" aria-label="Choose a starting point"><div><h2>Your services</h2><p>Enter one service you sell, then set demand, working hours and payment terms.</p>${btn('Set up my business','start-business','primary')}</div><div><h2>Restaurant studio example</h2><p>Explore a menu refresh, table tents and a monthly promotion. The studio’s prices, time and demand are example estimates.</p>${btn('Try the restaurant example','start-restaurant','soft')}</div></section>`;
 const context=dirty()?'Setup draft':draft.recipe?.profile==='new-workspace'&&draft.name===RESTAURANT_EXAMPLE?'Example scenario':'Current scenario';
 const modeButton=(id,label)=>btn(label,'setup-density',setupMode===id?'active':'',`data-mode="${id}" aria-pressed="${setupMode===id}"`);
 const actions=`<div class="setup-secondary">${btn(recipeOpen?'Close scenario builder':'Try a scenario','toggle-recipe','small',`aria-expanded="${recipeOpen}"`)}${btn('Assumption sources','current-evidence','small')}${btn('New scenario','new-scenario','small')}${presetUndoDraft?btn('Undo recipe','undo-preset','small'):''}</div>`;
 const issue=draftValidationIssues()[0],target=setupIssueTarget(issue);
 const finishOffer=setupMode==='guided'&&stepIndex===0&&target?.step===0&&issue.path.startsWith('services');
 const nextAction=finishOffer?btn((issue.path==='services'?'Fix ':'Set ')+esc(target.label),'fix-setup-issue','primary'):stepIndex<3?btn('Next: '+steps[stepIndex+1]+' →','setup-step',stepIndex===0?'primary':'soft','data-step="'+(stepIndex+1)+'"'):'';
 const tabs=steps.map((n,i)=>`<button id="setup-tab-${i}" role="tab" aria-controls="setup-panel" aria-selected="${stepIndex===i}" tabindex="${stepIndex===i?0:-1}" data-action="setup-step" data-step="${i}" class="${stepIndex===i?'active':''}"><span>${i+1}</span>${n}</button>`).join('');
 const content=stepIndex===0?serviceInputs():stepIndex===1?customerInputs():stepIndex===2?teamInputs():cashInputs();
 const controls=`<label class="month-picker setup-duration">Run length<select id="input-months" data-input="months">${runLengthOptions(draft.months)}</select></label><div class="segmented" role="group" aria-label="Setup detail level">${modeButton('guided','Guided')}${modeButton('analyst','All assumptions')}</div>`;
 const compact=stepIndex===0&&setupMode==='guided';
 const scenario=`<div><b>${draft.name?scenarioName(draft.name):'Untitled scenario'}</b><span>${context} · Day ${state.day}</span></div>`;
 const modebar=compact?`<div class="setup-modebar offer-modebar">${scenario}<details data-disclosure="offer-setup-options"><summary>Setup options</summary><div class="offer-setup-controls">${controls}${actions}</div></details></div>`:`<div class="setup-modebar">${scenario}${controls}</div>${actions}`;
 return `<div class="setup-workspace setup-mode-${setupMode}">${modebar}${recipeOpen?presetWorkbench():''}<div class="setup-layout"><div><div class="setup-steps" role="tablist" aria-label="Setup steps">${tabs}</div><section id="setup-panel" class="panel setup-body" role="tabpanel" aria-labelledby="setup-tab-${stepIndex}">${content}<div class="step-footer">${stepIndex?btn('← Back','setup-step','','data-step="'+(stepIndex-1)+'"'):'<span></span>'}${nextAction}</div></section></div><aside class="setup-summary" id="draft-summary">${draftSummary()}</aside></div></div>`;
}
function serviceUnit(service){
 const config={...QQ.DEFAULT,designerRate:draft.designerRate,ownerTarget:draft.ownerTarget,quoteHours:draft.quoteHours,deliveryHours:draft.deliveryHours,services:[{...service,weight:100}]};
 if(QQ.configIssues(config).length)return null;
 try{return QQ.estimate(config).services[0].perProject;}catch(e){return null;}
}
function serviceFulfillment(service,index,routes){
 if(!service.fulfillment)return '';
 if(routes===undefined&&serviceUnit(service)){
  routes=QQ.estimate({...draft,months:1,services:[{...service,weight:100}]}).services[0].fulfillmentOptions;
 }
 const path=key=>`services.${index}.fulfillment.${key}`;
 const basis=key=>serviceInputBasis(service,'fulfillment.'+key);
 return `<section class="fulfillment-choice"><h3>Client print choices</h3>
  <div class="service-route-grid"><div><b>We manage printing</b><span>${offerAmount(service.price)} price · ${offerAmount(routes?.agencyManaged.directCost)} direct cost</span><small>${offerAmount(service.print)} supplier allowance per batch.</small></div>
  <div><b>Customer arranges printing</b><span>${offerAmount(service.fulfillment.designOnlyPrice)} price · ${offerAmount(routes?.designOnly.directCost)} direct cost</span><small>Deliver print-ready files.</small></div></div>
  <div class="formgrid">${field('Design-only customer price','designOnlyPrice',service.fulfillment.designOnlyPrice,{path:path('designOnlyPrice'),max:service.price,suffix:'$ / project',step:.01,help:basis('designOnlyPrice')})}
  ${field('Customers choosing our printing','managedShare',service.fulfillment.managedShare,{path:path('managedShare'),percent:true,max:100,suffix:'%',help:basis('managedShare')+' · share of accepted quotes that include managed printing.'})}</div>
  ${routes?`<p class="helper">Contribution per accepted project · ${offerAmount(routes.agencyManaged.contribution)} managed / ${offerAmount(routes.designOnly.contribution)} files only.</p>`:''}</section>`;
}
function serviceScope(service,catalogId=null){
 const spec=service.spec;if(!spec)return `<p class="helper">Custom offering · define the deliverable, work and supplier cost below.</p>`;
 const audit=QQServiceCatalog.auditService(service),range=spec.modeledPriceRange;
 return `<div class="service-scope"><h3>Original example scope</h3><div class="service-scope-heading"><b>${esc(spec.scope)}</b><span>${service.fulfillment?'Design with optional print batch':service.print>0?'Design + print batch':'Digital delivery'} · ${service.campaign?(service.campaign.cadenceDays===90?'Seasonal campaign':'Monthly campaign'):service.recurring?'Per paid cycle':'One-off'}</span></div><ul>${spec.deliverables.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>${spec.printQuantity?`<p><b>${spec.printQuantity} ${esc(spec.printUnit||'pieces')}</b> · ${esc(spec.printSpec)}</p><p class="helper">${esc(spec.printCostBasis)} Quantity describes this package; changing the batch requires a new supplier estimate.</p>`:''}<p class="helper">${spec.includedRevisions} included feedback round${spec.includedRevisions===1?'':'s'} budgeted in the work estimate. Optional disruption rounds add work; no automatic extra fee is charged.</p><div class="service-scope-footer"><span>${range?'Modeled starting price '+money(range[0])+'–'+money(range[1]):'Custom price'}${audit.compatible===false?' · source version unavailable':''}</span>${btn('Price & scope evidence','service-evidence','small',`data-id="${esc(service.id)}" ${catalogId?`data-catalog="${esc(catalogId)}"`:""}`)}</div></div>`;
}
function serviceEvidence(service,catalogId=null){
 const audit=QQServiceCatalog.auditService(service),spec=service.spec;
 const records=(audit.records||QQServiceCatalog.SOURCES.filter(v=>spec?.evidenceIds?.includes(v.id)));
 modal(`<h2 id="dialog-title">${serviceName(service)}: price and scope</h2><p>Published prices are comparables for the stated scope. Your customer price, work estimate and supplier allowance remain editable assumptions.</p><p><b>Current ${service.fulfillment?'managed-print ':''}customer price: ${Number.isFinite(service.price)?money(service.price):'not entered'}</b>${service.fulfillment?` · files only: ${Number.isFinite(service.fulfillment.designOnlyPrice)?money(service.fulfillment.designOnlyPrice):'not entered'} · managed-print share: ${Number.isFinite(service.fulfillment.managedShare)?pct(service.fulfillment.managedShare):'not entered'}`:''}</p><p>${esc(spec?.scope||service.deliverable)}</p><p>${esc(typeof audit.derivation==='string'?audit.derivation:JSON.stringify(audit.derivation||{}))}</p>${audit.edited?.length?`<p class="banner warn">Customized fields: ${esc(audit.edited.join(', '))}. The frozen derivation describes the original package; your edited values drive the preview and run.</p>`:''}${audit.modelRecord?`<details class="source-records"><summary>Documented price derivation</summary><pre>${esc(JSON.stringify(audit.modelRecord,null,2))}</pre></details>`:''}${audit.compatible===false?'<p class="banner warn">This package version is unavailable. Your saved values are preserved; current sources cannot verify its original quote.</p>':''}<div class="source-records">${records.map(record=>`<article><h3>${esc(record.title||record.label||record.id)}</h3><p>${esc(record.caveat||record.scope||record.note||'')}</p>${record.url?`<a href="${esc(record.url)}" target="_blank" rel="noopener">Open published source</a>`:''}<small>Recorded ${esc(record.retrieved||record.retrievedAt||'see source record')}</small><pre>${esc(JSON.stringify(record.snapshot||record.observations||record,null,2))}</pre></article>`).join('')}</div><div class="actions">${catalogId?btn('Back to package','catalog-package','',`data-id="${esc(catalogId)}"`):btn('Close','close')}${btn('Download service evidence','download-service-evidence','soft',`data-id="${esc(service.id)}" ${catalogId?`data-catalog="${esc(catalogId)}"`:''}`)}</div>`);
}
function serviceLibraryCards(){
 const rows=QQServiceCatalog.SERVICES.filter(row=>{const s=QQServiceCatalog.createService(row.id);return(catalogGoal==='all'||row.category===catalogGoal)&&(catalogAudience==='all'||s.audience==='all'||s.audience===catalogAudience);});
 return rows.map(row=>{const s=QQServiceCatalog.createService(row.id),unit=serviceUnit(s);return `<article class="catalog-card"><div><span class="catalog-category">${esc(row.goal||'Local business')}</span><h3>${serviceName(s)}</h3><p>${esc(s.spec?.scope||s.deliverable)}</p></div><div class="catalog-price"><b>${money(s.price)}</b><span>${s.recurring?'per paid cycle':'per project'} · ${s.fulfillment?'managed print · ':''}modeled starting price</span></div><p class="helper">${s.spec?.printQuantity?s.spec.printQuantity+' '+esc(s.spec.printUnit||'pieces')+' · '+esc(s.spec.printSpec):'Digital files · printing excluded'}</p><div class="catalog-facts"><span>${num(s.hours)} design h</span><span>${num(s.review)} owner review h</span><span>${unit?offerAmount(s.fulfillment?QQ.round(unit.designerCost+s.print):unit.directCost):'—'} ${s.fulfillment?'managed-print ':''}direct cost</span></div>${btn('Review package','catalog-package','soft',`data-id="${esc(row.id)}"`)}</article>`;}).join('')||'<p class="helper">No packages match these filters. Try another customer need.</p>';
}
function serviceLibrary(){
 const goals=[['offer','Promote an offer'],['menu','Refresh a menu'],['visibility','Improve storefront visibility'],['branding','Create a basic brand'],['recurring','Plan monthly or seasonal campaigns']];
 modal(`<h2 id="dialog-title">What does the customer need?</h2><p>Choose a defined package, inspect its scope and costs, then add it to your draft.</p><div class="catalog-filters"><label for="catalog-goal">Customer need<select id="catalog-goal" aria-label="Customer need"><option value="all">All needs</option>${goals.map(([id,label])=>`<option value="${id}" ${id===catalogGoal?'selected':''}>${esc(label)}</option>`).join('')}</select></label><label for="catalog-audience">Customer type<select id="catalog-audience" aria-label="Customer type">${[['all','All businesses'],['food','Restaurants & cafés'],['retail','Retail shops'],['services','Local services']].map(([id,name])=>`<option value="${id}" ${id===catalogAudience?'selected':''}>${name}</option>`).join('')}</select></label></div><div id="catalog-results" class="catalog-grid">${serviceLibraryCards()}</div><div class="actions">${btn('Close','close')}${btn('Start with a blank service','add-blank-service','soft')}</div>`);
}
function catalogEconomics(service){
 const unit=serviceUnit(service);if(!unit)return '<p class="banner warn">Enter a complete price and valid work assumptions to preview costs.</p>';
 return `<div class="service-economics"><div><span>Expected customer revenue</span><b>${money(unit.price)}</b></div><div><span>Designer labor</span><b>${money(unit.designerCost)}</b><small>${num(service.hours)} h × ${money(draft.designerRate)}/h</small></div><div><span>Expected supplier cost</span><b>${money(unit.printCost)}</b></div><div><span>After valuing owner time</span><b>${money(unit.afterOwnerTime)}</b></div></div>${service.fulfillment?`<p class="helper">Customer choice: ${money(service.price)} managed printing (${money(service.print)} supplier batch) or ${money(service.fulfillment.designOnlyPrice)} for files only. Preview assumes ${pct(service.fulfillment.managedShare)} choose managed printing; this is an unmeasured assumption you can change.</p>`:''}`;
}
function catalogCandidate(id){
 const s=QQServiceCatalog.createService(id),raw=catalogPrices.get(id);if(raw!==undefined)s.price=raw.trim()===''?null:Number(raw);return s;
}
function evidenceService(id,catalogId){
 const service=catalogId?catalogCandidate(catalogId):draft.services.find(s=>s.id===id);if(!service)throw Error('Service not found.');return service;
}
function catalogPackage(id){
 pendingCatalogId=id;const s=catalogCandidate(id),unit=serviceUnit(s),capacity=unit?Math.min(unit.designerHours?draft.designers*draft.designerHours/unit.designerHours:Infinity,unit.ownerHours?Math.max(0,draft.ownerHours-(draft.acquisition==='sales'?draft.outreachHours:0))/unit.ownerHours:Infinity):null;
 modal(`<h2 id="dialog-title">${serviceName(s)}</h2>${serviceScope(s,id)}<label class="input-field" for="catalog-price">Your proposed ${s.fulfillment?'managed-print ':''}customer price ($)<input id="catalog-price"${QQI18n.moneyField('$')} type="number" min="${s.fulfillment?.designOnlyPrice||0}" max="1000000" step="5" value="${esc(catalogPrices.get(id)??String(s.price))}"></label><div id="catalog-economics">${catalogEconomics(s)}</div><p class="helper">${Number.isFinite(capacity)?num(capacity)+' projects/week maximum if this were your only offering. ':''}Before overhead, queue delays, unsuccessful quoting and extra revisions.</p><p class="helper">Adds at 0% inquiry share so it does not change your workload until you assign a share.</p><div class="actions">${btn('Back to library','service-library')}${btn('Add to my draft','confirm-catalog-service','primary')}</div>`);
}
function clearServiceRecords(id){
 if(!draft.assumptionRecords)return;
 const prefix=id?'services.'+id+'.':'services.';
 for(const path of Object.keys(draft.assumptionRecords))if(path.startsWith(prefix))delete draft.assumptionRecords[path];
 if(!Object.keys(draft.assumptionRecords).length)delete draft.assumptionRecords;
}
function addCatalogService(id,price){
 if(draft.services.length>=20)throw Error('The prototype supports up to 20 services.');
 const s=id?QQServiceCatalog.createService(id):{customOffer:true,name:'',deliverable:'',price:null,hours:null,review:null,print:null,supplierMode:'choose',recurring:false,audience:'all',color:'#647f9a'};
 if(price!==undefined){if(!Number.isFinite(price)||price<0||price>1e6)throw Error('Enter a valid customer price.');s.price=price;}
 s.id=newServiceId();s.weight=draft.services.length?0:100;draft.services.push(s);serviceUndoDraft=null;presetUndoDraft=null;
 if(s.audience!=='all'&&!draft.customerMix){draft.customerMix=QQ.clone(QQ.DEFAULT.customerMix);draft.profileStrength=QQ.DEFAULT.profileStrength;draft.focusType='none';}
 expandedService=draft.services.length-1;disclosureState.set('service-'+s.id,true);closeModal();render();document.querySelector('#input-services-'+expandedService+'-name')?.focus();
}
function priceExperiment(index){
 const s=draft.services[index],unit=serviceUnit(s);if(!unit)throw Error('Complete the service work and cost inputs first.');
 const audit=QQServiceCatalog.auditService(s),typical=audit.compatible?audit.catalogService.price:s.price,range=s.spec?.modeledPriceRange||[QQ.round(s.price*.85),QQ.round(s.price*1.15)];
 const rows=[['Current',s.price],['Lower starting price',Math.max(range[0],s.fulfillment?.designOnlyPrice||0)],[audit.compatible?'Catalog starting price':'Current custom price',Math.max(typical,s.fulfillment?.designOnlyPrice||0)],['Higher starting price',Math.max(range[1],s.fulfillment?.designOnlyPrice||0)]];
 modal(`<h2 id="dialog-title">Experiment with ${serviceName(s)}</h2><p>Keep the same scope and workload while comparing prices. Changing price does not automatically change inquiry volume or acceptance; test those assumptions separately.</p><div class="tablewrap"><table><thead><tr><th>Price case</th><th>Managed / offered price</th><th>Expected direct cost</th><th>Contribution</th><th>After owner time</th><th></th></tr></thead><tbody>${rows.map(([label,price],n)=>{const candidate=serviceUnit({...s,price});return `<tr><th>${label}</th><td>${money(price)}</td><td>${candidate?money(candidate.directCost):'—'}</td><td>${candidate?money(candidate.contribution):'—'}</td><td class="${candidate&&candidate.afterOwnerTime<0?'negative':''}">${candidate?money(candidate.afterOwnerTime):'—'}</td><td>${n&&candidate?btn('Use '+money(price),'use-service-price','small',`data-index="${index}" data-price="${price}"`):n?'Outside valid range':'Current draft'}</td></tr>`;}).join('')}</tbody></table></div><p class="helper">With customer print choice, results are weighted across both routes; the design-only fee stays fixed. Direct cost = designer labor + the supplier batch allowance. Owner time includes one quote, review and delivery; shared overhead and additional work are excluded.</p><div class="actions">${btn('Keep current price','close')}</div>`);
}
function starterDialog(){
 modal(`<h2 id="dialog-title">Start with a focused service mix</h2><p>Each starter set has complementary services and explicit inquiry shares. Adding keeps your current mix; replacing requires review.</p><div class="starter-grid">${QQServiceCatalog.BUNDLES.map(b=>`<article class="catalog-card"><h3>${esc(b.name)}</h3><p>${esc(b.note||b.description||'')}</p><ul>${QQServiceCatalog.starterServices(b.id).map(s=>`<li>${serviceName(s)} · ${money(s.price)} · ${s.weight}%</li>`).join('')}</ul><div class="actions">${btn('Add services','add-starter','soft',`data-id="${esc(b.id)}"`)}${btn('Replace offerings…','review-starter','small',`data-id="${esc(b.id)}"`)}</div></article>`).join('')}</div><div class="actions">${btn('Close','close')}</div>`);
}
const serviceDollars=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',trailingZeroDisplay:'stripIfInteger'});
const offerAmount=value=>Number.isFinite(value)?(QQI18n.language==='zh-CN'?QQI18n.yuan(value):serviceDollars.format(value)):'—';
const inquiryShare=value=>QQ.round(value*100)+'%';

function serviceEditor(s,i,row){
 const path=key=>'services.'+i+'.'+key;
 const input=(label,key,options={})=>field(label,key,options.text?serviceCopy(s,key):s[key],{...options,path:path(key)});
 const unit=row?.perProject||serviceUnit(s);
 const routes=row?.fulfillmentOptions;
 const basis=key=>serviceInputBasis(s,key);
 const priceLabel=s.fulfillment?'Managed-print price':'Client price';
 const title=s.name.trim()?serviceName(s):'New service';
 const summary=`<summary><span class="offer-heading"><strong>${title}</strong>${s.deliverable?`<span>${esc(QQI18n.literal(serviceCopy(s,'deliverable')))}</span>`:''}</span>${s.weight===0?'<span class="offer-inactive">Outside mix</span>':''}<span class="offer-rate">${s.price==null?'Set price':offerAmount(s.price)}${s.fulfillment?' managed':''}</span><span class="disclosure-chevron" aria-hidden="true"></span></summary>`;
 const supplierMode=s.supplierMode||(s.print>0?'print':'none');
 const supplier=s.fulfillment?'':field('Print supplier','supplierMode',supplierMode,{path:path('supplierMode'),options:[...(s.supplierMode==='choose'?[['choose','Choose a route…']]:[]),['none','No supplier purchase'],['print','We arrange printing']]});
 const costField=s.fulfillment||supplierMode==='print'?input('Printing + shipping cost','print',{step:0.01,suffix:'$ / batch',help:basis('print')+' · total for one project, including any freight.'}):'';
 const quoteFacts=s.spec?.printQuantity?`<p class="helper"><b>Published comparison · original package</b> · ${esc(s.spec.printCostBasis)}</p>`:'';
 const fields=`<div class="formgrid service-basics">
  ${input('Service name','name',{text:true})}${input(priceLabel,'price',{step:.01,suffix:'$ / project',help:basis('price')})}
  ${input('What the client receives','deliverable',{text:true,maxlength:500,help:'Describe one priced unit, including its scope.'})}</div>`;
 const delivery=`<div class="formgrid">
  ${input('Designer work per project','hours',{max:500,step:.25,suffix:'hours',help:basis('hours')+' · include the promised feedback rounds.'})}
  ${input('Your review work per project','review',{max:100,step:.25,suffix:'hours',help:basis('review')})}
  ${supplier}${costField}</div>${serviceFulfillment(s,i,routes)}${quoteFacts}`;
 const advanced=`<div class="formgrid">${field('Suitable for','audience',s.audience||'all',{path:path('audience'),options:[['all','All local businesses'],['food','Restaurants and food shops'],['retail','Retail shops'],['services','Local services']]})}
  ${field('Purchase pattern','recurring',String(s.recurring),{path:path('recurring'),options:[['false','One-off project'],['true','Repeat campaign']]})}
  ${s.campaign?field('Campaign rhythm','cadenceDays',s.campaign.cadenceDays,{path:path('campaign.cadenceDays'),options:[['30','Monthly · every 30 days'],['90','Seasonal · every 90 days']]}):''}
  ${s.fulfillment?field('Files-only deliverable','filesOnlyScope',serviceCopy(s,'filesOnlyScope')||'',{path:path('filesOnlyScope'),text:true,maxlength:500,help:'Artwork or digital assets for a customer arranging printing.'}):''}
  </div>
  ${s.campaign?`<p class="helper">Up to ${s.campaign.cadenceDays===90?4:12} separate quotes in a year. A declined campaign is skipped. Reoffers follow delivery and payment.</p>`:s.recurring?'<p class="helper">A paid-cycle renewal starts after delivery and payment, at least 30 days after the previous cycle began. A failed renewal ends this legacy relationship.</p>':''}
  ${s.spec?serviceScope(s):''}`;
 const economics=unit?`<details class="guided-options" data-disclosure="offer-economics-${s.id}" ${setupMode==='analyst'?'open':''}><summary>Per project · ${s.fulfillment?'weighted across print choices':'economics'}</summary><div class="advanced-body service-economics">
  <div><span>Expected customer revenue</span><b>${offerAmount(unit.price)}</b></div><div><span>Designer labor</span><b>${offerAmount(unit.designerCost)}</b></div>
  <div><span>Supplier allowance</span><b>${offerAmount(unit.printCost)}</b></div><div><span>Contribution</span><b>${offerAmount(unit.contribution)}</b></div>
  <div><span>Quote, review &amp; delivery</span><b>${num(unit.ownerHours)} h · ${offerAmount(unit.ownerTimeValue)}</b></div><div><span>After valuing your time</span><b>${offerAmount(unit.afterOwnerTime)}</b></div></div>
  <p class="helper">Before shared overhead, outreach, unsuccessful quotes and extra disruption work.</p></details>`:'';
 const totals=row?`<details class="guided-options" data-disclosure="offer-month-${s.id}"><summary>Expected over ${draft.months*30} days</summary><div class="advanced-body service-economics">
  <div><span>Orders</span><b>${num(row.orders)}</b></div><div><span>Potential revenue</span><b>${offerAmount(row.revenue)}</b></div><div><span>Direct cost</span><b>${offerAmount(row.directCost)}</b></div><div><span>Contribution</span><b>${offerAmount(row.contribution)}</b></div>
  <div><span>Design capacity</span><b>${pct(row.designCapacityShare)}</b></div><div><span>Your service capacity</span><b>${pct(row.ownerCapacityShare)}</b></div></div></details>`:'';
 const more=`${advanced}${economics}${totals}${evidenceControls('service',s.id)}
  <div class="service-actions">${btn('Compare prices','price-experiment','soft',`data-index="${i}" ${unit?'':'disabled'}`)}${btn('Duplicate','duplicate','small',`data-index="${i}"`)}${draft.services.length>1?btn('Remove from draft','remove-service','small ghost',`data-index="${i}"`):''}</div>`;
 return `<details class="service-editor" ${setupMode==='guided'?'name="offer-editors"':''} data-disclosure="service-${s.id}" ${i===expandedService?'open':''}>${summary}<div class="service-fields">${fields}
  ${advancedBlock('delivery-'+s.id,'Delivery time and costs',delivery)}
  ${advancedBlock('service-'+s.id,'Service options and estimates',more)}
  ${s.weight===0?btn('Set inquiry weight','edit-inquiry-weight','soft',`data-index="${i}"`):''}</div></details>`;
}

function inquiryMix(rows,estimate){
 const total=QQ.round(draft.services.reduce((a,s)=>a+(s.weight||0),0)),gap=QQ.round(100-total);
 const included=draftRunConfig().services;
 const status=gap>0?gap+'% left to assign':gap<0?Math.abs(gap)+'% over allocation':'Weights total 100%';
 const groups={all:'All businesses',food:'Food businesses',retail:'Retail businesses',services:'Local services'};
 const recipients=[];
 const items=draft.services.map((s,i)=>{
  const row=rows.get(s.id),title=s.name.trim()?serviceName(s):'New service';
  const share=row?inquiryShare(row.effectiveShare):s.weight===0?'0%':null;
  const canFill=gap!==0&&(s.weight??0)+gap>=0&&(s.weight??0)+gap<=100;
  if(canFill)recipients.push(`<option value="${i}">${title}</option>`);
  return `<div class="inquiry-row" role="group" aria-labelledby="mix-label-${s.id}" data-render-key="mix-${s.id}"><div><strong id="mix-label-${s.id}">${title}</strong><small>${groups[s.audience||'all']}${share?' · '+share+' of all new inquiries':''}</small></div>
   ${field('Inquiry weight','weight',s.weight,{path:'services.'+i+'.weight',max:100,step:.01,suffix:'%'})}
   </div>`;
 }).join('');
 return `<details class="inquiry-mix" data-disclosure="setup-advanced-mix" ${gap||setupMode==='analyst'?'open':''}><summary><strong>Inquiry mix</strong><span class="mix-status ${gap?'negative':''}" id="mix-status" role="status">${status}</span><span class="disclosure-chevron" aria-hidden="true"></span></summary>
  <div class="mix-body"><p class="helper">Give more weight to services you expect people to ask for more often. Use 0% to leave a service out.</p>${items}
  ${recipients.length?`<div class="mix-correction"><label for="mix-recipient">${gap>0?'Assign remaining weight to':'Remove excess weight from'}</label><select id="mix-recipient">${recipients.join('')}</select>${btn('Apply','assign-remainder','small')}</div>`:''}
  <div class="mix-tools">${btn('Balance shares equally','balance','small',included.length?'':'disabled')}<small>Weights apply within each customer group.</small></div>
  ${included.length<draft.services.length?'<p class="helper">Give a custom service a weight above zero to include it in the equal split.</p>':''}
  ${estimate?.unservedShare>0?`<p class="helper">${inquiryShare(estimate.unservedShare)} of new inquiries have no matching offer.</p>`:''}</div></details>`;
}
function serviceInputs(){
 const estimate=draftValidationIssues().length?null:getDraftEstimate();
 const rows=new Map((estimate?.services||[]).map(r=>[r.id,r]));
 const analyst=setupMode==='analyst'?`<div class="tablewrap service-overview"><table><thead><tr><th>Offering</th><th>Expected price</th><th>Designer cost</th><th>Expected supplier</th><th>Expected contribution</th><th>After owner time</th><th>All new inquiries</th></tr></thead><tbody>${draft.services.map((s,i)=>{
  const row=rows.get(s.id),u=row?.perProject||serviceUnit(s);
  return `<tr><th>${btn((s.name?serviceName(s):'New service'),'inspect-service','table-link',`data-index="${i}"`)}</th><td>${offerAmount(u?.price)}</td><td>${offerAmount(u?.designerCost)}</td><td>${offerAmount(u?.printCost)}</td><td>${offerAmount(u?.contribution)}</td><td>${offerAmount(u?.afterOwnerTime)}</td><td>${row?inquiryShare(row.effectiveShare):'—'}</td></tr>`;
 }).join('')}</tbody></table></div>`:'';
 return `<div class="section-heading menu-heading"><div><h2>Build your service menu</h2><p>${draft.services.length===1&&!draft.services[0].name?'Start with the name, price and deliverable for one service.':'Open a service to set its price and delivery details.'}</p></div></div>
  ${serviceUndoDraft?`<div class="preset-undo"><span>Previous service mix available.</span>${btn('Undo service mix','undo-services','small')}</div>`:''}${analyst}
  ${draft.services.map((s,i)=>serviceEditor(s,i,rows.get(s.id))).join('')}
  <div class="menu-tools">${btn(icon('plus')+'Add my service','add-blank-service','soft')}
  <details data-disclosure="offer-examples"><summary>Use an example</summary><div class="actions">${btn('Browse examples','service-library','small')}${btn('Choose a starter mix','service-starters','small')}</div></details></div>
  ${inquiryMix(rows,estimate)}`;
}
function customerInputs(){
 const c=draft;
 const advanced=`<div class="formgrid">${field('Returning campaign quotes accepted','retention',c.retention,{max:100,percent:true,suffix:'%',help:'Each follow-up campaign is a fresh decision. A declined campaign skips one cycle; offers continue within the year. Legacy subscriptions use this as renewal likelihood.'})}${field('One-off clients who order again','repeat',c.repeat,{max:100,percent:true,suffix:'%',help:'Returning requests arrive 30 days after final payment.'})}</div>${customerMixInputs()}`;
 const fixed=c.acquisition==='preset';
 const show=(path,active)=>active||setupRepairPath===path;
 const observed=show('inquiries',fixed)?field('New inquiries each month','inquiries',c.inquiries,{max:500,suffix:'requests',step:0.01,help:fixed?'Qualified new inquiries per 30 days. Enter a known volume or use the suggested outreach estimate.':'Used only in fixed-volume mode.'}):'';
 const outreach=show('outreachHours',!fixed)?field('Your weekly outreach time','outreachHours',c.outreachHours,{max:120,step:0.5,suffix:'hours',help:fixed?'Used only in outreach mode.':'Uses part of your total weekly availability.'}):'';
 const response=show('leadsPerHour',!fixed)?field('Inquiries per outreach hour','leadsPerHour',c.leadsPerHour,{max:100,step:0.01,suffix:'requests',help:inputBasis('leadsPerHour')+(fixed?' · Used only in outreach mode.':' · Divide recorded qualified inquiries by outreach hours.')}):'';
 return `<div class="eyebrow">STEP 2 / WHERE WORK COMES FROM</div><h2>Choose a workload</h2><p class="helper">Pricing and acceptance are separate inputs. ${c.acquisition==='sales'?'Current outreach implies '+(outreachVolume(c)===null?'an unknown number of':num(outreachVolume(c)))+' qualified inquiries per model month on average.':'Fixed volume is '+(Number.isFinite(c.inquiries)?num(c.inquiries):'—')+' per model month. The outreach settings imply an average of '+(outreachVolume(c)===null?'an unknown volume':num(outreachVolume(c)))+' per model month.'}</p><div class="formgrid essentials-grid">${field('How do inquiries arrive?','acquisition',c.acquisition,{options:[['preset','I set the number of inquiries'],['sales','My outreach generates inquiries']]})}${observed}${outreach}${response}${field('Quotes that become paid work','conversion',c.conversion,{max:100,percent:true,suffix:'%',help:inputBasis('conversion')+' · Accepted quotes divided by all decided quotes.'})}</div>${advancedBlock('customers','Repeat business and customer mix',advanced)}${evidenceControls('demand')}`;
}
function customerMixInputs(){
 const mix=draft.customerMix;
 if(!mix)return `<section class="customer-profiles"><h3>Business types</h3><p class="helper">This earlier run uses generic customers. Add business types to future inquiries without changing existing projects.</p>${btn('Use varied businesses','enable-profiles','small')}</section>`;
 const total=Object.values(mix).reduce((n,v)=>n+v,0);
 return `<section class="customer-profiles"><h3>Who contacts you</h3><p class="helper">Share of inquiries by business type. New clients get a specific identity and context; returning clients keep theirs. Offerings targeted to another group cannot serve that inquiry.</p><div class="formgrid">${field('Restaurants and food shops','food',mix.food,{path:'customerMix.food',max:100,suffix:'%',step:1})}${field('Retail shops','retail',mix.retail,{path:'customerMix.retail',max:100,suffix:'%',step:1})}${field('Local services','services',mix.services,{path:'customerMix.services',max:100,suffix:'%',step:1})}${field('Workflow variation','profileStrength',draft.profileStrength,{options:[['0','Names and contexts only'],['0.5','Moderate differences'],['1','Stronger differences']],help:'Illustrative differences in work, approval time and return frequency.'})}${field('Focus on one niche','focusType',draft.focusType||'none',{options:[['none','Even mix within groups'],...QQ.CUSTOMER_TYPES.map(t=>[t.id,t.label])],help:'The selected type receives half of its group’s inquiries.'})}</div><p class="helper">Total: <b id="customer-mix-total">${Number.isFinite(total)?total:'—'}%</b> / 100%. The catalog includes ${QQ.CUSTOMER_TYPES.length} types, including bakeries, tea shops, noodle shops, cafés, restaurants and food trucks. These patterns are modeling assumptions, not measured local rates.</p></section>`;
}
function teamInputs(){const c=draft,advanced=`<div class="formgrid">${field('Value of your time','ownerTarget',c.ownerTarget,{max:1000,suffix:'$ / hour',help:'An economic target; no cash is paid to you.'})}${field('Your work to prepare a quote','quoteHours',c.quoteHours,{max:24,step:0.1,suffix:'hours / inquiry'})}${field('Your work to deliver a project','deliveryHours',c.deliveryHours,{max:24,step:0.1,suffix:'hours / delivery'})}${field('When work is waiting, handle…','priority',c.priority,{options:[['deadline','Earliest deadline first'],['fifo','Oldest project first']]})}</div>`;return `<div class="eyebrow">STEP 3 / WHO DOES THE WORK</div><h2>Set time and labor costs</h2><p class="helper">A five-day working week. Your time is shared across outreach, quoting, review and delivery.</p><div class="formgrid essentials-grid">${field('Your available time','ownerHours',c.ownerHours,{max:120,step:0.5,suffix:'hours / week'})}${field('Number of designers','designers',c.designers,{max:50,suffix:'people'})}${field('Availability of each designer','designerHours',c.designerHours,{max:120,step:0.5,suffix:'hours / week'})}${field('Designer labor cost','designerRate',c.designerRate,{max:1000,step:0.5,suffix:'$ / hour',help:inputBasis('designerRate')+' · Enter the paid rate from a contractor quote or invoice.'})}</div>${advancedBlock('team','Owner-time and queue assumptions',advanced)}${evidenceControls('people')}`;}
function cashInputs(){const c=draft,advanced=`<div class="formgrid">${field('Final balance due after delivery','paymentDays',c.paymentDays,{max:90,suffix:'calendar days'})}${field('Client approval time','approvalDays',c.approvalDays,{max:30,suffix:'calendar days'})}${field('Print supplier turnaround','printDays',c.printDays,{max:90,suffix:'calendar days'})}</div><section class="advanced"><h3>Optional uncertainty & repeatability</h3><p class="helper">Choose which delays and extra work may occur during the run.</p>${checkbox('Enable uncertain project outcomes','realism',c.realism)}<div class="uncertainty-grid">${[['complexity','Different design complexity'],['revisions','Extra client revision'],['approval','Slower client approval'],['supplier','Print supplier delays'],['payment','Late final payments']].map(([k,l])=>checkbox(l,'uncertainty.'+k,c.uncertainty[k])).join('')}</div>${field('Workload seed','seed',c.seed,{max:1e9,help:'Same seed + same settings = same replay. Changing it requires a new run.'})}</section>`;return `<div class="eyebrow">STEP 4 / MONEY AND COMMITMENTS</div><h2>Set payments and deadlines</h2><div class="formgrid essentials-grid">${field('Starting cash','startingCash',c.startingCash,{max:1e8,suffix:'$',help:state.day?'Requires a new run. Use Add funding for current cash.':'Cash available on day 0.'})}${field('Software and other overhead','overhead',c.overhead,{max:1e7,suffix:'$ / month'})}${field('Client deposit','deposit',c.deposit,{percent:true,max:100,suffix:'%',help:'Received when a quote is accepted.'})}${field('Promise delivery within','leadDays',c.leadDays,{min:1,max:180,suffix:'calendar days',help:'Measured from acceptance of the quote.'})}${field('Scenario name','name',c.name,{text:true})}</div><p class="helper">${c.realism?Object.values(c.uncertainty).filter(Boolean).length+' routine uncertainties and '+Object.values(c.disruptions||{}).filter(Boolean).length+' disruption types enabled.':'Project uncertainty is off.'}</p>${advancedBlock('cash','Payment timing and uncertainty',advanced+disruptionInputs())}${evidenceControls('cash')}`;}
function mixValid(){return Math.abs(draft.services.reduce((n,s)=>n+s.weight,0)-100)<0.01;}
function draftError(){return issueText(draftValidationIssues()[0]);}
function setupIssueTarget(issue){
 if(!issue)return null;
 const path=issue.path,parts=path.split('.');
 if(path==='services'){
  const i=draft.services.findIndex(s=>s.weight>0);
  return draft.services.length?{step:0,path:'services.'+Math.max(i,0)+'.weight',label:'service mix'}:{step:0,selector:'[data-action="add-blank-service"]',label:'service menu'};
 }
 if(parts[0]==='services'){
  const labels={name:'service name',deliverable:'deliverable',price:'customer price',hours:'designer work',review:'review work',weight:'inquiry weight',supplierMode:'print supplier',print:'printing cost',filesOnlyScope:'files-only deliverable',audience:'customer group',recurring:'purchase pattern','campaign.cadenceDays':'campaign rhythm','fulfillment.designOnlyPrice':'files-only price','fulfillment.managedShare':'managed-print share'};
  const label=labels[parts.slice(2).join('.')];
  return label?{step:0,path,label}:null;
 }
 if(path==='customerMix')return draft.customerMix?{step:1,path:'customerMix.food',label:'customer mix'}:{step:1,selector:'[data-action="enable-profiles"]',label:'customer mix'};
 if(path==='months')return {step:stepIndex,path,label:'run length'};
 if(path.startsWith('disruptionRates.')||path.startsWith('uncertainty.')||path.startsWith('disruptions.'))return {step:3,path,label:DISRUPTION_LABELS[parts[1]]||'uncertainty setting'};
 const label=path==='leadsPerHour'?'inquiries per outreach hour':DIFF_LABELS[path]?.toLowerCase();
 if(!label)return null;
 if(['acquisition','outreachHours','profileStrength','focusType'].includes(path)||Object.hasOwn(QQ.ASSUMPTION_FIELDS.demand,path))return {step:1,path,label};
 if(['designers','ownerTarget','priority'].includes(path)||Object.hasOwn(QQ.ASSUMPTION_FIELDS.people,path))return {step:2,path,label};
 return {step:3,path,label};
}
function fixSetupIssue(){
 const target=setupIssueTarget(draftValidationIssues()[0]);
 if(!target)return;
 setupRepairPath=target.path;stepIndex=target.step;render();
 revealSetupField(target);
}
function revealSetupField(target){
 const field=document.querySelector(target.selector||`[data-input="${target.path}"]`);
 if(!field)return;
 for(let detail=field.closest?.('details');detail;detail=detail.parentElement?.closest('details'))detail.open=true;
 field.focus();
}
function workloadRow(label,used,available){const ratio=available?used/available:used?Infinity:0;return `<div class="capacity-row"><div><b>${label}</b><span>${num(used)} / ${num(available)} h</span></div><div class="track"><div class="fill ${ratio>1?'warn':''}" style="width:${Math.min(100,ratio*100)}%"></div></div><small>${available===0&&used>0?'No capacity available':ratio>1?num(used-available)+' hours over capacity':num(Math.max(0,available-used))+' hours spare'}</small></div>`;}
function getDraftEstimate(){
 if(setupCache?.estimate)return setupCache.estimate;
 const estimate=QQ.estimate(draftRunConfig());
 if(setupCache)setupCache.estimate=estimate;
 return estimate;
}
function draftSummary(){
 const issue=draftValidationIssues()[0],error=issueText(issue),changed=dirty(),e=error?null:getDraftEstimate();
 const target=setupIssueTarget(issue);
 const guidedServiceIssue=error&&setupMode==='guided'&&stepIndex===0&&issue.path.startsWith('services')&&target;
 const previewIssue=error&&stepIndex===0&&issue.path==='services'?'Complete the offer mix to see the run estimate.':error;
 const fix=target?btn('Fix '+esc(target.label),'fix-setup-issue','small'):'';
 let blocker='';
 if(e&&e.owner>e.outreach&&e.ownerCapacity<=e.outreach)blocker='No owner time remains for project work. Reduce outreach or add owner hours.';
 else if(e&&e.hours>0&&e.designCapacity===0)blocker='No design capacity. Add designer hours to deliver this workload.';
 const signed=value=>(value>0?'+':'')+money(value);
 const guidedOffers=setupMode==='guided'&&stepIndex===0;
 const detail=e?`<p class="preview-basis">Days 1–${e.days} · ${e.workdays} working days. Assumes delivery of all expected new orders and excludes queues, disruptions and returning work.</p><div class="minirow"><span>Expected new inquiries</span><b>${num(e.leads)}</b></div><div class="minirow"><span>Expected new orders</span><b>${num(e.orders)}</b></div>${e.unserved>0?`<p class="preview-unserved">${num(e.unserved)} inquiries have no matching offer.</p>`:''}<p class="preview-basis">Owner time valued at ${money(draft.ownerTarget)}/hour</p>${workloadRow('Your time',e.owner,e.ownerCapacity)}${workloadRow('Design team',e.hours,e.designCapacity)}<div class="minirow"><span>Potential revenue</span><b>${money(e.revenue)}</b></div>`:'';
 const figures=e?`${blocker?`<p class="banner warn" role="status">${blocker}</p>`:''}<div class="summary-numbers"><div><strong class="${e.profit<0?'negative':''}">${signed(e.profit)}</strong><small>Operating result</small></div><div><strong class="${e.surplus<0?'negative':''}">${signed(e.surplus)}</strong><small>After owner time</small></div></div>
  ${guidedOffers?`<details class="estimate-detail" data-disclosure="offer-estimate"><summary>What goes into this estimate?</summary>${detail}</details>`:detail}`:'';
 const runDays=validRunLength(draft.months)?draft.months*30:null;
 const runAction=state.day===0?btn(runDays?'Simulate '+runDays+' days':'Simulate run','simulate',guidedOffers?'soft full':'primary full',error?'disabled':''):changed?btn('Review & apply changes','review','primary full',error?'disabled':''):btn('Resume run','view','primary full','data-view="map"');
 return `<section class="panel summary-card"><h2>${runDays?runDays+'-day estimate':'Run estimate'}</h2>${guidedServiceIssue?'<p class="helper">Complete your service details to see the run estimate.</p>':error?`<div class="banner danger"><span role="status">${esc(previewIssue)}</span> ${fix}</div>`:''}${figures}<div class="divider"></div>${runAction}${changed&&state.day===0?btn('Review setup only','review','ghost full',error?'disabled':''):''}${changed?btn('Cancel all draft changes','discard','ghost full'):''}</section>`;
}
function updatePreview(){scheduleSave();}
function workflowPath(){return `<div class="handoff-strip" aria-label="Project handoffs">${Object.entries(WORKFLOW_STAGES).filter(([,v])=>v.order>0&&v.order<8).sort((a,b)=>a[1].order-b[1].order).map(([id,v])=>btn(`<span>${v.order}</span><b>${esc(v.label)}</b><small>${esc(v.handoff)}</small>`,'stage','handoff-step '+(selection?.type==='stage'&&selection.id===id?'selected':''),`data-id="${id}"`)).join('')}</div>`;}
function focusViewHeading(){
 const title=document.querySelector(view==='studio'?'#studio-heading':'#sim-heading');
 title?.focus({preventScroll:true});window.scrollTo?.({top:0,behavior:'instant'});
}
function openInspector(type,button){
 stop();
 if(view!=='map'||selection?.type!==type||selection?.id!==button.dataset.id){
  inspectorTrail.push({view,selection,key:focusKey(button),button});
 }
 selection={type,id:button.dataset.id};view='map';render();
 const heading=document.querySelector('#inspector');
 heading?.focus({preventScroll:true});heading?.scrollIntoView?.({block:'start'});
}
function leaveInspector(){
 const from=inspectorTrail.pop();
 selection=from?.selection||null;view=from?.view||'map';render();
 if(from?.button?.isConnected)from.button.focus();
 else if(from?.key)restoreFocus(from.key,true);
 else focusViewHeading();
}
function activityView(){
 const recent=state.events[0],done=state.day>=state.config.months*30;
 const project=recent?.project&&state.projects.find(p=>p.id===recent.project);
 const latest=recent?`Day ${recent.day} · ${esc(recent.text)}`:'';
 const status=done?'Run complete':state.day?'Latest activity':'Ready to run';
 const endNote=done&&state.projects.some(p=>p.stage!=='lost'&&p.stage!=='complete')?
  state.config.months<12?'Open jobs keep their place. Extend the run length in Controls to continue.':'Open jobs are shown as of the final day.':'';
 return `<section class="panel activity-summary"><div><h2>${status}</h2>${latest?`<p>${latest}${project?' · '+btn(esc(project.id),'project','small ghost',`data-id="${esc(project.id)}" data-origin="activity"`):''}</p>`:''}${endNote?`<p>${endNote}</p>`:''}</div>
 <div class="actions">${done?btn('Review results','review-latest-results','primary'):!state.blocked?btn('Next project event','next-event','soft'):''}${state.day===0&&!state.blocked?btn('Open worked example','example','small'):''}</div></section>`;
}
function laneView(lane,stages,bottleneck,projects){
 const count=stages.reduce((n,id)=>n+projects[id].length,0);
 const heading=`${icon(lane.icon)}<div><h3>${esc(lane.name)}</h3><small>${esc(lane.helper)} · ${count} waiting</small></div>`;
 const cards=`<div class="stage-grid ${stages.length===1?'single':''}">${stages.map(id=>stageCard(id,bottleneck,projects[id])).join('')}</div>`;
 if(!count)return `<details class="work-lane empty-lane" data-lane="${lane.id}" data-disclosure="empty-lane-${lane.id}"><summary class="lane-heading">${heading}</summary>${cards}</details>`;
 return `<section class="work-lane" data-lane="${lane.id}"><div class="lane-heading">${heading}</div>${cards}</section>`;
}
function workResource(stage){
 if(stage==='design')return 'design';
 if(['quote','review','delivery'].includes(stage))return 'owner';
 return null;
}
function attentionRank(p,capacity){
 if(state.blocked?.project===p.id)return 0;
 if(p.work[p.stage]>0&&capacity[workResource(p.stage)]===0)return 1;
 if(p.accepted!==undefined&&!p.delivered&&state.day>p.due)return 2;
 if(p.stage==='payment'&&state.day>p.paymentDue)return 3;
 if(p.accepted!==undefined&&!p.delivered&&p.due===state.day)return 4;
 if(workResource(p.stage)||p.stage==='approval'&&p.approvalConfirmed)return 5;
 return p.stage==='payment'?7:6;
}
function countDays(days){return days+' day'+(days===1?'':'s');}
function effortHours(hours){
 if(hours>0&&hours<.01)return 'under 0.01';
 return String(QQ.round(hours));
}
function jobWait(p,diagnostic){
 const stage=p.stage,work=effortHours(p.work[stage]||0);
 const who=stage==='inquiry'?'You':WORKFLOW_STAGES[stage].owner;
 const phase={quote:'Preparing quote',design:'In design',review:'In review',delivery:'Ready for handoff'};
 let reason='',next='',status=phase[stage]||shortLabels[stage];
 if(stage==='complete'||stage==='lost'){
  return {status,actor:'',reason:stage==='complete'?'The work was delivered and fully paid.':'The client declined this quote.',next:'',urgent:false};
 }
 if(state.blocked?.project===p.id){
  return {status:'Funding needed',actor:'You',reason:state.blocked.note+' could not be paid on day '+(state.day+1)+'.',next:'Resolve the '+offerAmount(state.blocked.gap)+' cash shortfall to retry that day.',urgent:true};
 }
 if(stage==='payment'){
  const overdue=Math.max(0,state.day-p.paymentDue);
  reason=offerAmount(QQ.round(p.price-p.paid))+' remains unpaid from delivery on day '+p.deliveredDay+'.';
  next='Payment due day '+p.paymentDue+' · expected collection day '+p.receiveDay+'.';
  status=overdue?'Payment '+countDays(overdue)+' overdue':'Awaiting payment';
 }else if(stage==='approval'){
  reason=p.approvalConfirmed?'Client approval has been recorded.':'The client has had the design since day '+p.entered+'.';
  next=p.approvalConfirmed?'The approved design advances on the next simulated day.':'Expected client response on day '+(state.day+Math.max(1,diagnostic.remainingCalendarDays))+'.';
  status=p.approvalConfirmed?'Approval recorded':'Awaiting approval';
 }else if(stage==='production'){
  reason=diagnostic.reasonCode==='supplier-reprint'?'The supplier is reprinting the order.':'The supplier is producing the print order.';
  next='Current print run due to finish on day '+(state.day+Math.max(1,diagnostic.remainingCalendarDays))+'.';
  status=diagnostic.reasonCode==='supplier-reprint'?'Supplier reprint':'In production';
 }else if(stage==='inquiry'){
  reason='The inquiry is ready for quote intake.';next='It enters your quote queue on the next simulated day.';
 }else{
  const design=stage==='design';
  const task={quote:'prepare the quote',review:'review the design',delivery:'hand over the work'}[stage];
  reason=design?'The design team needs '+work+' more work hours.':'You need '+work+' more hours to '+task+'.';
  if(diagnostic.disruptions.revisionCount&&['design','review'].includes(stage))reason='Client revision '+diagnostic.disruptions.revisionCount+'. '+reason;
  if(diagnostic.dailyCapacity===0&&p.work[stage]>0){
   status=design?'No design capacity':'No owner time for projects';
   next=design?'Add designer availability in People.':state.config.ownerHours===0?'Add your available hours in People.':'Reduce outreach in Demand or add owner hours in People.';
   if(diagnostic.lateDays||p.accepted!==undefined&&p.due===state.day)reason+=' Available '+(design?'design':'owner project')+' time is zero.';
  }else if(diagnostic.remainingWorkHours===0&&p.work[stage]<=0){
   next='Ready to move on the next simulated day.';
  }else if(diagnostic.queueAheadCount){
   next=diagnostic.queueAheadCount+' other '+(diagnostic.queueAheadCount===1?'job':'jobs')+' ahead for '+(design?'design':'your time')+' · '+effortHours(diagnostic.queueAheadHours)+' h ahead.';
  }else{
   next='First in the '+(design?'design':'owner')+' work queue.';
  }
  if(diagnostic.dailyCapacity>0&&p.work[stage]>0&&state.day%7>=5){
   next+=' Working hours resume on day '+(state.day+8-state.day%7)+'.';
  }
 }
 const late=diagnostic.lateDays;
 if(late){status='Delivery '+countDays(late)+' late';reason+=' Delivery was promised for day '+p.due+'.';}
 else if(p.accepted!==undefined&&!p.delivered&&p.due===state.day){status='Delivery due today';}
 return {status,actor:who,reason,next,urgent:late>0||p.stage==='payment'&&state.day>p.paymentDue||diagnostic.kind==='resource'&&p.work[stage]>0&&diagnostic.dailyCapacity===0};
}
function jobsToWatch(ordered){
 const active=ordered.filter(p=>p.stage!=='lost'&&p.stage!=='complete');
 const capacity=QQ.workCapacity(state.config);
 // The engine order breaks ties so the summary never changes scheduling.
 const first=[...active].sort((a,b)=>attentionRank(a,capacity)-attentionRank(b,capacity)).slice(0,3);
 const block=state.blocked;
 const funding=block?`<div class="run-funding"><b>Day ${state.day+1} paused for funding</b><p>${esc(block.note)} needs ${offerAmount(block.amount)}. Available cash at that point was ${offerAmount(block.cash)}, leaving a ${offerAmount(block.gap)} shortfall.</p>${btn('Resolve shortfall','cash','soft small')}</div>`:'';
 const rows=first.map(p=>{
  const wait=jobWait(p,QQ.projectDiagnostic(state,p,ordered));
  return `<li class="attention-job"><div class="attention-identity">${btn(esc(p.client)+' · '+esc(p.id),'project','table-link',`data-id="${esc(p.id)}" data-origin="watch"`)}<small>${serviceName(p.service)} · ${esc(wait.actor)}</small></div><div class="attention-copy"><strong class="attention-status${wait.urgent?' needs-attention':''}">${esc(wait.status)}</strong><p class="attention-reason">${esc(wait.reason)}</p><small class="attention-next">${esc(wait.next)}</small></div></li>`;
 }).join('');
 const empty=block?'':state.day===0?'Your first job appears when an inquiry matches a service.':state.projects.length?'Every job so far has been completed or declined.':'No inquiries have entered a project queue yet.';
 const waiting=first.find(p=>workResource(p.stage)&&p.work[p.stage]>0);
 return `<section class="panel run-attention"><div class="panelhead"><h2>Jobs to watch</h2><span>Day ${state.day} · ${active.length} open</span></div>${funding}${rows?`<ul class="attention-list">${rows}</ul>`:`<p class="helper">${esc(empty)}</p>`}${active.length>first.length?btn('View all '+active.length+' open jobs','all-open-jobs','small'):''}${waiting&&!block&&!selection?replayPromptView(waiting):''}</section>`;
}
function mapView(m){
 const ordered=QQ.orderedProjects(state);
 const projects=Object.fromEntries(QQ.STAGES.concat('lost').map(stage=>[stage,[]]));
 for(const p of ordered)projects[p.stage]?.push(p);
 const b=QQ.bottleneck(state);
 const laneStages=lane=>Object.entries(WORKFLOW_STAGES).filter(([id,v])=>v.lane===lane.id&&v.order>0&&v.order<8).sort((a,b)=>a[1].order-b[1].order).map(([id])=>id);
 const queues=`<details class="panel handoff-toggle run-queues" data-disclosure="run-queues"><summary>Work queues by responsibility</summary><div class="lanes">${WORKFLOW_LANES.map(lane=>laneView(lane,laneStages(lane),b,projects)).join('')}</div><div class="mapfooter">${m.unserved?`<span>${m.unserved} inquiries outside current offerings</span>`:''}<span>Model ${state.modelVersion||1} · ${esc(state.workloadId||'legacy workload')}</span>${btn(m.complete+' completed projects','filter-complete','small')}</div></details>`;
 const metrics=`<div class="metrics">${metric('Cash available',offerAmount(state.cash),'Includes opening cash and funding','accent')}${metric('Operating result',offerAmount(m.profit),'Delivered revenue minus all incurred costs',m.profit<0?'negative':'')}${metric('Your time',num(state.ownerHours)+' h',num(m.ownerOpenHours)+' h still queued')}${metric('Late open deliveries',m.late,m.quoteCount+' quotes open · oldest '+m.oldestQuoteAge+' d',m.late?'negative':'')}</div>`;
 return `<div class="workgrid ${selection?'has-selection':'run-unselected'}"><div class="run-primary">${jobsToWatch(ordered)}${activityView()}${queues}<details class="panel handoff-toggle" data-disclosure="workflow-path"><summary>Full project handoff map</summary>${workflowPath()}</details>${metrics}</div>${selection?`<aside class="inspector panel" id="inspector" tabindex="-1" aria-label="Selected project or queue details">${inspector(ordered)}</aside>`:''}</div>`;
}
function projectButton(p,origin='lane'){const late=state.day>p.due&&p.accepted!==undefined&&!p.delivered,status=[p.priority?'Priority':'',late?'Late':'',num(p.work[p.stage]||0)>0?num(p.work[p.stage])+' h':state.day-p.entered+' d'].filter(Boolean).join(' · ');return btn(`<span><b>${esc(p.client)}</b><small>${p.clientType?esc(businessType(p.clientType))+' · ':''}${serviceName(p.service)} · ${p.id}</small></span><span class="project-status">${status}</span>`,'project','projectchip '+(selection?.id===p.id?'selected':''),`data-id="${p.id}" data-origin="${origin}" style="--svc:${p.service.color}"`);}
function stageCard(stage,b,ps=QQ.orderedProjects(state).filter(p=>p.stage===stage)){const meta=WORKFLOW_STAGES[stage];return `<div class="stage-card ${b?.stage===stage&&b.resource!=='external'&&b.days>=1?'bottleneck':''} ${selection?.type==='stage'&&selection.id===stage?'selected':''}"><button class="stage-title" data-action="stage" data-id="${stage}"><span><i>${stageNumber[stage]}</i>${shortLabels[stage]}</span><b>${ps.length}</b></button><p class="stage-context">${esc(meta.queue)}</p>${ps.slice(0,2).map(p=>projectButton(p)).join('')||'<p class="emptyqueue">No projects waiting</p>'}${ps.length>2?btn('View all '+ps.length+' projects','stage','small ghost','data-id="'+stage+'"'):''}</div>`;}
function inspector(ordered){
 if(selection.type==='project'){
  const p=state.projects.find(p=>p.id===selection.id);
  if(p)return projectPanel(p,ordered);
 }
 if(selection.type==='stage'){
  const stage=selection.id,ps=ordered.filter(p=>p.stage===stage),meta=WORKFLOW_STAGES[stage];
  return `<div class="panelhead"><h2>${shortLabels[stage]}</h2>${btn(icon('close'),'unselect','ghost small','aria-label="Close details"')}</div><div class="inspectbody"><div class="responsibility-card"><span>Responsible for this stage</span><b>${esc(meta.owner)}</b><small>${esc(meta.handoff)}</small></div><p class="helper">${ps.length} projects · ${esc(meta.queue)}</p>${ps.map(p=>projectButton(p,'queue-details')).join('')||'<div class="empty">This queue is empty.</div>'}${workResource(stage)?btn('Adjust available time','team','soft full'):''}</div>`;
 }
 return `<div class="panelhead"><h2>Project details</h2>${btn('Close','unselect','small')}</div><p class="empty">This project is no longer in the current run.</p>`;
}
function projectPanel(p,ordered){
 const done=['complete','lost'].includes(p.stage);
 const cycle=p.orderKind==='paid-cycle-renewal'?'Paid-cycle renewal':p.orderKind==='confirmed-repeat'?'Confirmed repeat order':p.orderKind==='campaign-reoffer'?'New campaign quote':'New business';
 const diagnostic=QQ.projectDiagnostic(state,p,ordered),wait=jobWait(p,diagnostic);
 const diagnosticRows=[['Current stage',shortLabels[p.stage]]];
 if(p.stage!=='lost')diagnosticRows.push(['Entered this stage','Day '+p.entered]);
 if(!done)diagnosticRows.push(['Time at this stage',countDays(diagnostic.waitDays)]);
 if(diagnostic.disruptions.rushDeadline)diagnosticRows.push(['Rush event','Shorter deadline agreed']);
 if(diagnostic.disruptions.revisionCount)diagnosticRows.push(['Revision rounds',diagnostic.disruptions.revisionCount]);
 if(diagnostic.disruptions.reprintCount)diagnosticRows.push(['Supplier reprints',diagnostic.disruptions.reprintCount]);
 if(diagnostic.disruptions.extendedPaymentDays)diagnosticRows.push(['Collection delay',diagnostic.disruptions.extendedPaymentDays+' days after due']);
 if(p.terms?.fulfillment){
  diagnosticRows.push(['Customer print choice',p.terms.fulfillment.mode==='agency-managed'?'We manage printing':'Customer arranges printing'],['Agreed supplier allowance',offerAmount(p.printCost)],['Quoted print options',offerAmount(p.terms.fulfillment.managedPrice)+' managed / '+offerAmount(p.terms.fulfillment.designOnlyPrice)+' files only']);
 }
 if(p.service?.campaign)diagnosticRows.push(['Campaign rhythm',p.service.campaign.cadenceDays===90?'Seasonal · separately quoted':'Monthly · separately quoted']);
 if(workResource(p.stage)){
  diagnosticRows.push(['Pool capacity per working day',effortHours(diagnostic.dailyCapacity)+' h']);
  if(p.stage==='design')diagnosticRows.push(['Daily design limit per job',effortHours(state.config.designerHours/5)+' h']);
  if(diagnostic.queueAheadCount)diagnosticRows.push(['Work ahead',diagnostic.queueAheadCount+' jobs · '+effortHours(diagnostic.queueAheadHours)+' h']);
  if(diagnostic.estimatedWorkdays!==null)diagnosticRows.push(['Estimated time for this stage',diagnostic.estimatedWorkdays+' working days at current capacity']);
 }
 const terms=[['Agreed price',p.accepted!==undefined?offerAmount(p.price):'Set at acceptance'],['Direct costs',offerAmount(p.cost)],['Cash received',offerAmount(p.paid)],['Balance owed',p.accepted!==undefined?offerAmount(p.price-p.paid):'—'],['Your hours',num(p.ownerHours)],['Designer hours',num(p.designHours)],['Delivery due',p.accepted!==undefined?'Day '+p.due:'Set at acceptance'],['Fulfillment',p.fulfillmentStatus==='delivered'?'Delivered':p.stage==='lost'?'Declined':'Open'],['Payment',p.paymentStatus],['Renewal',p.renewalStatus],['Model demand ID',p.demandId]];
 const attr=`data-id="${esc(p.id)}"`,priority=btn(p.priority?'Remove priority':'Prioritize work','priority','small',attr);
 const priorityHere=workResource(p.stage)&&diagnostic.dailyCapacity>0&&(diagnostic.queueAheadCount||p.priority)&&!state.blocked;
 const approvalHere=p.stage==='approval'&&!p.approvalConfirmed&&!state.blocked;
 let primary='';
 if(state.blocked?.project===p.id)primary=btn('Resolve shortfall','cash','soft small');
 else if(approvalHere)primary=btn('Confirm client approval','approve','soft small',attr);
 else if(workResource(p.stage)&&diagnostic.dailyCapacity===0&&p.work[p.stage]>0)primary=btn('Adjust available time','team','soft small');
 else if(priorityHere)primary=priority;
 const controls=[
  !done&&!priorityHere?priority:'',
  !done&&!p.delivered&&p.accepted!==undefined?btn('Extend deadline +3d','deadline','small',attr):'',
  p.stage==='approval'&&!p.approvalConfirmed&&!approvalHere?btn('Confirm client approval','approve','soft small',attr):''
 ].filter(Boolean).join('');
 const nextDayNote=!done&&state.day>=state.config.months*30?
  (state.config.months<12?'The run ends here. Extend its length in Controls to simulate later days.':'This is the final day of the 12-month run.'):'';
 const scope=p.terms?.fulfillment?.mode==='design-only'?(p.service.filesOnlyScope||'Print-ready artwork and agreed digital files. The customer arranges printing.'):p.service.deliverable;
 return `<div class="panelhead"><div><div class="eyebrow">${esc(p.id)} · ${esc(shortLabels[p.stage])}</div><h2>${esc(p.client)}</h2><small>${serviceName(p.service)}</small></div>${btn(icon('close'),'unselect','ghost small','aria-label="Close details"')}</div><div class="inspectbody">
 <section class="project-next"><h3>${done?'Outcome':'What happens next'}</h3><strong class="attention-status${wait.urgent?' needs-attention':''}">${esc(wait.status)}${wait.actor?' · '+esc(wait.actor):''}</strong><p>${esc(wait.reason)}</p>${wait.next?`<p>${esc(wait.next)}</p>`:''}${nextDayNote?`<p class="helper">${nextDayNote}</p>`:''}${primary}</section>
 ${!state.blocked&&workResource(p.stage)&&p.work[p.stage]>0?replayPromptView(p):''}
 <h3>${p.accepted===undefined?'Requested deliverable':'Agreed deliverable'}</h3><p>${esc(scope)}</p>
 ${controls?`<details class="project-disclosure" data-disclosure="controls-${p.id}"><summary>Project controls</summary><div class="actions">${controls}</div></details>`:''}
 <details class="project-disclosure" data-disclosure="terms-${p.id}"><summary>Scope, timing and costs</summary>${p.clientType?`<p class="client-context"><b>${esc(businessType(p.clientType))}</b> · ${esc(p.brief)} · ${cycle}${p.cycle>1?' · Cycle '+p.cycle:''}</p>`:''}<div class="diagnostic-grid">${diagnosticRows.map(([l,v])=>`<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div><div class="kvs">${terms.map(([l,v])=>`<div><label>${l}</label><strong>${esc(v)}</strong></div>`).join('')}</div><p class="helper">Direct costs exclude overhead and your time. Quote effort locks at intake. Delivery effort and commercial terms lock at acceptance.</p></details>
 <details class="project-disclosure" data-disclosure="timeline-${p.id}"><summary>Project timeline</summary><div class="timeline">${[...p.log].reverse().map(e=>`<div class="event"><small>DAY ${e.day}</small><span>${esc(e.text)}</span></div>`).join('')}</div></details></div>`;
}
function projectsView(){return `<div class="project-tools"><label class="search-label">Search client or project<input id="project-search" value="${esc(search)}" placeholder="e.g. Maple or P003"></label><label class="search-label">Show<select id="project-filter">${[['active','Active work'],['all','All projects'],['late','Late deliveries'],['payment','Awaiting payment'],['complete','Completed'],['lost','Declined']].map(([v,n])=>`<option value="${v}" ${filter===v?'selected':''}>${n}</option>`).join('')}</select></label></div><section class="panel" id="project-table">${projectTable()}</section>`;}
function projectTable(){const needle=search.trim().toLowerCase();const ps=state.projects.filter(p=>(!needle||[p.client,p.id,p.service.name,serviceCopy(p.service,'name')].some(x=>x.toLowerCase().includes(needle)))&&(filter==='all'||filter==='active'&&!['lost','complete'].includes(p.stage)||filter==='late'&&p.accepted!==undefined&&!p.delivered&&p.stage!=='lost'&&state.day>p.due||p.stage===filter));return `<div class="tablewrap"><table><thead><tr><th>Client / project</th><th>Business type</th><th>Service</th><th>Stage</th><th>Responsible</th><th>Agreed price</th><th>Delivery due</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${btn(esc(p.client),'project','table-link','data-id="'+p.id+'"')}<small>${p.id}</small></td><td>${p.clientType?esc(businessType(p.clientType)):'Generic'}</td><td>${serviceName(p.service)}</td><td>${shortLabels[p.stage]}</td><td>${stageOwner[p.stage]}</td><td>${p.accepted!==undefined?money(p.price):'—'}</td><td>${p.accepted!==undefined?'Day '+p.due:'—'}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">No matching projects. Advance the clock or change your filter.</div></td></tr>'}</tbody></table></div>`;}
function daySpan(first,last){return first===last?'Day '+first:'Days '+first+'–'+last;}
function cashFinanceView(m){
 const lastMonth=Math.max(1,Math.ceil(state.day/30));
 if(cashView.run!==state)cashView={run:state,month:0,page:0};
 const month=cashView.month>0&&cashView.month<=lastMonth?cashView.month:0;
 const period=month?QQ.monthResult(state,month):null;
 const rows=[];
 let receipts=0;
 for(let index=0;index<state.ledger.length;index++){
  const entry=state.ledger[index];
  if(period&&(entry.day<period.firstDay||entry.day>period.endDay))continue;
  if(entry.type==='receipt')receipts+=entry.amount;
  rows.push({entry,index});
 }
 const pageSize=100,lastPage=Math.max(0,Math.ceil(rows.length/pageSize)-1);
 const page=Math.min(lastPage,cashView.page);
 const end=rows.length-page*pageSize,start=Math.max(0,end-pageSize);
 const visible=rows.slice(start,end).reverse();
 const opening=period?.openingCash??state.initialCash,closing=period?.closingCash??state.cash;
 const costs=period?.cost??state.expenses,funding=period?.funding??state.funding;
 const receivable=period?.receivable??m.receivable;
 const periodLabel=period&&period.days?daySpan(period.firstDay,period.endDay):daySpan(0,period?0:state.day);
 const options=Array.from({length:lastMonth},(_,i)=>`<option value="${i+1}" ${month===i+1?'selected':''}>Month ${i+1}</option>`).join('');
 const navigation=`<div class="ledger-period"><label class="search-label">Cash period<select id="ledger-month"><option value="0" ${month?'':'selected'}>Whole run</option>${options}</select></label>
 <span>${periodLabel}</span>${month?btn('Back to month '+month+' results','month-overview','small',`data-month="${month}"`):''}</div>`;
 const metrics=`<div class="metrics">${metric(period?'Closing cash':'Cash available',dollars(closing),periodLabel,'accent')}${metric('Client payments collected',dollars(receipts),'Deposits and final payments')}${metric('Costs paid',dollars(costs),'Design, supplier and shared costs')}${metric('Delivered receivables',dollars(receivable),period?'Outstanding at the end of this period':m.overduePayments+' overdue final payments')}</div>`;
 const reconciliation=analyticsRows([['Opening cash',dollars(opening)],['+ Owner funding',dollars(funding)],['+ Client collections',dollars(receipts)],['− Costs paid',dollars(costs)],['= Closing cash',dollars(closing)]]);
 const fundingAction=!period||month===lastMonth?btn('Add owner funding','fund','soft'):'';
 const ledger=analyticsTable(['Day','Transaction','Project','Cash movement'],visible.map(({entry:e,index})=>`<tr><td>${e.day}</td><td>${esc(e.note)}</td><td>${e.project?btn(esc(e.project),'project','table-link',`data-id="${esc(e.project)}" data-ledger-index="${index}"`):'—'}</td>${resultCell(e.amount)}</tr>`),'No transactions in this period.');
 const pages=lastPage?`<div class="analytics-pagination"><span>Transactions ${rows.length-end+1}–${rows.length-start} of ${rows.length} · newest first</span><div class="actions">${btn('Newer','ledger-page','small',`data-delta="-1" ${page?'':'disabled'}`)}${btn('Older','ledger-page','small',`data-delta="1" ${page===lastPage?'disabled':''}`)}</div></div>`:'';
 return `${navigation}${metrics}<div class="two-col"><section class="panel padded"><h2>Reconcile the cash balance</h2>${reconciliation}<p class="helper">Collections can arrive before or after delivery. Owner funding adds to cash.</p>${fundingAction}</section><section class="panel padded"><h2>Cash over time</h2>${cashChart(period?period.firstDay-1:0,period?.endDay??state.day)}</section></div>
 <section class="panel analytics-section"><div class="panelhead"><h2 id="ledger-heading" tabindex="-1">Cash ledger</h2><span>${rows.length} transaction${rows.length===1?'':'s'}</span></div>${ledger}${pages}</section>`;
}
function cashChart(firstDay=0,endDay=state.day){
 const points=QQ.cashSeries(state).filter(v=>v.day>=firstDay&&v.day<=endDay);
 const lo=Math.min(0,...points.map(v=>v.cash)),hi=Math.max(1,...points.map(v=>v.cash))*1.05;
 const x=day=>65+(day-firstDay)/Math.max(1,endDay-firstDay)*565,y=cash=>140-(cash-lo)/(hi-lo)*120;
 return `<svg class="chart" viewBox="0 0 650 170" role="img" aria-label="Cash balance from day ${firstDay} to day ${endDay}"><path d="M65 20H630 M65 80H630 M65 140H630" stroke="var(--line)"/><polyline points="${points.map(v=>x(v.day)+','+y(v.cash)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${points.length===1?`<circle cx="${x(firstDay)}" cy="${y(points[0].cash)}" r="3" fill="var(--accent)"/>`:''}<text x="0" y="24" class="axislabel">${money(hi)}</text><text x="0" y="144" class="axislabel">${money(lo)}</text><text x="65" y="165" class="axislabel">Day ${firstDay}</text>${endDay!==firstDay?`<text x="575" y="165" class="axislabel">Day ${endDay}</text>`:''}</svg>`;
}
function baselineIndex(){return checkpointInfo.findIndex(v=>v.baseline);}
function recipeOrigin(config){
 const r=config?.recipe;if(!r)return '';
 const groups=[QQPresets.MARKETS,QQPresets.OPERATIONS,QQPresets.MIXES,QQPresets.CONDITIONS],ids=[r.market,r.operation,r.mix,r.condition];
 const found=groups.map((items,i)=>items.find(v=>v.id===ids[i]));
 return found.every(Boolean)?found.map(v=>v.name).join(' · '):'';
}
function savedCarrySource(record){
 if(record.source)return {source:record.source,available:true,reason:''};
 if(record.sourceDay<record.endDay)return {source:null,available:true,reason:''};
 return {source:null,available:true,projectFromClose:true,reason:'Continue from the saved month-end settings. Later settings, funding and project decisions from the original run are unavailable here.'};
}
function persistReplayPair(base,alternative,descriptor,source=null){
 if(loading||storeError||recoveryRaw!==null||primaryReadFailed)throw Error('Resolve the simulator save warning before saving a comparison.');
 const pair=MEIQQWorkspace.saveReplayPair(currentWorkspace(),base,alternative,descriptor,source);
 MEIQQWorkspace.serialize({...currentWorkspace(),saved:pair.saved,checkpointInfo:pair.checkpointInfo},archives);
 saved=pair.saved;checkpointInfo=pair.checkpointInfo;
 comparisonSelection={base:pair.baselineRun,alternative:pair.alternativeRun,record:pair.record};
 save();
 return pair;
}
function showSavedComparison(base,alternative,record){
 const a=saved.indexOf(alternative),b=saved.indexOf(base);
 if(a<0||b<0||a===b)throw Error('Choose two saved runs.');
 const records=(checkpointInfo[a].replays||[]).filter(r=>r.baselineId===checkpointInfo[b].replayId);
 const selected=record||records.find(r=>r===comparisonSelection?.record)||records[0];
 comparisonSelection={base,alternative,record:selected||null};
 stop();mobileNavOpen=false;inspectorTrail=[];selection=null;view='finances';analyticsTab='compare';
 render();focusViewHeading();
}
function comparedRuns(){
 const index=comparisonSelection?saved.indexOf(comparisonSelection.base):-1;
 const b=index>=0?index:baselineIndex();
 const a=index>=0?saved.indexOf(comparisonSelection.alternative):-1;
 const alternative=a>=0&&a!==b?saved[a]:state;
 const record=b>=0&&a>=0&&a!==b?(checkpointInfo[a]?.replays||[]).find(r=>r.baselineId===checkpointInfo[b]?.replayId&&(!comparisonSelection?.record||r===comparisonSelection.record)):null;
 return {b,a:alternative===state?-1:a,base:b>=0?saved[b]:null,alternative,record};
}
function savedExperiments(){
 const rows=[];
 checkpointInfo.forEach((info,index)=>(info.replays||[]).forEach((r,recordIndex)=>{
  const job=saved[index].projects.find(p=>p.demandId===r.demandId);
  const label='Month '+r.month+' · '+DIFF_LABELS[r.key]+' '+r.before+' → '+r.after;
  const horizon=r.carriedThrough?(savedCarrySource(r).projectFromClose?' · projection through day ':' · through day ')+r.carriedThrough:'';
  rows.push(btn(esc(label)+(job?' · '+esc(job.client):'')+horizon+(r.finishAcceptedWork?' · accepted-work projection':''),'open-saved-replay','table-link',`data-index="${index}" data-record="${recordIndex}"`));
 }));
 return rows.length?`<details class="panel saved-experiments" data-disclosure="saved-replays"><summary>Saved replays (${rows.length})</summary><div>${rows.join('')}</div></details>`:'';
}
function comparisonOverview(base,alternative,comparison){
 const d=comparison.deltas,driver=comparison.dominantDriver;
 const values=s=>{
  const m=QQ.metrics(s);
  return [s.projects.filter(p=>p.accepted!==undefined&&!p.delivered).length,m.delivered,m.profit,QQ.analytics(s).periodAfterOwner,s.cash,m.late];
 };
 const left=values(base),right=values(alternative);
 const labels=['Accepted jobs awaiting delivery','Deliveries','Operating result',base.replayJournal&&alternative.replayJournal?'After owner time at period-end targets':'After owner time (current target where rate history is unavailable)','Closing cash','Late open deliveries'];
 const rows=labels.map((label,i)=>{
  const currency=i>=2&&i<=4,fmt=currency?dollars:String;
  const diff=QQ.round(right[i]-left[i]);
  return `<tr><th scope="row">${label}</th><td>${fmt(left[i])}</td><td>${fmt(right[i])}</td><td>${diff===0?'No change':(diff>0?'+':'')+fmt(diff)}</td></tr>`;
 });
 const changes=configDiff(base.config,alternative.config);
 const identity=comparison.flags.sameWorkloadIdentity?'same seed identity':'different seed identity';
 const validity=comparison.flags.likeForLike?'<p class="banner compact">Same elapsed day, demand settings and recorded external inquiries.</p>':comparison.warnings.map(v=>`<div class="banner warn compact">${esc(v.message)}</div>`).join('');
 return `<p class="helper">Run totals through day ${base.day} for the baseline and day ${alternative.day} for the comparison · ${identity}.</p>${validity}
 ${analyticsTable(['Run to date','Baseline','Comparison','Change'],rows)}
 <details class="comparison-details" data-disclosure="comparison-details"><summary>Financial breakdown and exact assumptions</summary>
 ${driver?.amount?`<p>Largest measured result driver · ${esc(driver.label)} (${dollars(driver.amount)}).</p>`:''}
 <div class="comparison-bridge">${comparison.bridge.map(v=>`<div><span>${esc(v.label)}</span><b>${dollars(v.amount)}</b></div>`).join('')}</div>
 <p class="helper">The bridge adds up to the ${dollars(d.operatingResult)} change in operating result. These are measured associations between runs.</p><h3>Exact assumption changes</h3>${changes.length?`<ul class="change-list assumption-list">${changes.map(v=>`<li>${esc(v.label)} · <b>${esc(v.before)} → ${esc(v.after)}</b></li>`).join('')}</ul>`:'<p class="helper">The applied assumptions match.</p>'}</details>`;
}
function scenariosTableView(compare=true){
 const row=(s,i)=>{const m=QQ.metrics(s),base=i>=0&&checkpointInfo[i]?.baseline,origin=recipeOrigin(s.config);return `<tr class="${base?'baseline-row':''}"><td><b>${esc(i<0?s.config.name:checkpointInfo[i]?.label||s.config.name)}</b>${base?' '+badge('BASELINE'):''}<small>${i<0?'Current run':checkpointInfo[i]?.kind==='automatic'?'Automatic checkpoint':'Saved checkpoint'} · Model ${s.modelVersion||1}</small>${origin?`<small>Recipe origin: ${esc(origin)}. Saved assumptions are authoritative and may include later edits.</small>`:''}</td><td>${s.day}</td><td>${dollars(s.cash)}</td><td>${dollars(m.profit)}</td><td>${num(s.ownerHours)}</td><td>${m.delivered}</td><td>${m.late}</td><td>${i<0?badge('Active'):compare?btn(base?'Pinned':'Pin baseline','pin-baseline','small '+(base?'soft':''),'data-index="'+i+'" aria-pressed="'+base+'"'):btn('Load','load','small','data-index="'+i+'"')+btn('Name / keep','rename-checkpoint','small','data-index="'+i+'"')+btn('Delete','delete-checkpoint','small ghost','data-index="'+i+'"')}</td></tr>`;};
 const {b,a,base,alternative,record}=comparedRuns();
 const header=compare&&base?b===baselineIndex()?'Compared with pinned baseline':'Compared with saved baseline':'';
 const options=compare&&base?[`<option value="-1" ${a<0?'selected':''}>Current run</option>`,...saved.flatMap((run,i)=>i===b?[]:[`<option value="${i}" ${i===a?'selected':''}>${esc(checkpointInfo[i]?.label||run.config.name)}</option>`])].join(''):'';
 let comparisonHtml='';
 if(compare&&base){
  const table=comparisonOverview(base,alternative,QQ.compareRuns(alternative,base));
  const totals=record?`<details class="comparison-details" data-disclosure="paired-totals"><summary>Run-to-date totals and exact assumptions</summary>${table}</details>`:table;
  comparisonHtml=`<section class="panel padded comparison-summary"><h2>${header}</h2><div class="comparison-choices"><span>Baseline · <b>${esc(checkpointInfo[b].label)}</b></span><label>Comparison run <select id="compared-run">${options}</select></label></div>${totals}</section>`;
 }
 const verdict=compare&&record?savedReplayVerdict(base,alternative,record):'';
 const guided=compare?`${verdict}${replayComparisonCard()}${savedExperiments()}`:'';
 return `${guided}${comparisonHtml}<section class="panel"><div class="panelhead"><div><h2>${compare?'Choose a baseline':'Saved runs'}</h2><p class="helper">${compare?'Pin a checkpoint to compare against the current run.':'Open or manage checkpoints from this browser.'}</p></div><div class="actions">${compare?btn('Comparison report','comparison-report','soft',saved.length?'':'disabled'):btn('Compare runs','compare-runs','soft')}${btn('Save checkpoint','checkpoint','soft')}</div></div><div class="tablewrap"><table><thead><tr><th>Scenario</th><th>Day</th><th>Cash</th><th>Operating result</th><th>Owner hours</th><th>Delivered</th><th>Late</th><th></th></tr></thead><tbody>${row(state,-1)}${saved.map(row).join('')}</tbody></table></div></section>`;
}
function scenariosView(){return scenariosTableView(false)+preservationView();}
function comparisonReportDialog(){
 if(!saved.length)throw Error('Save a checkpoint to compare two runs.');
 const {b,a}=comparedRuns();
 const choices=[{id:-1,label:'Current · '+state.config.name,run:state},...saved.map((run,i)=>({id:i,label:checkpointInfo[i]?.label||run.config.name,run}))];
 const select=(id,label,value)=>`<label class="input-field" for="${id}">${label}<select id="${id}">${choices.map(v=>`<option value="${v.id}" ${v.id===value?'selected':''}>${esc(v.label)} · day ${v.run.day}</option>`).join('')}</select></label>`;
 modal(`<h2 id="dialog-title">Create a comparison report</h2><p>Choose any two runs. The report includes comparison warnings, per-project economics, measured results, exact assumption changes and available source records.</p>${select('report-baseline','Baseline',b>=0?b:0)}${select('report-current','Comparison run',a)}<p class="helper">Download an offline HTML report. Open it in your browser to read, print or save as PDF.</p><div class="actions">${btn('Cancel','close')}${btn('Download report','download-comparison','primary')}</div>`);
}
function downloadComparison(){
 const baseline=Number($('#report-baseline').value),current=Number($('#report-current').value);
 const get=i=>i===-1?state:Number.isInteger(i)&&i>=0?saved[i]:null;
 if(current===baseline)throw Error('Choose two different runs.');
 if(!get(current)||!get(baseline))throw Error('Choose available runs.');
 const label=i=>i===-1?'Current · '+state.config.name:checkpointInfo[i]?.label||saved[i].config.name;
 const selection=comparedRuns(),baselineId=checkpointInfo[baseline]?.replayId;
 const records=baselineId?(checkpointInfo[current]?.replays||[]).filter(record=>record.baselineId===baselineId):[];
 const replay=selection.b===baseline&&selection.a===current&&selection.record?selection.record:records.length===1?records[0]:null;
 const base=get(baseline),alt=get(current);
 const options={currentLabel:label(current),baselineLabel:label(baseline),generatedAt:new Date().toISOString(),replay};
 function finish(carry,acceptedProjection){
  const report=QQComparisonReport.create(alt,base,{...options,carry,acceptedProjection});
  download(report.filename,QQI18n.report(report.html),'text/html;charset=utf-8');closeModal();toast('Comparison report downloaded.');
 }
 if(!replay?.carriedThrough&&!replay?.finishAcceptedWork){finish();return;}
 let carry=null,projection=null;
 if(replay.carriedThrough){
  const origin=savedCarrySource(replay);
  if(!origin.available)throw Error(origin.reason);
  carry=QQ.startCapacityCarry(origin.source,base,alt,{...replay,projectFromClose:origin.projectFromClose===true});
 }
 const job={phase:'exporting'};replayDialog=job;
 function progress(message,first,last){
  modal(`<h2 id="dialog-title">Preparing the comparison report</h2><p>${message}</p>${replayProgress(first,last)}<div class="actions">${btn('Cancel','close')}</div>`);
 }
 function startProjection(){
  const verified=carry?QQ.capacityCarryResult(carry):QQ.capacityPairResult(base,alt,{...replay,value:replay.after});
  if(!verified.comparable)throw Error(verified.reason);
  const left=carry?.baseline??base,right=carry?.alternative??alt;
  projection=QQ.startAcceptedProjection(left,right);
  progress('Following accepted orders and outstanding invoices after day '+left.day+'.',left.day,left.day+360);
 }
 if(carry)progress('Checking both runs through day '+carry.endDay+'.',base.day,carry.endDay);
 else progress('Checking the saved final month.',base.day,base.day);
 function advance(){
  if(replayDialog!==job)return;
  try{
   if(replay.finishAcceptedWork&&!projection&&(!carry||carry.phase==='done'))startProjection();
   const session=projection||carry,step=projection?QQ.stepAcceptedProjection:QQ.stepCapacityCarry;
   const start=performance.now();
   for(let i=0;i<12&&session.phase!=='done'&&performance.now()-start<12;i++)step(session);
   updateReplayProgress(session);
   if(session.phase==='done'&&(!replay.finishAcceptedWork||projection))finish(carry,projection);
   else job.timer=setTimeout(advance,0);
  }catch(error){comparisonReportDialog();replayDialog=null;showError(error.message);}
 }
 job.timer=setTimeout(advance,0);
}
function recoverableDraft(file){
 try{
  if(file.name==='Recovered unfinished draft'){
   const result=MEIQQWorkspace.parse({version:2,state,saved:[],draft:JSON.parse(file.text)});
   return result.recoveryFiles.length?null:result.draft;
  }
  if(file.name==='Original save before migration'){
   const result=MEIQQWorkspace.parseText(file.text);
   return result.recoveryFiles.length?null:result.draft;
  }
 }catch(e){}
 return null;
}
function preservationView(){return `<section class="panel padded" style="margin-top:18px"><div class="section-heading"><h2>Preserved workspaces</h2>${btn('Open worked example','example','small')}</div><p class="helper">Opening a backup or example keeps the previous workspace here.</p>${archives.map((a,i)=>`<div class="archive-row"><div><b>${esc(a.label)}</b><p class="helper">Day ${a.workspace.state.day} · ${a.workspace.saved.length} checkpoints · ${a.workspace.state.projects.length} projects · unfinished draft included</p></div><div class="actions">${btn('Open','open-archive','small',`data-index="${i}"`)}${btn('Export','export-archive','small',`data-index="${i}"`)}${btn('Delete','delete-archive','small ghost',`data-index="${i}"`)}</div></div>`).join('')||'<p class="helper">No preserved workspaces yet.</p>'}${recoveryFiles.length?`<details class="original-files" data-disclosure="original-files"><summary>Original files (${recoveryFiles.length})</summary><p class="helper">Copies kept when an older save was updated or an invalid draft was recovered. Download an original, or restore its valid unfinished setup inputs without replacing the active run.</p>${recoveryFiles.map((f,i)=>{const candidate=recoverableDraft(f);return `<div class="archive-row"><span>${esc(f.name==='Original save before migration'?'Save before update':f.name)}</span><div class="actions">${candidate&&JSON.stringify(candidate)!==JSON.stringify(draft)?btn('Restore draft','restore-original-draft','small',`data-index="${i}"`):''}${btn('Download','recovery-file','small',`data-index="${i}"`)}</div></div>`;}).join('')}</details>`:''}</section>`;}
function aboutView(){return `<div class="two-col"><section class="panel padded"><div class="eyebrow">SIMULATION MODEL ${state.modelVersion||1}</div><h2>Start with one experiment</h2><ol><li>Set service prices, hours, inquiry shares and available capacity.</li><li>Review the draft preview, then apply the setup.</li><li>Step a day, finish a month or simulate the selected horizon.</li><li>Inspect a waiting project and select Test one change to replay its month.</li><li>Compare the remaining backlog and earnings, then save the comparison if you want to keep it.</li></ol><h2>What the numbers mean</h2><p>Inquiries are stable external-demand identities derived from the workload seed, arrival day and arrival index. Capacity can change delivery and renewal timing, but it does not reroll unrelated leads.</p><p>Conversion is the share of new-business quotes that accept. Confirmed repeats and paid-cycle renewals bypass new-sales conversion. A deposit is received on acceptance; revenue is recognized on delivery.</p><p>The setup preview counts calendar days and working days across your selected run length. It assumes all expected new orders are delivered. It excludes queue timing, returning clients and uncertainty.</p><p>Operating result is delivered revenue less incurred costs, including unfinished work. Historical results value each month’s owner hours at its closing hourly target. Run-to-date detail also values every hour at today’s target. Both measures leave cash unchanged.</p></section><section class="panel padded"><h2>Model 2 daily order</h2><p>Each day processes due client collections, monthly overhead, confirmed repeat cycles, new external demand, outreach, then scheduled work. A failed payment rolls back the proposed day atomically.</p><p>Zero-duration transitions may continue on the same day under a bounded loop. Real work still consumes weekday capacity; genuine client and supplier waits remain calendar delays.</p><p>Owner capacity is shared across quotes, review and delivery. Design capacity is pooled across projects, but one project can use at most one designer’s daily availability. Multiple projects can proceed in parallel when multiple designers are available.</p><p>Quote effort locks when an inquiry arrives. Price, service scope, delivery effort, payment terms, approval time, print time and delivery promise lock when the quote is accepted. Agreed deadlines cannot be changed before acceptance.</p><p>Monthly and seasonal campaign relationships last one year, with every campaign quoted and paid separately. A declined campaign skips one cycle; another quote follows at the next cadence within the relationship. Future revenue is not guaranteed. Older paid-cycle services keep their confirmed-renewal behavior after delivery and payment. Customer print choice locks at acceptance: managed printing includes the supplier batch; files-only delivery skips production and printer costs. Client, contract, fulfillment, payment and renewal states are stored separately.</p><h2>Business profiles</h2><p>New workspaces draw from illustrative food, retail and local-service business types. Customer mix, niche focus and workflow variation affect work, approval and repeat behavior; targeted offerings serve only matching groups.</p><h2>Prototype limits</h2><p>Published design and print prices are frozen comparables. Package prices, work estimates, demand, customer printing preferences and disruption rates are modeled assumptions with documented derivations, not measured results for your business. Named staff, supplier comparisons, borrowing and native Windows/Mac installers remain future work. Backups include model and workload identities.</p></section></div>`;}
function clock(){
 const end=state.day>=state.config.months*30, disabled=end?'disabled':'';
 const runLabel=running?'Pause':firstExamplePending()?'Run restaurant example':'Run';
 return `<footer class="clock run-clock"><div class="clockday"><b>Day ${state.day} <span>/ ${state.config.months*30}</span></b><small>${state.blocked?'Cash decision needed':running?'Running':end?'Run complete':'Paused'}</small></div>
 <div class="clock-main">${btn(icon(running?'pause':'play')+runLabel,'play','primary',disabled)}${btn('1 day','step','',disabled)}${btn('Finish month','finish','',disabled)}</div>
 <details class="run-options" data-disclosure="run-options"><summary>Controls</summary><div class="run-options-body"><label class="clock-select">Speed<select id="speed" aria-label="Simulation speed">${[1,2,4].map(n=>`<option value="${n}" ${speed===n?'selected':''}>${n}×</option>`).join('')}</select></label><label class="clock-select">Run length · applies now<select id="horizon" aria-label="Simulation horizon">${runLengthOptions(state.config.months,state.day)}</select></label>${btn('Finish run','finish-run','soft',disabled)}${btn('Restart run','restart','small')}</div></details></footer>`;
}
const replayChoices={
 designerHours:{label:'Weekly hours per designer',unit:'h/week per designer',max:120,addition:8},
 designers:{label:'Number of designers',unit:'designers',max:50,addition:1},
 ownerHours:{label:'Your weekly hours',unit:'h/week',max:120,addition:5}
};

function replayPromptView(project){
 const design=project.stage==='design',resource=design?'design capacity':'your available time';
 return `<section class="replay-prompt" aria-label="Capacity experiment for ${esc(project.id)}">
 <span class="replay-motion" aria-hidden="true"><i></i><i></i><i></i></span>
 <div class="replay-prompt-copy"><h3>Could changing ${resource} move ${esc(project.id)}?</h3><p>Replay the same workload and compare the backlog and earnings.</p></div>
 ${btn('Test one change','open-replay','soft',`data-id="${esc(project.id)}" data-origin="${selection?'inspector':'watch'}"`)}</section>`;
}
function replayComparisonCard(){
 const latest=latestCapacityReplay.get(state);
 return `<section class="panel replay-comparison"><div><h2>Replay one change</h2><p>Try a different team size or weekly schedule against the same month’s workload.</p></div><div class="actions">
 ${btn('Test one change','open-replay','soft','data-origin="compare"')}${latest?btn('View last replay','show-last-replay','small'):''}</div></section>`;
}
function openCapacityReplay(id,month,demandId,preferredKey){
 stop();
 const project=demandId?state.projects.find(p=>p.demandId===demandId):id?state.projects.find(p=>p.id===id):null;
 if((id||demandId)&&!project)throw Error('This project is no longer in the active run.');
 const dialog={source:state,sourceDay:state.day,project};
 replayDialog=dialog;
 configureReplay(dialog,month||Math.max(1,Math.ceil(state.day/30)),preferredKey);
}
function replayModal(dialog,html,focusId){
 if(replayDialog!==dialog)return;
 modal(html,focusId);
 if(focusId==='accepted-work-heading')document.querySelector('#'+focusId)?.scrollIntoView?.({block:'start'});
}
function configureReplay(dialog,month,requestedKey){
 dialog.phase='setup';dialog.month=month;dialog.session=null;dialog.carry=null;dialog.carryPair=null;dialog.acceptedWork=null;
 const earliest=Math.max(1,Math.ceil((dialog.project?.created||0)/30));
 const latest=Math.max(1,Math.ceil(state.day/30));
 const periods=Array.from({length:latest-earliest+1},(_,i)=>i+earliest);
 const picker=periods.length>1?`<label class="input-field">Replay period<select id="replay-month">${periods.map(m=>`<option value="${m}" ${m===month?'selected':''}>Month ${m} · days ${(m-1)*30+1}–${m*30}</option>`).join('')}</select></label>`:'';
 const heading=`<h2 id="dialog-title">Test one change${dialog.project?' for '+esc(dialog.project.id):''}</h2>`;
 let setup;
 try{setup=QQ.capacityReplaySetup(state,month);}
 catch(error){
  replayModal(dialog,`${heading}${picker}<p role="status">${esc(error.message)}</p><div class="actions">${btn('Close','close')}</div>`);
  return;
 }
 const {config,firstDay,endDay,conflicts}=setup;
 dialog.setup=setup;
 const preferred=dialog.project&&workResource(dialog.project.stage)==='owner'?'ownerHours':config.designers===0?'designers':'designerHours';
 const available=Object.keys(replayChoices).filter(k=>!conflicts.includes(k));
 if(!available.length){
  replayModal(dialog,`${heading}${picker}<p role="status">Each capacity setting changed during this month. Select a month with a stable setting to test.</p><div class="actions">${btn('Close','close')}</div>`);
  return;
 }
 const key=available.includes(requestedKey)?requestedKey:available.includes(preferred)?preferred:available[0];
 dialog.key=key;
 const choice=replayChoices[key],before=config[key];
 const suggested=before<choice.max?Math.min(choice.max,QQ.round(before+choice.addition)):'';
 const change=Object.entries(replayChoices).map(([k,c])=>`<option value="${k}" ${k===key?'selected':''} ${available.includes(k)?'':'disabled'}>${c.label}${available.includes(k)?'':' (changed during period)'}</option>`).join('');
 let constraint='';
 if(key==='designerHours'&&config.designers===0)constraint='The original has no designers. Extra hours alone leave the design team at zero capacity.';
 if(key==='designers'&&config.designerHours===0)constraint='The original gives each designer zero hours. Another designer alone adds no available time.';
 const period=daySpan(firstDay,endDay),basis=endDay>state.day?`Both copies simulate through day ${endDay}, including the days beyond your current day ${state.day}.`:'Both copies replay the completed period.';
 const label=dialog.project?esc(dialog.project.client)+' · '+serviceName(dialog.project.service)+' · ':'';
 const dirtyNote=dirty()?'<p class="helper">This test uses your applied setup. Pending setup edits stay in your draft.</p>':'';
 replayModal(dialog,`${heading}<p class="helper">${label}Month ${month} · ${period} · seed ${config.seed}</p>
 <p>${basis} Your active run stays on day ${state.day}.</p>
 <div class="replay-proposal">${picker}<label class="input-field">Assumption to change<select id="replay-key">${change}</select></label>
 <div class="replay-original"><span>Original</span><strong>${before} ${choice.unit}</strong></div>
 <label class="input-field">Replay value (${choice.unit})<input type="number" id="replay-value" min="0" max="${choice.max}" step="${key==='designers'?'1':'any'}" value="${suggested}"></label></div>
 ${constraint?`<p class="banner warn">${constraint}</p>`:''}${dirtyNote}
 <div class="actions">${btn('Cancel','close')}${btn('Replay both runs','run-replay','primary')}</div>`,requestedKey?'replay-key':null);
}
function runCapacityReplay(){
 const dialog=replayDialog;
 if(dialog?.phase!=='setup'||dialog.source!==state||dialog.sourceDay!==state.day)throw Error('Reopen the replay from the current run.');
 const input=$('#replay-value'),key=dialog.key;
 if(!input.value?.trim())throw Error('Enter the value to test.');
 const value=Number(input.value),before=dialog.setup.config[key];
 if(!Number.isFinite(value)||value<0||value>replayChoices[key].max||key==='designers'&&!Number.isInteger(value))throw Error('Enter a valid '+replayChoices[key].label.toLowerCase()+' value within the displayed range.');
 if(value===before)throw Error('Choose a different value from the original.');
 const session=QQ.startCapacityReplay(state,{month:dialog.month,key,value,demandId:dialog.project?.demandId});
 dialog.phase='running';dialog.session=session;
 dialog.descriptor={month:dialog.month,key,before,after:value,demandId:dialog.project?.demandId??null,sourceDay:state.day,firstDay:session.firstDay,endDay:session.endDay};
 replayModal(dialog,`<h2 id="dialog-title">Replaying month ${dialog.month}</h2><p>${esc(replayChoices[key].label)} · ${before} → ${value}</p>
 ${replayProgress(0,session.endDay)}
 <p class="helper" id="replay-status" role="status">Restoring the opening workload.</p><div class="actions">${btn('Cancel replay','close')}</div>`);
 function advance(){
  if(dialog!==replayDialog||dialog.phase!=='running')return;
  try{
   if(dialog.source!==state||dialog.sourceDay!==state.day)throw Error('The active run changed. Reopen this test from its current position.');
   const began=performance.now();
   // Restore earlier days in batches, then show both copies advancing together.
   const steps=session.phase==='opening'?4:1;
   for(let step=0;step<steps&&performance.now()-began<10&&session.phase!=='done';step++)QQ.stepCapacityReplay(session);
   if(session.error)throw Error(session.error);
   if(session.phase==='done'){
    const result=QQ.capacityReplayResult(session);
    dialog.phase='result';dialog.result=result;
    dialog.session={baseline:session.baseline,alternative:session.alternative};
    dialog.originalSource=session.source;
    latestCapacityReplay.set(state,{session:dialog.session,descriptor:dialog.descriptor,result,project:dialog.project,originalSource:dialog.originalSource});
    showCapacityReplay(dialog);
    return;
   }
   updateReplayProgress(session);
   const status=session.phase==='opening'?'Restoring the opening workload.':'Replaying the same scheduled days.';
   if($('#replay-status').textContent!==status)$('#replay-status').textContent=QQI18n.text(status);
   dialog.timer=setTimeout(advance,16);
  }catch(error){
   dialog.phase='error';dialog.session=null;
   replayModal(dialog,`<h2 id="dialog-title">Replay stopped</h2><p role="alert">${esc(error.message)}</p><div class="actions">${btn('Close','close')}${btn('Edit change','repeat-replay','soft')}</div>`);
  }
 }
 dialog.timer=setTimeout(advance,16);
}
function replayJobStatus(job){
 if(!job)return 'No matching job';
 if(job.delivered)return 'Delivered day '+job.deliveredDay;
 const stage={quote:'In quote queue',design:'In design',review:'In review',approval:'Awaiting approval',production:'In production',delivery:'Ready for delivery',lost:'Quote declined'}[job.stage]||shortLabels[job.stage]||job.stage;
 return stage+(job.remainingWorkHours>0?' · '+effortHours(job.remainingWorkHours)+' h left':'');
}
function replayProgress(start,end){
 const bar=(id,label)=>`<label class="replay-progress"><span>${label} <output id="${id}-day">Day ${start}</output></span><progress id="${id}" aria-label="${label} replay" value="${start}" max="${end}"></progress></label>`;
 return `<div class="replay-flow">${bar('replay-base','Original')}${bar('replay-alt','Changed')}</div>`;
}
function updateReplayProgress(session){
 for(const [id,run] of [['replay-base',session.baseline],['replay-alt',session.alternative]]){
  const day=run?.day??0;
  $('#'+id).value=day;
  $('#'+id+'-day').textContent=QQI18n.text('Day '+day+(run?.blocked?' · paused':''));
 }
}
function replayTone(result){
 if(!result.comparable)return 'even';
 const {delivered,backlog,profit,closingCash}=result.delta;
 const outcomes=[delivered,-backlog,profit,closingCash];
 const gain=outcomes.some(n=>n>0),loss=outcomes.some(n=>n<0);
 return gain&&loss?'mixed':loss?'loss':gain?'gain':'even';
}
function replayDeliveryChange(result){
 const {delivered}=result.delta;
 return delivered===0?'Both runs delivered '+result.baseline.delivered+' '+(result.baseline.delivered===1?'job.':'jobs.'):'The changed run delivered '+Math.abs(delivered)+' '+(delivered>0?'more':'fewer')+' '+(Math.abs(delivered)===1?'job.':'jobs.');
}
function replayCashChange(result){
 const amount=result.delta.closingCash;
 return amount===0?'Closing cash held steady.':'Closing cash '+(amount>0?'rose':'fell')+' by '+dollars(Math.abs(amount))+'.';
}
function replayOutcome(result,descriptor,acceptedWork=''){
 const {baseline,alternative,delta}=result;
 const {key,before,after,sourceDay,firstDay,endDay}=descriptor;
 const assumption=replayChoices[key].label+' · '+before+' → '+after;
 let headline,detail='',drivers='';
 if(result.comparable){
  if(!baseline.backlog&&!alternative.backlog)headline='Both runs ended with a clear backlog.';
  else if(baseline.backlog&&!alternative.backlog)headline='The change cleared the backlog.';
  else if(delta.backlog===0)headline='The same number of jobs remained undelivered.';
  else headline=Math.abs(delta.backlog)+' '+(delta.backlog<0?'fewer':'more')+' '+(Math.abs(delta.backlog)===1?'job':'jobs')+' remained undelivered.';
  detail=delta.profit===0?'Operating profit was unchanged.':'Operating profit '+(delta.profit>0?'increased':'decreased')+' by '+dollars(Math.abs(delta.profit))+'.';
  if(delta.revenue||delta.cost)drivers=replayProfitDrivers(delta);
 }else{
  headline='These runs could not be matched through day '+endDay+'.';
  detail=result.reason||'The two outcomes cover different workloads or dates.';
 }
 const held=[['Original',baseline],['Changed',alternative]].filter(([,side])=>side.blocked).map(([label,side])=>`${label} paused before day ${side.day+1} with a ${dollars(side.blocked.gap)} cash shortfall. Last completed day ${side.day}. The pending charge was ${side.blocked.note}.`).join(' ');
 const projection=sourceDay<endDay?` The active run had reached day ${sourceDay}. Later days in both copies are simulated.`:'';
 const matched=result.comparable?(Number.isInteger(baseline.inquiries)?'Both runs received '+baseline.inquiries+' matching external '+(baseline.inquiries===1?'inquiry.':'inquiries.'):'The external inquiries matched across both runs.'):'';
 const rows=[];
 if(descriptor.demandId)rows.push(['Selected job',replayJobStatus(baseline.job),replayJobStatus(alternative.job)]);
 rows.push(['Undelivered jobs',baseline.backlog,alternative.backlog],['Jobs delivered',baseline.delivered,alternative.delivered],['Operating profit',dollars(baseline.profit),dollars(alternative.profit)],['After owner time',dollars(baseline.afterOwner),dollars(alternative.afterOwner)],['Closing cash',dollars(baseline.closingCash),dollars(alternative.closingCash)]);
 const jobId=baseline.job?.id||alternative.job?.id;
 return `<div class="replay-results"><p class="helper">${daySpan(firstDay,endDay)} · ${esc(assumption)}${jobId?' · '+esc(jobId):''}</p>
 <div class="replay-outcome ${replayTone(result)}"><h3>${esc(headline)}</h3><p>${esc(detail)}${result.comparable?' '+replayDeliveryChange(result)+' '+replayCashChange(result):''}</p>${drivers?`<p class="replay-drivers">${esc(drivers)}</p>`:''}</div>
 ${acceptedWork}${result.comparable?QQComparisonReport.decisionDetails(result)+carryCostBreakdown(result):''}
 ${held?`<p class="banner warn">${esc(held)}</p>`:''}<table class="replay-metrics"><thead><tr><th scope="col">Measure</th><th scope="col">Original · day ${baseline.day}</th><th scope="col">Changed · day ${alternative.day}</th></tr></thead>
 <tbody>${rows.map(([name,a,b])=>`<tr><th scope="row">${name}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>
 <p class="helper">${matched} Backlog counts accepted jobs awaiting delivery at the end of each run. Earnings and deliveries cover the selected period.${projection}</p></div>`;
}
function savedReplayVerdict(baseline,alternative,descriptor){
 const result=QQ.capacityPairResult(baseline,alternative,{...descriptor,value:descriptor.after});
 const carry=result.comparable?carryPrompt(baseline,descriptor,'carry-saved-replay',savedCarrySource(descriptor)):'';
 const finish=result.comparable&&result.endDay===baseline.config.months*30?acceptedWorkOffer(result.endDay,'finish-saved-work',descriptor.finishAcceptedWork):'';
 return `<section class="panel replay-comparison saved-replay"><h2>One-change replay · Month ${descriptor.month}</h2>${replayOutcome(result,descriptor,finish)}${carry}</section>`;
}
function showCapacityReplay(dialog,focus='dialog-title'){
 const carry=dialog.result.comparable?carryPrompt(dialog.session.baseline,dialog.descriptor,'carry-replay',{available:true},dialog.carry?.comparable):'';
 const save=dialog.result.comparable&&(!dialog.fromSaved||dialog.acceptedWork?.result?.settled&&!dialog.descriptor.finishAcceptedWork);
 replayModal(dialog,`<h2 id="dialog-title" tabindex="-1">Replay result · Month ${dialog.month}</h2>${replayOutcome(dialog.result,dialog.descriptor,acceptedWorkPanel(dialog))}${carry}${dialog.confirmedSave?'<p class="helper" role="status">Added to Saved replays in Compare runs.</p>':''}<div class="actions">${btn('Close','close')}${dialog.fromSaved?'':btn('Try another value','repeat-replay','soft')}${save&&!dialog.acceptedWork?.running?btn('Save comparison','save-replay','soft'):''}</div>`,focus);
}
function acceptedWorkOffer(day,action,saved=false){
 return `<div class="carry-offer"><p>Close intake at day ${day} and compare the cost of finishing and collecting the work already accepted.</p>${btn(saved?'View accepted-work projection':'Finish the accepted work',action,'primary',action==='finish-accepted-work'?'id="finish-accepted-work"':'')}</div>`;
}
function acceptedWorkCutoff(dialog){
 const result=dialog.phase==='carry-result'?dialog.carry:dialog.phase==='result'?dialog.result:null;
 return result?.comparable&&result.endDay===dialog.session.baseline.config.months*30?result.endDay:0;
}
function acceptedWorkPanel(dialog){
 const cutoff=acceptedWorkCutoff(dialog);
 if(!cutoff)return '';
 const work=dialog.acceptedWork;
 if(work?.result)return QQComparisonReport.acceptedWorkSection(work.result);
 if(work?.error)return `<section><h3 id="accepted-work-heading" tabindex="-1">Accepted-work projection stopped</h3><p role="alert">${esc(work.error)}</p></section>`;
 if(work?.running)return `<section class="accepted-work-progress"><h3 id="accepted-work-heading" tabindex="-1">Finishing the work accepted by day ${cutoff}</h3><p>Checking up to ${work.limit-cutoff} additional days for delivery and payment.</p>${replayProgress(cutoff,work.limit)}${btn('Cancel projection','cancel-accepted-work','soft')}</section>`;
 return acceptedWorkOffer(cutoff,'finish-accepted-work',dialog.descriptor.finishAcceptedWork);
}
function renderAcceptedWork(dialog,focus){
 if(dialog.phase==='carry-result')showCarryResult(dialog,focus);
 else showCapacityReplay(dialog,focus);
}
function startAcceptedWork(dialog){
 if(!dialog||dialog!==replayDialog||!acceptedWorkCutoff(dialog)||dialog.acceptedWork?.running)return;
 const pair=dialog.phase==='carry-result'?dialog.carryPair:dialog.session;
 function stopped(error){
  dialog.acceptedWork={error:error.message};renderAcceptedWork(dialog,'accepted-work-heading');
 }
 let session;
 try{session=QQ.startAcceptedProjection(pair.baseline,pair.alternative);}
 catch(error){stopped(error);return;}
 const work={running:true,limit:session.endDay};dialog.acceptedWork=work;
 function advance(){
  if(dialog!==replayDialog||dialog.acceptedWork!==work)return;
  try{
   const began=performance.now();
   for(let n=0;n<4&&performance.now()-began<10&&session.phase!=='done';n++)QQ.stepAcceptedProjection(session);
   if(session.phase!=='done'){updateReplayProgress(session);dialog.timer=setTimeout(advance,16);return;}
   dialog.acceptedWork={result:QQ.acceptedProjectionResult(session)};
   const latest=latestCapacityReplay.get(state);
   if(latest?.descriptor===dialog.descriptor)latest.acceptedWork=dialog.acceptedWork;
   renderAcceptedWork(dialog,'accepted-work-heading');
  }catch(error){stopped(error);}
 }
 if(session.phase==='done'){advance();return;}
 renderAcceptedWork(dialog,'accepted-work-heading');dialog.timer=setTimeout(advance,16);
}
function cancelAcceptedWork(){
 const dialog=replayDialog;
 if(!dialog?.acceptedWork?.running)return;
 clearTimeout(dialog.timer);dialog.acceptedWork=null;
 renderAcceptedWork(dialog,'finish-accepted-work');
}
function carryPrompt(baseline,descriptor,action,origin,hasResult=false){
 const horizon=baseline.config.months*30;
 if(horizon<=descriptor.endDay)return `<p class="helper">Month ${descriptor.month} ends on day ${descriptor.endDay}, the last day of this run.</p>`;
 if(!origin.available)return `<p class="helper">${esc(origin.reason)}</p>`;
 const complete=hasResult||descriptor.carriedThrough===horizon;
 const label=origin.projectFromClose?(complete?'View projection through day '+horizon:'Project from saved month-end'):(complete?'View through day '+horizon:'Carry this change forward');
 const note=origin.projectFromClose?origin.reason:'Keep this setting through day '+horizon+' to see whether its effect on delivery and profit lasts.';
 return `<div class="carry-offer"><p>${esc(note)}</p>${btn(label,action,'primary')}</div>`;
}
function carryJobText(result){
 const {jobTiming,baseline,alternative,endDay}=result;
 const id=baseline.job?.id||alternative.job?.id;
 if(!id||!jobTiming)return '';
 const {baselineDay,alternativeDay,daysEarlier}=jobTiming;
 if(daysEarlier===0)return id+' delivered on day '+baselineDay+' in both runs.';
 if(daysEarlier!=null)return id+' delivered '+Math.abs(daysEarlier)+' '+(Math.abs(daysEarlier)===1?'day':'days')+' '+(daysEarlier>0?'earlier':'later')+' with the change (day '+alternativeDay+' versus day '+baselineDay+').';
 if(alternativeDay!=null)return id+' delivered on day '+alternativeDay+' with the change. The original had yet to deliver it by day '+endDay+'.';
 if(baselineDay!=null)return id+' delivered on day '+baselineDay+' in the original. The changed run had yet to deliver it by day '+endDay+'.';
 return id+' was still undelivered in both runs on day '+endDay+'.';
}
function replayProfitDrivers(delta){
 if(!delta.revenue&&!delta.cost)return 'Both schedules earned the same revenue and incurred the same costs.';
 const movement=amount=>amount===0?'held steady':(amount>0?'rose by ':'fell by ')+dollars(Math.abs(amount));
 return 'Delivered revenue '+movement(delta.revenue)+' and costs '+movement(delta.cost)+'.';
}
function carryCostRow(row){
 const {baseline,alternative,delta}=row,job=alternative||baseline;
 const signed=(n,format)=>(n>0?'+':'')+format(n);
 const stage=s=>s.deliveredDay!=null?'delivered day '+s.deliveredDay:(shortLabels[s.stage]||s.stage);
 const identity=s=>s.id+' · '+stage(s);
 const original=baseline?identity(baseline):'No matching job';
 const changed=alternative?identity(alternative):'No matching job';
 const hours=s=>!s?'0':s.designHours==null?'unavailable':effortHours(s.designHours);
 const hoursChange=delta.designHours==null?'Change unavailable':delta.designHours===0?'Same hours':signed(delta.designHours,effortHours)+' h';
 const categories=[['Designer labor',delta.designLabor],['Supplier charges',delta.supplierCost],['Other direct costs',delta.otherDirectCost]].filter(([,amount])=>amount!==0);
 const costLines=categories.map(([label,amount])=>label+' '+signed(amount,dollars)).join(' · ');
 return `<li class="carry-cost-row">
 <div class="carry-cost-heading"><strong>${esc(job.client)}</strong><b>${signed(delta.cost,dollars)}</b></div>
 <p class="carry-cost-service">${esc(job.service)} · Cycle ${esc(job.cycle)}</p>
 <div class="carry-cost-arms"><span>Original <b>${esc(original)}</b></span><span>Changed <b>${esc(changed)}</b></span></div>
 <p>Designer hours ${hours(baseline)} → ${hours(alternative)} <strong>(${hoursChange})</strong></p>
 <p>Direct cost ${dollars(baseline?.cost||0)} → ${dollars(alternative?.cost||0)}${costLines?' · '+costLines:''}</p></li>`;
}
function carryCostBreakdown(result){
 const a=result.costAttribution;
 if(!a)return '';
 const {baseline,alternative,delta,byChangedStatus}=a;
 const absCost=dollars(Math.abs(delta.cost)),signed=n=>(n>0?'+':'')+dollars(n);
 const label=delta.cost===0?'Trace job costs and designer hours':'Trace the '+absCost+' cost '+(delta.cost>0?'increase':'decrease');
 const unfinished=delta.unfinishedCost===0?`unfinished jobs carried the same cost in both runs`:
  `unfinished jobs carried <strong>${dollars(Math.abs(delta.unfinishedCost))} ${delta.unfinishedCost>0?'more':'less'}</strong> in the changed run`;
 const selected=a.rows.find(row=>row.demandId===result.demandId);
 const monetaryKeys=['designLabor','supplierCost','otherDirectCost','cost'];
 const affected=a.rows.filter(row=>monetaryKeys.some(key=>QQ.round(row.delta[key])!==0)||
  row.delta.designHours!=null&&QQ.round(row.delta.designHours)!==0||
  (row.baseline?.unfinished?row.baseline.cost:0)!==(row.alternative?.unfinished?row.alternative.cost:0));
 const selectedSame=selected&&selected.baseline&&selected.alternative&&!affected.includes(selected)&&selected.baseline.designHours!=null;
 const selectedNote=selectedSame?`<p class="helper">Selected job ${esc(selected.baseline.id)} used ${effortHours(selected.baseline.designHours)} designer hours in both runs and incurred the same direct cost.</p>`:'';
 const groups=[['Jobs unfinished in the changed run',byChangedStatus.unfinished],['Jobs delivered in the changed run',byChangedStatus.delivered],['Jobs found only in the original',byChangedStatus.absent],['Jobs unaccepted in the changed run',byChangedStatus.unaccepted],['Shared overhead',delta.overhead]];
 const bridge=groups.filter(([,amount])=>Number.isFinite(amount)&&amount!==0).map(([name,amount])=>`<div><dt>${name}</dt><dd>${signed(amount)}</dd></div>`).join('');
 const costs=[['Designer labor',delta.designLabor],['Supplier charges',delta.supplierCost],['Other direct costs',delta.otherDirectCost],['Shared overhead',delta.overhead]].filter(([,v])=>v!==0);
 const costTypes=costs.length?costs.map(([name,v])=>name+' '+signed(v)).join(' · '):'Each cost category had the same total in both runs.';
 const worked=delta.designHours==null?'':delta.designHours===0?'The same total designer hours were worked.':
  'The changed schedule used '+effortHours(Math.abs(delta.designHours))+' '+(delta.designHours>0?'more':'fewer')+' designer hours.';
 const jobList=rows=>`<ul class="carry-cost-jobs" aria-label="Job cost and designer hour changes">${rows.map(carryCostRow).join('')}</ul>`;
 const more=affected.slice(6);
 const rendered=affected.length?jobList(affected.slice(0,6))+(more.length?`<details class="carry-more-jobs"><summary>Show ${more.length} more ${more.length===1?'job':'jobs'}</summary>${jobList(more)}</details>`:''):'<p>No per-job change in the recorded costs or designer hours.</p>';
 return `<div class="carry-cost-section"><p class="carry-unfinished-cost">At day ${a.endDay}, ${unfinished}.<small>Direct costs from days ${a.firstDay}–${a.endDay} · Original ${dollars(baseline.unfinishedCost)} · Changed ${dollars(alternative.unfinishedCost)}</small></p>
 <details class="carry-cost-details"><summary>What changed the cost?</summary><p class="carry-cost-types">${label}. ${costTypes}</p>
 <dl class="carry-cost-bridge">${bridge}<div class="carry-cost-total"><dt>Net change in costs</dt><dd>${signed(delta.cost)}</dd></div></dl>
 <h4>Cost changes by job</h4><p class="helper">${worked} Hours are rounded for display. Each labor charge is rounded to cents when posted.</p>${rendered}${selectedNote}
 </details></div>`;
}
function carryVerdict(result,descriptor,acceptedWork=''){
 const {endDay,firstDay,sourceDay,baseline,alternative,delta,rows,paybackMonth}=result;
 const projected=result.projectFromClose?`<p class="banner warn compact">Days ${result.projectionFromDay}–${endDay} are projected from the saved month-end settings. Later settings, funding and project decisions are unavailable.</p>`:'';
 const basis=`<p class="helper">${daySpan(firstDay,endDay)} · ${esc(replayChoices[descriptor.key].label)} · ${descriptor.before} → ${descriptor.after}</p>${projected}`;
 if(!result.comparable){
  const stops=[['Original',baseline],['Changed',alternative]].map(([label,side])=>side.blocked?label+' paused before day '+(side.day+1)+' with a '+dollars(side.blocked.gap)+' shortfall. Last completed day '+side.day+'. The pending charge was '+side.blocked.note+'.':label+' reached day '+side.day+'.');
  return basis+`<div class="banner warn"><h3>The runs could not be compared through day ${endDay}.</h3><p>${esc(result.reason)}</p><p>${esc(stops.join(' '))}</p></div>`;
 }
 const earlierLead=rows.slice(0,-1).find(row=>row.cumulativeProfit>0);
 const headline=delta.profit===0?(earlierLead?'The original caught up in operating profit.':'Both runs ended with the same operating profit.'):'The change '+(delta.profit>0?'earned '+dollars(delta.profit)+' more':'earned '+dollars(-delta.profit)+' less')+' in operating profit.';
 let payback='';
 if(paybackMonth!=null)payback=paybackMonth*30===endDay?'The lasting profit gain first appeared at the final month-end.':'The changed run stayed ahead at each month-end from day '+(paybackMonth*30)+'.';
 else if(earlierLead)payback='On day '+earlierLead.endDay+' the changed run had been '+dollars(earlierLead.cumulativeProfit)+' ahead.';
 const signed=v=>(v>0?'+':'')+dollars(v);
 const scale=Math.max(1,...rows.map(row=>Math.abs(row.cumulativeProfit)));
 const body=rows.map(row=>{
  const side=row.cumulativeProfit<0?'loss':'gain';
  return `<tr><th scope="row">Month ${row.month}</th><td>${signed(row.delta.profit)}</td><td><span class="carry-plot" aria-hidden="true"><i class="${side}" style="width:${Math.abs(row.cumulativeProfit)/scale*50}%"></i></span><strong>${signed(row.cumulativeProfit)}</strong></td></tr>`;
 });
 const facts=[['Operating profit','profit'],['Delivered revenue','revenue'],['Incurred costs','cost'],['Designer labor','designLabor'],['After owner time','afterOwner'],['Closing cash','closingCash'],['Jobs delivered','delivered'],['Undelivered jobs','backlog']];
 const totals=facts.map(([label,key])=>`<tr><th scope="row">${label}</th>${[baseline,alternative].map(s=>`<td>${key==='delivered'||key==='backlog'?s[key]:dollars(s[key])}</td>`).join('')}</tr>`).join('');
 let observed='';
 if(!result.projectFromClose)observed=result.projectionFromDay!=null?'The original run had reached day '+sourceDay+'. Days '+result.projectionFromDay+'–'+endDay+' are projected in both copies.':'The original replay matched the recorded run through day '+endDay+'.';
 const job=carryJobText(result);
 const tone=replayTone(result);
 return `<div class="carry-result">${basis}<div class="replay-outcome ${tone}"><h3>${headline}</h3><p>${replayProfitDrivers(delta)}</p>${payback?`<p class="replay-drivers">${payback}</p>`:''}</div>
 ${job?`<p class="carry-job">${esc(job)}</p>`:''}<p class="carry-backlog">${replayDeliveryChange(result)} Undelivered on day ${endDay} · ${baseline.backlog} original · ${alternative.backlog} changed. ${replayCashChange(result)}</p>
 ${acceptedWork}${QQComparisonReport.decisionDetails(result)}
 ${carryCostBreakdown(result)}
 <h3>Operating profit difference</h3><table class="carry-months"><thead><tr><th scope="col">Period</th><th scope="col">That month</th><th scope="col">Since day ${firstDay}</th></tr></thead><tbody>${body.join('')}</tbody></table>
 <details class="carry-totals"><summary>Compare both runs in detail</summary><table class="replay-metrics"><thead><tr><th scope="col">Measure</th><th scope="col">Original</th><th scope="col">Changed</th></tr></thead><tbody>${totals}</tbody></table>
 <p>After owner time at each period’s closing target, the difference over days ${firstDay}–${endDay} was <strong>${signed(delta.afterOwner)}</strong>.</p><p class="helper">Revenue, costs, deliveries and owner time cover days ${firstDay}–${endDay}. Cash and undelivered jobs are measured on day ${endDay}.</p></details>
 <p class="helper carry-basis">${observed}</p></div>`;
}
function reopenCapacityReplay(){
 const latest=latestCapacityReplay.get(state);if(!latest)return;
 replayDialog={...latest,source:state,sourceDay:state.day,month:latest.descriptor.month,key:latest.descriptor.key,phase:'result'};
 showCapacityReplay(replayDialog);
}
function backToReplayMonth(){
 const dialog=replayDialog;
 if(!dialog)return;
 clearTimeout(dialog.timer);
 if(dialog.acceptedWork?.running)dialog.acceptedWork=null;
 if(dialog.fromSaved){closeModal();render();return;}
 dialog.phase='result';
 showCapacityReplay(dialog);
}
function showCarryResult(dialog,focus='dialog-title'){
 dialog.phase='carry-result';
 const save=dialog.carry.comparable&&(!dialog.fromSaved||!dialog.descriptor.carriedThrough||dialog.acceptedWork?.result?.settled&&!dialog.descriptor.finishAcceptedWork);
 const saveAction=save&&!dialog.acceptedWork?.running?btn('Save comparison','save-replay','primary'):'';
 const heading=dialog.carry.projectFromClose?'Projection through day ':'Through day ';
 replayModal(dialog,`<h2 id="dialog-title" tabindex="-1">${heading}${dialog.carry.endDay}</h2>${carryVerdict(dialog.carry,dialog.descriptor,acceptedWorkPanel(dialog))}
 ${dialog.confirmedSave?'<p class="helper" role="status">Added to Saved replays in Compare runs.</p>':''}
 <div class="actions">${btn('Back to month '+dialog.month,'back-replay-month','soft')}${saveAction}${btn('Close','close')}</div>`,focus);
}
function startWorkFromSaved(carry){
 const {base,alternative,record}=comparedRuns();
 if(!base||!alternative||!record)return;
 const origin=savedCarrySource(record);
 if(!origin.available)throw Error(origin.reason);
 const dialog={fromSaved:true,source:state,originalSource:origin.source,projectFromClose:origin.projectFromClose===true,phase:'result',month:record.month,descriptor:record,session:{baseline:base,alternative}};
 replayDialog=dialog;
 if(carry){startCarryReplay();return;}
 dialog.result=QQ.capacityPairResult(base,alternative,{...record,value:record.after});
 startAcceptedWork(dialog);
}
function startCarryReplay(){
 const dialog=replayDialog;
 if(dialog?.phase!=='result'||dialog.source!==state)return;
 if(dialog.carry){showCarryResult(dialog);return;}
 function stopped(error){
  dialog.phase='carry-stopped';
  replayModal(dialog,`<h2 id="dialog-title" tabindex="-1">Carry-forward stopped</h2><p role="alert">${esc(error.message)}</p><div class="actions">${btn('Back to month '+dialog.month,'back-replay-month','soft')}${btn('Close','close')}</div>`,'dialog-title');
 }
 const pair=dialog.session;
 let session;
 try{session=QQ.startCapacityCarry(dialog.originalSource,pair.baseline,pair.alternative,{...dialog.descriptor,projectFromClose:dialog.projectFromClose===true});}
 catch(error){stopped(error);return;}
 dialog.phase='carrying';
 const first=dialog.descriptor.endDay;
 const heading=dialog.projectFromClose?'Projecting from saved month-end through day ':'Carrying the change through day ';
 replayModal(dialog,`<h2 id="dialog-title">${heading}${session.endDay}</h2><p>Both runs continue from day ${first}. ${esc(replayChoices[dialog.descriptor.key].label)} · ${dialog.descriptor.before} → ${dialog.descriptor.after}</p>${replayProgress(first,session.endDay)}
 <div class="actions">${btn('Cancel and return to month '+dialog.month,'back-replay-month','soft')}</div>`);
 function advance(){
  if(replayDialog!==dialog||dialog.phase!=='carrying')return;
  try{
   const began=performance.now();
   // Yield between batches so longer horizons stay interactive.
   for(let n=0;n<4&&performance.now()-began<10&&session.phase!=='done';n++)QQ.stepCapacityCarry(session);
   if(session.phase!=='done'){updateReplayProgress(session);dialog.timer=setTimeout(advance,16);return;}
   dialog.carry=QQ.capacityCarryResult(session);
   dialog.carryPair={baseline:session.baseline,alternative:session.alternative};
   const latest=latestCapacityReplay.get(state);
   if(latest?.descriptor===dialog.descriptor){latest.carry=dialog.carry;latest.carryPair=dialog.carryPair;}
   showCarryResult(dialog);
   if(dialog.fromSaved&&dialog.descriptor.finishAcceptedWork)startAcceptedWork(dialog);
  }catch(error){stopped(error);}
 }
 dialog.timer=setTimeout(advance,16);
}
function saveCapacityReplay(){
 const dialog=replayDialog;
 if(!dialog||dialog.source!==state||dialog.acceptedWork?.running)return;
 const carried=dialog.phase==='carry-result'&&dialog.carry?.comparable;
 if(!carried&&!(dialog.phase==='result'&&dialog.result?.comparable))return;
 const descriptor={...dialog.descriptor};
 if(carried)descriptor.carriedThrough=dialog.carry.endDay;
 const settled=acceptedWorkCutoff(dialog)&&dialog.acceptedWork?.result?.settled===true;
 if(settled)descriptor.finishAcceptedWork=true;
 const pair=persistReplayPair(dialog.session.baseline,dialog.session.alternative,descriptor,dialog.originalSource);
 closeModal();showSavedComparison(pair.baselineRun,pair.alternativeRun,pair.record);
 if(carried||settled){
  dialog.fromSaved=true;dialog.confirmedSave=true;dialog.descriptor=pair.record;
  replayDialog=dialog;
  if(carried)showCarryResult(dialog,settled?'accepted-work-heading':'dialog-title');
  else showCapacityReplay(dialog,'accepted-work-heading');
  modalFocus={domId:'sim-heading'};
 }
}

function newServiceId(){
 const used=new Set([...draft.services,...state.config.services].map(s=>s.id));
 for(const project of state.projects)used.add(project.serviceId);
 const base='service'+Date.now();let id=base,index=1;
 while(used.has(id))id=base+'_'+index++;
 return id;
}
function checkpoint(kind='automatic'){const snapshot=JSON.stringify(state);MEIQQWorkspace.checkpoint({state,saved,checkpointInfo},kind);return saved.findIndex(v=>JSON.stringify(v)===snapshot);}
function modalTabStops(){return [...document.querySelectorAll('#modal button, #modal input, #modal select, #modal textarea, #modal summary, #modal a[href], #modal [tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&!el.closest('[hidden], [inert]')&&el.getClientRects().length>0);}
function modal(html,focusId){
 stop();
 if(!$('#modal').innerHTML)modalFocus=actionFocus||focusKey(document.activeElement);
 $('#modal').innerHTML=QQI18n.html(`<div class="modalback"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${html}<div class="modal-error" id="modal-error" role="alert"></div></section></div>`);
 render();
 const target=focusId?document.querySelector('#'+focusId):null;
 (target||modalTabStops()[0])?.focus();
}
function closeModal(){
 if(monthJobHistory){clearTimeout(monthJobHistory.timer);monthJobHistory=null;}
 if(replayDialog){clearTimeout(replayDialog.timer);replayDialog=null;}
 $('#modal').innerHTML='';$('#root').inert=false;
 const focus=modalFocus;modalFocus=null;
 if(focus&&!restoreFocus(focus)){
  // Some actions render the opener after closing. Honor any intervening navigation.
  const active=document.activeElement;
  setTimeout(()=>{if(!$('#modal').innerHTML&&document.activeElement===active)restoreFocus(focus);},0);
 }
}
function showError(message){const el=$('#modal-error');if($('#modal').firstChild&&el)el.textContent=QQI18n.text(message);else toast(message);}
const DIFF_LABELS={name:'Scenario name',seed:'Workload seed',months:'Run length',startingCash:'Starting cash',ownerHours:'Your available time',ownerTarget:'Value of your time',designers:'Designer count',designerHours:'Designer availability',designerRate:'Designer labor cost',overhead:'Monthly overhead',inquiries:'New inquiries',conversion:'Conversion',deposit:'Deposit',paymentDays:'Payment terms',approvalDays:'Approval time',printDays:'Print turnaround',quoteHours:'Quote work',deliveryHours:'Delivery work',leadDays:'Delivery promise',priority:'Queue order',acquisition:'Inquiry source',outreachHours:'Outreach time',leadsPerHour:'Outreach response',retention:'Follow-up campaign acceptance / legacy renewal',repeat:'Repeat purchases',profileStrength:'Business-type variation',focusType:'Customer niche',realism:'Uncertainty'};
const percentPaths=new Set(['conversion','deposit','retention','repeat']);
function formatDiffValue(path,value){if(value===undefined)return 'not set';if(path==='months'&&Number.isInteger(value))return runLengthLabel(value);if(typeof value==='boolean')return value?'On':'Off';if((percentPaths.has(path)||path.startsWith('disruptionRates.')||path.endsWith('.fulfillment.managedShare')))return pct(value);if(path.startsWith('customerMix.')||/\.weight$/.test(path))return value+'%';if(['startingCash','ownerTarget','designerRate','overhead'].includes(path)||/\.(price|print|designOnlyPrice)$/.test(path))return money(value);if(/(Hours|hours|review)$/.test(path))return num(value)+' h';if(['paymentDays','approvalDays','printDays','leadDays'].includes(path)||/\.(cadenceDays|relationshipDays)$/.test(path))return value+' days';return String(value);}
function serviceChangeSummary(service){
 const terms=[money(service.price)+' per project',num(service.hours)+' designer h',num(service.review)+' review h',money(service.print)+' print allowance',service.weight+'% inquiry share'];
 if(service.fulfillment)terms.push(pct(service.fulfillment.managedShare)+' managed print',money(service.fulfillment.designOnlyPrice)+' files-only');
 if(service.campaign)terms.push('quoted every '+service.campaign.cadenceDays+' days for '+service.campaign.relationshipDays+' days');
 else if(service.recurring)terms.push('repeat service');
 return 'Included · '+terms.join(' · ')+(service.deliverable?' · '+service.deliverable:'');
}
function scopeDiffValue(key,value){
 if(value===undefined||value===null)return 'not set';
 if(key==='modeledPriceRange'||key==='modeledPrintCostRange')return value.map(money).join('–');
 return Array.isArray(value)?value.join('; '):String(value);
}
function configDiff(before,after){
 const out=[],push=(path,label,a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))out.push({path,label,before:formatDiffValue(path,a),after:formatDiffValue(path,b)});};
 for(const k of Object.keys(DIFF_LABELS))push(k,DIFF_LABELS[k],before[k],after[k]);
 for(const group of ['food','retail','services'])push('customerMix.'+group,'Customer mix · '+group,before.customerMix?.[group],after.customerMix?.[group]);
 for(const k of Object.keys(QQ.DEFAULT.uncertainty))push('uncertainty.'+k,'Uncertainty · '+k,before.uncertainty?.[k],after.uncertainty?.[k]);
 for(const [k,label] of Object.entries(DISRUPTION_LABELS))push('disruptions.'+k,label,before.disruptions?.[k]??false,after.disruptions?.[k]??false);
 for(const [k,label] of Object.entries(DISRUPTION_LABELS))push('disruptionRates.'+k,'Share affected · '+label,before.disruptionRates?.[k]??QQ.DEFAULT.disruptionRates?.[k],after.disruptionRates?.[k]??QQ.DEFAULT.disruptionRates?.[k]);
 const a=new Map((before.services||[]).map(s=>[s.id,s])),b=new Map((after.services||[]).map(s=>[s.id,s]));
 const scopeLabels={catalogId:'catalog',packageId:'source package',version:'scope version',scope:'scope',deliverables:'included deliverables',includedRevisions:'included feedback rounds',printQuantity:'print quantity',printSpec:'print specification',printCostBasis:'print cost basis',evidenceIds:'frozen source records',modeledPriceRange:'planning price range',modeledPrintCostRange:'planning print-cost range'};
 for(const id of new Set([...a.keys(),...b.keys()])){
  const old=a.get(id),next=b.get(id),name=next?.name||old?.name||id;
  if(!old||!next){out.push({path:'services.'+id,label:name,before:old?serviceChangeSummary(old):'Not included',after:next?serviceChangeSummary(next):'Removed'});continue;}
  for(const [k,label] of Object.entries({name:'name',deliverable:'deliverable',filesOnlyScope:'files-only deliverable',supplierMode:'print supplier',audience:'audience',price:'price',weight:'inquiry share',hours:'designer work',review:'review work',print:'print cost',recurring:'purchase pattern'}))push('services.'+id+'.'+k,name+' · '+label,old[k],next[k]);
  for(const [k,label] of Object.entries({managedShare:'managed-print choice',designOnlyPrice:'design-only price'}))push('services.'+id+'.fulfillment.'+k,name+' · '+label,old.fulfillment?.[k],next.fulfillment?.[k]);
  for(const [k,label] of Object.entries({cadenceDays:'campaign interval',relationshipDays:'relationship length'}))push('services.'+id+'.campaign.'+k,name+' · '+label,old.campaign?.[k],next.campaign?.[k]);
  for(const [k,label] of Object.entries(scopeLabels))if(JSON.stringify(old.spec?.[k])!==JSON.stringify(next.spec?.[k]))out.push({path:'services.'+id+'.spec.'+k,label:name+' · '+label,before:scopeDiffValue(k,old.spec?.[k]),after:scopeDiffValue(k,next.spec?.[k])});
 }
 for(const key of new Set([...Object.keys(before.assumptionRecords||{}),...Object.keys(after.assumptionRecords||{})])){
  const describe=record=>record?`${record.source} · ${record.date} · ${record.sample}`:'No source';
  const a=before.assumptionRecords?.[key],b=after.assumptionRecords?.[key];
  if(JSON.stringify(a)!==JSON.stringify(b))out.push({path:'assumptionRecords.'+key,label:'Source for '+(DIFF_LABELS[key]||key),before:describe(a),after:describe(b)});
 }
 return out;
}
function review(intent=''){
 stop();
 const error=draftError();
 if(error){toast(error);return;}
 if(!dirty()){view='map';render();return;}
 const next=draftRunConfig(),changes=configDiff(state.config,next);
 const restartOnly=state.day>0&&(next.startingCash!==state.config.startingCash||next.seed!==state.config.seed||next.months*30<state.day);
 const resumeLabel={simulate:'simulate '+(next.months*30)+' days','finish-run':'finish run',finish:'finish month',play:'run',step:'advance one day','next-event':'advance to next event'}[intent];
 const applyButton=(mode,label,primary)=>btn(label,'apply',primary?'primary':'soft',`data-mode="${mode}" data-resume="${esc(intent)}"`);
 const future=applyButton('future',resumeLabel?`Apply and ${resumeLabel}`:state.day?'Apply going forward':'Apply setup',!state.day);
 const restart=applyButton('restart',resumeLabel?`Restart and ${resumeLabel}`:'Apply & start new run',true);
 modal(`<h2 id="dialog-title">Apply your business setup</h2><p>A checkpoint of the current run will be saved first.</p>
 <details class="review-changes"${changes.length<=4?' open':''}><summary>${changes.length} exact change${changes.length===1?'':'s'}</summary><ul class="change-list">${changes.map(v=>`<li>${esc(v.label)}: <b>${esc(v.before)} → ${esc(v.after)}</b></li>`).join('')}</ul></details>
 ${state.day?`<p>Apply going forward to keep day ${state.day} and existing agreements. Restart to compare a new day-zero run.</p>`:''}
 ${restartOnly?'<div class="banner warn">Starting cash, seed or the shorter horizon requires a new run.</div>':''}
 <div class="actions">${btn('Keep editing','close')}${restartOnly?'':future}${state.day?restart:''}</div>`);
}
function applyDraft(mode,intent=''){
 const error=draftError();if(error)throw Error(error);
 const next=draftRunConfig(),pin=state.day>0&&!checkpointInfo.some(v=>v.baseline);
 const updated=mode==='restart'?QQ.fresh(next):QQ.clone(state);
 if(mode!=='restart')QQ.applyConfig(updated,next);
 const i=checkpoint();
 if(pin&&i>=0){checkpointInfo[i].baseline=true;checkpointInfo[i].kind='manual';}
 state=updated;selection=null;inspectorTrail=[];view='map';
 closeModal();
 if(intent==='play')play();
 else if(intent==='step'){if(beginRun('step'))tick();}
 else if(['simulate','finish-run','finish','next-event'].includes(intent))advanceRun(intent);
 else render();
}
function beginRun(action){stop();if(dirty()){review(action);return false;}if(state.blocked){cashModal();return false;}if(state.day>=state.config.months*30)return false;if(firstExamplePending())rememberSetupChoice();view='map';return true;}
function tick(){const advanced=QQ.step(state);save();if(!advanced||state.day>=state.config.months*30)stop();render();if(state.blocked)cashModal();}
function play(){if(running){stop();render();return;}if(!beginRun('play'))return;running=true;timer=setInterval(tick,1000/speed);render();}
function advanceRun(action){
 if(!beginRun(action))return;
 const end=state.config.months*30,untilEvent=action==='next-event';
 finishTarget=action==='finish'?Math.min(end,(Math.floor(state.day/30)+1)*30):end;
 running=true;
 const generation=++runGeneration;
 const batch=()=>{
  if(generation!==runGeneration||!running||finishTarget===null)return;
  const started=performance.now(),target=finishTarget;let days=0,advanced=true,foundEvent=false;
  while(state.day<target&&days<5&&performance.now()-started<8){
   advanced=QQ.step(state);if(!advanced)break;days++;
   if(untilEvent&&state.events[0]?.day===state.day){foundEvent=true;break;}
  }
  save();
  if(!advanced||state.day>=target||foundEvent){
   stop();
   if(['simulate','finish-run'].includes(action)&&advanced&&!state.blocked){view='finances';analyticsTab='overview';selectResultsMonth(null);}
   render();
   if(state.blocked)cashModal();
   else if(['simulate','finish-run'].includes(action))focusViewHeading();
   return;
  }
  render();timer=setTimeout(batch,0);
 };
 render();timer=setTimeout(batch,0);
}
function cashModal(){const b=state.blocked;if(!b)return;modal(`<div class="eyebrow">DAY ${state.day+1} PAUSED</div><h2 id="dialog-title">A payment needs funding</h2><p>${esc(b.note)}</p><div class="kvs"><div><label>Payment needed</label><strong>${dollars(b.amount)}</strong></div><div><label>Cash at that point</label><strong>${dollars(b.cash)}</strong></div></div><div class="banner warn">This payment needs <b>${dollars(b.gap)}</b> more. The simulator is paused at the end of day ${state.day}.</div><label class="input-field">Owner funding ($)<input id="funding"${QQI18n.moneyField('$')} type="number" min="0.01" max="100000000" step="0.01" value="${b.gap}"></label><p class="helper">Funding adds cash to the business. Resume the run to retry this day.</p><div class="actions">${btn('Keep paused','close')}${btn('Add funding','confirm-fund','primary')}</div>`);}
function download(name,data,type='application/json'){const blob=new Blob([typeof data==='string'?data:JSON.stringify(data)],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function backupPayload(){return MEIQQWorkspace.pack(currentWorkspace(),archives);}
function parseBackup(data){return MEIQQWorkspace.parse(data);}
function importFile(){stop();const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const f=input.files?.[0];if(!f)return;MEIQQWorkspace.checkSize(f.size);const parsed=MEIQQWorkspace.parseText(await f.text());modal(`<h2 id="dialog-title">Open this ${parsed.full?'saved workspace':'setup'}?</h2><p><b>${scenarioName(parsed.state.config.name)}</b> · day ${parsed.state.day} · ${parsed.state.projects.length} projects.</p><p>Your current workspace will be kept under Runs & backups.</p><div class="actions">${btn('Cancel','close')}${btn('Open backup','confirm-import','primary')}</div>`);pendingImport=parsed;}catch(e){toast(e.message||'The backup could not be read.');}};input.click();}
let pendingImport=null,pendingDraft=null;
function handleInput(el){
 const path=el.dataset?.input;if(!path||loading)return;stop();const parts=path.split('.');let target=draft;for(const p of parts.slice(0,-1))target=target[p];const key=parts.at(-1);
 const value=el.type==='checkbox'?el.checked:key==='recurring'?el.value==='true':(key==='profileStrength'||key==='cadenceDays'||key==='months')?Number(el.value):el.type==='number'?(el.value.trim()===''?null:Number(QQI18n.inputValue(el))/(el.dataset.percent?100:1)):el.value;
 if(Object.is(target[key],value))return;
 if(path==='acquisition'&&value==='preset'){
  const unseen=draft.fixedInquiriesEntered===false||(draft.fixedInquiriesEntered===undefined&&draft.recipe?.profile==='new-workspace'&&draft.inquiries===QQ.DEFAULT.inquiries);
  if(unseen){const proposed=outreachVolume(draft);draft.inquiries=proposed===null?null:Math.min(500,proposed);}
  draft.fixedInquiriesEntered=true;
 }
 if(path==='inquiries'||(path==='acquisition'&&value==='sales'&&draft.acquisition==='preset'))draft.fixedInquiriesEntered=true;
 presetUndoDraft=null;serviceUndoDraft=null;
 const sourcePath=parts[0]==='services'?'services.'+draft.services[parts[1]].id+'.'+parts.slice(2).join('.'):path;
 if(draft.assumptionRecords?.[sourcePath]){
  delete draft.assumptionRecords[sourcePath];
  if(!Object.keys(draft.assumptionRecords).length)delete draft.assumptionRecords;
 }
 target[key]=value;
 if(key==='supplierMode')target.print=value==='none'?0:(target.print>0?target.print:null);
 if(key==='recurring'&&value===false)delete target.campaign;
 if(key==='recurring'&&value===true&&!target.campaign)target.campaign={cadenceDays:30,relationshipDays:365};
 if(key==='audience'&&value!=='all'&&!draft.customerMix){draft.customerMix=QQ.clone(QQ.DEFAULT.customerMix);draft.profileStrength=QQ.DEFAULT.profileStrength;draft.focusType='none';}
 const error=$('#error-'+el.id);if(error)error.textContent=QQI18n.text(typeof el.checkValidity==='function'&&!el.checkValidity()?'Enter a valid value in the range shown.':'');
 updatePreview();
 if(view==='setup')render();
}
document.addEventListener('input',e=>{if(plannerController.input(e.target)||jobsController.input(e.target))return;if(e.target.dataset?.studioField){handleStudioInput(e.target);return;}if(e.target.id==='catalog-price'){catalogPrices.set(pendingCatalogId,QQI18n.inputValue(e.target));const s=catalogCandidate(pendingCatalogId);$('#catalog-economics').innerHTML=QQI18n.html(catalogEconomics(s));return;}if(e.target.id==='contract-search'){contractSearch=e.target.value;contractPage=0;render();return;}if(e.target.id==='project-search'){search=e.target.value;$('#project-table').innerHTML=QQI18n.html(projectTable());return;}if(e.target.dataset?.input&&e.target.type!=='checkbox'&&e.target.tagName!=='SELECT')handleInput(e.target);});
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='language'){if(QQI18n.choose(el.value)){render();$('#toast').textContent='';$('#toast').className='';}return;}
 if(plannerController.input(el)||jobsController.input(el))return;if(el.dataset?.studioField){handleStudioInput(el);return;}if(loading)return;
 if(el.id==='record-field'&&recordEditor){editInputRecord(recordEditor.group,recordEditor.id,el.value);return;}
 if((el.id==='replay-month'||el.id==='replay-key')&&replayDialog?.phase==='setup'){
  configureReplay(replayDialog,el.id==='replay-month'?Number(el.value):replayDialog.month,el.id==='replay-key'?el.value:undefined);
  document.querySelector('#'+el.id)?.focus();
  return;
 }
 if(el.id==='compared-run'){
  const current=comparedRuns(),i=Number(el.value);comparisonSelection={base:current.base,alternative:saved[i]||state,record:null};render();return;
 }
 if(el.id==='result-month'){selectResultsMonth(Number(el.value));render();return;}
 if(el.id==='catalog-goal'||el.id==='catalog-audience'){if(el.id==='catalog-goal')catalogGoal=el.value;else catalogAudience=el.value;$('#catalog-results').innerHTML=QQI18n.html(serviceLibraryCards());return;}
 if(['preset-market','preset-operation','preset-mix','preset-condition'].includes(el.id)){presetSelection[el.id.replace('preset-','')]=el.value;try{localStorage.setItem(PRESET_KEY,JSON.stringify(presetSelection));}catch(err){}render();return;}
 if(el.id==='contract-search'){contractSearch=el.value;contractPage=0;render();return;}
 if(el.id==='contract-filter'){contractFilter=el.value;contractPage=0;render();return;}
 if(el.id==='ledger-month'){cashView={run:state,month:Number(el.value),page:0};render();return;}
 if(el.id==='contract-sort'){contractSort=el.value;contractPage=0;render();return;}
 if(el.dataset?.input){handleInput(el);if(el.dataset.input==='acquisition'||el.dataset.input.endsWith('.audience')||el.type==='checkbox')render();return;}
 if(el.id==='shard-motion'){
  if(!Object.hasOwn(MOTION,el.value))return;
  shardMotion=el.value;applyShardMotion();
  try{localStorage.setItem(MOTION_KEY,shardMotion);}catch{toast('Motion setting applied for this session.');}
  return;
 }
 if(el.id==='appearance'){if(!Object.hasOwn(THEMES,el.value))return;theme=el.value;document.documentElement.dataset.theme=theme;try{localStorage.setItem(THEME_KEY,theme);}catch(err){toast('Theme applied for this session. Browser storage is unavailable.');}return;}
 if(el.id==='speed'){speed=Number(el.value);if(running&&finishTarget===null){clearInterval(timer);timer=setInterval(tick,1000/speed);}return;}
 if(el.id==='horizon'){stop();const months=Number(el.value);if(!validRunLength(months)){render();return;}if(months*30<state.day){toast('The horizon must include the current day.');render();return;}serviceUndoDraft=null;presetUndoDraft=null;if(draft.months===state.config.months)draft.months=months;state.config.months=months;save();render();return;}
 if(el.id==='project-filter'){filter=el.value;$('#project-table').innerHTML=QQI18n.html(projectTable());}
});
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;if(a.startsWith('planner-')){actionFocus=focusKey(el);try{plannerController.action(a,el.dataset);}catch(err){if($('#modal').firstChild)showError(err.message||'The plan could not be updated.');else plannerController.reportError(err.message||'The plan could not be updated.');}finally{actionFocus=null;}return;}if(a.startsWith('jobs-')){actionFocus=focusKey(el);try{jobsController.action(a,el.dataset);}catch(err){if($('#modal').firstChild)showError(err.message||'The job could not be updated.');else jobsController.reportError(err.message||'The job could not be updated.');}finally{actionFocus=null;}return;}if(a.startsWith('studio-')){actionFocus=focusKey(el);try{handleStudioAction(a,el);}catch(err){showError(err.message||'The idea could not be updated.');}finally{actionFocus=null;}return;}if(loading)return;
 actionFocus=focusKey(el);
 try{
  if(presetUndoDraft&&['apply','discard','enable-profiles','add-service','duplicate','remove-service','balance'].includes(a))presetUndoDraft=null;
  if(serviceUndoDraft&&['apply','discard','enable-profiles','add-service','duplicate','remove-service','balance','confirm-preset','undo-preset','load','confirm-restart','confirm-example','confirm-import','open-archive','confirm-restore-draft','confirm-branch'].includes(a))serviceUndoDraft=null;
  if(a==='mobile-nav'){mobileNavOpen=!mobileNavOpen;render();}
  else if(a==='view'){
   stop();mobileNavOpen=false;inspectorTrail=[];selection=null;
   if(el.dataset.view==='finances'&&view!=='finances'){analyticsTab='overview';selectResultsMonth(null);}
   if(el.dataset.view==='studio'){studioUI.selectedId=null;studioUI.tab='idea';studioUI.section='offer';}
   view=el.dataset.view;render();focusViewHeading();
  }
  else if(a==='start-business'||a==='start-restaurant')chooseSetup(a==='start-business');
  else if(a==='new-scenario')newScenarioDialog();
  else if(a==='new-business'||a==='new-example')chooseSetup(a==='new-business',true);
  else if(a==='input-evidence')editInputRecord(el.dataset.group,el.dataset.id);
  else if(a==='save-input-evidence'||a==='remove-input-evidence')saveInputRecord(a==='remove-input-evidence');
  else if(a==='toggle-recipe'){recipeOpen=!recipeOpen;render();}
  else if(a==='analytics-tab'){analyticsTab=el.dataset.tab;if(analyticsTab==='cash')cashView={run:state,month:0,page:0};render();}
  else if(a==='review-latest-results'||a==='month-overview'){
   stop();mobileNavOpen=false;inspectorTrail=[];selection=null;view='finances';analyticsTab='overview';
   selectResultsMonth(a==='month-overview'?Number(el.dataset.month):null);render();focusViewHeading();
  }
  else if(a==='month-cash'){
   cashView={run:state,month:Number(el.dataset.month),page:0};analyticsTab='cash';render();focusViewHeading();
  }
  else if(a==='ledger-page'){
   cashView.page=Math.max(0,cashView.page+Number(el.dataset.delta));render();
   document.querySelector('#ledger-heading')?.focus();
  }
  else if(a==='sample-months'){startMonthSample();}
  else if(a==='month-jobs'){openMonthJobs(Number(el.dataset.month));}
  else if(a==='month-job-current'){
   const returnKey=modalFocus;
   closeModal();openInspector('project',el);
   const origin=inspectorTrail.at(-1);
   if(origin){origin.key=returnKey;origin.button=null;}
  }
  else if(a==='open-replay'){openCapacityReplay(el.dataset.id,Number(el.dataset.month),el.dataset.demandId,el.dataset.key);}
  else if(a==='run-replay'){runCapacityReplay();}
  else if(a==='carry-replay'){startCarryReplay();}
  else if(a==='carry-saved-replay'){startWorkFromSaved(true);}
  else if(a==='finish-saved-work'){startWorkFromSaved(false);}
  else if(a==='finish-accepted-work'){startAcceptedWork(replayDialog);}
  else if(a==='cancel-accepted-work'){cancelAcceptedWork();}
  else if(a==='back-replay-month'){backToReplayMonth();}
  else if(a==='repeat-replay'&&replayDialog){configureReplay(replayDialog,replayDialog.month,replayDialog.key);}
  else if(a==='show-last-replay'){reopenCapacityReplay();}
  else if(a==='save-replay'){saveCapacityReplay();}
  else if(a==='cancel-sample'){cancelMonthSample();render();}
  else if(a==='compare-runs'){stop();view='finances';analyticsTab='compare';render();focusViewHeading();}
  else if(a==='contract-page'){contractPage=Math.max(0,contractPage+Number(el.dataset.delta));render();}
  else if(a==='setup-step'){stop();setupRepairPath=null;stepIndex=Number(el.dataset.step);render();document.querySelector('#setup-tab-'+stepIndex)?.focus();}
  else if(a==='fix-setup-issue')fixSetupIssue();
  else if(a==='edit-inquiry-weight')revealSetupField({path:'services.'+Number(el.dataset.index)+'.weight'});
  else if(a==='service-library')serviceLibrary();
  else if(a==='catalog-package')catalogPackage(el.dataset.id);
  else if(a==='confirm-catalog-service'){const value=QQI18n.inputValue($('#catalog-price'));if(value.trim()==='')throw Error('Enter a customer price.');const amount=Number(value),s=QQServiceCatalog.createService(pendingCatalogId);if(s.fulfillment&&amount<s.fulfillment.designOnlyPrice)throw Error('The managed-print price must cover at least the design-only price.');addCatalogService(pendingCatalogId,amount);catalogPrices.delete(pendingCatalogId);pendingCatalogId=null;}
  else if(a==='add-blank-service')addCatalogService(null);
  else if(a==='service-starters')starterDialog();
  else if(a==='add-starter'){const additions=QQServiceCatalog.starterServices(el.dataset.id);if(draft.services.length+additions.length>20)throw Error('This starter would exceed the 20-service limit.');serviceUndoDraft=QQ.clone(draft);presetUndoDraft=null;for(const s of additions){s.id=newServiceId();s.weight=0;draft.services.push(s);}expandedService=draft.services.length-additions.length;closeModal();render();toast('Starter services added at 0% share. Set their inquiry shares when ready.');}
  else if(a==='review-starter'){pendingStarterId=el.dataset.id;const next=QQServiceCatalog.starterServices(pendingStarterId);modal(`<h2 id="dialog-title">Replace your draft service mix?</h2><p>Remove ${draft.services.length} current offerings from this draft: ${esc(draft.services.map(s=>s.name).join(', '))}.</p><p>Load this mix instead:</p><ul>${next.map(s=>`<li>${serviceName(s)} · ${money(s.price)} · ${s.weight}% inquiry share</li>`).join('')}</ul><p>Your active run and accepted projects stay in place. Undo is available until your next draft edit.</p><div class="actions">${btn('Keep current offerings','close')}${btn('Replace draft offerings','confirm-starter','primary')}</div>`);}
  else if(a==='confirm-starter'){if(!pendingStarterId)throw Error('Choose a starter mix.');serviceUndoDraft=QQ.clone(draft);presetUndoDraft=null;clearServiceRecords();draft.services=QQServiceCatalog.starterServices(pendingStarterId);pendingStarterId=null;expandedService=0;closeModal();render();toast('Starter mix loaded into the draft. Review & apply when ready.');}
  else if(a==='undo-services'){if(!serviceUndoDraft)throw Error('No previous service mix is available.');draft=QQ.clone(serviceUndoDraft);serviceUndoDraft=null;closeModal();render();}
  else if(a==='inspect-service'){
   expandedService=Number(el.dataset.index);
   const key='service-'+draft.services[expandedService].id;
   const editor=[...document.querySelectorAll('.service-editor')].find(node=>node.dataset.disclosure===key);
   if(editor){editor.open=true;editor.querySelector('summary')?.focus();}else{disclosureState.set(key,true);render();}
  }
  else if(a==='price-experiment')priceExperiment(Number(el.dataset.index));
  else if(a==='use-service-price'){const index=Number(el.dataset.index),price=Number(el.dataset.price),s=draft.services[index];if(!s||!Number.isFinite(price)||price<0||price>1e6||s.fulfillment&&price<s.fulfillment.designOnlyPrice)throw Error('Choose a valid price for this scope.');s.price=price;serviceUndoDraft=null;presetUndoDraft=null;closeModal();render();}
  else if(a==='service-evidence'){const service=evidenceService(el.dataset.id,el.dataset.catalog);serviceEvidence(service,el.dataset.catalog);}
  else if(a==='download-service-evidence'){const service=evidenceService(el.dataset.id,el.dataset.catalog);download('MEIQQ-Service-Evidence.json',{service,audit:QQServiceCatalog.auditService(service)});}
  else if(a==='recipe-evidence')recipeEvidenceDialog();
  else if(a==='current-evidence')recipeEvidenceDialog('draft');
  else if(a==='download-evidence'){if(!pendingEvidence)throw Error('Open an evidence record first.');download('MEIQQ-Recipe-Evidence.json',pendingEvidence);}
  else if(a==='setup-density'){if(!['guided','analyst'].includes(el.dataset.mode))throw Error('Choose a valid setup view.');setupMode=el.dataset.mode;setupModeChanging=true;for(const id of ['customers','team','cash','mix',...draft.services.flatMap(s=>['service-'+s.id,'delivery-'+s.id])])disclosureState.set('setup-advanced-'+id,setupMode==='analyst');try{localStorage.setItem(SETUP_MODE_KEY,setupMode);}catch(err){toast('Setup view applied for this session. Browser storage is unavailable.');}render();}
  else if(a==='apply-preset'){const next=QQPresets.compose(presetSelection,draft,{preserveServices:true}),changes=configDiff(draft,next);if(!changes.length&&['market','operation','condition','mix','profile'].every(k=>draft.recipe?.[k]===next.recipe[k])){toast('This recipe already matches your draft.');return;}pendingPreset=next;modal(`<div class="eyebrow">${changes.length?changes.length+' DRAFT VALUES WILL CHANGE':'SCENARIO CONTEXT CHANGE'}</div><h2 id="dialog-title">Load this recipe into your draft?</h2><p>Use the selected market label, team, customer mix and business conditions. Your custom services, prices, service mix, starting cash and run identity are preserved.</p><p>You can undo until your next draft edit. The running simulation changes only after you apply the draft.</p><ul class="change-list">${changes.map(v=>`<li>${esc(v.label)}: <b>${esc(v.before)} → ${esc(v.after)}</b></li>`).join('')}</ul><p class="helper">The recipe origin is saved with the applied setup and shown in Saved runs. Exact assumption values remain authoritative and may include later edits.</p><div class="actions">${btn('Keep current draft','close')}${btn('Merge into draft','confirm-preset','primary')}</div>`);}
  else if(a==='confirm-preset'){if(!pendingPreset)throw Error('Choose a recipe first.');presetUndoDraft=QQ.clone(draft);draft=QQ.clone(pendingPreset);pendingPreset=null;recipeOpen=false;expandedService=0;stepIndex=0;closeModal();render();toast('Recipe loaded into the draft. Review it, then apply when ready.');}
  else if(a==='undo-preset'){if(!presetUndoDraft)throw Error('There is no previous draft to restore.');draft=QQ.clone(presetUndoDraft);presetUndoDraft=null;render();toast('Previous draft restored.');}
  else if(a==='team'){stop();view='setup';stepIndex=2;render();}
  else if(a==='review')review();
  else if(a==='apply')applyDraft(el.dataset.mode,el.dataset.resume);
  else if(a==='discard'){draft=QQ.clone(state.config);render();}
  else if(a==='enable-profiles'){draft.customerMix=QQ.clone(QQ.DEFAULT.customerMix);draft.profileStrength=QQ.DEFAULT.profileStrength;draft.focusType='none';render();}
  else if(a==='add-service'){const id=$('#service-template').value;addCatalogService(QQServiceCatalog.SERVICES.some(s=>s.id===id)?id:id==='menu'?'menu-refresh':null);}
  else if(a==='duplicate'){if(draft.services.length>=20)throw Error('The prototype supports up to 20 services.');const s=QQ.clone(draft.services[Number(el.dataset.index)]);s.id=newServiceId();s.name+=' copy';s.weight=0;draft.services.push(s);expandedService=draft.services.length-1;render();}
  else if(a==='remove-service'){if(draft.services.length<=1)throw Error('Keep at least one service.');clearServiceRecords(draft.services[Number(el.dataset.index)].id);draft.services.splice(Number(el.dataset.index),1);expandedService=Math.min(expandedService,draft.services.length-1);render();}
  else if(a==='assign-remainder'){
   const service=draft.services[Number(el.dataset.index??$('#mix-recipient').value)],total=draft.services.reduce((sum,s)=>sum+(s.weight||0),0),weight=QQ.round((service?.weight||0)+100-total);
   if(!service||weight<0||weight>100)throw Error('Choose an offer that can take the remaining weight.');
   service.weight=weight;serviceUndoDraft=null;presetUndoDraft=null;render();
  }
  else if(a==='balance'){const offers=draftRunConfig().services,n=offers.length,part=Math.floor(100/n);offers.forEach((s,i)=>s.weight=i===n-1?100-part*(n-1):part);render();}
  else if(a==='play')play();
  else if(a==='step'){if(beginRun('step'))tick();}
  else if(['simulate','finish','finish-run','next-event'].includes(a))advanceRun(a);
  else if(a==='stage'||a==='project')openInspector(a,el);
  else if(a==='unselect')leaveInspector();
  else if(a==='filter-complete'||a==='all-open-jobs'){stop();view='projects';filter=a==='filter-complete'?'complete':'active';search='';selection=null;inspectorTrail=[];render();focusViewHeading();}
  else if(['priority','deadline','approve'].includes(a)){stop();const p=state.projects.find(v=>v.id===el.dataset.id);QQ.intervene(state,p.id,a,a==='deadline'?p.due+3:undefined);render();if(a==='approve'&&selection?.id===p.id)document.querySelector('#inspector')?.focus({preventScroll:true});}
  else if(a==='checkpoint'){checkpoint('manual');render();}
  else if(a==='comparison-report')comparisonReportDialog();
  else if(a==='download-comparison')downloadComparison();
  else if(a==='open-saved-replay'){
   const i=Number(el.dataset.index),r=checkpointInfo[i]?.replays?.[Number(el.dataset.record)];
   if(!r)throw Error('The saved replay is unavailable.');
   showSavedComparison(saved[checkpointInfo.findIndex(x=>x.replayId===r.baselineId)],saved[i],r);
   if(r.carriedThrough||r.finishAcceptedWork)startWorkFromSaved(Boolean(r.carriedThrough));
  }
  else if(a==='pin-baseline'){comparisonSelection=null;const i=Number(el.dataset.index);if(!saved[i])throw Error('Choose a saved checkpoint.');checkpointInfo.forEach((v,n)=>{v.baseline=n===i;});checkpointInfo[i].kind='manual';render();}
  else if(a==='branch'){stop();modal(`<h2 id="dialog-title">Branch this scenario</h2><p>Save the current run, then continue in an independent copy. Any setup draft is kept with the new branch.</p><label class="input-field">Scenario name<input id="branch-name" maxlength="100" value="${esc(state.config.name+' · alternative')}"></label><div class="actions">${btn('Cancel','close')}${btn('Create branch','confirm-branch','primary')}</div>`);render();}
  else if(a==='confirm-branch'){const name=$('#branch-name').value.trim();if(!name)throw Error('Enter a scenario name.');checkpoint();state=QQ.clone(state);state.config.name=name;draft.name=name;closeModal();view='setup';render();}
  else if(a==='load'){if(dirty())throw Error('Apply or cancel setup changes before loading a checkpoint.');stop();const next=QQ.restore(saved[Number(el.dataset.index)]);if(draftRunConfig()!==draft)archiveCurrent('Before loading checkpoint · '+state.config.name);checkpoint();state=next;draft=QQ.clone(state.config);selection=null;render();}
  else if(a==='restart'){stop();if(dirty()){review();return;}modal(`<h2 id="dialog-title">Restart from day 0?</h2><p>Your current run will be saved as a checkpoint. The new run uses the same applied assumptions and seed.</p><div class="actions">${btn('Cancel','close')}${btn('Save & restart','confirm-restart','primary')}</div>`);render();}
  else if(a==='confirm-restart'){checkpoint();state=QQ.fresh(state.config);selection=null;inspectorTrail=[];view='map';closeModal();render();}
  else if(a==='example'){stop();modal(`<h2 id="dialog-title">Open a worked example?</h2><p>Load a hypothetical studio on day 12, with projects to inspect. Your complete workspace will be preserved inside the app, including checkpoints and unfinished inputs.</p><div class="actions">${btn('Cancel','close')}${btn('Preserve & open example','confirm-example','primary')}</div>`);render();}
  else if(a==='confirm-example'){archiveCurrent();state=QQ.fresh();saved=[];checkpointInfo=[];recoveryFiles=[];recoveryRaw=null;for(let i=0;i<12;i++)QQ.step(state);draft=QQ.clone(state.config);view='map';selection=null;closeModal();render();}
  else if(a==='cash')cashModal();
  else if(a==='fund'){modal(`<h2 id="dialog-title">Add owner funding</h2><p>Cash increases. Revenue and profit do not change.</p><label class="input-field">Amount ($)<input id="funding"${QQI18n.moneyField('$')} type="number" min="0.01" max="100000000" step="0.01" value="1000"></label><div class="actions">${btn('Cancel','close')}${btn('Add funding','confirm-fund','primary')}</div>`);render();}
  else if(a==='confirm-fund'){const f=$('#funding');if(!f.checkValidity())return f.reportValidity();QQ.fund(state,Number(QQI18n.inputValue(f)));closeModal();render();}
  else if(a==='backup'){download('MEIQQ-Backup-Day-'+state.day+'.json',MEIQQWorkspace.serialize(currentWorkspace(),archives));toast('Backup download requested. Unfinished inputs and preserved workspaces are included.');}
  else if(a==='recover')download('MEIQQ-original-save.json',recoveryRaw);
  else if(a==='import')importFile();
  else if(a==='confirm-import'){if(!pendingImport)throw Error('Choose a backup first.');openImportedWorkspace(pendingImport);pendingImport=null;view=state.day?'map':'setup';closeModal();render();}
else if(a==='open-archive'){
   const index=Number(el.dataset.index),item=archives[index];if(!item)throw Error('Workspace not found.');
   const next=QQ.clone(item.workspace),rest=archives.filter((_,i)=>i!==index);
   MEIQQWorkspace.archive(rest,currentWorkspace());installWorkspace({...next,archives:rest});recoveryRaw=null;selection=null;render();
  }
  else if(a==='export-archive'){const item=archives[Number(el.dataset.index)];if(!item)throw Error('Workspace not found.');download('MEIQQ-Preserved-Workspace.json',MEIQQWorkspace.serialize(item.workspace));}
  else if(a==='recovery-file'){const file=recoveryFiles[Number(el.dataset.index)];if(!file)throw Error('Recovery file not found.');download('MEIQQ-Recovered-Original.json',file.text);}
  else if(a==='restore-original-draft'){
   const file=recoveryFiles[Number(el.dataset.index)];pendingDraft=file&&recoverableDraft(file);
   if(!pendingDraft)throw Error('This original does not contain a usable draft. Download it to inspect it.');
   modal(`<h2 id="dialog-title">Restore these setup inputs?</h2><p>The active run and its projects stay in place. Your current workspace will be preserved under Runs & backups before the unfinished draft changes.</p><div class="actions">${btn('Cancel','close')}${btn('Restore draft','confirm-restore-draft','primary')}</div>`);
  }
  else if(a==='confirm-restore-draft'){
   if(!pendingDraft)throw Error('Choose an original draft first.');
   archiveCurrent('Before draft recovery · '+state.config.name+' · day '+state.day);
   draft=QQ.clone(pendingDraft);pendingDraft=null;view='setup';stepIndex=0;closeModal();render();
  }
  else if(a==='rename-checkpoint'){const i=Number(el.dataset.index);modal(`<h2 id="dialog-title">Name this checkpoint</h2><label class="input-field">Name<input id="checkpoint-name" maxlength="100" value="${esc(checkpointInfo[i].label)}"></label><div class="actions">${btn('Cancel','close')}${btn('Save name','confirm-rename','primary',`data-index="${i}"`)}</div>`);}
  else if(a==='confirm-rename'){const i=Number(el.dataset.index),label=$('#checkpoint-name').value.trim();if(!label||label.length>100)throw Error('Enter a name up to 100 characters.');checkpointInfo[i]={...checkpointInfo[i],label,kind:'manual',baseline:Boolean(checkpointInfo[i].baseline)};closeModal();render();}
  else if(['delete-checkpoint','delete-archive'].includes(a)){const kind=a==='delete-checkpoint'?'checkpoint':'workspace';modal(`<h2 id="dialog-title">Delete this ${kind}?</h2><p>This removes the saved copy from this browser. Existing downloaded backups keep their copy.</p><div class="actions">${btn('Cancel','close')}${btn('Delete saved copy','confirm-delete','primary',`data-kind="${kind}" data-index="${Number(el.dataset.index)}"`)}</div>`);}
  else if(a==='confirm-delete'){const i=Number(el.dataset.index);if(el.dataset.kind==='checkpoint'){MEIQQWorkspace.removeCheckpoint(saved,checkpointInfo,i);comparisonSelection=null;}else archives.splice(i,1);closeModal();render();}
  else if(a==='close'){closeModal();render();}
  if(['confirm-catalog-service','add-blank-service','add-starter','confirm-starter','undo-services','use-service-price','apply','confirm-preset','undo-preset','discard','enable-profiles','add-service','duplicate','remove-service','balance','assign-remainder','priority','deadline','approve','checkpoint','pin-baseline','confirm-branch','load','confirm-restart','confirm-example','confirm-fund','confirm-import','open-archive','confirm-restore-draft','confirm-rename','confirm-delete'].includes(a))save();
 }catch(err){showError(err.message||'The action could not be completed.');}finally{actionFocus=null;}
});
document.addEventListener('keydown',e=>{
 const tab=e.target?.closest?.('[role="tab"][data-action="setup-step"]');
 if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
  e.preventDefault();const current=Number(tab.dataset.step),next=e.key==='Home'?0:e.key==='End'?steps.length-1:(current+(e.key==='ArrowRight'?1:-1)+steps.length)%steps.length;
  setupRepairPath=null;stepIndex=next;render();setTimeout(()=>document.querySelector('#setup-tab-'+next)?.focus(),0);return;
 }
 if(!$('#modal').firstChild){if(e.key==='Escape'&&view==='map'&&selection){e.preventDefault();leaveInspector();}return;}
 if(e.key==='Escape'){closeModal();render();}
 if(e.key==='Tab'){const els=modalTabStops();if(!els.length)return;e.preventDefault();const current=els.indexOf(document.activeElement),next=current<0?(e.shiftKey?els.length-1:0):(current+(e.shiftKey?-1:1)+els.length)%els.length;els[next].focus();}
});
window.addEventListener('beforeunload',e=>{save();studioSession.save();jobsSession.save();plannerSession.save();if(plannerSession.unsaved||jobsSession.unsaved||studioSession.unsaved||storeError||saveStatus==='saving'||saveStatus==='pending'||recoveryRaw!==null||primaryReadFailed){e.preventDefault?.();e.returnValue='';}});
render();
const appReady=initializeStorage();
const studioReady=studioSession.open().then(()=>{if(['studio','planner','jobs'].includes(view))render();});
const jobsReady=jobsSession.open().then(()=>{if(view==='jobs'||view==='planner')render();});
const plannerReady=plannerSession.open().then(()=>{plannerController.initialize();if(view==='planner')render();});

const dollarFormat=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
function dollars(value){if(QQI18n.language==='zh-CN')return QQI18n.yuan(value);const rounded=QQ.round(value);return Number.isInteger(rounded)?money(rounded):dollarFormat.format(rounded);}
function analyticsRate(v){return v===null?'—':(v*100).toFixed(1)+'%';}
function analyticsMoney(v){return v===null?'—':dollars(v);}
function analyticsRows(rows){return rows.map(([label,value])=>`<div class="minirow"><span>${label}</span><b>${value}</b></div>`).join('');}
function analyticsTable(headers,rows,empty='No results yet. Advance the simulation to populate this view.'){
 return `<div class="tablewrap analytics-table"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
}
function resultCell(value){return `<td class="${value<0?'negative':''}">${dollars(value)}</td>`;}
function financeView(m){
 const a=QQ.analytics(state);
 return `<div class="analytics-context"><span><b>${scenarioName(state.config.name)}</b> · Day ${state.day} of ${state.config.months*30}</span><span>${analyticsTab==='overview'||analyticsTab==='cash'?'USD':'USD · Run to date unless labeled monthly'}</span></div>
 <div class="analytics-tabs" role="group" aria-label="Results sections">${[['overview','Profit overview'],['contracts','Contracts'],['performance','Simulation stats'],['cash','Cash & ledger'],['compare','Compare runs']].map(([id,name])=>btn(name,'analytics-tab',analyticsTab===id?'active':'',`data-tab="${id}" aria-pressed="${analyticsTab===id}"`)).join('')}</div>
 <div class="analytics-content">${analyticsTab==='contracts'?contractAnalyticsView(a):analyticsTab==='performance'?simulationAnalyticsView(a,m):analyticsTab==='cash'?cashFinanceView(m):analyticsTab==='compare'?scenariosTableView():marginAnalyticsView(a,m)}</div>`;
}
function selectResultsMonth(month=null){
 const lastMonth=Math.max(1,Math.ceil(state.day/30));
 if(Number.isInteger(month)&&month>=1&&month<=lastMonth)resultsMonths.set(state,month);
 else resultsMonths.delete(state);
}
function resultsPeriodPicker(month){
 const count=Math.ceil(state.day/30);
 if(count<2)return '';
 const options=Array.from({length:count},(_,i)=>{
  const number=i+1,partial=number===count&&state.day%30!==0;
  return `<option value="${number}" ${number===month?'selected':''}>Month ${number}${partial?' (partial)':''}</option>`;
 });
 return `<label class="month-picker">Reporting month <select id="result-month">${options.join('')}</select></label>`;
}
function monthProjectLink(id,origin,endDay){
 if(!id)return '';
 const label='Inspect '+esc(id)+(endDay<state.day?' at day '+state.day:'');
 return btn(label,'project','table-link month-project',`data-id="${esc(id)}" data-origin="${origin}"`);
}
function openMonthJobs(month){
 const r=QQ.monthResult(state,month),history={reader:QQ.recordedMonthClose(state,month),timer:null};
 monthJobHistory=history;
 const heading='<h2 id="dialog-title">Unfinished jobs at day '+r.endDay+'</h2>';
 const closeAction='<div class="actions">'+btn('Close','close')+'</div>';
 function show(close,reason){
  const order=close?QQ.orderedProjects(close):[],byDemand=new Map(order.map(p=>[p.demandId,p]));
  const rows=r.unfinishedJobs.map(job=>{
   const p=byDemand.get(job.demandId),d=p?QQ.projectDiagnostic(close,p,order):null;
   let wait='',action='';
   if(d){
    const resource=workResource(d.stage);
    const remaining=resource?effortHours(d.remainingWorkHours)+' hours of '+({design:'design',review:'review',delivery:'delivery'}[d.stage]||'work')+' remaining':
     d.remainingCalendarDays+' calendar '+(d.remainingCalendarDays===1?'day':'days')+' remaining';
    const actor=d.stage==='design'?'Design team':stageOwner[d.stage];
    wait='<p>'+esc(actor)+' · '+esc(shortLabels[d.stage])+' · '+esc(remaining)+'.</p>';
    if(resource&&d.remainingWorkHours>0){
     const key=resource==='owner'?'ownerHours':close.config.designers===0?'designers':'designerHours';
     action=btn('Replay month '+month+' for '+esc(job.id),'open-replay','soft small','data-month="'+month+'" data-demand-id="'+esc(job.demandId)+'" data-key="'+key+'"');
    }
   }
   const current=btn('View '+esc(job.id)+' at current day '+state.day,'month-job-current','table-link','data-id="'+esc(job.id)+'"');
   return '<li><h3>'+esc(job.id)+' · '+esc(job.service)+'</h3>'+wait+'<p>Accepted day '+job.accepted+' · '+dollars(job.cost)+' in costs during this period.</p><div class="actions">'+action+current+'</div></li>';
  }).join('');
  const note=reason?'<p role="status">Stage and remaining work unavailable. '+esc(reason)+'</p>':'';
  modal(heading+'<p>'+daySpan(r.firstDay,r.endDay)+' · '+dollars(r.unfinishedCost)+' in costs on these jobs.</p>'+note+'<ul class="month-history-list">'+rows+'</ul>'+closeAction);
 }
 modal(heading+'<p role="status">Checking the recorded work through day '+r.endDay+'…</p>'+closeAction);
 function advance(){
  if(monthJobHistory!==history)return;
  try{
   const start=performance.now();
   for(let i=0;i<5&&performance.now()-start<12;i++){
    const next=history.reader.next();
    if(next.done){show(next.value);return;}
   }
   history.timer=setTimeout(advance,0);
  }catch(error){show(null,error.message);}
 }
 history.timer=setTimeout(advance,0);
}
function monthDrivers(r,costs){
 const rows=[];
 const add=(label,amount,note='')=>{
  const signed=(amount>0?'+':'')+dollars(amount);
  rows.push(`<li class="month-driver"><div><b>${label}</b>${note?`<small>${note}</small>`:''}</div><strong>${signed}</strong></li>`);
 };
 const leading=r.services.reduce((best,s)=>s.revenue>(best?.revenue||0)?s:best,null);
 const revenueNote=leading?`${esc(leading.name)} earned ${dollars(leading.revenue)} from ${leading.delivered} ${leading.delivered===1?'delivery':'deliveries'}. ${monthProjectLink(leading.deliveredProjectId,'month-delivery',r.endDay)}`:'';
 add('Delivered revenue',r.revenue,revenueNote);
 for(const [label,amount] of costs)add(label,-amount);
 let workInProgress='';
 if(r.awaitingDelivery){
  const scope=r.awaitingDelivery===1?'1 accepted job was':r.awaitingDelivery+' accepted jobs were';
  const spent=r.unfinishedCost?` Of the costs above, <b>${dollars(r.unfinishedCost)}</b> went toward this work.`:'';
  const link=btn('See '+r.awaitingDelivery+' unfinished '+(r.awaitingDelivery===1?'job':'jobs')+' at day '+r.endDay,'month-jobs','table-link',`data-month="${r.month}"`);
  workInProgress=`<p class="month-unfinished">${scope} still awaiting delivery at day ${r.endDay}.${spent} ${link}</p>`;
 }
 return `<section class="panel padded month-driver-panel"><h2>What drove the result</h2><ul class="month-drivers">${rows.join('')}</ul>${workInProgress}</section>`;
}
function monthCash(r){
 const atEnd=[];
 if(r.receivable)atEnd.push(dollars(r.receivable)+' remained due on delivered work');
 if(r.depositsHeld)atEnd.push(dollars(r.depositsHeld)+' had been collected on unfinished work');
 const balances=atEnd.length?`<p>At day ${r.endDay}, ${atEnd.join(' and ')}.</p>`:'';
 const movement=r.cashChange===0?'Unchanged from':r.cashChange>0?`Up ${dollars(r.cashChange)} from`:`Down ${dollars(-r.cashChange)} from`;
 return `<section class="panel padded month-cash-summary"><h2>Closing cash</h2><strong class="month-cash-balance">${dollars(r.closingCash)}</strong><p>${movement} ${dollars(r.openingCash)} at the start of the month.</p>
 <p>Customers paid <b>${dollars(r.receipts)}</b>. The studio paid <b>${dollars(r.cost)}</b> in costs.${r.funding?' Owner funding added <b>'+dollars(r.funding)+'</b>.':''}</p>${balances}
 ${btn('See cash movements','month-cash','small',`data-month="${r.month}"`)}</section>`;
}
function monthlyOverview(){
 if(!state.day){
  return `<section class="panel padded month-summary"><h2>Month 1 has not started</h2><p>Cash at day 0 is <b>${dollars(state.cash)}</b>. Advance the run to see which jobs earn revenue and which costs the studio pays.</p>${btn('Open run','view','soft','data-view="map"')}</section>`;
 }
 const r=QQ.monthResult(state,resultsMonths.get(state));
 const scope=`${daySpan(r.firstDay,r.endDay)}${r.days<30?' · '+r.days+' of 30 days':''}`;
 let outcome='broke even';
 if(r.profit>0)outcome='made '+dollars(r.profit);
 if(r.profit<0)outcome='lost '+dollars(-r.profit);
 const title=`Month ${r.month} ${outcome}${r.days<30?' so far':''}`;
 const deliveries=r.delivered?`${r.delivered} ${r.delivered===1?'delivery earned':'deliveries earned'} <b>${dollars(r.revenue)}</b>.`:'No jobs were delivered in this period.';
 const costs=[['Design labor',r.designLabor],['Printing and shipping',r.supplierCost],['Other project costs',r.otherProjectCost],['Shared overhead',r.overhead]].filter(([,amount])=>amount>0).sort((a,b)=>b[1]-a[1]);
 const spending=costs.length===0?'No costs were incurred.':costs.length===1?`${costs[0][0]} accounted for all <b>${dollars(r.cost)}</b> in costs.`:`${costs[0][0]} accounted for <b>${dollars(costs[0][1])}</b> of the <b>${dollars(r.cost)}</b> spent.`;
 return `<section class="panel padded month-summary"><div class="month-result-head"><div><p class="month-range">Operating result · ${scope}</p><h2>${title}</h2></div>${resultsPeriodPicker(r.month)}</div>
 <p class="month-verdict">${deliveries} ${spending}</p>
 <p class="month-owner">After valuing owner time at ${dollars(r.ownerTime)} (${r.rateHistoryAvailable?'day '+r.endDay+' target':'rate history unavailable, current target'} ${dollars(r.ownerRate)}/h), the result was <strong class="${r.afterOwner<0?'negative':''}">${dollars(r.afterOwner)}</strong>.</p></section>
 <div class="two-col month-explanation">${monthDrivers(r,costs)}${monthCash(r)}</div>`;
}
function marginAnalyticsView(a,m){
 const rate=analyticsRate;
 const wholeRun=state.day>30?`<section class="run-total" aria-label="Whole run totals"><b>Whole run · days 1–${state.day}</b><span>${m.delivered} delivered</span><span>${dollars(a.profit)} operating result</span><span>${dollars(a.periodAfterOwner)} after owner time · ${state.replayJournal?'period-end targets':'current target, rate history unavailable'}</span></section>`:'';
 return `${wholeRun}${monthlyOverview()}<details class="result-details" data-disclosure="results-cumulative"><summary>Run-to-date financial details · day ${state.day}</summary><div class="two-col"><section class="panel padded"><h2>Revenue → operating result</h2>${analyticsRows([['Delivered revenue',dollars(state.revenue)],['− Direct costs on delivered work',dollars(a.deliveredCost)],['= Delivered contribution',dollars(a.contribution)],['− Costs on unfinished work',dollars(a.unfinishedCost)],['− Shared overhead',dollars(a.overhead)],['= Operating result',dollars(a.profit)],["All hours at today's target of "+dollars(state.config.ownerTarget)+'/h',dollars(a.ownerTime)],['= Result after owner time',dollars(a.afterOwner)]])}<p class="helper">Direct costs include design labor and print/shipping. Margin = result ÷ delivered revenue; shown as — when revenue is zero. Owner time is valued at the current ${dollars(state.config.ownerTarget)}/h across the entire run.</p></section>
 <section class="panel padded"><h2>Cash, pipeline & efficiency</h2>${analyticsRows([['Cash available',dollars(state.cash)],['Accepted work still to deliver',dollars(a.backlog)],['Delivered balances to collect',dollars(m.receivable)],['Contribution margin',rate(a.contributionMargin)],['Operating margin',rate(a.operatingMargin)],['After owner-time margin',rate(a.afterOwnerMargin)],['Average accepted cycle value',analyticsMoney(a.averageOrder)],['Operating result / owner hour',analyticsMoney(a.profitPerOwnerHour)],['On-time delivery',rate(m.onTimeRate)],['Delivered in last 30 days',m.throughput30]])}<p class="helper">Booked work is not earned revenue. Cash includes deposits and owner funding. These results describe this simulation, not a forecast independent of your assumptions.</p>${btn('Inspect contracts','analytics-tab','soft','data-tab="contracts"')}</section></div>
 <section class="panel analytics-section"><div class="panelhead"><div><h2>Which services contribute most?</h2><p class="helper">Ranked by contribution dollars · excludes shared overhead and owner time</p></div></div>${analyticsTable(['Service','New inquiries','Delivered','Revenue','Direct cost¹','Contribution','Margin','Unfinished cost'],a.services.map(s=>`<tr><td>${serviceName(s)}</td><td>${s.inquiries}</td><td>${s.delivered}</td><td>${dollars(s.revenue)}</td><td>${dollars(s.deliveredCost)}</td>${resultCell(s.contribution)}<td>${rate(s.margin)}</td><td>${dollars(s.unfinishedCost)}</td></tr>`))}<p class="helper analytics-note">¹ Direct cost for delivered work only. Service changes remain grouped under their original service identity.</p></section></details>`;
}
function filteredContracts(a){
 const query=contractSearch.trim().toLowerCase();
 return a.contracts.filter(c=>(!query||(c.client+' '+c.id).toLowerCase().includes(query))&&(contractFilter==='all'||contractFilter==='open'&&c.open>0||contractFilter==='receivable'&&c.receivable>0||contractFilter==='negative'&&c.afterOwner<0)).sort((x,y)=>{
  if(contractSort==='margin'){if(x.margin===null)return y.margin===null?x.id.localeCompare(y.id):1;if(y.margin===null)return -1;}
  return (y[contractSort]??0)-(x[contractSort]??0)||x.id.localeCompare(y.id);
 });
}
function contractAnalyticsView(a){
 const filtered=filteredContracts(a),pages=Math.max(1,Math.ceil(filtered.length/20));contractPage=Math.min(contractPage,pages-1);
 const visible=filtered.slice(contractPage*20,contractPage*20+20);
 const options=(list,value)=>list.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('');
 return `<div class="metrics">${metric('Contracts',a.contracts.length,'All accepted client relationships')}${metric('Booked value',money(a.contracts.reduce((n,c)=>n+c.booked,0)),'All accepted cycles, including delivered')}${metric('Delivered receivables',money(a.contracts.reduce((n,c)=>n+c.receivable,0)),'Positive balances still to collect')}${metric('Below owner-time target',a.contracts.filter(c=>c.afterOwner<0).length,'To date; excludes shared overhead')}</div>
 <section class="panel"><div class="panelhead"><div><h2>Contract economics</h2><p class="helper">One row per contract · expand a client for cycle details</p></div></div><div class="analytics-tools"><label class="search-label">Find client or contract<input id="contract-search" type="search" value="${esc(contractSearch)}" placeholder="Client name or contract ID" /></label><label class="search-label">Show<select id="contract-filter">${options([['all','All contracts'],['open','Awaiting delivery'],['receivable','Balance to collect'],['negative','Below owner-time target']],contractFilter)}</select></label><label class="search-label">Rank by<select id="contract-sort">${options([['contribution','Contribution · high to low'],['margin','Margin · high to low'],['revenue','Revenue · high to low'],['receivable','Receivable · high to low'],['afterOwner','After owner time · high to low']],contractSort)}</select></label></div>
 ${analyticsTable(['Client / contract','Delivered / accepted','Revenue','Contribution','Margin','Receivable','After owner time*'],visible.map(c=>`<tr data-render-key="contract-row-${esc(c.id)}"><td><details data-disclosure="contract-${esc(c.id)}"><summary id="contract-summary-${esc(c.id)}">${esc(c.client)}</summary><div class="contract-detail"><small>${esc(c.id)} · ${c.kind==='campaign-relationship'?'Yearly campaign relationship':c.kind==='paid-cycle'?'Paid-cycle subscription':'Repeat-purchase contract'}</small>${analyticsRows([...(c.kind==='campaign-relationship'?[['Campaign interval',c.cadenceDays+' days'],['Relationship ends','Day '+c.relationshipEndDay],['Next quote',c.nextQuoteDay===null?'Not scheduled':'Day '+c.nextQuoteDay],['Skipped campaigns',c.skippedCampaigns||0]]:[]),['Booked value',money(c.booked)],['Collected, including deposits',money(c.collected)],['Costs on unfinished work',money(c.unfinishedCost)],['Open delivery cycles',c.open],['Owner / design hours',num(c.ownerHours)+' / '+num(c.designHours)]])}<div class="actions">${c.projects.map(id=>btn(esc(id),'project','table-link',`data-id="${esc(id)}"`)).join('')}</div></div></details></td><td>${c.delivered} / ${c.cycles}</td><td>${money(c.revenue)}</td>${resultCell(c.contribution)}<td>${analyticsRate(c.margin)}</td><td>${money(c.receivable)}</td>${resultCell(c.afterOwner)}</tr>`),'No contracts match. Contracts appear after quotes are accepted.')}
 <div class="analytics-pagination"><span>${filtered.length?contractPage*20+1:0}–${Math.min((contractPage+1)*20,filtered.length)} of ${filtered.length} contracts · totals above cover all contracts</span><div class="actions">${btn('Previous','contract-page','small',`data-delta="-1" ${contractPage===0?'disabled':''}`)}${btn('Next','contract-page','small',`data-delta="1" ${contractPage===pages-1?'disabled':''}`)}</div></div></section>
 <p class="helper">Contribution = delivered revenue − direct costs on delivered cycles. *After owner time = revenue − all incurred contract costs − recorded contract hours × current owner target. It excludes shared overhead, outreach and time on declined new quotes. Open cycles can make this interim result negative. Contract totals will not equal the whole-business result.</p>`;
}
function sampleArrivalCeiling(config){
 if(config.acquisition==='preset')return 30*Math.ceil(config.inquiries/30);
 return QQ.workingDays(30)*Math.ceil(Math.min(config.ownerHours,config.outreachHours)/5*config.leadsPerHour);
}
function cancelMonthSample(){
 if(monthSample?.status!=='running')return;
 clearTimeout(monthSample.timer);
 monthSample.status='cancelled';
 monthSample.run=null;
}
function startMonthSample(){
 if(view!=='finances'||analyticsTab!=='performance'||sampleArrivalCeiling(state.config)>600)return;
 if(monthSample?.status==='running'){
  if(monthSample.key===JSON.stringify(state.config))return;
  cancelMonthSample();
 }
 const config=QQ.clone(state.config);
 const sample={config,key:JSON.stringify(config),runs:[],run:null,status:'running',timer:null};
 monthSample=sample;
 render();
 function tickSample(){
  if(monthSample!==sample||sample.status!=='running')return;
  if(view!=='finances'||analyticsTab!=='performance'||JSON.stringify(state.config)!==sample.key){cancelMonthSample();return;}
  const began=performance.now();
  try{
   for(let steps=0;steps<5&&performance.now()-began<8;steps++){
    const seed=sample.runs.length+1;
    if(!sample.run)sample.run=QQ.fresh({...config,seed});
    const run=sample.run,advanced=QQ.step(run);
    if(run.blocked)sample.runs.push({seed,blockedDay:run.day+1,shortfall:run.blocked.gap});
    else if(run.day===30){
     const metrics=QQ.metrics(run);
     sample.runs.push({seed,cash:run.cash,profit:metrics.profit,afterOwner:metrics.surplus,delivered:metrics.delivered});
    }else if(advanced)continue;
    else throw Error('The sample stopped before day 30.');
    sample.run=null;
    if(sample.runs.length===SAMPLE_SIZE){sample.status='complete';render();return;}
    const progress=$('#month-sample-progress');
    if(progress)progress.textContent=QQI18n.text(sample.runs.length+' of '+SAMPLE_SIZE+' sample months checked.');
   }
   sample.timer=setTimeout(tickSample,0);
  }catch(error){
   sample.run=null;sample.status='error';sample.error=error.message;render();
  }
 }
 sample.timer=setTimeout(tickSample,0);
}
function monthSampleView(){
 const sample=monthSample?.key===JSON.stringify(state.config)?monthSample:null;
 const ceiling=sampleArrivalCeiling(state.config),title='<h2>First-month replay range</h2>';
 const basis='<p class="helper">Seeds 1–20 each start at day zero with your applied setup and its starting cash. The range shows variation within this model.</p>';
 if(ceiling>600)return `<section class="panel padded">${title}${basis}<p class="helper">This batch supports up to 600 possible new inquiries per sample month. Your setup allows up to ${ceiling}.</p></section>`;
 if(sample?.status==='running')return `<section class="panel padded">${title}${basis}<p role="status" id="month-sample-progress">${sample.runs.length} of ${SAMPLE_SIZE} sample months checked.</p>${btn('Cancel sample','cancel-sample','small')}</section>`;
 if(sample?.status!=='complete'){
  const note=sample?.status==='cancelled'?`<p role="status">Cancelled after ${sample.runs.length} of ${SAMPLE_SIZE} months.</p>`:sample?.status==='error'?`<p role="alert">${esc(sample.error)}</p>`:'';
  return `<section class="panel padded">${title}${basis}${note}${btn('Run 20 sample months','sample-months','soft')}</section>`;
 }
 const completed=sample.runs.filter(row=>row.blockedDay===undefined),blocked=sample.runs.filter(row=>row.blockedDay!==undefined);
 const dollars=QQI18n.language==='zh-CN'?{format:QQI18n.yuan}:new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
 const measures=[['Closing cash','cash'],['Operating result','profit'],['After owner time','afterOwner'],['Deliveries','delivered']];
 const rows=completed.length?measures.map(([label,field])=>{
  const values=completed.map(row=>row[field]).sort((a,b)=>a-b),middle=Math.floor(values.length/2);
  const median=values.length%2?values[middle]:(values[middle-1]+values[middle])/2;
  const cells=[values[0],median,values.at(-1)].map(n=>`<td>${field==='delivered'?n:dollars.format(n)}</td>`).join('');
  return `<tr><th scope="row">${label}</th>${cells}</tr>`;
 }):[];
 const result=rows.length?analyticsTable(['Day-30 measure','Lowest','Median','Highest'],rows):'<p>No sample reached day 30. A day-30 range is unavailable.</p>';
 const issues=blocked.length?`<details data-disclosure="sample-funding"><summary>Funding decisions · ${blocked.length} seeds</summary><ul>${blocked.map(row=>`<li>Seed ${row.seed} · day ${row.blockedDay} · ${dollars.format(row.shortfall)} needed</li>`).join('')}</ul></details>`:'';
 return `<section class="panel padded">${title}${basis}<p><b>${completed.length} of ${SAMPLE_SIZE} reached day 30.</b> ${blocked.length} paused for funding. Day-30 figures use completed months only.</p>${result}${issues}</section>`;
}
function simulationAnalyticsView(a,m){
 const max=Math.max(1,...a.monthly.map(r=>Math.max(r.revenue,Math.abs(r.profit))));
 return `<div class="metrics">${metric('New quote conversion',analyticsRate(a.conversion),a.won+' accepted / '+(a.won+a.lost)+' decided')}${metric('Returning cycle share',analyticsRate(a.repeatShare),a.repeatCycles+' accepted returning cycles')}${metric('On-time delivery',analyticsRate(m.onTimeRate),m.lateCompleted+' delivered late')}${metric('Average delivery lead time',m.averageAcceptedLeadDays===null?'—':num(m.averageAcceptedLeadDays)+' d','Acceptance to delivery')}</div>
 <div class="two-col"><section class="panel padded"><h2>Monthly revenue & operating result</h2><div class="trend-legend"><span>▰ Revenue</span><span>━ Operating result (signed)</span></div>${a.monthly.map(r=>`<div class="trend-row"><b>M${r.month}${r.days<30?' · partial':''}</b><div><div class="trend-line"><span class="trend-bar" style="width:${r.revenue/max*100}%"></span><span>${money(r.revenue)}</span></div><div class="trend-line"><span class="trend-bar result ${r.profit<0?'loss':''}" style="width:${Math.abs(r.profit)/max*100}%"></span><span>${money(r.profit)}</span></div></div></div>`).join('')}<p class="helper">Common dollar scale; negative results are labeled with a minus sign. Partial months are not directly comparable with full 30-day months.</p></section><section class="panel padded"><h2>Pipeline & delivery health</h2>${analyticsRows([['Served / unserved external inquiries',a.external+' / '+m.unserved],['New quotes still undecided',a.pending],['Clients with accepted work',a.uniqueClients],['Late open deliveries',m.late],['Oldest quote',m.oldestQuoteAge+' d'],['Remaining owner / design work',num(m.ownerOpenHours)+' / '+num(m.designerOpenHours)+' h'],['Overdue final payments',m.overduePayments],['Owner / design hours recorded',num(state.ownerHours)+' / '+num(state.designHours)+' h']])}<p class="helper">Conversion excludes undecided quotes and returning orders. Returning share measures orders, not customer retention. Late deliveries and overdue payments are separate.</p></section></div>
 <section class="panel analytics-section"><div class="panelhead"><h2>Monthly detail</h2><span class="tag">30-DAY MODEL MONTHS</span></div>${analyticsTable(['Month','Revenue','Incurred costs','Operating result','Margin','After owner time','Delivered'],a.monthly.map(r=>`<tr><td>${r.month}${r.days<30?'<small>Partial · '+r.days+' days</small>':''}</td><td>${money(r.revenue)}</td><td>${money(r.cost)}</td>${resultCell(r.profit)}<td>${analyticsRate(r.margin)}</td>${resultCell(r.afterOwner)}<td>${r.delivered}</td></tr>`))}</section>
 ${monthSampleView()}<div class="actions">${btn('Compare runs','compare-runs','soft')}</div>`;
}
