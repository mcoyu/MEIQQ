/* UI actions for Jobs. Draft edits never post work, agreements or money. */
(function(root){
 'use strict';
 const Model=typeof module!=='undefined'?require('./jobs.js'):root.QQJobs;
 const View=typeof module!=='undefined'?require('./jobs-view.js'):root.QQJobsView;
 const PRACTICE={title:'One sales question',client:'Example retailer',scope:'One source, one reporting period, a short findings brief and one review call.',owner:'Studio owner',nextAction:'Confirm the source data and the question to answer',price:'600',estimatedDirectCost:'170',ownerHours:'3',ownerRate:'40',overhead:'30',paymentTerms:'Example: $200 deposit, $400 balance after delivery'};
 function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 const UI_KEY='meiqq-jobs-view-v1';
 function create({session,findIdea,openWorkspace,render,toast,modal,closeModal,download,esc,btn,document,local}){
  const ui={selectedId:null,tab:'overview',form:'work',error:'',filter:'active',search:'',undo:null};let pendingImport=null;
  try{const saved=JSON.parse(local?.getItem(UI_KEY)||'null');if(saved&&typeof saved==='object'){
   if(typeof saved.selectedId==='string')ui.selectedId=saved.selectedId;
   if(['overview','work','money','history'].includes(saved.tab))ui.tab=saved.tab;
   if(Object.hasOwn(Model.FORM_FIELDS,saved.form)&&saved.form!=='void')ui.form=saved.form;
   if(['active','trash','archive'].includes(saved.filter))ui.filter=saved.filter;
   if(typeof saved.search==='string'&&saved.search.length<=200)ui.search=saved.search;
  }}catch(e){}
  function remember(){try{local?.setItem(UI_KEY,JSON.stringify({selectedId:ui.selectedId,tab:ui.tab,form:ui.form,filter:ui.filter,search:ui.search}));}catch(e){/* View preferences must never prevent a record from being saved. */}}
  function focus(selector){const el=document.querySelector(selector);el?.focus?.({preventScroll:true});el?.scrollIntoView?.({block:'nearest'});}
  function visible(){return View.visibleJobs(session.data,ui);}
  const job=id=>{const value=session.data.jobs.find(v=>v.id===(id||ui.selectedId));if(!value)throw Error('Select a job first.');return value;};
  function ready(){if(!session.ready)throw Error('Jobs are still opening. Wait before editing or downloading.');}
  function startFromIdea(idea){
   ready();
   const created=Model.fromIdea(session.data,idea);
   Object.assign(ui,{selectedId:created.id,tab:'overview',form:'work',filter:'active',search:'',error:'',undo:null});
   session.changed();remember();
   return created;
  }
  function content(){const available=visible();if(!available.some(v=>v.id===ui.selectedId))ui.selectedId=available[0]?.id||null;return View.render(session.data,ui,findIdea);}
  function reportError(message){ui.error=message;render();focus('#jobs-form-error');}
  function input(el){
   if(el.dataset?.jobsSearch!==undefined){ui.search=el.value.slice(0,200);ui.error='';render();remember();return true;}
   if(!el.dataset?.jobsField&&!el.dataset?.jobsDraft)return false;
   try{ready();const id=el.dataset.jobId||ui.selectedId,current=job(id),field=el.dataset.jobsField||el.dataset.jobsDraft,old=el.dataset.jobsField?current.draft[field]:current.forms[el.dataset.entryType]?.[field];const value=root.QQI18n?.inputValue(el)??el.value;if(old===value)return true;if(el.dataset.jobsField)Model.updateDraft(session.data,id,{[field]:value});else Model.setForm(session.data,id,el.dataset.entryType,{[field]:value});if(el.dataset.jobsField&&ui.search&&!visible().some(v=>v.id===id))ui.search='';ui.error='';session.changed();render();remember();}catch(e){reportError(e.message);}
   return true;
  }
  function previewImport(raw){ready();pendingImport=Model.parseText(raw);const count=pendingImport.jobs.length;modal(`<h2 id="dialog-title">Add these saved jobs?</h2><p>Add ${count} jobs as new copies, including accepted terms, recorded entries, corrections and unfinished drafts. Existing jobs stay in place. Real/practice labels, archived jobs and Trash are preserved.</p><p>Use this to restore a backup into an empty workspace or bring in separate work. Importing the same backup again creates duplicate copies.</p>${session.status==='error'?'<p class="banner warn">Browser saving is currently unavailable. Importing does not repair the saved original. These copies will be available in this tab; download a Jobs backup before closing. To restore a valid backup durably, open it in a fresh browser profile or another browser.</p>':''}<div class="actions">${btn('Cancel','close')}${btn('Add job copies','jobs-confirm-import','primary')}</div>`);}
  function importFile(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>Model.MAX_BYTES)throw Error('Choose a Jobs backup smaller than 8 MiB.');previewImport(await file.text());}catch(e){toast(e.message||'The Jobs backup could not be opened.');}};input.click();}
  function clearForm(id,type,prior){const cleared=Object.fromEntries(Model.FORM_FIELDS[type].map(k=>[k,['person','kind'].includes(k)?prior[k]:'']));Model.setForm(session.data,id,type,cleared);}
  function correction(id,entryId){
   const current=job(id),prior=current.forms.void;
   Model.setForm(session.data,current.id,'void',{targetId:entryId,date:prior.targetId===entryId&&prior.date?prior.date:today(),reason:prior.targetId===entryId?prior.reason:''});session.changed();
   const form=job(id).forms.void;
   modal(`<h2 id="dialog-title">Correct a recorded entry</h2><p>Void ${esc(entryId)} on ${esc(current.draft.title||'Untitled job')}. The original stays in History with your reason. Its effect is removed from totals. Record a replacement afterward if needed.</p><label class="input-field" for="jobs-void-date">Correction date<input id="jobs-void-date" type="date" data-jobs-draft="date" data-entry-type="void" data-job-id="${esc(id)}" value="${esc(form.date)}"></label><label class="input-field" for="jobs-void-reason">Reason<textarea id="jobs-void-reason" data-jobs-draft="reason" data-entry-type="void" data-job-id="${esc(id)}" maxlength="10000">${esc(form.reason)}</textarea></label><div class="actions">${btn('Cancel','close')}${btn('Void entry and keep history','jobs-void-confirm','primary',`data-id="${esc(id)}"`)}</div>`);
  }
  function action(name,data={}){
   ready();ui.error='';const id=data.id||data.jobId||ui.selectedId;let focusTarget=null;
   if(name==='jobs-backup'){download('MEIQQ-Jobs.json',Model.serialize(session.data));toast('Jobs backup download requested. It includes active jobs, archived jobs, Trash, history and unfinished drafts. Ideas and simulator runs have separate backups.');return;}
   if(name==='jobs-original'){const original=session.originals[Number(data.index)];if(original)download('MEIQQ-Jobs-Preserved-'+data.index+'.json',original.text);return;}
   if(name==='jobs-import'){importFile();return;}
   if(name==='jobs-confirm-import'){if(!pendingImport)throw Error('Choose a Jobs backup first.');const count=session.merge(pendingImport);pendingImport=null;closeModal();toast(session.status==='error'?count+' copies added in this tab only. Saving is unavailable; download a Jobs backup before closing.':count+' job copies added.');render();return;}
   if(name==='jobs-add'||name==='jobs-practice'||name==='jobs-practice-new'){
    const existing=name==='jobs-practice'?session.data.jobs.find(v=>v.id===ui.selectedId&&v.mode==='practice'&&v.location==='active')||session.data.jobs.find(v=>v.mode==='practice'&&v.location==='active'):null;
    const created=existing||Model.create(session.data,{mode:name==='jobs-add'?'real':'practice',draft:name==='jobs-add'?{}:PRACTICE});ui.selectedId=created.id;ui.tab='overview';ui.form='work';ui.filter='active';ui.search='';
    if(existing)toast('Opened your existing practice job. Use New practice copy when you want another.');else session.changed();
    focusTarget=existing?'#jobs-selected-heading':'#jobs-'+created.id+'-draft-title';
   }else if(name==='jobs-select'||name==='jobs-review'){
    const selected=job(id);if(name==='jobs-review'){ui.search='';openWorkspace();}
    ui.selectedId=id;ui.filter=selected.location;ui.tab='overview';ui.form='work';focusTarget='#jobs-selected-heading';}
   else if(name==='jobs-filter'){if(['active','archive','trash'].includes(data.filter)){ui.filter=data.filter;ui.search='';}focusTarget='#jobs-selected-heading';}
   else if(name==='jobs-trash'||name==='jobs-archive'){
    const current=job(id),list=visible(),index=list.findIndex(v=>v.id===id),location=name==='jobs-trash'?'trash':'archive';
    Model.move(session.data,id,location);ui.undo={id,title:current.draft.title||'Untitled job',location};ui.selectedId=list[index+1]?.id||list[index-1]?.id||null;ui.tab='overview';session.changed();focusTarget=ui.selectedId?'#jobs-selected-heading':'#jobs-add';
    toast(location==='trash'?'Draft moved to Trash. Undo or restore it from Trash.':'Job archived with all history intact. Restore it to resume editing.');
   }else if(name==='jobs-restore'){
    Model.move(session.data,id,'active');ui.selectedId=id;ui.filter='active';ui.search='';ui.tab='overview';ui.undo=null;session.changed();focusTarget='#jobs-selected-heading';toast('Job restored with its saved drafts and history.');
   }else if(name==='jobs-today'){const current=job(id);Model.setForm(session.data,current.id,data.type,{date:today()});session.changed();focusTarget='#jobs-'+current.id+'-form-'+data.type+'-date';}
   else if(name==='jobs-tab'){if(['overview','work','money','history'].includes(data.tab))ui.tab=data.tab;}
   else if(name==='jobs-form'){if(Object.hasOwn(Model.FORM_FIELDS,data.type))ui.form=data.type;}
   else if(name==='jobs-post'){
    const current=job(id),type=data.type,form=current.forms[type];if(!form||type==='void')throw Error('Choose a supported job entry.');
    if(type==='agreement')Model.recordAgreement(session.data,current.id,form);else Model.postEntry(session.data,current.id,{type,...form});
    clearForm(current.id,type,form);session.changed();toast(type==='agreement'?'Accepted terms recorded. Later draft edits will not change this version.':'Entry recorded. Corrections are available in History.');
   }else if(name==='jobs-void'){correction(id,data.entryId);return;}
   else if(name==='jobs-void-confirm'){const current=job(id),form=current.forms.void;Model.voidEntry(session.data,id,form.targetId,{date:form.date,reason:form.reason});clearForm(id,'void',form);session.changed();closeModal();toast('Entry voided. The original and your correction remain in History.');}
   render();remember();if(focusTarget)focus(focusTarget);
  }
  return {ui,render:content,input,action,previewImport,reportError,startFromIdea};
 }
 const api={create,practiceDraft:Object.freeze(PRACTICE)};root.QQJobsController=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
