import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {publicBuildingDefaults} from '../lib/shared.ts';
import {worldNightAt,smoothBlend,nightTransitionMs,nightTransition,nightStateForPhase} from '../lib/world-night.ts';
import {islands} from '../lib/archipelago.ts';
import createWorldArt from '../app/world-art.js';
import createHomeIsland from '../app/home-island-art.js';
import sceneEffects from '../app/scene-effects.js';

function geometryDigest(g){const hash=createHash('sha256');g.traverse(o=>{if(!o.geometry)return;hash.update(JSON.stringify([o.name,o.position.toArray(),o.rotation.toArray(),o.scale.toArray()]));for(const key of ['position','normal','uv']){const a=o.geometry.attributes[key];if(a)hash.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}if(o.geometry.index)hash.update(Buffer.from(o.geometry.index.array.buffer));});return hash.digest('hex');}
function materialState(m){return [m.color?.getHex(),m.roughness,m.metalness,m.opacity,m.map?.uuid];}
function release(root,art){art.dispose();const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))mats.add(m);});for(const m of mats){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}geos.forEach(g=>g.dispose());}

test('shared night uses Asia/Taipei 17:00–04:00 across midnight, independently of source timezone',()=>{
 for(const [time,expected]of [['16:59:59',false],['17:00:00',true],['22:59:59',true],['23:00:00',true],['00:00:00',true],['03:59:59',true],['04:00:00',false]]){const date=new Date('2026-10-29T'+time+'+08:00');assert.equal(worldNightAt(date),expected);assert.equal(worldNightAt(new Date(date.toISOString())),expected);}
 assert.equal(smoothBlend(0,1,0),0);assert.equal(smoothBlend(0,1,nightTransitionMs/2),.5);assert.equal(smoothBlend(0,1,nightTransitionMs),1);assert.equal(smoothBlend(.4,0,-100),.4);
});

test('cyber changes only home architecture: every other district and bridge keeps geometry, wall/roof colours and content targets',()=>{
 for(const lowDetail of [false,true]){
  const root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase:'industrial',lowDetail}),groups=[...art.districts].filter(([id])=>id!=='home');groups.push(['bridges',root.getObjectByName('golden-bridges')]);if(lowDetail)for(const [id]of [...groups].filter(([id])=>id!=='bridges'))groups.push(['proxy-'+id,root.getObjectByName('distant-'+id)]);
  const geometry=groups.map(([id,g])=>[id,geometryDigest(g)]),stable=[art.libraryArt.materials.limestone,art.libraryArt.materials.roof,art.museumArt.materials.ivory,art.museumArt.materials.roof,art.factoryArt.materials.wallMetal,art.mineArt.materials.body,art.mineArt.materials.roof].filter(Boolean),before=stable.map(materialState),targets=art.clickable.slice(),buildings=[...art.buildings.entries()],source=JSON.stringify(publicBuildingDefaults),leaves=[art.libraryArt.materials.leaf,art.museumArt.materials.leaf,art.factoryArt.materials.leaf],dayLeaves=leaves.map(m=>m.color.clone());
  art.setPhase('cyber');assert.equal(art.nightLighting.mix,1);assert.deepEqual(stable.map(materialState),before);assert.deepEqual(groups.map(([id,g])=>[id,geometryDigest(g)]),geometry);assert.deepEqual(art.clickable,targets);assert.deepEqual([...art.buildings.entries()],buildings);assert.equal(JSON.stringify(publicBuildingDefaults),source);
  leaves.forEach((m,n)=>{assert.ok(m.color.r<=dayLeaves[n].r&&m.color.g<=dayLeaves[n].g&&m.color.b<=dayLeaves[n].b);assert.ok(!m.color.equals(dayLeaves[n]));});
  art.setPhase('industrial');assert.deepEqual(stable.map(materialState),before);leaves.forEach((m,n)=>assert.ok(m.color.equals(dayLeaves[n])));release(root,art);
 }
});

