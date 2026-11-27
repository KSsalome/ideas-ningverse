import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import sceneBudget,{sceneProfile,frameGate,resolutionBudget,projectionGate,freezeStaticTransforms,trackLocalLights} from '../app/scene-performance.js';
import {withBloomMask} from '../app/scene-effects.js';
import {advanceRoute} from '../lib/navigation.ts';

test('mobile and wide displays have finite pixel budgets without changing logical canvas dimensions',()=>{
 for(const [width,height,dpr,coarse]of [[390,844,3,true],[844,390,3,true],[1920,1080,2,false],[3840,2160,2,false]]){const q=sceneProfile({width,height,dpr,coarse});assert.ok(width*height*q.ratio*q.ratio<=q.pixelBudget+1);assert.ok(q.ratio<=dpr&&q.ratio<=q.maxRatio);assert.equal(q.bloomHz,coarse?0:15);assert.equal(q.shadowSize,coarse?512:1024);assert.equal(q.fps,coarse?30:60);}
 const limited=sceneProfile({width:1100,memory:4,cores:4});assert.equal(limited.fps,30);assert.equal(limited.bloomHz,0);
});

test('frame scheduling follows elapsed time at 60Hz, 90Hz, 120Hz and 144Hz and resumes immediately after pause',()=>{
 for(const refresh of [60,90,120,144])for(const fps of [30,60]){const gate=frameGate(fps);let ticks=0;for(let n=0;n<refresh*2;n++)if(gate.step(n*1000/refresh))ticks++;assert.ok(Math.abs(ticks-fps*2)<=1,`${refresh}Hz to ${fps}fps: ${ticks}`);assert.equal(gate.step(2000),true);assert.equal(gate.step(2001),false);gate.reset();assert.equal(gate.step(2002),true);}
});

test('sustained slow rendering lowers resolution within bounds and hysteresis prevents frame-to-frame oscillation',()=>{
 const q=resolutionBudget({ratio:1.25,minRatio:.75,fps:30});for(let n=0;n<150;n++)q.sample(n*70);assert.ok(q.ratio<1.25&&q.ratio>=.75);const reduced=q.ratio;for(let n=0;n<150;n++)q.sample(11000+n*33.34);assert.equal(q.ratio,reduced);for(let n=0;n<900;n++)q.sample(17000+n*33.34);assert.ok(q.ratio>=reduced&&q.ratio<=1.25);q.reset();assert.equal(q.sample(120000),false);
});

function fakeRenderer(){return{ratio:1,domElement:{style:{}},shadowMap:{autoUpdate:true,needsUpdate:false},getPixelRatio(){return this.ratio;},setSize(w,h){this.size=[w,h];},setDrawingBufferSize(w,h,ratio){this.size=[w,h];this.ratio=ratio;this.bufferResizes=(this.bufferResizes??0)+1;}};}

test('adaptive resolution leaves GPU buffers in place during a six-second walk',()=>{
 const renderer=fakeRenderer(),budget=sceneBudget({container:{clientWidth:390,clientHeight:844},renderer});
 let effectResizes=0;
 const effects={render(){},resize(){effectResizes++;}};
 budget.resize(390,844);
 for(let now=0;now<=6000;now+=50){
  assert.equal(budget.step(now),true);
  budget.render(effects,now,{moving:true});
 }
 assert.equal(renderer.bufferResizes,1);
 assert.equal(effectResizes,0);
 budget.render(effects,6100);
 assert.equal(renderer.bufferResizes,1);
 budget.render(effects,6250);
 assert.equal(renderer.bufferResizes,2);
 assert.equal(effectResizes,1);
 assert.ok(renderer.ratio<1);
 assert.deepEqual(renderer.domElement.style,{width:'390px',height:'844px'});
});
test('SVG redraws fast movement at 30fps and skips redraws at rest',()=>{
 const renderer=fakeRenderer(),budget=sceneBudget({container:{clientWidth:390,clientHeight:844},renderer,svg:true}),effect={render(){this.draws=(this.draws??0)+1;},resize(){}};budget.resize(390,844);assert.equal(budget.render(effect,0),true);for(let t=300;t<10000;t+=300)assert.equal(budget.render(effect,t),false);assert.equal(effect.draws,1);assert.equal(budget.render(effect,10000,{moving:true}),true);assert.equal(budget.render(effect,10010,{moving:true}),false);assert.equal(budget.render(effect,10034,{moving:true}),true);assert.equal(budget.render(effect,10068,{moving:true}),true);assert.equal(budget.render(effect,10300),false);budget.step(10400,true);assert.equal(budget.step(10500),true);assert.equal(budget.render(effect,10600),true);budget.resize(320,740);assert.deepEqual(renderer.size,[320,740]);assert.equal(budget.render(effect,11000),true);
});

