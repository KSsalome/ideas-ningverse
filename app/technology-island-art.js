import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import artKit,{seeded} from './art-kit.js';
import techMaterials,{techPalette,radialLightTexture} from './tech-materials.js';
import technologyInfrastructure from './technology-infrastructure.js';
import {technologyProfiles,constructionFraction,technologyWindowGrid} from '../lib/building-appearance.ts';
import {footprint} from '../lib/layout.ts';

const wetReflectionShader={
 name:'WetAsphaltReflection',
 uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},wetMap:{value:null},wetScale:{value:new THREE.Vector2(3,3)},texel:{value:new THREE.Vector2(1/512,1/512)}},
 vertexShader:`uniform mat4 textureMatrix; uniform vec2 wetScale; varying vec4 vUv; varying vec2 vRoadUv; varying vec3 vView; varying vec3 vNormal;
 void main(){vUv=textureMatrix*vec4(position,1.0);vRoadUv=position.xy*wetScale;vec4 mv=modelViewMatrix*vec4(position,1.0);vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D wetMap;uniform vec2 texel;varying vec4 vUv;varying vec2 vRoadUv;varying vec3 vView;varying vec3 vNormal;
 void main(){vec2 uv=vUv.xy/vUv.w;float wet=1.0-texture2D(wetMap,vRoadUv).g;float blur=1.0+wet*1.5;vec3 reflected=texture2D(tDiffuse,uv).rgb*.4;reflected+=texture2D(tDiffuse,uv+vec2(texel.x,0.0)*blur).rgb*.15;reflected+=texture2D(tDiffuse,uv-vec2(texel.x,0.0)*blur).rgb*.15;reflected+=texture2D(tDiffuse,uv+vec2(0.0,texel.y)*blur).rgb*.15;reflected+=texture2D(tDiffuse,uv-vec2(0.0,texel.y)*blur).rgb*.15;float graze=1.0-clamp(dot(normalize(vView),normalize(vNormal)),0.0,1.0);float alpha=clamp(.08+wet*.32+graze*.13,.08,.48);gl_FragColor=vec4(min(reflected,vec3(1.35))*.82,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`
};
function seedOf(id){return Array.from(id).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))|0,1229);}

