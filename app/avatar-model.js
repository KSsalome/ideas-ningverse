import * as THREE from 'three';
import {wearableHair,addWearables,animateWearables as animateOutfit} from './avatar-wearables.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Characters keep the original 2-unit chibi proportions (head centre at
// y 1.45, chest front at z ≈ .16) so every wearable still fits; the detail
// lives in the hair strands, the anime-style face and the tailored outfit.
const HEAD={x:0,y:1.45,z:0,rx:.36,ry:.378,rz:.331};

// A point on (or just off) the head, from azimuth θ (0 = facing forward,
// positive = character's left) and polar angle φ (0 = crown).
export function headPoint(theta,phi,lift=1){
 return new THREE.Vector3(HEAD.x+Math.sin(phi)*Math.sin(theta)*HEAD.rx*lift,HEAD.y+Math.cos(phi)*HEAD.ry*lift,HEAD.z+Math.sin(phi)*Math.cos(theta)*HEAD.rz*lift);
}

// A tapered lock of hair along a curve. It lies flat against the head:
// wide across the surface, thin away from it, narrowing to a soft tip.
export function strandGeometry(points,{width=.08,depth=.035,tip=.12,segments=10,sides=5,bulge=.25}={}){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)),false,'centripetal');
 const center=new THREE.Vector3(HEAD.x,HEAD.y-.05,HEAD.z),positions=[],indices=[];
 const p=new THREE.Vector3(),t=new THREE.Vector3(),out=new THREE.Vector3(),side=new THREE.Vector3(),normal=new THREE.Vector3();
 for(let i=0;i<=segments;i++){
  const u=i/segments;curve.getPointAt(u,p);curve.getTangentAt(u,t);
  out.copy(p).sub(center).normalize();side.crossVectors(t,out).normalize();normal.crossVectors(side,t).normalize();
  // Both ends taper: the root tucks under the hair mass, the tip rounds off.
  const root=.3+.7*THREE.MathUtils.smoothstep(u,0,.22),taper=root*(1-u*(1-tip))*(1+bulge*Math.sin(Math.PI*Math.min(1,u*1.6)));
  for(let k=0;k<sides;k++){const a=k/sides*Math.PI*2,w=Math.cos(a)*width*.5*taper,d=Math.sin(a)*depth*.5*taper;positions.push(p.x+side.x*w+normal.x*d,p.y+side.y*w+normal.y*d,p.z+side.z*w+normal.z*d);}
 }
 for(let i=0;i<segments;i++)for(let k=0;k<sides;k++){const a=i*sides+k,b=i*sides+(k+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function plain(geometry){const g=geometry.index?geometry.toNonIndexed():geometry;for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal')g.deleteAttribute(name);if(!g.attributes.normal)g.computeVertexNormals();return g;}
function merged(list){const g=mergeGeometries(list.map(plain),false);list.forEach(x=>x.dispose());return g;}

// Hair: a shaped cap, side-swept fringe, face-framing side locks, a back
// that depends on the style, a crown sheen band and one stray lock on top.
export function hairGeometry(style='short',lowDetail=false){
 const seg=lowDetail?5:12,sides=lowDetail?4:8,parts=[],sheen=[];
 const s=(points,o={})=>parts.push(strandGeometry(points,{segments:seg,sides,...o}));
 const cap=new THREE.SphereGeometry(.405,lowDetail?10:22,lowDetail?6:14,0,Math.PI*2,0,Math.PI*.45);cap.scale(1,1.02,.95);cap.translate(0,1.5,-.018);parts.push(cap);
 const back=new THREE.SphereGeometry(.4,lowDetail?8:18,lowDetail?5:10,Math.PI,Math.PI,Math.PI*.3,Math.PI*.42);back.scale(1,1.02,.97);back.translate(0,1.45,-.02);parts.push(back);
 // Fringe: seven locks, swept slightly toward the character's right.
 const fringe=lowDetail?4:6;
 for(let i=0;i<fringe;i++){
  const u=i/(fringe-1),theta=-.95+u*1.9,end=1.22+(i%2?.07:0)+Math.abs(theta)*.06;
  s([headPoint(theta*.5,.42,1.13),headPoint(theta*.8,.84,1.17),headPoint(theta*.95-.1,end,1.11)],{width:.24+(i%2)*.03,depth:.11,tip:.38,bulge:.4});
 }
 // Side locks frame the cheeks.
 for(const side of [-1,1]){
  s([headPoint(side*1.0,.62,1.13),headPoint(side*1.2,1.3,1.16),[side*.37,1.17,.09],[side*.33,style==='long'?.98:1.1,.12]],{width:.24,depth:.11,tip:.4,bulge:.45});
  if(!lowDetail)s([headPoint(side*1.35,.7,1.13),headPoint(side*1.5,1.4,1.16),[side*.4,1.18,-.03]],{width:.26,depth:.12,tip:.4,bulge:.45});
 }
 // Long hair gets a solid curtain behind the locks, so the back reads as
 // one mass of hair with strands on top rather than separate strings.
 if(style==='long'){const curtain=new THREE.CylinderGeometry(.37,.34,.5,lowDetail?8:16,1,true,Math.PI*.5+.25,Math.PI-.5);curtain.scale(1,1,.78);curtain.translate(0,1.12,-.05);parts.push(curtain);}
 // Back of the hair.
 const backLocks=lowDetail?5:(style==='long'?9:8);
 for(let i=0;i<backLocks;i++){
  const u=i/(backLocks-1),theta=Math.PI*(.42+u*1.16);
  if(style==='long'){
   const sway=Math.sin(theta);
   s([headPoint(theta,.7,1.13),headPoint(theta,1.55,1.15),[sway*.36,1.05,Math.cos(theta)*.3-.06],[sway*.33,.7+(i%3)*.05,Math.cos(theta)*.27-.1]],{width:.3,depth:.12,tip:.4,bulge:.45});
  }else{
   s([headPoint(theta,.7,1.13),headPoint(theta,1.5,1.16),headPoint(theta*1.01,2.05,1.08)],{width:.3,depth:.13,tip:.42,bulge:.45});
  }
 }
 if(style==='bun'){
  const bun=new THREE.SphereGeometry(.17,lowDetail?8:14,lowDetail?6:10);bun.scale(1,.9,.95);bun.translate(0,1.74,-.24);parts.push(bun);
  for(let i=0;i<(lowDetail?2:4);i++){const a=i/4*Math.PI*2;s([[Math.cos(a)*.16,1.68,-.24+Math.sin(a)*.16],[Math.cos(a+1.2)*.17,1.76,-.24+Math.sin(a+1.2)*.17],[Math.cos(a+2.4)*.1,1.84,-.24+Math.sin(a+2.4)*.1]],{width:.07,depth:.04,tip:.3});}
 }
 // One stray lock at the crown (ahoge).
 if(!lowDetail)s([headPoint(.25,.12,1.06),[.06,1.92,.05],[.13,1.98,.12],[.17,1.93,.18]],{width:.08,depth:.05,tip:.3,segments:8});
 // Sheen: a soft band of light across the crown.
 if(!lowDetail){const band=new THREE.SphereGeometry(.409,24,3,Math.PI*.22,Math.PI*.56,Math.PI*.21,Math.PI*.045);band.scale(1,1.02,.95);band.translate(0,1.5,-.018);sheen.push(band);}
 return{hair:merged(parts),sheen:sheen.length?merged(sheen):null};
}

const irisColors={brown:'#6b4a3a',green:'#4f7a62',blue:'#4c7aa3',violet:'#7a5f99'};

// Anime-style eyes: dark rim, coloured iris with a lighter lower half,
// pupil, two catch-lights and a thick upper lash; brows and a small mouth.
function buildFace(g,data,m,hairColor,lowDetail){
 const face={eyes:[],mouth:null,nextBlink:1500+Math.random()*2000,blinkUntil:0};
 const disc=new THREE.CircleGeometry(1,lowDetail?10:20);
 const surface=(x,y,lift=.004)=>{const nx=(x-HEAD.x)/HEAD.rx,ny=(y-HEAD.y)/HEAD.ry;const z=HEAD.z+HEAD.rz*Math.sqrt(Math.max(0,1-nx*nx-ny*ny));const n=new THREE.Vector3((x-HEAD.x)/HEAD.rx**2,(y-HEAD.y)/HEAD.ry**2,(z-HEAD.z)/HEAD.rz**2).normalize();return{p:new THREE.Vector3(x,y,z).addScaledVector(n,lift),n};};
 const place=(o,x,y,lift)=>{const {p,n}=surface(x,y,lift);o.position.copy(p);o.lookAt(p.clone().add(n));g.add(o);return o;};
 const iris=irisColors[data.eyes]??irisColors.brown,rim=m('#2a2030',{roughness:.6}),irisMat=m(iris,{roughness:.35,emissive:iris,emissiveIntensity:.12}),pupil=m('#16121c',{roughness:.4}),shine=new THREE.MeshBasicMaterial({color:'#ffffff'}),lash=m('#1d1720',{roughness:.7});
 for(const side of [-1,1]){
  const eye=new THREE.Group();eye.name='avatar-eye';place(eye,side*.138,1.405,.003);
  const add=(geo,mat,x,y,z,sx,sy)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,1);eye.add(o);return o;};
  add(disc,rim,0,0,0,.082,.104);
  add(disc,irisMat,0,-.008,.002,.066,.084);
  add(disc,pupil,0,-.002,.004,.03,.044);
  // Catch-lights sit toward the light, the same on both eyes.
  const lights=merged([new THREE.CircleGeometry(.024,12).translate(-.025,.034,0),new THREE.CircleGeometry(.011,8).translate(.028,-.03,0),new THREE.CircleGeometry(.007,6).translate(-.01,-.05,0)]);
  const glints=new THREE.Mesh(lights,shine);glints.position.z=.006;eye.add(glints);
  const lid=new THREE.Mesh(new THREE.TorusGeometry(.082,.016,4,lowDetail?8:14,Math.PI*.9),lash);lid.rotation.z=Math.PI*.05;lid.scale.set(1.06,.66,1);lid.position.set(0,.036,.004);eye.add(lid);
  // A small flick at the outer corner.
  const flick=new THREE.Mesh(new THREE.ConeGeometry(.012,.04,3),lash);flick.position.set(side*.09,.058,.004);flick.rotation.z=side*-1.1;eye.add(flick);
  face.eyes.push(eye);
 }
 // Brows in a darker shade of the hair.
 const brow=new THREE.Color(hairColor).multiplyScalar(.7);
 const browParts=[-1,1].map(side=>{const {p,n}=surface(side*.14,1.53,.006);const b=new THREE.BoxGeometry(.075,.014,.01);const o=new THREE.Object3D();o.position.copy(p);o.lookAt(p.clone().add(n));o.rotateZ(side*-.12);o.updateMatrix();b.applyMatrix4(o.matrix);return b;});
 const brows=new THREE.Mesh(merged(browParts),m('#'+brow.getHexString(),{roughness:.8}));brows.name='avatar-brows';g.add(brows);
 // Mouth: a soft smile.
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.03,.0075,4,lowDetail?6:10,Math.PI*.78),m('#8c4a55',{roughness:.6}));mouth.name='avatar-mouth';place(mouth,0,1.31,.004);mouth.rotateZ(Math.PI+Math.PI*.11);face.mouth=mouth;
 // Blush.
 const blush=new THREE.MeshBasicMaterial({color:'#e59aa5',transparent:true,opacity:.45,depthWrite:false});
 for(const side of [-1,1]){const o=new THREE.Mesh(disc,blush);o.scale.set(.06,.03,1);place(o,side*.215,1.33,.006);}
 return face;
}

