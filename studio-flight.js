/* A continuous passage between the cloud camera and the river camera.
   Its position also directs the air clearing over the river and the workspace reveal. */
(() => {
  'use strict';
  const host=document.querySelector('aero-shards'),root=document.querySelector('#root');
  if(!host?.style)return;
  const reducedColors=matchMedia('(forced-colors:active)');
  const isStudio=view=>['studio','planner','jobs'].includes(view);
  const enabled=()=>document.documentElement.dataset.uiMotion==='on'&&!reducedColors.matches;
  function phase(start,end,p){
    const t=Math.min(1,Math.max(0,(p-start)/(end-start)));
    return t*t*(3-2*t);
  }
  const state={active:false,progress:0,sequence:0,phase};
  let previous=null,previousStage='home',goal=0,velocity=0,raf=0,last=0,departure=null;
  // Exact integration of a critically damped spring. Retargeting preserves
  // velocity, even if another route is selected halfway through the move.
  function glide(position,velocity,target,dt,rate){
    const offset=position-target,impulse=velocity+rate*offset,decay=Math.exp(-rate*dt);
    return [target+(offset+impulse*dt)*decay,(velocity-impulse*rate*dt)*decay];
  }
  state.glide=glide;
  state.createShotClock=shots=>{
    let remaining=45+Math.random()*40,index=0;
    const pose={...shots[0]},keys=Object.keys(pose),speeds=keys.map(()=>0);
    return (dt,watching)=>{
      if(watching&&!state.active){
        remaining-=dt;
        if(remaining<=0){
          index=(index+1+Math.floor(Math.random()*(shots.length-1)))%shots.length;
          remaining=55+Math.random()*70;
        }
      }
      const next=shots[watching?index:0];
      for(let i=0;i<keys.length;i++){
        const key=keys[i];
        [pose[key],speeds[i]]=glide(pose[key],speeds[i],next[key],dt,.48);
      }
      return pose;
    };
  };
  function presentFrame(){
    const p=state.progress;
    const ui=goal?phase(.02,.17,p):1-phase(.82,.98,p);
    root.style.setProperty('--studio-shell-visibility',String(ui));
    root.style.setProperty('--studio-shell-lift',(goal?17:-10)*(1-ui)+'px');
    host.style.setProperty('--sky-bank-visibility',String(1-phase(.46,.86,p)));
    host.style.setProperty('--sky-ridge-visibility',String(1-phase(.10,.42,p)));
    root.toggleAttribute('data-flight-revealing',ui<.15);
  }
  function settle(){
    if(!state.active)return;
    cancelAnimationFrame(raf);raf=last=velocity=0;
    state.progress=goal;state.active=false;
    host.removeAttribute('studio-flight');root.removeAttribute('data-studio-flight');root.removeAttribute('data-flight-revealing');
    root.style.removeProperty('--studio-shell-visibility');root.style.removeProperty('--studio-shell-lift');
    host.style.removeProperty('--sky-bank-visibility');host.style.removeProperty('--sky-ridge-visibility');
    departure?.remove();departure=null;
  }
  function tick(now){
    raf=0;if(!state.active||document.hidden)return;
    if(!enabled()){settle();return;}
    // Integrate the directed speed so Back or Forward turns from the current
    // position, including when either renderer is using software painting.
    const dt=last?Math.max(0,(now-last)/1000):0;last=now;
    [state.progress,velocity]=glide(state.progress,velocity,goal,dt,.92);
    presentFrame();
    if(Math.abs(state.progress-goal)<.001&&Math.abs(velocity)<.001){settle();return;}
    raf=requestAnimationFrame(tick);
  }
  function retireWorkspace(){
    // Move the real outgoing interface aside for its short exit. The next
    // workspace and its route are available immediately for focus and history.
    const app=root.firstElementChild;
    const body=app?.querySelector(':scope > .shell');
    if(!body)return;
    const opacity=Number(getComputedStyle(body).opacity);
    if(opacity<.015)return;
    departure?.remove();
    const shell=document.createElement('div');
    shell.className='scene-departure';shell.inert=true;shell.setAttribute('aria-hidden','true');
    shell.style.top=body.getBoundingClientRect().top+'px';
    for(const el of body.querySelectorAll('[id],details[name]')){el.removeAttribute('id');if(el.localName==='details')el.removeAttribute('name');}
    const frame=app.cloneNode(false);
    frame.append(body);shell.append(frame);root.after(shell);departure=shell;
    const exit=shell.animate([{opacity,translate:'0 0'},{opacity:0,translate:goal?'0 -12px':'0 10px'}],
      {duration:240,easing:'ease-in',fill:'forwards'});
    exit.finished.then(()=>shell.remove(),()=>shell.remove());
  }
  state.route=(view,stage)=>{
    const from=previous,fromStage=previousStage;previous=view;previousStage=stage;state.view=view;
    if(from===view&&stage===fromStage)return;
    if(from!==null&&isStudio(from)===isStudio(view)){
      if(state.active){
        if(isStudio(view))host.setAttribute('studio-flight',view);
        else state.skyStage=stage;
      }
      return;
    }
    const entering=from!==null&&!isStudio(from)&&isStudio(view),leaving=isStudio(from)&&!isStudio(view);
    if(!(entering||leaving)||!enabled()||document.hidden){settle();return;}
    goal=entering?1:0;state.skyStage=entering?fromStage:stage;
    if(!state.active){
      state.active=true;state.progress=1-goal;velocity=last=0;state.sequence++;
    }
    retireWorkspace();
    host.setAttribute('studio-flight',entering?view:from);
    root.setAttribute('data-studio-flight',entering?'arriving':'returning');
    presentFrame();
    if(!raf)raf=requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange',()=>{
    if(!state.active)return;
    cancelAnimationFrame(raf);raf=last=0;
    if(!document.hidden)raf=requestAnimationFrame(tick);
  });
  // Keyboard and pointer users can take control at any point during travel.
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'||(root.hasAttribute('data-flight-revealing')&&['Tab','Enter',' '].includes(e.key)))settle();
  },true);
  document.addEventListener('pointerdown',e=>{
    if(state.active&&!e.target.closest?.('a[href^="#"]'))settle();
  },true);
  function motionChanged(){if(!enabled())settle();}
  reducedColors.addEventListener('change',motionChanged);
  new MutationObserver(motionChanged).observe(document.documentElement,{attributes:true,attributeFilter:['data-ui-motion']});
  window.StudioFlight=state;
})();