export default function createTechnologyIsland({root,island,projects=[],phase='cyber',lowDetail=false}){
 const k=artKit({phase,lowDetail,palette:{ivory:techPalette.body,stone:techPalette.metal,navy:techPalette.body,gold:'#697483',light:techPalette.yellow}}),m=techMaterials({phase,lowDetail});
 const {mesh,box,cyl,line,ring,group,ball}=k,TAU=Math.PI*2,lamps=[],lightSources=[],spotLights=[],signLights=[];let reflector=null,lastReflection=-Infinity,reflectionEnabled=true;
 const mobile=(typeof innerWidth!=='undefined'&&innerWidth<700)||(typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches),glowTexture=radialLightTexture(),dim=k.mat('#26323e'),darkGlass=m.glass(),paneGeometry=new THREE.PlaneGeometry(1,1);
 root.userData.artDirection='black-glass-neon-city';root.userData.palette={...techPalette};
 function surface(material,x,y,z,w,d,parent=root){const o=mesh(new THREE.PlaneGeometry(w,d),material,parent,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;}
 function neonLine(points,color,parent,width=.025){return line(points,m.neon(color),parent,width);}
 function pool(parent,x,y,z,color,r=1.9,opacity=.18){
  if(lowDetail){for(const [rr,a]of [[r,.035],[r*.67,.055],[r*.35,.09]]){const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:a,depthWrite:false});const o=mesh(new THREE.CircleGeometry(rr,16),mat,parent,x,y+(r-rr)*.003,z);o.rotation.x=-Math.PI/2;o.name='tech-light-pool';o.castShadow=false;}}
  else{const mat=new THREE.MeshBasicMaterial({color,map:glowTexture,transparent:true,opacity,depthWrite:false,toneMapped:true});surface(mat,x,y,z,r*2,r*2,parent).name='tech-light-pool';}
 }
 function reflectionStreak(parent,x,z,color,length=3,width=1.2){if(!lowDetail)return;const g=group(parent,x,.055,z);g.name='tech-reflection-approximation';for(let n=0;n<7;n++){const a=.17*(1-n/7),mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:a,depthWrite:false});surface(mat,Math.sin(n*7)*.13,.003*n,n*length/7,width*(1-n*.07),length/11,g);}}
 function glassPane(parent,x,y,z,w,h,color=null){const pane=mesh(paneGeometry,m.glass(color),parent,x,y,z);pane.scale.set(w,h,1);pane.name='tech-glass-window';pane.userData.techPaneSize={width:w,height:h};pane.castShadow=false;return pane;}
 function lightbox(parent,x,y,z,label,color,{vertical=false,w=1.6,h=.7,angle=0}={}){
  const g=group(parent,x,y,z);g.name='tech-neon-sign';g.rotation.y=angle;g.userData.label=label;
  box(w+.1,h+.1,.15,m.body,g);const board=mesh(new THREE.PlaneGeometry(w,h),m.sign(label,color,{vertical}),g,0,0,.09);board.castShadow=false;
  neonLine([[-w/2,-h/2,.11],[-w/2,h/2,.11],[w/2,h/2,.11],[w/2,-h/2,.11],[-w/2,-h/2,.11]],color,g,.018);
  for(const yy of [-h*.3,h*.3])box(.08,.07,.5,m.steel,g,-w*.35,yy,-.28);
  if(lowDetail){const strokes=vertical?Math.min(label.length,6):3;for(let n=0;n<strokes;n++)box(vertical?w*.48:w*.65,.035,.02,m.neon(color),g,0,(n-(strokes-1)/2)*h/(strokes+1),.12);}
  return g;
 }
 function roadLamp(parent,x,y,z,h=5.8,angle=0,double=false){
  const g=group(parent,x,y,z);g.name='tech-highway-road-lamp';g.rotation.y=angle;g.userData.fixture='highway-cantilever';
  cyl(.19,.29,.17,m.steel,g,0,.08,0,8);cyl(.055,.105,h-.5,m.steel,g,0,(h-.5)/2,0,8);box(.25,.55,.18,dim,g,0,.9,.08);
  for(const side of double?[-1,1]:[1]){line([[0,h-.9,0],[0,h-.4,0],[side*.24,h-.09,0],[side*1.1,h,0],[side*1.65,h,0]],m.steel,g,.055);box(1.05,.15,.38,m.steel,g,side*1.43,h,0);const head=box(.88,.035,.27,m.neon(techPalette.yellow),g,side*1.43,h-.09,0);head.name='tech-yellow-lamp-core';head.castShadow=false;}
  pool(g,double?0:1.1,.066,0,techPalette.yellow,2.3,m.night?.19:.1);
  g.updateWorldMatrix(true,false);const head=new THREE.Vector3(double?0:1.4,h-.12,0),ground=new THREE.Vector3(double?0:1.1,0,0);lamps.push({head:g.localToWorld(head),ground:g.localToWorld(ground)});return g;
 }
 function tower(parent,p,{landmark=false,proxy=false}={}){
  const profile=landmark?{...technologyProfiles.skyscraper,width:4.2,depth:3.8,height:27,crown:'landmark',sign:'SIGNAL'}:technologyProfiles[p.shape]??technologyProfiles.skyscraper;
  const g=group(parent);g.name=landmark?'neon-signal-skyscraper':'tech-project-building';g.userData.shape=p.shape;g.userData.crown=profile.crown;g.userData.status=p.status;g.userData.progress=p.progress;g.userData.profile=profile;
  const random=seeded(seedOf(p.id??'signal-landmark')),fraction=constructionFraction(p),h=profile.height*fraction,w=profile.width,d=profile.depth,accent=p.color??techPalette.blue;
  g.userData.builtHeight=h;box(w+.25,.22,d+.25,m.steel,g,0,.12,0);
  if(p.status==='foundation'){
   box(w,.2,d,dim,g,0,.3,0);for(const x of [-w*.4,w*.4])for(const z of [-d*.4,d*.4]){cyl(.025,.025,1.05,m.steel,g,x,.9,z,5);box(.17,.07,.17,m.neon(techPalette.red),g,x,1.25,z);}for(const z of [-d*.55,d*.55]){box(w+.3,.3,.08,m.body,g,0,.55,z);for(let n=0;n<5;n++){const stripe=box(.12,.24,.025,m.lane,g,-w*.4+n*w*.2,.56,z+.06);stripe.rotation.z=-.4;}}return g;
  }
  box(w,h,d,m.body,g,0,h/2+.25,0);
  for(const [fw,x,z,angle]of [[w,0,d/2+.025,0],[w,0,-d/2-.025,Math.PI],[d,w/2+.025,0,Math.PI/2],[d,-w/2-.025,0,-Math.PI/2]]){
   const face=group(g,x,.25,z);face.name='tech-glass-curtain-wall';face.rotation.y=angle;
   const {rows,columns:cols}=technologyWindowGrid(profile,fw,h,proxy),fh=h/rows;face.userData.windowGrid={rows,columns:cols};
   for(let row=0;row<rows;row++){for(let col=0;col<cols;col++){const value=random(),color=value<.48?null:value<.72?m.colors[0]:value<.87?m.colors[1]:value<.97?m.colors[2]:m.colors[3],xx=(col-(cols-1)/2)*fw*.88/cols;glassPane(face,xx,row*fh+fh*.53,.018,fw*.72/cols,fh*.65,color);}box(fw+.045,.035,.085,m.steel,face,0,row*fh+.02,.045);}
   for(let col=0;col<=cols;col++)box(.022,h+.1,.075,m.steel,face,(col/cols-.5)*fw*.9,h/2,.045);
   if(profile.crown==='archive'||profile.crown==='stacks')for(let yy=1.4;yy<h;yy+=1.5)box(fw+.15,.12,.28,m.steel,face,0,yy,.09);
   if(profile.crown==='glass')for(const side of [-1,1])box(.055,h+.1,.06,m.neon(techPalette.blue),face,side*fw*.47,h/2,.09);
  }
  box(.07,h*.72,.07,m.neon(accent),g,w*.48,h*.52+.3,d/2+.1);
  box(w+.18,.17,d+.18,m.steel,g,0,h+.3,0);box(w*.7,.5,d*.72,m.body,g,0,h+.62,0);
  if(!proxy){
   // Glazed entrance, canopy, equipment, vents, rain pipes and projecting signs.
   const entrance=glassPane(g,0,1.1,d/2+.11,Math.min(w*.65,1.5),1.65,m.colors[1]);entrance.name='tech-glass-entrance';box(Math.min(w*.8,2.15),.12,.62,m.steel,g,0,2.05,d/2+.25);box(.07,1.7,.1,m.steel,g,0,1.1,d/2+.16);
   for(const side of [-1,1]){cyl(.045,.045,h*.82,m.steel,g,side*w*.45,h*.45,-d*.51,6);box(.45,.45,.65,m.steel,g,side*w*.28,h+.92,-d*.2);for(let n=0;n<3;n++)box(.35,.025,.035,dim,g,side*w*.28,h+.78+n*.1,-d*.2+.34);}
   lightbox(g,-w*.27,h*.5,d/2+.24,profile.sign,accent,{vertical:true,w:.55,h:Math.min(3.2,h*.45)});
   lightbox(g,w*.26,2.7,d/2+.3,'24H',techPalette.yellow,{w:Math.min(1.3,w*.55),h:.53});
   if(p.status!=='building')lightbox(g,0,h*.78,-d/2-.16,'ONLINE',techPalette.purple,{w:w*.8,h:.65,angle:Math.PI});
   if(h>4){lightbox(g,w/2+.22,h*.42,0,profile.sign,techPalette.blue,{w:1.2,h:.8,angle:Math.PI/2});const arrow=group(g,-w*.24,3.2,d/2+.43);arrow.name='tech-projecting-neon-arrow';neonLine([[-.5,0,0],[-.22,.23,0],[-.22,.1,0],[.5,.1,0],[.5,-.1,0],[-.22,-.1,0],[-.22,-.23,0],[-.5,0,0]],techPalette.blue,arrow,.025);}
   reflectionStreak(parent,g.position.x,g.position.z+d/2+.7,accent,3,w*.6);
  }
  if(p.status==='building'){
   const frame=group(g);frame.name='tech-construction-scaffold';for(const x of [-w*.55,w*.55])for(const z of [-d*.55,d*.55]){box(.07,profile.height,.07,m.steel,frame,x,profile.height/2,z);for(let yy=1;yy<h+.5;yy+=1.5)box(.18,.08,.18,m.lane,frame,x,yy,z);}for(let yy=1;yy<h+.5;yy+=1.5)box(w+.5,.08,d+.5,m.steel,frame,0,yy,0);
   box(.14,profile.height*.3,.14,m.lane,frame,w*.35,profile.height*1.1,-d*.3);box(w+1.3,.12,.12,m.lane,frame,0,profile.height*1.25,-d*.3);line([[w*.35,profile.height*1.25,-d*.3],[-w*.65,profile.height*1.25-1.2,-d*.3]],m.steel,frame,.025);return g;
  }
  const crown=group(g,0,h+.85,0);crown.name='tech-crown-'+profile.crown;
  switch(profile.crown){
   case'clock':{const face=ring(.64,.08,m.steel,crown,0,.8,d*.28);const disk=mesh(new THREE.CircleGeometry(.61,32),m.body,crown,0,.8,d*.28-.01);neonLine([[0,.8,d*.28+.03],[0,1.23,d*.28+.03]],techPalette.yellow,crown,.035);neonLine([[0,.8,d*.28+.03],[.34,.63,d*.28+.03]],techPalette.blue,crown,.035);box(1.55,1.7,.5,m.body,crown,0,.8,0);break;}
   case'archive':case'stacks':for(let n=0;n<(profile.crown==='stacks'?5:3);n++)box(.18,1.2+n*.18,d*.8,m.steel,crown,(n-(profile.crown==='stacks'?2:1))*.5,.65,0);break;
   case'reactor':for(const side of [-1,1]){cyl(.35,.35,1.5,m.steel,crown,side*.58,.75,0,12);for(const yy of [.3,.75,1.2])cyl(.36,.36,.045,m.neon(techPalette.purple),crown,side*.58,yy,0,12);}break;
   case'terraces':for(let n=0;n<3;n++){box(w*(.85-n*.18),.55,d*(.75-n*.12),m.body,crown,n*.15,n*.6,0);box(w*(.87-n*.18),.07,d*(.77-n*.12),m.steel,crown,n*.15,n*.6+.3,0);}break;
   case'canopy':box(w*1.1,.17,d*.84,m.steel,crown,0,.45,0);for(const side of [-1,1])neonLine([[side*w*.42,.5,-d*.4],[side*w*.42,.5,d*.4]],techPalette.yellow,crown,.04);break;
   case'glass':box(w*.65,1.4,d*.65,darkGlass,crown,0,.7,0);for(const side of [-1,1])box(.07,1.7,.07,m.neon(techPalette.blue),crown,side*w*.31,.8,d*.33);break;
   case'signal':{cyl(.04,.08,2,m.steel,crown,0,1,0,8);const radar=ring(.65,.035,m.neon(techPalette.blue),crown,0,1.5,0);radar.rotation.x=.7;break;}
   case'dome':{const dome=mesh(new THREE.SphereGeometry(w*.37,16,8,0,TAU,0,Math.PI/2),m.glass(techPalette.purple),crown);dome.castShadow=false;cyl(w*.4,w*.4,.2,m.steel,crown);break;}
   case'arcade':{
    for(const side of [-1,1]){box(.5,profile.height*.45,.8,m.body,g,side*w*.43,profile.height*1.03,0);box(.065,profile.height*.43,.065,m.neon(side<0?techPalette.purple:techPalette.blue),g,side*w*.45,profile.height*1.03,.44);}
    lightbox(g,0,profile.height*.69,d/2+.23,'PLAY',techPalette.purple,{w:w*.67,h:1});neonLine([[-.9,0,.4],[-.5,.4,.4],[.5,.4,.4],[.9,0,.4],[.65,-.3,.4],[.25,-.05,.4],[-.25,-.05,.4],[-.65,-.3,.4],[-.9,0,.4]],techPalette.blue,crown,.055);break;
   }
   case'studio':box(w*.9,.18,d*.94,m.steel,crown,.15,.35,0);box(w*.5,.6,d*.5,darkGlass,crown,-.2,.65,0);break;
   case'cards':for(const side of [-1,1]){const card=group(crown,side*.45,.7,0);card.rotation.z=side*.15;box(.75,1.65,.12,m.body,card);neonLine([[-.3,-.7,.08],[.3,.7,.08]],techPalette.purple,card,.025);}break;
   case'message':lightbox(crown,0,.75,0,'HELLO',techPalette.blue,{w:w*.9,h:1.35});break;
   case'workshop':for(const side of [-1,1]){box(.4,1.1,d*.8,m.steel,crown,side*w*.4,.45,0);cyl(.14,.14,1.5,m.steel,crown,side*w*.3,.8,-d*.2,8);}break;
   case'media':lightbox(crown,0,.95,0,'ART / 01',techPalette.purple,{w:w*.9,h:1.7});break;
   case'plant':for(let n=0;n<3;n++){box(.75,.5,d*.85,m.steel,crown,(n-1)*w*.26,.2,0);cyl(.16,.23,1.8,m.steel,crown,(n-1)*w*.26,1.1,-d*.2,8);}break;
   case'landmark':
    for(const side of [-1,1]){box(.85,17,2.5,m.body,g,side*2.75,8.6,-.5);for(let row=0;row<24;row++)for(let col=0;col<2;col++)glassPane(g,side*2.75+(col-.5)*.35,.7+row*.67,.79,.24,.42,m.colors[row%3?1:0]);}
    lightbox(g,0,h*.7,d/2+.25,'SIGNAL',techPalette.blue,{w:w*.78,h:1.9});
    for(let n=0;n<3;n++){box(w*(.8-n*.17),.7,d*(.75-n*.14),m.body,crown,0,n*.8,0);box(w*(.81-n*.17),.05,d*(.77-n*.14),m.neon(n%2?techPalette.purple:techPalette.blue),crown,0,n*.8+.4,0);}
    // falls through: central and normal skyscrapers carry aircraft beacons.
   case'antenna':for(const [x,height]of [[-.55,2.7],[.25,4.3],[.7,2]]){cyl(.025,.06,height,m.steel,crown,x,height/2,0,6);ball(.065,m.neon(techPalette.red),crown,x,height,0);}break;
  }
  return g;
 }
 const cap=cyl(1,1.025,1.1,m.steel,root,0,-.55,0,lowDetail?24:64);cap.scale.set(island.rx,1,island.rz);cap.renderOrder=-800;
 const cliff=cyl(1,.8,5.8,k.mat('#303946'),root,0,-4,0,24);cliff.scale.set(island.rx,1,island.rz);cliff.renderOrder=-1000;
 const tail=cyl(.84,.38,3.9,k.mat('#232c38'),root,0,-8.2,0,20);tail.scale.set(island.rx,1,island.rz);tail.renderOrder=-1100;
 const roadGeo=new THREE.CircleGeometry(1,lowDetail?48:96);roadGeo.rotateX(-Math.PI/2);roadGeo.scale(island.rx*.985,1,island.rz*.985);const uv=roadGeo.attributes.uv,p=roadGeo.attributes.position;for(let n=0;n<p.count;n++)uv.setXY(n,p.getX(n)*.25,p.getZ(n)*.25);const road=mesh(roadGeo,m.asphalt,root,0,.022,0);road.name='tech-wet-asphalt';road.renderOrder=-790;
 const free=(x,z,padding=.8)=>Math.hypot(x,z)>4.65&&projects.every(p=>Math.hypot(x-(p.position?.x??0),z-(p.position?.z??0))>footprint(p)+padding);
 const infrastructure=technologyInfrastructure({root,island,projects,kit:k,materials:m,lowDetail,roadLamp});
 for(const [x,z,angle]of [[-5.5,-3,0],[5.5,3,Math.PI],[-4,12,Math.PI/2],[4,-12,-Math.PI/2],[-18,5,Math.PI/2],[18,3,-Math.PI/2]])if(free(x,z,.3))roadLamp(root,x,0,z,5.9,angle);
 tower(root,{id:'signal-landmark',shape:'skyscraper',status:'complete',progress:100,color:techPalette.blue},{landmark:true});
 for(const [x,z]of [[-4.1,3.8],[4.1,3.8]]){pool(root,x,.064,z,x<0?techPalette.blue:techPalette.purple,2.8,.13);lightSources.push({point:new THREE.Vector3(island.x+x,island.height+2,island.z+z),color:x<0?techPalette.blue:techPalette.purple});}
 if(!lowDetail){
  const resolution=mobile?256:512;reflector=new Reflector(new THREE.CircleGeometry(1,64),{clipBias:.004,textureWidth:resolution,textureHeight:resolution,multisample:0,color:'#101722',shader:wetReflectionShader});reflector.scale.set(island.rx*.983,island.rz*.983,1);reflector.rotation.x=-Math.PI/2;reflector.position.y=.043;reflector.name='tech-planar-wet-reflection';reflector.userData.dynamic=true;reflector.userData.planarReflection=true;reflector.material.transparent=true;reflector.material.depthWrite=false;reflector.material.uniforms.wetMap.value=m.asphalt.roughnessMap;reflector.material.uniforms.wetScale.value.set(island.rx*.13,island.rz*.13);reflector.material.uniforms.texel.value.set(1/resolution,1/resolution);reflector.material.userData.bloom=false;root.add(reflector);
  const draw=reflector.onBeforeRender,reflectionMaterial=reflector.material;reflector.onBeforeRender=function(renderer,scene,camera,...rest){if(this.material!==reflectionMaterial||!reflectionEnabled)return;const now=performance.now();if(now-lastReflection<(mobile?125:84))return;lastReflection=now;const hidden=[];scene.traverse(o=>{if(o!==root&&o.visible&&(o.name.startsWith('island-')||o.name.startsWith('distant-')||o.name==='floating-cloud-sea')){hidden.push(o);o.visible=false;}});try{draw.call(this,renderer,scene,camera,...rest);}finally{hidden.forEach(o=>{o.visible=true;});}};
  for(let n=0;n<3;n++){const light=new THREE.SpotLight(techPalette.yellow,m.night?48:25,10,.75,.7,2);light.name='tech-yellow-road-light';light.castShadow=false;root.add(light,light.target);spotLights.push(light);const neon=new THREE.PointLight(techPalette.blue,16,6,2);neon.name='tech-neon-fill';root.add(neon);signLights.push(neon);}
 }
 let lastX=Infinity,lastZ=Infinity;
 function updateLights(target){const distance=Math.hypot(target.x-island.x,target.z-island.z);reflectionEnabled=distance<66;if(reflector)reflector.visible=reflectionEnabled;const enabled=distance<island.rx+25;if(Math.hypot(target.x-lastX,target.z-lastZ)<1)return;lastX=target.x;lastZ=target.z;root.updateWorldMatrix(true,false);const sorted=lamps.slice().sort((a,b)=>Math.hypot(a.head.x-target.x,a.head.z-target.z)-Math.hypot(b.head.x-target.x,b.head.z-target.z));spotLights.forEach((l,n)=>{l.visible=enabled&&!!sorted[n];if(sorted[n]){l.position.copy(root.worldToLocal(sorted[n].head.clone()));l.target.position.copy(root.worldToLocal(sorted[n].ground.clone()));}});signLights.forEach((l,n)=>{const source=lightSources[n%lightSources.length];l.visible=enabled&&!!source;if(source){l.position.copy(root.worldToLocal(source.point.clone()));l.color.set(source.color);}});}
 function building(parent,p){const g=tower(parent,p);const q=new THREE.Vector3();parent.updateWorldMatrix(true,false);parent.localToWorld(q.set(0,2,(technologyProfiles[p.shape]?.depth??2.8)/2+.3));lightSources.push({point:q,color:p.color});return g;}
 function proxy(parent){infrastructure.proxy(parent);const cap=cyl(1,1,.8,m.steel,parent,0,-.4,0,20);cap.scale.set(island.rx,1,island.rz);cap.renderOrder=-800;const floor=new THREE.CircleGeometry(1,32);floor.rotateX(-Math.PI/2);floor.scale(island.rx*.98,1,island.rz*.98);mesh(floor,m.asphalt,parent,0,.02,0).renderOrder=-790;const base=cyl(1,.5,8,k.mat('#303946'),parent,0,-4.8,0,16);base.scale.set(island.rx,1,island.rz);base.renderOrder=-1000;tower(parent,{id:'signal-landmark',shape:'skyscraper',status:'complete',progress:100,color:techPalette.blue},{landmark:true,proxy:true});for(const p of projects){const g=group(parent,p.position?.x??0,0,p.position?.z??0);tower(g,p,{proxy:true});}return parent;}
 return{kit:k,materials:m,building,roadLamp,proxy,updateLights,update:k.update,get reflector(){return reflector;},dispose(){if(reflector){reflector.geometry.dispose();reflector.dispose();reflector.removeFromParent();reflector=null;}paneGeometry.dispose();}};
}
