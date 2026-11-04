import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {publicBuildingDefaults} from '../lib/shared.ts';
import {homeAtmosphereAt,homeAtmospheres,exteriorBasePhase} from '../lib/home-atmosphere.ts';
import {islands,bridgeSegments} from '../lib/archipelago.ts';
import createWorldArt from '../app/world-art.js';
import {skyRegions,skyMaskAt} from '../app/home-sky.js';

function look(root){
 const h=createHash('sha256');root.updateMatrixWorld(true);
 root.traverse(o=>{
  h.update(JSON.stringify([o.type,o.name,o.position.toArray(),o.rotation.toArray(),o.scale.toArray(),o.castShadow,o.receiveShadow,o.renderOrder]));
  if(o.geometry){for(const name of ['position','normal','uv','color']){const a=o.geometry.attributes[name];if(a)h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}if(o.geometry.index)h.update(Buffer.from(o.geometry.index.array.buffer));}
  for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){h.update(JSON.stringify([m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.opacity,m.transparent,m.userData]));for(const key of ['map','normalMap','roughnessMap','emissiveMap'])if(m[key]?.image?.data)h.update(m[key].image.data);}
  if(o.isLight)h.update(JSON.stringify([o.color.getHex(),o.intensity,o.distance,o.angle,o.decay]));
 });return h.digest('hex');
}
function otherLooks(root,art,lowDetail){const result={};for(const [id,g]of art.districts)if(id!=='home')result[id]=look(g);result.bridges=look(root.getObjectByName('golden-bridges'));if(lowDetail)for(const id of art.districts.keys())if(id!=='home')result['proxy-'+id]=look(root.getObjectByName('distant-'+id));return result;}
function release(root,art){art.dispose();const geos=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))mats.add(m);});for(const m of mats){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}geos.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());}

test('main island uses exact Taipei boundaries and the same instant in any source timezone',()=>{
 const cases={'03:59:59':'gothic','04:00:00':'wonder','07:59:59':'wonder','08:00:00':'forest','10:59:59':'forest','11:00:00':'medieval','13:59:59':'medieval','14:00:00':'industrial','16:59:59':'industrial','17:00:00':'cyber','22:59:59':'cyber','23:00:00':'gothic','00:00:00':'gothic'};
 for(const [time,phase]of Object.entries(cases)){const instant=new Date('2026-10-29T'+time+'+08:00');assert.equal(homeAtmosphereAt(instant).phase,phase);assert.deepEqual(homeAtmosphereAt(instant),homeAtmosphereAt(new Date(instant.toISOString())));}
 assert.equal(new Set(Object.values(homeAtmospheres).map(p=>p.planting)).size,6);assert.equal(new Set(Object.values(homeAtmospheres).map(p=>p.sky.join())).size,6);
});

test('unchanged periods leave every other island, proxy, light and bridge unchanged, and switching never rebuilds the castle',()=>{
 for(const lowDetail of [false,true]){
  const root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase:exteriorBasePhase,lowDetail}),baseline=otherLooks(root,art,lowDetail),castle=art.homeArt.castle,castleIds=[];
  castle.traverse(o=>{if(o.geometry)castleIds.push(o.geometry.uuid);});const targets=art.clickable.slice(),buildingIds=[...art.buildings.keys()],before=JSON.stringify(publicBuildingDefaults),bridges=JSON.stringify(bridgeSegments());
  for(const phase of Object.keys(homeAtmospheres)){
   const old=root.getObjectByName('home-seasonal-garden'),oldPhase=old.userData.phase;let disposed=0;old.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));art.setPhase(phase);
   if(!['cyber','gothic','medieval','wonder'].includes(phase))assert.deepEqual(otherLooks(root,art,lowDetail),baseline,phase+' cannot recolor a neighbouring island');else assert.notDeepEqual(otherLooks(root,art,lowDetail),baseline,phase+' must change shared lighting');assert.equal(art.homeArt.castle,castle);const after=[];castle.traverse(o=>{if(o.geometry)after.push(o.geometry.uuid);});assert.deepEqual(after,castleIds);assert.deepEqual(art.clickable,targets);assert.deepEqual([...art.buildings.keys()],buildingIds);
   const garden=root.getObjectByName('home-seasonal-garden');assert.equal(garden.userData.phase,phase);assert.equal(garden.userData.planting,homeAtmospheres[phase].planting);assert.equal(art.districts.get('home').userData.atmosphere.scope,'home');assert.equal(root.getObjectsByProperty('name','home-seasonal-garden').length,1);if(oldPhase!==phase){assert.equal(old.parent,null);assert.ok(disposed>0,'previous garden GPU resources released');}
   assert.equal(JSON.stringify(publicBuildingDefaults),before);assert.equal(JSON.stringify(bridgeSegments()),bridges);
  }
  // Dawn shares morning lighting on first load without changing district models.
  const nightRoot=new THREE.Group(),night=createWorldArt({root:nightRoot,projects:publicBuildingDefaults,phase:'wonder',lowDetail});assert.notDeepEqual(otherLooks(nightRoot,night,lowDetail),baseline);release(nightRoot,night);release(root,art);
 }
});