test('night lamps reuse existing bounded light pools, keep warm colours, and never compound after moving between districts',()=>{
 const root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase:'industrial'}),all=[];root.traverse(o=>{if(o.isPointLight||o.isSpotLight)all.push(o);});const ids=all.map(o=>o.uuid),colours=all.map(o=>o.color.getHex());art.setPhase('cyber');
 for(const island of islands){const target={x:island.x,z:island.z};art.setNightMix(0);art.updateQuality(target);const dayColours=all.map(o=>o.color.getHex());art.setNightMix(1);art.updateQuality(target);all.forEach((o,n)=>assert.equal(o.color.getHex(),dayColours[n]));const powers=all.map(o=>o.intensity);for(let n=0;n<40;n++){art.setNightMix(1);art.updateQuality(target);}assert.deepEqual(all.map(o=>o.intensity),powers);assert.ok(all.every(o=>Number.isFinite(o.intensity)&&o.intensity<=48&&!o.castShadow&&o.distance<=10));}
 const after=[];root.traverse(o=>{if(o.isPointLight||o.isSpotLight)after.push(o.uuid);});assert.deepEqual(after,ids);assert.ok(art.libraryArt.materials.warm.color.r>art.libraryArt.materials.warm.color.b);assert.ok(art.factoryArt.materials.warm.color.r>art.factoryArt.materials.warm.color.b);
 assert.ok(art.libraryArt.materials.windowBacking.emissiveIntensity>.12);assert.ok(art.factoryArt.materials.amber.emissiveIntensity>.26);release(root,art);
});

test('main castle and plants crossfade in place, with a restrained energy fountain and no new real-time lights',()=>{
 for(const lowDetail of [false,true]){
  const root=new THREE.Group(),art=createHomeIsland({root,island:islands[0],phase:'industrial',lowDetail}),walls=[];root.traverse(o=>{if(o.material?.userData.homeTechSurface&&o.material.userData.homeRole==='limestone')walls.push(o);});const wall=walls[0].material,day=wall.color.clone(),castle=geometryDigest(art.castle),initialCount=root.getObjectsByProperty('isLight',true).length;
  art.setPhase('cyber',{immediate:false,now:1000});assert.ok(wall.color.equals(day));art.update(5000,true);assert.equal(art.architecture.weights.cyber,.5);assert.ok(!wall.color.equals(day));art.update(9000,true);assert.equal(wall.color.getHexString(),'56687d');if(!lowDetail){const shader={uniforms:{},fragmentShader:'#include <map_fragment>\n#include <lights_fragment_end>\n#include <fog_fragment>'};wall.onBeforeCompile(shader);assert.equal(shader.uniforms.homeTechSurface.value,1);assert.ok(shader.uniforms.homeKey);assert.match(shader.fragmentShader,/mix\(diffuseColor.rgb, diffuse, homeTechSurface\)/);}assert.equal(root.userData.castleTheme,'cyber-royal-city');assert.equal(root.getObjectByName('home-seasonal-garden').userData.phase,'cyber');assert.equal(geometryDigest(art.castle),castle);
  assert.ok(root.getObjectByName('home-blue-violet-energy-fountain'));assert.ok(root.getObjectByName('home-holographic-banner'));assert.ok(root.getObjectByName('home-technology-halo'));assert.equal(root.getObjectByName('home-cyber-royal-devices').visible,true);assert.equal(root.getObjectByName('home-industrial-market-architecture').visible,false);assert.equal(root.getObjectByName('home-classic-courtyard-ornament').visible,false);
  let triangles=0,meshes=0;for(const name of ['home-cyber-royal-devices','home-industrial-market-architecture'])root.getObjectByName(name).traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}assert.ok(!o.isLight);});assert.ok(triangles<12000,`decorations ${triangles} triangles`);assert.ok(meshes<85,`decorations ${meshes} meshes`);assert.equal(root.getObjectsByProperty('isLight',true).length,initialCount);
  art.setPhase('industrial',{immediate:false,now:10000});art.update(18000,true);assert.ok(wall.color.equals(day));assert.equal(root.userData.castleTheme,'industrial-market');assert.equal(root.getObjectByName('home-seasonal-garden').userData.phase,'industrial');assert.equal(geometryDigest(art.castle),castle);release(root,art);
 }
});

