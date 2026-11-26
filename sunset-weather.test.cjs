const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const sceneWindow = {};
vm.compileFunction(fs.readFileSync(require.resolve('./sunset-scene.js'), 'utf8'), ['window'])(sceneWindow);
vm.compileFunction(fs.readFileSync(require.resolve('./shard-flight.js'), 'utf8'), ['window'])(sceneWindow);
const {banks, bankCenters, types, createWeather, createMeteors, cols, rows} = sceneWindow.SunsetScene;
const fingerprint = data => createHash('sha256').update(data).digest('hex');
const water = weather => weather.texture.reduce((sum, value, index) => index%4 === 0 ? sum+value : sum, 0);

test('each cloud genus supplies its own moisture field and live copper parcels', () => {
  const weather = createWeather(banks[0]);
  const forms = new Set();
  for (const name of Object.keys(types)) {
    weather.configure(name, 55, true);
    assert.equal(weather.texture.length, cols*rows*4);
    assert.ok(weather.count>0 && weather.count*10<=weather.stream.length);
    assert.ok(weather.stream.subarray(0,weather.count*10).every(Number.isFinite));
    forms.add(fingerprint(weather.texture));
  }
  assert.equal(forms.size, 10);
});

test('wind carries shards while dry air dissipates condensed water', () => {
  const weather = createWeather(banks[1]);
  const initialMass = water(weather);
  const initialPositions = fingerprint(weather.stream);
  weather.advance(.15);
  assert.notEqual(fingerprint(weather.stream), initialPositions);
  weather.configure('auto', 0);
  assert.equal(water(weather), initialMass);
  for(let i=0;i<80;i++) weather.advance(.24);
  assert.ok(water(weather) < initialMass*.05);
  weather.configure('cirrus', 72, true);
  assert.ok(water(weather)>initialMass);
});

test('an automatic bank blends into the next genus and a pinned bank retains its profile', () => {
  const bank=banks[0], weather=createWeather(bank), period=54+bank.seed%13;
  const initial=weather.profile.lift;
  for(let t=0;t<period*.85;t+=.24)weather.advance(.24);
  assert.ok(weather.profile.lift>initial && weather.profile.lift<types.cumulonimbus.lift);
  weather.configure('stratus',55);
  for(let i=0;i<8;i++)weather.advance(.24);
  assert.equal(weather.profile.shear, types.stratus.shear);
});

test('cloud banks travel downwind and re-enter continuously at desktop and portrait widths', () => {
  for(const bank of banks){
    const anchor=.17;
    assert.ok(bankCenters(bank,anchor,bank.width,10)[0]-anchor>=.095);
    for(const span of [bank.width,bank.width*2.4]){
      const period=Math.max(1.36,span+.18);
      for(let t=0;t<210;t+=.31){
        const unwrapped=anchor+t*bank.drift;
        const expected=[-4,-3,-2,-1,0,1].map(n=>unwrapped+n*period)
          .filter(x=>x+span/2>0 && x-span/2<1);
        const visible=bankCenters(bank,anchor,span,t);
        assert.equal(visible.length,expected.length);
        visible.forEach((x,i)=>assert.ok(Math.abs(x-expected[i])<1e-9));
      }
    }
  }
});

