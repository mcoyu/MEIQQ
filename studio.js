/* Independent, local Studio ideas. No simulation state or business transactions. */
(function(root) {
  'use strict';

  const VERSION = 1;
  const FORMAT = 'meiqq-studio';
  const STORAGE_KEY = 'meiqq-studio-v1';
  const MAX_BYTES = 8 * 1024 * 1024;
  const MAX_OFFERINGS = 500;
  const MAX_ROLES = 30;
  const STATUSES = ['idea', 'research', 'ready'];
  const TEXT_FIELDS = ['name', 'family', 'buyer', 'problem', 'scope', 'deliverables', 'inputs', 'handoffs', 'acceptance', 'researchNotes', 'sources', 'nextAction', 'unit'];
  const NUMBER_FIELDS = ['price', 'directCost', 'overhead', 'ownerHours', 'ownerRate', 'setupOwnerHours', 'setupCost', 'scenarioQuantity'];
  const ROLE_FIELDS = ['id', 'name', 'hours', 'setupHours', 'rate'];
  const OFFERING_FIELDS = ['id', 'version', 'status', 'origin', 'roles', ...TEXT_FIELDS, ...NUMBER_FIELDS];
  const EDITABLE_FIELDS = ['status', 'origin', 'roles', ...TEXT_FIELDS, ...NUMBER_FIELDS];
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const textLimit = key => NUMBER_FIELDS.includes(key) ? 80 : ['name', 'family', 'unit'].includes(key) ? 300 : 10000;

  // Local numeric IDs can coincide across separately imported workspaces.
  function newLinkKey() {
    const words = new Uint32Array(4);
    if (root.crypto?.getRandomValues) root.crypto.getRandomValues(words);
    else for (let i = 0; i < words.length; i++) words[i] = Math.floor(Math.random() * 0x100000000);
    return Array.from(words, word => word.toString(16).padStart(8, '0')).join('');
  }
  function linkKey(value) {
    if (typeof value !== 'string' || !/^[0-9a-f]{32}$/.test(value)) throw Error('Studio link identity is invalid.');
    return value;
  }

  function keys(value, allowed, label, required = allowed) {
    if (!object(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !own(value, key))) {
      throw Error(label + ' has an unsupported structure.');
    }
  }
  function text(value, max, label) {
    if (typeof value !== 'string' || value.length > max) throw Error(label + ' must be text of at most ' + max + ' characters.');
    return value;
  }
  function draftText(value, max, label) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
    return text(value, max, label);
  }
  function ordinal(id, prefix) {
    if (typeof id !== 'string' || !new RegExp('^' + prefix + '-[1-9]\\d*$').test(id)) return null;
    const number = Number(id.slice(prefix.length + 1));
    return Number.isSafeInteger(number) && number < Number.MAX_SAFE_INTEGER ? number : null;
  }
  function origin(value) {
    if (value === undefined) return {kind:'blank', ref:'', label:''};
    keys(value, ['kind', 'ref', 'label'], 'Idea origin');
    if (!['blank', 'example', 'catalog'].includes(value.kind)) throw Error('Idea origin is unsupported.');
    return {kind:value.kind, ref:text(value.ref, 500, 'Origin reference'), label:text(value.label, 1000, 'Origin label')};
  }
  function roles(value, drafting) {
    if (!Array.isArray(value) || value.length > MAX_ROLES) throw Error('An idea must have at most ' + MAX_ROLES + ' effort roles.');
    const used = new Set();
    for (const role of value) {
      if (!object(role)) throw Error('Effort role is malformed.');
      if (own(role, 'id')) {
        if (ordinal(role.id, 'role') === null || used.has(role.id)) throw Error('Effort role IDs must be valid and unique.');
        used.add(role.id);
      } else if (!drafting) throw Error('Effort role ID is missing.');
    }
    let next = 1;
    return value.map(role => {
      keys(role, ROLE_FIELDS, 'Effort role', drafting ? [] : ROLE_FIELDS);
      let id = role.id;
      if (id === undefined) {
        while (used.has('role-' + next)) next++;
        id = 'role-' + next++;
        used.add(id);
      }
      const result = {id};
      for (const key of ROLE_FIELDS.filter(key => key !== 'id')) {
        const limit = key === 'name' ? 300 : 80;
        result[key] = drafting ? draftText(role[key], limit, 'Role ' + key) : text(role[key], limit, 'Role ' + key);
      }
      return result;
    });
  }
  function offering(input, id, version, drafting) {
    keys(input, drafting ? EDITABLE_FIELDS : [...OFFERING_FIELDS, 'linkKey'], 'Studio idea', drafting ? [] : OFFERING_FIELDS);
    const result = {id, version, status:input.status === undefined ? 'idea' : input.status};
    if (!STATUSES.includes(result.status)) throw Error('Choose Idea, Researching or Ready to test.');
    for (const key of TEXT_FIELDS) result[key] = drafting ? draftText(input[key], textLimit(key), key) : text(input[key], textLimit(key), key);
    for (const key of NUMBER_FIELDS) result[key] = drafting ? draftText(input[key], textLimit(key), key) : text(input[key], textLimit(key), key);
    result.origin = origin(input.origin);
    result.roles = roles(input.roles === undefined && drafting ? [{name:'Delivery role', hours:'', setupHours:'', rate:''}] : input.roles, drafting);
    if (own(input, 'linkKey')) result.linkKey = linkKey(input.linkKey);
    return result;
  }

  function fresh(name = 'My Studio') {
    return {version:VERSION, name:text(name, 300, 'Studio name'), nextId:1, offerings:[]};
  }
  function validate(value) {
    keys(value, ['version', 'name', 'nextId', 'offerings'], 'Studio');
    if (value.version !== VERSION) throw Error('Unsupported Studio version.');
    text(value.name, 300, 'Studio name');
    if (!Number.isSafeInteger(value.nextId) || value.nextId < 1 || value.nextId >= Number.MAX_SAFE_INTEGER) throw Error('Studio next ID is invalid.');
    if (!Array.isArray(value.offerings) || value.offerings.length > MAX_OFFERINGS) throw Error('Studio has too many ideas.');
    const ids = new Set(), links = new Set();
    const normalized = value.offerings.map(item => {
      if (!object(item)) throw Error('Studio idea is malformed.');
      const number = ordinal(item.id, 'idea');
      if (number === null || number >= value.nextId || ids.has(item.id)) throw Error('Studio idea IDs must be valid, unique and below the next ID.');
      if (!Number.isSafeInteger(item.version) || item.version < 1 || item.version >= Number.MAX_SAFE_INTEGER) throw Error('Idea version is invalid.');
      ids.add(item.id);
      if (item.linkKey && links.has(item.linkKey)) throw Error('Studio idea links must be unique.');
      if (item.linkKey) links.add(item.linkKey);
      return offering(item, item.id, item.version, false);
    });
    return {version:VERSION, name:value.name, nextId:value.nextId, offerings:normalized};
  }
  function find(studio, id) {
    const result = studio.offerings.find(item => item.id === id);
    if (!result) throw Error('Studio idea not found.');
    return result;
  }
  function create(studio, draft = {}) {
    validate(studio);
    if (studio.offerings.length >= MAX_OFFERINGS) throw Error('Studio has reached its idea limit.');
    if (studio.nextId >= Number.MAX_SAFE_INTEGER - 1) throw Error('Studio has exhausted its idea IDs.');
    const result = offering(draft, 'idea-' + studio.nextId, 1, true);
    result.linkKey = newLinkKey();
    studio.offerings.push(result);
    studio.nextId++;
    return result;
  }
  function update(studio, id, patch) {
    keys(patch, EDITABLE_FIELDS, 'Idea changes', []);
    const current = find(studio, id);
    const editable = Object.fromEntries(EDITABLE_FIELDS.map(key => [key, own(patch, key) ? patch[key] : current[key]]));
    const next = offering(editable, current.id, current.version, true);
    if (current.linkKey) next.linkKey = current.linkKey;
    if (JSON.stringify(next) === JSON.stringify(current)) return current;
    if (current.version >= Number.MAX_SAFE_INTEGER - 1) throw Error('Idea has exhausted its versions.');
    next.version++;
    studio.offerings[studio.offerings.indexOf(current)] = next;
    return next;
  }
  function setField(studio, id, path, value) {
    if (TEXT_FIELDS.includes(path) || NUMBER_FIELDS.includes(path) || path === 'status') return update(studio, id, {[path]:value});
    const match = /^roles\.(\d+)\.(name|hours|setupHours|rate)$/.exec(path);
    if (!match) throw Error('This Studio field cannot be edited.');
    const current = find(studio, id), index = Number(match[1]);
    if (!Number.isSafeInteger(index) || !current.roles[index]) throw Error('Effort role not found.');
    const next = current.roles.map(role => ({...role}));
    next[index][match[2]] = value;
    return update(studio, id, {roles:next});
  }
  function duplicate(studio, id) {
    const current = find(studio, id);
    const draft = Object.fromEntries(EDITABLE_FIELDS.map(key => [key, clone(current[key])]));
    draft.name = (current.name || 'Untitled idea').slice(0, 291) + ' (copy)';
    draft.status = 'idea';
    return create(studio, draft);
  }
  function remove(studio, id) {
    const index = studio.offerings.findIndex(item => item.id === id);
    if (index < 0) return false;
    studio.offerings.splice(index, 1);
    return true;
  }
  function linkIdea(studio, id) {
    const idea = find(studio, id);
    if (!idea.linkKey) {
      const linked = {...idea, linkKey:newLinkKey()};
      serialize({...studio, offerings:studio.offerings.map(item => item === idea ? linked : item)});
      idea.linkKey = linked.linkKey;
    }
    return idea;
  }
  function merge(studio, incoming) {
    const next = validate(studio), links = new Set(next.offerings.map(idea => idea.linkKey));
    for (const {id, version, linkKey, ...draft} of validate(incoming).offerings) {
      const copy = create(next, draft);
      if (linkKey && !links.has(linkKey)) {
        copy.linkKey = linkKey;
        copy.version = version;
      }
      links.add(copy.linkKey);
    }
    serialize(next);
    return next;
  }
  function rename(studio, name) {
    studio.name = text(name, 300, 'Studio name');
    return studio;
  }

  function parseNumber(raw, max, integer = false) {
    const source = typeof raw === 'string' ? raw.trim() : '';
    if (!source) return {value:null, scaled:null, kind:'unknown', message:'Not estimated yet.'};
    const pattern = integer ? /^\d+$/ : /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
    if (!pattern.test(source)) return {value:null, scaled:null, kind:'invalid', message:integer ? 'Enter a whole number of zero or more.' : 'Use a nonnegative number with up to two decimals.'};
    const number = Number(source);
    if (!Number.isFinite(number) || number > max) return {value:null, scaled:null, kind:'invalid', message:'Use a value no greater than ' + max + '.'};
    const [whole = '', fraction = ''] = source.split('.');
    const scaled = Number(whole || 0) * 100 + Number((fraction + '00').slice(0, 2));
    return {value:scaled / 100, scaled, kind:'valid', message:''};
  }
  function economics(idea) {
    const fields = {}, issues = [];
    const read = (path, raw, max = 1000000, integer = false, optional = false) => {
      const result = parseNumber(raw, max, integer);
      fields[path] = result;
      if (result.kind !== 'valid' && !(optional && result.kind === 'unknown')) issues.push({path, kind:result.kind, message:result.message});
      return result.scaled;
    };
    for (const key of NUMBER_FIELDS) read(key, idea[key], key.endsWith('Hours') ? 1000 : key.endsWith('Rate') ? 100000 : 1000000, key === 'scenarioQuantity', key === 'scenarioQuantity');
    const sum = values => values.some(value => value === null) ? null : values.reduce((total, value) => total + value, 0);
    const mul = (hours, rate) => hours === null || rate === null ? null : Math.round(hours * rate / 100);
    const minus = (...values) => values.some(value => value === null) ? null : values.slice(1).reduce((total, value) => total - value, values[0]);
    const value = path => fields[path].scaled;
    const labor = [], setupLabor = [], roleTime = [], setupRoleTime = [];
    for (const [index, role] of idea.roles.entries()) {
      const prefix = 'roles.' + index + '.';
      const hours = read(prefix + 'hours', role.hours, 1000);
      const setupHours = read(prefix + 'setupHours', role.setupHours, 1000);
      const rate = read(prefix + 'rate', role.rate, 100000);
      labor.push(mul(hours, rate));
      setupLabor.push(mul(setupHours, rate));
      roleTime.push(hours);
      setupRoleTime.push(setupHours);
    }
    const price = value('price'), laborCost = sum(labor), directCost = value('directCost');
    const directCosts = sum([laborCost, directCost]);
    const ownerAllowance = mul(value('ownerHours'), value('ownerRate'));
    const overhead = value('overhead');
    const repeatTotalCost = sum([directCosts, ownerAllowance, overhead]);
    const afterDirect = minus(price, directCosts), afterOwner = minus(price, repeatTotalCost);
    const setupLaborCost = sum(setupLabor), setupDirectCost = value('setupCost');
    const setupCosts = sum([setupLaborCost, setupDirectCost]);
    const setupOwnerAllowance = mul(value('setupOwnerHours'), value('ownerRate'));
    const setupTotal = sum([setupCosts, setupOwnerAllowance]);
    const firstDirectCosts = sum([directCosts, setupCosts]);
    const firstTotalCost = sum([repeatTotalCost, setupTotal]);
    const firstDelivery = minus(price, firstTotalCost);
    const hours = scaled => scaled === null ? null : scaled / 100;
    const roleHours = sum(roleTime), setupRoleHours = sum(setupRoleTime);
    const deliveryHours = sum([roleHours, value('ownerHours')]);
    const setupHours = sum([setupRoleHours, value('setupOwnerHours')]);
    const firstOwnerHoursScaled = sum([value('ownerHours'), value('setupOwnerHours')]);
    const repeatOwnerReturn = minus(price, directCosts, overhead);
    const firstOwnerReturn = minus(price, firstDirectCosts, overhead);
    const hourly = (amount, scaledHours) => amount === null || scaledHours === null || scaledHours <= 0 ? null : Math.round(amount * 100 / scaledHours);
    const quantity = fields.scenarioQuantity.value;
    const projected = quantity === null || afterOwner === null || setupTotal === null ? null : afterOwner * quantity - setupTotal;
    const scenarioResult = projected !== null && Number.isSafeInteger(projected) ? projected : null;
    if (projected !== null && scenarioResult === null) issues.push({path:'scenarioQuantity', kind:'invalid', message:'This combination is too large to calculate safely.'});
    return {price, laborCost, directCost, directCosts, ownerAllowance, overhead, repeatTotalCost, afterDirect, afterOwner,
      setupLaborCost, setupDirectCost, setupCosts, setupOwnerAllowance, setupTotal, firstDirectCosts, firstTotalCost, firstDelivery,
      roleHours:hours(roleHours), setupRoleHours:hours(setupRoleHours), ownerHours:fields.ownerHours.value,
      setupOwnerHours:fields.setupOwnerHours.value, firstOwnerHours:hours(firstOwnerHoursScaled),
      repeatOwnerReturn, firstOwnerReturn, repeatOwnerHourly:hourly(repeatOwnerReturn, value('ownerHours')), firstOwnerHourly:hourly(firstOwnerReturn, firstOwnerHoursScaled),
      deliveryHours:hours(deliveryHours), setupHours:hours(setupHours), firstHours:hours(sum([deliveryHours, setupHours])),
      scenarioQuantity:quantity, scenarioResult, fields, issues,
      validity:{repeat:afterOwner !== null, setup:setupTotal !== null, first:firstDelivery !== null, scenario:scenarioResult !== null}};
  }

  function checkSize(text) {
    if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw Error('Studio backup exceeds the 8 MiB limit.');
  }
  function serialize(studio) {
    const result = JSON.stringify({format:FORMAT, version:VERSION, studio:validate(studio)});
    checkSize(result);
    return result;
  }
  function parse(data) {
    keys(data, ['format', 'version', 'studio'], 'Studio backup');
    if (data.format !== FORMAT || data.version !== VERSION) throw Error('Choose a supported Studio ideas backup, not a Simulator workspace.');
    return validate(data.studio);
  }
  function parseText(raw) {
    if (typeof raw !== 'string') throw Error('Studio backup must be JSON text.');
    checkSize(raw);
    let data;
    try { data = JSON.parse(raw); } catch (error) { throw Error('Studio backup is not valid JSON.'); }
    return parse(data);
  }

  const api = {VERSION, FORMAT, STORAGE_KEY, MAX_BYTES, MAX_OFFERINGS, MAX_ROLES, STATUSES:Object.freeze([...STATUSES]),
    TEXT_FIELDS:Object.freeze([...TEXT_FIELDS]), NUMBER_FIELDS:Object.freeze([...NUMBER_FIELDS]),
    fresh, create, update, setField, duplicate, remove, rename, validate, economics, serialize, parse, parseText,
    linkIdea, linkKey, newLinkKey, merge};
  root.QQStudio = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
