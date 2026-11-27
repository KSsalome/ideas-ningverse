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
 const seg=lowDetail?6:14,sides=lowDetail?4:8,parts=[],sheen=[];
 const s=(points,o={})=>parts.push(strandGeometry(points,{segments:seg,sides,bulge:.1,...o}));
 // Points that run over the head surface from (θ0,φ0) to (θ1,φ1), so a lock
 // follows the skull instead of cutting across it.
 const along=(t0,p0,t1,p1,l0,l1,n=4)=>Array.from({length:n},(_,k)=>{const u=k/(n-1);return headPoint(t0+(t1-t0)*u,p0+(p1-p0)*u,l0+(l1-l0)*u);});
 // Crown: one smooth piece, as on a figure. Locks begin where it ends.
 // The crown shell is open at the front: the fringe lies there instead,
 // over a slightly smaller under-layer (returned separately, in a deeper
 // shade) that shows through between the locks and gives the hair depth.
 const open=1.05,cap=new THREE.SphereGeometry(.405,lowDetail?12:28,lowDetail?7:16,Math.PI/2+open,Math.PI*2-open*2,0,Math.PI*.47);cap.scale(1,1.02,.95);cap.translate(0,1.5,-.018);parts.push(cap);
 const under=new THREE.SphereGeometry(1,lowDetail?12:28,lowDetail?7:14,0,Math.PI*2,0,1.22);under.scale(HEAD.rx*1.07,HEAD.ry*1.07,HEAD.rz*1.07);under.translate(HEAD.x,HEAD.y,HEAD.z);
 const back=new THREE.SphereGeometry(.402,lowDetail?10:22,lowDetail?5:12,Math.PI,Math.PI,Math.PI*.3,Math.PI*.46);back.scale(1,1.02,.97);back.translate(0,1.45,-.02);parts.push(back);
 // Fringe: parted slightly to one side; locks sweep away from the part and
 // end in soft points just above the brows.
 const fringe=lowDetail?5:8,part=.3;
 for(let i=0;i<fringe;i++){
  const u=i/(fringe-1),theta=-1.0+u*2.0,away=theta<part?-1:1,sweep=away*(.06+Math.abs(theta-part)*.1);
  const tipPhi=1.3+(i%2?.05:0)-Math.abs(theta)*.04;
  // Each lock runs from near the crown down over the forehead.
  s(along(theta*.55+part*.3,.42,theta+sweep,tipPhi,1.14,1.1,6),{width:.22+(i%3)*.025,depth:.055,tip:.07});
 }
 // Side locks fall in front of the ears and frame the cheeks.
 for(const side of [-1,1]){
  s([...along(side*1.1,.7,side*1.3,1.55,1.14,1.1,5),[side*.35,1.12,.1],[side*.31,style==='long'?.92:1.04,.12]],{width:.17,depth:.055,tip:.07});
  if(!lowDetail)s([...along(side*1.45,.75,side*1.6,1.6,1.14,1.1,5),[side*.39,1.12,-.02]],{width:.19,depth:.055,tip:.08});
 }
 if(style==='long'){const curtain=new THREE.CylinderGeometry(.37,.34,.5,lowDetail?8:18,1,true,Math.PI*.5+.25,Math.PI-.5);curtain.scale(1,1,.78);curtain.translate(0,1.12,-.05);parts.push(curtain);}
 // Back: a tucked bob for short hair, long locks to the waist otherwise.
 const backLocks=lowDetail?6:(style==='long'?11:10);
 for(let i=0;i<backLocks;i++){
  const u=i/(backLocks-1),theta=Math.PI*(.5+u),sway=Math.sin(theta);
  if(style==='long')s([...along(theta,.95,theta,1.65,1.13,1.14,4),[sway*.36,1.05,Math.cos(theta)*.3-.06],[sway*.33,.72+(i%3)*.04,Math.cos(theta)*.27-.1]],{width:.26,depth:.06,tip:.12});
  else s(along(theta,.95,theta*1.01,2.05+(i%2)*.06,1.13,1.0,6),{width:.24,depth:.06,tip:.12});
 }
 if(style==='bun'){
  const bun=new THREE.SphereGeometry(.17,lowDetail?8:16,lowDetail?6:12);bun.scale(1,.9,.95);bun.translate(0,1.74,-.24);parts.push(bun);
  for(let i=0;i<(lowDetail?2:5);i++){const a=i/5*Math.PI*2;s([[Math.cos(a)*.15,1.66,-.24+Math.sin(a)*.15],[Math.cos(a+1.1)*.175,1.75,-.24+Math.sin(a+1.1)*.175],[Math.cos(a+2.2)*.11,1.85,-.24+Math.sin(a+2.2)*.11]],{width:.08,depth:.035,tip:.15});}
 }
 // One stray lock at the crown (ahoge).
 if(!lowDetail)s([headPoint(.25,.12,1.08),[.05,1.93,.05],[.12,1.99,.12],[.17,1.94,.18]],{width:.06,depth:.035,tip:.08,segments:10});
 // Shine comes from the clearcoat on the hair material.
 return{hair:merged(parts),under,sheen:sheen.length?merged(sheen):null};
}

