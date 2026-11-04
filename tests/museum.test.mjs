import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {artworkSchema} from '../lib/experiences.ts';
import {publicBuildingDefaults} from '../lib/shared.ts';
import {museumSection,museumSections,museumPalette,museumOutdoorBlocked} from '../lib/museum-style.ts';
import {museumLayout,museumFloorAt,museumFrameSlots,museumRoute,museumLevels,museumSurfaces} from '../lib/museum-layout.ts';
import createWorldArt from '../app/world-art.js';
import createMuseumInterior from '../app/museum-interior-art.js';
import museumExhibits from '../app/museum-exhibits.js';
import interiorCamera from '../app/interior-camera.js';

test('old museum media retain their IDs and automatic sections, while any medium can be assigned to cosplay',()=>{
 const old={id:'retained',title:'原作品',medium:'painting',src:'https://example.invalid/old.png'},parsed=artworkSchema.parse(old);assert.equal(parsed.gallerySection,'auto');assert.equal(museumSection(parsed),'drawing');assert.equal(parsed.src,old.src);
 for(const medium of ['photo','painting','video'])for(const section of museumSections){const a=artworkSchema.parse({...old,medium,gallerySection:section});assert.equal(museumSection(a),section);assert.equal(a.id,old.id);}
 assert.equal(museumSection({medium:'video'}),'photography');assert.equal(museumSection({category:'Cosplay'}),'cosplay');assert.equal(museumSection({category:'插畫'}),'drawing');assert.throws(()=>artworkSchema.parse({...old,gallerySection:'roof'}));
 const entries=Array.from({length:75},(_,n)=>({id:'work-'+n,medium:n%2?'photo':'painting',gallerySection:n%4?'auto':'cosplay'})),before=JSON.stringify(entries),l=museumLayout(entries),slots=museumFrameSlots(entries,l);assert.deepEqual(slots.filter(s=>s.entry).map(s=>s.entry.id).sort(),entries.map(e=>e.id).sort());assert.ok(slots.every(s=>s.z>l.back));assert.equal(JSON.stringify(entries),before);
});

test('all three galleries and every exhibition approach are reachable by continuously walkable stairs, in both directions',()=>{
 const l=museumLayout(),start={x:0,y:0,z:5.5};
 for(const to of [...museumLevels.flatMap(y=>[-1,1].map(side=>({x:side*9,y,z:5}))),{x:0,y:10.8,z:9},{x:0,y:5.4,z:-11}]){const route=museumRoute(start,to,l);assert.ok(route.length>0,JSON.stringify(to));assert.deepEqual(route.at(-1),to);let last=start;for(const p of route){let y=last.y;for(let n=1;n<=6;n++){y=museumFloorAt(last.x+(p.x-last.x)*n/6,last.z+(p.z-last.z)*n/6,y,l);assert.notEqual(y,null,'no jumping floors or crossing the atrium void');}assert.ok(Math.abs(y-p.y)<.02);last=p;}const back=museumRoute(to,start,l);assert.ok(back.length);assert.deepEqual(back.at(-1),start);}
 assert.equal(museumFloorAt(-1.35,-3,0,l),null,'no jumping into a stair flight halfway up');assert.equal(museumFloorAt(4,-3,5.4,l),null,'upper atrium opening is not a floor');assert.equal(museumFloorAt(4,-3,10.8,l),null);assert.equal(museumFloorAt(-7.8,8.5,5.4,l),null,'costume case blocks the avatar');assert.deepEqual(museumSurfaces(0,-7.8,l),[2.7,8.1]);
 // An off-grid pause on a staircase can resume its route.
 const from={x:-1.37,y:(1-(-2.17))/8*2.7,z:-2.17};assert.ok(museumRoute(from,{x:9,y:10.8,z:5},l).length);
});

test('complete Greek temple and paradise garden preserve the circular island, existing entrance, bridges and all six phases',async()=>{
 const {islandById,bridgeSegments,worldPosition}=await import('../lib/archipelago.ts'),{walkable,findRoute}=await import('../lib/navigation.ts'),{placementIssue}=await import('../lib/layout.ts'),i=islandById('art'),project=publicBuildingDefaults.find(p=>p.id==='island-museum'),q=worldPosition(project),before=JSON.stringify(project);
 for(const phase of ['wonder','forest','medieval','industrial','cyber','gothic']){const lowDetail=phase!=='medieval',root=new THREE.Group(),art=createWorldArt({root,projects:publicBuildingDefaults,phase,lowDetail}),district=art.districts.get('art'),building=art.buildings.get(project.id);assert.equal(district.position.x,i.x);assert.equal(district.position.z,i.z);assert.equal(district.userData.artDirection,'complete-greek-temple-paradise-garden');assert.ok(building.g.getObjectByName('museum-complete-stone-pediment'));assert.ok(building.g.getObjectByName('museum-small-column-gazebo'));assert.ok(building.g.getObjectByName('museum-round-garden-fountain'));assert.ok(building.g.getObjectByName('museum-vine-garden-arcade'));assert.deepEqual(building.entry,{x:q.x,z:q.z+7.8});let columns=0;building.g.traverse(o=>{if(o.name==='museum-corinthian-column')columns++;assert.ok(!/spire|ruin|broken/.test(o.name));});assert.ok(columns>=18);assert.equal(art.museumArt.materials.roof.color.getHexString(),museumPalette.roof.slice(1));if(lowDetail){assert.ok(root.getObjectByName('distant-art').getObjectByName('museum-complete-stone-pediment'));}else{assert.equal(district.children.filter(o=>o.isPointLight).length,4);assert.ok(district.children.filter(o=>o.isPointLight).every(l=>!l.castShadow&&l.distance<=7));}art.dispose();}
 assert.equal(JSON.stringify(project),before);assert.equal(placementIssue(project,publicBuildingDefaults),null);assert.ok(placementIssue({...project,position:{x:5,z:0}},publicBuildingDefaults));assert.ok(findRoute({x:0,z:15},{x:q.x,z:q.z+7.8},publicBuildingDefaults).length>20);assert.equal(museumOutdoorBlocked(0,7.8),false);assert.equal(museumOutdoorBlocked(0,0),true);assert.equal(museumOutdoorBlocked(8.2,7.3),true);for(const {a,b}of bridgeSegments()){assert.equal(walkable((a.x+b.x)/2,(a.z+b.z)/2,publicBuildingDefaults),true);}
});

