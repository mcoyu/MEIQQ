const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

function environment(){
  let pixels;
  const host={style:{},hasAttribute:()=>false,getAttribute:()=> 'home'};
  const document={documentElement:{dataset:{uiMotion:'on'}},querySelector:()=>host,addEventListener(){},
    createElement:()=>({getContext:()=>({
      createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
      putImageData:image=>{pixels=image.data;}
    })})};
  const window={},context={window,document,MutationObserver:class {observe(){}},
    matchMedia:()=>({addEventListener(){}})};
  for(const file of ['studio-flight.js','sunset-scene.js','lunar-sky.js']){
    vm.runInNewContext(fs.readFileSync(require.resolve('./'+file),'utf8'),context);
  }
  return {host,lunar:window.SunsetScene.lunar,flight:window.StudioFlight,pixels:()=>pixels};
}

test('one textured disc waxes on the right, fills, and wanes on the left',()=>{
  const {lunar,pixels}=environment();
  const light=turn=>{
    lunar.world=lunar.createClock(turn).sample(0,'night',0);
    const canvas=lunar.sprite(),data=pixels(),sides=[0,0];
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const k=4*(y*canvas.width+x);
      sides[Number(x>=canvas.width/2)]+=data[k]*data[k+3]/255;
    }
    return sides;
  };
  const [dark]=light(0),[firstLeft,firstRight]=light(.25);
  const [fullLeft,fullRight]=light(.5),[lastLeft,lastRight]=light(.75);
  assert.ok(firstRight>firstLeft*3&&lastLeft>lastRight*3);
  assert.ok(fullLeft>dark*4&&fullRight>dark*4);
  assert.deepEqual(light(1),light(0));
});

test('both renderers sample the same instant and hidden or paused time does not advance the moon',()=>{
  const {lunar,host}=environment();
  lunar.tick(100,true,host);
  lunar.tick(200,true,host);const phase=lunar.world.turn;
  lunar.tick(200,true,host);assert.equal(lunar.world.turn,phase);
  lunar.suspend();lunar.tick(10000,true,host);assert.equal(lunar.world.turn,phase);
  lunar.tick(10200,false,host);lunar.tick(11200,false,host);
  assert.equal(lunar.world.turn,phase);
  lunar.tick(11300,true,host);lunar.tick(11400,true,host);
  assert.ok(Math.abs((lunar.world.turn-phase+1)%1-.1/1920)<1e-9);
});

test('twilight moves the moon in an arc and a reversed descent retains its velocity',()=>{
  const {lunar,flight}=environment(),clock=lunar.createClock(.25,()=>.5);
  const day=clock.sample(0,'home',0);
  const early=clock.sample(1,'night',0),late=clock.sample(8,'night',0);
  assert.ok(day.night<early.night&&early.night<late.night&&late.night>.98);
  assert.ok(late.x>day.x&&late.y<day.y);
  let [p,v]=flight.glide(0,0,1,1,.92);
  const [turn,speed]=flight.glide(p,v,0,.001,.92);
  assert.ok(turn>p&&Math.abs(speed-v)<.002);
  [p,v]=flight.glide(turn,speed,0,15,.92);
  assert.ok(p<.001&&Math.abs(v)<.001);
});
