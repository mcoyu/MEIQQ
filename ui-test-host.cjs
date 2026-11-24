const vm=require('node:vm'),fs=require('node:fs');
function setup(initial,options={}){
 const elements={},handlers={},storage=new Map(initial||[]);
 const downloads=[],timeouts=new Map();let nextTimer=1;
 const document={createElement:()=>({click(){downloads.push(this);}}),documentElement:{dataset:{}},querySelector:s=>elements[s]||(elements[s]={innerHTML:'',textContent:'',className:'',focus(){}}),querySelectorAll:()=>[],addEventListener:(name,fn)=>handlers[name]=fn};
 const setTimeout=(fn)=>{const id=nextTimer++;timeouts.set(id,fn);return id;};
 const clearTimeout=id=>timeouts.delete(id);
 const ctx={crypto:options.noCrypto?undefined:require('node:crypto').webcrypto,document,console,Intl,Blob,URL,TextEncoder,performance:{now:()=>0},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(options.failWrites)throw Error('Quota exceeded');storage.set(k,v);}},setInterval:()=>1,clearInterval:()=>{},setTimeout,clearTimeout,window:{addEventListener:()=>{}}};
 if(options.indexedDB)ctx.indexedDB=options.indexedDB;
 vm.createContext(ctx);
 if(options.built){for(const script of fs.readFileSync('MEIQQ.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(script[1],ctx);}
 else {for(const file of ['validation.js','engine.js','service-catalog.js','preset-evidence.js','presets.js','comparison-report.js','workspace.js','storage.js','studio.js','studio-seeds.js','studio-session.js','studio-view.js','jobs.js','jobs-view.js','jobs-controller.js','planner.js','planner-explorer.js','planner-studio.js','planner-bridge.js','planner-view.js','planner-controller.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);}

 const click=(action,other={})=>handlers.click({target:{closest:()=>({dataset:{action,...other}})}});
 const runNextTimer=()=>{const entry=timeouts.entries().next().value;if(!entry)return false;timeouts.delete(entry[0]);entry[1]();return true;};
 const drainTimers=(limit=100)=>{let count=0;while(timeouts.size&&count<limit){runNextTimer();count++;}if(timeouts.size)throw Error('Timer queue did not settle.');return count;};
 return{ctx,elements,handlers,storage,click,downloads,options,runNextTimer,drainTimers,pendingTimers:()=>timeouts.size};
}
module.exports={setup};
