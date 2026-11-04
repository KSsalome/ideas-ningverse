import * as THREE from 'three';
import {seeded} from './art-kit.js';

// Small, deterministic colour/normal/roughness tiles, measured in world units.
// No photograph, runtime download, refraction or per-frame texture generation.
export function factorySurfaceTextures(kind='metal'){
 const size=256,rng=seeded(kind==='tread'?2041:882),height=new Float32Array(size*size),shade=new Float32Array(size*size),wear=new Float32Array(size*size),raised=new Float32Array(size*size);
 const scratches=Array.from({length:19},()=>({x:rng()*size,y:rng()*size,len:12+rng()*95,width:.35+rng()*.65}));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,grain=(rng()-.5)*.065;
  if(kind==='tread'){
   const col=Math.floor(x/64),row=Math.floor(y/64),angle=(row+col)%2?Math.PI/4:-Math.PI/4,dx=x%64-32,dy=y%64-32,u=dx*Math.cos(angle)+dy*Math.sin(angle),v=-dx*Math.sin(angle)+dy*Math.cos(angle),distance=Math.abs(u)/23+Math.abs(v)/6.2,t=Math.max(0,1-distance),h=Math.sin(Math.min(1,t*2.8)*Math.PI/2);
   raised[i]=h;height[i]=.24+h*.62+grain*.25;shade[i]=.43+h*.22+grain;wear[i]=h;
  }else{
   let scrape=0;for(const s of scratches){const dx=(x-s.x+size)%size;if(dx<s.len&&Math.abs(y-s.y)<s.width)scrape=Math.max(scrape,.2*(1-dx/s.len));}
   const brushed=Math.sin(y*1.9)*.025,patch=Math.max(0,Math.sin(x*.035+Math.sin(y*.027)*2)*Math.cos(y*.039)-.42),pits=rng()<.011?.15:0;
   height[i]=.5+grain+brushed-pits+scrape*.2;shade[i]=.49+grain+brushed+scrape+patch*.13;wear[i]=patch;
  }
 }
 const color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),sample=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const j=y*size+x,i=j*4,s=shade[j],rust=kind==='metal'?wear[j]*.28:0,v=new THREE.Vector3((sample(x-1,y)-sample(x+1,y))*2.4,(sample(x,y-1)-sample(x,y+1))*2.4,1).normalize(),r=kind==='tread'?Math.round(212-raised[j]*100):Math.round(166+wear[j]*50);
  color.set([Math.min(255,(s+rust)*255),Math.min(255,(s-rust*.36)*255),Math.min(255,(s-rust*.6)*255),255],i);normal.set([(v.x*.5+.5)*255,(v.y*.5+.5)*255,(v.z*.5+.5)*255,255],i);rough.set([r,r,r,255],i);
 }
 function tile(data,name,srgb=false){const tex=new THREE.DataTexture(data,size,size);tex.name='factory-'+kind+'-'+name;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.anisotropy=2;if(srgb)tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;tex.userData.tileWorldSize=kind==='tread'?.8:1.2;if(kind==='metal')tex.repeat.set(2,1.6/1.2);return tex;}
 return{map:tile(color,'colour',true),normalMap:tile(normal,'pressed-normal'),roughnessMap:tile(rough,'roughness')};
}
