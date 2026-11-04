import * as THREE from 'three';
import {seeded} from './art-kit.js';
import {techLightColors,technologyPalette} from '../lib/building-appearance.ts';
export const techPalette=technologyPalette;
export function roomLightTexture(){
 const w=32,h=48,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const border=Math.min(x,w-1-x,y,h-1-y),blind=y%9===0?.5:1,partition=x===12?.42:1;
  const gradient=.32+.68*(y/(h-1))**.55,shade=border<2?8:Math.round(255*gradient*blind*partition);
  data.set([shade,shade,shade,255],(y*w+x)*4);
 }
 const map=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);map.magFilter=map.minFilter=THREE.LinearFilter;map.needsUpdate=true;return map;
}
export function asphaltTextures(){
 const size=256,random=seeded(2077),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,grain=random(),patch=.5+.24*Math.sin(x*.065+Math.sin(y*.04)*2)+.21*Math.cos(y*.054-x*.018),stone=grain>.96?23:0,shade=128+grain*42+stone,r=Math.max(38,Math.min(220,150-patch*92+grain*25));color.set([shade,shade+2,shade+5,255],i);normal.set([126+(grain-.5)*18,127+(random()-.5)*18,254,255],i);rough.set([r,r,r,255],i);}
 const make=data=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};const map=make(color),normalMap=make(normal),roughnessMap=make(rough);map.colorSpace=THREE.SRGBColorSpace;return{map,normalMap,roughnessMap};
}
export function radialLightTexture(){const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot(x-size/2,y-size/2)/(size/2);data.set([255,255,255,Math.round(Math.max(0,1-r)**2*255)],(y*size+x)*4);}const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
export default function techMaterials({lowDetail=false,phase='cyber'}={}){
 const night=['cyber','gothic','wonder'].includes(phase),cache=new Map(),roomMap=lowDetail?null:roomLightTexture();
 const role=(m,name)=>{m.name='tech-'+name;m.userData.techRole=name;m.userData.bloom=false;return m;};
 const steel=role(lowDetail?new THREE.MeshLambertMaterial({color:techPalette.metal}):new THREE.MeshStandardMaterial({color:techPalette.metal,roughness:.48,metalness:.65}),'steel');
 const body=role(lowDetail?new THREE.MeshLambertMaterial({color:techPalette.body}):new THREE.MeshStandardMaterial({color:techPalette.body,roughness:.58,metalness:.3}),'black-shell');
 const asphalt=role(lowDetail?new THREE.MeshLambertMaterial({color:'#202630'}):new THREE.MeshStandardMaterial({color:'#323943',roughness:.76,metalness:.06,...asphaltTextures(),normalScale:new THREE.Vector2(.45,.45),envMapIntensity:.8}),'asphalt');
 const lane=role(lowDetail?new THREE.MeshLambertMaterial({color:'#b8a36c'}):new THREE.MeshStandardMaterial({color:'#b8a36c',roughness:.44,metalness:.12}),'road-marking');
 function neon(color){const key='n'+color;if(cache.has(key))return cache.get(key);const m=role(new THREE.MeshBasicMaterial({color,toneMapped:true}),'neon');m.color.multiplyScalar(lowDetail?1:1.55);m.userData.bloom=true;m.userData.lightColor=color;cache.set(key,m);return m;}
 function glass(color=null){const key='g'+color;if(cache.has(key))return cache.get(key);const material=lowDetail?new THREE.MeshLambertMaterial({color:color?new THREE.Color(color).multiplyScalar(.28):'#101c27',emissive:color??'#000000',emissiveIntensity:color?(night?.58:.4):0}):new THREE.MeshPhysicalMaterial({color:techPalette.glass,roughness:.14,metalness:.08,transmission:0,thickness:.08,ior:1.5,clearcoat:.75,clearcoatRoughness:.12,envMapIntensity:.85,emissive:color??'#000000',emissiveMap:color?roomMap:null,emissiveIntensity:color?(night?1.25:.75):0});role(material,'glass');material.userData.bloom=!!color;material.userData.lightColor=color;cache.set(key,material);return material;}
 function sign(label,color,{vertical=false}={}){
  const key='s'+label+color+vertical;if(cache.has(key))return cache.get(key);let map=null;
  if(typeof document!=='undefined'&&!lowDetail){const canvas=document.createElement('canvas');canvas.width=vertical?128:512;canvas.height=vertical?512:160;const ctx=canvas.getContext('2d');ctx.fillStyle='#080e17';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.strokeRect(7,7,canvas.width-14,canvas.height-14);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';if(vertical){const chars=Array.from(label.slice(0,7));ctx.font='700 54px sans-serif';chars.forEach((c,n)=>ctx.fillText(c,64,65+n*(380/Math.max(1,chars.length-1))));}else{ctx.font=`700 ${Math.min(76,440/Math.max(label.length,1)*1.45)}px sans-serif`;ctx.fillText(label,256,75);ctx.fillStyle='#9cb6ce';ctx.font='15px sans-serif';ctx.fillText('●  SIGNAL ONLINE  ●',256,136);}map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;}
  const m=role(new THREE.MeshBasicMaterial({color:map?'#ffffff':color,map,toneMapped:true}),'sign');m.userData.bloom=!!map;m.userData.label=label;m.userData.lightColor=color;cache.set(key,m);return m;
 }
 return{body,steel,asphalt,lane,neon,glass,sign,night,colors:techLightColors};
}
