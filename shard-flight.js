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
  function nearestCloud(weather,u,v){
    if(weather.densityAt(u,v)>.26)return [u,v];
    let score=-Infinity, best=[u,v];
    for(let j=-4;j<=4;j++)for(let i=-4;i<=4;i++){
      const x=clamp(u+.033*i,.035,.965),y=clamp(v+.033*j,.035,.965);
      const value=Math.min(.45,weather.densityAt(x,y))-.03*Math.hypot(i,j);
      if(value>score){score=value;best=[x,y];}
    }
    return best;
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
        const start=world(a.view,p.x,p.y), [wx,wy]=weather[a.view.index].windAt(p.x,p.y);
        const vx=banks[a.view.index].drift+wx*a.view.sx, vy=wy*a.view.sy;
        shards.push({ticket,from:a.view,to:b.view,u:b.u+(i-1)*.024,v:b.v+(1-i)*.029,
          age:-i*(.93+.68*p.depth), duration:5.1+.83*p.depth+.42*i, landed:false,
          x:start.x,y:start.y,vx,vy,focus:0,alpha:0,roll:p.angle,pitch:.18,angle:Math.atan2(vy,vx*aspect),
          spin:(p.depth>.42?1:-1)*(.45+.55*p.seed), pitchSpeed:0, yawSpeed:0, near:0,depthSpeed:0,
          approach:i===0?.75+.21*p.depth:i===1?.40+.13*p.seed:.17, lane:i-1});
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
        if(!to||(!from&&!s.landed)){if(!s.landed)p.inFlight=false;shards.splice(i,1);continue;}
        if(s.age<=0 && from){
          const wait=Math.min(dt,-s.age), wind=weather[from.index].windAt(p.x,p.y);
          p.x=clamp(p.x+wind[0]*wait);p.y=clamp(p.y+wind[1]*wait);
          const start=world(from,p.x,p.y);
          s.x=start.x;s.y=start.y;s.vx=banks[from.index].drift+wind[0]*from.sx;s.vy=wind[1]*from.sy;
        }
        const [u,v]=nearestCloud(weather[to.index],s.u,s.v);
        const follow=1-Math.exp(-dt*2.2);
        s.u=mix(s.u,u,follow);s.v=mix(s.v,v,follow);
        const goal=world(to,s.u,s.v);
        const [localX,localY]=weather[to.index].windAt(s.u,s.v);
        const rimVX=banks[to.index].drift, rimVY=0;
        // The flake leaves with the velocity of the source. Broadside to
        // the air it brakes and lifts; edge-on it carries its momentum.
        let remaining=dt;
        while(remaining>1e-7){
          const h=Math.min(remaining,1/40);remaining-=h;s.age+=h;
          if(s.age<=0)continue;
          const progress=clamp(s.age/s.duration);
          const capture=smooth((progress-.54)/.46);
          const face=Math.cos(s.roll)*Math.cos(s.pitch);
          const slip=Math.sin(s.roll)*Math.cos(s.roll);
          if(!s.landed){
            const dx=(goal.x-s.x)*aspect,dy=goal.y-s.y;
            const distance=Math.hypot(dx,dy);
            const timeLeft=Math.max(.32,s.duration-s.age);
            const drag=1.12+.77*Math.abs(face)+capture*3.0;
            const gust=Math.sin(s.age*.88+p.angle)+.4*Math.sin(s.age*1.64+p.depth*8);
            const lift=(1-capture)*(.035+.026*(1+s.lane))*(.45+Math.abs(face));
            const side=(1-capture)*(.024*gust+.032*s.lane+.022*slip);
            const targetX=mix(rimVX,rimVX+localX*to.sx,capture)+clamp(dx/timeLeft,-.40,.40)/aspect;
            const targetY=mix(rimVY,localY*to.sy,capture)+clamp(dy/timeLeft,-.40,.40);
            const response=1-Math.exp(-drag*h);
            s.vx+=response*(targetX+side/aspect-s.vx);
            s.vy+=response*(targetY-lift+(1-capture)*.025*(1-Math.abs(face))-s.vy);
            s.x+=s.vx*h;s.y+=s.vy*h;
            // Hand off in the moist air itself. The position is never snapped
            // to a waypoint or reset to the centre of the destination cloud.
            const px=.5+(s.x-to.cx)/to.sx,py=.5+(s.y-to.cy)/to.sy;
            if(progress>.82 && distance<.042 && px>0&&px<1&&py>0&&py<1 && (weather[to.index].densityAt(px,py)>.14 || s.age>s.duration+1.3)){
              weather[to.index].receive(s.ticket,px,py);s.landed=true;s.touchdown=s.age;
            }
          }
          const speed=Math.hypot(s.vx*aspect,s.vy);
          const free=s.landed?0:1-capture*.73;
          const depthTarget=s.landed?0:s.approach*(1-smooth((progress-.48)/.43));
          const depthRate=1.9+.57*capture;
          s.depthSpeed+=(depthRate*depthRate*(depthTarget-s.near)-2*depthRate*s.depthSpeed)*h;
          s.near=clamp(s.near+s.depthSpeed*h,0,.96);
          const handed=p.depth>.42?1:-1;
          const torque=handed*(.70+speed*5.2)*free+.70*slip*free;
          s.spin+=(torque-(.65+(1-free)*2.2)*s.spin)*h;
          s.pitchSpeed+=((.58*Math.sin(s.roll+.7)*free-.54*s.pitch)-.95*s.pitchSpeed)*h;
          const heading=Math.atan2(s.vy,s.vx*aspect);
          const error=Math.atan2(Math.sin(heading-s.angle),Math.cos(heading-s.angle));
          s.yawSpeed+=(error*(s.landed?2.3:.78)+slip*free*.70-1.15*s.yawSpeed)*h;
          s.roll+=s.spin*h;s.pitch+=s.pitchSpeed*h;s.angle+=s.yawSpeed*h;
        }
        if(s.landed){
          const position=world(to,p.x,p.y);s.x=position.x;s.y=position.y;
          s.focus=1-smooth((s.age-s.touchdown)/1.55);
          if(s.focus<=0){shards.splice(i,1);continue;}
        }else{s.focus=smooth((s.age+.38)/1.4);}
        s.alpha=.24+.73*s.focus;
      }
    }
    return {shards,advance};
  }
  Object.assign(scene,{cloudViews,createShardFlights});
})();
