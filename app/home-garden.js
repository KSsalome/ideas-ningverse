import * as THREE from 'three';
import artKit,{seeded} from './art-kit.js';
import batchStatic from './batch-static.js';
import {homeAtmospheres,exteriorBasePhase} from '../lib/home-atmosphere.ts';
import {homePalette} from './home-materials.js';

// Only the active planting set exists. Switching a time period replaces this
// small, batched garden, not the castle, map, avatars or six other islands.
export default function homeGarden({root,phase,lowDetail=false,nearBridge=()=>false}){
 const p=homeAtmospheres[phase],k=artKit({phase:exteriorBasePhase,lowDetail,palette:{...homePalette,leaf:p.leaf}}),g=new THREE.Group();g.name='home-seasonal-garden';g.userData.phase=phase;g.userData.planting=p.planting;root.add(g);
 const {box,cyl,ball,cone,line,ring,group,mat,tree,ivy}=k,random=seeded(1229),magical=phase==='cyber'||phase==='wonder',emission=(color,power)=>magical?{emissive:lowDetail?new THREE.Color(color).multiplyScalar(power).getStyle():color,emissiveIntensity:lowDetail?1:power}:{},leaf=mat(p.leaf,'stone',emission(phase==='cyber'?'#447488':p.leaf,phase==='wonder'?.035:.13)),shade=mat(p.shade),bronze=mat('#9b7b4c','metal'),wood=mat('#675039'),soil=mat('#454333'),flower=(phase==='wonder'?['#ead0de','#ede8de','#d4c7e2','#c9dce6']:phase==='industrial'?['#ede0bc','#c77951','#d3b36a','#75313f']:phase==='medieval'?['#eee8d6','#e8c6cd','#e6d59b','#aa9fc0']:p.flowers).map(c=>mat(c,'stone',emission(c,phase==='cyber'?.42:phase==='wonder'?.065:.16))),stone=mat(phase==='wonder'?'#d6cdbe':'#a1957f');let plantingCount=0;
 const coarse=new THREE.IcosahedronGeometry(1,0),flowerGeometry=new THREE.BufferGeometry(),vertices=[0,.025,0],indices=[];
 for(let n=0;n<10;n++){const a=n/10*Math.PI*2,r=n%2?.55:1;vertices.push(Math.sin(a)*r,0,Math.cos(a)*r);indices.push(0,1+(n+1)%10,n+1);}
 flowerGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));flowerGeometry.setIndex(indices);flowerGeometry.computeVertexNormals();
 function bloom(parent,x,y,z,color,n){
  const stem=cyl(.018,.022,.23,shade,parent,x,y+.1,z,4);stem.name='home-flower-stem';
  const head=k.mesh(flowerGeometry,color,parent,x,y+.27,z);head.scale.set(.15,1,.15);head.rotation.y=n*.7;head.name='home-'+(phase==='gothic'?'dark-rose':'flower');
  if(!lowDetail)cyl(.025,.025,.015,mat('#dfca92'),parent,x,y+.3,z,5);
 }
 function bed(x,z,w=3.2,d=1.8,kind='stone'){
  const b=group(g,x,0,z);b.name=kind==='wood'?'home-herb-flower-box':'home-formal-flowerbed';
  box(w,.3,d,kind==='wood'?wood:phase==='cyber'?mat('#303d4b','metal'):stone,b,0,.15,0);box(w-.2,.07,d-.2,soil,b,0,.32,0);
  if(phase==='medieval'){for(const side of [-1,1])for(let n=0;n<4;n++)ball(.22,leaf,b,side*(w/2-.2),.58,-d*.3+n*d*.2,1,.85,1);}
  for(let n=0;n<(lowDetail?9:15);n++){const x=(random()-.5)*(w-.45),z=(random()-.5)*(d-.4);bloom(b,x,.36,z,flower[n%flower.length],n);}
  if(phase==='industrial'){for(let n=0;n<5;n++){const herb=cone(.16,.5,n%2?leaf:shade,b,(n-2)*.42,.68,0,5);herb.name='home-kitchen-herb';}}
  if(phase==='cyber'){const edge=mat(p.accent,'stone',lowDetail?{}:{emissive:p.accent,emissiveIntensity:.35});box(w+.03,.045,.045,edge,b,0,.31,d/2+.01);}
 }
 function planterTree(x,z,size,type,seed){
  if(phase==='industrial'||phase==='cyber'){const pot=cyl(.5,.4,.45,phase==='cyber'?mat('#354354','metal'):wood,g,x,.23,z,6);pot.name='home-'+(phase==='cyber'?'technology-planter':'orchard-planter');}
  const t=tree(g,x,phase==='cyber'||phase==='industrial'?.4:0,z,size,type,seed);t.name='home-forest-tree';plantingCount++;
  let foliage=0;t.traverse(o=>{if(o.geometry?.type==='IcosahedronGeometry'){foliage++;o.material=foliage===1?leaf:shade;if(foliage>1)o.geometry=coarse;}else if(o.geometry?.parameters?.radiusTop===0)o.material=leaf;});
  // A few blossoms / fruits communicate the garden type without heavy models.
  if(['forest','wonder','industrial','cyber'].includes(phase)&&type!=='cypress'){
   for(let n=0;n<(lowDetail?3:6);n++){const a=n*2.4,r=.55,fruit=k.mesh(coarse,phase==='industrial'?mat('#bd874d'):flower[n%2],t,Math.sin(a)*r,2.1+n%3*.3,Math.cos(a)*r),size=phase==='industrial'?.1:.16;fruit.scale.set(size,size*.7,size);}
  }
 }
 for(let n=0;n<46;n++){
  const a=n/46*Math.PI*2,r=14+(n%3)*1.4,x=Math.sin(a)*r,z=Math.cos(a)*r;
  if(z<0&&Math.abs(x)<8.7||Math.abs(x)<3.2&&z>7||nearBridge(x,z,3.6))continue;
  const formal=phase==='medieval'||phase==='gothic',type=phase==='medieval'?(n%2?'round':'cypress'):formal?(n%5?'cypress':'round'):phase==='forest'?(n%5?'round':'cypress'):phase==='industrial'?(n%7?'round':'cypress'):phase==='wonder'?(n%3?'round':'cypress'):n%3?'cypress':'round';
  const scale=(phase==='forest'?1.02:phase==='wonder'?.76:phase==='industrial'?.68:phase==='cyber'?.75:.86)+(n%4)*.075;
  planterTree(x,z,scale,type,n+18);
 }
 for(const [x,z,s]of [[-10,-5,.65],[10,-3,.7],[-7,12,.6],[7,12,.65]])planterTree(x,z,s,phase==='gothic'?'cypress':'round',Math.abs(x)*22);
 bed(-9,8,4,2.35,phase==='industrial'?'wood':'stone');bed(9,8,4,2.35,phase==='industrial'?'wood':'stone');
 for(const side of [-1,1]){bed(side*10,-1,2.5,1.2,phase==='industrial'?'wood':'stone');bed(side*7.5,12.5,2.2,1,phase==='industrial'?'wood':'stone');}
 if(phase==='medieval')for(const side of [-1,1]){
  for(const z of [4,10.7]){const hedge=group(g,side*9.7,0,z);hedge.name='home-royal-trimmed-hedge';box(2.6,.5,.7,leaf,hedge,0,.35,0);box(2.65,.08,.78,stone,hedge,0,.08,0);}
  const climbing=ivy(g,side*6.2,3.8,-5,2.2,41);climbing.name='home-royal-climbing-rose';climbing.traverse(o=>{if(o.isMesh){o.material=leaf;if(o.geometry.type==='IcosahedronGeometry')o.geometry=coarse;}});for(let n=0;n<4;n++)bloom(g,side*(6.2+(n%2)*.15),1.6+n*.48,-4.8,flower[n%2],n);
 }
 if(['forest','wonder','gothic'].includes(phase)){
  for(const [x,z,y,len]of [[-6.2,-5,3.8,2.8],[6.7,-7,3.6,2.7],[-5,-12,3.6,2.9],[4.2,-11.6,7.5,2.8],[-3.1,-9.4,8.6,2.2]]){
   const v=ivy(g,x,y,z,len,Math.abs(x)*33);v.name='home-seasonal-climbing-vine';v.traverse(o=>{if(o.isMesh){o.material=phase==='wonder'?mat('#aebfa5'):phase==='gothic'?shade:leaf;if(o.geometry.type==='IcosahedronGeometry')o.geometry=coarse;}});
  }
  for(let n=0;n<(lowDetail?18:32);n++){const a=random()*Math.PI*2,r=10+random()*5,x=Math.sin(a)*r,z=Math.cos(a)*r;if(nearBridge(x,z,3)||Math.abs(x)<3.5||z<0&&Math.abs(x)<9)continue;bloom(g,x,.03,z,flower[n%flower.length],n);}
 }
 if(phase==='wonder')for(const side of [-1,1]){
  const b=group(g,side*5.8,0,11.6);b.name='home-dream-round-flowerbed';cyl(.8,.86,.14,stone,b,0,.08,0,12);cyl(.7,.7,.08,leaf,b,0,.18,0,12);for(let n=0;n<7;n++){const a=n/7*Math.PI*2;bloom(b,Math.sin(a)*.49,.2,Math.cos(a)*.49,flower[n%4],n);}
 }
 if(phase==='industrial'){
  for(const side of [-1,1]){
   const stall=group(g,side*11.5,0,5);stall.name='home-retro-food-market-stall';box(2.15,.75,1.15,wood,stall,0,.38,0);box(2.35,.12,1.35,bronze,stall,0,.82,0);
   for(const x of [-1,1])cyl(.045,.06,2,bronze,stall,x,1,0,5);
   for(let n=0;n<5;n++){const awning=box(.5,.09,1.6,mat(n%2?'#d7c6a1':'#71363b'),stall,(n-2)*.46,2.05,0);awning.rotation.x=.16;}
   for(let n=0;n<4;n++){cyl(.1,.1,.18,mat('#b69a72'),stall,(n-1.5)*.35,1,.2,6);ball(.13,mat('#b78953'),stall,(n-1.5)*.35,1.1,-.15,1.2,.6,1);}
   const wheel=ring(.35,.045,bronze,stall,side*.85,.38,.66);wheel.name='home-market-cart-wheel';
  }
 }
 if(phase==='cyber'){
  const glow=mat('#73b9d3','stone',lowDetail?{}:{emissive:'#6cb8d9',emissiveIntensity:.65}),pink=mat('#b17bc6','stone',lowDetail?{}:{emissive:'#b17bc6',emissiveIntensity:.5});
  for(const r of [3,5.3]){const o=ring(r,.025,r===3?glow:pink,g,0,.065,5);o.rotation.x=-Math.PI/2;o.name='home-neon-paving-inlay';}
  for(const side of [-1,1])line([[side*3,.08,1.7],[side*4,.08,6],[side*4.5,.08,9]],glow,g,.028);
 }
 if(phase==='gothic')for(const side of [-1,1])for(let n=0;n<3;n++){
  const candle=group(g,side*(6.4+n*1.5),0,10.5-n*2.8);candle.name='home-garden-candle';cyl(.11,.13,.5,bronze,candle,0,.25,0,6);ball(.09,mat('#e6b66e','glow'),candle,0,.55,0,.6,1.6,.6);
 }
 const motes=[];
 if(phase==='wonder'||phase==='cyber')for(let n=0;n<(lowDetail?4:8);n++){
  const o=ball(.045,mat(phase==='wonder'?'#ddc9e6':'#8bcbdc','glow',{transparent:true,opacity:.55,depthWrite:false}),g,(random()-.5)*25,1+random()*3,3+random()*10);o.userData.dynamic=true;o.name='home-local-magic-mote';motes.push({o,y:o.position.y,offset:n*1.3});
 }
 batchStatic(g,{shadows:!lowDetail});g.userData.dynamic=true;g.userData.treeCount=plantingCount;g.userData.moteCount=motes.length;
 return{root:g,plantingCount,update(now,reduced=false){if(reduced)return;for(const {o,y,offset}of motes)o.position.y=y+Math.sin(now*.0004+offset)*.17;},dispose(){g.removeFromParent();const geos=new Set(),materials=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))materials.add(m);});geos.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());}};
}
