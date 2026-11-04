import {mineShapeNames,mineBuildingKind} from './mine-style.ts';
// One registry feeds validation, the editor, previews, MCP and the 3D city.
export const shapeIds=['clock','library','lab','manor','station','glass','harbor','observatory','arcade','cottage','tarot','guestbook','grand-library','skyscraper','mine','museum','factory'] as const;
export type BuildingShape=typeof shapeIds[number];
export const shapeNames:Record<BuildingShape,string>={clock:'時鐘塔',library:'圖書館',lab:'實驗室',manor:'莊園',station:'車站',glass:'玻璃花房',harbor:'港灣小屋',observatory:'天文台',arcade:'霓光遊戲基地',cottage:'小房子',tarot:'星語塔羅塔',guestbook:'海風留言牆','grand-library':'大圖書館',skyscraper:'摩天高樓',mine:'礦洞',museum:'希臘神殿美術館',factory:'資訊工廠'};
export type TechProfile={label:string;sign:string;height:number;width:number;depth:number;crown:string;columns:number};
export const technologyProfiles:Record<BuildingShape,TechProfile>={
 clock:{label:'時序鐘面高樓',sign:'TIME',height:13,width:2.9,depth:2.7,crown:'clock',columns:2},
 library:{label:'資料書庫大樓',sign:'DATA',height:12,width:3,depth:2.65,crown:'archive',columns:3},
 lab:{label:'研究實驗高樓',sign:'LAB',height:14,width:2.85,depth:2.7,crown:'reactor',columns:2},
 manor:{label:'階梯商務大樓',sign:'WORK',height:11,width:3.15,depth:2.8,crown:'terraces',columns:3},
 station:{label:'交通轉運大樓',sign:'TRANSIT',height:8.5,width:3.35,depth:2.7,crown:'canopy',columns:3},
 glass:{label:'黑玻璃帷幕塔',sign:'LUMA',height:15,width:2.9,depth:2.65,crown:'glass',columns:3},
 harbor:{label:'訊號港灣大樓',sign:'PORT',height:10,width:3.05,depth:2.75,crown:'signal',columns:2},
 observatory:{label:'天際觀測高樓',sign:'SCAN',height:16,width:2.85,depth:2.7,crown:'dome',columns:2},
 arcade:{label:'霓虹遊戲基地',sign:'PLAY',height:7.5,width:5,depth:3.7,crown:'arcade',columns:4},
 cottage:{label:'街角工作室',sign:'STUDIO',height:4.4,width:2.35,depth:2.2,crown:'studio',columns:2},
 tarot:{label:'星象訊號塔',sign:'ARCANA',height:12,width:2.9,depth:2.8,crown:'cards',columns:2},
 guestbook:{label:'留言訊息大樓',sign:'MESSAGE',height:7.4,width:3.3,depth:2.65,crown:'message',columns:3},
 'grand-library':{label:'數位典藏大樓',sign:'ARCHIVE',height:15,width:4.3,depth:3.6,crown:'stacks',columns:4},
 skyscraper:{label:'霓虹摩天高樓',sign:'SKY',height:19,width:3.1,depth:2.8,crown:'antenna',columns:3},
 mine:{label:'地下工坊入口',sign:'CRAFT',height:4.7,width:4.1,depth:3,crown:'workshop',columns:3},
 museum:{label:'影像展覽大樓',sign:'ART',height:11,width:5,depth:4.2,crown:'media',columns:4},
 factory:{label:'科技製造大樓',sign:'FAB',height:8,width:5.3,depth:3.8,crown:'plant',columns:4},
};
export const techLightColors=['#ffda95','#a9dfff','#d4baff','#ff6b79'] as const;
export const technologyPalette=Object.freeze({body:'#070b10',metal:'#1b2530',glass:'#14232e',asphalt:'#171c24',yellow:techLightColors[0],blue:techLightColors[1],purple:techLightColors[2],red:techLightColors[3]});
// Narrow bays and a consistent storey height, shared by the city and editor.
export function technologyWindowGrid(profile:TechProfile,width:number,height:number,proxy=false){
 const columns=Math.max(3,Math.ceil(profile.columns*2.35*width/profile.width));
 return{columns:proxy?Math.max(3,Math.ceil(columns*.6)):columns,rows:Math.max(1,Math.floor(height/(proxy?1.35:.68)))};
}
export function appearanceName(project:{islandId:string;shape:BuildingShape;specialType?:string}){if(project.islandId==='information'&&(project.specialType==='factory'||project.shape==='factory'))return'美式工業酒吧';if(project.islandId==='art'&&project.specialType==='gallery')return'希臘神殿美術館';if(project.islandId==='library')return'英倫古典圖書館';if(project.islandId==='technology')return technologyProfiles[project.shape].label;if(project.islandId==='mine'){const kind=mineBuildingKind(project);return kind==='tarot'?mineShapeNames.tarot:kind==='cave'?mineShapeNames.mine:mineShapeNames[project.shape]??shapeNames[project.shape];}return shapeNames[project.shape];}
export function appearanceOptions(islandId:string,specialType?:string){if(islandId==='information'&&specialType==='factory')return[{value:'factory' as const,label:'美式工業酒吧'}];if(islandId==='art'&&specialType==='gallery')return[{value:'museum' as const,label:'希臘神殿美術館'}];if(islandId==='library')return[{value:'grand-library' as const,label:'英倫古典圖書館'}];return shapeIds.map(value=>({value,label:islandId==='information'&&value==='factory'?'美式工業酒吧':islandId==='technology'?technologyProfiles[value].label:islandId==='mine'?mineShapeNames[value]??shapeNames[value]:shapeNames[value]}));}
export function constructionFraction(project:{status:string;progress:number|null}){return project.status==='foundation'?.08:project.status==='building'?Math.max(.12,Math.min(1,(project.progress??0)/100)):1;}