test('a front opens a clear channel, and visible copper travels from cloud to gap to a new cloud', () => {
  const weather=createWeather(banks[0]);
  const initial=weather.texture.slice();
  const tracks=new Map(), arrived=new Set();
  for(let tick=0;tick<80;tick++){
    if(tick)weather.advance(.24);
    const {stream,texture}=weather;
    if(tick===35){
      let cleared=0,formed=0,widestGap=0;
      for(let j=0;j<rows;j++){
        let gap=0,seenCloud=false;
        for(let i=0;i<cols;i++){
          const k=(j*cols+i)*4, q=texture[k];
          if(initial[k]>100 && q<10)cleared++;
          if(initial[k]<10 && q>75)formed++;
          if(q>75){if(seenCloud)widestGap=Math.max(widestGap,gap);seenCloud=true;gap=0;}
          else if(q<10 && seenCloud)gap++;
        }
      }
      assert.ok(cleared>250 && formed>100,'new clear air and new billows within a single bank');
      assert.ok(widestGap>cols*.12,'an opening with a cloud on both sides');
    }
    for(let i=0;i<weather.count;i++){
      const k=i*10, x=stream[k],y=stream[k+1],id=stream[k+8];
      if(id<=.84)continue;
      const q=texture[4*(Math.round(y*(rows-1))*cols+Math.round(x*(cols-1)))];
      let track=tracks.get(id);
      if(!track||track.tick!==tick-1||Math.hypot(x-track.x,y-track.y)>.075){
        track={wasBound:false,releaseX:null};tracks.set(id,track);
      }
      if(q>95 && stream[k+7]>.40){
        if(track.releaseX!==null && x>track.releaseX+.065)arrived.add(id);
        track.wasBound=true;
      }else if(track.wasBound && track.releaseX===null && q<12 && stream[k+3]>.0017){
        track.releaseX=x;
      }
      Object.assign(track,{x,y,tick});
    }
  }
  assert.ok(arrived.size>=12,'the same distinct, continuously visible shards reach a different cloud downstream');
});

test('meteors cross the sky, burn out, and restart without replaying a paused event', () => {
  const meteors=createMeteors();
  let event=null;
  for(let i=0;i<50&&!event;i++) event=meteors.advance(.1,55);
  assert.ok(event && Math.hypot(event.dx,event.dy)>.2);
  const life=event.life;
  assert.equal(meteors.advance(0,55).age,0);
  assert.equal(meteors.advance(life+.01,55),null);
  assert.equal(meteors.advance(.1,55),null);
  meteors.clear();
  assert.equal(meteors.advance(4,0),null);
  assert.equal(meteors.advance(.2,100),null);
});

test('the same three shards leave one bank, cross clear sky and enter a different bank on desktop and phone', () => {
  const {createShardFlights,cloudViews,defaults}=sceneWindow.SunsetScene;
  for(const aspect of [1.6,390/844]){
    const state=structuredClone(defaults), weather=banks.map(createWeather), flights=createShardFlights(weather);
    const airborne=new Set(), landed=new Set();
    for(let i=0;i<55;i++){
      for(const bank of weather)bank.advance(.24);
      const views=cloudViews(state,weather,aspect);
      flights.advance(.24,views,aspect);
      for(const s of flights.shards){
        assert.notEqual(s.from.index,s.to.index);
        const p=s.ticket.parcel, oldAge=s.age;
        if(s.focus>.9&&views.every(v=>{
          const x=.5+(s.x-v.cx)/v.sx,y=.5+(s.y-v.cy)/v.sy;
          return x<0||x>1||y<0||y>1||weather[v.index].densityAt(x,y)<.08;
        }))airborne.add(p);
        if(s.landed && airborne.has(p)){
          assert.ok(!p.inFlight);
          const bank=weather[s.to.index];
          if(bank.stream.subarray(0,bank.count*10).some((v,k)=>k%10===8&&v===Math.fround(p.seed)))landed.add(p);
        }
        flights.advance(0,views,aspect);
        assert.equal(s.age,oldAge);
      }
    }
    assert.equal(landed.size,3);
  }
});

