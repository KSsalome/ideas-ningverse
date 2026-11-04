import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {artThemes,seeded} from './art-kit.js';
import {sceneProfile} from './scene-performance.js';
import {worldNight,deepNight,royalDay,fairyDawn} from '../lib/world-night.ts';

// Only explicitly marked, small light sources contribute to the halo.
// Stone, unlit glazing, uploaded art and the sky never enter this pass.
export function bloomSource(material){return !!material?.userData?.bloom&&!material.transparent;}
export function withBloomMask(scene,render,blackMesh,blackLine){
 const saved=[],background=scene.background,fog=scene.fog;
 try{
  scene.background=new THREE.Color(0);scene.fog=null;
  scene.traverseVisible(o=>{
   if((o.isMesh||o.isLine)&&o.material?.visible!==false){saved.push([o,o.material,o.visible]);o.material=Array.isArray(o.material)?o.material.map(m=>bloomSource(m)?m:(o.isLine?blackLine:blackMesh)):bloomSource(o.material)?o.material:(o.isLine?blackLine:blackMesh);}
   else if(o.isSprite){saved.push([o,o.material,o.visible]);o.visible=false;}
  });render();
 }finally{for(const [o,material,visible]of saved){o.material=material;o.visible=visible;}scene.background=background;scene.fog=fog;}
}
export default function sceneEffects({renderer,scene,camera,lowDetail=false,phase='industrial',interior=false,profile='default',lightSources,transparentBackground=false,performanceProfile=null}){
 const theme=artThemes[phase]??artThemes.industrial,mobile=(typeof innerWidth!=='undefined'&&innerWidth<700)||(typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches),reading=profile==='library',bar=profile==='factory',museum=profile==='museum';
 const quality=performanceProfile??sceneProfile({width:typeof innerWidth==='undefined'?1280:innerWidth,height:typeof innerHeight==='undefined'?800:innerHeight});
 let lastBloom=-Infinity,composer=null,bloomComposer=null,environment=null,cloudTexture=null,blackMesh=null,blackLine=null;
 scene.background=new THREE.Color(reading?'#22362c':bar?'#181c1b':theme.sky);scene.fog=new THREE.Fog(reading?'#35483a':bar?'#25231f':theme.fog,interior?42:155,interior?110:355);
 if(transparentBackground){scene.background=null;renderer.setClearColor?.(theme.sky,0);}
 const night=phase==='cyber'||phase==='gothic';
 const ambient=new THREE.AmbientLight(bar?'#d6b98f':'#b5c0cf',bar?(lowDetail?.78:.28):museum?(lowDetail?.38:.2):lowDetail?.24:.18);scene.add(ambient);
 const hemisphere=new THREE.HemisphereLight(bar?'#c8b292':'#c8d7e7',bar?'#30251b':'#665644',bar?(lowDetail?.24:.18):museum?(lowDetail?.2:.36):lowDetail?.12:interior?.32:.42);scene.add(hemisphere);
 const key=new THREE.DirectionalLight(bar?'#ffd8a4':'#ffe4bb',bar?(lowDetail?.85:.62):museum?(lowDetail?.66:1.35):lowDetail?.48:reading?1.35:interior?1.65:night?1.55:2.05);
 key.position.set(...(bar?[-4,5.8,9]:interior?[-6,12,8]:[-38,78,42]));key.target.position.set(...(interior?[0,1,-7]:[0,0,0]));scene.add(key.target);
 if(!lowDetail){key.castShadow=true;key.shadow.mapSize.set(quality.shadowSize,quality.shadowSize);Object.assign(key.shadow.camera,interior?{left:-13,right:13,top:24,bottom:-24,near:.5,far:65}:{left:-110,right:110,top:100,bottom:-100,near:1,far:250});key.shadow.bias=-.0002;key.shadow.normalBias=.018;key.shadow.radius=2;}
 scene.add(key);const rim=new THREE.DirectionalLight(bar?'#bb9363':'#8faacb',bar?.16:lowDetail?.12:interior?.28:.4);rim.position.set(45,30,-60);scene.add(rim);
 const interiorLights=[];if(interior&&!lowDetail){const specs=bar?(lightSources??[]).slice(0,6).map(s=>[...s.position,s.power,s.color,s.distance]):museum?(lightSources??[]).slice(0,3).map(s=>[...s.position,s.power,s.color,s.distance]):reading?[[0,8,-.5,28],[-5,3,-11,12],[5,3,-11,12]]:[[0,8,-.5,38],[-5,3,-11,14],[5,3,-11,14]];for(const [x,y,z,power,color,distance]of specs){const light=new THREE.PointLight(bar||museum?(color??'#ffce8a'):'#ffd49a',power,bar||museum?(distance??11):14,2);light.position.set(x,y,z);light.userData.basePower=power;if(bar)light.name='factory-bounded-interior-light';if(museum)light.name='museum-bounded-atrium-light';scene.add(light);interiorLights.push(light);}}
 if(!lowDetail){
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=theme.exposure*(reading?.86:bar?.92:interior?.94:1);
  const generator=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=generator.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=reading?.18:interior?.22:.3;room.dispose();generator.dispose();
  if(quality.bloomHz>0){blackMesh=new THREE.MeshBasicMaterial({color:0,side:THREE.DoubleSide,fog:false});blackLine=new THREE.LineBasicMaterial({color:0,fog:false});
  bloomComposer=new EffectComposer(renderer);bloomComposer.renderToScreen=false;bloomComposer.setPixelRatio(1);bloomComposer.addPass(new RenderPass(scene,camera));bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(256,256),.16,.25,1.08));
  composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const composite=new ShaderPass({uniforms:{tDiffuse:{value:null},bloomTexture:{value:bloomComposer.renderTarget2.texture}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){vec4 base=texture2D(tDiffuse,vUv); vec3 halo=texture2D(bloomTexture,vUv).rgb; gl_FragColor=vec4(base.rgb+min(halo,vec3(1.5))*.18,base.a);}'});
  composer.addPass(composite);composer.addPass(new OutputPass());}
  if(!interior){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(156,172,192,.16)');gradient.addColorStop(.5,'rgba(134,154,179,.06)');gradient.addColorStop(1,'rgba(134,154,179,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);cloudTexture=new THREE.CanvasTexture(c);const random=seeded(451),clouds=new THREE.Group();clouds.name='floating-cloud-sea';scene.add(clouds);for(let n=0;n<(mobile?12:22);n++){const material=new THREE.SpriteMaterial({map:cloudTexture,transparent:true,opacity:.38,depthWrite:false,color:theme.fog});const cloud=new THREE.Sprite(material);cloud.position.set((random()-.5)*240,-11-random()*12,(random()-.5)*160);cloud.scale.set(30+random()*35,18+random()*20,1);clouds.add(cloud);}}
 }
 let libraryMode=null,factoryMode=null;
 const outdoorLights=[ambient,hemisphere,key,rim].map(light=>({light,color:light.color.clone(),power:light.intensity})),dayFog=scene.fog.color.clone(),dayEnvironment=scene.environmentIntensity;
 const nightColors=[worldNight.ambient,'#bccbdf',worldNight.moon,'#9aaec9'].map(c=>new THREE.Color(c)),nightPowers=lowDetail?[.21,.11,.21,.09]:[.2,.3,.78,.24],nightFog=new THREE.Color(worldNight.fog);
 const deepColors=[deepNight.ambient,'#a8b8cc',deepNight.moon,'#8e9eb4'].map(c=>new THREE.Color(c)),deepPowers=lowDetail?[.16,.085,.17,.065]:[.14,.21,.52,.16],deepFog=new THREE.Color(deepNight.fog),dayNear=scene.fog.near,dayFar=scene.fog.far;
 const noonColors=[royalDay.ambient,'#dde9ef',royalDay.sun,'#c1d4e2'].map(c=>new THREE.Color(c)),noonPowers=lowDetail?[.28,.16,.6,.12]:[.24,.49,2.12,.35],noonFog=new THREE.Color(royalDay.fog),keyDayPosition=key.position.clone(),keyNoonPosition=new THREE.Vector3(-22,95,24);
 const dawnColors=[fairyDawn.ambient,'#d9dce9',fairyDawn.sun,'#b7c7db'].map(c=>new THREE.Color(c)),dawnFog=new THREE.Color(fairyDawn.fog),lateDawnFog=new THREE.Color(fairyDawn.lateFog),blendedDawnFog=new THREE.Color(),keyDawnPosition=new THREE.Vector3(-60,34,60);
 const cloudMaterials=[];scene.getObjectByName('floating-cloud-sea')?.traverse(o=>{if(o.material)cloudMaterials.push({material:o.material,color:o.material.color.clone()});});
 if(reading)key.name='library-skylight-key';
 return{
  setOutdoorNight(mix,depth=0,noon=0,dawn=0,progress=0){
   if(interior)return;mix=THREE.MathUtils.clamp(mix,0,1);depth=THREE.MathUtils.clamp(depth,0,mix);noon=THREE.MathUtils.clamp(noon,0,1-mix);dawn=THREE.MathUtils.clamp(dawn,0,1-mix-noon);progress=THREE.MathUtils.clamp(progress,0,1);const baseline=1-mix-noon-dawn,dawnPowers=lowDetail?[.22+progress*.04,.13+progress*.025,.3+progress*.15,.1]:[.2+progress*.03,.39+progress*.04,1.1+progress*.4,.29];
   for(const [n,b]of outdoorLights.entries()){const c=nightColors[n],d=deepColors[n],day=noonColors[n],morning=dawnColors[n];b.light.color.setRGB(b.color.r*baseline+c.r*(mix-depth)+d.r*depth+day.r*noon+morning.r*dawn,b.color.g*baseline+c.g*(mix-depth)+d.g*depth+day.g*noon+morning.g*dawn,b.color.b*baseline+c.b*(mix-depth)+d.b*depth+day.b*noon+morning.b*dawn);b.light.intensity=b.power*baseline+nightPowers[n]*(mix-depth)+deepPowers[n]*depth+noonPowers[n]*noon+dawnPowers[n]*dawn;}
   blendedDawnFog.copy(dawnFog).lerp(lateDawnFog,progress);const c=scene.fog.color;c.setRGB(dayFog.r*baseline+nightFog.r*(mix-depth)+deepFog.r*depth+noonFog.r*noon+blendedDawnFog.r*dawn,dayFog.g*baseline+nightFog.g*(mix-depth)+deepFog.g*depth+noonFog.g*noon+blendedDawnFog.g*dawn,dayFog.b*baseline+nightFog.b*(mix-depth)+deepFog.b*depth+noonFog.b*noon+blendedDawnFog.b*dawn);scene.fog.near=dayNear*baseline+dayNear*(mix-depth)+145*depth+205*noon+(135+progress*25)*dawn;scene.fog.far=dayFar*baseline+dayFar*(mix-depth)+335*depth+430*noon+(340+progress*35)*dawn;scene.environmentIntensity=dayEnvironment*baseline+.18*(mix-depth)+.12*depth+.32*noon+(.23+progress*.035)*dawn;
   key.position.copy(keyDayPosition).multiplyScalar(1-noon-dawn).addScaledVector(keyNoonPosition,noon).addScaledVector(keyDawnPosition,dawn);key.position.y+=dawn*progress*10;for(const b of cloudMaterials){b.material.color.copy(scene.fog.color);b.material.opacity=.38+depth*.04-.18*noon+dawn*(.045-progress*.02);}
  },
  setLibraryLighting(state){if(!reading||libraryMode===state.mode)return;libraryMode=state.mode;ambient.color.set(state.ambient);hemisphere.color.set(state.light);key.color.set(state.light);key.intensity=lowDetail?.48:state.key;key.position.set(-2,17,4);key.target.position.set(0,1,-7);if(interiorLights[0]){interiorLights[0].color.set(state.light);interiorLights[0].intensity=state.fill;interiorLights[0].position.set(0,10.2,-5);}},
  setFactoryLighting(state){if(!bar||factoryMode===state.mode)return;factoryMode=state.mode;ambient.intensity=lowDetail?state.ambient*2.7:state.ambient;key.intensity=lowDetail?state.key*1.4:state.key;for(const light of interiorLights)light.intensity=light.userData.basePower*state.fill;},
  resize(w,h){if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);}bloomComposer?.setSize(Math.ceil(w*.4),Math.ceil(h*.4));lastBloom=-Infinity;},
  render(now=performance.now()){if(!composer){renderer.render(scene,camera);if(transparentBackground)renderer.domElement.style.backgroundColor='transparent';return;}if(now-lastBloom>=1000/quality.bloomHz){const shadows=renderer.shadowMap.enabled;try{renderer.shadowMap.enabled=false;withBloomMask(scene,()=>bloomComposer.render(),blackMesh,blackLine);lastBloom=now;}finally{renderer.shadowMap.enabled=shadows;}}composer.render();},
  dispose(){for(const c of [composer,bloomComposer])if(c){for(const p of c.passes)p.dispose?.();c.dispose();}blackMesh?.dispose();blackLine?.dispose();environment?.dispose();cloudTexture?.dispose();}
 };
}
