import * as THREE from 'three';
// Rendering budgets change sampling cost, never layout, models or navigation.
export function sceneProfile({width=1280,height=800,dpr=1,coarse=false,memory=8,cores=8}={}){
 const compact=width<700||coarse,limited=compact||(memory<=4&&cores<=4),pixelBudget=limited?800000:2200000,maxRatio=limited?1.25:1.5;
 return{limited,fps:limited?30:60,pixelBudget,maxRatio,minRatio:limited?.75:1,ratio:Math.min(dpr,maxRatio,Math.sqrt(pixelBudget/Math.max(1,width*height))),shadowSize:limited?512:1024,shadowHz:limited?10:20,bloomHz:limited?0:15,reflectionHz:limited?8:12};
}
export function frameGate(fps=60){let last=-Infinity,interval=1000/fps;return{setFps(next){interval=1000/next;},get fps(){return 1000/interval;},step(now){const elapsed=now-last;if(elapsed<interval-.5)return false;last=Number.isFinite(last)?last+Math.max(1,Math.floor((elapsed+.5)/interval))*interval:now;return true;},reset(){last=-Infinity;}};}
// Idle throttling: after a quiet spell with no input and no camera or player
// movement, ambient animation (water, sky, motes) keeps running at a lower
// rate. Any touch, key, wheel or pointer movement restores full rate at once.
// One shared listener set for every scene; nothing to dispose per scene.
export const IDLE_AFTER_MS=6000,AMBIENT_SHADOW_HZ=4;
let lastActivity=-Infinity,listening=false;
export function noteActivity(now=typeof performance==='undefined'?Date.now():performance.now()){lastActivity=now;}
function listenForActivity(){if(listening||typeof window==='undefined')return;listening=true;noteActivity();const mark=()=>noteActivity();for(const type of ['pointerdown','pointermove','wheel','keydown','touchstart'])window.addEventListener(type,mark,{passive:true,capture:true});}
export function idleProfile(quality){return{fps:quality.limited?15:30,shadowHz:2};}
export function isIdle(now,lastMove,since=lastActivity){return now-Math.max(since,lastMove)>IDLE_AFTER_MS;}
export function resolutionBudget({ratio,minRatio,fps=60}){
 let current=ratio,started=0,previous=null,total=0,count=0,changed=-Infinity;
 return{sample(now){if(previous!==null){const gap=now-previous;if(gap>0&&gap<500){total+=gap;count++;}}previous=now;if(!started)started=now;if(now-started<2000||count<20)return false;const average=total/count;started=now;total=count=0;if(average>1000/fps*1.35&&current>Math.min(ratio,minRatio)+.02){current=Math.max(Math.min(ratio,minRatio),current*.85);changed=now;return true;}if(average<1000/fps*1.12&&now-changed>20000&&current<ratio-.02){current=Math.min(ratio,current/.85);changed=now;return true;}return false;},reset(){previous=null;started=0;total=count=0;},get ratio(){return current;}};
}
export default function sceneBudget({container,renderer,svg=false}){
 const device=typeof navigator==='undefined'?{}:navigator,coarse=typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches;
 const quality=sceneProfile({width:container.clientWidth||1280,height:container.clientHeight||800,dpr:typeof devicePixelRatio==='undefined'?1:devicePixelRatio,coarse,memory:device.deviceMemory??8,cores:device.hardwareConcurrency??8});
 const gate=frameGate(svg?30:quality.fps),idleQuality=idleProfile(quality);let resolution=null,w=1,h=1,dirty=true,paused=false,lastDraw=-Infinity,lastShadow=-Infinity,lastMotion=-Infinity,idle=false,pendingSize=false,frames=0,svgInterval=0;listenForActivity();
 if(!svg&&renderer.shadowMap){
  renderer.shadowMap.autoUpdate=false;
  // Refraction is sampled through translucent materials. Keep the main
  // canvas sharp while reducing the resolution of the extra scene pass.
  renderer.transmissionResolutionScale=quality.limited?.5:.75;
 }
 function invalidate(){dirty=true;}
 function resize(width,height){
  w=Math.max(1,width);h=Math.max(1,height);
  const max=Math.min(quality.maxRatio,typeof devicePixelRatio==='undefined'?1:devicePixelRatio,Math.sqrt(quality.pixelBudget/(w*h)));
  resolution=resolutionBudget({ratio:max,minRatio:quality.minRatio,fps:quality.fps});
  if(svg)renderer.setSize(w,h);
  else{
   renderer.setDrawingBufferSize(w,h,max);
   renderer.domElement.style.width=w+'px';
   renderer.domElement.style.height=h+'px';
  }
  pendingSize=false;lastShadow=-Infinity;dirty=true;
 }
 function step(now,isPaused=false){if(isPaused){paused=true;gate.reset();resolution?.reset();return false;}if(paused){paused=false;dirty=true;noteActivity(now);}const quiet=!svg&&isIdle(now,lastMotion);if(quiet!==idle){idle=quiet;gate.setFps(idle?idleQuality.fps:quality.fps);resolution?.reset();}if(!gate.step(now))return false;if(!svg&&!idle&&resolution?.sample(now))pendingSize=true;return true;}
 function render(effects,now,{moving=false,castersMoving=moving}={}){
  if(moving){dirty=true;lastMotion=now;}
  if(svg&&(!dirty||now-lastDraw+.5<svgInterval))return false;
  if(pendingSize&&now-lastMotion>=250){
   if(Math.abs(renderer.getPixelRatio()-resolution.ratio)>.02){
    renderer.setDrawingBufferSize(w,h,resolution.ratio);
    effects.resize(w,h);
   }
   pendingSize=false;
  }
  // The world and the sun are fixed while the camera pans or zooms, so the
   // shadow map only needs a full refresh when a caster (player, chick) moves.
   // Slow ambient animation (spinning armillaries, windmills) refreshes at 4Hz.
   const updateShadow=!svg&&renderer.shadowMap&&now-lastShadow>=1000/(idle?idleQuality.shadowHz:castersMoving?quality.shadowHz:AMBIENT_SHADOW_HZ);
  if(updateShadow){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
  if(svg){
   const started=performance.now();
   effects.render(now);
   // Leave time for browser input and painting when SVG projection is expensive.
   svgInterval=Math.min(200,Math.max(1000/30,(performance.now()-started)*1.25));
  }else effects.render(now,updateShadow);
  dirty=false;lastDraw=now;frames++;return true;
 }
 return{quality,step,resize,render,invalidate,invalidateShadow(){lastShadow=-Infinity;},get idle(){return idle;},stats(){return{renderer:svg?'svg':'webgl',targetFps:svg?null:quality.fps,pixelRatio:svg?1:renderer.getPixelRatio(),frames,idle,currentFps:svg?null:gate.fps,bloomHz:svg?0:quality.bloomHz,shadowHz:svg?0:idle?idleQuality.shadowHz:quality.shadowHz};}};
}

// Rank nearby fixtures only while their lights can affect the scene. Crossing
// the range boundary always takes effect, even after a sub-unit camera move.
export function trackLocalLights(lights,island,range,step){
 let active=null,lastX=0,lastZ=0;
 return target=>{
  if(!lights.length)return false;
  const nearby=Math.hypot(target.x-island.x,target.z-island.z)<range;
  if(!nearby){
   if(active!==false)for(const light of lights)light.visible=false;
   active=false;
   return false;
  }
  if(active&&Math.hypot(target.x-lastX,target.z-lastZ)<step)return false;
  active=true;
  lastX=target.x;
  lastZ=target.z;
  return true;
 };
}

// Freeze local matrices only where no animation is declared. Dynamic groups,
// lights and their targets remain live; hit targets retain world coordinates.
// Small props (lanterns, bolts, petals, window trims) barely darken the
// ground at this camera distance but each one costs a draw in the shadow
// pass. Keep shadows for anything with real volume; tiny parts still
// receive shadows from larger casters.
export function pruneShadowCasters(root,minRadius=.45){
 root.updateMatrixWorld(true);const scale=new THREE.Vector3();let kept=0,pruned=0;
 root.traverse(o=>{if(!o.isMesh||!o.castShadow)return;for(let p=o;p;p=p.parent)if(p.userData.keepShadow){kept++;return;}const g=o.geometry;if(!g.boundingSphere)g.computeBoundingSphere();o.getWorldScale(scale);const r=(g.boundingSphere?.radius??0)*Math.max(scale.x,scale.y,scale.z)*(o.isInstancedMesh?4:1);if(r<minRadius){o.castShadow=false;pruned++;}else kept++;});
 return{kept,pruned};
}

export function freezeStaticTransforms(root){
 root.updateMatrixWorld(true);let count=0;
 function visit(o,dynamic=false){dynamic=dynamic||!!o.userData.dynamic;if(!dynamic&&(o.isMesh||o.isGroup)){o.updateMatrix();o.matrixAutoUpdate=false;count++;}for(const child of o.children)visit(child,dynamic);}
 visit(root);return count;
}

export function projectionGate(interval=100){let last=-Infinity,view='';const due=(now,camera,level=0)=>{if(now-last<interval)return false;last=now;const p=camera.position,q=camera.quaternion,next=[p.x,p.y,p.z,q.x,q.y,q.z,q.w,camera.zoom,level,camera.aspect,camera.fov].join(':');if(next===view)return false;view=next;return true;};due.reset=()=>{view='';last=-Infinity;};return due;}
