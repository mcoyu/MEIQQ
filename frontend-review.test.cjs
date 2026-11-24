const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

// A focused DOM-contract double exercises node movement and identity, rather
// than only comparing generated HTML. This is not a visual/browser test.
class Element {
 constructor(tag,attrs={},children=[]){this.nodeType=1;this.localName=tag;this.attrs={...attrs};this.childNodes=[];children.forEach(c=>this.insertBefore(c,null));}
 get id(){return this.attrs.id||'';}
 get firstChild(){return this.childNodes[0]||null;}
 get nextSibling(){return this.parentNode?.childNodes[this.parentNode.childNodes.indexOf(this)+1]||null;}
 get attributes(){return Object.entries(this.attrs).map(([name,value])=>({name,value}));}
 hasAttribute(k){return k in this.attrs;}
 getAttribute(k){return this.attrs[k]??null;}
 setAttribute(k,v){this.attrs[k]=v;}
 removeAttribute(k){delete this.attrs[k];}
 insertBefore(n,b){n.remove();this.childNodes.splice(b?this.childNodes.indexOf(b):this.childNodes.length,0,n);n.parentNode=this;}
 remove(){if(this.parentNode){this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this),1);this.parentNode=null;}}
 cloneNode(deep){return new Element(this.localName,this.attrs,deep?this.childNodes.map(n=>n.cloneNode(true)):[]);}
 focus(){this.focused=true;}
}
function contractTree(html){
 const attr=(text,name)=>{const value=text.match(new RegExp(name+'="([^"]+)"'))?.[1];return value?{[name]:value}:{};};
 const rows=[...html.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].filter(m=>m[2].includes('data-disclosure="contract-'));
 return new Element('tbody',{},rows.map(([,attrs,body])=>new Element('tr',attr(attrs,'data-render-key'),[
  new Element('td',{},[new Element('details',attr(body,'data-disclosure'),[new Element('summary',attr(body.match(/<summary[^>]*>/)?.[0]||'','id'))])])
 ])));
}
test('re-ranking contract rows preserves disclosure nodes and restores keyboard focus',()=>{
 const {ctx}=setup();
 vm.runInContext("const base={cycles:1,delivered:1,booked:100,revenue:100,margin:.5,receivable:0,afterOwner:20,unfinishedCost:0,collected:100,open:0,ownerHours:1,designHours:1,projects:[],kind:'repeat-purchase'};var contractFixture={contracts:[{...base,id:'A',client:'Alpha',contribution:60},{...base,id:'B',client:'Beta',contribution:40}]}",ctx);
 const current=contractTree(vm.runInContext('contractAnalyticsView(contractFixture)',ctx));
 const original=current.firstChild,details=original.firstChild.firstChild,summary=details.firstChild;
 ctx.summary=summary;const focus=vm.runInContext('focusKey(summary)',ctx);assert.ok(focus?.domId,'Disclosure summaries need a stable DOM focus identity');
 vm.runInContext('contractFixture.contracts[1].contribution=80',ctx);
 const next=contractTree(vm.runInContext('contractAnalyticsView(contractFixture)',ctx));
 ctx.current=current;ctx.next=next;vm.runInContext('patchRenderChildren(current,next)',ctx);
 assert.equal(current.childNodes[1],original,'The existing row must move, not be rebuilt');
 assert.equal(current.childNodes[1].firstChild.firstChild,details);
 ctx.document.querySelectorAll=()=>[summary];ctx.focus=focus;vm.runInContext('restoreFocus(focus)',ctx);assert.equal(summary.focused,true);
});
test('analytics tabs and paging controls have distinct render identities',()=>{
 const {ctx}=setup();ctx.nodeA=new Element('button',{'data-action':'analytics-tab','data-tab':'overview'});ctx.nodeB=new Element('button',{'data-action':'analytics-tab','data-tab':'contracts'});
 assert.equal(vm.runInContext('renderKey(nodeA)!==renderKey(nodeB)',ctx),true);
 ctx.nodeA=new Element('button',{'data-action':'contract-page','data-delta':'-1'});ctx.nodeB=new Element('button',{'data-action':'contract-page','data-delta':'1'});
 assert.equal(vm.runInContext('renderKey(nodeA)!==renderKey(nodeB)',ctx),true);
});
test('comparison rows use financial totals without re-aggregating full contract analytics',()=>{
 const {ctx}=setup();
 vm.runInContext("for(let i=0;i<20;i++)QQ.step(state);saved=[QQ.clone(state),QQ.clone(state)];var a=QQ.analytics(state),m=QQ.metrics(state);QQ.analytics=()=>{throw Error('Unexpected expensive contract aggregation for comparison row')}",ctx);
 const html=vm.runInContext('simulationAnalyticsView(a,m)',ctx);
 assert.match(html,/Simulation comparison/);assert.ok(!/NaN|Infinity/.test(html));
 assert.match(html,/Same day/);
});
