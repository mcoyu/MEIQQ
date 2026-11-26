(() => {
  'use strict';
  const dialog=document.querySelector('#sky-editor');
  if(!dialog?.showModal)return;
  const {defaults,types,update,clamp}=window.SunsetScene;
  const key='qq-studio-sunset-v1';
  const layers={west:'Western cloud bank',east:'Eastern cloud bank',low:'Low cloud bank',galaxy:'Stars',moon:'Moon',horizon:'Horizon',light:'Atmosphere'};
  const fields={
    x:['Horizontal position',-35,135],y:['Vertical position',-25,125],scale:['Scale',20,185],
    spacing:['Shard spacing',0,100],density:['Star density',0,100],dusk:['Twilight',0,100],wind:['Motion speed',0,100],
    humidity:['Humidity',0,100],drift:['Star drift',0,100],meteors:['Shooting star frequency',0,100]
  };
  const bounds=(layer,k)=>layer==='horizon'&&k==='y'?[76,100]:fields[k].slice(1);
  function restore(raw){
    const clean=structuredClone(defaults);
    try{
      const saved=JSON.parse(raw)||{};
      for(const [id,layer] of Object.entries(clean)) for(const k of Object.keys(layer)){
        const v=saved[id]?.[k];
        if(k==='visible'){if(typeof v==='boolean')layer[k]=v;}
        else if(k==='type'){if(typeof v==='string'&&(v==='auto'||Object.hasOwn(types,v)))layer[k]=v;}
        else if(Number.isFinite(v))layer[k]=clamp(v,...bounds(id,k));
      }
    }catch{/* Use the original composition if a local preference is unavailable. */}
    return clean;
  }
  let saved=structuredClone(defaults),storedText;
  function latestSaved(){
    try{
      const text=localStorage.getItem(key);
      if(text!==storedText){saved=restore(text);storedText=text;}
    }catch{/* Keep the session composition when storage is unavailable. */}
    return saved;
  }
  let settings=structuredClone(latestSaved()),original,selected='west',opener,drag=null,resetAll=false;
  update(settings);
  window.addEventListener('storage',e=>{
    if((e.key===key||e.key===null)&&!dialog.open){
      settings=structuredClone(latestSaved());update(settings);
    }
  });
  const t=s=>QQI18n.text(s);
  const panel=dialog.querySelector('.sky-controls');
  const fieldset=dialog.querySelector('.sky-fields');
  function syncFields(){
    const layer=settings[selected];
    const type=fieldset.querySelector('[name="type"]');
    if(type){type.value=layer.type;type.disabled=layer.visible===false;}
    for(const input of fieldset.querySelectorAll('input')){
      const k=input.name;
      if(k==='visible')input.checked=layer.visible;
      else{
        input.value=layer[k];input.disabled=layer.visible===false;
        input.nextElementSibling.textContent=layer[k]+'%';
      }
    }
  }
  function showFields(){
    const layer=settings[selected];
    fieldset.innerHTML=Object.keys(layer).map(k=>{
      if(k==='visible')return '<label class="sky-visible"><input type="checkbox" name="visible"> '+t('Show layer')+'</label>';
      if(k==='type'){
        const options=Object.entries(types).map(([id,item])=>'<option value="'+id+'">'+t(item.label)+'</option>').join('');
        return '<label class="sky-layer sky-cloud-type"><span>'+t('Cloud type')+'</span><select name="type"><option value="auto">'+t('Evolving weather')+'</option>'+options+'</select></label>';
      }
      const [min,max]=bounds(selected,k);
      return '<label class="sky-slider"><span>'+t(fields[k][0])+'</span><input type="range" name="'+k+'" min="'+min+'" max="'+max+'" step="1"><output></output></label>';
    }).join('');
    syncFields();
    const canMove=Object.hasOwn(layer,'x')||Object.hasOwn(layer,'y');
    dialog.querySelector('.sky-viewport').classList.toggle('can-move',canMove);
    panel.querySelector('.sky-drag-tip').hidden=!canMove;
    dialog.classList.toggle('dock-top',selected==='low'||selected==='horizon');
  }
  function open(button){
    if(dialog.open)return;
    settings=structuredClone(latestSaved());resetAll=false;
    original=structuredClone(settings);
    const preferences=button.closest('.sky-preferences');
    opener=preferences?.querySelector('summary')||button;
    if(preferences)preferences.open=false;
    for(const el of panel.querySelectorAll('[data-copy]'))el.textContent=t(el.dataset.copy);
    const select=panel.querySelector('select');
    select.innerHTML=Object.entries(layers).map(([id,label])=>'<option value="'+id+'">'+t(label)+'</option>').join('');
    select.value=selected;showFields();update(settings);dialog.showModal();select.focus();
  }
  document.addEventListener('click',e=>{const button=e.target.closest?.('[data-edit-sky]');if(button)open(button);});
  panel.querySelector('select').addEventListener('change',e=>{drag=null;selected=e.target.value;showFields();});
  fieldset.addEventListener('input',e=>{
    const k=e.target.name;if(!Object.hasOwn(settings[selected],k))return;
    if(k==='type')settings[selected].type=e.target.value;
    else settings[selected][k]=k==='visible'?e.target.checked:Number(e.target.value);
    syncFields();update(settings);
  });
  panel.addEventListener('click',e=>{
    const action=e.target.closest('button')?.value;
    if(action==='reset'){drag=null;resetAll=true;settings=structuredClone(defaults);showFields();update(settings);}
    if(action==='cancel'){dialog.close('cancel');}
    if(action==='save'){
      // Retain other windows' saved edits to fields untouched in this preview.
      const next=structuredClone(latestSaved());
      for(const [id,layer] of Object.entries(settings))for(const [k,value] of Object.entries(layer)){
        if(resetAll||value!==original[id][k])next[id][k]=value;
      }
      saved=next;
      try{const text=JSON.stringify(saved);localStorage.setItem(key,text);storedText=text;}
      catch{toast(t('Sky changes apply to this session.'));}
      dialog.close('save');
    }
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close('cancel');});
  dialog.addEventListener('close',()=>{if(dialog.open)return;settings=structuredClone(latestSaved());update(settings);drag=null;opener?.focus();});
  const viewport=dialog.querySelector('.sky-viewport');
  const point=e=>window.SunsetScene.layerPoint?.(selected,e.clientX/innerWidth,e.clientY/innerHeight)||[e.clientX/innerWidth,e.clientY/innerHeight];
  viewport.addEventListener('pointerdown',e=>{
    const layer=settings[selected];if(e.button!==0||layer.visible===false||(!('x' in layer)&&!('y' in layer)))return;
    const [x,y]=point(e);drag={id:e.pointerId,x,y,startX:layer.x,startY:layer.y};
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const layer=settings[selected],[x,y]=point(e);
    if('x' in layer)layer.x=clamp(Math.round(drag.startX+(x-drag.x)*100),...bounds(selected,'x'));
    if('y' in layer)layer.y=clamp(Math.round(drag.startY+(y-drag.y)*100),...bounds(selected,'y'));
    syncFields();update(settings);
  });
  viewport.addEventListener('lostpointercapture',()=>{drag=null;});
})();
