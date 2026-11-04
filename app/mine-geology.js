import * as THREE from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {seeded} from './art-kit.js';

const TAU=Math.PI*2;
// The triangulation is generated once, from scattered sites rather than level rings.
// All of the land geometry fits the existing 7.8-unit navigation reservation.
function triangulate(input){
 const points=[...input,[-64,-40],[64,-40],[0,72]],count=input.length;
 let triangles=[[count,count+1,count+2]];
 const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let i=0;i<count;i++){
  const p=points[i],boundary=new Map(),kept=[];
  for(const t of triangles){
   const [a,b,c]=t.map(n=>[points[n][0]-p[0],points[n][1]-p[1]]);
   const det=(a[0]*a[0]+a[1]*a[1])*(b[0]*c[1]-b[1]*c[0])-(b[0]*b[0]+b[1]*b[1])*(a[0]*c[1]-a[1]*c[0])+(c[0]*c[0]+c[1]*c[1])*(a[0]*b[1]-a[1]*b[0]);
   if(det>1e-8){for(let n=0;n<3;n++){const edge=[t[n],t[(n+1)%3]],key=[...edge].sort((a,b)=>a-b).join(':');if(boundary.has(key))boundary.delete(key);else boundary.set(key,edge);}}
   else kept.push(t);
  }
  for(const [a,b] of boundary.values())if(Math.abs(orient(points[a],points[b],p))>1e-8)kept.push(orient(points[a],points[b],p)>0?[a,b,i]:[b,a,i]);
  triangles=kept;
 }
 return triangles.filter(t=>t.every(n=>n<count));
}

function rockHeight(x,z){
 const peak=(px,pz,rx,rz,h,power)=>h*Math.max(0,1-Math.hypot((x-px)/rx,(z-pz)/rz))**power;
 const ridge=Math.max(peak(-.55,-.7,6.8,6.1,12.2,.82),peak(3.6,1.1,3.6,3.8,8.6,.68),peak(-3.45,2.15,3.3,3.7,7.35,.72),peak(1.7,-3.45,3.2,3.4,9.2,.7));
 return Math.max(.12,ridge+Math.sin(x*2.3+z*.7)*Math.cos(z*1.8-x*.5)*.34);
}

const surfaceCache=new Map();
export function mountainSurface(coarse=false){
 if(surfaceCache.has(coarse))return surfaceCache.get(coarse);
 const rng=seeded(871),sites=[],boundary=coarse?16:22;
 for(let n=0;n<boundary;n++){const a=(n+.12*(rng()-.5))/boundary*TAU,r=6.65+rng()*.65;sites.push({x:Math.sin(a)*r,z:Math.cos(a)*r*.87,boundary:true});}
 for(const [x,z]of [[-.55,-.7],[3.6,1.1],[-3.45,2.15],[1.7,-3.45],[-1.7,2.5],[.7,3.6],[-3,-2.2]])sites.push({x,z});
 const count=coarse?34:93,minGap=coarse?.87:.6;
 for(let n=0,attempt=0;n<count&&attempt<2000;attempt++){
  const a=rng()*TAU,r=Math.sqrt(rng())*6.35,x=Math.sin(a)*r,z=Math.cos(a)*r*.86;
  if(sites.some(p=>Math.hypot(p.x-x,p.z-z)<minGap))continue;sites.push({x,z});n++;
 }
 const vertices=sites.map(p=>[p.x,p.boundary?.08:rockHeight(p.x,p.z),p.z]);
 const triangles=triangulate(sites.map(p=>[p.x,p.z])).map(([a,b,c])=>[vertices[a],vertices[c],vertices[b]]); // up-facing XZ winding
 const buckets=[[],[],[],[]];triangles.forEach((t,n)=>buckets[(n*7+Math.floor(t[0][1]))%4].push(...t.flat()));
 const edges=new Map();for(const t of triangles)for(let n=0;n<3;n++){const a=t[n],b=t[(n+1)%3],key=[a.join(','),b.join(',')].sort().join(':');if(!edges.has(key))edges.set(key,[a,b]);}
 const seams=[...edges.values()].filter(([a,b])=>Math.min(a[1],b[1])>.8&&Math.max(a[1],b[1])<11.3&&Math.hypot(a[0]-b[0],a[2]-b[2])>.55);
 const result={vertices,triangles,buckets,seams};surfaceCache.set(coarse,result);return result;
}

