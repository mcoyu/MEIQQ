(() => {
  'use strict';
  const dialog=document.querySelector('#sky-editor');
  if(!dialog?.showModal)return;
  const {defaults,types,update,clamp}=window.SunsetScene;
  const key='qq-studio-sunset-v1';
  const layers={west:'Western cloud bank',east:'Eastern cloud bank',low:'Low cloud bank',galaxy:'Galaxy',moon:'Crescent moon',horizon:'Horizon',light:'Atmosphere'};
  const fields={
    x:['Horizontal position',-35,135],y:['Vertical position',-25,125],scale:['Scale',20,185],
    spacing:['Shard spacing',0,100],density:['Star density',0,100],dusk:['Twilight',0,100],wind:['Motion speed',0,100],
    humidity:['Humidity',0,100],drift:['Star drift',0,100],meteors:['Shooting star frequency',0,100]
  };
  const bounds=(layer,k)=>layer==='horizon'&&k==='y'?[76,100]:fields[k].slice(1);
  function restore(){
    const clean=structuredClone(defaults);
    try{
      const saved=JSON.parse(localStorage.getItem(key))||{};
      for(const [id,layer] of Object.entries(clean)) for(const k of Object.keys(layer)){
        const v=saved[id]?.[k];
        if(k==='visible'){if(typeof v==='boolean')layer[k]=v;}
        else if(k==='type'){if(v==='auto'||Object.hasOwn(types,v))layer[k]=v;}
        else if(Number.isFinite(v))layer[k]=clamp(v,...bounds(id,k));
      }
    }catch{/* Use the original composition if a local preference is unavailable. */}
    return clean;
  }
  let settings=restore(),original,selected='west',opener,drag=null;
  update(settings);
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
    original=structuredClone(settings);opener=button;
    for(const el of panel.querySelectorAll('[data-copy]'))el.textContent=t(el.dataset.copy);
    const select=panel.querySelector('select');
    select.innerHTML=Object.entries(layers).map(([id,label])=>'<option value="'+id+'">'+t(label)+'</option>').join('');
    select.value=selected;showFields();dialog.showModal();select.focus();
  }
  document.addEventListener('click',e=>{const button=e.target.closest?.('[data-edit-sky]');if(button)open(button);});
  panel.querySelector('select').addEventListener('change',e=>{selected=e.target.value;showFields();});
  fieldset.addEventListener('input',e=>{
    const k=e.target.name;if(!Object.hasOwn(settings[selected],k))return;
    if(k==='type')settings[selected].type=e.target.value;
    else settings[selected][k]=k==='visible'?e.target.checked:Number(e.target.value);
    syncFields();update(settings);
  });
  panel.addEventListener('click',e=>{
    const action=e.target.closest('button')?.value;
    if(action==='reset'){settings=structuredClone(defaults);showFields();update(settings);}
    if(action==='cancel'){dialog.close('cancel');}
    if(action==='save'){try{localStorage.setItem(key,JSON.stringify(settings));}catch{toast(t('Sky changes apply to this session.'));}dialog.close('save');}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close('cancel');});
  dialog.addEventListener('close',()=>{if(dialog.returnValue!=='save'){settings=original;update(settings);}drag=null;opener?.focus();});
  const viewport=dialog.querySelector('.sky-viewport');
  viewport.addEventListener('pointerdown',e=>{
    const layer=settings[selected];if(e.button!==0||layer.visible===false||(!('x' in layer)&&!('y' in layer)))return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:layer.x,startY:layer.y};
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const layer=settings[selected];
    if('x' in layer)layer.x=clamp(Math.round(drag.startX+(e.clientX-drag.x)*100/innerWidth),...bounds(selected,'x'));
    if('y' in layer)layer.y=clamp(Math.round(drag.startY+(e.clientY-drag.y)*100/innerHeight),...bounds(selected,'y'));
    syncFields();update(settings);
  });
  viewport.addEventListener('lostpointercapture',()=>{drag=null;});
})();
