// Rendering budgets change sampling cost, never layout, models or navigation.
export function sceneProfile({width=1280,height=800,dpr=1,coarse=false,memory=8,cores=8}={}){
 const compact=width<700||coarse,limited=compact||(memory<=4&&cores<=4),pixelBudget=limited?800000:2200000,maxRatio=limited?1.25:1.5;
 return{limited,fps:limited?30:60,pixelBudget,maxRatio,minRatio:limited?.75:1,ratio:Math.min(dpr,maxRatio,Math.sqrt(pixelBudget/Math.max(1,width*height))),shadowSize:limited?512:1024,shadowHz:limited?10:20,bloomHz:limited?0:15,reflectionHz:limited?8:12};
}
export function frameGate(fps=60){let last=-Infinity;const interval=1000/fps;return{step(now){const elapsed=now-last;if(elapsed<interval-.5)return false;last=Number.isFinite(last)?last+Math.max(1,Math.floor((elapsed+.5)/interval))*interval:now;return true;},reset(){last=-Infinity;}};}
export function resolutionBudget({ratio,minRatio,fps=60}){
 let current=ratio,started=0,previous=null,total=0,count=0,changed=-Infinity;
 return{sample(now){if(previous!==null){const gap=now-previous;if(gap>0&&gap<500){total+=gap;count++;}}previous=now;if(!started)started=now;if(now-started<2000||count<20)return false;const average=total/count;started=now;total=count=0;if(average>1000/fps*1.35&&current>Math.min(ratio,minRatio)+.02){current=Math.max(Math.min(ratio,minRatio),current*.85);changed=now;return true;}if(average<1000/fps*1.12&&now-changed>20000&&current<ratio-.02){current=Math.min(ratio,current/.85);changed=now;return true;}return false;},reset(){previous=null;started=0;total=count=0;},get ratio(){return current;}};
}
export default function sceneBudget({container,renderer,svg=false}){
 const device=typeof navigator==='undefined'?{}:navigator,coarse=typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches;
 const quality=sceneProfile({width:container.clientWidth||1280,height:container.clientHeight||800,dpr:typeof devicePixelRatio==='undefined'?1:devicePixelRatio,coarse,memory:device.deviceMemory??8,cores:device.hardwareConcurrency??8});
 const gate=frameGate(svg?30:quality.fps);let resolution=null,w=1,h=1,dirty=true,paused=false,lastDraw=-Infinity,lastShadow=-Infinity,pendingSize=false,frames=0;
 if(!svg&&renderer.shadowMap)renderer.shadowMap.autoUpdate=false;
 function invalidate(){dirty=true;}
 function resize(width,height){w=Math.max(1,width);h=Math.max(1,height);const max=Math.min(quality.maxRatio,typeof devicePixelRatio==='undefined'?1:devicePixelRatio,Math.sqrt(quality.pixelBudget/(w*h)));resolution=resolutionBudget({ratio:max,minRatio:quality.minRatio,fps:quality.fps});if(!svg)renderer.setPixelRatio(max);renderer.setSize(w,h);pendingSize=false;lastShadow=-Infinity;dirty=true;}
 function step(now,isPaused=false){if(isPaused){paused=true;gate.reset();resolution?.reset();return false;}if(paused){paused=false;dirty=true;}if(!gate.step(now))return false;if(!svg&&resolution?.sample(now))pendingSize=true;return true;}
 function render(effects,now,{moving=false}={}){
  if(moving)dirty=true;if(svg&&(!dirty||now-lastDraw<250))return false;
  if(pendingSize){renderer.setPixelRatio(resolution.ratio);renderer.setSize(w,h);effects.resize(w,h);pendingSize=false;lastShadow=-Infinity;}
  if(!svg&&renderer.shadowMap&&now-lastShadow>=1000/quality.shadowHz){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
  effects.render(now);dirty=false;lastDraw=now;frames++;return true;
 }
 return{quality,step,resize,render,invalidate,stats(){return{renderer:svg?'svg':'webgl',targetFps:svg?null:quality.fps,pixelRatio:svg?1:renderer.getPixelRatio(),frames,bloomHz:svg?0:quality.bloomHz,shadowHz:svg?0:quality.shadowHz};}};
}

// Freeze local matrices only where no animation is declared. Dynamic groups,
// lights and their targets remain live; hit targets retain world coordinates.
export function freezeStaticTransforms(root){
 root.updateMatrixWorld(true);let count=0;
 function visit(o,dynamic=false){dynamic=dynamic||!!o.userData.dynamic;if(!dynamic&&(o.isMesh||o.isGroup)){o.updateMatrix();o.matrixAutoUpdate=false;count++;}for(const child of o.children)visit(child,dynamic);}
 visit(root);return count;
}

export function projectionGate(interval=100){let last=-Infinity,view='';const due=(now,camera,level=0)=>{if(now-last<interval)return false;last=now;const p=camera.position,q=camera.quaternion,next=[p.x,p.y,p.z,q.x,q.y,q.z,q.w,camera.zoom,level,camera.aspect,camera.fov].join(':');if(next===view)return false;view=next;return true;};due.reset=()=>{view='';last=-Infinity;};return due;}
