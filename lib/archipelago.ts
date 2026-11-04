import {factoryName} from './factory-style.ts';
import type {Project} from './shared';
export type IslandId='home'|'technology'|'mine'|'art'|'library'|'social'|'information';
export type Island={id:IslandId;name:string;subtitle:string;x:number;z:number;rx:number;rz:number;height:number;color:string;landmark:string};
export const islands:Island[]=[
 {id:'home',name:'主島',subtitle:'城堡・森林・花園',x:0,z:0,rx:20,rz:21,height:8,color:'#789581',landmark:'高處的城堡'},
 {id:'technology',name:'科技島',subtitle:'APP・網站・遊戲',x:50,z:6,rx:23,rz:22,height:1.8,color:'#25303e',landmark:'霓虹訊號高樓'},
 {id:'mine',name:'手作礦島',subtitle:'手作・礦洞・塔羅',x:-48,z:7,rx:21,rz:20,height:2.8,color:'#39323e',landmark:'緋紅水晶'},
 {id:'art',name:'美術島',subtitle:'攝影・Cosplay・繪圖',x:29,z:-43,rx:15,rz:15,height:2.4,color:'#c1b9a3',landmark:'神殿美術館'},
 {id:'library',name:'圖書島',subtitle:'藏書・筆記・魔法',x:-29,z:-43,rx:16,rz:15,height:3.2,color:'#8d8297',landmark:'魔法圖書館'},
 {id:'social',name:'社交平台島',subtitle:'社群帳號・留言牆',x:85,z:43,rx:14,rz:14,height:1.2,color:'#7d9a9e',landmark:'訊號光塔'},
 {id:'information',name:factoryName,subtitle:'關於寧',x:-82,z:43,rx:14,rz:14,height:1.6,color:'#55584d',landmark:'暖光情報酒吧'},
];
export const islandById=(id:string)=>islands.find(i=>i.id===id)??islands[0];
export const bridgeLinks:[IslandId,IslandId][]=[['home','technology'],['home','mine'],['home','art'],['home','library'],['home','social'],['home','information'],['technology','art'],['art','library'],['library','mine'],['technology','social'],['mine','information']];
export function bridgePath(aId:IslandId,bId:IslandId){const a=islandById(aId),b=islandById(bId),middle=aId==='home'&&bId==='social'?[{x:25,z:30},{x:58,z:47}]:aId==='home'&&bId==='information'?[{x:-25,z:30},{x:-57,z:47}]:[],towardA=middle[0]??b,towardB=middle.at(-1)??a,adx=towardA.x-a.x,adz=towardA.z-a.z,bdx=towardB.x-b.x,bdz=towardB.z-b.z,ar=.86/Math.sqrt((adx/a.rx)**2+(adz/a.rz)**2),br=.86/Math.sqrt((bdx/b.rx)**2+(bdz/b.rz)**2),points=[{x:a.x+adx*ar,z:a.z+adz*ar},...middle,{x:b.x+bdx*br,z:b.z+bdz*br}],lengths=points.slice(1).map((p,n)=>Math.hypot(p.x-points[n].x,p.z-points[n].z)),total=lengths.reduce((sum,n)=>sum+n,0);let distance=0;return points.map((p,n)=>{if(n)distance+=lengths[n-1];const t=distance/total;return{...p,y:a.height+(b.height-a.height)*t+Math.sin(t*Math.PI)*.5};});}
export function bridgeEnds(aId:IslandId,bId:IslandId){const p=bridgePath(aId,bId);return{a:p[0],b:p.at(-1)!};}
let cachedSegments:ReturnType<typeof bridgePath> extends (infer P)[]?{a:P;b:P}[]:never;
export const bridgeSegments=()=>cachedSegments??=bridgeLinks.flatMap(([a,b])=>{const points=bridgePath(a,b);return points.slice(1).map((point,n)=>({a:points[n],b:point}));});
export function segmentPoint(x:number,z:number,a:{x:number;z:number},b:{x:number;z:number}){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return{t,distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t)};}
export function terrainAt(x:number,z:number):{islandId:IslandId|null;height:number;bridge:boolean}|null{
 for(const i of islands)if(((x-i.x)/i.rx)**2+((z-i.z)/i.rz)**2<=.98**2)return{islandId:i.id,height:i.height,bridge:false};
 for(const e of bridgeSegments()){const p=segmentPoint(x,z,e.a,e.b);if(p.distance<=1.75)return{islandId:null,height:e.a.y+(e.b.y-e.a.y)*p.t,bridge:true};}return null;
}
export function exterior(p:Project){if(p.privacy==='private')return p.islandId==='home';if(p.islandId==='mine'&&p.kind==='project'&&p.collectionCategory)return false;if(p.islandId==='art')return p.specialType==='gallery';if(p.islandId==='library')return p.specialType==='library';if(p.islandId==='information')return p.specialType==='factory';return p.kind!=='info';}
export function worldPosition(p:Project){const i=islandById(p.islandId);return{x:i.x+(p.position?.x??0),z:i.z+(p.position?.z??0),y:i.height};}
export function recommendedIsland(p:Pick<Project,'kind'|'privacy'|'specialType'|'category'|'platform'|'categoryIcon'>):IslandId{if(p.privacy==='private')return'home';if(p.specialType==='gallery')return'art';if(p.specialType==='factory'||p.kind==='info')return'information';if(p.specialType==='library')return'library';if(p.specialType==='tarot'||p.specialType==='collection'||p.categoryIcon==='handcraft'||/手做|手作|工藝|珠飾|編織/.test(p.category))return'mine';if(p.kind==='social')return p.platform==='game'?'technology':'social';if(p.categoryIcon==='photo'||p.categoryIcon==='creative'||/拍攝|攝影|繪畫|創作|影片/.test(p.category))return'art';if(p.specialType==='guestbook')return'social';return'technology';}

export function entranceFor(p:Project,projects:Project[]):Project|undefined{if(exterior(p))return p;if(p.islandId==='art')return projects.find(q=>q.specialType==='gallery');if(p.islandId==='information')return projects.find(q=>q.specialType==='factory');if(p.islandId==='mine')return projects.find(q=>q.specialType==='collection'&&q.collectionCategory===p.collectionCategory);return undefined;}
