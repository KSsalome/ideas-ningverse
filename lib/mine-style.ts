export const mineMountainRadius=7.8;
export const minePalette=Object.freeze({ivory:'#28232e',stone:'#3b3541',navy:'#17101f',gold:'#9b754b',leaf:'#302a35',light:'#ffd095',magic:'#b59bd9',rock:'#323039',rockShade:'#22232b',wood:'#4b3028',iron:'#1c1c24',crimson:'#9e2945',burgundy:'#4b1b2b'});
export const mineShapeNames:Record<string,string>={mine:'木造晶礦洞',tarot:'緋月塔羅尖塔',cottage:'黑岩工坊小屋'};
export function mineBuildingKind(p:{shape:string;specialType?:string}){
 if(p.specialType==='tarot')return'tarot';
 if(p.specialType==='collection')return'cave';
 return p.shape==='tarot'?'tarot':p.shape==='mine'?'cave':'workshop';
}
