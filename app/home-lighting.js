import * as THREE from 'three';
import {homeAtmospheres} from '../lib/home-atmosphere.ts';
import {smoothBlend,deepNight,fairyDawn} from '../lib/world-night.ts';

// A material-local lighting adjustment: no scene-wide light, environment,
// exposure or fog is changed, so neighbouring districts receive exactly the
// same illumination. The existing directional shadow remains available.
export default function homeLighting({root,lowDetail=false,phase='medieval'}){
 const uniforms={homeKey:{value:new THREE.Color()},homeAmbient:{value:new THREE.Color()},homeDirect:{value:1},homeFill:{value:1},homeFog:{value:new THREE.Color()}};
 const dawnFog=new THREE.Color(fairyDawn.fog),lateFog=new THREE.Color(fairyDawn.lateFog),patched=new WeakSet(),proxies=[];let current=phase,transition=null;
 function attach(parent){
  parent.traverse(o=>{
   for(const material of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){
    if(material.isMeshBasicMaterial||material.isSpriteMaterial||material.visible===false||patched.has(material))continue;
    patched.add(material);material.userData.homeLighting=true;
    if(!lowDetail&&(material.isMeshStandardMaterial||material.isMeshPhysicalMaterial)){
     const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
     material.onBeforeCompile=shader=>{
      previous?.(shader);Object.assign(shader.uniforms,uniforms);
      shader.fragmentShader='uniform vec3 homeKey; uniform vec3 homeAmbient; uniform vec3 homeFog; uniform float homeDirect; uniform float homeFill;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
       reflectedLight.directDiffuse *= homeKey * homeDirect;
       reflectedLight.directSpecular *= homeKey * homeDirect;
       reflectedLight.indirectDiffuse *= homeAmbient * homeFill;
       reflectedLight.indirectSpecular *= homeAmbient * homeFill;
      `).replace('#include <fog_fragment>',THREE.ShaderChunk.fog_fragment.replaceAll('fogColor','homeFog'));
     };
     material.customProgramCacheKey=()=> cacheKey+'|home-local-atmosphere-v2';material.needsUpdate=true;
    }
   }
  });
 }
 function tintSVG(parent){
  const tint=uniforms.homeKey.value.clone().lerp(uniforms.homeAmbient.value,.4),gain=Math.min(1.2,(uniforms.homeDirect.value+uniforms.homeFill.value)*.5),color=new THREE.Color();
  parent.traverse(o=>{
   if(!o.isMesh||!o.geometry||!o.material?.isMeshLambertMaterial||o.material.visible===false)return;
   const count=o.geometry.attributes.position.count;
   let attr=o.geometry.attributes.color;
   if(!attr||attr.count!==count){attr=new THREE.Float32BufferAttribute(new Float32Array(count*3),3);o.geometry.setAttribute('color',attr);}
   // Keep the brown roof/limestone base colors intact; modulation is lighting.
   color.copy(tint).multiplyScalar(gain);for(let n=0;n<count;n++)attr.setXYZ(n,color.r,color.g,color.b);
   attr.needsUpdate=true;if(!o.material.vertexColors){o.material.vertexColors=true;o.material.needsUpdate=true;}
  });
 }
 function refresh(){for(const parent of [root,...proxies]){attach(parent);if(lowDetail)tintSVG(parent);}}
 function state(next){const p=homeAtmospheres[next],noon=next==='medieval',dawn=next==='wonder',gothic=next==='gothic';return{homeKey:new THREE.Color(noon?'#fff5e4':dawn?'#fff8ed':gothic?'#dfe5ed':next==='cyber'?'#e1e8f2':p.key),homeAmbient:new THREE.Color(noon?'#eef0e7':dawn?'#f0edf2':gothic?'#c2ccda':next==='cyber'?'#e4e5ee':p.ambient),homeDirect:noon||dawn?1:gothic?.96:next==='cyber'?1.02:p.direct,homeFill:noon||dawn?1:gothic?1.02:next==='cyber'?1.04:p.fill,homeFog:new THREE.Color(noon?'#c2d3dd':dawn?fairyDawn.fog:gothic?deepNight.fog:next==='cyber'?'#354154':p.mist)};}
 function capture(){return Object.fromEntries(Object.entries(uniforms).map(([key,u])=>[key,u.value?.clone?u.value.clone():u.value]));}
 function put(values){for(const [key,value]of Object.entries(values))if(uniforms[key].value?.copy)uniforms[key].value.copy(value);else uniforms[key].value=value;}
 function update(now){if(!transition)return;const t=smoothBlend(0,1,now-transition.started);for(const [key,end]of Object.entries(transition.to)){const start=transition.from[key];if(end?.isColor)uniforms[key].value.copy(start).lerp(end,t);else uniforms[key].value=start+(end-start)*t;}if(lowDetail&&now-transition.last>120){for(const p of [root,...proxies])tintSVG(p);transition.last=now;}if(t===1){transition=null;if(lowDetail)for(const p of [root,...proxies])tintSVG(p);}}
 function setPhase(next,{immediate=true,now=0}={}){update(now);current=homeAtmospheres[next]?next:'medieval';const to=state(current);if(immediate){transition=null;put(to);}else transition={from:capture(),to,started:now,last:-Infinity};refresh();}
 setPhase(phase);
 return{setPhase,update,refresh,uniforms,setDawnProgress(progress){if(current==='wonder'&&!transition)uniforms.homeFog.value.copy(dawnFog).lerp(lateFog,THREE.MathUtils.clamp(progress,0,1));},addProxy(parent){proxies.push(parent);attach(parent);if(lowDetail)tintSVG(parent);}};
}
