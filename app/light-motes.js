import * as THREE from 'three';
import {seeded} from './art-kit.js';

// 粒光｜Drifting motes of light above the seven islands.
// One THREE.Points object = one draw call. Every mote hovers, drifts and
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
   position[n*3+1]=island.height+.8+rng()*9;
   position[n*3+2]=island.z+Math.sin(a)*island.rz*r;
   // seed, hover radius, drift speed, size
   data[n*4]=rng()*1000;data[n*4+1]=1.6+rng()*2.6;data[n*4+2]=.55+rng()*.6;data[n*4+3]=rng()<.12?7+rng()*4:3+rng()*3.6;
   c.set(motePalette[Math.floor(rng()*motePalette.length)]);color[n*3]=c.r;color[n*3+1]=c.g;color[n*3+2]=c.b;
  }
 });
 return{position,data,color,count:n};
}

// Visibility by time of day: soft at noon, full at night, warm at dawn.
export function moteIntensity({night=0,noon=0,dawn=0}={}){const base=Math.max(0,1-night-noon-dawn);return THREE.MathUtils.clamp(base*.55+night*1+noon*.28+dawn*.75,0,1);}

const vertexShader=`
attribute vec4 aData;attribute vec3 aColor;
uniform float uTime,uScale,uIntensity,uRose;
varying vec3 vColor;varying float vAlpha;varying float vDark;
void main(){
 float seed=aData.x,radius=aData.y,speed=aData.z,size=aData.w,t=uTime*speed;
 // Hover in place: each mote wanders on its own slow loop, like dust in a
 // beam of light, instead of rising away and respawning.
 vec3 p=position;
 p.x+=(sin(t*.7+seed)*.65+sin(t*.31+seed*2.3)*.35)*radius;
 p.z+=(cos(t*.6+seed*1.3)*.65+cos(t*.27+seed*.7)*.35)*radius;
 p.y+=(sin(t*.9+seed*3.1)*.6+sin(t*.43+seed)*.4)*radius*.7;
 vec4 mv=modelViewMatrix*vec4(p,1.);
 gl_Position=projectionMatrix*mv;
 float twinkle=.55+.45*sin(uTime*(1.3+fract(seed)*1.7)+seed*6.283);
 float breathe=.6+.4*sin(t*.23+seed*4.);
 vAlpha=twinkle*breathe*uIntensity;
 // 夜薔: embers of crimson and scarlet, and about a third of the motes turn
 // into dark petals with a red rim that read as black against the glow.
 float pick=fract(seed*.53);
 vec3 rose=pick<.5?vec3(1.,.13,.2):pick<.8?vec3(.72,.02,.1):vec3(1.,.38,.24);
 vColor=mix(aColor,rose,uRose);
 vDark=uRose*step(fract(seed*.311),.36);
 gl_PointSize=size*uScale*(.75+.25*twinkle)*(1.+uRose*.35);
 vAlpha*=1.+uRose*.5;
}`;
const fragmentShader=`
uniform float uRose;varying vec3 vColor;varying float vAlpha;varying float vDark;
void main(){
 vec2 d=gl_PointCoord-.5;float r=length(d)*2.;
 if(r>1.)discard;
 float glow=pow(1.-r,1.7),core=smoothstep(.3,0.,r);
 float a=(glow*.9+core*.8)*vAlpha;
 vec3 light=mix(vColor,vec3(1.,.82,.8),core*mix(.55,.18,uRose)*(1.-vDark));
 // Dark petals: a near-black body over the scene with a thin red rim.
 float body=smoothstep(.75,.35,r)*vDark;
 vec3 color=mix(light*a,vec3(.04,0.,.01)*.9+vColor*glow*.25,body);
 gl_FragColor=vec4(color,body*vAlpha*.95);
}`;

export default function lightMotes({islands,limited=false,lowDetail=false,reducedMotion=false}){
 const count=moteCount({limited,lowDetail});
 if(!count)return{points:null,count:0,update(){},setTime(){},setRose(){},dispose(){}};
 const layout=moteLayout(islands,count),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(layout.position,3));
 geometry.setAttribute('aData',new THREE.BufferAttribute(layout.data,4));
 geometry.setAttribute('aColor',new THREE.BufferAttribute(layout.color,3));
 // Motes hover up to ~12 units above the islands; a fixed sphere avoids per-frame bounds work.
 geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,12,0),140);
 const material=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uScale:{value:1},uIntensity:{value:.6},uRose:{value:0}},
  vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,
  // Premultiplied blending: glow motes write alpha 0 (pure additive light);
  // the dark rose petals write alpha and cover what is behind them.
  blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendSrcAlpha:THREE.OneFactor,blendDstAlpha:THREE.OneMinusSrcAlphaFactor,
  fog:false,toneMapped:false,
 });
 const points=new THREE.Points(geometry,material);
 points.name='light-motes';points.frustumCulled=true;points.renderOrder=2;points.userData.dynamic=true;points.raycast=()=>{};
 let intensity=.6,target=.6,rose=0,roseTarget=0;
 return{
  points,count,
  setTime({night=0,noon=0,dawn=0}={}){target=moteIntensity({night,noon,dawn});},
  // weight 0–1 of the 夜薔 (gothic) theme: red and black motes.
  setRose(weight=0){roseTarget=weight;},
  // zoom: orthographic camera zoom; pixelRatio: renderer.getPixelRatio()
  update(now,{zoom=1,pixelRatio=1}={}){
   // Reduced motion keeps a very slow drift instead of freezing in place.
   material.uniforms.uTime.value=now/1000*(reducedMotion?.2:1);
   rose+=(roseTarget-rose)*.04;material.uniforms.uRose.value=rose;
   intensity+=(target-intensity)*.05;material.uniforms.uIntensity.value=intensity;
   material.uniforms.uScale.value=pixelRatio*THREE.MathUtils.clamp(.85+zoom*.3,1,3.6);
  },
  dispose(){points.parent?.remove(points);geometry.dispose();material.dispose();},
 };
}
