import {museumSections,museumSection,type MuseumSection} from './museum-style.ts';
export type MuseumPoint={x:number;y:number;z:number};
export const museumLevels=[0,5.4,10.8] as const;
export function museumLayout(entries:{gallerySection?:string;medium?:string;category?:string}[]=[]){const counts=museumSections.map(s=>entries.filter(e=>museumSection(e)===s).length),rows=Math.max(3,...counts.map(n=>Math.ceil(n/2))),front=12,back=Math.min(-13,5-rows*5);return{rows,front,back,halfWidth:11,depth:front-back,center:(front+back)/2,levels:museumLevels,ceiling:16.6};}
export type MuseumLayout=ReturnType<typeof museumLayout>;
export const museumDecorations=Object.freeze([
 {x:-7.8,z:8.5,w:1.5,d:1.5,level:0,kind:'camera'}, {x:7.8,z:-2.5,w:1.6,d:1.6,level:0,kind:'studio'},
 {x:-7.8,z:8.5,w:1.5,d:1.5,level:1,kind:'mannequin'}, {x:7.8,z:3.5,w:1.6,d:1.3,level:1,kind:'wig'}, {x:7.8,z:-6.5,w:1.5,d:1.6,level:1,kind:'prop'},
 {x:-7.8,z:8.5,w:1.7,d:1.4,level:2,kind:'easel'}, {x:7.8,z:3.5,w:1.7,d:1.7,level:2,kind:'paint'}, {x:7.8,z:-6.5,w:1.6,d:1.6,level:2,kind:'bust'}
]);
// Two adjacent flights per storey form one central return staircase. Height
// candidates distinguish overlapping floors; an avatar cannot jump to a balcony.
export function museumSurfaces(x:number,z:number,l:MuseumLayout){
 if(Math.abs(x)>10.35||z<l.back+.65||z>l.front-.65)return[];
 const values:number[]=[],stairZ=z>=-7&&z<=1,left=x>=-2.55&&x<=-.15,right=x>=.15&&x<=2.55;
 if(stairZ&&(left||right)){for(const base of [0,5.4])values.push(base+(left?(1-z)/8*2.7:2.7+(z+7)/8*2.7));return values;}
 if(Math.abs(x)<=2.55&&z>=-8.7&&z<=-7)return[2.7,8.1];
 for(let level=0;level<3;level++){
  if(level>0&&!(Math.abs(x)>=5.95||z>=1||z<=-10.25))continue;
  if(level===0&&Math.abs(x)<2.8&&z>-8.95&&z<1)continue;
  if(museumDecorations.some(o=>o.level===level&&Math.abs(x-o.x)<o.w/2+.22&&Math.abs(z-o.z)<o.d/2+.22))continue;
  values.push(museumLevels[level]);
 }
 return values;
}
export function museumFloorAt(x:number,z:number,currentY:number,l:MuseumLayout,maxStep=.3){const ys=museumSurfaces(x,z,l).sort((a,b)=>Math.abs(a-currentY)-Math.abs(b-currentY));return ys.length&&Math.abs(ys[0]-currentY)<=maxStep?ys[0]:null;}
export function museumLevelAt(y:number){return Math.max(0,Math.min(2,Math.round(y/5.4)));}
export function museumFrameSlots(entries:any[],l:MuseumLayout){return museumSections.flatMap((section,level)=>{const list=entries.filter(e=>museumSection(e)===section),count=Math.max(6,list.length);return Array.from({length:count},(_,index)=>({section,level,y:museumLevels[level]+2.35,x:index%2?10.72:-10.72,z:5-Math.floor(index/2)*5,side:index%2?1:-1,w:index%3===0?3.45:2.75,h:index%3===1?2.65:2.25,entry:list[index]??null}));});}
export function museumRoute(from:MuseumPoint,to:MuseumPoint,l:MuseumLayout):MuseumPoint[]{
 const step=.5,key=(p:MuseumPoint)=>Math.round(p.x/step)+','+Math.round(p.z/step)+','+Math.round(p.y*100),clear=(a:MuseumPoint,b:MuseumPoint)=>{let y:number|null=a.y;for(let n=1;n<=5&&y!==null;n++)y=museumFloorAt(a.x+(b.x-a.x)*n/5,a.z+(b.z-a.z)*n/5,y,l);return y!==null&&Math.abs(y-b.y)<.08;},snap=(p:MuseumPoint)=>{let best:MuseumPoint|null=null,score=Infinity;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const x=Math.round(p.x/step)*step+dx*step,z=Math.round(p.z/step)*step+dz*step;for(const y of museumSurfaces(x,z,l)){const q={x,y,z},d=Math.hypot(x-p.x,z-p.z)+Math.abs(y-p.y)*4;if(d<score&&Math.abs(y-p.y)<.4&&clear(p,q)){score=d;best=q;}}}return best;},start=snap(from),end=snap(to);
 if(!start||!end)return[];const open=[{p:start,g:0,f:0}],scores=new Map([[key(start),0]]),points=new Map([[key(start),start]]),parents=new Map<string,string>(),closed=new Set<string>(),endKey=key(end),startKey=key(start);
 for(let tries=0;open.length&&tries<28000;tries++){
  let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;const {p,g}=open.splice(best,1)[0],pk=key(p);if(closed.has(pk))continue;
  if(pk===endKey){const path:MuseumPoint[]=[];let k=pk;while(k!==startKey){path.push(points.get(k)!);const parent=parents.get(k);if(!parent)return[];k=parent;}path.reverse();if(Math.hypot(from.x-start.x,from.z-start.z)>.02)path.unshift(start);if(Math.hypot(end.x-to.x,end.z-to.z)>.02&&clear(end,to))path.push(to);return path;}
  closed.add(pk);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx*step,z=p.z+dz*step;let y:number|null=p.y;for(let n=1;n<=5&&y!==null;n++)y=museumFloorAt(p.x+dx*step*n/5,p.z+dz*step*n/5,y,l);if(y===null)continue;const q={x,y,z},qk=key(q),ng=g+step+Math.abs(y-p.y)*.2;if(closed.has(qk)||ng>=(scores.get(qk)??Infinity))continue;scores.set(qk,ng);points.set(qk,q);parents.set(qk,pk);open.push({p:q,g:ng,f:ng+Math.hypot(x-end.x,z-end.z)+Math.abs(y-end.y)});}
 }
 return[];
}