export function sampleRockSurface(triangles,x,z){
 let result=null;
 for(const [a,b,c]of triangles){
  const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(denominator)<1e-9)continue;
  const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denominator,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denominator,w=1-u-v;
  if(u<-.00001||v<-.00001||w<-.00001)continue;
  const y=u*a[1]+v*b[1]+w*c[1];if(result&&result.y>=y)continue;
  const normal=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a))).normalize();
  result={y,normal};
 }
 return result;
}

export const crystalTypes=Object.freeze(['spire','cluster','needle','blade','broken']);
export function crystalElevationBand(height=0){return Math.min(3,Math.max(0,Math.floor(height/3.5)));}
// Each variant has its own cross section, shoulder heights and termination.
// Three facet buckets share a tiny vertical colour/emission map; no custom shader.
export function crystalGeometry(type='spire',{elevationBand=0}={}){
 const index=Math.max(0,crystalTypes.indexOf(type)),sides=[5,7,4,4,5][index],rng=seeded(503+index*47),buckets=[[],[],[]],uvs=[[],[],[]];
 const shape=Array.from({length:sides},(_,n)=>({a:n/sides*TAU+(rng()-.5)*.16,r:.78+rng()*.35}));
 const flat=type==='blade'?.32:type==='needle'?.7:1,shoulder=[.69,.58,.81,.68,.74][index],skew=[.08,-.22,.16,.27,-.1][index];
 const rings=[[0,.62,0],[.19,.85,skew*.2],[shoulder,1,skew*.7]].map(([y,r,shift])=>shape.map(({a,r:rr},n)=>[Math.sin(a)*r*rr+shift,y+(y===0?0:(rng()-.5)*.065),Math.cos(a)*r*rr*flat]));
 if(type==='broken')rings.push(shape.map(({a,r},n)=>[Math.sin(a)*r*.64-.08,.84+(n%3)*.07,Math.cos(a)*r*flat*.64]));
 const tri=(slot,a,b,c)=>{buckets[slot].push(...a,...b,...c);for(const p of [a,b,c])uvs[slot].push((elevationBand+.5)/4,Math.max(0,Math.min(1,p[1])));};
 for(let row=0;row<rings.length-1;row++)for(let n=0;n<sides;n++){const j=(n+1)%sides;tri(n%3,rings[row][n],rings[row][j],rings[row+1][n]);tri(n%3,rings[row][j],rings[row+1][j],rings[row+1][n]);}
 const top=type==='broken'?[-.12,.94,.04]:[skew,1,.08];for(let n=0;n<sides;n++){const j=(n+1)%sides;tri(n%3,rings.at(-1)[n],rings.at(-1)[j],top);tri(0,[0,0,0],rings[0][j],rings[0][n]);}
 return buckets.map((vertices,n)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs[n],2));g.computeVertexNormals();g.userData.crystalType=type;return g;});
}

export function outcropGeometry(variant=0){
 const rng=seeded(134+variant*71),points=[];
 for(const y of [-.55,.5])for(let n=0;n<5;n++){const a=n/5*TAU+(y>0?.3:0),r=.64+rng()*.3;points.push(new THREE.Vector3(Math.sin(a)*r+(y>0?.14:0),y+(rng()-.5)*.25,Math.cos(a)*r));}
 points.push(new THREE.Vector3(-.18,.86,.1));return new ConvexGeometry(points);
}
