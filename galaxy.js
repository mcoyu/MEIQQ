/* A procedural dusk sky behind independent copper meshes, with a shared
   deterministic scene for the WebGL and Canvas renderers. */
(() => {
  'use strict';
  const host=document.querySelector('aero-shards');
  let canvas=host?.querySelector?.('.sunset-environment');
  if(!canvas)return;
  const {banks,cloudViews,defaults,createWeather,createShardFlights,createMeteors,cols,rows,hash,clamp,mix,smooth}=window.SunsetScene;
  const weather=banks.map(createWeather);
  const flights=createShardFlights(weather);
  let views=[];
  const meteorClock=createMeteors();
  let meteor=null, celestial=0;
  const streak=new Float32Array(4);
  const screenVertex=`#version 300 es
    void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
  const skyFragment=`#version 300 es
    precision highp float;
    uniform vec2 uSize;
    uniform vec3 uGalaxy, uMoon;
    uniform float uTime,uDusk,uOrbit,uBurst;
    uniform vec4 uStreak;
    uniform float uNight,uLens,uRiverAir;uniform mat3 uSkyAxes;
    out vec4 color;
    float Hash21(vec2 p){
      p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);
    }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(Hash21(i),Hash21(i+vec2(1,0)),f.x),mix(Hash21(i+vec2(0,1)),Hash21(i+1.),f.x),f.y);
    }
    float mist(vec2 p){return .56*noise(p)+.28*noise(p*2.07+18.)+.16*noise(p*4.13+37.);}
    // Galaxy's seeded star cells, depth layers and individual twinkle phases.
    vec3 StarLayer(vec2 uv,float scale,float layer,float density,float band){
      vec2 grid=uv*scale+layer*453.32, id=floor(grid);
      float seed=Hash21(id), size=fract(seed*345.32);
      vec2 center=.17+.66*vec2(Hash21(id+2.),Hash21(id+3.));
      float d=length(fract(grid)-center)/scale*uSize.y;
      float radius=mix(.44,.98,pow(size,4.))*clamp(uSize.y/800.,.72,1.25)*(1.+.17*uNight);
      float core=exp(-d*d/(radius*radius));
      float glow=exp(-d/(radius*2.3))*.115*size*size;
      float presence=smoothstep(1.-density*(.18+.61*band),1.,seed);
      float twinkle=.82+.14*cos(uTime*(.56+.51*size)+seed*34.)+.04*sin(uTime*2.1+seed*83.);
      return mix(vec3(.79,.89,1.),vec3(1.,.89,.73),Hash21(id+7.))*(core+glow)*presence*twinkle;
    }
    void main(){
      vec2 uv=vec2(gl_FragCoord.x/uSize.x,1.-gl_FragCoord.y/uSize.y);
      vec2 aspect=vec2(uSize.x/uSize.y,1.);
      float h=uv.y, dusk=uDusk;
      vec3 top=mix(vec3(.39,.45,.49),vec3(.14,.20,.27),dusk);
      vec3 waist=mix(vec3(.66,.70,.70),vec3(.36,.47,.53),dusk);
      vec3 bottom=mix(vec3(.95,.86,.70),vec3(.74,.69,.64),dusk);
      // The zenith loses its last daylight before the horizon does.
      float night=smoothstep(0.,1.,uNight*(1.25-.25*h));
      float twilight=smoothstep(0.,.64,night),dark=smoothstep(.32,1.,night);
      top=mix(mix(top,vec3(.105,.16,.255),twilight),vec3(.019,.035,.072),dark);
      waist=mix(mix(waist,vec3(.25,.33,.425),twilight),vec3(.058,.095,.15),dark);
      bottom=mix(mix(bottom,vec3(.65,.48,.425),twilight),vec3(.168,.19,.225),dark);
      vec3 sky=mix(top,waist,smoothstep(-.12,.77,h));
      sky=mix(sky,bottom,smoothstep(.43,1.04,h));
      sky+=vec3(.10,.043,.018)*(1.-.85*night)*exp(-length((uv-vec2(.21,.87))*vec2(1.5,3.)));
      vec3 atmosphere=sky;
      vec3 ray=uSkyAxes*vec3((uv-.5)*aspect*uLens,1.);
      vec2 skyUV=.5+ray.xy/(max(.06,ray.z)*uLens*aspect);
      vec2 pole=vec2(.07,-.72), relative=(skyUV-uGalaxy.xy)*aspect-pole;
      float angle=uOrbit*.0038;
      vec2 skyPos=pole+mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*relative;
      float bend=.05*sin(skyPos.x*3.8);
      float crossBand=skyPos.y+skyPos.x*.53+bend;
      float band=exp(-crossBand*crossBand/.027);
      float air=mix(1.-smoothstep(.37,.90,h),1.-.78*smoothstep(.66,1.,h),night)*uGalaxy.z;
      band=mix(band,.48,night);
      for(int k=0;k<3;k++){
        float layer=float(k)/3.;
        sky+=StarLayer(skyPos+vec2(.0010,-.00024)*uOrbit*(layer+.3),
          mix(16.,48.,layer),layer,uGalaxy.z,band)*air*(.91-.23*layer)*(1.+.23*night);
      }
      if(uBurst>0.){
        vec2 path=uStreak.zw*uSize, delta=(uv-uStreak.xy)*uSize;
        float tailLength=max(1.,length(path)), along=dot(delta,path)/tailLength;
        float radius=max(.75,uSize.y*.0011);
        float side=length(delta-path*along/tailLength)/radius;
        float taper=clamp(1.+along/tailLength,0.,1.);
        float tail=exp(-side*side/(.16+taper))*taper*taper*(1.-smoothstep(-1.,1.,along));
        float head=exp(-length(delta)/(radius*1.6));
        sky+=uBurst*(mix(vec3(.48,.61,.90),vec3(1.,.86,.68),taper)*tail+vec3(1.,.96,.86)*head);
      }
      vec2 moon=(uv-uMoon.xy)*uSize;
      float radius=uMoon.z, aa=.85;
      if(radius>.1){
        vec2 p=moon/radius;
        float d=length(moon),disk=1.-smoothstep(radius-aa,radius+aa,d);
        vec3 normal=vec3(p.x,-p.y,sqrt(max(0.,1.-dot(p,p))));
        float incidence=dot(normal,normalize(vec3(.82,.24,-.54)));
        float maria=.92+.08*mist(p*3.1+7.);
        vec3 ivory=mix(vec3(1.,.925,.76),vec3(.98,.965,.89),night);
        sky+=mix(vec3(.11,.079,.045),vec3(.074,.096,.13),night)*exp(-d/(radius*1.68));
        vec3 earthshine=mix(atmosphere,vec3(.10,.126,.157),.36*night)+vec3(.014,.019,.024)*night*normal.z;
        vec3 lit=ivory*maria*(.84+.16*max(0.,incidence));
        sky=mix(sky,mix(earthshine,lit,smoothstep(-.015,.065,incidence)),disk);
      }
      sky+=(Hash21(gl_FragCoord.xy)-.5)*.004;
      // The air under the cloud opens first. Cloud volumes, their lit
      // edges and copper parcels are composited independently over the river.
      float cover=1.;
      if(uRiverAir>0.){
        float edge=(1.-h)*.49+.19*mist(skyUV*vec2(4.5,3.)+vec2(uTime*.028,7.2));
        cover=1.-smoothstep(edge,edge+.40,uRiverAir*1.12);
        sky=mix(sky,vec3(.37,.295,.31),uRiverAir*.43);
      }
      color=vec4(sky*cover,cover);
    }`;
  const volumeVertex=`#version 300 es
    uniform vec2 uSize,uSpan,uPosition;
    out vec2 vUV;
    void main(){
      vUV=vec2(gl_VertexID&1,(gl_VertexID>>1)&1);
      vec2 pos=uPosition+(vUV-.5)*uSpan;
      gl_Position=vec4(pos/uSize*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
    }`;
  const volumeFragment=`#version 300 es
    precision highp float;
    in vec2 vUV;
    uniform sampler2D uWater;
    uniform highp sampler3D uGrain;
    uniform vec4 uAir;
    uniform float uTime,uSeed,uDusk,uSpace;
    out vec4 color;
    // View-space slices resolve the front, core and back of each moist column.
    // The same wind that carries the metal parcels carries the fine cloud grain.
    float material(vec2 uv,float z,out vec3 parcel){
      vec2 bend=(texture(uWater,uv).ba-vec2(128./255.))*.5;
      vec2 travel=vec2(.005+.004*uAir.z,-.002*uAir.y)*uTime+bend;
      parcel=vec3((uv-travel)*vec2(1.23-.47*uAir.z,.86+.44*uAir.z),z*.24);
      vec3 p=parcel+uSeed*.073;
      vec4 grains=texture(uGrain,p);
      vec3 finer=texture(uGrain,p*2.73+grains.g*.17).rgb;
      vec2 displacement=(grains.rg-.47)*vec2(.142,.122)+(finer.rg-.47)*.042;
      float water=texture(uWater,uv+displacement).r;
      float detail=finer.b;
      float billow=dot(grains.rgb,vec3(.55,.31,.14))+.10*(detail-.5);
      float skin=water*(.90+.18*grains.g)-.98*z*z-.052;
      return max(0.,skin+(billow-.46)*.64)*smoothstep(.005,.12,water);
    }
    void main(){
      if(any(greaterThan(vUV,vec2(1.))))discard;
      float storm=smoothstep(1.3,1.76,uAir.w);
      vec3 base=mix(vec3(.64,.53,.55),vec3(.42,.39,.47),uDusk)-storm*vec3(.095,.079,.075);
      vec3 warm=mix(vec3(.97,.74,.64),vec3(.88,.60,.51),uDusk);
      vec3 sun=mix(vec3(1.,.87,.72),vec3(1.,.80,.65),uDusk);
      vec3 sum=vec3(0.);
      float transmittance=1.;
      float depthScale=uAir.w*(1.-.72*uSpace);
      for(int k=0;k<16;k++){
        float z=1.-(float(k)+.5)/8.;
        vec2 uv=vUV+vec2(.051,-.040)*z;
        vec3 parcel,shadowParcel;
        float rho=material(uv,z,parcel);
        if(rho<.003)continue;
        float nearSun=material(uv+vec2(-.023,-.038),z+.16,shadowParcel);
        float middleSun=material(uv+vec2(-.057,-.082),z+.34,shadowParcel);
        float farSun=texture(uWater,uv+vec2(-.093,-.127)).r;
        float slope=clamp(.49+(rho-nearSun)*1.66,0.,1.);
        float sunlight=exp(-(nearSun*1.30+middleSun*1.27+farSun*.65)*depthScale);
        vec4 grain=texture(uGrain,parcel*vec3(4.3,4.3,1.42)+uSeed*.073);
        float silver=(grain.r-.46)*.26+(grain.g-.46)*.17;
        float rim=smoothstep(.18,.66,grain.r)*(1.-smoothstep(.08,.40,rho));
        float light=clamp(.55*slope+.54*sunlight+.11*z+silver+rim*.12,0.,1.);
        vec3 scatter=mix(base,warm,smoothstep(.17,.80,light));
        scatter=mix(scatter,sun,smoothstep(.52,.93,light)*.82);
        float extinction=1.-exp(-rho*depthScale*.83);
        sum+=transmittance*extinction*scatter;
        transmittance*=1.-extinction;
        if(transmittance<.024)break;
      }
      float alpha=1.-transmittance;
      vec2 margin=min(vUV,1.-vUV);
      float edge=smoothstep(0.,.092,margin.x)*smoothstep(0.,.085,margin.y);
      color=vec4(sum/max(alpha,.001),alpha*edge);
    }`;
  const shardVertex=`#version 300 es
    layout(location=0) in vec3 aCorner;
    layout(location=2) in vec4 aParcel;
    layout(location=3) in vec4 aAxes;
    layout(location=4) in vec4 aFold;
    layout(location=5) in vec2 aOpacity;
    uniform vec2 uSize,uSpan,uPosition,uLook;uniform mat3 uProjection;
    uniform float uSpace;
    out vec4 vColor;
    void main(){
      bool lower=aCorner.z>.5;
      vec2 wing=lower?aFold.xy:aAxes.zw;
      float size=min(uSpan.x,uSpan.y*1.85)*aParcel.w*mix(.86,.42,uSpace);
      vec2 offset=(aCorner.x*aAxes.xy+aCorner.y*wing)*size;
      vec2 pos=uPosition+(aParcel.xy-.5)*uSpan+offset+uLook*aParcel.z*uSize.y*.022;
      vec3 clip=uProjection*vec3(pos,1.);gl_Position=vec4(clip.xy,-aParcel.z*clip.z,clip.z);
      float shade=lower?aFold.w:aFold.z;
      vec3 copper=mix(vec3(.49,.36,.36),vec3(.86,.58,.44),min(1.,shade*1.6));
      copper=mix(copper,vec3(1.,.88,.69),smoothstep(.54,1.,shade));
      vColor=vec4(copper,lower?aOpacity.y:aOpacity.x);
    }`;
  const shardFragment=`#version 300 es
    precision mediump float; in vec4 vColor; out vec4 color;
    void main(){color=vColor;}`;

  let state=structuredClone(defaults), renderGL, ctx2d, failed=false, raf=0, last=0, time=0;
  let width=1,height=1,look=[0,0],target=[0,0], dirty=true;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'), forced=matchMedia('(forced-colors:active)');
  const horizon=host.querySelector('.sunset-horizon');
  function program(gl,vert,frag,names){
    const p=gl.createProgram();
    if(!p)throw Error('No graphics program');
    for(const [type,src] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){
      const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
      gl.attachShader(p,sh);gl.deleteShader(sh);
    }
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){gl.deleteProgram(p);throw Error('Could not link sky shader');}
    const u={};for(const name of names)u[name]=gl.getUniformLocation(p,name);
    return {p,u};
  }
  // Two facets meet at the long crease. The silhouette and reflections use the
  // same orientation in Canvas and WebGL, including the narrow edge-on phase.
  const wingTips=[[-.44,.29,.78],[-.21,.48,.64]];
  function foldedFlake(){
    const vertices=[];
    wingTips.forEach(([back,front,breadth],wing)=>{
      vertices.push(-.92,0,wing,back,1,wing,front,breadth,wing,
        -.92,0,wing,front,breadth,wing,1,0,wing);
    });
    return new Float32Array(vertices);
  }
  const poseStride=14,poses=weather.map(w=>new Float32Array(w.stream.length/10*poseStride));
  function projectBank(index,bw,bh){
    const w=weather[index],stream=w.stream,out=poses[index];
    for(let i=0;i<w.count;i++){
      const k=i*10,j=i*poseStride,seed=stream[k+8],depth=stream[k+9];
      out[j]=stream[k];out[j+1]=stream[k+1];out[j+2]=stream[k+2];out[j+3]=stream[k+3];
      // Heading lives in bank coordinates. Correct for the bank's projected aspect.
      const hx=bw*Math.cos(stream[k+4]),hy=bh*Math.sin(stream[k+4]);
      const inverse=1/Math.sqrt(hx*hx+hy*hy),ca=hx*inverse,sa=hy*inverse;
      const roll=stream[k+5],cr=Math.cos(roll),sr=Math.sin(roll);
      const pitch=.35*(seed-.5)+.31*Math.sin(roll*.72+depth*5);
      const cp=Math.cos(pitch),sp=Math.sin(pitch);
      const lx=ca*cp,ly=sa*cp,tx=ca*sp*sr-sa*cr,ty=sa*sp*sr+ca*cr,tz=cp*sr;
      const nx=ca*sp*cr+sa*sr,ny=sa*sp*cr-ca*sr,nz=cp*cr;
      const fold=.18+.25*seed, halfWidth=.32+.29*depth, skew=(seed-.5)*.32;
      const normalScale=1/Math.sqrt(1+fold*fold);
      out[j+4]=lx;out[j+5]=ly;
      for(let wing=0;wing<2;wing++){
        const side=wing?1:-1,off=j+6+2*wing;
        out[off]=halfWidth*(side*tx-fold*nx)+side*skew*lx;
        out[off+1]=halfWidth*(side*ty-fold*ny)+side*skew*ly;
        const z=nz+side*fold*tz, front=(z<0?-1:1)*normalScale;
        const x=(nx+side*fold*tx)*front,y=(ny+side*fold*ty)*front;
        const sun=clamp(-.51*x-.70*y+.50*z*front);
        const spec=clamp(-.30*x-.40*y+.865*z*front)**8;
        const light=stream[k+6];
        out[j+10+wing]=clamp(.14+.45*light+.30*sun+.46*spec*light);
        out[j+12+wing]=shardLight*stream[k+7]*(.075+.085*depth+.15*sun*light+.60*spec*light);
      }
    }
    return out;
  }
  const camera=window.SunsetScene.createSkyCamera(host.getAttribute('sky-stage'));
  let cameraReady=host.hasAttribute('sky-stage'),cameraClock=0,night=0,cloudNight=0,cloudLight=1,shardLight=1;
  const bankDepth=index=>2.55+2.45*weather[index].profile.height;
  function bankPositions(index){return views.filter(v=>v.index===index).map(v=>[v.cx*width,v.cy*height]);}
  function copperSurface(){
    // Oxide grows in the recesses; grinding and long scoring marks expose the
    // warmer metal. Object-space UVs keep these marks attached during a turn.
    const size=192, plate=document.createElement('canvas');plate.width=plate.height=size;
    const c=plate.getContext('2d'), image=c.createImageData(size,size);
    function patinaNoise(x,y){
      const i=Math.floor(x),j=Math.floor(y),u=smooth(x-i),v=smooth(y-j);
      return mix(mix(hash(i+13,j),hash(i+14,j),u),mix(hash(i+13,j+1),hash(i+14,j+1),u),v);
    }
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size;
      const veins=patinaNoise(u*5.8+v*1.7,v*4.1);
      const grain=patinaNoise(u*16+3*veins,v*24)+.28*patinaNoise(u*70,v*97);
      const oxide=smooth((veins*.59+grain*.41-.515)/.23);
      const pits=hash(x+18,y+9),brush=.075*Math.sin(v*960+u*43+veins*13)+.10*(pits-.5);
      const stain=clamp(veins*.48+grain*.32+brush-.15);
      const k=4*(y*size+x);
      image.data[k]=mix(mix(235,155,stain),77+25*grain,oxide);
      image.data[k+1]=mix(mix(160,83,stain),120+32*grain,oxide);
      image.data[k+2]=mix(mix(110,52,stain),109+24*grain,oxide);
      image.data[k+3]=255;
    }
    c.putImageData(image,0,0);
    for(let i=0;i<85;i++){
      const x=hash(i,1)*size,y=hash(i,2)*size,length=2+hash(i,3)**3*58;
      c.strokeStyle=i%3?'rgba(255,220,169,.34)':'rgba(66,41,32,.38)';
      c.lineWidth=.35+hash(i,4)*.55;c.beginPath();c.moveTo(x,y);
      c.lineTo(x+length,y+length*(.08+.11*hash(i,5)));c.stroke();
    }
    return plate;
  }
  const copper=copperSurface();
  function foldedCopper(seed){
    // Mill-cut sheet with one torn edge, a cold-worked crease, and a bright
    // exposed bevel. Top and underside share the cut outline.
    const length=10, across=4, grid=[], mesh=[];
    for(let i=0;i<=length;i++){
      const t=i/length, belly=Math.sin(Math.PI*t);
      const breadth=.17+.32*belly+.10*(1-t)-.11*t;
      const lean=.105*Math.sin(t*4.6+seed)+.065*t;
      for(let j=0;j<=across;j++){
        const v=2*j/across-1, nick=j===across?.07*hash(i+seed,5):.035*hash(i,seed);
        const x=-.92+1.87*t+v*(.10-.16*t)+.05*belly*v*v;
        const y=lean+v*(breadth-nick)*(.86+.16*t);
        const z=.14*belly-.08*t+v*(.030+.080*Math.sin(t*3.6+seed))+
          .067*(1-Math.abs(v+.12))-.034*v*v+.016*hash(i+seed,j)*belly;
        grid.push([x,y,z]);
      }
    }
    const lower=p=>[p[0],p[1],p[2]-.048];
    function face(a,b,c,edge){for(const point of [a,b,c])mesh.push(...point,.52,edge);}
    function rim(a,b){const c=lower(a),d=lower(b);face(a,c,b,1);face(b,c,d,1);}
    for(let i=0;i<length;i++)for(let j=0;j<across;j++){
      const k=i*(across+1)+j,a=grid[k],b=grid[k+across+1],c=grid[k+across+2],d=grid[k+1];
      face(a,b,c,0);face(a,c,d,0);face(lower(c),lower(b),lower(a),0);face(lower(d),lower(c),lower(a),0);
      if(!j)rim(a,b);if(j===across-1)rim(c,d);if(!i)rim(d,a);if(i===length-1)rim(b,c);
    }
    return new Float32Array(mesh);
  }
  const flightMeshes=[foldedCopper(11),foldedCopper(32),foldedCopper(73)];
  const facets=new Float32Array(flightMeshes.reduce((n,mesh)=>n+mesh.length/5*8,0));
  const projected=new Float32Array(facets.length),depths=new Float32Array(facets.length/24),faceOrder=[];
  let facetCount=0;
  function projectFlights(){
    // Rotate each folded sheet in three axes. Both renderers see the
    // same silhouette and copper reflections, including during an edge-on turn.
    let out=0;faceOrder.length=0;
    const pixelRatio=width/Math.max(1,host.clientWidth);
    for(const s of flights.shards){
      if(s.attached)continue;
      const flightMesh=flightMeshes[s.lane+1];
      const p=s.ticket.parcel, cr=Math.cos(s.roll), sr=Math.sin(s.roll);
      const cp=Math.cos(s.pitch), sp=Math.sin(s.pitch), ca=Math.cos(s.angle), sa=Math.sin(s.angle);
      const bank=s.landed?s.to:s.from,space=state[banks[bank.index].id].spacing/100;
      const bankRadius=Math.min(bank.sx*width,bank.sy*height*1.85)*mix(.86,.42,space)*p.extent;
      const closeRadius=clamp(Math.min(width,height)*.019,5*pixelRatio,15*pixelRatio)*(.86+.20*p.seed);
      const exposure=s.focus*(1-smooth((s.age/s.duration-.56)/.42));
      const depth=mix(bankDepth(s.from.index),bankDepth(s.to.index),clamp(s.age/s.duration))*(1-.29*s.near);
      const [px,py,scale]=camera.project(s.x+(s.x-.50)*s.near*.09,s.y+(s.y-.46)*s.near*.09,depth);
      const radius=mix(bankRadius,closeRadius,exposure)*scale/(1-.81*s.near);
      const parallax=height*.031*s.near;
      const centerX=px+look[0]*parallax,centerY=py+look[1]*parallax;
      const face=new Float32Array(9);
      for(let k=0;k<flightMesh.length;k+=15){
        for(let i=0;i<3;i++){
          const j=k+i*5, y=flightMesh[j+1]*(.73+.42*p.depth), z=flightMesh[j+2]*1.14;
          const x=flightMesh[j]+y*(p.seed-.5)*.72, ty=cr*y-sr*z, tz=sr*y+cr*z;
          const tx=cp*x+sp*tz;
          face[i*3]=ca*tx-sa*ty;face[i*3+1]=sa*tx+ca*ty;face[i*3+2]=-sp*x+cp*tz;
        }
        const ax=face[3]-face[0],ay=face[4]-face[1],az=face[5]-face[2];
        const bx=face[6]-face[0],by=face[7]-face[1],bz=face[8]-face[2];
        const nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
        if(nz<=0)continue;
        const n=Math.hypot(nx,ny,nz);
        const sun=clamp((-.55*nx-.72*ny+.42*nz)/n);
        const glint=Math.pow(clamp((-.33*nx-.42*ny+.845*nz)/n),12);
        const light=clamp(.13+.66*sun+.28*glint+.24*flightMesh[k+4]+.12*(flightMesh[k+3]-.5));
        const tri=out/24;
        depths[tri]=s.near+(face[2]+face[5]+face[8])*radius/(3*height);
        faceOrder.push(tri);
        for(let i=0;i<3;i++){
          const j=k+i*5;
          projected[out++]=centerX+radius*face[i*3];projected[out++]=centerY+radius*face[i*3+1];
          projected[out++]=light;projected[out++]=glint;projected[out++]=1-s.near;projected[out++]=s.alpha*shardLight;
          projected[out++]=.43+flightMesh[j]*.38+.10*p.seed;
          projected[out++]=.46+flightMesh[j+1]*.64+flightMesh[j+2]*.24+.12*p.depth;
        }
      }
    }
    // The folded underside can overlap its rim while turning edge-on. Paint
    // far to near in both backends so a rear facet never flashes through it.
    faceOrder.sort((a,b)=>depths[a]-depths[b]);
    for(let i=0;i<faceOrder.length;i++){
      const start=faceOrder[i]*24;
      for(let j=0;j<24;j++)facets[i*24+j]=projected[start+j];
    }
    facetCount=out/8;
  }
  function grainTexture(gl){
    // Periodic cellular noise can be sampled throughout the cloud in three
    // dimensions without evaluating dozens of neighbours per ray-march step.
    const size=48, data=new Uint8Array(size*size*size*4);
    for(const [channel,cells] of [4,9,18].entries()){
      const centers=new Float32Array(cells**3*3);
      for(let i=0;i<centers.length;i++)centers[i]=.10+.80*hash(i+31,channel+3);
      for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const px=x*cells/size,py=y*cells/size,pz=z*cells/size;
        const ix=Math.floor(px),iy=Math.floor(py),iz=Math.floor(pz);
        let nearest=2;
        for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const j=(((iz+dz+cells)%cells*cells+(iy+dy+cells)%cells)*cells+(ix+dx+cells)%cells)*3;
          const a=ix+dx+centers[j]-px,b=iy+dy+centers[j+1]-py,c=iz+dz+centers[j+2]-pz;
          nearest=Math.min(nearest,a*a+b*b+c*c);
        }
        const k=((z*size+y)*size+x)*4;
        data[k+channel]=Math.round(255*clamp(1-Math.sqrt(nearest)));
        if(!channel)data[k+3]=Math.round(255*hash(x+z*17,y+z));
      }
    }
    const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_3D,tex);
    gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA8,size,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
    gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    return tex;
  }
  function prepareGL(gl){
    const sky=program(gl,screenVertex,skyFragment,['uSize','uTime','uDusk','uMoon','uGalaxy','uOrbit','uBurst','uStreak','uNight','uSkyAxes','uLens','uRiverAir']);
    const volume=program(gl,volumeVertex,volumeFragment,['uSize','uSpan','uPosition','uWater','uGrain','uAir','uTime','uSeed','uDusk','uSpace']);
    const composite=program(gl,`#version 300 es
      uniform vec2 uSpan,uPosition;uniform mat3 uProjection;out vec2 vUV;
      void main(){vUV=vec2(gl_VertexID&1,(gl_VertexID>>1)&1);
        vec3 clip=uProjection*vec3(uPosition+(vUV-.5)*uSpan,1.);gl_Position=vec4(clip.xy,0.,clip.z);}`,`#version 300 es
      precision mediump float;
      in vec2 vUV; uniform sampler2D uBody,uPrevious; uniform float uBlend,uCloudLight,uNight,uMoonlight,uImmersion; out vec4 color;
      void main(){
        vec2 uv=vec2(vUV.x,1.-vUV.y);
        vec4 a=texture(uPrevious,uv),b=texture(uBody,uv);
        float alpha=mix(a.a,b.a,uBlend);
        vec3 daylight=mix(a.rgb*a.a,b.rgb*b.a,uBlend)/max(alpha,.0001);
        float rim=smoothstep(.39,.91,dot(daylight,vec3(.30,.59,.11)));
        vec3 moonlit=mix(vec3(.026,.043,.070),vec3(.17,.215,.28)*(.68+.32*uMoonlight),rim*rim);
        // Entering a denser part of the bank increases optical thickness along the ray.
        float coverage=alpha+alpha*(1.-alpha)*uImmersion;
        color=vec4(mix(daylight,moonlit,uNight),coverage*uCloudLight);
      }`,
      ['uProjection','uSpan','uPosition','uBody','uPrevious','uBlend','uCloudLight','uNight','uMoonlight','uImmersion']);
    const cloud=program(gl,shardVertex,shardFragment,['uSize','uSpan','uPosition','uLook','uSpace','uProjection']);
    const metal=program(gl,`#version 300 es
      layout(location=0) in vec2 aPosition;layout(location=1) in vec4 aFinish;layout(location=2) in vec2 aUV;
      uniform vec2 uSize;out vec4 vFinish;out vec2 vUV;
      void main(){gl_Position=vec4(aPosition/uSize*vec2(2.,-2.)+vec2(-1.,1.),0,1);vFinish=aFinish;vUV=aUV;}`,
      `#version 300 es
      precision mediump float;
      uniform sampler2D uCopper;in vec4 vFinish;in vec2 vUV;out vec4 color;
      void main(){
        vec3 base=texture(uCopper,vUV).rgb;
        float polished=smoothstep(.0,.32,base.r-base.g);
        vec3 lit=base*(.39+.80*vFinish.x)+vec3(.32,.28,.23)*vFinish.y*(.18+.82*polished);
        color=vec4(mix(lit,vec3(.78,.64,.60),.22*vFinish.z),vFinish.w);
      }`,['uSize','uCopper']);
    const plate=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,plate);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,copper);
    gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const flightVao=gl.createVertexArray(), flightBuffer=gl.createBuffer();
    gl.bindVertexArray(flightVao);gl.bindBuffer(gl.ARRAY_BUFFER,flightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,facets.byteLength,gl.DYNAMIC_DRAW);
    for(const [loc,n,offset] of [[0,2,0],[1,4,8],[2,2,24]]){
      gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,32,offset);
    }
    gl.bindVertexArray(null);
    const grain=grainTexture(gl);
    const chip=foldedFlake(), vertices=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,chip,gl.STATIC_DRAW);
    const gpu=weather.map((w,index)=>{
      const vao=gl.createVertexArray(), buffer=gl.createBuffer(), texture=gl.createTexture();
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,poses[index].byteLength,gl.DYNAMIC_DRAW);
      for(const [loc,n,offset] of [[2,4,0],[3,4,16],[4,4,32],[5,2,48]]){
        gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,poseStride*4,offset);gl.vertexAttribDivisor(loc,1);
      }
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,cols,rows,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      const bodies=[gl.createTexture(),gl.createTexture()],framebuffer=gl.createFramebuffer();
      for(const body of bodies){
        gl.bindTexture(gl.TEXTURE_2D,body);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      }
      return {vao,buffer,texture,bodies,front:0,framebuffer,version:-1,width:0,height:0};
    });
    return ()=>{
      gl.viewport(0,0,width,height);
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(sky.p);gl.bindVertexArray(null);
      const {moon,galaxy,light}=state;
      gl.uniform1f(sky.u.uRiverAir,riverAir);gl.uniform1f(sky.u.uNight,night);gl.uniform1f(sky.u.uLens,camera.lens);gl.uniformMatrix3fv(sky.u.uSkyAxes,false,camera.axes);
      gl.uniform2f(sky.u.uSize,width,height);gl.uniform1f(sky.u.uTime,time);gl.uniform1f(sky.u.uOrbit,celestial);
      gl.uniform1f(sky.u.uDusk,light.dusk/100);
      const [mx,my]=camera.project(moon.x/100,moon.y/100);
      gl.uniform3f(sky.u.uMoon,mx/width,my/height,moon.visible?moonRadius():0);
      gl.uniform3f(sky.u.uGalaxy,galaxy.x/100,galaxy.y/100,galaxy.visible?galaxy.density/100:0);
      gl.uniform1f(sky.u.uBurst,meteorLight());gl.uniform4fv(sky.u.uStreak,streak);
      gl.drawArrays(gl.TRIANGLES,0,3);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_3D,grain);gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      for(const i of bankOrder()){
        const bank=banks[i], layer=state[bank.id], w=weather[i], g=gpu[i];
        if(!layer.visible)continue;
        const dimensions=span(bank),projection=camera.plane(bankDepth(i)),positions=bankPositions(i),air=w.profile;
        if(!positions.length)continue;
        gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(null);
        // Cache the low-frequency scattering separately. Stars, shard edges and
        // the fast meteor head retain the full scene resolution and frame rate.
        const ratio=Math.min(.76,680/Math.max(...dimensions));
        const bw=Math.max(1,Math.round(dimensions[0]*ratio)),bh=Math.max(1,Math.round(dimensions[1]*ratio));
        const resized=g.width!==bw||g.height!==bh, changed=g.version!==w.version;
        if(resized){
          for(const body of g.bodies){
            gl.bindTexture(gl.TEXTURE_2D,body);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,bw,bh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
          }
          g.width=bw;g.height=bh;
        }
        const reset=resized||g.epoch!==w.epoch||g.dusk!==light.dusk||g.spacing!==layer.spacing;
        if(reset||changed){
          g.interpolate=!reset&&g.version+1===w.version;
          g.front=1-g.front;
          gl.useProgram(volume.p);gl.bindTexture(gl.TEXTURE_2D,g.texture);
          if(changed)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,cols,rows,gl.RGBA,gl.UNSIGNED_BYTE,w.texture);
          gl.bindFramebuffer(gl.FRAMEBUFFER,g.framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,g.bodies[g.front],0);
          gl.viewport(0,0,bw,bh);gl.disable(gl.BLEND);
          gl.uniform1i(volume.u.uWater,0);gl.uniform1i(volume.u.uGrain,1);gl.uniform2f(volume.u.uSize,bw,bh);
          gl.uniform2f(volume.u.uPosition,bw*.5,bh*.5);gl.uniform2f(volume.u.uSpan,bw,bh);
          gl.uniform4f(volume.u.uAir,air.height,air.lift,air.shear,air.optical);
          gl.uniform1f(volume.u.uSeed,bank.seed);gl.uniform1f(volume.u.uTime,w.time);
          gl.uniform1f(volume.u.uDusk,light.dusk/100);gl.uniform1f(volume.u.uSpace,layer.spacing/100);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
          gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.enable(gl.BLEND);
          g.epoch=w.epoch;g.version=w.version;g.spacing=layer.spacing;g.dusk=light.dusk;
        }
        gl.useProgram(composite.p);
        gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,g.bodies[1-g.front]);gl.uniform1i(composite.u.uPrevious,2);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,g.bodies[g.front]);gl.uniform1i(composite.u.uBody,0);
        gl.uniform1f(composite.u.uBlend,g.interpolate?w.blend:1);gl.uniform1f(composite.u.uCloudLight,cloudLight);
        gl.uniform1f(composite.u.uImmersion,immersion(i));gl.uniform1f(composite.u.uNight,cloudNight);gl.uniform1f(composite.u.uMoonlight,moon.visible?1:0);
        gl.uniformMatrix3fv(composite.u.uProjection,false,projection);gl.uniform2fv(composite.u.uSpan,dimensions);
        gl.useProgram(cloud.p);gl.bindVertexArray(g.vao);gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);
        if(w.count)gl.bufferSubData(gl.ARRAY_BUFFER,0,projectBank(i,...dimensions),0,w.count*poseStride);
        gl.uniformMatrix3fv(cloud.u.uProjection,false,projection);gl.uniform2f(cloud.u.uSize,width,height);gl.uniform2fv(cloud.u.uLook,look);
        gl.uniform2fv(cloud.u.uSpan,dimensions);gl.uniform1f(cloud.u.uSpace,layer.spacing/100);
        for(const pos of positions){
          gl.disable(gl.DEPTH_TEST);gl.useProgram(composite.p);gl.uniform2fv(composite.u.uPosition,pos);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
          gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
          gl.useProgram(cloud.p);gl.uniform2fv(cloud.u.uPosition,pos);
          gl.drawArraysInstanced(gl.TRIANGLES,0,chip.length/3,w.count);
        }
      }
      if(facetCount){
        gl.disable(gl.DEPTH_TEST);gl.useProgram(metal.p);gl.uniform2f(metal.u.uSize,width,height);
        gl.bindVertexArray(flightVao);gl.bindBuffer(gl.ARRAY_BUFFER,flightBuffer);
        gl.bindTexture(gl.TEXTURE_2D,plate);gl.uniform1i(metal.u.uCopper,0);
        gl.bufferSubData(gl.ARRAY_BUFFER,0,facets,0,facetCount*8);
        gl.drawArrays(gl.TRIANGLES,0,facetCount);
      }
    };
  }
  // High clouds are seen through lower cloud edges when their layers overlap.
  function bankOrder(){return [0,1,2].sort((a,b)=>weather[b].profile.height-weather[a].profile.height);}
  function meteorLight(){
    if(!meteor)return 0;
    const p=clamp(meteor.age/meteor.life), reach=(1-Math.exp(-8*p))*.46;
    const x=meteor.x+meteor.dx*p,y=meteor.y+meteor.dy*p;
    const head=camera.project(x,y),tail=camera.project(x-meteor.dx*reach,y-meteor.dy*reach);
    streak[0]=head[0]/width;streak[1]=head[1]/height;
    streak[2]=(head[0]-tail[0])/width;streak[3]=(head[1]-tail[1])/height;
    return smooth(p/.12)*(1-smooth((p-.60)/.40));
  }
  function span(bank){
    const size=state[bank.id].scale/100;
    return [bank.width*Math.max(width,height*.95)*size,bank.height*height*size];
  }
  function moonRadius(){return Math.max(4,height*mix(.0145,.018,night))*state.moon.scale/100;}
  function paintHorizon(){
    const layer=state.horizon;
    horizon.hidden=!layer.visible;
    if(!layer.visible)return;
    const top=layer.y/100;
    horizon.style.top='0';horizon.style.width='300%';horizon.style.height=(1.52-top)*100+'%';
    horizon.style.transformOrigin='0 0';
    const unitW=Math.min(width,900),unitH=unitW*height/width;
    horizon.width=3*unitW;horizon.height=Math.max(1,Math.round(unitH*(1.52-top)));
    const ctx=horizon.getContext('2d');if(!ctx)return;
    const h=unitH*(1-top),step=Math.max(1,unitW/1000),w=horizon.width;
    // Two ridgelines and a sparse foreground of roof parapets and trees.
    for(let level=0;level<2;level++){
      ctx.fillStyle=level?'#2a2833':'#5f5963';ctx.beginPath();ctx.moveTo(0,horizon.height);
      for(let x=0;x<=w+step;x+=step){
        const t=x/unitW-1;
        const ridge=h*(.40+.16*Math.sin(t*8+level)+.07*Math.sin(t*23+1)+level*.26);
        ctx.lineTo(x,ridge-hash(Math.floor(x/step),level)*Math.min(h*.08,4));
      }
      ctx.lineTo(w,horizon.height);ctx.closePath();ctx.fill();
    }
    ctx.fillStyle='#20232b';
    for(let i=0;i<360;i++){
      const x=hash(i+.02*Math.floor(i/120),9)*w, y=h*(.65+.12*Math.sin((x/unitW-1)*8+1));
      const unit=Math.min(unitW,unitH)*.0016, size=(1+hash(i,11)*2.8)*unit;
      if(i%5===0){ctx.fillRect(x,y-size,size*4.5,h);}
      else {ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();ctx.fillRect(x-unit*.4,y,unit,h);}
    }
    ctx.fillStyle='#20232b';ctx.fillRect(0,h,w,horizon.height-h);
  }
  function positionHorizon(){
    if(!horizon||horizon.hidden)return;
    const top=state.horizon.y/100,depth=4.9,cssW=host.clientWidth,cssH=host.clientHeight;
    const mid=camera.project(.5,top,depth),east=camera.project(.501,top,depth),down=camera.project(.5,top+.001,depth);
    const a=(east[0]-mid[0])*1000/width,b=(east[1]-mid[1])*1000/width;
    const c=(down[0]-mid[0])*1000/height,d=(down[1]-mid[1])*1000/height;
    const x=mid[0]*cssW/width-a*1.5*cssW-look[0]*3,y=mid[1]*cssH/height-b*1.5*cssW;
    horizon.style.transform=`matrix(${a},${b},${c},${d},${x},${y})`;
  }
  const softwareLayers=new Map();
  function softwareBank(bank,index){
    const w=weather[index], layer=state[bank.id], [bw,bh]=span(bank), positions=bankPositions(index);
    if(!positions.length)return;
    let cache=softwareLayers.get(bank.id);
    if(!cache){
      const canvas=document.createElement('canvas');canvas.width=cols;canvas.height=rows;
      const ctx=canvas.getContext('2d');
      const frame=ctx.createImageData(cols,rows);
      cache={canvas,ctx,frame,previous:new Uint8ClampedArray(frame.data.length),current:new Uint8ClampedArray(frame.data.length),version:-1};softwareLayers.set(bank.id,cache);
    }
    const dusk=state.light.dusk/100,exposure=Math.round(cloudNight*48)/48;
    const reset=cache.exposure!==exposure||cache.moon!==state.moon.visible||cache.space!==layer.spacing||cache.dusk!==dusk||cache.epoch!==w.epoch;
    if(reset||cache.version!==w.version){
      cache.interpolate=!reset&&cache.version+1===w.version;
      [cache.previous,cache.current]=[cache.current,cache.previous];
      const rgba=cache.current;
      for(let k=0;k<rgba.length;k+=4){
        const q=w.texture[k]/255, lit=smooth((w.texture[k+1]/255-.21)/.60);
        const rim=lit*lit*(state.moon.visible?1:.68);
        rgba[k]=mix(mix(135-46*dusk,255,lit),7+37*rim,exposure);
        rgba[k+1]=mix(mix(109-35*dusk,208,lit),11+44*rim,exposure);
        rgba[k+2]=mix(mix(115-17*dusk,159,lit),18+53*rim,exposure);
        rgba[k+3]=255*(1-Math.exp(-3.5*q*w.profile.optical*(1-.68*layer.spacing/100)));
      }
      cache.version=w.version;cache.exposure=exposure;cache.moon=state.moon.visible;cache.space=layer.spacing;cache.dusk=dusk;cache.epoch=w.epoch;
    }
    const blend=cache.interpolate?w.blend:1;
    if(blend===1)cache.frame.data.set(cache.current);
    else for(let k=0;k<cache.current.length;k+=4){
      const a=cache.previous[k+3]*(1-blend),b=cache.current[k+3]*blend,alpha=a+b;
      cache.frame.data[k+3]=alpha;
      if(alpha>0)for(let ch=0;ch<3;ch++)cache.frame.data[k+ch]=(a*cache.previous[k+ch]+b*cache.current[k+ch])/alpha;
    }
    const thickness=immersion(index);
    if(thickness>0)for(let k=3;k<cache.frame.data.length;k+=4){
      const alpha=cache.frame.data[k]/255;cache.frame.data[k]=255*(alpha+alpha*(1-alpha)*thickness);
    }
    cache.ctx.putImageData(cache.frame,0,0);
    const posed=projectBank(index,bw,bh);
    for(const [x,y] of positions){
      const depth=bankDepth(index),center=camera.project(x/width,y/height,depth);
      const east=camera.project((x+1)/width,y/height,depth),down=camera.project(x/width,(y+1)/height,depth);
      ctx2d.save();ctx2d.setTransform(east[0]-center[0],east[1]-center[1],down[0]-center[0],down[1]-center[1],center[0],center[1]);
      paintSoftwareBank(w,layer,cache.canvas,posed,-bw/2,-bh/2,bw,bh);ctx2d.restore();
    }
  }
  const bankTones=Array.from({length:96},(_,i)=>{
    const shade=i/95,warm=Math.min(1,shade*1.6),glow=smooth((shade-.54)/.46);
    const tone=(a,b,c)=>Math.round(255*mix(mix(a,b,warm),c,glow));
    return 'rgb('+tone(.49,.86,1)+','+tone(.36,.58,.88)+','+tone(.36,.44,.69)+')';
  });
  function paintSoftwareBank(w,layer,body,posed,ox,oy,bw,bh){
    const c=ctx2d;
    c.globalAlpha=cloudLight;c.drawImage(body,ox,oy,bw,bh);c.globalAlpha=1;
    const scale=Math.min(bw,bh*1.85)*mix(.86,.42,layer.spacing/100);
    for(let i=0;i<w.count;i++){
      const k=i*poseStride,r=posed[k+3]*scale,shift=posed[k+2]*height*.022;
      const x=ox+posed[k]*bw+look[0]*shift,y=oy+posed[k+1]*bh+look[1]*shift;
      const ax=r*posed[k+4],ay=r*posed[k+5];
      for(let wing=0;wing<2;wing++){
        const wx=r*posed[k+6+2*wing],wy=r*posed[k+7+2*wing],[back,front,breadth]=wingTips[wing];
        c.fillStyle=bankTones[Math.round(posed[k+10+wing]*95)];c.globalAlpha=posed[k+12+wing];
        c.beginPath();c.moveTo(x-.92*ax,y-.92*ay);c.lineTo(x+ax*back+wx,y+ay*back+wy);
        c.lineTo(x+ax*front+wx*breadth,y+ay*front+wy*breadth);c.lineTo(x+ax,y+ay);c.fill();
      }
    }
    c.globalAlpha=1;
  }
  // Stable sky coordinates keep individual stars recognizable on the return trip.
  let starSeed=0x8d3ba752;
  function randomStar(){starSeed^=starSeed<<13;starSeed^=starSeed>>>17;starSeed^=starSeed<<5;return (starSeed>>>0)/4294967296;}
  const softwareStarField=Array.from({length:4900},()=>({x:(randomStar()-.5)*4.6,y:(randomStar()-.5)*2.6,
    flux:.10+.8*randomStar()**4,radius:.38+.65*randomStar()**3,threshold:randomStar(),phase:randomStar()*6.28}));
  function softwareStars(c,galaxy){
    const angle=celestial*.0038,ca=Math.cos(angle),sa=Math.sin(angle),aspect=width/height;
    const centerX=galaxy.x/100,centerY=galaxy.y/100,{moon}=state;
    const [mx,my]=camera.project(moon.x/100,moon.y/100),r=moon.visible?moonRadius():0;
    c.fillStyle='#e3e9ef';
    for(const star of softwareStarField){
      const u=star.x-.07,v=star.y+.72;
      const x=centerX+(.07+ca*u-sa*v)/aspect,y=centerY-.72+sa*u+ca*v;
      if(star.threshold>galaxy.density/100)continue;
      const [px,py]=camera.project(x,y);
      if(px<0||px>width||py<0||py>height||(px-mx)**2+(py-my)**2<r*r)continue;
      const elevation=py/height,air=mix(1-smooth((elevation-.40)/.55),1-.78*smooth((elevation-.66)/.34),night);
      c.globalAlpha=star.flux*air*(.91+.09*Math.sin(time*.68+star.phase));
      c.beginPath();c.arc(px,py,star.radius,0,Math.PI*2);c.fill();
    }
    c.globalAlpha=1;
  }
  let lunarDisc,lunarKey='';
  function softwareMoon(c,moon){
    const r=moonRadius(),[x,y]=camera.project(moon.x/100,moon.y/100);
    const halo=c.createRadialGradient(x,y,0,x,y,r*5.5);
    halo.addColorStop(0,'rgba(165,175,189,.16)');halo.addColorStop(.32,'rgba(145,156,171,.065)');halo.addColorStop(1,'rgba(145,156,171,0)');
    c.fillStyle=halo;c.fillRect(x-r*5.5,y-r*5.5,r*11,r*11);
    const radius=Math.ceil(r),exposure=Math.round(night*32)/32,key=radius+'/'+exposure;
    if(key!==lunarKey){
      if(!lunarDisc)lunarDisc=document.createElement('canvas');
      const size=2*radius+2;lunarDisc.width=lunarDisc.height=size;
      const ctx=lunarDisc.getContext('2d'),frame=ctx.createImageData(size,size);
      for(let iy=0,k=0;iy<size;iy++)for(let ix=0;ix<size;ix++,k+=4){
        const px=(ix+.5-size/2)/radius,py=(iy+.5-size/2)/radius,d=px*px+py*py;
        const cover=clamp((1-Math.sqrt(d))*radius+.5);if(!cover)continue;
        const light=.82*px-.24*py-.54*Math.sqrt(Math.max(0,1-d));
        const lit=smooth((light+.015)/.08),shade=(.84+.16*Math.max(0,light))*(.94+.06*hash(ix+.3,iy+.9));
        frame.data[k]=mix(25,252*shade,lit);frame.data[k+1]=mix(32,(236+10*exposure)*shade,lit);
        frame.data[k+2]=mix(40,(194+33*exposure)*shade,lit);frame.data[k+3]=255*cover*mix(.26*exposure,1,lit);
      }
      ctx.putImageData(frame,0,0);lunarKey=key;
    }
    c.drawImage(lunarDisc,x-r-1,y-r-1,2*r+2,2*r+2);
  }
  function softwareMeteor(c){
    const strength=meteorLight();if(!strength)return;
    const x=streak[0]*width,y=streak[1]*height,tx=x-streak[2]*width,ty=y-streak[3]*height;
    const grad=c.createLinearGradient(tx,ty,x,y);grad.addColorStop(0,'transparent');
    grad.addColorStop(.7,'rgba(197,205,235,'+strength*.48+')');grad.addColorStop(1,'rgba(255,240,210,'+strength+')');
    c.strokeStyle=grad;c.lineWidth=Math.max(1.1,height*.0018);c.beginPath();c.moveTo(tx,ty);c.lineTo(x,y);c.stroke();
    c.fillStyle='rgba(255,245,222,'+strength+')';c.beginPath();c.arc(x,y,c.lineWidth,0,Math.PI*2);c.fill();
  }
  function fallback(){
    const c=ctx2d,{light,moon,galaxy}=state,d=light.dusk/100;
    const rgb=(a,b,twilight,n)=>'rgb('+a.map((v,i)=>Math.round(mix(mix(mix(v,b[i],d),twilight[i],smooth(night/.64)),n[i],smooth((night-.32)/.68)))).join(',')+')';
    const sky=c.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,rgb([99,115,125],[36,51,69],[27,41,65],[5,9,18]));
    sky.addColorStop(.62,rgb([168,179,179],[92,120,135],[64,84,108],[15,24,38]));
    sky.addColorStop(1,rgb([245,219,178],[184,163,163],[166,122,108],[43,48,57]));c.fillStyle=sky;c.fillRect(0,0,width,height);
    if(galaxy.visible)softwareStars(c,galaxy);
    softwareMeteor(c);
    if(moon.visible)softwareMoon(c,moon);
    if(riverAir>0){
      // Mask only the distant air. Draw all foreground banks after the mask.
      const opening=c.createLinearGradient(0,0,0,height);
      opening.addColorStop(0,'rgba(0,0,0,'+smooth((riverAir*1.12-.58)/.40)+')');
      opening.addColorStop(1,'rgba(0,0,0,'+smooth((riverAir*1.12-.09)/.40)+')');
      c.globalCompositeOperation='destination-out';c.fillStyle=opening;c.fillRect(0,0,width,height);c.globalCompositeOperation='source-over';
    }
    for(const i of bankOrder()){if(state[banks[i].id].visible)softwareBank(banks[i],i);}
    for(let k=0;k<facetCount*8;k+=24){
      const x=facets[k],y=facets[k+1],ax=facets[k+8]-x,ay=facets[k+9]-y;
      const bx=facets[k+16]-x,by=facets[k+17]-y,light=facets[k+2];
      c.save();c.globalAlpha=facets[k+5];c.beginPath();c.moveTo(x,y);c.lineTo(x+ax,y+ay);c.lineTo(x+bx,y+by);c.closePath();c.clip();
      c.fillStyle='rgb('+Math.round(109+140*light)+','+Math.round(63+123*light)+','+Math.round(47+99*light)+')';
      c.fillRect(x-Math.abs(ax)-Math.abs(bx),y-Math.abs(ay)-Math.abs(by),2*(Math.abs(ax)+Math.abs(bx)),2*(Math.abs(ay)+Math.abs(by)));
      const u=facets[k+6],v=facets[k+7],au=facets[k+14]-u,av=facets[k+15]-v,bu=facets[k+22]-u,bv=facets[k+23]-v;
      const det=au*bv-av*bu;
      const surface=smooth((.93-facets[k+4])/.24);
      if(surface>.001&&Math.abs(det)>.0001){
        c.globalAlpha=facets[k+5]*surface;
        const a=(ax*bv-bx*av)/det,b=(ay*bv-by*av)/det,d=(by*au-ay*bu)/det,e=(bx*au-ax*bu)/det;
        c.transform(a,b,e,d,x-a*u-e*v,y-b*u-d*v);c.drawImage(copper,0,0,1,1);
        c.fillStyle=light<.58?'rgba(46,31,33,'+(.52-light*.65)+')':'rgba(255,228,193,'+(.10+.46*facets[k+3])+')';
        c.fillRect(0,0,1,1);
      }
      c.restore();
    }
  }
  function moveAllowed(){
    const mode=host.getAttribute('motion');
    return mode==='animate'||(mode==='system'&&!reduced.matches);
  }
  const passage=window.StudioFlight;
  let riverAir=0,passSequence=-1,descent=null;
  function skyHidden(){return forced.matches||document.hidden||host.hasAttribute('suspended')||(host.hasAttribute('waterfront')&&!passage?.active);}
  function immersion(index){return passage?.active&&descent?.index===index?descent.thickness:0;}
  function cloudApproach(){
    // Aim for condensed water, not the centre of a bank's bounding rectangle.
    // Rotating the screen or hiding a layer still leaves a safe route through open air.
    let best=-Infinity,anchor={index:-1,x:.42,y:.67,depth:3.2};
    for(const v of cloudViews(state,weather,width/height,()=>[-.2,1.2])){
      for(let j=2;j<9;j++)for(let i=2;i<11;i++){
        const u=i/12,t=j/10,x=v.cx+(u-.5)*v.sx,y=v.cy+(t-.5)*v.sy;
        if(x<.13||x>.88||y<.42||y>.91)continue;
        const mass=weather[v.index].densityAt(u,t);
        const score=mass*1.8-Math.abs(x-.43)*.61-Math.abs(y-.71)*1.56;
        if(mass>.025&&score>best){best=score;anchor={index:v.index,x,y,depth:bankDepth(v.index)};}
      }
    }
    return anchor;
  }
  function descentPose(){
    if(!passage?.active){riverAir=0;return null;}
    const {progress:p,phase,sequence}=passage;
    if(passSequence!==sequence){
      descent=cloudApproach();
      passSequence=sequence;
    }
    descent.approach=phase(0,.61,p);descent.drop=phase(.34,.84,p);
    descent.thickness=phase(.09,.33,p)*(1-phase(.43,.70,p));
    descent.bank=descent.approach*(1-phase(.46,.89,p));
    riverAir=phase(.22,.66,p);
    return descent;
  }
  function frame(now){
    raf=0;if(skyHidden())return;
    const moving=moveAllowed()&&state.light.wind>0;
    const interval=renderGL?1000/(camera.moving||passage?.active||location.hash.startsWith('#sky')?60:30):1000/24;
    if(dirty||!last||now-last>=interval-1){
      updateCameraClock(now);camera.aim(width,height,descentPose());
      // Let the foreground keep its last warm rim as the higher sky darkens.
      night=clamp((camera.position-.94)/1.06);cloudNight=Math.max(smooth((camera.position-1.20)/.80),riverAir*.58);
      cloudLight=mix(1,.52,cloudNight);shardLight=mix(1,.012,cloudNight);
      const dt=moving&&last?Math.min((now-last)/1000,.35)*state.light.wind/45:0;
      if(dt){
        time+=dt;celestial+=dt*state.galaxy.drift/50*(1-.93*night);
        for(const w of weather)w.advance(dt);
        if(state.galaxy.visible&&state.galaxy.meteors)meteor=meteorClock.advance(dt,state.galaxy.meteors);
      }
      for(let i=0;i<2;i++)look[i]=moving?mix(look[i],target[i],1-Math.exp(-dt*3.1)):0;
      views=cloudViews(state,weather,width/height,i=>camera.coverage(bankDepth(i)));
      for(const v of views){
        const depth=(1-weather[v.index].profile.height)*.017;
        v.cx+=look[0]*depth*height/width;v.cy+=look[1]*depth;
      }
      flights.advance(dt,views,width/height);projectFlights();
      positionHorizon();
      if(renderGL)renderGL();else if(ctx2d)fallback();
      dirty=false;last=now;
    }
    if((moving||camera.moving||passage?.active)&&!failed)raf=requestAnimationFrame(frame);
  }
  function wake(){dirty=true;if(!raf&&!skyHidden())raf=requestAnimationFrame(frame);}
  function updateCameraClock(now){
    if(cameraClock)camera.advance(Math.max(0,(now-cameraClock)/1000));
    cameraClock=now;
  }
  function sync(){
    cancelAnimationFrame(raf);raf=0;last=0;
    if(skyHidden())cameraClock=0;
    else updateCameraClock(performance.now());
    camera.go(passage?.active?passage.skyStage:host.getAttribute('sky-stage'),moveAllowed()&&cameraReady&&!skyHidden());
    cameraReady=host.hasAttribute('sky-stage');
    if(!moveAllowed()||skyHidden()){meteor=null;meteorClock.clear();}
    wake();
  }
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1.5,1700/Math.max(1,host.clientWidth,host.clientHeight));
    width=Math.max(1,Math.round(host.clientWidth*ratio));height=Math.max(1,Math.round(host.clientHeight*ratio));
    canvas.width=width;canvas.height=height;paintHorizon();wake();
  }
  function start(){
    let gl;
    try{gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:true,depth:true,powerPreference:'low-power'});if(gl)renderGL=prepareGL(gl);}catch{/* Use the same model with a software painter. */}
    if(!renderGL){
      if(gl){const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;}
      ctx2d=canvas.getContext('2d');failed=!ctx2d;
    }
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();cancelAnimationFrame(raf);raf=0;renderGL=null;
      const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;
      ctx2d=canvas.getContext('2d');failed=!ctx2d;resize();
    },{once:true});
    resize();
  }
  new ResizeObserver(resize).observe(host);
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['motion','suspended','sky-stage','waterfront','studio-flight']});
  reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&moveAllowed())target=[e.clientX/innerWidth-.5,e.clientY/innerHeight-.5];},{passive:true});
  window.SunsetScene.layerPoint=(id,x,y)=>{
    const index=banks.findIndex(bank=>bank.id===id),depth=index>=0?bankDepth(index):id==='horizon'?4.9:Infinity;
    return camera.unproject(x,y,depth);
  };
  window.SunsetScene.update=next=>{const horizonChanged=state.horizon.y!==next.horizon.y||state.horizon.visible!==next.horizon.visible;
    if((state.light.wind===0)!==(next.light.wind===0))last=0;
    state=structuredClone(next);
    banks.forEach((bank,i)=>weather[i].configure(state[bank.id].type,state.light.humidity,!moveAllowed()||!state.light.wind||!time));
    if(!state.galaxy.visible||!state.galaxy.meteors||!state.light.wind){meteor=null;meteorClock.clear();}
    if(horizonChanged)paintHorizon();wake();};
  start();
})();
