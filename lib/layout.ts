import type {Project} from './shared';
import {mineMountainRadius} from './mine-style.ts';
import {factoryExterior,factoryStairEnvelope} from './factory-style.ts';
import {libraryExterior} from './library-style.ts';
import {museumExterior} from './museum-style.ts';
import {islandById,recommendedIsland,exterior} from './archipelago.ts';
export type Position={x:number;z:number};
const original:Record<string,Position>={shiyuexu:{x:-10,z:8},jide:{x:-15,z:-1},neon:{x:-12,z:-10},guiyan:{x:-6,z:14},marriott:{x:5,z:14},woven:{x:13,z:7},travel:{x:16,z:-3},'skill-lab':{x:11,z:-11}};
const relocations:Record<string,Position>={'instagram-1':{x:-7,z:4},'instagram-2':{x:-7,z:-4},'instagram-3':{x:0,z:-8},'facebook-public':{x:7,z:-4},threads:{x:7,z:4},line:{x:0,z:8},'gaming-hub':{x:0,z:-14},'about-intro':{x:-7,z:5},'about-inspiration':{x:0,z:6},'about-daily':{x:7,z:5},'about-contact':{x:0,z:-7},'daily-tarot':{x:-13,z:-7},'message-wall':{x:0,z:0},'grand-library':{x:0,z:0}};
export const footprint=(p:Pick<Project,'shape'>)=>p.shape==='museum'?6.5:p.shape==='factory'?6:p.shape==='grand-library'?4.8:p.shape==='mine'?3.2:p.shape==='cottage'?1.9:p.shape==='tarot'||p.shape==='guestbook'?2.7:p.shape==='arcade'?3.5:p.shape==='manor'||p.shape==='library'?2.8:2.4;
export function positionOf(p:Project):Position{return p.position??original[p.id]??{x:0,z:10};}
export function placementIssue(p:Project,buildings:Project[]):string|null{
 if(!p.position)return'請先選擇建築位置';const {x,z}=p.position,r=footprint(p),island=islandById(p.islandId);
 if(p.privacy==='private'){
  if(p.islandId!=='home')return'私人建築請留在主島城牆內';const inner=Math.hypot(x,(z+9)/.91);if(inner>7.25-r*.7)return'私人建築請放在城牆內的空地';if(Math.hypot(x,z+11)<4.3+r*.45)return'這裡是保留的城堡區域';if(Math.hypot(x+3,z+6.2)<1.5+r*.65)return'這裡是私藏日記小屋';if(Math.hypot(x,z+2.6)<1.5+r*.5)return'請保留私人城門的通道';
 }else{
  if((x/(island.rx-r))**2+(z/(island.rz-r))**2>1)return'位置太靠近海面，請往島內移動';
  if(p.islandId==='art'&&p.specialType==='gallery'&&[[7.5,museumExterior.rear-.9],[-7.5,museumExterior.rear-.9],[11.9,-5.6],[11.9,4.1],[10.2,9.1],[-11.9,5.2],[-11.9,.9],[-6,10.8],[6,10.8],[-3.6,-12.7],[3.6,-12.7]].some(([dx,dz])=>((x+dx)/island.rx)**2+((z+dz)/island.rz)**2>.98**2))return'請讓神殿與花園完整留在美術島內';
  if(p.islandId==='library'&&p.specialType==='library'&&[-10.8,10.8].some(dx=>[libraryExterior.rear-.6,8.2].some(dz=>((x+dx)/island.rx)**2+((z+dz)/island.rz)**2>.96)))return'請讓圖書館與入口庭園完整留在島內';
  if(p.islandId==='information'&&p.specialType==='factory'&&[-factoryStairEnvelope.halfWidth,factoryStairEnvelope.halfWidth].some(dx=>[factoryStairEnvelope.rear,factoryExterior.stepsFront].some(dz=>((x+dx)/island.rx)**2+((z+dz)/island.rz)**2>.97)))return'請讓工業酒吧的平台與入口完整留在島內';
  if(p.islandId==='home')return'主島留給城堡、森林與花園，請選擇其他島嶼';
  if(p.islandId==='art'&&p.specialType!=='gallery'){if(p.kind==='project')return null;return'美術島只有一座美術館';}
  if(p.islandId==='library'&&p.specialType!=='library')return'圖書島只有一座圖書館';
  if(p.islandId==='information'&&p.specialType!=='factory'){if(p.kind==='info')return null;return'關於我的內容請使用資訊類型，收進工廠內';}
  if(p.kind==='info'&&p.islandId!=='information')return'公開資訊請放進資訊工廠';
  if(!exterior(p))return null;
  if(p.islandId==='technology'&&Math.hypot(x,z)<4.5+r)return'請保留霓虹訊號高樓裝置周圍的通道';
  if(p.islandId==='mine'&&Math.hypot(x,z+5)<mineMountainRadius+r+.4)return'請保留礦山與頂端水晶的位置';
  if(['gallery','library','factory'].includes(p.specialType)&&buildings.some(q=>q.id!==p.id&&!q.deleted&&q.islandId===p.islandId&&q.specialType===p.specialType))return'這座島已經有對應的主建築';
 }
 if(!exterior(p))return null;
 for(const q of buildings){if(q.id===p.id||q.deleted||q.islandId!==p.islandId||q.privacy!==p.privacy||!exterior(q))continue;const point=positionOf(q);if(Math.hypot(x-point.x,z-point.z)<r+footprint(q)+.8)return'與「'+q.title+'」太靠近，請留一點通行空間';}return null;
}
export function freePosition(p:Project,buildings:Project[]):Position|null{
 const suggested=p.position??original[p.id]??relocations[p.id];if(suggested&&!placementIssue({...p,position:suggested},buildings))return suggested;
 const candidates:Position[]=[];if(p.privacy==='private'){for(let x=-5;x<=5;x+=.5)for(let z=-15;z<=-3;z+=.5)candidates.push({x,z});}else{const i=islandById(p.islandId);if(!exterior(p))return{x:0,z:0};if(['gallery','library','factory'].includes(p.specialType))candidates.push({x:0,z:0});for(const radius of [i.rx*.68,i.rx*.48,i.rx*.8])for(let n=0;n<72;n++){const a=n/72*Math.PI*2;candidates.push({x:Math.round(Math.sin(a)*radius*2)/2,z:Math.round(Math.cos(a)*radius*i.rz/i.rx*2)/2});}}
 return candidates.find(position=>!placementIssue({...p,position},buildings))??null;
}
export function migrateLayout(input:Project[],fallbacks:Project[]=[]):Project[]{const result:Project[]=[];for(const raw of input){if(raw.layoutVersion===2){result.push({...raw,position:positionOf(raw)});continue;}const p:Project={...raw,islandId:recommendedIsland(raw),layoutVersion:2,position:relocations[raw.id]??(raw.privacy==='private'?raw.position:original[raw.id])??null};const base=fallbacks.find(q=>q.id===p.id);if(base&&p.position===null)p.position=base.position;if(!p.position||placementIssue(p,result))p.position=freePosition(p,result);result.push(p);}return result;}
