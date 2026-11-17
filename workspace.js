/* Versioned workspace interchange and retention; independent of the DOM. */
(function(root) {
  'use strict';
  const q = root.QQ || require('./engine.js');
  const MAX_BYTES = 128 * 1024 * 1024, AUTO_LIMIT = 12, MAX_ITEMS = 10000;
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const numeric = x => x === null || (typeof x === 'number' && Number.isFinite(x));
  const bytes = text => new TextEncoder().encode(text).byteLength;
  function editableDraft(value, config) {
    if (value === undefined) return q.clone(config);
    if (!object(value)) throw Error('Draft is not an object.');
    const d = {...q.clone(config),...q.clone(value)};
    for (const [key, fallback] of Object.entries(q.DEFAULT)) {
      if (typeof fallback === 'number' && !numeric(d[key])) throw Error('Draft number is malformed.');
      if (typeof fallback === 'string' && (typeof d[key] !== 'string' || d[key].length>1000)) throw Error('Draft text is malformed.');
      if (typeof fallback === 'boolean' && typeof d[key] !== 'boolean') throw Error('Draft switch is malformed.');
    }
    if (!object(d.uncertainty) || Object.keys(q.DEFAULT.uncertainty).some(k=>typeof d.uncertainty[k]!=='boolean')) throw Error('Draft uncertainty is malformed.');
    if (!Array.isArray(d.services) || !d.services.length || d.services.length>200) throw Error('Draft services are malformed.');
    for (const s of d.services) {
      if (!object(s) || !['id','name','deliverable'].every(k=>typeof s[k]==='string'&&s[k].length<=5000) ||
          !/^[a-zA-Z0-9_-]{1,60}$/.test(s.id) || !/^#[0-9a-f]{6}$/i.test(s.color) || typeof s.recurring!=='boolean' ||
          !['price','hours','review','print','weight'].every(k=>numeric(s[k]))) throw Error('Draft service fields are malformed.');
    }
    return d;
  }
  function workspace(raw, resolve = q.restore) {
    if (!object(raw) || !Array.isArray(raw.saved) || raw.saved.length>MAX_ITEMS) throw Error('Workspace checkpoints are invalid.');
    const state=resolve(raw.state), saved=raw.saved.map(resolve);
    const recoveryFiles=q.clone(raw.recoveryFiles||[]);
    if(!Array.isArray(recoveryFiles)||recoveryFiles.length>MAX_ITEMS||recoveryFiles.some(x=>!object(x)||typeof x.name!=='string'||x.name.length>200||typeof x.text!=='string')) throw Error('Recovery files are invalid.');
    let draft;
    try { draft=editableDraft(raw.draft,state.config); }
    catch(e) { recoveryFiles.push({name:'Recovered unfinished draft',text:JSON.stringify(raw.draft)}); draft=q.clone(state.config); }
    const infos=raw.checkpointInfo;
    if(infos!==undefined&&(!Array.isArray(infos)||infos.length!==saved.length))throw Error('Checkpoint labels are invalid.');
    const checkpointInfo=saved.map((s,i)=>{
      const info=infos?.[i]||{label:s.config.name+' · day '+s.day,kind:'manual'};
      if(!object(info)||typeof info.label!=='string'||info.label.length>200||!['manual','automatic'].includes(info.kind))throw Error('Checkpoint label is invalid.');
      return {label:info.label,kind:info.kind};
    });
    return {state,saved,draft,checkpointInfo,recoveryFiles};
  }
  function parse(data) {
    if (data?.format==='meiqq-workspace' && data.version===3) {
      if(!Array.isArray(data.runs)||data.runs.length>MAX_ITEMS||!Array.isArray(data.archives)||data.archives.length>MAX_ITEMS)throw Error('Workspace archive is invalid.');
      const runs=data.runs.map(q.restore);
      const resolve=i=>{if(!Number.isInteger(i)||i<0||i>=runs.length)throw Error('Saved-run reference is invalid.');return runs[i];};
      const current=workspace(data.current,resolve);
      // Saved runs are immutable; only the active run needs a separate mutable copy.
      current.state=q.clone(current.state);
      const archives=data.archives.map(a=>{
        if(!object(a)||typeof a.label!=='string'||a.label.length>200)throw Error('Workspace archive label is invalid.');
        return {label:a.label,workspace:workspace(a.workspace,resolve)};
      });
      return {...current,archives,full:true};
    }
    if ((data?.format==='meiqq-workspace' && data.version===2) || (!data?.format && object(data?.state))) {
      return {...workspace({...data,saved:data.saved||[]}),archives:[],full:true};
    }
    if (['qq-studio-setup','meiqq-setup'].includes(data?.format) && data.version===1) {
      const state=q.fresh(data.config);
      return {...workspace({state,saved:[],draft:state.config}),archives:[],full:false};
    }
    throw Error('Choose a MEIQQ workspace, original browser save, or legacy setup JSON.');
  }
  function pack(current, archives=[]) {
    const runs=[], indexes=new Map();
    const add=s=>{const text=JSON.stringify(s);if(indexes.has(text))return indexes.get(text);const i=runs.length;indexes.set(text,i);runs.push(JSON.parse(text));return i;};
    const encode=w=>({state:add(w.state),saved:w.saved.map(add),draft:q.clone(w.draft),checkpointInfo:(w.checkpointInfo?q.clone(w.checkpointInfo):null)||w.saved.map(s=>({label:s.config.name+' · day '+s.day,kind:'manual'})),recoveryFiles:q.clone(w.recoveryFiles||[])});
    const result={format:'meiqq-workspace',version:3,current:encode(current),archives:archives.map(a=>({label:a.label,workspace:encode(a.workspace)})),runs};
    if(runs.length>MAX_ITEMS||archives.length>MAX_ITEMS||[current,...archives.map(a=>a.workspace)].some(w=>w.saved.length>MAX_ITEMS))throw Error('Too many saved items. Export workspaces separately or remove unneeded checkpoints.');
    return result;
  }
  function serialize(current,archives=[]) {
    const text=JSON.stringify(pack(current,archives));
    checkSize(bytes(text));
    return text;
  }
  function checkSize(size) { if(size>MAX_BYTES)throw Error('Workspace exceeds 128 MiB. Export a workspace separately or remove unneeded checkpoints.'); }
  function parseText(text) { checkSize(bytes(text));return parse(JSON.parse(text)); }
  function checkpoint(w,kind='automatic') {
    const serialized=JSON.stringify(w.state),same=w.saved.findIndex(s=>JSON.stringify(s)===serialized);
    if(same>=0){if(kind==='manual')w.checkpointInfo[same].kind='manual';return;}
    w.saved.push(q.clone(w.state));w.checkpointInfo.push({label:w.state.config.name+' · day '+w.state.day,kind});
    while(w.checkpointInfo.filter(x=>x.kind==='automatic').length>AUTO_LIMIT){const i=w.checkpointInfo.findIndex(x=>x.kind==='automatic');w.saved.splice(i,1);w.checkpointInfo.splice(i,1);}
  }
  function archive(archives,current,label) {
    const serialized=JSON.stringify(current);
    if(!archives.some(a=>JSON.stringify(a.workspace)===serialized))archives.push({label:label||current.state.config.name+' · day '+current.state.day,workspace:q.clone(current)});
  }
  const api={MAX_BYTES,AUTO_LIMIT,editableDraft,workspace,parse,parseText,pack,serialize,checkSize,checkpoint,archive};
  root.MEIQQWorkspace=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
