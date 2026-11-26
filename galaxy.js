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
      float radius=mix(.44,.98,pow(size,4.))*clamp(uSize.y/800.,.72,1.25);
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
      vec3 sky=mix(top,waist,smoothstep(-.12,.77,h));
      sky=mix(sky,bottom,smoothstep(.43,1.04,h));
      sky+=vec3(.10,.043,.018)*exp(-length((uv-vec2(.21,.87))*vec2(1.5,3.)));
      vec2 pole=vec2(.07,-.72), relative=(uv-uGalaxy.xy)*aspect-pole;
      float angle=uOrbit*.0038;
      vec2 skyPos=pole+mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*relative;
      float bend=.05*sin(skyPos.x*3.8);
      float crossBand=skyPos.y+skyPos.x*.53+bend;
      float band=exp(-crossBand*crossBand/.027);
      vec2 grain=vec2(skyPos.x*6.+3.,crossBand*15.);
      grain+=vec2(mist(grain*.56+8.),mist(grain*.86-2.))*.92;
      float dust=.76*mist(grain)+.24*mist(grain*3.7+31.);
      float air=(1.-smoothstep(.37,.90,h))*uGalaxy.z;
      sky+=vec3(.19,.167,.209)*band*(dust-.22)*air;
      for(int k=0;k<3;k++){
        float layer=float(k)/3.;
        sky+=StarLayer(skyPos+vec2(.0010,-.00024)*uOrbit*(layer+.3),
          mix(16.,48.,layer),layer,uGalaxy.z,band)*air*(.91-.23*layer);
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
      vec2 moon=(uv-uMoon.xy)*uSize, rvec=moon;
      float radius=uMoon.z, aa=.85;
      float disk=1.-smoothstep(radius-aa,radius+aa,length(rvec));
      float cut=smoothstep(radius*.93-aa,radius*.93+aa,length(rvec+vec2(.43,.14)*radius));
      float crescent=disk*cut*step(.1,radius);
      sky+=vec3(.12,.092,.052)*exp(-length(moon)/max(1.,radius*1.35))*step(.1,radius);
      sky=mix(sky,vec3(1.,.925,.76),crescent);
      sky+=(Hash21(gl_FragCoord.xy)-.5)*.006;
      color=vec4(sky,1.);
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
    float material(vec2 uv,float z){
      vec2 travel=vec2(.008+.008*uAir.z,-.005*uAir.y)*uTime;
      vec3 p=vec3((uv-travel)*vec2(1.23-.47*uAir.z,.86+.44*uAir.z),z*.24)+uSeed*.073;
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
        float rho=material(uv,z);
        if(rho<.003)continue;
        float nearSun=material(uv+vec2(-.023,-.038),z+.16);
        float middleSun=material(uv+vec2(-.057,-.082),z+.34);
        float farSun=texture(uWater,uv+vec2(-.093,-.127)).r;
        float slope=clamp(.49+(rho-nearSun)*1.66,0.,1.);
        float sunlight=exp(-(nearSun*1.30+middleSun*1.27+farSun*.65)*depthScale);
        vec4 grain=texture(uGrain,vec3((uv-vec2(.008,-.003)*uTime)*4.3,z*.34)+uSeed*.073);
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
    layout(location=1) in vec2 aFace;
    layout(location=2) in vec4 aParcel;
    layout(location=3) in vec4 aShape;
    layout(location=4) in vec2 aSeed;
    uniform vec2 uSize,uSpan,uPosition,uLook;
    uniform float uTime,uSpace,uDusk;
    out vec4 vColor;
    void main(){
      float scale=min(uSpan.x,uSpan.y*1.85)*aParcel.w*mix(.80,.35,uSpace);
      vec2 chip=aCorner.xy;
      chip.y*=aShape.y;
      chip.x+=chip.y*(aSeed.x-.5)*1.17;
      float flutter=.20*sin(uTime*(.28+.30*aSeed.x)+6.283*aSeed.y);
      float turn=aShape.x+flutter;
      vec2 offset=mat2(cos(turn),sin(turn),-sin(turn),cos(turn))*chip;
      vec2 pos=uPosition+(aParcel.xy-.5)*uSpan+offset*scale;
      pos.y-=aCorner.z*scale*.49;
      pos+=uLook*aParcel.z*uSize.y*.022;
      gl_Position=vec4(pos/uSize*vec2(2.,-2.)+vec2(-1.,1.),-aParcel.z-aCorner.z*scale/uSpan.y,1.);
      float light=clamp(aShape.z+(aFace.x-.5)*.21+(aSeed.x-.5)*.12+flutter*.13,0.,1.);
      vec3 shadow=mix(vec3(.64,.46,.45),vec3(.52,.39,.41),uDusk);
      vec3 body=mix(shadow,vec3(.89,.62,.53),smoothstep(.14,.78,light));
      body=mix(body,vec3(1.,.86,.67),smoothstep(.60,.96,light));
      vec3 lip=mix(shadow*.89,vec3(1.,.87,.72),smoothstep(.42,.87,light));
      float facing=.5+.5*sin(uTime*(.39+.26*aSeed.y)+aSeed.x*53.+aShape.x*1.8);
      float glint=pow(facing,10.)*smoothstep(.35,.73,light);
      vec3 reflection=mix(mix(body,lip,aFace.y),vec3(1.,.87,.72),glint*.87);
      vColor=vec4(reflection,.08+.15*aShape.w+.49*glint*aShape.w);
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
  function prism(){
    // Shared bevelled AeroShards lance. Parcel attributes vary its aspect,
    // shear and pitch so the formation can change without rebuilding a mesh.
    const rim=[[1,0,0],[.08,.54,0],[-.70,.29,0],[-.81,-.16,0],[-.18,-.48,0]];
    const data=[];
    function face(a,b,c,light,edge){for(const p of [a,b,c])data.push(...p,light,edge);}
    rim.forEach((a,i)=>{
      const b=rim[(i+1)%rim.length], lowerA=[a[0],a[1],-.082], lowerB=[b[0],b[1],-.082];
      const light=.5+.47*Math.sin(i*1.26+.8);
      face(a,b,[0,0,.11],light,0);face(a,lowerA,b,light,1);face(b,lowerA,lowerB,light,1);
    });
    return new Float32Array(data);
  }
  function bankPositions(index){
    return views.filter(v=>v.index===index).map(v=>[v.cx*width,v.cy*height]);
  }
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
  let facetCount=0;
  function projectFlights(){
    // Rotate each folded sheet in three axes. Both renderers see the
    // same silhouette and copper reflections, including during an edge-on turn.
    let out=0;
    const pixelRatio=width/Math.max(1,host.clientWidth);
    for(const s of flights.shards){
      const flightMesh=flightMeshes[s.lane+1];
      const p=s.ticket.parcel, cr=Math.cos(s.roll), sr=Math.sin(s.roll);
      const cp=Math.cos(s.pitch), sp=Math.sin(s.pitch), ca=Math.cos(s.angle), sa=Math.sin(s.angle);
      const radius=clamp(Math.min(width,height)*.019,5*pixelRatio,15*pixelRatio)
        *(.86+.20*p.seed)*(.26+.74*s.focus)/(1-.81*s.near);
      const parallax=height*.031*s.near;
      const centerX=(s.x+(s.x-.50)*s.near*.09)*width+look[0]*parallax;
      const centerY=(s.y+(s.y-.46)*s.near*.09)*height+look[1]*parallax;
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
        for(let i=0;i<3;i++){
          const j=k+i*5;
          facets[out++]=centerX+radius*face[i*3];facets[out++]=centerY+radius*face[i*3+1];
          facets[out++]=light;facets[out++]=glint;facets[out++]=1-s.near;facets[out++]=s.alpha;
          facets[out++]=.43+flightMesh[j]*.38+.10*p.seed;
          facets[out++]=.46+flightMesh[j+1]*.64+flightMesh[j+2]*.24+.12*p.depth;
        }
      }
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
    const sky=program(gl,screenVertex,skyFragment,['uSize','uTime','uDusk','uMoon','uGalaxy','uOrbit','uBurst','uStreak']);
    const volume=program(gl,volumeVertex,volumeFragment,['uSize','uSpan','uPosition','uWater','uGrain','uAir','uTime','uSeed','uDusk','uSpace']);
    const composite=program(gl,volumeVertex,`#version 300 es
      precision mediump float;
      in vec2 vUV; uniform sampler2D uBody; out vec4 color;
      void main(){color=texture(uBody,vec2(vUV.x,1.-vUV.y));}`,
      ['uSize','uSpan','uPosition','uBody']);
    const cloud=program(gl,shardVertex,shardFragment,['uSize','uTime','uDusk','uSpan','uPosition','uLook','uSpace']);
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
    const chip=prism(), vertices=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,chip,gl.STATIC_DRAW);
    const gpu=weather.map(w=>{
      const vao=gl.createVertexArray(), buffer=gl.createBuffer(), texture=gl.createTexture();
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
      for(const [loc,n,offset] of [[0,3,0],[1,2,12]]){
        gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,20,offset);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,w.stream.byteLength,gl.DYNAMIC_DRAW);
      for(const [loc,n,offset] of [[2,4,0],[3,4,16],[4,2,32]]){
        gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,40,offset);gl.vertexAttribDivisor(loc,1);
      }
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,cols,rows,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      const body=gl.createTexture(), framebuffer=gl.createFramebuffer();
      gl.bindTexture(gl.TEXTURE_2D,body);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,body,0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      return {vao,buffer,texture,body,framebuffer,version:-1,width:0,height:0,lastBodyTime:-1};
    });
    return ()=>{
      gl.viewport(0,0,width,height);
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(sky.p);gl.bindVertexArray(null);
      const {moon,galaxy,light}=state;
      gl.uniform2f(sky.u.uSize,width,height);gl.uniform1f(sky.u.uTime,time);gl.uniform1f(sky.u.uOrbit,celestial);
      gl.uniform1f(sky.u.uDusk,light.dusk/100);
      gl.uniform3f(sky.u.uMoon,moon.x/100,moon.y/100,moon.visible?moonRadius():0);
      gl.uniform3f(sky.u.uGalaxy,galaxy.x/100,galaxy.y/100,galaxy.visible?galaxy.density/100:0);
      gl.uniform1f(sky.u.uBurst,meteorLight());gl.uniform4fv(sky.u.uStreak,streak);
      gl.drawArrays(gl.TRIANGLES,0,3);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_3D,grain);gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      for(const i of bankOrder()){
        const bank=banks[i], layer=state[bank.id], w=weather[i], g=gpu[i];
        if(!layer.visible)continue;
        const dimensions=span(bank), positions=bankPositions(i), air=w.profile;
        if(!positions.length)continue;
        gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(null);
        // Cache the low-frequency scattering separately. Stars, shard edges and
        // the fast meteor head retain the full scene resolution and frame rate.
        const ratio=Math.min(.76,680/Math.max(...dimensions));
        const bw=Math.max(1,Math.round(dimensions[0]*ratio)),bh=Math.max(1,Math.round(dimensions[1]*ratio));
        const resized=g.width!==bw||g.height!==bh, changed=g.version!==w.version;
        if(resized){
          gl.bindTexture(gl.TEXTURE_2D,g.body);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,bw,bh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
          g.width=bw;g.height=bh;
        }
        if(resized||changed||g.dusk!==light.dusk||g.spacing!==layer.spacing||w.time-g.lastBodyTime>=.12){
          gl.useProgram(volume.p);gl.bindTexture(gl.TEXTURE_2D,g.texture);
          if(changed)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,cols,rows,gl.RGBA,gl.UNSIGNED_BYTE,w.texture);
          gl.bindFramebuffer(gl.FRAMEBUFFER,g.framebuffer);gl.viewport(0,0,bw,bh);gl.disable(gl.BLEND);
          gl.uniform1i(volume.u.uWater,0);gl.uniform1i(volume.u.uGrain,1);gl.uniform2f(volume.u.uSize,bw,bh);
          gl.uniform2f(volume.u.uPosition,bw*.5,bh*.5);gl.uniform2f(volume.u.uSpan,bw,bh);
          gl.uniform4f(volume.u.uAir,air.height,air.lift,air.shear,air.optical);
          gl.uniform1f(volume.u.uSeed,bank.seed);gl.uniform1f(volume.u.uTime,w.time);
          gl.uniform1f(volume.u.uDusk,light.dusk/100);gl.uniform1f(volume.u.uSpace,layer.spacing/100);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
          gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.enable(gl.BLEND);
          g.lastBodyTime=w.time;g.version=w.version;g.spacing=layer.spacing;g.dusk=light.dusk;
        }
        gl.useProgram(composite.p);gl.bindTexture(gl.TEXTURE_2D,g.body);gl.uniform1i(composite.u.uBody,0);
        gl.uniform2f(composite.u.uSize,width,height);gl.uniform2fv(composite.u.uSpan,dimensions);
        gl.useProgram(cloud.p);gl.bindVertexArray(g.vao);gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);
        if(w.count)gl.bufferSubData(gl.ARRAY_BUFFER,0,w.stream,0,w.count*10);
        gl.uniform2f(cloud.u.uSize,width,height);gl.uniform2fv(cloud.u.uLook,look);
        gl.uniform1f(cloud.u.uTime,w.time);gl.uniform1f(cloud.u.uDusk,light.dusk/100);
        gl.uniform2fv(cloud.u.uSpan,dimensions);gl.uniform1f(cloud.u.uSpace,layer.spacing/100);
        for(const pos of positions){
          gl.disable(gl.DEPTH_TEST);gl.useProgram(composite.p);gl.uniform2fv(composite.u.uPosition,pos);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
          gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
          gl.useProgram(cloud.p);gl.uniform2fv(cloud.u.uPosition,pos);
          gl.drawArraysInstanced(gl.TRIANGLES,0,chip.length/5,w.count);
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
    streak[0]=meteor.x+meteor.dx*p;streak[1]=meteor.y+meteor.dy*p;
    streak[2]=meteor.dx*reach;streak[3]=meteor.dy*reach;
    return smooth(p/.12)*(1-smooth((p-.60)/.40));
  }
  function span(bank){
    const size=state[bank.id].scale/100;
    return [bank.width*Math.max(width,height*.95)*size,bank.height*height*size];
  }
  function moonRadius(){return Math.max(4,height*.0145)*state.moon.scale/100;}
  function paintHorizon(){
    const layer=state.horizon;
    horizon.hidden=!layer.visible;
    if(!layer.visible)return;
    const top=layer.y/100;
    horizon.style.top=top*100+'%';
    horizon.style.height=(1-top)*100+'%';
    horizon.width=width;horizon.height=Math.max(1,Math.round(height*(1-top)));
    const ctx=horizon.getContext('2d');if(!ctx)return;
    const h=horizon.height, step=Math.max(1,width/1300);
    // Two ridgelines and a sparse foreground of roof parapets and trees.
    for(let level=0;level<2;level++){
      ctx.fillStyle=level?'#2a2833':'#5f5963';ctx.beginPath();ctx.moveTo(0,h);
      for(let x=0;x<=width+step;x+=step){
        const t=x/width;
        const ridge=h*(.40+.16*Math.sin(t*8+level)+.07*Math.sin(t*23+1)+level*.26);
        ctx.lineTo(x,ridge-hash(Math.floor(x/step),level)*Math.min(h*.08,4));
      }
      ctx.lineTo(width,h);ctx.closePath();ctx.fill();
    }
    ctx.fillStyle='#20232b';
    for(let i=0;i<120;i++){
      const x=hash(i,9)*width, y=h*(.65+.12*Math.sin(x/width*8+1));
      const unit=Math.min(width,height)*.0016, size=(1+hash(i,11)*2.8)*unit;
      if(i%5===0){ctx.fillRect(x,y-size,size*4.5,h);}
      else {ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();ctx.fillRect(x-unit*.4,y,unit,h);}
    }
  }
  const softwareLayers=new Map();
  function softwareBank(bank,index){
    const w=weather[index], layer=state[bank.id], [bw,bh]=span(bank), positions=bankPositions(index);
    if(!positions.length)return;
    let cache=softwareLayers.get(bank.id);
    if(!cache){
      const canvas=document.createElement('canvas');canvas.width=cols;canvas.height=rows;
      const ctx=canvas.getContext('2d');
      cache={canvas,ctx,frame:ctx.createImageData(cols,rows),version:-1};softwareLayers.set(bank.id,cache);
    }
    const dusk=state.light.dusk/100;
    if(cache.version!==w.version||cache.space!==layer.spacing||cache.dusk!==dusk){
      const rgba=cache.frame.data;
      for(let k=0;k<rgba.length;k+=4){
        const q=w.texture[k]/255, lit=smooth((w.texture[k+1]/255-.21)/.60);
        rgba[k]=mix(135-46*dusk,255,lit);rgba[k+1]=mix(109-35*dusk,208,lit);rgba[k+2]=mix(115-17*dusk,159,lit);
        rgba[k+3]=255*(1-Math.exp(-3.5*q*w.profile.optical*(1-.68*layer.spacing/100)));
      }
      cache.ctx.putImageData(cache.frame,0,0);cache.version=w.version;cache.space=layer.spacing;cache.dusk=dusk;
    }
    for(const [x,y] of positions)paintSoftwareBank(w,layer,cache.canvas,x-bw/2,y-bh/2,bw,bh);
  }
  function paintSoftwareBank(w,layer,body,ox,oy,bw,bh){
    const c=ctx2d, stream=w.stream;
    c.drawImage(body,ox,oy,bw,bh);
    const scale=Math.min(bw,bh*1.85)*mix(.80,.35,layer.spacing/100);
    for(let i=0;i<w.count;i++){
      const k=i*10, x=ox+stream[k]*bw,y=oy+stream[k+1]*bh,r=stream[k+3]*scale;
      if(x<-r||y<-r||x>width+r||y>height+r)continue;
      const angle=stream[k+4]+.2*Math.sin(w.time*.4+stream[k+9]*6.28);
      const ax=r*Math.cos(angle),ay=r*Math.sin(angle),thin=stream[k+5]*.52;
      const lit=smooth((stream[k+6]-.2+(stream[k+8]-.5)*.13)/.6);
      const facing=.5+.5*Math.sin(w.time*(.39+.26*stream[k+9])+stream[k+8]*53+angle*1.8);
      const glint=facing**10*smooth((lit-.35)/.38), reflection=mix(lit,1,glint);
      c.fillStyle='rgba('+Math.round(mix(136,255,reflection))+','+Math.round(mix(98,222,reflection))+','+Math.round(mix(99,184,reflection))+','+(.08+.15*stream[k+7]+.49*glint*stream[k+7])+')';
      c.beginPath();c.moveTo(x+ax,y+ay);c.lineTo(x-.73*ax-ay*thin,y-.73*ay+ax*thin);
      c.lineTo(x-.51*ax+ay*thin,y-.51*ay-ax*thin);c.fill();
    }
  }
  function softwareStars(c,galaxy){
    const angle=celestial*.0038, ca=Math.cos(angle),sa=Math.sin(angle),aspect=width/height;
    for(let i=0;i<1100;i++){
      const sx=(hash(i,4)-.5)*2.9, sy=(hash(i,7)-.55)*2.3;
      const u=sx-.07,v=sy+.72;
      const x=galaxy.x/100+(.07+ca*u-sa*v)/aspect,y=galaxy.y/100-.72+sa*u+ca*v;
      if(x<0||x>1||y<0||y>.88)continue;
      const cross=sy+sx*.53, band=Math.exp(-cross*cross/.03);
      const a=clamp((1-y)*(.3+.7*band)*galaxy.density/100);
      if(hash(i,6)>a)continue;
      const size=.6+hash(i,8);
      c.fillStyle='rgba(248,236,222,'+a*(.8+.2*Math.sin(time*.8+i))+')';c.fillRect(x*width,y*height,size,size);
    }
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
    const c=ctx2d,{light,moon,galaxy}=state;
    const rgb=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(mix(v,b[i],t))).join(',')+')';
    const sky=c.createLinearGradient(0,0,0,height), d=light.dusk/100;
    sky.addColorStop(0,rgb([99,115,125],[36,51,69],d));sky.addColorStop(.62,rgb([168,179,179],[92,120,135],d));
    sky.addColorStop(1,rgb([245,219,178],[184,163,163],d));c.fillStyle=sky;c.fillRect(0,0,width,height);
    if(galaxy.visible)softwareStars(c,galaxy);
    softwareMeteor(c);
    if(moon.visible){
      const r=moonRadius(),x=width*moon.x/100,y=height*moon.y/100;
      c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();c.fillStyle='#fff0cb';
      c.beginPath();c.rect(x-r,y-r,r*2,r*2);c.arc(x-r*.43,y-r*.14,r*.93,0,Math.PI*2);c.fill('evenodd');c.restore();
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
      if(facets[k+4]<.76 && Math.abs(det)>.0001){
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
  function frame(now){
    raf=0;if(forced.matches||document.hidden||host.hasAttribute('suspended'))return;
    const moving=moveAllowed()&&state.light.wind>0;
    const interval=renderGL?1000/30:1000/16;
    if(dirty||!last||now-last>=interval-1){
      const dt=moving&&last?Math.min((now-last)/1000,.35)*state.light.wind/45:0;
      if(dt){
        time+=dt;celestial+=dt*state.galaxy.drift/50;
        for(const w of weather)w.advance(dt);
        if(state.galaxy.visible&&state.galaxy.meteors)meteor=meteorClock.advance(dt,state.galaxy.meteors);
      }
      for(let i=0;i<2;i++)look[i]=moving?mix(look[i],target[i],1-Math.exp(-dt*3.1)):0;
      views=cloudViews(state,weather,width/height);
      for(const v of views){
        const depth=(1-weather[v.index].profile.height)*.017;
        v.cx+=look[0]*depth*height/width;v.cy+=look[1]*depth;
      }
      if(horizon)horizon.style.transform='translate('+(-look[0]*9)+'px,'+(-look[1]*2)+'px) scaleX(1.02)';
      flights.advance(dt,views,width/height);projectFlights();
      if(renderGL)renderGL();else if(ctx2d)fallback();
      dirty=false;last=now;
    }
    if(moving&&!failed)raf=requestAnimationFrame(frame);
  }
  function wake(){dirty=true;if(!raf&&!document.hidden&&!forced.matches)raf=requestAnimationFrame(frame);}
  function sync(){
    cancelAnimationFrame(raf);raf=0;last=0;
    if(!moveAllowed()||forced.matches||document.hidden||host.hasAttribute('suspended')){meteor=null;meteorClock.clear();}
    wake();
  }
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1.5,1700/Math.max(1,host.clientWidth,host.clientHeight));
    width=Math.max(1,Math.round(host.clientWidth*ratio));height=Math.max(1,Math.round(host.clientHeight*ratio));
    canvas.width=width;canvas.height=height;paintHorizon();wake();
  }
  function start(){
    let gl;
    try{gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,powerPreference:'low-power'});if(gl)renderGL=prepareGL(gl);}catch{/* Use the same model with a software painter. */}
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
  new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['motion','suspended']});
  reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&moveAllowed())target=[e.clientX/innerWidth-.5,e.clientY/innerHeight-.5];},{passive:true});
  window.SunsetScene.update=next=>{const horizonChanged=state.horizon.y!==next.horizon.y||state.horizon.visible!==next.horizon.visible;
    if((state.light.wind===0)!==(next.light.wind===0))last=0;
    state=structuredClone(next);
    banks.forEach((bank,i)=>weather[i].configure(state[bank.id].type,state.light.humidity,!moveAllowed()||!state.light.wind||!time));
    if(!state.galaxy.visible||!state.galaxy.meteors||!state.light.wind){meteor=null;meteorClock.clear();}
    if(horizonChanged)paintHorizon();wake();};
  start();
})();
