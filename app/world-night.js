import * as THREE from 'three';

// Change illumination / living foliage, never district architecture, geometry
// or uploaded artwork. All values are derived from an immutable day baseline.
export default function worldNightLighting({districts,proxies,bridges}){
 const materials=new Map(),lights=new Map(),warmWindow=new THREE.Color('#d7ad71');let mix=0,depth=0,noon=0,dawn=0,progress=0;
 function visit(parent,id){parent?.traverse(o=>{
  if(o.isPointLight||o.isSpotLight)lights.set(o,{day:o.intensity,factor:id==='technology'?1.55:id==='mine'?1.25:1.5,deepFactor:id==='technology'?1.4:id==='mine'?1.3:1.45,max:id==='technology'?48:id==='mine'?18:id==='library'?20:24});
  for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){
   if(materials.has(m))continue;
   const role=[m.name,m.userData.libraryRole,m.userData.mineRole,m.userData.factoryRole,m.userData.museumRole,m.userData.techRole].filter(Boolean).join(' ');
   const foliage=!!m.userData.vegetation||/greenery|foliage|leaf|white-rose|pink-rose|flower/.test(role);
   const glow=!!m.userData.bloom,emissive=!!m.emissive&&m.emissive.getHex()>0&&m.emissiveIntensity>0;
   const window=/window-depth|amber-window/.test(role),halo=m.transparent&&/halo|aura|mist|light-pool/.test(role);
   if(foliage||glow||emissive||window||halo)materials.set(m,{color:m.color?.clone(),emissive:m.emissive?.clone(),power:m.emissiveIntensity??0,foliage,glow,window,halo,opacity:m.opacity,tech:id==='technology',factor:id==='technology'?1.6:id==='mine'?1.3:1.45});
  }
 });}
 for(const [id,g]of districts)if(id!=='home')visit(g,id);
 for(const [id,g]of proxies)if(id!=='home')visit(g,id);
 visit(bridges,'bridges');
 function setMix(value,deep=0,day=0,morning=0,time=0){
  mix=THREE.MathUtils.clamp(value,0,1);depth=THREE.MathUtils.clamp(deep,0,mix);noon=THREE.MathUtils.clamp(day,0,1-mix);dawn=THREE.MathUtils.clamp(morning,0,1-mix-noon);progress=THREE.MathUtils.clamp(time,0,1);
  for(const [m,b]of materials){
   if(b.color)m.color.copy(b.color).multiplyScalar(b.foliage?1-.2*mix-.1*depth+dawn*(.025+progress*.025):b.glow?1+.14*mix+(b.tech?.06:-.04)*depth-(b.tech?.24:.38)*noon-dawn*(.08+progress*.18):1);
   if(b.emissive){m.emissive.copy(b.emissive);const power=b.window?Math.max(.42,b.power*2):b.power*b.factor,deepPower=b.window?Math.max(.36,b.power*1.85):b.power*(b.tech?1.75:b.factor*.96),dayPower=b.power*(b.window?.7:b.tech?.62:.78),dawnPower=b.power*(b.window?1.05-progress*.3:1-progress*(b.tech?.3:.2));m.emissiveIntensity=b.power*(1-mix-noon-dawn)+power*(mix-depth)+deepPower*depth+dayPower*noon+dawnPower*dawn;}
   // SVG cannot draw physical transmission / emissive intensity. Its window
   // backing gets the same restrained warm glow as the WebGL material.
   if(b.window&&m.isMeshLambertMaterial)m.color.copy(b.color).lerp(warmWindow,mix*.58-depth*.04);
   if(b.window&&m.isMeshBasicMaterial)m.color.copy(b.color).multiplyScalar(1+.36*mix-.05*depth-.12*noon-dawn*progress*.09);
   if(b.halo)m.opacity=b.opacity*(1-.65*noon-dawn*(.2+progress*.25));
  }
 }
 function restoreLights(){for(const [light,b]of lights)light.intensity=b.day;}
 function applyLights(){for(const [light,b]of lights){b.day=light.intensity;light.intensity=Math.min(Math.max(b.max,b.day),b.day*(1+(b.factor-1)*mix+(b.deepFactor-b.factor)*depth-.55*noon-dawn*(.08+progress*.4)));}}
 return{setMix,restoreLights,applyLights,get mix(){return mix;},get depth(){return depth;},get noon(){return noon;},get dawn(){return dawn;},get dawnProgress(){return progress;},materialCount:materials.size,lightCount:lights.size};
}
