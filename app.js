'use strict';
const $=s=>{const el=document.querySelector(s);return s==='#root'?patchableRoot(el):el;},esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currencyFormat=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',trailingZeroDisplay:'stripIfInteger'});
const offerAmount=value=>Number.isFinite(value)?(QQI18n.language==='zh-CN'?QQI18n.yuan(value):currencyFormat.format(value)):'—';
const quantityFormat=new Intl.NumberFormat('en-US',{useGrouping:false,minimumFractionDigits:1,maximumFractionDigits:2});
const num=x=>Number.isFinite(x)?quantityFormat.format(x):'—',pct=x=>QQ.round(x*100)+'%';
const icons={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',map:'M3 3h6v6H3z M15 15h6v6h-6z M15 3h6v6h-6z M6 9v9h9 M9 6h6',box:'M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11',chart:'M4 20V4 M4 20h17 M8 16v-4 M13 16V6 M18 16v-7',compare:'M5 3v18 M19 3v18 M5 7h9l-3-3 M14 7l-3 3 M19 17h-9l3-3 M10 17l3 3',settings:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',play:'M8 5l11 7-11 7z',pause:'M8 5v14 M16 5v14',step:'M5 5l10 7-10 7z M19 5v14',reset:'M4 10a8 8 0 1 1 1 8 M4 4v6h6',branch:'M7 3v14a3 3 0 1 0 3 3 M7 7h7a3 3 0 0 0 3-3 M17 2v4',arrow:'M5 12h14 M14 7l5 5-5 5',plus:'M12 5v14 M5 12h14',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',upload:'M12 16V4 M7 9l5-5 5 5 M4 17v4h16v-4',info:'M12 10v7 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M17 5a4 4 0 0 1 0 8 M19 16a5 5 0 0 1 3 5',user:'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2',close:'M6 6l12 12 M18 6L6 18',clock:'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',check:'M5 12l4 4L20 5',wallet:'M3 6h17v15H3z M3 6V3h14 M15 11h6v5h-6z',file:'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6'};
const icon=k=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[k]||icons.map}"/></svg>`;
const btn=(text,action,cls='',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;

// UI edits live in a separate draft. Only explicit apply actions affect the engine.
const KEY='qq-studio-lab-v1', THEME_KEY='qq-studio-appearance', MOTION_KEY='qq-studio-shard-motion', SETUP_MODE_KEY='qq-studio-setup-mode', PRESET_KEY='qq-studio-preset-selection';
const shardBackground=document.querySelector('aero-shards');
const motionPreference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion:reduce)'):null;
function applyShardMotion(){
 shardBackground?.setAttribute?.('motion','system');
 const enabled=!motionPreference?.matches;
 document.documentElement.dataset.uiMotion=enabled?'on':'off';
 if(!enabled)document.getAnimations?.().filter(a=>a.id==='workspace-motion').forEach(a=>a.cancel());
}
motionPreference?.addEventListener('change',applyShardMotion);
function syncBackgroundVisibility(){shardBackground?.toggleAttribute?.('suspended',document.hidden);}
document.addEventListener('visibilitychange',syncBackgroundVisibility);
syncBackgroundVisibility();
const RESTAURANT_EXAMPLE='Restaurant studio example', ENTRY_KEY='qq-simulator-setup-chosen';
let setupEntryPath=null,setupReturnView=null,setupOrigin=null,newScenarioRequested=false;
let skyPlayback=null;
const editorSteps=['offers','demand','people','cash'];
const destinations={studio:'Ideas',planner:'Planner',jobs:'Jobs',map:'Run scenario',finances:'Scenario results',projects:'Projects',scenarios:'Runs and backups',about:'Model guide'};
const workspaceHomes={
 'sky/studio':{name:'Studio',pages:[['studio','box'],['planner','chart'],['jobs','file']]},
 'sky/simulator':{name:'Simulator',pages:[['setup','settings'],['map','play'],['finances','chart'],['projects','file'],['scenarios','compare'],['about','info']]}
};
let skyLandingRoute='sky';
let routeReady=false,lastRoute=null,resumeRoute='',lastEditorStep=0;
let workspaceTrail=[];
try{
 resumeRoute=window.sessionStorage?.getItem('meiqq-last-page')||'';
 const storedStep=Number(window.sessionStorage?.getItem('meiqq-setup-step'));
 if(Number.isInteger(storedStep)&&editorSteps[storedStep])lastEditorStep=storedStep;
}catch{/* Navigation also works without browser storage. */}
let setupChoicePending=true,recipeOpen=false,setupCache=null,setupRepairPath=null;
let firstStepEstimate=null;
let rerunDraft=null,rerunLink=null,editingRerun=false,ordinaryDraft=null;
let keptComparisonId=null,keptSetupRun=null;
let savingKeptSetup=false;
let resettingApp=false;
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
function restaurantConfig(){return QQPresets.newWorkspaceConfig({...QQ.DEFAULT,name:RESTAURANT_EXAMPLE,fixedInquiriesEntered:false,services:QQServiceCatalog.starterServices()},'restaurant');}
let state=QQ.fresh(restaurantConfig()),saved=[],draft=QQ.clone(state.config),view='setup',stepIndex=0;
let analyticsTab='overview',contractSearch='',contractFilter='all',contractSort='contribution',contractPage=0;
const resultsMonths=new WeakMap();
let comparisonSelection=null;
let savedComparisonReader=null;
function rememberKeptComparison(id){
 if(!routeReady||view!=='finances')return;
 const route='finances',savedComparison={id,route,tab:'compare',opener:{action:'open-saved-comparison',comparisonId:id}};
 // Keep a real library entry behind the preserved result. Back from the
 // new setup revisits the report; closing it returns to this library.
 window.history.pushState({...window.history.state,savedComparison},'','#'+route+'?comparison='+id);
}
let cashView={run:null,month:0,page:0};
const SAMPLE_SIZE=20;
let monthSample=null;
const latestCapacityReplay=new WeakMap();
let replayDialog=null,monthJobHistory=null;
let archives=[],checkpointInfo=[],recoveryFiles=[],saveTimer=null,saveNoticeTimer=null,showSavingNotice=false,backend=null,saveWriter=null;
let loading=typeof indexedDB!=='undefined',saveStatus='saved',storeReason='',localRevision=null,primaryReadFailed=false,savePreparationError=null,fallbackPreserved=false;
let inspectorTrail=[];
let selection=null,running=false,timer=null,finishTarget=null,runGeneration=0,speed=1,setupMode='guided',storeError=false,recoveryRaw=null,recoveryReason='';
let runPassage=null;
let filter='active',search='',toastTimer,modalFocus=null,actionFocus=null,expandedService=-1,setupModeChanging=false;
let presetSelection={market:'metro',operation:'solo',mix:'balanced',condition:'steady'},pendingPreset=null,presetUndoDraft=null,pendingEvidence=null;
let offerPicker=null,pendingCatalogId=null,pendingStarterId=null,serviceUndoDraft=null;
const disclosureState=new Map(),catalogPrices=new Map();
// History belongs to this draft menu. Replacing a workspace or mix naturally drops it.
const removedServices=new WeakMap();
let studioUI={selectedId:null,tab:'idea',section:'offer',phase:'first'},pendingStudioImport=null;
let studioLocal;try{studioLocal=localStorage;}catch(e){}
const studioSession=QQStudioSession.create({local:studioLocal,indexedDB:typeof indexedDB==='undefined'?undefined:indexedDB,seed:()=>{const studio=QQStudio.fresh();for(const item of QQStudioSeeds.EXAMPLES)QQStudio.create(studio,QQStudioSeeds.create(item.id));return studio;},onStatus:()=>updateStudioStatus('studio')});
const jobsSession=QQStudioSession.create({local:studioLocal,indexedDB:typeof indexedDB==='undefined'?undefined:indexedDB,model:QQJobs,label:'Jobs',onStatus:()=>updateStudioStatus('jobs')});
const jobsController=QQJobsController.create({session:jobsSession,findIdea:key=>studioSession.ready?studioSession.data.offerings.find(idea=>idea.linkKey===key):null,openWorkspace:()=>{view='jobs';},render,toast,modal,closeModal,download,esc,btn,document,local:studioLocal});
const plannerSession=QQStudioSession.create({local:studioLocal,indexedDB:typeof indexedDB==='undefined'?undefined:indexedDB,model:QQPlanner,label:'Planner',seed:()=>QQPlanner.fresh(),onStatus:()=>updateStudioStatus('planner')});
function linkStudioIdea(idea){
 if(idea.linkKey)return idea;
 const linked=QQStudio.linkIdea(studioSession.data,idea.id);studioSession.changed();return linked;
}
const plannerController=QQPlannerController.create({session:plannerSession,linkIdea:linkStudioIdea,recentHours:key=>jobsSession.ready?QQJobs.recentOwnerHours(jobsSession.data,key):[],ideas:()=>studioSession.ready?studioSession.data.offerings:[],render,toast,modal,closeModal,download,esc,btn,document,local:studioLocal,copyToSimulator});
try{
  setupChoicePending=localStorage.getItem(ENTRY_KEY)!=='true';
  const raw=localStorage.getItem(KEY);localRevision=raw??null;
  if(raw!=null){try{const parsed=MEIQQWorkspace.parseText(raw);retainLegacySource(raw,parsed);installWorkspace(parsed);}catch(e){recoveryRaw=raw;recoveryReason=e.message;storeError=true;saveStatus='error';}}
  const chosenSetupMode=localStorage.getItem(SETUP_MODE_KEY);if(['guided','analyst'].includes(chosenSetupMode))setupMode=chosenSetupMode;
  try{const chosenPreset=JSON.parse(localStorage.getItem(PRESET_KEY));if(chosenPreset&&typeof chosenPreset==='object'){for(const [key,rows]of [['market',QQPresets.MARKETS],['operation',QQPresets.OPERATIONS],['mix',QQPresets.MIXES],['condition',QQPresets.CONDITIONS]])if(rows.some(v=>v.id===chosenPreset[key]))presetSelection[key]=chosenPreset[key];}}catch(e){}
}catch(e){storeError=true;}
document.documentElement.dataset.theme='terminal';
applyShardMotion();
QQI18n.syncDocument();
const steps=['Offers','Demand','People','Cash & timing'];
const DISRUPTION_LABELS={rushDeadlines:'Rush-event deadlines',supplierReprints:'Supplier reprints',repeatedRevisions:'Repeated client revisions',extendedLatePayments:'Payments 30–60 days late'};
function disruptionInputs(){
 const helps={rushDeadlines:'Some accepted projects have a shorter event deadline.',supplierReprints:'Some print jobs need another paid print batch and supplier wait.',repeatedRevisions:'Some clients request multiple rounds, consuming design and review time.',extendedLatePayments:'Some final balances arrive 30–60 days after their contractual due date.'};
 return `<section class="advanced"><h3>Real-life disruptions</h3><p class="helper">Each enabled situation can occur on selected projects when uncertainty is on. Frequencies are documented modeling estimates. New agreements lock their settings.</p>${Object.entries(DISRUPTION_LABELS).map(([key,label])=>`<div>${checkbox(label,'disruptions.'+key,draft.disruptions?.[key]||false,helps[key])}${draft.disruptions?.[key]||setupRepairPath==='disruptionRates.'+key?field('Share affected · '+label,key,Object.hasOwn(draft.disruptionRates||{},key)?draft.disruptionRates[key]:QQ.DEFAULT.disruptionRates[key],{path:'disruptionRates.'+key,percent:true,max:100,suffix:'%',disabled:!draft.realism&&setupRepairPath!=='disruptionRates.'+key,help:!draft.realism||!draft.disruptions?.[key]?'Used only when this disruption is enabled.':'An inferred frequency; adjust as actual project history becomes available.'}):''}</div>`).join('')}</section>`;
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
const businessType=id=>QQ.profileFor(id)?.label;
function draftRunConfig(source=draft){
 const services=source.services.filter(s=>!(s.customOffer===true&&s.weight===0));
 let config=source;
 if(services.length!==source.services.length||source.clientMenu){
  config={...source,services};delete config.clientMenu;
 }
 // A draft retains unfinished entries for both ways to generate inquiries.
 // The run requires a valid configuration, but never uses the inactive method.
 const inactive=source.acquisition==='sales'?['inquiries']:source.acquisition==='preset'?['outreachHours','leadsPerHour']:[];
 if(inactive.some(key=>source[key]!==state.config[key])){
  const issues=QQ.configIssues(config);
  for(const key of inactive)if(issues.some(issue=>issue.path===key)){
   if(config===source)config={...source};
   config[key]=state.config[key];
  }
 }
 return QQ.withCurrentAssumptionRecords(config);
}
function issuesForDraft(source,config){
 const issues=QQ.configIssues(config);
 if(config.services!==source.services){
  for(const issue of issues){
   const match=/^services\.(\d+)(\..*)?$/.exec(issue.path);
   if(match)issue.path='services.'+source.services.indexOf(config.services[Number(match[1])])+(match[2]||'');
  }
 }
 return issues;
}
function draftValidationIssues(){
 if(setupCache?.issues)return setupCache.issues;
 const issues=issuesForDraft(draft,draftRunConfig());
 if(setupCache)setupCache.issues=issues;
 return issues;
}
function dirty(){return JSON.stringify(draftRunConfig())!==JSON.stringify(editingRerun?rerunStartingConfig(state):state.config);}
function currentWorkspace(){
 const files=QQ.clone(recoveryFiles);
 if(recoveryRaw!==null&&!files.some(f=>f.text===recoveryRaw))files.push({name:'Unreadable original save',text:recoveryRaw});
 const w={state,saved,draft:editingRerun?ordinaryDraft:draft,checkpointInfo,recoveryFiles:files,...(setupOrigin?{setupOrigin}:{})};
 if(rerunDraft?.run===state)w.rerunDraft={...rerunTarget(rerunDraft),returnTab:rerunDraft.returnTab,resultsMonth:rerunDraft.resultsMonth,draft:editingRerun?draft:rerunDraft.draft};
 if(rerunLink?.run===state)w.rerunLink={...rerunTarget(rerunLink),original:rerunLink.original};
 if(keptSetupRun===state&&keptComparisonId)w.keptComparisonId=keptComparisonId;
 return w;
}
function retainLegacySource(raw,workspace){
 const source=JSON.parse(raw);
 const runs=source?.format==='meiqq-workspace'&&source.version===3?source.runs:[source?.state,...(source?.saved||[])];
 if(Array.isArray(runs)&&runs.some(run=>run?.version<3)&&!workspace.recoveryFiles.some(file=>file.text===raw)){
  workspace.recoveryFiles.push({name:'Original save before migration',text:raw});
 }
}
function installWorkspace(data){
 setupEntryPath=null;setupReturnView=null;newScenarioRequested=false;setupOrigin=data.setupOrigin||null;
 state=data.state;saved=data.saved;draft=data.draft;checkpointInfo=data.checkpointInfo;comparisonSelection=null;
 editingRerun=false;ordinaryDraft=null;
 rerunDraft=data.rerunDraft?{...data.rerunDraft,run:state}:null;
 rerunLink=data.rerunLink?{...data.rerunLink,run:state}:null;
 keptComparisonId=data.keptComparisonId||null;keptSetupRun=keptComparisonId?state:null;
 serviceUndoDraft=null;presetUndoDraft=null;
 recoveryFiles=data.recoveryFiles;archives=data.archives||[];recipeOpen=false;
 if(setupOrigin||state.config.name!==RESTAURANT_EXAMPLE||state.day||saved.length||archives.length||dirty())setupChoicePending=false;
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
 if(savingKeptSetup||resettingApp)return;
 clearTimeout(saveTimer);saveTimer=null;
 if(loading||recoveryRaw!==null||primaryReadFailed){updateSaveStatus();return;}
 try{
  const text=MEIQQWorkspace.serialize(currentWorkspace(),archives);
  savePreparationError=null;
  writeWorkspaceText(text);
  if(!saveWriter)persistenceStatus('saved');
 }catch(e){savePreparationError=e;persistenceStatus('error',e);}
}
function writeWorkspaceText(text){
 if(saveWriter){saveWriter.push(text);return;}
 if((localStorage.getItem(KEY)??null)!==localRevision){
  const error=Error('Another window changed this workspace.');error.code='STALE_WORKSPACE';throw error;
 }
 localStorage.setItem(KEY,text);localRevision=text;
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
    const current={state:run,saved:checkpoints,draft:setup,checkpointInfo:info,recoveryFiles:files,...(primary.setupOrigin?{setupOrigin:primary.setupOrigin}:{}),
     ...(primary.rerunDraft?{rerunDraft:primary.rerunDraft}:{}),...(primary.rerunLink?{rerunLink:primary.rerunLink}:{}),
     ...(primary.keptComparisonId?{keptComparisonId:primary.keptComparisonId}:{})};
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
 loading=false;if(!window.location)render();save();
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
 delete next.keptComparisonId;
 MEIQQWorkspace.serialize(next,nextArchives);
 keptComparisonId=null;keptSetupRun=null;
 stop();setupOrigin=null;setupEntryPath=null;setupReturnView=null;archives=nextArchives;recoveryFiles=nextFiles;draft=QQ.clone(prepared.config);presetUndoDraft=null;serviceUndoDraft=null;view='setup';stepIndex=0;closeModal();save();render();toast('Plan copied to a simulator draft. Your previous workspace is preserved in Runs & backups. Review setup before applying.');
}
function toast(message){clearTimeout(toastTimer);$('#toast').className='toast';$('#toast').textContent=QQI18n.text(message);toastTimer=setTimeout(()=>{$('#toast').className='';$('#toast').textContent='';},4500);}
function badge(text,kind=''){return `<span class="badge ${kind}">${esc(text)}</span>`;}
function metric(label,value,note,kind=''){return `<div class="metric ${kind}"><label>${label}</label><strong>${value}</strong><small>${note}</small></div>`;}
function title(){
 if(view==='setup')return draft.name?scenarioName(draft.name):'Untitled scenario';
 return view==='planner'?'Studio capacity and earnings':destinations[view];
}
function languagePicker() {
 const selected = QQI18n.language;
 const info=selected==='zh-CN'?`<details class="currency-info" data-disclosure="currency-rate"><summary>人民币 ¥</summary><p>${QQI18n.rateNote}</p></details>`:'';
 return `<div class="language-tools" translate="no"><label class="theme-picker language-picker"><span>Language / 语言</span><select id="language" aria-label="Language / 语言"><option value="en"${selected === 'en' ? ' selected' : ''}>English</option><option value="zh-CN"${selected === 'zh-CN' ? ' selected' : ''}>简体中文</option></select></label>${info}</div>`;
}
const waterfrontView=document.querySelector('#waterfront-view');
function inStudio(route=view){return route==='studio'||route==='planner'||route==='jobs';}
function atWaterfront(){return inStudio()||(view==='sky'&&skyLandingRoute==='sky/studio');}
function sceneOptions(){
 return atWaterfront()?btn('View waterfront','view-waterfront','small','aria-haspopup="dialog"'):'<button type="button" class="small" data-edit-sky>Edit sky</button>';
}
function routeLink(route,label,cls='',attrs=''){
 return `<a class="${cls}" href="#${esc(route)}" ${attrs}>${label}</a>`;
}
function workspaceHeading(simulator = false) {
 const actions = simulator && dirty() && view !== 'setup'
   ? `<div class="heading-actions"><span class="draft-indicator">Setup changes pending</span>${btn('Review setup','view','small','data-view="setup"')}</div>`
   : '';
 const runContext=simulator&&view!=='setup'?`<p class="scene-context"><span>${scenarioName(state.config.name)}</span> · Day ${state.day} of ${state.config.months*30}</p>`:'';
 return `<div class="heading workspace-heading"><div>${runContext}<h1${simulator ? ' id="sim-heading" tabindex="-1"' : ''}>${title()}</h1></div>${actions}</div>`;
}
function jobsStatusLabel(){return jobsSession.status==='opening'?'Opening jobs…':jobsSession.status==='error'?jobsSession.error+' Download a Jobs backup to keep this session.':jobsSession.status==='pending'?'Saving your latest job edits…':jobsSession.status==='saving'?'Saving jobs…':'Jobs saved in this browser · use Jobs backup for a portable copy.';}
function plannerStatusLabel(){return plannerSession.status==='opening'?'Opening planner…':plannerSession.status==='error'?plannerSession.error+' Download a Planner backup to keep this session.':plannerSession.status==='pending'?'Saving your latest planning edits…':plannerSession.status==='saving'?'Saving planner…':'Planner saved in this browser · use Planner backup for a portable copy.';}
function workspaceShell(appClass,body){
 const info=inStudio()?studioSaveInfo(view):null;
 const error=info?`<div id="${view}-save-error" class="save-status negative" role="alert" ${info.failed?'':'hidden'}>${info.failed?esc(info.message):''}</div>`:'';
 return `<div class="app ${appClass}" data-screen="${view}">${skyHeader(info)}<div class="shell" data-render-key="scene-body">${error}${body}</div></div>`;
}
function renderPlannerShell(){
 const recovered=plannerSession.originals.length?`<div class="banner warn">Original saves are preserved. ${plannerSession.originals.map((v,i)=>btn('Download '+esc(v.label),'planner-original','small',`data-index="${i}"`)).join('')}</div>`:'';
 $('#root').innerHTML=workspaceShell('planner-app',`<main class="workspace" data-render-key="workspace">${workspaceHeading()}${recovered}${plannerSession.ready?plannerController.render():'<p>Opening your locally saved plans…</p>'}</main>`);
 $('#root').inert=Boolean($('#modal').firstChild);
}
function renderJobsShell(){
 const recovered=jobsSession.originals.length?`<div class="banner warn">Original saves are preserved. ${jobsSession.originals.map((v,i)=>btn('Download '+esc(v.label),'jobs-original','small',`data-index="${i}"`)).join('')}</div>`:'';
 $('#root').innerHTML=workspaceShell('jobs-app',`<main class="workspace" data-render-key="workspace">${workspaceHeading()}${recovered}${jobsSession.ready?jobsController.render():'<p>Opening your locally saved jobs…</p>'}</main>`);
 $('#root').inert=Boolean($('#modal').firstChild);
}
function studioStatusLabel(){return studioSession.status==='opening'?'Opening Studio ideas…':studioSession.status==='error'?studioSession.error+' Download a Studio backup to keep this session.':studioSession.status==='pending'?'Saving your latest idea edits…':studioSession.status==='saving'?'Saving Studio ideas…':'Studio ideas saved in this browser · use Studio backup for a portable copy.';}
function studioSaveInfo(page){
 if(page==='studio')return {failed:studioSession.status==='error',message:studioStatusLabel()};
 if(page==='planner')return {failed:plannerSession.status==='error',message:plannerStatusLabel()};
 return {failed:jobsSession.status==='error',message:jobsStatusLabel()};
}
function updateStudioStatus(page){
 if(view!==page)return;
 const {failed,message}=studioSaveInfo(page),label=QQI18n.text(message);
 const error=document.querySelector('#'+page+'-save-error'),detail=document.querySelector('#'+page+'-save-status');
 if(error){error.hidden=!failed;error.textContent=failed?label:'';}
 if(detail)detail.textContent=label;
}
function renderStudioShell(){
 const data=studioSession.data;
 const recovered=studioSession.originals.length?`<div class="banner warn">Original saves are preserved. ${studioSession.originals.map((v,i)=>btn('Download '+esc(v.label),'studio-original','small',`data-index="${i}"`)).join('')}</div>`:'';
 $('#root').innerHTML=workspaceShell('studio-app',`<main class="workspace" data-render-key="workspace" aria-label="Studio workbench">${recovered}${studioSession.ready?QQStudioView.render(data,studioUI):'<p>Opening your locally saved ideas…</p>'}</main>`);
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
function studioNameDialog(idea){
 const label=idea?'Rename idea':'Name your idea';
 const value=idea?.name.trim()?QQI18n.text(QQStudioView.ideaTitle(idea)):'';
 modal(`<form id="studio-name-form" data-id="${idea?.id||''}"><h2 id="dialog-title">${label}</h2>
  <label class="input-field" for="studio-name-entry">Idea name<input type="text" id="studio-name-entry" maxlength="300" required value="${esc(value)}" placeholder="A working title" aria-describedby="modal-error"></label>
  <div class="actions">${btn('Cancel','close','','type="button"')}<button type="submit" class="primary">${idea?'Save name':'Create idea'}</button></div></form>`,'studio-name-entry');
 if(idea)document.querySelector('#studio-name-entry')?.select?.();
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='studio-name-form')return;
 e.preventDefault();
 const input=$('#studio-name-entry'),name=input.value.trim(),id=e.target.dataset.id;
 try{
  if(!name){input.focus();throw Error('Give this idea a working title.');}
  if(id){
   const idea=studioSession.data.offerings.find(v=>v.id===id);
   if(!idea)throw Error('Studio idea not found.');
   if(!idea.name.trim()||name!==QQI18n.text(QQStudioView.ideaTitle(idea))){
    QQStudio.update(studioSession.data,id,{name});studioSession.changed();
   }
  }else{
   const created=QQStudio.create(studioSession.data,{name});
   studioUI={...studioUI,query:'',selectedId:created.id,tab:'idea',section:'offer'};
   disclosureState.set('studio-details-'+created.id,true);
   studioSession.changed();
  }
  closeModal();render();
  if(id)(document.querySelector('#studio-rename-'+id)||document.querySelector('#studio-find'))?.focus();
  else document.querySelector('[data-studio-field="buyer"]')?.focus();
 }catch(err){showError(err.message);}
});
function handleStudioAction(a,el){
 if(!studioSession.ready)throw Error('Studio ideas are still opening. Wait for the saved ideas before downloading or editing.');
 if(a==='studio-backup'){download('MEIQQ-Studio-Ideas.json',QQStudio.serialize(studioSession.data));toast('Studio backup download requested. This contains ideas and research; simulator runs have their own backup.');return;}
 if(a==='studio-original'){const file=studioSession.originals[Number(el.dataset.index)];if(file)download('MEIQQ-Studio-Preserved-'+el.dataset.index+'.json',file.text);return;}
 let changed=false,focusAfter=null;const id=el.dataset.id||studioUI.selectedId,idea=studioSession.data.offerings.find(v=>v.id===id);
 const libraryChange=!studioUI.selectedId&&(a==='studio-confirm-delete'||a==='studio-undo-delete');
 if(a==='studio-job'){
  if(!idea)throw Error('Select an idea first.');
  const job=jobsController.startFromIdea(linkStudioIdea(idea));
  view='jobs';render();
  const client=$('#jobs-'+job.id+'-draft-client');client?.focus();return;
 }
 if(a==='studio-plan'){if(!idea)throw Error('Select an idea first.');plannerController.planIdea(idea);view='planner';render();plannerController.focusService('quantity');return;}
 if(a==='studio-select'){
  if(!idea)throw Error('Select an idea first.');
  view='studio';studioUI.selectedId=id;studioUI.tab='idea';studioUI.section='offer';
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
 else if(a==='studio-add'||a==='studio-rename'){
  if(a==='studio-rename'&&!idea)throw Error('Studio idea not found.');
  if(a==='studio-add'&&studioSession.data.offerings.length>=QQStudio.MAX_OFFERINGS)throw Error('Studio has reached its idea limit.');
  studioNameDialog(a==='studio-add'?null:idea);return;
 }else if(a==='studio-clear-search'){studioUI.query='';$('#studio-find').value='';focusAfter='#studio-find';}
 else if(a==='studio-example'||a==='studio-duplicate'){
  const created=a==='studio-duplicate'?QQStudio.duplicate(studioSession.data,id):QQStudio.create(studioSession.data,QQStudioSeeds.create(el.dataset.id));
  studioUI={...studioUI,selectedId:created.id,tab:'idea',section:'offer'};changed=true;
  focusAfter='#studio-heading';
 }else if(a==='studio-delete'){
  if(!idea)throw Error('Select an idea first.');
  modal(`<h2 id="dialog-title">Delete this idea?</h2><p><b>${esc(QQStudioView.ideaTitle(idea))}</b></p><p>This removes the idea and its research from this library. Existing plans, jobs and downloaded backups keep their copies.</p><div class="actions">${btn('Cancel','close')}${btn('Delete idea','studio-confirm-delete','primary',`data-id="${esc(id)}"`)}</div>`);return;
 }else if(a==='studio-confirm-delete'){
  if(!idea)throw Error('Studio idea not found.');
  studioUI.removal={idea,index:studioSession.data.offerings.indexOf(idea)};
  QQStudio.remove(studioSession.data,id);studioUI.selectedId=null;changed=true;closeModal();focusAfter='#studio-undo-delete';
 }else if(a==='studio-undo-delete'){
  const removal=studioUI.removal;
  if(!removal)return;
  const offerings=studioSession.data.offerings.slice();
  offerings.splice(removal.index,0,removal.idea);
  QQStudio.serialize({...studioSession.data,offerings});
  studioSession.data.offerings=offerings;studioUI.removal=null;changed=true;
  focusAfter='#studio-select-'+removal.idea.id;
 }
 else if(a==='studio-role-add'){if(!idea)throw Error('Select an idea first.');QQStudio.update(studioSession.data,id,{roles:[...idea.roles,{name:'',hours:'',setupHours:'',rate:''}]});changed=true;}
 else if(a==='studio-role-remove'){if(!idea)throw Error('Select an idea first.');QQStudio.update(studioSession.data,id,{roles:idea.roles.filter((v,i)=>i!==Number(el.dataset.index))});changed=true;}
 else if(a==='studio-import'){importStudioFile();return;}
 else if(a==='studio-confirm-import'){if(!pendingStudioImport)throw Error('Choose a Studio backup first.');const count=studioSession.merge(pendingStudioImport);pendingStudioImport=null;closeModal();toast(count+' saved ideas added as new copies.');}
 if(changed)studioSession.changed();
 if(libraryChange)renderListChange('.studio-ideas li');else render();
 if(focusAfter)(document.querySelector(focusAfter)||document.querySelector('#studio-find')||document.querySelector('#studio-heading'))?.focus();
}
function renderKey(node){
 if(node?.nodeType!==1)return null;
 if(node.id)return 'id:'+node.id;
 for(const name of ['data-render-key','data-input','data-disclosure','data-setup-page'])if(node.hasAttribute(name))return name+':'+node.getAttribute(name);
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
let lastPresentationKey='',preferencesRoute=null;
const openWorkspaceMenus='#root details[data-workspace-menu][open]';
function presentationKey(){
 if(view==='sky')return skyLandingRoute;
 if(view==='studio')return [view,studioSession.ready,studioUI.tab,studioUI.selectedId,studioUI.section].join('/');
 if(view==='jobs'||view==='planner'){
   const ui=view==='jobs'?jobsController.ui:plannerController.ui;
   return [view,ui.tab,ui.selectedId,ui.editingService?.serviceId].join('/');
 }
 if(setupNeedsChoice())return 'setup/entry';
 return view==='setup'?[view,stepIndex].join('/'):view;
}
// Take layout measurements only for a deliberate list change, never while typing.
function renderListChange(selector){
 if(document.documentElement.dataset.uiMotion!=='on'){render();return;}
 const tops=new Map([...document.querySelectorAll(selector)].map(el=>[el.dataset.renderKey,el.getBoundingClientRect().top+window.scrollY]));
 render();
 for(const el of document.querySelectorAll(selector)){
  if(!el.animate)continue;
  const before=tops.get(el.dataset.renderKey),dy=before-el.getBoundingClientRect().top-window.scrollY;
  if(before===undefined)el.animate([{opacity:.6},{opacity:1}],{id:'workspace-motion',duration:180});
  else if(Math.abs(dy)>1&&Math.abs(dy)<window.innerHeight)el.animate(
   [{transform:'translateY('+dy+'px)'},{transform:'translateY(0)'}],
   {id:'workspace-motion',duration:220,easing:'cubic-bezier(.22,.7,.2,1)'});
 }
}
// Step bodies are keyed so their fields stay live on edits and are replaced on navigation.
function setupStepTransition(outgoing,nextStep){
 const direction=Math.sign(nextStep-Number(outgoing.dataset.setupPage));
 const distance=Math.min(56,outgoing.clientWidth*.09)*direction;
 const style=getComputedStyle(outgoing);
 const startOpacity=Number(style.opacity),startTransform=style.transform;
 return panel=>{
   const incoming=panel.querySelector('[data-setup-page]');
   if(startOpacity>.02){
     // The departing fields are decorative while the new step receives focus.
     outgoing.inert=true;
     outgoing.setAttribute('aria-hidden','true');
     outgoing.removeAttribute('data-setup-page');
     outgoing.classList.add('departing');
     for(const el of outgoing.querySelectorAll('[id],details[data-disclosure],details[name]')){
       el.removeAttribute('id');el.removeAttribute('data-disclosure');el.removeAttribute('name');
     }
     incoming.parentElement.append(outgoing);
     const departure=outgoing.animate([{opacity:startOpacity,transform:startTransform},
       {opacity:0,transform:`translateX(${-distance}px)`}],
       {id:'workspace-motion',duration:160,easing:'ease-in',fill:'forwards'});
     departure.finished.then(()=>outgoing.remove(),()=>outgoing.remove());
   }
   incoming.animate([{opacity:0,transform:`translateX(${distance}px)`},{opacity:1,transform:'none'}],
     {id:'workspace-motion',duration:340,delay:70,fill:'backwards',easing:'cubic-bezier(.2,.72,.22,1)'});
 };
}
// Measure the number before reconciliation so it can travel between layouts.
function estimateTextBounds(el){
 if(!el)return null;
 const range=document.createRange();range.selectNodeContents(el);
 const rect=range.getBoundingClientRect();
 const header=document.querySelector('.sky-header')?.getBoundingClientRect().bottom||0;
 return rect.height&&rect.top>=header-1&&rect.bottom<=window.innerHeight&&rect.left>=0&&rect.right<=window.innerWidth?rect:null;
}
let clearEstimateFlight=null;
function moveRunEstimate(from,box,to){
 const end=estimateTextBounds(to);
 if(!box||!end||from.textContent!==to.textContent)return;
 const copy=document.createElement('span'),style=getComputedStyle(to);
 copy.className='travelling-estimate';copy.textContent=to.textContent;copy.setAttribute('aria-hidden','true');
 Object.assign(copy.style,{left:end.left+'px',top:end.top+'px',fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:end.height+'px',letterSpacing:style.letterSpacing,color:style.color});
 document.body.append(copy);
 const x=box.left-end.left,y=box.top-end.top,scale=box.height/end.height;
 const frames=[{transform:`translate(${x}px,${y}px) scale(${scale})`},
  {transform:`translate(${x*.37}px,${y*.37-Math.min(16,Math.abs(y)*.05)}px) scale(${1+(scale-1)*.37})`,offset:.56},
  {transform:'none'}];
 from.style.visibility='hidden';
 const timing={duration:620,easing:'cubic-bezier(.36,0,.18,1)'};
 const reveal=to.animate([{opacity:0},{opacity:0,offset:.86},{opacity:1}],timing);
 const flight=copy.animate(frames,timing);
 const clear=()=>{copy.remove();reveal.cancel();flight.cancel();if(clearEstimateFlight===clear)clearEstimateFlight=null;};
 clearEstimateFlight=clear;flight.finished.then(clear,clear);
}
// Keep elements in place so typing, scrolling and autosaves do not replay entrances.
function workspaceTransition(root,nextContent){
 const key=presentationKey(), previous=lastPresentationKey;lastPresentationKey=key;
 if(previous!==key)clearEstimateFlight?.();
 if(window.StudioFlight?.active||document.documentElement.dataset.uiMotion!=='on'||!root.animate)return null;
 const animate=(node,frames,ms,delay=0)=>{
   if(!node)return;
   node.getAnimations().filter(a=>a.id==='workspace-motion').forEach(a=>a.cancel());
   node.animate(frames,{id:'workspace-motion',duration:ms,delay,fill:'backwards',easing:'cubic-bezier(.18,.74,.22,1)'});
 };
 if(previous===key){
   const editingAssumptions=view==='setup'&&!setupNeedsChoice()&&stepIndex>0;
   const selector=editingAssumptions?'.decision-readout dd,.summary-numbers strong':'.metric strong,.clockday b,.studio-total dd,.planner-lab-summary strong';
   const values=[...root.querySelectorAll(selector)].slice(0,editingAssumptions?24:10);
   const labels=values.map(el=>el.textContent);
   return ()=>values.forEach((el,i)=>{
     if(el.isConnected&&el.textContent!==labels[i]){
       const frames=editingAssumptions?[{color:'var(--accent)'},{}]:[{color:'var(--accent)',translate:'0 -2px'},{color:'var(--ink)',translate:'0 0'}];
       animate(el,frames,380);
     }
   });
 }
 const source=previous.split('/')[0],destination=key.split('/')[0];
 if(source&&source!==destination&&!(source==='sky'&&destination==='setup')&&!(source==='setup'&&destination==='sky')){
   const current=root.querySelector('main.workspace');
   if(current){
     // Only the page travels. The header, live renderer, and destination URL
     // stay independent of how long the departing page takes to leave.
     const pages=['sky','studio','planner','jobs','setup','map','finances','projects','scenarios','about'];
     const direction=pages.indexOf(destination)>=pages.indexOf(source)?1:-1;
     const bounds=current.getBoundingClientRect(),oldApp=root.firstElementChild;
     const launch=source==='setup'&&destination==='map'&&nextContent?.querySelector('.run-passage');
     const arrival=source==='map'&&destination==='finances'&&current.querySelector('.run-passage');
     const openingRevision=source==='finances'&&destination==='setup'&&nextContent?.querySelector('.rerun-editor');
     const openingKeptSetup=source==='finances'&&destination==='setup'&&current.querySelector('.variant-result')&&nextContent?.querySelector('.setup-comparison-link');
     const returningToResults=source==='setup'&&destination==='finances'&&current.querySelector('.rerun-editor');
     const runTransition=launch||arrival||openingRevision||openingKeptSetup||returningToResults;
     const number=(launch||arrival)&&current.querySelector('[data-run-estimate="profit"]');
     const origin=number?estimateTextBounds(number):null;
     const pinned=launch&&current.querySelector('.setup-summary');
     const pinBox=pinned&&getComputedStyle(pinned).position==='sticky'?pinned.getBoundingClientRect():null;
     const ghost=document.createElement('div');ghost.className='route-departure';ghost.inert=true;ghost.setAttribute('aria-hidden','true');
     Object.assign(ghost.style,{top:(runTransition?0:bounds.top)+'px',left:bounds.left+'px',width:bounds.width+'px'});
     const frame=oldApp.cloneNode(false);frame.append(current);ghost.append(frame);
     if(runTransition){
       // The button can be at the bottom of a long form. Preserve that slice
       // of the outgoing page when the new workspace returns to the top.
       ghost.classList.add('run-departure');frame.style.top=bounds.top+'px';
       if(pinBox){
         const slot=document.createElement('div');slot.className='setup-sheet';
         Object.assign(slot.style,{position:'absolute',top:(pinBox.top-bounds.top)+'px',left:(pinBox.left-bounds.left)+'px',width:pinBox.width+'px'});
         pinned.style.position='static';slot.append(pinned);frame.append(slot);
       }
     }
     for(const el of frame.querySelectorAll('[id],[data-disclosure],details[name]')){
       el.removeAttribute('id');el.removeAttribute('data-disclosure');if(el.localName==='details')el.removeAttribute('name');
     }
     document.querySelector('.route-departure')?.remove();root.after(ghost);
     const departure=runTransition?[{opacity:1,translate:'0 0'},{opacity:.82,offset:.35},{opacity:0,translate:'0 -22px'}]:
       [{opacity:1,translate:'0 0'},{opacity:0,translate:`${-32*direction}px -5px`}];
     const leave=ghost.animate(departure,{id:'workspace-motion',duration:runTransition?305:185,easing:'ease-in',fill:'forwards'});
     leave.finished.then(()=>ghost.remove(),()=>ghost.remove());
     if(runTransition)return ()=>{
       const main=root.querySelector('main.workspace');
       if(!openingRevision)window.scrollTo({top:0,behavior:'instant'});
       if(number)moveRunEstimate(number,origin,main.querySelector('[data-run-estimate="profit"]'));
       animate(main,[{opacity:0,translate:openingRevision||openingKeptSetup?'0 -14px':'0 18px'},{opacity:1,translate:'0 0'}],launch?560:490,135);
     };
     if(Object.hasOwn(workspaceHomes,key))return null;
     return ()=>animate(root.querySelector('main.workspace'),[{opacity:0,translate:`${40*direction}px 9px`},{opacity:1,translate:'0 0'}],470,95);
   }
 }
 if(view==='setup'&&!setupNeedsChoice()){
   const outgoing=root.querySelector('#setup-panel [data-setup-page]');
   if(outgoing&&Number(outgoing.dataset.setupPage)!==stepIndex){
     const enter=setupStepTransition(outgoing,stepIndex);
     return ()=>enter(root.querySelector('#setup-panel'));
   }
 }
 const oldStory=root.querySelector('.setup-story:not(.departing)');
 const outgoing=oldStory||root.querySelector('.setup-sheet:not(.departing)');
 const bounds=outgoing?.getBoundingClientRect();
 const outgoingOpacity=outgoing?getComputedStyle(outgoing).opacity:1;
 return ()=>{
   const workspace=root.querySelector('.workspace');
   if(!workspace)return;
   const story=workspace.querySelector('.setup-story:not(.departing)');
   const sheet=workspace.querySelector('.setup-sheet');
   const next=story||sheet;
   const chapter=el=>el?.classList.contains('setup-sheet')?2:el?.dataset.renderKey==='sky-home'?0:1;
   const direction=outgoing&&next&&chapter(next)<chapter(outgoing)?-1:1;
   if(outgoing&&next&&outgoing!==next){
     // Let the sky travel behind the outgoing chapter, including on browser Back.
     // Its live inputs and disclosure names must retire before the next chapter takes focus.
     outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');outgoing.removeAttribute('data-render-key');
     for(const el of outgoing.querySelectorAll('[id],[data-disclosure],details[name]')){
       el.removeAttribute('id');el.removeAttribute('data-disclosure');if(el.localName==='details')el.removeAttribute('name');
     }
     outgoing.classList.add('departing');
     Object.assign(outgoing.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px'});
     workspace.append(outgoing);
     const departure=outgoing.animate([{opacity:outgoingOpacity,translate:'0 0'},{opacity:0,translate:`0 ${-14*direction}px`}],
       {id:'workspace-motion',duration:220,fill:'forwards',easing:'ease-in'});
     departure.finished.then(()=>outgoing.remove(),()=>outgoing.remove());
   }
   if(story){
     if(!Object.hasOwn(workspaceHomes,key))animate(story,[{opacity:0,translate:`${-14*direction}px ${26*direction}px`},{opacity:1,translate:'0 0'}],outgoing?570:320,outgoing?190:0);
     return;
   }
   if(oldStory&&sheet){
     animate(sheet.querySelector('.sheet-heading'),[{opacity:0,translate:'0 24px'},{opacity:1,translate:'0 0'}],460,140);
     animate(sheet.querySelector('.setup-workspace'),[{opacity:0,translate:'0 min(12vh,84px)'},{opacity:1,translate:'0 0'}],630,190);
     return;
   }
   const title=workspace.querySelector('h1');
   const detail=workspace.querySelector('#setup-panel,#planner-editor-content,#jobs-editor-content,#studio-editor-content');
   const within=previous.split('/')[0]===view;
   const rows=workspace.querySelector('.studio-ideas');
   const panels=within&&detail?[detail]:rows?[...rows.children].slice(0,5):[...workspace.querySelectorAll(':scope > :not(.workspace-heading)')].slice(0,4);
   if(!within||!detail)animate(title,[{opacity:.76,translate:'0 7px'},{opacity:1,translate:'0 0'}],290);
   panels.forEach((el,i)=>{if(!el.contains(title))animate(el,[{opacity:.78,translate:'0 8px'},{opacity:1,translate:'0 0'}],300,i*22);});

 };
}
function patchableRoot(root){
 if(!root?.nodeType||typeof Proxy==='undefined')return root;
 return new Proxy(root,{get:(target,property)=>Reflect.get(target,property,target),set(target,property,value){
  if(property==='innerHTML'){
   const template=document.createElement('template');template.innerHTML=value;
   QQI18n.localize(template.content);
   const present=workspaceTransition(target,template.content);
   patchRenderChildren(target,template.content);present?.();return true;
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
 const closedMenu=el?.closest?.('details[data-workspace-menu]:not([open])');
 (closedMenu?.querySelector('summary')||el)?.focus({preventScroll:!scroll});
 return Boolean(el);
}
function render(){
  if(keptSetupRun&&keptSetupRun!==state){keptSetupRun=null;keptComparisonId=null;}
  if(editingRerun&&(view!=='setup'||setupNeedsChoice()))parkRerunEditor();
  const focus=focusKey(document.activeElement);
  if(runPassage&&(view!=='map'||runPassage.run!==state||selection))runPassage=null;
  const previousRoute=lastRoute;
  syncWorkspaceRoute();
  const revealBreadcrumb=()=>{
    const path=previousRoute!==lastRoute&&document.querySelector('.workspace-breadcrumb');
    if(path)path.scrollLeft=path.scrollWidth;
  };
  if(routeReady&&view==='map')rememberRunPassage();
  const route=workspaceRoute();
  if(preferencesRoute!==route){
    for(const menu of document.querySelectorAll(openWorkspaceMenus))menu.open=false;
    disclosureState.delete('app-preferences');disclosureState.delete('offer-setup-options');preferencesRoute=route;
  }
  const entrance=setupNeedsChoice(),skyOnly=view==='sky/view';
  if(firstStepEstimate&&(view!=='setup'||entrance||firstStepEstimate.step!==stepIndex||firstStepEstimate.draft!==draft))firstStepEstimate=null;
  if(!skyOnly&&skyPlayback){skyPlayback=null;applyShardMotion();}
  const scene=view==='sky'?skyLandingRoute:view;
  const skyStage=view==='setup'?(entrance?'night':editorSteps[stepIndex]):scene==='sky/simulator'?'surface':atWaterfront()||view==='sky'||skyOnly?'home':view;
  if(routeReady)window.StudioFlight?.route(scene,skyStage);
  if(atWaterfront()){
    if(shardBackground?.getAttribute?.('waterfront')!==scene)shardBackground?.setAttribute?.('waterfront',scene);
  }else{
    if(waterfrontView?.open)waterfrontView.close();
    shardBackground?.removeAttribute?.('waterfront');
  }
  if((routeReady||!window.location)&&shardBackground?.getAttribute?.('sky-stage')!==skyStage)shardBackground?.setAttribute?.('sky-stage',skyStage);
  for(const el of document.querySelectorAll('#root details[data-disclosure]'))if(!setupModeChanging)disclosureState.set(el.dataset.disclosure,el.open);
  if(inStudio()){if(view==='planner')renderPlannerShell();else if(view==='jobs')renderJobsShell();else renderStudioShell();for(const el of document.querySelectorAll('#root details[data-disclosure]'))if(disclosureState.has(el.dataset.disclosure))el.open=disclosureState.get(el.dataset.disclosure);if(!$('#root').inert)restoreFocus(focus);revealBreadcrumb();return;}
  const status=`<div id="save-status" class="save-status ${storeError?'negative':''}" role="status" aria-live="polite" ${showSaveStatus()?'':'hidden'}>${esc(saveLabel())}</div>`;
  const notices=`${recoveryRaw!==null?`<div class="banner danger"><b>Saved workspace needs recovery.</b> ${esc(recoveryReason||'The file could not be validated.')} The original is intact; changes here will not save. ${btn('Download original save','recover','small')} ${btn('Open another backup','import','small')}</div>`:''}${fallbackPreserved?`<div class="banner warn">A different browser-local save has been preserved under Runs & backups. Compare it with this run before continuing. ${btn('View preserved workspaces','view','small','data-view="scenarios"')}</div>`:''}${state.blocked&&view!=='map'?`<div class="banner warn"><b>Cash shortfall paused the run.</b> ${esc(state.blocked.note)} · ${offerAmount(state.blocked.gap)} needed. ${btn('Resolve shortfall','cash','small')}</div>`:''}`;
  if(skyOnly){
    const playing=skyPlayback?skyPlayback==='animate':document.documentElement.dataset.uiMotion==='on';
    $('#root').innerHTML=workspaceShell('sky-only',`<main class="workspace"><h1 id="sim-heading" tabindex="-1" class="sr-only">Sky view</h1><nav aria-label="Sky view">${btn(playing?'Pause sky':'Resume sky','sky-play')}<button type="button" data-edit-sky>Edit sky</button>${routeLink('sky','Home')}</nav></main>`);
  }else if(view==='setup'||view==='sky'){
    const editor=view==='setup'&&!entrance;
    setupCache=editor?{}:null;
    const content=editor?setupEditorScene(notices):view==='sky'?skyHome():setupEntrance();
    $('#root').innerHTML=workspaceShell('simulator-app setup-entrance',`${status}<main class="workspace ${editor?'setup-editing':'setup-landing'}" data-render-key="workspace">${content}</main>`);
  }else{
    const m=QQ.metrics(state);
    const content=runPassage?runPassageView(m):workspaceHeading(true)+notices+(view==='map'?mapView(m):view==='projects'?projectsView():view==='finances'?financeView(m):view==='scenarios'?scenariosView():aboutView());
    $('#root').innerHTML=workspaceShell('simulator-app'+(running?' running':''),`${status}<main class="workspace simulator-workspace" data-render-key="workspace">${runPassage?notices:''}${content}</main>${view==='map'&&!runPassage?clock():''}`);
  }
  for(const el of document.querySelectorAll('#root details[data-disclosure]'))if(setupMode==='analyst'&&el.dataset.disclosure.startsWith('setup-advanced-'))el.open=true;else if(disclosureState.has(el.dataset.disclosure))el.open=disclosureState.get(el.dataset.disclosure);
  $('#root').inert=Boolean($('#modal').firstChild);
  if(!$('#root').inert)restoreFocus(focus);
  revealBreadcrumb();
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
 const customInput=path.startsWith('services.')&&draft.services[Number(path.split('.')[1])]?.customOffer;
 const awaitingEntry=(setupMode==='guided'||customInput)&&path.startsWith('services.')&&(value==null||value===''||value==='choose')&&setupRepairPath!==path;
 const issue=awaitingEntry?null:draftValidationIssues().find(v=>v.path===path||path.startsWith('customerMix.')&&v.path==='customerMix');
 const help=options.help||(key==='recurring'?'New repeat campaigns are quoted and paid separately.':'');
 const origin=rerunFieldOrigin(path);
 const descriptions=[origin?'origin-'+id:'',help?'help-'+id:'',issue?'error-'+id:''].filter(Boolean).join(' ');
 const attrs=`data-input="${esc(path)}"${QQI18n.moneyField(suffix)} ${options.percent?'data-percent="true"':''} ${issue?'aria-invalid="true"':''} ${descriptions?'aria-describedby="'+descriptions+'"':''} id="${id}"`;
 const placeholder=options.placeholder?`placeholder="${esc(options.placeholder)}"`:'';
 let control;
 if(options.options){
  const items=options.options.map(([v,n])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${n==='Monthly subscription'?'Paid-cycle subscription':n}</option>`).join('');
  control=`<select ${attrs}>${items}</select>`;
 }else if(options.multiline){
  control=`<textarea ${attrs} rows="2" maxlength="${options.maxlength}" ${placeholder}>${esc(value??'')}</textarea>`;
 }else{
  const limits=options.text?`maxlength="${options.maxlength||100}" ${placeholder}`:`min="${options.min??0}" max="${options.max??1000000}" step="${options.step??1}"`;
  const display=value==null?'':options.percent?QQ.round(value*100):value;
  control=`<div class="input-wrap"><input ${attrs} type="${options.text?'text':'number'}" value="${esc(display)}" ${limits} ${options.disabled?'disabled':''}>${suffix?`<span>${suffix}</span>`:''}</div>`;
 }
 return `<div class="input-field${origin?' rerun-field':''}"><label for="${id}">${label}</label>${control}${origin?`<small class="rerun-origin" id="origin-${id}"><span>Original value</span> <b>${esc(origin)}</b></small>`:''}${help?`<small id="help-${id}">${help}</small>`:''}<span class="field-error" id="error-${id}" aria-live="polite">${issue?esc(issueText(issue)):''}</span></div>`;
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
function setupNeedsChoice(){return view==='setup'&&(setupEntryPath!==null||setupReturnView!==null||(!stepIndex&&firstExamplePending()));}
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
 return Object.entries(fields).map(([key,label])=>{
  const profile=key==='clientDemand.share'&&demandProfile(draft.clientDemand?.profileId);
  return {path:prefix+key,label:profile?QQI18n.text(profile.name)+' · '+QQI18n.text(label):label};
 }).filter(({path})=>Number.isFinite(QQ.assumptionRecordValue(draft,path)));
}
function serviceInputBasis(service,key){
 const original=originalOfferPackage(service);
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
 if(path==='clientDemand.share')return amount(value)+'%';
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
  if(path==='clientDemand.share')records[path].profileId=draft.clientDemand.profileId;
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
function openSetupEditor(mode){
 if(!setupNeedsChoice()||!['guided','analyst'].includes(mode))return;
 if(!setupEntryPath)setupEntryPath='business';
 if(editingCurrentSetup()){
  if(setupEntryPath!=='style'&&!setupOrigin){setupOrigin=setupEntryPath;save();}
  setupEntryPath=null;setupReturnView=null;newScenarioRequested=false;stepIndex=lastEditorStep;
  setSetupMode(mode);render();focusViewHeading();return;
 }
 const chosenPath=setupEntryPath,ownBusiness=chosenPath==='business';
 if(setupReturnView){
  if(loading||storeError||recoveryRaw!==null||primaryReadFailed)throw Error('Resolve the current simulator save before starting another scenario.');
  const prior=QQ.clone(archives),nextState=QQ.fresh(restaurantConfig());
  MEIQQWorkspace.archive(prior,currentWorkspace(),state.config.name+' · prior scenario · day '+state.day);
  const next={state:nextState,draft:QQ.clone(nextState.config),saved:[],checkpointInfo:[],recoveryFiles:[]};
  MEIQQWorkspace.serialize(next,prior);
  stop();installWorkspace({...next,archives:prior});stepIndex=0;selection=null;expandedService=-1;disclosureState.clear();setupModeChanging=true;
 }
 setupEntryPath=null;setupReturnView=null;newScenarioRequested=false;setupOrigin=chosenPath;
 rememberSetupChoice();
 if(ownBusiness){
  draft=QQPresets.compose({}, {...QQ.clone(state.config),name:'My business',services:[],fixedInquiriesEntered:false});
  appendCatalogService(null);
 }else expandedService=0;
 // Back from a committed draft changes its style without creating another scenario.
 if(routeReady)replaceWorkspaceStop('setup/style');
 stepIndex=0;lastEditorStep=0;setSetupMode(mode);
 save();render();
 focusViewHeading();
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
function workspaceRoute(){
 if(view==='sky')return skyLandingRoute;
 if(view!=='setup')return view;
 if(editingRerun)return 'setup/rerun/'+editorSteps[stepIndex];
 if(setupNeedsChoice()){
  const start=newScenarioRequested?'setup/new':'setup';
  return setupEntryPath?start+'/'+setupEntryPath:start;
 }
 return 'setup/edit/'+editorSteps[stepIndex];
}
function workspacePathTo(trail,route){
 if(typeof route!=='string'||!route)return trail;
 if(!trail.length)trail=['sky'];
 if(trail.at(-1)===route)return trail;
 const earlier=trail.indexOf(route);
 return earlier<0?[...trail,route]:trail.slice(0,earlier+1);
}
function replaceWorkspaceStop(route){
 workspaceTrail=workspacePathTo(workspaceTrail.slice(0,-1),route);
 window.history.replaceState({workspaceTrail},'','#'+route);
}
function syncWorkspaceRoute(){
 if(!routeReady)return;
 const route=workspaceRoute();
 if(route===lastRoute)return;
 lastRoute=route;
 const hash=savedComparisonReader?.id&&savedComparisonReader.route===route?'#'+route+'?comparison='+savedComparisonReader.id:'#'+route;
 workspaceTrail=workspacePathTo(workspaceTrail,route);
 if(window.location.hash!==hash)window.history.pushState({workspaceTrail},'',hash);
 else window.history.replaceState({...window.history.state,workspaceTrail},'',hash);
 if(route==='sky'||route.startsWith('sky/'))return;
 resumeRoute=route;
 if(view==='setup'&&!setupNeedsChoice())lastEditorStep=stepIndex;
 try{
  window.sessionStorage.setItem('meiqq-last-page',route);
  if(view==='setup'&&!setupNeedsChoice()){
   window.sessionStorage.setItem('meiqq-setup-step',String(stepIndex));
  }
 }catch{/* Links and the in-memory return destination remain available. */}
}
function readWorkspaceRoute(){
 if(!routeReady||savingKeptSetup||resettingApp)return;
 const leavingRevision=editingRerun;
 const previousStep=view==='setup'&&!setupNeedsChoice()?stepIndex:null;
 const [route,comparisonId]=(window.location.hash.slice(1)||'sky').split('?comparison=');
 const storedTrail=window.history.state?.workspaceTrail;
 // Old history entries can contain several round trips through Home.
 const priorStops=Array.isArray(storedTrail)&&storedTrail.at(-1)===route
  ?storedTrail.slice(0,-1).reduce(workspacePathTo,['sky']):workspaceTrail;
 workspaceTrail=workspacePathTo(priorStops,route);
 if(!comparisonId&&savedComparisonReader&&route===workspaceRoute()){
  closeModal(false);render();return;
 }
 const archive=savedComparisonArchive(comparisonId);
 const pair=archive&&archivedVariantPair(archive.workspace);
 const marker=window.history.state?.savedComparison;
 const entry=pair&&marker?.id===comparisonId&&marker.route===route?marker:null;
 if($('#modal').firstChild)closeModal(false);
 if(pair&&entry&&route===workspaceRoute()&&lastRoute===route){
  if(view==='finances')analyticsTab=entry.tab||'compare';
  presentSavedComparison(pair,entry);return;
 }
 if(navigatorDialog.open)navigatorDialog.close();
 if(waterfrontView?.open)waterfrontView.close();
 const skyEditor=document.querySelector('#sky-editor');
 if(skyEditor?.open)skyEditor.close('cancel');
 stop();
 const rerunStep=route.startsWith('setup/rerun/')?editorSteps.indexOf(route.slice('setup/rerun/'.length)):-1;
 const reopenRerun=rerunStep>=0&&rerunDraft?.run===state&&state.day===state.config.months*30&&recoveryRaw===null&&!primaryReadFailed;
 if(!reopenRerun)parkRerunEditor();
 setupEntryPath=null;setupReturnView=null;newScenarioRequested=false;
 if(route==='setup'||route.startsWith('setup/')){
  view='setup';
  const step=editorSteps.indexOf(route.slice('setup/edit/'.length));
  if(reopenRerun){
   activateRerunEditor(rerunStep);
  }
  else if(rerunStep>=0&&(rerunLink?.run===state||state.day)){
   // The history entry can outlive its draft after a different run opens.
   view=state.day===state.config.months*30?'finances':'map';
   if(view==='finances'){analyticsTab='overview';selectResultsMonth(null);}
  }
  else if(recoveryRaw!==null||primaryReadFailed){stepIndex=0;}
  else if(route==='setup'&&!firstExamplePending()){stepIndex=lastEditorStep;}
  else if(route.startsWith('setup/edit/')&&step>=0&&!firstExamplePending()){stepIndex=step;}
  else{
   if(firstExamplePending())stepIndex=0;
   else setupReturnView='setup';
   newScenarioRequested=route==='setup/new'||route.startsWith('setup/new/');
   const path=route.slice(newScenarioRequested?'setup/new/'.length:'setup/'.length);
   if(['business','restaurant'].includes(path))setupEntryPath=path;
   if(route==='setup/style'&&!firstExamplePending())setupEntryPath='style';
  }
 }else{
  view=route==='sky/view'||Object.hasOwn(destinations,route)?route:'sky';
  if(view==='sky')skyLandingRoute=Object.hasOwn(workspaceHomes,route)?route:'sky';
 }
 if(leavingRevision&&view==='finances'){
  analyticsTab=rerunDraft?.returnTab||'overview';
  selectResultsMonth(rerunDraft?.resultsMonth||null);
 }
 // The live passage and manual inspector share #map. Only the particular
 // history entry that launched a run should reopen its paused presentation.
 if(view==='map'&&window.history.state?.runPassage&&state.day<state.config.months*30&&recoveryRaw===null&&!primaryReadFailed){
  selection=null;inspectorTrail=[];runPassage={run:state,estimate:QQ.runLaunchEstimate(state)};
 }else runPassage=null;
 const resolved=workspaceRoute();
 if(resolved!==route)workspaceTrail=workspacePathTo(priorStops,resolved);
 let reader;
 if(pair){
  reader=entry||{id:comparisonId,route:resolved,tab:'compare'};
  if(view==='finances')analyticsTab=reader.tab||'compare';
  if(!entry||resolved!==route){
   // A pasted link or a recovered route has no in-app return entry yet.
   reader={...reader,route:resolved};
   window.history.replaceState({workspaceTrail},'','#'+resolved);
   window.history.pushState({workspaceTrail,savedComparison:reader},'','#'+resolved+'?comparison='+comparisonId);
  }
  savedComparisonReader=reader;
 }else if(window.location.hash!=='#'+resolved)window.history.replaceState(null,'','#'+resolved);
 lastRoute=null;render();
 if(pair){presentSavedComparison(pair,reader);return;}
 if(comparisonId)toast('This saved comparison is unavailable.');
 if(reopenRerun&&focusRevisedAssumption())return;
 if(leavingRevision&&view==='finances'&&focusResultAssumption())return;
 if(previousStep!==null&&view==='setup'&&!setupNeedsChoice()&&previousStep!==stepIndex)focusSetupStep();
 else focusViewHeading();
}
function rememberRunPassage(){
 const previous=window.history.state;
 if(Boolean(previous?.runPassage)===Boolean(runPassage))return;
 const next={...previous};
 if(runPassage)next.runPassage=true;else delete next.runPassage;
 try{window.history.replaceState(Object.keys(next).length?next:null,'');}catch{/* Reload can still open the normal run controls. */}
}
function beginSetupEntrance(newScenario=false){
 const returnDestination=editingRerun?workspaceRoute():view;
 parkRerunEditor();
 if(recoveryRaw!==null||primaryReadFailed){view='setup';render();focusViewHeading();return;}
 stop();
 setupReturnView=newScenario&&!firstExamplePending()?returnDestination:null;
 setupEntryPath=null;newScenarioRequested=newScenario;view='setup';
 stepIndex=firstExamplePending()?0:lastEditorStep;
 render();focusViewHeading();
}
function workspaceStopLabel(route){
 if(route==='sky')return 'Home';
 if(route==='sky/view')return 'Sky view';
 if(Object.hasOwn(workspaceHomes,route))return workspaceHomes[route].name;
 if(Object.hasOwn(destinations,route))return destinations[route];
 const [,section,step]=route.split('/');
 if(section==='edit'||section==='rerun')return steps[editorSteps.indexOf(step)]||'Business setup';
 if(section==='new')return 'New scenario';
 if(section==='style')return 'Choose your setup style';
 return 'Business setup';
}
function workspaceHomeFor(route){
 if(Object.hasOwn(workspaceHomes,route))return route;
 if(route==='sky'||route==='sky/view')return '';
 return inStudio(route)?'sky/studio':'sky/simulator';
}
function workspaceBreadcrumb(){
 const trail=workspaceTrail.length?workspaceTrail:workspacePathTo([],workspaceRoute());
 const separator='<span class="breadcrumb-separator" aria-hidden="true">/</span>';
 const parts=[];
 let previousWorkspace='';
 for(const [index,route] of trail.entries()){
  const workspace=workspaceHomeFor(route);
  const stopAttrs=`data-action="breadcrumb-stop" data-index="${index}"`;
  if(workspace&&workspace!==previousWorkspace&&workspace!==route){
   parts.push(routeLink(workspace,workspaceHomes[workspace].name,'breadcrumb-workspace',stopAttrs));
  }
  previousWorkspace=workspace;
  const label=workspaceStopLabel(route);
  parts.push(index===trail.length-1?`<span class="breadcrumb-current" data-render-key="crumb-${esc(route)}" aria-current="page">${label}</span>`:
   routeLink(route,label,'',stopAttrs));
 }
 return `<nav class="workspace-breadcrumb" aria-label="Breadcrumb">${separator}${parts.join(separator)}</nav>`;
}
function skyHeader(info){
 const sky=view==='sky'||view==='sky/view';
 const home=routeLink('sky','美QQ','sky-wordmark','aria-label="Home"');
 const branch=!sky&&!inStudio()&&view!=='setup'?btn(icon('branch')+'Branch scenario','branch','small'):'';
 const status=info?`<small id="${view}-save-status" role="status">${esc(info.message)}</small>`:'';
 return `<header class="sky-header"><div class="sky-identity">${home}${workspaceBreadcrumb()}
 ${btn(icon('grid')+'<span>Navigate</span>','show-navigator','navigator-trigger','id="navigator-trigger" aria-haspopup="dialog" aria-controls="workspace-navigator"')}</div><div class="sky-tools">
 <details class="sky-preferences workspace-options" data-workspace-menu data-disclosure="app-preferences"><summary>${icon('settings')}<span>Workspace options</span></summary><div>${sceneOptions()}${languagePicker()}${atWaterfront()||view==='sky/view'?'':routeLink('sky/view','View sky')}${branch}${status}${btn('Reset app','reset-app','small')}</div></details></div></header>`;
}
async function resetApp(){
 resettingApp=true;
 const confirmButton=$('#confirm-app-reset');
 confirmButton.disabled=true;
 const removed=[];
 const workspaceKeys=[KEY,QQStudio.STORAGE_KEY,QQJobs.STORAGE_KEY,QQPlanner.STORAGE_KEY];
 try{
  await Promise.all([appReady,studioReady,jobsReady,plannerReady]);
  await Promise.all([saveWriter?.flush(),studioSession.flush(),jobsSession.flush(),plannerSession.flush()]);
  const localKeys=[...workspaceKeys,THEME_KEY,MOTION_KEY,SETUP_MODE_KEY,PRESET_KEY,ENTRY_KEY,
   'qq-studio-language','qq-studio-sunset-v1','meiqq-jobs-view-v1','meiqq-planner-view-v1'];
  for(const [store,keys] of [[localStorage,localKeys],[window.sessionStorage,['meiqq-last-page','meiqq-setup-step']]]){
   for(const key of keys){
    const value=store.getItem(key);
    if(value===null)continue;
    store.removeItem(key);
    removed.push([store,key,value]);
   }
  }
  if(typeof indexedDB!=='undefined')await MEIQQStorage.reset(indexedDB,workspaceKeys);
 }catch{
  for(const [store,key,value] of removed){
   try{if(store.getItem(key)===null)store.setItem(key,value);}catch{/* Storage may have become unavailable. */}
  }
  resettingApp=false;
  confirmButton.disabled=false;
  showError('The app could not be reset. Close other 美QQ tabs and try again.');
  return;
 }
 window.history.replaceState(null,'','#sky');
 window.location.reload();
}
function resumeDestination(){
 if(Object.hasOwn(destinations,resumeRoute))return [resumeRoute,destinations[resumeRoute]];
 if(rerunDraft?.run===state&&resumeRoute.startsWith('setup/rerun/')){
  const step=editorSteps.indexOf(resumeRoute.slice('setup/rerun/'.length));
  if(step>=0)return [resumeRoute,steps[step]];
 }
 if(resumeRoute==='setup')return ['setup','Business setup'];
 if(['setup/new','setup/new/business','setup/new/restaurant','setup/business','setup/restaurant','setup/style'].includes(resumeRoute))return [resumeRoute,'Setup style'];
 if(!firstExamplePending()){
  if(state.day&&!dirty()&&!resumeRoute.startsWith('setup/edit/'))return ['map','Run scenario'];
  return ['setup/edit/'+editorSteps[lastEditorStep],steps[lastEditorStep]];
 }
 return null;
}
function skyHome(){
 const home=workspaceHomes[skyLandingRoute];
 if(home){
  const links=home.pages.map(([id],index)=>routeLink(id,workspaceStopLabel(id),'scene-action',`style="--arrival-order:${index}"`)).join('');
  return `<section class="setup-story workspace-landing" data-render-key="${skyLandingRoute}" aria-labelledby="sim-heading">
   <div class="workspace-heading"><h1 id="sim-heading" tabindex="-1">${home.name}</h1></div>
   <nav class="studio-destinations" aria-label="${home.name}">${links}</nav></section>`;
 }
 const resume=resumeDestination();
 return `<section class="setup-story" data-render-key="sky-home" aria-labelledby="sim-heading">
 <div class="workspace-heading"><h1 id="sim-heading" tabindex="-1">Studio &amp; Simulator</h1></div>
 <div class="setup-start"><div><h2>Studio</h2><p>Develop service ideas, plan your capacity and track client jobs.</p><nav class="studio-destinations" aria-label="Studio">${['studio','planner','jobs'].map(id=>routeLink(id,destinations[id],'scene-action')).join('')}</nav></div>
 <div><h2>Simulator</h2><p>Follow a service business from its first inquiry to its final payment.</p>${routeLink('setup','Enter simulator','scene-action primary')}</div></div>
 ${resume?`<div class="sky-resume"><span>Pick up where you left off</span>${routeLink(resume[0],esc(resume[1])+' <i aria-hidden="true">→</i>')}</div>`:''}</section>`;
}
function editingCurrentSetup(){
 if(setupEntryPath==='style')return true;
 if(!setupEntryPath||newScenarioRequested||firstExamplePending())return false;
 if(setupOrigin)return setupEntryPath===setupOrigin;
 // Older saves didn't record the chosen path. Recognize their original starter names.
 return setupEntryPath==='business'?draft.name==='My business':draft.name===RESTAURANT_EXAMPLE&&draft.recipe?.profile==='new-workspace';
}
function setupEntrance(){
 const current=editingCurrentSetup(),savedStyle=setupEntryPath==='style',restaurant=setupEntryPath==='restaurant';
 const back=newScenarioRequested&&setupReturnView?btn('Keep editing','cancel-new-setup','setup-back'):routeLink('sky','← Home','setup-back');
 const source=(id,label,selected)=>btn(label,'start-'+id,'source-choice',`aria-pressed="${selected}"`);
 const mix=setupReturnView?QQPresets.MIXES.find(row=>row.id==='restaurant').mix:state.config.customerMix;
 const restaurantIntro='This studio sells menu updates, table tents and monthly promotions.'+(mix?` It assumes ${mix.food}% of inquiries come from food businesses, ${mix.retail}% from retailers and ${mix.services}% from local services. You can change the mix in Demand.`:'');
 const origin=savedStyle?`<p class="setup-preservation">${scenarioName(draft.name||state.config.name)}</p>`:
   `<div class="entry-source"><span id="source-label">Start with</span><div role="group" aria-labelledby="source-label">${source('business','My own services',!restaurant)}${source('restaurant','Restaurant example',restaurant)}</div>
    <p>${current?'Continue with your saved offers and assumptions.':restaurant?restaurantIntro:'Enter the service you sell, its price and the time it takes.'}</p></div>`;
 const note=!firstExamplePending()&&!current?'<p class="setup-preservation">Starting this scenario keeps your current work in Runs &amp; backups.</p>':'';
 return `<section class="setup-story setup-entry" data-render-key="setup-entry" aria-labelledby="sim-heading">${back}
  <div class="workspace-heading"><h1 id="sim-heading" tabindex="-1">Choose your setup style</h1></div>
  ${origin}${note}<div class="entry-modes">
  <button type="button" data-action="enter-setup" data-mode="guided"><span><strong>Guided</strong><small>Work through the essentials one step at a time.</small></span>${icon('arrow')}</button>
  <button type="button" data-action="enter-setup" data-mode="analyst"><span><strong>All assumptions</strong><small>Open the detailed inputs and estimates for each step.</small></span>${icon('arrow')}</button>
  </div></section>`;
}
function setSetupMode(mode){
 setupMode=mode;setupModeChanging=true;
 const advanced=['customers','team','cash','mix',...editorSteps.map((_,i)=>'estimate-'+i),...draft.services.flatMap(s=>['service-'+s.id,'delivery-'+s.id])];
 for(const id of advanced)disclosureState.set('setup-advanced-'+id,mode==='analyst');
 try{localStorage.setItem(SETUP_MODE_KEY,mode);}catch(err){toast('Setup view applied for this session. Browser storage is unavailable.');}
}
const navigatorDialog=document.querySelector('#workspace-navigator');
function workspaceNavigator(){
 const currentPage=id=>{
  if(id==='sky'&&(view==='sky/view'||view==='sky'&&skyLandingRoute!=='sky'))return 'aria-current="location"';
  if(view!==id)return '';
  return id==='setup'&&workspaceRoute()!=='setup'?'aria-current="location"':'aria-current="page"';
 };
 const link=(id,symbol,label)=>routeLink(id,icon(symbol)+`<span>${label}</span>`,'navigator-link',currentPage(id));
 const group=({name,pages})=>`<section class="navigator-group"><h3>${name}</h3>${pages.map(([id,symbol])=>
  link(id,symbol,workspaceStopLabel(id))).join('')}</section>`;
 const backupActions={
  studio:['Studio backup','studio-backup','Import ideas','studio-import'],
  planner:['Planner backup','planner-backup','Import plans','planner-import'],
  jobs:['Jobs backup','jobs-backup','Import jobs','jobs-import'],
 };
 const backupView=view==='sky'&&skyLandingRoute==='sky/studio'?'studio':view;
 const [backup,saveAction,open,loadAction]=backupActions[backupView]||['Simulator backup','backup','Open simulator backup','import'];
 return `<div class="navigator-shell"><header class="navigator-heading"><h2 id="navigator-title" tabindex="-1" autofocus>Navigate</h2>${btn(icon('close'),'hide-navigator','navigator-close','aria-label="Close"')}</header>
 <nav class="navigator-body" aria-label="Workspace">
  <div class="navigator-home">${link('sky','grid','Home')}</div>
  <div class="navigator-groups">${Object.values(workspaceHomes).map(group).join('')}</div>
 </nav>
 <footer class="navigator-footer">${btn(icon('download')+backup,saveAction)}${btn(icon('upload')+open,loadAction)}</footer></div>`;
}
let navigatorHoverTimer;
function openWorkspaceNavigator(){
 clearTimeout(navigatorHoverTimer);
 if(navigatorDialog.open||waterfrontView.open||$('#modal').innerHTML||resettingApp||savingKeptSetup)return;
 if(runPassage&&running){stop();render();}
 const settings=document.querySelector('.sky-preferences');
 if(settings)settings.open=false;
 navigatorDialog.innerHTML=QQI18n.html(workspaceNavigator());
 navigatorDialog.showModal();
}
document.addEventListener('pointerenter',e=>{
 const trigger=e.target;
 if(e.pointerType!=='mouse'||trigger.id!=='navigator-trigger')return;
 clearTimeout(navigatorHoverTimer);
 navigatorHoverTimer=setTimeout(()=>{
  if(trigger.isConnected&&trigger.matches(':hover'))openWorkspaceNavigator();
 },300);
},true);
document.addEventListener('pointerleave',e=>{
 if(e.target.id==='navigator-trigger')clearTimeout(navigatorHoverTimer);
},true);
if(navigatorDialog?.addEventListener){
 // A drag that starts inside the sheet can finish outside without dismissing it.
 let backdropPress=false;
 navigatorDialog.addEventListener('pointerdown',e=>{backdropPress=e.target===navigatorDialog;});
 navigatorDialog.addEventListener('click',e=>{
  const dismiss=backdropPress&&e.target===navigatorDialog;
  backdropPress=false;
  if(dismiss||e.target.closest('a[href],.navigator-footer button'))navigatorDialog.close();
 });
}
// A result can point into a nested service editor. Follow its service id if
// another offer is reordered or removed while this revision is open.
function rerunFieldOrigin(path){
 if(!editingRerun)return '';
 const target=rerunDraft.path.split('.');
 const keys=path.split('.');
 if(rerunDraft.serviceId){
  if(keys[0]!=='services'||draft.services[Number(keys[1])]?.id!==rerunDraft.serviceId||keys.slice(2).join('.')!==target.slice(2).join('.'))return '';
 }else if(path!==rerunDraft.path)return '';
 const original=rerunStartingConfig(state);
 const service=rerunDraft.serviceId&&original.services.find(s=>s.id===rerunDraft.serviceId);
 const value=(service?keys.slice(2):keys).reduce((obj,key)=>obj?.[key],service||original);
 return value==null?'':formatDiffValue(path,value);
}
function rerunControls(){
 return `<section class="rerun-controls" data-render-key="rerun-controls" aria-label="Revised setup">
 <div class="rerun-source">${btn('<i aria-hidden="true">←</i> <span>Original results</span>','return-rerun-results','rerun-return')}
 <span class="rerun-original-profit"><span>Operating result</span> <strong>${setupResultAmount(state.revenue-state.expenses)}</strong></span></div>
 ${btn('<span>Simulate again</span> <i aria-hidden="true">→</i>','simulate-again','primary rerun-launch',canSimulateRerun()?'':'disabled')}</section>`;
}
function setupEditorScene(notices){
 const source=!editingRerun&&keptComparisonId?savedComparisonArchive(keptComparisonId)?.workspace.rerunLink:null;
 const example=draft.recipe?.profile==='new-workspace'&&draft.name===RESTAURANT_EXAMPLE;
 const basis={original:'Based on the original run',revised:'Based on the revised run'}[source?.keptVersion];
 const context=editingRerun?'Revised setup':dirty()?'Setup draft':basis||(example?'Example scenario':'Current scenario');
 const savedLink=source?btn('<span>View saved comparison</span> <i aria-hidden="true">↗</i>','open-saved-comparison','setup-comparison-link',`id="setup-saved-comparison" data-comparison-id="${esc(keptComparisonId)}" aria-haspopup="dialog"`):'';
 const modeButton=(id,label)=>btn(label,'setup-density',setupMode===id?'active':'',`data-mode="${id}" aria-pressed="${setupMode===id}"`);
 const options=`${btn(recipeOpen?'Close scenario builder':'Try a scenario','toggle-recipe','small',`aria-expanded="${recipeOpen}"`)}${btn('Assumption sources','current-evidence','small')}${btn('New scenario','new-scenario','small')}${presetUndoDraft?btn('Undo recipe','undo-preset','small'):''}${dirty()?btn('Cancel all draft changes','ask-discard','small'):''}`;
 return `<div class="setup-sheet${editingRerun?' rerun-editor':''}" data-render-key="setup-sheet"><div class="sheet-heading setup-context">
  <div class="scenario-identity"><strong>${draft.name?scenarioName(draft.name):'Untitled scenario'}</strong><div class="scenario-context-line"><small><span>${context}</span>${editingRerun?'':' · Day '+state.day} ${btn('View estimate ↓','focus-estimate','mobile-estimate','aria-controls="draft-summary"')}</small>${savedLink}</div></div>
  <div class="setup-modebar"><div class="setup-detail"><div class="segmented" role="group" aria-label="Setup detail level">${modeButton('guided','Guided')}${modeButton('analyst','All assumptions')}</div></div><label class="setup-duration"><span>Run length</span><select id="input-months" data-input="months">${runLengthOptions(draft.months)}</select></label>
  <details data-workspace-menu data-disclosure="offer-setup-options"><summary id="setup-options-toggle">Setup options</summary><div class="offer-setup-controls"><div class="setup-secondary">${options}</div></div></details></div></div>
  ${editingRerun?rerunControls():''}${notices}${setupView()}</div>`;
}
function setupView(){
 const headings=['What do you sell?','Where do inquiries come from?','Who does the work?','When does cash change hands?'];
 const nextAction=stepIndex<3?btn('Next: '+steps[stepIndex+1]+' →','setup-step','primary','data-step="'+(stepIndex+1)+'"'):btn('View run estimate','focus-estimate','primary');
 const tabs=steps.map((n,i)=>`<button id="setup-tab-${i}" role="tab" aria-controls="setup-panel" aria-selected="${stepIndex===i}" tabindex="${stepIndex===i?0:-1}" data-action="setup-step" data-step="${i}" class="${stepIndex===i?'active':''}"><span aria-hidden="true">0${i+1}</span>${n}</button>`).join('');
 const content=stepIndex===0?serviceInputs():stepIndex===1?customerInputs():stepIndex===2?teamInputs():cashInputs();
 return `<div class="setup-workspace setup-mode-${setupMode}">${stepIndex?'<span id="decision-announcement" role="status" aria-atomic="true"></span>':''}${recipeOpen?presetWorkbench():''}<div class="setup-steps" role="tablist" aria-label="Setup steps">${tabs}</div>
  <div class="setup-layout"><section id="setup-panel" class="panel setup-body" role="tabpanel" aria-labelledby="setup-tab-${stepIndex}"><div class="setup-page-stack"><div class="setup-step-page" data-setup-page="${stepIndex}">
  <h1 class="chapter-title" id="sim-heading" tabindex="-1">${headings[stepIndex]}</h1>${content}<div class="step-footer">${stepIndex?btn('← Back','setup-step','','data-step="'+(stepIndex-1)+'"'):'<span></span>'}${nextAction}</div>
  </div></div></section><aside class="setup-summary" id="draft-summary" tabindex="-1" aria-label="Run estimate">${draftSummary()}${btn('↑ Back to inputs','setup-step','mobile-estimate estimate-return','data-step="'+stepIndex+'"')}</aside></div></div>`;
}
function standaloneServiceEstimate(service){
 const config={...QQ.DEFAULT,designerRate:draft.designerRate,ownerTarget:draft.ownerTarget,quoteHours:draft.quoteHours,deliveryHours:draft.deliveryHours,services:[{...service,weight:100}]};
 if(QQ.configIssues(config).length)return null;
 return QQ.estimate(config).services[0];
}
function serviceUnit(service){return standaloneServiceEstimate(service)?.perProject||null;}
function serviceFulfillment(service,index,routes){
 if(!service.fulfillment)return '';
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
 return `<div class="service-scope"><h3>Original example scope</h3><div class="service-scope-heading"><b>${esc(spec.scope)}</b><span>${service.fulfillment?'Design with optional print batch':service.print>0?'Design + print batch':'Digital delivery'} · ${service.campaign?(service.campaign.cadenceDays===90?'Seasonal campaign':'Monthly campaign'):service.recurring?'Per paid cycle':'One-off'}</span></div><ul>${spec.deliverables.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>${spec.printQuantity?`<p><b>${spec.printQuantity} ${esc(spec.printUnit||'pieces')}</b> · ${esc(spec.printSpec)}</p><p class="helper">${esc(spec.printCostBasis)} Quantity describes this package; changing the batch requires a new supplier estimate.</p>`:''}<p class="helper">${spec.includedRevisions} included feedback round${spec.includedRevisions===1?'':'s'} budgeted in the work estimate. Optional disruption rounds add work; no automatic extra fee is charged.</p><div class="service-scope-footer"><span>${range?'Modeled starting price '+offerAmount(range[0])+'–'+offerAmount(range[1]):'Custom price'}${audit.compatible===false?' · source version unavailable':''}</span>${btn('Price & scope evidence','service-evidence','small',`data-id="${esc(service.id)}" ${catalogId?`data-catalog="${esc(catalogId)}"`:""}`)}</div></div>`;
}
function serviceEvidence(service,catalogId=null,pickerKey=null){
 const audit=QQServiceCatalog.auditService(service),spec=service.spec;
 const records=(audit.records||QQServiceCatalog.SOURCES.filter(v=>spec?.evidenceIds?.includes(v.id)));
 const basis=spec?.catalogId===QQServiceCatalog.OPPORTUNITY_CATALOG.id?'Fees and hours are editable planning estimates for the scope below. Linked sources document the workflow or supplier inputs.':'Published prices are comparables for the stated scope. Your customer price, work estimate and supplier allowance remain editable assumptions.';
 modal(`<h2 id="dialog-title">${serviceName(service)}: price and scope</h2><p>${basis}</p><p><b>Current ${service.fulfillment?'managed-print ':''}customer price: ${Number.isFinite(service.price)?offerAmount(service.price):'not entered'}</b>${service.fulfillment?` · files only: ${Number.isFinite(service.fulfillment.designOnlyPrice)?offerAmount(service.fulfillment.designOnlyPrice):'not entered'} · managed-print share: ${Number.isFinite(service.fulfillment.managedShare)?pct(service.fulfillment.managedShare):'not entered'}`:''}</p><p>${esc(spec?.scope||service.deliverable)}</p><p>${esc(typeof audit.derivation==='string'?audit.derivation:JSON.stringify(audit.derivation||{}))}</p>${audit.edited?.length?`<p class="banner warn">Customized fields: ${esc(audit.edited.join(', '))}. The frozen derivation describes the original package; your edited values drive the preview and run.</p>`:''}${audit.modelRecord?`<details class="source-records"><summary>Documented price derivation</summary><pre>${esc(JSON.stringify(audit.modelRecord,null,2))}</pre></details>`:''}${audit.compatible===false?'<p class="banner warn">This package version is unavailable. Your saved values are preserved; current sources cannot verify its original quote.</p>':''}<div class="source-records">${records.map(record=>`<article><h3>${esc(record.title||record.label||record.id)}</h3><p>${esc(record.caveat||record.scope||record.note||'')}</p>${record.url?`<a href="${esc(record.url)}" target="_blank" rel="noopener">Open published source</a>`:''}<small>Recorded ${esc(record.retrieved||record.retrievedAt||'see source record')}</small><pre>${esc(JSON.stringify(record.snapshot||record.observations||record,null,2))}</pre></article>`).join('')}</div><div class="actions">${pickerKey?btn('Back to selection','picker-details-back','',`data-key="${esc(pickerKey)}"`):catalogId?btn('Back to package','catalog-package','',`data-id="${esc(catalogId)}"`):btn('Close','close')}${btn('Download service evidence','download-service-evidence','soft',`data-id="${esc(service.id)}" ${catalogId?`data-catalog="${esc(catalogId)}"`:''} ${pickerKey?`data-picker-evidence="${esc(pickerKey)}"`:''}`)}</div>`);
}
const offerGoals=[
 ['offer','Promote an offer'],['menu','Refresh a menu'],['visibility','Improve storefront visibility'],
 ['branding','Create a basic brand'],['recurring','Plan monthly or seasonal campaigns'],
 ['analytics','Understand business performance'],['catalog','Organize products and pricing'],
 ['localization','Reach customers in another language'],['sourcing','Evaluate products and suppliers'],
 ['client-experience','Improve the client experience']
];
const offerAudiences=[['food','Restaurants & cafés'],['retail','Retail shops'],['services','Local services']];
function normalizePackageSearch(value){
 return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim();
}
function openOfferPicker(){
 const existing=new Map(),placeholder=pristineOfferStarter(draft);
 let customCount=0;
 for(const service of draft.services){
  const id=catalogPackageId(service);
  if(id){if(!existing.has(id))existing.set(id,[]);existing.get(id).push(service);}
  else if(service!==placeholder)customCount++;
 }
 const featured=new Map(QQServiceCatalog.FEATURED_IDS.map((id,i)=>[id,i]));
 const packages=[...QQServiceCatalog.SERVICES].sort((a,b)=>(featured.get(a.id)??Infinity)-(featured.get(b.id)??Infinity));
 const rows=[];
 for(const entry of packages){
  const recommendation=QQServiceCatalog.recommendation(entry.id);
  const copies=existing.get(entry.id);
  for(const service of copies||[entry]){
   const saved=Boolean(copies),key=(saved?'saved-':'new-')+service.id;
   const audit=saved?QQServiceCatalog.auditService(service):null;
   const goal=offerGoals.find(([id])=>id===entry.category)?.[1];
   const audience=offerAudiences.find(([id])=>id===service.audience)?.[1];
   const words=[service.name,entry.name,goal,entry.goal,audience,service.deliverable,service.filesOnlyScope,recommendation.buyer,recommendation.benefit,...entry.spec.deliverables].filter(Boolean);
   const search=normalizePackageSearch(words.flatMap(word=>[word,QQI18n.text(word)]).join(' '));
   rows.push({key,service,entry,recommendation,saved,search,customized:saved&&(!audit.compatible||audit.edited.length>0)});
  }
 }
 offerPicker={draft,rows,customCount,added:new Set(),removed:new Set(),query:'',goal:'all',audience:'all',selectionOnly:false};
 serviceLibrary();
}
function packageIsSelected(row){
 return row.saved?!offerPicker.removed.has(row.service.id):offerPicker.added.has(row.entry.id);
}
function offerPickerSummary(){
 const p=offerPicker,selected=p.rows.filter(packageIsSelected).length;
 const total=draft.services.length+p.added.size-p.removed.size-(p.added.size&&pristineOfferStarter(draft)?1:0);
 const selectedText=selected===1?'1 package selected':selected+' packages selected';
 const pending=[p.added.size?p.added.size+' to add':'',p.removed.size?p.removed.size+' to remove':''].filter(Boolean).join(' · ');
 const onlyParked=p.removed.size&&!p.added.size&&draft.services.every(s=>p.removed.has(s.id)||s.weight===0);
 const exceedsLimit=total>20&&(p.added.size>0||total>=draft.services.length);
 const issue=exceedsLimit?'Your menu can hold up to 20 services.':total<1?'Keep at least one service in your menu.':onlyParked?'Keep at least one active offer or choose a replacement.':'';
 return {selectedText,pending,issue,canApply:Boolean(pending)&&!issue};
}
function offerDeliveryScope(service,mode){
 const filesOnly=mode==='design-only'||(mode!=='agency-managed'&&service.fulfillment?.managedShare===0);
 if(filesOnly){
  const files=serviceCopy(service,'filesOnlyScope');
  return files?esc(QQI18n.literal(files)):'Print-ready artwork and agreed digital files. The customer arranges printing.';
 }
 return esc(QQI18n.literal(serviceCopy(service,'deliverable')||''));
}
function offerPrintFees(service){
 const {managedShare,designOnlyPrice}=service.fulfillment;
 if(!Number.isFinite(managedShare)||managedShare<0||managedShare>1)return '<span>—</span>';
 const row=(fee,label)=>`<span><strong>${Number.isFinite(fee)?offerAmount(QQ.round(fee)):'—'}</strong> <small>${label}</small></span>`;
 const fees=[];
 if(managedShare>0)fees.push(row(service.price,service.recurring?'Managed print per cycle':'With managed print'));
 if(managedShare<1)fees.push(row(designOnlyPrice,service.recurring?'Files only per cycle':'Files only'));
 return fees.join(' ');
}
function pickerPackageDetails(row){
 const {service,recommendation,key}=row;
 const scope=(title,body)=>`<div><dt>${title}</dt><dd>${body}</dd></div>`;
 const included='<ul>'+(service.spec?.deliverables||[service.deliverable]).map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>';
 return `<details class="offer-pick-more" id="details-${esc(key)}"><summary>Package details<span class="picker-sr"> · ${serviceName(service)}</span></summary>
 <div class="offer-pick-detail"><dl>
 ${scope('Who buys it',esc(recommendation.buyer))}${scope('What the client supplies',esc(recommendation.inputs))}
 ${row.customized?scope('Your deliverable',offerDeliveryScope(service)):''}
 ${scope(row.customized?'Original package deliverables':'Included in the package',included)}${scope('Outside this scope',esc(recommendation.boundary))}
 ${service.fulfillment?.managedShare>0&&service.fulfillment.managedShare<1?scope('Files-only deliverable',offerDeliveryScope(service,'design-only')):''}
 ${scope('Work and costs',`<span>Production hours</span> · ${clientMenuNumber(service.hours,'hours')}<br><span>Owner review hours</span> · ${clientMenuNumber(service.review,'hours')}<br><span>${service.fulfillment&&service.fulfillment.managedShare>0?'Supplier allowance per managed batch':'Supplier allowance'}</span> · ${offerAmount(service.fulfillment?.managedShare===0?0:service.print)}`)}
 ${service.campaign?scope('Campaign schedule',QQ.validServiceCampaign(service.campaign,service)?`Up to ${Math.floor(service.campaign.relationshipDays/service.campaign.cadenceDays)} separately quoted cycles over ${service.campaign.relationshipDays} days, planned ${service.campaign.cadenceDays} days apart. Accepted work must be delivered and paid before the next quote.`:'—'):''}
 ${service.fulfillment?scope('Client print choices',offerPrintFees(service)):''}
 </dl>${btn('Price & scope evidence','picker-evidence','small',`id="evidence-${esc(key)}" data-key="${esc(key)}"`)}</div></details>`;
}
function visibleOfferRows(){
 const p=offerPicker;
 const words=normalizePackageSearch(p.query).split(/\s+/).filter(Boolean);
 return p.rows.filter(row=>(p.goal==='all'||row.entry.category===p.goal||p.goal==='recurring'&&row.service.recurring)&&
  (p.audience==='all'||row.service.audience==='all'||row.service.audience===p.audience)&&
  (!p.selectionOnly||packageIsSelected(row))&&words.every(word=>row.search.includes(word)));
}
function offerResultCount(rows){return rows.length===1?'1 matching package':rows.length+' matching packages';}
function serviceLibraryCards(rows=visibleOfferRows()){
 if(!rows.length)return '<div class="picker-empty"><p>No packages match this view.</p>'+btn('Clear filters','reset-offer-filters','small')+'</div>';
 return rows.map(row=>{
  const {service:s,recommendation,key}=row,id='choose-'+key;
  const status=row.saved?(row.customized?'Customized in your menu':'In your menu')+(s.weight===0?' · Draft only (0% share)':''):'';
  const priceLabel=row.customized?(s.recurring?'Your price per cycle':'Your price'):(s.recurring?'Model price per cycle':'Model price');
  return `<article class="offer-pick-row"><div class="offer-pick-line"><label for="${esc(id)}">
  <input type="checkbox" id="${esc(id)}" data-picker-key="${esc(key)}" aria-describedby="fit-${esc(key)}" ${packageIsSelected(row)?'checked':''}>
  <span><strong>${serviceName(s)}</strong>${status?`<small class="offer-pick-status">${status}</small>`:''}</span></label>
  <div class="offer-pick-rate">${s.fulfillment?offerPrintFees(s):`<strong>${offerAmount(s.price)}</strong><small>${priceLabel}</small>`}</div>
  <p id="fit-${esc(key)}">${esc(recommendation.benefit)}</p>
  <small class="offer-pick-effort"><span>Production hours</span> · ${clientMenuNumber(s.hours,'hours')}</small>
  </div>${pickerPackageDetails(row)}</article>`;
 }).join('');
}
function pickerFilters(){
 const p=offerPicker;
 const select=(id,label,all,choices,value)=>`<label><span>${label}</span><select id="${id}"><option value="all">${all}</option>${choices.map(([id,name])=>`<option value="${id}" ${id===value?'selected':''}>${name}</option>`).join('')}</select></label>`;
 return `<div class="offer-pick-filters"><label class="offer-search"><span>Search packages</span><input id="offer-package-search" type="search" autocomplete="off" enterkeyhint="search" value="${esc(p.query)}" placeholder="Service, customer or deliverable"></label>
 ${select('catalog-goal','Customer need','All needs',offerGoals,p.goal)}${select('catalog-audience','Customer type','All businesses',offerAudiences,p.audience)}</div>`;
}
function serviceLibrary(focusId='dialog-title'){
 if(!offerPicker||offerPicker.draft!==draft){openOfferPicker();return;}
 const summary=offerPickerSummary(),rows=visibleOfferRows(),others=offerPicker.customCount;
 const customNote=others===1?'One service outside this catalog stays in your menu. Edit it in Offers.':others+' services outside this catalog stay in your menu. Edit them in Offers.';
 modal(`<div class="offer-picker"><header><h2 id="dialog-title" tabindex="-1">Choose services for your menu</h2>
 <p>Select packages to add, or uncheck services you want to remove.</p>${others?`<p class="picker-custom-note">${customNote}</p>`:''}${pickerFilters()}
 <div class="picker-view"><label class="picker-view-selected"><input type="checkbox" id="offer-selection-only" ${offerPicker.selectionOnly?'checked':''}>Show selected packages</label>
 <span id="offer-match-count" role="status">${offerResultCount(rows)}</span></div></header>
 <div id="catalog-results" class="offer-pick-results" role="region" aria-label="Service packages" tabindex="0">${serviceLibraryCards(rows)}</div>
 <footer><div role="status" aria-live="polite" aria-atomic="true"><strong id="offer-selected-count">${summary.selectedText}</strong>
 <small id="offer-pending">${summary.issue||summary.pending}</small></div>
 <div class="picker-actions">${btn('Cancel','close')}${btn('Apply selection','apply-offer-selection','primary',`id="apply-offer-selection" ${summary.canApply?'':'disabled'}`)}</div></footer></div>`,focusId);
}
function refreshOfferPicker(list=true){
 if(list){
  const rows=visibleOfferRows();
  $('#catalog-results').innerHTML=QQI18n.html(serviceLibraryCards(rows));
  $('#catalog-results').scrollTop=0;
  $('#offer-match-count').textContent=QQI18n.text(offerResultCount(rows));
 }
 const summary=offerPickerSummary();
 $('#offer-selected-count').textContent=QQI18n.text(summary.selectedText);
 $('#offer-pending').textContent=QQI18n.text(summary.issue||summary.pending);
 $('#apply-offer-selection').disabled=!summary.canApply;
 $('#modal-error').textContent='';
}
function stagePickerItem(el){
 const row=offerPicker.rows.find(item=>item.key===el.dataset.pickerKey);
 if(!row)return;
 const changes=row.saved?offerPicker.removed:offerPicker.added;
 const id=row.saved?row.service.id:row.entry.id;
 if(row.saved?!el.checked:el.checked)changes.add(id);else changes.delete(id);
 refreshOfferPicker(offerPicker.selectionOnly);
 if(offerPicker.selectionOnly)$('#offer-selection-only').focus();
}
function restorePickerDetails(key){
 offerPicker.evidenceKey=null;
 serviceLibrary('catalog-results');
 const detail=document.getElementById?.('details-'+key);
 if(detail){detail.open=true;document.getElementById('evidence-'+key)?.focus();}
}
function catalogEconomics(service){
 const unit=serviceUnit(service);if(!unit)return '<p class="banner warn">Enter a complete price and valid work assumptions to preview costs.</p>';
 return `<div class="service-economics"><div><span>Expected customer revenue</span><b>${offerAmount(unit.price)}</b></div><div><span>Designer labor</span><b>${offerAmount(unit.designerCost)}</b><small>${num(service.hours)} h × ${offerAmount(draft.designerRate)}/h</small></div><div><span>Expected supplier cost</span><b>${offerAmount(unit.printCost)}</b></div><div><span>After valuing owner time</span><b>${offerAmount(unit.afterOwnerTime)}</b></div></div>${service.fulfillment?`<p class="helper">Customer choice: ${offerAmount(service.price)} managed printing (${offerAmount(service.print)} supplier batch) or ${offerAmount(service.fulfillment.designOnlyPrice)} for files only. Preview assumes ${pct(service.fulfillment.managedShare)} choose managed printing; this is an unmeasured assumption you can change.</p>`:''}`;
}
function catalogCandidate(id){
 const s=QQServiceCatalog.createService(id),raw=catalogPrices.get(id);if(raw!==undefined)s.price=raw.trim()===''?null:Number(raw);return s;
}
function evidenceService(id,catalogId){
 const service=catalogId?catalogCandidate(catalogId):draft.services.find(s=>s.id===id);if(!service)throw Error('Service not found.');return service;
}
function catalogPackage(id){
 pendingCatalogId=id;const s=catalogCandidate(id),unit=serviceUnit(s);
 const neededHours=[];
 if(unit?.designerHours)neededHours.push('designers','designerHours');
 if(unit?.ownerHours){neededHours.push('ownerHours','acquisition');if(draft.acquisition==='sales')neededHours.push('outreachHours');}
 const capacity=unit&&!draftValidationIssues().some(issue=>neededHours.includes(issue.path))?Math.min(unit.designerHours?draft.designers*draft.designerHours/unit.designerHours:Infinity,unit.ownerHours?Math.max(0,draft.ownerHours-(draft.acquisition==='sales'?draft.outreachHours:0))/unit.ownerHours:Infinity):null;
 modal(`<h2 id="dialog-title">${serviceName(s)}</h2>${serviceScope(s,id)}<label class="input-field" for="catalog-price">Your proposed ${s.fulfillment?'managed-print ':''}customer price ($)<input id="catalog-price"${QQI18n.moneyField('$')} type="number" min="${s.fulfillment?.designOnlyPrice||0}" max="1000000" step="0.01" value="${esc(catalogPrices.get(id)??String(s.price))}"></label><div id="catalog-economics">${catalogEconomics(s)}</div><p class="helper">${Number.isFinite(capacity)?num(capacity)+' projects/week maximum if this were your only offering. ':''}Before overhead, queue delays, unsuccessful quoting and extra revisions.</p><p class="helper">Adds at 0% inquiry share so it does not change your workload until you assign a share.</p><div class="actions">${btn('Back to library','service-library')}${btn('Add to my draft','confirm-catalog-service','primary')}</div>`);
}
function clearServiceRecords(id){
 if(!draft.assumptionRecords)return;
 const prefix=id?'services.'+id+'.':'services.';
 for(const path of Object.keys(draft.assumptionRecords))if(path.startsWith(prefix))delete draft.assumptionRecords[path];
 if(!Object.keys(draft.assumptionRecords).length)delete draft.assumptionRecords;
}
function emptyCustomOffer(){
 return {customOffer:true,name:'',deliverable:'',price:null,hours:null,review:null,print:null,supplierMode:'choose',recurring:false,audience:'all',color:'#647f9a'};
}
function pristineOfferStarter(config){
 const [service]=config.services;
 if(config.services.length!==1||service.weight!==100)return null;
 const blank=emptyCustomOffer();
 if(!Object.entries(blank).every(([key,value])=>service[key]===value)||
    Object.keys(service).some(key=>key!=='id'&&key!=='weight'&&!Object.hasOwn(blank,key)))return null;
 return Object.keys(config.assumptionRecords||{}).some(key=>key.startsWith('services.'+service.id+'.'))?null:service;
}
function originalOfferPackage(service){
 const spec=service?.spec;
 return spec&&QQServiceCatalog.SERVICES.find(row=>row.id===spec.packageId&&row.spec.catalogId===spec.catalogId&&row.spec.version===spec.version);
}
function catalogPackageId(service){return originalOfferPackage(service)?.id||null;}
function fitsClientMenu(service,profile){
 return !service.audience||service.audience==='all'||service.audience===profile.audience;
}
function currentClientMenu(config=draft,allowPartial=false){
 const savedMenu=config.clientMenu;
 if(!savedMenu||!Array.isArray(savedMenu.serviceIds))return null;
 const profile=QQServiceCatalog.CLIENT_MENUS.find(menu=>menu.id===savedMenu.profileId);
 const serviceIds=savedMenu.serviceIds;
 if(!profile||serviceIds.length!==profile.slots.length||new Set(serviceIds).size!==serviceIds.length)return null;
 const packageIds=serviceIds.map((id,i)=>{
  const offer=config.services.find(s=>s.id===id&&s.weight>0&&fitsClientMenu(s,profile));
  const packageId=catalogPackageId(offer);
  return profile.slots[i].options.some(o=>o.id===packageId)?packageId:null;
 });
 const present=packageIds.filter(Boolean);
 if(!present.length||new Set(present).size!==present.length||(!allowPartial&&present.length!==serviceIds.length))return null;
 return {profile,packageIds,serviceIds:serviceIds.map((id,i)=>packageIds[i]?id:null)};
}
function draftWithClientMenu(config,source){
 const restored=QQ.clone(config);
 if(source?.clientMenu){
  const candidate={...restored,clientMenu:source.clientMenu};
  if(currentClientMenu(candidate,true))return {...restored,clientMenu:QQ.clone(source.clientMenu)};
 }
 // A run keeps its modeled inputs. Reconnect a named client's menu only
 // when the recorded offers identify one unambiguous service in every role.
 const profile=QQServiceCatalog.CLIENT_MENUS.find(menu=>menu.id===config.clientDemand?.profileId);
 if(profile){
  const roles=profile.slots.map(slot=>restored.services.filter(s=>s.weight>0&&fitsClientMenu(s,profile)&&slot.options.some(o=>o.id===catalogPackageId(s))));
  if(roles.every(matches=>matches.length===1)){
   const clientMenu={profileId:profile.id,serviceIds:roles.map(([s])=>s.id)};
   if(currentClientMenu({...restored,clientMenu}))restored.clientMenu=clientMenu;
  }
 }
 return restored;
}
// Keep proposed identities across renders of the same draft menu. Applying
// a menu changes its services array, so a later replacement gets a fresh ID
// even when the customer chooses a package used in an earlier revision.
const clientMenuPreviewIds=new WeakMap();
function proposedMenuServiceId(packageId,reserved){
 let ids=clientMenuPreviewIds.get(draft.services);
 if(!ids){ids=new Map();clientMenuPreviewIds.set(draft.services,ids);}
 if(!ids.has(packageId)){
  const nonce=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  ids.set(packageId,'menu-'+nonce);
 }
 return newServiceId(reserved,ids.get(packageId));
}
function clientMenuCandidate(profile,packageIds,retainOtherOffers=true){
 const config=QQ.clone(draft),previous=config.services,added=[],activated=[];
 const result={config,added,activated,retained:[],removed:[],pristineRemoved:false,changed:false,error:'',unsegmented:!config.customerMix};
 const menu=QQServiceCatalog.CLIENT_MENUS.find(value=>value.id===profile?.id);
 if(!menu||!Array.isArray(packageIds)||menu.slots.length!==packageIds.length||
    !menu.slots.every((slot,i)=>slot.options.some(option=>option.id===packageIds[i]))||new Set(packageIds).size!==packageIds.length){
  result.error='Choose one different offer for each role.';return result;
 }
 const linked=currentClientMenu(config,true),sameProfile=linked?.profile.id===menu.id;
 const reserved=new Set(),include=new Set();
 const selected=packageIds.map(packageId=>{
  const matches=previous.filter(s=>catalogPackageId(s)===packageId&&fitsClientMenu(s,menu));
  const linkedId=sameProfile?linked.serviceIds[linked.packageIds.indexOf(packageId)]:null;
  const active=matches.filter(s=>s.weight>0);
  // In particular, keep the user's named/edited copy when an unedited copy
  // also exists. A known role always keeps its original instance.
  let service=matches.find(s=>s.id===linkedId)||active.find(s=>QQServiceCatalog.auditService(s).edited.length)||active[0]||matches[0];
  if(!service){
   service=QQServiceCatalog.createService(packageId);
   service.id=proposedMenuServiceId(packageId,reserved);reserved.add(service.id);service.weight=0;
   if(!config.customerMix)service.audience='all';
   added.push(service);
  }else if(service.weight===0)activated.push(service);
  if(!(service.weight>0))include.add(service.id);
  return service;
 });
 const selectedIds=new Set(selected.map(s=>s.id));
 const starter=pristineOfferStarter(config),retired=new Set();
 if(sameProfile)linked.serviceIds.forEach((id,index)=>{
  if(!id||selectedIds.has(id))return;
  retired.add(id);
  // Preserve the inquiries previously assigned to this role. If its
  // successor was already active elsewhere, consolidate both shares.
  const successor=selected[index],original=previous.find(s=>s.id===id);
  successor.weight=(successor.weight||0)+original.weight;
  include.delete(successor.id);
 });
 result.removed=previous.filter(s=>s===starter||retired.has(s.id)||(!retainOtherOffers&&!selectedIds.has(s.id)));
 result.pristineRemoved=Boolean(starter&&result.removed.includes(starter));
 const removedIds=new Set(result.removed.map(s=>s.id));
 config.services=retainOtherOffers?[...previous.filter(s=>!removedIds.has(s.id)),...added]:selected;
 config.clientMenu={profileId:menu.id,serviceIds:selected.map(s=>s.id)};
 const weights=allocatedOfferWeights(config.services,include);
 for(const s of config.services)s.weight=weights.get(s.id);
 result.retained=config.services.filter(s=>!reserved.has(s.id));
 if(config.assumptionRecords){
  for(const path of Object.keys(config.assumptionRecords)){
   const [group,id]=path.split('.');
   if(group==='services'&&removedIds.has(id))delete config.assumptionRecords[path];
  }
  if(!Object.keys(config.assumptionRecords).length)delete config.assumptionRecords;
 }
 result.changed=JSON.stringify(config)!==JSON.stringify(draft);
 if(config.services.length>20)result.error='Your menu can hold up to 20 services.';
 return result;
}
function clientMenuProjection(source){
 const config=draftRunConfig(source),issues=issuesForDraft(source,config);
 const estimate=issues.length?null:QQ.estimate(config);
 return {valid:!issues.length,issues,days:validRunLength(config.months)?config.months*30:null,
  capacity:estimate?QQ.deliveryCapacity(config,estimate):null,overhead:estimate?QQ.round(config.overhead)*config.months:null,
  profit:estimate?.profit??null,orders:estimate?.orders??null,productionHours:estimate?.hours??null,ownerHours:estimate?.owner??null,
  surplus:estimate?.surplus??null,revenue:estimate?.revenue??null,unserved:estimate?.unserved??null,unservedShare:estimate?.unservedShare??null,
  productionCapacity:estimate?.designCapacity??null,ownerCapacity:estimate?.ownerCapacity??null};
}
function applyClientMenu(profile,packageIds,retainOtherOffers=true){
 const candidate=clientMenuCandidate(profile,packageIds,retainOtherOffers);
 if(candidate.error)throw Error(candidate.error);
 if(!candidate.changed)return candidate;
 // A trial menu never becomes run state here. Undo also restores the exact
 // role membership, recorded sources and unfinished values of the draft.
 serviceUndoDraft=QQ.clone(draft);presetUndoDraft=null;
 const config=candidate.config;
 draft.services=config.services;draft.clientMenu=config.clientMenu;
 if(config.assumptionRecords)draft.assumptionRecords=config.assumptionRecords;else delete draft.assumptionRecords;
 expandedService=draft.services.findIndex(s=>s.id===(candidate.added[0]?.id||config.clientMenu.serviceIds[0]));
 return candidate;
}
// Assign hundredths of a percentage point by largest remainder. A new offer
// starts at the mean weight of the established offers. Explicit zeroes stay
// parked; unfinished weights take an equal place among the new selections.
function allocatedOfferWeights(offers,include=new Set(),percent=100){
 const established=offers.filter(s=>!include.has(s.id)&&s.weight>0&&s.weight<=100);
 const average=established.length?established.reduce((sum,s)=>sum+s.weight,0)/established.length:1;
 const rows=offers.map(s=>({id:s.id,ratio:include.has(s.id)||s.weight===null||s.weight<0||s.weight>100?average:s.weight,units:0}));
 const active=rows.filter(row=>row.ratio>0),sum=active.reduce((total,row)=>total+row.ratio,0);
 const budget=Math.round(percent*100);
 let used=0;
 for(const row of active){
  const exact=budget*row.ratio/sum;
  row.units=Math.floor(exact);row.fraction=exact-row.units;used+=row.units;
 }
 const order=[...active].sort((a,b)=>b.fraction-a.fraction);
 for(let i=0;i<budget-used&&i<order.length;i++)order[i].units++;
 // Keep even a very small positive weight in the simulation.
 if(budget>=active.length)for(const row of active)if(!row.units){
  const donor=active.reduce((a,b)=>a.units>=b.units?a:b);donor.units--;row.units++;
 }
 return new Map(rows.map(row=>[row.id,row.units/100]));
}
function updateOfferMenu(added,removeIds,include,parkId=null){
 const previous=draft.services,removed=new Set(removeIds);
 if([...removed].some(id=>!previous.some(s=>s.id===id)))throw Error('This offer is no longer in the menu.');
 const next=[...previous.filter(s=>!removed.has(s.id)),...added];
 if(!next.length)throw Error('Keep at least one service.');
 if(!parkId&&next.length>20&&(added.length||next.length>=previous.length))throw Error('This draft already contains 20 services.');
 const weighted=parkId?next.map(s=>s.id===parkId?{...s,weight:0}:s):next;
 const weights=allocatedOfferWeights(weighted,include);
 if(![...weights.values()].some(weight=>weight>0)&&previous.some(s=>s.weight>0))throw Error('Keep at least one active offer or choose a replacement.');
 // Commit once, after validating the complete selection. Run snapshots and
 // other service records remain independent of these pending setup changes.
 serviceUndoDraft=QQ.clone(draft);presetUndoDraft=null;
 const opened=previous[expandedService]?.id;
 for(const id of removed)clearServiceRecords(id);
 draft.services=next.map(s=>s.weight===weights.get(s.id)?s:{...s,weight:weights.get(s.id)});
 if(added.some(s=>s.audience!=='all')&&!draft.customerMix){
  draft.customerMix=QQ.clone(QQ.DEFAULT.customerMix);draft.profileStrength=QQ.DEFAULT.profileStrength;draft.focusType='none';
 }
 expandedService=next.findIndex(s=>s.id===(added[0]?.id||opened));
 return {added:added.map(s=>s.id),removed:[...removed]};
}
function applyCatalogSelection(addPackageIds,removeServiceIds=[]){
 const requested=new Set(addPackageIds),removed=new Set(removeServiceIds),added=[],reserved=new Set();
 const existing=new Set(draft.services.filter(s=>!removed.has(s.id)).map(catalogPackageId));
 for(const id of requested){
  if(existing.has(id)&&id!==null)continue;
  const service=QQServiceCatalog.createService(id);
  service.id=newServiceId(reserved);reserved.add(service.id);added.push(service);
 }
 if(!added.length&&!removed.size)return {added:[],removed:[]};
 const placeholder=added.length&&pristineOfferStarter(draft);
 if(placeholder)removed.add(placeholder.id);
 return updateOfferMenu(added,removed,reserved);
}
function includeDraftOffer(id){
 const offer=draft.services.find(s=>s.id===id);
 if(!offer)throw Error('This offer is no longer in the menu.');
 if(offer.weight>0)return false;
 updateOfferMenu([],[],new Set([id]));return true;
}
function canFinishOfferLater(index){
 const offer=draft.services[index];
 if(!offer?.customOffer||!(offer.weight>0)||!draft.services.some(s=>s!==offer&&s.weight>0))return false;
 const prefix='services.'+index+'.';
 return draftValidationIssues().some(issue=>issue.path.startsWith(prefix)&&issue.path!==prefix+'weight');
}
function removeDraftService(index){
 const offers=draft.services, service=offers[index];
 if(!service)throw Error('Choose a service first.');
 if(offers.length===1)throw Error('Keep at least one service.');
 const records=Object.entries(draft.assumptionRecords||{}).filter(([path])=>path.startsWith('services.'+service.id+'.'));
 const history=removedServices.get(offers)||[];
 const remaining=offers.filter(s=>s!==service);
 if(service.weight>0&&remaining.every(s=>s.weight===0)){
  document.querySelector('[data-action="include-offer"][data-id="'+remaining[0].id+'"]')?.focus();
  throw Error('Choose Include in simulation on another service before removing the last active offer.');
 }
 const valid=offers.every(s=>Number.isFinite(s.weight)&&s.weight>=0&&s.weight<=100)&&Math.abs(offers.reduce((sum,s)=>sum+s.weight,0)-100)<=.01;
 const weights=valid&&service.weight>0?allocatedOfferWeights(remaining):null;
 const before=weights?new Map(remaining.map(s=>[s.id,s.weight])):null;
 presetUndoDraft=null;serviceUndoDraft=null;
 history.push({service,index,records,before,weights});
 removedServices.set(offers,history);
 clearServiceRecords(service.id);
 offers.splice(index,1);
 if(weights)for(const s of offers)s.weight=weights.get(s.id);
 if(expandedService===index)expandedService=-1;
 else if(expandedService>index)expandedService--;
 renderListChange('.offer-card,.offer-recovery[data-render-key]');
 document.querySelector('#undo-service-removal')?.focus();
}
function restoreDraftService(){
 const offers=draft.services,history=removedServices.get(offers),entry=history?.at(-1);
 if(!entry)throw Error('No removed service to restore.');
 if(offers.length>=20)throw Error('This draft already contains 20 services.');
 const {index,service,records,before,weights}=entry;
 if(records.length){
  const combined={...draft.assumptionRecords,...Object.fromEntries(records)};
  if(!QQ.validAssumptionRecords(combined))throw Error('There is no room for the restored assumption records.');
  draft.assumptionRecords=combined;
 }
 if(weights){
  const fixed=offers.filter(s=>weights.get(s.id)!==s.weight);
  const unchanged=offers.filter(s=>weights.get(s.id)===s.weight&&before.has(s.id));
  const available=100-fixed.reduce((total,s)=>total+s.weight,0);
  if(!fixed.length&&unchanged.length===before.size){
   for(const s of unchanged)s.weight=before.get(s.id);
  }else if(fixed.every(s=>Number.isFinite(s.weight)&&s.weight>=0)&&available>=0){
   const restored=allocatedOfferWeights([...unchanged.map(s=>({...s,weight:before.get(s.id)})),service],new Set(),available);
   for(const s of unchanged)s.weight=restored.get(s.id);
   service.weight=restored.get(service.id);
  }
 }
 offers.splice(index,0,service);
 history.pop();
 presetUndoDraft=null;serviceUndoDraft=null;
 if(expandedService>=index)expandedService++;
 renderListChange('.offer-card,.offer-recovery[data-render-key]');
 document.querySelector('#offer-edit-'+service.id)?.focus();
}
function appendCatalogService(id,price){
 if(draft.services.length>=20)throw Error('The prototype supports up to 20 services.');
 const s=id?QQServiceCatalog.createService(id):emptyCustomOffer();
 if(price!==undefined){if(!Number.isFinite(price)||price<0||price>1e6)throw Error('Enter a valid customer price.');s.price=price;}
 s.id=newServiceId();s.weight=draft.services.length?0:100;draft.services.push(s);serviceUndoDraft=null;presetUndoDraft=null;
 if(s.audience!=='all'&&!draft.customerMix){draft.customerMix=QQ.clone(QQ.DEFAULT.customerMix);draft.profileStrength=QQ.DEFAULT.profileStrength;draft.focusType='none';}
 expandedService=draft.services.length-1;disclosureState.set('service-'+s.id,true);
}
function addCatalogService(id,price){
 appendCatalogService(id,price);closeModal();render();document.querySelector('#input-services-'+expandedService+'-name')?.focus();
}
function priceExperiment(index){
 const service=draft.services[index],unit=serviceUnit(service);
 if(!unit)throw Error('Complete the service work and cost inputs first.');
 const filesOnly=service.fulfillment?.managedShare===0;
 const current=filesOnly?service.fulfillment.designOnlyPrice:service.price;
 const catalog=QQServiceCatalog.auditService(service);
 const base=filesOnly?catalog.catalogService?.fulfillment?.designOnlyPrice:catalog.catalogService?.price;
 const range=!filesOnly&&service.spec?.modeledPriceRange||[QQ.round(current*.85),QQ.round(current*1.15)];
 const minimum=filesOnly?0:(service.fulfillment?.designOnlyPrice||0),maximum=filesOnly?service.price:1e6;
 const candidates=[[catalog.compatible?'Current':'Current custom price',current],[filesOnly||!service.spec?'15% below current fee':'Low end of catalog range',range[0]],
  ['Catalog starting price',catalog.compatible?base:null],[filesOnly||!service.spec?'15% above current fee':'High end of catalog range',range[1]]];
 const seen=new Set();
 const rows=candidates.map(([label,price])=>{
  if(!Number.isFinite(price)||seen.has(price))return '';
  if(price<minimum||price>maximum)return `<tr><th>${label}</th><td>${offerAmount(price)}</td><td colspan="4">Outside valid range</td></tr>`;
  seen.add(price);
  const offer=filesOnly?{...service,fulfillment:{...service.fulfillment,designOnlyPrice:price}}:{...service,price};
  const candidate=serviceUnit(offer);
  if(!candidate)return '';
  const action=price===current?'Current draft':btn('Use '+offerAmount(price),'use-service-price','small',`data-index="${index}" data-price="${price}" data-route="${filesOnly?'files':'offered'}"`);
  return `<tr><th>${label}</th><td>${offerAmount(price)}</td><td>${offerAmount(candidate.directCost)}</td><td>${offerAmount(candidate.contribution)}</td><td class="${candidate.afterOwnerTime<0?'negative':''}">${offerAmount(candidate.afterOwnerTime)}</td><td>${action}</td></tr>`;
 }).join('');
 const rate=draft.conversion;
 const acceptance=Number.isFinite(rate)&&rate>=0&&rate<=1?`<p><span>Assumed share of first quotes accepted</span> <strong>${inquiryShare(rate)}</strong></p>`:'';
 const printNote=filesOnly?'Customers arrange all printing. These alternatives change the files-only fee.':service.fulfillment?'With customer print choice, results are weighted across both routes; the design-only fee stays fixed.':'';
 modal(`<h2 id="dialog-title">Experiment with ${serviceName(service)}</h2><p>Keep the same scope and workload while comparing prices. Changing price does not automatically change inquiry volume or acceptance; test those assumptions separately.</p>${acceptance}<div class="tablewrap"><table><thead><tr><th>Price case</th><th>${filesOnly?'Files-only fee':'Managed / offered price'}</th><th>Expected direct cost</th><th>Contribution</th><th>After owner time</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><p class="helper">${printNote?`<span>${printNote}</span> `:''}<span>Direct costs include designer labor and printing. Owner time includes one quote, review and delivery.</span></p><div class="actions">${btn('Keep current price','close')}</div>`);
}
let clientMenuBuilder=null;
function openClientMenuBuilder(){
 const previous=currentClientMenu(draft,true);
 clientMenuBuilder={draft,profile:previous?.profile||null,selections:new Map(),picking:!previous,
  retain:true,retainByProfile:new Map(),swap:null,compare:'current',lastSwap:null,current:clientMenuProjection(draft)};
 if(previous){
  const defaults=previous.profile.slots.map(slot=>slot.options[0].id);
  const packages=previous.packageIds.map((id,i)=>id||defaults[i]);
  clientMenuBuilder.selections.set(previous.profile.id,new Set(packages).size===packages.length?packages:defaults);
 }
 renderClientMenu('dialog-title');
}
function clientMenuChoice(profile){
 clientMenuBuilder.profile=profile;
 if(!clientMenuBuilder.selections.has(profile.id))clientMenuBuilder.selections.set(profile.id,profile.slots.map(s=>s.options[0].id));
 Object.assign(clientMenuBuilder,{picking:false,swap:null,lastSwap:null,retain:clientMenuBuilder.retainByProfile.get(profile.id)??true});
 renderClientMenu('dialog-title');
}
function clientMenuClientList(){
 const active=clientMenuBuilder.profile;
 const audiences={food:'Restaurants and cafés',retail:'Retail and brands',services:'Local services',all:'Small businesses'};
 const card=profile=>{
  const selected=active?.id===profile.id;
  return `<button type="button" class="cm-client-card" id="cm-client-${profile.id}" data-action="choose-menu-client" data-profile="${profile.id}">
   <strong>${esc(profile.name)}</strong><span class="cm-client-description">${esc(profile.description)}</span>
   ${selected?'<small class="cm-client-resume">Resume menu</small>':''}<i class="cm-client-open" aria-hidden="true">${icon('arrow')}</i></button>`;
 };
 const cards=Object.entries(audiences).map(([id,label])=>{
  const profiles=QQServiceCatalog.CLIENT_MENUS.filter(p=>p.audience===id);
  return profiles.length?`<section class="cm-client-group" data-client-sector="${id}"><h3><span>${label}</span></h3>${profiles.map(card).join('')}</section>`:'';
 }).join('');
 return `<header class="cm-heading cm-intro"><h2 id="dialog-title" tabindex="-1">Who do you want to serve?</h2>
  <p>Choose a client to explore three offers that work together.</p></header>
  <div class="cm-scroll" id="client-menu-scroll" role="region" aria-label="Choose a client" tabindex="0"><div class="cm-client-grid">${cards}</div></div>
  <footer class="cm-footer cm-choose-footer">${btn('Cancel','close')}</footer>`;
}
function clientMenuNumber(value,unit){
 if(!Number.isFinite(value))return '—';
 if(unit==='money')return offerAmount(value);
 if(unit==='matched')return inquiryShare(1-value);
 const precision=unit==='hours'?2:1;
 const format=new Intl.NumberFormat(QQI18n.language,{maximumFractionDigits:precision});
 const rounded=format.format(value);
 const figure=value>0&&rounded===format.format(0)?'&lt;'+format.format(10**-precision):rounded;
 return unit==='hours'?figure+(QQI18n.language==='zh-CN'?' 小时':' h'):figure;
}
function clientMenuDifference(value){
 if(!Number.isFinite(value))return '—';
 const rounded=QQ.round(value);
 return (rounded>0?'+':rounded<0?'−':'')+offerAmount(Math.abs(rounded));
}
function clientMenuOffer(candidate,index,id){
 const serviceId=candidate.config?.clientMenu?.serviceIds[index];
 return candidate.config?.services.find(s=>s.id===serviceId)||QQServiceCatalog.SERVICES.find(s=>s.id===id);
}
function clientMenuFee(service){
 if(service.fulfillment)return offerPrintFees(service);
 if(service.price==null)return '<span>Price needed</span>';
 const label=service.recurring?'Per cycle':'Per project';
 return `<span>${offerAmount(service.price)}</span> <small>${label}</small>`;
}
function clientMenuAlternatives(profile,ids,index,shown){
 const b=clientMenuBuilder,slot=profile.slots[index];
 return `<div class="cm-alternatives" id="cm-options-${index}" role="group" aria-label="Offer alternatives">${slot.options.map((option,n)=>{
  const checked=ids[index]===option.id;
  const previewIds=ids.map((id,i)=>i===index?option.id:id);
  const next=clientMenuCandidate(profile,previewIds,b.retain),service=clientMenuOffer(next,index,option.id);
  const projection=checked?shown:next.error?null:clientMenuProjection(next.config);
  const effect=shown.valid&&projection?.valid?QQ.round(projection.profit-shown.profit):null;
  const coverage=effect!==null&&Math.abs(projection.unservedShare-shown.unservedShare)>.0001?
   `<small class="cm-match-impact"><span>Inquiries matched</span> ${clientMenuNumber(shown.unservedShare,'matched')} → ${clientMenuNumber(projection.unservedShare,'matched')}</small>`:'';
  return `<button class="cm-alternative" type="button" data-action="swap-menu-offer" data-slot="${index}" data-id="${option.id}" aria-pressed="${checked}"${checked?' aria-current="true"':''}>
   <span class="cm-radio" aria-hidden="true"></span><span class="cm-option-content"><strong>${serviceName(service)}</strong>
   <span>${esc(option.why)}</span><span class="cm-option-facts">${clientMenuFee(service)} <i>·</i> ${clientMenuNumber(service.hours,'hours')}${draft.customerMix&&service.audience==='all'?' <i>·</i> <span>All client groups</span>':''}</span>
   ${checked?'<small>Selected</small>':effect!=null?`<small><span>Change if all expected new orders ship</span> ${clientMenuDifference(effect)}</small>${coverage}`:n===0?'<small>Recommended offer</small>':''}</span></button>`;
 }).join('')}</div>`;
}
function clientMenuSlots(profile,ids,candidate,proposed){
 return profile.slots.map((slot,i)=>{
  const option=slot.options.find(v=>v.id===ids[i]),service=clientMenuOffer(candidate,i,option.id);
  const open=clientMenuBuilder.swap===i;
  return `<article class="cm-slot"><div class="cm-slot-label">${esc(slot.label)}</div>
   <div class="cm-slot-title"><h3>${serviceName(service)}</h3><div class="cm-fee">${clientMenuFee(service)}</div></div>
   <p>${esc(option.why)}</p><div class="cm-slot-tools"><span>${icon('clock')}<b>${clientMenuNumber(service.hours,'hours')}</b> <span>production</span>${draft.customerMix&&service.audience==='all'?'<i aria-hidden="true">·</i><span>All client groups</span>':''}</span>
   ${btn('<span>'+(open?'Close choices':'Swap offer')+'</span>'+icon('compare'),'show-menu-swaps','cm-swap',`id="cm-swap-${i}" data-slot="${i}" aria-expanded="${open}"${open?' aria-controls="cm-options-'+i+'"':''} aria-label="${open?'Close choices':'Swap offer'} · ${serviceName(service)}"`)}</div>
   ${open?clientMenuAlternatives(profile,ids,i,proposed):''}</article>`;
 }).join('');
}
function clientMenuReview(candidate){
 const slotIds=new Set(candidate.config?.clientMenu?.serviceIds||[]);
 const retained=candidate.retained.filter(s=>!slotIds.has(s.id));
 const removed=candidate.removed.filter(s=>!(candidate.pristineRemoved&&s.id===pristineOfferStarter(draft)?.id));
 const bound=currentClientMenu(draft,true);
 const boundIds=new Set(bound?.profile.id===clientMenuBuilder.profile.id?bound.serviceIds:[]);
 const others=retained.length||removed.some(s=>!boundIds.has(s.id));
 if(!others&&!removed.length)return '';
 const names=rows=>rows.map(s=>'<li>'+(s.name?.trim()?serviceName(s):'Unnamed custom offer')+'</li>').join('');
 return `<section class="cm-existing"><h3 id="cm-existing-title" tabindex="-1">Existing offers</h3>
  ${others?`<label><input id="client-menu-retain" type="checkbox" ${clientMenuBuilder.retain?'checked':''}><span>Keep my other offers</span></label>`:''}
  ${retained.length?`<details><summary><span>Also in your menu</span> <b>${retained.length}</b></summary><ul>${names(retained)}</ul></details>`:''}
  ${removed.length?`<div class="cm-removals"><strong>Leaves your menu on Apply</strong><ul>${names(removed)}</ul></div>`:''}
 </section>`;
}
function menuCapacityNotice(capacity){
 const heading=DELIVERY_CAPACITY_HEADINGS[capacity?.status];
 if(!heading)return '';
 return `<p class="cm-capacity"><strong>${heading}</strong> ${deliveryCapacityReasons(capacity).map(reason=>`<span>${reason}</span>`).join(' ')}</p>`;
}
function clientMenuEstimate(projection,reference,referenceLabel,current,comparePossible,baseline,config){
 const profile=clientMenuBuilder.profile;
 const title=projection.days?projection.days+'-day estimate':'Run estimate';
 const difference=reference?.valid&&projection.valid?QQ.round(projection.profit-reference.profit):null;
 const metrics=[['Inquiries matched','unservedShare','matched'],['Expected first orders','orders','count'],['Production hours','productionHours','hours'],['Owner hours','ownerHours','hours'],['After owner time if all orders ship','surplus','money']];
 const tabs=[['current','Current menu',current.valid],['recommended','Recommended menu',baseline.valid]];
 const customerGroup={food:'Food businesses',retail:'Retail businesses',services:'Local services'}[profile.audience];
 const groupShare=config.customerMix||config.clientDemand?.share>0?QQ.effectiveCustomerMix(config)?.[profile.audience]:null;
 const targetedShare=config.clientDemand?.profileId===profile.id?config.clientDemand.share:0;
 const status=projection.capacity?.status;
 const noDeliveries=status==='blocked'||status==='no-orders';
 const labor=[];
 if(projection.valid&&projection.productionHours>projection.productionCapacity+.01)labor.push('<span>Production capacity exceeded by</span> '+clientMenuNumber(projection.productionHours-projection.productionCapacity,'hours'));
 if(projection.valid&&projection.ownerHours>projection.ownerCapacity+.01)labor.push('<span>Owner capacity exceeded by</span> '+clientMenuNumber(projection.ownerHours-projection.ownerCapacity,'hours'));
 const controls=comparePossible?`<div class="cm-compare" role="group" aria-label="Compare the estimate against"><span>Compare with</span><div>${tabs.map(([id,label,valid])=>btn(label,'menu-compare-with','',`id="cm-reference-${id}" data-reference="${id}" aria-pressed="${referenceLabel===label}" ${valid?'':'disabled'}`)).join('')}</div></div>`:'';
 const startingMenu=!current.valid&&reference===projection;
 const reads=startingMenu?`<dl class="cm-starting-metrics">${metrics.map(([label,key,unit])=>`<div><dt>${label}</dt><dd>${clientMenuNumber(projection[key],unit)}</dd></div>`).join('')}</dl>`:
  `<table><thead><tr><th><span class="picker-sr">Estimate measure</span></th><th scope="col">${referenceLabel}</th><th scope="col">Proposed menu</th></tr></thead>
   <tbody>${[['Operating result if all expected new orders ship','profit','money'],...metrics].map(([label,key,unit])=>`<tr><th scope="row">${label}</th><td>${clientMenuNumber(reference?.valid?reference[key]:null,unit)}</td><td>${clientMenuNumber(projection[key],unit)}</td></tr>`).join('')}</tbody></table>`;
 return `<aside class="cm-estimate" id="client-menu-estimate" tabindex="-1"><h3>${title}</h3>
  ${projection.valid?`${menuCapacityNotice(projection.capacity)}<div class="cm-result">${noDeliveries?`<span>Revenue from new deliveries</span><strong>${offerAmount(0)}</strong><small><span>Scheduled overhead</span> · ${offerAmount(projection.overhead)}</small>`:
    `<span>Operating result if all expected new orders ship</span><strong>${offerAmount(projection.profit)}</strong>`}
  ${!noDeliveries&&difference!==null&&!startingMenu?`<small class="cm-difference"><b>${clientMenuDifference(difference)}</b> <span>${referenceLabel==='Current menu'?'vs. current menu':'vs. recommended menu'}</span></small>`:''}</div>
  ${controls}
  ${reads}
  ${!current.valid?`<p class="cm-note">${startingMenu?'Swap an offer to compare it with this starting estimate.':'Your current setup is incomplete. The recommended menu is the starting comparison.'}</p>`:''}
  ${labor.length?`<p class="cm-capacity">${labor.join('<br>')}</p>`:''}
  <p class="cm-note">${Number.isFinite(groupShare)?`<span>${customerGroup}</span> · <span>${groupShare}% of incoming inquiries</span>`:'Your setup uses a single pool of inquiries.'}</p>
  <p class="cm-note"><span>Targeted outreach to this client</span> · ${targetedShare}%</p>
  <details class="cm-method"><summary>Estimate assumptions</summary>
  <p>Each offer is quoted separately. This estimate uses first orders over the run period, before repeat campaigns or delivery delays.</p></details>`:
  `<div class="cm-incomplete"><b>Estimate needs more inputs</b><p>${esc(issueText(projection.issues?.[0])||'Complete the missing setup inputs to see the run estimate.')}</p><p>You can apply this menu and finish your inputs in setup.</p></div>`}
 </aside>`;
}
function clientMenuWorkspace(){
 const b=clientMenuBuilder,profile=b.profile,ids=b.selections.get(profile.id);
 const candidate=clientMenuCandidate(profile,ids,b.retain);
 const defaults=profile.slots.map(slot=>slot.options[0].id);
 const baselineConfig=clientMenuCandidate(profile,defaults,b.retain);
 const unavailable={valid:false,issues:[],days:b.current.days};
 const proposed=candidate.error?unavailable:clientMenuProjection(candidate.config);
 const recommended=ids.every((id,i)=>id===defaults[i])?proposed:baselineConfig.error?unavailable:clientMenuProjection(baselineConfig.config);
 const current=b.current;
 const useCurrent=current.valid&&(b.compare==='current'||!recommended.valid);
 const reference=useCurrent?current:recommended,referenceLabel=useCurrent?'Current menu':'Recommended menu';
 const changed=b.lastSwap;
 const focusChange=changed?.profile===profile.id&&Number.isFinite(changed.from)&&proposed.valid?clientMenuDifference(proposed.profit-changed.from):null;
 const noDeliveries=proposed.capacity?.status==='blocked'||proposed.capacity?.status==='no-orders';
 const result=proposed.valid?offerAmount(noDeliveries?0:proposed.profit):'—';
 const departures=candidate.removed.length-(candidate.pristineRemoved?1:0);
 const reviewLabel=departures?(departures===1?'Review 1 removal':'Review '+departures+' removals'):candidate.error?'Review existing offers':'';
 const reviewLink=reviewLabel?btn(reviewLabel,'menu-review-existing','cm-review-link','aria-controls="cm-existing-title"'):'';
 return `<header class="cm-heading" data-client-sector="${profile.audience}">${btn('<i aria-hidden="true">←</i><span>Change client</span>','menu-client-list','cm-back')}
   <h2 id="dialog-title" tabindex="-1">${esc(profile.name)}</h2><p>${esc(profile.description)}</p></header>
  <div class="cm-scroll" id="client-menu-scroll"><div class="cm-layout"><section class="cm-menu" aria-label="Starter menu">
   <div class="cm-menu-heading"><h3>Starter menu</h3><span>3 complementary offers</span></div>
   ${clientMenuSlots(profile,ids,candidate,proposed)}${clientMenuReview(candidate)}</section>
   ${candidate.error?`<aside class="cm-estimate" id="client-menu-estimate" tabindex="-1"><h3>Run estimate</h3><p class="cm-incomplete">${esc(candidate.error)}</p></aside>`:clientMenuEstimate(proposed,reference,referenceLabel,current,current.valid&&recommended.valid,recommended,candidate.config)}
  </div></div>
  <footer class="cm-footer"><div class="cm-feedback" aria-live="polite" aria-atomic="true">
   ${candidate.error?`<span>${esc(candidate.error)}</span>`:focusChange!==null?`<span>Last swap</span> <b>${focusChange}</b> <span>if all expected new orders ship</span>`:candidate.changed?'<span>Ready to apply to your setup</span>':'<span>This menu matches your setup.</span>'}${reviewLink}</div>
   <button type="button" class="cm-mobile-estimate" data-action="menu-view-estimate"><span>${noDeliveries?'Revenue from new deliveries':'If all expected new orders ship'}</span><strong>${result}</strong><i aria-hidden="true">↗</i></button>
   <div class="cm-actions">${btn('Cancel','close')}${btn('Apply menu','apply-client-menu','primary',`id="apply-client-menu" ${candidate.error||!candidate.changed?'disabled':''}`)}</div></footer>`;
}
function renderClientMenu(focusId,keepPosition=false){
 const b=clientMenuBuilder;
 if(!b||b.draft!==draft)return;
 const html=b.picking?clientMenuClientList():clientMenuWorkspace();
 const shell=document.querySelector('#modal .client-menu-builder');
 if(!shell?.matches?.('.client-menu-builder')){modal('<div class="client-menu-builder">'+html+'</div>',focusId);return;}
 const top=keepPosition?$('#client-menu-scroll').scrollTop:0;
 shell.innerHTML=QQI18n.html(html);
 $('#client-menu-scroll').scrollTop=top;
 const target=focusId&&document.getElementById(focusId);
 if(target){target.focus({preventScroll:true});if(focusId.startsWith('cm-client-')||focusId.startsWith('cm-swap-'))target.scrollIntoView({block:'nearest',inline:'nearest'});}
}

function starterOffers(id,missingOnly=false){
 const present=new Set(missingOnly?draft.services.map(catalogPackageId):[]);
 const offers=QQServiceCatalog.starterServices(id).filter(s=>!present.has(catalogPackageId(s)));
 if(!draft.customerMix)for(const service of offers)service.audience='all';
 return offers;
}
function starterDialog(){
 const cards=QQServiceCatalog.BUNDLES.map(bundle=>{
  const offers=starterOffers(bundle.id),missing=starterOffers(bundle.id,true).length;
  const add=btn(missing?'Add missing offers':'All offers already in menu','add-starter','soft',`data-id="${esc(bundle.id)}"${missing?'':' disabled'}`);
  const replace=btn('Replace offerings…','review-starter','small',`data-id="${esc(bundle.id)}"`);
  return `<article class="catalog-card"><h3>${esc(bundle.name)}</h3><p>${esc(bundle.note||bundle.description||'')}</p><ul>${offers.map(s=>`<li>${serviceName(s)} · ${clientMenuFee(s)} · ${s.weight}%</li>`).join('')}</ul><div class="actions">${add}${replace}</div></article>`;
 });
 modal(`<h2 id="dialog-title">Start with a focused service mix</h2><p>Replace your mix to use the suggested weights, or add missing offers at 0% and set their weights later.</p><div class="starter-grid">${cards.join('')}</div><div class="actions">${btn('Close','close')}</div>`);
}
const inquiryShare=value=>QQ.round(value*100)+'%';

function serviceEditor(s,i,row,standalone){
 const path=key=>'services.'+i+'.'+key;
 const input=(label,key,options={})=>field(label,key,options.text?serviceCopy(s,key):s[key],{...options,path:path(key)});
 const estimate=row||standaloneServiceEstimate(s);
 const unit=estimate?.perProject;
 const routes=estimate?.fulfillmentOptions;
 const basis=key=>serviceInputBasis(s,key);
 const priceLabel=s.fulfillment?'Managed-print price':'Client price';
 const title=s.name.trim()?serviceName(s):'New service';
 const summary=`<summary id="offer-edit-${s.id}"><span class="offer-heading"><strong>${title}</strong>${s.deliverable||s.fulfillment?.managedShare===0?`<span>${offerDeliveryScope(s)}</span>`:''}</span><span class="offer-rate">${s.fulfillment?offerPrintFees(s):s.price==null?'Set price':offerAmount(s.price)}</span><span class="offer-edit-label"><span class="when-closed">Edit</span><span class="when-open">Close</span></span><span class="disclosure-chevron" aria-hidden="true"></span></summary>`;
 const supplierMode=s.supplierMode||(s.print>0?'print':'none');
 const supplier=s.fulfillment?'':field('Print supplier','supplierMode',supplierMode,{path:path('supplierMode'),options:[...(s.supplierMode==='choose'?[['choose','Choose a route…']]:[]),['none','No supplier purchase'],['print','We arrange printing']]});
 const costField=s.fulfillment||supplierMode==='print'?input('Printing + shipping cost','print',{step:0.01,suffix:'$ / batch',help:basis('print')+' · total for one project, including any freight.'}):'';
 const quoteFacts=s.spec?.printQuantity?`<p class="helper"><b>Published comparison · original package</b> · ${esc(s.spec.printCostBasis)}</p>`:'';
 const fields=`<div class="formgrid service-basics">
  ${input('Service name','name',{text:true,placeholder:'e.g. Menu design'})}${input(priceLabel,'price',{step:.01,suffix:'$ / project',help:s.price==null?'':basis('price')})}
  ${input('What the client receives','deliverable',{text:true,multiline:true,maxlength:500,placeholder:'e.g. A two-page menu and one revision',help:'Describe one priced unit, including its scope.'})}</div>`;
 const workFields=`<div class="formgrid offer-work-hours">${input('Production time per project','hours',{max:500,step:.25,suffix:'hours',help:(s.hours==null?'':'<span>'+basis('hours')+'</span> · ')+'<span>Include revisions. Paid at the designer rate in People.</span>'})}
  ${input('Your review work per project','review',{max:100,step:.25,suffix:'hours',help:s.review==null?'':basis('review')})}</div>`;
 const delivery=`<div class="formgrid">${supplier}${costField}</div>${serviceFulfillment(s,i,routes)}${quoteFacts}`;
 const margin=unit?`<div class="offer-unit-result"><div><strong>After direct costs</strong><small>Per project, before your time and overhead.</small></div><b>${offerAmount(unit.contribution)}</b></div>`:'';
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
  <div><span>Design capacity</span><b>${Number.isFinite(row.designCapacityShare)?pct(row.designCapacityShare):'No design time is available.'}</b></div><div><span>Your service capacity</span><b>${Number.isFinite(row.ownerCapacityShare)?pct(row.ownerCapacityShare):'No owner time remains for project work.'}</b></div></div></details>`:'';
 const more=`${advanced}${economics}${totals}${evidenceControls('service',s.id)}
  <div class="service-actions">${btn('Compare prices','price-experiment','soft',`data-index="${i}" ${unit?'':'disabled'}`)}${btn('Duplicate','duplicate','small',`data-index="${i}"`)}</div>`;
 if(standalone){
  return `<article class="first-offer" data-render-key="offer-${s.id}">
   <section class="input-section"><h2>Scope and price</h2>${fields}</section>
   <section class="input-section"><h2>Delivery time and costs</h2>${workFields}${delivery}${margin}</section>
   ${advancedBlock('service-'+s.id,'Service options and estimates',more)}</article>`;
 }
 const weight=s.weight==null?'Set inquiry weight':s.weight===0?'Draft only':QQ.round(s.weight)+'% inquiry weight';
 const meter=`<span class="offer-weight-track" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,s.weight||0))}%"></i></span>`;
 const tools=`<div class="offer-card-tools">${btn(meter+'<span>'+weight+'</span>','edit-inquiry-weight','offer-weight',`data-index="${i}" aria-label="Edit inquiry weight for ${title}"`)}
  ${s.weight===0?btn('Include in simulation','include-offer','offer-include',`data-id="${s.id}"`):''}${canFinishOfferLater(i)?btn('Finish later','park-offer','offer-include',`data-id="${s.id}"`):''}${draft.services.length>1?btn('Remove','remove-service','offer-remove',`data-id="${s.id}" aria-label="Remove ${title} from draft"`):'<small>Keep one service in the draft.</small>'}</div>`;
 return `<article class="offer-card" data-render-key="offer-${s.id}"><details class="service-editor" ${setupMode==='guided'?'name="offer-editors"':''} data-disclosure="service-${s.id}" ${i===expandedService?'open':''}>${summary}<div class="service-fields">${fields}${workFields}${margin}
  ${advancedBlock('delivery-'+s.id,'Print and supplier costs',delivery)}
  ${advancedBlock('service-'+s.id,'Service options and estimates',more)}
  </div></details>${tools}</article>`;
}

let editedMixOffer=null;
function weightsAround(offer){
 if(!offer||!draft.services.includes(offer)||!Number.isFinite(offer.weight)||offer.weight<0||offer.weight>100)return null;
 const others=draft.services.filter(s=>s!==offer);
 if(others.some(s=>!Number.isFinite(s.weight)||s.weight<0||s.weight>100))return null;
 const remaining=QQ.round(100-offer.weight);
 const active=others.filter(s=>s.weight>0).length;
 if(!active||(remaining>0&&Math.round(remaining*100)<active))return null;
 return allocatedOfferWeights(others,new Set(),remaining);
}
function inquiryMix(rows,estimate){
 const total=QQ.round(draft.services.reduce((a,s)=>a+(s.weight||0),0)),gap=QQ.round(100-total);
 const included=draft.services.filter(s=>s.weight!==0);
 const status=gap>0?gap+'% left to assign':gap<0?Math.abs(gap)+'% over allocation':'Weights total 100%';
 const groups={all:'All businesses',food:'Food businesses',retail:'Retail businesses',services:'Local services'};
 const recipients=[];
 const items=draft.services.map((s,i)=>{
  const row=rows.get(s.id),title=s.name.trim()?serviceName(s):'New service';
  const share=row?inquiryShare(row.effectiveShare):s.weight===0?'0%':null;
  const canFill=gap!==0&&(s.weight??0)+gap>=0&&(s.weight??0)+gap<=100;
  if(canFill)recipients.push(`<option value="${i}">${title}</option>`);
  const rebalance=gap&&s===editedMixOffer&&weightsAround(s)?btn('Keep this weight and rebalance the others','rebalance-other-weights','small',`data-id="${s.id}"`):'';
  return `<div class="inquiry-row" role="group" aria-labelledby="mix-label-${s.id}" data-render-key="mix-${s.id}"><div><strong id="mix-label-${s.id}">${title}</strong><small>${groups[s.audience||'all']}${share?' · '+share+' of all new inquiries':''}</small>${rebalance}</div>
   ${field('Inquiry weight','weight',s.weight,{path:'services.'+i+'.weight',max:100,step:.01,suffix:'%'})}
   </div>`;
 }).join('');
 return `<details class="inquiry-mix" data-disclosure="setup-advanced-mix" ${gap||setupMode==='analyst'?'open':''}><summary><strong>Inquiry mix</strong><span class="mix-status ${gap?'negative':''}" id="mix-status" role="status">${status}</span><span class="disclosure-chevron" aria-hidden="true"></span></summary>
  <div class="mix-body"><p class="helper">Give more weight to services you expect people to ask for more often. Use 0% to leave a service out.</p>${items}
  ${recipients.length?`<div class="mix-correction"><label for="mix-recipient">${gap>0?'Assign remaining weight to':'Remove excess weight from'}</label><select id="mix-recipient">${recipients.join('')}</select>${btn('Apply','assign-remainder','small')}</div>`:''}
  <div class="mix-tools">${btn('Balance shares equally','balance','small',included.length?'':'disabled')}${btn('Load a preset mix','service-starters','small','aria-haspopup="dialog"')}<small>Weights apply within each customer group.</small></div>
  ${included.length<draft.services.length?'<p class="helper">To add a service at 0% to the split, choose Include in simulation.</p>':''}
  ${estimate?.unservedShare>0?`<p class="helper">${inquiryShare(estimate.unservedShare)} of new inquiries have no matching offer.</p>`:''}</div></details>`;
}
function serviceInputs(){
 const estimate=draftValidationIssues().length?null:getDraftEstimate();
 const rows=new Map((estimate?.services||[]).map(r=>[r.id,r]));
 const singleCustom=draft.services.length===1&&draft.services[0].customOffer===true;
 const analyst=setupMode==='analyst'&&!singleCustom?`<details class="guided-options" data-disclosure="compare-offer-economics"><summary>Compare offer economics</summary><div class="tablewrap service-overview" tabindex="0" role="region" aria-label="Offer economics"><table><thead><tr><th>Offering</th><th>Expected price</th><th>Designer cost</th><th>Expected supplier</th><th>Expected contribution</th><th>After owner time</th><th>All new inquiries</th></tr></thead><tbody>${draft.services.map((s,i)=>{
  const row=rows.get(s.id),u=row?.perProject||serviceUnit(s);
  return `<tr><th>${btn((s.name?serviceName(s):'New service'),'inspect-service','table-link',`data-index="${i}"`)}</th><td>${offerAmount(u?.price)}</td><td>${offerAmount(u?.designerCost)}</td><td>${offerAmount(u?.printCost)}</td><td>${offerAmount(u?.contribution)}</td><td>${offerAmount(u?.afterOwnerTime)}</td><td>${row?inquiryShare(row.effectiveShare):'—'}</td></tr>`;
 }).join('')}</tbody></table></div></details>`:'';
 const cards=draft.services.map((service,index)=>serviceEditor(service,index,rows.get(service.id),singleCustom&&service.weight!==0));
 const removed=removedServices.get(draft.services)?.at(-1);
 if(removed){
  const service=removed.service;
  const gap=QQ.round(100-draft.services.reduce((sum,s)=>sum+(s.weight||0),0));
  const fix=gap?btn(gap>0?gap+'% left to assign':Math.abs(gap)+'% over allocation','inspect-mix','small'):'';
  const undo=btn('Undo','restore-service','small','id="undo-service-removal"'+(draft.services.length>=20?' disabled title="This draft already contains 20 services."':''));
  const dismiss=btn('Dismiss','dismiss-service-removal','small');
  cards.splice(removed.index,0,`<div class="offer-recovery" data-render-key="removed-${service.id}"><span role="status">Removed from draft · <b>${service.name.trim()?serviceName(service):'New service'}</b></span>${fix}${undo}${dismiss}</div>`);
 }
 const starter=pristineOfferStarter(draft);
 const menu=currentClientMenu(draft,true);
 const invitation=`<section class="client-menu-invitation" aria-labelledby="client-menu-entry-title"><div>
  <h2 id="client-menu-entry-title">${menu?esc(menu.profile.name):'Find offers that work together'}</h2>
  <p>${menu?'Revisit your client menu and compare a swap against your current estimate.':'Choose the client you want to serve. See which three offers fit, then try a swap before you commit.'}</p></div>
  <div class="client-menu-entry-actions">${btn(menu?'Adjust client menu':'Choose a client','build-client-menu',menu?'soft':'primary','id="client-menu-entry" aria-haspopup="dialog"')}
  ${menu?btn('<span>Plan client outreach</span> <i aria-hidden="true">→</i>','setup-step','primary','data-step="1" id="plan-client-outreach"'):''}</div></section>`;
 const toolbar=`<div class="offer-menu-heading"><h2>Your service menu</h2><div class="offer-menu-actions">${btn('Choose offerings','browse-offers','soft','id="choose-offerings" aria-haspopup="dialog"')}
  ${btn(starter?'Write my own offer':'Add custom offer',starter?'write-first-offer':'add-blank-service','',draft.services.length>=20?'disabled':'')}</div></div>
  ${draft.services.length>=20?'<small>This draft already contains 20 services.</small>':''}`;
 const undoNotice=serviceUndoDraft?`<div class="offer-recovery">
  <span role="status">Service mix updated.</span>
  ${btn('Undo service mix','undo-services','small')}
  ${btn('Dismiss','dismiss-service-undo','small')}
 </div>`:'';
 return `${invitation}${toolbar}${undoNotice}${cards.join('')}${inquiryMix(rows,estimate)}${analyst}`;
}
function decisionMetric(label,value){
 return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}
function demandProfile(id){return QQServiceCatalog.CLIENT_MENUS.find(profile=>profile.id===id);}
function demandAudience(){
 const menu=currentClientMenu(draft,true),saved=demandProfile(draft.clientDemand?.profileId);
 return {menu,profile:saved||menu?.profile,saved};
}
function demandMenuLink(hasMenu){
 return btn('<span>'+(hasMenu?'View client menu':'Choose a client menu')+'</span><i aria-hidden="true">→</i>','build-client-menu','demand-menu-link','id="demand-menu-entry" aria-haspopup="dialog"');
}
function demandReach(profile,menu){
 const guide=QQServiceCatalog.clientReach(profile.id);
 if(!guide)return '';
 const linked=menu?.profile.id===profile.id;
 return `<section class="demand-reach" aria-labelledby="demand-reach-title"><h3 id="demand-reach-title">Ways to reach this client</h3>
  ${guide.channels.map((channel,i)=>{
   const service=linked&&draft.services.find(s=>s.id===menu.serviceIds[channel.slot]);
   return `<details class="reach-channel" data-disclosure="reach-${esc(profile.id)}-${esc(channel.id)}" ${i===0?'open':''}><summary><span>${esc(channel.title)}</span><i class="disclosure-chevron" aria-hidden="true"></i></summary>
    <div class="reach-content"><p class="reach-where">${esc(channel.where)}</p><p>${esc(channel.approach)}</p>${service?`<p class="reach-offer"><span>Offer from your menu</span><strong>${serviceName(service)}</strong></p>`:''}</div></details>`;
  }).join('')}
  <aside class="reach-measure"><strong>What counts as an inquiry?</strong><p>${esc(guide.measurement)}</p></aside></section>`;
}
// Counts are a scratch calculation from the user's records. Only the chosen
// percentage belongs to the scenario and travels into a run or backup.
const clientDemandCalculations=new WeakMap();
function demandCalculation(profileId){
 let saved=clientDemandCalculations.get(draft);
 if(saved?.profileId!==profileId){
  saved={profileId,target:'',total:'',error:'',applied:''};clientDemandCalculations.set(draft,saved);
 }
 return saved;
}
function demandRatioCalculator(profileId){
 const calc=demandCalculation(profileId);
 const field=(key,label,min)=>`<label for="client-demand-count-${key}"><span>${label}</span><input id="client-demand-count-${key}" type="number" inputmode="numeric" step="1" min="${min}" value="${esc(calc[key])}" aria-describedby="client-demand-count-feedback"></label>`;
 return `<details class="demand-ratio" data-disclosure="demand-ratio-${esc(profileId)}"><summary>Calculate from my inquiry counts</summary><div><p>Use qualified inquiries recorded over the same period.</p>
  <div class="demand-ratio-fields">${field('target','From targeted outreach to this client',0)}${field('total','Total inquiries',1)}${btn('Use these counts','apply-client-demand-counts','small')}</div>
  <p id="client-demand-count-feedback" role="status" class="${calc.error?'demand-error':''}">${esc(calc.error||calc.applied)}</p></div></details>`;
}
function demandMixEffect(config,counts,issues,share,quantity){
 const estimate=issues.length?null:getDraftEstimate();
 if(!share)return {estimate,delta:estimate?0:null,note:'At 0%, all inquiries follow your usual customer mix.'};
 const untargeted={...config};delete untargeted.clientDemand;
 const base=estimate?QQ.estimate(untargeted):null;
 const delta=base?QQ.round(QQ.round(estimate.profit)-QQ.round(base.profit)):null;
 const before=base?base.leads-base.unserved:QQ.estimateDemand(untargeted,issues).matched;
 if(Number.isFinite(before)&&Number.isFinite(counts.matched)&&QQ.round(before)!==QQ.round(counts.matched)){
  return {estimate,delta,note:`At the same inquiry volume, matching inquiries change from ${quantity(before)} to ${quantity(counts.matched)}.`};
 }
 if(!base)return {estimate,delta,note:'Complete the setup inputs to see the operating result.'};
 if(!delta)return {estimate,delta,note:'At this share, the total matching inquiries and operating result stay the same.'};
 const designer=e=>e.hours*config.designerRate;
 const supplier=e=>e.expense-designer(e)-QQ.round(config.overhead)*config.months;
 const costs=[
  {label:'Potential revenue',before:base.revenue,after:estimate.revenue},
  {label:'Designer labor',before:designer(base),after:designer(estimate)},
  {label:'Supplier charges',before:supplier(base),after:supplier(estimate)}
 ];
 const largest=costs.sort((a,b)=>Math.abs(b.after-b.before)-Math.abs(a.after-a.before))[0];
 const note=`<span>With the same number of matching inquiries, the largest change is in</span> <strong>${largest.label}</strong> · ${offerAmount(QQ.round(largest.before))} → ${offerAmount(QQ.round(largest.after))}.`;
 return {estimate,delta,note};
}
function clientDemandPanel(config,counts,issues,days,quantity){
 const {menu,profile,saved}=demandAudience();
 if(!profile)return `<section id="client-demand-panel" class="demand-prompt"><div><h2>Who do you want to reach?</h2><p>Choose a client menu to plan outreach and estimate how many inquiries it could bring.</p></div>${demandMenuLink(false)}</section>`;
 const forecast=QQ.clientDemandForecast(config,issues),share=forecast.share??0;
 const shareInvalid=forecast.share===null;
 const enteredShare=shareInvalid?(config.clientDemand?.share??''):share;
 const original=rerunFieldOrigin('clientDemand.share');
 const originalHelp=original?' client-demand-origin':'';
 const switchTarget=menu&&saved&&saved.id!==menu.profile.id;
 const effect=demandMixEffect(config,counts,issues,share,quantity);
 const capacity=effect.estimate&&QQ.deliveryCapacity(config,effect.estimate);
 const noDeliveries=capacity?.status==='blocked'||capacity?.status==='no-orders';
 const metric=(key,label,value)=>`<div><dt>${label}</dt><dd data-client-demand-metric="${key}">${value}</dd></div>`;
 const figure=value=>Number.isFinite(value)?quantity(value):'—';
 return `<section id="client-demand-panel" class="demand-audience" aria-labelledby="demand-audience-title">
 <header class="demand-audience-identity" data-client-sector="${esc(profile.audience)}"><div><p>${menu?.profile.id===profile.id?'Your client from Offers':'Your target client'}</p><h2 id="demand-audience-title">${esc(profile.name)}</h2>${demandMenuLink(!!menu)}</div></header>
 ${switchTarget?`<div class="demand-target-switch"><p><span>Your Offers menu now serves</span> <strong>${esc(menu.profile.name)}</strong><span>. Your inquiry share still belongs to</span> <strong>${esc(profile.name)}</strong>.</p>${btn('Move this share to the new client','switch-client-demand','small')}</div>`:''}
 <div class="demand-audience-body">
 <section class="demand-share" aria-labelledby="demand-share-title"><h3 id="demand-share-title">How much demand will you target?</h3><p id="client-demand-help">Set the share of all new inquiries you expect from outreach to this client. The rest follow your usual customer mix.</p>
 <div class="demand-share-controls"><div class="demand-range"><input type="range" id="client-demand-range" min="0" max="100" step="1" value="${share}" aria-label="Target share of new inquiries" aria-valuetext="${share}%" aria-describedby="client-demand-help${originalHelp}"><div aria-hidden="true"><span>0%</span><span>100%</span></div></div>
 <label for="client-demand-share" class="demand-share-value"><span class="sr-only">Target share of new inquiries</span><input type="number" inputmode="numeric" id="client-demand-share" data-input="clientDemand.share" min="0" max="100" step="1" value="${esc(enteredShare)}"${shareInvalid?' aria-invalid="true"':''} aria-describedby="client-demand-help client-demand-error${originalHelp}"><span aria-hidden="true">%</span></label></div>
 ${original?`<small class="rerun-origin" id="client-demand-origin"><span>Original value</span> <b>${esc(original)}</b></small>`:''}<p id="client-demand-error" class="demand-error" role="status">${shareInvalid?'Enter a whole percentage from 0 to 100.':''}</p>${demandRatioCalculator(profile.id)}</section>
 <section class="demand-client-estimate" aria-labelledby="demand-forecast-title"><h3 id="demand-forecast-title">${days?'Expected over '+days+' days':'Expected over the run'}</h3>
 <dl class="demand-split">${metric('targeted','From targeted outreach',figure(forecast.targeted))}${metric('other','Other inquiries',figure(forecast.other))}${metric('matched','Target inquiries with an offer',figure(forecast.matched))}${metric('orders','First orders from outreach',figure(forecast.orders))}</dl>
 ${menuCapacityNotice(capacity)}
 <dl class="demand-result">${noDeliveries?metric('result','Revenue from new deliveries',offerAmount(0))+metric('overhead','Scheduled overhead',offerAmount(QQ.round(config.overhead)*config.months)):
  metric('result','Operating result if all expected new orders ship',effect.estimate?setupResultAmount(effect.estimate.profit):'—')+metric('delta','Change from 0% targeted',clientMenuDifference(effect.delta))}</dl>
 ${noDeliveries?'':`<p data-client-demand-driver>${effect.note}</p>`}
 ${saved&&share>0?btn('Reset targeted share','clear-client-demand','demand-reset'):''}</section>
 ${demandReach(profile,menu)}</div></section>`;
}
function customerInputs(){
 const c=draft,fixed=c.acquisition==='preset';
 const config=draftRunConfig(),issues=draftValidationIssues(),counts=QQ.estimateDemand(config,issues);
 const days=validRunLength(c.months)?30*c.months:null;
 const quantity=value=>value===null?'—':value>0&&value<.01?'&lt;0.01':QQ.round(value).toLocaleString(QQI18n.language);
 const readout=(label,value)=>decisionMetric(label,quantity(value));
 const source=field('How do inquiries arrive?','acquisition',c.acquisition,{options:[['sales','Estimate from outreach'],['preset','Enter monthly inquiries']]});
 // An explicit result link can point to the other demand method in a revised draft.
 const show=(path,active)=>active||setupRepairPath===path;
 const observed=show('inquiries',fixed)?field('New inquiries each month','inquiries',c.inquiries,{max:500,suffix:'requests',step:0.01,help:fixed?'Use your typical number of qualified inquiries per 30 days.':'Used only in fixed-volume mode.'}):'';
 const outreach=show('outreachHours',!fixed)?field('Your weekly outreach time','outreachHours',c.outreachHours,{max:120,step:0.5,suffix:'hours / week',help:fixed?'Used only in outreach mode.':'Uses part of your total weekly availability.'}):'';
 const response=show('leadsPerHour',!fixed)?field('Inquiries per outreach hour','leadsPerHour',c.leadsPerHour,{max:100,step:0.01,suffix:'requests',help:inputBasis('leadsPerHour')+(fixed?' · Used only in outreach mode.':' · Divide recorded qualified inquiries by outreach hours.')}):'';
 let volumeNote='';
 if(!days)volumeNote='Choose a run length to estimate inquiry volume.';
 else if(counts.leads===null)volumeNote=fixed?'Enter monthly inquiries to estimate demand.':'Enter weekly availability, outreach time and inquiries per hour to estimate demand.';
 else if(!fixed)volumeNote=`${quantity(Math.min(c.outreachHours,c.ownerHours))} outreach hours/week × ${quantity(QQ.workingDays(days)/5)} working weeks × ${quantity(c.leadsPerHour)} inquiries/hour.`;
 const limit=!fixed&&counts.leads!==null&&c.outreachHours>c.ownerHours?`<p>Your available hours limit the time you can spend on outreach. ${btn('Edit available time','setup-step','small','data-step="2"')}</p>`:'';
 const intake=`<section class="assumption-section"><h2>Plan incoming inquiries</h2><p class="decision-note">Use a typical monthly volume from your records or estimate it from time spent on outreach.</p>
  <div class="formgrid essentials-grid demand-inputs">${source}${observed}${outreach}${response}</div>
  <div class="decision-readout" data-demand="volume"><dl>${readout('Average new inquiries / month',counts.leads===null?null:counts.leads/c.months)}${readout(days?'New inquiries over '+days+' days':'New inquiries over the run',counts.leads)}</dl>${volumeNote?`<p>${volumeNote}</p>`:''}${limit}</div></section>`;

 let orderNote;
 if(counts.leads===null)orderNote='Complete the inquiry volume to estimate new orders.';
 else if(counts.matched===null)orderNote='Check service weights and customer mix to estimate how many inquiries match an offer.';
 else if(counts.orders===null)orderNote='Enter your quote acceptance rate to estimate new orders.';
 else if(counts.leads===0)orderNote='These inputs generate zero new inquiries.';
 else if(counts.unserved>0)orderNote=`${quantity(counts.unserved)} inquiries have no matching offer.`;
 else orderNote='Every inquiry matches an offer in this setup.';
 const acceptedShare=counts.matched>0&&counts.orders!==null?`<meter class="decision-meter" aria-label="Share of matching inquiries accepted" min="0" max="100" value="${QQ.round(c.conversion*100)}"></meter>`:'';
 const acceptance=`<section class="assumption-section"><h2>Estimate accepted quotes</h2><p class="decision-note">Choose the share of matching inquiries that turn into a first order.</p>
  <div class="formgrid essentials-grid">${field('Quotes that become paid work','conversion',c.conversion,{max:100,percent:true,suffix:'%',help:inputBasis('conversion')+' · Accepted quotes divided by all decided quotes.'})}</div>
  <div class="decision-readout" data-demand="orders"><dl>${readout('Inquiries with a matching offer',counts.matched)}${readout(days?'Expected new orders over '+days+' days':'Expected new orders',counts.orders)}</dl>${acceptedShare}<p>${orderNote}</p></div></section>`;
 const advanced=`<p class="decision-note">The simulation adds returning work after delivery and payment. The estimate above counts first orders.</p>
  <div class="formgrid">${field('Returning campaign quotes accepted','retention',c.retention,{max:100,percent:true,suffix:'%',help:'Each follow-up campaign is a fresh decision. A declined campaign skips one cycle; offers continue within the year. Legacy subscriptions use this as renewal likelihood.'})}${field('One-off clients who order again','repeat',c.repeat,{max:100,percent:true,suffix:'%',help:'Returning requests arrive 30 days after final payment.'})}</div>${customerMixInputs()}`;
 return clientDemandPanel(config,counts,issues,days,quantity)+intake+acceptance+advancedBlock('customers','Repeat business and customer mix',advanced)+evidenceControls('demand');
}
function customerMixInputs(){
 const mix=draft.customerMix,targeted=draft.clientDemand?.share>0;
 const mixLabel=targeted?'Customer mix for other inquiries':'Who contacts you';
 if(!mix&&targeted)return `<section class="customer-profiles"><h3>${mixLabel}</h3><p class="helper">Other inquiries use generic customers. Add business types to give those clients a mix of identities.</p>${btn('Use varied businesses','enable-profiles','small')}</section>`;
 if(!mix)return `<section class="customer-profiles"><h3>Business types</h3><p class="helper">This earlier run uses generic customers. Add business types to future inquiries without changing existing projects.</p>${btn('Use varied businesses','enable-profiles','small')}</section>`;
 const total=Object.values(mix).reduce((n,v)=>n+v,0);
 return `<section class="customer-profiles"><h3>${mixLabel}</h3><p class="helper">${targeted?'These weights divide the inquiries left after your target share. Each business can request the offers available to its group.':'Share of inquiries by business type. New clients get a specific identity and context; returning clients keep theirs. Offerings targeted to another group cannot serve that inquiry.'}</p><div class="formgrid">${field('Restaurants and food shops','food',mix.food,{path:'customerMix.food',max:100,suffix:'%',step:1})}${field('Retail shops','retail',mix.retail,{path:'customerMix.retail',max:100,suffix:'%',step:1})}${field('Local services','services',mix.services,{path:'customerMix.services',max:100,suffix:'%',step:1})}${field('Workflow variation','profileStrength',draft.profileStrength,{options:[['0','Names and contexts only'],['0.5','Moderate differences'],['1','Stronger differences']],help:'Illustrative differences in work, approval time and return frequency.'})}${field('Focus on one niche','focusType',draft.focusType||'none',{options:[['none','Even mix within groups'],...QQ.CUSTOMER_TYPES.map(t=>[t.id,t.label])],help:'The selected type receives half of its group’s inquiries.'})}</div><p class="helper">Total: <b id="customer-mix-total">${Number.isFinite(total)?total:'—'}%</b> / 100%. The catalog includes ${QQ.CUSTOMER_TYPES.length} types, including bakeries, tea shops, noodle shops, cafés, restaurants and food trucks. These patterns are modeling assumptions, not measured local rates.</p></section>`;
}
function teamInputs(){
 const c=draft,issues=draftValidationIssues();
 const valid=(...paths)=>paths.every(path=>Number.isFinite(c[path])&&!issues.some(issue=>issue.path===path));
 const capacity=QQ.workCapacity(c),fixed=c.acquisition==='preset';
 const ownerKnown=valid('ownerHours')&&(fixed||c.acquisition==='sales'&&(c.ownerHours===0||valid('outreachHours')));
 const clientWeek=ownerKnown?(c.ownerHours===0?0:capacity.owner*5):null;
 const outreachWeek=fixed?0:ownerKnown?Math.max(0,c.ownerHours-clientWeek):null;
 const noDesignTime=(valid('designers')&&c.designers===0)||(valid('designerHours')&&c.designerHours===0);
 const designWeek=noDesignTime?0:valid('designers','designerHours')?capacity.design*5:null;
 const estimate=issues.length?QQ.estimateWorkload(draftRunConfig()):getDraftEstimate();
 const weeks=estimate.workdays/5;
 const clientNeed=estimate.owner===null?null:(estimate.owner-estimate.outreach)/weeks;
 const designNeed=estimate.hours===null?null:estimate.hours/weeks;
 const designCost=estimate.hours===0?0:estimate.hours!==null&&valid('designerRate')?estimate.hours*c.designerRate:null;
 const hours=value=>Number.isFinite(value)?effortHours(value)+' h':'—';
 const ownerHelp=fixed?'With fixed inquiry volume, the simulator assigns your full working week to client work.':'The simulator reserves outreach time from Demand first. The remaining hours cover quotes, reviews and delivery.';
 const outreachMeter=ownerKnown&&c.ownerHours>0&&!fixed?`<meter class="decision-meter" aria-label="Weekly owner time reserved for outreach" min="0" max="${c.ownerHours}" value="${outreachWeek}"></meter>`:'';
 const ownerNotes=[];
 if(clientNeed!==null){
  if(valid('ownerTarget'))ownerNotes.push(`<span>Value of owner time for the expected workload</span> <strong>${offerAmount(estimate.owner*c.ownerTarget)}</strong>`);
  if(clientWeek>0&&clientNeed>clientWeek+1e-8)ownerNotes.push('Average client work exceeds your available hours.');
 }
 if(clientWeek===0&&(clientNeed===null||clientNeed>0))ownerNotes.push('Jobs that need your time for a quote, review or handoff must wait.');
 const designNotes=[];
 if(designNeed!==null){
  if(designWeek!==null){
   const gap=designNeed-designWeek,short=gap>1e-8;
   designNotes.push(`<span>${short?'Additional design time needed / week':'Spare design time / week'}</span> <strong>${hours(Math.abs(gap)<1e-8?0:Math.abs(gap))}</strong>`);
   if(short&&designWeek>0)designNotes.push('Expected design work exceeds team capacity. Some work can remain unfinished.');
  }
  if(designWeek!==0)designNotes.push('Designers are paid for hours worked, including work on unfinished jobs.');
 }else{
  if(designWeek>0&&valid('designerRate'))designNotes.push(`<span>One week at full design capacity would cost</span> <strong>${offerAmount(designWeek*c.designerRate)}</strong>.`);
  designNotes.push('The workload and labor estimate appear when the remaining inputs are ready.');
 }
 if(designWeek===0&&(designNeed===null||designNeed>0))designNotes.push('Jobs that require design hours must wait for a designer.');
 const owner=`<section class="assumption-section"><h2>Set your working week</h2><p class="decision-note">${ownerHelp}</p>
  <div class="formgrid essentials-grid">${field('Your available time','ownerHours',c.ownerHours,{max:120,step:.5,suffix:'hours / week'})}
  ${field('Value of your time','ownerTarget',c.ownerTarget,{max:1000,step:.01,suffix:'$ / hour',help:'Used to calculate the result after owner time.'})}</div>
  <div class="decision-readout"><dl>${decisionMetric('Outreach / week',hours(outreachWeek))}${decisionMetric('Available for clients / week',hours(clientWeek))}${decisionMetric('Average client work / week',hours(clientNeed))}</dl>${outreachMeter}${ownerNotes.map(n=>`<p>${n}</p>`).join('')}</div></section>`;
 const design=`<section class="assumption-section"><h2>Staff the design work</h2><p class="decision-note">Each project can use one designer’s hours per day. Additional designers can work on other projects in parallel.</p>
  <div class="formgrid essentials-grid">${field('Number of designers','designers',c.designers,{max:50,suffix:'people'})}
  ${field('Availability of each designer','designerHours',c.designerHours,{max:120,step:.5,suffix:'hours / week'})}
  ${field('Designer labor cost','designerRate',c.designerRate,{max:1000,step:.01,suffix:'$ / hour',help:inputBasis('designerRate')})}</div>
  <div class="decision-readout"><dl>${decisionMetric('Design capacity / week',hours(designWeek))}${decisionMetric('Average design work / week',hours(designNeed))}
  ${designWeek===0?decisionMetric('Design labor charged at zero capacity',offerAmount(0)):''}
  ${decisionMetric('Design cost if all expected orders ship',offerAmount(designCost))}</dl>${designNotes.map(n=>`<p>${n}</p>`).join('')}</div></section>`;
 const advanced=`<div class="formgrid">${field('Your work to prepare a quote','quoteHours',c.quoteHours,{max:24,step:.1,suffix:'hours / inquiry'})}
  ${field('Your work to deliver a project','deliveryHours',c.deliveryHours,{max:24,step:.1,suffix:'hours / delivery'})}
  ${field('When work is waiting, handle…','priority',c.priority,{options:[['deadline','Earliest deadline first'],['fifo','Oldest project first']],help:'Sets the order in which waiting projects receive time during the run.'})}</div>`;
 return owner+design+advancedBlock('team','Owner-time and queue assumptions',advanced)+evidenceControls('people');
}
// Keep partial cash previews usable while unrelated offers or inputs are unfinished.
function cashOfferRoutes(service){
 const printed=QQ.round(service.print)>0;
 const price=Number.isFinite(service.price)?QQ.round(service.price):null;
 if(!service.fulfillment)return [{printed,price}];
 const {managedShare,designOnlyPrice}=service.fulfillment;
 const routes=[];
 if(managedShare>0)routes.push({printed,price,label:'Managed printing'});
 if(managedShare<1)routes.push({printed:false,price:Number.isFinite(designOnlyPrice)?QQ.round(designOnlyPrice):null,label:'Files only'});
 return routes;
}
function cashInputs(){
 const c=draft,issues=draftValidationIssues();
 const valid=key=>Number.isFinite(c[key])&&!issues.some(issue=>issue.path===key);
 const dayCount=n=>n===1?'1 day':n+' days';
 const charge=valid('overhead')?QQ.round(c.overhead):null;
 const remaining=charge!==null&&valid('startingCash')?QQ.round(QQ.round(c.startingCash)-charge):null;
 const shortfall=remaining!==null&&remaining<0;
 const total=charge!==null&&validRunLength(c.months)?QQ.round(charge*c.months):null;
 const leadDays=c.leadDays===undefined?QQ.DEFAULT.leadDays:c.leadDays;
 const validLead=Number.isInteger(leadDays)&&!issues.some(issue=>issue.path==='leadDays');
 const mix=QQ.effectiveCustomerMix(c);
 const eligible=c.services.filter(service=>service.weight>0&&mix&&(!service.audience||service.audience==='all'||mix.unsegmented>0||mix[service.audience]>0));
 const example=eligible.find(service=>{
  const path='services.'+c.services.indexOf(service);
  return Number.isFinite(service.price)&&!issues.some(i=>i.path===path+'.price'||i.path===path+'.weight'||i.path.startsWith(path+'.fulfillment'));
 });
 const depositValid=valid('deposit');
 const legacyDeposit=editingRerun&&(state.depositRoundingFromDay??state.day+1)>1;
 const quoteDeposit=price=>QQ.depositAmount(price,c.deposit,legacyDeposit);
 const paymentShare=f=>QQ.round(f*100)+'%';
 const routes=example?cashOfferRoutes(example):[];
 const paymentsFor=(price,label)=>{
  const priced=Number.isFinite(price),paid=priced&&depositValid?quoteDeposit(price):null;
  const balance=paid===null?null:QQ.round(price-paid);
  const dueLabel=balance===0||c.deposit===1||!valid('paymentDays')?'Final balance':c.paymentDays===0?'Due on delivery':c.paymentDays===1?'Due 1 day after delivery':'Due '+c.paymentDays+' days after delivery';
  const upfrontValue=priced?offerAmount(paid):depositValid?paymentShare(c.deposit):'—';
  const finalValue=priced?offerAmount(balance):depositValid?paymentShare(1-c.deposit):'—';
  const name=example?.name?.trim()?serviceName(example):'Your service';
  const basis=priced?`<span>One accepted quote</span> · <strong>${name}</strong>${label?' · <span>'+label+'</span>':''} · ${offerAmount(price)}`:
   !mix?'Complete the customer mix to see an example quote.':eligible.length?'Add an offer price to see the payment amounts.':'No active offer matches these buyers.';
  return `<p>${basis}</p><dl>${decisionMetric('At acceptance',upfrontValue)}${decisionMetric(dueLabel,finalValue)}</dl>`;
 };
 const splitMeter=depositValid?`<meter class="decision-meter" aria-label="Deposit share" min="0" max="100" value="${QQ.round(c.deposit*100)}">${paymentShare(c.deposit)}</meter>`:'';
 let dueNote='';
 if(c.deposit===1||depositValid&&routes.length&&routes.every(route=>Number.isFinite(route.price)&&route.price===quoteDeposit(route.price)))dueNote='No balance remains after acceptance.';
 else if(!depositValid||!validLead||!valid('paymentDays'))dueNote='Enter the deposit, delivery target and payment terms to see the collection schedule.';
 else{
  const days=leadDays+c.paymentDays;
  dueNote=days===1?'If delivered on the target date, any balance is due 1 day after acceptance.':'If delivered on the target date, any balance is due '+days+' days after acceptance.';
 }
 const baseWait=validLead&&valid('approvalDays')?leadDays-c.approvalDays:null;
 const printWindow=baseWait!==null&&valid('printDays')?baseWait-c.printDays:null;
 const windowText=value=>value===null?'—':value<0?dayCount(-value)+' short':dayCount(value);
 const activeRoutes=eligible.filter(service=>Number.isFinite(service.print)).flatMap(cashOfferRoutes);
 const windows=[];
 if(activeRoutes.some(route=>!route.printed))windows.push(decisionMetric('Files-only work window',windowText(baseWait)));
 if(activeRoutes.some(route=>route.printed))windows.push(decisionMetric('Printed work window',windowText(printWindow)));
 const reserve=`<section class="assumption-section"><h2>Opening cash and overhead</h2><div class="formgrid essentials-grid">
  ${field('Starting cash','startingCash',c.startingCash,{max:1e8,step:.01,suffix:'$',help:state.day&&!editingRerun?'Requires a new run. Use Add funding for current cash.':'Cash available on day 0.'})}
  ${field('Software and other overhead','overhead',c.overhead,{max:1e7,step:.01,suffix:'$ / month'})}</div>
  <div class="decision-readout"><dl>${decisionMetric(shortfall?'Needed for the first charge':'Cash after the first charge',offerAmount(remaining===null?null:Math.abs(remaining)))}${decisionMetric('Overhead over the run',offerAmount(total))}</dl>
  <p>${shortfall?'A new run pauses on day 1 until this shortfall is funded.':'In a new run, overhead is charged on day 1 and every 30 days thereafter, before new work starts.'}</p></div></section>`;
 const payments=`<section class="assumption-section"><h2>Client payment terms</h2><p class="decision-note">Choose how much to collect at acceptance and when the rest falls due. The run records revenue on delivery.</p><div class="formgrid essentials-grid">
  ${field('Client deposit','deposit',c.deposit,{percent:true,max:100,suffix:'%'})}
  ${field('Final balance due after delivery','paymentDays',c.paymentDays,{max:90,suffix:'calendar days'})}</div>
  <div class="decision-readout">${routes.length?routes.map(route=>paymentsFor(route.price,route.label)).join(''):paymentsFor(null,'')}${splitMeter}</div></section>`;
 const delivery=`<section class="assumption-section"><h2>Delivery promise</h2><div class="formgrid essentials-grid">
  ${field('Promise delivery within','leadDays',leadDays,{min:1,max:180,suffix:'calendar days',help:'Measured from acceptance of the quote.'})}
  ${field('Client approval time','approvalDays',c.approvalDays,{max:30,suffix:'calendar days'})}
  ${field('Print supplier turnaround','printDays',c.printDays,{max:90,suffix:'calendar days'})}</div>
  <div class="decision-readout">${windows.length?`<p>Time left for design, review and delivery after the base waits.</p><dl>${windows.join('')}</dl>`:''}<p><span>${dueNote}</span> <span>Queues and delays can shift the actual dates.</span></p></div></section>`;
 const uncertainty={...QQ.DEFAULT.uncertainty,...c.uncertainty};
 const variability=`<p class="decision-note">${c.realism?Object.values(uncertainty).filter(Boolean).length+' routine uncertainties and '+Object.values(c.disruptions||{}).filter(Boolean).length+' disruption types enabled.':'Project uncertainty is off.'}</p>
  ${checkbox('Enable uncertain project outcomes','realism',c.realism)}<div class="uncertainty-grid">${[['complexity','Different design complexity'],['revisions','Extra client revision'],['approval','Slower client approval'],['supplier','Print supplier delays'],['payment','Late final payments']].map(([k,l])=>checkbox(l,'uncertainty.'+k,uncertainty[k])).join('')}</div>
  ${field('Workload seed','seed',c.seed,{max:1e9,help:'Same seed + same settings = same replay. Changing it requires a new run.'})}${disruptionInputs()}`;
 return `${reserve}${payments}${delivery}${field('Scenario name','name',c.name,{text:true})}${advancedBlock('cash','Uncertainty and repeatability',variability)}${evidenceControls('cash')}`;
}
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
 if(parts[0]==='clientDemand')return {step:1,path:'clientDemand.share',selector:'#client-demand-share',label:'target client inquiry share'};
 if(path==='months')return {step:stepIndex,path,label:'run length'};
 if(path.startsWith('disruptionRates.')||path.startsWith('uncertainty.')||path.startsWith('disruptions.'))return {step:3,path,label:DISRUPTION_LABELS[parts[1]]||'uncertainty setting'};
 const label=path==='leadsPerHour'?'inquiries per outreach hour':DIFF_LABELS[path]?.toLowerCase();
 if(!label)return null;
 if(['acquisition','outreachHours','profileStrength','focusType'].includes(path)||Object.hasOwn(QQ.ASSUMPTION_FIELDS.demand,path))return {step:1,path,label};
 if(['designers','ownerTarget','priority'].includes(path)||Object.hasOwn(QQ.ASSUMPTION_FIELDS.people,path))return {step:2,path,label};
 return {step:3,path,label};
}
function fixSetupIssue(path){
 const issues=draftValidationIssues();
 const target=setupIssueTarget(path?issues.find(issue=>issue.path===path):issues[0]);
 if(!target)return;
 setupRepairPath=target.path;stepIndex=target.step;render();
 revealSetupField(target);
}
function revealSetupField(target){
 const field=document.querySelector(target.selector||`[data-input="${target.path}"]`);
 if(!field)return false;
 for(let detail=field.closest?.('details');detail;detail=detail.parentElement?.closest('details'))detail.open=true;
 if(editingRerun){
  field.focus({preventScroll:true});
  field.scrollIntoView?.({block:'center',behavior:'instant'});
 }else field.focus();
 return true;
}
function focusRevisedAssumption(){
 let path=rerunDraft.path;
 if(rerunDraft.serviceId){
  const index=draft.services.findIndex(service=>service.id===rerunDraft.serviceId);
  if(index<0)return false;
  path=path.replace(/^services\.\d+\./,'services.'+index+'.');
 }
 const target=setupIssueTarget({path});
 return target?.step===stepIndex&&revealSetupField(target);
}
function focusResultAssumption(){
 if(!rerunDraft)return false;
 const links=[...document.querySelectorAll('#root [data-action="test-assumption"]')].filter(el=>rerunDraft.serviceId?
  el.dataset.serviceId===rerunDraft.serviceId&&el.dataset.path.split('.').slice(2).join('.')===rerunDraft.path.split('.').slice(2).join('.'):
  el.dataset.path===rerunDraft.path);
 const target=links.find(el=>(el.dataset.variantInput!==undefined)===Boolean(rerunDraft.returnTab)&&
  (Number(el.dataset.resultsMonth)||null)===(rerunDraft.resultsMonth||null))||links[0];
 if(!target)return false;
 target.focus({preventScroll:true});
 target.scrollIntoView?.({block:'center',behavior:'instant'});
 return true;
}
function rerunTarget({path,serviceId,comparisonId,keptVersion}){
 return {path,...(serviceId!==undefined?{serviceId}:{}),...(comparisonId?{comparisonId,keptVersion}:{})};
}
function rerunStartingConfig(run){
 return QQ.replayConfigAt(run,0);
}
function completedVariantPair(){
 return rerunLink?.run===state?archivedVariantPair({state,rerunLink}):null;
}
function archivedVariantPair(workspace){
 const revised=workspace?.state,link=workspace?.rerunLink,original=link?.original;
 if(!revised||!original||original.day!==original.config.months*30||revised.day!==revised.config.months*30)return null;
 return {original,revised,...rerunTarget(link)};
}
function canSimulateRerun(){
 if(!editingRerun||rerunDraft?.run!==state||draftValidationIssues().length)return false;
 return configDiff(rerunStartingConfig(state),draftRunConfig()).some(change=>modeledAssumption(change.path));
}
function modeledAssumption(path){
 if(path==='name'||path.startsWith('assumptionRecords.'))return false;
 return !/^services\..+?\.(?:name|deliverable|filesOnlyScope|spec(?:\..+)?)$/.test(path);
}
function parkRerunEditor(){
 if(!editingRerun)return;
 rerunDraft.draft=draft;draft=ordinaryDraft;ordinaryDraft=null;editingRerun=false;
 serviceUndoDraft=null;presetUndoDraft=null;setupRepairPath=null;expandedService=-1;recipeOpen=false;
}
function activateRerunEditor(step){
 if(!editingRerun){
  ordinaryDraft=draft;draft=rerunDraft.draft;editingRerun=true;
  serviceUndoDraft=null;presetUndoDraft=null;recipeOpen=false;
 }
 view='setup';stepIndex=step;setupRepairPath=rerunDraft.path;
 if(rerunDraft.serviceId)expandedService=draft.services.findIndex(s=>s.id===rerunDraft.serviceId);
}
function editResultAssumption(path,serviceId,fromComparison=false,resultsMonth){
 if(view!=='finances'||state.day!==state.config.months*30||!/^\w+(?:\.\w+)*$/.test(path||''))return;
 const target=setupIssueTarget({path});
 if(!target?.path)return;
 const inputs=rerunDraft?.run===state?rerunDraft.draft:draftWithClientMenu(rerunStartingConfig(state),draft);
 if(path==='clientDemand.share'&&!inputs.clientDemand){
  const previous=rerunLink?.run===state?rerunStartingConfig(rerunLink.original).clientDemand:null;
  const id=currentClientMenu(inputs)?.profile.id||previous?.profileId;
  if(id)inputs.clientDemand={profileId:id,share:0};
 }
 if(path.startsWith('services.')){
  const index=inputs.services.findIndex(service=>service.id===serviceId);
  if(index<0){toast('This service has been removed from the revised setup.');return;}
  path=path.replace(/^services\.\d+\./,'services.'+index+'.');
  target.path=path;
 }
 stop();
 rerunDraft={run:state,draft:inputs,path,...(fromComparison?{returnTab:analyticsTab}:{}),...(resultsMonth?{resultsMonth}:{}),...(serviceId?{serviceId}:{})};
 setupEntryPath=null;setupReturnView=null;newScenarioRequested=false;
 activateRerunEditor(target.step);save();render();revealSetupField(target);
}
function simulateRevisedRun(){
 if(!canSimulateRerun())return;
 const nextRun=QQ.freshComparison(draftRunConfig(),state),source=currentWorkspace(),nextArchives=[...archives];
 // Build and size-check the entire change before replacing any live state.
 // The source workspace retains its ordinary unfinished draft and former pair.
 delete source.rerunDraft;
 MEIQQWorkspace.archive(nextArchives,source);
 const nextSaved=[...saved],nextInfo=checkpointInfo.map(info=>({...info}));
 MEIQQWorkspace.checkpoint({state,saved:nextSaved,checkpointInfo:nextInfo},'manual');
 const next={state:nextRun,saved:nextSaved,checkpointInfo:nextInfo,draft:QQ.clone(draft),recoveryFiles:source.recoveryFiles,
  setupOrigin,rerunLink:{original:state,...rerunTarget(rerunDraft)}};
 MEIQQWorkspace.serialize(next,nextArchives);
 stop();installWorkspace({...next,archives:nextArchives});selection=null;inspectorTrail=[];
 advanceRun('simulate');
}
function newComparisonId(){
 const used=new Set(archives.map(item=>item.workspace.rerunLink?.comparisonId));
 if(rerunLink?.comparisonId)used.add(rerunLink.comparisonId);
 const nonce=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const prefix='comparison-'+nonce;
 let id=prefix;
 for(let suffix=2;used.has(id);suffix++)id=prefix+'-'+suffix;
 return id;
}
async function keepRunSetup(version){
 const pair=completedVariantPair();
 if(savingKeptSetup||savedComparisonReader||view!=='finances'||!pair||(version!=='original'&&version!=='revised'))return;
 if(loading||recoveryRaw!==null||primaryReadFailed)throw Error('Resolve the current simulator save before starting another scenario.');
 const source=currentWorkspace(),nextArchives=[...archives];
 // A different decision about a previously kept pair has its own record.
 if(pair.keptVersion&&pair.keptVersion!==version)MEIQQWorkspace.archive(nextArchives,source);
 const id=pair.keptVersion===version?pair.comparisonId:newComparisonId();
 const chosen=QQ.fresh(rerunStartingConfig(pair[version]));
 source.rerunLink={...source.rerunLink,comparisonId:id,keptVersion:version};
 MEIQQWorkspace.archive(nextArchives,source);
 const next={state:chosen,draft:draftWithClientMenu(chosen.config,source.draft),saved,checkpointInfo,setupOrigin,
  recoveryFiles:source.recoveryFiles,keptComparisonId:id};
 // Keep the live comparison until the complete replacement is durable.
 // A queued autosave of the prior screen must not supersede this write.
 const text=MEIQQWorkspace.serialize(next,nextArchives);
 const hash=routeReady?window.location.hash:null,root=document.querySelector('#root');
 clearTimeout(saveTimer);saveTimer=null;savePreparationError=null;
 savingKeptSetup=true;root.inert=true;root.setAttribute?.('aria-busy','true');
 try{
  writeWorkspaceText(text);
  if(saveWriter&&!await saveWriter.flush())throw Error(storeReason||'The comparison could not be saved. Your results are still open.');
  if(!saveWriter)persistenceStatus('saved');
 }catch(error){
  if(!storeError)persistenceStatus('error',error);
  throw error;
 }finally{
  savingKeptSetup=false;root.inert=false;root.removeAttribute?.('aria-busy');
  if(storeError&&hash!==null&&window.location.hash!==hash)readWorkspaceRoute();
 }
 const navigated=hash!==null&&window.location.hash!==hash;
 if(!navigated){
  try{rememberKeptComparison(id);}catch{/* A history limit cannot undo a committed setup choice. */}
 }
 stop();
 installWorkspace({...next,archives:nextArchives});
 selection=null;inspectorTrail=[];setupRepairPath=null;disclosureState.clear();
 expandedService=pair.serviceId?draft.services.findIndex(service=>service.id===pair.serviceId):-1;
 const target=setupIssueTarget({path:pair.path});
 stepIndex=lastEditorStep=target?.step??0;
 if(navigated)readWorkspaceRoute();
 else{render();focusViewHeading();}
}
function workloadRow(label,used,available){const ratio=available?used/available:used?Infinity:0;return `<div class="capacity-row"><div><b>${label}</b><span>${num(used)} / ${num(available)} h</span></div><div class="track"><div class="fill ${ratio>1?'warn':''}" style="width:${Math.min(100,ratio*100)}%"></div></div><small>${available===0&&used>0?'No capacity available':ratio>1?num(used-available)+' hours over capacity':num(Math.max(0,available-used))+' hours spare'}</small></div>`;}
function getDraftEstimate(){
 if(setupCache?.estimate)return setupCache.estimate;
 const estimate=QQ.estimate(draftRunConfig());
 if(setupCache)setupCache.estimate=estimate;
 return estimate;
}
function offerReadiness(issues){
 if(stepIndex!==0||draft.services.length!==1||!draft.services[0].customOffer||!draft.services[0].weight)return '';
 const actions={name:'Enter a service name',price:'Enter a client price',deliverable:'Describe the deliverable',hours:'Enter production hours',review:'Enter review hours',supplierMode:'Choose a print route',print:'Enter printing cost'};
 const groups=[['Scope and price',['name','price','deliverable']],['Project hours',['hours','review']],['Supplier costs',['supplierMode','print']]];
 const rows=groups.map(([label,keys])=>{
  const missing=keys.map(key=>issues.find(issue=>issue.path==='services.0.'+key)).find(Boolean);
  return {label,missing};
 });
 const complete=rows.filter(row=>!row.missing).length;
 if(complete===rows.length)return '';
 return `<p class="estimate-intro">Complete these details to calculate the result for your service.</p>
 <ol class="offer-readiness">${rows.map(({label,missing},i)=>`<li class="${missing?'pending':'ready'}"><span class="readiness-mark" aria-hidden="true">${missing?i+1:'✓'}</span><div><strong>${label}</strong>${missing?btn('<span>'+actions[missing.path.split('.').at(-1)]+'</span> <i aria-hidden="true">→</i>','fix-setup-issue','readiness-link',`data-path="${esc(missing.path)}"`):'<small>Ready</small>'}</div></li>`).join('')}</ol>`;
}
const DELIVERY_CAPACITY_HEADINGS={
 blocked:'No new jobs can ship.',partial:'Some offers cannot ship within this run.',
 overloaded:'Expected work exceeds available hours.','no-orders':'No new orders are expected.'
};
function deliveryCapacityReasons(capacity){
 const reasons=[];
 if(capacity.blockedBy.design)reasons.push('No design time is available.');
 if(capacity.blockedBy.owner)reasons.push('No owner time remains for project work.');
 if(capacity.ownerTimeOffers.length)reasons.push('Even one of the affected jobs needs more owner time than is available during the run.');
 if(capacity.timingOffers.length)reasons.push('Even starting on day one, the required work and waiting time extend past the end of the run.');
 if(capacity.overlongOffers.length)reasons.push('An individual job can use only one designer at a time. Even starting on day one, the affected offers need more design time than the run allows.');
 return reasons;
}
function draftSummary(){
 const issues=draftValidationIssues();
 const issue=issues.find(item=>setupIssueTarget(item)?.step===stepIndex)||issues[0];
 const runDays=validRunLength(draft.months)?draft.months*30:null;
 const heading=`<h2>${runDays?runDays+'-day estimate':'Run estimate'}</h2>`;
 const row=(label,value)=>`<div class="minirow"><span>${label}</span><b>${value}</b></div>`;
 const monthlyOverhead=Number.isFinite(draft.overhead)&&!issues.some(item=>item.path==='overhead')?QQ.round(draft.overhead):null;
 const overheadRow=runDays&&monthlyOverhead!==null?row('Scheduled overhead for the full run',offerAmount(monthlyOverhead*draft.months)):'';
 if(issue){
  const target=setupIssueTarget(issue),readiness=offerReadiness(issues);
  const fix=target?btn('Fix '+esc(target.label),'fix-setup-issue','soft small',`data-path="${esc(issue.path)}"`):'';
  const location=target&&target.step!==stepIndex?`<strong>${steps[target.step]}</strong>`:'';
  return `<section class="panel summary-card estimate-pending">${heading}${readiness||`<div class="estimate-issue">${location}<p>${esc(issueText(issue))}</p>${fix}</div>`}${overheadRow}</section>`;
 }
 const config=draftRunConfig(),e=getDraftEstimate(),changed=dirty();
 const capacity=QQ.deliveryCapacity(config,e),limited=capacity.status!=='fits';
 const cashGap=QQ.round(monthlyOverhead-QQ.round(config.startingCash));
 const cashNotice=cashGap>0?`<p class="banner warn" role="status"><span>A new run pauses before the first overhead charge.</span> <span>Funding needed</span> <strong>${offerAmount(cashGap)}</strong></p>`:'';
 const detail=`<p class="preview-basis">Days 1–${e.days} · ${e.workdays} working days. Assumes delivery of all expected new orders and excludes queues, disruptions and returning work.</p>
  ${row('Expected new inquiries',num(e.leads))}${row('Expected new orders',num(e.orders))}${e.unserved>0?`<p class="preview-unserved">${num(e.unserved)} inquiries have no matching offer.</p>`:''}<p class="preview-basis">Owner time valued at ${offerAmount(draft.ownerTarget)}/hour</p>${workloadRow('Your time',e.owner,e.ownerCapacity)}${workloadRow('Design team',e.hours,e.designCapacity)}${row('Potential revenue',offerAmount(e.revenue))}`;
 const runAction=state.day===0?btn('Simulate '+runDays+' days','simulate','primary full'):changed?btn('Review & apply changes','review','primary full'):state.day>=runDays?btn('View results','review-latest-results','primary full'):btn('Resume run','finish-run','primary full');
 // A step compares like periods. Keep the first complete estimate while its
 // inputs are edited, including when a field is temporarily empty.
 let comparison=null;
 if(stepIndex>0){
  if(!firstStepEstimate||firstStepEstimate.draft!==draft||firstStepEstimate.step!==stepIndex||firstStepEstimate.days!==e.days)firstStepEstimate={draft,step:stepIndex,days:e.days,profit:e.profit,surplus:e.surplus};
  const change=key=>QQ.round(QQ.round(e[key])-QQ.round(firstStepEstimate[key]));
  const profit=change('profit'),surplus=change('surplus');
  if(profit||surplus)comparison={profit,surplus};
 }
 const metric=(label,key)=>{
  const change=comparison?.[key];
  const delta=comparison?`<span class="estimate-delta${change>0?' gain':change<0?' loss':''}">${change>0?'+':''}${offerAmount(change)}</span>`:'';
  return `<div><small>${label}</small><strong class="${e[key]<0?'negative':''}"${key==='profit'&&!limited?' data-run-estimate="profit"':''}>${setupResultAmount(e[key])}</strong>${delta}</div>`;
 };
 const fullDelivery=`<p class="estimate-intro">If all expected new orders ship</p><div class="summary-numbers step-estimate">${metric('Operating result','profit')}${metric('After owner time','surplus')}</div>
 ${comparison?'<p class="comparison-basis">Changes from the first estimate on this step.</p>':''}`;
 let delivery='';
 if(limited){
  const lines=deliveryCapacityReasons(capacity);
  if(capacity.status==='no-orders')lines.push(!e.leads?'No inquiries are expected from this setup.':!config.conversion?'Quote acceptance is set to 0%.':'Incoming inquiries have no matching offer.');
  delivery=`<p class="banner warn" role="status"><strong>${DELIVERY_CAPACITY_HEADINGS[capacity.status]}</strong> ${lines.map(line=>`<span>${line}</span>`).join(' ')}</p>`;
  if(capacity.overlongOffers.length)delivery+=row('Maximum design hours for one job in this run',effortHours(capacity.perJobDesignHours)+' h');
  if(capacity.status==='partial'){
   const names=e.services.filter(service=>capacity.blockedOffers.includes(service.id)).map(service=>esc(service.name));
   delivery+=row('Offers that cannot ship',names.join(', '));
  }
  if(capacity.status==='blocked'||capacity.status==='no-orders')delivery+=row('Revenue from new deliveries',offerAmount(0));
  else{
   if(capacity.designShortfall>0.00001)delivery+=row('Additional design hours needed',effortHours(capacity.designShortfall)+' h');
   if(capacity.ownerShortfall>0.00001)delivery+=row('Additional owner hours needed',effortHours(capacity.ownerShortfall)+' h');
  }
 }
 return `<section class="panel summary-card estimate-ready">${heading}${delivery}${cashNotice}
 ${limited?'':fullDelivery}${overheadRow}
 <details class="estimate-detail" data-disclosure="setup-advanced-estimate-${stepIndex}" ${setupMode==='analyst'?'open':''}><summary>What goes into this estimate?</summary>${limited?fullDelivery:''}${detail}</details>
 ${editingRerun?'':`<div class="estimate-actions">${runAction}${changed&&state.day===0?btn('Review setup only','review','ghost full'):''}</div>`}</section>`;
}
function updatePreview(){scheduleSave();}
function workflowPath(){return `<div class="handoff-strip" aria-label="Project handoffs">${Object.entries(WORKFLOW_STAGES).filter(([,v])=>v.order>0&&v.order<8).sort((a,b)=>a[1].order-b[1].order).map(([id,v])=>btn(`<span>${v.order}</span><b>${esc(v.label)}</b><small>${esc(v.handoff)}</small>`,'stage','handoff-step '+(selection?.type==='stage'&&selection.id===id?'selected':''),`data-id="${id}"`)).join('')}</div>`;}
function focusSetupStep(){
 const tab=document.querySelector('#setup-tab-'+stepIndex);
 tab?.focus({preventScroll:true});
 const tabs=tab?.parentElement;
 if(!tabs)return;
 const bounds=tabs.getBoundingClientRect();
 // Restore the sky header after using a footer on a long form. With expanded
 // options or a short viewport, keep the new step and its tabs in view.
 if(window.scrollY+bounds.bottom<=window.innerHeight-140){
  if(window.scrollY)window.scrollTo({top:0,behavior:'instant'});
 }else if(bounds.top<12||bounds.bottom>window.innerHeight*.65){
  tabs.scrollIntoView({block:'start',behavior:'instant'});
 }
}
function selectSetupStep(next){
 stop();setupRepairPath=null;stepIndex=next;
 render();focusSetupStep();
}
function focusViewHeading(){
 const title=document.querySelector('main h1')||document.querySelector('#studio-heading');
 if(title){title.setAttribute?.('tabindex','-1');title.focus({preventScroll:true});}window.scrollTo?.({top:0,behavior:'instant'});
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
 const done=state.day>=state.config.months*30;
 let latest='',project;
 for(const event of state.events){
  project=event.project&&state.projects.find(p=>p.id===event.project);
  const text=project?QQ.projectEventText(project,event.text,receivedDeposit(project)):event.text;
  if(text!==null){latest=`Day ${event.day} · ${esc(text)}`;break;}
 }
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
  const completed=p.price===0?'The work was delivered. No payment was required.':'The work was delivered and fully paid.';
  return {status,actor:'',reason:stage==='complete'?completed:'The client declined this quote.',next:'',urgent:false};
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
function setupResultAmount(value){
 return (value>0?'+':'')+offerAmount(QQ.round(value));
}
function launchCapacityNote(status){
 if(status==='blocked')return 'Under the opening assumptions, none of the eligible first orders could finish within the run.';
 if(status==='partial')return 'Under the opening assumptions, some types of work could not finish within the run.';
 if(status==='overloaded')return 'The expected first orders needed more hours than the opening team had available.';
 return '';
}
function runPassageView(m){
 const end=state.config.months*30,estimate=runPassage.estimate;
 const original=rerunLink?.run===state?rerunLink.original:null;
 const originalClose=original?.history[Math.min(state.day,original.day)-1];
 const status=state.blocked?'Cash decision needed':running?'Running':'Paused';
 const accepted=state.projects.reduce((count,p)=>count+(p.accepted!==undefined?1:0),0);
 const field=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
 const capacityNote=launchCapacityNote(estimate?.deliveryStatus);
 const estimateLabel=estimate?.basis==='reconstructed'?'Reconstructed estimate':'If all expected new orders ship';
 const toggleLabel=state.blocked?'Resolve shortfall':running?'Pause simulation':'Continue simulation';
 return `<section class="run-passage" aria-labelledby="sim-heading" data-render-key="run-passage">
  <header class="passage-heading"><p>${scenarioName(state.config.name)}</p><h1 id="sim-heading" tabindex="-1">${original?'Revised '+end+'-day run':'Your '+end+'-day run'}</h1></header>
  <div class="passage-layout"><section class="passage-progress" aria-labelledby="passage-day">
   <div class="passage-position"><h2 id="passage-day">Day ${state.day} of ${end}</h2><span role="status">${status}</span></div>
   <progress value="${state.day}" max="${end}" aria-labelledby="passage-day"></progress>
   <dl class="passage-counts">${field('Accepted quotes',accepted)}${field('Delivered projects',m.delivered)}${field('Cash available',offerAmount(state.cash))}</dl>
   ${state.blocked?`<p class="passage-shortfall"><span>Funding needed</span> <strong>${offerAmount(state.blocked.gap)}</strong> · <span>${esc(state.blocked.note)}</span></p>`:''}
   <div class="passage-actions">${btn(icon(running?'pause':'play')+toggleLabel,'toggle-passage','primary','id="passage-toggle"')}${btn('Inspect run','inspect-run','ghost')}</div>
  </section><section class="passage-estimate" aria-labelledby="passage-result"><h2 id="passage-result">Operating result</h2><dl>
   ${estimate?.deliveryStatus==='blocked'?field('Overhead in the opening plan',offerAmount(estimate.overhead)):estimate?`<div><dt><span>${estimateLabel}</span>${estimate.days!==end?' · <span>'+estimate.days+' days</span>':''}</dt><dd data-run-estimate="profit">${setupResultAmount(estimate.profit)}</dd></div>`:''}
   <div><dt>Result so far</dt><dd${m.profit<0?' class="negative"':''}>${setupResultAmount(m.profit)}</dd></div>
   ${originalClose?field('Original on day '+originalClose.day,setupResultAmount(originalClose.profit)):''}
  </dl>${capacityNote?`<p class="helper">${capacityNote}</p>`:''}</section></div></section>`;
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
function receivedDeposit(project){
 return state.ledger.find(entry=>entry.project===project.id&&entry.type==='receipt'&&entry.note==='Client deposit')?.amount??0;
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
  const terms=p.terms.fulfillment;
  const routes=[];
  if(terms.managedShare>0)routes.push(offerAmount(terms.managedPrice)+' managed');
  if(terms.managedShare<1)routes.push(offerAmount(terms.designOnlyPrice)+' files only');
  diagnosticRows.push(['Customer print choice',terms.mode==='agency-managed'?'We manage printing':'Customer arranges printing'],['Agreed supplier allowance',offerAmount(p.printCost)],['Quoted print options',routes.join(' / ')]);
 }
 if(p.service?.campaign)diagnosticRows.push(['Campaign rhythm',p.service.campaign.cadenceDays===90?'Seasonal · separately quoted':'Monthly · separately quoted']);
 if(workResource(p.stage)){
  diagnosticRows.push(['Pool capacity per working day',effortHours(diagnostic.dailyCapacity)+' h']);
  if(p.stage==='design')diagnosticRows.push(['Daily design limit per job',effortHours(state.config.designerHours/5)+' h']);
  if(diagnostic.queueAheadCount)diagnosticRows.push(['Work ahead',diagnostic.queueAheadCount+' jobs · '+effortHours(diagnostic.queueAheadHours)+' h']);
  if(diagnostic.estimatedWorkdays!==null)diagnosticRows.push(['Estimated time for this stage',diagnostic.estimatedWorkdays+' working days at current capacity']);
 }
 const accepted=p.accepted!==undefined,pending=p.stage==='lost'?'—':'Set at acceptance';
 const paymentLabels={paid:p.delivered?'Paid in full':'Paid in advance',partial:'Deposit received',unpaid:p.delivered?'Awaiting payment':'No deposit collected'};
 const payment=!accepted?'—':p.price===0?'No payment required':paymentLabels[p.paymentStatus];
 const balanceLabel=p.delivered?'Balance owed':p.terms?.paymentDays===0?'Balance on delivery':'Balance after delivery';
 const terms=[['Agreed price',accepted?offerAmount(p.price):pending],['Direct costs',offerAmount(p.cost)],['Cash received',offerAmount(p.paid)],[balanceLabel,accepted?offerAmount(QQ.round(p.price-p.paid)):'—'],['Your hours',num(p.ownerHours)],['Designer hours',num(p.designHours)],['Delivery due',accepted?'Day '+p.due:pending],['Fulfillment',p.fulfillmentStatus==='delivered'?'Delivered':p.stage==='lost'?'Declined':'Open'],['Payment',payment],['Renewal',p.renewalStatus],['Model demand ID',p.demandId]];
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
 const share=p.service.fulfillment?.managedShare;
 const scope=!accepted&&share>0&&share<1?
  `<dl><dt>Managed printing</dt><dd>${offerDeliveryScope(p.service,'agency-managed')}</dd><dt>Files only</dt><dd>${offerDeliveryScope(p.service,'design-only')}</dd></dl>`:
  `<p>${offerDeliveryScope(p.service,p.terms?.fulfillment?.mode)}</p>`;
 const deposit=receivedDeposit(p);
 const timeline=p.log.slice().reverse().map(e=>{
  const text=QQ.projectEventText(p,e.text,deposit);
  return text===null?'':`<div class="event"><small>DAY ${e.day}</small><span>${esc(text)}</span></div>`;
 }).join('');
 return `<div class="panelhead"><div><div class="eyebrow">${esc(p.id)} · ${esc(shortLabels[p.stage])}</div><h2>${esc(p.client)}</h2><small>${serviceName(p.service)}</small></div>${btn(icon('close'),'unselect','ghost small','aria-label="Close details"')}</div><div class="inspectbody">
 <section class="project-next"><h3>${done?'Outcome':'What happens next'}</h3><strong class="attention-status${wait.urgent?' needs-attention':''}">${esc(wait.status)}${wait.actor?' · '+esc(wait.actor):''}</strong><p>${esc(wait.reason)}</p>${wait.next?`<p>${esc(wait.next)}</p>`:''}${nextDayNote?`<p class="helper">${nextDayNote}</p>`:''}${primary}</section>
 ${!state.blocked&&workResource(p.stage)&&p.work[p.stage]>0?replayPromptView(p):''}
 <h3>${accepted?'Agreed deliverable':'Requested deliverable'}</h3>${scope}
 ${controls?`<details class="project-disclosure" data-disclosure="controls-${p.id}"><summary>Project controls</summary><div class="actions">${controls}</div></details>`:''}
 <details class="project-disclosure" data-disclosure="terms-${p.id}"><summary>Scope, timing and costs</summary>${p.clientType?`<p class="client-context"><b>${esc(businessType(p.clientType))}</b> · ${esc(p.brief)} · ${cycle}${p.cycle>1?' · Cycle '+p.cycle:''}</p>`:''}<div class="diagnostic-grid">${diagnosticRows.map(([l,v])=>`<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div><div class="kvs">${terms.map(([l,v])=>`<div><label>${l}</label><strong>${esc(v)}</strong></div>`).join('')}</div><p class="helper">Direct costs exclude overhead and your time. Quote effort locks at intake. Delivery effort and commercial terms lock at acceptance.</p></details>
 <details class="project-disclosure" data-disclosure="timeline-${p.id}"><summary>Project timeline</summary><div class="timeline">${timeline}</div></details></div>`;
}
function projectsView(){return `<div class="project-tools"><label class="search-label">Search client or project<input id="project-search" value="${esc(search)}" placeholder="e.g. Maple or P003"></label><label class="search-label">Show<select id="project-filter">${[['active','Active work'],['all','All projects'],['late','Late deliveries'],['payment','Awaiting payment'],['complete','Completed'],['lost','Declined']].map(([v,n])=>`<option value="${v}" ${filter===v?'selected':''}>${n}</option>`).join('')}</select></label></div><section class="panel" id="project-table">${projectTable()}</section>`;}
function projectTable(){const needle=search.trim().toLowerCase();const ps=state.projects.filter(p=>(!needle||[p.client,p.id,p.service.name,serviceCopy(p.service,'name')].some(x=>x.toLowerCase().includes(needle)))&&(filter==='all'||filter==='active'&&!['lost','complete'].includes(p.stage)||filter==='late'&&p.accepted!==undefined&&!p.delivered&&p.stage!=='lost'&&state.day>p.due||p.stage===filter));return `<div class="tablewrap"><table><thead><tr><th>Client / project</th><th>Business type</th><th>Service</th><th>Stage</th><th>Responsible</th><th>Agreed price</th><th>Delivery due</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${btn(esc(p.client),'project','table-link','data-id="'+p.id+'"')}<small>${p.id}</small></td><td>${p.clientType?esc(businessType(p.clientType)):'Generic'}</td><td>${serviceName(p.service)}</td><td>${shortLabels[p.stage]}</td><td>${stageOwner[p.stage]}</td><td>${p.accepted!==undefined?offerAmount(p.price):'—'}</td><td>${p.accepted!==undefined?'Day '+p.due:'—'}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">No matching projects. Advance the clock or change your filter.</div></td></tr>'}</tbody></table></div>`;}
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
 return `<svg class="chart" viewBox="0 0 650 170" role="img" aria-label="Cash balance from day ${firstDay} to day ${endDay}"><path d="M65 20H630 M65 80H630 M65 140H630" stroke="var(--line)"/><polyline points="${points.map(v=>x(v.day)+','+y(v.cash)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${points.length===1?`<circle cx="${x(firstDay)}" cy="${y(points[0].cash)}" r="3" fill="var(--accent)"/>`:''}<text x="0" y="24" class="axislabel">${offerAmount(hi)}</text><text x="0" y="144" class="axislabel">${offerAmount(lo)}</text><text x="65" y="165" class="axislabel">Day ${firstDay}</text>${endDay!==firstDay?`<text x="575" y="165" class="axislabel">Day ${endDay}</text>`:''}</svg>`;
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
 stop();inspectorTrail=[];selection=null;view='finances';analyticsTab='compare';
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
function savedComparisonArchive(id){
 return id?archives.findLast(entry=>entry.workspace.rerunLink?.comparisonId===id&&archivedVariantPair(entry.workspace)):null;
}
function savedComparisonLibrary(){
 const seen=new Set(),rows=[];
 for(let index=archives.length-1;index>=0;index--){
  const pair=archivedVariantPair(archives[index].workspace);
  if(!pair||pair.comparisonId&&seen.has(pair.comparisonId))continue;
  if(pair.comparisonId)seen.add(pair.comparisonId);
  const changes=configDiff(rerunStartingConfig(pair.original),rerunStartingConfig(pair.revised)).filter(item=>modeledAssumption(item.path));
  const source=pair.serviceId?pair.path.replace(/^services\.\d+\./,'services.'+pair.serviceId+'.'):pair.path;
  const change=changes.find(item=>item.path===source)||changes[0];
  const kept=pair.keptVersion==='original'?'Original setup kept':pair.keptVersion==='revised'?'Revised setup kept':'';
  const detail=change?`<span class="saved-change"><span>${esc(change.label)}</span> <b>${esc(change.before)} → ${esc(change.after)}</b></span>`:'';
  const locator=pair.comparisonId?'data-comparison-id="'+esc(pair.comparisonId)+'"':'data-index="'+index+'"';
  rows.push(`<li><button type="button" class="saved-comparison-row" data-action="open-saved-comparison" ${locator} aria-haspopup="dialog">
   <span><strong>${scenarioName(pair.revised.config.name)}</strong>${detail}</span><span class="saved-comparison-scope"><span>${daySpan(1,Math.min(pair.original.day,pair.revised.day))}</span>${kept?'<span>'+kept+'</span>':''}</span>${icon('arrow')}</button></li>`);
 }
 return rows.length?`<section class="panel padded saved-comparison-library"><h2>Saved comparisons</h2><ul>${rows.join('')}</ul></section>`:'';
}
function presentSavedComparison(pair,entry){
 savedComparisonReader=entry;
 const close=btn(icon('close')+'<span>Close comparison</span>','close','small');
 modal(`<div class="saved-comparison-reader"><header><div><span>Saved comparison</span><h2 id="dialog-title">${scenarioName(pair.revised.config.name)}</h2></div>${close}</header>
  ${variantResultsOverview(pair,{readOnly:true,kept:pair.keptVersion})}</div>`,'saved-variant-result-title');
 if(entry.opener)modalFocus=entry.opener;
}
function openSavedComparisonFromArchive({comparisonId,index}){
 const archive=comparisonId?savedComparisonArchive(comparisonId):/^\d+$/.test(index)?archives[Number(index)]:null;
 const pair=archive&&archivedVariantPair(archive.workspace);
 if(!pair)throw Error('This saved comparison is unavailable.');
 const entry={id:pair.comparisonId,route:workspaceRoute(),tab:analyticsTab,opener:actionFocus||focusKey(document.activeElement)};
 if(routeReady&&entry.id)window.history.pushState({...window.history.state,savedComparison:entry},'','#'+entry.route+'?comparison='+entry.id);
 presentSavedComparison(pair,entry);
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
 const revision=compare&&completedVariantPair();
 const latest=revision?(base?btn('View original and revised runs','review-latest-results','soft'):variantResultsOverview(revision)):'';
 const guided=savedComparisonLibrary()+(compare?latest+verdict+replayComparisonCard()+savedExperiments():'');
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
function aboutView(){return `<div class="two-col"><section class="panel padded"><div class="eyebrow">SIMULATION MODEL ${state.modelVersion||1}</div><h2>Start with one experiment</h2><ol><li>Set service prices, hours, inquiry shares and available capacity.</li><li>Review the draft preview, then apply the setup.</li><li>Step a day, finish a month or simulate the selected horizon.</li><li>Inspect a waiting project and select Test one change to replay its month.</li><li>Compare the remaining backlog and earnings, then save the comparison if you want to keep it.</li></ol><h2>What the numbers mean</h2><p>Inquiries are stable external-demand identities derived from the workload seed, arrival day and arrival index. Capacity can change delivery and renewal timing, but it does not reroll unrelated leads.</p><p>The quote acceptance setting controls how often a new buyer says yes. When a buyer accepts, the studio collects the agreed deposit, which can be zero. The job earns its fee on delivery. Any remaining balance follows the payment terms.</p><p>Setup shows what first orders could earn if they all ship. It checks available working hours and the time needed for approval and print. Run the simulation to see which jobs actually finish and when customers pay.</p><p>Operating result is delivered revenue less incurred costs, including unfinished work. Historical results value each month’s owner hours at its closing hourly target. Run-to-date detail also values every hour at today’s target. Both measures leave cash unchanged.</p></section><section class="panel padded"><h2>Model 2 daily order</h2><p>Each day processes due client collections, monthly overhead, confirmed repeat cycles, new external demand, outreach, then scheduled work. A failed payment rolls back the proposed day atomically.</p><p>Zero-duration transitions may continue on the same day under a bounded loop. Real work still consumes weekday capacity; genuine client and supplier waits remain calendar delays.</p><p>Owner capacity is shared across quotes, review and delivery. Design capacity is pooled across projects, but one project can use at most one designer’s daily availability. Multiple projects can proceed in parallel when multiple designers are available.</p><p>Quote effort locks when an inquiry arrives. Price, service scope, delivery effort, payment terms, approval time, print time and delivery promise lock when the quote is accepted. Agreed deadlines cannot be changed before acceptance.</p><p>Monthly and seasonal campaigns each need a new quote. The customer can decline each one. A campaign that is still in production or awaiting payment can miss its next scheduled date. Existing paid-cycle subscriptions can renew after delivery and payment. For offers with a print choice, the accepted quote records who handles printing. When the customer arranges printing, the studio delivers the files and incurs no supplier charge.</p><h2>Business profiles</h2><p>New workspaces draw from illustrative food, retail and local-service business types. Customer mix, niche focus and workflow variation affect work, approval and repeat behavior; targeted offerings serve only matching groups.</p><h2>Prototype limits</h2><p>Published design and print prices are frozen comparables. Package prices, work estimates, demand, customer printing preferences and disruption rates are modeled assumptions with documented derivations, not measured results for your business. Named staff, supplier comparisons, borrowing and native Windows/Mac installers remain future work. Backups include model and workload identities.</p></section></div>`;}
function clock(){
 const end=state.day>=state.config.months*30, disabled=end?'disabled':'';
 const runLabel=running?'Pause':firstExamplePending()?'Run restaurant example':'Run';
 return `<footer class="clock run-clock"><div class="clockday"><b>Day ${state.day} <span>/ ${state.config.months*30}</span></b><small>${state.blocked?'Cash decision needed':running?'Running':end?'Run complete':'Paused'}</small></div>
 <div class="clock-main">${end?btn('View results','review-latest-results','primary'):btn(icon(running?'pause':'play')+runLabel,'play','primary')}${btn('1 day','step','',disabled)}${btn('Finish month','finish','',disabled)}</div>
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

function newServiceId(reserved,base='service'+Date.now()){
 const used=new Set([...draft.services,...state.config.services].map(s=>s.id));
 for(const entry of removedServices.get(draft.services)||[])used.add(entry.service.id);
 for(const project of state.projects)used.add(project.serviceId);
 let id=base,index=1;
 while(used.has(id)||reserved?.has(id))id=base+'_'+index++;
 return id;
}
function checkpoint(kind='automatic'){
 // Automatic checkpoints precede a run replacement. A bare checkpoint
 // contains only the run, so keep its linked comparison or revision too.
 if(kind==='automatic'&&(rerunDraft?.run===state||rerunLink?.run===state))archiveCurrent();
 const snapshot=JSON.stringify(state);
 MEIQQWorkspace.checkpoint({state,saved,checkpointInfo},kind);
 return saved.findIndex(v=>JSON.stringify(v)===snapshot);
}
function modalTabStops(){return [...document.querySelectorAll('#modal button, #modal input, #modal select, #modal textarea, #modal summary, #modal a[href], #modal [tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&!el.closest('[hidden], [inert]')&&el.getClientRects().length>0);}
function modal(html,focusId){
 stop();
 const opening=!$('#modal').innerHTML;
 if(opening)modalFocus=actionFocus||focusKey(document.activeElement);
 $('#modal').innerHTML=QQI18n.html(`<div class="modalback"${opening?' data-enter':''}><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${html}<div class="modal-error" id="modal-error" role="alert"></div></section></div>`);
 render();
 const target=focusId?document.querySelector('#'+focusId):null;
 (target||modalTabStops()[0])?.focus();
}
function closeModal(navigate=true){
 if(navigate&&savedComparisonReader?.id&&routeReady&&window.history.state?.savedComparison?.id===savedComparisonReader.id){
  window.history.back();return;
 }
 savedComparisonReader=null;
 offerPicker=null;clientMenuBuilder=null;
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
function formatDiffValue(path,value){
 if(value===undefined||value===null)return 'not set';
 if(typeof value==='string'&&(path==='name'||/^services\.[^.]+\.(?:name|deliverable|filesOnlyScope)$/.test(path))){
  if(path==='name'&&(value===RESTAURANT_EXAMPLE||value===QQ.DEFAULT.name))return QQI18n.text(value);
  return QQI18n.literal(value);
 }
 if(path==='months'&&Number.isInteger(value))return runLengthLabel(value);
 if(typeof value==='boolean')return value?'On':'Off';
 if(path==='acquisition')return value==='sales'?'Estimate from outreach':'Enter monthly inquiries';
 if(percentPaths.has(path)||path.startsWith('disruptionRates.')||path.endsWith('.fulfillment.managedShare'))return Number((value*100).toFixed(10))+'%';
 if(path==='clientDemand.profileId')return QQI18n.text(QQServiceCatalog.CLIENT_MENUS.find(profile=>profile.id===value)?.name||String(value));
 if(path==='clientDemand.share'||path.startsWith('customerMix.')||path.endsWith('.weight'))return value+'%';
 if(['startingCash','ownerTarget','designerRate','overhead'].includes(path)||/\.(price|print|designOnlyPrice)$/.test(path))return offerAmount(value);
 if(/(Hours|hours|review)$/.test(path))return value+' h';
 if(['paymentDays','approvalDays','printDays','leadDays'].includes(path)||/\.(cadenceDays|relationshipDays)$/.test(path))return countDays(value);
 return String(value);
}
function serviceChangeSummary(service){
 const terms=[offerAmount(service.price)+' per project',num(service.hours)+' designer h',num(service.review)+' review h',offerAmount(service.print)+' print allowance',service.weight+'% inquiry share'];
 if(service.fulfillment)terms.push(pct(service.fulfillment.managedShare)+' managed print',offerAmount(service.fulfillment.designOnlyPrice)+' files-only');
 if(service.campaign)terms.push('quoted every '+service.campaign.cadenceDays+' days for '+service.campaign.relationshipDays+' days');
 else if(service.recurring)terms.push('repeat service');
 return 'Included · '+terms.join(' · ')+(service.deliverable?' · '+QQI18n.literal(serviceCopy(service,'deliverable')):'');
}
function scopeDiffValue(key,value){
 if(value===undefined||value===null)return 'not set';
 if(key==='modeledPriceRange'||key==='modeledPrintCostRange')return value.map(offerAmount).join('–');
 return Array.isArray(value)?value.join('; '):String(value);
}
function configDiff(before,after){
 const out=[],push=(path,label,a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))out.push({path,label,before:formatDiffValue(path,a),after:formatDiffValue(path,b)});};
 for(const k of Object.keys(DIFF_LABELS))push(k,DIFF_LABELS[k],before[k],after[k]);
 const aTarget=before.clientDemand,bTarget=after.clientDemand;
 if(aTarget?.share>0&&bTarget?.share>0&&aTarget.profileId!==bTarget.profileId){
  push('clientDemand.profileId','Target client',aTarget.profileId,bTarget.profileId);
 }
 const targetName=QQServiceCatalog.CLIENT_MENUS.find(profile=>profile.id===(bTarget?.share>0?bTarget.profileId:aTarget?.profileId))?.name;
 push('clientDemand.share',targetName?QQI18n.text('Target client inquiry share')+' · '+QQI18n.text(targetName):'Target client inquiry share',aTarget?.share??0,bTarget?.share??0);
 for(const group of ['food','retail','services'])push('customerMix.'+group,'Customer mix · '+group,before.customerMix?.[group],after.customerMix?.[group]);
 for(const k of Object.keys(QQ.DEFAULT.uncertainty))push('uncertainty.'+k,'Uncertainty · '+k,before.uncertainty?.[k],after.uncertainty?.[k]);
 for(const [k,label] of Object.entries(DISRUPTION_LABELS))push('disruptions.'+k,label,before.disruptions?.[k]??false,after.disruptions?.[k]??false);
 for(const [k,label] of Object.entries(DISRUPTION_LABELS))push('disruptionRates.'+k,'Share affected · '+label,before.disruptionRates?.[k]??QQ.DEFAULT.disruptionRates?.[k],after.disruptionRates?.[k]??QQ.DEFAULT.disruptionRates?.[k]);
 const a=new Map((before.services||[]).map(s=>[s.id,s])),b=new Map((after.services||[]).map(s=>[s.id,s]));
 const order=QQ.changedOfferOrder(before,after);
 if(order){
  const names=(ids,offers)=>ids.map(id=>QQI18n.literal(serviceCopy(offers.get(id),'name')||id)).join(' → ');
  out.push({path:'offerOrder',label:'Offer order',before:names(order.before,a),after:names(order.after,b)});
 }
 const scopeLabels={catalogId:'catalog',packageId:'source package',version:'scope version',scope:'scope',deliverables:'included deliverables',includedRevisions:'included feedback rounds',printQuantity:'print quantity',printSpec:'print specification',printCostBasis:'print cost basis',evidenceIds:'frozen source records',modeledPriceRange:'planning price range',modeledPrintCostRange:'planning print-cost range'};
 for(const id of new Set([...a.keys(),...b.keys()])){
  const old=a.get(id),next=b.get(id),name=QQI18n.literal(serviceCopy(next||old,'name')||id);
  if(!old||!next){out.push({path:'services.'+id,label:name,before:old?serviceChangeSummary(old):'Not included',after:next?serviceChangeSummary(next):'Removed'});continue;}
  for(const [k,label] of Object.entries({name:'name',deliverable:'deliverable',filesOnlyScope:'files-only deliverable',supplierMode:'print supplier',audience:'audience',price:'price',weight:'inquiry share',hours:'designer work',review:'review work',print:'print cost',recurring:'purchase pattern'}))push('services.'+id+'.'+k,name+' · '+label,old[k],next[k]);
  for(const [k,label] of Object.entries({managedShare:'managed-print choice',designOnlyPrice:'design-only price'}))push('services.'+id+'.fulfillment.'+k,name+' · '+label,old.fulfillment?.[k],next.fulfillment?.[k]);
  for(const [k,label] of Object.entries({cadenceDays:'campaign interval',relationshipDays:'relationship length'}))push('services.'+id+'.campaign.'+k,name+' · '+label,old.campaign?.[k],next.campaign?.[k]);
  for(const [k,label] of Object.entries(scopeLabels))if(JSON.stringify(old.spec?.[k])!==JSON.stringify(next.spec?.[k]))out.push({path:'services.'+id+'.spec.'+k,label:name+' · '+label,before:scopeDiffValue(k,old.spec?.[k]),after:scopeDiffValue(k,next.spec?.[k])});
 }
 for(const key of new Set([...Object.keys(before.assumptionRecords||{}),...Object.keys(after.assumptionRecords||{})])){
  const describe=record=>record?`${QQI18n.literal(record.source)} · ${record.date} · ${QQI18n.literal(record.sample)}`:'No source';
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
function commitDraft(mode){
 const error=draftError();if(error)throw Error(error);
 const next=draftRunConfig(),pin=state.day>0&&!checkpointInfo.some(v=>v.baseline);
 const updated=mode==='restart'?QQ.fresh(next):QQ.clone(state);
 if(mode!=='restart')QQ.applyConfig(updated,next);
 const i=checkpoint();
 if(pin&&i>=0){checkpointInfo[i].baseline=true;checkpointInfo[i].kind='manual';}
 if(mode!=='restart'&&rerunLink?.run===state)rerunLink.run=updated;
 if(mode!=='restart'&&keptSetupRun===state)keptSetupRun=updated;
 state=updated;selection=null;inspectorTrail=[];
 removedServices.delete(draft.services);
}
function applyDraft(mode,intent=''){
 commitDraft(mode);
 view='map';
 closeModal();
 if(intent==='play')play();
 else if(intent==='step'){if(beginRun('step'))tick();}
 else if(['simulate','finish-run','finish','next-event'].includes(intent))advanceRun(intent);
 else render();
}
function showRunResults(tab='overview',month=null){
 view='finances';analyticsTab=tab;selectResultsMonth(month);
 render();
 const verdict=(completedVariantPair()&&document.querySelector('#variant-result-title'))||document.querySelector('#run-comparison-title');
 if(verdict){verdict.focus({preventScroll:true});window.scrollTo?.({top:0,behavior:'instant'});}
 else focusViewHeading();
}
function beginRun(action){
 stop();
 const full=action==='simulate'||action==='finish-run',fromSetup=view==='setup';
 if(dirty()){
  // Simulate is the explicit commit for a fresh setup. Preserve an existing
  // run, funding decision or day-zero ledger behind its normal change review.
  if(action==='simulate'&&fromSetup&&state.day===0&&!state.blocked&&!state.ledger.length){
   commitDraft('future');
  }else{review(action);return false;}
 }
 if(state.day>=state.config.months*30){if(full)showRunResults();return false;}
 if(firstExamplePending())rememberSetupChoice();
 if(full){
  if(action==='simulate'&&state.day===0){QQ.captureRunLaunch(state);save();}
  if(!runPassage||runPassage.run!==state){
   runPassage={run:state,estimate:QQ.runLaunchEstimate(state)};
  }
  selection=null;inspectorTrail=[];
 }else runPassage=null;
 view='map';
 if(state.blocked){cashModal();return false;}
 return true;
}
function tick(){const advanced=QQ.step(state);save();if(!advanced||state.day>=state.config.months*30)stop();render();if(state.blocked)cashModal();}
function play(){if(running){stop();render();return;}if(!beginRun('play'))return;running=true;timer=setInterval(tick,1000/speed);render();}
function advanceRun(action){
 const full=action==='simulate'||action==='finish-run',entering=full&&!runPassage;
 if(full&&running&&runPassage)return;
 if(!beginRun(action))return;
 const end=state.config.months*30,untilEvent=action==='next-event';
 finishTarget=action==='finish'?Math.min(end,(Math.floor(state.day/30)+1)*30):end;
 running=true;
 const generation=++runGeneration;
 const travel=full&&document.documentElement.dataset.uiMotion==='on';
 const batchSize=full?Math.max(1,Math.ceil((end-state.day)/24)):5;
 const batch=()=>{
  if(generation!==runGeneration||!running||finishTarget===null)return;
  const started=performance.now(),target=finishTarget;let days=0,advanced=true,foundEvent=false;
  while(state.day<target&&days<batchSize&&(days===0||performance.now()-started<8)){
   advanced=QQ.step(state);if(!advanced)break;days++;
   if(untilEvent&&state.events[0]?.day===state.day){foundEvent=true;break;}
  }
  save();
  if(!advanced||state.day>=target||foundEvent){
   stop();
   if(full&&state.day===end&&!state.blocked){showRunResults();return;}
   if(state.blocked)cashModal();else render();
   return;
  }
  render();timer=setTimeout(batch,travel?Math.max(0,78-(performance.now()-started)):0);
 };
 render();if(entering)focusViewHeading();
 timer=setTimeout(batch,entering&&travel?650:0);
}
function cashModal(){const b=state.blocked;if(!b)return;const continuing=Boolean(runPassage&&view==='map');modal(`<div class="eyebrow">DAY ${state.day+1} PAUSED</div><h2 id="dialog-title">A payment needs funding</h2><p>${esc(b.note)}</p><div class="kvs"><div><label>Payment needed</label><strong>${dollars(b.amount)}</strong></div><div><label>Cash at that point</label><strong>${dollars(b.cash)}</strong></div></div><div class="banner warn">This payment needs <b>${dollars(b.gap)}</b> more. The simulator is paused at the end of day ${state.day}.</div><label class="input-field">Owner funding ($)<input id="funding"${QQI18n.moneyField('$')} type="number" min="0.01" max="100000000" step="0.01" value="${b.gap}"></label><p class="helper">${continuing?'Funding adds cash and retries this day.':'Funding adds cash to the business. Resume the run to retry this day.'}</p><div class="actions">${btn('Keep paused','close')}${btn(continuing?'Add funding and continue':'Add funding','confirm-fund','primary',continuing?'data-resume="finish-run"':'')}</div>`);}
function download(name,data,type='application/json'){const blob=new Blob([typeof data==='string'?data:JSON.stringify(data)],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function backupPayload(){return MEIQQWorkspace.pack(currentWorkspace(),archives);}
function parseBackup(data){return MEIQQWorkspace.parse(data);}
function importFile(){stop();const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const f=input.files?.[0];if(!f)return;MEIQQWorkspace.checkSize(f.size);const parsed=MEIQQWorkspace.parseText(await f.text());modal(`<h2 id="dialog-title">Open this ${parsed.full?'saved workspace':'setup'}?</h2><p><b>${scenarioName(parsed.state.config.name)}</b> · day ${parsed.state.day} · ${parsed.state.projects.length} projects.</p><p>Your current workspace will be kept under Runs & backups.</p><div class="actions">${btn('Cancel','close')}${btn('Open backup','confirm-import','primary')}</div>`);pendingImport=parsed;}catch(e){toast(e.message||'The backup could not be read.');}};input.click();}
let pendingImport=null,pendingDraft=null;
function recordClientDemand(profile,share){
 if(view!=='setup'||stepIndex!==1||loading||!profile)return;
 if(draft.clientDemand?.profileId===profile.id&&draft.clientDemand.share===share)return;
 stop();presetUndoDraft=null;serviceUndoDraft=null;
 draft.clientDemand={profileId:profile.id,share};
 if(draft.assumptionRecords){
  delete draft.assumptionRecords['clientDemand.share'];
  if(!Object.keys(draft.assumptionRecords).length)delete draft.assumptionRecords;
 }
 updatePreview();render();
}
function announceClientDemand(){
 const summary=document.querySelector('#client-demand-panel .demand-split');
 const status=document.querySelector('#decision-announcement');
 if(status&&summary?.children)status.textContent=[...summary.children].map(pair=>[pair.querySelector('dt').textContent,pair.querySelector('dd').textContent].join(' ')).join('. ');
}
function changeClientDemand(el,commit){
 if(view!=='setup'||stepIndex!==1||loading)return;
 const {profile}=demandAudience();
 if(!profile)return;
 const value=Number(el.value),error=document.querySelector('#client-demand-error');
 const savedShare=draft.clientDemand?draft.clientDemand.share:0;
 if(!el.value.trim()||!Number.isInteger(value)||value<0||value>100){
  const restore=commit&&Number.isInteger(savedShare)&&savedShare>=0&&savedShare<=100;
  if(restore){el.value=String(savedShare);el.removeAttribute?.('aria-invalid');}
  else el.setAttribute?.('aria-invalid','true');
  if(error)error.textContent=QQI18n.text(restore?'Restored the last valid share.':'Enter a whole percentage from 0 to 100.');
  return;
 }
 el.removeAttribute?.('aria-invalid');
 if(error)error.textContent='';
 const calc=demandCalculation(profile.id);
 if(value!==savedShare){calc.applied='';recordClientDemand(profile,value);}
 if(commit)announceClientDemand();
}
function updateClientDemandCount(el){
 const {profile}=demandAudience();
 if(view!=='setup'||stepIndex!==1||loading||!profile)return;
 const calc=demandCalculation(profile.id);
 const key=el.id==='client-demand-count-total'?'total':'target';
 calc[key]=el.value;calc.error='';calc.applied='';
 const feedback=document.querySelector('#client-demand-count-feedback');
 if(feedback)feedback.textContent='';
}
function applyClientDemandCounts(){
 const {profile}=demandAudience();
 if(view!=='setup'||stepIndex!==1||loading||!profile)return;
 const calc=demandCalculation(profile.id);
 const target=Number(calc.target),total=Number(calc.total);
 const targetInvalid=calc.target.trim()===''||!Number.isSafeInteger(target)||target<0;
 const totalInvalid=calc.total.trim()===''||!Number.isSafeInteger(total)||total<1;
 if(targetInvalid||totalInvalid||target>total){
  calc.error=targetInvalid?'Enter a whole number of client inquiries, including zero.':totalInvalid?'Enter a total of at least one inquiry.':'Client inquiries cannot exceed total inquiries.';
  calc.applied='';render();document.querySelector('#client-demand-count-'+(totalInvalid&&!targetInvalid?'total':'target'))?.focus();return;
 }
 const share=Math.round(target/total*100);
 calc.error='';calc.applied='Applied '+share+'% of new inquiries (rounded to a whole percent).';
 if(draft.clientDemand?.profileId===profile.id&&draft.clientDemand.share===share)render();else recordClientDemand(profile,share);
 announceClientDemand();
}
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
 if(parts[0]==='services'&&key==='weight')editedMixOffer=target;
 if(key==='supplierMode')target.print=value==='none'?0:(target.print>0?target.print:null);
 if(key==='recurring'&&value===false)delete target.campaign;
 if(key==='recurring'&&value===true&&!target.campaign)target.campaign={cadenceDays:30,relationshipDays:365};
 if(key==='audience'&&value!=='all'&&!draft.customerMix){draft.customerMix=QQ.clone(QQ.DEFAULT.customerMix);draft.profileStrength=QQ.DEFAULT.profileStrength;draft.focusType='none';}
 const error=$('#error-'+el.id);if(error)error.textContent=QQI18n.text(typeof el.checkValidity==='function'&&!el.checkValidity()?'Enter a valid value in the range shown.':'');
 updatePreview();
 if(view==='setup')render();
}
document.addEventListener('input',e=>{
 if(savingKeptSetup||resettingApp)return;
 if(e.target.id==='client-demand-share'||e.target.id==='client-demand-range'){changeClientDemand(e.target,false);return;}
 if(e.target.id==='client-demand-count-total'||e.target.id==='client-demand-count-target'){updateClientDemandCount(e.target);return;}
 if(e.target.id==='offer-package-search'&&offerPicker){offerPicker.query=e.target.value;refreshOfferPicker();return;}
 if(e.target.id==='studio-find'){studioUI.query=e.target.value;render();return;}
 if(plannerController.input(e.target)||jobsController.input(e.target))return;if(e.target.dataset?.studioField){handleStudioInput(e.target);return;}if(e.target.id==='catalog-price'){catalogPrices.set(pendingCatalogId,QQI18n.inputValue(e.target));const s=catalogCandidate(pendingCatalogId);$('#catalog-economics').innerHTML=QQI18n.html(catalogEconomics(s));return;}if(e.target.id==='contract-search'){contractSearch=e.target.value;contractPage=0;render();return;}if(e.target.id==='project-search'){search=e.target.value;$('#project-table').innerHTML=QQI18n.html(projectTable());return;}if(e.target.dataset?.input&&e.target.type!=='checkbox'&&e.target.tagName!=='SELECT')handleInput(e.target);});
document.addEventListener('change',e=>{
 if(savingKeptSetup||resettingApp)return;
 const el=e.target;
 if(el.id==='client-demand-share'||el.id==='client-demand-range'){changeClientDemand(el,true);return;}
 if(el.id==='client-demand-count-total'||el.id==='client-demand-count-target'){updateClientDemandCount(el);return;}
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
 if(clientMenuBuilder?.draft===draft&&el.id==='client-menu-retain'){
  clientMenuBuilder.retain=el.checked;clientMenuBuilder.retainByProfile.set(clientMenuBuilder.profile.id,el.checked);
  clientMenuBuilder.lastSwap=null;renderClientMenu('client-menu-retain',true);return;
 }
 if(offerPicker&&el.dataset?.pickerKey){stagePickerItem(el);return;}
 if(offerPicker&&['catalog-goal','catalog-audience','offer-selection-only'].includes(el.id)){
  if(el.id==='catalog-goal')offerPicker.goal=el.value;
  else if(el.id==='catalog-audience')offerPicker.audience=el.value;
  else offerPicker.selectionOnly=el.checked;
  refreshOfferPicker();return;
 }
 if(['preset-market','preset-operation','preset-mix','preset-condition'].includes(el.id)){presetSelection[el.id.replace('preset-','')]=el.value;try{localStorage.setItem(PRESET_KEY,JSON.stringify(presetSelection));}catch(err){}render();return;}
 if(el.id==='contract-search'){contractSearch=el.value;contractPage=0;render();return;}
 if(el.id==='contract-filter'){contractFilter=el.value;contractPage=0;render();return;}
 if(el.id==='ledger-month'){cashView={run:state,month:Number(el.value),page:0};render();return;}
 if(el.id==='contract-sort'){contractSort=el.value;contractPage=0;render();return;}
 if(el.dataset?.input){
  handleInput(el);
  if(view==='setup'&&stepIndex>0){
   // Announce the nearby figures once on commit. Sighted users see the same
   // readout change while typing, without interrupting screen-reader input.
   const list=el.closest?.('.assumption-section')?.querySelector?.('.decision-readout dl');
   const status=document.querySelector('#decision-announcement');
   if(list&&status)status.textContent=[...list.children].map(pair=>pair.querySelector('dt').textContent+' '+pair.querySelector('dd').textContent).join('. ');
  }else if(view!=='setup'&&(el.dataset.input==='acquisition'||el.dataset.input.endsWith('.audience')||el.type==='checkbox'))render();
  return;
 }
 if(el.id==='speed'){speed=Number(el.value);if(running&&finishTarget===null){clearInterval(timer);timer=setInterval(tick,1000/speed);}return;}
 if(el.id==='horizon'){stop();const months=Number(el.value);if(!validRunLength(months)){render();return;}if(months*30<state.day){toast('The horizon must include the current day.');render();return;}serviceUndoDraft=null;presetUndoDraft=null;if(draft.months===state.config.months)draft.months=months;state.config.months=months;save();render();return;}
 if(el.id==='project-filter'){filter=el.value;$('#project-table').innerHTML=QQI18n.html(projectTable());}
});
document.addEventListener('click',e=>{
 if(savingKeptSetup||resettingApp){e.preventDefault?.();return;}
 const el=e.target.closest('[data-action]');
 for(const menu of document.querySelectorAll(openWorkspaceMenus)){
  if(!menu.contains(e.target))menu.open=false;
  else if(el&&menu.dataset.disclosure==='offer-setup-options'){menu.open=false;menu.querySelector('summary').focus();}
 }
 if(!el)return;const a=el.dataset.action;if(a.startsWith('planner-')){actionFocus=focusKey(el);try{plannerController.action(a,el.dataset);}catch(err){if($('#modal').firstChild)showError(err.message||'The plan could not be updated.');else plannerController.reportError(err.message||'The plan could not be updated.');}finally{actionFocus=null;}return;}if(a.startsWith('jobs-')){actionFocus=focusKey(el);try{jobsController.action(a,el.dataset);}catch(err){if($('#modal').firstChild)showError(err.message||'The job could not be updated.');else jobsController.reportError(err.message||'The job could not be updated.');}finally{actionFocus=null;}return;}if(a.startsWith('studio-')){actionFocus=focusKey(el);try{handleStudioAction(a,el);}catch(err){showError(err.message||'The idea could not be updated.');}finally{actionFocus=null;}return;}if(loading)return;
 actionFocus=focusKey(el);
 try{
  if(presetUndoDraft&&['apply','discard','enable-profiles','add-service','duplicate','balance'].includes(a))presetUndoDraft=null;
  if(serviceUndoDraft&&['apply','discard','enable-profiles','add-service','duplicate','balance','confirm-preset','undo-preset','load','confirm-restart','confirm-example','confirm-import','open-archive','confirm-restore-draft','confirm-branch'].includes(a))serviceUndoDraft=null;
  if(a==='breadcrumb-stop'&&routeReady){
   if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   e.preventDefault();
   const index=Number(el.dataset.index);
   const hash=el.hash;
   const shortened=workspacePathTo(workspaceTrail.slice(0,index),hash.slice(1));
   if(window.location.hash===hash)window.history.replaceState({workspaceTrail:shortened},'',hash);
   else window.history.pushState({workspaceTrail:shortened},'',hash);
   readWorkspaceRoute();
  }
  else if(a==='show-navigator')openWorkspaceNavigator();
  else if(a==='reset-app')modal(`<h2 id="dialog-title">Reset 美QQ to defaults?</h2><p>This permanently erases saved runs, drafts, checkpoints, Studio ideas, plans, and jobs in this browser. Settings return to their defaults. Downloaded backups are kept.</p><div class="actions">${btn('Cancel','close')}${btn('Erase progress and reset','confirm-app-reset','soft','id="confirm-app-reset"')}</div>`);
  else if(a==='confirm-app-reset')void resetApp();
  else if(a==='hide-navigator')navigatorDialog.close();
  else if(a==='view-waterfront'&&atWaterfront()){
   const options=el.closest('.workspace-options');
   if(options){options.open=false;options.querySelector('summary').focus();}
   waterfrontView.setAttribute('aria-label',QQI18n.text('Studio waterfront'));
   waterfrontView.querySelector('button').textContent=QQI18n.text('Back to workspace');
   waterfrontView.showModal();
  }
  else if(a==='close-waterfront')waterfrontView.close();
  else if(a==='sky-play'&&view==='sky/view'){
   const playing=skyPlayback?skyPlayback==='animate':document.documentElement.dataset.uiMotion==='on';
   skyPlayback=playing?'still':'animate';shardBackground?.setAttribute?.('motion',skyPlayback);render();
  }
  else if(a==='test-assumption')editResultAssumption(el.dataset.path,el.dataset.serviceId,el.dataset.variantInput!==undefined,Number(el.dataset.resultsMonth));
  else if(a==='return-rerun-results'&&editingRerun){parkRerunEditor();save();showRunResults(rerunDraft.returnTab,rerunDraft.resultsMonth);focusResultAssumption();}
  else if(a==='simulate-again')simulateRevisedRun();
  else if(a==='keep-run-setup')keepRunSetup(el.dataset.version).catch(error=>{
   toast(error.message||'The comparison could not be saved. Your results are still open.');
   if(view==='finances')document.querySelector(`[data-action="keep-run-setup"][data-version="${el.dataset.version}"]`)?.focus();
  });
  else if(a==='focus-estimate'){
   const estimate=document.querySelector('#draft-summary');
   estimate?.focus({preventScroll:true});estimate?.scrollIntoView?.({block:'nearest'});
  }
  else if(a==='setup-home')beginSetupEntrance();
  else if(a==='view'){
   stop();inspectorTrail=[];selection=null;setupEntryPath=null;setupReturnView=null;
   if(el.dataset.view==='finances'&&view!=='finances'){analyticsTab='overview';selectResultsMonth(null);}
   if(el.dataset.view==='studio'){studioUI.selectedId=null;studioUI.tab='idea';studioUI.section='offer';}
   view=el.dataset.view;render();focusViewHeading();
  }
  else if(a==='start-business'||a==='start-restaurant'){
   if(!setupNeedsChoice()||setupEntryPath==='style')return;
   setupEntryPath=a==='start-business'?'business':'restaurant';
   // Choosing a template edits this screen. Back returns to the page that opened it.
   if(routeReady)replaceWorkspaceStop(workspaceRoute());
   render();
  }
  else if(a==='enter-setup')openSetupEditor(el.dataset.mode);
  else if(a==='new-scenario')beginSetupEntrance(true);
  else if(a==='cancel-new-setup'&&setupReturnView){
   const back=setupReturnView;setupReturnView=null;setupEntryPath=null;newScenarioRequested=false;
   if(back.startsWith('setup/rerun/')&&rerunDraft?.run===state){
    activateRerunEditor(editorSteps.indexOf(back.slice('setup/rerun/'.length)));render();
    if(!focusRevisedAssumption())focusSetupStep();
   }else{view=back;render();focusViewHeading();}
  }
  else if(a==='input-evidence')editInputRecord(el.dataset.group,el.dataset.id);
  else if(a==='save-input-evidence'||a==='remove-input-evidence')saveInputRecord(a==='remove-input-evidence');
  else if(a==='toggle-recipe'){recipeOpen=!recipeOpen;render();if(recipeOpen)document.querySelector('#preset-market')?.focus();}
  else if(a==='open-saved-comparison')openSavedComparisonFromArchive(el.dataset);
  else if(a==='analytics-tab'){analyticsTab=el.dataset.tab;if(analyticsTab==='cash')cashView={run:state,month:0,page:0};render();}
  else if(a==='review-latest-results'||a==='month-overview'){
   stop();inspectorTrail=[];selection=null;
   if(a==='review-latest-results')showRunResults();
   else{view='finances';analyticsTab='overview';selectResultsMonth(Number(el.dataset.month));render();focusViewHeading();}
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
  else if(a==='setup-step')selectSetupStep(Number(el.dataset.step));
  else if(a==='fix-setup-issue')fixSetupIssue(el.dataset.path);
  else if(a==='edit-inquiry-weight')revealSetupField({path:'services.'+Number(el.dataset.index)+'.weight'});
  else if(a==='inspect-mix'){
   const mix=document.querySelector('.inquiry-mix');
   if(mix){mix.open=true;mix.querySelector('summary')?.focus();}
  }
  else if(a==='build-client-menu')openClientMenuBuilder();
  else if(a==='apply-client-demand-counts')applyClientDemandCounts();
  else if(a==='switch-client-demand'&&view==='setup'&&stepIndex===1){
   const {menu,saved}=demandAudience();
   if(menu&&saved&&saved.id!==menu.profile.id){
    recordClientDemand(menu.profile,Number.isInteger(draft.clientDemand.share)?draft.clientDemand.share:0);
    document.querySelector('#client-demand-share')?.focus();announceClientDemand();
   }
  }
  else if(a==='clear-client-demand'&&view==='setup'&&stepIndex===1&&draft.clientDemand){
   stop();presetUndoDraft=null;serviceUndoDraft=null;delete draft.clientDemand;
   if(draft.assumptionRecords){
    delete draft.assumptionRecords['clientDemand.share'];
    if(!Object.keys(draft.assumptionRecords).length)delete draft.assumptionRecords;
   }
   clientDemandCalculations.delete(draft);
   updatePreview();render();(document.querySelector('#client-demand-share')||document.querySelector('#demand-menu-entry'))?.focus();
  }
  else if(a==='choose-menu-client'&&clientMenuBuilder?.draft===draft){
   const profile=QQServiceCatalog.CLIENT_MENUS.find(v=>v.id===el.dataset.profile);if(profile)clientMenuChoice(profile);
  }
  else if(a==='menu-client-list'&&clientMenuBuilder){
   clientMenuBuilder.picking=true;renderClientMenu('cm-client-'+clientMenuBuilder.profile.id);
  }
  else if(a==='show-menu-swaps'&&clientMenuBuilder?.profile){
   const index=Number(el.dataset.slot);
   if(!clientMenuBuilder.profile.slots[index])return;
   clientMenuBuilder.swap=clientMenuBuilder.swap===index?null:index;renderClientMenu('cm-swap-'+index,true);
  }
  else if(a==='swap-menu-offer'&&clientMenuBuilder?.draft===draft){
   const b=clientMenuBuilder,profile=b.profile,index=Number(el.dataset.slot),id=el.dataset.id;
   if(!profile?.slots[index]?.options.some(option=>option.id===id))return;
   const ids=b.selections.get(profile.id);
   if(ids[index]!==id){
    const before=clientMenuCandidate(profile,ids,b.retain);
    const previous=before.error?null:clientMenuProjection(before.config);
    b.lastSwap={profile:profile.id,from:previous?.valid?previous.profit:null};ids[index]=id;
   }
   b.swap=null;renderClientMenu('cm-swap-'+index,true);
  }
  else if(a==='menu-compare-with'&&clientMenuBuilder&&['current','recommended'].includes(el.dataset.reference)){
   clientMenuBuilder.compare=el.dataset.reference;renderClientMenu('cm-reference-'+el.dataset.reference,true);
  }
  else if(a==='menu-review-existing'&&clientMenuBuilder){
   const heading=document.querySelector('#cm-existing-title');heading?.focus({preventScroll:true});heading?.scrollIntoView?.({block:'start',inline:'nearest'});
  }
  else if(a==='menu-view-estimate'&&clientMenuBuilder){
   const node=$('#client-menu-estimate');node?.focus({preventScroll:true});node?.scrollIntoView?.({block:'start',inline:'nearest'});
  }
  else if(a==='apply-client-menu'&&clientMenuBuilder?.draft===draft){
   const b=clientMenuBuilder;if(!b.profile||b.picking)return;
   const result=applyClientMenu(b.profile,b.selections.get(b.profile.id),b.retain);
   if(result.changed){closeModal();save();render();toast('Client menu applied.');}
  }
  else if(a==='browse-offers')openOfferPicker();
  else if(a==='service-library')serviceLibrary();
  else if(a==='reset-offer-filters'&&offerPicker){
   Object.assign(offerPicker,{goal:'all',audience:'all',query:'',selectionOnly:false});serviceLibrary();
  }
  else if(a==='picker-evidence'&&offerPicker){
   const row=offerPicker.rows.find(item=>item.key===el.dataset.key);
   if(row){offerPicker.evidenceKey=row.key;serviceEvidence(row.service,row.saved?null:row.entry.id,row.key);}
  }
  else if(a==='picker-details-back'&&offerPicker)restorePickerDetails(el.dataset.key);
  else if(a==='apply-offer-selection'&&offerPicker?.draft===draft&&offerPickerSummary().canApply){
   applyCatalogSelection([...offerPicker.added],[...offerPicker.removed]);closeModal();save();render();toast('Service menu updated.');
  }
  else if(a==='catalog-package')catalogPackage(el.dataset.id);
  else if(a==='confirm-catalog-service'){const value=QQI18n.inputValue($('#catalog-price'));if(value.trim()==='')throw Error('Enter a customer price.');const amount=Number(value),s=QQServiceCatalog.createService(pendingCatalogId);if(s.fulfillment&&amount<s.fulfillment.designOnlyPrice)throw Error('The managed-print price must cover at least the design-only price.');addCatalogService(pendingCatalogId,amount);catalogPrices.delete(pendingCatalogId);pendingCatalogId=null;}
  else if(a==='write-first-offer')revealSetupField({path:'services.0.name'});
  else if(a==='park-offer'){
   const id=el.dataset.id;
   if(canFinishOfferLater(draft.services.findIndex(s=>s.id===id))){
    updateOfferMenu([],[],new Set(),id);save();render();
    document.querySelector('[data-action="include-offer"][data-id="'+id+'"]')?.focus();
   }
  }
  else if(a==='include-offer'){
   if(includeDraftOffer(el.dataset.id)){
    save();render();
    const index=draft.services.findIndex(s=>s.id===el.dataset.id);
    const issue=draftValidationIssues().find(v=>v.path.startsWith('services.'+index+'.'));
    if(issue)fixSetupIssue(issue.path);
    else document.querySelector('#offer-edit-'+el.dataset.id)?.focus();
   }
  }
  else if(a==='add-blank-service')addCatalogService(null);
  else if(a==='service-starters')starterDialog();
  else if(a==='add-starter'){
   const additions=starterOffers(el.dataset.id,true);
   if(!additions.length)return;
   if(draft.services.length+additions.length>20)throw Error('This starter would exceed the 20-service limit.');
   serviceUndoDraft=QQ.clone(draft);presetUndoDraft=null;
   for(const s of additions){s.id=newServiceId();s.weight=0;draft.services.push(s);}
   expandedService=draft.services.length-additions.length;closeModal();render();toast('Starter services added at 0% share. Set their inquiry shares when ready.');
  }
  else if(a==='review-starter'){pendingStarterId=el.dataset.id;const next=QQServiceCatalog.starterServices(pendingStarterId);modal(`<h2 id="dialog-title">Replace your draft service mix?</h2><p>Remove ${draft.services.length} current offerings from this draft: ${esc(draft.services.map(s=>s.name).join(', '))}.</p><p>Load this mix instead:</p><ul>${next.map(s=>`<li>${serviceName(s)} · ${offerAmount(s.price)} · ${s.weight}% inquiry share</li>`).join('')}</ul><p>Your active run and accepted projects stay in place. Undo is available until your next draft edit.</p><div class="actions">${btn('Keep current offerings','close')}${btn('Replace draft offerings','confirm-starter','primary')}</div>`);}
  else if(a==='confirm-starter'){if(!pendingStarterId)throw Error('Choose a starter mix.');serviceUndoDraft=QQ.clone(draft);presetUndoDraft=null;clearServiceRecords();draft.services=starterOffers(pendingStarterId);delete draft.clientMenu;pendingStarterId=null;expandedService=0;closeModal();render();toast('Starter mix loaded into the draft. Review & apply when ready.');}
  else if(a==='undo-services'){if(!serviceUndoDraft)throw Error('No previous service mix is available.');draft=QQ.clone(serviceUndoDraft);serviceUndoDraft=null;closeModal();render();}
  else if(a==='dismiss-service-undo'){
   serviceUndoDraft=null;
   render();
   document.querySelector('#choose-offerings')?.focus();
  }
  else if(a==='inspect-service'){
   expandedService=Number(el.dataset.index);
   const key='service-'+draft.services[expandedService].id;
   const editor=[...document.querySelectorAll('.service-editor')].find(node=>node.dataset.disclosure===key);
   if(editor){editor.open=true;editor.querySelector('summary')?.focus();}else{disclosureState.set(key,true);render();}
  }
  else if(a==='price-experiment')priceExperiment(Number(el.dataset.index));
  else if(a==='use-service-price'){
   const index=Number(el.dataset.index),price=Number(el.dataset.price),service=draft.services[index];
   const filesOnly=el.dataset.route==='files';
   if(!service||!Number.isFinite(price)||price<0||price>1e6||
    (filesOnly?service.fulfillment?.managedShare!==0||price>service.price:service.fulfillment&&price<service.fulfillment.designOnlyPrice))throw Error('Choose a valid price for this scope.');
   if(filesOnly)service.fulfillment.designOnlyPrice=price;
   else service.price=price;
   draft=QQ.withCurrentAssumptionRecords(draft);serviceUndoDraft=null;presetUndoDraft=null;closeModal();render();
  }
  else if(a==='service-evidence'){const service=evidenceService(el.dataset.id,el.dataset.catalog);serviceEvidence(service,el.dataset.catalog);}
  else if(a==='download-service-evidence'){const service=el.dataset.pickerEvidence?offerPicker?.rows.find(row=>row.key===el.dataset.pickerEvidence)?.service:evidenceService(el.dataset.id,el.dataset.catalog);if(!service)throw Error('Service not found.');download('MEIQQ-Service-Evidence.json',{service,audit:QQServiceCatalog.auditService(service)});}
  else if(a==='recipe-evidence')recipeEvidenceDialog();
  else if(a==='current-evidence')recipeEvidenceDialog('draft');
  else if(a==='download-evidence'){if(!pendingEvidence)throw Error('Open an evidence record first.');download('MEIQQ-Recipe-Evidence.json',pendingEvidence);}
  else if(a==='setup-density'){if(!['guided','analyst'].includes(el.dataset.mode))throw Error('Choose a valid setup view.');setSetupMode(el.dataset.mode);render();}
  else if(a==='apply-preset'){const next=QQPresets.compose(presetSelection,draft,{preserveServices:true}),changes=configDiff(draft,next);if(!changes.length&&['market','operation','condition','mix','profile'].every(k=>draft.recipe?.[k]===next.recipe[k])){toast('This recipe already matches your draft.');return;}pendingPreset=next;modal(`<div class="eyebrow">${changes.length?changes.length+' DRAFT VALUES WILL CHANGE':'SCENARIO CONTEXT CHANGE'}</div><h2 id="dialog-title">Load this recipe into your draft?</h2><p>Use the selected market label, team, customer mix and business conditions. Your custom services, prices, service mix, starting cash and run identity are preserved.</p><p>You can undo until your next draft edit. The running simulation changes only after you apply the draft.</p><ul class="change-list">${changes.map(v=>`<li>${esc(v.label)}: <b>${esc(v.before)} → ${esc(v.after)}</b></li>`).join('')}</ul><p class="helper">The recipe origin is saved with the applied setup and shown in Saved runs. Exact assumption values remain authoritative and may include later edits.</p><div class="actions">${btn('Keep current draft','close')}${btn('Merge into draft','confirm-preset','primary')}</div>`);}
  else if(a==='confirm-preset'){if(!pendingPreset)throw Error('Choose a recipe first.');presetUndoDraft=QQ.clone(draft);draft=QQ.clone(pendingPreset);pendingPreset=null;recipeOpen=false;expandedService=0;stepIndex=0;closeModal();render();toast('Recipe loaded into the draft. Review it, then apply when ready.');}
  else if(a==='undo-preset'){if(!presetUndoDraft)throw Error('There is no previous draft to restore.');draft=QQ.clone(presetUndoDraft);presetUndoDraft=null;render();toast('Previous draft restored.');}
  else if(a==='team'){stop();view='setup';stepIndex=2;render();}
  else if(a==='review')review();
  else if(a==='apply')applyDraft(el.dataset.mode,el.dataset.resume);
  else if(a==='ask-discard'){
   modal(`<h2 id="dialog-title">Discard setup changes?</h2><p>Restore the applied inputs for <b>${scenarioName(state.config.name)}</b>?</p><div class="actions">${btn('Keep editing','close')}${btn('Discard changes','discard','danger')}</div>`);
  }
  else if(a==='discard'){if($('#modal').firstChild)closeModal();draft=draftWithClientMenu(editingRerun?rerunStartingConfig(state):state.config,editingRerun?ordinaryDraft:draft);render();}
  else if(a==='enable-profiles'){draft.customerMix=QQ.clone(QQ.DEFAULT.customerMix);draft.profileStrength=QQ.DEFAULT.profileStrength;draft.focusType='none';render();}
  else if(a==='add-service'){const id=$('#service-template').value;addCatalogService(QQServiceCatalog.SERVICES.some(s=>s.id===id)?id:id==='menu'?'menu-refresh':null);}
  else if(a==='duplicate'){if(draft.services.length>=20)throw Error('The prototype supports up to 20 services.');const s=QQ.clone(draft.services[Number(el.dataset.index)]);s.id=newServiceId();s.name+=' copy';s.weight=0;draft.services.push(s);expandedService=draft.services.length-1;render();}
  else if(a==='remove-service')removeDraftService(el.dataset.id?draft.services.findIndex(s=>s.id===el.dataset.id):Number(el.dataset.index));
  else if(a==='restore-service')restoreDraftService();
  else if(a==='dismiss-service-removal'){
   removedServices.get(draft.services)?.pop();
   renderListChange('.offer-card,.offer-recovery[data-render-key]');
   (document.querySelector('#undo-service-removal:not(:disabled)')||document.querySelector('#choose-offerings'))?.focus();
  }
  else if(a==='rebalance-other-weights'){
   if(editedMixOffer?.id!==el.dataset.id)return;
   const shares=weightsAround(editedMixOffer);
   if(!shares)return;
   serviceUndoDraft=QQ.clone(draft);presetUndoDraft=null;
   for(const offer of draft.services)if(shares.has(offer.id))offer.weight=shares.get(offer.id);
   const index=draft.services.indexOf(editedMixOffer);
   save();render();document.querySelector('#input-services-'+index+'-weight')?.focus();
  }
  else if(a==='assign-remainder'){
   const service=draft.services[Number(el.dataset.index??$('#mix-recipient').value)],total=draft.services.reduce((sum,s)=>sum+(s.weight||0),0),weight=QQ.round((service?.weight||0)+100-total);
   if(!service||weight<0||weight>100)throw Error('Choose an offer that can take the remaining weight.');
   service.weight=weight;serviceUndoDraft=null;presetUndoDraft=null;render();
  }
  else if(a==='balance'){
   const included=draft.services.filter(s=>s.weight!==0);
   const shares=allocatedOfferWeights(included,new Set(included.map(s=>s.id)));
   for(const offer of included)offer.weight=shares.get(offer.id);
   render();
  }
  else if(a==='toggle-passage'&&runPassage){
   if(state.blocked)cashModal();
   else if(running){stop();render();}
   else advanceRun('finish-run');
  }
  else if(a==='inspect-run'&&runPassage){stop();runPassage=null;render();focusViewHeading();}
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
  else if(a==='confirm-fund'){const f=$('#funding');if(!f.checkValidity())return f.reportValidity();QQ.fund(state,Number(QQI18n.inputValue(f)));closeModal();if(el.dataset.resume==='finish-run'&&runPassage){advanceRun('finish-run');}else render();}
  else if(a==='backup'){download('MEIQQ-Backup-Day-'+state.day+'.json',MEIQQWorkspace.serialize(currentWorkspace(),archives));toast('Backup download requested. Unfinished inputs and preserved workspaces are included.');}
  else if(a==='recover')download('MEIQQ-original-save.json',recoveryRaw);
  else if(a==='import')importFile();
  else if(a==='confirm-import'){if(!pendingImport)throw Error('Choose a backup first.');openImportedWorkspace(pendingImport);pendingImport=null;view=state.day?'map':'setup';closeModal();render();}
else if(a==='open-archive'){
   const index=Number(el.dataset.index),item=archives[index];if(!item)throw Error('Workspace not found.');
   const next=QQ.clone(item.workspace),rest=item.workspace.rerunLink?.comparisonId?[...archives]:archives.filter((_,i)=>i!==index);
   MEIQQWorkspace.archive(rest,currentWorkspace());installWorkspace({...next,archives:rest});recoveryRaw=null;selection=null;render();
  }
  else if(a==='export-archive'){
   const item=archives[Number(el.dataset.index)];if(!item)throw Error('Workspace not found.');
   const comparison=savedComparisonArchive(item.workspace.keptComparisonId);
   download('MEIQQ-Preserved-Workspace.json',MEIQQWorkspace.serialize(item.workspace,comparison&&comparison!==item?[comparison]:[]));
  }
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
  if(['confirm-catalog-service','add-blank-service','add-starter','confirm-starter','undo-services','restore-service','use-service-price','apply','confirm-preset','undo-preset','discard','enable-profiles','add-service','duplicate','remove-service','balance','assign-remainder','priority','deadline','approve','checkpoint','pin-baseline','confirm-branch','load','confirm-restart','confirm-example','confirm-fund','confirm-import','open-archive','confirm-restore-draft','confirm-rename','confirm-delete'].includes(a))save();
 }catch(err){showError(err.message||'The action could not be completed.');}finally{actionFocus=null;}
});
document.addEventListener('keydown',e=>{
 if(savingKeptSetup||resettingApp)return;
 if(navigatorDialog?.open||waterfrontView?.open||document.querySelector('#sky-editor')?.open)return;
 if(e.key==='Escape'&&!$('#modal').firstChild){
  const menu=document.querySelector(openWorkspaceMenus);
  if(menu?.open){menu.open=false;menu.querySelector('summary').focus();e.preventDefault();return;}
 }
 const tab=e.target?.closest?.('[role="tab"][data-action="setup-step"]');
 if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
  e.preventDefault();const current=Number(tab.dataset.step),next=e.key==='Home'?0:e.key==='End'?steps.length-1:(current+(e.key==='ArrowRight'?1:-1)+steps.length)%steps.length;
  selectSetupStep(next);return;
 }
 if(!$('#modal').firstChild){if(e.key==='Escape'&&view==='map'&&selection){e.preventDefault();leaveInspector();}return;}
 if(e.key==='Escape'&&clientMenuBuilder&&!clientMenuBuilder.picking&&clientMenuBuilder.swap!==null){
  e.preventDefault();const index=clientMenuBuilder.swap;clientMenuBuilder.swap=null;renderClientMenu('cm-swap-'+index,true);return;
 }
 if(e.key==='Escape'&&offerPicker?.evidenceKey){e.preventDefault();restorePickerDetails(offerPicker.evidenceKey);return;}
 if(e.key==='Escape'){closeModal();render();}
 if(e.key==='Tab'){const els=modalTabStops();if(!els.length)return;e.preventDefault();const current=els.indexOf(document.activeElement),next=current<0?(e.shiftKey?els.length-1:0):(current+(e.shiftKey?-1:1)+els.length)%els.length;els[next].focus();}
});
window.addEventListener('beforeunload',e=>{if(resettingApp)return;save();studioSession.save();jobsSession.save();plannerSession.save();if(savingKeptSetup||plannerSession.unsaved||jobsSession.unsaved||studioSession.unsaved||storeError||saveStatus==='saving'||saveStatus==='pending'||recoveryRaw!==null||primaryReadFailed){e.preventDefault?.();e.returnValue='';}});
if(window.location)view='sky';
render();
const appReady=initializeStorage().then(()=>{
 routeReady=Boolean(window.location&&window.history);
 if(routeReady)readWorkspaceRoute();
});
window.addEventListener('hashchange',readWorkspaceRoute);
const studioReady=studioSession.open().then(()=>{if(['studio','planner','jobs'].includes(view))render();});
const jobsReady=jobsSession.open().then(()=>{if(view==='jobs'||view==='planner')render();});
const plannerReady=plannerSession.open().then(()=>{plannerController.initialize();if(view==='planner')render();});

function dollars(value){return offerAmount(value);}
function analyticsRate(v){return v===null?'—':(v*100).toFixed(1)+'%';}
function analyticsMoney(v){return v===null?'—':dollars(v);}
function analyticsRows(rows){return rows.map(([label,value])=>`<div class="minirow"><span>${label}</span><b>${value}</b></div>`).join('');}
function analyticsTable(headers,rows,empty='No results yet. Advance the simulation to populate this view.'){
 return `<div class="tablewrap analytics-table"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
}
function resultCell(value){return `<td class="${value<0?'negative':''}">${dollars(value)}</td>`;}
function financeView(m){
 const a=QQ.analytics(state);
 return `<div class="analytics-context"><span>${analyticsTab==='overview'||analyticsTab==='cash'?'USD':'USD · Run to date unless labeled monthly'}</span></div>
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
function monthDrivers(r,costs,links){
 const rows=[];
 const add=(label,amount,note='',link='')=>{
  const signed=(amount>0?'+':'')+dollars(amount);
  rows.push(`<li class="month-driver"><div><b>${label}</b>${note?`<small>${note}</small>`:''}${link}</div><strong>${signed}</strong></li>`);
 };
 const leading=r.services.reduce((best,s)=>s.revenue>(best?.revenue||0)?s:best,null);
 const revenueNote=leading?`${esc(leading.name)} earned ${dollars(leading.revenue)} from ${leading.delivered} ${leading.delivered===1?'delivery':'deliveries'}. ${monthProjectLink(leading.deliveredProjectId,'month-delivery',r.endDay)}`:'';
 add('Delivered revenue',r.revenue,revenueNote);
 for(const [label,amount] of costs){
  const link=label==='Design labor'?links?.designerRate:label==='Shared overhead'?links?.overhead:'';
  add(label,-amount,'',link);
 }
 let workInProgress='';
 if(r.awaitingDelivery){
  const scope=r.awaitingDelivery===1?'1 accepted job was':r.awaitingDelivery+' accepted jobs were';
  const spent=r.unfinishedCost?` Of the costs above, <b>${dollars(r.unfinishedCost)}</b> went toward this work.`:'';
  const link=btn('See '+r.awaitingDelivery+' unfinished '+(r.awaitingDelivery===1?'job':'jobs')+' at day '+r.endDay,'month-jobs','table-link',`data-month="${r.month}"`);
  workInProgress=`<p class="month-unfinished">${scope} still awaiting delivery at day ${r.endDay}.${spent} ${link}</p>`;
 }
 return `<section class="panel padded month-driver-panel"><h2>What drove the result</h2><ul class="month-drivers">${rows.join('')}</ul>${workInProgress}</section>`;
}
function monthCash(r,links){
 const atEnd=[];
 if(r.receivable)atEnd.push(dollars(r.receivable)+' remained due on delivered work');
 if(r.depositsHeld)atEnd.push(dollars(r.depositsHeld)+' had been collected on unfinished work');
 const balances=atEnd.length?`<p>At day ${r.endDay}, ${atEnd.join(' and ')}.</p>`:'';
 const cashLinks=[r.receivable>0&&links?.paymentDays,r.depositsHeld>0&&links?.deposit].filter(Boolean).join('');
 const movement=r.cashChange===0?'Unchanged from':r.cashChange>0?`Up ${dollars(r.cashChange)} from`:`Down ${dollars(-r.cashChange)} from`;
 return `<section class="panel padded month-cash-summary"><h2>Closing cash</h2><strong class="month-cash-balance">${dollars(r.closingCash)}</strong><p>${movement} ${dollars(r.openingCash)} at the start of the month.</p>
 <p>Customers paid <b>${dollars(r.receipts)}</b>. The studio paid <b>${dollars(r.cost)}</b> in costs.${r.funding?' Owner funding added <b>'+dollars(r.funding)+'</b>.':''}</p>${balances}${cashLinks?'<div class="run-assumption-list">'+cashLinks+'</div>':''}
 ${btn('See cash movements','month-cash','small',`data-month="${r.month}"`)}</section>`;
}
function monthlyOverview(links){
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
 <div class="two-col month-explanation">${monthDrivers(r,costs,links)}${monthCash(r,links)}</div>`;
}
function deliveryExplainsRevenueGap({actual,estimate}){
 return actual.newBacklog>0&&actual.returnRevenue===0&&actual.newBooked===estimate.revenue&&
  QQ.round(estimate.revenue-actual.revenue)===actual.newBacklog;
}
function resultAssumptionLinks(comparison,targets=new Map()){
 const config=rerunStartingConfig(state),{actual,days}=comparison;
 const revision=rerunDraft?.run===state?rerunDraft.draft:config;
 const jump=(path,label,value,service=null,month=null)=>{
  // Input controls use the current offer order; setup comparisons use its stable ID.
  const key=service?path.replace(/^services\.\d+\./,'services.'+service.id+'.'):path;
  targets.set(key,{path,label,service});
  const target=service?` data-service-id="${esc(service.id)}"`:'';
  const period=month?' data-results-month="'+month+'"':'';
  const name=service?' <span class="assumption-offer">· '+serviceName(service)+'</span>':'';
  return btn(`<span><span>${label}</span>${name}</span><b>${value}</b><i aria-hidden="true">→</i>`,'test-assumption','assumption-jump',`data-path="${path}"${target}${period} data-render-key="test-${month?month+'-':''}${path}"`);
 };
 const month=resultsMonths.get(state)??Math.ceil(state.day/30);
 const monthly={
  paymentDays:jump('paymentDays','Test final payment terms',countDays(config.paymentDays),null,month),
  deposit:jump('deposit','Test client deposit',inquiryShare(config.deposit),null,month),
  designerRate:jump('designerRate','Test designer hourly cost',offerAmount(config.designerRate),null,month),
  overhead:jump('overhead','Test monthly overhead',offerAmount(config.overhead),null,month)
 };
 let volume;
 if(config.acquisition!==revision.acquisition||config.acquisition==='sales'&&!config.ownerHours&&!config.outreachHours){
  volume=jump('acquisition','Test inquiry source',config.acquisition==='sales'?'Estimate from outreach':'Enter monthly inquiries');
 }else if(config.acquisition==='preset')volume=jump('inquiries','Test monthly inquiries',config.inquiries);
 else if(!config.ownerHours)volume=jump('ownerHours','Test weekly owner hours',effortHours(config.ownerHours)+' h');
 else if(!config.outreachHours)volume=jump('outreachHours','Test outreach time',effortHours(config.outreachHours)+' h');
 else volume=jump('leadsPerHour','Test inquiries per outreach hour',config.leadsPerHour);
 const priorTarget=rerunLink?.run===state?rerunLink.original.launchEstimate?.clientDemand:null;
 const targetShare=config.clientDemand||priorTarget?jump('clientDemand.share','Test client inquiry share',(config.clientDemand?.share??0)+'%'):'';
 if(!comparison.estimate)return {volume,monthly,targetShare};

 // A service may have been removed or reordered mid-run. Only link to
 // offers and fulfillment routes that can receive work in the next setup.
 const projection=QQ.estimate({...config,months:days/30});
 const revisedOffers=new Map(revision.services.map(service=>[service.id,service]));
 const offers=config.services.map((service,index)=>({service,index,revised:revisedOffers.get(service.id),plan:projection.services[index],managed:0,files:0,supplier:0}))
  .filter(offer=>offer.plan.effectiveShare>0&&offer.revised?.weight>0);
 const byId=new Map(offers.map(offer=>[offer.service.id,offer]));
 const projectOffers=new Map();
 const returns=new Set(),waits=new Map();
 for(const project of state.projects){
  if(project.accepted===undefined||project.accepted>days)continue;
  const offer=byId.get(project.serviceId);
  if(offer)projectOffers.set(project.id,offer);
  if(project.deliveredDay!==undefined&&project.deliveredDay<=days){
   if(!offer)continue;
   const files=project.terms?.fulfillment?.mode==='design-only';
   offer[files?'files':'managed']+=project.price;
   if(project.orderKind!=='new-business'&&project.price>0){
    const recurring=project.orderKind==='campaign-reoffer'||project.orderKind==='paid-cycle-renewal';
    if(recurring===Boolean(offer.service.recurring||offer.service.campaign))returns.add(recurring?'retention':'repeat');
   }
  }else if(project.orderKind==='new-business'&&days===state.day){
   // A stage seen after a horizon extension cannot explain an earlier wait.
   const path={design:config.designers?'designerHours':'designers',review:'ownerHours',delivery:'ownerHours',approval:'approvalDays',production:'printDays'}[project.stage];
   if(path)waits.set(path,(waits.get(path)||0)+1);
  }
 }
 for(const entry of state.ledger){
  if(entry.day>days)break;
  const offer=projectOffers.get(entry.project);
  if(offer&&entry.type==='expense'&&QQ.directExpenseKind(entry)==='supplierCost')offer.supplier-=entry.amount;
 }
 const strongest=(list,score)=>list.reduce((best,item)=>!best||score(item)>score(best)?item:best,null);
 // Select the offer contributing most in the direction of the displayed gap.
 // A high-volume offer that was right on estimate shouldn't take the user
 // away from the smaller offer where the difference actually occurred.
 const prices=[],suppliers=[];
 const prints=s=>s.fulfillment?s.fulfillment.managedShare>0:s.supplierMode==='print'||s.print>0;
 for(const {service,index,revised,plan,managed,files,supplier} of offers){
  const split=service.fulfillment,share=split?.managedShare??1,revisedShare=revised.fulfillment?.managedShare??1;
  const managedFee=QQ.round(service.price),filesFee=QQ.round(split?.designOnlyPrice??0);
  const expectedUnit=share*managedFee+(1-share)*filesFee;
  const managedPlan=expectedUnit?plan.revenue*share*managedFee/expectedUnit:0;
  const prefix='services.'+index+'.';
  if(share>0&&revisedShare>0)prices.push({planned:managedPlan,recorded:managed,path:prefix+'price',label:split?'Test managed-print price':'Test client price',value:service.price,service});
  if(share<1&&revisedShare<1)prices.push({planned:plan.revenue-managedPlan,recorded:files,path:prefix+'fulfillment.designOnlyPrice',label:'Test files-only price',value:split.designOnlyPrice,service});
  if(prints(service)&&prints(revised))suppliers.push({planned:plan.printCost,recorded:supplier,path:prefix+'print',label:'Test supplier cost',value:service.print,service});
 }
 const contributingLink=(candidates,metric)=>{
  const direction=Math.sign(actual[metric]-comparison.estimate[metric]);
  const score=item=>direction?direction*(item.recorded-item.planned):Math.max(item.recorded,item.planned);
  const choice=strongest(candidates,score);
  return choice&&score(choice)>.001?jump(choice.path,choice.label,offerAmount(choice.value),choice.service):'';
 };
 const wait=strongest([...waits],entry=>entry[1])?.[0];
 const waitLabels={designerHours:'Test weekly designer hours',designers:'Test designer count',ownerHours:'Test weekly owner hours',approvalDays:'Test approval time',printDays:'Test printer turnaround'};
 let waiting='';
 if(wait){
  const value=wait==='designers'?config.designers:wait==='approvalDays'||wait==='printDays'?countDays(config[wait]):effortHours(config[wait])+' h';
  waiting=jump(wait,waitLabels[wait],value);
 }
 const quoting=actual.awaitingQuote>0&&wait!=='ownerHours'?jump('ownerHours','Test weekly owner hours',effortHours(config.ownerHours)+' h'):'';
 const deliveryGap=deliveryExplainsRevenueGap(comparison);
 const conversion=actual.declinedQuotes===null||actual.declinedQuotes>0||(actual.orders>0&&(!deliveryGap||actual.orders!==comparison.estimate.orders))?jump('conversion','Test quote acceptance',inquiryShare(config.conversion)):'';
 return {volume,monthly,targetShare,conversion,quoting,revenue:deliveryGap||actual.delivered===0?'':contributingLink(prices,'revenue'),
  designLabor:jump('designerRate','Test designer hourly cost',offerAmount(config.designerRate)),
  supplierCost:contributingLink(suppliers,'supplierCost'),
  overhead:jump('overhead','Test monthly overhead',offerAmount(config.overhead)),
  waiting,
  returning:[...returns].map(path=>jump(path,path==='retention'?'Test campaign acceptance':'Test repeat orders',inquiryShare(config[path]))).join(''),
  owner:actual.ownerHours||comparison.estimate.ownerHours?jump('ownerTarget','Test value of owner time',offerAmount(config.ownerTarget)):''};
}
function estimateDriverList(comparison,links){
 const labels={revenue:'Delivered revenue',designLabor:'Design labor cost',supplierCost:'Printing and shipping',overhead:'Shared overhead',otherCost:'Other project costs'};
 const differences=comparison.drivers.filter(row=>row.impact!==0&&row.key!=='rounding').sort((left,right)=>Math.abs(right.impact)-Math.abs(left.impact));
 const rounding=comparison.drivers.find(row=>row.key==='rounding');
 const largest=Math.abs(differences[0]?.impact||0);
 const rows=differences.map(row=>{
  const amount=(row.impact>0?'+':'')+dollars(row.impact);
  const figures='Estimated '+dollars(row.estimate)+' · Actual '+dollars(row.actual);
  const hours=row.key==='designLabor'&&Number.isFinite(comparison.actual.designHours)?`<small>Design hours estimated ${effortHours(comparison.estimate.designHours)} · recorded ${effortHours(comparison.actual.designHours)}</small>`:'';
  return `<li class="run-driver ${row.impact>0?'run-gain':'run-loss'}"><div><b>${labels[row.key]}</b><strong>${amount}</strong></div>
   <small>${figures}</small>${hours}<div class="run-driver-track" aria-hidden="true"><i style="width:${50*Math.abs(row.impact)/largest}%"></i></div>${links[row.key]||''}</li>`;
 }).join('');
 const roundingNote=rounding?`<p class="run-rounding">Rounding adjustment ${(rounding.impact>0?'+':'')+dollars(rounding.impact)}</p>`:'';
 if(!rows)return (roundingNote||'<p class="run-exact">Delivered revenue and costs matched the estimate.</p>')+links.volume;
 return '<ol class="run-driver-list">'+rows+'</ol>'+roundingNote;
}
function clientOutreachResults(comparison,link){
 const plan=comparison.estimate?.clientDemand;
 if(!plan)return '';
 const profile=QQServiceCatalog.CLIENT_MENUS.find(menu=>menu.id===plan.profileId);
 if(!profile)return '';
 const observed=QQ.clientDemandActuals(state,plan.profileId,comparison.days);
 const format=value=>Number.isFinite(value)?value.toLocaleString(QQI18n.language,{maximumFractionDigits:2}):'—';
 const all=comparison.actual.leads;
 const recorded=Number.isFinite(observed.targeted)&&all>0?new Intl.NumberFormat(QQI18n.language,{style:'percent',maximumFractionDigits:1}).format(observed.targeted/all):null;
 const rows=[['New inquiries','targeted'],['Matched an offer','matched'],['Accepted first orders','orders']];
 return `<section class="run-client-demand" aria-labelledby="run-client-title"><div class="run-client-heading"><div>
  <p>Client outreach</p><h3 id="run-client-title">${esc(profile.name)}</h3></div>${link||''}</div>
  <p class="run-client-split"><span><span>Planned share of new inquiries</span> <b>${plan.share}%</b></span>${recorded?`<span><span>Recorded share</span> <b>${recorded}</b> (${format(observed.targeted)} / ${format(all)})</span>`:''}</p>
  <table aria-labelledby="run-client-title"><thead><tr><th scope="col">Measure</th><th scope="col">${comparison.basis==='reconstructed'?'Reconstructed estimate':'Setup estimate'}</th><th scope="col">Actual</th></tr></thead>
  <tbody>${rows.map(([name,key])=>`<tr data-client-outcome="${key}"><th scope="row">${name}</th><td>${format(plan[key])}</td><td>${format(observed[key])}</td></tr>`).join('')}</tbody></table>
  ${observed.targeted===null?'<p class="run-comparison-note">The saved history is missing the client breakdown for this period.</p>':''}</section>`;
}
function completedRunOverview(comparison,links=resultAssumptionLinks(comparison)){
 const {estimate,actual,days,basis}=comparison;
 const period=daySpan(1,days);
 const range=`<p class="run-comparison-period" id="run-comparison-period"><span>Operating result</span> <span>${period}</span></p>`;
 if(!estimate){
  const note=basis==='shortened'?'The setup estimate covered '+comparison.launchDays+' days. This run ended on day '+state.day+'.':'The opening assumptions are unavailable for this saved run.';
  return `<section class="run-comparison" aria-labelledby="run-comparison-title"><header class="run-comparison-head run-comparison-unavailable">${range}
   <h2 id="run-comparison-title" tabindex="-1" aria-describedby="run-comparison-period">${dollars(actual.profit)}</h2><p class="run-comparison-note">${note}</p>
   <p class="run-test-note">Choose an assumption to change and compare the two runs.</p>${links.volume}${links.targetShare||''}</header></section>`;
 }
 const gap=QQ.round(actual.profit-estimate.profit);
 const capacityNote=launchCapacityNote(estimate.deliveryStatus);
 const deliveries=actual.delivered===1?'1 job delivered':actual.delivered+' jobs delivered';
 const verdict=capacityNote?deliveries:gap===0?'On estimate':dollars(Math.abs(gap))+(gap>0?' above estimate':' below estimate');
 const label=basis==='reconstructed'?'Reconstructed estimate':'If all expected new orders ship';
 const notes=capacityNote?[capacityNote]:[];
 if(basis==='reconstructed')notes.push('The estimate uses the recorded starting assumptions for this period.');
 if(days<state.day)notes.push('The run continued to day '+state.day+'. This comparison ends at the original horizon.');
 if(comparison.changes)notes.push('Setup changed during the run. The estimate uses the starting assumptions.');
 const n=v=>QQ.round(v).toLocaleString(QQI18n.language);
 const hasDrivers=comparison.drivers.some(row=>row.impact!==0&&row.key!=='rounding');
 const demandLinks=(hasDrivers&&(!actual.leads||actual.leads!==estimate.leads)?links.volume:'')+(estimate.leads||actual.leads?links.conversion:'');
 const pipeline=`<dl class="run-order-flow"><div><dt>Expected first orders</dt><dd>${n(estimate.orders)}</dd></div><div><dt>Accepted first orders</dt><dd>${n(actual.orders)}</dd></div><div><dt>Delivered first orders</dt><dd>${n(actual.newDelivered)}</dd></div></dl>`;
 const workNotes=[];
 if(actual.unservedInquiries>0)workNotes.push(`<p><span>Inquiries with no matching offer</span> <b>${n(actual.unservedInquiries)}</b></p>`);
 if(actual.awaitingQuote>0)workNotes.push(`<p><span>Inquiries still awaiting a first quote</span> <b>${n(actual.awaitingQuote)}</b></p>${links.quoting}`);
 if(actual.declinedQuotes>0)workNotes.push(`<p><span>First quotes declined by buyers</span> <b>${n(actual.declinedQuotes)}</b></p>`);
 if(actual.newBooked!==estimate.revenue)workNotes.push(`<p>First orders booked for ${dollars(actual.newBooked)} against ${dollars(estimate.revenue)} expected.</p>`);
 if(actual.orders>actual.newDelivered)workNotes.push(`<p>Accepted first orders worth ${dollars(actual.newBacklog)} were still awaiting delivery.</p>${links.waiting}`);
 if(deliveryExplainsRevenueGap(comparison))workNotes.push('<p>The undelivered first orders account for the entire gap in delivery revenue.</p>');
 if(actual.returnRevenue>0)workNotes.push(`<p>Returning work added ${dollars(actual.returnRevenue)} in delivered revenue.</p>${links.returning}`);
 if(!workNotes.length)workNotes.push('<p>The estimate assumes each expected first order earns its price by the end of the period.</p>');
 if(actual.delivered||actual.receipts>0)workNotes.push(`<p><span>Client payments collected</span> <b>${dollars(actual.receipts)}</b></p>`);
 if(actual.receivable>0)workNotes.push(`<p><span>Delivered balances to collect</span> <b>${dollars(actual.receivable)}</b></p>`);
 if(actual.depositsHeld>0)workNotes.push(`<p><span>Deposits received for undelivered work</span> <b>${dollars(actual.depositsHeld)}</b></p>`);
 const row=(metric,projected,recorded)=>`<tr><th scope="row">${metric}</th><td>${projected}</td><td>${recorded}</td></tr>`;
 const amountPair=(metric,key)=>row(metric,dollars(estimate[key]),dollars(actual[key]));
 const hours=value=>Number.isFinite(value)?n(value)+' h':'—';
 const table=`<table><thead><tr><th scope="col">Measure</th><th scope="col">${label}</th><th scope="col">Actual</th></tr></thead><tbody>
  ${row('New inquiries',n(estimate.leads),actual.leads===null?'—':n(actual.leads))}
  ${row('Design hours',hours(estimate.designHours),hours(actual.designHours))}${row('Owner hours',hours(estimate.ownerHours),hours(actual.ownerHours))}
  ${amountPair('Delivered revenue','revenue')}${amountPair('Incurred costs','cost')}${amountPair('Operating result','profit')}${amountPair('After owner time','afterOwner')}</tbody></table>`;
 return `<section class="run-comparison" aria-labelledby="run-comparison-title"><header class="run-comparison-head"><div>${range}
  <h2 id="run-comparison-title" tabindex="-1" aria-describedby="run-comparison-period">${verdict}</h2></div>
  <dl class="run-comparison-totals">${estimate.deliveryStatus==='blocked'?`<div><dt>Overhead incurred</dt><dd>${offerAmount(actual.overhead)}</dd></div>`:`<div><dt>${label}</dt><dd data-run-estimate="profit">${setupResultAmount(estimate.profit)}</dd></div>`}<div><dt>Simulated operating result</dt><dd>${setupResultAmount(actual.profit)}</dd></div></dl></header>
  ${notes.length?`<div class="run-basis">${notes.map(line=>`<p>${line}</p>`).join('')}</div>`:''}
  <p class="run-test-note">Choose an assumption to change and compare the two runs.</p>
  <div class="run-comparison-body"><section><h3>What moved the operating result?</h3>${estimateDriverList(comparison,links)}</section>
  <section><h3>From inquiry to payment</h3>${pipeline}<div class="run-assumption-list">${demandLinks}</div><div class="run-work-notes">${workNotes.join('')}</div>
  <div class="run-owner-line"><h4>After owner time</h4><p>${dollars(actual.afterOwner)} actual against ${dollars(estimate.afterOwner)} estimated.</p>
  <small>Owner hours estimated ${n(estimate.ownerHours)} · recorded ${n(actual.ownerHours)}</small>
  ${actual.rateHistoryAvailable===false?'<small>The actual figure values recorded hours at the current owner rate.</small>':''}${links.owner}</div></section></div>
  ${clientOutreachResults(comparison,links.targetShare)}
  <details class="run-comparison-detail" data-disclosure="run-estimate-details"><summary>Compare all figures</summary>
  <div class="tablewrap" tabindex="0" role="region" aria-label="Estimate and actual figures">${table}</div></details></section>`;
}
function keepSetupDecision(changes,metric,firstValue,secondValue){
 // A single changed input usually identifies a version more clearly than its profit.
 // For a broader revision, reuse the outcome and time window from the verdict.
 const single=changes.length===1?changes[0]:null;
 const setting=single&&Math.max(single.before.length,single.after.length)<=40?single:null;
 const label=setting?.label||metric;
 const choice=(version,action,value)=>btn(
  `<span>${action}</span><small><span>${esc(label)}</span> · <strong>${esc(value)}</strong></small><i aria-hidden="true">→</i>`,
  'keep-run-setup','variant-keep',`data-version="${version}"`);
 return `<section class="variant-decision" aria-labelledby="variant-decision-title"><div>
  <h3 id="variant-decision-title">Which setup do you want to keep?</h3>
  <p>Your choice opens in setup for the next run. Both results stay in Saved comparisons.</p></div>
  <div class="variant-choices">${choice('original','Keep original setup',setting?.before||dollars(firstValue))}
  ${choice('revised','Keep revised setup',setting?.after||dollars(secondValue))}</div></section>`;
}
// The pair is bound to the experiment that produced this run. A manually
// pinned checkpoint can be an entirely different business or period.
function variantResultsOverview(pair,{comparison,targets,readOnly=false,kept=pair.keptVersion}={}){
 const {original,revised}=pair,days=Math.min(original.day,revised.day);
 const first={...QQ.runActualsThrough(original,days)};
 const second={...(!readOnly&&comparison?.days===days?comparison.actual:QQ.runActualsThrough(revised,days))};
 const before=rerunStartingConfig(original),after=rerunStartingConfig(revised);
 const changes=configDiff(before,after).filter(item=>modeledAssumption(item.path));
 const cashTerms=['deposit','paymentDays','startingCash'];
 const cashTest=changes.length>0&&changes.every(item=>cashTerms.includes(item.path));
 const ownerTest=changes.length===1&&changes[0].path==='ownerTarget';
 const focus=cashTest?'closingCash':ownerTest?'afterOwner':'profit';
 const metricName={closingCash:'Closing cash',afterOwner:'Result after owner time',profit:'Operating result'}[focus];
 const difference=QQ.round(second[focus]-first[focus]);
 const verdict=difference===0?metricName+' was unchanged':metricName+(difference>0?' rose by ':' fell by ')+dollars(Math.abs(difference));
 const prefix=readOnly?'saved-variant':'variant';
 const disclosure=readOnly&&pair.comparisonId?prefix+'-'+esc(pair.comparisonId):prefix;
 if(!readOnly&&!targets){
  targets=new Map();
  resultAssumptionLinks(comparison||QQ.runEstimateComparison(revised),targets);
 }
 const editRow=item=>{
  const target=readOnly?null:targets.get(item.path);
  let label='<span>'+esc(item.label)+'</span>';
  if(target){
   const {path,service}=target,offer=service?' · '+serviceName(service):'';
   const identity=service?' data-service-id="'+esc(service.id)+'"':'';
   label=btn(`${target.label}${offer} <i aria-hidden="true">↗</i>`,'test-assumption','variant-edit-link',
    `data-variant-input data-path="${esc(path)}"${identity} data-render-key="variant-input-${esc(item.path)}"`);
  }
  return `<li>${label}<b>${esc(item.before)} <i aria-hidden="true">→</i> <span class="variant-sr">Revised run</span> ${esc(item.after)}</b></li>`;
 };
 const list=items=>`<ul class="variant-edits">${items.map(editRow).join('')}</ul>`;
 const opening=changes.length?list(changes.slice(0,2)):'<p>The starting assumptions matched.</p>';
 const more=changes.length>2?`<details class="variant-extra-edits" data-disclosure="${disclosure}-input-changes"><summary>More setup changes (${changes.length-2})</summary>${list(changes.slice(2))}</details>`:'';
 const conditions=QQ.workloadComparison(revised,original,days);
 const notes=[];
 if(conditions.sameOrderRules===false)notes.push('Campaign scheduling or deposit rounding used different rules during the compared days.');
 if(original.day!==revised.day)notes.push('The original ran for '+original.day+' days and the revised run for '+revised.day+'. Both columns stop at day '+days+'.');
 if(conditions.sameWorkloadIdentity&&conditions.sameRealizedInquiries===true)notes.push(original.day===revised.day?'Both runs used the same seed and received the same new inquiries.':'Both runs used the same seed and received the same new inquiries through day '+days+'.');
 else{
  if(conditions.sameWorkloadIdentity)notes.push('Both runs used the same workload seed.');
  else if(before.seed!==after.seed)notes.push('The runs used different workload seeds.');
  else notes.push('The saved workload identities could not be matched.');
  if(conditions.sameRealizedInquiries===false)notes.push('The recorded new inquiries differed between runs.');
  else if(conditions.sameRealizedInquiries===null)notes.push('The saved history could not verify the incoming inquiries.');
 }
 const hasEdits=run=>run.replayJournal?.changes.some(row=>row.day>0&&row.day<days);
 if(hasEdits(original)||hasEdits(revised))notes.push('Settings also changed during the comparison period.');
 if(first.projectDecisions||second.projectDecisions)notes.push('The totals include manual project decisions made during each run.');
 if(!original.replayJournal)notes.push('The original input values come from its saved settings.');
 if(!first.rateHistoryAvailable||!second.rateHistoryAvailable)notes.push('For runs without a rate history, owner time uses the saved hourly rate.');
 const count=value=>value.toLocaleString(QQI18n.language,{maximumFractionDigits:2});
 const hours=value=>count(value)+' h';
 const rows=[
  ['Operating result','profit',dollars],['After owner time','afterOwner',dollars],
  ['Delivered projects','delivered',count],['Closing cash','closingCash',dollars]
 ];
 const detail=[
  ['New inquiries','leads',count],['Accepted first orders','orders',count],['Delivered revenue','revenue',dollars],
  ['Incurred costs','cost',dollars],['Design labor cost','designLabor',dollars],['Printing and shipping','supplierCost',dollars],
  ['Shared overhead','overhead',dollars],['Owner hours','ownerHours',hours],['Design hours','designHours',hours],
  ['Client payments collected','receipts',dollars],['Delivered receivables','receivable',dollars],
  ['Accepted jobs awaiting delivery','awaitingDelivery',count]
 ];
 // Put a directly related operational measure alongside the headline totals.
 const changed=changes.map(item=>item.path);
 const clientIds=[...new Set([after.clientDemand?.profileId,before.clientDemand?.profileId].filter(Boolean))];
 for(const id of clientIds){
  const name=QQServiceCatalog.CLIENT_MENUS.find(profile=>profile.id===id)?.name;
  if(!name)continue;
  const a=QQ.clientDemandActuals(original,id,days),b=QQ.clientDemandActuals(revised,id,days);
  for(const [metric,key] of [['New inquiries','targeted'],['Accepted first orders','orders']]){
   const measure=id+'.'+key;
   first[measure]=a[key];second[measure]=b[key];
   detail.push([esc(QQI18n.text(name))+' · '+QQI18n.text(metric),measure,count]);
  }
 }
 const evidenceKeys=[
  [/^clientDemand\./,clientIds[0]+'.targeted'],
  [/^(deposit|paymentDays)$/,'receivable'],[/^overhead$/,'overhead'],[/^designerRate$/,'designLabor'],
  [/^conversion$/,'orders'],[/^(inquiries|acquisition|outreachHours|leadsPerHour|customerMix\.|focusType)/,'leads'],
  [/^services\..+\.(price|fulfillment\.designOnlyPrice)$/,'revenue'],[/^services\..+\.print$/,'supplierCost'],
  [/^(designers|designerHours)$|\.hours$/,'designHours'],[/^(ownerHours|quoteHours|deliveryHours|ownerTarget)$|\.review$/,'ownerHours'],
  [/^(approvalDays|printDays|leadDays|priority)$/,'awaitingDelivery']
 ];
 for(const [pattern,key] of evidenceKeys){
  if(!changed.some(path=>pattern.test(path)))continue;
  const index=detail.findIndex(row=>row[1]===key);
  if(index<0)continue;
  rows.push(detail.splice(index,1)[0]);
  break;
 }
 if(first.funding||second.funding)detail.push(['Owner funding','funding',dollars]);
 if(first.projectDecisions||second.projectDecisions)detail.push(['Manual project decisions','projectDecisions',count]);
 const table=(specs,name)=>{
  const body=specs.map(([label,key,format])=>{
   const a=first[key],b=second[key],delta=a===null||b===null?null:QQ.round(b-a);
   const deltaText=delta===null?'—':delta===0?'No change':(delta>0?'+':'')+format(delta);
   return `<tr><th scope="row">${label}</th><td>${a===null?'—':format(a)}</td><td>${b===null?'—':format(b)}</td><td class="variant-delta">${delta===null||delta===0?'':'<span class="variant-delta-label" aria-hidden="true">Change </span>'}${deltaText}</td></tr>`;
  }).join('');
  return `<table class="variant-figures" aria-label="${name}"><thead><tr><th scope="col">Measure</th><th scope="col">Original run</th><th scope="col">Revised run</th><th scope="col">Change</th></tr></thead><tbody>${body}</tbody></table>`;
 };
 const movement=(label,key)=>{
  const delta=QQ.round(second[key]-first[key]);
  return delta===0?label+' was unchanged.':label+(delta>0?' rose by ':' fell by ')+dollars(Math.abs(delta))+'.';
 };
 const keptLabel=kept==='original'?'Original setup kept':kept==='revised'?'Revised setup kept':'';
 const keptNote=readOnly&&keptLabel?` <span class="variant-kept">${keptLabel}</span>`:'';
 const decision=readOnly?'':keepSetupDecision(changes,metricName,first[focus],second[focus]);
 return `<section class="variant-result" aria-labelledby="${prefix}-result-title"><header class="variant-result-head">
  <p id="${prefix}-period"><span>Run comparison</span> <span>${daySpan(1,days)}</span>${keptNote}</p>
  <h2 id="${prefix}-result-title" tabindex="-1" aria-describedby="${prefix}-period">${verdict}</h2></header>
  <div class="variant-content"><section class="variant-setup"><h3>${original.replayJournal?'Changes to the starting setup':'Compared assumptions'}</h3>${opening}${more}</section>
  <section class="variant-outcomes"><h3>Recorded outcomes</h3>${table(rows,'Recorded outcomes')}
  <p class="variant-bridge"><span>${movement('Delivered revenue','revenue')}</span> <span>${movement('Total cost','cost')}</span></p>
  </section></div><details class="variant-breakdown" data-disclosure="${disclosure}-outcome-detail"><summary>Compare work, costs and payments</summary>${table(detail,'Work, costs and payments')}</details>
  <div class="variant-basis">${notes.map(note=>`<p>${note}</p>`).join('')}</div>${decision}</section>`;
}
function marginAnalyticsView(a,m){
 const rate=analyticsRate;
 const comparison=state.day>=state.config.months*30?QQ.runEstimateComparison(state):null;
 const pair=comparison?completedVariantPair():null;
 const targets=new Map(),links=comparison?resultAssumptionLinks(comparison,targets):null;
 const experiment=pair?variantResultsOverview(pair,{comparison,targets}):'';
 const wholeRunTotals=state.day>30&&(!comparison?.estimate||comparison.days<state.day)?`<section class="run-total" aria-label="Whole run totals"><b>Whole run · days 1–${state.day}</b><span>${m.delivered} delivered</span><span>${dollars(a.profit)} operating result</span><span>${dollars(a.periodAfterOwner)} after owner time · ${state.replayJournal?'period-end targets':'current target, rate history unavailable'}</span></section>`:'';
 const wholeRun=(comparison?completedRunOverview(comparison,links):'')+wholeRunTotals;
 return `${experiment}${wholeRun}${monthlyOverview(links?.monthly)}<details class="result-details" data-disclosure="results-cumulative"><summary>Run-to-date financial details · day ${state.day}</summary><div class="two-col"><section class="panel padded"><h2>Revenue → operating result</h2>${analyticsRows([['Delivered revenue',dollars(state.revenue)],['− Direct costs on delivered work',dollars(a.deliveredCost)],['= Delivered contribution',dollars(a.contribution)],['− Costs on unfinished work',dollars(a.unfinishedCost)],['− Shared overhead',dollars(a.overhead)],['= Operating result',dollars(a.profit)],["All hours at today's target of "+dollars(state.config.ownerTarget)+'/h',dollars(a.ownerTime)],['= Result after owner time',dollars(a.afterOwner)]])}<p class="helper">Direct costs include design labor and print/shipping. Margin = result ÷ delivered revenue; shown as — when revenue is zero. Owner time is valued at the current ${dollars(state.config.ownerTarget)}/h across the entire run.</p></section>
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
 return `<div class="metrics">${metric('Contracts',a.contracts.length,'All accepted client relationships')}${metric('Booked value',offerAmount(a.contracts.reduce((n,c)=>n+c.booked,0)),'All accepted cycles, including delivered')}${metric('Delivered receivables',offerAmount(a.contracts.reduce((n,c)=>n+c.receivable,0)),'Positive balances still to collect')}${metric('Below owner-time target',a.contracts.filter(c=>c.afterOwner<0).length,'To date; excludes shared overhead')}</div>
 <section class="panel"><div class="panelhead"><div><h2>Contract economics</h2><p class="helper">One row per contract · expand a client for cycle details</p></div></div><div class="analytics-tools"><label class="search-label">Find client or contract<input id="contract-search" type="search" value="${esc(contractSearch)}" placeholder="Client name or contract ID" /></label><label class="search-label">Show<select id="contract-filter">${options([['all','All contracts'],['open','Awaiting delivery'],['receivable','Balance to collect'],['negative','Below owner-time target']],contractFilter)}</select></label><label class="search-label">Rank by<select id="contract-sort">${options([['contribution','Contribution · high to low'],['margin','Margin · high to low'],['revenue','Revenue · high to low'],['receivable','Receivable · high to low'],['afterOwner','After owner time · high to low']],contractSort)}</select></label></div>
 ${analyticsTable(['Client / contract','Delivered / accepted','Revenue','Contribution','Margin','Receivable','After owner time*'],visible.map(c=>`<tr data-render-key="contract-row-${esc(c.id)}"><td><details data-disclosure="contract-${esc(c.id)}"><summary id="contract-summary-${esc(c.id)}">${esc(c.client)}</summary><div class="contract-detail"><small>${esc(c.id)} · ${c.kind==='campaign-relationship'?'Yearly campaign relationship':c.kind==='paid-cycle'?'Paid-cycle subscription':'Repeat-purchase contract'}</small>${analyticsRows([...(c.kind==='campaign-relationship'?[['Campaign interval',c.cadenceDays+' days'],['Relationship ends','Day '+c.relationshipEndDay],['Next quote',c.nextQuoteDay===null?'Not scheduled':'Day '+c.nextQuoteDay],['Skipped campaigns',c.skippedCampaigns||0],...(c.missedCadences>0?[['Campaign periods missed while prior work was open',c.missedCadences]]:[])]:[]),['Booked value',offerAmount(c.booked)],['Collected, including deposits',offerAmount(c.collected)],['Costs on unfinished work',offerAmount(c.unfinishedCost)],['Open delivery cycles',c.open],['Owner / design hours',num(c.ownerHours)+' / '+num(c.designHours)]])}<div class="actions">${c.projects.map(id=>btn(esc(id),'project','table-link',`data-id="${esc(id)}"`)).join('')}</div></div></details></td><td>${c.delivered} / ${c.cycles}</td><td>${offerAmount(c.revenue)}</td>${resultCell(c.contribution)}<td>${analyticsRate(c.margin)}</td><td>${offerAmount(c.receivable)}</td>${resultCell(c.afterOwner)}</tr>`),'No contracts match. Contracts appear after quotes are accepted.')}
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
 <div class="two-col"><section class="panel padded"><h2>Monthly revenue & operating result</h2><div class="trend-legend"><span>▰ Revenue</span><span>━ Operating result (signed)</span></div>${a.monthly.map(r=>`<div class="trend-row"><b>M${r.month}${r.days<30?' · partial':''}</b><div><div class="trend-line"><span class="trend-bar" style="width:${r.revenue/max*100}%"></span><span>${offerAmount(r.revenue)}</span></div><div class="trend-line"><span class="trend-bar result ${r.profit<0?'loss':''}" style="width:${Math.abs(r.profit)/max*100}%"></span><span>${offerAmount(r.profit)}</span></div></div></div>`).join('')}<p class="helper">Common dollar scale; negative results are labeled with a minus sign. Partial months are not directly comparable with full 30-day months.</p></section><section class="panel padded"><h2>Pipeline & delivery health</h2>${analyticsRows([['Served / unserved external inquiries',a.external+' / '+m.unserved],['New quotes still undecided',a.pending],['Clients with accepted work',a.uniqueClients],['Late open deliveries',m.late],['Oldest quote',m.oldestQuoteAge+' d'],['Remaining owner / design work',num(m.ownerOpenHours)+' / '+num(m.designerOpenHours)+' h'],['Overdue final payments',m.overduePayments],['Owner / design hours recorded',num(state.ownerHours)+' / '+num(state.designHours)+' h']])}<p class="helper">Conversion excludes undecided quotes and returning orders. Returning share measures orders, not customer retention. Late deliveries and overdue payments are separate.</p></section></div>
 <section class="panel analytics-section"><div class="panelhead"><h2>Monthly detail</h2><span class="tag">30-DAY MODEL MONTHS</span></div>${analyticsTable(['Month','Revenue','Incurred costs','Operating result','Margin','After owner time','Delivered'],a.monthly.map(r=>`<tr><td>${r.month}${r.days<30?'<small>Partial · '+r.days+' days</small>':''}</td><td>${offerAmount(r.revenue)}</td><td>${offerAmount(r.cost)}</td>${resultCell(r.profit)}<td>${analyticsRate(r.margin)}</td>${resultCell(r.afterOwner)}<td>${r.delivered}</td></tr>`))}</section>
 ${monthSampleView()}<div class="actions">${btn('Compare runs','compare-runs','soft')}</div>`;
}
