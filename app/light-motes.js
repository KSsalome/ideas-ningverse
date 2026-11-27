import * as THREE from 'three';
import {seeded} from './art-kit.js';

// 粒光｜Drifting motes of light above the seven islands.
// One THREE.Points object = one draw call. Every mote rises, sways and
// twinkles inside the vertex shader, so the CPU only writes a few uniforms per
// frame: no per-mote JavaScript, no buffer re-uploads, no extra render pass.
// Palette follows the astral art style: ivory, gold and magic blue.

export const motePalette=['#ffe2a6','#ffd27a','#fff4dc','#9fd0ff','#c7b5ff'];

// Island share is weighted toward the home island, where visitors land.
export function moteCount({limited=false,lowDetail=false}={}){return lowDetail?0:limited?150:380;}

export function moteLayout(islands,count,seed=2026){
 const rng=seeded(seed),weights=islands.map(i=>i.id==='home'?2.4:1),sum=weights.reduce((a,b)=>a+b,0);
 const position=new Float32Array(count*3),data=new Float32Array(count*4),color=new Float32Array(count*3),c=new THREE.Color();
 let n=0;
 islands.forEach((island,index)=>{
  const share=index===islands.length-1?count-n:Math.round(count*weights[index]/sum);
  for(let k=0;k<share&&n<count;k++,n++){
   // Uniform inside the island ellipse, slightly beyond the shore.
   const a=rng()*Math.PI*2,r=Math.sqrt(rng())*1.08;
   position[n*3]=island.x+Math.cos(a)*island.rx*r;
   position[n*3+1]=island.height+.6+rng()*2;
   position[n*3+2]=island.z+Math.sin(a)*island.rz*r;
   // seed, rise height, rise speed, size
   data[n*4]=rng()*1000;data[n*4+1]=7+rng()*9;data[n*4+2]=.18+rng()*.32;data[n*4+3]=rng()<.12?7+rng()*4:3+rng()*3.6;
   c.set(motePalette[Math.floor(rng()*motePalette.length)]);color[n*3]=c.r;color[n*3+1]=c.g;color[n*3+2]=c.b;
  }
 });
 return{position,data,color,count:n};
}

// Visibility by time of day: soft at noon, full at night, warm at dawn.
export function moteIntensity({night=0,noon=0,dawn=0}={}){const base=Math.max(0,1-night-noon-dawn);return THREE.MathUtils.clamp(base*.55+night*1+noon*.28+dawn*.75,0,1);}

const vertexShader=`
attribute vec4 aData;attribute vec3 aColor;
uniform float uTime,uScale,uIntensity;
varying vec3 vColor;varying float vAlpha;
void main(){
 float seed=aData.x,rise=aData.y,speed=aData.z,size=aData.w;
 float cycle=fract(uTime*speed/rise+seed*.137);
 vec3 p=position;
 p.y+=cycle*rise;
 p.x+=sin(uTime*.45+seed)*.9*cycle+sin(uTime*.9+seed*2.1)*.25;
 p.z+=cos(uTime*.38+seed*1.7)*.9*cycle;
 vec4 mv=modelViewMatrix*vec4(p,1.);
 gl_Position=projectionMatrix*mv;
 float twinkle=.55+.45*sin(uTime*(1.3+fract(seed)*1.7)+seed*6.283);
 vAlpha=smoothstep(0.,.18,cycle)*(1.-smoothstep(.72,1.,cycle))*twinkle*uIntensity;
 vColor=aColor;
 gl_PointSize=size*uScale*(.75+.25*twinkle);
}`;
const fragmentShader=`
varying vec3 vColor;varying float vAlpha;
void main(){
 vec2 d=gl_PointCoord-.5;float r=length(d)*2.;
 if(r>1.)discard;
 float glow=pow(1.-r,1.7),core=smoothstep(.3,0.,r);
 float a=(glow*.9+core*.8)*vAlpha;
 gl_FragColor=vec4(mix(vColor,vec3(1.),core*.55)*a,a);
}`;

export default function lightMotes({islands,limited=false,lowDetail=false,reducedMotion=false}){
 const count=moteCount({limited,lowDetail});
 if(!count)return{points:null,count:0,update(){},setTime(){},dispose(){}};
 const layout=moteLayout(islands,count),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(layout.position,3));
 geometry.setAttribute('aData',new THREE.BufferAttribute(layout.data,4));
 geometry.setAttribute('aColor',new THREE.BufferAttribute(layout.color,3));
 // Motes travel up to ~16 units above their base; a fixed sphere avoids per-frame bounds work.
 geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,12,0),140);
 const material=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uScale:{value:1},uIntensity:{value:.6}},
  vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,
  // Premultiplied additive glow: works on the transparent canvas over the 2D sky layers.
  blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor,
  fog:false,toneMapped:false,
 });
 const points=new THREE.Points(geometry,material);
 points.name='light-motes';points.frustumCulled=true;points.renderOrder=2;points.userData.dynamic=true;points.raycast=()=>{};
 let intensity=.6,target=.6;
 return{
  points,count,
  setTime({night=0,noon=0,dawn=0}={}){target=moteIntensity({night,noon,dawn});},
  // zoom: orthographic camera zoom; pixelRatio: renderer.getPixelRatio()
  update(now,{zoom=1,pixelRatio=1}={}){
   if(!reducedMotion)material.uniforms.uTime.value=now/1000;
   intensity+=(target-intensity)*.05;material.uniforms.uIntensity.value=intensity;
   material.uniforms.uScale.value=pixelRatio*THREE.MathUtils.clamp(.85+zoom*.3,1,3.6);
  },
  dispose(){points.parent?.remove(points);geometry.dispose();material.dispose();},
 };
}
