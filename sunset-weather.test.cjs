const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const sceneWindow = {};
vm.compileFunction(fs.readFileSync(require.resolve('./sunset-scene.js'), 'utf8'), ['window'])(sceneWindow);
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
