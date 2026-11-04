export type LibraryPoint={x:number;y:number;z:number};
export function libraryLayout(bookCount=0){const rows=Math.max(3,Math.ceil(bookCount/120)),back=1-rows*7,front=11;return{rows,back,front,depth:front-back+2,center:(front+back-2)/2,upper:6.2};}
export type LibraryLayout=ReturnType<typeof libraryLayout>;
export function libraryFurniture(layout:LibraryLayout){const tables=[];for(let n=0;n<layout.rows-1;n++)for(const side of [-1,1])tables.push({x:side*3.45,z:3-n*7,w:2.75,d:4.6});return tables;}
export function libraryShelves(layout:LibraryLayout){return Array.from({length:layout.rows},(_,row)=>[0,layout.upper].flatMap(y=>[-1,1].map(side=>({x:side*8.15,y,z:4-row*7,rotation:-side*Math.PI/2,row})))).flat();}
function candidates(x:number,z:number,l:LibraryLayout){
 if(Math.abs(x)>7.5||z<l.back-1.0||z>10.4)return[];
 const ax=Math.abs(x),stairSpan=z>=l.back+1&&z<=l.back+9,stair=ax>=5.55&&ax<=6.75&&stairSpan;
 if(stair)return[l.upper*(l.back+9-z)/8];
 const heights=[];
 const blocked=libraryFurniture(l).some(o=>Math.abs(x-o.x)<o.w/2+.18&&Math.abs(z-o.z)<o.d/2+.18)||Math.hypot(x,z-(l.back+4))<1.15||Array.from({length:l.rows+1},(_,n)=>8.5-n*7).some(zz=>Math.hypot(ax-5.42,z-zz)<.43);
 if(!blocked)heights.push(0);
 if((ax>=(stairSpan?6.8:5.65)&&z>=l.back+.55&&z<=9.25)||(z>=7.6&&z<=9.25)||(z>=l.back-.7&&z<=l.back+1))heights.push(l.upper);
 return heights;
}
export function libraryFloorAt(x:number,z:number,currentY:number,l:LibraryLayout,maxStep=.3){const list=candidates(x,z,l).sort((a,b)=>Math.abs(a-currentY)-Math.abs(b-currentY));return list.length&&Math.abs(list[0]-currentY)<=maxStep?list[0]:null;}
// The hall is small: a half-unit grid lets tap-to-walk route around desks and
// climb either staircase without moving through furniture or jumping floors.
export function libraryRoute(from:LibraryPoint,to:LibraryPoint,l:LibraryLayout):LibraryPoint[]{
 const step=.5,key=(p:LibraryPoint)=>Math.round(p.x/step)+','+Math.round(p.z/step)+','+Math.round(p.y*20),snap=(p:LibraryPoint)=>{let best:LibraryPoint|null=null,score=Infinity;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const x=Math.round(p.x/step)*step+dx*step,z=Math.round(p.z/step)*step+dz*step;for(const y of candidates(x,z,l)){const d=Math.hypot(x-p.x,z-p.z)+Math.abs(y-p.y)*3;if(d<score){best={x,y,z};score=d;}}}return best;},start=snap(from),end=snap(to);
 if(!start||!end)return[];const open=[{p:start,g:0,f:0}],scores=new Map([[key(start),0]]),parents=new Map<string,string>(),points=new Map([[key(start),start]]),closed=new Set<string>(),endKey=key(end),startKey=key(start);
 for(let tries=0;open.length&&tries<20000;tries++){
  let best=0;for(let n=1;n<open.length;n++)if(open[n].f<open[best].f)best=n;const {p,g}=open.splice(best,1)[0],pk=key(p);if(closed.has(pk))continue;
  if(pk===endKey){const path:LibraryPoint[]=[];let k=pk;while(k!==startKey){path.push(points.get(k)!);k=parents.get(k)!;if(!k)return[];}return path.reverse();}closed.add(pk);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx*step,z=p.z+dz*step;let y:number|null=p.y;for(let n=1;n<=4&&y!==null;n++)y=libraryFloorAt(p.x+dx*step*n/4,p.z+dz*step*n/4,y,l);if(y===null)continue;const q={x,y,z},qk=key(q),ng=g+step+Math.abs(y-p.y)*.2;if(closed.has(qk)||ng>=(scores.get(qk)??Infinity))continue;scores.set(qk,ng);points.set(qk,q);parents.set(qk,pk);open.push({p:q,g:ng,f:ng+Math.hypot(x-end.x,z-end.z)+Math.abs(y-end.y)});}
 }
 return[];
}
