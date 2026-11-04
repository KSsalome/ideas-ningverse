import * as THREE from 'three';
import {seeded} from './art-kit.js';

export const homePalette=Object.freeze({ivory:'#bfb298',stone:'#95856d',navy:'#39291f',gold:'#a78d59',leaf:'#65764f',light:'#ffd595'});

// Repeatable limestone, slate and paving, made locally from deterministic data.
// UVs are measured in world units, so bricks keep their size across tall towers
// and narrow walls instead of stretching with the building.
export function masonryTextures(kind='wall'){
 const size=256,random=seeded(kind==='roof'?910:kind==='paving'?712:414),values=new Float32Array(size*size),tones=Array.from({length:64},()=>.84+random()*.16),rows=kind==='roof'?8:8,cols=kind==='roof'?4:4;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const row=Math.floor(y/(size/rows)),xx=(x+(row%2)*size/cols/2)%size,bx=xx%(size/cols),by=y%(size/rows),edge=Math.min(bx,size/cols-bx,by,size/rows-by),index=row*cols+Math.floor(xx/(size/cols));
  const grain=(random()-.5)*.035+Math.sin(x*.13+y*.31)*.012,bevel=Math.min(1,Math.max(0,(edge-1.2)/3.2));
  values[y*size+x]=(kind==='roof'?.46+.48*bevel:.5+.5*bevel)*tones[index]+grain;
 }
 const color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 const sample=(x,y)=>values[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,v=sample(x,y),dx=(sample(x+1,y)-sample(x-1,y))*1.4,dy=(sample(x,y+1)-sample(x,y-1))*1.4,n=new THREE.Vector3(-dx,-dy,1).normalize(),r=228+Math.round((1-v)*20);
  const shade=Math.max(0,Math.min(255,Math.round(v*255)));color.set([shade,shade,shade,255],i);normal.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],i);rough.set([r,r,r,255],i);
 }
 const texture=data=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 const map=texture(color),normalMap=texture(normal),roughnessMap=texture(rough);map.colorSpace=THREE.SRGBColorSpace;return{map,normalMap,roughnessMap};
}
export function worldUV(geometry,scaleX=2.4,scaleY=1.6){
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(Math.abs(n.getY(i))>.65){uv[i*2]=x/scaleX;uv[i*2+1]=-z/scaleY;}else if(Math.abs(n.getX(i))>.65){uv[i*2]=z/scaleX;uv[i*2+1]=y/scaleY;}else{uv[i*2]=x/scaleX;uv[i*2+1]=y/scaleY;}}
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}
export default function homeMaterials(lowDetail=false){
 const make=(color,role,kind)=>{
  const m=lowDetail?new THREE.MeshLambertMaterial({color}):new THREE.MeshStandardMaterial({color,roughness:kind==='roof'?.91:.96,metalness:0,...masonryTextures(kind),normalScale:new THREE.Vector2(kind==='roof'?.3:.5,kind==='roof'?.3:.5)});
  m.name='home-'+role;m.userData.homeRole=role;m.userData.bloom=false;return m;
 };
 const wall=make(homePalette.ivory,'limestone','wall'),foundation=make('#92836c','foundation','wall'),roof=make(homePalette.navy,'roof','roof'),paving=make('#a99b82','paving','paving');
 const stoneColors=['#b9ac92','#c3b79f','#ab9c80','#bfb095','#a7977d','#c6bba5'];
 const blockTones=stoneColors.map(color=>new THREE.MeshLambertMaterial({color}));blockTones.forEach(m=>{m.name='home-paving-block';m.userData.homeRole='paving';});
 return{wall,foundation,roof,paving,blockTones};
}