test('global night reuses the outdoor light rig and fog without recolouring indoor museum or library lighting',()=>{
 for(const interior of [false,true]){const scene=new THREE.Scene(),renderer={setClearColor(){},render(){}},camera=new THREE.PerspectiveCamera(),effects=sceneEffects({renderer,scene,camera,lowDetail:true,interior,profile:interior?'museum':'default',transparentBackground:!interior});const lights=scene.children.filter(o=>o.isLight),day=lights.map(l=>[l.uuid,l.color.getHex(),l.intensity]),fog=scene.fog.color.getHex();effects.setOutdoorNight(.5);if(!interior){assert.notEqual(scene.fog.color.getHex(),fog);assert.notDeepEqual(lights.map(l=>[l.uuid,l.color.getHex(),l.intensity]),day);}else{assert.equal(scene.fog.color.getHex(),fog);assert.deepEqual(lights.map(l=>[l.uuid,l.color.getHex(),l.intensity]),day);}effects.setOutdoorNight(0);assert.equal(scene.fog.color.getHex(),fog);assert.deepEqual(lights.map(l=>[l.uuid,l.color.getHex(),l.intensity]),day);effects.dispose();}
});

test('23:00 stays fully night while depth fades in, and 04:00 fades to dawn without abrupt or invalid weights',()=>{
 const cycle=nightTransition('cyber');cycle.setPhase('gothic',1000);
 assert.deepEqual(cycle.update(1000),{mix:1,depth:0,noon:0,dawn:0});assert.deepEqual(cycle.update(5000),{mix:1,depth:.5,noon:0,dawn:0});assert.deepEqual(cycle.update(9000),{mix:1,depth:1,noon:0,dawn:0});assert.equal(cycle.active,false);
 cycle.setPhase('wonder',10000);assert.deepEqual(cycle.update(14000),{mix:.5,depth:.5,noon:0,dawn:.5});assert.deepEqual(cycle.update(18000),{mix:0,depth:0,noon:0,dawn:1});
 cycle.setPhase('gothic',20000);const partial=cycle.update(22000);cycle.setPhase('cyber',22000);assert.deepEqual(cycle.update(22000),partial);for(let now=22000;now<=30000;now+=100){const s=cycle.update(now);assert.ok(s.mix>=0&&s.mix<=1&&s.depth>=0&&s.depth<=s.mix);}assert.deepEqual(cycle.update(30000),nightStateForPhase('cyber'));
 for(const iso of ['2026-10-29T23:00:00+08:00','2026-10-30T00:00:00+08:00','2026-10-30T03:59:59+08:00'])assert.equal(worldNightAt(new Date(iso)),true);
});

test('gothic first load and repeat switching preserve other-island geometry, material identity, plant layout and all interactions',()=>{
 for(const lowDetail of [false,true]){
  const root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase:'industrial',lowDetail}),outside=[...art.districts].filter(([id])=>id!=='home').map(([,g])=>g);outside.push(root.getObjectByName('golden-bridges'));if(lowDetail)for(const id of art.districts.keys())if(id!=='home')outside.push(root.getObjectByName('distant-'+id));
  const geometry=outside.map(geometryDigest),materialIds=[];outside.forEach(g=>g.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))materialIds.push(m.uuid);}));const targets=art.clickable.slice(),walls=[art.libraryArt.materials.limestone,art.libraryArt.materials.roof,art.museumArt.materials.ivory,art.museumArt.materials.roof,art.factoryArt.materials.wallMetal,art.mineArt.materials.body,art.mineArt.materials.roof],base=walls.map(materialState),leaf=art.museumArt.materials.leaf,dayLeaf=leaf.color.clone();
  for(const phase of ['gothic','cyber','gothic','wonder','gothic']){art.setPhase(phase);assert.deepEqual(outside.map(geometryDigest),geometry);assert.deepEqual(walls.map(materialState),base);assert.deepEqual(art.clickable,targets);const ids=[];outside.forEach(g=>g.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))ids.push(m.uuid);}));assert.deepEqual(ids,materialIds);}
  assert.equal(art.nightLighting.mix,1);assert.equal(art.nightLighting.depth,1);assert.ok(leaf.color.r<dayLeaf.r*.8&&leaf.color.g<dayLeaf.g*.8);assert.ok(art.libraryArt.materials.warm.color.r>art.libraryArt.materials.warm.color.b);assert.ok(art.factoryArt.materials.warm.color.r>art.factoryArt.materials.warm.color.b);
  const night=walls.map(materialState);art.setPhase('wonder');assert.deepEqual(walls.map(materialState),night);assert.ok(leaf.color.g>dayLeaf.g&&leaf.color.g<=dayLeaf.g*1.06);release(root,art);
  const fresh=new THREE.Group(),nightArt=createWorldArt({root:fresh,projects:publicBuildingDefaults,phase:'gothic',lowDetail});assert.equal(nightArt.nightLighting.mix,1);assert.equal(nightArt.nightLighting.depth,1);assert.equal(nightArt.districts.get('home').userData.castleTheme,'gothic-midnight-citadel');release(fresh,nightArt);
 }
});

