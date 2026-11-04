import * as THREE from 'three';
import libraryKit from './library-kit.js';
import batchStatic from './batch-static.js';
import librarySkylight from './library-skylight.js';
import {libraryLayout,libraryFurniture} from '../lib/library-layout.ts';

export default function createLibraryInterior({scene,rows=3,back,lowDetail=false}){
 const layout=libraryLayout((rows-1)*120+1);if(back!==undefined){layout.back=back;layout.depth=layout.front-back+2;layout.center=(layout.front+back-2)/2;}
 const k=libraryKit({lowDetail}),m=k.materials,{box,cyl,line,ring,group,mesh}=k,root=group(scene),owned=[],walkVertices=[],cameraColliders=[];
 root.name='library-celestial-interior';root.userData.artDirection='british-historic-reading-hall';root.userData.palette={...k.palette};
 const addWalk=(x,z,w,d,y)=>{walkVertices.push(x-w/2,y,z+d/2,x+w/2,y,z+d/2,x+w/2,y,z-d/2,x-w/2,y,z+d/2,x+w/2,y,z-d/2,x-w/2,y,z-d/2);};
 box(18.8,.3,layout.depth,m.floor,root,0,-.16,layout.center).renderOrder=-1200;addWalk(0,layout.center,18,layout.depth,.015);
 if(lowDetail){for(let z=layout.back-1;z<layout.front;z+=2.8)for(let x=-8.7;x<9;x+=1.45){const plank=box(1.43,.025,2.77,(Math.round(x*2)+Math.round(z))%3?m.wood:m.darkWood,root,x,.005,z);plank.renderOrder=-1100;}}
 const carpet=box(3.05,.025,layout.depth-.6,m.carpet,root,0,.035,layout.center);carpet.name='library-dark-red-runner';carpet.renderOrder=-1050;for(const x of [-1.45,1.45])box(.035,.03,layout.depth-.65,m.bronze,root,x,.052,layout.center).renderOrder=-1040;
 const center=layout.center,depth=layout.depth;
 for(const s of [-1,1]){const wall=box(.4,10,depth,m.cream,root,s*9.2,5,center);wall.castShadow=false;wall.renderOrder=-900;box(.44,2.2,depth,m.green,root,s*8.96,1.1,center);for(const y of [.2,2.1,2.3,6.02,11.1])box(.55,.1,depth,m.wood,root,s*8.95,y,center);for(let z=layout.back;z<10;z+=2.4){box(.1,1.7,.075,m.wood,root,s*8.69,1.1,z);}}
 const rear=box(18.4,13,.35,m.cream,root,0,6.5,layout.back-1.65);rear.castShadow=false;rear.renderOrder=-920;
 // Seal both ends all the way to the barrel vault; the hall is not a cutaway.
 const endShape=new THREE.Shape();endShape.moveTo(-9.3,0);endShape.lineTo(9.3,0);endShape.lineTo(9.3,9.9);for(let n=1;n<=24;n++){const a=n/24*Math.PI;endShape.lineTo(Math.cos(a)*9.3,9.9+Math.sin(a)*5.4);}endShape.lineTo(-9.3,0);
 const endGeo=new THREE.ShapeGeometry(endShape),endMaterial=m.cream.clone();endMaterial.side=THREE.DoubleSide;owned.push(endGeo);
 for(const [name,z]of [['front',layout.front],['rear',layout.back-1.6]]){const wall=mesh(endGeo,endMaterial,root,0,0,z);wall.name='library-sealed-'+name+'-wall';wall.userData.id=wall.name;wall.castShadow=false;wall.renderOrder=-930;}
 const vestibule=group(root,0,0,layout.front-.18);vestibule.rotation.y=Math.PI;k.arch(vestibule,0,.1,.04,2.6,4.6,{door:true});for(const y of [.25,2.1])box(18,.12,.14,m.wood,vestibule,0,y,0);for(const x of [-5.7,5.7])box(4.8,1.8,.12,m.green,vestibule,x,1.1,0);
 for(const x of [-5,0,5]){const arch=k.arch(root,x,3.0,layout.back-1.4,2.35,7.2);arch.name='library-rear-daylight-window';}
 const skylight=librarySkylight({parent:root,kit:k,layout,lowDetail});
 for(let row=0;row<=rows;row++){const z=8.5-row*7;for(const s of [-1,1]){k.column(root,s*5.42,z,9.4);const pts=[];for(let j=0;j<=12;j++){const a=j/12*Math.PI;pts.push([Math.cos(a)*9.12,9.85+Math.sin(a)*5.28,z]);}line(pts,m.marble,root,.095);}}
 // A true upper ring with open stairwells, rather than a solid ceiling over the stairs.
 function deck(x,z,w,d){box(w,.22,d,m.darkWood,root,x,layout.upper-.11,z).name='library-mezzanine-walkway';addWalk(x,z,w,d,layout.upper);cameraColliders.push({min:[x-w/2,layout.upper-.22,z-d/2],max:[x+w/2,layout.upper,z+d/2]});}
 const frontStart=layout.back+9;
 for(const s of [-1,1]){deck(s*6.9,(9.4+frontStart)/2,3,9.4-frontStart);deck(s*7.7,layout.back+5,.9,8);}
 deck(0,8.5,16.6,1.8);deck(0,layout.back+.1,16.6,1.8);
 function guard(x1,z1,x2,z2,y=layout.upper){line([[x1,y+1.02,z1],[x2,y+1.02,z2]],m.bronze,root,.035);line([[x1,y+.26,z1],[x2,y+.26,z2]],m.wood,root,.045);const count=Math.ceil(Math.hypot(x2-x1,z2-z1)/.6);for(let n=0;n<=count;n++){const t=n/count;box(.045,.95,.045,m.iron,root,x1+(x2-x1)*t,y+.5,z1+(z2-z1)*t);}}
 for(const s of [-1,1]){guard(s*5.4,frontStart,s*5.4,7.6);guard(s*6.84,layout.back+1,s*6.84,frontStart);const stairs=group(root,s*6.15,0,0);stairs.name='library-walkable-staircase';for(let n=0;n<24;n++){const z=layout.back+9-(n+.5)*8/24,y=(n+1)*layout.upper/24;box(1.2,.15,8/24+.035,m.wood,stairs,0,y-.075,z);}for(const sx of [-.65,.65]){line([[sx,.15,layout.back+9],[sx,layout.upper,layout.back+1]],m.wood,stairs,.09);line([[sx,1.02,layout.back+9],[sx,layout.upper+1.02,layout.back+1]],m.bronze,stairs,.025);for(let n=0;n<=8;n++)box(.04,.94,.04,m.iron,stairs,sx,n*layout.upper/8+.53,layout.back+9-n);}
  const x=s*6.15,x0=x-.6,x1=x+.6,z0=layout.back+9,z1=layout.back+1;walkVertices.push(x0,0,z0,x1,0,z0,x1,layout.upper,z1,x0,0,z0,x1,layout.upper,z1,x0,layout.upper,z1);
 }
 guard(-5.4,7.6,5.4,7.6);guard(-5.4,layout.back+1,5.4,layout.back+1);
 const obstacles=libraryFurniture(layout).map(o=>({...o,r:Math.max(o.w,o.d)/2}));
 for(const o of obstacles)cameraColliders.push({min:[o.x-o.w/2,0,o.z-o.d/2],max:[o.x+o.w/2,1.4,o.z+o.d/2]});
 for(let row=0;row<=rows;row++)for(const side of [-1,1]){const x=side*5.42,z=8.5-row*7;cameraColliders.push({min:[x-.4,0,z-.4],max:[x+.4,9.6,z+.4]});}
 for(const o of obstacles){const table=group(root,o.x,0,o.z);table.name='library-central-reading-table';box(2.3,.16,3.25,m.wood,table,0,1.08,0);for(const x of [-.92,.92])for(const z of [-1.25,1.25])box(.12,1,.12,m.darkWood,table,x,.5,z);for(const z of [-2.0,2.0]){const chair=group(table,0,0,z);chair.name='library-leather-reading-chair';box(.8,.16,.8,m.leather,chair,0,.57,0);box(.8,.85,.13,m.leather,chair,0,1.03,z>0?.37:-.37);for(const x of [-.3,.3])for(const zz of [-.3,.3])box(.075,.52,.075,m.wood,chair,x,.26,zz);}
  for(const z of [-.8,.8]){const lamp=group(table,.55,1.16,z);lamp.name='library-brass-desk-lamp';cyl(.18,.23,.065,m.bronze,lamp,0,.03,0,10);cyl(.025,.04,.43,m.bronze,lamp,0,.25,0,6);const shade=k.cone(.3,.27,m.green,lamp,0,.6,0,10);cyl(.19,.19,.028,m.warm,lamp,0,.475,0,10);}
  for(const s of [-1,1]){const page=box(.45,.018,.65,m.paper,table,s*.22,1.18,0);page.rotation.z=-s*.1;}
 }
 const globe=k.globe(root,0,0,layout.back+4,1.1);obstacles.push({x:0,z:layout.back+4,r:1.15,w:2.3,d:2.3});
 for(const [x,y,z,seed]of [[-1.8,5.0,-5,32],[2,8.8,-9,38],[-.8,4.5,2,9]])if(!lowDetail||seed===32)k.page(root,x,y,z,seed);
 const walkGeo=new THREE.BufferGeometry();walkGeo.setAttribute('position',new THREE.Float32BufferAttribute(walkVertices,3));walkGeo.computeVertexNormals();owned.push(walkGeo);const walk=mesh(walkGeo,new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}),root);walk.userData.id='library-walk-surfaces';walk.name='library-tappable-walk-surfaces';walk.castShadow=false;walk.receiveShadow=false;
 batchStatic(root,{shadows:!lowDetail});
 return{kit:k,root,obstacles,layout,cameraBounds:{minX:-7.5,maxX:7.5,minZ:layout.back-.9,maxZ:layout.front-.2,ceiling:9.9},cameraColliders,walkMeshes:[walk],setLighting:skylight.setLighting,update(now,reduced,camera){k.update(now,reduced);skylight.update(now,reduced,camera);},dispose(){skylight.dispose();owned.forEach(g=>g.dispose());endMaterial.dispose();k.dispose();}};
}
