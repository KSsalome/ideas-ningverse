import {z} from 'zod';
import {experienceRoute} from '@/lib/experience-server';
import {zipSync,strToU8} from 'fflate';
import {db,setting,setSetting,identity,requireOwner,listProjects,saveProject,limit,response,failure,jsonBody,runtime,sessionSecret,privateImageCheck,avatarSchema,diarySchema,ownerAvatar} from '@/lib/server';
import {assertOrigin,equal,hashPassword,checkPassword,makeSession,sign} from '@/lib/security';
export const dynamic='force-dynamic';
const cookie=(v:string,age=3600)=>`__Host-island_inner=${v}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`;
async function handler(request:Request){try{
 const path=new URL(request.url).pathname.split('/api/island/')[1]??'',method=request.method;
 if(method!=='GET')assertOrigin(request);
 const experience=await experienceRoute(request,path);if(experience)return experience;
 if(method==='GET'&&path==='world'){
  const who=await identity(request),avatar=who.user?await db().prepare('SELECT data FROM avatars WHERE user_id=?').bind(who.user.userId).first<{data:string}>():null;
  return response({projects:await listProjects(who.unlocked),viewer:{signedIn:!!who.user,isOwner:who.isOwner,unlocked:who.unlocked,configured:who.configured},avatar:avatar?JSON.parse(avatar.data):null,ownerAvatar:JSON.parse(await setting('owner_avatar')??JSON.stringify(ownerAvatar)),socials:JSON.parse(await setting('socials')??'[]'),islandName:await setting('island_name')??'白語寧的島'});
 }
 if(method==='POST'&&path==='setup'){
  const {token,password}=z.object({token:z.string(),password:z.string().min(12).max(200)}).parse(await jsonBody(request)),who=await identity(request);if(!who.user)throw new Error('401:請先登入帳號');if(who.configured)throw new Error('409:島主已完成設定');await limit('setup:'+who.user.userId,8,900000);
  if(!runtime().SETUP_TOKEN||!equal(token,runtime().SETUP_TOKEN))throw new Error('403:設定連結無效');const hashed=await hashPassword(password);
  const result=await db().prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind('owner_id',who.user.userId).run();if(!result.meta.changes)throw new Error('409:島主已完成設定');await setSetting('password_hash',hashed);
  return response({ok:true},200,{'Set-Cookie':cookie(await makeSession(who.user.userId,await sessionSecret()))});
 }
 if(method==='POST'&&path==='unlock'){
  const user=await requireOwner(request,false);await limit('unlock:'+user.userId,7,900000);const {password}=z.object({password:z.string().max(200)}).parse(await jsonBody(request));if(!await checkPassword(password,await setting('password_hash')??''))throw new Error('403:城門密碼不正確');return response({ok:true},200,{'Set-Cookie':cookie(await makeSession(user.userId,await sessionSecret()))});
 }
 if(method==='POST'&&path==='lock')return response({ok:true},200,{'Set-Cookie':cookie('',0)});
 if(method==='POST'&&path==='avatar'){
  const who=await identity(request);if(!who.user)throw new Error('401:登入後才能跨裝置保存角色');const avatar=avatarSchema.parse(await jsonBody(request));await db().prepare('INSERT INTO avatars(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(who.user.userId,JSON.stringify(avatar),new Date().toISOString()).run();return response({avatar});
 }
 if(method==='GET'&&path==='messages')return response({messages:(await db().prepare('SELECT id,name,message,color,created_at AS createdAt FROM messages WHERE visible=1 ORDER BY created_at DESC LIMIT 100').all()).results});
 if(method==='POST'&&path==='messages'){
  const input=z.object({name:z.string().trim().min(1).max(24),message:z.string().trim().min(1).max(600),color:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).parse(await jsonBody(request)),who=await identity(request);const actor=who.user?.userId??await sign(request.headers.get('cf-connecting-ip')??'preview',runtime().SESSION_SECRET);await limit('message:'+actor,3,600000);const id=crypto.randomUUID();await db().prepare('INSERT INTO messages(id,actor,name,message,color,created_at,visible) VALUES(?,?,?,?,?,?,1)').bind(id,actor,input.name,input.message,input.color,new Date().toISOString()).run();return response({ok:true,id});
 }
 if(method==='DELETE'&&path.startsWith('messages/')){await requireOwner(request);await db().prepare('UPDATE messages SET visible=0 WHERE id=?').bind(path.split('/')[1]).run();return response({ok:true});}
 if(method==='POST'&&path==='projects'){await requireOwner(request);return response({project:await saveProject(await jsonBody(request))});}
 if(method==='DELETE'&&path.startsWith('projects/')){await requireOwner(request);const p=(await listProjects(true)).find(p=>p.id===path.split('/')[1]);if(!p)throw new Error('404:找不到作品');await saveProject({...p,deleted:true});return response({ok:true});}
 if(method==='POST'&&path==='settings'){
  await requireOwner(request);const data=z.object({islandName:z.string().trim().min(1).max(40),socials:z.array(z.object({label:z.string().min(1).max(30),url:z.string().url().refine(v=>/^https?:\/\//.test(v))})).max(20),ownerAvatar:avatarSchema.optional()}).parse(await jsonBody(request));await setSetting('island_name',data.islandName);await setSetting('socials',JSON.stringify(data.socials));if(data.ownerAvatar)await setSetting('owner_avatar',JSON.stringify(data.ownerAvatar));return response({ok:true});
 }
 if(method==='POST'&&path==='password'){await requireOwner(request);const {password}=z.object({password:z.string().min(12).max(200)}).parse(await jsonBody(request));await setSetting('password_hash',await hashPassword(password));return response({ok:true},200,{'Set-Cookie':cookie('',0)});}
 if(method==='GET'&&path==='diaries'){await requireOwner(request);return response({diaries:(await db().prepare('SELECT data FROM diaries ORDER BY updated_at DESC').all<{data:string}>()).results.map(r=>JSON.parse(r.data))});}
 if(method==='POST'&&path==='diaries'){
  await requireOwner(request);const d=diarySchema.parse(await jsonBody(request));await privateImageCheck(d.images);const old=await db().prepare('SELECT updated_at FROM diaries WHERE id=?').bind(d.id).first<{updated_at:string}>();if(d.updatedAt&&old&&old.updated_at!==d.updatedAt)throw new Error('409:日記已被更新，請重新讀取');d.updatedAt=new Date().toISOString();await db().prepare('INSERT INTO diaries(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(d.id,JSON.stringify(d),d.updatedAt).run();return response({diary:d});
 }
 if(method==='DELETE'&&path.startsWith('diaries/')){await requireOwner(request);await db().prepare('DELETE FROM diaries WHERE id=?').bind(path.split('/')[1]).run();return response({ok:true});}
 if(method==='POST'&&path==='upload'){
  await requireOwner(request);if(Number(request.headers.get('content-length')??0)>22000000)throw new Error('413:檔案超過 20 MB');const form=await request.formData(),file=form.get('file'),scope=form.get('scope')==='private'?'private':'public';if(!(file instanceof File)||file.size>20000000||!file.size)throw new Error('400:請選擇 20 MB 以內的檔案');
  if(form.get('purpose')==='diary'&&(scope!=='private'||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>5000000))throw new Error('400:日記圖片請使用 5 MB 以內的 JPG、PNG、WebP 或 GIF');const total=await db().prepare('SELECT SUM(size) AS total FROM assets').first<{total:number}>();if((total?.total??0)+file.size>200000000)throw new Error('413:目前設定的 200 MB 儲存上限已滿');
  const id=crypto.randomUUID(),key=scope+'/'+id,mime=['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg','application/pdf'].includes(file.type)?file.type:'application/octet-stream',bytes=await file.arrayBuffer(),head=new Uint8Array(bytes.slice(0,12));
  if(mime.startsWith('image/')){const valid=(mime==='image/png'&&head[0]===137&&head[1]===80)||(mime==='image/jpeg'&&head[0]===255&&head[1]===216)||(mime==='image/gif'&&String.fromCharCode(...head.slice(0,3))==='GIF')||(mime==='image/webp'&&String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP');if(!valid)throw new Error('400:圖片格式與內容不符');}
  await runtime().BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});await db().prepare('INSERT INTO assets(id,object_key,scope,mime,filename,size,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,key,scope,mime,file.name.slice(0,200),file.size,new Date().toISOString()).run();return response({url:'/api/island/asset/'+id,id});
 }
 if(method==='GET'&&path.startsWith('asset/')){
  const row=await db().prepare('SELECT * FROM assets WHERE id=?').bind(path.split('/')[1]).first<{object_key:string;scope:string;mime:string;filename:string}>();if(!row)throw new Error('404:檔案不存在');if(row.scope==='private')await requireOwner(request);const object=await runtime().BUCKET.get(row.object_key);if(!object)throw new Error('404:檔案不存在');const attachment=new URL(request.url).searchParams.has('download')||row.mime==='application/octet-stream';return new Response(object.body,{headers:{'Content-Type':row.mime,'X-Content-Type-Options':'nosniff','Cache-Control':row.scope==='private'?'private, no-store':'public, max-age=3600','Content-Disposition':`${attachment?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(row.filename)}`,'Content-Security-Policy':"default-src 'none'; sandbox"}});
 }
 if(method==='GET'&&path==='export'){
  await requireOwner(request);const rows=(await db().prepare('SELECT data FROM diaries ORDER BY updated_at DESC').all<{data:string}>()).results.map(r=>diarySchema.parse(JSON.parse(r.data)));const files:Record<string,Uint8Array>={'diaries.json':strToU8(JSON.stringify({version:1,exportedAt:new Date().toISOString(),diaries:rows},null,2))};let total=0;
  for(const d of rows){let text=`# ${d.title}\n\n日期：${d.date}\n心情：${d.mood}\n\n${d.body}\n`;for(const image of d.images){const id=image.split('/').pop(),a=await db().prepare('SELECT object_key,mime FROM assets WHERE id=? AND scope=?').bind(id,'private').first<{object_key:string;mime:string}>();if(a){const object=await runtime().BUCKET.get(a.object_key);if(object){total+=object.size;if(total>32000000)throw new Error('413:圖片總量超過單次匯出上限，請先分批整理');const ext=a.mime==='image/jpeg'?'jpg':a.mime.split('/')[1],name='images/'+id+'.'+ext;files[name]=new Uint8Array(await object.arrayBuffer());text+=`\n![](../${name})\n`;}}}files['entries/'+d.date+'_'+d.id+'.md']=strToU8(text);}
  files['README.txt']=strToU8('白語寧的島｜日記備份\n包含 JSON、Markdown 與原始圖片。下載後可上傳 Google Drive 保存。此檔案包含私人內容，請妥善保管。');return new Response(zipSync(files,{level:0}) as unknown as BodyInit,{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="diary-backup-${new Date().toISOString().slice(0,10)}.zip"`,'Cache-Control':'private, no-store'}});
 }
 throw new Error('404:找不到這個入口');
 }catch(e){return failure(e);}}
export const GET=handler;export const POST=handler;export const DELETE=handler;
