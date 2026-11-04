import * as THREE from 'three';
import museumKit from './museum-kit.js';
import batchStatic from './batch-static.js';
import {museumLayout,museumLevels,museumDecorations} from '../lib/museum-layout.ts';

export default function createMuseumInterior({scene,layout=museumLayout(),lowDetail=false}){
 const k=museumKit({lowDetail}),m=k.materials,{box,cyl,group,line,mesh,ring}=k,root=group(scene),walkMeshes=[],cameraColliders=[],l=layout;
 root.name='gallery-greek-three-storey-interior';root.userData.levels=[...museumLevels];root.userData.noFloorLettering=true;
 function floor(w,d,x,z,y,wood=false){const slab=box(w,.22,d,wood?m.wood:m.marble,root,x,y-.115,z);slab.name='museum-explorable-floor';walkMeshes.push(slab);if(y>0)cameraColliders.push({min:[x-w/2,y-.25,z-d/2],max:[x+w/2,y-.02,z+d/2]});return slab;}
 floor(22,l.depth,0,l.center,0).renderOrder=-1000;
 // Each upper gallery forms one continuous ring around the tall atrium.
 for(const [level,y]of museumLevels.entries()){
  if(level){for(const s of [-1,1])floor(5.2,l.depth,s*8.4,l.center,y,level===2);floor(11.6,l.front-1,0,(l.front+1)/2,y,level===2);floor(11.6,-10-l.back,0,(l.back-10)/2,y,level===2);}
  const tile=level===2?m.darkWood:m.stone;for(const s of [-1,1])for(let z=l.back+1;z<l.front;z+=level===2?1.05:2.5)box(5.1,.008,.012,tile,root,s*8.4,y+.011,z);if(level===2){for(const x of [-9.8,-8.4,-7,-6.1])for(const s of [-1,1])box(.012,.012,l.depth,m.darkWood,root,s*Math.abs(x),y+.012,l.center);}else for(const s of [-1,1])box(.012,.01,l.depth,m.stone,root,s*8.4,y+.012,l.center);
  for(const s of [-1,1]){box(.045,.015,l.depth,m.gold,root,s*6.18,y+.025,l.center);if(level){k.rail(root,[s*5.64,y,-10],[s*5.64,y,1],{spacing:lowDetail?.9:.65});k.rail(root,[s*3,y,1],[s*5.64,y,1],{spacing:.65});}}
  if(level)k.rail(root,[-5.64,y,-10],[5.64,y,-10],{spacing:.7});
 }
 // Closed shell: visitors can look at the stone ceiling and glazed niches, never the outside.
 for(const s of [-1,1]){const wall=box(.5,l.ceiling+.6,l.depth+1,m.ivory,root,s*11.22,l.ceiling/2-.05,l.center);wall.castShadow=false;wall.renderOrder=-900;}
 for(const [z,name]of [[l.front+.2,'gallery-sealed-front-wall'],[l.back-.2,'gallery-sealed-rear-wall']]){const wall=box(23,l.ceiling+.6,.5,m.ivory,root,0,l.ceiling/2-.05,z);wall.castShadow=false;wall.name=name;wall.userData.id=name;wall.renderOrder=-910;}
 const ceiling=box(23,.3,l.depth+1,m.ivory,root,0,l.ceiling+.15,l.center);ceiling.name='museum-sealed-coffered-ceiling';ceiling.castShadow=false;ceiling.renderOrder=-920;
 for(const y of museumLevels){for(const x of [-10.94,10.94])for(const yy of [.12,1.05,4.75,5.05])box(.12,.1,l.depth,m.marble,root,x,y+yy,l.center);for(const z of [l.back+.1,l.front-.1])for(const yy of [.14,1.04,4.75])box(22,.12,.14,yy===1.04?m.gold:m.marble,root,0,y+yy,z);}
 for(const z of [l.back+1.7,-7.7,1.5,9.8])for(const s of [-1,1]){k.column(root,s*5.3,0,z,5.08,.26);k.column(root,s*5.3,5.4,z,5.08,.26);k.column(root,s*5.3,10.8,z,5.08,.26);cameraColliders.push({min:[s*5.3-.42,0,z-.42],max:[s*5.3+.42,16.1,z+.42]});}
 for(let z=l.back+2.2;z<l.front;z+=4.7){for(const x of [-7.8,0,7.8]){box(x===0?9.7:4.3,.12,4.2,m.marble,root,x,l.ceiling-.22,z);for(const dx of [-1,1])box(.075,.12,3.8,m.gold,root,x+dx*(x===0?4.6:1.9),l.ceiling-.31,z);}}
 // Four flights with true tread meshes and matching smooth navigation surfaces.
 const stairRoot=group(root);stairRoot.name='museum-central-walkable-staircase';stairRoot.userData.levels=[0,5.4,10.8];
 function ramp(x,z0,z1,y0,y1){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([x-1.2,y0,z0,x+1.2,y0,z0,x+1.2,y1,z1,x-1.2,y1,z1],3));g.setIndex(z1<z0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();const invisible=mesh(g,new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}),stairRoot);invisible.name='museum-stair-walking-surface';walkMeshes.push(invisible);}
 for(let level=0;level<2;level++){
  const base=level*5.4;for(const flight of [0,1]){const x=flight?1.35:-1.35,z0=flight?-7:1,z1=flight?1:-7,y0=base+flight*2.7,y1=y0+2.7,g=group(stairRoot);g.name='museum-central-stair-flight';g.userData.flight={level,flight,x,z0,z1,y0,y1};const count=20;for(let n=0;n<count;n++){const t=(n+.5)/count,yy=y0+(n+1)/count*2.7;box(2.4,.135,.4,m.marble,g,x,yy-.0675,z0+(z1-z0)*t);box(2.4,.018,.032,m.gold,g,x,yy+.01,z0+(z1-z0)*(n/count));}
   // Thin sloped stone cheeks support the treads without filling the whole atrium.
   for(const s of [-1,1]){const xx=x+s*1.25;line([[xx,y0-.08,z0],[xx,y1-.08,z1]],m.ivory,g,.12);line([[xx,y0+.95,z0],[xx,y1+.95,z1]],m.gold,g,.035);for(let n=0;n<=8;n++){const t=n/8;box(.045,.93,.045,m.ivory,g,xx,y0+(y1-y0)*t+.47,z0+(z1-z0)*t);}}
   ramp(x,z0,z1,y0+.005,y1+.005);
  }
  const landing=box(5.35,.22,1.7,m.marble,stairRoot,0,base+2.59,-7.85);landing.name='museum-stair-return-landing';walkMeshes.push(landing);k.rail(stairRoot,[-2.67,base+2.7,-8.7],[2.67,base+2.7,-8.7],{spacing:.6});
 }
 // Gold doors at the entrance, with no floor lettering or directional signs.
 box(3.1,4.3,.16,m.gold,root,0,2.16,l.front-.11);box(.055,4.3,.05,m.stone,root,0,2.16,l.front-.22);for(const s of [-1,1]){box(1.18,3.55,.08,m.frame,root,s*.76,2.15,l.front-.24);ring(.09,.024,m.gold,root,s*.18,1.8,l.front-.32);}
 for(const y of museumLevels)for(const x of [-7.5,0,7.5]){const z=l.back+.1;box(2.1,3.45,.08,m.shadow,root,x,y+2.55,z);box(1.85,3.18,.06,k.mat('#b6c9cc','glass'),root,x,y+2.55,z+.08);for(const xx of [-.88,0,.88])box(.045,3.25,.05,m.gold,root,x+xx,y+2.55,z+.13);for(const yy of [-.8,.8])box(1.85,.045,.06,m.gold,root,x,y+2.55+yy,z+.15);}
 function table(parent,w=1.25,d=.85){box(w,.14,d,m.darkWood,parent,0,.9,0);for(const x of [-w*.37,w*.37])for(const z of [-d*.35,d*.35])box(.06,.84,.06,m.gold,parent,x,.45,z);}
 function cameraProp(parent){const p=group(parent);p.name='museum-retro-camera-and-film';table(p);box(.66,.42,.33,m.dark,p,0,1.24,0);box(.23,.13,.28,m.frame,p,0,1.51,0);const lens=cyl(.19,.23,.29,m.shadow,p,0,1.27,.26,12);lens.rotation.x=Math.PI/2;const glass=cyl(.14,.14,.025,k.mat('#516875','glass'),p,0,1.27,.42,10);glass.rotation.x=Math.PI/2;for(const x of [-.43,.43]){cyl(.18,.18,.07,m.dark,p,x,1.05,-.13,12);for(let n=0;n<3;n++)box(.045,.02,.03,m.gold,p,x-.09+n*.09,1.095,-.13);}return p;}
 function tripod(parent){const p=group(parent);p.name='museum-studio-tripod-and-softbox';for(let n=0;n<3;n++){const a=n/3*Math.PI*2;line([[0,1.35,0],[Math.sin(a)*.56,.04,Math.cos(a)*.56]],m.dark,p,.04);}cyl(.035,.055,.85,m.gold,p,0,1.7,0,6);box(.85,.66,.18,m.dark,p,0,2.22,0);box(.76,.56,.04,m.whiteRose,p,0,2.22,.11);return p;}
 function mannequin(parent){const p=group(parent);p.name='museum-cosplay-costume-glass-case';box(1.35,.18,1.25,m.darkWood,p,0,.09,0);cyl(.1,.25,.6,m.frame,p,0,.47,0,8);cyl(.28,.45,.85,k.mat('#80738c'),p,0,1.15,0,7);k.ball(.3,m.ivory,p,0,1.76,0,1,.8,.6);cyl(.2,.19,.26,m.ivory,p,0,2.06,0,8);k.ball(.21,m.ivory,p,0,2.35,0,.85,1.2,.8);for(const x of [-.65,.65])for(const z of [-.58,.58])box(.035,2.9,.035,m.gold,p,x,1.6,z);box(1.35,.1,1.25,m.darkWood,p,0,3.05,0);for(const x of [-.65,.65])box(.018,2.8,1.17,m.glass,p,x,1.6,0);box(1.28,2.8,.018,m.glass,p,0,1.6,.58);box(1.15,.035,.025,m.warm,p,0,2.97,.35);return p;}
 function wig(parent){const p=group(parent);p.name='museum-wig-display-stand';table(p);for(const x of [-.3,.3]){cyl(.04,.17,.4,m.frame,p,x,1.15,0,8);k.ball(.2,m.ivory,p,x,1.5,0,.8,1.2,.8);k.ball(.23,x<0?k.mat('#a78774'):k.mat('#584b63'),p,x,1.62,-.06,1,1.3,.9);}return p;}
 function prop(parent){const p=group(parent);p.name='museum-cosplay-prop-plinth';box(1.2,.85,1.2,m.darkWood,p,0,.425,0);const shield=cyl(.48,.48,.09,k.mat('#817788','metal'),p,0,1.48,0,8);shield.rotation.x=Math.PI/2;ring(.35,.03,m.gold,p,0,1.48,.06);box(.07,1.6,.06,m.shadow,p,.32,1.6,.2);box(.4,.06,.09,m.gold,p,.32,1.1,.2);k.cone(.1,.32,m.marble,p,.32,2.52,.2,4);return p;}
 function easel(parent){const p=group(parent);p.name='museum-easel-and-blank-canvas';for(const s of [-1,1]){const leg=box(.055,2.55,.065,m.darkWood,p,s*.45,1.25,0);leg.rotation.z=-s*.1;}const back=box(.065,2.35,.07,m.darkWood,p,0,1.17,-.45);back.rotation.x=-.25;box(1.2,.09,.28,m.wood,p,0,.8,.13);box(1.25,1.5,.12,m.paper,p,0,1.65,.09);box(.95,.02,.02,m.marble,p,0,1.6,.17);return p;}
 function paint(parent){const p=group(parent);p.name='museum-paints-brushes-and-palette';table(p,1.55,.95);const palette=mesh(new THREE.CircleGeometry(.32,9),m.wood,p,-.28,1.0,0);palette.rotation.x=-Math.PI/2;palette.scale.y=.78;for(let n=0;n<5;n++)cyl(.04,.04,.02,k.mat(['#ac6270','#ceac68','#638076','#6981a1','#ede1c4'][n]),p,-.49+n*.1,1.02,.07,7);cyl(.12,.1,.23,m.ivory,p,.38,1.08,-.1,8);for(let n=0;n<4;n++){const brush=box(.018,.45,.018,m.darkWood,p,.32+n*.04,1.35,-.1);brush.rotation.z=(n-1.5)*.12;box(.025,.07,.025,m.rose,p,.32+n*.04,1.58,-.1);}for(const x of [-.45,0,.45])box(.24,.1,.15,m.paper,p,x,1.02,-.26);return p;}
 const decorLevels=museumLevels.map((y,level)=>{const g=group(root);g.name='museum-decor-level-'+level;return g;});
 for(const o of museumDecorations){const p=group(decorLevels[o.level],o.x,museumLevels[o.level],o.z);if(o.kind==='camera')cameraProp(p);else if(o.kind==='studio')tripod(p);else if(o.kind==='mannequin')mannequin(p);else if(o.kind==='wig')wig(p);else if(o.kind==='prop')prop(p);else if(o.kind==='easel')easel(p);else if(o.kind==='paint')paint(p);else{box(1.1,.9,1.1,m.ivory,p,0,.45,0);const statue=k.statue(p,0,.9,0,.6);statue.name='museum-plaster-study-statue';}cameraColliders.push({min:[o.x-o.w/2,museumLevels[o.level],o.z-o.d/2],max:[o.x+o.w/2,museumLevels[o.level]+3.2,o.z+o.d/2]});}
 // Small sketch sheets are unlabelled blank presentation surfaces, not invented user art.
 for(const z of [-3,-5,-7])for(const s of [-1,1]){box(.025,1.05,.73,m.paper,root,s*10.9,12.45,z);for(let n=0;n<3;n++)box(.03,.012,.45,m.stone,root,s*10.875,12.6-n*.13,z);}
 for(const y of museumLevels)for(const x of [-6.35,6.35])for(const z of [9.5,-9.5])k.lamp(root,x,y,z,3.6);
 if(lowDetail)for(const g of decorLevels){batchStatic(g,{shadows:false});g.userData.dynamic=true;g.traverse(o=>{if(o.isMesh||o.isLine)o.renderOrder=10;});}
 batchStatic(root,{shadows:!lowDetail});
 const lightSources=museumLevels.map(y=>({position:[0,y+4.2,4],color:'#ffe2b4',power:14,distance:13})),occluders=[];root.traverse(o=>{if(o.isMesh&&o.material.visible!==false&&!o.material.transparent)occluders.push(o);});
 return{kit:k,root,layout:l,walkMeshes,occluders,setLevel(level){if(lowDetail)decorLevels.forEach((g,n)=>g.visible=n===level);},obstacles:museumDecorations,cameraBounds:{minX:-10.7,maxX:10.7,minZ:l.back+.3,maxZ:l.front-.3,ceiling:l.ceiling-.25},cameraColliders,lightSources,update:k.update,dispose:k.dispose};
}
