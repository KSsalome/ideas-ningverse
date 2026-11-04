import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyRewards,seasonOneRewards,rewards,featherReward,defaultCatalog,mergeRewardCatalog,visibleRewardCatalog,rarityNames,equipmentSlots,slotForReward,normalizeEquipment,applyEquipmentPatch,emptyEquipped,resolveCosmetics,bottleRewardPool,wardrobePatchSchema} from '../lib/collectibles.ts';

test('season one appends twelve stable collectibles and retains all original catalog identities and edits',()=>{
 assert.equal(legacyRewards.length+1,12);assert.equal(seasonOneRewards.length,12);assert.equal(new Set(defaultCatalog.map(r=>r.id)).size,24);
 assert.deepEqual(seasonOneRewards.map(r=>r.number),Array.from({length:12},(_,n)=>n+1));
 assert.deepEqual(seasonOneRewards.map(r=>r.type),['outfit','prop','outfit','hair','prop','prop','hair','prop','outfit','prop','outfit','prop']);
 const old={...legacyRewards[0],name:'島主先前編輯的瓶中資訊',description:'不能被 seed 覆蓋'};delete old.rarity;delete old.source;
 const catalog=mergeRewardCatalog([old]),visible=visibleRewardCatalog(catalog,new Set());
 assert.equal(catalog.find(r=>r.id===old.id).description,old.description);
 assert.deepEqual(visible.slice(0,12).map(r=>r.id),[...legacyRewards,featherReward].map(r=>r.id));
 assert.equal(visible.length,24);for(const r of seasonOneRewards){assert.ok(r.description);assert.ok(rarityNames[r.rarity]);assert.ok(slotForReward(r));}
 assert.equal(visibleRewardCatalog(catalog.map(r=>r.id===old.id?{...r,archived:true}:r),new Set([old.id])).length,24);
});

test('six independent slots migrate the former accessory and preserve saved ownership',()=>{
 const owned=new Set(defaultCatalog.map(r=>r.id)),old={outfit:'forest-cape',hair:'star-braid',prop:featherReward.id};
 const migrated=normalizeEquipment(old,defaultCatalog,owned);assert.equal(migrated.body,featherReward.id);assert.equal(migrated.prop,null);assert.equal(migrated.outfit,old.outfit);assert.equal(migrated.hair,old.hair);assert.deepEqual(old,{outfit:'forest-cape',hair:'star-braid',prop:featherReward.id});
 const eq=applyEquipmentPatch(old,{prop:'s1-brass-shaker',face:'s1-reading-glasses',effect:'s1-zero-card'},defaultCatalog,owned);
 assert.deepEqual(equipmentSlots.map(s=>eq[s]),['star-braid','forest-cape','s1-reading-glasses',featherReward.id,'s1-brass-shaker','s1-zero-card']);
 const look=resolveCosmetics(eq);assert.equal(look.body,'sun-feather');assert.equal(look.effect,'zero-card');
 assert.equal(applyEquipmentPatch(eq,{body:'s1-film-camera'},defaultCatalog,owned).body,'s1-film-camera');
 assert.equal(applyEquipmentPatch(eq,{face:null},defaultCatalog,owned).prop,'s1-brass-shaker');
 assert.throws(()=>applyEquipmentPatch(eq,{body:'s1-reading-glasses'},defaultCatalog,owned),/403/);
 assert.throws(()=>applyEquipmentPatch(eq,{hair:'s1-muse-duotone'},defaultCatalog,new Set()),/403/);
 assert.deepEqual(normalizeEquipment(eq,defaultCatalog,new Set()),emptyEquipped);
 assert.equal(wardrobePatchSchema.safeParse({prop:'x'.repeat(81)}).success,false);
});

test('island bottle pools prefer unseen themed finds, exclude reserved/owned/paused items, and never change rarity odds',()=>{
 for(const [island,ids] of Object.entries({home:[1,2],technology:[3],art:[4,5,6],library:[7,8],mine:[9,10],information:[11,12]})){
  const pool=bottleRewardPool(rewards,new Set(),island);assert.deepEqual(pool.map(r=>r.number),ids);assert.ok(pool.every(r=>r.weight===1));
  const owned=new Set(pool.map(r=>r.id)),fallback=bottleRewardPool(rewards,owned,island);assert.ok(fallback.every(r=>r.source==='archipelago'));
 }
 assert.equal(bottleRewardPool(rewards,new Set(rewards.map(r=>r.id)),'home').length,0);
 assert.equal(bottleRewardPool(rewards.map(r=>({...r,enabled:false})),new Set(),'mine').length,0);
});

