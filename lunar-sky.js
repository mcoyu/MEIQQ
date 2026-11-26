/* One scene clock, lunar surface and sun direction for the sky and its reflection. */
(() => {
  'use strict';
  const scene=window.SunsetScene;
  const {clamp,mix,smooth,hash}=scene;
  const tau=2*Math.PI,month=32*60;
  function illumination(turn){
    const angle=tau*turn,side=Math.sin(angle),front=-Math.cos(angle);
    return {x:side*.9701,y:side*.2425,z:front,fraction:(1+front)*.5};
  }
  function createClock(initialPhase=(Date.now()/1000/month)%1,random=Math.random){
    // Daylight, dusk, night and dawn have separate, variable lengths.
    const lengths=[[75,145],[90,160],[110,215],[100,180]];
    const duration=i=>mix(...lengths[i],random());
    let stage=0,age=0,span=duration(0),seconds=0,darkness=0,speed=0,started=false;
    return {
      sample(dt,route,shore,instant=false){
        seconds+=dt;age+=dt;
        while(age>=span){age-=span;stage=(stage+1)%4;span=duration(stage);}
        const t=smooth(age/span);
        const ambient=[0,t,1,1-t][stage];
        const target=mix(route==='home'?ambient:route==='surface'?Math.max(.38,ambient):1,Math.max(.58,ambient),shore);
        if(!started||instant){darkness=target;speed=0;started=true;}
        else [darkness,speed]=window.StudioFlight.glide(darkness,speed,target,dt,.77);
        const turn=(initialPhase+seconds/month)%1;
        return {turn,light:illumination(turn),night:darkness,
          x:.092*(darkness-.45)+.032*Math.sin(seconds/210),
          y:.068*(1-darkness)-.018*Math.sin(Math.PI*darkness)-.019*Math.sin(seconds/305)};
      }
    };
  }
  const clock=createClock();
  let last=null,wasPlaying=false;
  const lunar={settings:scene.defaults.moon,createClock,illumination,world:clock.sample(0,'home',0),
    tick(now,playing,host){
      const flight=window.StudioFlight;
      const shore=flight.active?flight.progress:Number(host.hasAttribute('waterfront'));
      const route=flight.active?flight.skyStage:host.getAttribute('sky-stage')||'home';
      const dt=last!==null&&wasPlaying&&playing?clamp((now-last)/1000,0,.35):0;
      // Both painters can request the same frame while the river enters view.
      if(last===null||now>=last){
        const still=document.documentElement.dataset.uiMotion!=='on'&&!playing;
        lunar.world=clock.sample(dt,route,shore,still||last===null);last=now;wasPlaying=playing;
      }
    },
    suspend(){wasPlaying=false;},
    disc(shore){
      const a=lunar.skyDisc||lunar.riverDisc,b=lunar.riverDisc||a;
      if(!a)return [0,0,0];
      return [mix(a[0],b[0],shore),mix(a[1],b[1],shore),mix(a[2],b[2],shore)];
    }
  };
  // Fixed selenographic markings and crater relief stay attached to the sphere
  // as the sun moves across them. All painters sample the same shaded image.
  const size=128;
  let surface,canvas,ctx,image,key='',version=0;
  function bakeSurface(){
    surface=new Float32Array(size*size*5);
    const craters=Array.from({length:55},(_,i)=>[hash(i,2)*1.96-.98,hash(i,3)*1.96-.98,.018+.075*hash(i,4)**3]);
    const seas=[[-.29,.31,.39,.28],[.16,.37,.28,.19],[.36,.13,.23,.17],[-.44,-.13,.19,.24],[.03,-.13,.19,.16]];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const k=(y*size+x)*5,nx=2*(x+.5)/size-1,ny=1-2*(y+.5)/size;
      const r=Math.hypot(nx,ny);
      if(r>=1)continue;
      const nz=Math.sqrt(1-r*r);
      let albedo=.91+.08*(hash(x,y)-.5),dx=nx,dy=ny;
      for(const [cx,cy,rx,ry] of seas){
        const dist=Math.hypot((nx-cx)/rx,(ny-cy)/ry)+.08*Math.sin(nx*37+ny*13);
        albedo-=.15*(1-smooth((dist-.57)/.49));
      }
      for(const [cx,cy,radius] of craters){
        const u=(nx-cx)/radius,v=(ny-cy)/radius,d=Math.hypot(u,v);
        if(d>1.24)continue;
        const rim=Math.exp(-((d-.87)**2)/.029);
        albedo+=.14*rim-.09*(1-smooth(d));
        dx-=.22*u*rim;dy-=.22*v*rim;
      }
      const n=Math.hypot(dx,dy,nz);
      surface.set([dx/n,dy/n,nz/n,albedo,clamp((1-r)*size*.5)],k);
    }
    canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    ctx=canvas.getContext('2d');image=ctx.createImageData(size,size);
  }
  function sprite(){
    if(!canvas)bakeSurface();
    const {turn,night,light}=lunar.world;
    const next=Math.round(turn*2048)+'/'+Math.round(night*48);
    if(key===next)return canvas;
    const p=image.data;
    for(let i=0,k=0;i<p.length;i+=4,k+=5){
      const cover=surface[k+4];if(!cover)continue;
      const incidence=surface[k]*light.x+surface[k+1]*light.y+surface[k+2]*light.z;
      const lit=smooth((incidence+.013)/.070);
      const shaded=surface[k+3]*(.61+.39*Math.sqrt(Math.max(0,incidence)));
      const earth=(.5+.5*(1-light.fraction))*surface[k+3];
      p[i]=mix(19+earth*12,252*shaded,lit);
      p[i+1]=mix(26+earth*13,(237+10*night)*shaded,lit);
      p[i+2]=mix(39+earth*15,(209+30*night)*shaded,lit);
      p[i+3]=255*cover*mix(.035+.94*night,.68+.32*night,lit);
    }
    ctx.putImageData(image,0,0);key=next;version++;
    return canvas;
  }
  lunar.sprite=sprite;
  lunar.texture=gl=>{
    const tex=gl.createTexture();let uploaded=-1;
    return ()=>{
      const asset=sprite();
      gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tex);
      if(uploaded!==version){
        if(uploaded<0){
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,asset);
        }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,asset);
        uploaded=version;
      }
      gl.activeTexture(gl.TEXTURE0);
    };
  };
  scene.lunar=lunar;
})();
