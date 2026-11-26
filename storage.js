/* Atomic browser persistence. Failed writes never replace the previous save. */
(function(root) {
  'use strict';
  function openDatabase(factory) {
    return new Promise((resolve,reject)=>{
      const request=factory.open('meiqq-workspaces',1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('saves'))request.result.createObjectStore('saves');};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('Browser storage could not open.'));
      request.onblocked=()=>reject(Error('Close other MEIQQ windows and reopen to enable saving.'));
    });
  }
  function transaction(db,mode,key,value) {
    return new Promise((resolve,reject)=>{
      let result;const tx=db.transaction('saves',mode),store=tx.objectStore('saves');
      const request=mode==='readonly'?store.get(key):store.put(value,key);
      request.onsuccess=()=>{result=request.result;};
      tx.oncomplete=()=>resolve(result);
      tx.onabort=tx.onerror=()=>reject(tx.error||request.error||Error('Browser save failed.'));
    });
  }
  async function connect(factory,key) {
    const db=await openDatabase(factory);
    let stored;
    try{stored=await transaction(db,'readonly',key);}catch(cause){db.close();const e=Error('Primary workspace could not be read.');e.code='STORAGE_READ_FAILED';e.cause=cause;throw e;}
    const version=value=>Number.isSafeInteger(value?.revision)&&value.revision>=0?value.revision:0;
    let revision=version(stored);
    const raw=typeof stored==='string'?stored:stored===undefined||stored?.reset===true?undefined:
      typeof stored?.text==='string'&&Number.isSafeInteger(stored.revision)?stored.text:JSON.stringify(stored);
    db.onversionchange=()=>db.close();
    function write(text,fallbackFingerprint=null){
      return new Promise((resolve,reject)=>{
        let conflict=null,nextRevision=revision;
        const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),request=store.get(key);
        request.onsuccess=()=>{
          const latest=request.result,current=version(latest);
          if(current!==revision){conflict=Error('Another window changed this workspace.');conflict.code='STALE_WORKSPACE';tx.abort();return;}
          // Opening or closing an unchanged workspace must not invalidate a
          // second editor. A new fallback fingerprint still needs to commit.
          if(latest?.text===text&&latest.revision===revision&&latest.fallbackFingerprint===fallbackFingerprint)return;
          nextRevision=revision+1;
          store.put({revision:nextRevision,text,fallbackFingerprint},key);
        };
        tx.oncomplete=()=>{revision=nextRevision;resolve();};
        tx.onabort=tx.onerror=()=>reject(conflict||tx.error||request.error||Error('Browser save failed.'));
      });
    }
    return {raw,write,fallbackFingerprint:stored?.fallbackFingerprint||null,close:()=>db.close()};
  }
  async function reset(factory,keys){
    const db=await openDatabase(factory);
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');
        tx.oncomplete=resolve;
        tx.onabort=tx.onerror=()=>reject(tx.error||Error('Browser storage could not be reset.'));
        // Keep only a revision marker so a tab with an older save cannot restore it.
        for(const key of keys){
          const request=store.get(key);
          request.onsuccess=()=>{
            const revision=request.result?.revision;
            store.put({reset:true,revision:(Number.isSafeInteger(revision)&&revision>=0?revision:0)+1},key);
          };
        }
      });
    }finally{db.close();}
  }
  async function fingerprint(text){
    if(text===null)return null;
    // A local file may have IndexedDB without Web Crypto. Use the same
    // deterministic identity in both environments so deleted archives do not
    // reappear when the browser's available APIs change between openings.
    let a=2166136261,b=0x9e3779b9,c=0x85ebca6b,d=0xc2b2ae35;
    for(let i=0;i<text.length;i++){
      const n=text.charCodeAt(i);
      a=Math.imul(a^n,16777619);
      b=Math.imul(b+n,2246822519);
      c=Math.imul(c^(n+i),3266489917);
      d=Math.imul(d+((n<<16)|n),668265263);
    }
    const hex=n=>(n>>>0).toString(16).padStart(8,'0');
    return `local-v1:${text.length.toString(16)}:${hex(a)}${hex(b)}${hex(c)}${hex(d)}`;
  }
  // At most one transaction in flight; intermediate writes can be superseded
  // because each payload contains the complete workspace and recovery archive.
  function writer(write,onStatus) {
    let latest=null,busy=false,last=null,waiters=[],failed=false,conflict=null;
    async function drain(){
      if(busy)return;
      if(conflict){latest=null;failed=true;onStatus('error',conflict);return;}
      busy=true;
      failed=false;
      while(latest!==null){
        const text=latest;latest=null;
        if(text===last){failed=false;continue;}
        onStatus('saving');
        try{await write(text);last=text;failed=false;}catch(e){failed=true;onStatus('error',e);if(e.code==='STALE_WORKSPACE'){conflict=e;latest=null;break;}}
      }
      busy=false;if(!failed)onStatus('saved');
      const pending=waiters;waiters=[];pending.forEach(resolve=>resolve(!failed));
    }
    return {push(text){latest=text;void drain();},flush(){return busy||latest!==null?new Promise(resolve=>waiters.push(resolve)):Promise.resolve(!failed);}};
  }
  const api={connect,writer,fingerprint,reset};root.MEIQQStorage=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