test('a paused edit moves bound copper with its bank while an airborne shard holds its world position', () => {
  const {createShardFlights,cloudViews,defaults}=sceneWindow.SunsetScene;
  const state=structuredClone(defaults), weather=banks.map(createWeather), flights=createShardFlights(weather);
  let s,waiting;
  for(let tick=0;tick<150&&!s;tick++){
    weather.forEach(w=>w.advance(.04));
    flights.advance(.04,cloudViews(state,weather,1.6),1.6);
    s=flights.shards.find(s=>!s.attached);waiting=flights.shards.find(s=>s.attached);
  }
  assert.ok(s&&waiting,'a gust releases leaves at different times');
  const initial=waiting.x, x=s.x, age=s.age, stress=waiting.stress, source=state[banks[s.from.index].id];
  source.x+=8;
  flights.advance(0,cloudViews(state,weather,1.6),1.6);
  assert.equal(s.x,x);assert.ok(waiting.x>initial+.07);assert.equal(s.age,age);assert.equal(waiting.stress,stress);
  source.visible=false;flights.advance(0,cloudViews(state,weather,1.6),1.6);
  assert.equal(flights.shards.length,0);assert.equal(s.ticket.parcel.inFlight,false);
  assert.equal(waiting.ticket.parcel.reserved,false);
});

test('a gust winds neighbouring leaves around a common centre, thins the neck and carries a wisp downwind',()=>{
  const bank=createWeather(banks[0]),calm=createWeather(banks[0]),dt=.04;
  const g=bank.startGust(.62,.72,.10,.17);
  function position(along,across){
    return [g.x+g.rx*(along*g.tx-across*g.ty),g.y+g.ry*(along*g.ty+across*g.tx)];
  }
  function densityChange(lo,hi){
    let sum=0,count=0;
    for(let a=lo;a<hi;a+=.1)for(let b=-.45;b<.5;b+=.1){
      const p=position(a,b);sum+=bank.densityAt(...p)-calm.densityAt(...p);count++;
    }
    return sum/count;
  }
  function turnAt(along){
    const p=position(along,0),a=bank.windAt(...p),b=calm.windAt(...p);
    return ((a[1]-b[1])/g.ry*g.tx-(a[0]-b[0])/g.rx*g.ty)*g.sign;
  }
  let oppositeTurns=false,separated=false;
  for(let tick=0;tick<250;tick++){
    bank.advance(dt);calm.advance(dt);
    if(bank.time<=g.build)oppositeTurns||=turnAt(.55)>.08&&turnAt(-.55)<-.08;
    if(bank.time>g.build)separated||=densityChange(-.25,.38)<-.08&&densityChange(.75,1.5)>.04;
  }
  assert.ok(oppositeTurns,'the sides of one billow turn together before the gust strips its rim');
  assert.ok(separated,'the neck thins while the downwind lobe gains visible density');
  assert.equal(bank.gustAt(g.x,g.y),0,'the local gust subsides');
});

test('a leaf remains in the visible cloud until it peels with the velocity and rotation of that same parcel',()=>{
  const {createShardFlights,cloudViews,defaults}=sceneWindow.SunsetScene;
  const weather=banks.map(createWeather), flights=createShardFlights(weather),dt=1/30,aspect=1.6;
  const seen=new Set(),departures=[];
  for(let tick=0;tick<180&&departures.length<3;tick++){
    weather.forEach(w=>w.advance(dt));
    const views=cloudViews(defaults,weather,aspect);flights.advance(dt,views,aspect);
    for(const s of flights.shards){
      const p=s.ticket.parcel,bank=weather[s.from.index];
      if(s.attached && bank.time-s.gust.start<s.gust.build){
        const visible=bank.stream.subarray(0,bank.count*10).some((n,k)=>k%10===8&&n===Math.fround(p.seed));
        if(visible&&p.reserved&&!p.inFlight)seen.add(p);
      }
      if(s.attached||s.age!==0)continue;
      assert.ok(seen.has(p)&&!p.reserved&&p.inFlight);
      const v=views.find(v=>v.index===s.from.index&&v.copy===s.from.copy);
      assert.equal(s.x,v.cx+(p.x-.5)*v.sx);assert.equal(s.y,v.cy+(p.y-.5)*v.sy);
      assert.equal(s.vx,banks[v.index].drift+p.dx*v.sx);
      assert.equal(s.vy,.023*.092*Math.cos(bank.time*.092+banks[v.index].seed*.31)+p.dy*v.sy);
      assert.equal(s.roll,p.roll);assert.equal(s.spin,p.spin);
      assert.ok(bank.time-s.gust.start>s.gust.build);
      departures.push(bank.time);
    }
  }
  assert.equal(departures.length,3);assert.ok(departures[2]-departures[0]>.65);
});

