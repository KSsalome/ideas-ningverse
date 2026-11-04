import {phaseAt,type Phase} from './shared.ts';

// Architecture stays local to home. Shared envelopes cover dawn, royal noon
// and both nights without a daylight flash at either overnight boundary.
export const nightTransitionMs=8000;
export const worldNight={sky:['#0e172d','#202b48','#45435c'],fog:'#354154',moon:'#d4deed',ambient:'#c4ccda'};
export const deepNight={sky:['#070d19','#141d2c','#2c333f'],fog:'#28313f',moon:'#e0e7ee',ambient:'#a9b5c5'};
export const royalDay={sky:['#568fbf','#9ac5df','#dbe5e6'],fog:'#c2d3dd',sun:'#fff3db',ambient:'#f1eee4'};
export const fairyDawn={sky:['#777da8','#c5adc8','#e8c8ae'],lateSky:['#a5bed9','#e2cadb','#f1dfbf'],fog:'#ccc8d6',lateFog:'#dce0de',sun:'#f9dfc3',ambient:'#e2dbea'};
export function worldNightAt(date=new Date()){return nightForPhase(phaseAt(date))===1;}
export function nightForPhase(phase:Phase|string){return phase==='cyber'||phase==='gothic'?1:0;}
export function depthForPhase(phase:Phase|string){return phase==='gothic'?1:0;}
export function noonForPhase(phase:Phase|string){return phase==='medieval'?1:0;}
export function noonAt(date=new Date()){return noonForPhase(phaseAt(date))===1;}
export function dawnForPhase(phase:Phase|string){return phase==='wonder'?1:0;}
export function dawnAt(date=new Date()){return dawnForPhase(phaseAt(date))===1;}
const dawnClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function dawnProgressAt(date=new Date()){
 const parts=Object.fromEntries(dawnClock.formatToParts(date).map(p=>[p.type,p.value]));
 return Math.max(0,Math.min(1,(Number(parts.hour)*3600+Number(parts.minute)*60+Number(parts.second)-4*3600)/(4*3600)));
}
export function nightStateForPhase(phase:Phase|string){return{mix:nightForPhase(phase),depth:depthForPhase(phase),noon:noonForPhase(phase),dawn:dawnForPhase(phase)};}
export function smoothBlend(from:number,to:number,elapsed:number,duration=nightTransitionMs){
 const t=Math.max(0,Math.min(1,elapsed/duration));return from+(to-from)*t*t*(3-2*t);
}
export function nightTransition(initialPhase:Phase|string){
 let value=nightStateForPhase(initialPhase),from={...value},target={...value},started=0,active=false;
 return{
  setPhase(phase:Phase|string,now:number){this.update(now);from={...value};target=nightStateForPhase(phase);started=now;active=true;},
  update(now:number){if(active){value={mix:smoothBlend(from.mix,target.mix,now-started),depth:smoothBlend(from.depth,target.depth,now-started),noon:smoothBlend(from.noon,target.noon,now-started),dawn:smoothBlend(from.dawn,target.dawn,now-started)};if(now-started>=nightTransitionMs)active=false;}return{...value};},
  get active(){return active;},
 };
}
