/* Versioned workspace interchange and retention; independent of the DOM. */
(function(root) {
  'use strict';
  const q = root.QQ || require('./engine.js');
  const MAX_BYTES = 128 * 1024 * 1024, AUTO_LIMIT = 12, MAX_ITEMS = 10000;
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const numeric = x => x === null || (typeof x === 'number' && Number.isFinite(x));
  const exact = (value,keys) => object(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
  // Drafts are recovery data, not applied configuration. Preserve ordinary
  // incomplete/out-of-range numbers so the user can correct them after reopen;
  // only the object shape and fixed discriminator need to be trustworthy here.
  const editableFulfillment = value => exact(value,['mode','managedShare','designOnlyPrice']) && value.mode==='customer-choice' && numeric(value.managedShare) && numeric(value.designOnlyPrice);
  const editableCampaign = value => exact(value,['cadenceDays','relationshipDays']) && numeric(value.cadenceDays) && numeric(value.relationshipDays);
  const bytes = text => new TextEncoder().encode(text).byteLength;
  function editableDraft(value, config) {
    if (value === undefined) return q.clone(config);
    if (!object(value)) throw Error('Draft is not an object.');
    const d = {...q.clone(config),...q.clone(value)};
    if(!Object.hasOwn(value,'assumptionRecords'))delete d.assumptionRecords;
    for (const [key, fallback] of Object.entries(q.DEFAULT)) {
      // New customer profiles are opt-in for older workspaces. Their absence
      // must not quarantine an otherwise valid unfinished draft.
      if (d[key] === undefined && ['profileStrength','focusType'].includes(key)) continue;
      if (typeof fallback === 'number' && !numeric(d[key])) throw Error('Draft number is malformed.');
      if (typeof fallback === 'string' && (typeof d[key] !== 'string' || d[key].length>1000)) throw Error('Draft text is malformed.');
      if (typeof fallback === 'boolean' && typeof d[key] !== 'boolean') throw Error('Draft switch is malformed.');
    }
    if(d.fixedInquiriesEntered!==undefined&&typeof d.fixedInquiriesEntered!=='boolean')throw Error('Draft fixed inquiry preference is malformed.');
    if(d.assumptionRecords!==undefined&&!q.validAssumptionRecords(d.assumptionRecords))throw Error('Draft assumption records are malformed.');
    if (d.customerMix !== undefined) {
      if (!object(d.customerMix) || Object.keys(d.customerMix).sort().join(',') !== 'food,retail,services' ||
          !Object.values(d.customerMix).every(numeric) || !numeric(d.profileStrength) ||
          (d.focusType !== undefined && (typeof d.focusType !== 'string' || d.focusType.length > 100)))
        throw Error('Draft customer mix is malformed.');
    } else if (d.profileStrength !== undefined || d.focusType !== undefined) throw Error('Draft customer profile is malformed.');
    if (!object(d.uncertainty) || Object.keys(q.DEFAULT.uncertainty).some(k=>typeof d.uncertainty[k]!=='boolean')) throw Error('Draft uncertainty is malformed.');
    for (const key of ['disruptions','disruptionRates']) {
      if (!q.DEFAULT[key]) continue;
      if (d[key] === undefined) d[key]=q.clone(q.DEFAULT[key]);
      if (!object(d[key]) || Object.keys(d[key]).some(k=>!Object.hasOwn(q.DEFAULT[key],k))) throw Error('Draft disruption settings are malformed.');
      d[key]={...q.DEFAULT[key],...d[key]};
      if (Object.values(d[key]).some(v=>key==='disruptions'?typeof v!=='boolean':!numeric(v))) throw Error('Draft disruption settings are malformed.');
    }
    if (!Array.isArray(d.services) || !d.services.length || d.services.length>200) throw Error('Draft services are malformed.');
    for (const s of d.services) {
      if (!object(s) || !['id','name','deliverable'].every(k=>typeof s[k]==='string'&&s[k].length<=5000) ||
          !/^[a-zA-Z0-9_-]{1,60}$/.test(s.id) || !/^#[0-9a-f]{6}$/i.test(s.color) || typeof s.recurring!=='boolean' ||
          !['price','hours','review','print','weight'].every(k=>numeric(s[k])) ||
          (s.customOffer!==undefined&&typeof s.customOffer!=='boolean') ||
          (s.supplierMode!==undefined&&!['choose','none','print'].includes(s.supplierMode)) ||
          (s.filesOnlyScope!==undefined&&(typeof s.filesOnlyScope!=='string'||s.filesOnlyScope.length>500)) ||
          (s.audience !== undefined && !['all','food','retail','services'].includes(s.audience)) ||
          (s.spec !== undefined && !q.validServiceSpec(s.spec)) ||
          (s.fulfillment !== undefined && !editableFulfillment(s.fulfillment)) ||
          (s.campaign !== undefined && !editableCampaign(s.campaign))) throw Error('Draft service fields are malformed.');
    }
    return d;
  }
  function replayFields(record) {
    if(!object(record))return record;
    const fields={};
    for(const key of ['baselineId','month','key','before','after','demandId','sourceDay','firstDay','endDay','carriedThrough','finishAcceptedWork']){
      if(Object.hasOwn(record,key))fields[key]=record[key];
    }
    return fields;
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
      if(!object(info)||typeof info.label!=='string'||info.label.length>200||!['manual','automatic'].includes(info.kind)||
          (info.baseline!==undefined&&typeof info.baseline!=='boolean'))throw Error('Checkpoint label is invalid.');
      const result={label:info.label,kind:info.kind,baseline:info.baseline===true};
      if(info.replayId!==undefined){
        if(info.kind!=='manual'||typeof info.replayId!=='string'||!/^replay-[1-9]\d{0,8}$/.test(info.replayId))throw Error('Replay checkpoint identity is invalid.');
        result.replayId=info.replayId;
      }
      if(info.replays!==undefined){
        if(info.kind!=='manual'||!Array.isArray(info.replays)||info.replays.length>MAX_ITEMS)throw Error('Saved replay list is invalid.');
        // The mode and every projection figure are derived from the frozen
        // source. Imports can retain only the request to finish the book.
        result.replays=info.replays.map(record=>{
          const fields=replayFields(record);
          if(object(record)&&record.source!==undefined)fields.source=record.source;
          return fields;
        });
      }
      return result;
    });
    if(checkpointInfo.filter(info=>info.baseline).length>1)throw Error('Workspace has more than one comparison baseline.');
    const indices=new Map();
    for(const [i,info] of checkpointInfo.entries()){
      if(!info.replayId)continue;
      if(indices.has(info.replayId))throw Error('Replay checkpoint identity is duplicated.');
      indices.set(info.replayId,i);
    }
    for(const [i,info] of checkpointInfo.entries()){
      for(const replay of info.replays||[]){
        const base=indices.get(replay?.baselineId);
        if(base===undefined||base===i||!validReplayPair(saved[base],saved[i],replay))throw Error('Saved replay does not match its checkpoints.');
        if(replay.source!==undefined){
          if(resolve!==q.restore||!validReplaySource(replay.source,saved[base],replay))throw Error('Saved replay source is invalid.');
          replay.source=resolve(replay.source);
        }
      }
    }
    if(raw.replaySources!==undefined){
      if(!Array.isArray(raw.replaySources)||raw.replaySources.length>MAX_ITEMS)throw Error('Saved replay source links are invalid.');
      for(const link of raw.replaySources){
        if(!object(link)||!Number.isInteger(link.checkpoint)||!Number.isInteger(link.record))throw Error('Saved replay source link is invalid.');
        const record=checkpointInfo[link.checkpoint]?.replays?.[link.record];
        if(!record||record.source!==undefined)throw Error('Saved replay source link has no unique comparison.');
        const source=resolve(link.run);
        if(!validReplaySource(source,saved[indices.get(record.baselineId)],record))throw Error('Saved replay source does not match the original run.');
        record.source=source;
      }
    }
    const origin=['business','restaurant'].includes(raw.setupOrigin)?{setupOrigin:raw.setupOrigin}:{};
    return {state,saved,draft,checkpointInfo,recoveryFiles,...origin};
  }
  function validReplayPair(base,alternative,replay){
    if(!object(replay)||!['designerHours','designers','ownerHours'].includes(replay.key))return false;
    return Number.isInteger(replay.month)&&replay.month>=1&&replay.month<=12&&
      replay.firstDay===(replay.month-1)*30+1&&replay.endDay===replay.month*30&&
      base.day===replay.endDay&&alternative.day===base.day&&base.config.seed===alternative.config.seed&&
      Number.isInteger(replay.sourceDay)&&replay.sourceDay>=(replay.month===1?0:replay.firstDay)&&replay.sourceDay<=base.config.months*30&&
      Number.isFinite(replay.before)&&Number.isFinite(replay.after)&&replay.before!==replay.after&&
      base.config[replay.key]===replay.before&&alternative.config[replay.key]===replay.after&&
      (replay.demandId==null||typeof replay.demandId==='string'&&base.projects.some(p=>p.demandId===replay.demandId))&&
      (replay.carriedThrough===undefined||replay.carriedThrough===base.config.months*30&&replay.carriedThrough>replay.endDay)&&
      (replay.finishAcceptedWork===undefined||replay.finishAcceptedWork===true&&
        (replay.carriedThrough??replay.endDay)===base.config.months*30&&base.config.months===alternative.config.months);
  }
  function validReplaySource(source,base,record){
    return source?.day===record.sourceDay&&source.config?.seed===base.config.seed&&
      source.config.months===base.config.months&&source.initialCash===base.initialCash;
  }
  function saveReplayPair(current,base,alternative,descriptor,source=null){
    if(!validReplayPair(base,alternative,descriptor))throw Error('Only a completed, matching replay pair can be saved.');
    if(source!==null&&!validReplaySource(source,base,descriptor))throw Error('The original run does not match this saved replay.');
    const saved=[...current.saved],checkpointInfo=current.checkpointInfo.map(info=>info.replays?
      {...info,replays:info.replays.map(record=>({...record}))}:{...info});
    const text=saved.map(run=>JSON.stringify(run));
    const store=(run,label)=>{
      const content=JSON.stringify(run),existing=text.indexOf(content);
      if(existing>=0){checkpointInfo[existing].kind='manual';return existing;}
      text.push(content);saved.push(q.clone(run));checkpointInfo.push({label,kind:'manual',baseline:false});return saved.length-1;
    };
    const label=({designers:'Designer count',designerHours:'Hours per designer',ownerHours:'Owner hours'})[descriptor.key];
    const b=store(base,'Month '+descriptor.month+' baseline · '+base.config.name);
    const a=store(alternative,'Month '+descriptor.month+' · '+label+' '+descriptor.before+' → '+descriptor.after);
    if(!checkpointInfo[b].replayId){
      const ids=new Set(checkpointInfo.map(v=>v.replayId));
      let n=1;while(ids.has('replay-'+n))n++;
      checkpointInfo[b].replayId='replay-'+n;
    }
    const {month,key,before,after,demandId=null,sourceDay,firstDay,endDay}=descriptor;
    const record={baselineId:checkpointInfo[b].replayId,month,key,before,after,demandId,sourceDay,firstDay,endDay};
    const list=checkpointInfo[a].replays??=[];
    const sourceText=source&&JSON.stringify(source);
    const duplicate=list.find(item=>Object.keys(record).every(k=>item[k]===record[k])&&
      (source===null?!item.source:item.source===source||item.source&&JSON.stringify(item.source)===sourceText));
    if(!duplicate){
      if(source)record.source=q.clone(source);
      list.push(record);
    }
    if(descriptor.carriedThrough)(duplicate||record).carriedThrough=descriptor.carriedThrough;
    if(descriptor.finishAcceptedWork===true)(duplicate||record).finishAcceptedWork=true;
    if(list.length>MAX_ITEMS)throw Error('Too many saved replays for this checkpoint.');
    return {saved,checkpointInfo,baselineRun:saved[b],alternativeRun:saved[a],record:duplicate||record};
  }
  function removeCheckpoint(saved,info,index){
    if(!Number.isInteger(index)||index<0||index>=saved.length)throw Error('Checkpoint not found.');
    const id=info[index].replayId;
    saved.splice(index,1);info.splice(index,1);
    if(id)for(const item of info){
      if(!item.replays)continue;
      item.replays=item.replays.filter(r=>r.baselineId!==id);
      if(!item.replays.length)delete item.replays;
    }
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
    const runs=[], indexes=new Map(),references=new WeakMap();
    const add=s=>{
      if(references.has(s))return references.get(s);
      const text=JSON.stringify(s);
      if(!indexes.has(text)){indexes.set(text,runs.length);runs.push(JSON.parse(text));}
      const index=indexes.get(text);references.set(s,index);return index;
    };
    const encode=w=>{
      const state=add(w.state),saved=w.saved.map(add),replaySources=[];
      const infos=w.checkpointInfo||w.saved.map(s=>({label:s.config.name+' · day '+s.day,kind:'manual',baseline:false}));
      // Keep sources in the deduplicated run table. Older workspace readers
      // can still open the monthly pair when they ignore these optional links.
      const checkpointInfo=infos.map((info,checkpoint)=>{
        if(!info.replays)return {...info};
        const replays=info.replays.map((item,record)=>{
          const source=item.source;
          if(source)replaySources.push({checkpoint,record,run:add(source)});
          return replayFields(item);
        });
        return {...info,replays};
      });
      if(replaySources.length>MAX_ITEMS)throw Error('Too many replay source links. Export workspaces separately or remove unneeded checkpoints.');
      const packed={state,saved,draft:q.clone(w.draft),checkpointInfo,recoveryFiles:q.clone(w.recoveryFiles||[])};
      if(['business','restaurant'].includes(w.setupOrigin))packed.setupOrigin=w.setupOrigin;
      if(replaySources.length)packed.replaySources=replaySources;
      return packed;
    };
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
    w.saved.push(q.clone(w.state));w.checkpointInfo.push({label:w.state.config.name+' · day '+w.state.day,kind,baseline:false});
    while(w.checkpointInfo.filter(x=>x.kind==='automatic'&&!x.baseline).length>AUTO_LIMIT){const i=w.checkpointInfo.findIndex(x=>x.kind==='automatic'&&!x.baseline);w.saved.splice(i,1);w.checkpointInfo.splice(i,1);}
  }
  function archive(archives,current,label) {
    const serialized=JSON.stringify(current);
    if(!archives.some(a=>JSON.stringify(a.workspace)===serialized))archives.push({label:label||current.state.config.name+' · day '+current.state.day,workspace:q.clone(current)});
  }
  const api={MAX_BYTES,AUTO_LIMIT,editableDraft,workspace,parse,parseText,pack,serialize,checkSize,checkpoint,archive,saveReplayPair,removeCheckpoint};
  root.MEIQQWorkspace=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
