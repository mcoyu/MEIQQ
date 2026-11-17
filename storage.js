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
    try{stored=await transaction(db,'readonly',key);}catch(e){db.close();throw e;}
    const version=value=>Number.isSafeInteger(value?.revision)&&value.revision>=0?value.revision:0;
    let revision=version(stored);
    const raw=typeof stored==='string'?stored:stored===undefined?undefined:
      typeof stored?.text==='string'&&Number.isSafeInteger(stored.revision)?stored.text:JSON.stringify(stored);
    db.onversionchange=()=>db.close();
    function write(text){
      return new Promise((resolve,reject)=>{
        let conflict=null;
        const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),request=store.get(key);
        request.onsuccess=()=>{
          const latest=request.result,current=version(latest);
          if(current!==revision){conflict=Error('Another window changed this workspace.');conflict.code='STALE_WORKSPACE';tx.abort();return;}
          store.put({revision:revision+1,text},key);
        };
        tx.oncomplete=()=>{revision++;resolve();};
        tx.onabort=tx.onerror=()=>reject(conflict||tx.error||request.error||Error('Browser save failed.'));
      });
    }
    return {raw,write,close:()=>db.close()};
  }
  // At most one transaction in flight; intermediate writes can be superseded
  // because each payload contains the complete workspace and recovery archive.
  function writer(write,onStatus) {
    let latest=null,busy=false,last=null,waiters=[],failed=false;
    async function drain(){
      if(busy)return;busy=true;
      failed=false;
      while(latest!==null){
        const text=latest;latest=null;
        if(text===last)continue;
        onStatus('saving');
        try{await write(text);last=text;failed=false;}catch(e){failed=true;onStatus('error',e);}
      }
      busy=false;if(!failed)onStatus('saved');
      const pending=waiters;waiters=[];pending.forEach(resolve=>resolve(!failed));
    }
    return {push(text){latest=text;void drain();},flush(){return busy||latest!==null?new Promise(resolve=>waiters.push(resolve)):Promise.resolve(!failed);}};
  }
  const api={connect,writer};root.MEIQQStorage=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
