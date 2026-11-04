import * as THREE from 'three';
// All wearables share the original avatar's 2-unit proportions. No extra lights/particles.
export const capeLiningColors={forest:'#86a991',medieval:'#738da7',industrial:'#c18b53',cyber:'#76bed1',gothic:'#71344b',wonder:'#b9a7d4'};
export function wearableHair({look,hair,mesh,box,lowDetail,m}){
 if(!['muse-duotone','archivist-part'].includes(look.hair))return false;
 const mist=m('#9b87b7'),pale=m(look.hairColor??'#c7c9d4'),chestnut=hair,capGeometry=new THREE.SphereGeometry(.38,10,6,0,Math.PI*2,0,Math.PI*.55);
 if(look.hair==='muse-duotone'){const positions=capGeometry.getAttribute('position'),colors=[],silver=new THREE.Color(look.hairColor??'#c7c9d4'),violet=new THREE.Color('#9b87b7');for(let n=0;n<positions.count;n++){const color=silver.clone().lerp(violet,THREE.MathUtils.smoothstep(positions.getX(n),-.25,.25));colors.push(color.r,color.g,color.b);}capGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
 const cap=mesh(capGeometry,look.hair==='muse-duotone'?m('#ffffff',{vertexColors:true}):chestnut,0,1.52,-.025);cap.name='wearable-hair-cap';
 if(look.hair==='muse-duotone'){
  for(const [x,y,z,a]of [[-.24,1.68,.22,-.33],[-.1,1.72,.29,-.4],[.07,1.7,.3,.35],[.22,1.64,.24,.3]]){const lock=box(.16,.23,.13,x<0?pale:mist,x,y,z);lock.rotation.z=a;lock.name='wearable-duotone-lock';}
 }else{
  const lock=box(.4,.14,.19,chestnut,-.06,1.72,.23);lock.rotation.z=.17;lock.name='wearable-archivist-part';
  const side=box(.17,.18,.12,chestnut,.25,1.65,.19);side.rotation.z=-.32;
  const part=box(.018,.025,.2,m('#a17c5c'),.15,1.79,.21);part.rotation.z=.17;
 }return true;
}
export function addWearables({g,look,mesh,box,ball,cyl,m,gold,skin,lowDetail}){
 const bronze=m('#b19360',{metalness:.65,roughness:.42}),cream=m('#e9dfc8'),black=m('#1c2430'),wine=m('#642c40');
 const named=(o,name)=>{o.name=name;return o;};
 const tube=(points,r,material,parent=g)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const o=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(1,points.length*2),r,4,false),material);parent.add(o);return o;
 };
 const star=(r,material,x,y,z)=>{const shape=new THREE.Shape();for(let n=0;n<10;n++){const a=Math.PI/2+n*Math.PI/5,s=n%2?r*.43:r;const px=Math.cos(a)*s,py=Math.sin(a)*s;n?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();return mesh(new THREE.ShapeGeometry(shape),material,x,y,z);};
 const clasp=(kind)=>{named(ball(.055,bronze,0,1.14,.28),'wearable-cape-clasp');if(kind==='moon'){const moon=mesh(new THREE.TorusGeometry(.058,.016,4,12,Math.PI*1.5),bronze,0,1.18,.29);moon.rotation.z=-.7;star(.043,bronze,.075,1.22,.29);}else{const crystal=mesh(new THREE.OctahedronGeometry(.075,0),m('#9c314c',{metalness:.25}),0,1.15,.3);crystal.scale.set(.7,1.3,.5);}};
 if(look.outfit==='six-hour-cape'||look.outfit==='crystal-shawl'){
  const fabric=m(look.outfitColor??(look.outfit==='six-hour-cape'?'#eee2c5':'#292730'));
  const lining=m(look.outfit==='six-hour-cape'?capeLiningColors.wonder:'#642c40',{side:THREE.DoubleSide});
  const cape=named(mesh(new THREE.ConeGeometry(.425,.57,10,1,true,0,Math.PI*1.38),fabric,0,.93,-.12),'wearable-short-cape');cape.rotation.y=Math.PI*.31;
  const inside=mesh(new THREE.ConeGeometry(.41,.55,10,1,true,0,Math.PI*1.38),lining,0,.93,-.12);inside.rotation.y=Math.PI*.31;
  for(const x of [-.26,.26]){const shoulder=box(.22,.1,.33,fabric,x,1.13,-.01);shoulder.rotation.z=x<0?-.13:.13;}
  clasp(look.outfit==='six-hour-cape'?'moon':'crystal');
  if(look.outfit==='six-hour-cape')g.userData.capeLining=lining;
 }
 if(look.outfit==='neocity-coat'){
  const glow=m('#6cd8e7',{emissive:'#59cadb',emissiveIntensity:.8,metalness:.25,roughness:.45});
  for(const x of [-.338,.338]){named(box(.025,.31,.045,glow,x,.94,.113),'wearable-neon-cuff');box(.075,.13,.04,black,x,.77,.11);}
  named(box(.4,.022,.025,glow,0,.56,.17),'wearable-neon-hem');box(.018,.45,.025,glow,0,.86,.184);
  for(const x of [-.14,.14])box(.13,.08,.027,black,x,.76,.18);
 }
 if(look.outfit==='tavern-waistcoat'){
  const wood=m(look.outfitColor??'#493327');
  named(box(.44,.45,.035,wood,0,.86,.177),'wearable-tavern-waistcoat');box(.44,.44,.035,wood,0,.86,-.176);
  for(const x of [-.12,.12]){const lapel=box(.105,.27,.035,wood,x,1.035,.197);lapel.rotation.z=x<0?-.35:.35;}
  box(.023,.36,.023,bronze,0,.84,.208);for(const y of [.73,.85,.97])ball(.017,bronze,.047,y,.213);
  for(const x of [-.047,.047]){const bow=mesh(new THREE.ConeGeometry(.054,.075,3),wine,x,1.1,.23);bow.rotation.z=x<0?-Math.PI/2:Math.PI/2;}
  ball(.025,wine,0,1.1,.24);
 }
 if(look.face==='reading-glasses'){
  const frame=m(look.faceColor??'#b39659',{metalness:.65,roughness:.32});
  for(const x of [-.13,.13]){named(mesh(new THREE.TorusGeometry(.098,.009,4,lowDetail?12:20),frame,x,1.47,.355),'wearable-reading-glasses');tube([[x*1.8,1.48,.32],[x*2.45,1.48,.15],[x*2.5,1.45,.02]],.008,frame);}
  box(.065,.012,.014,frame,0,1.49,.355);
 }
 if(look.body==='sun-feather'){
  const feather=new THREE.Group();feather.name='wearable-sun-feather';feather.position.set(.19,1.04,.33);feather.rotation.z=-.5;g.add(feather);
  for(const [j,color]of ['#e9c238','#e49130','#5a9b57','#477f9c'].entries()){const f=new THREE.Mesh(new THREE.SphereGeometry(.085,6,5),m(color));f.position.y=.22-j*.1;f.scale.set(1,1.3,.18);feather.add(f);}tube([[0,-.24,0],[0,.24,0]],.008,bronze,feather);
 }
 if(look.body==='sun-pin'){
  const feather=new THREE.Group();feather.name='wearable-sun-pin';feather.position.set(.155,1.015,.24);feather.rotation.z=-.45;feather.scale.setScalar(.68);g.add(feather);
  for(const [n,color]of ['#e5b940','#da8c37','#658e51'].entries()){const leaf=new THREE.Mesh(new THREE.OctahedronGeometry(.09,0),m(color));leaf.position.set(n%2?.032:-.02,.13-n*.095,0);leaf.scale.set(.6,1.65,.22);feather.add(leaf);}
  tube([[0,-.15,.01],[0,.22,.01]],.009,bronze,feather);
 }
 if(look.body==='film-camera'){
  const leather=m(look.bodyColor??'#634631'),glass=m('#506575',{metalness:.5,roughness:.2});
  named(box(.29,.2,.16,leather,.305,.68,.215),'wearable-film-camera');box(.3,.045,.17,black,.305,.8,.215);
  const lens=mesh(new THREE.CylinderGeometry(.071,.075,.08,10),bronze,.32,.69,.32);lens.rotation.x=Math.PI/2;
  const lensGlass=mesh(new THREE.CylinderGeometry(.052,.052,.012,10),glass,.32,.69,.368);lensGlass.rotation.x=Math.PI/2;
  box(.065,.035,.03,cream,.215,.744,.305);ball(.017,bronze,.39,.83,.22);
  tube([[-.23,1.15,.155],[.02,.94,.205],[.26,.78,.24]],.012,leather);
 }
 if(look.body==='paint-pouch'){
  const leather=m(look.bodyColor??'#8a6547');named(box(.26,.24,.15,leather,-.3,.62,.18),'wearable-paint-pouch');box(.27,.035,.165,bronze,-.3,.72,.18);
  for(const [n,color]of ['#a86366','#8299ad','#829578'].entries()){
   const x=-.37+n*.065,handle=cyl(.013,.28,bronze,x,.85,.18);handle.rotation.z=(n-1)*.14;
   const tip=mesh(new THREE.ConeGeometry(.024,.065,5),m(color),x+(n-1)*.014,1.02,.18);tip.rotation.z=(n-1)*.14;
  }
  const palette=named(mesh(new THREE.SphereGeometry(.105,8,5),cream,-.23,.64,.29),'wearable-paint-palette');palette.scale.set(1.15,.8,.12);for(const [n,color]of ['#9d4c63','#6b8472','#8b82a3'].entries())ball(.018,m(color),-.29+n*.05,.66,.306);
 }
 if(look.prop==='brass-shaker'){
  const brass=m(look.propColor??'#af8751',{metalness:.65,roughness:.32});
  const prop=new THREE.Group();prop.name='wearable-brass-shaker';prop.position.set(.405,.64,.13);prop.rotation.z=-.15;g.add(prop);
  const add=(geo,mat,y)=>{const o=new THREE.Mesh(geo,mat);o.position.y=y;prop.add(o);return o;};
  add(new THREE.CylinderGeometry(.075,.056,.25,10),brass,-.04);add(new THREE.CylinderGeometry(.052,.076,.07,10),bronze,.12);add(new THREE.CylinderGeometry(.035,.035,.055,8),brass,.18);
  for(const y of [-.16,.07]){const rim=add(new THREE.TorusGeometry(y<0?.057:.074,.008,4,10),bronze,y);rim.rotation.x=Math.PI/2;}
 }
 if(look.effect==='zero-card'){
  const card=new THREE.Group();card.name='wearable-zero-card';card.position.set(.45,1.3,-.45);card.rotation.y=-.2;card.rotation.z=.13;g.add(card);
  const violet=m(look.effectColor??'#45305f',{emissive:'#6b458f',emissiveIntensity:.25}),rune=m('#d2b4eb',{emissive:'#bc8aee',emissiveIntensity:.85,side:THREE.DoubleSide});
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.26,.43,.018),violet);card.add(panel);
  for(const [w,h,x,y]of [[.28,.012,0,.22],[.28,.012,0,-.22],[.012,.44,-.134,0],[.012,.44,.134,0]]){const rim=new THREE.Mesh(new THREE.BoxGeometry(w,h,.025),bronze);rim.position.set(x,y,0);card.add(rim);}
  for(const side of [-1,1]){
   const moon=new THREE.Mesh(new THREE.TorusGeometry(.065,.009,4,12,Math.PI*1.5),rune);moon.position.set(0,.04,side*.017);moon.rotation.z=-.6;card.add(moon);
   const mark=new THREE.Mesh(new THREE.OctahedronGeometry(.032,0),rune);mark.position.set(0,-.12,side*.02);mark.scale.set(.6,1.2,.1);card.add(mark);
  }
  // One soft transparent low-poly halo, instead of a point light or particle system.
  if(!lowDetail){const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const n=(y*32+x)*4,d=Math.hypot((x-15.5)/16,(y-15.5)/16);pixels[n]=pixels[n+1]=pixels[n+2]=255;pixels[n+3]=Math.round(Math.max(0,1-d)**2*255);}
   const texture=new THREE.DataTexture(pixels,32,32,THREE.RGBAFormat);texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
   const halo=new THREE.Mesh(new THREE.PlaneGeometry(.52,.7),new THREE.MeshBasicMaterial({map:texture,color:'#b288df',transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));halo.name='wearable-tarot-soft-halo';halo.position.z=-.025;card.add(halo);
  }
  g.userData.floatingCard=card;
 }
}
let cachedPhase='wonder',checkedAt=-Infinity;
export function animateWearables(group,now,{phase,reducedMotion=false,wallTime=Date.now()}={}){
 let changed=false;
 if(group.userData.capeLining){
  if(!phase){if(wallTime-checkedAt>=30000||wallTime<checkedAt){const hour=new Date(wallTime+8*3600000).getUTCHours();cachedPhase=hour>=8&&hour<11?'forest':hour>=11&&hour<14?'medieval':hour>=14&&hour<17?'industrial':hour>=17&&hour<23?'cyber':hour>=23||hour<4?'gothic':'wonder';checkedAt=wallTime;}phase=cachedPhase;}
  if(group.userData.liningPhase!==phase){group.userData.capeLining.color.set(capeLiningColors[phase]??capeLiningColors.wonder);group.userData.liningPhase=phase;changed=true;}
 }
 const card=group.userData.floatingCard;if(card&&!reducedMotion){card.position.y=1.3+Math.sin(now*.00065)*.055;card.rotation.y=-.2+Math.sin(now*.00036)*.2;card.rotation.z=.13+Math.sin(now*.00045)*.045;changed=true;}
 return changed;
}
