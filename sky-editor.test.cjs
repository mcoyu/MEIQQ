const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(require.resolve('./sky-editor.js'),'utf8');
const scene={};
vm.compileFunction(fs.readFileSync(require.resolve('./sunset-scene.js'),'utf8'),['window'])(scene);
const key='qq-studio-sunset-v1';

function editor(storage){
  function control(){
    const listeners=new Map();
    return {classList:{toggle(){}},focus(){},querySelectorAll(){return [];},querySelector(){return null;},
      addEventListener(event,listener){listeners.set(event,listener);},
      fire(event,target){listeners.get(event)?.({target});}};
  }
  let preview;
  const dialog=control(),panel=control(),fields=control(),viewport=control(),picker=control(),tip=control();
  const document=control(),window=control();
  document.querySelector=()=>dialog;
  dialog.querySelector=selector=>({'.sky-controls':panel,'.sky-fields':fields,'.sky-viewport':viewport})[selector];
  panel.querySelector=selector=>selector==='select'?picker:tip;
  dialog.showModal=()=>{dialog.open=true;};
  dialog.close=()=>{dialog.open=false;dialog.fire('close');};
  window.SunsetScene={...scene.SunsetScene,update:value=>{preview=structuredClone(value);}};
  vm.runInNewContext(script,{document,window,structuredClone,localStorage:storage,QQI18n:{text:s=>s},toast(){}});
  return {open(){document.fire('click',{closest:()=>({closest:()=>null,focus(){}})});},
    edit(layer,field,value){picker.fire('change',{value:layer});fields.fire('input',{name:field,value});},
    press(value){panel.fire('click',{closest:()=>({value})});},preview:()=>preview};
}

test('two open sky editors save their own changes and cancel returns to the latest saved sky',()=>{
  const book=new Map(),storage={getItem:k=>book.get(k)??null,setItem:(k,v)=>book.set(k,v)};
  const a=editor(storage),b=editor(storage);
  a.open();b.open();a.edit('moon','scale',120);b.edit('light','dusk',82);
  a.press('save');b.press('save');
  const saved=JSON.parse(book.get(key));
  assert.deepEqual([saved.moon.scale,saved.light.dusk],[120,82]);
  a.open();a.press('reset');b.open();b.edit('moon','scale',130);b.press('save');a.press('cancel');
  assert.deepEqual([a.preview().moon.scale,a.preview().light.dusk],[130,82]);
  a.open();a.press('reset');a.press('save');
  assert.equal(editor(storage).preview().moon.scale,scene.SunsetScene.defaults.moon.scale);
});

test('session-only sky edits reopen when storage writes fail and malformed preferences fall back',()=>{
  const storage={getItem:()=>JSON.stringify({west:{type:['cirrus'],x:300}}),setItem(){throw Error('Storage full');}};
  const tab=editor(storage);
  assert.equal(tab.preview().west.type,'auto');assert.equal(tab.preview().west.x,135);
  tab.open();tab.edit('moon','scale',142);tab.press('save');
  tab.open();assert.equal(tab.preview().moon.scale,142);tab.press('reset');tab.press('cancel');
  assert.equal(tab.preview().moon.scale,142);
});
