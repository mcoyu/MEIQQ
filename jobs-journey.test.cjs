const test=require('node:test'),assert=require('node:assert/strict');
const Jobs=require('./jobs.js');

const jobAt=(book,id)=>book.jobs.find(job=>job.id===id);
const snapshot=value=>JSON.stringify(value);
function practiceDiagnostic(book){
 return Jobs.create(book,{mode:'practice',draft:{
  title:'Practice: one sales question diagnostic',client:'Fictional business',
  scope:'One authorized sales export, one reporting period and one agreed question. Deliver a checked findings brief and one review call. Extra cleanup and wider analysis require a new agreement.',
  owner:'Studio director',nextAction:'Check source readiness',nextActionDate:'2026-11-02',dueDate:'2026-11-08',
  paymentTerms:'$200 deposit; $400 final balance after delivery.',price:'600',estimatedDirectCost:'170',ownerHours:'3',ownerRate:'40',overhead:'0'
 }});
}

test('S1 practice job reaches final payment while agreement, incurred costs, cash and time stay distinct',()=>{
 const book=Jobs.fresh();
 const real=Jobs.create(book,{mode:'real',draft:{title:'Unstarted real opportunity'}}),realBefore=snapshot(real);
 const initial=practiceDiagnostic(book),id=initial.id;
 const current=()=>jobAt(book,id),metrics=()=>Jobs.metrics(current());

 assert.equal(metrics().acceptedPrice,null);
 assert.equal(metrics().received,0);
 assert.equal(metrics().incurredCosts,0);
 const firstAgreement=Jobs.recordAgreement(book,id,{date:'2026-11-02',reference:'Practice email confirming version 1',reason:''});
 const agreedBefore=snapshot(firstAgreement);
 assert.equal(metrics().acceptedPrice,60000);
 assert.equal(metrics().received,0,'an accepted quote is not a payment');

 Jobs.updateDraft(book,id,{price:'650',scope:'A proposed broader analysis, not accepted.'});
 assert.equal(metrics().acceptedPrice,60000,'drafting a new price must not rewrite the agreement');
 assert.equal(snapshot(current().agreements[0]),agreedBefore);
 Jobs.updateDraft(book,id,{price:'600',scope:'One sales export, one period, one checked findings brief and one review. Cleanup beyond the agreed limit is excluded.'});
 Jobs.recordAgreement(book,id,{date:'2026-11-03',reference:'Practice email confirming scope version 2',reason:'Clarified the cleanup boundary without changing the price.'});
 assert.equal(current().agreements.length,2);
 assert.equal(snapshot(current().agreements[0]),agreedBefore,'the original agreement remains in history');

 Jobs.postEntry(book,id,{type:'receipt',date:'2026-11-03',amount:'200',reference:'Practice deposit receipt'});
 assert.equal(metrics().received,20000);
 assert.equal(metrics().outstanding,40000);
 assert.equal(metrics().jobCash,20000);

 const analyst=Jobs.postEntry(book,id,{type:'cost',date:'2026-11-04',amount:'150',supplier:'Practice analyst',description:'Checked analysis delivered'});
 const software=Jobs.postEntry(book,id,{type:'cost',date:'2026-11-04',amount:'20',supplier:'Practice software vendor',description:'Job-specific software cost'});
 Jobs.postEntry(book,id,{type:'work',date:'2026-11-04',person:'Studio director',kind:'owner',hours:'3',description:'Scoping, review and delivery preparation'});
 assert.equal(metrics().incurredCosts,17000);
 assert.equal(metrics().paidCosts,0,'incurring a cost is not paying it');
 assert.equal(metrics().unpaidCosts,17000);
 assert.equal(metrics().jobCash,20000,'incurred costs and owner time do not reduce recorded cash');
 assert.equal(metrics().ownerHours,3);
 assert.equal(metrics().actualOwnerAllowance,12000);

 Jobs.postEntry(book,id,{type:'approval',date:'2026-11-05',reference:'Practice client approval of brief v2',description:'Named client reviewer approved the stated brief version.'});
 Jobs.postEntry(book,id,{type:'delivery',date:'2026-11-06',reference:'Practice delivery of brief v2',description:'Final brief and review completed.'});
 assert.equal(metrics().outstanding,40000,'a delivered job can still have an unpaid customer balance');
 assert.equal(metrics().received,20000,'approval and delivery do not invent cash receipts');

 Jobs.postEntry(book,id,{type:'cost-payment',date:'2026-11-06',costId:analyst.id,amount:'150',reference:'Practice analyst payment'});
 Jobs.postEntry(book,id,{type:'cost-payment',date:'2026-11-06',costId:software.id,amount:'20',reference:'Practice software payment'});
 assert.equal(metrics().paidCosts,17000);
 assert.equal(metrics().unpaidCosts,0);
 assert.equal(metrics().incurredCosts,17000,'payment must not duplicate the underlying expense');
 assert.equal(metrics().jobCash,3000);

 const wrong=Jobs.postEntry(book,id,{type:'receipt',date:'2026-11-07',amount:'450',reference:'Practice final receipt entered incorrectly'});
 assert.equal(metrics().overpayment,5000);
 const correction=Jobs.voidEntry(book,id,wrong.id,{date:'2026-11-07',reason:'Transcription error: the final receipt was $400, not $450.'});
 assert.equal(metrics().outstanding,40000);
 assert.equal(metrics().jobCash,3000);
 assert.ok(current().entries.some(entry=>entry.id===wrong.id),'the mistaken original stays in the history');
 assert.equal(current().entries.find(entry=>entry.id===wrong.id).amountCents,45000);
 assert.match(snapshot(correction),/Transcription error/);
 Jobs.postEntry(book,id,{type:'receipt',date:'2026-11-07',amount:'400',reference:'Practice final receipt corrected after void'});

 const final=metrics();
 assert.equal(final.acceptedPrice,60000);
 assert.equal(final.received,60000);
 assert.equal(final.netReceipts,60000);
 assert.equal(final.outstanding,0);
 assert.equal(final.overpayment,0);
 assert.equal(final.incurredCosts,17000);
 assert.equal(final.paidCosts,17000);
 assert.equal(final.jobCash,43000);
 assert.equal(final.actualOwnerAllowance,12000);
 assert.equal(final.remainderAfterIncurredCosts,43000);
 assert.equal(final.remainderAfterOwnerTime,31000);
 assert.equal(final.remainderAfterAllowances,31000);
 assert.equal(current().mode,'practice');
 assert.equal(snapshot(jobAt(book,real.id)),realBefore,'practice operations cannot alter the separate real job');

 const reopened=Jobs.parseText(Jobs.serialize(book));
 assert.deepEqual(jobAt(reopened,id),current(),'backup preserves agreements, posted entries and the correction trail');
 assert.deepEqual(Jobs.metrics(jobAt(reopened,id)),final);
});

