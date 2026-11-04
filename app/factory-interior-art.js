import * as THREE from 'three';
import factoryKit from './factory-kit.js';
import batchStatic from './batch-static.js';
import factoryFloor from './factory-floor.js';
import {factoryInteriorLayout} from '../lib/factory-style.ts';

export default function createFactoryInterior({scene,rows=3,back=-14,depth=32,lowDetail=false}){
 const k=factoryKit({lowDetail}),m=k.materials,{box,cyl,group,pipe,ring}=k,l=factoryInteriorLayout(back,depth),root=group(scene),center=(l.front+back-1.6)/2,length=l.front-(back-1.6);
 root.name='factory-industrial-bar-interior';root.userData.artDirection='warm-american-industrial-loft';
 function block(w,h,d,mat,x,y,z,name){const mesh=box(w,h,d,mat,root,x,y,z);if(name){mesh.name=name;mesh.userData.id=name;}return mesh;}
 // Fully enclosed: windows have a solid amber backing and cannot show an exterior void.
 block(18.6,.3,length+.5,m.floor,0,-.16,center,'factory-sealed-floor').renderOrder=-1200;
 factoryFloor({parent:root,kit:k,front:l.front,back:back-1.6,lowDetail});
 for(const s of [-1,1]){const wall=block(.36,7.15,length+.5,m.wallMetal,s*9.1,3.5,center,'factory-sealed-side-'+s);wall.castShadow=false;wall.renderOrder=-900;for(const y of [.2,1.35,6.6])box(.10,.12,length,m.iron,root,s*8.88,y,center);}
 for(const [z,tag]of [[back-1.6,'rear'],[l.front,'front']]){const wall=block(18.55,7.15,.4,m.wallMetal,0,3.5,z,'factory-sealed-'+tag);wall.castShadow=false;wall.renderOrder=-920;}
 const ceiling=block(18.55,.28,length+.5,m.iron,0,7.02,center,'factory-sealed-black-ceiling');ceiling.castShadow=false;ceiling.renderOrder=-950;
 const entrance=group(root,0,0,l.front-.24);entrance.name='factory-walnut-interior-door';box(2.5,4,.2,m.walnut,entrance,0,2,0);for(const s of [-1,1])box(.12,4.2,.18,m.iron,entrance,s*1.32,2,.04);box(2,2.1,.10,m.amber,entrance,0,2.5,-.16);box(2,2.05,.04,m.glass,entrance,0,2.5,-.23);for(const x of [-.2,.2])box(.045,.45,.13,m.bronze,entrance,x,1.5,-.22);
 // Steel sheets retain visible seams and isolated worn rivets at the light grazing angle.
 for(const side of [-1,1])for(let z=back-.5;z<l.front-1;z+=2.75){const sheet=group(root,side*8.9,0,z);sheet.name='factory-aged-black-wall-sheet';for(let n=0;n<3;n++)box(.013,.015,.24+n*.13,m.edgeWear,sheet,-side*.047,1.68+n*1.61,-.79+n*.48);box(.06,5.1,2.62,m.wallMetal,sheet,0,3.8,0);for(const dz of [-1.31,1.31])box(.085,5.2,.035,m.iron,sheet,-side*.02,3.8,dz);for(const y of [1.4,6.1])for(const dz of [-1.14,1.14])k.ball(.045,m.metal,sheet,-side*.075,y,dz,.4,1,1);}
 const openLate=group(root,-8.79,5.78,1.1);openLate.rotation.y=Math.PI/2;k.neon(openLate,'OPEN LATE',{w:3.7,h:.56,color:'#88c7be'});
 const stories=group(root,8.79,5.77,7.0);stories.rotation.y=-Math.PI/2;k.neon(stories,'STORIES',{w:3.5,h:.55,color:'#ffc48a'});
 const hidden=group(root,8.79,5.74,-6.6);hidden.rotation.y=-Math.PI/2;k.neon(hidden,'HIDDEN BAR',{w:4.1,h:.52,color:'#e7a08b'});
 for(const side of [-1,1])for(const z of [10.8,1.1,-7.6]){const wallLamp=group(root,side*8.78,5.5,z);wallLamp.rotation.y=-side*Math.PI/2;k.lamp(wallLamp,0,0,.04,{scale:1.04});}
 for(const x of [-2.35,2.35])k.lamp(root,x,5.25,2.6,{pendant:true,drop:1.4,scale:1.05});
 // Black I-beams and real low-sided pipes replace every vault, pointed arch and star.
 for(let row=0;row<=rows;row++){const z=10-row*6;for(const s of [-1,1]){const g=group(root,s*8.6,0,z);g.name='factory-exposed-steel-column';box(.30,6.8,.32,m.iron,g,0,3.4,0);box(.58,.14,.58,m.metal,g,0,.08,0);box(.58,.14,.58,m.metal,g,0,6.7,0);for(const y of [.22,6.5])for(const dx of [-.20,.20])box(.045,.045,.07,m.rust,g,dx,y,.3);}box(17.5,.16,.55,m.metal,root,0,6.76,z);box(17.5,.40,.11,m.iron,root,0,6.51,z);box(17.5,.12,.55,m.metal,root,0,6.28,z);}
 for(const [x,r,mat]of [[-6.5,.18,m.metal],[-5.8,.10,m.rust],[6.9,.15,m.metal]]){pipe(root,[[x,6.35,l.front-.5],[x,6.35,back-.7],[x,4.8,back-.7]],r,mat);for(let z=10;z>back;z-=4){const collar=cyl(r*1.3,r*1.3,.10,m.iron,root,x,6.35,z,8);collar.rotation.x=Math.PI/2;}}
 pipe(root,[[-8.8,2.1,back+1],[-8.8,6.45,back+1],[8.8,6.45,back+1],[8.8,2,back+1]],.10,m.bronze);
 // Black-iron and walnut shelving, with a complete wall of varied low-poly bottles.
 const bottleWall=group(root,0,0,back-.75);bottleWall.name='factory-bottle-wall';box(13.8,4.9,.2,m.walnut,bottleWall,0,2.9,-.25);
 for(const x of [-6.7,-3.35,0,3.35,6.7])box(.12,5.1,.6,m.iron,bottleWall,x,2.9,0);
 for(let row=0;row<5;row++){const y=.7+row*.91;box(13.7,.12,.74,m.wood,bottleWall,0,y,0);box(13.4,.035,.035,m.warm,bottleWall,0,y-.08,.23);const count=lowDetail?19:29;for(let n=0;n<count;n++)k.bottle(bottleWall,-6.3+n*12.6/(count-1),y+.08,.04,n+row, .72+((n*7+row)%5)*.045);}
 box(14,.16,.8,m.metal,bottleWall,0,5.25,0);k.sign(root,{title:'INFORMATION FACTORY',w:6.1,h:.78,y:5.83,z:back-.3});
 const bar=group(root,l.bar.x,0,l.bar.z);bar.name='factory-dark-wood-bar-counter';box(11.8,1.55,1.45,m.iron,bar,0,.82,0);for(let n=0;n<18;n++)box(.59,1.38,.08,n%4?m.wood:m.walnut,bar,-5.6+n*.66,.83,.77);box(12.15,.20,1.85,m.wood,bar,0,1.72,0);box(12.2,.055,1.91,m.bronze,bar,0,1.85,0);pipe(bar,[[-5.8,.36,1.13],[5.8,.36,1.13]],.045,m.bronze);for(const x of [-5,-2.5,0,2.5,5])pipe(bar,[[x,.03,.93],[x,.36,1.13]],.04,m.iron);box(11.5,.035,.025,m.warm,bar,0,1.45,.83);
 for(const x of [-4.8,-1.3,2.8]){k.bottle(bar,x,1.89,-.05,Math.abs(Math.round(x*7)),.78);cyl(.10,.08,.22,m.glass,bar,x+.34,2.0,.20,8);}
 // Hanging utilitarian fixtures illuminate the counter, with restrained filament cores.
 for(const x of [-4,0,4])k.lamp(root,x,4.6,l.bar.z,{pendant:true,drop:2.2,scale:1.3});
 function stool(spec){const g=group(root,spec.x,0,spec.z);g.name='factory-leather-high-stool';cyl(.38,.38,.18,m.leather,g,0,1.26,0,10);cyl(.35,.35,.09,m.wood,g,0,1.13,0,8);for(const x of [-.25,.25])for(const z of [-.25,.25])box(.045,1.15,.045,m.iron,g,x,.57,z);ring(.30,.025,m.bronze,g,0,.43,0).rotation.x=-Math.PI/2;box(.65,.35,.10,m.leather,g,0,1.53,.30);return g;}
 [...l.stools,...l.seats].forEach(stool);
 for(const spec of l.booths){const g=group(root,spec.x,0,spec.z);g.name='factory-tufted-leather-booth';box(2.5,.22,3.9,m.walnut,g,0,.22,0);box(2.1,.42,3.55,m.leather,g,-.1,.61,0);box(.48,1.6,3.9,m.leather,g,1.02,1.15,0);for(const z of [-1.81,1.81])box(2.4,.75,.25,m.leather,g,0,1.0,z);for(let n=0;n<6;n++){box(.035,.34,.018,m.bronze,g,1.275,1.54,-1.4+n*.55);k.ball(.055,m.walnut,g,.76,1.37,-1.43+n*.57,.25,1,1);}const rail=group(g,0,0,0);pipe(rail,[[1.3,.3,-1.85],[1.3,1.97,-1.85],[1.3,1.97,1.85],[1.3,.3,1.85]],.025,m.bronze);}
 for(const spec of l.boothTables){const g=group(root,spec.x,0,spec.z);g.name='factory-booth-table';box(spec.w,.13,spec.d,m.wood,g,0,1.23,0);box(spec.w+.03,.025,spec.d+.03,m.bronze,g,0,1.32,0);box(.15,1.18,.15,m.iron,g,0,.6,0);box(1.2,.1,1.6,m.iron,g,0,.1,0);cyl(.12,.12,.28,m.warm,g,0,1.5,0,8);cyl(.17,.17,.38,m.glass,g,0,1.5,0,8);box(.6,.035,.4,m.walnut,g,.28,1.35,.6);}
 for(const spec of l.tables){const g=group(root,spec.x,0,spec.z);g.name='factory-round-high-table';cyl(.86,.86,.16,m.wood,g,0,1.82,0,12);cyl(.07,.12,1.75,m.iron,g,0,.9,0,8);cyl(.55,.6,.1,m.iron,g,0,.08,0,8);cyl(.09,.08,.19,m.glass,g,.2,2,0,8);}
 for(const [x,z]of [[5.9,8.5],[5.9,-4.4],[-5.65,6.8],[-5.65,-.7]])k.lamp(root,x,4.5,z,{pendant:true,drop:2.2,scale:1.1});
 // Sparse wire mesh, records, map and terminal: decoration, never invented personal content.
 for(const z of [7,-5]){const panel=group(root,8.84,3.5,z);panel.rotation.y=-Math.PI/2;panel.name='factory-black-wire-mesh';box(3.4,2.8,.035,m.iron,panel);for(let n=0;n<11;n++)box(.015,2.75,.035,m.metal,panel,-1.5+n*.3,0,.04);for(let n=0;n<9;n++)box(3.3,.015,.04,m.metal,panel,0,-1.3+n*.3,.05);}
 const desk=group(root,-7.5,0,back+9.5);desk.name='factory-information-terminal';box(1.2,.10,2.5,m.wood,desk,0,1.1,0);for(const z of [-1,1])box(.10,1.1,.55,m.iron,desk,0,.55,z);box(.10,.7,.10,m.iron,desk,0,1.5,0);const display=box(.12,1.0,1.3,m.iron,desk,.06,1.95,0);box(.03,.8,1.12,k.mat('#897a54','stone',lowDetail?{}:{emissive:'#c7b27b',emissiveIntensity:.16}),desk,.15,1.95,0);for(let n=0;n<3;n++)box(.18,.06,.6,m.paper,desk,.25,1.2+n*.07,.75);
 const map=group(root,-8.86,4.8,9.8);map.rotation.y=Math.PI/2;map.name='factory-story-map';box(2.1,1.6,.08,m.walnut,map);box(1.9,1.4,.04,m.paper,map,0,0,.065);for(const [x,y,r]of [[-.5,.25,.22],[.35,.35,.25],[.52,-.3,.20],[-.2,-.4,.27]]){const ring= k.ring(r,.02,m.bronze,map,x,y,.10);ring.scale.y=.7;}k.line([[-.5,.25,.11],[.35,.35,.11],[.52,-.3,.11],[-.2,-.4,.11],[-.5,.25,.11]],m.walnut,map,.012);
 const cog=group(root,0,3.35,back-.35);cog.name='factory-memory-gear';cog.userData.dynamic=true;ring(.48,.065,m.bronze,cog);for(let n=0;n<10;n++){const a=n/10*Math.PI*2,tooth=box(.12,.18,.12,m.rust,cog,Math.sin(a)*.55,Math.cos(a)*.55,0);tooth.rotation.z=-a;}k.animations.push({object:cog,kind:'rotate',axis:'z',speed:.00004});
 const cameraColliders=l.furniture.map(o=>({min:[o.x-o.w/2,0,o.z-o.d/2],max:[o.x+o.w/2,o.h+.10,o.z+o.d/2]}));
 const obstacles=l.furniture.map(o=>({x:o.x,z:o.z,r:Math.min(o.w,o.d)/2}));
 batchStatic(root,{shadows:!lowDetail});
 const lightSources=[{position:[0,4,l.bar.z+1.2],power:40},{position:[5.1,3.6,7],power:22},{position:[-5,3.7,3],power:25},{position:[3,3.8,-4],power:22},{position:[-6.5,4.5,1.1],power:13,color:'#99c9b9',distance:7},{position:[6.2,4.2,-6.5],power:14,color:'#ffc58e',distance:7}];
 return{kit:k,root,layout:l,obstacles,cameraBounds:{minX:-8.45,maxX:8.45,minZ:back-.8,maxZ:l.front-.65,ceiling:6.75},cameraColliders,lightSources,update:k.update,dispose:k.dispose};
}
