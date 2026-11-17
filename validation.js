/* Saved-run validation. No imported data reaches the UI before this boundary. */
(function(root) {
  'use strict';
  function restore(input, q) {
    if (!input || ![1, 2, 3].includes(input.version)) throw Error('Unsupported saved-run version.');
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
    for (const key of ['projects','history','ledger','events','repeatQueue']) {
      if (!Array.isArray(s[key]) || s[key].length > 300000) throw Error('Saved run has an invalid ' + key + '.');
    }
    const projects = new Map();
    for (const p of s.projects) {
      if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(p.id) || projects.has(p.id) ||
          typeof p.client !== 'string' || p.client.length > 200 || ![...q.STAGES,'lost'].includes(p.stage)) throw Error('Saved project is invalid.');
      projects.set(p.id, p);
      if (/^P[0-9]+$/.test(p.id) && Number(p.id.slice(1)) >= s.nextId) throw Error('Saved project counter would reuse an existing ID.');
      for (const key of ['delivered','priority','renewal','revised']) if (typeof p[key] !== 'boolean') throw Error('Saved project status is invalid.');
      if (p.approvalConfirmed !== undefined && typeof p.approvalConfirmed !== 'boolean') throw Error('Saved approval is invalid.');
      q.validateConfig({...s.config,services:[{...p.service,weight:1}]});
      if (p.serviceId !== p.service.id) throw Error('Saved project service is inconsistent.');
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
      if (s.version === 1 && accepted) {
        // Older snapshots did not consistently retain terms. Keep recorded values;
        // reconstruct only missing fields from their own history/settings.
        p.accepted ??= p.log.find(e => /Quote accepted/.test(e.text))?.day ?? p.created;
        p.terms ??= {paymentDays:s.config.paymentDays,approvalDays:s.config.approvalDays,printDays:s.config.printDays};
        if (p.delivered) {
          p.deliveredDay ??= p.log.find(e => /Delivered|Moved to Final payment/.test(e.text))?.day;
          if (!day(p.deliveredDay)) throw Error('Legacy delivery date cannot be recovered.');
          p.paymentDue ??= p.deliveredDay + p.terms.paymentDays;
          p.receiveDay ??= p.paymentDue;
        }
      }
      if (accepted !== (p.accepted !== undefined)) throw Error('Project stage and acceptance are inconsistent.');
      if (p.delivered !== ['payment','complete'].includes(p.stage)) throw Error('Project stage and delivered status are inconsistent.');
      if (!accepted && (p.price !== 0 || p.paid !== 0 || p.cost !== 0 || p.designHours !== 0)) throw Error('Unaccepted project has financial commitments.');
      if (accepted) {
        if (!day(p.accepted) || p.accepted < p.created || p.accepted > p.entered || p.due < p.accepted || !p.terms ||
            !['paymentDays','approvalDays','printDays'].every(k => day(p.terms[k],90))) throw Error('Project commitments or dates are invalid.');
        if (!finite(p.printCost)) throw Error('Project print cost is invalid.');
        same(p.price, p.service.price, 'Agreed price');
        if(legacy)p.price=q.round(p.price);
        if(!cash(p.price))throw Error('Agreed price must use cents.');
        same(p.printCost, p.service.print, 'Agreed print cost');
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
    }
    const reference = value => value === null || projects.has(value);
    const receipts = new Map(), costs = new Map(), flows = Array.from({length:s.day+1},()=>({amount:0,expense:0,funding:0,revenue:0}));
    let lastDay = 0, total = 0, expenses = 0, funding = 0;
    for (const e of s.ledger) {
      if (!e || !day(e.day) || e.day < lastDay || !cash(e.amount) || typeof e.note !== 'string' || e.note.length > 5000 ||
          !['expense','receipt','funding'].includes(e.type)) throw Error('Cash ledger dates or amounts are invalid.');
      if (!reference(e.project)) throw Error('Ledger project reference is invalid.');
      if ((e.type === 'expense' && e.amount > 0) || (e.type === 'receipt' && (e.amount < 0 || !e.project)) ||
          (e.type === 'funding' && (e.amount <= 0 || e.project !== null))) throw Error('Cash ledger transaction sign or project is invalid.');
      const p = projects.get(e.project);
      if (p && (e.day < p.accepted || p.accepted === undefined)) throw Error('Ledger transaction predates project acceptance.');
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
      owner += p.ownerHours; design += p.designHours;
      if (p.delivered) { revenue += cents(p.price); flows[p.deliveredDay].revenue += cents(p.price); }
    }
    same(s.revenue, revenue/100, 'Delivered revenue');
    if (Math.abs(s.designHours-design)>1e-6 || owner > s.ownerHours+1e-6) throw Error('Recorded work hours do not reconcile.');
    if (!Number.isInteger(s.lost) || s.lost !== s.projects.filter(p=>p.stage==='lost').length) throw Error('Declined count does not reconcile.');
    for (const e of s.events) if (!e || !day(e.day) || typeof e.text !== 'string' || !reference(e.project)) throw Error('Event history reference or date is invalid.');
    for (const r of s.repeatQueue) if (!r || !day(r.day,s.day+360) || r.day <= s.day || typeof r.client !== 'string' || r.client.length>200 || typeof r.serviceId !== 'string' ||
      !s.projects.some(p=>p.serviceId===r.serviceId && p.client===r.client && p.stage==='complete')) throw Error('Returning-client schedule is invalid.');
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
    if (legacy) {
      for (const p of s.projects) if(p.stage==='payment' && cents(p.paid)===cents(p.price)) q.completePaid(s,p);
      if(s.history.length){const m=q.metrics(s);Object.assign(s.history.at(-1),{complete:m.complete,active:m.active,late:m.late});}
    }
    s.version=3;
    return s;
  }
  root.MEIQQValidation={restore};
  if(typeof module!=='undefined')module.exports={restore};
})(globalThis);