// Torso: hips, a nipped waist and a fuller chest, flattened front-to-back.
function torsoGeometry(height,lowDetail){
 const h=height,pts=[[0,0],[.205,0],[.214,h*.12],[.196,h*.34],[.21,h*.6],[.232,h*.82],[.215,h*.95],[.12,h],[0,h]].map(([r,y])=>new THREE.Vector2(r,y));
 const g=new THREE.LatheGeometry(pts,lowDetail?8:18);g.scale(1,1,.155/.232);return g;
}

// Figure proportions: the head and everything on it (hair, face, glasses,
// hats) is enlarged about the neck, so the head is roughly as tall as the
// body. Accessories built for the original head (reading glasses) are
// picked up by height; props and floating effects keep their scale.
export const HEAD_SCALE=1.3,NECK=new THREE.Vector3(0,1.1,0);
function figureHead(g){
 g.updateMatrixWorld(true);const head=new THREE.Group();head.name='avatar-head';head.position.copy(NECK);head.scale.setScalar(HEAD_SCALE);
 const box=new THREE.Box3(),c=new THREE.Vector3();
 for(const o of [...g.children]){
  if(o.userData.keepScale||o.userData.floatingCard)continue;
  let onHead=o.userData.head;
  if(!onHead){box.setFromObject(o);if(box.isEmpty())continue;box.getCenter(c);onHead=c.y>=1.3&&box.min.y>=1.2&&Math.abs(c.x)<.6;}
  if(onHead){o.position.sub(NECK);head.add(o);}
 }
 g.add(head);g.userData.head=head;return head;
}

