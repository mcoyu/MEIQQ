// Deliberately narrow IndexedDB contract double: commit/abort, asynchronous load.
// This verifies application ordering, not browser-specific IndexedDB behavior.
function database() {
  const records=new Map(),options={failWrites:false,failOpen:false};
  const db={objectStoreNames:{contains:()=>true},close(){},transaction(name,mode){
    let pending=0,aborted=false;const changes=new Map();
    const tx={abort(){aborted=true;tx.onabort?.();}};
    const operation=(key,value,write=false)=>{
      const request={};
      pending++;
      queueMicrotask(()=>{
        if(aborted)return;
        if(write&&options.failWrites){tx.error=Error('Quota exceeded');tx.abort();return;}
        if(write)changes.set(key,value);
        request.result=write?key:records.get(key);request.onsuccess?.();pending--;
        if(!pending&&!aborted){for(const [k,v]of changes)records.set(k,v);tx.oncomplete?.();}
      });return request;
    };
    tx.objectStore=()=>({get:key=>operation(key),put:(value,key)=>operation(key,value,true)});return tx;
  }};
  const factory={open(){const request={};queueMicrotask(()=>{if(options.failOpen){request.error=Error('Storage unavailable');request.onerror?.();}else{request.result=db;request.onsuccess?.();}});return request;}};
  return {factory,records,options};
}
module.exports={database};
