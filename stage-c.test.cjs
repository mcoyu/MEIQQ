const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');

test('Phase C journey changes a service, runs, inspects, compares, and reopens',()=>{
 const {ctx,elements,handlers,click,storage,downloads,drainTimers}=setup();
 click('example');click('confirm-example');
 const edit=(id,path,value)=>handlers.input({target:{id,dataset:{input:path},type:'number',tagName:'INPUT',value:String(value),checkValidity:()=>true}});
 edit('input-services-0-price','services.0.price',625);
 edit('input-services-0-hours','services.0.hours',7.5);
 edit('input-designerHours','designerHours',1);
 vm.runInContext('view="setup";stepIndex=0;render()',ctx);
 assert.equal(vm.runInContext('state.config.services[0].price',ctx),290,'editing must not mutate the applied run');
 assert.match(elements['#root'].innerHTML,/Per project/);
 assert.match(elements['#root'].innerHTML,/Designer labor/);
 assert.match(elements['#root'].innerHTML,/Expected supplier cost|Supplier batch cost/);
 assert.match(elements['#root'].innerHTML,/Expected first 30 days/);
 assert.match(elements['#root'].innerHTML,/Design capacity/);
 vm.runInContext('review()',ctx);
 assert.match(elements['#modal'].innerHTML,/Design only · price/);
 assert.match(elements['#modal'].innerHTML,/\$290 → \$625/);
 click('apply',{mode:'restart'});
 assert.equal(vm.runInContext('state.day',ctx),0);
 assert.equal(vm.runInContext('checkpointInfo.filter(v=>v.baseline).length',ctx),1);
 click('finish');drainTimers();
 assert.equal(vm.runInContext('state.day',ctx),30);
 const projectId=vm.runInContext("state.projects.find(p=>p.accepted!==undefined&&!p.delivered&&p.stage==='design'&&state.day>p.due)?.id",ctx);
 assert.ok(projectId);
 assert.equal(vm.runInContext(`state.day>state.projects.find(p=>p.id===${JSON.stringify(projectId)}).due`,ctx),true);
 assert.ok(vm.runInContext(`state.day-state.projects.find(p=>p.id===${JSON.stringify(projectId)}).entered`,ctx)>=14);
 vm.runInContext(`selection={type:'project',id:${JSON.stringify(projectId)}};view='map';render()`,ctx);
 assert.match(elements['#root'].innerHTML,/What happens next/);
 assert.match(elements['#root'].innerHTML,/design team needs .* more work hours/i);
 assert.match(elements['#root'].innerHTML,/Delivery due<\/label><strong>Day/);
 assert.match(elements['#root'].innerHTML,/Project timeline/);
 assert.match(elements['#root'].innerHTML,/Quote accepted/);
 vm.runInContext("view='scenarios';render()",ctx);
 assert.match(elements['#root'].innerHTML,/Compared with pinned baseline/);
 assert.match(elements['#root'].innerHTML,/Design only · price/);
 assert.match(elements['#root'].innerHTML,/Exact assumption changes/);
 assert.match(elements['#root'].innerHTML,/different days|descriptive, not causal/i);
 assert.match(elements['#root'].innerHTML,/same seed identity|different or legacy seed identity/i);

 click('backup');
 assert.equal(downloads.length,1);
 assert.equal(downloads[0].download,'MEIQQ-Backup-Day-30.json');
 const opened=vm.runInContext('MEIQQWorkspace.parseText(MEIQQWorkspace.serialize(currentWorkspace(),archives))',ctx);
 assert.equal(opened.state.day,30);
 assert.equal(opened.checkpointInfo.filter(v=>v.baseline).length,1);
 assert.equal(opened.state.config.services[0].price,625);

 vm.runInContext('save()',ctx);drainTimers();
 const reopened=setup([...storage]);
 assert.equal(vm.runInContext('state.day',reopened.ctx),30);
 assert.equal(vm.runInContext('checkpointInfo.filter(v=>v.baseline).length',reopened.ctx),1);
 assert.equal(vm.runInContext('state.config.services[0].price',reopened.ctx),625);
 assert.equal(vm.runInContext('state.config.designerHours',reopened.ctx),1);
});

test('deduplicated current state is the checkpoint pinned as baseline',()=>{
 const {ctx}=setup();
 const result=vm.runInContext(`
  QQ.step(state);checkpoint('manual');
  const current=QQ.clone(state);QQ.step(state);checkpoint('manual');
  state=current;draft=QQ.clone(state.config);draft.ownerHours=11;applyDraft('restart');
  checkpointInfo.map((v,i)=>({baseline:v.baseline,day:saved[i].day}));
 `,ctx);
 assert.deepEqual(Array.from(result,v=>({baseline:v.baseline,day:v.day})),[{baseline:true,day:1},{baseline:false,day:2}]);
});
