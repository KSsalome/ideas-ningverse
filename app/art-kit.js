import * as THREE from 'three';

export const artThemes={
 wonder:{sky:'#67768e',fog:'#758497',ivory:'#eee5d4',stone:'#b7a9a2',cliff:'#696e81',navy:'#4b506f',gold:'#d7b87c',leaf:'#78988b',light:'#ffe9be',magic:'#acd9ff',exposure:.86},
 forest:{sky:'#526779',fog:'#69808d',ivory:'#e8e3cc',stone:'#aea99b',cliff:'#5d6c75',navy:'#344b58',gold:'#c4ac70',leaf:'#698a77',light:'#ffedb9',magic:'#b5e6de',exposure:.88},
 medieval:{sky:'#536278',fog:'#738093',ivory:'#efe3ce',stone:'#b8aa97',cliff:'#656c7a',navy:'#344563',gold:'#d6b576',leaf:'#71826b',light:'#ffe6ad',magic:'#a8d9ff',exposure:.9},
 industrial:{sky:'#344258',fog:'#566176',ivory:'#e8dcc6',stone:'#b5a795',cliff:'#606779',navy:'#263b5c',gold:'#c9a368',leaf:'#748375',light:'#ffe1a1',magic:'#80cfff',exposure:.88},
 cyber:{sky:'#17283f',fog:'#354861',ivory:'#d8dce0',stone:'#919aa9',cliff:'#3e5065',navy:'#203858',gold:'#c9b381',leaf:'#557b7b',light:'#ffe4b7',magic:'#75ddff',exposure:.84},
 gothic:{sky:'#161d32',fog:'#354057',ivory:'#c5bfc1',stone:'#98919d',cliff:'#434658',navy:'#292b48',gold:'#bd9f74',leaf:'#50686a',light:'#ffda9c',magic:'#a8baff',exposure:.8},
};
export function seeded(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export default function artKit({lowDetail=false,phase='industrial',palette={}}={}){
 const theme={...(artThemes[phase]??artThemes.industrial),...palette},materials=new Map(),geometries=new Map(),animations=[],TAU=Math.PI*2;
 function mat(color,type='stone',extra={}){
  const key=JSON.stringify([color,type,extra]);if(materials.has(key))return materials.get(key);let m;
  if(type==='glow')m=new THREE.MeshBasicMaterial({color,toneMapped:true,side:THREE.DoubleSide,...extra});
  else if(type==='gem'&&!lowDetail)m=new THREE.MeshPhysicalMaterial({color,roughness:.24,metalness:.08,transmission:.25,thickness:.5,ior:1.45,clearcoat:.3,envMapIntensity:.4,emissive:theme.magic,emissiveIntensity:.08,...extra});
  else if(lowDetail)m=new THREE.MeshLambertMaterial({color,side:THREE.FrontSide,...extra});
  else m=new THREE.MeshStandardMaterial({color,roughness:type==='metal'?.4:type==='glass'?.36:type==='marble'?.68:type==='cloth'?.96:.88,metalness:type==='metal'?.68:type==='glass'?.12:0,side:THREE.FrontSide,...extra});
  m.userData.bloom=type==='glow'&&!extra.transparent;if(type==='glow'&&!lowDetail)m.color.multiplyScalar(1.3);materials.set(key,m);return m;
 }
 const ivory=mat(theme.ivory,'marble'),stone=mat(theme.stone),gold=mat(theme.gold,'metal'),navy=mat(theme.navy),dark=mat('#25334a'),warm=mat(theme.light,'glow'),magic=mat(theme.magic,'glow'),wood=mat('#826b53');
 function geo(key,make){if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);}
 function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=!lowDetail&&material!==warm&&material!==magic;m.receiveShadow=!lowDetail;parent.add(m);return m;}
 function box(w,h,d,material,parent,x=0,y=0,z=0){const nx=lowDetail?Math.max(1,Math.ceil(w/2.2)):1,ny=lowDetail?Math.max(1,Math.ceil(h/2.2)):1,nz=lowDetail?Math.max(1,Math.ceil(d/2.2)):1;const m=mesh(geo('box'+nx+','+ny+','+nz,()=>new THREE.BoxGeometry(1,1,1,nx,ny,nz)),material,parent,x,y,z);m.scale.set(w,h,d);return m;}
 function cyl(top,bottom,h,material,parent,x=0,y=0,z=0,n=lowDetail?12:32){return mesh(geo(`c${top},${bottom},${h},${n}`,()=>new THREE.CylinderGeometry(top,bottom,h,n)),material,parent,x,y,z);}
 function ball(r,material,parent,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=mesh(geo('ball',()=>new THREE.IcosahedronGeometry(1,lowDetail?0:1)),material,parent,x,y,z);m.scale.set(r*sx,r*sy,r*sz);return m;}
 function cone(r,h,material,parent,x=0,y=0,z=0,n=lowDetail?6:12){return cyl(0,r,h,material,parent,x,y,z,n);}
 function line(points,material,parent,thickness=.025){const pts=points.map(p=>new THREE.Vector3(...p));if(lowDetail){const c=material.color.getHexString(),key='line'+c;if(!materials.has(key))materials.set(key,new THREE.LineBasicMaterial({color:material.color,linewidth:1.3,transparent:material.transparent,opacity:material.opacity}));const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),materials.get(key));parent.add(o);return o;}const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',.05),m=mesh(new THREE.TubeGeometry(curve,Math.max(2,pts.length*2),thickness,4,false),material,parent);return m;}
 function ring(r,t,material,parent,x=0,y=0,z=0,arc=TAU){if(lowDetail){const pts=Array.from({length:33},(_,n)=>[Math.cos(n/32*arc)*r,Math.sin(n/32*arc)*r,0]),o=line(pts,material,parent,t);o.position.set(x,y,z);return o;}return mesh(geo(`r${r},${t},${arc}`,()=>new THREE.TorusGeometry(r,t,5,48,arc)),material,parent,x,y,z);}
 function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
 function star(r,material,parent,x=0,y=0,z=0){const shape=new THREE.Shape();for(let n=0;n<8;n++){const a=n/8*TAU,rad=n%2?r*.2:r;const px=Math.sin(a)*rad,py=Math.cos(a)*rad;n?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();return mesh(new THREE.ShapeGeometry(shape),material,parent,x,y,z);}
 function pointedShape(w,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h*.58);s.bezierCurveTo(-w/2,h*.8,-w*.2,h*.94,0,h);s.bezierCurveTo(w*.2,h*.94,w/2,h*.8,w/2,h*.58);s.lineTo(w/2,0);s.closePath();return s;}
 function pointedOutline(w,h){const shape=pointedShape(w,h);return shape.getPoints(lowDetail?5:12).map(p=>[p.x,p.y,0]);}
 function windowArch(parent,x,y,z,w,h,{door=false,glass=warm,ornate=true}={}){
  const g=group(parent,x,y,z);g.name='recessed-arch-window';
  // The reveal is real geometry: the glazing sits behind an extruded stone arch.
  const pane=glass.userData.bloom||glass===warm||glass===magic?mat(glass===warm?'#9b8769':'#50738a','glass',lowDetail?{}:{emissive:glass===warm?theme.light:theme.magic,emissiveIntensity:door?.08:.045}):glass;
  mesh(new THREE.ShapeGeometry(pointedShape(w+.1,h+.07),lowDetail?5:12),dark,g,0,0,.012);
  mesh(new THREE.ShapeGeometry(pointedShape(w,h),lowDetail?5:12),pane,g,0,.04,.035).name='window-glazing';
  const frame=pointedShape(w+.34,h+.23),hole=new THREE.Path(pointedShape(w,h).getPoints(lowDetail?5:12).map(p=>new THREE.Vector2(p.x,p.y+.08)));frame.holes.push(hole);
  const reveal=mesh(new THREE.ExtrudeGeometry(frame,{depth:.22,bevelEnabled:!lowDetail,bevelSize:.025,bevelThickness:.018,bevelSegments:1,steps:1,curveSegments:lowDetail?5:12}),ivory,g);reveal.name='stone-arch-reveal';
  line(pointedOutline(w+.42,h+.28).map(([a,b])=>[a,b,.2]),stone,g,.045);
  line(pointedOutline(w,h).map(([a,b])=>[a,b+.08,.24]),gold,g,.025);
  box(w+.65,.15,.52,stone,g,0,-.06,.08);box(w+.46,.09,.38,ivory,g,0,-.18,.04);
  if(ornate){box(.055,h*.7,.12,gold,g,0,h*.35,.16);for(const dx of [-w*.23,w*.23])ring(w*.23,.024,gold,g,dx,h*.58,.17);line([[-w/2,h*.48,.18],[0,h*.72,.18],[w/2,h*.48,.18]],gold,g,.028);if(!lowDetail)for(const dx of [-.3,.3])line([[dx*w,.08,.16],[dx*w,h*.45,.16],[0,h*.72,.16]],gold,g,.018);}
  if(door){for(const dx of [-1,1]){box(.22,h*.7,.4,stone,g,dx*(w*.5+.23),h*.35,.04);box(.3,.15,.48,ivory,g,dx*(w*.5+.23),h*.67,.05);cone(.2,.65,gold,g,dx*(w*.5+.23),h*.78,.04,4);ring(Math.min(.12,w*.075),.022,gold,g,dx*w*.15,h*.27,.24);}star(w*.07,gold,g,0,h*.86,.25);}
  if(lowDetail)g.traverse(o=>{if(o.isMesh||o.isLine)o.renderOrder=10;});return g;
 }
 function banner(parent,x,y,z,w=1,h=3,angle=0){
  const g=group(parent,x,y,z);g.name='burgundy-banner';g.rotation.y=angle;
  const fold=(a,b)=>Math.sin((a/w+.5)*Math.PI*4)*.035+Math.sin(b/h*4+a*3)*.012;
  const positions=[],uvs=[],indices=[],cols=lowDetail?6:12,rows=lowDetail?4:12;
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){const a=(col/cols-.5)*w,b=-row/rows*h*(1-.36*Math.abs(a)/w);positions.push(a,b,fold(a,b));uvs.push(col/cols,row/rows);}
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const cloth=mesh(geometry,mat('#4b1b2b','cloth',{side:THREE.DoubleSide}),g);cloth.name='burgundy-cloth';
  const points=[[-w/2,0],[-w/2,-h*.82],[0,-h],[w/2,-h*.82],[w/2,0]];line([...points,points[0]].map(([a,b])=>[a,b,fold(a,b)+.02]),gold,g,.02);
  box(w*1.25,.06,.08,gold,g,0,.08,.02);for(const s of [-1,1])ball(.055,gold,g,s*w*.65,.08,.02);
  line([[-w*.34,-.14,.07],[-w*.34,-h*.75,.07],[0,-h*.9,.07],[w*.34,-h*.75,.07],[w*.34,-.14,.07]],gold,g,.012);
  ring(w*.24,.016,gold,g,0,-h*.43,.08);star(w*.3,gold,g,0,-h*.43,.09);line([[0,-h*.18,.09],[0,-h*.75,.09]],gold,g,.014);cone(.055,.2,gold,g,0,-h-.12,.01,5);return g;
 }
 function lantern(parent,x,y,z,h=2.7){const g=group(parent,x,y,z);cyl(.2,.27,.15,stone,g,0,.08,0,8);cyl(.055,.08,h-.45,gold,g,0,h*.47,0,6);cyl(.17,.24,.14,gold,g,0,h-.45,0,6);box(.34,.52,.34,warm,g,0,h-.14,0);if(!lowDetail)for(const dx of [-.2,.2])for(const dz of [-.2,.2])box(.035,.6,.035,gold,g,dx,h-.13,dz);cone(.36,.28,gold,g,0,h+.25,0,4);ball(.055,gold,g,0,h+.45,0);return g;}
 function pedestal(parent,x,y,z,r=2,h=.6){const g=group(parent,x,y,z);cyl(r,r*1.12,h,ivory,g,0,h/2,0);cyl(r*1.09,r*1.09,.08,gold,g,0,.14,0);cyl(r*.94,r,.1,ivory,g,0,h+.05,0);return g;}
 function armillary(parent,x,y,z,r=2,{blue=true,spin=true}={}){const g=group(parent,x,y,z);g.name='golden-armillary';const inner=group(g);if(spin){inner.userData.dynamic=true;animations.push({object:inner,kind:'rotate',speed:.00014});}for(let n=0;n<3;n++){const orbit=ring(r*(1+n*.18),.045,gold,inner);orbit.rotation.set(n*.65+.25,n*.55,Math.PI*(n*.19+.08));if(!lowDetail){for(let j=0;j<4;j++){const a=j/4*TAU;star(.12,gold,orbit,Math.cos(a)*r*(1+n*.18),Math.sin(a)*r*(1+n*.18),.05);}}}const crystal=mesh(new THREE.OctahedronGeometry(r*.42),blue?mat(theme.magic,'gem'):gold,g);crystal.scale.y=1.6;ball(r*.13,warm,g,0,0,0);star(r*.24,blue?magic:warm,g,0,0,r*.44);return g;}
 function tree(parent,x,y,z,size=1,type='round',seed=1){const g=group(parent,x,y,z);g.scale.setScalar(size);cyl(.1,.18,1.8,wood,g,0,.9,0,5);const leaf=mat(theme.leaf),shade=mat(new THREE.Color(theme.leaf).multiplyScalar(.78).getStyle());leaf.userData.vegetation=shade.userData.vegetation=true;if(type==='cypress'){cone(.7,3.2,leaf,g,0,2.5,0,lowDetail?5:8);if(!lowDetail)cone(.58,2.1,shade,g,.1,2.9,.1,7);}else{const r=seeded(seed);ball(1,leaf,g,0,2.3,0,.9,1.25,.9);if(!lowDetail)for(let n=0;n<4;n++)ball(.65,n%2?leaf:shade,g,(r()-.5)*1.4,2+r()*1.1,(r()-.5)*1.2);}return g;}
 function ivy(parent,x,y,z,length=3,seed=0){for(const color of ['#647f6e','#6b856d','#a1a178'])mat(color).userData.vegetation=true;const rand=seeded(seed),g=group(parent,x,y,z);const pts=[];for(let n=0;n<=8;n++)pts.push([Math.sin(n*1.3)*.15,-n*length/8,.04]);line(pts,mat('#647f6e'),g,.018);for(let n=0;n<(lowDetail?5:12);n++){const yy=-n*length/(lowDetail?5:12);const leaf=ball(.16,mat(n%3?'#6b856d':'#a1a178'),g,(n%2?1:-1)*(.2+rand()*.12),yy,.08,1.4,.6,.25);leaf.rotation.z=n*.7;}return g;}
 function crystal(parent,x,y,z,size=1,color='#a93a48'){const g=group(parent,x,y,z),m=mat(color,'stone',lowDetail?{}:{metalness:.25,roughness:.22,emissive:color,emissiveIntensity:.24});const shard=mesh(geo('crystal',()=>new THREE.OctahedronGeometry(1)),m,g);shard.scale.set(size*.48,size*1.7,size*.46);line([[0,size*1.7,0],[size*.48,0,0],[0,-size*1.7,0]],gold,g,.018);return g;}
 function stair(parent,x,y,z,width,steps=5,rise=.18,run=.35,material=ivory){const g=group(parent,x,y,z);for(let n=0;n<steps;n++)box(width+n*.16,rise*(steps-n),run*(n+1),material,g,0,rise*(steps-n)/2,run*(n+1)/2);return g;}
 function sparkles(parent,seed=1,radius=9,height=6,count=14){const g=group(parent),rand=seeded(seed);g.userData.dynamic=true;for(let n=0;n<count;n++){const s=star(.04+rand()*.08,n%4?magic:warm,g,(rand()-.5)*radius*2,1+rand()*height,(rand()-.5)*radius*2);animations.push({object:s,kind:'sparkle',base:s.position.y,offset:rand()*TAU});}return g;}
 function update(now,reduced=false){if(reduced)return;for(const a of animations){if(a.kind==='rotate')a.object.rotation[a.axis??'y']=now*a.speed;else if(a.kind==='float'){a.object.position.y=a.base+Math.sin(now*.00065+a.offset)*.32;a.object.rotation.y=Math.sin(now*.00025+a.offset)*.3;}else{a.object.position.y=a.base+Math.sin(now*.0008+a.offset)*.24;a.object.scale.setScalar(.6+Math.sin(now*.0014+a.offset)*.4);}}}
 return{theme,lowDetail,mat,mesh,box,cyl,ball,cone,line,ring,group,star,windowArch,banner,lantern,pedestal,armillary,tree,ivy,crystal,stair,sparkles,ivory,stone,gold,navy,dark,warm,magic,wood,animations,update,pointedShape};
}