test('distant fixtures skip sorting and refresh as soon as the camera enters their range',()=>{
 const light={visible:true},refresh=trackLocalLights([light],{x:0,z:0},10,1);
 assert.equal(refresh({x:10.2,z:0}),false);
 assert.equal(light.visible,false);
 assert.equal(refresh({x:9.9,z:0}),true);
 light.visible=true;
 assert.equal(refresh({x:9.8,z:0}),false);
 assert.equal(refresh({x:10.1,z:0}),false);
 assert.equal(light.visible,false);
 assert.equal(refresh({x:9.9,z:0}),true);
});

test('automatic walking uses the whole movement budget through a waypoint without cutting the corner',()=>{
 const player={x:.9,z:0},route=[{x:1,z:0},{x:1,z:1}];
 assert.equal(advanceRoute(player,route,.25),0);
 assert.equal(player.x,1);
 assert.ok(Math.abs(player.z-.15)<1e-9);
 assert.equal(route.length,1);
 assert.equal(advanceRoute(player,route,2),0);
 assert.deepEqual(player,{x:1,z:1});
 assert.equal(route.length,0);
 assert.equal(advanceRoute(player,route,1),null);
});

test('native budget keeps a 30fps schedule and refreshes shadows at 10Hz without changing the camera or material data',()=>{
 const renderer=fakeRenderer(),budget=sceneBudget({container:{clientWidth:390,clientHeight:844},renderer}),effect={render(){},resize(){}},camera=new THREE.PerspectiveCamera(),view=camera.toJSON();budget.resize(390,844);let frames=0,shadows=0;for(let n=0;n<60;n++){const t=n*1000/60;if(!budget.step(t))continue;renderer.shadowMap.needsUpdate=false;if(budget.render(effect,t,{castersMoving:true}))frames++;if(renderer.shadowMap.needsUpdate)shadows++;}assert.ok(frames>=29&&frames<=31);assert.ok(shadows<=10&&shadows>=8);assert.equal(renderer.shadowMap.autoUpdate,false);assert.deepEqual(renderer.size,[390,844]);assert.deepEqual(camera.toJSON(),view);assert.equal(budget.stats().bloomHz,0);
});

test('stationary exhibit labels skip layout writes but update after camera, floor or resize changes',()=>{
 const camera=new THREE.PerspectiveCamera(),due=projectionGate();assert.equal(due(0,camera,0),true);assert.equal(due(50,camera,0),false);assert.equal(due(100,camera,0),false);camera.position.x=2;assert.equal(due(200,camera,0),true);assert.equal(due(300,camera,1),true);assert.equal(due(400,camera,1),false);due.reset();assert.equal(due(410,camera,1),true);
});

test('static transform caching preserves world hit positions while declared animation and light targets stay live',()=>{
 const root=new THREE.Group(),staticGroup=new THREE.Group(),dynamic=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),actor=mesh.clone(),light=new THREE.PointLight();staticGroup.position.set(3,4,5);mesh.position.x=2;mesh.userData.id='entry';staticGroup.add(mesh);dynamic.userData.dynamic=true;dynamic.add(actor);root.add(staticGroup,dynamic,light);root.updateMatrixWorld(true);const before=mesh.getWorldPosition(new THREE.Vector3());assert.ok(freezeStaticTransforms(root)>=3);assert.equal(mesh.matrixAutoUpdate,false);assert.equal(actor.matrixAutoUpdate,true);assert.equal(light.matrixAutoUpdate,true);assert.ok(mesh.getWorldPosition(new THREE.Vector3()).equals(before));dynamic.position.x=4;actor.position.z=3;root.updateMatrixWorld(true);assert.deepEqual(actor.getWorldPosition(new THREE.Vector3()).toArray(),[4,0,3]);assert.equal(mesh.userData.id,'entry');mesh.geometry.dispose();mesh.material.dispose();
});

test('cached bloom mask ignores hidden districts and restores all visible source materials',()=>{
 const scene=new THREE.Scene(),hidden=new THREE.Group(),visible=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),secret=visible.clone();hidden.visible=false;hidden.add(secret);scene.add(visible,hidden);const original=visible.material,old=secret.material,black=new THREE.MeshBasicMaterial();withBloomMask(scene,()=>{assert.equal(visible.material,black);assert.equal(secret.material,old);},black,black);assert.equal(visible.material,original);assert.equal(secret.material,old);visible.geometry.dispose();original.dispose();black.dispose();
});