export default function makeAvatar(data,cosmetics={},lowDetail=false){
 const g=new THREE.Group();g.userData.keepShadow=true;
 const m=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra}),skin=m(data.skin,{roughness:.55}),hairColor=cosmetics.hairColor??data.hair,hair=new THREE.MeshPhysicalMaterial({color:hairColor,roughness:.42,clearcoat:.35,clearcoatRoughness:.4}),dark=m('#27334a'),gold=m('#c5af82',{metalness:.4,roughness:.45});
 const outfitColor=cosmetics.outfit==='tavern-waistcoat'?'#e9dfc8':cosmetics.outfitColor??({'forest-cape':'#698c76','moon-coat':'#d1c7d6','neon-jacket':'#405d74'})[cosmetics.outfit]??data.outfit,coat=m(outfitColor);
 const trimColor=new THREE.Color(outfitColor).multiplyScalar(.62),trim=m('#'+trimColor.getHexString()),cream=m('#ede4d2'),leather=m('#4a382c',{roughness:.7});
 const mesh=(geo,mat,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;},box=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z),ball=(r,mat,x,y,z,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,lowDetail?8:20,lowDetail?5:14),mat,x,y,z);o.scale.set(sx,sy,sz);return o;},cyl=(r,h,mat,x,y,z)=>mesh(new THREE.CylinderGeometry(r,r,h,8),mat,x,y,z);
 const long=cosmetics.outfit==='moon-coat',bodyHeight=long?.84:.61,bodyBase=.84-bodyHeight/2;

 // --- Outfit: tailored jacket with a short flared hem, belt, collar and ribbon.
 const body=mesh(torsoGeometry(bodyHeight,lowDetail),coat,0,bodyBase,0);body.name='avatar-jacket';
 const hemTop=bodyBase+.06,hemLength=long?.26:.15;
 const skirt=mesh(new THREE.CylinderGeometry(.212,.285,hemLength,lowDetail?8:18,1,true),coat,0,hemTop-hemLength/2,0);skirt.scale.z=.7;skirt.material.side=THREE.DoubleSide;skirt.name='avatar-jacket-hem';
 const hemTrim=mesh(new THREE.TorusGeometry(.285,.012,4,lowDetail?8:20),trim,0,hemTop-hemLength,0);hemTrim.rotation.x=Math.PI/2;hemTrim.scale.y=.7;
 const belt=mesh(new THREE.CylinderGeometry(.2,.2,.045,lowDetail?8:18),leather,0,bodyBase+.19,0);belt.scale.z=.69;
 box(.05,.04,.02,gold,0,bodyBase+.19,.142);
 box(.1,.36,.02,cream,0,.91,.158);
 for(const x of [-.1,.1]){const collar=mesh(new THREE.ConeGeometry(.075,.13,3),cream,x,1.105,.152);collar.rotation.set(-.25,0,x<0?2.6:-2.6);collar.scale.z=.3;}
 for(const y of [.74,.86,.98])ball(.016,gold,.0,y,.17);
 if(!cosmetics.outfit){const ribbon=m('#7b2f46',{roughness:.6});for(const x of [-.045,.045]){const bow=mesh(new THREE.ConeGeometry(.05,.07,3),ribbon,x,1.09,.185);bow.rotation.z=x<0?-Math.PI/2:Math.PI/2;bow.scale.z=.4;}ball(.022,ribbon,0,1.09,.19);}

 // --- Head and hair.
 const headStart=g.children.length;
 ball(.36,skin,0,1.45,0,1,1.05,.92);
 const customHair=wearableHair({look:cosmetics,hair,mesh,box,lowDetail,m});
 const specialHair=cosmetics.hair,propMat=m(cosmetics.propColor??'#b4a0bd');
 if(!customHair){
  const style=specialHair?'short':data.hairStyle;
  const {hair:hairGeo,sheen}=hairGeometry(style,lowDetail);const locks=mesh(hairGeo,hair);locks.name='avatar-hair';
  if(sheen){const light=new THREE.Color(hairColor).lerp(new THREE.Color('#ffffff'),.14);const band=mesh(sheen,m('#'+light.getHexString(),{roughness:.35}));band.name='avatar-hair-sheen';band.castShadow=false;}
 }
 if(specialHair==='star-braid'){for(let i=0;i<6;i++)ball(.15-i*.01,hair,Math.sin(i)*.05,1.3-i*.15,-.26);ball(.065,gold,.05,.55,-.27);}
 else if(specialHair==='ribbon-tails'){for(const x of [-.33,.33]){ball(.19,hair,x,1.17,-.14,.9,1.7,.8);box(.19,.1,.12,m('#bb90a8'),x,1.43,-.11);}}

 // --- Face.
 const face=buildFace(g,data,m,hairColor,lowDetail);g.userData.face=face;
 if(data.accessory==='glasses'&&cosmetics.face!=='reading-glasses')for(const x of [-.14,.14])mesh(new THREE.TorusGeometry(.112,.015,5,20),dark,x,1.415,.345);
 if(data.accessory==='hat'){const lift=customHair?.12:.04;cyl(.5,.04,gold,0,1.78+lift,0);cyl(.33,.3,coat,0,1.96+lift,0);}

 const headEnd=g.children.length;for(let n=headStart;n<headEnd;n++)g.children[n].userData.head=true;

 // --- Arms: rounded sleeves with cuffs and mitten hands.
 for(const x of [-.31,.31]){
  const arm=mesh(new THREE.CapsuleGeometry(.08,.24,lowDetail?2:4,lowDetail?6:12),coat,x,.92,0);arm.rotation.z=x<0?-.16:.16;
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.084,.084,.05,lowDetail?6:12),cream);cuff.position.y=-.15;arm.add(cuff);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.078,lowDetail?6:12,lowDetail?4:9),skin);hand.position.y=-.22;hand.scale.set(1,1.05,.95);arm.add(hand);
  const shoulder=ball(.085,coat,x*.93,1.1,0,1,.75,.95);shoulder.name='avatar-shoulder';
 }
 // Satchel.
 const bag=box(.18,.21,.09,leather,-.35,.66,-.03);bag.name='avatar-satchel';box(.18,.05,.095,m('#5d4636'),-.35,.75,-.03);

 // --- Legs: stockings and rounded shoes (animated while walking).
 const legs=[-.11,.11].map(x=>{const leg=mesh(new THREE.CapsuleGeometry(.085,.22,lowDetail?2:4,lowDetail?6:10),dark,x,.3,0);const shoe=new THREE.Mesh(new THREE.SphereGeometry(.115,lowDetail?6:12,lowDetail?4:8),leather);shoe.scale.set(.9,.65,1.25);shoe.position.set(0,-.21,.04);leg.add(shoe);return leg;});

 // --- Cosmetic outfits and props (unchanged placements).
 const propStart=g.children.length;
 if(cosmetics.outfit==='forest-cape'){for(const x of [-.27,.27])ball(.13,coat,x,1.11,-.03,1.2,.65,1.2);const cape=mesh(new THREE.ConeGeometry(.4,.8,12,1,true,0,Math.PI*1.45),coat,0,.9,-.12);cape.rotation.y=Math.PI*.3;ball(.06,gold,0,1.21,.29);}
 if(cosmetics.outfit==='moon-coat'){for(const x of [-.18,.18])box(.025,.7,.025,gold,x,.8,.17);}
 if(cosmetics.outfit==='neon-jacket'){const glow=m('#a4e7e6',{emissive:'#8ddadf',emissiveIntensity:.9});for(const x of [-.35,.35])box(.045,.36,.08,glow,x,1,.06);box(.46,.04,.035,glow,0,.55,.16);}
 if(cosmetics.prop==='hand-lantern'){mesh(new THREE.TorusGeometry(.13,.018,5,20),gold,.46,.58,.17);box(.22,.3,.22,propMat,.46,.3,.17);box(.15,.23,.15,m('#f4da98',{emissive:'#f4d69a',emissiveIntensity:1.3}),.46,.3,.19);}
 if(cosmetics.prop==='traveler-book'){const book=box(.28,.4,.13,propMat,.45,.66,.19);book.rotation.z=-.2;box(.22,.33,.14,m('#e3d7bc'),.45,.65,.2);}
 if(cosmetics.prop==='moon-staff'){cyl(.025,1.9,gold,.49,.9,.12);const moon=mesh(new THREE.TorusGeometry(.18,.035,5,24,Math.PI*1.5),m(cosmetics.propColor??'#c7c8de',{emissive:cosmetics.propColor??'#8c91c2',emissiveIntensity:.3}),.49,1.92,.12);moon.rotation.z=-.7;}
 if(cosmetics.prop==='sun-feather'){const feather=new THREE.Group();feather.name='wearable-sun-feather';feather.position.set(.19,1.04,.33);feather.rotation.z=-.5;g.add(feather);for(const [j,color]of ['#e9c238','#e49130','#5a9b57','#477f9c'].entries()){const f=new THREE.Mesh(new THREE.SphereGeometry(.085,6,5),m(color));f.position.y=.22-j*.1;f.scale.set(1,1.3,.18);feather.add(f);}const quill=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.48,5),gold);feather.add(quill);}
 for(let n=propStart;n<g.children.length;n++)g.children[n].userData.keepScale=true;
 addWearables({g,look:cosmetics,mesh,box,ball,cyl,m,gold,skin,lowDetail});
 figureHead(g);g.userData.legs=legs;g.userData.cosmetics={...cosmetics};animateWearables(g,0,{reducedMotion:true});return g;
}

// Blinking and a gentle change of expression, on top of the outfit
// animation. Blinks are quick (0.12s) every 2.5–6 seconds; reduced motion
// keeps the eyes open.
export function animateWearables(group,now,options={}){
 let changed=animateOutfit(group,now,options);
 const face=group.userData.face;
 if(face&&!options.reducedMotion){
  if(now>=face.nextBlink){face.blinkUntil=now+120;face.nextBlink=now+2500+Math.random()*3500;}
  const closed=now<face.blinkUntil,target=closed?.1:1;
  for(const eye of face.eyes)if(eye.scale.y!==target){eye.scale.y=target;changed=true;}
  const smile=1+.18*Math.max(0,Math.sin(now*.00021));if(face.mouth&&Math.abs(face.mouth.scale.x-smile)>.01){face.mouth.scale.x=smile;changed=true;}
 }
 return changed;
}

export function disposeAvatar(group){const geometry=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});geometry.forEach(g=>g.dispose());materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});textures.forEach(t=>t.dispose());}
