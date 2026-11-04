import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import sceneBudget,{sceneProfile,frameGate,resolutionBudget,projectionGate,freezeStaticTransforms} from '../app/scene-performance.js';
import {withBloomMask} from '../app/scene-effects.js';

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

function fakeRenderer(){return{ratio:1,shadowMap:{autoUpdate:true,needsUpdate:false},setPixelRatio(r){this.ratio=r;},getPixelRatio(){return this.ratio;},setSize(w,h){this.size=[w,h];}};}
test('SVG draws once at rest and redraws for movement, explicit changes, resize and modal close',()=>{
 const renderer=fakeRenderer(),budget=sceneBudget({container:{clientWidth:390,clientHeight:844},renderer,svg:true}),effect={render(){this.draws=(this.draws??0)+1;},resize(){}};budget.resize(390,844);assert.equal(budget.render(effect,0),true);for(let t=300;t<10000;t+=300)assert.equal(budget.render(effect,t),false);assert.equal(effect.draws,1);assert.equal(budget.render(effect,10000,{moving:true}),true);assert.equal(budget.render(effect,10010,{moving:true}),false);assert.equal(budget.render(effect,10300),true);budget.step(10400,true);assert.equal(budget.step(10500),true);assert.equal(budget.render(effect,10600),true);budget.resize(320,740);assert.deepEqual(renderer.size,[320,740]);assert.equal(budget.render(effect,11000),true);
});

test('native budget keeps a 30fps schedule and refreshes shadows at 10Hz without changing the camera or material data',()=>{
 const renderer=fakeRenderer(),budget=sceneBudget({container:{clientWidth:390,clientHeight:844},renderer}),effect={render(){},resize(){}},camera=new THREE.PerspectiveCamera(),view=camera.toJSON();budget.resize(390,844);let frames=0,shadows=0;for(let n=0;n<60;n++){const t=n*1000/60;if(!budget.step(t))continue;renderer.shadowMap.needsUpdate=false;if(budget.render(effect,t))frames++;if(renderer.shadowMap.needsUpdate)shadows++;}assert.ok(frames>=29&&frames<=31);assert.ok(shadows<=10&&shadows>=8);assert.equal(renderer.shadowMap.autoUpdate,false);assert.deepEqual(renderer.size,[390,844]);assert.deepEqual(camera.toJSON(),view);assert.equal(budget.stats().bloomHz,0);
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