const irisColors={brown:'#a0673f',green:'#3f9a7a',blue:'#3f86c9',violet:'#8a68c8'};

// Figure-style painted eye, generated pixel by pixel (no canvas needed, so
// it also works in tests): a tall oval with a gradient iris that is deep at
// the top and clear at the bottom, a bright reflection along the lower rim,
// a soft pupil, one large and one small catch-light, a thick upper lash line
// with a flick at the outer corner and a short lower lash.
const eyeTextures=new Map();
export function eyeTexture(color='#3f86c9',size=128){
 const key=color+size;if(eyeTextures.has(key))return eyeTextures.get(key);
 const c=new THREE.Color(color),deep=c.clone().multiplyScalar(.32),clear=c.clone().lerp(new THREE.Color('#ffffff'),.55),lash=new THREE.Color('#2a1f2c'),white=new THREE.Color('#fbfaff');
 const data=new Uint8Array(size*size*4),px=new THREE.Color(),smooth=(a,b,v)=>THREE.MathUtils.smoothstep(v,a,b);
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){
  // x: inner corner -1 → outer corner +1, y: bottom -1 → top +1
  const x=(i+.5)/size*2-1,y=(j+.5)/size*2-1;
  const eye=Math.hypot(x/.66,(y+.02)/.84),iris=Math.hypot(x/.56,(y+.08)/.74);
  let a=0;px.setRGB(0,0,0);
  if(eye<1){
   a=1;px.copy(white).lerp(new THREE.Color('#d9dcf0'),smooth(.2,.95,y));
   if(iris<1){const t=smooth(-.75,.75,-y);px.copy(deep).lerp(c,smooth(0,.55,t)).lerp(clear,smooth(.55,1,t));
    const ring=smooth(.82,1,iris);px.lerp(deep,ring*.7);
    const pupil=Math.hypot(x/.2,(y-.02)/.3);px.lerp(deep.clone().multiplyScalar(.6),1-smooth(.75,1,pupil));
    const reflect=Math.hypot(x/.42,(y+.5)/.16);px.lerp(clear.clone().lerp(new THREE.Color('#ffffff'),.4),(1-smooth(.6,1,reflect))*.75);}
   // shade under the lash
   px.lerp(deep,smooth(.55,.98,y)*smooth(.4,1,eye)*.4);
  }
  // upper lash: a thick band along the top of the oval, heavier toward the outer corner
  const top=y-.84*Math.sqrt(Math.max(0,1-(x/.66)**2))+.02,thick=.13+.09*smooth(-.2,1,x);
  if(Math.abs(x)<.72&&top>-thick&&top<.05&&y>-.05){a=1;px.copy(lash);}
  // outer flick
  const fx=x-.6,fy=y-.62;if(fx>-.05&&fx<.3&&fy>-.12+fx*.25&&fy<.02+fx*.55){a=1;px.copy(lash);}
  // short lower lash at the outer bottom
  const bottom=y+.86*Math.sqrt(Math.max(0,1-(x/.66)**2));if(x>.25&&x<.62&&Math.abs(bottom)<.035){a=1;px.copy(lash);}
  // catch-lights
  if(Math.hypot((x+.2)/.17,(y-.3)/.2)<1||Math.hypot((x-.24)/.07,(y+.3)/.07)<1){a=1;px.setRGB(1,1,1);}
  const o=(j*size+i)*4;data[o]=Math.round(Math.min(1,px.r)**(1/2.2)*255);data[o+1]=Math.round(Math.min(1,px.g)**(1/2.2)*255);data[o+2]=Math.round(Math.min(1,px.b)**(1/2.2)*255);data[o+3]=a*255;
 }
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearFilter;t.needsUpdate=true;eyeTextures.set(key,t);return t;
}