test('only one batched garden is resident, with few motes, no new lights and frozen reduced-motion animation',()=>{
 for(const lowDetail of [false,true]){
  const root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase:'forest',lowDetail}),home=art.districts.get('home'),lights=[];home.traverse(o=>{if(o.isLight)lights.push(o.uuid);});
  for(const phase of Object.keys(homeAtmospheres)){
   art.setPhase(phase);const g=home.getObjectByName('home-seasonal-garden');let triangles=0,meshes=0;
   g.traverse(o=>{if(o.isLight)assert.fail('garden needs no extra light sources');if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
   assert.ok(triangles<18000,phase+': '+triangles);assert.ok(meshes<65,phase+': '+meshes);assert.ok(g.userData.moteCount<=8);assert.ok(home.userData.plantingCount>=24);
   const positions=[];g.traverse(o=>{if(o.name==='home-local-magic-mote')positions.push(o.position.toArray());});art.homeArt.update(8000,true);const still=[];g.traverse(o=>{if(o.name==='home-local-magic-mote')still.push(o.position.toArray());});assert.deepEqual(still,positions);
   const ids=[];home.traverse(o=>{if(o.isLight){ids.push(o.uuid);assert.ok(o.intensity<=24&&o.distance<=6.4&&!o.castShadow);}});assert.deepEqual(ids,lights);assert.equal(art.homeArt.materials.roof.color.getHexString(),'39291f');
  }release(root,art);
 }
});

test('main-island material lighting reuses its shader across periods without touching the global scene',()=>{
 const root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase:'forest'}),wall=art.homeArt.materials.wall,shader={uniforms:{},fragmentShader:'#include <lights_fragment_end>\n#include <fog_fragment>'};wall.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/reflectedLight.directDiffuse \*= homeKey/);assert.match(shader.fragmentShader,/homeFog/);const uniforms=shader.uniforms,key=uniforms.homeKey.value,cache=wall.customProgramCacheKey();art.setPhase('gothic');assert.equal(shader.uniforms,uniforms);assert.equal(uniforms.homeKey.value,key);assert.equal(uniforms.homeDirect.value,.96);assert.equal(wall.customProgramCacheKey(),cache);
 for(const [id,g]of art.districts)if(id!=='home')g.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))assert.equal(m.userData.homeLighting,undefined,id);});release(root,art);
});

test('local sky projects six separate protected background regions at narrow and wide camera angles',()=>{
 for(const [w,h]of [[320,740],[390,844],[1440,900]])for(const [x,y,z]of [[105,125,151],[0,110,150],[-95,85,120]]){
  const aspect=w/h,camera=new THREE.OrthographicCamera(-60*aspect,60*aspect,60,-60,.1,550);camera.position.set(x,y,z);camera.lookAt(0,12,0);camera.zoom=2;camera.updateProjectionMatrix();const r=skyRegions(camera,w,h);assert.equal(r.protected.length,6);assert.deepEqual(r.protected.map(i=>i.id),islands.slice(1).map(i=>i.id));for(const a of [r.home,...r.protected]){assert.ok([a.x,a.y,a.w,a.h].every(Number.isFinite));assert.ok(a.w>0&&a.h>0);}for(const i of islands.slice(1)){const p=new THREE.Vector3(i.x,i.height,i.z).project(camera),x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h,a=r.protected.find(a=>a.id===i.id);assert.ok(x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h,'neighbour background is fully excluded');}
 }
});

test('sky masking keeps neighbour regions clear and has a continuous soft edge rather than rectangular cuts',()=>{
 const regions={home:{x:0,y:0,w:1000,h:1000},protected:[{x:440,y:350,w:100,h:150}]};
 for(const [x,y]of [[440,350],[490,400],[540,500],[430,340],[550,510]])assert.equal(skyMaskAt(x,y,regions),0);
 assert.ok(skyMaskAt(600,430,regions)>.5);assert.ok(skyMaskAt(550.001,430,regions)<.00001);assert.ok(Math.abs(skyMaskAt(570.001,430,regions)-skyMaskAt(569.999,430,regions))<.0001);
 const camera=new THREE.OrthographicCamera(-60,60,60,-60,.1,550);camera.position.set(105,125,151);camera.lookAt(0,12,0);const real=skyRegions(camera,390,844);for(const i of islands.slice(1)){const v=new THREE.Vector3(i.x,i.height,i.z).project(camera);assert.equal(skyMaskAt((v.x*.5+.5)*390,(-v.y*.5+.5)*844,real),0);}
});
