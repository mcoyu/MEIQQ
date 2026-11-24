const test=require('node:test'),assert=require('node:assert/strict');
const J=require('./jobs.js');
const draft={title:'One analytics diagnostic',client:'Practice client',scope:'One question, source and reporting period.',price:'600',estimatedDirectCost:'170',ownerHours:'3',ownerRate:'40',overhead:'0',paymentTerms:'200 deposit and 400 on delivery',dueDate:'2026-12-10'};
function sample(mode='practice'){const book=J.fresh(),job=J.create(book,{mode,draft});return {book,id:job.id,get:()=>book.jobs.find(v=>v.id===job.id)};}
function agree(s){return J.recordAgreement(s.book,s.id,{date:'2026-12-01',reference:'Written scope accepted',reason:''});}
const receipt=(amount,date='2026-12-01')=>({type:'receipt',date,amount,reference:'Recorded bank receipt'});
test('unfinished job drafts and unposted money forms survive backup without creating actuals',()=>{
 const s=sample();J.updateDraft(s.book,s.id,{price:'not agreed',ownerHours:'',dueDate:'date to confirm'});J.setForm(s.book,s.id,'receipt',{date:'2026-12-',amount:'200.',reference:'awaiting confirmation'});
 const opened=J.parseText(J.serialize(s.book)).jobs[0];assert.equal(opened.draft.price,'not agreed');assert.equal(opened.draft.dueDate,'date to confirm');assert.equal(opened.forms.receipt.amount,'200.');assert.equal(opened.entries.length,0);
 const m=J.metrics(opened);assert.equal(m.acceptedPrice,null);assert.equal(m.outstanding,null);assert.equal(m.received,0);assert.equal(m.incurredCosts,0);assert.equal(m.hasActualEntries,false);assert.equal(m.status,'draft');
});
test('accepted terms freeze independently of the planning draft and later amendments retain history',()=>{
 const s=sample(),first=agree(s),original=JSON.stringify(first);J.updateDraft(s.book,s.id,{price:'750',scope:'A revised proposed scope'});
 assert.equal(J.metrics(s.get()).acceptedPrice,60000);assert.equal(JSON.stringify(s.get().agreements[0]),original);
 const before=J.serialize(s.book);assert.throws(()=>J.recordAgreement(s.book,s.id,{date:'2026-12-02',reference:'New terms',reason:''}),/reason/);assert.equal(J.serialize(s.book),before);
 const second=J.recordAgreement(s.book,s.id,{date:'2026-12-02',reference:'Client agreed extension',reason:'Additional reporting period'});
 assert.equal(second.priceCents,75000);assert.equal(s.get().agreements.length,2);assert.equal(JSON.stringify(s.get().agreements[0]),original);assert.equal(J.metrics(s.get()).received,0);
 assert.throws(()=>J.recordAgreement(s.book,s.id,{date:'2026-11-30',reason:'Backdated amendment'}),/predate/);
});
test('incurred costs, supplier payments, work allowances and job cash remain distinct',()=>{
 const s=sample();agree(s);J.postEntry(s.book,s.id,receipt('200'));
 const cost=J.postEntry(s.book,s.id,{type:'cost',date:'2026-12-02',amount:'170',supplier:'Analyst and software',description:'Agreed delivery costs'});
 J.postEntry(s.book,s.id,{type:'work',date:'2026-12-02',person:'Studio owner',kind:'owner',hours:'3',description:'Scoping, review and handoff'});
 J.postEntry(s.book,s.id,{type:'work',date:'2026-12-02',person:'Analyst',kind:'external',hours:'5',description:'Analysis'});
 let m=J.metrics(s.get());assert.equal(m.incurredCosts,17000);assert.equal(m.paidCosts,0);assert.equal(m.jobCash,20000);assert.equal(m.actualOwnerAllowance,12000);assert.equal(m.remainderAfterOwnerTime,31000);assert.equal(m.totalHours,8);
 J.postEntry(s.book,s.id,{type:'cost-payment',date:'2026-12-03',costId:cost.id,amount:'70',reference:'Partial supplier transfer'});m=J.metrics(s.get());assert.equal(m.jobCash,13000);assert.equal(m.unpaidCosts,10000);assert.equal(m.costs[0].unpaidCents,10000);
 assert.throws(()=>J.postEntry(s.book,s.id,{type:'cost-payment',date:'2026-12-03',costId:cost.id,amount:'101',reference:''}),/exceed/);
 J.postEntry(s.book,s.id,{type:'delivery',date:'2026-12-04',description:'Report delivered',reference:'Delivery email'});m=J.metrics(s.get());assert.equal(m.status,'delivered');assert.equal(m.outstanding,40000);
 J.postEntry(s.book,s.id,receipt('400','2026-12-05'));assert.equal(J.metrics(s.get()).status,'delivered');
 J.postEntry(s.book,s.id,{type:'cost-payment',date:'2026-12-05',costId:cost.id,amount:'100',reference:'Final supplier transfer'});m=J.metrics(s.get());assert.equal(m.status,'settled');assert.equal(m.jobCash,43000);assert.equal(m.outstanding,0);
});
test('corrections retain originals and cannot orphan linked supplier payments',()=>{
 const s=sample();const cost=J.postEntry(s.book,s.id,{type:'cost',date:'2026-12-01',amount:'170',supplier:'Analyst',description:'Delivery'}),payment=J.postEntry(s.book,s.id,{type:'cost-payment',date:'2026-12-02',costId:cost.id,amount:'100',reference:'Transfer'});
 const before=J.serialize(s.book);assert.throws(()=>J.voidEntry(s.book,s.id,cost.id,{date:'2026-12-03',reason:'Wrong cost'}),/linked supplier/);assert.equal(J.serialize(s.book),before);
 J.voidEntry(s.book,s.id,payment.id,{date:'2026-12-03',reason:'Payment linked incorrectly'});J.voidEntry(s.book,s.id,cost.id,{date:'2026-12-03',reason:'Wrong cost'});
 const m=J.metrics(s.get());assert.equal(m.incurredCosts,0);assert.equal(m.paidCosts,0);assert.equal(m.hasCosts,false);assert.equal(s.get().entries.length,4);assert.equal(s.get().entries[0].amountCents,17000);assert.equal(m.voidedIds.length,2);
 assert.throws(()=>J.voidEntry(s.book,s.id,cost.id,{date:'2026-12-03',reason:'Again'}),/active posted/);assert.throws(()=>J.voidEntry(s.book,s.id,'entry-3',{date:'2026-12-03',reason:'Void a void'}),/active posted/);
});
test('customer overpayments and refunds remain visible, with safe receipt correction order',()=>{
 const s=sample();agree(s);const first=J.postEntry(s.book,s.id,receipt('650'));let m=J.metrics(s.get());assert.equal(m.overpayment,5000);assert.equal(m.outstanding,0);
 const refund=J.postEntry(s.book,s.id,{type:'refund',date:'2026-12-02',amount:'50',reference:'Overpayment returned'});m=J.metrics(s.get());assert.equal(m.received,65000);assert.equal(m.refunded,5000);assert.equal(m.netReceipts,60000);assert.equal(m.overpayment,0);
 assert.throws(()=>J.postEntry(s.book,s.id,{type:'refund',date:'2026-12-03',amount:'601',reference:''}),/exceed/);
 assert.throws(()=>J.voidEntry(s.book,s.id,first.id,{date:'2026-12-03',reason:'Receipt correction'}),/refunds/);
 J.voidEntry(s.book,s.id,refund.id,{date:'2026-12-03',reason:'Refund correction'});J.voidEntry(s.book,s.id,first.id,{date:'2026-12-03',reason:'Receipt correction'});assert.equal(J.metrics(s.get()).received,0);assert.equal(J.metrics(s.get()).outstanding,60000);
});
test('a delivered job with excess receipts settles only after refund or agreed amendment reconciliation',()=>{
 const s=sample();agree(s);J.postEntry(s.book,s.id,receipt('650'));J.postEntry(s.book,s.id,{type:'delivery',date:'2026-12-02',description:'Report delivered',reference:'Client handoff'});
 let m=J.metrics(s.get());assert.equal(m.outstanding,0);assert.equal(m.overpayment,5000);assert.equal(m.status,'delivered');
 const refund=J.postEntry(s.book,s.id,{type:'refund',date:'2026-12-03',amount:'50',reference:'Excess receipt returned'});assert.equal(J.metrics(s.get()).status,'settled');
 J.voidEntry(s.book,s.id,refund.id,{date:'2026-12-04',reason:'Refund was entered in error and was not sent'});assert.equal(J.metrics(s.get()).status,'delivered');
 J.updateDraft(s.book,s.id,{price:'650'});assert.equal(J.metrics(s.get()).status,'delivered');
 J.recordAgreement(s.book,s.id,{date:'2026-12-04',reference:'Accepted expanded scope',reason:'Client agreed to an additional review'});m=J.metrics(s.get());assert.equal(m.overpayment,0);assert.equal(m.status,'settled');assert.equal(s.get().agreements[0].priceCents,60000);
});
test('invalid posted amounts, impossible dates and bad references reject atomically',()=>{
 const s=sample(),before=J.serialize(s.book);
 for(const amount of ['', 'unknown','-5','1.234','1e3','0','100000001'])assert.throws(()=>J.postEntry(s.book,s.id,receipt(amount)));
 for(const date of ['2026-02-29','2026-13-01','2026-2-01','tomorrow'])assert.throws(()=>J.postEntry(s.book,s.id,receipt('10',date)));
 assert.throws(()=>J.postEntry(s.book,s.id,{type:'cost-payment',date:'2026-12-01',costId:'entry-99',amount:'10',reference:''}),/active incurred/);
 assert.throws(()=>J.postEntry(s.book,s.id,{type:'work',date:'2026-12-01',person:'Owner',kind:'free',hours:'3',description:''}),/owner or external/);
 assert.equal(J.serialize(s.book),before);
});
test('unknown agreed estimates remain unknown while posted work uses exact cent arithmetic',()=>{
 const s=sample();J.updateDraft(s.book,s.id,{estimatedDirectCost:'',ownerHours:'',ownerRate:'20.15',overhead:''});agree(s);J.postEntry(s.book,s.id,{type:'work',date:'2026-12-02',person:'Owner',kind:'owner',hours:'0.50',description:'Review'});
 const m=J.metrics(s.get());assert.equal(m.estimatedDirectCost,null);assert.equal(m.estimatedOwnerHours,null);assert.equal(m.estimatedRemainder,null);assert.equal(m.actualOwnerAllowance,1008);assert.equal(m.remainderAfterOwnerTime,58992);assert.equal(m.remainderAfterAllowances,null);assert.equal(m.hasCosts,false);
});
test('typed import enforces journal references and practice identity, and merge copies internal history safely',()=>{
 const s=sample();agree(s);const cost=J.postEntry(s.book,s.id,{type:'cost',date:'2026-12-01',amount:'10',supplier:'Software',description:'Report tool'});J.postEntry(s.book,s.id,{type:'cost-payment',date:'2026-12-02',costId:cost.id,amount:'10',reference:'Receipt'});
 const opened=J.parseText(J.serialize(s.book)),merged=J.merge(s.book,opened);assert.equal(s.book.jobs.length,1);assert.equal(merged.jobs.length,2);assert.notEqual(merged.jobs[0].id,merged.jobs[1].id);assert.equal(merged.jobs[1].mode,'practice');assert.equal(merged.jobs[1].entries[1].costId,merged.jobs[1].entries[0].id);assert.equal(J.metrics(merged.jobs[1]).paidCosts,1000);
 const malformed=JSON.parse(J.serialize(s.book));malformed.jobs.jobs[0].entries[1].costId='entry-999';assert.throws(()=>J.parse(malformed),/active incurred/);
 malformed.jobs.jobs[0].entries[1].costId=cost.id;malformed.jobs.jobs[0].entries[1].id=cost.id;assert.throws(()=>J.parse(malformed),/ordered|unique/);
 assert.throws(()=>J.parseText('{"format":"meiqq-studio","version":1,"jobs":{}}'),/supported Jobs/);
 assert.throws(()=>J.updateDraft(s.book,s.id,{mode:'real'}),/unsupported/);
});
test('large job imports are rejected before altering either source collection',()=>{
 const a=J.fresh();const long={...draft,scope:'x'.repeat(10000),paymentTerms:'x'.repeat(10000),nextAction:'x'.repeat(10000)};
 for(let i=0;i<140;i++)J.create(a,{mode:'practice',draft:long});const before=J.serialize(a);assert.ok(before.length<J.MAX_BYTES);assert.throws(()=>J.merge(a,a),/8 MiB/);assert.equal(J.serialize(a),before);
});
