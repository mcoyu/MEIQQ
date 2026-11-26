const test = require('node:test');
const assert = require('node:assert/strict');
const Studio = require('./studio.js');
const Seeds = require('./studio-seeds.js');
const View = require('./studio-view.js');

const openFirst=(studio,options)=>View.render(studio,{...options,selectedId:studio.offerings[0].id});

function costedIdea(overrides = {}) {
  const studio = Studio.fresh();
  const idea = Studio.create(studio, {
    name: 'A scoped service', buyer: 'A buyer with a specific problem', unit: 'one scoped delivery',
    price: '500', directCost: '50', overhead: '20', ownerHours: '2', ownerRate: '40',
    setupOwnerHours: '1', setupCost: '30',
    roles: [{name: 'Specialist', hours: '4', setupHours: '2', rate: '25'}], ...overrides
  });
  return {studio, idea};
}

test('blank ideas remain unknown in estimates and comparison rather than earning fictional money', () => {
  const studio = Studio.fresh();
  Studio.create(studio);
  for (const options of [{section:'numbers'}, {tab:'compare'}, {section:'numbers',phase:'repeat'}]) {
    const html = openFirst(studio, options);
    assert.match(html, /—/);
    assert.doesNotMatch(html, /\$0(?:<|\s)/);
    assert.doesNotMatch(html, /NaN|Infinity/);
  }
  assert.match(openFirst(studio, {section:'numbers'}), /Blank does not mean zero/);
});

test('first and later engagement views use model costs including owner time without double counting setup', () => {
  const {studio} = costedIdea();
  const first = openFirst(studio, {section:'numbers',phase:'first'});
  assert.match(first, /First engagement estimate/);
  assert.match(first, /Direct costs including setup<\/dt><dd>\$230/);
  assert.match(first, /Total work hours<\/dt><dd>9 h/);
  assert.match(first, /Your estimated time<\/dt><dd>3 h/);
  assert.match(first, /Your time allowance<\/dt><dd>\$120/);
  assert.match(first, /All stated costs & time allowances<\/dt><dd>\$370/);
  assert.match(first, /Left after your time & overhead<\/dt><dd>\$130/);
  assert.match(first, /Available per owner hour<\/dt><dd>\$83\.33\/h/);
  const later = openFirst(studio, {section:'numbers',phase:'repeat'});
  assert.match(later, /Direct costs<\/dt><dd>\$150/);
  assert.match(later, /Total work hours<\/dt><dd>6 h/);
  assert.match(later, /Your estimated time<\/dt><dd>2 h/);
  assert.match(later, /All stated costs & time allowances<\/dt><dd>\$250/);
  assert.match(later, /Available per owner hour<\/dt><dd>\$165\/h/);
  assert.match(later, /Another sale is not assumed/);
  assert.match(later, /reuse the same preparation/);
  assert.match(later, /do not count it again here/);
  assert.match(later, /responsibilities, not required hires/);
  assert.match(later, /Combine or remove roles to fit your plan/);
});

test('the scoped analyst example exposes total effort and owner effort without changing earnings', () => {
  const {studio} = costedIdea({
    price:'600',directCost:'20',overhead:'30',ownerHours:'3',ownerRate:'40',
    setupOwnerHours:'1',setupCost:'0',roles:[{name:'Analyst',hours:'5',setupHours:'2',rate:'30'}]
  });
  for (const [phase,totalHours,ownerHours,remainder] of [['first',11,4,180],['repeat',8,3,280]]) {
    const estimate = openFirst(studio, {section:'numbers',phase});
    assert.ok(estimate.includes(`Total work hours</dt><dd>${totalHours} h`));
    assert.ok(estimate.includes(`Your estimated time</dt><dd>${ownerHours} h`));
    assert.ok(estimate.includes(`Left after your time & overhead</dt><dd>$${remainder}`));
    const comparison = View.render(studio, {tab:'compare',phase});
    assert.match(comparison, /<th scope="col">Total work hours<\/th>/);
    assert.ok(comparison.includes(`<td>${totalHours} h<small>Your hours: ${ownerHours} h</small></td>`));
    assert.match(comparison, /sum your time and paid-role time/);
    assert.match(comparison, /do not estimate elapsed turnaround/);
  }
});

test('total work hours stay unknown when applicable role effort is missing', () => {
  const {studio,idea} = costedIdea({roles:[{name:'Analyst',hours:'',setupHours:'2',rate:'30'}]});
  for (const phase of ['first','repeat']) {
    assert.match(openFirst(studio,{section:'numbers',phase}), /Total work hours<\/dt><dd>—/);
    assert.match(View.render(studio,{tab:'compare',phase}), /<td>—<small>Your hours: [23] h<\/small><\/td>/);
  }
  Studio.setField(studio,idea.id,'roles.0.hours','5');
  Studio.setField(studio,idea.id,'roles.0.setupHours','');
  assert.match(openFirst(studio,{section:'numbers',phase:'first'}), /Total work hours<\/dt><dd>—/);
  assert.match(openFirst(studio,{section:'numbers',phase:'repeat'}), /Total work hours<\/dt><dd>7 h/);
  assert.match(View.render(studio,{tab:'compare',phase:'repeat'}), /<td>7 h<small>Your hours: 2 h<\/small><\/td>/);
});

test('unknown setup does not erase known later-engagement economics', () => {
  const {studio} = costedIdea({setupOwnerHours:'',setupCost:'',roles:[{name:'Specialist',hours:'4',setupHours:'',rate:'25'}]});
  const later = openFirst(studio, {section:'numbers',phase:'repeat'});
  assert.match(later, /Left after your time & overhead<\/dt><dd>\$250/);
  assert.doesNotMatch(later, /estimates are still unknown/);
  const first = openFirst(studio, {section:'numbers',phase:'first'});
  assert.match(first, /Left after your time & overhead<\/dt><dd>—/);
  assert.match(first, /still unknown/);
});

