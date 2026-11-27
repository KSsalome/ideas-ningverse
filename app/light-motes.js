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
varying vec3 vColor;varying float vAlpha;varying float vPetal;varying float vSpin;varying float vFlip;varying float vShade;
void main(){
 float seed=aData.x,radius=aData.y,speed=aData.z,size=aData.w,t=uTime*speed;
 vec3 p=position;
 // Hover in place: each mote wanders on its own slow loop, like dust in a
 // beam of light, instead of rising away and respawning.
 vec3 hover=vec3((sin(t*.7+seed)*.65+sin(t*.31+seed*2.3)*.35)*radius,
                 (sin(t*.9+seed*3.1)*.6+sin(t*.43+seed)*.4)*radius*.7,
                 (cos(t*.6+seed*1.3)*.65+cos(t*.27+seed*.7)*.35)*radius);
 // 夜薔: petals are carried by the wind. They sink slowly while travelling
 // far downwind; a shared gust field (neighbours move together) speeds them
 // up, lifts them a little and makes them flutter, then they loop back
 // upwind. Fading at both ends hides the loop.
 float cycle=fract(uTime*speed*.055+seed*.137);
 vec3 windDir=normalize(vec3(1.,0.,.42)),side=vec3(-windDir.z,0.,windDir.x);
 float gustPhase=uTime*.42-dot(position.xz,vec2(.06,.025));
 float gust=.5+.5*sin(gustPhase)*.7+.5*.3*sin(gustPhase*2.3+1.7);
 // Integrated gust: speeds petals up without ever pushing them back upwind.
 float surge=-cos(gustPhase)*.55-cos(gustPhase*2.3+1.7)*.08;
 float flutter=sin(uTime*(1.6+fract(seed*2.7))*speed+seed*5.)*(.35+gust*.55);
 vec3 fall=windDir*(cycle*11.-5.5+surge)
          +side*(sin(uTime*.55*speed+seed)*1.1+flutter*.5)
          +vec3(0.,5.-cycle*9.+sin(gustPhase+.6)*.7*gust+flutter*.25,0.);
 p+=mix(hover,fall,uRose);
 vec4 mv=modelViewMatrix*vec4(p,1.);
 gl_Position=projectionMatrix*mv;
 float twinkle=.55+.45*sin(uTime*(1.3+fract(seed)*1.7)+seed*6.283);
 float breathe=.6+.4*sin(t*.23+seed*4.);
 float ends=smoothstep(0.,.12,cycle)*(1.-smoothstep(.86,1.,cycle));
 // About a third of the motes become petals, a fifth stay as glowing embers,
 // and the rest fade out so the sky is not crowded.
 float role=fract(seed*.77);
 vPetal=uRose*step(.68,role);
 float hidden=uRose*step(.2,role)*(1.-step(.68,role));
 vAlpha=mix(twinkle*breathe,mix(1.,ends,uRose),vPetal)*uIntensity*(1.+uRose*.4)*(1.-hidden);
 // Each petal turns in the air (spin) and tumbles end over end (flip),
 // faster while a gust is passing.
 float dir=fract(seed*.41)<.5?-1.:1.;
 vSpin=seed*6.283+(uTime*(.45+fract(seed*1.9)*.7)+surge*.9)*dir+flutter*.35;
 vFlip=cos(uTime*(1.+fract(seed*3.3)*1.2)+surge*1.6+seed);
 float pick=fract(seed*.53);
 vec3 rose=pick<.45?vec3(.62,.04,.12):pick<.8?vec3(.82,.1,.2):vec3(.28,.02,.06);
 vColor=mix(aColor,mix(vec3(1.,.3,.18),rose,vPetal),uRose);
 vShade=pick;
 gl_PointSize=size*uScale*mix(.75+.25*twinkle,1.75,vPetal)*(1.-hidden);
}`;
const fragmentShader=`
uniform float uRose;varying vec3 vColor;varying float vAlpha;varying float vPetal;varying float vSpin;varying float vFlip;varying float vShade;
void main(){
 vec2 d=gl_PointCoord-.5;
 if(vPetal>.5){
  // Rose petal: rounded top with a soft notch, tapering to the base,
  // squeezed by the tumble so it reads as a thin petal turning over.
  float c=cos(vSpin),s=sin(vSpin);vec2 q=vec2(c*d.x-s*d.y,s*d.x+c*d.y)*2.;
  float flip=max(abs(vFlip),.22);q.x/=flip;
  float y=q.y*1.05;
  float width=.62*sqrt(max(0.,1.-y*y))*(.45+.55*clamp((y+1.)*.5,0.,1.));
  float notch=smoothstep(.12,0.,abs(q.x))*smoothstep(.62,.95,y)*.28;
  float edge=width-abs(q.x);
  float inside=smoothstep(0.,.07,edge)*smoothstep(-.98,-.85,y)*(1.-smoothstep(.95-notch,1.-notch,y));
  if(inside<.01)discard;
  // Deeper at the base, lighter crimson at the rim; the back face is darker.
  float rim=1.-smoothstep(0.,.25,edge);
  vec3 col=mix(vColor*.55,vColor,clamp((y+1.)*.6,0.,1.));
  col=mix(col,vColor*1.35+vec3(.06,0.,.01),rim*.55);
  col*=mix(.55,1.,step(0.,vFlip))*(.9+.1*vShade);
  float a=inside*vAlpha*.92;
  gl_FragColor=vec4(col*a,a);
  return;
 }
 float r=length(d)*2.;
 if(r>1.)discard;
 float glow=pow(1.-r,1.7),core=smoothstep(.3,0.,r);
 float a=(glow*.9+core*.8)*vAlpha;
 vec3 light=mix(vColor,vec3(1.,.82,.8),core*mix(.55,.25,uRose));
 // Glowing motes write alpha 0, so they add light like before.
 gl_FragColor=vec4(light*a,0.);
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
