const test=require('node:test'),assert=require('node:assert/strict');
const Model=require('./studio.js'),Session=require('./studio-session.js'),{database}=require('./storage-test-host.cjs');
function local(initial=[]){const values=new Map(initial);return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
function seed(){const studio=Model.fresh();Model.create(studio,{name:'Research draft',price:'',researchNotes:'Confirm access first'});return studio;}
test('Studio edits reopen offline and never touch the simulator save',async()=>{
 const disk=local([['qq-studio-lab-v1','untouched simulator']]);const s=Session.create({local:disk,seed});await s.open();
 Model.setField(s.data,s.data.offerings[0].id,'price','550.50');s.changed();await s.flush();
 const restored=Session.create({local:disk});await restored.open();
 assert.equal(restored.data.offerings[0].price,'550.50');assert.equal(restored.data.offerings[0].researchNotes,'Confirm access first');assert.equal(disk.getItem('qq-studio-lab-v1'),'untouched simulator');
});
test('opening and flushing an unchanged second window does not invalidate the first window',async()=>{
 const db=database(),disk=local();const a=Session.create({local:disk,indexedDB:db.factory,seed});await a.open();await a.flush();
 const revision=db.records.get(Model.STORAGE_KEY).revision;
 const b=Session.create({local:disk,indexedDB:db.factory});await b.open();await b.flush();
 assert.equal(db.records.get(Model.STORAGE_KEY).revision,revision);
 // The beforeunload handler calls save even when nothing has changed.
 b.save();await b.flush();assert.equal(db.records.get(Model.STORAGE_KEY).revision,revision);
 Model.setField(a.data,a.data.offerings[0].id,'price','100');a.changed();assert.equal(await a.flush(),true);assert.equal(a.status,'saved');
 assert.equal(Model.parseText(db.records.get(Model.STORAGE_KEY).text).offerings[0].price,'100');
 // A genuine later edit from the stale window must still be rejected.
 Model.setField(b.data,b.data.offerings[0].id,'price','200');b.changed();assert.equal(await b.flush(),false);assert.equal(b.status,'error');assert.match(b.error,/Another window/);
 assert.equal(Model.parseText(db.records.get(Model.STORAGE_KEY).text).offerings[0].price,'100');
});
test('reverting during an in-flight save is persisted rather than mistaken for unchanged data',async()=>{
 const db=database(),session=Session.create({local:local(),indexedDB:db.factory,seed});await session.open();await session.flush();
 const id=session.data.offerings[0].id;Model.setField(session.data,id,'price','100');session.changed();session.save();
 Model.setField(session.data,id,'price','');session.changed();session.save();
 assert.equal(await session.flush(),true);assert.equal(session.status,'saved');assert.equal(Model.parseText(db.records.get(Model.STORAGE_KEY).text).offerings[0].price,'');
});
test('corrupt and divergent originals stay intact instead of being replaced by examples',async()=>{
 const broken='{unreadable',disk=local([[Model.STORAGE_KEY,broken]]),s=Session.create({local:disk,seed});await s.open();await s.flush();assert.equal(s.status,'error');assert.equal(s.originals[0].text,broken);assert.equal(disk.getItem(Model.STORAGE_KEY),broken);
 const db=database(),primary=seed(),fallback=seed();primary.offerings[0].name='Primary idea';fallback.offerings[0].name='Fallback idea';const raw=Model.serialize(primary);db.records.set(Model.STORAGE_KEY,{revision:1,text:raw});const disk2=local([[Model.STORAGE_KEY,Model.serialize(fallback)]]),t=Session.create({local:disk2,indexedDB:db.factory});await t.open();await t.flush();assert.equal(t.status,'error');assert.equal(t.originals.length,2);assert.equal(db.records.get(Model.STORAGE_KEY).text,raw);
});
test('failed primary reads disable writes, and quota failures leave previous saves intact',async()=>{
 const db=database();db.options.failReads=true;const s=Session.create({local:local(),indexedDB:db.factory,seed});await s.open();assert.equal(s.status,'error');assert.match(s.error,/could not be read/);assert.equal(db.records.size,0);
 const disk=local(),t=Session.create({local:disk,seed});await t.open();const before=disk.getItem(Model.STORAGE_KEY);disk.setItem=()=>{throw Error('Quota exceeded');};Model.setField(t.data,t.data.offerings[0].id,'price','400');t.changed();assert.equal(await t.flush(),false);assert.equal(t.status,'error');assert.equal(disk.getItem(Model.STORAGE_KEY),before);
});
test('imports append fresh copies atomically and preserve incomplete research',async()=>{
 const s=Session.create({local:local(),seed});await s.open();const incoming=seed();incoming.offerings[0].name='Saved idea';incoming.offerings[0].price='not decided';const originalId=s.data.offerings[0].id;assert.equal(s.merge(incoming),1);await s.flush();assert.equal(s.data.offerings.length,2);assert.equal(s.data.offerings[0].id,originalId);assert.notEqual(s.data.offerings[1].id,originalId);assert.equal(s.data.offerings[1].price,'not decided');
 const before=Model.serialize(s.data);assert.throws(()=>s.merge({version:99,offerings:[]}));assert.equal(Model.serialize(s.data),before);
});
test('combined import size is checked before replacing any working data',async()=>{
 const large=Model.fresh(),draft=Object.fromEntries(['buyer','problem','scope','deliverables','inputs','handoffs','acceptance','researchNotes','sources','nextAction'].map(key=>[key,'x'.repeat(10000)]));
 for(let i=0;i<45;i++)Model.create(large,draft);
 assert.ok(Model.serialize(large).length<Model.MAX_BYTES);
 const session=Session.create({local:local(),seed:()=>large});await session.open();const before=Model.serialize(session.data);
 assert.throws(()=>session.merge(large),/8 MiB/);assert.equal(Model.serialize(session.data),before);assert.equal(await session.flush(),true);
});
test('a blocked session never reports a successful flush',async()=>{
 const db=database();db.records.set(Model.STORAGE_KEY,{revision:1,text:'broken'});const session=Session.create({local:local(),indexedDB:db.factory,seed});await session.open();assert.equal(await session.flush(),false);assert.equal(session.status,'error');
});
test('an older completed write cannot mark an unserializable collection saved',async()=>{
 // Exercise the shared session independently of each editor's field limits.
 let failure=false;
 const model={...Model,serialize(book){if(failure)throw Error('Draft serialization failed.');return Model.serialize(book);}};
 const db=database(),s=Session.create({indexedDB:db.factory,model,seed});await s.open();await s.flush();
 const first=s.data.offerings[0].id;Model.setField(s.data,first,'price','100');s.changed();s.save();
 Model.setField(s.data,first,'price','110');failure=true;
 s.changed();assert.equal(await s.flush(),false);assert.equal(s.unsaved,true);assert.match(s.error,/serialization failed/);
 const onDisk=Model.parseText(db.records.get(Model.STORAGE_KEY).text);
 assert.equal(onDisk.offerings[0].price,'100');assert.equal(s.data.offerings[0].price,'110');
 failure=false;
 assert.equal(await s.flush(),true);assert.equal(s.unsaved,false);
 assert.equal(Model.parseText(db.records.get(Model.STORAGE_KEY).text).offerings[0].price,'110');
});
