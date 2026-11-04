import {islands} from './archipelago.ts';
import {sign,equal} from './security.ts';
import type {ChickVisit} from './experiences';
export function taipeiDate(now=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
function seed(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export async function chickVisit(secret:string,now=Date.now()):Promise<ChickVisit>{const slot=Math.floor(now/180000),sig=await sign('chick:'+slot,secret),before=await sign('chick:'+(slot-1),secret),n=seed(sig),i=islands[n%islands.length],previous=islands[seed(before)%islands.length],startsAt=slot*180000;return{visitId:slot+'.'+sig,from:{x:previous.x+5,z:previous.z+5,y:previous.height+4},to:{x:i.x+5,z:i.z+5,y:i.height+4},islandId:i.id,startsAt,landsAt:startsAt+26000+n%24000,expiresAt:startsAt+180000};}
export async function validChickVisit(value:string,secret:string,now=Date.now()){const [raw,sig]=value.split('.'),slot=Number(raw),current=Math.floor(now/180000);if(!Number.isInteger(slot)||!sig||!(slot===current||slot===current-1&&now%180000<15000))return false;return equal(sig,await sign('chick:'+slot,secret));}
