export const museumPalette=Object.freeze({ivory:'#eee5d4',marble:'#e5ddcc',stone:'#c6bba7',gold:'#c9ad78',roof:'#ddd4c0',wood:'#ad8964',darkWood:'#71533b',leaf:'#687a50',rose:'#e9c9cd',whiteRose:'#f5eddf',glass:'#c7d7d5',light:'#ffe0a2',shadow:'#706a61'});
export const museumExterior=Object.freeze({halfWidth:6.85,rear:-7.1,front:2.9,roof:8.35,stepsFront:7.8,stepsBack:4.4,stepsHalfWidth:4.4,stepsHeight:.72});
export const museumGardenObstacles=Object.freeze([{x:-9.6,z:3.1,r:2.1},{x:8.2,z:7.3,r:1.85},{x:-5.55,z:7,r:.7},{x:5.55,z:7,r:.7}]);
export function museumOutdoorBlocked(x:number,z:number){const b=museumExterior;return Math.abs(x)<b.halfWidth+.25&&z>b.rear-.25&&z<b.front+.3||museumGardenObstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.22);}
export function museumStepHeight(x:number,z:number){const b=museumExterior;return Math.abs(x)<b.stepsHalfWidth&&z>=b.stepsBack&&z<=b.stepsFront?b.stepsHeight*(b.stepsFront-z)/(b.stepsFront-b.stepsBack):0;}
export type MuseumSection='photography'|'cosplay'|'drawing';
export const museumSections=['photography','cosplay','drawing'] as const;
export const museumSectionNames:Record<MuseumSection,string>={photography:'攝影作品',cosplay:'Cosplay 作品',drawing:'繪圖作品'};
// Old artworks keep their original media and IDs; a new optional assignment wins.
export function museumSection(entry:{gallerySection?:string;medium?:string;category?:string;title?:string}):MuseumSection{if(museumSections.includes(entry.gallerySection as MuseumSection))return entry.gallerySection as MuseumSection;if(/cosplay|角色扮演|扮裝/i.test(entry.category??''))return'cosplay';return entry.medium==='painting'||/繪畫|繪圖|插畫/.test(entry.category??'')?'drawing':'photography';}
