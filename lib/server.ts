import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {publicBuildingDefaults,projectSchema,avatarSchema,diarySchema,ownerAvatar,type Project} from './shared';
import {positionOf,freePosition,placementIssue,migrateLayout} from './layout';
import {cookieValue,verifySession} from './security';
export function runtime(){return env as unknown as {DB:D1Database;BUCKET:R2Bucket;SETUP_TOKEN:string;SESSION_SECRET:string};}
export function db(){return runtime().DB;}
export async function setting(key:string){return (await db().prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value:string}>())?.value??null;}
export async function setSetting(key:string,value:string){await db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();}
export async function sessionSecret(){return runtime().SESSION_SECRET+':'+await setting('password_hash');}
export async function identity(request?:Request){const user=await getChatGPTUser();const ownerId=await setting('owner_id');const isOwner=!!user&&user.userId===ownerId;const unlocked=!!request&&isOwner&&await verifySession(cookieValue(request,'__Host-island_inner'),user!.userId,await sessionSecret());return {user,isOwner,unlocked,configured:!!ownerId};}
export async function requireOwner(request:Request,gate=true){const who=await identity(request);if(!who.isOwner)throw new Error('403:只有島主可以操作');if(gate&&!who.unlocked)throw new Error('423:請先解鎖私人城門');return who.user!;}
const privateDefaults=[projectSchema.parse({id:'facebook-private',title:'Facebook 私藏帳號',category:'私人社群',description:'只留在城牆內的日常。帳號與連結等待補上。',kind:'social',platform:'facebook',privacy:'private',position:{x:3.8,z:-5.7},islandId:'home',layoutVersion:2,status:'complete',progress:100,shape:'glass',color:'#8799b0',items:[]})];
async function allProjects(){
 const rows=await db().prepare('SELECT data FROM projects').all<{data:string}>(),map=new Map([...publicBuildingDefaults,...privateDefaults].map(p=>[p.id,p]));
 for(const r of rows.results??[]){const raw=JSON.parse(r.data),p=projectSchema.parse({...map.get(raw.id),...raw,layoutVersion:raw.layoutVersion});map.set(p.id,p);}
 const projects=[...map.values()].filter(p=>!p.deleted);return migrateLayout(projects,[...publicBuildingDefaults,...privateDefaults]);
}
export async function listProjects(includePrivate=false){return (await allProjects()).filter(p=>includePrivate||p.privacy==='public');}
export async function saveProject(input:unknown){
 if(!input||typeof input!=='object'||!('id'in input)||typeof input.id!=='string')throw new Error('400:缺少建築編號');
 const old=await db().prepare('SELECT data,updated_at FROM projects WHERE id=?').bind(input.id).first<{data:string;updated_at:string}>();
 const base=old?JSON.parse(old.data):[...publicBuildingDefaults,...privateDefaults].find(p=>p.id===input.id);
 let p=projectSchema.parse({...base,...input});if(p.layoutVersion!==2)p=migrateLayout([p],publicBuildingDefaults)[0];
 if(p.updatedAt&&old&&p.updatedAt!==old.updated_at)throw new Error('409:作品已被更新，請重新載入後再編輯');
 if(!p.deleted){
  const others=await allProjects();if(!p.position)p.position=freePosition(p,others);const issue=placementIssue(p,others);if(issue)throw new Error('400:'+issue);
  for(const item of p.items){if(!item.src.startsWith('/api/island/asset/'))continue;const asset=await db().prepare('SELECT scope FROM assets WHERE id=?').bind(item.src.split('/').pop()).first<{scope:string}>();if(!asset)throw new Error('400:展示檔案不存在');if(asset.scope!==p.privacy)throw new Error('400:展示檔案的公開範圍不同，請在選定範圍後重新上傳檔案');}
 }
 p.updatedAt=new Date().toISOString();if(p.status==='complete')p.progress=100;if(p.status==='unconfigured')p.progress=null;
 await db().prepare('INSERT INTO projects(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(p.id,JSON.stringify(p),p.updatedAt).run();return p;
}
export async function limit(key:string,max:number,ms:number){const now=Date.now();await db().prepare('INSERT INTO limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END').bind(key,now+ms,now,now).run();const r=await db().prepare('SELECT count FROM limits WHERE key=?').bind(key).first<{count:number}>();if((r?.count??0)>max)throw new Error('429:先休息一下，稍後再試');}
export function response(data:unknown,status=200,extra:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...extra}});}
export function failure(e:unknown){const msg=e instanceof Error?e.message:'操作失敗';const m=msg.match(/^(\d{3}):(.*)$/s);if(m)return response({error:m[2]},Number(m[1]));if(e&&typeof e==='object'&&'issues'in e)return response({error:'資料格式不正確，請檢查欄位'},400);console.error('Island request failed',msg);return response({error:'暫時無法完成操作，請稍後再試'},500);}
export async function jsonBody(r:Request){const body=await r.text();if(body.length>1200000)throw new Error('413:內容太大');try{return JSON.parse(body);}catch{throw new Error('400:資料格式不正確');}}
export async function privateImageCheck(images:string[]){for(const path of images){const row=await db().prepare('SELECT scope FROM assets WHERE id=?').bind(path.split('/').pop()).first<{scope:string}>();if(!row||row.scope!=='private')throw new Error('400:日記圖片必須先上傳至私人區');}}
export {avatarSchema,diarySchema,ownerAvatar};
