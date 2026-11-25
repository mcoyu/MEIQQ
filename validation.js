/* Saved-run validation. No imported data reaches the UI before this boundary. */
(function(root) {
  'use strict';
  function upgradeModel(s,q) {
    if(s.modelVersion===q.MODEL_VERSION)return;
    // Earlier models used different inquiry identities.
    delete s.demandHistory;
    for(const h of s.history){if(h){delete h.externalArrivals;delete h.unservedInquiries;}}
    const clients=new Map(),contracts=new Map(),nameIds=new Map(),cycleCounts=new Map();let clientIndex=1;
    const clientIdFor=p=>p.clientId||nameIds.get(p.client)||(()=>{const id='C_legacy_'+clientIndex++;nameIds.set(p.client,id);return id;})();
    for(const p of s.projects){
      p.demandId??='legacy:'+p.id;p.random??=Object.fromEntries(['conversion','complexity','revision','approval','supplier','payment','return'].map(stream=>[stream,q.demandDraw(s.config,p.demandId,stream)]));
      p.clientId=clientIdFor(p);p.commitments??={quoteHours:(p.work?.quote||0)+0,quoteSetDay:p.created};p.cycle??=1;p.orderKind??=(p.renewal?'confirmed-repeat':'new-business');
      const accepted=!['inquiry','quote','lost'].includes(p.stage);
      p.fulfillmentStatus??=p.delivered?'delivered':'open';p.paymentStatus??=(accepted&&q.round(p.price-p.paid)===0?'paid':p.paid>0?'partial':'unpaid');p.renewalStatus??=(p.stage==='complete'?'not-returning':'ineligible');
      if(!clients.has(p.clientId))clients.set(p.clientId,{id:p.clientId,name:p.client,...(p.clientType===undefined?{}:{type:p.clientType}),brief:p.brief||'',created:p.created});
      if(accepted){
        p.contractId??='K_legacy_'+p.clientId+'_'+p.serviceId;const count=(cycleCounts.get(p.contractId)||0)+1;cycleCounts.set(p.contractId,count);p.cycle=count;
        if(!contracts.has(p.contractId))contracts.set(p.contractId,{id:p.contractId,clientId:p.clientId,serviceId:p.serviceId,kind:p.service?.recurring?'paid-cycle':'repeat-purchase',started:p.accepted??p.created,cycles:count,status:'active'});else contracts.get(p.contractId).cycles=count;
      }
    }
    const queuedCycleCounts=new Map(cycleCounts),reservedCycles=new Map(),reservedDemands=new Set();
    for(const r of s.repeatQueue){
      r.clientId??=nameIds.get(r.client)||s.projects.find(p=>p.client===r.client)?.clientId;
      r.contractId??='K_legacy_'+r.clientId+'_'+r.serviceId;
      if(!reservedCycles.has(r.contractId))reservedCycles.set(r.contractId,new Set());
      if(r.cycle!=null){
        if(!Number.isSafeInteger(r.cycle)||r.cycle<1)throw Error('Returning customer cycle is invalid.');
        reservedCycles.get(r.contractId).add(r.cycle);
      }
      if(r.demandId!=null)reservedDemands.add(r.demandId);
    }
    for(const r of s.repeatQueue){
      // Several legacy orders can share an inferred name/service contract.
      // Allocate missing identities without dropping orders or changing dates;
      // supplied identities are retained for the normal duplicate checks.
      if(r.cycle==null){
        let cycle=(queuedCycleCounts.get(r.contractId)||1)+1;
        for(;;cycle++){
          if(!Number.isSafeInteger(cycle))throw Error('Returning customer cycle is invalid.');
          if(!reservedCycles.get(r.contractId).has(cycle)&&(r.demandId!=null||!reservedDemands.has(r.contractId+':cycle:'+cycle)))break;
        }
        r.cycle=cycle;
      }
      queuedCycleCounts.set(r.contractId,Math.max(queuedCycleCounts.get(r.contractId)||1,r.cycle));
      reservedCycles.get(r.contractId).add(r.cycle);
      r.demandId??=r.contractId+':cycle:'+r.cycle;reservedDemands.add(r.demandId);r.orderKind??='confirmed-repeat';
    }
    s.clients=[...clients.values()];s.contracts=[...contracts.values()];s.upgradedFromModel=s.modelVersion||1;s.modelVersion=q.MODEL_VERSION;s.workloadId??='legacy-upgraded-seed-'+s.config.seed;
  }
  function validateDemandHistory(s,q){
    const periods=s.demandHistory;
    if(periods===undefined){
      if(s.history.some(h=>h.externalArrivals!==undefined||h.unservedInquiries!==undefined))throw Error('Daily demand history has no matching settings.');
      return;
    }
    if(!Array.isArray(periods)||!periods.length||periods.length>s.day)throw Error('Saved demand history is invalid.');
    let previousDay=0;
    const configs=periods.map(period=>{
      if(!Number.isInteger(period?.day)||period.day<=previousDay||period.day>s.day)throw Error('Demand history dates are invalid.');
      previousDay=period.day;
      const settings=period.settings;
      if(!Array.isArray(settings?.services)||settings.services.length>20||settings.services.some(v=>!v||!(v.weight>0)))throw Error('Saved demand settings are invalid.');
      // Only routing inputs enter this record. Use the normal range and service
      // validators, then restore canonical property order for comparison.
      const c={...q.DEFAULT,acquisition:settings.acquisition,ownerHours:120,seed:s.config.seed,
        services:settings.services.map(v=>({...q.DEFAULT.services[0],id:v.id,weight:v.weight,audience:v.audience}))};
      if(c.acquisition==='sales'){c.outreachHours=settings.outreachHours;c.leadsPerHour=settings.leadsPerHour;}else c.inquiries=settings.inquiries;
      if(settings.customerMix!==undefined){c.customerMix=settings.customerMix;c.focusType=settings.focusType;}
      else{delete c.customerMix;delete c.focusType;delete c.profileStrength;}
      q.validateConfig(c);
      period.settings=q.externalDemandSettings(c);
      return c;
    });
    const trackedFrom=periods[0].day;
    const external=s.projects.filter(p=>p.orderKind==='new-business'&&p.created>=trackedFrom);
    const remaining=new Map(external.map(p=>[p.demandId,p]));
    if(remaining.size!==external.length)throw Error('Duplicate external inquiry identity.');
    let period=0,unserved=0;
    for(const h of s.history){
      if(h.day<trackedFrom){
        if(h.externalArrivals!==undefined||h.unservedInquiries!==undefined)throw Error('Daily demand predates its settings.');
        continue;
      }
      if(periods[period+1]?.day===h.day)period++;
      const unmatched=[];
      const arrivals=q.visitExternalInquiries(configs[period],h.day,(id,profile,service,index)=>{
        if(!service){unmatched.push([index,profile?.id||null]);return;}
        const p=remaining.get(id);
        if(!p||p.created!==h.day||p.clientType!==profile?.id||p.serviceId!==service.id||p.clientId!=='C_'+id.replace(/:/g,'_'))throw Error('Recorded external inquiry does not match its settings.');
        remaining.delete(id);
      });
      if(h.externalArrivals!==arrivals||JSON.stringify(h.unservedInquiries??[])!==JSON.stringify(unmatched))throw Error('Recorded daily demand does not reconcile.');
      unserved+=unmatched.length;
    }
    if(remaining.size||unserved>(s.unserved||0)||trackedFrom===1&&unserved!==(s.unserved||0))throw Error('Recorded external inquiries do not reconcile.');
  }
  function restore(input, q) {
    if (!input || ![1, 2, 3].includes(input.version)) throw Error('Unsupported saved-run version.');
    if(input.modelVersion!==undefined&&![1,q.MODEL_VERSION].includes(input.modelVersion))throw Error('Unsupported simulation model version.');
    const s = q.clone(input), legacy = s.version < 3;
    s.config = q.normalize(s.config);
    q.validateConfig(s.config);
    const finite = (v, lo = 0, hi = 1e12) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
    const day = (v, max = s.day) => Number.isInteger(v) && v >= 0 && v <= max;
    const cents = v => Math.round(v * 100);
    const cash = v => finite(v, -1e12) && Math.abs(v - q.round(v)) < 1e-7;
    const same = (a, b, label) => { if (cents(a) !== cents(b)) throw Error(label + ' does not reconcile.'); };
    if (!day(s.day, s.config.months * 30)) throw Error('Saved run has an invalid day.');
    for (const key of ['cash','revenue','expenses','ownerHours','designHours','funding','nextId','lost']) {
      if (!finite(s[key])) throw Error('Saved run has an invalid ' + key + '.');
    }
    for (const key of ['cash','revenue','expenses','funding']) if (!cash(s[key])) throw Error('Saved money must use cents.');
    if (!Number.isInteger(s.nextId) || s.nextId < 1) throw Error('Saved project counter is invalid.');
    if (s.unserved !== undefined && (!Number.isInteger(s.unserved) || s.unserved < 0 || s.unserved > 1e7)) throw Error('Unserved inquiry count is invalid.');
    for (const key of ['projects','history','ledger','events','repeatQueue']) {
      if (!Array.isArray(s[key]) || s[key].length > 300000) throw Error('Saved run has an invalid ' + key + '.');
    }
    upgradeModel(s,q);
    if(!Array.isArray(s.clients)||!Array.isArray(s.contracts)||s.clients.length>300000||s.contracts.length>300000)throw Error('Saved client or contract records are invalid.');
    if(s.modelVersion!==q.MODEL_VERSION||typeof s.workloadId!=='string'||s.workloadId.length>200)throw Error('Saved simulation model is invalid.');
    if(s.day===0&&/^model2-seed-\d+$/.test(s.workloadId))s.workloadId='model2-seed-'+s.config.seed;
    const clients=new Map();
    for(const client of s.clients){
      if(!client||typeof client.id!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(client.id)||clients.has(client.id)||typeof client.name!=='string'||client.name.length>200||
         client.type!==undefined&&!q.CUSTOMER_TYPES.some(t=>t.id===client.type)||typeof(client.brief||'')!=='string'||(client.brief||'').length>200||!day(client.created))throw Error('Saved client record is invalid.');
      clients.set(client.id,client);
    }
    const contracts=new Map();
    for(const contract of s.contracts){
      if(contract?.kind==='campaign-relationship'&&contract.skipped===undefined)contract.skipped=0;
      if(!contract||typeof contract.id!=='string'||!/^[a-zA-Z0-9_-]{1,180}$/.test(contract.id)||contracts.has(contract.id)||!clients.has(contract.clientId)||typeof contract.serviceId!=='string'||
         !['paid-cycle','repeat-purchase','campaign-relationship'].includes(contract.kind)||!day(contract.started)||!Number.isInteger(contract.cycles)||contract.cycles<1||!['active','ended'].includes(contract.status))throw Error('Saved contract record is invalid.');
      if(contract.kind==='campaign-relationship'){
        const terms=contract.campaign;if(!terms||typeof terms!=='object'||Array.isArray(terms)||Object.keys(terms).sort().join(',')!=='cadenceDays,endDay,relationshipDays'||![30,90].includes(terms.cadenceDays)||terms.relationshipDays!==365||terms.endDay!==contract.started+terms.relationshipDays||!Number.isInteger(contract.skipped)||contract.skipped<0||contract.skipped>=contract.cycles||contract.cycles>Math.floor(terms.relationshipDays/terms.cadenceDays))throw Error('Saved campaign relationship is invalid.');
      }else if(contract.campaign!==undefined||contract.status!=='active')throw Error('Saved contract campaign terms are invalid.');
      contracts.set(contract.id,contract);
    }
    const projects = new Map(),campaignSkipCounts=new Map(),campaignSettledCycles=new Map();
    for (const p of s.projects) {
      if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(p.id) || projects.has(p.id) ||
          typeof p.client !== 'string' || p.client.length > 200 || ![...q.STAGES,'lost'].includes(p.stage)) throw Error('Saved project is invalid.');
      projects.set(p.id, p);
      if(typeof p.demandId!=='string'||!/^[a-zA-Z0-9:_-]{1,180}$/.test(p.demandId)||typeof p.clientId!=='string'||!clients.has(p.clientId))throw Error('Saved demand or client identity is invalid.');
      const client=clients.get(p.clientId);if(client.name!==p.client||client.type!==p.clientType||(client.brief||'')!==(p.brief||''))throw Error('Saved project client identity is inconsistent.');
      if(p.clientType!==undefined&&!q.CUSTOMER_TYPES.some(t=>t.id===p.clientType))throw Error('Saved customer profile is invalid.');
      if(!p.random||!['conversion','complexity','revision','approval','supplier','payment','return'].every(k=>finite(p.random[k],0,1)))throw Error('Saved demand randomness is invalid.');
      if(!p.commitments||!finite(p.commitments.quoteHours)||!day(p.commitments.quoteSetDay)||!Number.isInteger(p.cycle)||p.cycle<1||!['new-business','confirmed-repeat','paid-cycle-renewal','campaign-reoffer'].includes(p.orderKind))throw Error('Saved project commitment is invalid.');
      if(!['open','delivered'].includes(p.fulfillmentStatus)||!['unpaid','partial','paid'].includes(p.paymentStatus)||!['ineligible','scheduled','not-returning','skipped'].includes(p.renewalStatus))throw Error('Saved project lifecycle status is invalid.');
      if (/^P[0-9]+$/.test(p.id) && Number(p.id.slice(1)) >= s.nextId) throw Error('Saved project counter would reuse an existing ID.');
      for (const key of ['delivered','priority','renewal','revised']) if (typeof p[key] !== 'boolean') throw Error('Saved project status is invalid.');
      if (p.approvalConfirmed !== undefined && typeof p.approvalConfirmed !== 'boolean') throw Error('Saved approval is invalid.');
      q.validateConfig({...s.config,services:[{...p.service,weight:1}]});
      if (p.serviceId !== p.service.id) throw Error('Saved project service is inconsistent.');
      if(p.contractId!==undefined){
        const contract=contracts.get(p.contractId);
        if(!contract||contract.clientId!==p.clientId||contract.serviceId!==p.serviceId)throw Error('Saved project contract identity is inconsistent.');
        if(p.orderKind==='campaign-reoffer'&&(contract.kind!=='campaign-relationship'||p.cycle>Math.floor(contract.campaign.relationshipDays/contract.campaign.cadenceDays)))throw Error('Saved campaign quote contract is inconsistent.');
        if(p.orderKind==='campaign-reoffer'&&p.stage==='lost'){if(p.renewalStatus!=='skipped')throw Error('Declined campaign status is invalid.');campaignSkipCounts.set(contract.id,(campaignSkipCounts.get(contract.id)||0)+1);}
        if(contract.kind==='campaign-relationship'&&(p.accepted!==undefined||p.stage==='lost'))campaignSettledCycles.set(contract.id,Math.max(campaignSettledCycles.get(contract.id)||1,p.cycle));
      }
      for (const key of ['created','entered','due','price','paid','cost','ownerHours','designHours']) if (!finite(p[key])) throw Error('Invalid project ' + key + '.');
      if (!day(p.created) || !day(p.entered) || p.entered < p.created || !Number.isInteger(p.due) || p.due < p.created) throw Error('Project dates are invalid.');
      for (const key of ['paid','cost']) if (!cash(p[key])) throw Error('Project money must use cents.');
      if (!p.work || !['quote','design','review','delivery'].every(k => finite(p.work[k])) || !Array.isArray(p.log)) throw Error('Project remaining work or history is invalid.');
      let previous = p.created;
      for (const e of p.log) {
        if (!e || !day(e.day) || e.day < previous || typeof e.text !== 'string' || e.text.length > 5000) throw Error('Project history dates are invalid.');
        previous = e.day;
      }
      const accepted = !['inquiry','quote','lost'].includes(p.stage);
      if (legacy && accepted) {
        // Older snapshots did not consistently retain terms. Keep recorded values;
        // reconstruct only missing fields from their own history/settings.
        if (s.version === 1) {
          p.accepted ??= p.log.find(e => /Quote accepted/.test(e.text))?.day ?? p.created;
          p.terms ??= {paymentDays:s.config.paymentDays,approvalDays:s.config.approvalDays,printDays:s.config.printDays};
        }
        if (p.delivered && p.deliveredDay === undefined) {
          const deliveryEvents=p.log.filter(e=>e.text==='Delivered; revenue recognized');
          if (s.version === 2 && deliveryEvents.length !== 1) throw Error('Legacy delivery date cannot be recovered.');
          p.deliveredDay=deliveryEvents[0]?.day ?? (s.version===1?p.log.find(e=>/Moved to Final payment/.test(e.text))?.day:undefined);
          if (!day(p.deliveredDay)) throw Error('Legacy delivery date cannot be recovered.');
          if (s.version === 2 && p.stage === 'complete' && p.terms &&
              p.paymentDue === p.deliveredDay + 2*p.terms.paymentDays && p.receiveDay === p.paymentDue &&
              p.log.some(e=>e.day===p.deliveredDay+p.terms.paymentDays && e.text==='Moved to Complete') &&
              s.ledger.some(e=>e.project===p.id && e.type==='receipt' && e.day===p.deliveredDay+p.terms.paymentDays)) {
            // An old completed checkpoint advanced its stored payment dates a
            // second time. The delivery event and final receipt identify the
            // original due date without changing any money or event history.
            p.paymentDue=p.deliveredDay+p.terms.paymentDays;
            p.receiveDay=p.paymentDue;
          }
        }
        if (s.version === 1 && p.delivered) {
          p.paymentDue ??= p.deliveredDay + p.terms.paymentDays;
          p.receiveDay ??= p.paymentDue;
        }
      }
      if(accepted){p.terms.deliveryHours??=s.config.deliveryHours;p.terms.leadDays??=Math.max(1,p.due-p.accepted);}
      if (accepted !== (p.accepted !== undefined)) throw Error('Project stage and acceptance are inconsistent.');
      if (p.delivered !== ['payment','complete'].includes(p.stage)) throw Error('Project stage and delivered status are inconsistent.');
      if (!accepted && (p.price !== 0 || p.paid !== 0 || p.cost !== 0 || p.designHours !== 0)) throw Error('Unaccepted project has financial commitments.');
      if (accepted) {
        if (!day(p.accepted) || p.accepted < p.created || p.accepted > p.entered || p.due < p.accepted || !p.terms ||
            !['paymentDays','approvalDays','printDays'].every(k => day(p.terms[k],90))||!finite(p.terms.deliveryHours,0,24)||!day(p.terms.leadDays,180)||!p.contractId||!contracts.has(p.contractId)) throw Error('Project commitments or dates are invalid.');
        if (!finite(p.printCost)) throw Error('Project print cost is invalid.');
        const offer=p.service.fulfillment,choice=p.terms.fulfillment;
        if(choice!==undefined){
          if(!offer||!choice||typeof choice!=='object'||Array.isArray(choice)||Object.keys(choice).sort().join(',')!=='designOnlyPrice,managedPrice,managedPrintCost,managedShare,mode'||!['agency-managed','design-only'].includes(choice.mode)||!finite(choice.managedPrice,0,1e6)||!finite(choice.managedPrintCost,0,1e6)||!finite(choice.designOnlyPrice,0,1e6)||choice.managedShare!==offer.managedShare||cents(choice.managedPrice)!==cents(p.service.price)||cents(choice.managedPrintCost)!==cents(p.service.print)||cents(choice.designOnlyPrice)!==cents(offer.designOnlyPrice))throw Error('Project print fulfillment commitment is invalid.');
          same(p.price,choice.mode==='agency-managed'?choice.managedPrice:choice.designOnlyPrice,'Agreed price');same(p.printCost,choice.mode==='agency-managed'?choice.managedPrintCost:0,'Agreed print cost');
        }else{same(p.price,p.service.price,'Agreed price');same(p.printCost,p.service.print,'Agreed print cost');}
        if(legacy)p.price=q.round(p.price);
        if(!cash(p.price))throw Error('Agreed price must use cents.');
        if (cents(p.paid) > cents(p.price)) throw Error('Project paid balance exceeds its agreed price.');
        if (p.work.quote > 0.00001) throw Error('Accepted project has unfinished quoting work.');
      }
      if (p.stage === 'production' && (!day(p.printDuration,180) || p.printCost <= 0)) throw Error('Print commitment is invalid.');
      if (p.delivered) {
        if (!day(p.deliveredDay) || p.deliveredDay < p.accepted || p.deliveredDay > p.entered ||
            !day(p.paymentDue, s.day + 90) || p.paymentDue !== p.deliveredDay + p.terms.paymentDays ||
            !day(p.receiveDay, s.day + 180) || p.receiveDay < p.paymentDue) throw Error('Payment or delivery dates are invalid.');
        if (['design','review','delivery'].some(k => p.work[k] > 0.00001)) throw Error('Delivered project has unfinished work.');
        if (p.stage === 'complete') same(p.paid, p.price, 'Completed project balance');
        if (!legacy && p.stage === 'payment' && cents(p.price) === cents(p.paid)) throw Error('Fully paid project has an invalid payment stage.');
      } else if (p.deliveredDay !== undefined || p.paymentDue !== undefined || p.receiveDay !== undefined) throw Error('Undelivered project has payment dates.');
      if(p.fulfillmentStatus!==(p.delivered?'delivered':'open')||p.paymentStatus!==(q.round(p.price-p.paid)===0&&accepted?'paid':p.paid>0?'partial':'unpaid'))throw Error('Project lifecycle status does not reconcile.');
    }
    for(const contract of contracts.values())if(contract.kind==='campaign-relationship'&&(contract.skipped!==(campaignSkipCounts.get(contract.id)||0)||contract.cycles!==(campaignSettledCycles.get(contract.id)||1)))throw Error('Saved campaign relationship counts do not reconcile.');
    const reference = value => value === null || projects.has(value);
    const receipts = new Map(), costs = new Map(), flows = Array.from({length:s.day+1},()=>({amount:0,expense:0,funding:0,revenue:0}));
    const postedHours=new Map(),undatedHours=new Set();
    let lastDay = 0, total = 0, expenses = 0, funding = 0;
    for (const e of s.ledger) {
      if (!e || !day(e.day) || e.day < lastDay || !cash(e.amount) || typeof e.note !== 'string' || e.note.length > 5000 ||
          !['expense','receipt','funding'].includes(e.type)) throw Error('Cash ledger dates or amounts are invalid.');
      if (!reference(e.project)) throw Error('Ledger project reference is invalid.');
      if ((e.type === 'expense' && e.amount > 0) || (e.type === 'receipt' && (e.amount < 0 || !e.project)) ||
          (e.type === 'funding' && (e.amount <= 0 || e.project !== null))) throw Error('Cash ledger transaction sign or project is invalid.');
      const p = projects.get(e.project);
      if (p && (e.day < p.accepted || p.accepted === undefined)) throw Error('Ledger transaction predates project acceptance.');
      const labor=p&&e.type==='expense'&&e.note==='Design labor for '+p.id;
      if(e.designHours!==undefined){
        if(!labor||!finite(e.designHours,0,24)||e.designHours===0)throw Error('Designer hours on a labor posting are invalid.');
        postedHours.set(p.id,(postedHours.get(p.id)||0)+e.designHours);
      }else if(labor)undatedHours.add(p.id);
      const amount = cents(e.amount); lastDay = e.day; total += amount; flows[e.day].amount += amount;
      if (e.type === 'expense') { expenses -= amount; flows[e.day].expense -= amount; if(p) costs.set(p.id,(costs.get(p.id)||0)-amount); }
      if (e.type === 'receipt') receipts.set(p.id,(receipts.get(p.id)||0)+amount);
      if (e.type === 'funding') { funding += amount; flows[e.day].funding += amount; }
    }
    s.initialCash ??= q.round(s.cash - total / 100);
    if (!finite(s.initialCash) || !cash(s.initialCash)) throw Error('Initial cash is invalid.');
    same(s.cash, s.initialCash + total/100, 'Saved cash');
    same(s.expenses, expenses/100, 'Expenses'); same(s.funding, funding/100, 'Owner funding');
    let revenue = 0, owner = 0, design = 0;
    for (const p of s.projects) {
      same(p.paid, (receipts.get(p.id)||0)/100, 'Project paid receipts');
      same(p.cost, (costs.get(p.id)||0)/100, 'Project costs');
      if(postedHours.has(p.id)){
        const missing=p.designHours-postedHours.get(p.id);
        if(missing < -1e-6 || (!undatedHours.has(p.id)&&Math.abs(missing)>1e-6))throw Error('Designer hours on labor postings do not reconcile.');
      }
      owner += p.ownerHours; design += p.designHours;
      if (p.delivered) { revenue += cents(p.price); flows[p.deliveredDay].revenue += cents(p.price); }
    }
    same(s.revenue, revenue/100, 'Delivered revenue');
    if (Math.abs(s.designHours-design)>1e-6 || owner > s.ownerHours+1e-6) throw Error('Recorded work hours do not reconcile.');
    if (!Number.isInteger(s.lost) || s.lost !== s.projects.filter(p=>p.stage==='lost').length) throw Error('Declined count does not reconcile.');
    for (const e of s.events) if (!e || !day(e.day) || typeof e.text !== 'string' || !reference(e.project)) throw Error('Event history reference or date is invalid.');
    // Early campaign work could queue a thirteenth "monthly" or fifth
    // "seasonal" offer at the trailing edge of a 365-day relationship. Those
    // unstarted terminal quotes carry no money or work, so migrate them away
    // while preserving every settled campaign and marking the relationship end.
    s.repeatQueue=s.repeatQueue.filter(r=>{
      const contract=contracts.get(r?.contractId);if(!contract?.campaign||r.orderKind!=='campaign-reoffer')return true;
      const maxCycles=Math.floor(contract.campaign.relationshipDays/contract.campaign.cadenceDays),anchor=contract.started+maxCycles*contract.campaign.cadenceDays;
      if(contract.cycles!==maxCycles||r.cycle!==maxCycles+1||r.serviceId!==contract.serviceId||r.demandId!==contract.id+':cycle:'+r.cycle||!Number.isInteger(r.day)||r.day<anchor||r.day>contract.campaign.endDay||s.projects.some(p=>p.demandId===r.demandId))return true;
      contract.status='ended';return false;
    });
    const queuedDemands=new Set(),queuedCycles=new Set();
    for (const r of s.repeatQueue) {
      if (!r || !day(r.day,s.day+360) || r.day <= s.day || typeof r.client !== 'string' || r.client.length>200 || typeof r.serviceId !== 'string' ||
          !s.projects.some(p=>p.serviceId===r.serviceId && p.client===r.client && p.stage==='complete')) throw Error('Returning-client schedule is invalid.');
      const client=clients.get(r.clientId),contract=contracts.get(r.contractId);
      if(!client||client.name!==r.client||client.type!==r.clientType||!contract||contract.clientId!==r.clientId||contract.serviceId!==r.serviceId||contract.status!=='active'||
         !Number.isInteger(r.cycle)||r.cycle<=contract.cycles||typeof r.demandId!=='string'||!['confirmed-repeat','paid-cycle-renewal','campaign-reoffer'].includes(r.orderKind)||(r.orderKind==='campaign-reoffer')!==(contract.kind==='campaign-relationship')||(r.orderKind==='campaign-reoffer'&&r.cycle>Math.floor(contract.campaign.relationshipDays/contract.campaign.cadenceDays)))throw Error('Returning customer identity is inconsistent.');
      const cycleKey=JSON.stringify([r.contractId,r.cycle]);
      if(queuedDemands.has(r.demandId)||queuedCycles.has(cycleKey))throw Error('Returning-client schedule contains a duplicate demand or contract cycle.');
      queuedDemands.add(r.demandId);queuedCycles.add(cycleKey);
    }
    // Older atomic rollbacks could retain the ID of a project created only in
    // the discarded day. Repair that diagnostic only when replay reproduces
    // the exact payment failure; financial and project records stay intact.
    if(s.blocked&&typeof s.blocked.project==='string'&&!projects.has(s.blocked.project)&&
       /^P\d+$/.test(s.blocked.project)&&Number(s.blocked.project.slice(1))>=s.nextId&&
       ['Design labor for ','Print order for '].some(prefix=>s.blocked.note===prefix+s.blocked.project)){
      const replay=q.clone(s);replay.blocked=null;
      if(!q.step(replay)&&replay.blocked?.project===null&&['amount','cash','gap','note'].every(key=>replay.blocked[key]===s.blocked[key]))s.blocked.project=null;
    }
    if (s.blocked && (!finite(s.blocked.amount) || !finite(s.blocked.cash) || !finite(s.blocked.gap) || s.blocked.gap<=0 ||
        cents(s.blocked.gap)!==cents(s.blocked.amount-s.blocked.cash) || typeof s.blocked.note!=='string' || !reference(s.blocked.project))) throw Error('Cash decision is invalid.');
    if (s.history.length !== s.day) throw Error('Daily history is incomplete.');
    let balance=cents(s.initialCash)+flows[0].amount, incurred=flows[0].expense, earned=flows[0].revenue, hours=0;
    for (let i=1;i<=s.day;i++) {
      const h=s.history[i-1], f=flows[i]; balance+=f.amount;incurred+=f.expense;earned+=f.revenue;
      if (!h || h.day!==i) throw Error('Daily history dates are invalid.');
      for (const key of ['cash','revenue','expenses','ownerHours','complete','active','late']) if(!finite(h[key])) throw Error('Daily results are invalid.');
      if (!finite(h.profit,-1e12) || h.ownerHours<hours-1e-6 || h.ownerHours>s.ownerHours+1e-6 ||
          !['complete','active','late'].every(k=>Number.isInteger(h[k])&&h[k]<=s.projects.length)) throw Error('Daily results are inconsistent.');
      // Prototype 02 omitted funding added after the day's closing observation.
      // Only that known, ledger-supported difference may be repaired on migration.
      const missing=balance-cents(h.cash);
      if (legacy && missing>0 && missing===f.funding) h.cash=balance/100;
      same(h.cash,balance/100,'Daily cash history'); same(h.expenses,incurred/100,'Daily expenses');
      same(h.revenue,earned/100,'Daily delivered revenue'); same(h.profit,(earned-incurred)/100,'Daily profit');
      if(balance<0)throw Error('Daily cash history is negative.');
      hours=h.ownerHours;
    }
    if (Math.abs(hours-s.ownerHours)>1e-6) throw Error('Daily owner hours do not reconcile.');
    validateDemandHistory(s,q);
    if (legacy) {
      for (const p of s.projects) if(p.stage==='payment' && cents(p.paid)===cents(p.price)) q.completePaid(s,p);
      if(s.history.length){const m=q.metrics(s);Object.assign(s.history.at(-1),{complete:m.complete,active:m.active,late:m.late});}
    }
    q.validateReplayJournal(s);
    s.version=3;
    return s;
  }
  root.MEIQQValidation={restore};
  if(typeof module!=='undefined')module.exports={restore};
})(globalThis);
