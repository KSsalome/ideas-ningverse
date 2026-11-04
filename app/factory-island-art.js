import * as THREE from 'three';
import factoryKit from './factory-kit.js';
import factoryStairs from './factory-stairs.js';
import {seeded} from './art-kit.js';
import {factoryExterior as b} from '../lib/factory-style.ts';
import {bridgeSegments} from '../lib/archipelago.ts';
import {positionOf} from '../lib/layout.ts';

export default function createFactoryIsland({root,island,projects=[],lowDetail=false}){
 const k=factoryKit({lowDetail}),m=k.materials,{group,box,cyl,line,ring,pipe,mesh}=k,TAU=Math.PI*2,sources=[],lights=[];
 root.userData.artDirection='american-industrial-speakeasy';root.userData.palette={...k.palette};
 function platform(parent,proxy=false){
  const cap=cyl(1,1.02,.9,m.concrete,parent,0,-.45,0,proxy?24:48);cap.scale.set(island.rx,1,island.rz);cap.renderOrder=-800;
  const cliff=cyl(1,.63,6.8,m.cliff,parent,0,-4.25,0,proxy?14:24);cliff.scale.set(island.rx*.99,1,island.rz*.99);cliff.renderOrder=-1000;
  const tip=cyl(.65,.19,3.8,m.cliff,parent,0,-8.9,0,proxy?10:18);tip.scale.set(island.rx,1,island.rz);tip.renderOrder=-1100;
  const floor=cyl(1,1,.07,m.floor,parent,0,.015,0,proxy?24:48);floor.scale.set(island.rx*.986,1,island.rz*.986);floor.renderOrder=-780;
  if(proxy)return;
  const rng=seeded(118);for(let n=0;n<(lowDetail?9:16);n++){const a=n/(lowDetail?9:16)*TAU,r=2+rng()*1.6,rock=mesh(new THREE.DodecahedronGeometry(r,0),n%3?m.cliff:m.concrete,parent,Math.sin(a)*island.rx*.74,-2.8-rng()*3,Math.cos(a)*island.rz*.74);rock.scale.set(.8,1.3+rng(),.8);rock.rotation.set(rng(),rng(),rng());rock.renderOrder=-950;}
  for(let n=-4;n<=4;n++){const x=n*2.8,z=Math.sqrt(Math.max(0,(island.rx*.96)**2-x*x));if(z>0)box(.018,.025,z*2,m.iron,parent,x,.065,0).renderOrder=-750;}
  for(const s of [-1,1]){pipe(parent,[[s*12,-.15,-2],[s*12,-3.6,-2],[s*8,-3.6,-2],[s*8,-5,-2]],.18,m.rust);for(const z of [-5,4]){pipe(parent,[[s*11,-.6,z],[s*7,-4.5,z]],.13,m.iron);box(.85,.24,.85,m.metal,parent,s*11,-.6,z);}}
 }
 function postLamp(parent,x,z,height=2.7){const g=group(parent,x,0,z);g.name='factory-terrace-lamp';cyl(.16,.22,.16,m.iron,g,0,.08,0,6);cyl(.04,.065,height,m.iron,g,0,height/2,0,6);k.lamp(g,0,height,0);sources.push({object:g,point:new THREE.Vector3(0,height-.1,0),power:12});return g;}
 function building(parent,p,{proxy=false}={}){
  const g=group(parent);g.name='industrial-information-factory';g.userData.architecture='low-wide-industrial-bar';g.userData.projectId=p.id;
  // One low, broad rectangle, with a black flat roof instead of a castle gable.
  box(16.3,.42,12.6,m.concrete,g,0,.21,-.5);box(16.45,.1,12.75,m.iron,g,0,.41,-.5);
  const body=group(g);body.name='factory-low-wide-shell';body.userData.size=[13.2,5.45,8.4];
  box(13.2,.22,8.4,m.walnut,body,0,.5,-1.4);box(13.2,5.45,.34,m.wallMetal,body,0,3.12,b.rear);
  for(const s of [-1,1]){box(.3,5.45,8.4,m.wallMetal,body,s*b.halfWidth,3.12,-1.4);for(let n=0;n<4;n++){const panel=box(.07,3.8,1.9,n%2?m.metal:m.wallMetal,body,s*(b.halfWidth+.17),2.8,b.rear+1.1+n*2);panel.name='factory-weathered-metal-panel';for(const yy of [1.18,4.42])for(const zz of [-.78,.78]){const rivet=k.ball(.052,m.bronze,body,s*(b.halfWidth+.23),yy,b.rear+1.1+n*2+zz,.45,1,1);rivet.name='factory-aged-panel-rivet';}for(const y of [1.02,4.58])box(.11,.055,1.82,m.iron,body,s*(b.halfWidth+.22),y,b.rear+1.1+n*2);}}
  box(13.65,.35,8.85,m.iron,g,0,5.85,-1.4);box(13.8,.1,9,m.metal,g,0,6.06,-1.4);
  for(const x of [-6.75,6.75])box(.12,.23,8.9,m.rust,g,x,6.2,-1.4);for(const z of [b.rear-.25,b.front+.25])box(13.7,.23,.12,m.iron,g,0,6.2,z);
  for(const x of [-6.3,-3.6,0,3.5,6.3]){box(.18,5.4,.24,m.iron,g,x,3.1,b.front+.06);box(.2,5.4,.2,m.iron,g,x,3.1,b.rear-.2);}
  box(13.2,.85,.2,m.metal,g,0,5.24,b.front);box(13.2,.58,.25,m.concrete,g,0,.75,b.front);
  // Recessed shop windows expose a shallow, modelled amber bottle display.
  const window=group(g,1.3,1.06,b.front-.03);window.name='factory-warm-pub-window';box(8.9,3.6,.12,m.amber,window,0,1.8,-.45);
  for(const y of [.75,1.85,2.95]){box(8.75,.1,.45,m.wood,window,0,y,-.18);box(8.6,.035,.035,m.warm,window,0,y-.08,-.08);if(!proxy)for(let n=0;n<(lowDetail?9:15);n++)k.bottle(window,-4+n*8/(lowDetail?8:14),y+.06,-.2,n,lowDetail?.65:.75);}
  for(let n=0;n<6;n++)for(let row=0;row<2;row++)box(1.45,1.72,.035,m.glass,window,-3.75+n*1.5,.9+row*1.8,.035);
  if(lowDetail)window.traverse(o=>{if(!o.isMesh)return;o.renderOrder=o.material===m.amber?8:o.material===m.glass?11:10;});
  for(let n=0;n<=6;n++)box(.055,3.65,.11,m.iron,window,-4.5+n*1.5,1.8,.09);for(const y of [0,1.8,3.65])box(9.15,.065,.15,m.iron,window,0,y,.09);if(lowDetail)window.children.filter(o=>o.isMesh&&o.material===m.iron).forEach(o=>o.renderOrder=12);
  const door=group(g,-4.8,.43,b.front+.10);door.name='factory-bar-entrance';box(1.95,3.9,.2,m.walnut,door,0,1.95,0);box(1.55,2.7,.12,m.amber,door,0,2.25,.13);box(1.5,2.62,.04,m.glass,door,0,2.25,.22);for(const x of [-.94,.94])box(.09,4,.14,m.iron,door,x,2,.20);for(const y of [.9,2.1,3.65])box(1.75,.055,.10,m.iron,door,0,y,.23);box(.055,.55,.12,m.bronze,door,.56,1.65,.32);box(.38,.055,.025,k.mat(p.color??k.palette.bronze),door,-.55,3.84,.27);k.sign(door,{title:'BAR',subtitle:'BAR',w:1.9,h:.5,y:4.2,z:.15});
  k.sign(g,{title:'INFORMATION FACTORY',w:8.65,h:1.1,x:1.2,y:5.28,z:b.front+.38});
  const canopy=group(g,0,4.48,4.1);canopy.name='factory-steel-entry-canopy';box(13.8,.14,2.5,m.iron,canopy);for(const x of [-6.7,-2.5,2.5,6.7])pipe(canopy,[[x,-4,1],[x,0,1],[x,.65,-1.15]],.055,m.iron);for(const x of [-5.4,0,5.4])k.lamp(canopy,x,-.65,0,{pendant:true,drop:.6,scale:.85});
  for(let n=0;n<5;n++){const h=(5-n)*b.stepsHeight/5;box(8.1,h,.32,m.concrete,g,0,h/2,b.stepsBack+.15+n*.3);box(8.1,.028,.05,m.metal,g,0,h+.014,b.stepsBack+.29+n*.3);}
  for(const s of [-1,1]){const rail=group(g,0,.45,0);k.rail(rail,[s*8.04,-6.6],[s*8.04,5.7]);k.rail(rail,[s*8.04,5.7],[s*4.15,5.7]);}
  const roofPlant=group(g);roofPlant.name='factory-roof-utilities';box(3.3,1.05,2,m.metal,roofPlant,-2.8,6.7,-3.7);for(let n=0;n<7;n++)box(2.9,.07,.07,m.iron,roofPlant,-2.8,6.35+n*.12,-2.66);
  for(const [x,z,h,r]of [[-5.3,-4,2.8,.26],[-4.3,-4,2.1,.2]]){cyl(r,r*1.1,h,m.iron,roofPlant,x,6.15+h/2,z,8);for(const yy of [6.3,6.15+h-.15])cyl(r*1.3,r*1.3,.12,m.rust,roofPlant,x,yy,z,8);cyl(r*1.65,r*1.65,.12,m.metal,roofPlant,x,6.3+h,z,8);}
  const tank=group(roofPlant,2.8,6.2,-2.7);tank.name='factory-information-tank';cyl(1.05,1.05,2.25,m.metal,tank,0,1.12,0,12);for(const y of [.18,1,2.15])cyl(1.09,1.09,.10,m.bronze,tank,0,y,0,12);cyl(.94,1.05,.25,m.iron,tank,0,2.4,0,12);pipe(tank,[[0,2.5,0],[0,3,0],[.7,3,0]],.09,m.rust);const badge=group(tank,0,1.15,1.075);ring(.48,.028,m.bronze,badge);box(.055,.43,.025,m.cream,badge,0,-.06,.01);k.ball(.055,m.cream,badge,0,.27,.01);
  pipe(g,[[-6.95,1.1,-5],[-6.95,5.45,-5],[-6.95,5.45,1.9],[-5,5.45,1.9]],.12,m.rust);pipe(g,[[6.9,1.1,-4.4],[6.9,4.6,-4.4],[6.9,4.6,1.9]],.1,m.metal);
  pipe(g,[[-5.3,6.3,-1.9],[-5.3,6.6,.5],[3.5,6.6,.5],[3.5,6.3,-2]],.09,m.bronze);
  factoryStairs({parent:g,kit:k,sources,proxy});
  if(!proxy){
   for(const x of [-6.2,-3.4,6.1]){k.lamp(g,x,3.7,b.front+.45);sources.push({object:g,point:new THREE.Vector3(x,3.5,b.front+1),power:16});}
   for(const s of [-1,1]){const planter=group(g,s*6.3,.43,5.2);cyl(.48,.36,.67,m.metal,planter,0,.34,0,8);for(let n=0;n<4;n++){const leaf=k.ball(.42,m.leaf,planter,(n%2-.5)*.45,.85+n*.27,(n%3-1)*.2,.8,1.4,.65);leaf.rotation.z=(n%2?1:-1)*.3;}}
   const chalk=group(g,-2.8,.45,4.55);chalk.name='factory-entrance-chalkboard';chalk.rotation.x=-.12;box(.85,1.15,.13,m.wood,chalk,0,.65,0);box(.69,.91,.035,m.iron,chalk,0,.68,.085);for(let n=0;n<4;n++)box(.45-n*.06,.018,.015,m.paper,chalk,0,.97-n*.18,.11);for(const x of [-.34,.34])box(.065,.75,.08,m.iron,chalk,x,.28,0);
   const gear=group(g,6.9,2.3,-2.8);gear.name='memory-gear';gear.userData.dynamic=true;gear.rotation.y=Math.PI/2;const rotor=group(gear);ring(.66,.08,m.bronze,rotor);for(let n=0;n<10;n++){const a=n/10*TAU,tooth=box(.14,.23,.12,m.rust,rotor,Math.sin(a)*.74,Math.cos(a)*.74,0);tooth.rotation.z=-a;}for(const a of [0,Math.PI/3,Math.PI*2/3]){const spoke=box(.06,1.25,.10,m.iron,rotor);spoke.rotation.z=a;}k.animations.push({object:rotor,kind:'rotate',axis:'z',speed:.000055});
  }
  return g;
 }
 platform(root);
 const nearBridge=(x,z)=>bridgeSegments().some(({a,b})=>Math.min(Math.hypot(island.x+x-a.x,island.z+z-a.z),Math.hypot(island.x+x-b.x,island.z+z-b.z))<4.1);
 for(let n=0;n<36;n++){const a=n/36*TAU,b=(n+1)/36*TAU,x=Math.sin(a)*island.rx*.94,z=Math.cos(a)*island.rz*.94,xx=Math.sin(b)*island.rx*.94,zz=Math.cos(b)*island.rz*.94;if(nearBridge(x,z)||nearBridge(xx,zz))continue;k.rail(root,[x,z],[xx,zz],1.08);if(n%6===0)postLamp(root,x,z,2.7);}
 for(const [x,z,seed]of [[-10,-5,51],[10,4,52],[-7,-10,55]]){const plant=k.tree(root,x,0,z,lowDetail?.65:.8,'round',seed);plant.name='factory-sparse-greenery';k.ivy(root,x,-.2,z,2.8,seed);}
 if(!lowDetail)for(let n=0;n<6;n++){const light=new THREE.PointLight(k.palette.light,14,8,2);light.name='factory-bounded-terrace-light';light.castShadow=false;root.add(light);lights.push(light);}
 let lastX=Infinity,lastZ=Infinity;
 function updateLights(target){if(!lights.length||Math.hypot(target.x-lastX,target.z-lastZ)<.8)return;lastX=target.x;lastZ=target.z;const enabled=Math.hypot(target.x-island.x,target.z-island.z)<island.rx+20,ranked=sources.map(s=>({...s,world:s.object.localToWorld(s.point.clone())})).sort((a,b)=>Math.hypot(a.world.x-target.x,(a.world.y-(target.y??island.height+2))*.7,a.world.z-target.z)-Math.hypot(b.world.x-target.x,(b.world.y-(target.y??island.height+2))*.7,b.world.z-target.z));lights.forEach((light,n)=>{const source=ranked[n];light.visible=enabled&&!!source;if(source){light.position.copy(root.worldToLocal(source.world));light.intensity=source.power;light.distance=source.distance??8;}});}
 function proxy(parent){platform(parent,true);for(const p of projects){const q=positionOf(p);building(group(parent,q.x,0,q.z),p,{proxy:true});}return parent;}
 return{kit:k,materials:m,building,proxy,postLamp,lamp:k.lamp,update:k.update,updateLights,dispose:k.dispose};
}
