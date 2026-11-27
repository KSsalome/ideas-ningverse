import * as THREE from 'three';
import {seeded} from './art-kit.js';

// 光影｜Lamp light pools, sun or moon shafts, and drifting mist.
// Three instanced draw calls in total. Every effect is a soft, additive
// gradient computed on the GPU and faded by time of day, so the cost is the
// same on phones and desktops and nothing touches the shadow pass.

export function atmosphereLevels({night=0,noon=0,dawn=0}={}){
 const base=Math.max(0,1-night-noon-dawn),c=v=>Math.min(1,Math.max(0,v));
 return{
  pools:c(night*1+base*.18+dawn*.08),
  shafts:c(dawn*1+noon*.42+base*.55+night*.36),
  mist:c(dawn*1+night*.55+base*.35+noon*.12),
 };
}

// Shafts keep the sun's warmth by day and turn into cool moonbeams at night.
export function shaftColor({night=0,noon=0,dawn=0}={},target=new THREE.Color()){
 const base=Math.max(0,1-night-noon-dawn);
 return target.setRGB(1*base+1*dawn+1*noon+.62*night,.86*base+.8*dawn+.95*noon+.74*night,.62*base+.68*dawn+.82*noon+1*night);
}

export function collectLampPosts(root,{limit=320,spacing=.8}={}){
 root.updateMatrixWorld(true);const found=[],p=new THREE.Vector3();
 root.traverse(o=>{if(!o.userData.lampPost)return;o.getWorldPosition(p);if(found.some(q=>Math.abs(q.x-p.x)<spacing&&Math.abs(q.z-p.z)<spacing))return;found.push({x:p.x,y:p.y,z:p.z});});
 return found.slice(0,limit);
}

const poolVertex=`
attribute float aSeed;varying vec2 vUv;varying float vSeed;
void main(){vUv=uv;vSeed=aSeed;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.);}`;
const poolFragment=`
uniform float uLevel,uTime;varying vec2 vUv;varying float vSeed;
void main(){
 float r=length(vUv-.5)*2.;if(r>1.)discard;
 float flicker=.93+.07*sin(uTime*(2.1+fract(vSeed)*1.3)+vSeed*9.);
 float core=pow(1.-r,2.6),halo=pow(1.-r,1.2)*.35;
 vec3 color=mix(vec3(1.,.62,.28),vec3(1.,.86,.6),core);
 float a=(core*.85+halo)*uLevel*flicker*.55;
 gl_FragColor=vec4(color*a,a);
}`;

const shaftVertex=`
attribute float aSeed;varying vec2 vUv;varying float vSeed;
void main(){vUv=uv;vSeed=aSeed;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.);}`;
const shaftFragment=`
uniform float uLevel,uTime;uniform vec3 uColor;varying vec2 vUv;varying float vSeed;
void main(){
 float across=1.-abs(vUv.x-.5)*2.;across=smoothstep(0.,1.,across);across*=across;
 float along=smoothstep(0.,.18,vUv.y)*(1.-smoothstep(.55,1.,vUv.y));
 float breathe=.72+.28*sin(uTime*.23+vSeed*5.)*sin(uTime*.11+vSeed*2.3);
 float streak=.75+.25*sin(vUv.x*19.+vSeed*7.+uTime*.05);
 float a=across*along*breathe*streak*uLevel*.11;
 gl_FragColor=vec4(uColor*a,a);
}`;

