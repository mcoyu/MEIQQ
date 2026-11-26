/* The same copper parcel belongs to its departing bank, the open air, then
   its receiving bank. All flight positions are fractions of the viewport. */
(() => {
  'use strict';
  const scene=window.SunsetScene;
  const {banks,bankCenters,clamp,mix,smooth}=scene;
  function cloudViews(state,weather,aspect){
    const views=[];
    banks.forEach((bank,index)=>{
      const layer=state[bank.id], time=weather[index].time;
      if(!layer.visible)return;
      const sx=bank.width*Math.max(1,.95/aspect)*layer.scale/100;
      const sy=bank.height*layer.scale/100, phase=bank.seed*.31;
      const cy=layer.y/100+.023*(Math.sin(time*.092+phase)-Math.sin(phase));
      const period=Math.max(1.36,sx+.18);
      for(const cx of bankCenters(bank,layer.x/100,sx,time)){
        const copy=Math.round((cx-layer.x/100-time*bank.drift)/period);
        views.push({index,copy,cx,cy,sx,sy});
      }
    });
    return views;
  }
  function world(view,u,v){
    return {x:view.cx+(u-.5)*view.sx,y:view.cy+(v-.5)*view.sy};
  }
  function openAir(views,weather,x,y){
    let density=0;
    for(const view of views){
      const u=.5+(x-view.cx)/view.sx, v=.5+(y-view.cy)/view.sy;
      if(u>0&&u<1&&v>0&&v<1)density=Math.max(density,weather[view.index].densityAt(u,v));
    }
    return 1-smooth(density/.32);
  }
  function choosePassage(views,weather,aspect,lastSource){
    const edges=[];
    for(const view of views){
      for(let y=.085;y<.88;y+=.052)for(let x=.065;x<.89;x+=.055){
        const u=.5+(x-view.cx)/view.sx, v=.5+(y-view.cy)/view.sy;
        if(u<.055||u>.945||v<.055||v>.945)continue;
        const water=weather[view.index].densityAt(u,v);
        if(water>.18&&water<.77)edges.push({view,u,v,x,y});
      }
    }
    let best=null, high=-Infinity;
    for(const a of edges)for(const b of edges){
      if(a.view.index===b.view.index || b.x+banks[b.view.index].drift*8>.965)continue;
      const dx=b.x-a.x, dy=b.y-a.y, distance=Math.hypot(dx*aspect,dy);
      if(distance<.20||distance>.75)continue;
      // The center of the passage must offer clear sky. Prefer two facing
      // edges with room to see the launch and landing as both banks drift.
      const middle=openAir(views,weather,mix(a.x,b.x,.5),mix(a.y,b.y,.5)-.037);
      if(middle<.75)continue;
      const opening=openAir(views,weather,mix(a.x,b.x,.28),mix(a.y,b.y,.28)-.025)
                   +openAir(views,weather,mix(a.x,b.x,.72),mix(a.y,b.y,.72)-.025);
      const score=middle+opening-.85*Math.abs(distance-.43)+.53*dx
        -.33*Math.abs((a.x+b.x)/2-.42)-.16*Math.abs(a.y-.29)
        +(a.view.index===lastSource?-.17:0);
      if(score>high){best={a,b};high=score;}
    }
    return best;
  }
  function receivingPocket(weather,u,v){
    // A soft centre of mass stays continuous as neighbouring wisps trade
    // density. A single brightest-cell target jumps across the gap as they do.
    let weight=.04,xsum=u*weight,ysum=v*weight;
    for(let j=-4;j<=4;j++)for(let i=-4;i<=4;i++){
      const kernel=1-(i*i+j*j)/20;
      if(kernel<=0)continue;
      const x=clamp(u+.052*i,.04,.96),y=clamp(v+.055*j,.04,.96);
      const density=weather.densityAt(x,y),w=kernel*density*density;
      xsum+=w*x;ysum+=w*y;weight+=w;
    }
    return [xsum/weight,ysum/weight];
  }
  function createShardFlights(weather){
    const shards=[];
    let delay=.28,lastSource=-1;
    function launch(views,aspect){
      const route=choosePassage(views,weather,aspect,lastSource);
      if(!route)return;
      const {a,b}=route;
      for(let i=0;i<3;i++){
        const u=a.u-.023*i, v=a.v+[0,.025,-.022][i];
        const ticket=weather[a.view.index].release(u,v);
        if(!ticket)continue;
        const p=ticket.parcel;
        const start=world(a.view,p.x,p.y);
        const landing=receivingPocket(weather[b.view.index],b.u+(i-1)*.024,b.v+(1-i)*.029);
        const vx=banks[a.view.index].drift+p.dx*a.view.sx,vy=p.dy*a.view.sy;
        const yaw=Math.atan2(Math.sin(p.heading)*a.view.sy,Math.cos(p.heading)*a.view.sx*aspect);
        const course=Math.atan2(b.y-start.y,(b.x-start.x)*aspect);
        shards.push({ticket,from:a.view,to:b.view,u:landing[0],v:landing[1],rimU:landing[0],rimV:landing[1],du:0,dv:0,pocket:landing,pocketVersion:-1,
          age:-i*(.88+.43*p.depth),duration:5.7+.75*p.depth+.32*i,landed:false,
          x:start.x,y:start.y,vx,vy,startX:start.x,startY:start.y,startVX:vx,startVY:vy,
          crossX:-Math.sin(course),crossY:Math.cos(course),twist:p.angle,
          focus:0,alpha:0,roll:p.roll,pitch:.35*(p.seed-.5)+.31*Math.sin(p.roll*.72+p.depth*5),angle:yaw,
          spin:p.spin,pitchSpeed:0,yawSpeed:p.yawRate,near:0,depthSpeed:0,
          approach:i===0?.75+.21*p.depth:i===1?.40+.13*p.seed:.17,lane:i-1});
      }
      if(shards.length)lastSource=a.view.index;
    }
    function advance(dt,views,aspect){
      if(!shards.length){
        if(!dt)return;
        delay-=dt;
        if(delay>0)return;
        delay=1.25;
        if(views.length>1)launch(views,aspect);
      }
      for(let i=shards.length-1;i>=0;i--){
        const s=shards[i], p=s.ticket.parcel;
        const matching=old=>views.find(v=>v.index===old.index&&v.copy===old.copy);
        const from=matching(s.from), to=matching(s.to);
        if(!to||(!from&&!s.landed)){if(s.landed)p.settling=false;else p.inFlight=false;shards.splice(i,1);continue;}
        // Re-sample only when the weather field advances; filter the pocket’s
        // displacement and velocity at the same cadence as the flying plate.
        const receiver=weather[to.index];
        if(dt>0&&!s.landed&&s.pocketVersion!==receiver.version){
          s.pocket=receivingPocket(receiver,s.rimU,s.rimV);s.pocketVersion=receiver.version;
        }
        const sourceWind=from&&s.age<=0?weather[from.index].windAt(p.x,p.y):null;
        if(s.age<=0&&from){
          const wait=Math.min(dt,-s.age);
          p.x=clamp(p.x+sourceWind[0]*wait);p.y=clamp(p.y+sourceWind[1]*wait);
          const start=world(from,p.x,p.y);
          s.x=s.startX=start.x;s.y=s.startY=start.y;
          s.vx=s.startVX=banks[from.index].drift+sourceWind[0]*from.sx;
          s.vy=s.startVY=sourceWind[1]*from.sy;
        }
        let remaining=dt;
        while(remaining>1e-7){
          const step=Math.min(remaining,1/60);remaining-=step;s.age+=step;
          const h=Math.min(step,Math.max(0,s.age));
          if(!h)continue;
          s.du+=(4*(s.pocket[0]-s.u)-4*s.du)*h;
          s.dv+=(4*(s.pocket[1]-s.v)-4*s.dv)*h;
          s.u+=s.du*h;s.v+=s.dv*h;
          const progress=clamp(s.age/s.duration),capture=smooth((progress-.57)/.43);
          const face=Math.cos(s.roll)*Math.cos(s.pitch);
          if(!s.landed){
            const goal=world(to,s.u,s.v);
            const rimVX=banks[to.index].drift+s.du*to.sx,rimVY=s.dv*to.sy;
            const t=progress,ease=smooth(t),slope=6*t*(1-t)/s.duration;
            const x0=s.startX+s.startVX*s.age,y0=s.startY+s.startVY*s.age;
            // A rolling current bows across the gap. Its speed and offset join
            // both banks continuously. Each flake slips relative to that air.
            const bell=16*t*t*(1-t)*(1-t),bellRate=32*t*(1-t)*(1-2*t)/s.duration;
            const phase=t*5.0+.43*s.twist+s.lane*.72,radius=.039+.025*p.depth;
            const side=radius*Math.sin(phase),sideRate=radius*Math.cos(phase)*5/s.duration;
            const rise=.024+.025*p.seed;
            const x=mix(x0,goal.x,ease)+s.crossX*side*bell/aspect;
            const y=mix(y0,goal.y,ease)+(s.crossY*side-rise)*bell;
            const airX=mix(s.startVX,rimVX,ease)+(goal.x-x0)*slope+s.crossX*(sideRate*bell+side*bellRate)/aspect;
            const airY=mix(s.startVY,rimVY,ease)+(goal.y-y0)*slope+s.crossY*sideRate*bell+(s.crossY*side-rise)*bellRate;
            const drag=2.6+1.8*Math.abs(face)+2*capture;
            s.vx+=h*(drag*(airX-s.vx)+3.8*(x-s.x));
            s.vy+=h*(drag*(airY-s.vy)+3.8*(y-s.y)+.016*bell*(1-Math.abs(face)));
            s.x+=s.vx*h;s.y+=s.vy*h;
            const px=.5+(s.x-to.cx)/to.sx,py=.5+(s.y-to.cy)/to.sy;
            const distance=Math.hypot((s.x-goal.x)*aspect,s.y-goal.y);
            if(t>.88&&distance<.037&&px>0&&px<1&&py>0&&py<1&&(receiver.densityAt(px,py)>.11||s.age>s.duration+.8)){
              receiver.receive(s.ticket,px,py);
              p.roll=s.roll;p.spin=s.spin;p.yawRate=s.yawSpeed;
              p.heading=Math.atan2(Math.sin(s.angle)/to.sy,Math.cos(s.angle)/(aspect*to.sx));
              p.dx=(s.vx-banks[to.index].drift)/to.sx;p.dy=s.vy/to.sy;
              s.landed=true;s.touchdown=s.age;p.settling=true;p.flightCover=1;
            }
          }
          const free=1-capture,depthTarget=s.landed?0:s.approach*(1-smooth((progress-.43)/.48));
          const depthRate=2.1+.62*capture;
          s.depthSpeed+=(depthRate*depthRate*(depthTarget-s.near)-2*depthRate*s.depthSpeed)*h;
          s.near=clamp(s.near+s.depthSpeed*h,0,.96);
          if(s.landed)continue;
          const vx=s.vx*aspect,vy=s.vy,speed=Math.hypot(vx,vy);
          const cross=vy*Math.cos(s.angle)-vx*Math.sin(s.angle);
          const handed=p.seed>.5?1:-1;
          const turn=handed*(.65+.75*p.depth+speed*4+.35*Math.sin(s.twist+s.age*.86));
          s.spin+=(turn*(.28+.72*free)-s.spin)*(1-Math.exp(-1.6*h));
          const pitchTarget=.13+.53*Math.sin(s.roll*.78+s.twist)*(.45+.55*free);
          s.pitchSpeed+=(2.1*(pitchTarget-s.pitch)-1.8*s.pitchSpeed)*h;
          s.yawSpeed+=((4.9*cross+.38*Math.sin(s.roll)*free)-1.25*s.yawSpeed)*h;
          s.roll+=s.spin*h;s.pitch+=s.pitchSpeed*h;s.angle+=s.yawSpeed*h;
        }
        if(s.landed){
          const position=world(to,p.x,p.y);s.x=position.x;s.y=position.y;
          s.roll=p.roll;
          const heading=Math.atan2(Math.sin(p.heading)*to.sy,Math.cos(p.heading)*aspect*to.sx);
          s.angle+=Math.atan2(Math.sin(heading-s.angle),Math.cos(heading-s.angle));
          s.focus=1-smooth((s.age-s.touchdown)/1.55);
          p.flightCover=s.focus;
          if(s.focus<=0){p.settling=false;shards.splice(i,1);continue;}
        }else{s.focus=smooth(s.age/1.25);}
        s.alpha=s.landed?.96*s.focus:.16+.80*s.focus;
      }
    }
    return {shards,advance};
  }
  Object.assign(scene,{cloudViews,createShardFlights});
})();
