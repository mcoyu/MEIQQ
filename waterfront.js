/* One river and one clock for all three Studio workspaces. Reflections are a
   mirrored render of the actual far bank, sampled through a moving water surface. */
(() => {
  'use strict';
  const host=document.querySelector('aero-shards');
  let canvas=host?.querySelector?.('.studio-waterfront');
  if(!canvas)return;
  const viewer=document.querySelector('#waterfront-view');
  const forced=matchMedia('(forced-colors:active)');
  let model,painter,width=1,height=1,ratio=1,time=0,raf=0,last=0,active=false;
  let route='',travel=-1.55,speed=0,reveal=0,revealSpeed=0;
  const marks={studio:0,planner:1,jobs:2};
  const moving=()=>document.documentElement.dataset.uiMotion==='on';
  const fluid=(x,velocity,target,dt,rate)=>{
    const difference=x-target,k=velocity+rate*difference,decay=Math.exp(-rate*dt);
    return [target+(difference+k*dt)*decay,(velocity-rate*k*dt)*decay];
  };
  function camera(){
    const passage=window.StudioFlight;
    const aloft=passage?.active?1-passage.phase(.18,.92,passage.progress):0;
    const glide=passage?.active?1-passage.phase(.24,1,passage.progress):0;
    const x=travel*2.65-.85+1.15*Math.sin(time*.105)+.26*Math.sin(time*.247)-13.5*glide;
    const focal=Math.min(Math.max(width*.95,height*.62),height*1.52);
    const z=4.05+.86*x-(focal/height)*(4.74+1.69*reveal)+.34*Math.sin(time*.087+.22)-10*aloft;
    const eye=3.16+.06*Math.sin(time*.15)+.16*reveal+27.5*aloft;
    const yaw=-.025+.017*travel+.013*Math.sin(time*.082)+.032*glide;
    const framing=width/height<.85?.264:.296;
    const level=passage?.active?passage.phase(.20,.50,passage.progress)*(1-passage.phase(.59,.99,passage.progress)):0;
    return {x,z,eye,yaw,focal,aloft,horizon:framing+(.618-framing)*reveal+.16*level};
  }
  const screenVS=`
    attribute vec2 aCorner;varying vec2 uv;
    void main(){uv=aCorner*.5+.5;gl_Position=vec4(aCorner,0.,1.);}`;
  const noise=`
    float hash(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
    float noise2(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
    }
    float clouds(vec2 p){
      float v=0.,w=.55;
      for(int i=0;i<4;i++){v+=noise2(p)*w;p=mat2(1.98,-.22,.24,2.08)*p+15.27;w*=.49;}
      return v;
    }`;
  const atmosphereFS=`
    precision highp float;varying vec2 uv;uniform vec4 uLens;uniform float uTime;
    ${noise}
    void main(){
      float az=(uv.x-.5)*2./uLens.x+uLens.w;
      float el=abs((uv.y*2.-1.-uLens.z)/uLens.y);
      float ember=exp(-abs(el-.085)*3.)*(.32+.68*smoothstep(-.53,.69,az));
      vec3 zenith=mix(vec3(.126,.119,.135),vec3(.207,.178,.184),smoothstep(-.55,.7,az));
      vec3 sky=mix(zenith,vec3(.43,.276,.227),ember*.84);
      vec2 p=vec2(az*2.55,el*5.8);
      vec2 drift=vec2(uTime*.012,uTime*.0014);
      float body=clouds(p+vec2(4.2,-2.2)+drift);
      float streak=clouds(p*vec2(1.35,1.75)+vec2(16.+body*1.8,body*2.6)+drift*1.42);
      float vapour=smoothstep(.32,.73,.59*body+.41*streak);
      sky=mix(sky,vec3(.108,.106,.128)+ember*vec3(.135,.068,.038),vapour*.84);
      sky+=vec3(.067,.038,.022)*smoothstep(.46,.8,body)*(1.-vapour)*exp(-el*2.);
      sky=mix(sky,vec3(.137,.116,.132),.46*exp(-el*17.));
      gl_FragColor=vec4(sky,1.);
    }`;
  const geometryVS=`
    attribute vec3 aPos,aColor;attribute vec2 aArm;attribute float aMat;
    uniform vec4 uLens,uCamera;uniform vec2 uSpin;uniform float uMirror,uPixels;
    varying vec3 col,world;varying float material;
    void main(){
      vec2 spin=vec2(uSpin.x*aArm.x-uSpin.y*aArm.y,uSpin.y*aArm.x+uSpin.x*aArm.y);
      world=aPos+vec3(spin-aArm,0.);
      float dx=world.x-uCamera.x,dz=world.z-uCamera.z;
      float xc=dx*uCamera.w-dz*uLens.w,zc=dx*uLens.w+dz*uCamera.w;
      gl_Position=vec4(xc*uLens.x,(uMirror*world.y-uCamera.y)*uLens.y+uLens.z*zc,zc-.25,zc);
      gl_PointSize=clamp(1.6+aMat*uPixels/max(zc,1.)*2.35,1.6,16.);
      // Distance haze lifts the far bank into the cloud layer on the approach.
      float haze=clamp((uCamera.y-3.6)*.017,0.,.39)*(1.-exp(-max(zc,0.)*.015));
      col=mix(aColor,vec3(.221,.178,.188),haze);material=aMat;
    }`;
  const geometryFS=`
    precision highp float;varying vec3 col,world;varying float material;uniform float uKind;
    ${noise}
    void main(){
      if(uKind>1.5){
        float d=length(gl_PointCoord-.5)*2.;
        float light=.92*exp(-d*d*9.)+.21*exp(-d*d*2.);
        gl_FragColor=vec4(col*light,1.);return;
      }
      if(uKind>.5){gl_FragColor=vec4(col,.66);return;}
      vec3 c=col;
      if(material>1.5&&material<2.5){
        float along=world.x+.86*world.z,across=world.z-.86*world.x;
        float fibre=noise2(vec2(along*.82,world.y*94.+across*47.));
        float grain=sin(world.y*314.+across*164.+fibre*8.)*.033;
        c*=.9+.19*fibre+grain;
      }else if(material>2.5){
        vec2 mineral=vec2(world.x+.63*world.z,world.y-.42*world.z);
        c*=.91+.12*noise2(mineral*19.)+.045*hash(floor(mineral*230.));
      }else if(material>.5){
        float floorline=smoothstep(.82,.98,fract((world.y-.94)/.87));
        c*=1.-floorline*.12;
      }
      gl_FragColor=vec4(c,1.);
    }`;
  const riverFS=`
    precision highp float;varying vec2 uv;uniform sampler2D uReflection;
    uniform vec4 uLens,uCamera;uniform float uTime;uniform vec2 uSize;
    ${noise}
    void main(){
      float drop=(uLens.z-(uv.y*2.-1.))/uLens.y;
      if(drop<.001){gl_FragColor=texture2D(uReflection,uv);return;}
      float z=min(800.,uCamera.y/drop);
      float x=(2.*uv.x-1.)/uLens.x*z+uCamera.x+uLens.w*z;
      float nearWater=smoothstep(.018,.48,drop);
      vec2 p=vec2(x,z+uCamera.z);
      float rolling=sin(p.y*1.64+p.x*.21+uTime*1.6)+.55*sin(p.y*3.12-p.x*.34-uTime*1.18);
      float eddy=noise2(vec2(p.x*.41+uTime*.12,p.y*1.2-uTime*.45));
      float slope=rolling*.55+(eddy-.5)*1.7;
      float fetch=smoothstep(.014,.30,drop);
      float chop=noise2(vec2(p.x*.62+uTime*.16,p.y*1.07-uTime*.55))-.5;
      vec2 warp=vec2(slope*(1.2+12.*fetch)/uSize.x,(chop*1.85+rolling*.31)*(.006+.121*fetch));
      vec2 src=clamp(uv+warp,vec2(.001),vec2(.999));
      vec3 reflected=texture2D(uReflection,src).rgb*.5;
      reflected+=texture2D(uReflection,src+vec2(2.6,-3.6-fetch*11.)/uSize).rgb*.25;
      reflected+=texture2D(uReflection,src+vec2(-2.4,4.1+fetch*16.)/uSize).rgb*.25;
      float wave=.5+.5*sin(p.y*2.04+.7*sin(p.x*.6+uTime*.67)+uTime*1.38);
      vec3 body=mix(vec3(.103,.081,.086),vec3(.134,.100,.096),smoothstep(-.4,.85,p.x/z));
      vec3 water=mix(body,reflected, .59-.31*fetch);
      water+=vec3(.045,.032,.029)*(wave-.33)*(.34+.66*nearWater)*(.6+eddy);
      gl_FragColor=vec4(water,1.);
    }`;
  const glintVS=`
    attribute vec2 aCorner;attribute vec4 aSource;attribute vec3 aColor;
    uniform vec4 uLens,uCamera;uniform vec2 uSize;
    varying vec2 local;varying vec3 col;varying float seed;
    void main(){
      float dx=aSource.x-uCamera.x,dz=aSource.y-uCamera.z;
      float xc=dx*uCamera.w-dz*uLens.w,zc=dx*uLens.w+dz*uCamera.w;
      vec2 base=vec2(xc*uLens.x/zc,uLens.z-uCamera.y*uLens.y/zc);
      float width=(2.3/uSize.x+.0064)*(.34+aCorner.y*1.8);
      gl_Position=vec4(base.x+aCorner.x*width,base.y-aCorner.y*aSource.w*2.,0.,1.);
      local=aCorner;col=aColor*aSource.z;seed=aSource.x;
    }`;
  const glintFS=`
    precision highp float;varying vec2 local;varying vec3 col;varying float seed;uniform float uTime;
    ${noise}
    void main(){
      float t=local.y;
      float shift=.23*sin(25.*t+uTime*.82+seed)+.15*sin(73.*t-uTime*1.14);
      float cross=max(0.,1.-abs(local.x-shift));cross*=cross;
      float ripples=noise2(vec2(seed+local.x*.72+uTime*.28,log(1.+t*6.)*72.-uTime*1.9));
      float gleam=(.18+1.36*smoothstep(.39,.82,ripples))*pow(1.-t,1.44)*cross;
      gl_FragColor=vec4(col*gleam,1.);
    }`;
  function gpuPainter(gl,scene){
    function program(vs,fs){
      function compile(type,source){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
        return shader;
      }
      const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
      const uniform={},attribute={};
      for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const n=gl.getActiveUniform(p,i).name;uniform[n]=gl.getUniformLocation(p,n);}
      for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);i++){const n=gl.getActiveAttrib(p,i).name;attribute[n]=gl.getAttribLocation(p,n);}
      return {p,uniform,attribute};
    }
    const backdrop=program(screenVS,atmosphereFS),river=program(screenVS,riverFS),mesh=program(geometryVS,geometryFS),glint=program(glintVS,glintFS);
    function upload(data,stride){
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      return {buffer,count:data.length/stride};
    }
    const screen=upload([-1,-1,3,-1,-1,3],2);
    const group=g=>Object.fromEntries(Object.entries(g).map(([k,data])=>[k,upload(data,9)]));
    const shore=group(scene.shore),rail=group(scene.rail);
    const traffic=upload(window.StudioWaterfront.bridgeTraffic(0).flat(),9);
    const streaks=[];
    for(const {x,z,col,power,length} of scene.glints)for(const [u,v] of [[-1,0],[1,0],[1,1],[-1,0],[1,1],[-1,1]])streaks.push(u,v,x,z,power,length,...col);
    const highlights=upload(streaks,9),texture=gl.createTexture(),fb=gl.createFramebuffer(),depth=gl.createRenderbuffer();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
    for(const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
    let rw=0,rh=0;
    const slots=gl.getParameter(gl.MAX_VERTEX_ATTRIBS),enabled=new Set();
    function bind(buf,p,layout,stride){
      gl.bindBuffer(gl.ARRAY_BUFFER,buf.buffer);
      const used=new Set();let offset=0;
      for(const [name,n] of layout){
        const loc=p.attribute[name];
        if(loc!==undefined){
          if(!enabled.has(loc)){gl.enableVertexAttribArray(loc);enabled.add(loc);}
          gl.vertexAttribPointer(loc,n,gl.FLOAT,false,stride*4,offset*4);used.add(loc);
        }
        offset+=n;
      }
      for(let i=0;i<slots;i++)if(enabled.has(i)&&!used.has(i)){gl.disableVertexAttribArray(i);enabled.delete(i);}
    }
    const quadLayout=[['aCorner',2]],meshLayout=[['aPos',3],['aColor',3],['aArm',2],['aMat',1]],glintLayout=[['aCorner',2],['aSource',4],['aColor',3]];
    function drawGeometry(g,mirror){
      const u=mesh.uniform;gl.useProgram(mesh.p);gl.uniform1f(u.uMirror,mirror);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);
      bind(g.faces,mesh,meshLayout,9);gl.uniform1f(u.uKind,0);gl.drawArrays(gl.TRIANGLES,0,g.faces.count);
      gl.enable(gl.BLEND);gl.depthMask(false);
      if(g.lines.count){gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);bind(g.lines,mesh,meshLayout,9);gl.uniform1f(u.uKind,1);gl.drawArrays(gl.LINES,0,g.lines.count);}
      if(g.lamps.count){gl.blendFunc(gl.ONE,gl.ONE);bind(g.lamps,mesh,meshLayout,9);gl.uniform1f(u.uKind,2);gl.drawArrays(gl.POINTS,0,g.lamps.count);
        bind(traffic,mesh,meshLayout,9);gl.drawArrays(gl.POINTS,0,traffic.count);
      }
      gl.depthMask(true);gl.disable(gl.BLEND);
    }
    function resizeReflection(w,h){
      rw=w;rh=h;gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,rw,rh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,rw,rh);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Waterfront reflection target unavailable');
    }
    return (cam,t)=>{
      const w=canvas.width,h=canvas.height;
      gl.bindBuffer(gl.ARRAY_BUFFER,traffic.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(window.StudioWaterfront.bridgeTraffic(t).flat()));
      const dw=Math.max(2,Math.round(w*.62)),dh=Math.max(2,Math.round(h*.62));
      if(dw!==rw||dh!==rh)resizeReflection(dw,dh);
      const sn=Math.sin(cam.yaw),cs=Math.cos(cam.yaw);
      for(const p of [backdrop,mesh,river,glint]){
        gl.useProgram(p.p);const u=p.uniform;
        gl.uniform4f(u.uLens,2*cam.focal/width,2*cam.focal/height,1-2*cam.horizon,sn);
        if(u.uCamera)gl.uniform4f(u.uCamera,cam.x,cam.eye,cam.z,cs);
        if(u.uTime)gl.uniform1f(u.uTime,t);
        if(u.uSize)gl.uniform2f(u.uSize,w,h);
      }
      gl.useProgram(mesh.p);gl.uniform2f(mesh.uniform.uSpin,Math.cos(t*.061),Math.sin(t*.061));gl.uniform1f(mesh.uniform.uPixels,cam.focal*ratio*.62);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.bindTexture(gl.TEXTURE_2D,null);gl.viewport(0,0,rw,rh);
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(backdrop.p);bind(screen,backdrop,quadLayout,2);gl.drawArrays(gl.TRIANGLES,0,3);
      drawGeometry(shore,-1);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.useProgram(river.p);bind(screen,river,quadLayout,2);gl.drawArrays(gl.TRIANGLES,0,3);
      gl.useProgram(glint.p);bind(highlights,glint,glintLayout,9);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,highlights.count);
      gl.useProgram(mesh.p);gl.uniform1f(mesh.uniform.uPixels,cam.focal*ratio);
      drawGeometry(shore,1);drawGeometry(rail,1);
    };
  }
  function canvasPainter(ctx,scene){
    // Keep the same architecture, gondola suspension, and camera on devices
    // without WebGL. Sort the primitives once, then project them at draw time.
    const css=(col,alpha=1)=>'rgba('+col.map(v=>Math.round(v*255)).join(',')+','+alpha+')';
    function prepare(group){
      const points=[],lookup=new Map(),items=[];
      for(const [kind,data] of Object.entries(group)){
        const n={faces:3,lines:2,lamps:1}[kind];
        for(let i=0;i<data.length;i+=n*9){
          const ids=[];let depth=0;
          for(let j=0;j<n;j++){
            const k=i+j*9,p=[data[k],data[k+1],data[k+2],data[k+6],data[k+7]],key=p.join('/');
            if(!lookup.has(key)){lookup.set(key,points.length);points.push(p);}
            ids.push(lookup.get(key)*3);depth+=p[2];
          }
          items.push({ids,n,depth:depth/n-(n===3?0:.03),style:css(data.slice(i+3,i+6),n===2?.65:1),size:data[i+8]});
        }
      }
      return {points,items:items.sort((a,b)=>b.depth-a.depth),screen:new Float32Array(points.length*3)};
    }
    const shore=prepare(scene.shore),rail=prepare(scene.rail),mirror=document.createElement('canvas'),mc=mirror.getContext('2d');
    const atmosphere=document.createElement('canvas');atmosphere.width=480;atmosphere.height=208;
    const ac=atmosphere.getContext('2d'),pixels=ac.createImageData(atmosphere.width,atmosphere.height);
    function hash(x,y){const h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h);}
    function noise(x,y){
      const i=Math.floor(x),j=Math.floor(y),dx=x-i,dy=y-j,s=dx*dx*(3-2*dx),v=dy*dy*(3-2*dy);
      const a=hash(i,j),b=hash(i+1,j),c=hash(i,j+1),d=hash(i+1,j+1);
      return (a+(b-a)*s)*(1-v)+(c+(d-c)*s)*v;
    }
    for(let y=0;y<208;y++)for(let x=0;x<480;x++){
      const u=x/480,v=y/208,haze=Math.exp(-Math.abs(1-v-.12)*2.8)*(.34+.66*u);
      const density=.52*noise(u*5+2,v*6)+.29*noise(u*13+7,v*21+2)+.19*noise(u*26,v*40-4);
      const index=(y*480+x)*4;
      for(let k=0;k<3;k++)pixels.data[index+k]=[37,32,36][k]+haze*[52,29,16][k]+(density-.53)*[35,25,26][k];
      pixels.data[index+3]=255;
    }
    ac.putImageData(pixels,0,0);
    function geometry(c,g,cam,t,sign){
      const cs=Math.cos(cam.yaw),sn=Math.sin(cam.yaw),co=Math.cos(t*.061),si=Math.sin(t*.061),h=cam.horizon*height;
      for(let i=0;i<g.points.length;i++){
        const [x,y,z,ax,ay]=g.points[i],dx=x+ax*(co-1)-ay*si-cam.x,dz=z-cam.z,zc=dx*sn+dz*cs,k=i*3;
        const f=cam.focal/Math.max(.1,zc);
        g.screen[k]=width*.5+(dx*cs-dz*sn)*f;g.screen[k+1]=h-(sign*(y+ax*si+ay*(co-1))-cam.eye)*f;g.screen[k+2]=zc;
      }
      for(const item of g.items){
        const [a,b,d]=item.ids,p=g.screen;
        if(p[a+2]<.15||(b!==undefined&&p[b+2]<.15)||(d!==undefined&&p[d+2]<.15))continue;
        if(p[a]<-2&&(b===undefined||p[b]<-2)&&(d===undefined||p[d]<-2))continue;
        if(p[a]>width+2&&(b===undefined||p[b]>width+2)&&(d===undefined||p[d]>width+2))continue;
        if(item.n===1){
          const r=Math.max(.5,item.size*cam.focal/p[a+2]*.72);
          c.fillStyle=item.style;c.fillRect(p[a]-r,p[a+1]-r,r*2,r*2);continue;
        }
        c.beginPath();c.moveTo(p[a],p[a+1]);c.lineTo(p[b],p[b+1]);
        if(item.n===2){c.strokeStyle=item.style;c.stroke();}
        else{c.lineTo(p[d],p[d+1]);c.closePath();c.fillStyle=item.style;c.fill();}
      }
    }
    function headlights(c,cam,t,sign){
      for(const [x,y,z,r,g,b] of window.StudioWaterfront.bridgeTraffic(t)){
        const dx=x-cam.x,dz=z-cam.z,zc=dx*Math.sin(cam.yaw)+dz*Math.cos(cam.yaw),f=cam.focal/zc;
        const sx=width*.5+f*(dx*Math.cos(cam.yaw)-dz*Math.sin(cam.yaw));
        c.fillStyle=css([r,g,b]);c.fillRect(sx,cam.horizon*height+(cam.eye-y*sign)*f,Math.max(.8,.11*f),Math.max(.6,.06*f));
      }
    }
    function sky(c,cam,t){
      const h=cam.horizon*height,shift=width*(.13+.025*Math.sin(t*.055)+cam.yaw);
      c.drawImage(atmosphere,-shift,h-height,width*1.33,height);
      c.save();c.translate(0,2*h);c.scale(1,-1);c.drawImage(atmosphere,-shift,h-height,width*1.33,height);c.restore();
    }
    return (cam,t)=>{
      if(mirror.width!==Math.round(width*.55)||mirror.height!==Math.round(height*.55)){
        mirror.width=Math.round(width*.55);mirror.height=Math.round(height*.55);
      }
      mc.setTransform(mirror.width/width,0,0,mirror.height/height,0,0);mc.lineWidth=.68;
      sky(mc,cam,t);mc.globalAlpha=1-.41*cam.aloft;geometry(mc,shore,cam,t,-1);headlights(mc,cam,t,-1);mc.globalAlpha=1;
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineWidth=.65;sky(ctx,cam,t);
      const h=height*cam.horizon;ctx.fillStyle='#211a1d';ctx.fillRect(0,h,width,height-h);ctx.globalAlpha=.47;
      for(let y=h;y<height;){
        const depth=(y-h)/height,dy=Math.min(height-y,1.2+depth*3.6);
        const shift=(Math.sin(4.5/(depth+.025)+t*1.3)+.47*Math.sin(y*.27-t))*(.5+depth*5);
        const wobble=(Math.sin(y*1.26+t+Math.sin(y*.23))*3+Math.sin(4.7/(depth+.036)+t*.85)*8)*Math.min(1,depth*3.5);
        const sy=Math.max(0,Math.min(mirror.height-dy-1,(y+wobble)/height*mirror.height));
        ctx.drawImage(mirror,0,sy,mirror.width,dy/height*mirror.height,shift-4,y,width+8,dy+.4);
        y+=dy;
      }
      ctx.globalAlpha=1;
      for(const {x,z,col,power,length} of scene.glints){
        const dx=x-cam.x,dz=z-cam.z,zc=dx*Math.sin(cam.yaw)+dz*Math.cos(cam.yaw);
        const cx=width*.5+cam.focal*(dx*Math.cos(cam.yaw)-dz*Math.sin(cam.yaw))/zc;
        const base=h+cam.focal*cam.eye/zc;ctx.fillStyle=css(col);
        for(let i=0;i<36;i++){
          const v=i/36,g=.5+.5*Math.sin(i*4.1+x+Math.sin(i*.71+t*1.5));
          ctx.globalAlpha=power*(1-v)*(.12+.58*g*g);const w=(.45+width*.0025*v)*(.4+g);
          ctx.fillRect(cx+v*2*Math.sin(x+t+i*.2)-w,base+height*length*v*v,w*2,1+v*1.3);
        }
      }
      ctx.globalAlpha=1-.41*cam.aloft;geometry(ctx,shore,cam,t,1);headlights(ctx,cam,t,1);ctx.globalAlpha=1;geometry(ctx,rail,cam,t,1);
    };
  }
  function software(){
    // A canvas that has held a GL context cannot acquire a 2D context.
    const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;
    const context=canvas.getContext('2d',{alpha:false});
    painter=context?canvasPainter(context,model):null;
  }
  function initialize(){
    model=window.StudioWaterfront.makeWaterfront();
    try{
      const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power',depth:true});
      if(!gl){software();return;}
      const draw=gpuPainter(gl,model);
      painter=(cam,t)=>{
        try{draw(cam,t);}catch{
          // Allocation can also fail on rotation or resize, after a successful launch.
          software();size();painter?.(cam,t);
        }
      };
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();software();refresh();},{once:true});
    }catch{software();}
  }
  function size(){
    width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);
    ratio=Math.min(devicePixelRatio||1,1.5,1800/Math.max(width,height));
    const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  function frame(now){
    raf=0;if(!active||!painter)return;
    const animated=moving(),target=marks[route]??0,open=viewer.open?1:0;
    if(!last||now-last>=1000/(window.StudioFlight?.active?60:30)-1||!animated){
      const dt=last?Math.min(.15,(now-last)/1000):0;
      if(animated){
        time+=dt;[travel,speed]=fluid(travel,speed,target,dt,2.8);
        [reveal,revealSpeed]=fluid(reveal,revealSpeed,open,dt,3.1);
      }else{travel=target;reveal=open;speed=revealSpeed=0;}
      painter(camera(),time);last=now;
    }
    if(animated)raf=requestAnimationFrame(frame);
  }
  function refresh(){
    if(forced.matches&&viewer.open)viewer.close();
    const next=host.getAttribute('waterfront')||host.getAttribute('studio-flight');
    const visible=Object.hasOwn(marks,next)&&!document.hidden&&!host.hasAttribute('suspended')&&!forced.matches;
    if(!visible){cancelAnimationFrame(raf);raf=0;last=0;active=false;return;}
    if(!model)initialize();
    if(!active&&!document.hidden&&route!==next){travel=marks[next]-(window.StudioFlight?.active?0:1.4);speed=0;}
    route=next;active=true;size();last=0;
    if(!raf)raf=requestAnimationFrame(frame);
  }
  new ResizeObserver(refresh).observe(host);
  new MutationObserver(refresh).observe(host,{attributes:true,attributeFilter:['waterfront','studio-flight','suspended','motion']});
  new MutationObserver(refresh).observe(viewer,{attributes:true,attributeFilter:['open']});
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-ui-motion']});
  document.addEventListener('visibilitychange',refresh);forced.addEventListener('change',refresh);refresh();
})();