test('all twelve items use visible low-poly geometry, valid bounds and no new light or particle systems',async()=>{
 const {default:makeAvatar,disposeAvatar}=await import('../app/avatar-model.js'),{guestAvatar}=await import('../lib/shared.ts'),THREE=await import('three');
 for(const low of [false,true])for(const item of seasonOneRewards){
  const slot=slotForReward(item),look=resolveCosmetics({...emptyEquipped,[slot]:item.id}),model=makeAvatar(guestAvatar,look,low);model.updateMatrixWorld(true);let triangles=0,lights=0,meshes=0;
  model.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}if(o.isLight||o.isPoints)lights++;});
  const bounds=new THREE.Box3().setFromObject(model);assert.ok(bounds.min.y>-.2&&bounds.max.y<2.5,item.id);assert.ok(triangles<(low?3500:18000),item.id+': '+triangles);assert.ok(meshes<65,item.id+': '+meshes);assert.equal(lights,0);assert.equal(model.userData.legs.length,2);assert.equal(model.userData.cosmetics[slot],item.appearance);disposeAvatar(model);
 }
});

test('six slots coexist; custom hair replaces the base style; accessories follow character transforms without changing movement',async()=>{
 const {default:makeAvatar,animateWearables,disposeAvatar}=await import('../app/avatar-model.js'),{guestAvatar}=await import('../lib/shared.ts'),THREE=await import('three');
 const eq={hair:'s1-muse-duotone',outfit:'s1-six-hour-cape',face:'s1-reading-glasses',body:'s1-film-camera',prop:'s1-brass-shaker',effect:'s1-zero-card'},look=resolveCosmetics(eq),model=makeAvatar({...guestAvatar,hairStyle:'long',accessory:'glasses'},look,true);
 for(const name of ['wearable-hair-cap','wearable-short-cape','wearable-reading-glasses','wearable-film-camera','wearable-brass-shaker','wearable-zero-card'])assert.ok(model.getObjectByName(name),name);
 const rootPosition=model.position.toArray(),rootScale=model.scale.toArray(),legs=model.userData.legs.map(l=>l.position.toArray());animateWearables(model,0,{phase:'medieval'});const lining=model.userData.capeLining.color.getHexString(),card=model.userData.floatingCard,y=card.position.y;
 animateWearables(model,3500,{phase:'cyber'});assert.notEqual(model.userData.capeLining.color.getHexString(),lining);assert.notEqual(card.position.y,y);
 const now=card.position.toArray();animateWearables(model,9000,{phase:'cyber',reducedMotion:true});assert.deepEqual(card.position.toArray(),now);
 assert.deepEqual(model.position.toArray(),rootPosition);assert.deepEqual(model.scale.toArray(),rootScale);assert.deepEqual(model.userData.legs.map(l=>l.position.toArray()),legs);
 model.position.set(10,3,-8);model.rotation.y=.7;model.updateMatrixWorld(true);assert.ok(card.getWorldPosition(new THREE.Vector3()).x>9);assert.equal(card.parent,model);
 const seen=new Set();for(const phase of ['forest','medieval','industrial','cyber','gothic','wonder']){animateWearables(model,0,{phase,reducedMotion:true});seen.add(model.userData.capeLining.color.getHexString());}assert.equal(seen.size,6);
 // Taipei midnight and dawn must not use host or visitor local timezone.
 animateWearables(model,0,{wallTime:Date.parse('2026-10-30T20:00:00Z'),reducedMotion:true});assert.equal(model.userData.liningPhase,'wonder');
 disposeAvatar(model);
});

test('bounded bottle placement uses existing walkable paths on each themed island, with no terrain or building edits',async()=>{
 const {bottlePosition}=await import('../lib/bottle-collection.ts'),{islands,terrainAt}=await import('../lib/archipelago.ts'),{walkable,findRoute}=await import('../lib/navigation.ts'),{publicBuildingDefaults}=await import('../lib/shared.ts');
 // Use the same seed project definitions used by the actual world endpoint.
 const projects=publicBuildingDefaults;let state=34;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
 for(const island of islands){for(let n=0;n<6;n++){const point=bottlePosition(projects,island.id,random);assert.ok(point,island.id);assert.equal(terrainAt(point.x,point.z).islandId,island.id);assert.ok(walkable(point.x,point.z,projects,false));assert.ok(Math.hypot(point.x,point.z-15)<1||findRoute({x:0,z:15},point,projects,false).length,island.id+' reachable');}}
});
