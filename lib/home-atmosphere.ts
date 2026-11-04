import {phaseAt,type Phase} from './shared.ts';

// District architecture keeps its established palette. Shared cyber-night
// illumination is layered separately, without rebuilding those buildings.
export const exteriorBasePhase:Phase='industrial';
export const homeAtmospheres:Record<Phase,{
 sky:[string,string,string];cloud:string;mist:string;leaf:string;shade:string;
 flowers:[string,string];key:string;ambient:string;direct:number;fill:number;
 lampPower:number;night:boolean;planting:string;accent:string;
}>={
 wonder:{sky:['#9a94c7','#dfbfce','#f0d8b4'],cloud:'#f8e2e8',mist:'#d8c9ec',leaf:'#b4bfa7',shade:'#83988a',flowers:['#efd2e2','#cfe9e2'],key:'#fae5dc',ambient:'#e5dcfa',direct:1.05,fill:1.12,lampPower:12,night:false,planting:'ethereal-garden',accent:'#d5b8e9'},
 forest:{sky:['#719cbe','#b3d2df','#e9dfbf'],cloud:'#f4f4e9',mist:'#dce8dc',leaf:'#72994e',shade:'#456e49',flowers:['#f2eedd','#e6b4c7'],key:'#fff0d4',ambient:'#e0f0e2',direct:1.12,fill:1.07,lampPower:11,night:false,planting:'living-forest',accent:'#b6d4ad'},
 medieval:{sky:['#628eaf','#a7cadb','#e5dfc8'],cloud:'#f5f1e5',mist:'#d9e3dd',leaf:'#647c48',shade:'#405a3c',flowers:['#f0e9d9','#e6c6d0'],key:'#fff4df',ambient:'#e8edf3',direct:1.14,fill:1.05,lampPower:4,night:false,planting:'formal-courtyard',accent:'#cfb87d'},
 industrial:{sky:['#a99089','#d4b399','#ebd0a2'],cloud:'#eedec3',mist:'#d3bca3',leaf:'#7d8950',shade:'#526740',flowers:['#c28c59','#d3ba7d'],key:'#ffd6a2',ambient:'#ecd3ba',direct:1.08,fill:.96,lampPower:15,night:false,planting:'herb-market',accent:'#c69a5e'},
 cyber:{sky:['#111a3a','#30294e','#674663'],cloud:'#725577',mist:'#725d91',leaf:'#587b82',shade:'#314755',flowers:['#c489cb','#79ccd6'],key:'#a4c5fa',ambient:'#c2a3dc',direct:.67,fill:.67,lampPower:20,night:true,planting:'neon-planters',accent:'#83cddc'},
 gothic:{sky:['#0d1527','#202a3d','#414557'],cloud:'#4a5364',mist:'#687083',leaf:'#344a3f',shade:'#24382f',flowers:['#70293c','#452032'],key:'#b1c8e1',ambient:'#a3acc9',direct:.48,fill:.52,lampPower:17,night:true,planting:'midnight-rose-garden',accent:'#9e5c65'},
};
export function homeAtmosphereAt(date=new Date()){
 const phase=phaseAt(date);return{phase,...homeAtmospheres[phase]};
}
