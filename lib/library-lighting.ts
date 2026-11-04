const taipeiHour=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'});
export const libraryLighting=Object.freeze({
 day:Object.freeze({mode:'day',glazing:'#f0dfba',light:'#ffe2aa',ambient:'#d0c8b5',key:1.4,fill:26,shaftOpacity:.028,poolOpacity:.055}),
 night:Object.freeze({mode:'night',glazing:'#e2e9f2',light:'#f0f3fa',ambient:'#c3cbd5',key:1.15,fill:22,shaftOpacity:.018,poolOpacity:.038}),
});
export type LibraryLighting=typeof libraryLighting.day|typeof libraryLighting.night;
// Keep 05:00–06:00 on the white-light setting until the 06:00 daylight boundary.
export function libraryLightingAt(date=new Date()):LibraryLighting{const h=Number(taipeiHour.format(date));return h>=6&&h<17?libraryLighting.day:libraryLighting.night;}
