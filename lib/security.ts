const enc=new TextEncoder();
export function equal(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function hex(b:ArrayBuffer){return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}
export async function hashPassword(password:string,salt=crypto.randomUUID()) {
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return salt+':'+hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
export async function checkPassword(p:string,stored:string){if(!stored.includes(':'))return false;return equal(await hashPassword(p,stored.split(':')[0]),stored);}
export async function sign(s:string,secret:string){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(s)));}
export async function makeSession(userId:string,secret:string,now=Date.now()){const v=encodeURIComponent(userId)+'.'+(now+3600000)+'.'+crypto.randomUUID();return v+'.'+await sign(v,secret);}
export async function verifySession(cookie:string|undefined,userId:string,secret:string,now=Date.now()) {
 if(!cookie||!secret)return false;const p=cookie.split('.');if(p.length!==4)return false;
 const [uid,expires,nonce,sig]=p;return uid===encodeURIComponent(userId)&&Number(expires)>now&&Number(expires)<=now+3600000&&equal(sig,await sign([uid,expires,nonce].join('.'),secret));
}
export function assertOrigin(r:Request){const o=r.headers.get('origin');if(!o||o!==new URL(r.url).origin)throw new Error('403:請從島嶼頁面送出操作');}
export function cookieValue(r:Request,key:string){return r.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='))?.slice(key.length+1);}
