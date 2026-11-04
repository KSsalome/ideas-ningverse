import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const req=createRequire(createRequire(import.meta.url).resolve('wrangler'));
const {Miniflare}=req('miniflare');
const root=path.resolve('dist/server');
const entries=await readdir(root,{recursive:true,withFileTypes:true});
const paths=entries.filter(e=>e.isFile()&&/\.m?js$/.test(e.name)).map(e=>path.join(e.parentPath,e.name));
const modules=[path.join(root,'index.js'),...paths.filter(p=>p!==path.join(root,'index.js'))].map(p=>({type:'ESModule',path:p}));
const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'island-integration-test'},r2Buckets:['BUCKET'],bindings:{SETUP_TOKEN:'local-preview-setup-only',SESSION_SECRET:'local-unit-test-session-secret'},assets:{directory:path.resolve('dist/client'),routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}},cf:false,inspectorPort:0});
let cookie='';
async function call(route,{method='GET',data,who,gate=false,status=200}={}){
 const headers={Origin:'https://island.test'};
 if(who){headers['oai-authenticated-user-id']=who;headers['oai-authenticated-user-email']=who+'@example.invalid';}
 if(gate)headers.Cookie=cookie;
 if(data!==undefined)headers['Content-Type']='application/json';
 const r=await mf.dispatchFetch('https://island.test'+route,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
 const text=await r.text();assert.equal(r.status,status,route+': '+text.slice(0,300));
 if(r.headers.get('set-cookie')?.startsWith('__Host-island_inner='))cookie=r.headers.get('set-cookie').split(';')[0];
 if(r.headers.get('Content-Type')?.includes('application/zip'))return Buffer.from(text,'binary');
 return JSON.parse(text);
}
try{
 const db=await mf.getD1Database('DB');
 for(const migration of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile('drizzle/'+migration,'utf8');for(const stmt of sql.split('--> statement-breakpoint'))if(stmt.trim())await db.prepare(stmt.trim()).run();}
 const legacy={id:'shiyuexu',title:'拾月序',category:'App',description:'舊版作品',status:'complete',progress:100,shape:'glass',color:'#ff0000',items:[]};
 await db.prepare('INSERT INTO projects(id,data,updated_at) VALUES(?,?,?)').bind(legacy.id,JSON.stringify(legacy),'2026-01-01T00:00:00Z').run();
 const initial=await call('/api/island/world');assert.equal(initial.projects.length,27);
 assert.equal(initial.projects[0].color,'#ff0000');assert.equal(initial.projects[0].shape,'glass');assert.equal(initial.projects[0].status,'complete');assert.deepEqual(initial.projects[0].position,{x:-10,z:8});
 assert.ok(!JSON.stringify(initial).includes('facebook-private'));
 await call('/api/island/diaries',{status:403});
 await call('/api/island/setup',{method:'POST',who:'owner-test',data:{token:'wrong',password:'only-a-local-test-password'},status:403});
 await call('/api/island/setup',{method:'POST',who:'owner-test',data:{token:'local-preview-setup-only',password:'only-a-local-test-password'}});
 assert.ok((await call('/api/island/world',{who:'owner-test',gate:true})).viewer.unlocked);
 const inner=await call('/api/island/world',{who:'owner-test',gate:true});assert.equal(inner.projects.length,28);
 let privateFB=inner.projects.find(p=>p.id==='facebook-private');assert.equal(privateFB.privacy,'private');
 privateFB=(await call('/api/island/projects',{method:'POST',who:'owner-test',gate:true,data:{...privateFB,accountHandle:'qa-private-handle',accountUrl:'https://facebook.com/qa-private-account'}})).project;
 for(const who of [undefined,'owner-test','visitor-test']){const view=await call('/api/island/world',{who});assert.ok(!JSON.stringify(view).includes('qa-private'));assert.ok(!JSON.stringify(view).includes('facebook-private'));}
 const {freePosition}=await import('../lib/layout.ts');
 const fresh={...initial.projects[1],id:'new-placement-test',title:'自由選位測試',position:null};fresh.position=freePosition(fresh,inner.projects);assert.ok(fresh.position);
 const built=(await call('/api/island/projects',{method:'POST',who:'owner-test',gate:true,data:fresh})).project;assert.deepEqual(built.position,fresh.position);
 await call('/api/island/projects',{method:'POST',who:'owner-test',gate:true,data:{...built,position:{x:42,z:38}},status:400});
 await call('/api/island/projects',{method:'POST',who:'owner-test',gate:true,data:{...built,position:initial.projects[0].position},status:400});
 const beforeDelete=await call('/api/island/world');await call('/api/island/projects/instagram-2',{method:'DELETE',who:'owner-test',gate:true});const afterDelete=await call('/api/island/world');
 assert.ok(!afterDelete.projects.some(p=>p.id==='instagram-2'));for(const p of afterDelete.projects)assert.deepEqual(p.position,beforeDelete.projects.find(x=>x.id===p.id).position,p.id);
 await call('/api/island/projects/new-placement-test',{method:'DELETE',who:'owner-test',gate:true});
 await call('/api/island/diaries',{who:'visitor-test',gate:true,status:403});
 await call('/api/island/diaries',{who:'owner-test',status:423});
 let p={...initial.projects[0],status:'building',progress:47};
 p=(await call('/api/island/projects',{method:'POST',who:'owner-test',gate:true,data:p})).project;
 assert.equal((await call('/api/island/world')).projects[0].progress,47);
 await call('/api/island/projects',{method:'POST',who:'visitor-test',gate:true,data:p,status:403});
 await call('/api/island/projects',{method:'POST',who:'owner-test',gate:true,data:{...p,updatedAt:'stale'},status:409});
 const avatar={name:'測試旅人',skin:'#e7c4ac',hair:'#3c3443',outfit:'#a397b3',hairStyle:'long',accessory:'glasses',eyes:'brown'};
 await call('/api/island/avatar',{method:'POST',who:'visitor-test',data:avatar});
 assert.equal((await call('/api/island/world',{who:'visitor-test'})).avatar.name,avatar.name);
 assert.equal((await call('/api/island/world',{who:'another-test'})).avatar,null);
 const form=new FormData();form.set('scope','private');form.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1sAAAAASUVORK5CYII=','base64')],'private.png',{type:'image/png'}));
 const uploadRequest=new Request('https://island.test/api/island/upload',{method:'POST',headers:{Origin:'https://island.test','oai-authenticated-user-id':'owner-test','oai-authenticated-user-email':'owner-test@example.invalid',Cookie:cookie},body:form});
 const upload=await mf.dispatchFetch(uploadRequest.url,{method:'POST',headers:Object.fromEntries(uploadRequest.headers),body:await uploadRequest.arrayBuffer()});
 assert.equal(upload.status,200);const asset=await upload.json();
 await call(asset.url,{status:403});
 const privateImage=await mf.dispatchFetch('https://island.test'+asset.url,{headers:{'oai-authenticated-user-id':'owner-test','oai-authenticated-user-email':'owner-test@example.invalid',Cookie:cookie}});assert.equal(privateImage.status,200);await privateImage.arrayBuffer();
 const diary={id:'test-diary',date:'2026-10-27',title:'本機測試',body:'測試資料不會進入正式網站',mood:'平靜',images:[asset.url]};
 await call('/api/island/diaries',{method:'POST',who:'owner-test',gate:true,data:diary});
 assert.equal((await call('/api/island/diaries',{who:'owner-test',gate:true})).diaries[0].body,diary.body);
 const exported=await mf.dispatchFetch('https://island.test/api/island/export',{headers:{Origin:'https://island.test','oai-authenticated-user-id':'owner-test','oai-authenticated-user-email':'owner-test@example.invalid',Cookie:cookie}});
 assert.equal(exported.status,200);assert.equal(exported.headers.get('Content-Type'),'application/zip');
 const {unzipSync,strFromU8}=createRequire(import.meta.url)('fflate');const zip=unzipSync(new Uint8Array(await exported.arrayBuffer()));assert.equal(JSON.parse(strFromU8(zip['diaries.json'])).diaries[0].id,diary.id);
 await call('/api/island/export',{who:'visitor-test',gate:true,status:403});
 const mcp=await call('/mcp',{method:'POST',who:'owner-test',data:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_island_projects',arguments:{}}}});assert.ok(!mcp.result.isError);
 const denied=await call('/mcp',{method:'POST',who:'visitor-test',data:{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_island_projects',arguments:{}}}});assert.ok(denied.result.isError);
 // Library editing and visibility use the existing owner wall gate.
 const book={id:'test-book',libraryId:'grand-library',title:'圖書館測試書',author:'本機測試作者',notes:'書架上的閱讀筆記',description:'僅測試環境',privacy:'public',color:'#896d7c'};
 await call('/api/island/books',{method:'POST',who:'visitor-test',data:book,status:403});
 await call('/api/island/books',{method:'POST',who:'owner-test',data:book,status:423});
 let savedBook=(await call('/api/island/books',{method:'POST',who:'owner-test',gate:true,data:book})).book;
 assert.equal((await call('/api/island/books')).books[0].notes,book.notes);
 const privateBook=(await call('/api/island/books',{method:'POST',who:'owner-test',gate:true,data:{...book,id:'private-book',title:'私藏書',privacy:'private',resourceUrl:asset.url}})).book;
 for(const who of [undefined,'owner-test','visitor-test'])assert.ok(!(await call('/api/island/books',{who})).books.some(b=>b.id===privateBook.id));
 assert.ok((await call('/api/island/books',{who:'owner-test',gate:true})).books.some(b=>b.id===privateBook.id));
 await call('/api/island/books',{method:'POST',who:'owner-test',gate:true,data:{...savedBook,resourceUrl:asset.url},status:400});
 await call('/api/island/books',{method:'POST',who:'owner-test',gate:true,data:{...savedBook,updatedAt:'stale'},status:409});
 await call('/api/island/books/test-book',{method:'DELETE',who:'owner-test',gate:true});
 assert.ok(!(await call('/api/island/books')).books.length);
 // Daily card is stable and account bound; guest cookie is browser bound.
 const draw=(await call('/api/island/tarot/draw',{method:'POST',who:'visitor-test',data:{}})).draw;
 assert.deepEqual((await call('/api/island/tarot/draw',{method:'POST',who:'visitor-test',data:{}})).draw,draw);
 assert.equal((await call('/api/island/tarot',{who:'another-test'})).draw,null);
 let guest=await mf.dispatchFetch('https://island.test/api/island/tarot');const guestCookie=guest.headers.get('set-cookie').split(';')[0];await guest.arrayBuffer();
 guest=await mf.dispatchFetch('https://island.test/api/island/tarot/draw',{method:'POST',headers:{Origin:'https://island.test',Cookie:guestCookie}});const guestDraw=(await guest.json()).draw;
 guest=await mf.dispatchFetch('https://island.test/api/island/tarot',{headers:{Cookie:guestCookie}});assert.deepEqual((await guest.json()).draw,guestDraw);
 // Force time in the isolated test database; production exposes no debug spawn endpoint.
 const game=await call('/api/island/explore',{who:'visitor-test'});assert.equal(game.bottles.length,0);assert.ok(game.nextSpawnAt>Date.now());
 await db.prepare('UPDATE explorers SET next_spawn_at=0 WHERE actor=?').bind('user:visitor-test').run();
 let exploration=await call('/api/island/explore',{who:'visitor-test'});assert.equal(exploration.bottles.length,1);const bottle=exploration.bottles[0];assert.ok(!('reward_id' in bottle));assert.ok(!('reward' in bottle));
 await call('/api/island/bottles/claim',{method:'POST',who:'another-test',data:{id:bottle.id,x:bottle.x,z:bottle.z},status:404});
 await call('/api/island/bottles/claim',{method:'POST',who:'visitor-test',data:{id:bottle.id,x:bottle.x>0?-44:44,z:0},status:400});
 await db.prepare('UPDATE bottles SET reward_id=? WHERE id=?').bind('forest-cape',bottle.id).run();
 const claimed=await call('/api/island/bottles/claim',{method:'POST',who:'visitor-test',data:{id:bottle.id,x:bottle.x,z:bottle.z}});assert.equal(claimed.reward.id,'forest-cape');
 const repeated=await call('/api/island/bottles/claim',{method:'POST',who:'visitor-test',data:{id:bottle.id,x:bottle.x,z:bottle.z}});assert.equal(repeated.alreadyClaimed,true);
 exploration=await call('/api/island/explore',{who:'visitor-test'});assert.equal(exploration.inventory.length,1);assert.equal(exploration.bottles.length,0);
 await call('/api/island/wardrobe',{method:'POST',who:'visitor-test',data:{outfit:'moon-coat',hair:null,prop:null},status:403});
 await call('/api/island/wardrobe',{method:'POST',who:'visitor-test',data:{outfit:null,hair:'forest-cape',prop:null},status:403});
 await call('/api/island/wardrobe',{method:'POST',who:'visitor-test',data:{outfit:'forest-cape',hair:null,prop:null}});
 assert.equal((await call('/api/island/explore',{who:'visitor-test'})).equipped.outfit,'forest-cape');assert.equal((await call('/api/island/explore',{who:'another-test'})).inventory.length,0);
 await db.prepare('UPDATE explorers SET next_spawn_at=0 WHERE actor=?').bind('user:visitor-test').run();
 const expiring=(await call('/api/island/explore',{who:'visitor-test'})).bottles[0];await db.prepare('UPDATE bottles SET expires_at=0 WHERE id=?').bind(expiring.id).run();
 await call('/api/island/bottles/claim',{method:'POST',who:'visitor-test',data:{id:expiring.id,x:expiring.x,z:expiring.z},status:410});
 const handmade={...initial.projects[0],id:'handmade-piece-test',title:'手作分類測試',islandId:'mine',category:'手做',categoryIcon:'handcraft',collectionCategory:'其他手作',position:null,updatedAt:undefined};const handmadeSaved=(await call('/api/island/projects',{method:'POST',who:'owner-test',gate:true,data:handmade})).project;assert.deepEqual(handmadeSaved.position,{x:0,z:0});assert.equal(handmadeSaved.collectionCategory,'其他手作');await call('/api/island/projects/handmade-piece-test',{method:'DELETE',who:'owner-test',gate:true});

 // Editable bottle catalog, silhouettes, and dynamic wearable definitions.
 let catalog=(await call('/api/island/explore',{who:'visitor-test'})).catalog;assert.equal(catalog.length,(await import('../lib/collectibles.ts')).defaultCatalog.length);assert.ok(catalog.some(r=>r.id==='sun-conure-feather'));
 await call('/api/island/rewards',{status:403});await call('/api/island/rewards',{who:'owner-test',status:423});
 const original=(await call('/api/island/rewards',{who:'owner-test',gate:true})).rewards.find(r=>r.id==='forest-cape');
 await call('/api/island/rewards',{method:'POST',who:'visitor-test',data:original,status:403});
 const edited=(await call('/api/island/rewards',{method:'POST',who:'owner-test',gate:true,data:{...original,name:'可編輯斗篷',description:'新版說明',color:'#ff0033'}})).reward;
 let wearer=await call('/api/island/explore',{who:'visitor-test'});assert.equal(wearer.inventory[0].name,edited.name);assert.equal(wearer.equipped.outfit,edited.id);assert.equal(wearer.catalog.find(r=>r.id===edited.id).color,'#ff0033');
 await call('/api/island/rewards',{method:'POST',who:'owner-test',gate:true,data:original,status:409});
 await call('/api/island/rewards',{method:'POST',who:'owner-test',gate:true,data:{...edited,type:'hair',appearance:'star-braid'},status:409});
 const custom=(await call('/api/island/rewards',{method:'POST',who:'owner-test',gate:true,data:{...edited,id:'custom-lantern',updatedAt:undefined,name:'自訂提燈',type:'prop',appearance:'hand-lantern',weight:5}})).reward;
 await call('/api/island/wardrobe',{method:'POST',who:'visitor-test',data:{outfit:null,hair:null,prop:custom.id},status:403});
 const pending=crypto.randomUUID();await db.prepare('INSERT INTO bottles(id,actor,x,z,spawned_at,expires_at,reward_id) VALUES(?,?,?,?,?,?,?)').bind(pending,'user:visitor-test',45,24,Date.now(),Date.now()+60000,custom.id).run();
 assert.equal((await call('/api/island/bottles/claim',{method:'POST',who:'visitor-test',data:{id:pending,x:45,z:24}})).reward.name,custom.name);
 await call('/api/island/wardrobe',{method:'POST',who:'visitor-test',data:{outfit:edited.id,hair:null,prop:custom.id}});
 await call('/api/island/rewards/'+custom.id,{method:'DELETE',who:'owner-test',gate:true});
 assert.ok((await call('/api/island/explore',{who:'visitor-test'})).catalog.some(r=>r.id===custom.id));assert.ok(!(await call('/api/island/explore',{who:'another-test'})).catalog.some(r=>r.id===custom.id));
 assert.equal((await call('/api/island/explore',{who:'visitor-test'})).equipped.prop,custom.id);
 await call('/api/island/rewards/forest-cape',{method:'DELETE',who:'owner-test',gate:true});assert.ok((await call('/api/island/explore',{who:'visitor-test'})).inventory.some(r=>r.id==='forest-cape'));
 const dbCatalog=(await call('/api/island/rewards',{who:'owner-test',gate:true})).rewards;
 for(const item of dbCatalog)await call('/api/island/rewards',{method:'POST',who:'owner-test',gate:true,data:{...item,enabled:false}});
 await call('/api/island/explore',{who:'empty-drops-test'});await db.prepare('UPDATE explorers SET next_spawn_at=0 WHERE actor=?').bind('user:empty-drops-test').run();assert.equal((await call('/api/island/explore',{who:'empty-drops-test'})).bottles.length,0);
 await call('/api/island/wardrobe',{method:'POST',who:'another-test',data:{outfit:null,hair:null,prop:'sun-conure-feather'},status:403});
 console.log('PASS: editable bottle catalog, owner gate, stale edits, dynamic wardrobe, archived ownership and paused drops');
 // Museum editing, media visibility and daily feathers share the existing owner/visitor rules.
 const artwork={id:'test-artwork',galleryId:'island-museum',title:'測試畫面',medium:'photo',description:'本機測試資料',color:'#aa8877',src:'https://example.invalid/test.jpg'};
 await call('/api/island/artworks',{method:'POST',who:'visitor-test',data:artwork,status:403});await call('/api/island/artworks',{method:'POST',who:'owner-test',data:artwork,status:423});
 const art=(await call('/api/island/artworks',{method:'POST',who:'owner-test',gate:true,data:artwork})).artwork;assert.equal((await call('/api/island/artworks')).artworks[0].title,artwork.title);assert.equal(art.gallerySection,'auto');
 await call('/api/island/artworks',{method:'POST',who:'owner-test',gate:true,data:{...artwork,gallerySection:'roof'},status:400});
 const assigned=(await call('/api/island/artworks',{method:'POST',who:'owner-test',gate:true,data:{...art,gallerySection:'cosplay'}})).artwork;assert.equal(assigned.id,art.id);assert.equal((await call('/api/island/artworks')).artworks[0].gallerySection,'cosplay');
 await call('/api/island/artworks',{method:'POST',who:'owner-test',gate:true,data:{...art,src:asset.url},status:400});
 await call('/api/island/artworks',{method:'POST',who:'owner-test',gate:true,data:{...artwork,id:'private-art',privacy:'private',src:asset.url}});
 assert.equal((await call('/api/island/artworks')).artworks.length,1);assert.equal((await call('/api/island/artworks',{who:'owner-test',gate:true})).artworks.length,2);
 await call('/api/island/artworks/test-artwork',{method:'DELETE',who:'owner-test',gate:true});assert.equal((await call('/api/island/artworks')).artworks.length,0);
 let bird=await call('/api/island/explore',{who:'visitor-test'});assert.equal(bird.featherCount,0);assert.ok(bird.chick.visitId);let feather=await call('/api/island/pet/feather',{method:'POST',who:'visitor-test',data:{visitId:bird.chick.visitId}});assert.equal(feather.featherCount,1);assert.equal(feather.alreadyClaimed,false);
 feather=await call('/api/island/pet/feather',{method:'POST',who:'visitor-test',data:{visitId:bird.chick.visitId}});assert.equal(feather.alreadyClaimed,true);assert.equal(feather.featherCount,1);
 await call('/api/island/wardrobe',{method:'POST',who:'visitor-test',data:{outfit:'forest-cape',hair:null,prop:'sun-conure-feather'}});assert.equal((await call('/api/island/explore',{who:'visitor-test'})).equipped.body,'sun-conure-feather');
 const birdState=await call('/api/island/explore',{who:'visitor-test'});assert.equal(birdState.feathers.length,1);assert.equal(birdState.featherClaimedToday,true);assert.equal((await call('/api/island/explore',{who:'another-test'})).featherCount,0);
 await call('/api/island/pet/feather',{method:'POST',who:'visitor-test',data:{visitId:'0.invalid'},status:410});
 const anotherBird=await call('/api/island/explore',{who:'another-test'});assert.equal((await call('/api/island/pet/feather',{method:'POST',who:'another-test',data:{visitId:anotherBird.chick.visitId}})).featherCount,1);
 const parallelBird=await call('/api/island/explore',{who:'parallel-feather-test'});const simultaneous=await Promise.all(Array.from({length:3},()=>call('/api/island/pet/feather',{method:'POST',who:'parallel-feather-test',data:{visitId:parallelBird.chick.visitId}})));assert.equal(simultaneous.filter(x=>!x.alreadyClaimed).length,1);assert.equal((await call('/api/island/explore',{who:'parallel-feather-test'})).featherCount,1);
 await db.prepare('UPDATE pet_feathers SET day=? WHERE actor=?').bind('2000-01-01','user:visitor-test').run();assert.equal((await call('/api/island/pet/feather',{method:'POST',who:'visitor-test',data:{visitId:bird.chick.visitId}})).featherCount,2);
 const guestExploreResponse=await mf.dispatchFetch('https://island.test/api/island/explore',{headers:{Cookie:guestCookie}});const guestBird=await guestExploreResponse.json();assert.equal(guestBird.featherCount,0);for(let n=0;n<2;n++){const guestFeatherResponse=await mf.dispatchFetch('https://island.test/api/island/pet/feather',{method:'POST',headers:{Origin:'https://island.test',Cookie:guestCookie,'Content-Type':'application/json'},body:JSON.stringify({visitId:guestBird.chick.visitId})});assert.equal(guestFeatherResponse.status,200);const result=await guestFeatherResponse.json();assert.equal(result.featherCount,1);assert.equal(result.alreadyClaimed,n===1);}
 // Season one: real API claims and wardrobe persistence in this isolated database only.
 const {seasonOneRewards,defaultCatalog,emptyEquipped}=await import('../lib/collectibles.ts');
 const storedCatalog=(await call('/api/island/rewards',{who:'owner-test',gate:true})).rewards;
 for(const seed of seasonOneRewards){const stored=storedCatalog.find(r=>r.id===seed.id);await call('/api/island/rewards',{method:'POST',who:'owner-test',gate:true,data:{...stored,enabled:true,archived:false}});}
 const collector='season-collector',at=Date.now();
 for(const seed of seasonOneRewards){
  const id=crypto.randomUUID();await db.prepare('INSERT INTO bottles(id,actor,x,z,spawned_at,expires_at,reward_id) VALUES(?,?,?,?,?,?,?)').bind(id,'user:'+collector,0,15,at,at+600000,seed.id).run();
  const result=await call('/api/island/bottles/claim',{method:'POST',who:collector,data:{id,x:0,z:15}});assert.equal(result.reward.id,seed.id);assert.equal(result.alreadyOwned,false);assert.equal(result.reward.rarity,seed.rarity);
 }
 let collected=await call('/api/island/explore',{who:collector});assert.equal(collected.inventory.length,seasonOneRewards.length);assert.deepEqual(collected.equipped,emptyEquipped);assert.equal(collected.catalog.length,defaultCatalog.length-1); // archived legacy cape stays visible only to its original owners
 const fullLook={hair:'s1-muse-duotone',outfit:'s1-six-hour-cape',face:'s1-reading-glasses',body:'s1-film-camera',prop:'s1-brass-shaker',effect:'s1-zero-card'};
 await call('/api/island/wardrobe',{method:'POST',who:collector,data:fullLook});assert.deepEqual((await call('/api/island/explore?island=mine',{who:collector})).equipped,fullLook);
 await call('/api/island/wardrobe',{method:'POST',who:collector,data:{body:'s1-paint-pouch'}});assert.deepEqual((await call('/api/island/explore',{who:collector})).equipped,{...fullLook,body:'s1-paint-pouch'});
 await call('/api/island/wardrobe',{method:'POST',who:collector,data:{face:null}});assert.equal((await call('/api/island/explore',{who:collector})).equipped.effect,fullLook.effect);
 await call('/api/island/wardrobe',{method:'POST',who:collector,data:{face:'s1-film-camera'},status:403});
 await call('/api/island/wardrobe',{method:'POST',who:'locked-collector',data:fullLook,status:403});
 await call('/api/island/wardrobe',{method:'POST',who:collector,data:emptyEquipped});assert.deepEqual((await call('/api/island/explore',{who:collector})).equipped,emptyEquipped);
 // Repeated clicks, parallel claims on one bottle and on two bottles are transaction-safe.
 const concurrent='concurrent-collector',ids=[crypto.randomUUID(),crypto.randomUUID()];
 for(const id of ids)await db.prepare('INSERT INTO bottles(id,actor,x,z,spawned_at,expires_at,reward_id) VALUES(?,?,?,?,?,?,?)').bind(id,'user:'+concurrent,29,-32,at,at+600000,'s1-muse-duotone').run();
 const multi=await Promise.all(ids.map(id=>call('/api/island/bottles/claim',{method:'POST',who:concurrent,data:{id,x:29,z:-32}})));
 assert.equal(new Set(multi.map(r=>r.reward.id)).size,2);assert.ok(multi.every(r=>!r.alreadyOwned&&r.reward.source==='art'));
 const replay=await Promise.all(Array.from({length:3},()=>call('/api/island/bottles/claim',{method:'POST',who:concurrent,data:{id:ids[0],x:29,z:-32}})));
 assert.ok(replay.every(r=>r.alreadyClaimed&&r.reward.id===multi[0].reward.id));assert.equal((await call('/api/island/explore',{who:concurrent})).inventory.length,2);
 // Every themed island spawns a reachable outdoor bottle, with no reward leaked before opening.
 const {terrainAt}=await import('../lib/archipelago.ts'),{walkable}=await import('../lib/navigation.ts');
 for(const island of ['home','technology','art','library','mine','information']){
  const who='spawn-'+island;await call('/api/island/explore?island='+island,{who});await db.prepare('UPDATE explorers SET next_spawn_at=0 WHERE actor=?').bind('user:'+who).run();
  const b=(await call('/api/island/explore?island='+island,{who})).bottles[0];assert.ok(b,island);assert.equal(b.islandId,island);assert.equal(terrainAt(b.x,b.z).islandId,island);assert.ok(walkable(b.x,b.z,initial.projects,false));assert.ok(!('reward_id' in b));
  const drop=await call('/api/island/bottles/claim',{method:'POST',who,data:{id:b.id,x:b.x,z:b.z}});assert.equal(drop.reward.source==='tarot'?'mine':drop.reward.source,island);
 }
 // A legacy JSON wardrobe migrates in memory; inventory, feather dates and original rows are not rewritten.
 const migrationActor='user:legacy-wardrobe-check',oldLook={outfit:'forest-cape',hair:'star-braid',prop:'sun-conure-feather'};
 for(const id of ['lore-time','forest-cape','star-braid'])await db.prepare('INSERT INTO inventory(actor,item_id,acquired_at) VALUES(?,?,?)').bind(migrationActor,id,12345).run();
 await db.prepare('INSERT INTO pet_feathers(actor,day,acquired_at) VALUES(?,?,?)').bind(migrationActor,'2026-01-01',12345).run();
 await db.prepare('INSERT INTO wardrobes(actor,data) VALUES(?,?)').bind(migrationActor,JSON.stringify(oldLook)).run();
 const beforeRows=await db.prepare('SELECT * FROM inventory WHERE actor=? ORDER BY item_id').bind(migrationActor).all();
 const migrated=await call('/api/island/explore',{who:'legacy-wardrobe-check'});assert.equal(migrated.equipped.body,'sun-conure-feather');assert.equal(migrated.equipped.outfit,'forest-cape');assert.equal(migrated.equipped.hair,'star-braid');assert.equal(migrated.feathers[0].day,'2026-01-01');
 assert.deepEqual((await db.prepare('SELECT * FROM inventory WHERE actor=? ORDER BY item_id').bind(migrationActor).all()).results,beforeRows.results);assert.deepEqual(JSON.parse((await db.prepare('SELECT data FROM wardrobes WHERE actor=?').bind(migrationActor).first()).data),oldLook);
 console.log('PASS: 12 seasonal finds; six-slot persistence; legacy wardrobe and inventory preservation; theme-aware spawns; atomic parallel and replay-safe bottle claims');
 console.log('PASS: museum CRUD/private media; one feather per Taipei day and actor; expired visit rejection; preserved projects on migrated islands');
 console.log('PASS: books and private notes; daily and guest tarot persistence; random bottles, proximity, actor isolation, expiry, idempotent collection, owned wardrobe');
 await call('/api/island/diaries/test-diary',{method:'DELETE',who:'owner-test',gate:true});
 await call('/api/island/lock',{method:'POST',who:'owner-test',gate:true,data:{}});
 await call('/api/island/diaries',{who:'owner-test',gate:true,status:423});
 const locked=await call('/api/island/world',{who:'owner-test',gate:true});assert.ok(!locked.viewer.unlocked);assert.ok(!JSON.stringify(locked).includes('qa-private'));assert.ok(!locked.projects.some(p=>p.privacy==='private'));
 const client=path.resolve('dist/client');for(const entry of await readdir(client,{recursive:true,withFileTypes:true})){if(entry.isFile()&&entry.name.endsWith('.js')){const source=await readFile(path.join(entry.parentPath,entry.name),'utf8');assert.ok(!source.includes('facebook-private'),entry.name+' must not bundle private building seed');}}
 console.log('PASS: legacy edits preserved; social privacy; placement, collision and stable deletion; avatar/image/diary permissions; ZIP; owner-only MCP');
}finally{await mf.dispose();}
