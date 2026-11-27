import * as THREE from 'three';
import {seeded} from './art-kit.js';

// The rock beneath each floating island: hanging rocks, a few ledges that
// break up the cliff wall, and roots dangling from the rim. Matte stone and
// earth colours only — no glow — so the islands read as solid ground with
// some age to them. Three instanced draws for the whole archipelago.

// Where the underside runs: from just below the rim down to the lowest point
// of the island's rock, measured from the built scene.
export function undersideProfile(island,district){
 const box=new THREE.Box3().setFromObject(district);
 const bottom=Number.isFinite(box.min.y)?Math.min(box.min.y,island.height-3):island.height-8;
 return{top:island.height-1.2,bottom:bottom+.4};
}

const stoneColors=['#6f665b','#615a52','#7a7064','#57514b','#695f55'];
const rootColors=['#3d3428','#4a3f30','#2f3a2c'];

export default function islandUnderside({islands,districts,lowDetail=false,limited=false}){
 if(lowDetail)return{group:null,count:0,dispose(){}};
 const group=new THREE.Group();group.name='island-undersides';
 const rocks=[],ledges=[],roots=[];
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,1,0),origin=new THREE.Vector3();
 for(const island of islands){
  const district=districts?.get(island.id);if(!district)continue;
  const {top,bottom}=undersideProfile(island,district),rng=seeded(island.x*31+island.z*7+11),big=island.id==='home'?1.25:1;
  // Only the rock below the rim can be hit from underneath.
  district.updateMatrixWorld(true);const under=[];district.traverse(o=>{if(!o.isMesh||!o.visible)return;const b=new THREE.Box3().setFromObject(o);if(b.min.y<top-.5&&b.max.y-b.min.y<40)under.push(o);});
  ray.far=top-bottom+20;
  // Hanging rocks: cast up from below and hang a spike from the real underside.
  let placed=0;
  for(let tries=0;tries<90&&placed<(limited?14:24)*big;tries++){
   // Mostly near the rim, where the isometric camera can see them below the cliff.
   const a=rng()*Math.PI*2,k=rng()<.8?.74+rng()*.24:Math.sqrt(rng())*.6;origin.set(island.x+Math.cos(a)*island.rx*k,bottom-10,island.z+Math.sin(a)*island.rz*k);
   ray.set(origin,down);const hit=ray.intersectObjects(under,false)[0];if(!hit||hit.point.y>top)continue;
   const depth=(top-hit.point.y)/Math.max(1,top-bottom);placed++;
   rocks.push({x:hit.point.x,y:hit.point.y+.15,z:hit.point.z,len:(2+rng()*3.6)*(1.25-depth*.3)*big*(k<.4?1.4:1),r:.45+rng()*.7,spin:rng()*6.28,tilt:(rng()-.5)*.35,color:stoneColors[Math.floor(rng()*stoneColors.length)]});
  }
  // Ledges and roots sit just outside the rim wall.
  for(let n=0;n<(limited?6:10)*big;n++){
   const a=rng()*Math.PI*2,y=top-.6-rng()*Math.min(4,(top-bottom)*.4);
   ledges.push({x:island.x+Math.cos(a)*island.rx*1.01,y,z:island.z+Math.sin(a)*island.rz*1.01,sx:1.6+rng()*1.8,sy:.5+rng()*.5,sz:.9+rng()*.9,spin:-a,color:stoneColors[Math.floor(rng()*stoneColors.length)]});
  }
  for(let n=0;n<(limited?8:14)*big;n++){
   const a=rng()*Math.PI*2;
   roots.push({x:island.x+Math.cos(a)*island.rx*1.035,y:top-.1-rng()*.6,z:island.z+Math.sin(a)*island.rz*1.035,len:1.2+rng()*3.4,sway:(rng()-.5)*.3,color:rootColors[Math.floor(rng()*rootColors.length)]});
  }
 }
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3(),c=new THREE.Color(),parts=[];
 function build(geometry,list,name,place){
  const material=new THREE.MeshStandardMaterial({roughness:.95,metalness:0,flatShading:true});
  const mesh=new THREE.InstancedMesh(geometry,material,list.length);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;mesh.raycast=()=>{};
  list.forEach((item,n)=>{place(item);matrix.compose(p,q,s);mesh.setMatrixAt(n,matrix);mesh.setColorAt(n,c.set(item.color));});
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;group.add(mesh);parts.push(mesh);return mesh;
 }
 // Hanging rocks: five-sided spikes pointing down, slightly leaning.
 build(new THREE.ConeGeometry(1,1,5,1).rotateX(Math.PI).translate(0,-.5,0),rocks,'underside-hanging-rocks',r=>{p.set(r.x,r.y,r.z);q.setFromEuler(e.set(r.tilt,r.spin,r.tilt*.6));s.set(r.r,r.len,r.r);});
 // Ledges: flattened boulders that stick out of the cliff wall.
 build(new THREE.IcosahedronGeometry(1,0),ledges,'underside-rock-ledges',l=>{p.set(l.x,l.y,l.z);q.setFromEuler(e.set(0,l.spin,0));s.set(l.sx,l.sy,l.sz);});
 // Roots: thin strands hanging from just below the rim.
 build(new THREE.CylinderGeometry(.05,.012,1,4,1).translate(0,-.5,0),roots,'underside-hanging-roots',r=>{p.set(r.x,r.y,r.z);q.setFromEuler(e.set(r.sway,0,r.sway*.7));s.set(1,r.len,1);});
 return{group,count:rocks.length+ledges.length+roots.length,dispose(){group.removeFromParent();for(const m of parts){m.geometry.dispose();m.material.dispose();m.dispose();}}};
}
