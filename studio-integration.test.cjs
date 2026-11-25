const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {setup}=require('./ui-test-host.cjs');
test('Studio dialogs retain their opener when a click does not focus the button',async()=>{
 const h=setup();await vm.runInContext('studioReady',h.ctx);h.click('view',{view:'studio'});
 h.ctx.document.activeElement={id:'body'};
 const id=vm.runInContext('studioSession.data.offerings[0].id',h.ctx);h.click('studio-select',{id});h.click('studio-delete',{id});
 assert.equal(vm.runInContext('modalFocus.action',h.ctx),'studio-delete');assert.equal(vm.runInContext('modalFocus.id',h.ctx),id);
 assert.equal(vm.runInContext('actionFocus',h.ctx),null);
 h.click('close');assert.equal(vm.runInContext('studioSession.data.offerings.length',h.ctx),5);
});
test('Studio ideas can be edited, compared and reopened without changing simulator state',async()=>{
 const h=setup();await vm.runInContext('studioReady',h.ctx);
 const before=vm.runInContext('JSON.stringify(currentWorkspace())',h.ctx);h.click('view',{view:'studio'});
 assert.match(h.elements['#root'].innerHTML,/Studio workbench/);assert.doesNotMatch(h.elements['#root'].innerHTML,/data-action="play"|Branch scenario/);
 assert.equal(vm.runInContext('studioSession.data.offerings.length',h.ctx),5);
 h.click('studio-add');const id=vm.runInContext('studioUI.selectedId',h.ctx);
 const edit=(field,value)=>h.handlers.input({target:{id:'test-studio-'+field,dataset:{studioField:field,ideaId:id},value,tagName:'INPUT'}});
 edit('name','Flexible client idea');edit('price','750.50');edit('researchNotes','Ask which business question matters.');edit('directCost','unknown');
 h.click('studio-tab',{tab:'compare'});assert.match(h.elements['#root'].innerHTML,/Flexible client idea/);
 assert.equal(vm.runInContext('JSON.stringify(currentWorkspace())',h.ctx),before);
 await vm.runInContext('studioSession.flush()',h.ctx);const reopened=setup([...h.storage]);await vm.runInContext('studioReady',reopened.ctx);
 assert.equal(vm.runInContext('studioSession.data.offerings.at(-1).price',reopened.ctx),'750.50');assert.equal(vm.runInContext('studioSession.data.offerings.at(-1).directCost',reopened.ctx),'unknown');assert.equal(vm.runInContext('studioSession.data.offerings.at(-1).researchNotes',reopened.ctx),'Ask which business question matters.');
});
test('Studio backup round-trips research and imports additional copies without touching simulation',async()=>{
 const h=setup(undefined,{built:true});await vm.runInContext('studioReady',h.ctx);h.click('view',{view:'studio'});h.click('studio-backup');
 assert.equal(h.downloads[0].download,'MEIQQ-Studio-Ideas.json');const raw=await(await fetch(h.downloads[0].href)).text();h.ctx.studioDownloaded=raw;
 const before=vm.runInContext('JSON.stringify(currentWorkspace())',h.ctx);vm.runInContext('pendingStudioImport=QQStudio.parseText(studioDownloaded)',h.ctx);h.click('studio-confirm-import');
 assert.equal(vm.runInContext('studioSession.data.offerings.length',h.ctx),10);assert.equal(vm.runInContext('new Set(studioSession.data.offerings.map(v=>v.id)).size',h.ctx),10);assert.equal(vm.runInContext('JSON.stringify(currentWorkspace())',h.ctx),before);await vm.runInContext('studioSession.flush()',h.ctx);
 assert.throws(()=>vm.runInContext('MEIQQWorkspace.parseText(studioDownloaded)',h.ctx));
});
test('Studio role editing and confirmed deletion are functional and persist intentionally empty collections',async()=>{
 const h=setup();await vm.runInContext('studioReady',h.ctx);h.click('view',{view:'studio'});h.click('studio-add');
 const id=vm.runInContext('studioUI.selectedId',h.ctx);const before=vm.runInContext('studioSession.data.offerings.at(-1).roles.length',h.ctx);h.click('studio-role-add');assert.equal(vm.runInContext('studioSession.data.offerings.at(-1).roles.length',h.ctx),before+1);h.click('studio-role-remove',{index:0});assert.equal(vm.runInContext('studioSession.data.offerings.at(-1).roles.length',h.ctx),before);
 h.click('studio-delete',{id});assert.match(h.elements['#modal'].innerHTML,/Delete this idea/);assert.equal(vm.runInContext('studioSession.data.offerings.length',h.ctx),6);h.click('studio-confirm-delete',{id});assert.equal(vm.runInContext('studioSession.data.offerings.length',h.ctx),5);
 vm.runInContext('for(const idea of [...studioSession.data.offerings])QQStudio.remove(studioSession.data,idea.id)',h.ctx);await vm.runInContext('studioSession.flush()',h.ctx);const reopened=setup([...h.storage]);await vm.runInContext('studioReady',reopened.ctx);assert.equal(vm.runInContext('studioSession.data.offerings.length',reopened.ctx),0);
});

test('Studio opens on the library and edits the chosen idea’s existing next action',async()=>{
 const h=setup();await vm.runInContext('studioReady',h.ctx);
 const state=code=>vm.runInContext(code,h.ctx),page=()=>h.elements['#root'].innerHTML;
 const [first,second]=state('studioSession.data.offerings');
 h.click('view',{view:'studio'});assert.doesNotMatch(page(),/data-studio-field=/);
 h.click('studio-select',{id:second.id});assert.match(page(),/Next action/);assert.ok(page().includes(second.nextAction));
 assert.ok(page().indexOf('data-studio-field="nextAction"')<page().indexOf('<summary>Idea details'));
 h.handlers.input({target:{dataset:{studioField:'nextAction',ideaId:second.id},value:'Request the print proof'}});
 h.click('studio-section',{section:'research'});assert.match(page(),/Request the print proof/);
 h.click('studio-tab',{tab:'ideas'});assert.doesNotMatch(page(),/data-studio-field=/);
 h.click('studio-select',{id:first.id});assert.ok(page().includes(first.nextAction));assert.doesNotMatch(page(),/Request the print proof/);
 h.click('view',{view:'setup'});h.click('view',{view:'studio'});assert.doesNotMatch(page(),/data-studio-field=/);
 await state('studioSession.flush()');const restored=setup([...h.storage]);await vm.runInContext('studioReady',restored.ctx);
 restored.click('view',{view:'studio'});restored.click('studio-select',{id:second.id});
 assert.match(restored.elements['#root'].innerHTML,/Request the print proof/);
});
