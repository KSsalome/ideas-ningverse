import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import batchStatic from './batch-static.js';
import {libraryShelves} from '../lib/library-layout.ts';

export default function createLibraryBooks({scene,kit:k,layout,books,lowDetail=false,canvasFactory}){
 const {box,group}=k,m=k.materials,root=group(scene),clickables=[],labels=[],atlases=[],hitMaterial=new THREE.MeshBasicMaterial({visible:false});root.name='library-two-storey-shelves';let number=0;
 const native=!lowDetail&&(canvasFactory||typeof document!=='undefined');
 function atlas(){const canvas=canvasFactory?canvasFactory():document.createElement('canvas');canvas.width=256;canvas.height=2048;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map,roughness:.91});material.name='library-book-spine-atlas';material.userData.bloom=false;const page={canvas,ctx:canvas.getContext('2d'),map,material,geometries:[]};atlases.push(page);return page;}
 for(const slot of libraryShelves(layout)){
  const g=group(root,slot.x,slot.y,slot.z);g.rotation.y=slot.rotation;g.name='library-real-bookcase';g.userData.level=slot.y;
  box(6.1,4.9,.17,m.darkWood,g,0,2.5,-.5);for(const sx of [-3.08,3.08]){box(.2,5.15,1.0,m.wood,g,sx,2.58,0);box(.37,.18,1.15,m.bronze,g,sx,5.12,0);}for(const y of [.25,1.75,3.25,4.75]){box(6.35,.16,1.1,m.wood,g,0,y,0);box(6.36,.035,.07,m.bronze,g,0,y+.04,.59);}box(6.55,.22,1.18,m.wood,g,0,5.28,0);g.updateWorldMatrix(true,false);
  for(let row=0;row<3;row++)for(let col=0;col<10;col++){
   const index=number++,book=books[index];if(!book)continue;const x=-2.56+col*.565,y=.36+row*1.5,height=1.15+(col%3)*.055,centerY=y+height/2;
   const hit=box(.47,height,.65,hitMaterial,g,x,centerY,.12);hit.userData.id='book:'+book.id;hit.userData.bookId=book.id;hit.name='library-readable-book';hit.castShadow=false;hit.receiveShadow=false;clickables.push(hit);
   if(native){const page=index%32===0?atlas():atlases.at(-1),tile=index%32,tx=(tile%4)*64,ty=Math.floor(tile/4)*256,ctx=page.ctx;ctx.fillStyle=book.color;ctx.fillRect(tx,ty,64,256);ctx.strokeStyle='#c9ad76';ctx.lineWidth=1.5;ctx.strokeRect(tx+5,ty+7,54,242);ctx.fillStyle='#f3e6cb';ctx.textAlign='center';ctx.textBaseline='middle';const chars=Array.from(book.title).slice(0,28),font=Math.min(15,178/Math.max(1,chars.length));ctx.font=`500 ${font}px "Noto Serif TC",serif`;chars.forEach((c,i)=>ctx.fillText(c,tx+32,ty+32+i*font*1.12));ctx.fillRect(tx+13,ty+227,38,1.5);
    const geo=new THREE.BoxGeometry(.46,height,.64),uv=geo.attributes.uv,normal=geo.attributes.normal;for(let n=0;n<uv.count;n++){if(normal.getZ(n)>.5)uv.setXY(n,(tx+uv.getX(n)*64)/256,1-(ty+(1-uv.getY(n))*256)/2048);else uv.setXY(n,(tx+3)/256,1-(ty+12)/2048);}geo.applyMatrix4(new THREE.Matrix4().copy(g.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(x,centerY,.12)));page.geometries.push(geo);
   }else box(.46,height,.64,k.mat(book.color),g,x,centerY,.12);
   const point=new THREE.Vector3(x,centerY,.47).applyMatrix4(g.matrixWorld),normal=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),slot.rotation);labels.push({book,point,normal,level:slot.y});
  }
 }
 for(const page of atlases){page.map.needsUpdate=true;const geometry=mergeGeometries(page.geometries,false);page.geometries.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,page.material);mesh.name='library-batched-book-spines';mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 batchStatic(root,{shadows:!lowDetail});return{root,clickables,labels,atlasCount:atlases.length};
}
