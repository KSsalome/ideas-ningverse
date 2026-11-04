import {z} from 'zod';
import {bookSchema,artworkSchema,tarotDeck,emptyEquipped,featherReward,type LibraryBook} from './experiences';
import {db,identity,requireOwner,listProjects,limit,jsonBody,response,runtime} from './server';
import {cookieValue,equal,sign} from './security';
import {bottlePosition,bottleClaimCandidates} from './bottle-collection';
import {islands} from './archipelago';
import {chickVisit,validChickVisit,taipeiDate} from './pet';
import {rewardSchema,weightedReward,bottleRewardPool,mergeRewardCatalog,visibleRewardCatalog,normalizeEquipment,applyEquipmentPatch,wardrobePatchSchema,type Reward} from './collectibles';
async function rewardCatalog():Promise<Reward[]>{const rows=await db().prepare('SELECT data FROM reward_catalog ORDER BY id').all<{data:string}>();return mergeRewardCatalog(rows.results.map(r=>JSON.parse(r.data)));}
function randomInt(n:number){if(n<=0||n>4294967296)throw new Error('Invalid random range');const limit=Math.floor(4294967296/n)*n;let value;do{value=crypto.getRandomValues(new Uint32Array(1))[0];}while(value>=limit);return value%n;}
function taipeiDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
async function actor(request:Request):Promise<{key:string;who:Awaited<ReturnType<typeof identity>>;headers:Record<string,string>}>{const who=await identity(request);if(who.user)return {key:'user:'+who.user.userId,who,headers:{}};const cookie=cookieValue(request,'__Host-island_guest');if(cookie){const [id,sig]=cookie.split('.');if(id&&sig&&equal(sig,await sign(id,runtime().SESSION_SECRET)))return{key:'guest:'+id,who,headers:{}};}const id=crypto.randomUUID(),value=id+'.'+await sign(id,runtime().SESSION_SECRET);return{key:'guest:'+id,who,headers:{'Set-Cookie':`__Host-island_guest=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`}};}
async function libraryAccess(request:Request,libraryId:string){const who=await identity(request),building=(await listProjects(who.unlocked)).find(p=>p.id===libraryId&&p.kind==='special'&&p.specialType==='library');if(!building)throw new Error('404:找不到可參觀的圖書館');return{who,building};}
async function booksFor(request:Request,libraryId:string){const {who}=await libraryAccess(request,libraryId);const rows=await db().prepare('SELECT data FROM library_books WHERE library_id=? ORDER BY updated_at DESC,id').bind(libraryId).all<{data:string}>();return rows.results.map(row=>bookSchema.parse(JSON.parse(row.data))).filter(book=>book.privacy==='public'||who.unlocked);}
async function checkBookAssets(book:LibraryBook){for(const url of [book.coverUrl,book.resourceUrl]){if(!url.startsWith('/api/island/asset/'))continue;const asset=await db().prepare('SELECT scope FROM assets WHERE id=?').bind(url.split('/').pop()).first<{scope:string}>();if(!asset||asset.scope!==book.privacy)throw new Error('400:書籍檔案的公開範圍不同，請重新上傳');}}
async function explore(request:Request){
 const a=await actor(request),now=Date.now(),catalog=await rewardCatalog(),requested=new URL(request.url).searchParams.get('island'),island=islands.find(i=>i.id===requested)?.id??'home';
 const owned=await db().prepare('SELECT item_id,acquired_at FROM inventory WHERE actor=? ORDER BY acquired_at DESC').bind(a.key).all<{item_id:string;acquired_at:number}>(),ownedIds=new Set(owned.results.map(r=>r.item_id));
 await db().prepare('INSERT OR IGNORE INTO explorers(actor,next_spawn_at) VALUES(?,?)').bind(a.key,now+15000+randomInt(25001)).run();
 const state=await db().prepare('SELECT next_spawn_at FROM explorers WHERE actor=?').bind(a.key).first<{next_spawn_at:number}>();
 if(state&&state.next_spawn_at<=now){
  const next=now+60000+randomInt(120001),updated=await db().prepare('UPDATE explorers SET next_spawn_at=? WHERE actor=? AND next_spawn_at<=?').bind(next,a.key,now).run();
  if(updated.meta.changes){
   await db().prepare('DELETE FROM bottles WHERE actor=? AND expires_at<?').bind(a.key,now-86400000).run();
   const pending=await db().prepare('SELECT reward_id FROM bottles WHERE actor=? AND claimed_at IS NULL AND expires_at>?').bind(a.key,now).all<{reward_id:string}>();
   if(pending.results.length<2){
    const reserved=new Set([...ownedIds,...pending.results.map(b=>b.reward_id)]),pool=bottleRewardPool(catalog,reserved,island),reward=weightedReward(pool,randomInt(1000000000)/1000000000);
    if(reward){const p=bottlePosition(await listProjects(false),island,()=>randomInt(1000000)/1000000);if(p)await db().prepare('INSERT INTO bottles(id,actor,x,z,spawned_at,expires_at,reward_id) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),a.key,p.x,p.z,now,now+8*60000,reward.id).run();}
   }
  }
 }
 const [active,wardrobe,next,featherRows]=await Promise.all([
  db().prepare('SELECT id,x,z,expires_at AS expiresAt FROM bottles WHERE actor=? AND claimed_at IS NULL AND expires_at>? ORDER BY spawned_at').bind(a.key,now).all<{id:string;x:number;z:number;expiresAt:number}>(),
  db().prepare('SELECT data FROM wardrobes WHERE actor=?').bind(a.key).first<{data:string}>(),
  db().prepare('SELECT next_spawn_at FROM explorers WHERE actor=?').bind(a.key).first<{next_spawn_at:number}>(),
  db().prepare('SELECT day,acquired_at AS acquiredAt FROM pet_feathers WHERE actor=? ORDER BY day DESC').bind(a.key).all<{day:string;acquiredAt:number}>(),
 ]);
 if(featherRows.results.length)ownedIds.add(featherReward.id);
 const visibleCatalog=visibleRewardCatalog(catalog,ownedIds),equipped=normalizeEquipment(wardrobe?JSON.parse(wardrobe.data):emptyEquipped,visibleCatalog,ownedIds);
 return response({catalog:visibleCatalog,chick:await chickVisit(runtime().SESSION_SECRET),feathers:featherRows.results,featherCount:featherRows.results.length,featherClaimedToday:featherRows.results.some(f=>f.day===taipeiDate()),bottles:active.results.map(b=>({...b,islandId:islands.find(i=>((b.x-i.x)/i.rx)**2+((b.z-i.z)/i.rz)**2<=1)?.id??island})),inventory:owned.results.flatMap(row=>{const item=catalog.find(r=>r.id===row.item_id);return item?[{...item,acquiredAt:row.acquired_at}]:[];}),equipped,signedIn:!!a.who.user,nextSpawnAt:next?.next_spawn_at},200,a.headers);
}
export async function experienceRoute(request:Request,path:string):Promise<Response|null>{
 const url=new URL(request.url),method=request.method;
 if(method==='GET'&&path==='rewards'){await requireOwner(request);return response({rewards:await rewardCatalog()});}
 if(method==='POST'&&path==='rewards'){
  await requireOwner(request);const reward=rewardSchema.parse(await jsonBody(request));if(reward.id===featherReward.id)throw new Error('400:小雞的羽毛由每日相遇管理');
  const old=(await rewardCatalog()).find(r=>r.id===reward.id);if(old&&old.type!==reward.type)throw new Error('409:已建立的收藏請保留類型，或另增一件新收藏');if(old?.updatedAt&&old.updatedAt!==reward.updatedAt)throw new Error('409:這份瓶中收藏已更新，請重新讀取');
  if(!old){const count=await db().prepare('SELECT COUNT(*) AS n FROM reward_catalog').first<{n:number}>();if((count?.n??0)>=300)throw new Error('400:收藏項目已達 300 件，請先整理現有內容');}
  reward.updatedAt=new Date().toISOString();await db().prepare('INSERT INTO reward_catalog(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(reward.id,JSON.stringify(reward),reward.updatedAt).run();return response({reward});
 }
 if(method==='DELETE'&&path.startsWith('rewards/')){await requireOwner(request);const reward=(await rewardCatalog()).find(r=>r.id===path.split('/')[1]);if(!reward)throw new Error('404:找不到這件瓶中收藏');reward.archived=true;reward.enabled=false;reward.updatedAt=new Date().toISOString();await db().prepare('INSERT INTO reward_catalog(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(reward.id,JSON.stringify(reward),reward.updatedAt).run();return response({ok:true});}

 if(method==='GET'&&path==='artworks'){const galleryId=url.searchParams.get('gallery')??'island-museum',who=await identity(request),gallery=(await listProjects(who.unlocked)).find(p=>p.id===galleryId&&p.specialType==='gallery');if(!gallery)throw new Error('404:找不到可參觀的美術館');const rows=await db().prepare('SELECT data FROM artworks WHERE gallery_id=? ORDER BY updated_at DESC,id').bind(galleryId).all<{data:string}>();return response({artworks:rows.results.map(r=>artworkSchema.parse(JSON.parse(r.data))).filter(a=>a.privacy==='public'||who.unlocked)});}
 if(method==='POST'&&path==='artworks'){await requireOwner(request);const art=artworkSchema.parse(await jsonBody(request)),who=await identity(request),gallery=(await listProjects(who.unlocked)).find(p=>p.id===art.galleryId&&p.specialType==='gallery');if(!gallery)throw new Error('404:美術館不存在');if(gallery.privacy==='private')art.privacy='private';for(const src of [art.src,art.thumbnail]){if(!src.startsWith('/api/island/asset/'))continue;const asset=await db().prepare('SELECT scope FROM assets WHERE id=?').bind(src.split('/').pop()).first<{scope:string}>();if(!asset||asset.scope!==art.privacy)throw new Error('400:作品檔案的公開範圍不同，請重新上傳');}const old=await db().prepare('SELECT updated_at FROM artworks WHERE id=?').bind(art.id).first<{updated_at:string}>();if(old&&art.updatedAt&&art.updatedAt!==old.updated_at)throw new Error('409:作品已更新，請重新讀取');art.updatedAt=new Date().toISOString();await db().prepare('INSERT INTO artworks(id,gallery_id,data,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET gallery_id=excluded.gallery_id,data=excluded.data,updated_at=excluded.updated_at').bind(art.id,art.galleryId,JSON.stringify(art),art.updatedAt).run();return response({artwork:art});}
 if(method==='DELETE'&&path.startsWith('artworks/')){await requireOwner(request);await db().prepare('DELETE FROM artworks WHERE id=?').bind(path.split('/')[1]).run();return response({ok:true});}
 if(method==='POST'&&path==='pet/feather'){const a=await actor(request),input=z.object({visitId:z.string().max(250)}).parse(await jsonBody(request));await limit('feather:'+a.key,15,60000);if(!await validChickVisit(input.visitId,runtime().SESSION_SECRET))throw new Error('410:小雞已經飛到別的地方，請重新看看天空');const day=taipeiDate(),saved=await db().prepare('INSERT OR IGNORE INTO pet_feathers(actor,day,acquired_at) VALUES(?,?,?)').bind(a.key,day,Date.now()).run();const count=await db().prepare('SELECT COUNT(*) AS n FROM pet_feathers WHERE actor=?').bind(a.key).first<{n:number}>();return response({reward:featherReward,day,alreadyClaimed:!saved.meta.changes,featherCount:count?.n??0},200,a.headers);}
 if(method==='GET'&&path==='books'){const libraryId=url.searchParams.get('library')??'grand-library';return response({books:await booksFor(request,libraryId)});}
 if(method==='POST'&&path==='books'){
  await requireOwner(request);const book=bookSchema.parse(await jsonBody(request));const {building}=await libraryAccess(request,book.libraryId);if(building.privacy==='private')book.privacy='private';await checkBookAssets(book);const old=await db().prepare('SELECT updated_at FROM library_books WHERE id=?').bind(book.id).first<{updated_at:string}>();if(old&&book.updatedAt&&book.updatedAt!==old.updated_at)throw new Error('409:這本書已更新，請重新讀取後再編輯');book.updatedAt=new Date().toISOString();await db().prepare('INSERT INTO library_books(id,library_id,data,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET library_id=excluded.library_id,data=excluded.data,updated_at=excluded.updated_at').bind(book.id,book.libraryId,JSON.stringify(book),book.updatedAt).run();return response({book});
 }
 if(method==='DELETE'&&path.startsWith('books/')){await requireOwner(request);await db().prepare('DELETE FROM library_books WHERE id=?').bind(path.split('/')[1]).run();return response({ok:true});}
 if(method==='GET'&&path==='tarot'){const a=await actor(request),row=await db().prepare('SELECT data FROM tarot_draws WHERE actor=? AND day=?').bind(a.key,taipeiDay()).first<{data:string}>();return response({day:taipeiDay(),draw:row?JSON.parse(row.data):null},200,a.headers);}
 if(method==='POST'&&path==='tarot/draw'){const a=await actor(request);await limit('tarot:'+a.key,12,60000);const day=taipeiDay(),card=tarotDeck[randomInt(tarotDeck.length)],draw={day,card,reversed:randomInt(2)===1,drawnAt:new Date().toISOString()};await db().prepare('INSERT OR IGNORE INTO tarot_draws(actor,day,data) VALUES(?,?,?)').bind(a.key,day,JSON.stringify(draw)).run();const saved=await db().prepare('SELECT data FROM tarot_draws WHERE actor=? AND day=?').bind(a.key,day).first<{data:string}>();return response({draw:JSON.parse(saved!.data)},200,a.headers);}
 if(method==='GET'&&path==='explore')return explore(request);
 if(method==='POST'&&path==='bottles/claim'){
  const a=await actor(request);await limit('bottle:'+a.key,20,60000);
  const input=z.object({id:z.string().uuid(),x:z.number().finite().min(-115).max(115),z:z.number().finite().min(-70).max(70)}).parse(await jsonBody(request));
  const bottle=await db().prepare('SELECT * FROM bottles WHERE id=? AND actor=?').bind(input.id,a.key).first<{id:string;x:number;z:number;reward_id:string;expires_at:number;claimed_at:number|null}>();
  if(!bottle)throw new Error('404:這個瓶子不在你的旅途中');
  const catalog=await rewardCatalog(),reward=catalog.find(r=>r.id===bottle.reward_id);if(!reward)throw new Error('404:瓶子裡的收藏不存在');
  if(bottle.claimed_at)return response({reward,alreadyClaimed:true,alreadyOwned:true},200,a.headers);
  const now=Date.now();if(bottle.expires_at<=now)throw new Error('410:瓶子已被潮水帶走了');
  if(Math.hypot(input.x-bottle.x,input.z-bottle.z)>2.8)throw new Error('400:再靠近瓶子一點，就能拾起它');
  const island=islands.find(i=>((bottle.x-i.x)/i.rx)**2+((bottle.z-i.z)/i.rz)**2<=1)?.id??'home',candidates=bottleClaimCandidates(catalog,reward,island);
  // A single D1 transaction selects an unseen find, grants it and marks the bottle claimed.
  // The NOT EXISTS check runs inside the transaction, so two simultaneous bottles cannot grant the same unseen item.
  const result=await db().batch([
   db().prepare('UPDATE bottles SET reward_id=COALESCE((SELECT CAST(choice.value AS TEXT) FROM json_each(?) AS choice WHERE NOT EXISTS(SELECT 1 FROM inventory WHERE actor=? AND item_id=choice.value) ORDER BY CAST(choice.key AS INTEGER) LIMIT 1),reward_id) WHERE id=? AND actor=? AND claimed_at IS NULL AND expires_at>?').bind(JSON.stringify(candidates),a.key,bottle.id,a.key,now),
   db().prepare('INSERT OR IGNORE INTO inventory(actor,item_id,acquired_at) SELECT actor,reward_id,? FROM bottles WHERE id=? AND actor=? AND claimed_at IS NULL AND expires_at>?').bind(now,bottle.id,a.key,now),
   db().prepare('UPDATE bottles SET claimed_at=? WHERE id=? AND actor=? AND claimed_at IS NULL AND expires_at>?').bind(now,bottle.id,a.key,now),
  ]);
  const saved=await db().prepare('SELECT reward_id FROM bottles WHERE id=? AND actor=?').bind(bottle.id,a.key).first<{reward_id:string}>();
  return response({reward:catalog.find(r=>r.id===saved?.reward_id)??reward,alreadyOwned:!result[1].meta.changes,alreadyClaimed:!result[2].meta.changes},200,a.headers);
 }
 if(method==='POST'&&path==='wardrobe'){
  const a=await actor(request),patch=wardrobePatchSchema.parse(await jsonBody(request)),catalog=[...await rewardCatalog(),featherReward];
  const [wardrobe,owned,feather]=await Promise.all([db().prepare('SELECT data FROM wardrobes WHERE actor=?').bind(a.key).first<{data:string}>(),db().prepare('SELECT item_id FROM inventory WHERE actor=?').bind(a.key).all<{item_id:string}>(),db().prepare('SELECT day FROM pet_feathers WHERE actor=? LIMIT 1').bind(a.key).first()]);
  const ownedIds=new Set(owned.results.map(row=>row.item_id));if(feather)ownedIds.add(featherReward.id);
  const equipped=applyEquipmentPatch(wardrobe?JSON.parse(wardrobe.data):emptyEquipped,patch,catalog,ownedIds);
  await db().prepare('INSERT INTO wardrobes(actor,data) VALUES(?,?) ON CONFLICT(actor) DO UPDATE SET data=excluded.data').bind(a.key,JSON.stringify(equipped)).run();return response({equipped},200,a.headers);
 }
 return null;
}
