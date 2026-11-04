import * as THREE from 'three';
import artKit from './art-kit.js';
import batchStatic from './batch-static.js';
import {smoothBlend} from '../lib/world-night.ts';

// Keep the citadel's original geometry and all hit targets. Only its own
// material instances and small, reusable decorative sets change theme.
export default function homeArchitecture({root,castle,ornament,phase,lowDetail=false}){
 const windowTechGlow=new THREE.Color('#79c2d8'),windowGothicGlow=new THREE.Color('#d6a16a');
 const surfaces=new Map(),techUniform={value:phase==='cyber'?1:0},clones=new Map(),overlays=[],animated=[];
 const kinds=['cyber','industrial','gothic','medieval','wonder'];
 let weights=Object.fromEntries(kinds.map(kind=>[kind,phase===kind?1:0])),from={...weights},target={...weights},started=0,changing=false;
 function register(parent,{flagsOnly=false,pavingOnly=false}={}){parent.traverse(o=>{
  if(!o.material||o.material.visible===false||o.userData.id)return;
  if(flagsOnly&&o.name!=='burgundy-cloth')return;
  if(pavingOnly&&o.parent?.name!=='home-brick-paving')return;
  const list=Array.isArray(o.material)?o.material:[o.material];
  const next=list.map(base=>{
   if(base.userData.homeTechSurface)return base;
   const pane=o.name==='window-glazing',key=base.uuid+':'+pane+':'+flagsOnly+':'+pavingOnly;
   if(!clones.has(key)){
    const m=base.clone(),role=pavingOnly?'paving':base.userData.homeRole??(pane?'window':base.color?.getHexString()==='4b1b2b'?'flag':base.userData.vegetation?'foliage':base.userData.bloom?'lamp':base.metalness>.3?'trim':'detail');
    m.userData.homeTechSurface=true;
    const tech=role==='roof'?'#111e36':role==='limestone'?'#56687d':role==='foundation'?'#242f40':role==='paving'?'#4b5868':role==='window'?'#8fcbdc':role==='flag'?'#293664':role==='trim'?'#95adbd':'#738595';
    const gothic=role==='roof'?'#11141c':role==='limestone'?'#4f535b':role==='foundation'?'#303540':role==='paving'?'#54555c':role==='window'?'#a77c51':role==='flag'?'#381421':role==='trim'?'#806a4e':role==='foliage'?'#293e32':role==='lamp'?'#e0b275':'#51525a';
    const royal=role==='roof'?'#39495c':role==='limestone'?'#d5cbb6':role==='foundation'?'#b0a48e':role==='paving'?'#b8ac94':role==='window'?'#91aaac':role==='flag'?'#203955':role==='trim'?'#c5b17d':role==='foliage'?'#667e4f':role==='lamp'?'#c4b28c':'#bdb29d';
    const dream=role==='roof'?'#a3b3c7':role==='limestone'?'#e4ddcc':role==='foundation'?'#c8c2b4':role==='paving'?'#ddd3bd':role==='window'?'#b7d0d7':role==='flag'?'#dfbccc':role==='trim'?'#cbb79b':role==='foliage'?'#9cab93':role==='lamp'?'#e5d1ad':'#d3c8b5';
    surfaces.set(m,{base:base.color?.clone(),tech:new THREE.Color(tech),gothic:new THREE.Color(gothic),royal:new THREE.Color(royal),dream:new THREE.Color(dream),royalOnly:flagsOnly,dreamOnly:pavingOnly,rough:base.roughness,metal:base.metalness,normal:base.normalScale?.clone(),emissive:base.emissive?.clone(),power:base.emissiveIntensity??0,opacity:base.opacity,transparent:base.transparent,depthWrite:base.depthWrite,role});
    if(!lowDetail&&m.map){m.onBeforeCompile=shader=>{shader.uniforms.homeTechSurface=techUniform;shader.fragmentShader='uniform float homeTechSurface;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, diffuse, homeTechSurface);');};m.customProgramCacheKey=()=> 'home-tech-surface-v1';}
    clones.set(key,m);
   }return clones.get(key);
  });o.material=Array.isArray(o.material)?next:next[0];
 });apply();}
 function decoration(name,build){
  const k=artKit({lowDetail}),g=new THREE.Group();g.name=name;root.add(g);build(k,g);batchStatic(g,{shadows:!lowDetail});g.userData.dynamic=true;
  const mats=new Map();g.traverse(o=>{if(o.material){mats.set(o.material,{opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite});if(o.material.userData.bloom)o.castShadow=o.receiveShadow=false;}});overlays.push({g,mats,kind:kinds.find(kind=>name.includes(kind))});return g;
 }
 decoration('home-cyber-royal-devices',(k,g)=>{
  const {box,cyl,cone,line,ring,group,mesh}=k,black=k.mat('#17283e','metal'),silver=k.mat('#8797ad','metal'),cyan=k.mat('#72d7e5','glow'),violet=k.mat('#b293df','glow'),pink=k.mat('#d695cd','glow');
  // Thin outlines follow the existing roofs and spires, rather than replacing
  // the castle with a second city or adding a new collider.
  for(const [x,y,z,r,h]of [[.35,16,-12.5,1.55,5.35],[-3.15,11.3,-12.1,.91,3.1],[3.25,12.4,-12.5,.79,2.6],[-2.7,6.1,-3.75,.96,2.45],[2.7,6.1,-3.75,.96,2.45]]){
   for(let n=0;n<4;n++){const a=n/4*Math.PI*2+.785;line([[x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x,y+h,z]],n%2?violet:cyan,g,.028);}
   const rim=ring(r,.035,cyan,g,x,y,z);rim.rotation.x=Math.PI/2;
  }
  for(const side of [-1,1]){
   for(const [x,y,z,h]of [[side*2.72,6.2,-8.64,4.7],[side*1.02,10.7,-11.49,10.3],[side*3.3,4.9,-3.02,1.65]])box(.045,h,.06,side<0?cyan:violet,g,x,y,z);
   line([[side*1.02,4.8,-2.2],[side*1.02,6.7,-2.2],[0,7.8,-2.2]],side<0?cyan:pink,g,.04);
   const flag=group(g,side*4.4,8.1,-7);flag.name='home-holographic-banner';box(.045,3.4,.045,silver,flag,0,-1.1,0);box(1.05,2,.025,k.mat('#394d77','glow',{transparent:true,opacity:.26,depthWrite:false}),flag,side*.6,-.5,0);line([[side*.15,.5,.03],[side*1.1,.5,.03],[side*1.1,-1.5,.03],[side*.15,-1.5,.03]],side<0?cyan:pink,flag,.025);k.star(.3,cyan,flag,side*.6,-.5,.04);
   const device=group(g,side*7,0,7);device.name='home-royal-hologram-projector';cyl(.6,.75,.5,black,device,0,.25,0,8);const panel=mesh(new THREE.PlaneGeometry(1.5,1.9),k.mat('#78c6d8','glow',{transparent:true,opacity:.16,depthWrite:false}),device,0,2.05,0);panel.material.side=THREE.DoubleSide;line([[-.75,1.1,.02],[-.75,3,.02],[.75,3,.02],[.75,1.1,.02],[-.75,1.1,.02]],cyan,device,.025);k.star(.46,violet,device,0,2.05,.04);
  }
  const orbit=ring(3.6,.035,violet,g,.35,16,-12.5);orbit.rotation.x=Math.PI*.43;orbit.name='home-technology-halo';orbit.userData.dynamic=true;animated.push({o:orbit,kind:'orbit',x:orbit.rotation.x});
  const fountain=group(g,0,0,5);fountain.name='home-blue-violet-energy-fountain';cyl(1.9,2.1,.4,black,fountain,0,.2,0,20);cyl(1.72,1.72,.035,k.mat('#253d67','metal'),fountain,0,.43,0,20);
  for(const [r,y,m]of [[1.83,.48,cyan],[1.35,.54,violet],[.65,.65,cyan]]){const band=ring(r,.035,m,fountain,0,y,0);band.rotation.x=Math.PI/2;}
  const core=mesh(new THREE.OctahedronGeometry(.52,0),violet,fountain,0,2.15,0);core.scale.y=2.1;core.userData.dynamic=true;animated.push({o:core,kind:'core',y:2.15});
  for(let n=0;n<8;n++){const a=n/8*Math.PI*2;line([[Math.sin(a)*1.45,.5,Math.cos(a)*1.45],[Math.sin(a)*.9,1.4,Math.cos(a)*.9],[0,2.4,0]],n%2?cyan:violet,fountain,.025);}
 });
 decoration('home-industrial-market-architecture',(k,g)=>{
  const {box,cyl,ball,line,ring,group}=k,bronze=k.mat('#9f7949','metal'),brass=k.mat('#b99559','metal'),iron=k.mat('#3f3932','metal'),wood=k.mat('#654733'),glass=k.mat('#c5b78e','glass',{transparent:true,opacity:.2,depthWrite:false}),cream=k.mat('#dbcba7'),burgundy=k.mat('#71363b'),warm=k.mat('#edc68b','glow');
  function gear(x,y,z,r){const o=group(g,x,y,z);o.name='home-antique-brass-gear';ring(r,.08,bronze,o);ring(r*.36,.05,brass,o);for(let n=0;n<8;n++){const a=n/8*Math.PI*2,t=box(.21,.3,.12,bronze,o,Math.sin(a)*r,Math.cos(a)*r,0);t.rotation.z=-a;line([[0,0,0],[Math.sin(a)*r*.86,Math.cos(a)*r*.86,0]],brass,o,.035);}}
  gear(.35,13.1,-11.44,.73);gear(-2.5,8.8,-8.79,.56);gear(2.6,7.1,-8.64,.43);
  const clock=group(g,.35,16.1,-11.5);clock.name='home-brass-clock';cyl(.62,.62,.12,cream,clock,0,0,0,20).rotation.x=Math.PI/2;ring(.66,.055,bronze,clock,0,0,.1);line([[0,.44,.12],[0,0,.12],[.28,-.12,.12]],iron,clock,.035);
  for(const side of [-1,1]){line([[side*3.5,4.65,-10],[side*4.15,4.65,-10],[side*4.15,10.5,-10],[side*3.3,10.5,-10]],bronze,g,.1);cyl(.18,.22,1.4,iron,g,side*4.15,11.1,-10,8);cyl(.28,.28,.12,brass,g,side*4.15,11.85,-10,8);}
  const greenhouse=group(g,-8.1,0,-7.8);greenhouse.name='home-brass-glass-greenhouse';box(3.1,.25,3.2,iron,greenhouse,0,.13,0);
  for(const side of [-1,1]){box(.08,2.7,.08,brass,greenhouse,side*1.5,1.45,1.5);box(.08,2.7,.08,brass,greenhouse,side*1.5,1.45,-1.5);box(3,.045,.045,bronze,greenhouse,0,2.8,side*1.5);box(2.9,2.5,.02,glass,greenhouse,0,1.5,side*1.5);}
  for(const z of [-1.5,0,1.5])line([[-1.5,2.8,z],[0,3.65,z],[1.5,2.8,z]],brass,greenhouse,.045);for(const side of [-1,1]){const pane=box(1.74,.025,3,glass,greenhouse,side*.75,3.2,0);pane.rotation.z=side*-.51;}
  for(const side of [-1,1]){const seating=group(g,side*7.6,0,11);seating.name='home-outdoor-market-seating';cyl(.85,.85,.12,wood,seating,0,1.1,0,12);cyl(.06,.17,1.05,iron,seating,0,.55,0,6);for(const a of [0,2.1,4.2]){const x=Math.sin(a)*1.4,z=Math.cos(a)*1.4;cyl(.28,.3,.09,wood,seating,x,.65,z,8);cyl(.035,.12,.62,iron,seating,x,.31,z,5);}cyl(.045,.045,3.4,brass,seating,0,1.7,0,5);const canopy=k.cone(1.7,.65,side<0?burgundy:cream,seating,0,3.3,0,8);canopy.name='home-market-dome-canopy';ball(.1,warm,seating,0,2.9,0);}
 });
 decoration('home-gothic-midnight-architecture',(k,g)=>{
  const {box,cyl,cone,ball,line,group,mesh}=k,iron=k.mat('#262b34','metal'),stone=k.mat('#575963'),bronze=k.mat('#80694a','metal'),amber=k.mat('#d7ac75','glow'),ember=k.mat('#ad5a4c','glow'),wax=k.mat('#baa78b');
  const ring=(r,t,material,parent,x=0,y=0,z=0,arc=Math.PI*2)=>lowDetail?k.ring(r,t,material,parent,x,y,z,arc):mesh(new THREE.TorusGeometry(r,t,4,24,arc),material,parent,x,y,z);
  function rose(x,y,z,r){const o=group(g,x,y,z);o.name='home-gothic-rose-window';o.userData.dynamic=true;const disk=mesh(new THREE.CircleGeometry(r,lowDetail?12:24),k.mat('#4a282e','stone',lowDetail?{emissive:'#301719',emissiveIntensity:1}:{emissive:'#a04f3f',emissiveIntensity:.22}),o);disk.castShadow=false;ring(r+.055,.045,stone,o,0,0,.025);ring(r*.84,.025,bronze,o,0,0,.04);for(let n=0;n<6;n++){const a=n/6*Math.PI*2,pts=Array.from({length:9},(_,j)=>{const t=j/8*Math.PI*2;return[Math.sin(a)*r*.46+Math.cos(t)*r*.22,Math.cos(a)*r*.46+Math.sin(t)*r*.3,.055];});line(pts,bronze,o,.018);}ball(r*.12,ember,o,0,0,.055,1,1,.12);}
  rose(0,6.8,-7.72,.62);rose(.35,11.55,-11.48,.5);
  for(const side of [-1,1]){
   const frame=group(g,side*2.58,4.6,-8.7);frame.name='home-gothic-lancet-tracery';line([[-.26,.65,0],[-.26,3.8,0],[0,4.45,0],[.26,3.8,0],[.26,.65,0]],bronze,frame,.035);line([[0,.85,.03],[0,3.95,.03]],iron,frame,.022);
   const pinnacle=group(g,side*3.18,12.5,-12.2);pinnacle.name='home-gothic-finial';cyl(.1,.14,2.3,iron,pinnacle,0,1.15,0,6);cone(.19,1.2,iron,pinnacle,0,2.85,0,5);ring(.19,.025,bronze,pinnacle,0,1.7,0).rotation.x=Math.PI/2;
   const candelabra=group(g,side*5.5,0,8);candelabra.name='home-gothic-iron-candelabra';cyl(.25,.37,.16,stone,candelabra,0,.08,0,6);cyl(.05,.12,1.8,iron,candelabra,0,.99,0,6);for(const dx of [-.34,0,.34]){line([[0,1.25,0],[dx,1.5,0],[dx,1.85,0]],iron,candelabra,.04);cyl(.1,.1,.055,bronze,candelabra,dx,1.86,0,6);cyl(.052,.055,.22,wax,candelabra,dx,1.99,0,6);const flame=ball(.06,amber,candelabra,dx,2.16,0,.65,1.5,.65);flame.name='home-gothic-small-candle-flame';}
   const statue=group(g,side*4.7,2.6,-3.7);statue.name='home-gothic-quiet-stone-statue';box(.62,.35,.62,stone,statue,0,.18,0);cone(.32,1.15,stone,statue,0,.9,0,7);ball(.22,stone,statue,0,1.55,0,.78,1,.8);box(.2,.45,.12,iron,statue,0,1.03,.2);
  }
  const crest=group(g,0,7.55,-2.19);crest.name='home-gothic-moon-emblem';ring(.31,.045,bronze,crest,0,0,0,Math.PI*1.55).rotation.z=-.8;k.star(.075,bronze,crest,.29,.2,.01);
  const floor=ring(2.1,.025,bronze,g,0,.055,5);floor.rotation.x=Math.PI/2;floor.name='home-gothic-courtyard-medallion';
 });
 decoration('home-medieval-royal-courtyard',(k,g)=>{
  const {box,cyl,cone,ball,line,group,mesh}=k,limestone=k.mat('#d4cbb8','marble'),warmStone=k.mat('#b4a68f'),gold=k.mat('#c5b17d','metal'),iron=k.mat('#3c4147','metal'),wood=k.mat('#6e513a'),blue=k.mat('#203955','cloth'),water=lowDetail?new THREE.MeshLambertMaterial({color:'#82b6c6'}):new THREE.MeshPhysicalMaterial({color:'#9ac4cf',roughness:.17,metalness:.05,clearcoat:.35,transparent:true,opacity:.74,depthWrite:false}),flow=k.mat('#bedce2','glass',{transparent:true,opacity:.52,depthWrite:false});
  const fountain=group(g,0,0,5);fountain.name='home-royal-clearwater-fountain';cyl(1.95,2.13,.34,warmStone,fountain,0,.17,0,24);cyl(1.87,1.94,.2,limestone,fountain,0,.43,0,24);cyl(1.67,1.67,.035,water,fountain,0,.54,0,24);cyl(.22,.38,1.05,limestone,fountain,0,.97,0,10);cyl(.77,.63,.13,limestone,fountain,0,1.53,0,16);cyl(.64,.64,.025,water,fountain,0,1.61,0,16);
  for(let n=0;n<6;n++){const a=n/6*Math.PI*2,points=Array.from({length:7},(_,j)=>{const t=j/6;return[Math.sin(a)*(.56+t*.85),1.6-t*1.06+Math.sin(t*Math.PI)*.28,Math.cos(a)*(.56+t*.85)];});line(points,flow,fountain,.023);}
  const ripples=group(fountain,0,.565,0);ripples.name='home-royal-water-ripples';ripples.userData.dynamic=true;for(const r of [.82,1.23,1.53]){const circle=k.ring(r,.012,flow,ripples);circle.rotation.x=Math.PI/2;}animated.push({o:ripples,kind:'water'});
  for(const [x,y,z,w,h]of [[.35,13.1,-11.26,.67,2.1],[-2.55,5.35,-8.6,.7,2.16],[2.6,5.35,-8.5,.7,2.2]]){const frame=group(g,x,y,z);frame.name='home-royal-arched-walnut-window-frame';line(k.pointedShape(w,h).getPoints(lowDetail?6:12).map(p=>[p.x,p.y,0]),wood,frame,.035);line([[0,.1,.01],[0,h*.6,.01]],gold,frame,.02);}
  for(const side of [-1,1]){
   const banner=group(g,side*2.7,7,-2.9);banner.name='home-royal-champagne-crest';const shield=new THREE.Shape();shield.moveTo(-.19,.28);shield.lineTo(.19,.28);shield.lineTo(.17,-.06);shield.lineTo(0,-.26);shield.lineTo(-.17,-.06);shield.closePath();mesh(new THREE.ShapeGeometry(shield),gold,banner,0,-.75,.05);k.star(.09,blue,banner,0,-.72,.06);
   const bench=group(g,side*7.4,0,10.3);bench.name='home-royal-walnut-bench';for(let n=0;n<4;n++)box(2.2,.08,.13,wood,bench,0,.62,(n-1.5)*.15);for(const x of [-.85,.85]){box(.1,.6,.55,iron,bench,x,.3,0);box(.07,.7,.07,iron,bench,x,.93,-.25);}for(let n=0;n<3;n++)box(2.2,.11,.07,wood,bench,0,.91+n*.15,-.25);
   const statue=group(g,side*4.8,2.6,-3.6);statue.name='home-royal-classical-stone-statue';box(.64,.38,.64,warmStone,statue,0,.19,0);cone(.29,1.05,limestone,statue,0,.95,0,7);ball(.2,limestone,statue,0,1.58,0,.8,1,.8);cyl(.25,.25,.05,gold,statue,0,1.75,0,8);
   const urn=group(g,side*5.8,0,1.4);urn.name='home-royal-stone-flower-urn';cyl(.32,.42,.2,warmStone,urn,0,.1,0,8);cyl(.23,.29,.55,limestone,urn,0,.46,0,8);cyl(.48,.25,.38,limestone,urn,0,.89,0,10);for(let n=0;n<5;n++){const a=n/5*Math.PI*2;ball(.16,k.mat('#68825a'),urn,Math.sin(a)*.27,1.14,Math.cos(a)*.27,1,.6,1);ball(.09,k.mat(n%2?'#ead3d6':'#e9e6d4'),urn,Math.sin(a)*.26,1.25,Math.cos(a)*.26);}
  }
 });
 decoration('home-wonder-dream-palace',(k,g)=>{
  const {box,cyl,cone,ball,line,group,mesh}=k,ivory=k.mat('#e5dece','marble'),base=k.mat('#c7beb0'),roseGold=k.mat('#c5ac91','metal'),leaf=k.mat('#9aaa91'),petal=k.mat('#e3c6d7'),white=k.mat('#eee7df'),water=lowDetail?new THREE.MeshLambertMaterial({color:'#b1ced7'}):new THREE.MeshPhysicalMaterial({color:'#b2d3dc',roughness:.22,metalness:.02,clearcoat:.25,transparent:true,opacity:.72,depthWrite:false}),flow=k.mat('#d2e6e6','glass',{transparent:true,opacity:.4,depthWrite:false});
  const fountain=group(g,0,0,5);fountain.name='home-wonder-clearwater-fountain';cyl(1.9,2.08,.32,base,fountain,0,.16,0,20);cyl(1.81,1.9,.18,ivory,fountain,0,.41,0,20);cyl(1.66,1.66,.035,water,fountain,0,.52,0,20);cyl(.2,.36,.95,ivory,fountain,0,.9,0,8);cyl(.7,.53,.14,ivory,fountain,0,1.4,0,14);cyl(.57,.57,.025,water,fountain,0,1.49,0,14);ball(.12,roseGold,fountain,0,1.65,0);
  for(let n=0;n<5;n++){const a=n/5*Math.PI*2;line(Array.from({length:6},(_,j)=>{const t=j/5;return[Math.sin(a)*(.5+t*.9),1.48-t*.96+Math.sin(t*Math.PI)*.3,Math.cos(a)*(.5+t*.9)];}),flow,fountain,.018);}
  const ripples=group(fountain,0,.55,0);ripples.name='home-wonder-water-ripples';ripples.userData.dynamic=true;for(const r of [.85,1.3]){const circle=mesh(new THREE.RingGeometry(r-.01,r+.01,lowDetail?16:24),flow,ripples);circle.rotation.x=-Math.PI/2;}animated.push({o:ripples,kind:'dream-water'});
  for(const [x,y,z,w,h]of [[.35,13.1,-11.26,.67,2.1],[-2.55,5.35,-8.6,.7,2.16],[2.6,5.35,-8.5,.7,2.2]]){const frame=group(g,x,y,z);frame.name='home-wonder-pearl-arched-window';line(k.pointedShape(w,h).getPoints(lowDetail?5:9).map(p=>[p.x,p.y,0]),roseGold,frame,.028);line([[0,.1,.01],[0,h*.65,.01]],ivory,frame,.018);}
  for(const side of [-1,1]){
   const arch=group(g,side*7.4,0,5);arch.name='home-wonder-rose-pergola';for(const x of [-1.45,1.45]){box(.44,.22,.44,base,arch,x,.11,0);cyl(.1,.13,2.65,ivory,arch,x,1.53,0,6);cyl(.19,.16,.15,roseGold,arch,x,2.92,0,6);}const points=Array.from({length:lowDetail?9:15},(_,j)=>{const a=j/(lowDetail?8:14)*Math.PI;return[Math.cos(a)*1.45,2.96+Math.sin(a)*1.1,0];});line(points,ivory,arch,.075);
   for(let n=0;n<7;n++){const a=n/6*Math.PI,x=Math.cos(a)*1.43,y=2.98+Math.sin(a)*1.09;ball(.23,leaf,arch,x,y,0,1,.6,.7);ball(.13,n%2?white:petal,arch,x,y+.08,.12,1,.75,1);}
   const charm=group(arch,0,3.55,0);charm.name='home-wonder-hanging-crystal';line([[0,.4,0],[0,0,0]],roseGold,charm,.012);const crystal=mesh(new THREE.OctahedronGeometry(.12,0),k.mat('#c7d8e1','glass',{transparent:true,opacity:.58,depthWrite:false}),charm,0,-.13,0);crystal.scale.y=1.5;
   const statue=group(g,side*4.8,2.6,-3.6);statue.name='home-wonder-ivory-statue';box(.6,.32,.6,base,statue,0,.16,0);cone(.29,1.05,ivory,statue,0,.87,0,7);ball(.19,ivory,statue,0,1.5,0,.8,1,.8);
   const lamp=group(g,side*5.6,0,9.7);lamp.name='home-wonder-small-stone-lantern';cyl(.3,.36,.23,base,lamp,0,.12,0,8);cyl(.19,.27,.54,ivory,lamp,0,.49,0,8);ball(.1,k.mat('#e4d4bb','glow'),lamp,0,.84,0);cone(.32,.2,ivory,lamp,0,1.02,0,8);
  }
 });
 function apply(){
  const t=weights.cyber,d=weights.gothic,r=weights.medieval,w=weights.wonder,baseWeight=Math.max(0,1-t-d-r-w);techUniform.value=t;
  for(const [m,b]of surfaces){
   if(b.dreamOnly){m.color.copy(b.base).lerp(b.dream,w);continue;}
   if(b.royalOnly){const base=Math.max(0,1-r-w);m.color.setRGB(b.base.r*base+b.royal.r*r+b.dream.r*w,b.base.g*base+b.royal.g*r+b.dream.g*w,b.base.b*base+b.royal.b*r+b.dream.b*w);continue;}
   if(b.role==='window'){const transparent=b.transparent||r+w>.001;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=b.opacity*(1-r*.2-w*.24);m.depthWrite=transparent?false:b.depthWrite;}
   if(b.base)m.color.setRGB(b.base.r*baseWeight+b.tech.r*t+b.gothic.r*d+b.royal.r*r+b.dream.r*w,b.base.g*baseWeight+b.tech.g*t+b.gothic.g*d+b.royal.g*r+b.dream.g*w,b.base.b*baseWeight+b.tech.b*t+b.gothic.b*d+b.royal.b*r+b.dream.b*w);
   if(b.rough!==undefined)m.roughness=b.rough*baseWeight+(b.role==='roof'?.36:.45)*t+(b.role==='trim'?.58:.93)*d+(b.role==='window'?.22:b.role==='trim'?.5:.87)*r+(b.role==='window'?.2:b.role==='trim'?.42:.76)*w;
   if(b.metal!==undefined)m.metalness=b.metal*baseWeight+(b.role==='window'?.12:.62)*t+(b.role==='trim'?.48:0)*d+(b.role==='trim'?.6:b.role==='window'?.04:0)*r+(b.role==='trim'?.4:b.role==='window'?.03:0)*w;
   if(b.normal)m.normalScale.copy(b.normal).multiplyScalar(1-.95*t-.25*w);
   if(b.emissive){m.emissive.copy(b.emissive);if(b.role==='window'){const cyan=windowTechGlow,warm=windowGothicGlow;m.emissive.setRGB(b.emissive.r*(baseWeight+r+w)+cyan.r*t+warm.r*d,b.emissive.g*(baseWeight+r+w)+cyan.g*t+warm.g*d,b.emissive.b*(baseWeight+r+w)+cyan.b*t+warm.b*d);}m.emissiveIntensity=b.power*baseWeight+(b.role==='window'?.42:b.power)*t+(b.role==='window'?.24:b.power)*d+(b.role==='window'?.025:b.power)*r+(b.role==='window'?.04:b.power*.8)*w;}
  }
  for(const {g,mats,kind}of overlays){const weight=weights[kind];g.visible=weight>.001;for(const [m,b]of mats){const transparent=b.transparent||weight<.999;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=b.opacity*weight;m.depthWrite=transparent?false:b.depthWrite;}}
  ornament.visible=t+r+w<.5;root.userData.castleTheme=t>.5?'cyber-royal-city':d>.5?'gothic-midnight-citadel':r>.5?'medieval-royal-castle':w>.5?'wonder-dream-palace':weights.industrial>.5?'industrial-market':'limestone-citadel';
 }
 function update(now,reduced=false){if(changing){for(const kind of kinds)weights[kind]=smoothBlend(from[kind],target[kind],now-started);if(now-started>=8000)changing=false;apply();}if(reduced)return;for(const a of animated){if(a.kind==='water'||a.kind==='dream-water'){if(weights[a.kind==='water'?'medieval':'wonder']>.001){a.o.rotation.y=now*.000025;a.o.scale.setScalar(1+Math.sin(now*.001)*.012);}continue;}if(weights.cyber<.001)continue;if(a.kind==='orbit')a.o.rotation.z=now*.000035;else{a.o.rotation.y=now*.00022;a.o.position.y=a.y+Math.sin(now*.0008)*.1;}}}
 function setPhase(next,{immediate=true,now=0}={}){update(now,true);from={...weights};target=Object.fromEntries(kinds.map(kind=>[kind,next===kind?1:0]));started=now;changing=!immediate;if(immediate)weights={...target};apply();}
 register(castle);apply();
 return{register,setPhase,update,get weights(){return {...weights};},dispose(){const geos=new Set(),mats=new Set(clones.values());for(const {g}of overlays){g.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});g.removeFromParent();}geos.forEach(x=>x.dispose());mats.forEach(x=>x.dispose());}};
}