test('an unfinished job can be saved and agreed without treating unknown internal estimates as zero',()=>{
 const book=Jobs.fresh();
 const job=Jobs.create(book,{mode:'practice',draft:{title:'Practice unknown-cost diagnostic',client:'Fictional client',scope:'One brief; delivery estimates are still being investigated.',price:'600',estimatedDirectCost:'not known',ownerHours:'',ownerRate:'',overhead:''}});
 Jobs.recordAgreement(book,job.id,{date:'2026-11-02',reference:'Practice fixed scope and price',reason:''});
 Jobs.postEntry(book,job.id,{type:'work',date:'2026-11-03',person:'Studio director',kind:'owner',hours:'1',description:'Initial client discussion'});
 const reopened=Jobs.parseText(Jobs.serialize(book)),restored=jobAt(reopened,job.id),m=Jobs.metrics(restored);
 assert.equal(restored.draft.estimatedDirectCost,'not known');
 assert.equal(restored.draft.ownerRate,'');
 assert.equal(m.acceptedPrice,60000);
 assert.equal(m.received,0);
 assert.equal(m.actualOwnerAllowance,null,'actual hours cannot be valued at an invented zero rate');
 assert.equal(m.remainderAfterOwnerTime,null);
 assert.equal(m.remainderAfterAllowances,null);
});
