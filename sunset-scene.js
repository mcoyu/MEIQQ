/* Local sky coordinates run from the top-left to the bottom-right of each bank.
   A coarse moisture field supplies the unresolved cloud body and the individual
   copper parcels. Both renderers consume the same advancing field. */
(() => {
  'use strict';
  const clamp = (x, lo=0, hi=1) => Math.max(lo, Math.min(hi, x));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = x => { const t=clamp(x); return t*t*(3-2*t); };
  const fract = x => x-Math.floor(x);
  const TAU = Math.PI*2;
  function hash(x,y) {
    x=fract(x*123.34); y=fract(y*456.21);
    const d=x*(x+45.32)+y*(y+45.32);
    return fract((x+d)*(y+d));
  }
  function noise(x,y) {
    const i=Math.floor(x), j=Math.floor(y), u=smooth(x-i), v=smooth(y-j);
    return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v)-.5;
  }
  function random(seed) {
    return () => {
      seed=(seed+0x6d2b79f5)|0;
      let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  // Height, lift, wind shear and optical depth distinguish the ten cloud genera.
  const types = {
    cirrus:        {label:'Cirrus',        height:.95, lift:.11, shear:.98, optical:.69},
    cirrocumulus:  {label:'Cirrocumulus',  height:.88, lift:.22, shear:.63, optical:.82},
    cirrostratus:  {label:'Cirrostratus',  height:.91, lift:.07, shear:.79, optical:.49},
    altocumulus:   {label:'Altocumulus',   height:.60, lift:.48, shear:.46, optical:1.14},
    altostratus:   {label:'Altostratus',   height:.56, lift:.14, shear:.45, optical:.96},
    nimbostratus:  {label:'Nimbostratus',  height:.37, lift:.22, shear:.39, optical:1.67},
    stratocumulus: {label:'Stratocumulus', height:.24, lift:.39, shear:.55, optical:1.31},
    stratus:       {label:'Stratus',       height:.16, lift:.07, shear:.26, optical:.90},
    cumulus:       {label:'Cumulus',       height:.36, lift:.87, shear:.23, optical:1.40},
    cumulonimbus:  {label:'Cumulonimbus',  height:.71, lift:1.0, shear:.68, optical:1.76}
  };
  const banks = [
    {id:'west',seed:31,width:.95,height:.65,drift:.017,frontPhase:.08,cycle:['cumulus','cumulonimbus','altostratus','altocumulus','cirrocumulus']},
    {id:'east',seed:89,width:.72,height:.47,drift:.010,frontPhase:.51,cycle:['cirrus','cirrostratus','cirrocumulus','altocumulus','cirrus']},
    {id:'low',seed:181,width:.83,height:.35,drift:.023,frontPhase:.76,cycle:['altocumulus','stratocumulus','stratus','nimbostratus','altostratus','cumulus']}
  ];
  const defaults = {
    west:{visible:true,type:'auto',x:17,y:25,scale:100,spacing:20},
    east:{visible:true,type:'auto',x:96,y:32,scale:100,spacing:16},
    low:{visible:true,type:'auto',x:18,y:73,scale:100,spacing:32},
    galaxy:{visible:true,x:65,y:43,density:78,drift:49,meteors:55},
    moon:{visible:true,x:49,y:44,scale:100},
    horizon:{visible:true,y:96},light:{dusk:58,wind:50,humidity:55}
  };
  const COLS=100, ROWS=64, STEP=.24;
  // Position is a fraction of the viewport. Draw both edges of a passing bank
  // when they are visible, so even a wide bank on a phone crosses continuously.
  function bankCenters(bank,anchor,span,time,left=0,right=1){
    const period=Math.max(1.36,span+.18),center=anchor+time*bank.drift;
    const first=Math.floor((left-span/2-center)/period)+1,last=Math.ceil((right+span/2-center)/period)-1;
    const centers=[];
    for(let copy=first;copy<=last;copy++)centers.push(center+copy*period);
    return centers;
  }
  function sample(map,x,y) {
    const gx=clamp(x)*(COLS-1), gy=clamp(y)*(ROWS-1);
    const i=Math.min(COLS-2,Math.floor(gx)), j=Math.min(ROWS-2,Math.floor(gy));
    const k=j*COLS+i, a=gx-i, b=gy-j;
    return mix(mix(map[k],map[k+1],a),mix(map[k+COLS],map[k+COLS+1],a),b);
  }
  const ellipsoid=(x,y,cx,cy,rx,ry)=>1-((x-cx)/rx)**2-((y-cy)/ry)**2;
  function morphology(type,x,y,seed) {
    const large=noise(x*5+seed,y*5), small=noise(x*15,y*13+seed);
    const u=x+.053*large+.014*small;
    const v=y+.094*noise(x*6+seed,y*4)+.034*small+.014*noise(x*32,y*27+seed);
    let value;
    if(type==='cumulus'||type==='cumulonimbus'){
      const storm=type==='cumulonimbus';
      value=-2;
      for(let i=0;i<11;i++){
        const cx=storm?.30+i*.043:.06+i*.087, crest=Math.sin(Math.PI*(i+.3)/11);
        const cy=.64-crest*crest*(storm?.39:.21)+.06*hash(i,seed);
        const rx=.10+.075*hash(i+2,seed), ry=.12+.15*crest*(.6+hash(i,seed+3));
        value=Math.max(value,ellipsoid(u,v,cx,cy,rx,ry));
        value=Math.max(value,ellipsoid(u,v,cx+.046,cy+.12,rx*1.22,ry*.80));
      }
      if(storm){
        value=Math.max(value,ellipsoid(u,v+.025*(u-.52),.61,.18,.39,.078),
          ellipsoid(u,v,.50,.40,.165,.27),ellipsoid(u,v,.45,.69,.32,.13));
      }
      value=Math.min(value,(.76+.018*Math.sin(u*13)-v)*14);
    }else if(type==='cirrus'){
      value=-2;
      for(let i=0;i<8;i++){
        const plume=.31+.055*i-.19*u+.13*Math.sin(u*5.3+i*.27)+.14*u*u;
        const taper=.065*Math.sin(Math.PI*clamp((u-.033*i)*1.12))+.012;
        value=Math.max(value,1-Math.abs(v-plume)/taper-.33*i/8);
      }
      value-=.42+.36*Math.sin(v*106+u*17+large*4);
    }else if(['cirrocumulus','altocumulus','stratocumulus'].includes(type)){
      const fine=type==='cirrocumulus', rolls=type==='stratocumulus';
      const gx=u*(fine?14:rolls?3.8:7.5)+v*.9+large*.46;
      const gy=(v-.18*u+.065*Math.sin(5*u))*(fine?9:rolls?4.7:5.5);
      const row=Math.floor(gy), column=Math.floor(gx+.37*row);
      const px=fract(gx+.37*row)-.50, py=fract(gy)-.50;
      const radius=.39+.16*hash(column+seed,row);
      const cell=1-(px/(radius*(rolls?1.55:1.05)))**2-(py/radius)**2;
      value=Math.min(ellipsoid(u,v,.45,.53,.52,rolls?.27:.33),cell+.16)+.13*large;
    }else{
      const veil=type==='cirrostratus', rain=type==='nimbostratus', low=type==='stratus';
      const center=.50+.09*Math.sin(4.3*u+seed*.06)+(low?.02:-.10)*u;
      const thick=rain?.30:veil?.21:low?.128:.196;
      value=ellipsoid(u,v-center,.47,0,.56,thick);
      value+=(veil?.19:rain?.29:.13)*Math.sin(v*(veil?52:24)+u*6+large*4);
      if(veil)value=value*.63+.29*large;
      if(rain&&v>center)value+=.29*noise(u*28,v*4+seed);
    }
    const boundary=smooth(Math.min(x,1-x)*17)*smooth(Math.min(y,1-y)*14);
    return boundary*clamp((value+.24+.56*small+.20*noise(x*32+seed,y*30))*.80);
  }

  function createWeather(bank) {
    const size=COLS*ROWS, rand=random(bank.seed);
    let water=new Float32Array(size), nextWater=new Float32Array(size);
    let vapor=new Float32Array(size), nextVapor=new Float32Array(size);
    // Condensate torn off the rim outlives the narrow neck that supplied it.
    let wisp=new Float32Array(size),nextWisp=new Float32Array(size);
    const condensed=new Float32Array(size),gustField=new Float32Array(size);
    const vx=new Float32Array(size), vy=new Float32Array(size), light=new Float32Array(size);
    const curl=new Float32Array(size);
    let flowX=new Float32Array(size), flowY=new Float32Array(size);
    let nextFlowX=new Float32Array(size), nextFlowY=new Float32Array(size);
    const grain=new Float32Array(size);
    for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++)
      grain[j*COLS+i]=noise(i*.086+bank.seed,j*.12)+.37*noise(i*.25,j*.31+bank.seed);
    const texture=new Uint8Array(size*4);
    // Deposit the condensed parcels into a coarser grid. In a new updraft the
    // first isolated chips arrive before enough have gathered to form a body.
    const binsX=32,binsY=23,deposit=new Float32Array(binsX*binsY);
    const shapes=new Map(), parcels=[], stride=10;
    const columns=115, rows=58, stream=new Float32Array(columns*rows*stride);
    let form='auto', time=0, debt=0, version=0, epoch=0, count=0, humidity=55;
    // Let one bank solve at a time. The short initial interval integrates only
    // elapsed weather time, then each bank keeps the same fixed period.
    let interval=STEP*({west:1,east:2/3,low:1/3}[bank.id]??1);
    let profile=types[bank.cycle[0]];
    let gust=null;
    function startGust(x,y,dx,dy){
      const rx=.15+.035*profile.shear,ry=.18+.055*profile.lift;
      const length=Math.hypot(dx/rx,dy/ry)||1;
      const localCurl=sample(curl,x,y);
      const strength=.82+.25*profile.lift+.15*Math.min(1,Math.abs(localCurl));
      gust={x,y,rx,ry,tx:dx/rx/length,ty:dy/ry/length,start:time,
        sign:Math.abs(localCurl)>.12?Math.sign(localCurl):(Math.sin(bank.seed+time*.37)>0?1:-1),
        strength,build:1.45+.65*(1-profile.lift),rise:1.9+.45*profile.shear};
      return gust;
    }
    for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
      const x=(i+rand())/columns, y=(j+rand())/rows;
      const seed=rand(),depth=rand(),angle=rand()*TAU;
      parcels.push({x,y,seed,depth,angle,mass:0,loose:0,home:y,
        dx:0,dy:0,heading:0,yawRate:0,roll:angle,spin:0});
    }
    function shape(name){
      if(!shapes.has(name)){
        const data=new Float32Array(size);
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)
          data[y*COLS+x]=morphology(name,x/(COLS-1),y/(ROWS-1),bank.seed);
        shapes.set(name,data);
      }
      return shapes.get(name);
    }
    function gatherParcels(){
      deposit.fill(0);
      const area=(binsX-1)*(binsY-1)/parcels.length;
      for(const p of parcels){
        if(p.inFlight||p.mass<.02)continue;
        const x=p.x*(binsX-1), y=p.y*(binsY-1);
        const i=Math.min(binsX-2,Math.floor(x)),j=Math.min(binsY-2,Math.floor(y)),k=j*binsX+i;
        const a=x-i,b=y-j,m=p.mass*area;
        deposit[k]+=m*(1-a)*(1-b);deposit[k+1]+=m*a*(1-b);
        deposit[k+binsX]+=m*(1-a)*b;deposit[k+binsX+1]+=m*a*b;
      }
    }
    function solve(dt,initialize){
      // The formation cycle changes continuously, mixing two humidity sources
      // during a front. A pinned genus still evolves under its own wind field.
      const cycle=time/(54+bank.seed%13), index=Math.floor(cycle)%bank.cycle.length;
      const first=form==='auto'?bank.cycle[index]:form;
      const blend=form==='auto'?smooth((fract(cycle)-.62)/.38):0;
      const second=blend?bank.cycle[(index+1)%bank.cycle.length]:first;
      const a=shape(first), b=shape(second), pa=types[first], pb=types[second];
      profile={};
      for(const key of ['height','lift','shear','optical'])profile[key]=mix(pa[key],pb[key],blend);
      const moisture=humidity/55, phase=time*.13+bank.seed;
      const passage=time/(24+bank.seed%9)+bank.frontPhase, turn=Math.floor(passage), age=fract(passage);
      const split=smooth(age/.26)*(1-smooth((age-.65)/.35));
      const gather=smooth((age-.12)/.30)*(1-smooth((age-.76)/.24));
      const frontX=.24+.49*age, lift=profile.lift, shear=profile.shear;
      const wave=turn*2.4+bank.seed*.47, curlY=.49+.06*Math.sin(wave);
      const updraftX=frontX+.18+.04*shear;
      const updraftY=curlY-.09-.11*lift+.045*Math.cos(wave+.9);
      const rx=.13+.07*shear, ry=.075+.095*lift;
      // Broad rising and sinking rolls shear past one another. Their cores
      // travel at different speeds, so a pocket of copper can form and unwind.
      const billows=[];
      for(let n=0;n<3;n++){
        const t=time*(.12+.025*n)+bank.seed*.7+n*2.22;
        billows.push({x:.18+.31*n+.085*Math.sin(t*.64),y:.51+.095*Math.sin(t*.78+n),
          rx:.21+.055*shear,ry:.19+.085*lift,
          turn:(n===1?-1:1)*(.41+.47*lift)*(.79+.21*Math.cos(t))});
      }
      const memory=Math.exp(-dt/3.2);
      const ageOfGust=gust?time-gust.start:0;
      if(gust&&ageOfGust>gust.build+gust.rise+5)gust=null;
      const sweep=gust?smooth((ageOfGust-gust.build)/gust.rise):0;
      const fade=gust?1-smooth((ageOfGust-gust.build-gust.rise)/4.8):0;
      const winding=gust?smooth(ageOfGust/gust.build)*fade:0;
      const stripping=sweep*fade;
      const head=.92*sweep+.13*Math.max(0,ageOfGust-3);
      const bend=gust?gust.sign*.36*Math.sin(sweep*2.5):0;
      if(!initialize)gatherParcels();
      for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){
        const x=i/(COLS-1), y=j/(ROWS-1), k=j*COLS+i;
        const eddy=Math.sin(8*x+phase+Math.sin(y*6-phase*.52));
        const roll=Math.cos(7*y-phase*.61+2*x);
        // Dry air cuts a winding channel. Air curls along its downwind lip
        // into a fresh thermal that can condense outside the original outline.
        const offset=x-frontX-.075*Math.sin((y-curlY)*7+wave)-.062*grain[k]-.012*Math.sin(y*25+phase);
        const seam=offset-.045*split*Math.sin(10*(y-curlY)+wave+.8*eddy);
        const tongue=.85+.15*Math.cos((y-curlY)*6+phase*.37);
        const dry=split*smooth((.15*tongue-Math.abs(seam))/.083);
        const dx=x-updraftX, dy=y-updraftY;
        const vortex=clamp(1-(dx/.31)**2-(dy/.36)**2)*gather;
        const nx=dx/rx+.25*grain[k], ny=dy/ry+.35*grain[k];
        const cell=clamp(Math.max(1-nx*nx-ny*ny,
          .91-(nx-.72)**2*1.8-(ny+.28)**2*1.6, .87-(nx+.54)**2*2-(ny-.41)**2*1.9)+.46*grain[k]);
        const sourceX=x+.045*Math.sin(phase*.57+4*y)+.021*eddy-dy*vortex*.58-.30*flowX[k];
        const sourceY=y+.046*lift*Math.sin(phase+7*x)+.019*roll+dx*vortex*.82-.30*flowY[k];
        const parent=mix(sample(a,sourceX,sourceY),sample(b,sourceX,sourceY),blend);
        const source=Math.max(parent,cell*gather*(1.16-.20*shear))*(1-dry);
        const w=.011+.010*profile.height+.014*profile.shear*(1-y)+.006*eddy;
        const up=lift*(source*.024+.014*eddy);
        vx[k]=w+.005*roll+(dy*.49-dx*.23)*vortex+.020*dry;
        vy[k]=.005*roll-up+.002+(-dx*.62-dy*.20)*vortex+.033*dry;
        for(const cell of billows){
          const ux=(x-cell.x)/cell.rx,uy=(y-cell.y)/cell.ry;
          const inside=1-ux*ux-uy*uy;
          if(inside<=0)continue;
          const spin=cell.turn*inside*inside;
          vx[k]-=uy*cell.rx*spin;vy[k]+=ux*cell.ry*spin;
        }
        let neck=0,peel=0,slipX=0,slipY=0;
        gustField[k]=0;
        if(gust&&winding>0){
          const gx=(x-gust.x)/gust.rx,gy=(y-gust.y)/gust.ry;
          const along=gx*gust.tx+gy*gust.ty,across=gy*gust.tx-gx*gust.ty;
          const a=along-head,b=across-bend;
          const core=Math.max(0,1-a*a*.48-b*b*.68);
          const spin=gust.sign*gust.strength*winding*core*core;
          // Wind up a shared roll, then stretch the leading lobe through its rim.
          const jet=.94*gust.strength*stripping*core;
          const draw=.25*winding*(1-sweep)*core;
          const forward=jet-b*spin-a*draw,side=a*spin-b*draw;
          vx[k]+=gust.rx*(gust.tx*forward-gust.ty*side);
          vy[k]+=gust.ry*(gust.ty*forward+gust.tx*side);
          neck=stripping*Math.max(0,1-((a+.70)/.57)**2-((b+.11*gust.sign)/.83)**2);
          peel=stripping*core*core;
          slipX=.29*gust.rx*gust.tx*peel;slipY=.29*gust.ry*gust.ty*peel;
          gustField[k]=winding*core;
        }
        const upstreamX=x-vx[k]*dt, upstreamY=y-vy[k]*dt;
        nextFlowX[k]=initialize?0:memory*(sample(flowX,upstreamX,upstreamY)+vx[k]*dt);
        nextFlowY[k]=initialize?0:memory*(sample(flowY,upstreamX,upstreamY)+vy[k]*dt);
        const supply=moisture*(.27+source*.91+.055*eddy)*(1-.85*dry)*(1-.78*neck);
        const saturation=.43+.13*y-.10*profile.lift*source;
        if(initialize){
          nextVapor[k]=saturation;nextWater[k]=clamp((supply-saturation)*1.15);nextWisp[k]=0;
        }else{
          const transported=sample(water,upstreamX,upstreamY);
          let v=mix(sample(vapor,upstreamX,upstreamY),supply,1-Math.exp(-dt*1.2));
          const exchange=(v-saturation)*(1-Math.exp(-dt*(v>saturation?2.4:1.7)));
          const transfer=clamp(exchange,-transported,v);
          const available=clamp(transported*Math.exp(-dt*(.51+1.9*dry+1.1*neck))+transfer);
          const lifted=available*(1-Math.exp(-1.3*dt*peel));
          nextWater[k]=available-lifted;
          nextWisp[k]=sample(wisp,upstreamX-slipX*dt,upstreamY-slipY*dt)*Math.exp(-dt*(.32+.60*dry))+lifted;
          nextVapor[k]=v-transfer;
        }
        const edge=smooth(Math.min(x,1-x)*22)*smooth(Math.min(y,1-y)*22);
        nextWater[k]*=edge;nextWisp[k]*=edge;
        condensed[k]=clamp(nextWater[k]+nextWisp[k]);
      }
      [water,nextWater]=[nextWater,water];[vapor,nextVapor]=[nextVapor,vapor];
      [wisp,nextWisp]=[nextWisp,wisp];
      [flowX,nextFlowX]=[nextFlowX,flowX];[flowY,nextFlowY]=[nextFlowY,flowY];
      for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){
        const k=j*COLS+i,x=i/(COLS-1),y=j/(ROWS-1), liquid=condensed[k];
        const gx=x*(binsX-1),gy=y*(binsY-1),ix=Math.min(binsX-2,Math.floor(gx)),iy=Math.min(binsY-2,Math.floor(gy));
        const bin=iy*binsX+ix, coverage=mix(mix(deposit[bin],deposit[bin+1],gx-ix),
          mix(deposit[bin+binsX],deposit[bin+binsX+1],gx-ix),gy-iy);
        const q=initialize?liquid:liquid*(.70+.39*clamp(coverage,0,1.45));
        // Crowded parcels spread across the head of the thermal. This keeps a
        // circulating roll open even while fresh shards keep entering its base.
        if(!initialize && coverage>1){
          const pressure=.065*smooth((coverage-1)/1.8);
          const gradX=mix(deposit[bin+1]-deposit[bin],deposit[bin+binsX+1]-deposit[bin+binsX],gy-iy);
          const gradY=mix(deposit[bin+binsX]-deposit[bin],deposit[bin+binsX+1]-deposit[bin+1],gx-ix);
          vx[k]-=pressure*clamp(gradX,-1,1);vy[k]-=pressure*clamp(gradY,-1,1);
        }
        // Compare nearby columns along the sunset light to expose billows
        // and shadow their leeward faces. High thin ice clouds transmit more.
        const lightSide=sample(condensed,x-.026,y-.052);
        const shade=clamp(.49+(liquid-lightSide)*1.65+.20*(.55-y)+.09*Math.sin(x*9+phase)*liquid);
        light[k]=shade;
        texture[k*4]=Math.round(clamp(q)*255);texture[k*4+1]=Math.round(shade*255);
        texture[k*4+2]=Math.round(clamp(.5+flowX[k]*2)*255);
        texture[k*4+3]=Math.round(clamp(.5+flowY[k]*2)*255);
      }
      for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){
        const k=j*COLS+i;
        const left=i>0?k-1:k,right=i<COLS-1?k+1:k;
        const above=j>0?k-COLS:k,below=j<ROWS-1?k+COLS:k;
        curl[k]=.5*((vy[right]-vy[left])*(COLS-1)-(vx[below]-vx[above])*(ROWS-1));
      }
      version++;
    }
    function transport(dt,initialize){
      count=0;
      for(const p of parcels){
        if(p.inFlight)continue;
        const heightSpeed=.78+.43*p.depth;
        const dx=sample(vx,p.x,p.y)*heightSpeed,dy=sample(vy,p.x,p.y)*heightSpeed+.018*(p.home-p.y);
        const response=initialize?1:1-Math.exp(-dt*(2.7+2.4*p.depth));
        p.dx+=response*(dx-p.dx);p.dy+=response*(dy-p.dy);
        p.x+=dt*p.dx;p.y+=dt*p.dy;
        if(p.x<0||p.x>=1||p.y<0||p.y>=1){
          const crossedSide=p.x<0||p.x>=1;
          p.x=fract(p.x);p.y=crossedSide?p.home:fract(p.y);p.mass=0;p.loose=0;
        }
        const q=sample(condensed,p.x,p.y), threshold=.024+.21*p.seed;
        const target=smooth((q-threshold)*3.7);
        p.mass=initialize?target:mix(p.mass,target,1-Math.exp(-dt*(target>p.mass?1.9:1.15)));
        // A few bright facets stay visible in dry air. Their identities and
        // paths persist as they peel off and feed the next growing billow.
        p.loose=initialize?p.mass:Math.max(p.mass,p.loose*Math.exp(-dt*.24));
        const free=p.seed>.84?p.loose*(1-p.mass):0;
        const visible=(p.mass+.72*free)*smooth(Math.min(p.x,1-p.x,p.y,1-p.y)*32);
        if(visible<.016&&!p.settling){p.extent=0;continue;}
        const k=count++*stride, lit=sample(light,p.x,p.y);
        const lifted=gust?sample(gustField,p.x,p.y):0;
        const shear=clamp(sample(curl,p.x,p.y),-2.6,2.6);
        if(initialize)p.heading=Math.atan2(p.dy,p.dx)+(p.seed-.5)*1.5;
        // A thin flake has no preferred nose. Torque aligns either end to the
        // current, continuously through a reversal, while local curl turns it.
        const ca=Math.cos(p.heading),sa=Math.sin(p.heading);
        const along=ca*p.dx+sa*p.dy,across=ca*p.dy-sa*p.dx;
        const align=2*along*across/(.00045+p.dx*p.dx+p.dy*p.dy);
        const settle=1-Math.exp(-dt*(1.8+p.seed));
        p.yawRate+=(.65*shear+1.05*align-p.yawRate)*settle;
        const side=p.seed>.5?1:-1;
        const turn=side*(.25+.58*p.depth+.38*free)+.85*shear+across*6;
        p.spin+=(turn-p.spin)*settle;
        p.heading+=dt*p.yawRate;p.roll+=dt*p.spin;
        stream[k]=p.x;stream[k+1]=p.y;stream[k+2]=p.depth*.095+.11*q;
        p.extent=(.0015+.0079*p.seed*p.seed)*Math.sqrt(visible)*(1+.32*lifted);
        stream[k+3]=p.extent;
        stream[k+4]=p.heading;stream[k+5]=p.roll;stream[k+6]=clamp(lit+.32*free+.11*lifted);stream[k+7]=visible*(p.settling?1-p.flightCover:1);
        stream[k+8]=p.seed;stream[k+9]=p.depth;
      }
    }
    function configure(type,wetness,still=false){
      if(type===form&&humidity===wetness)return;
      const newForm=type!==form;
      form=type;humidity=wetness;
      if(newForm||still){epoch++;solve(0,true);transport(0,true);}
    }
    function advance(dt){
      while(dt>1e-9){
        const step=Math.min(dt,interval-debt);
        time+=step;debt+=step;dt-=step;
        transport(step,false);
        if(debt>=interval-1e-9){solve(interval,false);debt=0;interval=STEP;}
      }
    }
    function reserve(x,y){
      let nearest=.08**2, slot=-1;
      for(let i=0;i<parcels.length;i++){
        const p=parcels[i], distance=(p.x-x)**2+(p.y-y)**2;
        if(!p.reserved && !p.inFlight && !p.settling && p.mass>.10 && distance<nearest){slot=i;nearest=distance;}
      }
      if(slot<0)return null;
      const parcel=parcels[slot];
      parcel.reserved=true;
      return {parcel,replaceWith(other){parcels[slot]=other;}};
    }
    function receive(ticket,x,y){
      // Exchange a dry background parcel for the arriving one. Each bank
      // keeps its fixed buffer capacity and the airborne shard keeps its seed.
      let slot=-1;
      for(let i=0;i<parcels.length;i++){
        if(parcels[i].reserved||parcels[i].inFlight||parcels[i].settling)continue;
        if(slot<0||parcels[i].mass<parcels[slot].mass)slot=i;
        if(parcels[slot].mass===0)break;
      }
      const p=ticket.parcel, other=parcels[slot];
      Object.assign(other,{x:p.x,y:p.y,home:p.home,mass:0,loose:0});
      ticket.replaceWith(other);
      const mass=smooth((sample(condensed,x,y)-.024-.21*p.seed)*3.7);
      Object.assign(p,{x,y,home:y,mass,loose:Math.max(.40,mass),inFlight:false});
      parcels[slot]=p;
    }
    solve(0,true);transport(0,true);
    return {texture,stream,configure,advance,startGust,reserve,receive,densityAt:(x,y)=>sample(condensed,x,y),
      gustAt:(x,y)=>sample(gustField,x,y),
      windAt:(x,y)=>[sample(vx,x,y),sample(vy,x,y)],
      get count(){return count;},get version(){return version;},
      get epoch(){return epoch;},get blend(){return debt/STEP;},
      get profile(){return profile;},get time(){return time;}};
  }

  // An event owns a trajectory and lifetime. Hiding the galaxy or stopping
  // motion clears it, so resuming never replays a queue of missed meteors.
  function createMeteors(seed=7043) {
    const rand=random(seed);
    let delay=3.4, event=null, first=true;
    return {
      clear(){event=null;delay=3.4;first=true;},
      advance(dt,frequency){
        if(!frequency){event=null;delay=3.4;return null;}
        if(!dt)return event;
        if(event){
          event.age+=dt;
          if(event.age>event.life){event=null;delay=mix(42,6,frequency/100)*(.65+rand()*.95);}
        }else{
          delay-=dt;
          if(delay<=0){
            const direction=rand()>.62?-1:1;
            event={x:direction>0?.26+rand()*.29:.66+rand()*.20,y:.14+rand()*.26,
              dx:direction*(.16+rand()*.20),dy:.11+rand()*.14,age:0,life:.78+rand()*.55};
            // Give the first trail the clear opening between the default banks.
            if(first){event.x=.76;event.y=.31;event.dx=-.24;event.dy=.18;first=false;}
          }
        }
        return event;
      }
    };
  }
  window.SunsetScene={banks,bankCenters,types,defaults,createWeather,createMeteors,cols:COLS,rows:ROWS,hash,clamp,mix,smooth};
})();
