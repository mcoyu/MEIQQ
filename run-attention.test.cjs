const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const QQ=require('./engine.js');
const {setup}=require('./ui-test-host.cjs');

const read=(ui,code)=>vm.runInContext(code,ui.ctx);
function scenario(options,days){
 const service={...QQ.clone(QQ.DEFAULT.services[0]),id:'poster',name:'Design study',deliverable:'A PDF',hours:6,review:1,print:0,weight:100,price:400,recurring:false};
 const state=QQ.fresh({...QQ.clone(QQ.DEFAULT),inquiries:60,conversion:1,startingCash:50000,months:3,ownerHours:60,
  designers:1,designerHours:25,designerRate:24,overhead:100,acquisition:'preset',retention:0,repeat:0,approvalDays:6,
  paymentDays:3,leadDays:14,realism:false,profileStrength:0,services:[service],...options});
 for(let day=0;day<days;day++)assert.equal(QQ.step(state),true);
 return state;
}
function openRun(state){
 const ui=setup();
 ui.ctx.fixture=JSON.stringify(state);
 read(ui,"state=JSON.parse(fixture);draft=QQ.clone(state.config);view='map';render()");
 return ui;
}
const watch=ui=>read(ui,'jobsToWatch(QQ.orderedProjects(state))');
const pane=ui=>read(ui,'inspector(QQ.orderedProjects(state))');
function select(ui,p){ui.click('project',{id:p.id,origin:'watch'});}
function nextCard(ui){return pane(ui).split('class="project-next"')[1].split('</section>')[0];}

test('the watch list prioritizes actual capacity stops and leaves queue order intact',()=>{
 const state=scenario({designers:0},5),ui=openRun(state),html=watch(ui);
 assert.equal((html.match(/class="attention-job"/g)||[]).length,3);
 assert.equal((html.match(/No design capacity/g)||[]).length,3);
 assert.match(html,/Add designer availability in People/);
 assert.doesNotMatch(html,/Working hours resume/);
 assert.equal(read(ui,'JSON.stringify(state)'),JSON.stringify(state));
 select(ui,state.projects[0]);
 assert.match(nextCard(ui),/No design capacity · China team/);
 assert.match(nextCard(ui),/data-action="team"/);
 assert.match(pane(ui),/Project controls/);
 assert.match(pane(ui),/Project timeline/);
 ui.click('unselect');assert.equal(read(ui,'view'),'map');
 read(ui,"filter='lost';search='unrelated'");
 ui.click('all-open-jobs');assert.equal(read(ui,'view'),'projects');
 assert.equal(read(ui,'filter'),'active');assert.equal(read(ui,'search'),'');
});

test('the inspector distinguishes weekday resource work from the calendar response date and manual approval',()=>{
 const state=scenario({},5),ui=openRun(state);
 const design=state.projects.find(p=>p.stage==='design'),approval=state.projects.find(p=>p.stage==='approval');
 select(ui,design);
 assert.match(nextCard(ui),/In design · China team/);
 assert.match(nextCard(ui),/Working hours resume on day 8/);
 select(ui,approval);
 const expected=state.day+QQ.projectDiagnostic(state,approval).remainingCalendarDays;
 assert.match(nextCard(ui),new RegExp('Expected client response on day '+expected));
 assert.doesNotMatch(nextCard(ui),/Working hours resume|No design capacity/);
 ui.click('approve',{id:approval.id});assert.match(nextCard(ui),/Approval recorded/);
 assert.doesNotMatch(nextCard(ui),/Expected client response|data-action="approve"/);
});

test('delivered balances display contractual and expected collection dates and never acquire delivery lateness',()=>{
 const state=scenario({inquiries:8,designerHours:120,paymentDays:0,realism:true},18);
 const overdue=state.projects.find(p=>p.stage==='payment'&&p.paymentDue<state.day);
 assert.ok(overdue);
 const ui=openRun(state);select(ui,overdue);
 const html=nextCard(ui);
 assert.match(html,/Payment 1 day overdue/);
 assert.match(html,new RegExp('due day '+overdue.paymentDue+' · expected collection day '+overdue.receiveDay));
 assert.doesNotMatch(html,/Delivery.*late|Extend deadline/);
 assert.match(watch(ui),new RegExp('data-id="'+overdue.id+'" data-origin="watch"'));
});

test('payment dates beyond the horizon describe an open job at the end of the run',()=>{
 const state=scenario({months:1,inquiries:4,designerHours:120,paymentDays:90},30),ui=openRun(state);
 const payment=state.projects.find(p=>p.stage==='payment');
 select(ui,payment);
 assert.match(nextCard(ui),new RegExp('expected collection day '+payment.receiveDay));
 assert.match(nextCard(ui),/Extend its length in Controls/);
 assert.match(ui.elements['#root'].innerHTML,/data-action="review-latest-results"/);
});

test('a rolled-back funding decision shows the actual shortfall without inventing a committed job',()=>{
 const state=scenario({startingCash:2.35,overhead:2.5},0);
 assert.equal(QQ.step(state),false);
 assert.equal(state.day,0);assert.equal(state.blocked.project,null);
 const ui=openRun(state),html=watch(ui);
 assert.match(html,/Day 1 paused for funding/);
 assert.match(html,/Monthly software and overhead needs \$2.50/);
 assert.match(html,/\$0.15 shortfall/);
 assert.match(html,/data-action="cash"/);
 assert.doesNotMatch(html,/data-origin="watch"/);
 ui.click('cash');
 const dialog=ui.elements['#modal'].innerHTML;
 assert.match(dialog,/This payment needs <b>\$0\.15<\/b> more/);
 assert.match(dialog,/id="funding"[^>]+value="0\.15"/);
});

test('owner capacity reflects outreach and a blocked project links to the real job only',()=>{
 const state=scenario({},3),newConfig=QQ.clone(state.config);
 Object.assign(newConfig,{outreachHours:5,ownerHours:5,acquisition:'sales'});
 QQ.applyConfig(state,newConfig);
 for(let day=0;day<30&&!state.projects.some(p=>p.stage==='review');day++)assert.equal(QQ.step(state),true);
 const ui=openRun(state),review=state.projects.find(p=>p.stage==='review');
 assert.ok(review);select(ui,review);
 assert.match(nextCard(ui),/No owner time for projects/);
 assert.match(nextCard(ui),/Reduce outreach in Demand/);
 const poor=scenario({startingCash:150,deposit:0,overhead:0},1);
 for(let d=0;d<6&&!poor.blocked;d++)QQ.step(poor);
 assert.ok(poor.blocked?.project);
 const held=openRun(poor);
 assert.match(watch(held),new RegExp('data-id="'+poor.blocked.project+'" data-origin="watch"'));
 select(held,poor.projects.find(p=>p.id===poor.blocked.project));
 assert.match(nextCard(held),/Funding needed/);assert.match(nextCard(held),/data-action="cash"/);
});
