const vm=require('node:vm'),fs=require('node:fs');
function setup(initial,options={}){
 const elements={},handlers={},storage=new Map(initial||[]);
 const downloads=[];
 const document={createElement:()=>({click(){downloads.push(this);}}),documentElement:{dataset:{}},querySelector:s=>elements[s]||(elements[s]={innerHTML:'',textContent:'',className:''}),querySelectorAll:()=>[],addEventListener:(name,fn)=>handlers[name]=fn};
 const ctx={document,console,Intl,Blob,URL,TextEncoder,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(options.failWrites)throw Error('Quota exceeded');storage.set(k,v);}},setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,clearTimeout:()=>{},window:{addEventListener:()=>{}}};
 if(options.indexedDB)ctx.indexedDB=options.indexedDB;
 vm.createContext(ctx);
 if(options.built){for(const script of fs.readFileSync('MEIQQ.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(script[1],ctx);}
 else {for(const file of ['validation.js','engine.js','workspace.js','storage.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);}

 const click=(action,other={})=>handlers.click({target:{closest:()=>({dataset:{action,...other}})}});
 return{ctx,elements,handlers,storage,click,downloads,options};
}
module.exports={setup};