function buildFace(g,data,m,hairColor,lowDetail){
 const face={eyes:[],mouth:null,nextBlink:1500+Math.random()*2000,blinkUntil:0};
 const disc=new THREE.CircleGeometry(1,lowDetail?10:20);
 const surface=(x,y,lift=.004)=>{const nx=(x-HEAD.x)/HEAD.rx,ny=(y-HEAD.y)/HEAD.ry;const z=HEAD.z+HEAD.rz*Math.sqrt(Math.max(0,1-nx*nx-ny*ny));const n=new THREE.Vector3((x-HEAD.x)/HEAD.rx**2,(y-HEAD.y)/HEAD.ry**2,(z-HEAD.z)/HEAD.rz**2).normalize();return{p:new THREE.Vector3(x,y,z).addScaledVector(n,lift),n};};
 const place=(o,x,y,lift)=>{const {p,n}=surface(x,y,lift);o.position.copy(p);o.lookAt(p.clone().add(n));g.add(o);return o;};
 const eyeMat=new THREE.MeshBasicMaterial({map:eyeTexture(irisColors[data.eyes]??irisColors.brown),transparent:true,alphaTest:.5,toneMapped:false});
 // Slightly curved so the painted eye hugs the face.
 const eyeGeo=new THREE.PlaneGeometry(1,1,6,6);{const pos=eyeGeo.attributes.position;for(let n=0;n<pos.count;n++){const x=pos.getX(n);pos.setZ(n,-x*x*.12);}eyeGeo.computeVertexNormals();}
 for(const side of [-1,1]){
  const eye=new THREE.Mesh(eyeGeo,eyeMat);eye.name='avatar-eye';eye.scale.set(.19*side,.2,1);place(eye,side*.138,1.4,.004);
  face.eyes.push(eye);
 }
 // Short, light brows set high, in a soft shade of the hair.
 const brow=new THREE.Color(hairColor).lerp(new THREE.Color('#6b5050'),.3);
 const browParts=[-1,1].map(side=>{const {p,n}=surface(side*.14,1.535,.006);const b=new THREE.CapsuleGeometry(.007,.06,2,4).rotateZ(Math.PI/2);const o=new THREE.Object3D();o.position.copy(p);o.lookAt(p.clone().add(n));o.rotateZ(side*-.18);o.updateMatrix();b.applyMatrix4(o.matrix);return b;});
 const brows=new THREE.Mesh(merged(browParts),m('#'+brow.getHexString(),{roughness:.8}));brows.name='avatar-brows';g.add(brows);
 // A small, soft smile.
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.024,.006,4,lowDetail?6:10,Math.PI*.8),m('#c76a76',{roughness:.6}));mouth.name='avatar-mouth';place(mouth,0,1.305,.004);mouth.rotateZ(Math.PI+Math.PI*.1);face.mouth=mouth;
 // Blush with soft edges.
 const blush=new THREE.MeshBasicMaterial({color:'#ff9fae',transparent:true,opacity:.35,depthWrite:false});
 for(const side of [-1,1]){const o=new THREE.Mesh(disc,blush);o.scale.set(.065,.03,1);place(o,side*.215,1.33,.006);}
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
 // Fresh, airy palette: colours are lifted toward white and given a faint
 // glow of their own, so shadows on the figure stay light and clear.
 const soft=(color,lift=.2)=>'#'+new THREE.Color(color).lerp(new THREE.Color('#ffffff'),lift).getHexString();
 const m=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,emissive:color,emissiveIntensity:.06,...extra});
 const skinTone=soft(data.skin,.22),skin=m(skinTone,{roughness:.5,emissive:'#ff9c8c',emissiveIntensity:.07});
 const hairColor=cosmetics.hairColor??data.hair,hairTone=soft(hairColor,.04),hair=new THREE.MeshPhysicalMaterial({color:hairTone,roughness:.4,clearcoat:.45,clearcoatRoughness:.3,emissive:hairTone,emissiveIntensity:.05});
 const dark=m('#3d4660'),gold=m('#e2cd9c',{metalness:.35,roughness:.4});
 // Chosen colours stay exactly as picked; a soft self-glow keeps them airy.
 const outfitColor=cosmetics.outfit==='tavern-waistcoat'?'#e9dfc8':cosmetics.outfitColor??({'forest-cape':'#698c76','moon-coat':'#d1c7d6','neon-jacket':'#405d74'})[cosmetics.outfit]??data.outfit,coat=m(outfitColor,{emissiveIntensity:.16,roughness:.75});
 const trim=m('#fffaf3'),cream=m('#fbf7ef'),leather=m('#9a7a63',{roughness:.6}),stockings=m('#5b6685');
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
 if(!cosmetics.outfit){const ribbon=m('#f2a0b4',{roughness:.55});for(const x of [-.045,.045]){const bow=mesh(new THREE.ConeGeometry(.05,.07,3),ribbon,x,1.09,.185);bow.rotation.z=x<0?-Math.PI/2:Math.PI/2;bow.scale.z=.4;}ball(.022,ribbon,0,1.09,.19);}

 // --- Head and hair.
 const headStart=g.children.length;
 ball(.36,skin,0,1.45,0,1,1.05,.92);
 const customHair=wearableHair({look:cosmetics,hair,mesh,box,lowDetail,m});
 const specialHair=cosmetics.hair,propMat=m(cosmetics.propColor??'#b4a0bd');
 if(!customHair){
  const style=specialHair?'short':data.hairStyle;
  const {hair:hairGeo,under,sheen}=hairGeometry(style,lowDetail);const locks=mesh(hairGeo,hair);locks.name='avatar-hair';
  const inner=mesh(under,m('#'+new THREE.Color(hairTone).multiplyScalar(.62).getHexString(),{roughness:.6,emissiveIntensity:.02}));inner.name='avatar-hair-under';
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
 const bag=box(.18,.21,.09,leather,-.35,.66,-.03);bag.name='avatar-satchel';box(.18,.05,.095,m('#b39278'),-.35,.75,-.03);

 // --- Legs: stockings and rounded shoes (animated while walking).
 const legs=[-.11,.11].map(x=>{const leg=mesh(new THREE.CapsuleGeometry(.085,.22,lowDetail?2:4,lowDetail?6:10),stockings,x,.3,0);const shoe=new THREE.Mesh(new THREE.SphereGeometry(.115,lowDetail?6:12,lowDetail?4:8),leather);shoe.scale.set(.9,.65,1.25);shoe.position.set(0,-.21,.04);leg.add(shoe);return leg;});

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
  for(const eye of face.eyes){const y=.2*target;if(eye.scale.y!==y){eye.scale.y=y;changed=true;}}
  const smile=1+.18*Math.max(0,Math.sin(now*.00021));if(face.mouth&&Math.abs(face.mouth.scale.x-smile)>.01){face.mouth.scale.x=smile;changed=true;}
 }
 return changed;
}

export function disposeAvatar(group){const geometry=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});geometry.forEach(g=>g.dispose());materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});textures.forEach(t=>t.dispose());}
