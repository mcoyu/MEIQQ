const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const window={};
for(const file of ['sunset-scene.js','sky-camera.js'])vm.compileFunction(fs.readFileSync(require.resolve('./'+file),'utf8'),['window'])(window);
const make=window.SunsetScene.createSkyCamera;
const close=(a,b,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} differs from ${b}`);

test('interrupting a flight preserves the position and velocity, then settles on the same return mark',()=>{
  const cam=make('surface');cam.go('cash',true);cam.advance(.54);
  const before=cam.position;cam.advance(.0001);const atTurn=cam.position;
  cam.go('home',true);close(cam.position,atTurn);cam.advance(.0001);
  close((cam.position-atTurn)/.0001,(atTurn-before)/.0001,.01);
  cam.advance(4);assert.equal(cam.moving,false);assert.equal(cam.position,0);
  cam.go('people',false);assert.equal(cam.moving,false);assert.equal(cam.position,5);
});

test('both projection paths keep clouds and their parcels aligned throughout an interrupted flight',()=>{
  const cam=make('home');cam.go('cash',true);
  const width=390,height=844;
  for(let i=0;i<26;i++){
    cam.advance(.1);cam.aim(width,height);
    for(const depth of [2.56,4.9]){
      const m=cam.plane(depth),[left,right]=cam.coverage(depth);
      for(const x of [-.9,0,.38,.85,1.45,2]){
        const y=.27,px=x*width,py=y*height,w=m[2]*px+m[5]*py+m[8];
        const [sx,sy]=cam.project(x,y,depth);
        close(sx,width*.5*(1+(m[0]*px+m[3]*py+m[6])/w));
        close(sy,height*.5*(1-(m[1]*px+m[4]*py+m[7])/w));
        if(sx>=0&&sx<=width&&sy>=0&&sy<=height){
          assert.ok(x>=left&&x<=right);const [wx,wy]=cam.unproject(sx/width,sy/height,depth);
          close(wx,x);close(wy,y);
        }
      }
    }
  }
});

test('the default moon remains in the reading space above the editor on phones and desktops',()=>{
  for(const [w,h] of [[320,568],[390,844],[1316,1397],[1920,1080]]){
    const cam=make('home');cam.aim(w,h);const homeMoon=cam.project(.49,.44);
    cam.go('surface',false);cam.aim(w,h);assert.notDeepEqual(cam.project(.49,.44),homeMoon);
    for(const stage of ['offers','demand','people','cash']){
      cam.go(stage,false);cam.aim(w,h);const [x,y]=cam.project(.49,.44);
      assert.ok(x>w*.15&&x<w*.85&&y>h*.07&&y<h*.22,`${stage}: ${x/w}, ${y/h}`);
    }
  }
});

test('descending through a bank gives near cloud edges parallax and keeps Canvas and GL on the same path',()=>{
  for(const [w,h] of [[390,844],[1280,840]]){
    const cam=make('home'),x=.36,y=.72,depth=3.15;
    const span=z=>Math.hypot(...cam.project(x+.04,y,z).slice(0,2).map((v,i)=>v-cam.project(x,y,z)[i]));
    cam.aim(w,h);
    const near=span(depth),far=span(Infinity),home=cam.project(x,y,depth);
    cam.aim(w,h,{x,y,depth,approach:.85,drop:.07,bank:.75});
    assert.ok(span(depth)/near>1.9);
    assert.ok(span(Infinity)/far<1.12);
    const m=cam.plane(depth),z=m[2]*x*w+m[5]*y*h+m[8],[sx,sy]=cam.project(x,y,depth);
    close(w*.5*(1+(m[0]*x*w+m[3]*y*h+m[6])/z),sx);
    close(h*.5*(1-(m[1]*x*w+m[4]*y*h+m[7])/z),sy);
    cam.aim(w,h,{x,y,depth,approach:1,drop:1,bank:0});
    assert.ok(cam.project(x,y,depth)[1]<h*.3);
    cam.aim(w,h);
    assert.deepEqual(cam.project(x,y,depth),home);
  }
});

test('run and review destinations have distinct moonlit framings and direct jumps settle on the requested view',()=>{
  const cam=make('cash'),moon=()=>cam.project(.49,.44),views=new Set();
  for(const route of ['map','finances','projects','scenarios','about']){
    cam.go(route,false);cam.aim(1280,820);
    const [x,y]=moon();assert.ok(x>0&&x<1280&&y>0&&y<820);
    views.add(Math.round(x)+','+Math.round(y));
  }
  assert.equal(views.size,5);
  cam.go('home',true);cam.advance(.34);cam.aim(1280,820);const before=moon();
  cam.go('finances',true);cam.aim(1280,820);assert.deepEqual(moon(),before);
  cam.advance(3);cam.aim(1280,820);
  const direct=make('finances');direct.aim(1280,820);
  assert.deepEqual(moon(),direct.project(.49,.44));
});