test('zero owner hours produce no hourly earnings claim', () => {
  const {studio} = costedIdea({ownerHours:'0',setupOwnerHours:'0'});
  for (const phase of ['first','repeat']) {
    const html = openFirst(studio, {section:'numbers',phase});
    assert.match(html, /Available per owner hour<\/dt><dd>—/);
    assert.doesNotMatch(html, /Infinity|NaN/);
    assert.match(View.render(studio, {tab:'compare',phase}), /unavailable for zero owner hours/);
  }
});

test('malformed financial drafts remain visible for correction with associated error descriptions', () => {
  const {studio,idea} = costedIdea({price:'not known'});
  const html = View.render(studio, {selectedId:idea.id,section:'numbers'});
  assert.match(html, /data-studio-field="price"[^>]*aria-describedby="[^"]+-error"[^>]*aria-invalid="true"[^>]*value="not known"/);
  assert.match(html, /studio-field-error/);
  assert.match(html, /Left after your time & overhead<\/dt><dd>—/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('all text is escaped, and only safe web URLs become source links', () => {
  const injected = '<img src=x onerror="alert(1)">';
  const {studio} = costedIdea({name:injected,buyer:injected,scope:'</textarea>'+injected,researchNotes:injected,sources:'javascript:alert(1)\nhttps://example.com/reference?q="bad"\nhttps://example.org/notes'});
  for (const options of [{section:'offer'},{section:'research'},{tab:'compare'}]) {
    const html = openFirst(studio, options);
    assert.doesNotMatch(html, /<img|<script|href="javascript:/);
    assert.match(html, /&lt;img/);
  }
  const research = openFirst(studio, {section:'research'});
  assert.match(research, /target="_blank" rel="noopener noreferrer"/);
  assert.equal(View.sourceLinks('javascript:alert(1)\ndata:text/html,evil').length, 0);
  assert.equal(View.sourceLinks(Array.from({length:20},(_,i)=>'https://example.com/'+i).join('\n')).length, 12);
});

test('stable action and field identities allow delegated editing of distinct ideas and roles', () => {
  const {studio,idea} = costedIdea();
  Studio.create(studio, {name:'Another idea'});
  const html = View.render(studio, {selectedId:idea.id,section:'numbers'});
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Every control needs a unique DOM ID');
  for (const match of html.matchAll(/<label[^>]*for="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  assert.match(html, /data-action="studio-role-remove"[^>]*data-id="idea-1"[^>]*data-index="0"/);
  assert.match(html, /data-studio-field="roles\.0\.hours" data-idea-id="idea-1"/);
  const home=View.render(studio);
  assert.match(home, /data-action="studio-select"[^>]*data-id="idea-2"/);
  assert.match(home, /data-action="studio-example"/);
  assert.doesNotMatch(home, /data-studio-field=/);
  assert.doesNotMatch(html, /data-action="studio-select"/);
  assert.doesNotMatch(html, /data-studio-field="scenarioQuantity"/);
});

test('research links retain balanced URL parentheses and ignore invalid or duplicated references when counting links',()=>{
  const address='https://example.org/wiki/Menu_(restaurant)';
  const notes=[...Array.from({length:12},(_,i)=>'https://invalid:'+('bad'+i)),
    '('+address+').',address,'HTTPS://EXAMPLE.ORG/wiki/Menu_(restaurant)','https://example.org/report'].join('\n');
  const {studio}=costedIdea({sources:notes});
  assert.deepEqual(View.sourceLinks(notes).map(link=>link.url),[address,'https://example.org/report']);
  assert.match(openFirst(studio,{section:'research'}),/href="https:\/\/example.org\/wiki\/Menu_\(restaurant\)"/);
});

test('rendering examples and comparison never changes saved planning data', () => {
  const studio = Studio.fresh();
  for (const example of Seeds.EXAMPLES) Studio.create(studio, Seeds.create(example.id));
  const before = Studio.serialize(studio);
  for (const idea of studio.offerings) {
    for (const section of ['offer','numbers','research']) {
      const html = View.render(studio, {selectedId:idea.id,section});
      assert.match(html, /Editable example/);
      assert.match(html, /id="studio-back"/);
      assert.doesNotMatch(html, /NaN|Infinity/);
    }
  }
  for (const phase of ['first','repeat']) {
    assert.match(View.render(studio, {tab:'compare',phase}), /without assuming sales volume/);
  }
  assert.equal(Studio.serialize(studio), before);
});

test('empty or stale selection keeps blank idea creation available', () => {
  assert.match(View.render(Studio.fresh()), /Start with an idea of your own/);
  assert.match(View.render(Studio.fresh()), /data-action="studio-add"/);
  const {studio} = costedIdea();
  assert.match(View.render(studio, {selectedId:'missing'}), /Your ideas/);
  assert.doesNotMatch(View.render(studio, {selectedId:'missing'}), /data-studio-field=/);
});

test('comparison preserves each idea priced unit rather than implying identical services', () => {
  const {studio} = costedIdea({unit:'one 12-item batch'});
  Studio.create(studio, {name:'A different service',unit:'one scoped review'});
  const html = View.render(studio, {tab:'compare'});
  assert.match(html, /Priced unit: one 12-item batch/);
  assert.match(html, /Priced unit: one scoped review/);
  assert.match(html, /Different scopes and evidence still matter/);
});
