import * as THREE from 'three';
import {bridgeSegments,segmentPoint} from '../lib/archipelago.ts';
import {footprint,positionOf} from '../lib/layout.ts';
import {findRoute,walkable} from '../lib/navigation.ts';
import {technologyProfiles,technologyPalette} from '../lib/building-appearance.ts';

// Scenic expressway above the existing walking bridges; streets follow the
// same entrance routes as the player. No project positions or navigation change.
export default function technologyInfrastructure({root,island,projects,kit:k,materials:m,lowDetail,roadLamp}){
 const {group,box,cyl,mesh,line}=k,TAU=Math.PI*2;
 const concrete=k.mat('#30353a'),curb=k.mat('#424951'),fenceMetal=k.mat('#24313c','metal'),white=k.mat('#bac3c1'),road=m.asphalt.clone();road.color.set('#232b35');
 const city=group(root);city.name='tech-street-network';
 const highway=group(root);highway.name='tech-elevated-expressway';highway.userData.elevation=7.2;highway.userData.scenic=true;
 const stats={streetSegments:0,fencePanels:0,piers:0,highwayLamps:0,crosswalks:0},clearRoutes=[],groundFences=[];
 const portals=bridgeSegments().flatMap(({a,b})=>[a,b]).filter(p=>((p.x-island.x)/island.rx)**2+((p.z-island.z)/island.rz)**2<.9**2).map(p=>({x:p.x-island.x,z:p.z-island.z}));
 const portalGap=(x,z,margin=2.6)=>portals.some(p=>segmentPoint(x,z,{x:p.x*.83,z:p.z*.83},{x:p.x*1.5,z:p.z*1.5}).distance<margin);
 const localFree=(x,z,padding=.8)=>((x/(island.rx-1))**2+(z/(island.rz-1))**2<1)&&Math.hypot(x,z)>4.6+padding&&projects.every(p=>{const q=positionOf(p);return Math.hypot(x-q.x,z-q.z)>footprint(p)+padding;});
 const destinations=[...portals,...projects.map(p=>{const q=positionOf(p);return{x:q.x,z:q.z+footprint(p)+1.3};})];
 const candidates=[];for(let x=-18;x<=18;x++)for(let z=-18;z<=18;z++)if(localFree(x,z,.2)&&walkable(island.x+x,island.z+z,projects))candidates.push({x:island.x+x,z:island.z+z});
 candidates.sort((a,b)=>Math.hypot(a.x-island.x,a.z-island.z-island.rz*.68)-Math.hypot(b.x-island.x,b.z-island.z-island.rz*.68));
 const anchor=candidates[0]??{x:island.x,z:island.z+island.rz*.68};
 for(const to of destinations){const path=findRoute(anchor,{x:island.x+to.x,z:island.z+to.z},projects).filter(p=>((p.x-island.x)/island.rx)**2+((p.z-island.z)/island.rz)**2<.99**2).map(p=>({x:p.x-island.x,z:p.z-island.z}));if(path.length)clearRoutes.push([{x:anchor.x-island.x,z:anchor.z-island.z},...path]);}
 const nearPassage=(x,z,margin=1.12)=>clearRoutes.some(path=>path.some(p=>Math.hypot(x-p.x,z-p.z)<margin));
 function ribbon(parent,points,width,y,material,name,closed=false){
  const vertices=[],uv=[],indices=[],normals=[];
  for(let n=0;n<points.length;n++){const prev=points[n? n-1:closed?points.length-1:0],next=points[n<points.length-1?n+1:closed?0:points.length-1],dx=next.x-prev.x,dz=next.z-prev.z,length=Math.hypot(dx,dz)||1,nx=-dz/length,nz=dx/length;
   for(const side of [-1,1]){const x=points[n].x+nx*width*.5*side,z=points[n].z+nz*width*.5*side;vertices.push(x,y,z);normals.push(0,1,0);uv.push(x*.25,z*.25);}
  }
  for(let n=0;n<(closed?points.length:points.length-1);n++){const a=n*2,b=((n+1)%points.length)*2;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
  const o=mesh(g,material,parent);o.name=name;return o;
 }
 function bar(parent,a,b,y,width,height,material,name){const length=Math.hypot(b.x-a.x,b.z-a.z),o=box(length,height,width,material,parent,(a.x+b.x)/2,y,(a.z+b.z)/2);o.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);o.name=name;return o;}
 function fence(parent,a,b,{height=1.15,ground=true}={}){
  const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.3)return;
  if(ground&&Array.from({length:5},(_,n)=>({x:a.x+(b.x-a.x)*n/4,z:a.z+(b.z-a.z)*n/4})).some(p=>portalGap(p.x,p.z)||nearPassage(p.x,p.z)))return;
  const g=group(parent,(a.x+b.x)/2,0,(a.z+b.z)/2);g.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);g.name='tech-industrial-fence';
  for(const x of [-length/2,length/2]){box(.08,height+.27,.08,fenceMetal,g,x,height/2+.12,0);box(.2,.08,.2,curb,g,x,.06,0);}
  for(const y of [.24,height*.76])box(length,.035,.035,fenceMetal,g,0,y,0);
  const count=Math.ceil(length/(lowDetail?.34:.23));for(let n=1;n<count;n++){const x=-length/2+n*length/count;box(.027,height,.027,fenceMetal,g,x,height/2+.08,0);line([[x,height+.08,0],[x,height+.29,-.15]],fenceMetal,g,.014);}
  box(length,.03,.03,fenceMetal,g,0,height+.08,0);stats.fencePanels++;if(ground)groundFences.push({a,b,height});return g;
 }
 // The annular deck has a continuous asphalt surface and actual concrete beams.
 const rx=island.rx+2.1,rz=island.rz+2.1,h=highway.userData.elevation,width=3.7,steps=lowDetail?72:120;
 const ellipse=(a,offset=0)=>({x:Math.sin(a)*(rx+offset),z:Math.cos(a)*(rz+offset)}),ringPoints=offset=>Array.from({length:steps},(_,n)=>ellipse(n/steps*TAU,offset));
 ribbon(highway,ringPoints(0),width,h,road,'tech-highway-asphalt',true);
 for(const offset of [-width*.44,width*.44])ribbon(highway,ringPoints(offset),.055,h+.026,white,'tech-highway-edge-line',true);
 for(const offset of [-.09,.09])ribbon(highway,ringPoints(offset),.045,h+.032,m.lane,'tech-highway-centre-line',true);
 for(let n=0;n<steps;n++){
  const a=n/steps*TAU,b=(n+1)/steps*TAU,from=ellipse(a),to=ellipse(b);
  bar(highway,from,to,h-.3,width,.56,concrete,'tech-highway-deck-beam');
  for(const offset of [-width*.51,width*.51]){
   const edgeA=ellipse(a,offset),edgeB=ellipse(b,offset);bar(highway,edgeA,edgeB,h+.3,.19,.6,concrete,'tech-highway-concrete-barrier');bar(highway,edgeA,edgeB,h+.86,.075,.14,fenceMetal,'tech-highway-w-beam');
   if(n%2===0){const p=ellipse(a,offset);box(.045,.43,.045,fenceMetal,highway,p.x,h+.65,p.z);if(n%6===0){const light=box(.12,.1,.08,m.neon(offset<0?technologyPalette.yellow:technologyPalette.red),highway,p.x,h+.95,p.z);light.castShadow=false;}}
  }
  if(n%4===0){const p=ellipse((a+b)/2,.78);const mark=box(.05,.018,1.3,white,highway,p.x,h+.03,p.z);mark.rotation.y=(a+b)/2;}
 }
 for(let n=0;n<16;n++){
  const a=n/16*TAU,p=ellipse(a,-width*.35);if(portalGap(p.x,p.z,3.7))continue;
  const g=group(highway,p.x,0,p.z);g.name='tech-highway-pier';g.rotation.y=a;
  box(.85,1.1,1.35,concrete,g,0,-2.7,0);box(.6,h+2.3,.8,concrete,g,0,(h-2.3)/2,0);box(2.7,.5,3.25,concrete,g,0,h-.7,.75);
  for(const side of [-1,1])line([[0,h-2.1,0],[side*.95,h-.85,.2]],concrete,g,.17);
  // Outriggers connect the pier foot to the floating island's rock wall.
  box(1.2,.55,3.1,concrete,g,0,-1.6,-1.1);stats.piers++;
 }
 for(let n=0;n<12;n++){const a=n/12*TAU,p=ellipse(a,width*.43);roadLamp(highway,p.x,h,p.z,4.1,-a+Math.PI/2,n%3===0);stats.highwayLamps++;}
 for(const a of [Math.PI*.14,Math.PI*.78,Math.PI*1.42]){const p=ellipse(a,-width*.52),g=group(highway,p.x,h,p.z);g.name='tech-highway-gantry';g.rotation.y=a;for(const x of [-2,2])box(.11,3.3,.11,fenceMetal,g,x,1.65,0);box(4.3,.12,.12,fenceMetal,g,0,3.3,0);box(1.5,.6,.09,k.mat('#173b37'),g,-.9,2.9,0);box(1.5,.6,.09,k.mat('#26384a'),g,.9,2.9,0);for(const x of [-.9,.9])line([[x,3.08,.06],[x,2.7,.06],[x-.15,2.85,.06],[x,2.7,.06],[x+.15,2.85,.06]],white,g,.018);}
 // A few screened portions add the taller industrial fence silhouette.
 for(let n=0;n<12;n++){const a=(n/36+.03)*TAU,b=a+.12;const from=ellipse(a,width*.54),to=ellipse(b,width*.54),g=group(highway,0,h,0);fence(g,from,to,{height:1.3,ground:false});}

 const roadKeys=new Set();
 function street(a,b,w=2.35,{marked=true}={}){
  const x=(a.x+b.x)/2,z=(a.z+b.z)/2,key=[x.toFixed(1),z.toFixed(1),w].join(':');if(roadKeys.has(key)||!localFree(x,z,.05))return;
  roadKeys.add(key);const lane=ribbon(city,[a,b],w,.031,road,'tech-street-asphalt');lane.renderOrder=-775;stats.streetSegments++;
  if(marked&&stats.streetSegments%3===0){const dx=b.x-a.x,dz=b.z-a.z;bar(city,{x:x-dx*.23,z:z-dz*.23},{x:x+dx*.23,z:z+dz*.23},.067,.04,.014,m.lane,'tech-street-dash');}
 }
 // Perimeter avenue, crossing boulevards, then the exact routes to entrances.
 for(let n=0;n<100;n++){const a=n/100*TAU,b=(n+1)/100*TAU,p={x:Math.sin(a)*island.rx*.82,z:Math.cos(a)*island.rz*.82},q={x:Math.sin(b)*island.rx*.82,z:Math.cos(b)*island.rz*.82};if(localFree(p.x,p.z,1)&&localFree(q.x,q.z,1))street(p,q,2.5);}
 for(const axis of [0,1])for(const offset of [-7,0,7])for(let n=-19;n<19;n++){const a=axis?{x:offset,z:n}:{x:n,z:offset},b=axis?{x:offset,z:n+1}:{x:n+1,z:offset};if(localFree(a.x,a.z,1.05)&&localFree(b.x,b.z,1.05))street(a,b);}
 for(const path of clearRoutes)for(let n=1;n<path.length;n++)street(path[n-1],path[n],2.1,{marked:n%5===0});
 // Curbs, storm drains and pedestrian crossings give the ground a human scale.
 for(const side of [-1,1])for(let n=-17;n<17;n+=3){for(const axis of [0,1]){const x=axis?side*8.6:n,z=axis?n:side*8.6;if(!localFree(x,z,1.1)||portalGap(x,z)||nearPassage(x,z,1))continue;const c=box(axis?.14:1.7,.11,axis?1.7:.14,curb,city,x,.07,z);c.name='tech-street-curb';if(n%2){const drain=box(.45,.025,.3,fenceMetal,city,x,.055,z);drain.name='tech-storm-drain';for(let j=0;j<4;j++)box(.035,.008,.24,k.mat('#090e14'),city,x-.15+j*.1,.072,z);}}}
 for(const p of portals){const x=p.x*.91,z=p.z*.91,g=group(city,x,.068,z);g.rotation.y=Math.atan2(p.x,p.z);g.name='tech-pedestrian-crossing';for(let n=0;n<6;n++)box(2.5,.015,.17,white,g,0,0,(n-2.5)*.32);stats.crosswalks++;}
 for(const [x,z]of [[-4.9,4.9],[5.2,-5.2],[-7,7],[7,-7]])if(localFree(x,z,.3)){const cover=cyl(.35,.35,.025,fenceMetal,city,x,.055,z,16);cover.name='tech-manhole';for(const off of [-.12,0,.12])box(.43,.012,.025,curb,city,x,.073,z+off);}
 // Dense perimeter pickets stop at every walking bridge and approach corridor.
 for(let n=0;n<80;n++){const a=n/80*TAU,b=(n+1)/80*TAU,from={x:Math.sin(a)*island.rx*.952,z:Math.cos(a)*island.rz*.952},to={x:Math.sin(b)*island.rx*.952,z:Math.cos(b)*island.rz*.952};if(localFree(from.x,from.z,.3)&&localFree(to.x,to.z,.3))fence(city,from,to);}
 for(const p of projects){const q=positionOf(p),profile=technologyProfiles[p.shape],r=footprint(p),w=Math.min(profile.width+1,r*1.3),z=q.z-r*.72;
  fence(city,{x:q.x-w/2,z},{x:q.x+w/2,z});for(const side of [-1,1])fence(city,{x:q.x+side*w/2,z},{x:q.x+side*w/2,z:q.z-r*.28});
 }
 root.userData.urbanInfrastructure={...stats,highwayElevation:h,highwayWidth:width,portals,groundFences,protectedRoutes:clearRoutes};
 function proxy(parent){const g=group(parent);g.name='tech-expressway-proxy';ribbon(g,ringPoints(0),width,h,concrete,'tech-highway-deck',true);for(const offset of [-width*.5,width*.5])ribbon(g,ringPoints(offset),.18,h+.65,fenceMetal,'tech-highway-rail',true);for(let n=0;n<10;n++){const p=ellipse(n/10*TAU,-width*.35);if(!portalGap(p.x,p.z,3.7))box(.6,h+2,.8,concrete,g,p.x,(h-2)/2,p.z);}return g;}
 return{highway,city,stats,proxy};
}
