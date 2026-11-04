import * as THREE from 'three';
import museumKit from './museum-kit.js';
import {seeded} from './art-kit.js';
import {museumExterior as b} from '../lib/museum-style.ts';
import {bridgeSegments} from '../lib/archipelago.ts';
import {positionOf} from '../lib/layout.ts';

export default function createMuseumIsland({root,island,projects=[],phase='medieval',lowDetail=false}){
 const k=museumKit({phase,lowDetail}),m=k.materials,{group,box,cyl,line,ring,mesh}=k,TAU=Math.PI*2,sources=[],lights=[];
 root.userData.artDirection='complete-greek-temple-paradise-garden';root.userData.palette={...k.palette};
 function platform(parent,{proxy=false}={}){
  const cap=cyl(1,1.015,1.15,m.ivory,parent,0,-.575,0,proxy?24:48);cap.scale.set(island.rx,1,island.rz);cap.renderOrder=-800;
  for(const [y,h,top,bottom]of [[-3.8,5.5,1,.83],[-7.9,3.2,.84,.35]]){const cliff=cyl(top,bottom,h,m.stone,parent,0,y,0,proxy?14:24);cliff.scale.set(island.rx,1,island.rz);cliff.renderOrder=-1000;}
  const top=cyl(.985,.985,.08,m.marble,parent,0,.015,0,proxy?28:56);top.scale.set(island.rx,1,island.rz);top.renderOrder=-780;
  if(!proxy){const rad=island.rx*.98,spacing=lowDetail?2.5:1.9;for(let x=-rad+spacing;x<rad;x+=spacing){const half=Math.sqrt(rad*rad-x*x);line([[x,.062,-half],[x,.062,half]],m.stone,parent,.009);line([[-half,.062,x],[half,.062,x]],m.stone,parent,.009);}
   for(const r of [10.9,13.3]){const trim=ring(r,.018,m.gold,parent,0,.075,0);trim.rotation.x=-Math.PI/2;}
  }
 }
 function fountain(parent,x,z,{proxy=false}={}){const g=group(parent,x,0,z);g.name='museum-round-garden-fountain';cyl(1.7,1.87,.2,m.marble,g,0,.1,0,20);cyl(1.55,1.55,.16,m.stone,g,0,.25,0,20);const water=k.mat('#8baeb4','glass',{transparent:false,...(!lowDetail?{metalness:.32,roughness:.18}:{})});cyl(1.42,1.42,.04,water,g,0,.35,0,24);for(const r of [1.55,1.75])ring(r,.11,m.ivory,g,0,.35,0).rotation.x=-Math.PI/2;cyl(.2,.38,.8,m.ivory,g,0,.75,0,8);cyl(.7,.24,.2,m.marble,g,0,1.23,0,12);if(!proxy){cyl(.025,.025,.65,water,g,0,1.62,0,6);for(let n=0;n<5;n++){const a=n/5*TAU;line([[0,1.82,0],[Math.sin(a)*.4,1.5,Math.cos(a)*.4],[Math.sin(a)*.8,.38,Math.cos(a)*.8]],water,g,.018);}}return g;}
 function pavilion(parent,x,z,{proxy=false}={}){const g=group(parent,x,0,z);g.name='museum-small-column-gazebo';cyl(2,2.15,.26,m.marble,g,0,.13,0,16);for(let n=0;n<6;n++){const a=n/6*TAU;k.column(g,Math.sin(a)*1.65,.26,Math.cos(a)*1.65,2.75,.15);}cyl(2.04,2.04,.2,m.ivory,g,0,3.15,0,18);k.cone(2.06,.6,m.roof,g,0,3.53,0,12);if(!proxy){k.flowers(g,0,.27,0,821,.6);for(const a of [0,2.1,4.2])k.ivy(g,Math.sin(a)*1.6,3.15,Math.cos(a)*1.6,1.3,31+a);}return g;}
 function building(parent,p,{proxy=false}={}){
  const g=group(parent);g.name='star-museum';g.userData.architecture='complete-greek-temple';g.userData.projectId=p.id;
  for(const [w,d,h,y]of [[14.4,11.8,.26,.13],[14,11.4,.24,.38],[13.7,11.1,.22,.61]])box(w,h,d,m.marble,g,0,y,-1.8);
  box(10.7,6.2,7.3,m.ivory,g,0,3.83,-2.2);for(const yy of [1.02,6.65,7.17])box(13.75,.17,11.3,yy===7.17?m.marble:m.ivory,g,0,yy,-1.8);
  for(const z of [3.3,-6.8])for(const x of [-5.9,-3.54,-1.18,1.18,3.54,5.9])k.column(g,x,.72,z,6.35,.34);
  for(const x of [-5.9,5.9])for(const z of [-4.5,-2.2,.1])k.column(g,x,.72,z,6.35,.34);
  box(14.2,.46,11.85,m.ivory,g,0,7.37,-1.8);box(14.4,.12,12,m.gold,g,0,7.66,-1.8);box(14.55,.16,12.12,m.marble,g,0,7.8,-1.8);
  if(!proxy)for(const z of [4.15,-7.75])for(let x=-6.6;x<=6.6;x+=.6)box(.18,.18,.16,m.stone,g,x,7.38,z);
  k.roof(g,14.8,12.35,2.45,7.88,-1.8);
  // Complete triangular pediment, with a small laurel sun relief rather than lettering.
  const crest=group(g,0,8.61,4.41);ring(.43,.035,m.gold,crest);for(let n=0;n<8;n++){const a=n/8*TAU;line([[Math.sin(a)*.5,Math.cos(a)*.5,0],[Math.sin(a)*.7,Math.cos(a)*.7,0]],m.gold,crest,.02);}k.ball(.18,m.gold,crest,0,0,.02,1,1,.3);
  box(3.25,4.6,.18,m.darkWood,g,0,3.02,1.52);box(2.95,4.35,.15,m.gold,g,0,3.02,1.65);for(const s of [-1,1]){box(.07,3.95,.12,m.ivory,g,s*1.25,3.02,1.75);box(.035,4.18,.08,m.stone,g,0,3.02,1.75);ring(.09,.022,m.gold,g,s*.2,2.8,1.79);for(const yy of [1.35,3.8])box(1.08,1.3,.055,m.frame,g,s*.67,yy,1.77);}
  for(let n=0;n<12;n++){const depth=(b.stepsFront-b.stepsBack)/12,h=(n+1)*b.stepsHeight/12;box(8.8,h,depth+.015,m.marble,g,0,h/2,b.stepsFront-(n+.5)*depth).name='museum-broad-marble-entrance-steps';}
  for(const s of [-1,1]){k.statue(g,s*5.55,0,7,.83);const lamp=k.lamp(g,s*4.9,0,5.2,3);if(!proxy)sources.push({object:lamp,point:new THREE.Vector3(0,2.9,0),power:13});}
  if(!proxy){
   pavilion(g,-9.6,3.1);fountain(g,8.2,7.3);
   for(let n=0;n<8;n++){const x=-3.5+n;box(.8,.012,.035,m.gold,g,x,.078,9.25);box(.035,.012,.4,m.gold,g,x+.38,.078,9.43);box(.55,.012,.035,m.gold,g,x+.12,.078,9.62);box(.035,.012,.22,m.gold,g,x-.14,.078,9.53);}
   for(const s of [-1,1])for(const z of [-7.9,-3.8,.2])k.cypress(g,s*9.1,0,z,1.13+(z<0?.14:0));
   for(const [x,z,seed]of [[-9,7.3,51],[-4.7,9.2,31],[4.1,9.1,88],[10.4,2,61],[7.8,-9,7],[-7.9,-9.1,93],[.5,-10.1,24]])k.flowers(g,x,.03,z,seed,1.1);
   // An intact small garden arcade and a rear viewing terrace.
   const arcade=group(g,9.6,0,-3.1);arcade.name='museum-vine-garden-arcade';for(const z of [-2,2])for(const x of [-.8,.8])k.column(arcade,x,.1,z,3.5,.17);box(2.2,.24,4.8,m.ivory,arcade,0,3.73,0);for(const z of [-1.9,0,1.9]){const arch=[];for(let n=0;n<=10;n++){const a=n/10*Math.PI;arch.push([Math.cos(a)*.8,2.6+Math.sin(a)*.86,z]);}line(arch,m.ivory,arcade,.12);box(2.4,.16,.15,m.marble,arcade,0,3.94,z);k.ivy(arcade,.85,3.8,z,2,89+z);}const terrace=group(g,0,0,-11.3);terrace.name='museum-garden-viewing-platform';box(7,.17,2.6,m.ivory,terrace,0,.1,0);k.rail(terrace,[-3.5,.18,-1.25],[3.5,.18,-1.25],{spacing:.6});for(const x of [-2,2]){box(1.8,.15,.55,m.marble,terrace,x,.6,.1);for(const sx of [-.65,.65])box(.2,.5,.5,m.ivory,terrace,x+sx,.3,.1);}
   for(const [x,z,h]of [[-9.2,7.7,2.7],[10.7,3.5,2.7],[-5.7,-9.5,2.6],[5.7,-9.5,2.6]]){const lamp=k.lamp(g,x,0,z,h);sources.push({object:lamp,point:new THREE.Vector3(0,h-.1,0),power:11});}
   for(const [x,z,seed]of [[-6.6,1,42],[6.5,-5,51],[-1,-7,21]])k.ivy(g,x,5,z,2.7,seed);
   // Restrained gold motes and rose petals; frozen by reduced-motion preferences.
   const rng=seeded(728);for(let n=0;n<(lowDetail?4:10);n++){const petal=group(g,(rng()-.5)*21,1.3+rng()*3.4,5+rng()*5);petal.userData.dynamic=true;const piece=k.ball(n%3?.045:.09,n%3?m.gold:m.rose,petal,0,0,0,1,.3,1);piece.castShadow=false;k.animations.push({object:petal,kind:'float',base:petal.position.y,offset:rng()*TAU});}
  }
  return g;
 }
 platform(root);const nearBridge=(x,z)=>bridgeSegments().some(({a,b})=>Math.min(Math.hypot(island.x+x-a.x,island.z+z-a.z),Math.hypot(island.x+x-b.x,island.z+z-b.z))<3.8);
 for(let n=0;n<40;n++){const a=n/40*TAU,b=(n+1)/40*TAU,x=Math.sin(a)*14.15,z=Math.cos(a)*14.15,xx=Math.sin(b)*14.15,zz=Math.cos(b)*14.15;if(nearBridge(x,z)||nearBridge(xx,zz))continue;k.rail(root,[x,.04,z],[xx,.04,zz],{spacing:lowDetail?.7:.48});if(n%7===0){const lamp=k.lamp(root,x,0,z,2.8);sources.push({object:lamp,point:new THREE.Vector3(0,2.7,0),power:11});}}
 if(!lowDetail)for(let n=0;n<4;n++){const light=new THREE.PointLight(k.palette.light,12,7,2);light.name='museum-bounded-garden-light';light.castShadow=false;root.add(light);lights.push(light);}
 let lastX=Infinity,lastZ=Infinity;function updateLights(target){if(!lights.length||Math.hypot(target.x-lastX,target.z-lastZ)<.8)return;lastX=target.x;lastZ=target.z;const ranked=sources.map(s=>({...s,world:s.object.localToWorld(s.point.clone())})).sort((a,b)=>a.world.distanceTo(target)-b.world.distanceTo(target));lights.forEach((light,n)=>{const s=ranked[n];light.visible=!!s&&Math.hypot(target.x-island.x,target.z-island.z)<37;if(s){light.position.copy(root.worldToLocal(s.world));light.intensity=s.power;}});}
 return{kit:k,materials:m,building,updateLights,update:k.update,proxy(parent){platform(parent,{proxy:true});for(const p of projects){const q=positionOf(p),g=group(parent,q.x,0,q.z);building(g,p,{proxy:true});}return parent;},dispose:k.dispose};
}
