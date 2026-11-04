import * as THREE from 'three';
import {factoryStairFlights} from '../lib/factory-style.ts';

// Exterior maintenance structure. Its footprint stays out of the entrance path;
// ground navigation reserves it so avatars cannot pass through stair supports.
export default function factoryStairs({parent,kit:k,sources,proxy=false}){
 const {box,group,pipe,cyl,ball}=k,m=k.materials,root=group(parent),mounts=[];
 root.name='factory-exterior-stair-network';root.userData.levels=[.45,3.12,6.2];
 const bulb=new THREE.MeshBasicMaterial({color:'#ffd486'});bulb.name='factory-yellow-stair-lamp-core';bulb.userData.bloom=true;if(!k.lowDetail)bulb.color.multiplyScalar(1.28);
 const haze=new THREE.MeshBasicMaterial({color:'#ffd183',transparent:true,opacity:.075,depthWrite:false});haze.name='factory-yellow-stair-lamp-halo';haze.userData.bloom=false;
 function beam(a,b,w=.10,h=.16,material=m.iron,parent=root){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.sub(start),mesh=box(w,h,delta.length(),material,parent,...start.clone().addScaledVector(delta,.5).toArray());mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize());return mesh;}
 function lamp(parent,x,y,z,mount){const g=group(parent,x,y,z);g.name='factory-stair-mounted-yellow-lamp';g.userData.stairMount={...mount,point:[x,y,z]};mounts.push(g);
  box(.17,.12,.17,m.metal,g,0,.06,0);cyl(.035,.05,1.48,m.iron,g,0,.80,0,6);cyl(.11,.11,.08,m.bronze,g,0,1.47,0,6);
  const core=ball(.135,bulb,g,0,1.69,0,.8,1.25,.8);core.name='factory-yellow-stair-light-source';core.castShadow=core.receiveShadow=false;
  const halo=ball(.32,haze,g,0,1.69,0,1,1.15,1);halo.castShadow=halo.receiveShadow=false;
  cyl(.23,.29,.10,m.iron,g,0,1.48,0,8);cyl(.30,.18,.15,m.iron,g,0,1.98,0,8);for(const sx of [-.18,.18])for(const sz of [-.18,.18])box(.018,.46,.018,m.iron,g,sx,1.73,sz);
  if(!proxy)sources.push({object:g,point:new THREE.Vector3(0,1.69,0),power:18,distance:6.5,kind:'stair'});return g;
 }
 function landing(id,x,y,z,w,d,{rearOpen=false,lamps=true}={}){const g=group(root,x,y,z);g.name='factory-stair-landing-'+id;g.userData.deck={x,y,z,w,d};box(w,.13,d,m.metal,g,0,-.065,0);for(const xx of [-w/2,w/2])box(.07,.24,d,m.iron,g,xx,-.13,0);for(const zz of [-d/2,d/2])box(w,.24,.08,m.iron,g,0,-.13,zz);
  for(const side of [-1,1]){k.rail(g,[side*w/2,-d/2],[side*w/2,d/2],.98);if(y>.5){const bottom=.45-y;box(.10,y-.45,.10,m.iron,g,side*w*.43,bottom/2,0);beam([side*w*.43,bottom,0],[side*w*.1,-.12,0],.065,.08,m.metal,g);}}
  if(!rearOpen)k.rail(g,[-w/2,-d/2],[w/2,-d/2],.98);
  if(lamps)lamp(g,Math.sign(x)*(w/2-.06),0,d*.22,{kind:'landing',id,deckHeight:y});return g;
 }
 for(const f of factoryStairFlights){const g=group(root);g.name='factory-steel-stair-flight-'+f.id;g.userData.flight={...f};const rise=f.y1-f.y0,run=f.z1-f.z0,spacing=run/f.steps;
  for(let n=0;n<f.steps;n++){const y=f.y0+rise*(n+1)/f.steps,z=f.z0+spacing*(n+.5);box(f.width,.105,Math.abs(spacing)*.89,m.metal,g,f.x,y-.0525,z);if(!proxy||n%2===0)box(f.width,.023,.035,m.bronze,g,f.x,y+.012,z-Math.sign(run)*Math.abs(spacing)*.36);}
  for(const side of [-1,1]){const x=f.x+side*f.width*.47;beam([x,f.y0-.14,f.z0],[x,f.y1-.14,f.z1],.09,.2,m.iron,g);for(const h of [.52,1.04])pipe(g,[[x,f.y0+h,f.z0],[x,f.y1+h,f.z1]],.028,h>1?m.bronze:m.iron);for(let n=0;n<=5;n++){const t=n/5;box(.035,1.02,.035,m.iron,g,x,f.y0+rise*t+.51,f.z0+run*t);}}
  const indices=proxy?[Math.round(f.steps*.55)]:[1,Math.round(f.steps*.5),f.steps-2];for(const n of indices){const t=(n+1)/f.steps;lamp(g,f.x+f.side*(f.width/2+.04),f.y0+rise*t,f.z0+spacing*(n+.5),{kind:'flight',id:f.id,step:n,deckHeight:f.y0+rise*t});}
 }
 landing('east-middle',7.55,3.12,.075,1.45,1.35,{rearOpen:true,lamps:!proxy});landing('east-top',7.55,6.2,-5.35,1.45,1.3,{rearOpen:true});
 landing('west-middle',-7.55,3.12,-1.725,1.45,1.35,{rearOpen:true,lamps:!proxy});landing('west-top',-7.55,6.2,3.38,1.45,1.36,{rearOpen:true});
 // Roof-level service bridge links the two stair towers without covering the sign.
 const rear=group(root,0,6.2,-6.25);rear.name='factory-rear-upper-catwalk';box(15.1,.13,.85,m.metal,rear,0,-.065,0);for(const zz of [-.425,.425]){box(15.3,.2,.07,m.iron,rear,0,-.14,zz);k.rail(rear,[-7.55,zz],[7.55,zz],.98);}for(const x of [-4.6,4.6]){pipe(rear,[[x,-5.75,0],[x,-.15,0]],.065,m.iron);if(!proxy)lamp(rear,x,0,-.33,{kind:'upper-platform',id:'rear',deckHeight:6.2});}
 // Widened cheeks carry lamps on the original, still-open entrance stair treads.
 for(const side of [-1,1])for(let n=0;n<5;n++){const h=(5-n)*.42/5,z=5.95+n*.3;box(.68,h,.32,m.metal,root,side*4.52,h/2,z);box(.7,.025,.035,m.bronze,root,side*4.52,h+.013,z+.13);if(n===(proxy?2:0)||!proxy&&n===4)lamp(root,side*4.52,h,z,{kind:'entrance-step',id:'front',step:n,deckHeight:h});}
 root.userData.lampCount=mounts.length;
 return{root,mounts};
}
