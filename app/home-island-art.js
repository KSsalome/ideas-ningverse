import * as THREE from 'three';
import artKit from './art-kit.js';
import architectureDetail from './architecture-detail.js';
import homeMaterials,{homePalette,worldUV} from './home-materials.js';
import {bridgeSegments} from '../lib/archipelago.ts';
import homeGarden from './home-garden.js';
import homeLighting from './home-lighting.js';
import homeArchitecture from './home-architecture-themes.js';
import {homeAtmospheres,exteriorBasePhase} from '../lib/home-atmosphere.ts';
import {smoothBlend} from '../lib/world-night.ts';

export default function createHomeIsland({root,island,phase=exteriorBasePhase,lowDetail=false}){
 const k=artKit({phase:exteriorBasePhase,lowDetail,palette:homePalette}),m=homeMaterials(lowDetail);
 const {mesh,box,cyl,ball,cone,line,group,ring,banner,tree,ivy,gold,stone,ivory,wood}=k,TAU=Math.PI*2;
 const windowArch=(...args)=>{const g=k.windowArch(...args);if(lowDetail)g.traverse(o=>{if(o.isMesh||o.isLine)o.renderOrder=0;});return g;};
 const detail=architectureDetail({...k,windowArch});
 const lamps=[],lights=[],lampGlows=new Map(),lampGlowClones=new Map(),night=['cyber','gothic','wonder'].includes(phase);
 let architecture=null;
 root.userData.artDirection='limestone-tiered-citadel';root.userData.palette={...homePalette};
 function block(parent,x,y,z,w,h,d,material=m.wall){return mesh(worldUV(new THREE.BoxGeometry(w,h,d,lowDetail?Math.max(1,Math.ceil(w/2)):1,lowDetail?Math.max(1,Math.ceil(h/2)):1,lowDetail?Math.max(1,Math.ceil(d/2)):1)),material,parent,x,y,z);}
 function ellipse(parent,x,y,z,rx,rz,height,material=m.foundation){const geometry=new THREE.CylinderGeometry(1,1.025,height,lowDetail?24:64);geometry.scale(rx,1,rz);return mesh(worldUV(geometry),material,parent,x,y,z);}
 function paving(parent,x,y,z,rx,rz,{dense=false}={}){
  const g=group(parent,x,y,z);g.name='home-brick-paving';
  const geo=new THREE.CircleGeometry(1,lowDetail?40:96);geo.rotateX(-Math.PI/2);geo.scale(rx,1,rz);mesh(worldUV(geo),lowDetail?m.foundation:m.paving,g).renderOrder=-780;
  // SVG cannot sample bitmap textures, so give it colored, staggered stone faces.
  // The WebGL version uses world-scaled color, roughness and normal maps instead.
  if(lowDetail){const w=dense?.85:1.25,d=dense?.5:.72;for(let row=0,zz=-rz+d/2;zz<rz;row++,zz+=d){for(let xx=-rx+(row%2)*w/2;xx<rx;xx+=w){const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];if(!corners.every(([a,b])=>((xx+a)/rx)**2+((zz+b)/rz)**2<.99))continue;const tile=new THREE.PlaneGeometry(w-.035,d-.035);tile.rotateX(-Math.PI/2);mesh(tile,m.blockTones[(row+Math.round((xx+rx)/w)*7)%m.blockTones.length],g,xx,.012,zz).renderOrder=-770;}}}
  return g;
 }
 function terraceBrickwork(parent,rx,rz,height,centerZ){
  if(!lowDetail)return;const g=group(parent,0,0,centerZ);g.name='home-terrace-brickwork';const rows=Math.ceil(height/.36),count=Math.ceil(TAU*Math.max(rx,rz)/.95);
  for(let row=0;row<rows;row++)for(let n=0;n<count;n++){const a=(n+(row%2)*.5)/count*TAU,b=(n+1+(row%2)*.5-.035)/count*TAU,y0=row*height/rows+.018,y1=(row+1)*height/rows-.018,geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([Math.sin(a)*(rx+.015),y0,Math.cos(a)*(rz+.015),Math.sin(b)*(rx+.015),y0,Math.cos(b)*(rz+.015),Math.sin(b)*(rx+.015),y1,Math.cos(b)*(rz+.015),Math.sin(a)*(rx+.015),y1,Math.cos(a)*(rz+.015)],3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();mesh(geo,m.blockTones[(row+n*3)%m.blockTones.length],g);}
 }
 function roof(parent,x,y,z,w,h,d){
  const g=group(parent,x,y,z);g.name='home-brown-roof';
  const vertices=[-w/2,0,d/2,w/2,0,d/2,0,h,d/2,-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex([0,1,2,5,4,3,0,2,5,0,5,3,2,1,4,2,4,5,3,4,1,3,1,0]);geo.computeVertexNormals();
  const hardRoof=geo.toNonIndexed();hardRoof.computeVertexNormals();mesh(worldUV(hardRoof),m.roof,g);geo.dispose();
  const seam=k.mat('#554334'),edge=k.mat('#756149');
  for(let row=1;row<(lowDetail?4:7);row++){const t=row/(lowDetail?4:7),xx=w/2*(1-t);for(const side of [-1,1])box(.035,.04,d+.04,seam,g,side*xx,h*t+.025,0);}
  for(const zz of [-d/2,d/2])line([[-w/2-.06,0,zz],[0,h+.035,zz],[w/2+.06,0,zz]],edge,g,.04);
  const ridge=cyl(.065,.065,d+.1,seam,g,0,h+.035,0,6);ridge.rotation.x=Math.PI/2;
  return g;
 }
 function roundTower(parent,x,y,z,{r=.8,h=4,roofHeight=2.3,windows=true}={}){
  const g=group(parent,x,y,z);g.name='home-round-watchtower';
  const geometry=new THREE.CylinderGeometry(r,r*1.08,h,lowDetail?10:20);mesh(worldUV(geometry),m.wall,g,0,h/2,0);
  for(const yy of [.18,h-.2,h+.02])cyl(r*1.13,r*1.13,.14,yy===.18?m.foundation:ivory,g,0,yy,0,12);
  const coneGeo=new THREE.ConeGeometry(r*1.36,roofHeight,lowDetail?8:20);const roofMesh=mesh(worldUV(coneGeo),m.roof,g,0,h+roofHeight/2,0);roofMesh.name='home-brown-turret-roof';
  if(windows)for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){const face=group(g,Math.sin(angle)*r*1.025,h*.4,Math.cos(angle)*r*1.025);face.rotation.y=angle;windowArch(face,0,0,0,r*.48,h*.28,{ornate:false,glass:k.mat('#514c40')});}
  for(let yy=.6;yy<h-.2;yy+=lowDetail?1:.6){const o=ring(r*1.04,.012,m.foundation,g,0,yy,0);o.rotation.x=Math.PI/2;}
  for(let n=0;n<4;n++){const a=n/4*TAU;line([[Math.sin(a)*r*1.36,h+.01,Math.cos(a)*r*1.36],[0,h+roofHeight+.02,0]],k.mat('#65503b'),g,.018);}
  cyl(.025,.04,.45,gold,g,0,h+roofHeight+.15,0,5);return g;
 }
 function hall(parent,{x,y,z,w,h,d,rh=2.2,windows=true}){
  const g=group(parent,x,y,z);g.name='home-stone-palace-wing';block(g,0,h/2,0,w,h,d);detail.shell(g,{w,h,d,windows});roof(g,0,h+.2,0,w+.35,rh,d+.4);
  if(windows){const count=Math.max(1,Math.floor((w-.6)/1.5));for(let n=0;n<count;n++)windowArch(g,(n-(count-1)/2)*w/count,.75,d/2+.04,Math.min(.7,w/count*.46),Math.min(2.2,h*.45),{glass:k.mat('#756750'),ornate:false});}
  // Corner buttresses extend out from the coursed stone instead of a flat decal.
  if(!lowDetail)for(const side of [-1,1])for(const end of [-1,1]){block(g,side*(w/2+.04),h*.35,end*(d/2-.12),.27,h*.7,.35,m.foundation);block(g,side*(w/2+.04),.2,end*(d/2-.12),.42,.4,.48);}
  return g;
 }
 function cottage(parent){const g=group(parent);g.name='home-private-stone-cottage';block(g,0,.9,0,2.8,1.8,2);detail.shell(g,{w:2.8,h:1.8,d:2,windows:false});roof(g,0,2,0,3.15,1.45,2.45);windowArch(g,0,.18,1.06,.85,1.35,{door:true,glass:k.mat('#68583d'),ornate:false});architecture?.register(g);return g;}
 function radialTexture(){const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot(x-size/2,y-size/2)/(size/2),alpha=Math.max(0,1-r)**2;data.set([255,255,255,Math.round(alpha*255)],(y*size+x)*4);}const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;}
 const glowTexture=radialTexture(),poolMaterial=new THREE.MeshBasicMaterial({color:'#e1a85b',map:glowTexture,transparent:true,opacity:night?.3:.14,depthWrite:false,toneMapped:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),haloMaterial=new THREE.SpriteMaterial({map:glowTexture,color:'#ffd78a',transparent:true,opacity:night?.25:.16,depthWrite:false,toneMapped:true});
 poolMaterial.name='home-warm-light-pool';haloMaterial.name='home-lantern-halo';
 function lamp(parent,x,y,z,h=2.7){
  const g=k.lantern(parent,x,y,z,h);g.name='home-glowing-road-lamp';g.userData.lamp={x,y:y+h-.14,z};
  if(lowDetail){for(const [r,opacity]of [[1.9,.035],[1.3,.055],[.7,.09]]){const pool=mesh(new THREE.CircleGeometry(r,16),k.mat('#e4b36e','glow',{transparent:true,opacity,depthWrite:false}),g,0,.07+(2-r)*.002,0);pool.rotation.x=-Math.PI/2;pool.name='home-lamp-ground-glow';}}else{const pool=mesh(new THREE.PlaneGeometry(4.1,4.1),poolMaterial,g,0,.07,0);pool.rotation.x=-Math.PI/2;pool.castShadow=pool.receiveShadow=false;pool.name='home-lamp-ground-glow';}
  if(!lowDetail){const halo=new THREE.Sprite(haloMaterial);halo.position.set(0,h-.12,0);halo.scale.set(1.15,1.15,1.15);g.add(halo);}
  g.traverse(o=>{if(!o.material?.userData.bloom)return;const base=o.material;if(!lampGlowClones.has(base)){const material=base.clone();lampGlowClones.set(base,material);lampGlows.set(material,{color:base.color.clone(),power:base.emissiveIntensity,opacity:base.opacity});}o.material=lampGlowClones.get(base);});
  const position=new THREE.Vector3();g.updateWorldMatrix(true,false);g.localToWorld(position.set(0,h-.14,0));lamps.push(position);return g;
 }
 function crenellations(parent,rx,rz,y,centerZ,{height=1.05,count=26,gap=true}={}){
  const g=group(parent,0,y,centerZ);g.name='home-crenellated-curtain-wall';
  for(let n=0;n<count;n++){const a=(n+.5)/count*TAU;if(gap&&Math.cos(a)>.93)continue;const segment=group(g,Math.sin(a)*rx,0,Math.cos(a)*rz);segment.rotation.y=a;const w=TAU*Math.min(rx,rz)/count+.1;
   block(segment,0,height/2,0,w,height,.48);block(segment,0,height-.04,0,w+.08,.13,.58,m.foundation);
   for(const sx of [-.3,.3]){block(segment,sx*w,height+.19,0,w*.3,.4,.53);block(segment,sx*w,height+.41,0,w*.31,.07,.57,ivory);}
   if(lowDetail)for(const yy of [.32,.65])line([[-w/2,yy,.246],[w/2,yy,.246]],m.foundation,segment,.012);
  }return g;
 }
 function archGate(parent,x,y,z,w=3.65,h=3.8,depth=.85){
  const g=group(parent,x,y,z);g.name='home-arched-entrance';const opening=1.85,doorH=2.95,s=new THREE.Shape();
  s.moveTo(-w/2,0);s.lineTo(-w/2,h);s.lineTo(w/2,h);s.lineTo(w/2,0);s.lineTo(opening/2,0);s.lineTo(opening/2,doorH*.58);s.bezierCurveTo(opening/2,doorH*.8,opening*.2,doorH*.94,0,doorH);s.bezierCurveTo(-opening*.2,doorH*.94,-opening/2,doorH*.8,-opening/2,doorH*.58);s.lineTo(-opening/2,0);s.closePath();
  mesh(worldUV(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:lowDetail?5:12})),m.wall,g);
  line(k.pointedShape(opening+.13,doorH+.12).getPoints(lowDetail?8:24).map(p=>[p.x,p.y,depth+.03]),ivory,g,.09);
  block(g,0,h+.02,depth/2,w+.2,.18,depth+.18,m.foundation);for(const dx of [-1.35,-.65,0,.65,1.35])block(g,dx,h+.3,depth/2,.38,.5,depth+.1);
  for(let dx=-.72;dx<=.73;dx+=.24)box(.04,.7,.045,wood,g,dx,doorH-.35,depth*.48);box(1.7,.05,.055,gold,g,0,doorH-.65,depth*.48);
  return g;
 }
 // Keep exactly the same island outline and bridge elevations.
 const cap=ellipse(root,0,-.55,0,island.rx,island.rz,1.1,m.wall);cap.renderOrder=-800;
 const cliff=ellipse(root,0,-4,0,island.rx*.99,island.rz*.99,5.8,k.mat('#756c5e'));cliff.renderOrder=-1000;
 const taper=new THREE.CylinderGeometry(1,.42,4,lowDetail?16:32);taper.scale(island.rx*.84,1,island.rz*.84);mesh(taper,k.mat('#625d53'),root,0,-8.25,0).renderOrder=-1100;
 paving(root,0,.021,0,island.rx*.985,island.rz*.985);
 for(const a of [0,Math.PI*.7,Math.PI*1.3])banner(root,Math.sin(a)*island.rx*.99,-.4,Math.cos(a)*island.rz*.99,1.25,4.8,-a);
 // Stone rim, with gaps wherever a traversable bridge joins the island.
 const nearBridge=(x,z,r=4.1)=>bridgeSegments().some(({a,b})=>Math.min(Math.hypot(x+island.x-a.x,z+island.z-a.z),Math.hypot(x+island.x-b.x,z+island.z-b.z))<r);
 for(let n=0;n<40;n++){const a=n/40*TAU,x=Math.sin(a)*island.rx*.94,z=Math.cos(a)*island.rz*.94;if(nearBridge(x,z))continue;const rim=group(root,x,0,z);rim.rotation.y=a;block(rim,0,.24,0,2.7,.48,.46,m.foundation);block(rim,0,.5,0,2.8,.09,.56,ivory);if(n%5===0)lamp(root,x,0,z,2.6);}
 const castle=group(root);castle.name='home-tiered-castle';castle.userData.tiers=[{level:'outer-bailey',height:2.6},{level:'inner-court',height:4.6},{level:'summit-palace',height:11.9}];
 // Lower bailey: the old private floor remains at +2.6 above the island.
 ellipse(castle,0,1.3,-9,7.2,6.55,2.6);terraceBrickwork(castle,7.2,6.55,2.6,-9);paving(castle,0,2.615,-9,7.15,6.5,{dense:true});crenellations(castle,7.15,6.5,2.6,-9);
 for(const a of [.87,2.28,3.85,5.42])roundTower(castle,Math.sin(a)*7.12,2.6,-9+Math.cos(a)*6.5,{r:.56,h:2.4,roofHeight:1.5});
 archGate(castle,0,2.6,-3.18);
 for(const x of [-2.7,2.7]){roundTower(castle,x,2.6,-3.75,{r:.7,h:3.5,roofHeight:2.45});banner(castle,x,5.7,-2.96,.62,1.9);lamp(castle,x*1.46,2.6,-3.65,2.1);}
 // Broad stairs climb toward the gate; individual stone treads have dark risers.
 for(let n=0;n<13;n++){const y=.1+n*.2,z=.62-n*.275;block(root,0,y/2,z,2.45,y,.4,m.foundation);block(root,0,y+.025,z+.015,2.57,.055,.43,m.wall);}
 // A second, smaller terrace is entirely inside the closed castle footprint.
 ellipse(castle,0,3.6,-11,4.3,3.65,2,m.wall);paving(castle,0,4.615,-11,4.25,3.6,{dense:true});
 crenellations(castle,4.25,3.6,4.6,-11,{height:.55,count:18,gap:true});
 hall(castle,{x:-2.55,y:4.6,z:-11.05,w:1.85,h:4.8,d:4.35,rh:2.1});
 hall(castle,{x:2.6,y:4.6,z:-10.65,w:1.7,h:6.1,d:3.75,rh:2.45});
 hall(castle,{x:0,y:4.6,z:-13.2,w:4.5,h:7.3,d:1.7,rh:2.4});
 hall(castle,{x:0,y:4.6,z:-8.42,w:3.35,h:3.1,d:1.25,rh:1.5});
 const summit=group(castle,.35,4.6,-12.5);summit.name='home-summit-bell-tower';block(summit,0,5.7,0,1.85,11.4,1.85);detail.shell(summit,{w:1.85,h:11.4,d:1.85,windows:false});
 for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){const face=group(summit,Math.sin(a)*.96,0,Math.cos(a)*.96);face.rotation.y=a;windowArch(face,0,8.5,.02,.67,2.1,{glass:k.mat('#4a4438'),ornate:false});windowArch(face,0,4.2,.02,.42,1.85,{glass:k.mat('#5e5443'),ornate:false});}
 const bellRoof=mesh(worldUV(new THREE.ConeGeometry(1.55,5.35,4)),m.roof,summit,0,14.15,0);bellRoof.rotation.y=Math.PI/4;bellRoof.name='home-brown-bell-roof';
 cyl(.035,.06,1.5,gold,summit,0,17.5,0,6);line([[-.35,18,0],[.35,18,0]],gold,summit,.028);
 roundTower(castle,-3.15,4.6,-12.1,{r:.67,h:6.7,roofHeight:3.1});roundTower(castle,3.25,4.6,-12.5,{r:.58,h:7.8,roofHeight:2.6});
 // Small courtyard well and a tree, visible between the staggered wings.
 cyl(.63,.72,.6,m.foundation,castle,0,4.93,-10.5,12);ring(.65,.06,ivory,castle,0,5.27,-10.5).rotation.x=Math.PI/2;tree(castle,-.95,4.63,-10.75,.5,'round',88);
 const diary=group(castle,-3,2.6,-6.2);cottage(diary);
 const gateTarget=group(castle,0,0,-9);gateTarget.name='home-gate-hit-target';
 // The active garden is independently batched and replaced only at a phase boundary.
 let currentPhase=phase,garden=homeGarden({root,phase,lowDetail,nearBridge}),gardenTween=null,lampTween=null;
 function replaceGarden(next){garden.dispose();garden=homeGarden({root,phase:next,lowDetail,nearBridge});currentPhase=next;root.userData.plantingCount=garden.plantingCount;}
 function fadeGarden(alpha){garden.root.traverse(o=>{if(!o.material)return;const m=o.material;if(!m.userData.gardenFade)m.userData.gardenFade={opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite};const base=m.userData.gardenFade,next=base.transparent||alpha<.999;if(m.transparent!==next){m.transparent=next;m.needsUpdate=true;}m.opacity=base.opacity*alpha;m.depthWrite=next?false:base.depthWrite;});}
 root.userData.plantingCount=garden.plantingCount;
 const ornament=group(root);ornament.name='home-classic-courtyard-ornament';ornament.userData.dynamic=true;k.pedestal(ornament,0,0,5,1.8,.4);k.armillary(ornament,0,2.3,5,1.3,{blue:false,spin:false});
 architecture=homeArchitecture({root,castle,ornament,phase,lowDetail});architecture.register(root,{flagsOnly:true});architecture.register(root,{pavingOnly:true});
 for(const [x,z]of [[-4,1.5],[4,1.5],[-5.3,10],[5.3,10],[-10,5.3],[10,5.3]])lamp(root,x,0,z,2.85);
 for(const x of [-3.3,3.3])lamp(castle,x,4.6,-9.3,1.7);
 if(!lowDetail)for(let n=0;n<4;n++){const light=new THREE.PointLight('#ffd392',night?24:11,6.4,2);light.name='home-road-light';light.castShadow=false;root.add(light);lights.push(light);}
 const lampState=lights.map(light=>({power:light.intensity,color:light.color.clone()}));let dawnWeight=0,dawnTime=0,lampNight=false;
 function applyLamps(){for(const [m,b]of lampGlows){m.color.copy(b.color).multiplyScalar(1-dawnWeight*(.04+dawnTime*.22));if(m.emissive)m.emissiveIntensity=b.power*(1-dawnWeight*(.08+dawnTime*.35));if(m.transparent)m.opacity=b.opacity*(1-dawnWeight*(.2+dawnTime*.4));}lights.forEach((light,n)=>{light.intensity=lampState[n].power*(1-dawnWeight*(.12+dawnTime*.48));light.color.copy(lampState[n].color);});poolMaterial.opacity=(lampNight?.3:.14)*(1-dawnWeight*(.2+dawnTime*.4));haloMaterial.opacity=(lampNight?.25:.16)*(1-dawnWeight*(.2+dawnTime*.4));}
 function setDawnProgress(weight,progress){dawnWeight=THREE.MathUtils.clamp(weight,0,1);dawnTime=THREE.MathUtils.clamp(progress,0,1);applyLamps();}
 let lastX=Infinity,lastZ=Infinity;
 function updateLights(target){if(Math.hypot(target.x-lastX,target.z-lastZ)<1)return;lastX=target.x;lastZ=target.z;const ordered=lamps.slice().sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));root.updateWorldMatrix(true,false);lights.forEach((light,n)=>{light.visible=Math.hypot(target.x-island.x,target.z-island.z)<island.rx+24;light.position.copy(root.worldToLocal(ordered[n].clone()));});}
 updateLights({x:island.x,z:island.z});
 function proxy(parent){
  parent.userData.artDirection='limestone-tiered-citadel-proxy';const disk=ellipse(parent,0,-.4,0,island.rx,island.rz,.8,m.wall);disk.renderOrder=-800;const under=ellipse(parent,0,-4.6,0,island.rx*.95,island.rz*.95,7.4,k.mat('#756c5e'));under.renderOrder=-1000;
  const proxyCastle=group(parent);ellipse(proxyCastle,0,1.3,-9,7.2,6.55,2.6);ellipse(proxyCastle,0,3.6,-11,4.3,3.65,2);block(proxyCastle,0,8.25,-12.4,4.8,7.3,2.7);roof(proxyCastle,0,11.9,-12.4,5.2,2.5,3.1);roundTower(proxyCastle,.3,4.6,-12.5,{r:.75,h:11.3,roofHeight:5.1,windows:false});for(const x of [-5.3,5.3])roundTower(proxyCastle,x,2.6,-8,{r:.6,h:3,roofHeight:1.8,windows:false});architecture.register(proxyCastle);for(const x of [-11,11])tree(parent,x,0,2,1.1,'round',2);lighting.addProxy(parent);return parent;
 }
 const lighting=homeLighting({root,phase,lowDetail});
 function setPhase(next,options){
  if(!homeAtmospheres[next])return;
  if(next!==currentPhase){if(options?.immediate===false)gardenTween={next,started:options.now,swapped:false};else{gardenTween=null;replaceGarden(next);}}
  const p=homeAtmospheres[next];root.userData.atmosphere={phase:next,scope:'home',planting:p.planting};
  const destinations=lights.map((light,n)=>({power:p.lampPower,color:new THREE.Color(next==='cyber'?(n%2?'#c2a1d6':'#95c8d7'):next==='gothic'&&n===0?'#d39a7c':'#ffd392')}));
  if(options?.immediate===false)lampTween={started:options.now,from:lampState.map(s=>({power:s.power,color:s.color.clone()})),to:destinations};else{lampTween=null;lampState.forEach((s,n)=>{s.power=destinations[n].power;s.color.copy(destinations[n].color);});}
  lampNight=p.night;applyLamps();
  lighting.setPhase(next,options);architecture.setPhase(next,options);
 }
 setPhase(phase);
 return{kit:k,materials:m,castle,architecture,gateTarget,cottage,proxy,updateLights,setPhase,setDawnProgress,refreshLighting:lighting.refresh,update(now,reduced){if(gardenTween){const elapsed=Math.max(0,now-gardenTween.started);if(elapsed>=4000&&!gardenTween.swapped){replaceGarden(gardenTween.next);gardenTween.swapped=true;}fadeGarden(elapsed<4000?1-smoothBlend(0,1,elapsed,4000):smoothBlend(0,1,elapsed-4000,4000));if(elapsed>=8000)gardenTween=null;}if(lampTween){const t=smoothBlend(0,1,now-lampTween.started);lampState.forEach((s,n)=>{s.power=THREE.MathUtils.lerp(lampTween.from[n].power,lampTween.to[n].power,t);s.color.copy(lampTween.from[n].color).lerp(lampTween.to[n].color,t);});if(t===1)lampTween=null;}applyLamps();k.update(now,reduced);garden.update(now,reduced);lighting.update(now);lighting.setDawnProgress(dawnTime);architecture.update(now,reduced);},dispose(){architecture.dispose();garden.dispose();glowTexture.dispose();}};
}
