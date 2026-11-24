/* Offline planner interaction. All amounts remain editable assumptions. */
(function(root){
 'use strict';
 const Model=typeof module!=='undefined'?require('./planner.js'):root.QQPlanner;
 const View=typeof module!=='undefined'?require('./planner-view.js'):root.QQPlannerView;
 const Bridge=typeof module!=='undefined'?require('./planner-bridge.js'):root.QQPlannerBridge;
 const Studio=typeof module!=='undefined'?require('./planner-studio.js'):root.QQPlannerStudio;
 const UI_KEY='meiqq-planner-view-v1',clone=v=>JSON.parse(JSON.stringify(v));
 function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 function create({session,ideas,render,toast,modal,closeModal,download,esc,btn,document,local,copyToSimulator}){
  const ui={selectedId:null,tab:'earnings',compareId:null,error:'',ideaId:'',undoName:'',explorerServiceId:''};let upgradedView=false; let pendingImport=null,deleted=null,bridgePlan=null,bridgeInputs={};
  try{const saved=JSON.parse(local?.getItem(UI_KEY)||'null');if(saved&&typeof saved==='object'){upgradedView=saved.version===2;if(typeof saved.selectedId==='string')ui.selectedId=saved.selectedId;if(['earnings','baseline','mix','results','compare'].includes(saved.tab))ui.tab=saved.tab;if(typeof saved.compareId==='string')ui.compareId=saved.compareId;}}catch(e){}
  function remember(){try{local?.setItem(UI_KEY,JSON.stringify({version:2,selectedId:ui.selectedId,tab:ui.tab,compareId:ui.compareId}));}catch(e){}}
  function initialize(){try{const first=session.data.studio===null,p=Studio.initialize(session.data);if(first)session.changed();if(!upgradedView&&p){ui.selectedId=p.id;ui.compareId=p.id;ui.tab='earnings';}remember();}catch(e){ui.error=e.message;}}
  function ready(){if(!session.ready)throw Error('The planner is still opening. Wait before editing or downloading.');}
  function plan(id){const p=session.data.plans.find(v=>v.id===(id||ui.selectedId));if(!p)throw Error('Select a plan first.');return p;}
  function focus(selector){document.querySelector(selector)?.focus?.({preventScroll:true});}
  function content(){if(!session.data.plans.some(p=>p.id===ui.selectedId))ui.selectedId=session.data.plans[0]?.id||null;return View.render(session.data,ui,ideas());}
  function reportError(message){ui.error=message;render();focus('#planner-error');}
  function input(el){
   if(el.dataset?.plannerExplorerService!==undefined){ui.explorerServiceId=el.value;render();return true;}
   if(el.dataset?.plannerStudio){try{ready();if(Studio.update(session.data,el.dataset.plannerStudio,el.value)){ui.error='';session.changed();render();remember();}}catch(e){reportError(e.message);}return true;}
   if(el.dataset?.plannerBridge){bridgeInputs[el.dataset.plannerBridge]=el.value;return true;}
   if(el.dataset?.plannerIdea!==undefined){ui.ideaId=el.value;render();return true;}
   if(el.dataset?.plannerCompare!==undefined){ui.compareId=el.value;render();remember();return true;}
   if(!el.dataset?.plannerField)return false;
   try{ready();const id=el.dataset.planId||ui.selectedId,path=el.dataset.plannerField,current=path.split('.').reduce((v,k)=>v?.[k],plan(id));if(current===el.value)return true;Studio.updateField(session.data,id,path,el.value);ui.error='';session.changed();render();remember();}catch(e){reportError(e.message);}
   return true;
  }
  function previewImport(raw){ready();pendingImport=Model.parseText(raw);modal(`<h2 id="dialog-title">Add saved plans?</h2><p>Add ${pendingImport.plans.length} plans as new copies, keeping their frozen baselines, assumptions and alternatives. Existing plans stay in place. Importing again creates additional copies.</p>${session.status==='error'?'<p class="banner warn">Saving is unavailable. Imported copies stay in this tab only; download a Planner backup before closing.</p>':''}<div class="actions">${btn('Cancel','close')}${btn('Add plan copies','planner-confirm-import','primary')}</div>`);}
  function importFile(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>Model.MAX_BYTES)throw Error('Choose a Planner backup smaller than 8 MiB.');previewImport(await file.text());}catch(e){reportError(e.message||'The Planner backup could not be opened.');}};input.click();}
  function reviewBridge(id){
   bridgePlan=clone(plan(id));bridgeInputs=Object.fromEntries(Bridge.FIELDS.map(([key])=>[key,'']));const review=Bridge.inspect(bridgePlan);
   modal(`<h2 id="dialog-title">Review a simulator copy</h2><p>This creates a separate setup draft. Your current run and previous setup will be preserved. No real jobs or Studio ideas are changed.</p><div class="tablewrap"><table><tbody>${review.mapping.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(value)}</td></tr>`).join('')}</tbody></table></div>${review.supported?`<p class="banner warn">These are new simulation assumptions, not a forecast. Complete every field, then explicitly copy. You can review all simulator settings before applying.</p><div class="planner-fields">${Bridge.FIELDS.map(([key,label,min,max,whole])=>`<label class="input-field" for="planner-bridge-${key}"><span>${esc(label)}</span><input id="planner-bridge-${key}" data-planner-bridge="${key}" type="text" inputmode="${whole?'numeric':'decimal'}" placeholder="To confirm" value=""><small>${min}–${max}${whole?' · whole number':''}</small></label>`).join('')}</div><p class="helper">Cash and payment timing can make completed work differ from this capacity plan. The design-team and review labels are a simplified representation of your chosen roles.</p>`:`<div class="banner warn"><b>This workflow cannot be copied faithfully yet.</b><ul>${review.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>Keep using the planner for this mix. No settings have been changed.</div>`}<div class="actions">${btn('Close','close')}${review.supported?btn('Copy to simulator draft','planner-confirm-bridge','primary'):''}</div>`);
  }
  function action(name,data={}){
   ready();ui.error='';const id=data.id||data.planId||ui.selectedId;let changed=false;
   if(name==='planner-backup'){download('MEIQQ-Planner.json',Model.serialize(session.data));toast('Planner backup requested: plans, alternatives and frozen baselines. Jobs, ideas and simulator runs have separate backups.');return;}
   if(name==='planner-original'){const item=session.originals[Number(data.index)];if(item)download('MEIQQ-Planner-Preserved-'+data.index+'.json',item.text);return;}
   if(name==='planner-import'){importFile();return;}
   if(name==='planner-confirm-import'){if(!pendingImport)throw Error('Choose a Planner backup first.');const count=session.merge(pendingImport);pendingImport=null;closeModal();toast(count+' plan copies added'+(session.status==='error'?' in this tab only; download a backup before closing.':'.'));}
   else if(name==='planner-add'||name==='planner-example'){
    const existing=name==='planner-example'?session.data.plans.find(p=>p.origin==='example'):null;
    const created=existing||Model.create(session.data,{example:name==='planner-example'});ui.selectedId=created.id;ui.compareId=created.id;ui.tab='baseline';changed=!existing;if(existing)toast('Opened your editable example. Make an alternative to try another version.');
   }else if(name==='planner-select'){plan(id);ui.selectedId=id;ui.compareId=id;}
   else if(name==='planner-studio'){const before=JSON.stringify(session.data),p=Studio.open(session.data);ui.selectedId=p.id;ui.compareId=p.id;ui.tab='earnings';changed=before!==JSON.stringify(session.data);}
   else if(name==='planner-partner-restore'){changed=Studio.restorePartner(session.data);ui.tab='earnings';toast('Partner capacity restored. Map any unassigned work in Service mix.');}
   else if(name==='planner-try-scenario'){const created=Studio.tryScenario(session.data,id,data.serviceId,Number(data.quantity),today());ui.selectedId=created.id;ui.compareId=created.id;ui.tab='earnings';changed=true;toast('Saved an alternative with the proposed price and quantity. Check the capacity result; effort has not changed.');}
   else if(name==='planner-tab'){if(['earnings','baseline','mix','results','compare'].includes(data.tab))ui.tab=data.tab;}
   else if(name==='planner-compare'){ui.compareId=id;ui.tab='compare';}
   else if(name==='planner-duplicate'){const created=Model.duplicate(session.data,id,{date:today()});ui.selectedId=created.id;ui.compareId=created.id;ui.tab='mix';changed=true;toast('Alternative created with the same frozen baseline. Edit its assumptions to compare.');}
   else if(name==='planner-capture'){
    const current=plan(id);modal(`<h2 id="dialog-title">Freeze a dated baseline</h2><p>Save the current assumptions in ${esc(current.name||'Untitled plan')} as its comparison baseline. Existing alternatives keep their earlier baseline. Future edits will not change this snapshot.</p><label class="input-field" for="planner-baseline-date">Date<input id="planner-baseline-date" type="date" value="${today()}"></label><div class="actions">${btn('Cancel','close')}${btn('Freeze baseline','planner-confirm-capture','primary',`data-id="${esc(id)}"`)}</div>`);return;
   }else if(name==='planner-confirm-capture'){Model.captureBaseline(session.data,id,document.querySelector('#planner-baseline-date').value);changed=true;closeModal();toast('Dated baseline frozen.');}
   else if(name==='planner-delete'){const current=plan(id);modal(`<h2 id="dialog-title">Delete this plan?</h2><p>Remove ${esc(current.name||'Untitled plan')} and its attached baseline from this browser. Other alternatives keep their own baseline copies. Undo is available until you delete another plan or close this app; downloaded backups also keep their copy.</p><div class="actions">${btn('Cancel','close')}${btn('Delete plan','planner-confirm-delete','primary',`data-id="${esc(id)}"`)}</div>`);return;}
   else if(name==='planner-confirm-delete'){const copy=clone(session.data);copy.plans=[clone(plan(id))];if(copy.studio?.planId!==id)copy.studio=null;Model.remove(session.data,id);deleted=copy;ui.undoName=copy.plans[0].name||'Untitled plan';changed=true;closeModal();}
   else if(name==='planner-undo-delete'){if(!deleted)throw Error('There is no deleted plan to restore.');session.merge(deleted);ui.selectedId=session.data.plans.at(-1).id;ui.compareId=ui.selectedId;deleted=null;ui.undoName='';toast('Deleted plan restored as a new copy.');}
   else if(name==='planner-pool-add'){Model.addPool(session.data,id);changed=true;}
   else if(name==='planner-expense-add'){Model.addExpense(session.data,id);changed=true;}
   else if(name==='planner-service-add'){const row=Model.addService(session.data,id);ui.explorerServiceId=row.id;changed=true;ui.tab='mix';}
   else if(['planner-pool-remove','planner-expense-remove','planner-service-remove'].includes(name)){const type=name.split('-')[1],rows=plan(id)[type==='pool'?'pools':type==='expense'?'expenses':'services'],row=rows[Number(data.index)];if(!row)throw Error('Choose a row first.');Model['remove'+type[0].toUpperCase()+type.slice(1)](session.data,id,row.id);changed=true;}
   else if(name==='planner-allocation-add'){Model.setAllocation(session.data,id,data.serviceId,'',{hours:'',setupHours:''});changed=true;}
   else if(name==='planner-allocation-remove'){Model.removeAllocation(session.data,id,data.serviceId,Number(data.index));changed=true;}
   else if(name==='planner-idea-add'){const idea=ideas().find(v=>v.id===(data.ideaId||ui.ideaId));if(!idea)throw Error('Choose a saved Studio idea to copy.');const row=Model.fromIdea(session.data,id,idea,today());ui.explorerServiceId=row.id;changed=true;ui.tab='mix';toast('Idea copied. Map its role hours to your capacity pools and confirm setup counts.');}
   else if(name==='planner-bridge'){reviewBridge(id);return;}
   else if(name==='planner-confirm-bridge'){if(!bridgePlan)throw Error('Review a plan first.');const prepared=Bridge.prepare(bridgePlan,bridgeInputs,today());copyToSimulator(prepared);bridgePlan=null;return;}
   if(changed)session.changed();render();remember();if(['planner-select','planner-add','planner-example','planner-duplicate','planner-undo-delete'].includes(name))focus('#planner-selected-heading');
  }
  function planIdea(idea){ready();const result=Studio.fromIdea(session.data,idea,today());ui.selectedId=result.planId;ui.compareId=result.planId;ui.explorerServiceId=result.serviceId;ui.tab='mix';ui.error='';if(result.added)session.changed();remember();toast(result.added?'Idea copied into your Studio plan. Confirm volume and map role hours before comparing earnings.':'Opened the existing copy in your Studio plan.');return result;}
  return {ui,render:content,input,action,reportError,previewImport,initialize,planIdea};
 }
 const api={create};root.QQPlannerController=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
