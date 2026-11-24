/* Independent offline collections. Each model owns its storage key and backup format. */
(function(root){
 'use strict';
 const StudioModel=typeof module!=='undefined'?require('./studio.js'):root.QQStudio;
 const Storage=typeof module!=='undefined'?require('./storage.js'):root.MEIQQStorage;
 function create({local,indexedDB,model:Model=StudioModel,label='Studio ideas',seed=()=>Model.fresh(),onStatus=()=>{}}={}){
  let data=seed(),revision=null,backend=null,writer=null,timer=null,loaded=false,status='opening',error='',blocked=false,originals=[];
  // Track the latest submitted payload, not only the last completed write:
  // reverting while another write is in flight must enqueue the reverted state.
  let lastWriteText=null,writePending=false,localParsed=false;
  function notify(next,message=''){status=next;error=message;onStatus(status,error);}
  function keep(raw,label){if(typeof raw==='string'&&!originals.some(v=>v.text===raw))originals.push({label,text:raw});}
  let localReadError=null;
  try{revision=local?.getItem(Model.STORAGE_KEY)??null;if(revision!==null){try{data=Model.parseText(revision);localParsed=true;}catch(e){keep(revision,'Original browser save');blocked=true;error=e.message;}}}catch(e){localReadError=e;}
  async function open(){
   let fingerprint=null;
   if(indexedDB){
    try{
     fingerprint=await Storage.fingerprint(revision);
     backend=await Storage.connect(indexedDB,Model.STORAGE_KEY);
     if(backend.raw!==undefined){
      try{
       const primary=Model.parseText(backend.raw);
       if(revision!==null&&revision!==backend.raw&&fingerprint!==backend.fallbackFingerprint){
        keep(revision,'Browser fallback');keep(backend.raw,'Primary '+label+' save');blocked=true;
        error='Two different '+label+' saves were found. Download the preserved copies before resolving them; this session will not overwrite either copy.';
       }else if(!originals.length){blocked=false;error='';}
       data=primary;lastWriteText=Model.serialize(primary);
      }catch(e){keep(backend.raw,'Original primary save');blocked=true;error='The saved '+label+' could not be read. The original is preserved. '+e.message;}
     }
     writer=Storage.writer(text=>{lastWriteText=text;return backend.write(text,fingerprint);},(next,e)=>{
      writePending=next==='saving';if(e)lastWriteText=null;
      notify(next==='saved'&&timer!==null?'pending':next,e?.code==='STALE_WORKSPACE'?'Another window saved '+label+'. Download this session before reopening.':e?label+' could not be saved. Download a backup before closing.':'');
     });
    }catch(e){
     backend=null;
     if(e.code==='STORAGE_READ_FAILED'){blocked=true;error='The primary '+label+' save could not be read. Reopen the app before saving; your original has not been changed.';}
     else if(localReadError){blocked=true;error='Browser storage is unavailable. Download a '+label+' backup to keep your work.';}
    }
   }else if(localReadError){blocked=true;error='Browser storage is unavailable. Download a '+label+' backup to keep your work.';}
   if(!backend&&localParsed)lastWriteText=Model.serialize(data);
   loaded=true;
   if(blocked)notify('error',error);else save();
   return data;
  }
  function save(){
   clearTimeout(timer);timer=null;
   if(!loaded)return;
   if(blocked){notify('error',error);return;}
   try{
    const text=Model.serialize(data);
    if(text===lastWriteText){notify(writePending?'saving':'saved');return;}
    if(writer){lastWriteText=text;writer.push(text);}
    else{
     if(!local)throw Error('Browser storage unavailable.');
     if((local.getItem(Model.STORAGE_KEY)??null)!==revision){blocked=true;throw Error('Another window saved '+label+'. Download this session before reopening.');}
     local.setItem(Model.STORAGE_KEY,text);revision=text;lastWriteText=text;notify('saved');
    }
   }catch(e){notify('error',e.message||label+' could not be saved.');}
  }
  function changed(){if(!loaded)throw Error(label+' are still opening.');if(blocked){notify('error',error);return;}notify('pending');clearTimeout(timer);timer=setTimeout(save,250);}
  async function flush(){save();const written=writer?await writer.flush():true;return written&&status==='saved';}
  function merge(incoming){
   const clean=Model.validate(incoming);let next;
   if(Model.merge)next=Model.merge(data,clean);
   else {next=Model.validate(data);for(const idea of clean.offerings){const {id,version,...draft}=idea;Model.create(next,draft);}}
   Model.serialize(next);
   data=next;changed();return (clean.plans||clean.jobs||clean.offerings).length;
  }
  return {open,save,changed,flush,merge,get data(){return data;},get ready(){return loaded;},get status(){return status;},get error(){return error;},get originals(){return originals.slice();},get unsaved(){return status!=='saved';}};
 }
 const api={create};root.QQStudioSession=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
