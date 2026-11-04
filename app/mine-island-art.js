import * as THREE from 'three';
import artKit,{seeded} from './art-kit.js';
import mineMaterials,{mineMistTexture} from './mine-materials.js';
import {minePalette,mineMountainRadius,mineBuildingKind} from '../lib/mine-style.ts';
import {bridgeSegments} from '../lib/archipelago.ts';
import {footprint,positionOf} from '../lib/layout.ts';
import {constructionFraction} from '../lib/building-appearance.ts';
import {mountainSurface,sampleRockSurface,crystalGeometry,crystalTypes,crystalElevationBand,outcropGeometry} from './mine-geology.js';
import batchStatic from './batch-static.js';

export default function createMineIsland({root,island,projects=[],phase='gothic',lowDetail=false}){
 const k=artKit({phase,lowDetail,palette:minePalette}),m=mineMaterials({phase,lowDetail}),{mesh,box,cyl,ball,cone,line,ring,group,star}=k,TAU=Math.PI*2;
 const auraGeometry=lowDetail?new THREE.CircleGeometry(1,20):new THREE.PlaneGeometry(1,1);
 const sources=[],lights=[],orbits=[],ownedGeometry=[auraGeometry],shards=new Map(Array.from({length:4},(_,elevationBand)=>crystalTypes.map(type=>[`${type}:${elevationBand}`,crystalGeometry(type,{elevationBand})])).flat()),outcrops=[0,1,2].map(outcropGeometry),stats={crystals:0,caves:0,carts:0,lamps:0,cards:0,particles:0,outcrops:0};
 const idSeed=id=>[...String(id)].reduce((sum,c)=>Math.imul(sum,31)+c.charCodeAt(0)|0,7)>>>0;
 let nearMine=true;
 root.userData.artDirection='gothic-steam-crimson-mine';root.userData.palette={...minePalette};
 const mountain=group(root,0,0,-5);mountain.name='garnet-crystal-mountain';mountain.userData.reservedRadius=mineMountainRadius;
 function crystal(parent,x,y,z,r=.4,h=1.4,{major=false,glow=false,count=true,type,elevation=0}={}){
  const g=group(parent,x,y,z);g.name=major?'mine-giant-crimson-crystal':'mine-crimson-crystal';g.userData.height=h;g.userData.radius=r;
  type??=major?'spire':crystalTypes[Math.abs(Math.floor(x*17+z*31+h*11))%crystalTypes.length];g.userData.crystalType=type;
  const band=major?3:crystalElevationBand(elevation),materials=major?m.majorCrystal:m.crystalByElevation[band];g.userData.elevationBand=band;
  for(let n=0;n<3;n++){const face=mesh(shards.get(`${type}:${band}`)[n],materials[n],g);face.scale.set(r,h,r);}
  if(glow||major){for(const side of [-1,1])line([[side*r*.47,.1,r*.39],[side*r*.74,h*.69,r*.5],[.07*r,h,0]],m.ruby,g,major?.022:.011);ball(major?.12:.045,m.ruby,g,0,.15,0);}
  if(major){const aura=lowDetail?mesh(auraGeometry,m.summitAura,g):new THREE.Sprite(m.summitAura);if(!lowDetail)g.add(aura);aura.name='mine-giant-crystal-red-aura';aura.position.set(0,h*.48,0);aura.scale.set(r*(lowDetail?1.7:3.4),h*(lowDetail?.64:1.2),1);aura.castShadow=false;aura.receiveShadow=false;if(count)sources.push({object:g,point:new THREE.Vector3(0,h*.4,0),color:'#ff4968',power:m.night?16:12,distance:6.2,landmark:'summit'});}
  if(count)stats.crystals++;return g;
 }
 function banner(parent,x,y,z,w=1,h=3,angle=0){
  const g=group(parent,x,y,z);g.name='burgundy-banner';g.rotation.y=angle;
  const positions=[],indices=[],cols=lowDetail?4:6,rows=lowDetail?3:5,fold=(a,b)=>Math.sin(a/w*TAU*2)*.035+Math.sin(b/h*4+a*3)*.012;
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){const a=(col/cols-.5)*w,b=-row/rows*h*(1-.36*Math.abs(a)/w);positions.push(a,b,fold(a,b));}
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const cloth=mesh(geometry,k.mat(minePalette.burgundy,'cloth',{side:THREE.DoubleSide}),g);cloth.name='burgundy-cloth';
  const edge=[[-w/2,0],[-w/2,-h*.82],[0,-h],[w/2,-h*.82],[w/2,0],[-w/2,0]];line(edge.map(([a,b])=>[a,b,fold(a,b)+.025]),m.bronze,g,.016);box(w*1.2,.06,.08,m.bronze,g,0,.06,.02);
  const sigil=group(g,0,-h*.43,.075);sigil.name='mine-bronze-mystic-sigil';sigil.userData.symbol='lunar-alchemy';ring(w*.2,.018,m.bronze,sigil);line([[0,h*.18,0],[0,-h*.22,0]],m.bronze,sigil,.018);line([[-w*.17,h*.12,0],[0,h*.2,0],[w*.17,h*.12,0]],m.bronze,sigil,.018);for(const s of [-1,1]){const diamond=box(w*.09,w*.09,.025,m.bronze,sigil,s*w*.25,-h*.26,0);diamond.rotation.z=Math.PI/4;}return g;
 }
 function lamp(parent,x,y,z,h=2.4,{hanging=false,register=true}={}){
  const g=group(parent,x,y,z);g.name='mine-warm-miner-lamp';
  if(!hanging){cyl(.13,.2,.13,m.iron,g,0,.08,0,6);cyl(.035,.065,h-.4,m.iron,g,0,(h-.4)/2,0,6);}else line([[0,h+.2,0],[0,h+.62,0]],m.bronze,g,.02);
  const core=box(.2,.36,.2,m.warm,g,0,h-.15,0);core.name='mine-yellow-lamp-core';core.castShadow=false;
  for(const sx of [-.14,.14])for(const sz of [-.14,.14])box(.025,.46,.025,m.iron,g,sx,h-.15,sz);
  cyl(.23,.2,.09,m.bronze,g,0,h+.09,0,6);cone(.25,.22,m.iron,g,0,h+.23,0,6);cyl(.18,.23,.1,m.bronze,g,0,h-.4,0,6);
  if(register){sources.push({object:g,point:new THREE.Vector3(0,h-.15,0),color:minePalette.light,power:m.night?18:11,distance:6.2});stats.lamps++;}return g;
 }
 function gear(parent,x,y,z,r=.55,animate=false){const g=group(parent,x,y,z);g.name='mine-bronze-winch';ring(r,.1,m.bronze,g);for(let n=0;n<10;n++){const a=n/10*TAU,tooth=box(.17,.2,.14,m.bronze,g,Math.sin(a)*r*1.1,Math.cos(a)*r*1.1,0);tooth.rotation.z=-a;}for(let n=0;n<3;n++){const spoke=box(.055,r*1.6,.08,m.iron,g);spoke.rotation.z=n*Math.PI/3;}if(animate){g.userData.dynamic=true;k.animations.push({object:g,kind:'rotate',axis:'z',speed:.00012});}return g;}
 function rail(parent,x,y,z,length=4.2,angle=0){const g=group(parent,x,y,z);g.rotation.y=angle;g.name='mine-twin-rail-track';for(const side of [-1,1]){box(.07,.09,length,m.iron,g,side*.6,.14,length/2);box(.1,.035,length,m.bronze,g,side*.6,.2,length/2);}for(let n=0;n<Math.ceil(length/.43);n++)box(1.65,.09,.16,m.wood,g,0,.065,n*.43);return g;}
 function cart(parent,x,y,z,{register=true}={}){const g=group(parent,x,y,z);g.name='mine-ore-cart';box(1.05,.12,1.25,m.iron,g,0,.4,0);for(const sx of [-.61,.61])for(const zz of [-.4,.4]){const wheel=cyl(.19,.19,.13,m.iron,g,sx,.23,zz,8);wheel.rotation.z=Math.PI/2;const hub=cyl(.055,.055,.15,m.bronze,g,sx,.23,zz,8);hub.rotation.z=Math.PI/2;}box(1,.13,1.1,m.body,g,0,.52,0);for(const sx of [-.53,.53])box(.1,.63,1.22,m.wood,g,sx,.82,0);for(const zz of [-.58,.58])box(1.16,.63,.1,m.wood,g,0,.82,zz);for(const sx of [-.57,.57])for(const zz of [-.62,.62])box(.06,.7,.06,m.iron,g,sx,.8,zz);for(const [xx,zz,h]of [[-.2,0,.7],[.25,.15,.55],[.05,-.2,.6]])crystal(g,xx,.85,zz,.14,h,{count:register});if(register)stats.carts++;return g;}
 function crate(parent,x,y,z,s=.7){const g=group(parent,x,y,z);box(s,s,s,m.wood,g,0,s/2,0);for(const yy of [.05,s-.05])box(s+.05,.065,s+.05,m.iron,g,0,yy,0);for(const side of [-1,1])line([[-s/2,.08,side*s*.51],[s/2,s-.08,side*s*.51]],m.woodEdge,g,.035);return g;}
 function gable(parent,w,h,d,y,z=0){const vertices=[-w/2,0,d/2,w/2,0,d/2,0,h,d/2,-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex([0,1,2,5,4,3,0,2,5,0,5,3,2,1,4,2,4,5,3,4,1,3,1,0]);const hard=g.toNonIndexed();hard.computeVertexNormals();mesh(hard,m.roof,parent,0,y,z);g.dispose();for(const zz of [-d/2,d/2])line([[-w/2,y,z+zz],[0,y+h,z+zz],[w/2,y,z+zz]],m.bronze,parent,.025);}
 function cave(parent,p,{proxy=false}={}){
  const g=group(parent),variant=({'craft-jewelry':0,'craft-weaving':1,'craft-other':2})[p.id]??idSeed(p.id)%3,height=[3.15,3.3,3.03][variant],lean=[-.026,.018,.035][variant];g.name='mine-timber-cave';g.userData.projectId=p.id;g.userData.category=p.collectionCategory;g.userData.timberVariant=variant;
  box(3.05,2.75,2.7,m.body,g,0,1.43,-.45);
  for(const side of [-1,1]){const r=mesh(outcrops[(variant+(side>0?1:0))%3],m.rock[side<0?0:2],g,side*2.1,1.7,-.45);r.scale.set(1.18,2.9,1.55);r.rotation.y=side*.4+variant*.23;const post=box(.28+(variant===1?.05:0),height,.42,m.wood,g,side*1.5,height/2+.06,1.13);post.rotation.z=lean*side;post.name='mine-timber-support';box(.13,height+.15,.13,m.woodEdge,g,side*1.62,height/2+.13,1.37);line([[side*1.46,height*.66,1.39],[side*(.64+variant*.07),height+.02,1.39]],m.woodEdge,g,.11);for(const yy of [.6,2.1,height-.05])ball(.05,m.bronze,g,side*1.5,yy,1.38);}
  const top=mesh(outcrops[variant],m.rock[1],g,.12*(variant-1),height-.1,-.6);top.scale.set(3.05,1.35,1.85);top.rotation.y=variant*.25;const header=box(3.4,.3,.5,m.wood,g,0,height,1.1);header.rotation.z=lean*.6;gable(g,3.9,[.75,.94,.62][variant],1,height+.05,1.05);
  if(!proxy){for(let n=0;n<4+variant;n++)box(3.05,.035,.045,m.woodEdge,g,0,height+.12+n*.1,1.38);rail(g,0,0,.45,3.65);cart(g,0,0,2.05);for(const side of [-1,1])lamp(g,side*1.9,1.35,1.25,1.15,{hanging:true});crate(g,2,.03,1.9,.63);crate(g,-2.1,.03,.5,.58);banner(g,-2.2,4.6,1.08,.65,2.8);crystal(g,1.95,height+.1,-.15,.28,1.1,{glow:true});const badge=mesh(new THREE.OctahedronGeometry(.16,0),k.mat(p.color??minePalette.gold),g,0,height-.02,1.43);badge.name='mine-project-color-inlay';}
  else{for(const sx of [-1.9,1.9])lamp(g,sx,.4,1.3,2,{register:false});}
  return g;
 }
 function card(parent,index,{proxy=false}={}){
  const angle=index/6*TAU+.28,radius=3.05+(index%3)*.2,y=[4.15,6.1,8.2,9.7,7.25,5.05][index],g=group(parent,Math.sin(angle)*radius,y,Math.cos(angle)*radius);g.name='mine-floating-tarot-card';g.userData.orbit={angle,radius,height:y};g.scale.setScalar(1.2);g.rotation.set((index%2?1:-1)*.15,angle,.12*Math.sin(index*2));box(.84,1.4,.055,m.roof,g);
  for(const side of [-1,1]){const face=group(g,0,0,side*.042);face.rotation.y=side<0?Math.PI:0;line([[-.36,-.63,0],[-.36,.63,0],[.36,.63,0],[.36,-.63,0],[-.36,-.63,0]],m.cardRune,face,.013);const rune=group(face,0,.03,.012);rune.name='mine-lavender-card-rune';ring(.2,.012,m.cardRune,rune);if(index%3===0)star(.19,m.cardRune,rune,0,0,.012);else if(index%3===1)line([[-.18,.1,0],[0,.28,0],[.18,.1,0],[0,-.28,0],[-.18,.1,0]],m.cardRune,rune,.015);else{line([[0,-.31,0],[0,.31,0]],m.cardRune,rune,.014);for(const s of [-1,1])line([[s*.14,.24,0],[0,.14,0],[s*.14,.02,0]],m.cardRune,rune,.014);}for(const yy of [-.47,.47])box(.23,.018,.015,m.bronze,face,0,yy,.01);}
  const aura=mesh(auraGeometry,m.cardAura,g);aura.name='mine-purple-tarot-aura';aura.scale.set(lowDetail?.84:1.68,lowDetail?1.14:2.28,1);aura.castShadow=false;aura.receiveShadow=false;
  // Merge the fixed face geometry before marking its parent dynamic: three draws per native card.
  batchStatic(g,{shadows:false});g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  if(!proxy)stats.cards++;return g;
 }
 function tarotOrbit(parent,{proxy=false}={}){
  const orbit=group(parent);orbit.name='mine-tarot-card-orbit';const cards=Array.from({length:6},(_,n)=>card(orbit,n,{proxy}));
  if(proxy)return orbit;
  orbit.userData.dynamic=true;const particles=lowDetail?4:10,vertices=[];
  for(let n=0;n<particles;n++){const a=n/particles*TAU+.4,r=2.8+(n%3)*.3,x=Math.sin(a)*r,z=Math.cos(a)*r,y=3.8+(n*1.73)%6.6,s=.035+(n%2)*.012;const v=[[x,y+s,z],[x+s,y,z],[x,y,z+s],[x-s,y,z],[x,y,z-s],[x,y-s,z]];for(let j=0;j<4;j++){vertices.push(...v[0],...v[j+1],...v[(j+1)%4+1],...v[5],...v[(j+1)%4+1],...v[j+1]);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const motes=mesh(geometry,m.violet,orbit);motes.name='mine-sparse-magic-particles';motes.userData.count=particles;motes.castShadow=false;motes.receiveShadow=false;stats.particles+=particles;orbits.push({object:orbit,cards,motes});return orbit;
 }
 function moon(parent,x,y,z,r=.8){const shape=new THREE.Shape();shape.moveTo(.45,.85);shape.absarc(0,0,.96,1.084,5.199,false);shape.quadraticCurveTo(-.4,0,.45,.85);const g=new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false,curveSegments:lowDetail?12:24});g.scale(r,r,r);const o=mesh(g,m.bronze,parent,x,y,z);o.name='mine-bronze-crescent';return o;}
 function tarot(parent,p,{proxy=false}={}){
  const g=group(parent);g.name='mine-gothic-tarot-spire';g.userData.projectId=p.id;
  cyl(2.65,2.9,.42,m.rock[1],g,0,.21,0,12);cyl(2.5,2.65,.12,m.bronze,g,0,.47,0,12);cyl(1.52,1.7,8.6,m.body,g,0,4.83,0,8);
  for(let n=0;n<8;n++){const a=n/8*TAU,x=Math.sin(a)*1.6,z=Math.cos(a)*1.6,b=box(.16,8.2,.22,m.rock[3],g,x,4.7,z);b.rotation.y=a;}
  cyl(1.9,1.8,.22,m.bronze,g,0,9.15,0,8);cone(2.07,5.35,m.roof,g,0,11.93,0,8);
  for(let n=0;n<8;n++){const a=n/8*TAU;line([[Math.sin(a)*2.07,9.28,Math.cos(a)*2.07],[0,14.6,0]],m.bronze,g,.022);}
  for(const side of [-1,1]){cyl(.31,.4,8.8,m.body,g,side*1.65,4.83,-.48,8);cone(.57,2.9,m.roof,g,side*1.65,10.7,-.48,6);cyl(.018,.035,.6,m.bronze,g,side*1.65,12.45,-.48,5);}
  const inlay=mesh(new THREE.OctahedronGeometry(.13,0),k.mat(p.color??minePalette.gold),g,0,4.7,1.64);inlay.name='mine-project-color-inlay';
  const entrance=k.windowArch(g,0,.5,1.6,1.22,3.8,{door:true,glass:m.glass});entrance.name='mine-tarot-pointed-entrance';if(lowDetail)entrance.traverse(o=>{if(o.material)o.renderOrder=0;});
  for(const side of [-1,1]){const w=k.windowArch(g,side*.83,5.5,1.28,.38,1.65,{glass:m.glass,ornate:false});if(lowDetail)w.traverse(o=>{if(o.material)o.renderOrder=0;});banner(g,side*1.4,7.5,1.3,.55,3.8);}
  cyl(.025,.05,1.5,m.bronze,g,0,15.1,0,6);moon(g,0,15.7,0,.86);star(.12,m.violet,g,-.5,15.8,.08);
  const astrolabe=group(g,0,10.35,0);astrolabe.name='mine-bronze-astrolabe';for(let n=0;n<3;n++){const orbit=ring(2.15+n*.23,.028,m.bronze,astrolabe);orbit.rotation.set(.55+n*.35,.2*n,.3+n*.3);}ball(.15,m.violet,astrolabe,0,0,0);
  const sigil=group(g,0,.56,1.2);sigil.name='mine-tarot-star-floor';ring(1.15,.018,m.bronze,sigil).rotation.x=-Math.PI/2;for(let n=0;n<5;n++){const a=n/5*TAU,b=(n+2)/5*TAU;line([[Math.sin(a),.02,Math.cos(a)],[Math.sin(b),.02,Math.cos(b)]],m.bronze,sigil,.012);}
  tarotOrbit(g,{proxy});
  if(!proxy){for(const x of [-2.1,2.1])lamp(g,x,.1,1.7,2.8);sources.push({object:g,point:new THREE.Vector3(0,6,1.5),color:'#b477f5',power:10,distance:5.3,landmark:'tarot'});}
  return g;
 }
 function workshop(parent,p,{proxy=false}={}){const g=group(parent);g.name='mine-dark-workshop';const inlay=mesh(new THREE.OctahedronGeometry(.13,0),k.mat(p.color??minePalette.gold),g,0,2.4,1.24);inlay.name='mine-project-color-inlay';box(2.5,2.5,2.3,m.body,g,0,1.35,0);gable(g,3,1.65,2.8,2.6);k.windowArch(g,0,.18,1.2,.88,1.9,{door:true,glass:m.glass});if(!proxy){gear(g,-.8,2.3,1.22,.27);lamp(g,1.3,0,1.3,2.2);banner(g,-1.25,3.9,1.15,.52,2.15);crystal(g,1.35,.12,-.65,.24,1); }return g;}
 function building(parent,p,{proxy=false}={}){
  const before={status:p.status,progress:p.progress},g=group(parent);g.userData.projectId=p.id;g.userData.stage=before;
  if(p.status==='foundation'){g.name='mine-building-foundation';box(3.7,.18,3.1,m.rock[1],g,0,.09,0);for(const x of [-1.4,1.4])for(const z of [-1.2,1.2])box(.13,.75,.13,m.wood,g,x,.4,z);return g;}
  const kind=mineBuildingKind(p),design=kind==='tarot'?tarot(g,p,{proxy}):kind==='cave'?cave(g,p,{proxy}):workshop(g,p,{proxy});
  if(kind==='cave'&&!proxy)stats.caves++;
  if(p.status==='building'){design.scale.y=Math.max(.2,constructionFraction(p));const h=kind==='tarot'?10:4;for(const side of [-1,1]){box(.11,h,.11,m.wood,g,side*2,h/2,0);line([[side*2,1,0],[side*2,h*.8,1.4]],m.woodEdge,g,.035);}box(4.5,.1,.3,m.wood,g,0,h*.8,0);}
  return g;
 }
 function mountainBody(parent,{proxy=false}={}){
  const surface=mountainSurface(proxy),triangles=[...surface.triangles],rng=seeded(9342);
  parent.userData.terrain='asymmetric-fractured-ridges';parent.userData.surfaceVertices=surface.vertices.length;
  for(let n=0;n<4;n++){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(surface.buckets[n],3));geo.computeVertexNormals();ownedGeometry.push(geo);const o=mesh(geo,m.rock[n],parent);o.name='mine-faceted-rock';}
  // Individually tilted, unequal outcrops interrupt the slopes and silhouette.
  const crags=[[-5.35,1.3,1.25,2.8],[-4.3,3.8,1.15,2.1],[-1.7,4.9,1.25,2.6],[1.45,4.95,1.1,2.4],[4.3,3.25,1.05,2.5],[5.65,.3,.85,2.1],[4.75,-2.9,1.15,3.2],[2.25,-4.65,1,2.7],[-1.6,-5.0,1.2,2.5],[-4.8,-2.7,1.15,2.75],[-2.75,.8,1.4,2.5],[2.5,1.6,1.25,3.2],[.1,2.65,1.1,2.1],[1.4,-2.7,.9,2.8],[-2.9,-1.9,1.05,2.3],[-.65,.8,.8,2.3],[3.8,-.7,1.05,2.4],[-4.1,1.9,1.2,2.6]];
  for(let n=0;n<crags.length;n++){if(proxy&&n%2)continue;const [x,z,r,h]=crags[n],at=sampleRockSurface(surface.triangles,x,z);if(!at)continue;const rock=mesh(outcrops[n%3],m.rock[(n+1)%4],parent,x,at.y+h*.1,z);rock.name='mine-irregular-outcrop';rock.scale.set(r,h,r*(.65+rng()*.4));rock.rotation.set((rng()-.5)*.3,rng()*TAU,(rng()-.5)*.3);
   const positions=rock.geometry.attributes.position,v=new THREE.Vector3();
   for(let attempt=0;attempt<5;attempt++){rock.updateMatrix();let maxRadius=0;for(let j=0;j<positions.count;j++){v.fromBufferAttribute(positions,j).applyMatrix4(rock.matrix);maxRadius=Math.max(maxRadius,Math.hypot(v.x,v.z));}if(maxRadius<7.5)break;rock.scale.x*=.85;rock.scale.z*=.85;}
   rock.updateMatrix();for(let j=0;j<positions.count;j+=3){const t=[0,1,2].map(offset=>new THREE.Vector3().fromBufferAttribute(positions,j+offset).applyMatrix4(rock.matrix).toArray());triangles.push(t);}if(!proxy)stats.outcrops++;
  }
  const surfaceAt=(x,z)=>sampleRockSurface(triangles,x,z);
  const summit=surfaceAt(-.55,-.7),hero=crystal(parent,-.55,summit.y-.75,-.7,1.3,7.4,{major:true,count:!proxy});hero.rotation.set(-.045,.2,.05);
  for(const [x,z,r,h,lean,type]of [[-1.5,-.35,.57,3.6,-.23,'blade'],[.9,-1.1,.4,2.9,.27,'needle']]){const at=surfaceAt(x,z),shard=crystal(parent,x,at.y-.12,z,r,h,{count:!proxy,type,elevation:at.y});shard.rotation.set(.14,x,lean);}
  // Select scattered creases in the actual triangulated rock, then plant fan-shaped
  // clusters on the highest intersected face. Nothing sits on an invisible level ring.
  const seams=[...surface.seams];for(let n=seams.length-1;n>0;n--){const j=Math.floor(rng()*(n+1));[seams[n],seams[j]]=[seams[j],seams[n]];}
  const anchors=[];for(const [a,b]of seams){const t=.25+rng()*.5,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t;if(Math.hypot(x+.55,z+.7)<1.45||anchors.some(p=>Math.hypot(p.x-x,p.z-z)<1.02)||(Math.abs(x)>5&&Math.abs(z)<1.2))continue;anchors.push({x,z});if(anchors.length>=(proxy?12:30))break;}
  for(let n=0;n<anchors.length;n++){const {x,z}=anchors[n],cluster=group(parent,x,0,z);cluster.name='mine-seam-crystal-cluster';cluster.userData.anchor={x,z};const count=proxy?1:3+n%2;
   for(let j=0;j<count;j++){const a=rng()*TAU,spread=j===0?0:.25+rng()*.28,px=x+Math.sin(a)*spread,pz=z+Math.cos(a)*spread,at=surfaceAt(px,pz);if(!at)continue;const h=j===0?1.3+rng()*1.3:.48+rng()*1.15,r=j===0?.25+rng()*.15:.13+rng()*.14,c=crystal(cluster,px-x,at.y-.09,pz-z,r,h,{type:crystalTypes[(n+j*2)%5],glow:!proxy&&n%5===0&&j===0,count:!proxy,elevation:at.y});c.rotation.set(at.normal.z*.16+(rng()-.5)*.38,rng()*TAU,-at.normal.x*.16+(rng()-.5)*.45);c.userData.surfaceY=at.y;
   }
  }
 }
 // Dark suspended land and a charcoal stone walking surface.
 const cap=cyl(1,1.025,1,m.rock[1],root,0,-.5,0,lowDetail?24:56);cap.scale.set(island.rx,1,island.rz);cap.renderOrder=-800;
 for(const [y,h,top,bottom]of [[-3.8,5.6,1,.83],[-8.1,3.7,.84,.34]]){const cliff=cyl(top,bottom,h,m.rock[y<-5?1:0],root,0,y,0,lowDetail?16:24);cliff.scale.set(island.rx,1,island.rz);cliff.renderOrder=-1000;}
 const floor=new THREE.CircleGeometry(1,lowDetail?48:80);floor.rotateX(-Math.PI/2);floor.scale(island.rx*.985,1,island.rz*.985);const pos=floor.attributes.position,uv=floor.attributes.uv;for(let n=0;n<pos.count;n++)uv.setXY(n,pos.getX(n)/2.4,-pos.getZ(n)/1.6);mesh(floor,m.paving,root,0,.025,0).renderOrder=-780;
 mountainBody(mountain);
 // Timber terraces, a winch and suspended ore loads occupy the blocked rock zone.
 for(const side of [-1,1]){const g=group(mountain,side*6.05,0,0);g.name='mine-steam-scaffold';for(const x of [-.9,.9])for(const z of [-.8,.8])box(.16,5.2,.16,m.wood,g,x,2.6,z);for(let n=0;n<7;n++)box(2.4,.15,.27,m.woodEdge,g,0,5.2,-.86+n*.28);for(const x of [-1.1,1.1]){box(.055,.8,.055,m.iron,g,x,5.65,-.8);box(.055,.8,.055,m.iron,g,x,5.65,.8);line([[x,5.95,-.8],[x,5.95,.8]],m.bronze,g,.022);}for(let n=0;n<8;n++)box(1.15,.1,.34,m.wood,g,0,.4+n*.58,3.0-n*.36);box(.17,3.5,.17,m.wood,g,.8,6.85,-.55);box(3.5,.17,.17,m.wood,g,.15,8.55,-.55);line([[-.5,8.5,-.55],[-.5,6.7,-.55]],m.iron,g,.025);const load=cart(g,-.5,5.6,-.55,{register:false});load.scale.setScalar(.68);gear(g,.85,6.9,-.42,.47,side>0);lamp(g,-.8,5.2,.8,1.5);banner(g,.8,8.2,-.45,.65,3);}
 const free=(x,z,r=1)=>Math.hypot(x,z+5)>mineMountainRadius+r&&projects.every(p=>{const q=positionOf(p);return Math.hypot(x-q.x,z-q.z)>footprint(p)+r;});
 const nearBridge=(x,z)=>bridgeSegments().some(({a,b})=>Math.min(Math.hypot(x+island.x-a.x,z+island.z-a.z),Math.hypot(x+island.x-b.x,z+island.z-b.z))<4.6);
 for(let n=0;n<48;n++){const a=n/48*TAU,b=(n+1)/48*TAU,x=Math.sin(a)*island.rx*.94,z=Math.cos(a)*island.rz*.94;if(nearBridge(x,z))continue;const next={x:Math.sin(b)*island.rx*.94,z:Math.cos(b)*island.rz*.94};if(nearBridge(next.x,next.z))continue;for(const yy of [.4,.95])line([[x,yy,z],[next.x,yy,next.z]],m.bronze,root,.025);cyl(.035,.06,1.12,m.iron,root,x,.55,z,5);cone(.11,.23,m.iron,root,x,1.23,z,5);if(n%4===0)lamp(root,x,0,z,2.55);if(n%12===0)banner(root,x,-.15,z,1.0,4.2,-a);}
 for(let n=0;n<55;n++){const a=n/55*TAU,x=Math.sin(a)*island.rx*.76,z=Math.cos(a)*island.rz*.76;if(!free(x,z,.7))continue;const stone=box(1.3,.035,.8,m.rock[n%4],root,x,.045,z);stone.rotation.y=-a;stone.name='mine-slate-path';}
 for(const [x,z]of [[-8,12],[7.6,11.7],[13,-5],[-4,-15],[6,-14]])if(free(x,z,.5)){crystal(root,x,.1,z,.3,1.4,{glow:true});crystal(root,x+.5,.06,z-.2,.19,.8);crate(root,x-.7,.02,z,.5);}
 // Local red and lavender light, with a strict six-light budget.
 if(!lowDetail){for(let n=0;n<6;n++){const light=new THREE.PointLight(minePalette.light,16,6.2,2);light.name='mine-bounded-point-light';light.castShadow=false;root.add(light);lights.push(light);}for(const [x,z]of [[-3.8,1.5],[4.5,-6]])sources.push({object:root,point:new THREE.Vector3(x,2.6,z),color:'#db4d65',power:10,distance:5.5});
  const texture=mineMistTexture();for(const [x,y,z,s]of [[-6,.7,5,8],[6,.5,4,9],[0,-1.5,14,11],[-9,-1.4,-7,8]]){const mat=new THREE.SpriteMaterial({map:texture,color:'#9a899d',transparent:true,opacity:m.night?.085:.05,depthWrite:false});mat.userData.bloom=false;const fog=new THREE.Sprite(mat);fog.name='mine-thin-mist';fog.position.set(x,y,z);fog.scale.set(s,s*.24,1);root.add(fog);}}
 else{const fog=new THREE.MeshBasicMaterial({color:'#9a899d',transparent:true,opacity:.045,depthWrite:false});const haze=mesh(new THREE.CircleGeometry(6,16),fog,root,0,.11,8);haze.rotation.x=-Math.PI/2;haze.scale.y=.3;haze.name='mine-thin-mist-approximation';}
 let lastX=Infinity,lastZ=Infinity;
 function updateLights(target){nearMine=Math.hypot(target.x-island.x,target.z-island.z)<island.rx+20;if(!lights.length||Math.hypot(target.x-lastX,target.z-lastZ)<.8)return;lastX=target.x;lastZ=target.z;root.updateWorldMatrix(true,false);const ranked=sources.map(s=>({...s,world:s.object.localToWorld(s.point.clone())})).sort((a,b)=>Math.hypot(a.world.x-target.x,a.world.z-target.z)-Math.hypot(b.world.x-target.x,b.world.z-target.z)),selected=[...ranked.filter(s=>s.landmark).slice(0,2),...ranked.filter(s=>!s.landmark)];lights.forEach((l,n)=>{const s=selected[n];l.visible=nearMine&&!!s;if(s){l.position.copy(root.worldToLocal(s.world));l.color.set(s.color);l.intensity=s.power;l.distance=s.distance;}});}
 function proxy(parent){const cap=cyl(1,1,.8,m.rock[1],parent,0,-.4,0,20);cap.scale.set(island.rx,1,island.rz);cap.renderOrder=-800;const cliff=cyl(1,.43,8,m.rock[0],parent,0,-4.8,0,16);cliff.scale.set(island.rx,1,island.rz);cliff.renderOrder=-1000;const mountain=group(parent,0,0,-5);mountainBody(mountain,{proxy:true});for(const p of projects){const q=positionOf(p),g=group(parent,q.x,0,q.z);building(g,p,{proxy:true});}return parent;}
 root.userData.mineFeatures=stats;
 function update(now,reduced=false){if(reduced||!nearMine||!root.visible)return;k.update(now,false);for(const orbit of orbits){orbit.object.rotation.y=now*.000045;for(let n=0;n<orbit.cards.length;n++){const card=orbit.cards[n];card.position.y=card.userData.orbit.height+Math.sin(now*.0006+n*1.7)*.12;card.rotation.x=(n%2?1:-1)*.15+Math.sin(now*.00032+n)*.055;}orbit.motes.rotation.y=-now*.000018;orbit.motes.position.y=Math.sin(now*.0004)*.15;}}
 return{kit:k,materials:m,mountain,building,lamp,proxy,updateLights,update,dispose(){for(const geometry of [...shards.values()].flat().concat(outcrops,ownedGeometry))geometry.dispose();}};
}
