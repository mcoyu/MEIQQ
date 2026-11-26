/* The promenade, river crossing and far bank are built in metres. Positive z
   looks across the water. Both renderers use these same faces, cables and lamps. */
(() => {
  'use strict';
  const tau=2*Math.PI;
  // Each pair travels along the grade of the bridge and turns behind the quay.
  function bridgeTraffic(t){
    const lamps=[];
    for(const [offset,pace] of [[13,1.31],[26,-1.08],[56,1.16],[86,-1.37]]){
      const x=-110+((offset+pace*t)%114+114)%114,z=118+x*.075+(pace<0?.35:.95);
      const col=pace<0?[.98,.78,.59]:[.91,.41,.28];
      for(const dx of [-.12,.12])lamps.push([x+dx,1.8,z,...col,0,0,.095]);
    }
    return lamps;
  }
  function makeWaterfront(){
    let seed=13871;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    const between=(a,b)=>a+(b-a)*random();
    const color=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    const tint=(c,k)=>c.map(v=>Math.min(1,v*k));
    const group=()=>({faces:[],lines:[],lamps:[]});
    const shore=group(),rail=group(),glints=[];
    const axis=[0,0],wheel=[16,8.2,112],rim=6.65;
    const metal=color('#403d40'),gold=color('#edb67d'),stone=color('#b39e8a');
    const windows=['#e0ae78','#ad8566','#9a8a77','#d7bc92','#b8b2a3'].map(color);
    function vertex(list,p,c,m,arm){list.push(...p,...c,...arm,m);}
    function quad(g,a,b,c,d,col,mat=0,arm=axis){
      for(const p of [a,b,c,a,c,d])vertex(g.faces,p,col,mat,arm);
    }
    function line(g,a,b,col,armA=axis,armB=armA){vertex(g.lines,a,col,0,armA);vertex(g.lines,b,col,0,armB);}
    function lamp(p,col,size=.13,arm=axis){vertex(shore.lamps,p,col,size,arm);}
    function reflection(x,z,col,power,length){glints.push({x,z,col,power,length});}
    // Extruded footprints also give the quay wall and the close timber true side faces.
    function solid(g,foot,bottom,top,col,mat=0,arm=axis){
      const base=foot.map(([x,z])=>[x,bottom,z]),cap=foot.map(([x,z])=>[x,top,z]);
      for(let i=0;i<foot.length;i++){
        const j=(i+1)%foot.length,dx=foot[j][0]-foot[i][0],dz=foot[j][1]-foot[i][1];
        const shade=.77+.19*(dx+.5*dz)/(Math.hypot(dx,dz)||1);
        quad(g,base[i],base[j],cap[j],cap[i],tint(col,shade),mat,arm);
      }
      for(let i=1;i+1<cap.length;i++)for(const p of [cap[0],cap[i],cap[i+1]])vertex(g.faces,p,tint(col,1.13),mat,arm);
    }
    function block(g,x,z,w,d,lo,hi,col,mat=0,arm=axis){
      solid(g,[[x-w/2,z],[x+w/2,z],[x+w/2,z+d],[x-w/2,z+d]],lo,hi,col,mat,arm);
    }
    function windowPane(x,y,z,w,h,col){
      quad(shore,[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],col);
    }
    function building(x,z,w,d,height,kind,far=false){
      const base=color(far?'#322b2d':['#252329','#27262a','#2a2628','#21232a'][Math.floor(random()*4)]);
      block(shore,x,z,w,d,.18,height,base,1);
      const left=x-w/2;
      block(shore,x+between(-.18,.18)*w,z+.42,w*between(.27,.67),d*.54,height,height+between(.35,1.65),tint(base,.95));
      const cols=Math.max(3,Math.floor(w/.72)),rows=Math.floor((height-1)/.87);
      for(let row=0;row<rows;row++){
        const floor=1.0+row*.87;
        if(kind==='terrace'&&row%3===1){
          block(shore,x,z-.10,w*1.01,.3,floor,floor+.105,tint(base,1.64));
          if(random()<.72)windowPane(left+.32+between(0,w*.32),floor+.11,z-.115,w*between(.12,.42),.10,tint(gold,between(.54,.97)));
        }
        for(let col=0;col<cols;col++){
          if(random()>(far?.075:kind==='glass'?.10:.20))continue;
          const bright=between(.26,far?.6:1),lit=tint(windows[Math.floor(random()*windows.length)],bright);
          windowPane(left+(col+.23)*w/cols,floor,z-.025,w/cols*between(.29,.68),between(.14,.38),lit);
        }
      }
      if(!far){
        // Windows turn the corners. Recessed blind bays alternate with occupied rooms.
        for(let row=0;row<rows;row++)for(let k=0;k<Math.floor(d/.85);k++){
          if(random()>.19)continue;
          const side=x-w/2-.035,z0=z+.28+k*.85,y0=1+row*.87;
          quad(shore,[side,y0,z0],[side,y0,z0+.36],[side,y0+.23,z0+.36],[side,y0+.23,z0],tint(windows[k%windows.length],between(.32,.84)));
        }
        for(let k=0;k<Math.floor(w/2.6);k++){
          const mx=x+between(-.35,.35)*w,mz=z+between(.4,.74)*d,top=height+between(.6,1.7);
          block(shore,mx,mz,between(.26,.7),between(.35,.8),height,top,tint(base,.88));
          line(shore,[mx,top,mz],[mx,top+between(.2,.8),mz],tint(base,1.17));
        }
      }
      if(kind==='glass'){
        for(let i=1;i<cols;i+=2)line(shore,[left+i*w/cols,.7,z-.035],[left+i*w/cols,height-.1,z-.035],tint(base,1.24));
        line(shore,[x+w/2,2,z-.03],[x+w/2,height-.6,z-.03],tint(gold,.57));
      }
    }
    // From above the river, the land between the quay and the distant horizon
    // is visible. The bank curves behind the bridge and rises under the back streets.
    function ground(x,row){
      const bend=Math.max(0,Math.min(1,(16-x)/20));
      const shoreZ=112+32*bend+3*Math.sin(x*.077)+1.4*Math.sin(x*.185);
      const distance=[0,9,31,85,205,550][row];
      const rise=[.40,.6,1.1,2.2,5.3,34.0][row];
      const ridge=.5*Math.sin(x*.039+row)+.27*Math.sin(x*.106+.6);
      return [x,rise+ridge*(.16+row*.30),shoreZ+distance];
    }
    const landTones=['#30282a','#2e282c','#302a2e','#332d31','#382f33'].map(color);
    for(let x=-810;x<810;x+=12){
      for(let j=0;j<landTones.length;j++)quad(shore,ground(x,j),ground(x+12,j),ground(x+12,j+1),ground(x,j+1),landTones[j]);
    }
    // Successive blocks sit on different streets; their roofs break the far silhouette.
    for(let x=-132;x<138;){
      const width=between(3.5,10),height=x<-76?between(3,10):x<34?between(1.1,3.9):between(5,18);
      building(x,between(153,178),width,between(3,8),height,'plain',true);x+=width+between(.45,2.3);
    }
    for(let x=30;x<106;){
      const w=between(3.2,8);building(x,between(123,141),w,between(3,7),between(6,16),'terrace');x+=w+between(.48,2.2);
    }
    building(27.2,114.5,8,7,15.7,'glass');
    // The hotel has a chamfered lantern with receding brass ledges and a domed crown.
    function crown(x,z,y,rx,rz,levels){
      const sides=16;
      const ring=(scale,level)=>Array.from({length:sides},(_,i)=>[x+rx*scale*Math.cos(i*tau/sides),level,z+rz*scale*Math.sin(i*tau/sides)]);
      let lower=ring(1,y);
      for(const [scale,height,lit] of levels){
        const next=ring(scale,height);
        for(let i=0;i<sides;i++){
          const j=(i+1)%sides;
          quad(shore,lower[i],lower[j],next[j],next[i],tint(lit?gold:metal,(lit?.55:.67)+.22*Math.cos(i*tau/sides+.9)));
          if(lit&&i%2===0)lamp(next[i],tint(gold,.82),.075);
        }
        lower=next;
      }
    }
    // Warm vertical bays tie the lantern down into its stone podium.
    for(const x of [23.43,24.02,30.38,31.0]){
      block(shore,x,114.30,.105,.18,.72,14.98,color('#5b493d'));
      for(let j=0;j<5;j++)windowPane(x-.025,1+j*2.8,114.27,.085,1.40,tint(gold,.55));
    }
    for(let j=0;j<3;j++)building(24.2+j*2.86,111.95,2.65,1.9,4.4+j*.46,'terrace');
    crown(27.2,118,15.7,3.9,3.25,[[.87,16.25,false],[.86,16.42,true],[.75,18.3,false],[.73,18.5,true],[.65,18.62,false],[.53,19.35,false],[.31,19.83,false],[.06,20.02,false]]);
    building(39.0,119,3.7,4.5,20.4,'glass');
    building(48,117,10.7,6,10.0,'terrace');building(59.2,121,8.6,9,13.8,'terrace');
    block(shore,42,109.4,57.5,2.0,-.14,.58,color('#262226'));
    for(let x=14;x<79;x+=between(1.3,3.8)){
      const c=random()<.18?color('#a5c9c1'):windows[Math.floor(random()*windows.length)];
      lamp([x,between(.77,1.4),109.1],c,between(.1,.18));reflection(x,109.1,c,between(.27,.8),between(.08,.43));
    }
    // Five illuminated pylons and two cable planes recede toward the central quay.
    const bridgeZ=x=>118+x*.075,deck=1.52;
    const span=14.5,px=[-70,-55.5,-41,-26.5,-12];
    function beam(g,a,b,w,col){
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
      const off=[-dy*w/(2*length),dx*w/(2*length)];
      quad(g,[a[0]-off[0],a[1]-off[1],a[2]],[b[0]-off[0],b[1]-off[1],b[2]],[b[0]+off[0],b[1]+off[1],b[2]],[a[0]+off[0],a[1]+off[1],a[2]],col);
    }
    const deckFoot=[[-110,bridgeZ(-110)],[4.9,bridgeZ(4.9)],[4.9,bridgeZ(4.9)+1.7],[-110,bridgeZ(-110)+1.7]];
    solid(shore,deckFoot,deck-.37,deck,color('#6b5247'));
    for(const x of px){
      const z=bridgeZ(x),cap=deck+3.67;
      block(shore,x,z+.16,.48,1.12,-.12,deck-.22,color('#69524b'));
      for(const back of [1.15,0]){
        const cable=color(back?'#574452':'#775865');
        for(const dir of [-1,1]){
          beam(shore,[x+dir*.69,deck,z+back],[x+dir*.12,cap,z+back],.12,color('#aa6e89'));
          for(let j=1;j<=8;j++){
            const at=x+dir*j*(span/16);
            line(shore,[x,cap-.09*j,z+back],[at,deck+.14,bridgeZ(at)+back],tint(cable,.7+j*.028));
          }
        }
      }
      lamp([x,cap-.25,z],color('#e6a4be'),.23);reflection(x,z,color('#d995ac'),.57,.31);
    }
    for(let x=-110;x<5;x+=.76){
      const c=x%4<0?color('#cea0a4'):gold;
      lamp([x,deck+.18,bridgeZ(x)-.05],tint(c,between(.66,1)),.071);
      if(random()<.07)reflection(x,bridgeZ(x),gold,.42,between(.1,.32));
    }
    // Front and rear rims, crossed tension spokes, and gravity-level gondolas.
    const [wx,wy,wz]=wheel;
    function rimPoint(theta,r,z){const arm=[Math.cos(theta)*r,Math.sin(theta)*r];return {p:[wx+arm[0],wy+arm[1],z],arm};}
    function rimLine(a,b,c){line(shore,a.p,b.p,c,a.arm,b.arm);}
    for(const z of [wz,wz+1.04]){
      for(const r of [rim,rim-.27]){
        for(let i=0;i<96;i++)rimLine(rimPoint(tau*i/96,r,z),rimPoint(tau*(i+1)/96,r,z),color('#927c71'));
      }
      for(const dir of [-1,1])beam(shore,[wx+dir*2.9,.53,z],[wx,wy,z],.23,color('#736462'));
    }
    const gondolas=['#86c2a6','#be997d','#87bbc3','#d8b485','#b47f93'].map(color);
    for(let i=0;i<32;i++){
      const a=tau*i/32,edge=rimPoint(a,rim,wz),c=gondolas[i%gondolas.length];
      for(const skew of [-.32,.32])rimLine(rimPoint(a+skew,.58,wz),edge,color('#665b5d'));
      rimLine(edge,rimPoint(a+tau/32,rim,wz+1.04),metal);
      const [x,y,z]=edge.p;
      block(shore,x,z-.24,.59,.55,y-.47,y-.07,tint(c,.52),0,edge.arm);
      quad(shore,[x-.19,y-.37,z-.254],[x+.19,y-.37,z-.254],[x+.19,y-.20,z-.254],[x-.19,y-.20,z-.254],tint(c,i%4===0?.98:.66),0,edge.arm);
      line(shore,[x-.24,y-.07,z-.25],[x+.24,y-.07,z-.25],c,edge.arm);
      lamp([x,y-.14,z-.26],c,.105,edge.arm);
    }
    lamp(wheel,gold,.18);reflection(wx,wz,color('#e5af89'),.49,.35);
    // The landing, waterfront trees and tiny service buildings obscure portions
    // of the far bank and leave intermittent pools of lamplight along its edge.
    solid(shore,[[2.4,118],[6,116],[9,112.7],[13.1,111.7],[18,108.3],[31,109],[42,107.8],[70,107.1],[82,123],[6,126]],-.19,.48,color('#382e2b'));
    block(shore,15.9,109.7,5.9,4,.44,1.06,color('#3a302b'));
    block(shore,16.5,112.2,3.16,1.3,1.06,1.8,color('#37343a'));
    for(let x=4;x<86;x+=between(1.15,3.3)){
      const z= x<18?117-(x-4)*.54:between(108.4,110.2),h=between(.72,2.35);
      const bark=color('#302827'),leaf=color('#262629');
      beam(shore,[x,.40,z],[x,h*.78+.45,z],.11,bark);
      const outline=[];
      for(let i=0;i<11;i++){
        const a=i*tau/11,r=between(.82,1.16);
        outline.push([x+.48*h*r*Math.cos(a),.43+.70*h+.36*h*r*Math.sin(a),z]);
      }
      for(let i=0;i<outline.length;i++){
        for(const v of [[x,.5+.73*h,z-.12],outline[i],outline[(i+1)%outline.length]])vertex(shore.faces,v,tint(leaf,between(.8,1.13)),0,axis);
      }
      if(random()<.39){
        line(shore,[x+.52,.45,z-.43],[x+.52,1.72,z-.43],color('#696159'));
        lamp([x+.52,1.75,z-.45],gold,.14);reflection(x+.52,z-.45,gold,.86,between(.21,.49));
      }
    }
    for(const [x,z,h,c] of [[22,110,1.25,'#bacfc4'],[31.4,109,.97,'#efb889'],[52.8,108.1,1.2,'#f2d7bd'],[-39.7,116,1.35,'#d7a097']]){
      lamp([x,h,z],color(c),.19);reflection(x,z,color(c),1.1,.49);
    }
    // A navigation buoy sits out in the channel, apart from the shore lights.
    block(shore,2.4,44,.23,.21,-.06,.29,color('#272828'));
    line(shore,[2.4,.29,44],[2.4,.85,44],color('#655349'));lamp([2.4,.84,44],color('#e1a779'),.032);
    // A diagonal boardwalk in the immediate foreground. The rails have a top,
    // bevel and underside, grain along the length, and individual joints.
    const railZ=x=>4.05+x*.86;
    function timber(x1,x2,y,h,w){
      const z1=railZ(x1),z2=railZ(x2),b=.025;
      const profile=[[-w/2+b,y],[-w/2,y-b],[-w/2,y-h+b],[-w/2+b,y-h],[w/2,y-h],[w/2,y-b],[w/2-b,y]];
      const colors=['#b47b60','#854e39','#4f3028','#392722','#694437','#9a674f','#b98065'].map(color);
      for(let i=0;i<profile.length;i++){
        const j=(i+1)%profile.length,[za,ya]=profile[i],[zb,yb]=profile[j];
        quad(rail,[x1,ya,z1+za],[x2,ya,z2+za],[x2,yb,z2+zb],[x1,yb,z1+zb],colors[i],2);
      }
    }
    for(let i=-3;i<=8;i++){
      const x=i*3.92-1.25,z=railZ(x);
      const foot=(size,bevel)=>[[-1,-1],[1,-1],[1,1],[-1,1]].flatMap(([sx,sz])=>sx===sz?[[x+sx*(size-bevel),z+sz*size],[x+sx*size,z+sz*(size-bevel)]]:[[x+sx*size,z+sz*(size-bevel)],[x+sx*(size-bevel),z+sz*size]]).sort((a,b)=>Math.atan2(a[1]-z,a[0]-x)-Math.atan2(b[1]-z,b[0]-x));
      // Stone paving on the camera side of the rail anchors the posts on the promenade.
      const next=x+3.91,finish=railZ(next),paving=color(i%2===0?'#615852':'#5c544f');
      for(let row=0;row<3;row++){
        const lip=.26-row*1.36;
        solid(rail,[[x,z+lip-1.35],[next,finish+lip-1.35],[next,finish+lip],[x,z+lip]],-.37,-.10,paving,3);
      }
      // The elevated approach can see inland beyond the first rows of stones.
      // Continue the embankment under the camera so the paving meets solid ground.
      const inland=[[x,z-25],[next+.012,finish-25],[next+.012,finish+.26],[x,z+.26]];
      solid(rail,inland,-1.7,-.38,color('#514a46'),3);
      const pier=i%3===0;
      if(pier){
        solid(rail,foot(.208,.034),-.6,1.31,stone,3);solid(rail,foot(.226,.046),1.31,1.385,tint(stone,1.06),3);
        solid(rail,foot(.195,.041),1.385,1.409,tint(stone,1.08),3);
      }else solid(rail,foot(.087,.012),-.6,1.14,color('#77513e'),2);
      timber(x+.009,x+3.91,1.16,.165,.235);timber(x+.009,x+3.91,.59,.125,.149);
    }
    return {shore,rail,glints};
  }
  window.StudioWaterfront={makeWaterfront,bridgeTraffic};
})();
