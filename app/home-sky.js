import * as THREE from 'three';
import {islands} from '../lib/archipelago.ts';
import {homeAtmospheres} from '../lib/home-atmosphere.ts';
import {seeded} from './art-kit.js';

const heights={home:36,technology:36,mine:28,art:18,library:16,social:21,information:12};
const clamp01=n=>Math.max(0,Math.min(1,n)),smooth01=n=>n*n*(3-2*n);
function hull(points){
 const sorted=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];
 for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of sorted.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}
function polygonDistance(x,y,poly){
 let positive=false,negative=false,best=Infinity;
 for(let n=0;n<poly.length;n++){
  const a=poly[n],b=poly[(n+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,cross=dx*(y-a.y)-dy*(x-a.x);if(cross>0)positive=true;if(cross<0)negative=true;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1))),d=(x-a.x-dx*t)**2+(y-a.y-dy*t)**2;best=Math.min(best,d);
 }return positive&&negative?Math.sqrt(best):0;
}
export function skyRegions(camera,w,h,origins={}){
 camera.updateMatrixWorld();const v=new THREE.Vector3();
 const point=(x,y,z)=>{v.set(x,y,z).project(camera);return{x:(v.x*.5+.5)*w,y:(-v.y*.5+.5)*h};};
 function project(i,home=false){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const x of [-i.rx-2,i.rx+2])for(const z of [-i.rz-2,i.rz+2])for(const y of [i.height-13,i.height+heights[i.id]+(home?13:0)]){
   v.set(i.x+x,y,i.z+z).project(camera);const px=(v.x*.5+.5)*w,py=(-v.y*.5+.5)*h;
   minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
  }return{x:minX,y:minY,w:maxX-minX,h:maxY-minY};
 }
 return{home:project(islands[0],true),protected:islands.slice(1).map(i=>{
  const result={id:i.id,...project(i),parts:[]};if(i.id==='technology'||i.id==='social')return result;
  const platform=[];for(let n=0;n<20;n++){const a=n/20*Math.PI*2;for(const [r,y]of [[1.04,i.height+6],[1.04,i.height],[.7,i.height-12]])platform.push(point(i.x+Math.sin(a)*i.rx*r,y,i.z+Math.cos(a)*i.rz*r));}
  result.parts.push(hull(platform));
  const profile=i.id==='library'?{rx:9.2,rz:7.6,z:-2.5,h:14}:i.id==='art'?{rx:9,rz:9,z:-1.6,h:14}:i.id==='mine'?{rx:15,rz:13,z:-3,h:28}:{rx:9.6,rz:7.5,z:-.5,h:12},building=[];
  const origin=origins[i.id]??i;
  for(const x of [-profile.rx,profile.rx])for(const z of [-profile.rz,profile.rz])for(const y of [0,profile.h])building.push(point(origin.x+x,i.height+y,origin.z+profile.z+z));result.parts.push(hull(building));return result;
 })};
}

export function skyMaskAt(x,y,regions,feather=64){
 const a=regions.home,cx=a.x+a.w*.5,cy=a.y+a.h*.43,rx=a.w*.73,ry=a.h*.75,r=Math.hypot((x-cx)/rx,(y-cy)/ry);
 let alpha=1-smooth01(clamp01((r-.52)/.48));
 if(!alpha)return 0;
 for(const b of regions.protected){
  const dx=Math.max(b.x-10-x,0,x-b.x-b.w-10),dy=Math.max(b.y-10-y,0,y-b.y-b.h-10);
  if(Math.hypot(dx,dy)>feather)continue;
  let distance=Math.hypot(dx,dy);if(b.parts?.length){distance=Infinity;for(const poly of b.parts)distance=Math.min(distance,polygonDistance(x,y,poly));}
  alpha*=smooth01(clamp01((distance-(b.parts?.length?8:0))/feather));if(!alpha)return 0;
 }return alpha;
}