const mistVertex=`
attribute float aSeed;varying vec2 vUv;varying float vSeed;varying vec2 vWorld;
void main(){vUv=uv;vSeed=aSeed;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vWorld=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const mistFragment=`
uniform float uLevel,uTime;uniform vec3 uColor;varying vec2 vUv;varying float vSeed;varying vec2 vWorld;
void main(){
 float r=length(vUv-.5)*2.;if(r>1.)discard;
 vec2 p=vWorld*.045+vec2(uTime*.012,uTime*.007)+vSeed;
 float n=sin(p.x*1.7+sin(p.y*1.3))*.5+.5;n=n*.6+(sin(p.y*2.3-p.x*.9+uTime*.02)*.5+.5)*.4;
 float ring=smoothstep(.5,.78,r)*(1.-smoothstep(.84,1.,r));
 float a=ring*(.45+.55*n)*uLevel*.075;
 gl_FragColor=vec4(uColor*a,a);
}`;

function additive(uniforms,vertexShader,fragmentShader){
 return new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,fog:false,toneMapped:false,
  blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor,
  polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
}
function instanced(geometry,material,count,name){
 const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;mesh.raycast=()=>{};mesh.userData.dynamic=true;
 geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(new Float32Array(count).map((_,n)=>n*7.31%100),1));return mesh;
}

export default function lightAtmosphere({root,islands,sun=new THREE.Vector3(-38,78,42),limited=false,lowDetail=false,reducedMotion=false}){
 if(lowDetail)return{group:null,lamps:0,update(){},setTime(){},dispose(){}};
 const group=new THREE.Group();group.name='light-atmosphere';group.userData.dynamic=true;
 const time={value:0},matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),rng=seeded(77);
 const parts=[];

 // 1. Warm pools of lamplight on paths and plazas.
 const lamps=collectLampPosts(root,{limit:limited?200:320});
 const poolUniforms={uLevel:{value:0},uTime:time};
 if(lamps.length){
  const geometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),pools=instanced(geometry,additive(poolUniforms,poolVertex,poolFragment),lamps.length,'lamp-light-pools');
  lamps.forEach((l,n)=>{p.set(l.x,l.y+.06,l.z);s.setScalar(6.4);matrix.compose(p,q.identity(),s);pools.setMatrixAt(n,matrix);});
  pools.renderOrder=1;group.add(pools);parts.push(pools);
 }

 // 2. Shafts of light falling along the sun direction onto each island.
 const shaftUniforms={uLevel:{value:0},uTime:time,uColor:{value:new THREE.Color('#ffe2b0')}};
 const crossed=new THREE.PlaneGeometry(1,1).translate(0,.5,0),second=crossed.clone().rotateY(Math.PI/2);
 const shaftGeometry=new THREE.BufferGeometry();
 {const a=crossed.toNonIndexed(),b=second.toNonIndexed();for(const name of ['position','uv']){const x=a.getAttribute(name),y=b.getAttribute(name),out=new Float32Array(x.array.length+y.array.length);out.set(x.array);out.set(y.array,x.array.length);shaftGeometry.setAttribute(name,new THREE.BufferAttribute(out,x.itemSize));}}
 const perIsland=islands.map(i=>i.id==='home'?5:2),shaftCount=perIsland.reduce((a,b)=>a+b,0);
 const shafts=instanced(shaftGeometry,additive(shaftUniforms,shaftVertex,shaftFragment),shaftCount,'sun-shafts');
 const up=new THREE.Vector3(0,1,0),dir=sun.clone().normalize();q.setFromUnitVectors(up,dir);
 let n=0;islands.forEach((island,k)=>{for(let j=0;j<perIsland[k];j++,n++){const a=rng()*Math.PI*2,r=Math.sqrt(rng())*.7;p.set(island.x+Math.cos(a)*island.rx*r,island.height+.2,island.z+Math.sin(a)*island.rz*r);s.set(3.2+rng()*4.5,58+rng()*26,1);matrix.compose(p,q,s);shafts.setMatrixAt(n,matrix);}});
 shafts.renderOrder=3;group.add(shafts);parts.push(shafts);

 // 3. Mist that gathers around each island's rim and drifts slowly.
 const mistUniforms={uLevel:{value:0},uTime:time,uColor:{value:new THREE.Color('#e9e3f2')}};
 const mist=instanced(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),additive(mistUniforms,mistVertex,mistFragment),islands.length,'island-mist');
 islands.forEach((island,k)=>{p.set(island.x,island.height-.9,island.z);s.set(island.rx*2.5,1,island.rz*2.5);matrix.compose(p,q.identity(),s);mist.setMatrixAt(k,matrix);});
 mist.renderOrder=1;group.add(mist);parts.push(mist);

 const target={pools:0,shafts:.5,mist:.3},current={...target},warm=new THREE.Color(),mistNight=new THREE.Color('#8aa0d6'),mistDawn=new THREE.Color('#f3d9e6'),mistDay=new THREE.Color('#eef2f6');
 return{
  group,lamps:lamps.length,
  setTime(state={}){Object.assign(target,atmosphereLevels(state));shaftColor(state,warm);shaftUniforms.uColor.value.copy(warm);
   const {night=0,dawn=0}=state;mistUniforms.uColor.value.copy(mistDay).lerp(mistDawn,dawn).lerp(mistNight,night);},
  update(now){
   if(!reducedMotion)time.value=now/1000;
   for(const key of ['pools','shafts','mist'])current[key]+=(target[key]-current[key])*.06;
   poolUniforms.uLevel.value=current.pools;shaftUniforms.uLevel.value=current.shafts;mistUniforms.uLevel.value=current.mist;
  },
  dispose(){group.removeFromParent();for(const m of parts){m.geometry.dispose();m.material.dispose();m.dispose?.();}},
 };
}
