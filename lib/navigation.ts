import type {Project} from './shared';
import {mineMountainRadius} from './mine-style.ts';
import {factoryOutdoorBlocked} from './factory-style.ts';
import {libraryOutdoorBlocked} from './library-style.ts';
import {museumOutdoorBlocked} from './museum-style.ts';
import {terrainAt,worldPosition,exterior} from './archipelago.ts';
import {footprint} from './layout.ts';
export function createWalkability(projects:Project[]){
 const obstacles=projects.filter(exterior).map(project=>{
  const {x,z}=worldPosition(project);
  if(project.islandId==='information'&&project.specialType==='factory')return {x,z,blocks:factoryOutdoorBlocked};
  if(project.islandId==='art'&&project.specialType==='gallery')return {x,z,blocks:museumOutdoorBlocked};
  if(project.islandId==='library'&&project.specialType==='library')return {x,z,blocks:libraryOutdoorBlocked};
  const radius=footprint(project);
  return {x,z,blocks:(dx:number,dz:number)=>Math.hypot(dx,dz)<radius};
 });
 return (x:number,z:number,unlocked=false)=>{
  const terrain=terrainAt(x,z);
  if(!terrain)return false;
  if(terrain.islandId==='home'){
   if(!unlocked&&Math.hypot(x,(z+9)/.91)<7.5)return false;
   if(Math.hypot(x,z+11)<4.8||Math.hypot(x,z-5)<2)return false;
  }
  if(terrain.islandId==='technology'&&Math.hypot(x-50,z-6)<4.5)return false;
  if(terrain.islandId==='mine'&&Math.hypot(x+48,z-2)<mineMountainRadius)return false;
  return !obstacles.some(obstacle=>obstacle.blocks(x-obstacle.x,z-obstacle.z));
 };
}
export function walkable(x:number,z:number,projects:Project[],unlocked=false){
 return createWalkability(projects)(x,z,unlocked);
}

// Use the remaining distance on the next segment so walking through a
// waypoint does not spend a frame standing still.
export function advanceRoute(position:{x:number;z:number},route:{x:number;z:number}[],distance:number){
 let heading:number|null=null;
 while(route.length&&distance>0){
  const next=route[0],dx=next.x-position.x,dz=next.z-position.z;
  const remaining=Math.hypot(dx,dz);
  if(remaining>0)heading=Math.atan2(dx,dz);
  if(distance<remaining){
   position.x+=dx/remaining*distance;
   position.z+=dz/remaining*distance;
   break;
  }
  position.x=next.x;
  position.z=next.z;
  distance-=remaining;
  route.shift();
 }
 return heading;
}
class Heap{items:{x:number;z:number;g:number;f:number}[]=[];push(node:{x:number;z:number;g:number;f:number}){this.items.push(node);let n=this.items.length-1;while(n){const parent=(n-1)>>1;if(this.items[parent].f<=node.f)break;this.items[n]=this.items[parent];n=parent;}this.items[n]=node;}pop(){const top=this.items[0],end=this.items.pop();if(this.items.length&&end){let n=0;while(true){let child=n*2+1;if(child>=this.items.length)break;if(child+1<this.items.length&&this.items[child+1].f<this.items[child].f)child++;if(this.items[child].f>=end.f)break;this.items[n]=this.items[child];n=child;}this.items[n]=end;}return top;}}
export function findRoute(from:{x:number;z:number},to:{x:number;z:number},projects:Project[],unlocked=false){const isWalkable=createWalkability(projects),key=(x:number,z:number)=>x+','+z,cache=new Map<string,boolean>(),valid=(x:number,z:number)=>{const k=key(x,z);if(!cache.has(k))cache.set(k,isWalkable(x,z,unlocked));return cache.get(k)!;};let sx=Math.round(from.x),sz=Math.round(from.z),ex=Math.round(to.x),ez=Math.round(to.z);if(!valid(ex,ez)){let best:{x:number;z:number;d:number}|null=null;for(let dx=-7;dx<=7;dx++)for(let dz=-7;dz<=7;dz++)if(valid(ex+dx,ez+dz)&&(!best||Math.hypot(dx,dz)<best.d))best={x:ex+dx,z:ez+dz,d:Math.hypot(dx,dz)};if(!best)return[];ex=best.x;ez=best.z;}const start=key(sx,sz),end=key(ex,ez),open=new Heap(),scores=new Map([[start,0]]),parents=new Map<string,string>(),closed=new Set<string>();open.push({x:sx,z:sz,g:0,f:0});let tries=0;while(open.items.length&&tries++<45000){const c=open.pop(),ck=key(c.x,c.z);if(closed.has(ck))continue;if(ck===end){const points:{x:number;z:number}[]=[];let k=end;while(k!==start){const [x,z]=k.split(',').map(Number);points.push({x,z});const previous=parents.get(k);if(!previous)return[];k=previous;}return points.reverse();}closed.add(ck);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;const x=c.x+dx,z=c.z+dz,k=key(x,z);if(closed.has(k)||!valid(x,z)||dx&&dz&&(!valid(x,c.z)||!valid(c.x,z)))continue;const g=c.g+Math.hypot(dx,dz);if(g>=(scores.get(k)??Infinity))continue;scores.set(k,g);parents.set(k,ck);open.push({x,z,g,f:g+Math.hypot(x-ex,z-ez)});}}return[];}
