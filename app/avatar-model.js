import * as THREE from 'three';
import {wearableHair,addWearables,animateWearables} from './avatar-wearables.js';
export {animateWearables};
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export default function makeAvatar(data,cosmetics={},lowDetail=false){
 const g=new THREE.Group(),m=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra}),skin=m(data.skin),hair=m(cosmetics.hairColor??data.hair),dark=m('#27334a'),gold=m('#c5af82',{metalness:.4});
 const outfitColor=cosmetics.outfit==='tavern-waistcoat'?'#e9dfc8':cosmetics.outfitColor??({'forest-cape':'#698c76','moon-coat':'#d1c7d6','neon-jacket':'#405d74'})[cosmetics.outfit]??data.outfit,coat=m(outfitColor);
 const mesh=(geo,mat,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;},box=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z),ball=(r,mat,x,y,z,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,lowDetail?8:20,lowDetail?5:14),mat,x,y,z);o.scale.set(sx,sy,sz);return o;},cyl=(r,h,mat,x,y,z)=>mesh(new THREE.CylinderGeometry(r,r,h,8),mat,x,y,z);
 const body=mesh(lowDetail?new THREE.BoxGeometry(.47,cosmetics.outfit==='moon-coat'?.84:.61,.31):new RoundedBoxGeometry(.47,cosmetics.outfit==='moon-coat'?.84:.61,.31,2,.045),coat,0,.84,0);box(.11,.41,.025,m('#e8e0ce'),0,.91,.17);for(const x of [-.11,.11]){const collar=box(.13,.15,.025,m('#f1e9da'),x,1.1,.18);collar.rotation.z=x<0?-.42:.42;}for(const y of [.72,.88,1.02])ball(.017,gold,.06,y,.18);
 ball(.36,skin,0,1.45,0,1,1.05,.92);const customHair=wearableHair({look:cosmetics,hair,mesh,box,lowDetail,m});if(!customHair){mesh(new THREE.SphereGeometry(.375,lowDetail?8:20,lowDetail?5:14,0,Math.PI*2,0,Math.PI*.57),hair,0,1.52,-.02);
 box(.59,.12,.19,hair,0,1.66,.23);}
 const specialHair=cosmetics.hair,propMat=m(cosmetics.propColor??'#b4a0bd');
 if(specialHair==='star-braid'){for(let i=0;i<6;i++)ball(.15-i*.01,hair,Math.sin(i)*.05,1.3-i*.15,-.26);ball(.065,gold,.05,.55,-.27);}
 else if(specialHair==='ribbon-tails'){for(const x of [-.33,.33]){ball(.19,hair,x,1.17,-.14,.9,1.7,.8);box(.19,.1,.12,m('#bb90a8'),x,1.43,-.11);}}
 else if(!customHair){if(data.hairStyle==='long')ball(.34,hair,0,1.2,-.17,1,1.4,.7);if(data.hairStyle==='bun')ball(.21,hair,0,1.74,-.25);}
 for(const x of [-.12,.12]){ball(.028,m(({brown:'#57463e',green:'#557665',blue:'#567993',violet:'#78638a'})[data.eyes]??'#57463e'),x,1.46,.323);ball(.035,m('#bb8290'),x*1.5,1.35,.31,1,.5,.25);}
 if(data.accessory==='glasses'&&cosmetics.face!=='reading-glasses')for(const x of [-.13,.13])mesh(new THREE.TorusGeometry(.095,.015,5,20),dark,x,1.47,.345);
 if(data.accessory==='hat'){const lift=customHair?.12:0;cyl(.5,.04,gold,0,1.78+lift,0);cyl(.33,.3,coat,0,1.96+lift,0);}
 const legs=[cyl(.08,.4,dark,-.14,.28,0),cyl(.08,.4,dark,.14,.28,0)];for(const leg of legs){const boot=new THREE.Mesh(new THREE.BoxGeometry(.17,.13,.24),dark);boot.position.set(0,-.17,.035);leg.add(boot);}for(const x of [-.32,.32]){const arm=box(.13,.47,.17,coat,x,.89,0);arm.rotation.z=x<0?-.08:.08;ball(.071,skin,x,.61,.02);}box(.18,.23,.11,m('#826c50'),-.35,.65,-.03);
 if(cosmetics.outfit==='forest-cape'){for(const x of [-.27,.27])ball(.13,coat,x,1.11,-.03,1.2,.65,1.2);const cape=mesh(new THREE.ConeGeometry(.4,.8,12,1,true,0,Math.PI*1.45),coat,0,.9,-.12);cape.rotation.y=Math.PI*.3;ball(.06,gold,0,1.21,.29);}
 if(cosmetics.outfit==='moon-coat'){for(const x of [-.18,.18])box(.025,.7,.025,gold,x,.8,.24);}
 if(cosmetics.outfit==='neon-jacket'){const glow=m('#a4e7e6',{emissive:'#8ddadf',emissiveIntensity:.9});for(const x of [-.35,.35])box(.045,.36,.08,glow,x,1,.12);box(.46,.04,.035,glow,0,.55,.18);}
 if(cosmetics.prop==='hand-lantern'){mesh(new THREE.TorusGeometry(.13,.018,5,20),gold,.46,.58,.17);box(.22,.3,.22,propMat,.46,.3,.17);box(.15,.23,.15,m('#f4da98',{emissive:'#f4d69a',emissiveIntensity:1.3}),.46,.3,.19);}
 if(cosmetics.prop==='traveler-book'){const book=box(.28,.4,.13,propMat,.45,.66,.19);book.rotation.z=-.2;box(.22,.33,.14,m('#e3d7bc'),.45,.65,.2);}
 if(cosmetics.prop==='moon-staff'){cyl(.025,1.9,gold,.49,.9,.12);const moon=mesh(new THREE.TorusGeometry(.18,.035,5,24,Math.PI*1.5),m(cosmetics.propColor??'#c7c8de',{emissive:cosmetics.propColor??'#8c91c2',emissiveIntensity:.3}),.49,1.92,.12);moon.rotation.z=-.7;}
 if(cosmetics.prop==='sun-feather'){const feather=new THREE.Group();feather.name='wearable-sun-feather';feather.position.set(.19,1.04,.33);feather.rotation.z=-.5;g.add(feather);for(const [j,color]of ['#e9c238','#e49130','#5a9b57','#477f9c'].entries()){const f=new THREE.Mesh(new THREE.SphereGeometry(.085,6,5),m(color));f.position.y=.22-j*.1;f.scale.set(1,1.3,.18);feather.add(f);}const quill=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.48,5),gold);feather.add(quill);}
 addWearables({g,look:cosmetics,mesh,box,ball,cyl,m,gold,skin,lowDetail});g.userData.legs=legs;g.userData.cosmetics={...cosmetics};animateWearables(g,0,{reducedMotion:true});return g;
}

export function disposeAvatar(group){const geometry=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});geometry.forEach(g=>g.dispose());materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});textures.forEach(t=>t.dispose());}
