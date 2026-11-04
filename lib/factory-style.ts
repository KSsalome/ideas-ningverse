export const factoryName='INFORMATION FACTORY';
export function buildingDisplayName(project:{title:string;specialType?:string}){return project.specialType==='factory'?factoryName:project.title;}
// Shared by the island, editor and both indoor/outdoor movement guards.
export const factoryPalette=Object.freeze({concrete:'#454641',iron:'#1b1e20',metal:'#303537',rust:'#734a35',bronze:'#9c794d',wood:'#51392a',walnut:'#30251e',leather:'#392b23',cream:'#dfcbaa',light:'#ffd299',glass:'#73583b',leaf:'#4a5940',cliff:'#414442'});
export const factoryExterior=Object.freeze({halfWidth:6.6,rear:-5.6,front:2.8,roof:5.9,terraceHalfWidth:8.15,terraceRear:-6.8,terraceFront:5.8,stepsFront:7.3,stepsBack:5.8,stepsHalfWidth:4,stepsHeight:.42});
export const factoryStairEnvelope=Object.freeze({halfWidth:8.7,rear:-7,front:5.55});
export const factoryStairFlights=Object.freeze([
 {id:'east-lower',side:1,x:7.55,z0:4.85,z1:.75,y0:.45,y1:3.12,width:1.18,steps:14},
 {id:'east-upper',side:1,x:7.55,z0:-.6,z1:-4.7,y0:3.12,y1:6.2,width:1.18,steps:16},
 {id:'west-lower',side:-1,x:-7.55,z0:-6,z1:-2.4,y0:.45,y1:3.12,width:1.18,steps:14},
 {id:'west-upper',side:-1,x:-7.55,z0:-1.05,z1:2.7,y0:3.12,y1:6.2,width:1.18,steps:16},
]);
export function factoryOutdoorBlocked(x:number,z:number){const b=factoryExterior;if(Math.abs(x)<b.halfWidth+.3&&z>b.rear-.3&&z<b.front+.3)return true;return Math.abs(x)>6.7&&Math.abs(x)<8.55&&z>factoryStairEnvelope.rear&&z<factoryStairEnvelope.front||Math.abs(x)>4.1&&Math.abs(x)<4.95&&z>5.8&&z<7.35;}
export function factoryStepHeight(x:number,z:number){const b=factoryExterior;if(Math.abs(x)>b.terraceHalfWidth)return 0;if(z>=b.terraceRear&&z<=b.terraceFront)return b.stepsHeight;if(Math.abs(x)<=b.stepsHalfWidth&&z>b.stepsBack&&z<b.stepsFront)return b.stepsHeight*(b.stepsFront-z)/(b.stepsFront-b.stepsBack);return 0;}
export type FactoryRect={x:number;z:number;w:number;d:number;h:number;kind:string};
export function factoryInteriorLayout(back=-14,depth=32){
 const stools=[-4.3,-2.15,0,2.15,4.3].map(x=>({x,z:back+4.9,w:.9,d:.9,h:1.7,kind:'stool'}));
 const booths=[8.5,-4.4].map(z=>({x:6.8,z,w:2.5,d:3.9,h:2.1,kind:'booth'}));
 const boothTables=booths.map(b=>({x:4.55,z:b.z,w:1.65,d:2.55,h:1.4,kind:'booth-table'}));
 const tables=[6.8,-.7].map(z=>({x:-5.65,z,w:1.7,d:1.7,h:1.9,kind:'high-table'}));
 const seats=tables.flatMap(t=>[-1,1].map(s=>({x:t.x+s*1.38,z:t.z,w:.75,d:.75,h:1.6,kind:'high-chair'})));
 const bar={x:0,z:back+2.7,w:11.8,d:1.65,h:1.85,kind:'bar'};
 const terminal={x:-7.5,z:back+9.5,w:1.2,d:2.5,h:2.5,kind:'terminal'};
 const furniture=[terminal,bar,...stools,...booths,...boothTables,...tables,...seats];
 return{back,depth,front:back+depth-3,minX:-8.1,maxX:8.1,minZ:back+3.5,maxZ:12,ceiling:6.75,bar,stools,booths,boothTables,tables,seats,furniture};
}
export type FactoryLayout=ReturnType<typeof factoryInteriorLayout>;
export function factoryWalkable(x:number,z:number,l:FactoryLayout){return x>l.minX&&x<l.maxX&&z>l.minZ&&z<l.maxZ&&!l.furniture.some(o=>Math.abs(x-o.x)<o.w/2+.24&&Math.abs(z-o.z)<o.d/2+.24);}
// A tap can route around bar stools and sofas; keyboard movement uses the same bounds.
export function factoryRoute(from:{x:number;z:number},to:{x:number;z:number},l:FactoryLayout){
 const step=.5,key=(x:number,z:number)=>x+','+z,clear=(a:{x:number;z:number},b:{x:number;z:number})=>[.2,.4,.6,.8,1].every(t=>factoryWalkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,l));
 function snap(p:{x:number;z:number}){const x=Math.round(p.x/step),z=Math.round(p.z/step),candidates:{x:number;z:number;d:number}[]=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const q={x:(x+dx)*step,z:(z+dz)*step};if(clear(p,q))candidates.push({x:x+dx,z:z+dz,d:Math.hypot(p.x-q.x,p.z-q.z)});}return candidates.sort((a,b)=>a.d-b.d)[0];}
 if(!factoryWalkable(from.x,from.z,l)||!factoryWalkable(to.x,to.z,l))return[];const a=snap(from),b=snap(to);if(!a||!b)return[];
 const sx=a.x,sz=a.z,ex=b.x,ez=b.z,start=key(sx,sz),end=key(ex,ez),open=[{x:sx,z:sz,g:0,f:0}],cost=new Map([[start,0]]),parents=new Map<string,string>(),closed=new Set<string>();
 for(let n=0;open.length&&n<16000;n++){
  open.sort((a,b)=>b.f-a.f);const c=open.pop()!,ck=key(c.x,c.z);if(closed.has(ck))continue;
  if(ck===end){const path:{x:number;z:number}[]=[];let k=end;while(k!==start){const [x,z]=k.split(',').map(Number);path.push({x:x*step,z:z*step});const p=parents.get(k);if(!p)return[];k=p;}path.reverse();if(Math.hypot(from.x-sx*step,from.z-sz*step)>.01)path.unshift({x:sx*step,z:sz*step});if(Math.hypot(to.x-ex*step,to.z-ez*step)>.01)path.push({x:to.x,z:to.z});return path;}
  closed.add(ck);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
   if(!dx&&!dz)continue;const x=c.x+dx,z=c.z+dz,k=key(x,z);if(closed.has(k)||!factoryWalkable(x*step,z*step,l))continue;
   // Substeps forbid diagonal cuts through the thin legs and booth corners.
   if([.25,.5,.75].some(t=>!factoryWalkable((c.x+dx*t)*step,(c.z+dz*t)*step,l)))continue;
   const g=c.g+Math.hypot(dx,dz);if(g>=(cost.get(k)??Infinity))continue;cost.set(k,g);parents.set(k,ck);open.push({x,z,g,f:g+Math.hypot(ex-x,ez-z)});
  }
 }return[];
}
const hour=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'});
export function factoryAtmosphereAt(date=new Date()){const h=Number(hour.format(date));return h>=6&&h<17?{mode:'day',ambient:.28,key:.62,fill:1}:{mode:'night',ambient:.20,key:.46,fill:1.12};}