test('gothic castle keeps dark masonry, black roofs, wine flags, warm windows and a small static decorative budget',()=>{
 for(const lowDetail of [false,true]){
  const root=new THREE.Group(),art=createHomeIsland({root,island:islands[0],phase:'gothic',lowDetail}),surface=new Map();art.castle.traverse(o=>{const m=o.material;if(m?.userData.homeRole&&!surface.has(m.userData.homeRole))surface.set(m.userData.homeRole,m);if(o.name==='burgundy-cloth')assert.equal(m.color.getHexString(),'381421');if(o.name==='window-glazing'){assert.equal(m.color.getHexString(),'a77c51');assert.ok(m.emissive.r>m.emissive.b&&m.emissiveIntensity<=.25);}});
  assert.equal(surface.get('roof').color.getHexString(),'11141c');assert.equal(surface.get('limestone').color.getHexString(),'4f535b');assert.ok(surface.get('limestone').map||lowDetail);assert.ok(surface.get('limestone').metalness<.01||lowDetail);
  const gothic=root.getObjectByName('home-gothic-midnight-architecture');assert.equal(gothic.visible,true);assert.equal(root.getObjectByName('home-cyber-royal-devices').visible,false);assert.equal(root.getObjectByName('home-industrial-market-architecture').visible,false);assert.ok(gothic.getObjectByName('home-gothic-rose-window'));assert.ok(gothic.getObjectByName('home-gothic-moon-emblem'));assert.ok(gothic.getObjectByName('home-gothic-iron-candelabra'));assert.ok(gothic.getObjectByName('home-gothic-quiet-stone-statue'));
  let triangles=0,meshes=0;gothic.traverse(o=>{assert.ok(!o.isLight&&!o.isPoints);if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});assert.ok(triangles<6500,`gothic triangles ${triangles}`);assert.ok(meshes<40,`gothic meshes ${meshes}`);
  const castle=geometryDigest(art.castle),ids=root.getObjectsByProperty('isLight',true).map(o=>o.uuid);art.setPhase('cyber',{immediate:false,now:0});art.update(4000,true);assert.equal(art.architecture.weights.gothic,.5);assert.equal(art.architecture.weights.cyber,.5);art.update(8000,true);assert.equal(art.architecture.weights.gothic,0);assert.deepEqual(root.getObjectsByProperty('isLight',true).map(o=>o.uuid),ids);assert.equal(geometryDigest(art.castle),castle);release(root,art);
 }
});

test('deep moonlight is dimmer than cyber night while warm landmark lights remain bounded and stable',()=>{
 const scene=new THREE.Scene(),renderer={setClearColor(){},render(){}},camera=new THREE.PerspectiveCamera(),effects=sceneEffects({renderer,scene,camera,lowDetail:true,transparentBackground:true}),lights=scene.children.filter(o=>o.isLight);effects.setOutdoorNight(1,0);const cyber=lights.map(l=>l.intensity);effects.setOutdoorNight(1,1);lights.forEach((l,n)=>assert.ok(l.intensity<cyber[n]));assert.equal(scene.fog.color.getHexString(),'28313f');assert.ok(scene.fog.near>=140);assert.equal(lights.filter(l=>l.isDirectionalLight).length,2);effects.dispose();
 const root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase:'gothic'}),pool=[];root.traverse(o=>{if(o.isPointLight||o.isSpotLight)pool.push(o);});const ids=pool.map(o=>o.uuid);for(const i of islands){const target={x:i.x,z:i.z};art.updateQuality(target);const power=pool.map(l=>l.intensity);for(let n=0;n<15;n++){art.setNightMix(1,1);art.updateQuality(target);}assert.deepEqual(pool.map(l=>l.intensity),power);assert.ok(pool.every(l=>l.intensity<=48&&l.distance<=10&&!l.castShadow));}assert.deepEqual(pool.map(l=>l.uuid),ids);release(root,art);
});