test('each level has its own unlabelled props, operable frames and preserved artwork IDs within a small geometry budget',()=>{
 const entries=museumSections.flatMap((gallerySection,level)=>Array.from({length:3},(_,n)=>({id:gallerySection+n,title:'測試作品',gallerySection,type:'image',src:'',color:'#9a8972'}))),before=JSON.stringify(entries),l=museumLayout(entries);
 for(const lowDetail of [false,true]){const scene=new THREE.Scene(),art=createMuseumInterior({scene,layout:l,lowDetail}),exhibits=museumExhibits({scene,kit:art.kit,entries,layout:l,lowDetail});scene.updateMatrixWorld(true);assert.equal(exhibits.frames.length,18);assert.equal(exhibits.frames.filter(f=>f.entry).length,9);assert.equal(new Set(exhibits.clickables.map(o=>o.userData.id)).size,18);assert.equal(art.root.userData.noFloorLettering,true);for(const name of ['museum-retro-camera-and-film','museum-studio-tripod-and-softbox','museum-cosplay-costume-glass-case','museum-wig-display-stand','museum-cosplay-prop-plinth','museum-easel-and-blank-canvas','museum-paints-brushes-and-palette','museum-plaster-study-statue'])assert.ok(art.root.getObjectByName(name));
  for(const f of exhibits.frames){const ray=new THREE.Raycaster(f.point.clone().addScaledVector(f.normal,1.5),f.normal.clone().negate());const hit=ray.intersectObjects(exhibits.clickables,false)[0];assert.equal(hit.object.userData.id,f.entry?.id??f.panel.userData.id);assert.equal(f.level,museumSections.indexOf(f.section));assert.equal(f.panel.material.userData.bloom,undefined);}
  let triangles=0,meshes=0;scene.traverse(o=>{if(o.geometry){for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}}if(o.material?.map){assert.ok(o.material.map.image.width<=128);}assert.equal(o.userData.neonText,undefined);});assert.ok(triangles<55000,triangles);assert.ok(meshes<150,meshes);assert.equal(art.lightSources.length,3);assert.ok(art.lightSources.every(s=>s.power<=14));assert.ok(art.root.getObjectByName('museum-central-walkable-staircase'));assert.equal(art.root.getObjectByName('astral-chandelier'),undefined);art.dispose();}
 assert.equal(JSON.stringify(entries),before);
});

test('museum camera and every near-plane corner remain sealed inside on three floors and both staircase landings',()=>{
 const art=createMuseumInterior({scene:new THREE.Scene()}),b=art.cameraBounds,camera=new THREE.PerspectiveCamera(65,390/844,.1,170),controls={target:new THREE.Vector3(),update(){camera.lookAt(this.target);}},guard=interiorCamera({camera,controls,bounds:b,colliders:art.cameraColliders,focusHeight:1.9});
 for(const point of [{x:0,y:0,z:5.5},{x:9,y:5.4,z:5},{x:-9,y:10.8,z:0},{x:0,y:2.7,z:-7.8},{x:0,y:8.1,z:-7.8}])for(const aspect of [390/844,16/9,3.2])for(const distance of [.1,7,80])for(const phi of [.01,.7,1.7,3.1])for(const theta of [0,1.7,3.3,5]){camera.aspect=aspect;camera.updateProjectionMatrix();controls.target.set(point.x,point.y+1.9,point.z);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance,phi,theta)));guard.constrain(point.y);assert.ok(camera.position.y>point.y&&camera.position.y<b.ceiling);assert.ok(camera.position.x>b.minX&&camera.position.x<b.maxX&&camera.position.z>b.minZ&&camera.position.z<b.maxZ);for(const sx of [-1,1])for(const sy of [-1,1]){const corner=new THREE.Vector3(sx,sy,-1).unproject(camera);assert.ok(corner.x>b.minX&&corner.x<b.maxX&&corner.z>b.minZ&&corner.z<b.maxZ&&corner.y>point.y&&corner.y<b.ceiling);}}
 art.dispose();
});
