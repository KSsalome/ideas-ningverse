export const minZoom=.7,maxZoom=30;
export function clampZoom(value:number){return Math.min(maxZoom,Math.max(minZoom,Number.isFinite(value)?value:1.35));}
export function viewHeight(width:number,height:number){return Math.max(155,225/(width/height));}
export function recommendedZoom(width:number,height:number,overview=false){return overview?1.35:clampZoom(viewHeight(width,height)/25);}
