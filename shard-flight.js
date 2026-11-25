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
    function clear(){
      for(const s of shards)if(!s.landed)s.ticket.parcel.inFlight=false;
      shards.length=0;delay=.28;
    }
    function launch(views,aspect){
      const route=choosePassage(views,weather,aspect,lastSource);
      if(!route)return;
      const {a,b}=route;
      for(let i=0;i<3;i++){
        const u=a.u+[0,-.033,.028][i], v=a.v+[0,.024,.047][i];
        const ticket=weather[a.view.index].release(u,v);
        if(!ticket)continue;
        const p=ticket.parcel;
        shards.push({ticket,from:a.view,to:b.view,u:b.u+(i-1)*.024,v:b.v+(1-i)*.029,
          age:-i*1.12,duration:6.9+i*.36+p.seed*.55,lane:i-1,landed:false,
          x:0,y:0,focus:0,alpha:0,roll:0,pitch:0,yaw:0});
      }
      if(shards.length)lastSource=a.view.index;
    }
    function advance(dt,views,aspect){
      if(!dt)return;
      if(!shards.length){
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
        s.age+=dt;
        const t=clamp(s.age/s.duration);
        if(!s.landed){
          const start=world(from,p.x,p.y);
          const [u,v]=nearestCloud(weather[to.index],s.u,s.v);
          const follow=1-Math.exp(-dt*1.9);
          s.u=mix(s.u,u,follow);s.v=mix(s.v,v,follow);
          const end=world(to,s.u,s.v), along=smooth(t), arc=Math.sin(Math.PI*t);
          const curl=Math.sin(2*Math.PI*t+p.depth*.85);
          s.x=mix(start.x,end.x,along)+arc*(.020+.013*s.lane+.014*curl)/aspect;
          s.y=mix(start.y,end.y,along)+arc*(-.045+.031*s.lane+.034*curl);
          s.focus=smooth((s.age+.48)/1.7);
          s.yaw=Math.atan2(end.y-start.y,(end.x-start.x)*aspect)*.52;
          if(t===1){weather[to.index].receive(s.ticket,s.u,s.v);s.landed=true;}
        }
        if(s.landed){
          const position=world(to,p.x,p.y);
          s.x=position.x;s.y=position.y;
          s.focus=1-smooth((s.age-s.duration)/1.65);
          if(s.focus<=0){shards.splice(i,1);continue;}
        }
        const spin=Math.max(0,s.age), settle=Math.min(spin,s.duration);
        s.roll=p.angle+settle*(1.47+.58*p.depth);
        s.pitch=.64*Math.sin(p.angle*.51+settle*(.8+.2*p.seed));
        s.angle=s.yaw+.39*Math.sin(settle*.99+p.angle)+.56*Math.sin(settle*.44+p.depth);
        s.alpha=.23+.74*s.focus;
      }
    }
    return {shards,advance,clear};
  }
  Object.assign(scene,{cloudViews,createShardFlights});
})();
