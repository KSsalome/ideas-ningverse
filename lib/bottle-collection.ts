import {islandById,terrainAt} from './archipelago.ts';
import {walkable} from './navigation.ts';
import {bottleRewardPool,type Reward} from './collectibles.ts';
import type {Project} from './shared.ts';

/** Small, bounded search on the existing paths. Never spawns inside a building, fountain or bridge. */
export function bottlePosition(buildings:Project[],islandId:string,random:()=>number=Math.random):{x:number;z:number}|null{
 const island=islandById(islandId);
 for(let attempt=0;attempt<96;attempt++){
  const angle=attempt<64?random()*Math.PI*2:(attempt-64)*Math.PI/16,radius=attempt<64?.62+random()*.22:.78;
  const x=Math.round((island.x+Math.cos(angle)*island.rx*radius)*4)/4,z=Math.round((island.z+Math.sin(angle)*island.rz*radius)*4)/4;
  const ground=terrainAt(x,z);if(ground?.islandId===island.id&&!ground.bridge&&walkable(x,z,buildings,false))return{x,z};
 }return null;
}
/** Existing unopened bottles remain valid, including paused or archived rewards already sent. */
export function bottleClaimCandidates(catalog:Reward[],assigned:Reward,island:string):string[]{
 const own=new Set<string>(),themed=bottleRewardPool(catalog,own,island),generic=catalog.filter(r=>r.source==='archipelago'&&r.enabled&&!r.archived);
 return [...new Set([assigned.id,...themed.map(r=>r.id),...generic.map(r=>r.id)])];
}
