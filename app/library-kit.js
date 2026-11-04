import * as THREE from 'three';
import artKit,{seeded} from './art-kit.js';
import {masonryTextures,worldUV} from './home-materials.js';
import {libraryPalette as p} from '../lib/library-style.ts';

export default function libraryKit({lowDetail=false,phase='medieval'}={}){
 const k=artKit({lowDetail,phase,palette:p}),cache=new Map(),owned=[],role=(m,name)=>{m.name='library-'+name;m.userData.libraryRole=name;m.userData.bloom=false;return m;};
 const solid=(color,name,extra={})=>role(lowDetail?new THREE.MeshLambertMaterial({color}):new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,...extra}),name);
 const limestone=solid(p.ivory,'limestone',lowDetail?{}:{...masonryTextures('wall'),normalScale:new THREE.Vector2(.22,.22)}),marble=solid(p.stone,'marble',{roughness:.56,metalness:.02}),roof=solid(p.navy,'green-slate',lowDetail?{}:{...masonryTextures('roof'),normalScale:new THREE.Vector2(.18,.18)}),paving=solid('#bfb9aa','paving',lowDetail?{}:{...masonryTextures('paving'),normalScale:new THREE.Vector2(.22,.22)});
 const wood=solid(p.wood,'walnut'),darkWood=solid(p.walnut,'dark-walnut'),cream=solid(p.cream,'cream-stone'),green=solid('#243f32','green-panel'),iron=solid(p.iron,'wrought-iron',{roughness:.6,metalness:.55}),bronze=solid(p.gold,'antique-bronze',{roughness:.46,metalness:.65}),leather=solid(p.leather,'leather',{roughness:.72}),carpet=solid(p.burgundy,'burgundy-carpet',{roughness:1}),ceiling=solid(p.ceiling,'star-ceiling'),paper=solid('#d8c8a6','paper'),leaf=solid(p.leaf,'trimmed-greenery');
 const glass=role(lowDetail?new THREE.MeshLambertMaterial({color:'#9daea2',transparent:true,opacity:.4,depthWrite:false}):new THREE.MeshPhysicalMaterial({color:'#a6b9a5',roughness:.16,metalness:.03,transparent:true,opacity:.52,transmission:0,thickness:0,clearcoat:.65,depthWrite:false}),'clear-glass');
 const warm=role(new THREE.MeshBasicMaterial({color:p.light}),'warm-light-core');if(!lowDetail)warm.color.multiplyScalar(1.3);warm.userData.bloom=true;
 const windowBacking=solid('#4a4133','window-depth',lowDetail?{}:{emissive:'#ba8a4e',emissiveIntensity:.12});
 const floor=solid('#503328','walnut-floor',{roughness:.65});
 if(!lowDetail){const size=128,data=new Uint8Array(size*size*4),rng=seeded(939);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const row=Math.floor(y/16),xx=(x+(row%2)*32)%64,edge=Math.min(xx,64-xx,y%16,16-y%16),v=Math.round((edge<1.1?.44:.78+.13*Math.sin(xx*.55+y*.3)+rng()*.08)*255);data.set([v,v,v,255],(y*size+x)*4);}const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=map.magFilter=THREE.LinearFilter;map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;floor.map=map;}
 const materials={limestone,marble,roof,paving,wood,darkWood,cream,green,iron,bronze,leather,carpet,ceiling,paper,leaf,glass,warm,windowBacking,floor};
 const baseMesh=k.mesh;k.mesh=(geometry,material,parent,x=0,y=0,z=0)=>{const mesh=baseMesh(geometry,material,parent,x,y,z);if(material===glass||material===warm){mesh.castShadow=false;mesh.receiveShadow=false;}return mesh;};
 function box(w,h,d,material,parent,x=0,y=0,z=0){const key=[w,h,d].join(':');if(!cache.has(key)){const geo=new THREE.BoxGeometry(w,h,d);worldUV(geo);cache.set(key,geo);}return k.mesh(cache.get(key),material,parent,x,y,z);}
 function archShape(w,h){const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.lineTo(-r,0);return s;}
 function arch(parent,x,y,z,w,h,{door=false}={}){
  const g=k.group(parent,x,y,z);g.name=door?'library-walnut-entrance':'library-round-arched-window';
  const shape=archShape(w+.22,h+.12),hole=new THREE.Path(archShape(w,h).getPoints(lowDetail?6:12));shape.holes.push(hole);const geo=new THREE.ExtrudeGeometry(shape,{depth:.21,bevelEnabled:false,curveSegments:lowDetail?6:12});owned.push(geo);k.mesh(geo,marble,g,0,0,.05);
  const glassGeo=new THREE.ShapeGeometry(archShape(w-.04,h-.04),lowDetail?6:12);owned.push(glassGeo);k.mesh(glassGeo,glass,g,0,.02,.055).name='library-window-glazing';
  const backing=new THREE.ShapeGeometry(archShape(w-.05,h-.05),lowDetail?6:12);owned.push(backing);k.mesh(backing,windowBacking,g,0,.02,-.38);
  const outline=archShape(w-.08,h-.04).getPoints(lowDetail?7:14).map(v=>[v.x,v.y,.09]);k.line(outline,door?wood:bronze,g,door?.06:.025);
  box(.055,h-w/2,.09,door?wood:bronze,g,0,(h-w/2)/2,.12);box(w,.045,.08,door?wood:bronze,g,0,h-w/2,.12);
  for(const dx of [-w*.25,w*.25])box(.025,h-w/2,.06,door?wood:bronze,g,dx,(h-w/2)/2,.12);
  for(const t of [-.8,0,.8]){const a=Math.PI/2+t;k.line([[0,h-w/2,.12],[Math.cos(a)*w/2,h-w/2+Math.sin(a)*w/2,.12]],door?wood:bronze,g,.018);}
  if(door){for(const s of [-1,1]){box(.13,h+.05,.2,wood,g,s*w/2,h/2,.15);const handle=k.ring(.09,.023,bronze,g,s*.16,h*.35,.25);handle.name='library-brass-door-handle';}box(w,.16,.15,wood,g,0,.08,.13);}
  box(w+.4,.12,.38,marble,g,0,-.08,.12);return g;
 }
 function facade(parent,w,h,windows){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(-w/2,h);shape.closePath();for(const window of windows){const path=new THREE.Path(archShape(window.w,window.h).getPoints(lowDetail?6:12).map(v=>new THREE.Vector2(v.x+window.x,v.y+window.y)));shape.holes.push(path);}const geo=new THREE.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:false,curveSegments:lowDetail?6:12});worldUV(geo);owned.push(geo);const wall=k.mesh(geo,limestone,parent);wall.name='library-pierced-limestone-facade';for(const win of windows)arch(parent,win.x,win.y,0,win.w,win.h,{door:win.door});return wall;}
 function column(parent,x,z,height=6.9,y=0){const g=k.group(parent,x,y,z);g.name='library-classical-column';box(.72,.2,.72,marble,g,0,.1,0);k.cyl(.3,.36,.27,marble,g,0,.32,0,10);k.cyl(.23,.28,height-.9,limestone,g,0,(height-.9)/2+.47,0,12);for(const [yy,r,hh]of [[height-.33,.32,.14],[height-.15,.4,.2]])k.cyl(r,r,hh,marble,g,0,yy,0,10);box(.88,.18,.72,marble,g,0,height+.03,0);return g;}
 function lamp(parent,x,y,z,height=3.1){const g=k.group(parent,x,y,z);g.name='library-victorian-lamp';k.cyl(.18,.28,.2,iron,g,0,.1,0,6);k.cyl(.045,.085,height-.55,iron,g,0,(height-.55)/2+.17,0,8);for(const yy of [.3,height-.65])k.cyl(.09,.09,.08,bronze,g,0,yy,0,6);box(.34,.51,.34,glass,g,0,height-.13,0);box(.16,.3,.16,warm,g,0,height-.13,0);for(const sx of [-.19,.19])for(const sz of [-.19,.19])box(.025,.59,.025,iron,g,sx,height-.13,sz);k.cyl(.29,.27,.08,bronze,g,0,height+.19,0,4);const top=k.cone(.36,.25,iron,g,0,height+.35,0,4);top.rotation.y=Math.PI/4;k.ball(.045,bronze,g,0,height+.52,0);return g;}
 function globe(parent,x,y,z,scale=1){const g=k.group(parent,x,y,z);g.name='library-classical-globe';g.scale.setScalar(scale);k.cyl(.55,.7,.18,darkWood,g,0,.09,0,12);k.cyl(.09,.16,.95,wood,g,0,.62,0,8);const globe=k.mesh(new THREE.IcosahedronGeometry(.72,1),solid('#4f6b68','globe-ocean'),g,0,1.67,0);globe.rotation.z=-.24;for(let n=0;n<4;n++){const band=k.ring(.73,.008,bronze,globe);band.rotation.x=n*Math.PI/4;}const ring=k.ring(.92,.04,bronze,g,0,1.67,0);ring.rotation.z=-.3;return g;}
 function page(parent,x,y,z,seed=0){const rng=seeded(seed+32),g=k.group(parent,x,y,z);g.name='library-floating-page';g.userData.dynamic=true;g.rotation.set(.1,rng()*.9,.2);box(.42,.018,.6,paper,g);for(let n=0;n<4;n++)box(.27,.022,.012,bronze,g,0,.015,-.18+n*.105);k.animations.push({object:g,kind:'float',base:y,offset:rng()*6});return g;}
 return{...k,box,materials,arch,archShape,facade,column,lamp,globe,page,palette:p,dispose(){for(const g of cache.values())g.dispose();owned.forEach(g=>g.dispose());}};
}