test('idle scenes drop to a lower frame and shadow rate, and any activity restores full rate',async()=>{
 const {idleProfile,isIdle,IDLE_AFTER_MS}=await import('../app/scene-performance.js');
 const phone=sceneProfile({width:390,height:844,dpr:3,coarse:true}),desk=sceneProfile({width:1920,height:1080,dpr:1});
 assert.equal(idleProfile(phone).fps,15);assert.equal(idleProfile(desk).fps,30);assert.ok(idleProfile(phone).shadowHz<phone.shadowHz);
 assert.equal(isIdle(IDLE_AFTER_MS-1,-Infinity,0),false);assert.equal(isIdle(IDLE_AFTER_MS+1,-Infinity,0),true);
 assert.equal(isIdle(IDLE_AFTER_MS+1,IDLE_AFTER_MS,0),false,'recent camera or player movement keeps full rate');
 const gate=frameGate(30);let ticks=0;for(let n=0;n<120;n++)if(gate.step(n*1000/60))ticks++;assert.ok(Math.abs(ticks-60)<=1);
 gate.setFps(15);ticks=0;for(let n=120;n<240;n++)if(gate.step(n*1000/60))ticks++;assert.ok(Math.abs(ticks-30)<=1,`idle ticks ${ticks}`);
});

test('light motes are a single GPU-animated draw call sized to the device',async()=>{
 const {default:lightMotes,moteCount,moteLayout,moteIntensity}=await import('../app/light-motes.js');
 const {islands}=await import('../lib/archipelago.ts');
 assert.equal(moteCount({lowDetail:true}),0);assert.ok(moteCount({limited:true})<moteCount({}));
 const layout=moteLayout(islands,300);assert.equal(layout.count,300);
 for(let n=0;n<300;n++){const x=layout.position[n*3],z=layout.position[n*3+2];assert.ok(islands.some(i=>((x-i.x)/i.rx)**2+((z-i.z)/i.rz)**2<=1.17+1e-6),'every mote starts above an island');}
 assert.ok(moteIntensity({night:1})>moteIntensity({noon:1}));
 const motes=lightMotes({islands,limited:true});assert.ok(motes.points.isPoints);assert.equal(motes.points.geometry.attributes.position.count,moteCount({limited:true}));
 const t=motes.points.material.uniforms.uTime;motes.update(5000,{zoom:3,pixelRatio:1.25});assert.equal(t.value,5);
 const still=lightMotes({islands,reducedMotion:true});still.update(5000);assert.equal(still.points.material.uniforms.uTime.value,0,'reduced motion freezes drift');
 motes.dispose();still.dispose();
});

test('shadows refresh fast only while a caster moves; camera pans use the slow ambient rate',async()=>{
 const {default:budgetFor,AMBIENT_SHADOW_HZ}=await import('../app/scene-performance.js');
 const renderer={ratio:1,domElement:{style:{}},shadowMap:{autoUpdate:true,needsUpdate:false},getPixelRatio(){return this.ratio;},setSize(){},setDrawingBufferSize(w,h,r){this.ratio=r;}};
 const count=castersMoving=>{const budget=budgetFor({container:{clientWidth:1280,clientHeight:800},renderer});budget.resize(1280,800);let updates=0;const effects={render(now,shadow){if(shadow)updates++;},resize(){}};for(let now=0;now<1000;now+=1000/60){budget.step(now);budget.render(effects,now,{moving:true,castersMoving});}return updates;};
 const walking=count(true),panning=count(false);
 assert.ok(walking>=3*AMBIENT_SHADOW_HZ,`walking ${walking}`);
 assert.ok(panning<=AMBIENT_SHADOW_HZ+1,`panning ${panning}`);
});

test('tiny props stop casting shadows but avatars keep theirs',async()=>{
 const THREE=await import('three');const {pruneShadowCasters}=await import('../app/scene-performance.js');
 const root=new THREE.Group(),tiny=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2)),tower=new THREE.Mesh(new THREE.BoxGeometry(3,8,3)),avatar=new THREE.Group(),hand=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1));
 avatar.userData.keepShadow=true;avatar.add(hand);for(const m of [tiny,tower,hand])m.castShadow=true;root.add(tiny,tower,avatar);
 assert.deepEqual(pruneShadowCasters(root),{kept:2,pruned:1});
 assert.equal(tiny.castShadow,false);assert.equal(tower.castShadow,true);assert.equal(hand.castShadow,true);
});