// A small 2D sky layer under the transparent 3D render. Its soft projected mask
// belongs to the main island. Six exclusion masks protect the other districts'
// scenery AND their surrounding background, even in the shared overview.
// This avoids a second 3D world render, global fog changes or a huge sky dome.
export default function homeSky({container,camera,target,phase='medieval',buildings=new Map()}){
 const canvas=document.createElement('canvas'),buffer=document.createElement('canvas'),maskCanvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),paint=buffer.getContext('2d'),maskPaint=maskCanvas.getContext('2d');
 canvas.className='home-local-sky';canvas.setAttribute('aria-hidden','true');canvas.dataset.scope='home';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
 container.prepend(canvas);let current=phase,w=1,h=1,last=-Infinity,dirty=true,lastView='',maskView='',maskData=null;
 const origins={};for(const b of buildings.values())if(['library','gallery','factory'].includes(b.p?.specialType))origins[b.p.islandId]={x:b.x,z:b.z};
 const random=seeded(31415),clouds=Array.from({length:8},()=>({x:random(),y:random()*.7,r:.06+random()*.06,s:.001+random()*.001})),stars=Array.from({length:44},()=>({x:random(),y:random()*.8,r:.45+random()*.65,t:random()*Math.PI*2}));
 function resize(width,height){const scale=Math.min(1,768/width,768/height);w=Math.max(1,Math.round(width*scale));h=Math.max(1,Math.round(height*scale));canvas.width=buffer.width=w;canvas.height=buffer.height=h;maskCanvas.width=Math.min(64,w);maskCanvas.height=Math.min(128,h);maskData=maskPaint?.createImageData(maskCanvas.width,maskCanvas.height);maskView='';dirty=true;}
 function setPhase(next){current=homeAtmospheres[next]?next:'medieval';canvas.dataset.phase=current;dirty=true;}
 function update(now,reduced=false){
  if(!ctx||!paint)return;
  const view=[camera.position.x,camera.position.y,camera.position.z,camera.zoom,target.x,target.y,target.z].map(x=>x.toFixed(3)).join(',');
  const moved=view!==lastView;if(!dirty&&!moved&&(reduced||now-last<140))return;if(!dirty&&moved&&now-last<50)return;
  let nearest=islands[0],distance=Infinity;for(const i of islands){const d=Math.hypot(target.x-i.x,target.z-i.z);if(d<distance){distance=d;nearest=i;}}
  if(nearest.id!=='home'){if(canvas.style.visibility!=='hidden')canvas.style.visibility='hidden';lastView=view;last=now;dirty=false;return;}
  canvas.style.visibility='visible';lastView=view;last=now;dirty=false;
  const p=homeAtmospheres[current],regions=skyRegions(camera,w,h,origins),a=regions.home,cx=a.x+a.w*.5,cy=a.y+a.h*.43,rx=a.w*.73,ry=a.h*.75,t=reduced?0:now*.00001;
  paint.clearRect(0,0,w,h);paint.globalCompositeOperation='source-over';paint.globalAlpha=1;
  const gradient=paint.createLinearGradient(0,Math.max(-h,cy-ry),0,Math.min(h*2,cy+ry));p.sky.forEach((c,n)=>gradient.addColorStop(n/2,c));paint.fillStyle=gradient;paint.fillRect(0,0,w,h);
  if(p.night){
   for(const star of stars){paint.globalAlpha=.3+.35*(reduced?1:(Math.sin(now*.0007+star.t)+1)/2);paint.fillStyle='#d8e0ef';paint.beginPath();paint.arc(cx-rx+star.x*rx*2,cy-ry+star.y*ry*1.5,star.r,0,Math.PI*2);paint.fill();}
   paint.globalAlpha=1;
   if(current==='gothic'){
    const x=cx+rx*.36,y=cy-ry*.48,r=Math.max(7,Math.min(20,rx*.08)),halo=paint.createRadialGradient(x,y,r*.5,x,y,r*3.8);halo.addColorStop(0,'#d8e2f533');halo.addColorStop(1,'#d8e2f500');paint.fillStyle=halo;paint.fillRect(x-r*4,y-r*4,r*8,r*8);paint.fillStyle='#c8d4e6';paint.beginPath();paint.arc(x,y,r,0,Math.PI*2);paint.fill();
   }else{
    for(let n=0;n<3;n++){const trail=paint.createLinearGradient(cx-rx,cy-ry*.55+n*ry*.15,cx+rx,cy);trail.addColorStop(0,'#83cede00');trail.addColorStop(.5,n%2?'#b487d833':'#79b7d929');trail.addColorStop(1,'#83cede00');paint.strokeStyle=trail;paint.lineWidth=1;paint.beginPath();paint.moveTo(cx-rx*.8,cy-ry*.35+n*ry*.2);paint.quadraticCurveTo(cx,cy-ry*.75,cx+rx*.8,cy-ry*.3+n*ry*.2);paint.stroke();}
   }
  }
  for(const cloud of clouds){
   const x=cx-rx+((cloud.x+t*cloud.s*80)%1)*rx*2,y=cy-ry+cloud.y*ry*1.55,r=cloud.r*rx;
   paint.fillStyle=p.cloud;paint.globalAlpha=current==='gothic'?.19:p.night?.13:.3;
   paint.beginPath();paint.ellipse(x,y,r*1.65,r*.31,0,0,Math.PI*2);paint.ellipse(x-r*.4,y-r*.13,r*.67,r*.35,0,0,Math.PI*2);paint.ellipse(x+r*.35,y-r*.15,r*.8,r*.4,0,0,Math.PI*2);paint.fill();
  }
  if(maskData&&maskPaint&&maskView!==view){
   const mw=maskCanvas.width,mh=maskCanvas.height,feather=Math.max(45,Math.min(w,h)*.22);
   for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){const n=(y*mw+x)*4;maskData.data[n]=maskData.data[n+1]=maskData.data[n+2]=255;maskData.data[n+3]=Math.round(skyMaskAt((x+.5)*w/mw,(y+.5)*h/mh,regions,feather)*255);}
   maskPaint.putImageData(maskData,0,0);maskView=view;
  }
  paint.globalAlpha=1;paint.globalCompositeOperation='destination-in';paint.drawImage(maskCanvas,0,0,w,h);paint.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);ctx.drawImage(buffer,0,0);canvas.dataset.protectedIslands=regions.protected.map(x=>x.id).join(',');
 }
 setPhase(phase);
 return{canvas,setPhase,resize,update,dispose(){canvas.remove();canvas.width=canvas.height=buffer.width=buffer.height=maskCanvas.width=maskCanvas.height=1;maskData=null;}};
}