test('a close shard carries momentum into the gap and returns continuously to cloud depth', () => {
  const {createShardFlights,cloudViews,defaults}=sceneWindow.SunsetScene;
  const weather=banks.map(createWeather), flights=createShardFlights(weather), dt=1/25;
  let lead=null, previous=null, peak=0, rotation=0, contact=false;
  for(let i=0;i<270 && !contact;i++){
    weather.forEach(w=>w.advance(dt));
    flights.advance(dt,cloudViews(defaults,weather,1.6),1.6);
    lead??=flights.shards[0];
    if(!lead)continue;
    if(previous){
      const distance=Math.hypot((lead.x-previous.x)*1.6,lead.y-previous.y);
      assert.ok(distance<dt*.48,'no jump on release or handoff');
      const angle=Math.abs(lead.roll-previous.roll);
      assert.ok(angle<dt*4.4,'no instantaneous angular flip');
      rotation+=angle;
    }
    peak=Math.max(peak,lead.near);
    if(lead.landed){
      assert.ok(lead.near<.30,'the shard reaches the depth of the receiving bank');
      contact=true;
    }
    previous={x:lead.x,y:lead.y,roll:lead.roll};
  }
  assert.ok(contact && peak>.61 && rotation>Math.PI);
});

test('flakes in the lower bank curve and turn without snapping at a weather update',()=>{
  const w=createWeather(banks[2]),dt=1/30,tracks=new Map();
  let longestTurn=0,banking=0,checks=0;
  for(let tick=0;tick<130;tick++){
    w.advance(dt);
    for(let i=0;i<w.count;i++){
      const k=i*10,stream=w.stream;
      if(stream[k+7]<.18||stream[k+9]<.55)continue;
      const id=stream[k+8],x=stream[k],y=stream[k+1],heading=stream[k+4],roll=stream[k+5];
      let t=tracks.get(id);
      if(!t||t.tick!==tick-1)t={firstRoll:roll,firstHeading:heading,samples:0};
      else{
        const dx=(x-t.x)/dt,dy=(y-t.y)/dt;
        assert.ok(Math.abs(heading-t.heading)<3*dt,'bounded yaw through flow reversals');
        assert.ok(Math.abs(roll-t.roll)<4*dt,'continuous face rotation');
        if(t.samples>1)assert.ok(Math.hypot(dx-t.dx,dy-t.dy)<.75*dt,'no velocity step as a fresh wind field arrives');
        t.dx=dx;t.dy=dy;
        longestTurn=Math.max(longestTurn,Math.abs(roll-t.firstRoll));
        if(t.samples>60&&Math.abs(heading-t.firstHeading)>.45)banking++;
        checks++;
      }
      Object.assign(t,{x,y,roll,heading,tick,samples:t.samples+1});tracks.set(id,t);
    }
  }
  assert.ok(checks>1000&&longestTurn>Math.PI&&banking>100,'visible flakes roll and bank through sustained turns');
  const before=w.stream.slice(0,w.count*10),phase=w.blend;
  w.advance(0);assert.equal(w.blend,phase);assert.deepEqual(w.stream.subarray(0,w.count*10),before);
});

test('cloud shading has a continuous interpolation interval between staggered weather solves',()=>{
  const all=banks.map(createWeather),versions=all.map(w=>w.version);
  for(const w of all)w.advance(.09);
  assert.deepEqual(all.map((w,i)=>w.version-versions[i]),[0,0,1]);
  const low=all[2],phase=low.blend,frame=low.version;
  low.advance(.04);assert.equal(low.version,frame);assert.ok(low.blend>phase&&low.blend<1);
  const epoch=low.epoch;low.configure('cirrus',60,true);
  assert.ok(low.epoch>epoch,'an editor change invalidates the previous optical frame');
});
