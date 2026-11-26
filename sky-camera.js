/* The camera travels a single reversible path. Screen y and world y point down.
   Cloud depths are in world units; the moon and stars are directions at infinity. */
(() => {
  'use strict';
  const {clamp}=window.SunsetScene;
  const stops={home:0,surface:1,night:2,offers:3,demand:4,people:5,cash:6,map:7,finances:8,projects:9,scenarios:10,about:11};
  // Camera marks: path position, eye x/y/z, sky framing x/y, roll in degrees.
  // The intermediate mark rounds the shoulder of the near cloud as daylight falls.
  const marks=[
    [0,    0,    0,    0,     0,     0,     0],
    [.54, -.36,-.09,  .31,   .033, -.016, -1.05],
    [1,   -.41,-.17,  .56,   .063, -.045,  -.4],
    [1.46,-.68,-.30,  .72,   .090, -.035, -1.65],
    [2,   -.22,-.51,  .77,   .130, -.122,  -.35],
    [3,    .40,-.83, 1.00,   .155, -.284,   .24],
    [4,    .83,-.90, 1.12,   .055, -.299,  -.45],
    [5,   1.18,-.98, 1.23,  -.020, -.277,   .56],
    [6,   1.39,-1.08,1.35,  -.105, -.304,   .04],
    // Clear the near bank on the way to the run. The review position moves
    // along the same bank and looks back across the open part of the sky.
    [6.50,1.60,-1.13,1.43,  -.070, -.266,  -.69],
    [7,   1.83,-1.00,1.41,   .037, -.235,  -.18],
    [7.50,1.96,-.96, 1.34,   .121, -.246,   .34],
    [8,   2.03,-1.01,1.28,   .190, -.286,   .08],
    [9,   1.43,-1.18,1.20,   .083, -.265,   .48],
    [10,   .96,-1.13,1.07,  -.106, -.295,  -.24],
    [11,   .45,-.90,  .93,  -.215, -.260,   .28]
  ];
  // Shape-preserving tangents keep depth and tilt within their authored ranges
  // and carry the eye through intermediate marks without stopping at each one.
  function tangent(i,j){
    const a=marks[Math.max(0,i-1)],b=marks[i],c=marks[Math.min(i+1,marks.length-1)];
    if(a===b)return (c[j]-b[j])/(c[0]-b[0]);
    if(c===b)return (b[j]-a[j])/(b[0]-a[0]);
    const l=(b[j]-a[j])/(b[0]-a[0]),r=(c[j]-b[j])/(c[0]-b[0]);
    return l*r<=0?0:2*l*r/(l+r);
  }
  const tangents=marks.map((row,i)=>row.map((_,j)=>tangent(i,j)));
  function createSkyCamera(initial){
    let position=stops[initial]??0,target=position,velocity=0,elapsed=0,duration=0,start=position,entryVelocity=0;
    let aspect=1,width=1,height=1;
    const wideLens=1.04;
    let lens=wideLens;
    const pose=new Float64Array(6),axes=new Float32Array(9);
    let shortcut=null;
    function sampleMark(p,out){
      const i=Math.max(0,marks.findIndex((m,j)=>j>0&&m[0]>=p)-1),a=marks[i],b=marks[i+1];
      const span=b[0]-a[0],t=clamp((p-a[0])/span),s=t*t*(3-2*t);
      for(let j=1;j<a.length;j++)out[j-1]=a[j]+(b[j]-a[j])*s+span*t*(1-t)*((1-t)*tangents[i][j]-t*tangents[i+1][j]);
    }
    function samplePose(out,p=position,clock=elapsed){
      if(!shortcut){sampleMark(p,out);return;}
      const t=clamp(clock/duration),r=1-t,ease=t*t*t*(10+t*(6*t-15));
      for(let i=0;i<6;i++)out[i]=shortcut.from[i]+(shortcut.to[i]-shortcut.from[i])*ease+shortcut.rate[i]*duration*t*r*r*r;
      if(shortcut.intoRun){
        // A direct launch from an earlier step takes the shoulder of the
        // cloud once. Zero slope at either end keeps interrupted travel smooth.
        const bank=16*t*t*r*r;
        out[1]-=.10*bank;out[2]+=.065*bank;out[4]-=.018*bank;out[5]-=.66*bank;
      }
    }
    function aim(w,h,descent,shot){
      width=w;height=h;aspect=w/h;samplePose(pose);
      lens=wideLens/(shot?.zoom??1);
      if(shot){pose[0]+=shot.track??0;pose[1]-=shot.lift??0;pose[3]+=shot.x;pose[4]+=shot.y;}
      if(descent){
        // Fly toward the actual lower bank. Once inside its shoulder, cross
        // beneath it so the near edge sweeps up while the distant sky barely turns.
        const {x,y,depth,approach,drop,bank}=descent;
        for(let j=0;j<6;j++)pose[j]*=1-approach;
        pose[0]+=(x-.5)*aspect*lens*depth*.92*approach+bank*.12;
        pose[1]+=(y-.5)*lens*depth*.88*approach+.81*drop;
        pose[2]+=Math.min(2.14,depth*.73)*approach;
        pose[3]+=.044*bank;pose[4]-=.105*bank+.045*drop;pose[5]-=1.55*bank;
      }
      const yaw=-Math.atan(pose[3]*Math.min(aspect,2.1)*lens),pitch=-Math.atan(pose[4]*lens),roll=pose[5]*Math.PI/180;
      const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
      axes.set([cy*cr-sy*sp*sr,cp*sr,-sy*cr-cy*sp*sr, -cy*sr-sy*sp*cr,cp*cr,sy*sr-cy*sp*cr, sy*cp,sp,cy*cp]);
    }
    function go(stage,animate){
      const to=stops[stage]??0;
      if(!animate){position=target=to;velocity=duration=elapsed=0;shortcut=null;return;}
      if(target===to)return;
      // A navigator jump flies straight to its framing. Keep the outgoing
      // pose and its velocity when a second destination is chosen mid-flight.
      const cloudPass=position<=stops.night&&to<=stops.night;
      if(shortcut||!cloudPass&&Math.abs(to-position)>1.55){
        const from=[],ahead=[],end=[];
        samplePose(from);samplePose(ahead,clamp(position+velocity*.001,0,stops.about),elapsed+.001);sampleMark(to,end);
        shortcut={from,to:end,rate:ahead.map((v,i)=>(v-from[i])*1000),intoRun:to===stops.map&&position>=stops.night&&to-position>1.55};
      }
      start=position;target=to;elapsed=0;entryVelocity=velocity;
      const distance=Math.abs(to-start);
      const crossesTwilight=Math.min(start,to)<2&&Math.max(start,to)>1;
      duration=crossesTwilight?7.8:Math.min(5.4,2.4+1.25*Math.sqrt(distance));
      // Keep the current velocity if a nearer mark is selected while in flight.
      if(velocity*(to-start)>0)duration=Math.min(duration,2.6*distance/Math.abs(velocity));
    }
    function advance(dt){
      if(!duration)return;
      elapsed+=dt;
      if(elapsed>=duration){position=target;velocity=duration=0;shortcut=null;return;}
      const t=elapsed/duration,r=1-t,delta=target-start;
      const ease=t*t*t*(10+t*(6*t-15));
      position=clamp(start+delta*ease+entryVelocity*duration*t*r*r*r,0,stops.about);
      velocity=delta*30*t*t*r*r/duration+entryVelocity*r*r*(1-4*t);
    }
    // This homography projects a world plane straight into clip space, including
    // the perspective divide. Cloud bodies and their copper parcels share it.
    function plane(depth){
      const k=depth*wideLens/height,X=-width*.5*k-pose[0],Y=-height*.5*k-pose[1],Z=depth-pose[2];
      const sx=2/(aspect*lens),sy=-2/lens;
      return [k*axes[0]*sx,k*axes[3]*sy,k*axes[6],k*axes[1]*sx,k*axes[4]*sy,k*axes[7],
        (X*axes[0]+Y*axes[1]+Z*axes[2])*sx,(X*axes[3]+Y*axes[4]+Z*axes[5])*sy,X*axes[6]+Y*axes[7]+Z*axes[8]];
    }
    function project(x,y,depth=Infinity){
      const k=Number.isFinite(depth)?1/depth:0;
      const X=(x-.5)*aspect*wideLens-pose[0]*k,Y=(y-.5)*wideLens-pose[1]*k,Z=1-pose[2]*k;
      const z=X*axes[6]+Y*axes[7]+Z*axes[8],scale=1/Math.max(.025,z);
      return [width*.5+height*(X*axes[0]+Y*axes[1]+Z*axes[2])*scale/lens,
        height*.5+height*(X*axes[3]+Y*axes[4]+Z*axes[5])*scale/lens,scale*wideLens/lens];
    }
    function unproject(x,y,depth=Infinity){
      const u=(x-.5)*aspect*lens,v=(y-.5)*lens,k=Number.isFinite(depth)?1/depth:0;
      const dx=u*axes[0]+v*axes[3]+axes[6],dy=u*axes[1]+v*axes[4]+axes[7],dz=u*axes[2]+v*axes[5]+axes[8];
      const scale=(1-pose[2]*k)/Math.max(.10,dz);
      return [.5+(pose[0]*k+dx*scale)/(aspect*wideLens),.5+(pose[1]*k+dy*scale)/wideLens];
    }
    function coverage(depth){
      const xs=[unproject(0,0,depth)[0],unproject(1,0,depth)[0],unproject(0,1,depth)[0],unproject(1,1,depth)[0]];
      return [Math.min(0,...xs)-.025,Math.max(1,...xs)+.025];
    }
    return {aim,go,advance,project,unproject,plane,coverage,axes,get lens(){return lens;},get position(){return position;},get moving(){return duration>0;}};
  }
  window.SunsetScene.createSkyCamera=createSkyCamera;
})();
