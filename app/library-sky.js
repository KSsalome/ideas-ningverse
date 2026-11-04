import * as THREE from 'three';
import {seeded} from './art-kit.js';

// Sky artwork follows the curved roof surface, behind the glass. The opaque
// background remains part of the sealed room; no exterior geometry is exposed.
export default function librarySky({parent,backingGeometry,front,back,a0,a1,lowDetail=false}){
 const root=new THREE.Group();root.name='library-roof-sky';parent.add(root);
 const day=new THREE.Group(),night=new THREE.Group();day.name='library-day-sky';night.name='library-night-sky';root.add(day,night);
 const rng=seeded(1824),length=front-back,owned=[],materials=[],clouds=[],starSpecs=[],clamp=v=>Math.max(0,Math.min(1,v)),TAU=Math.PI*2;
 const palettes={day:[new THREE.Color('#b6daee'),new THREE.Color('#4c9edc')],night:[new THREE.Color('#283c66'),new THREE.Color('#10162f')]};
 function mat(color,extra={}){const m=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,...extra});m.userData.bloom=false;materials.push(m);return m;}
 function geo(positions,colors){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();owned.push(g);return g;}
 function mesh(geometry,material,parent,name,order=-943){const m=new THREE.Mesh(geometry,material);m.name=name;m.renderOrder=order;m.castShadow=false;m.receiveShadow=false;parent.add(m);return m;}
 function surface(u,v,inset,out,offset){const a=a0+clamp(u)*(a1-a0);out[offset]=Math.cos(a)*(9.25-inset);out[offset+1]=9.9+Math.sin(a)*(5.35-inset);out[offset+2]=back+clamp(v)*length;}
 function positions(offsets,u,v,inset,out){for(let i=0;i<offsets.length;i+=2)surface(u+offsets[i],v+offsets[i+1],inset,out,i/2*3);}
 function disc(radiusU,radiusV,cx=0,cy=0,segments=lowDetail?20:32){const out=[];for(let n=0;n<segments;n++){const a=n/segments*TAU,b=(n+1)/segments*TAU;out.push(cx,cy,cx+Math.cos(a)*radiusU,cy+Math.sin(a)*radiusV,cx+Math.cos(b)*radiusU,cy+Math.sin(b)*radiusV);}return out;}
 function patch(offsets,u,v,inset){const out=new Float32Array(offsets.length/2*3);positions(offsets,u,v,inset,out);return geo(out);}
 const skyMaterial=mat('#ffffff',{vertexColors:true}),sky=mesh(backingGeometry,skyMaterial,root,'library-opaque-skylight-diffuser',-945),skyColors=new Float32Array(backingGeometry.attributes.position.count*3);backingGeometry.setAttribute('color',new THREE.BufferAttribute(skyColors,3));
 const cloudCount=lowDetail?4:6;
 for(let n=0;n<cloudCount;n++){
  const offsets=[],width=.07+rng()*.035,height=(.65+rng()*.6)/length;
  for(const [u,v,r]of [[-.55,-.04,.78],[0,.25,1],[.57,0,.73],[.02,-.3,.78]])offsets.push(...disc(width*r,height*r,u*width,v*height,lowDetail?10:14));
  const g=geo(new Float32Array(offsets.length/2*3)),m=mat('#f9fcff',{transparent:true,opacity:.9,depthWrite:false}),o=mesh(g,m,day,'library-drifting-cloud-'+n);o.frustumCulled=false;g.attributes.position.setUsage(THREE.DynamicDrawUsage);
  clouds.push({object:o,offsets,base:(.4+n*.24)%1.5,v:.17+n/cloudCount*.7,speed:.7+rng()*.55});
 }
 const starPositions=[],starColors=[],starCount=lowDetail?32:64;
 for(let n=0;n<starCount;n++){
  const u=.035+rng()*.93,v=.04+rng()*.92,r=.055+rng()*.085,offsets=[];
  for(let j=0;j<8;j++){const a=j/8*TAU,b=(j+1)/8*TAU,ra=j%2?r*.3:r,rb=(j+1)%2?r*.3:r;offsets.push(0,0,Math.cos(a)*ra/15.5,Math.sin(a)*ra/length,Math.cos(b)*rb/15.5,Math.sin(b)*rb/length);}
  const p=new Float32Array(offsets.length/2*3);positions(offsets,u,v,.037,p);starPositions.push(...p);const tint=new THREE.Color(n%4?'#f6f0d9':'#bed9ff'),start=starColors.length;for(let i=0;i<p.length/3;i++)starColors.push(tint.r*.8,tint.g*.8,tint.b*.8);starSpecs.push({start,count:p.length/3,color:tint,phase:rng()*TAU,speed:.0007+rng()*.0007});
 }
 const stars=mesh(geo(starPositions,starColors),mat('#ffffff',{vertexColors:true,depthWrite:false}),night,'library-twinkling-stars');stars.geometry.attributes.color.setUsage(THREE.DynamicDrawUsage);
 const moonU=.84,moonV=.22,moonRadius=.88,moonPatches=[];
 function moonPatch(offsets,inset,material,name,order=-943){const o=mesh(patch(offsets,moonU,moonV,inset),material,night,name,order);o.frustumCulled=false;o.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);moonPatches.push({object:o,offsets,inset});return o;}
 for(let n=0;n<4;n++){const radius=moonRadius*(2.25-n*.31);moonPatch(disc(radius/15.5,radius/length),.031+n*.001,mat('#b6d1ef',{transparent:true,opacity:.03+n*.015,depthWrite:false}),'library-moon-halo-'+n,-944+n*.01);}
 moonPatch(disc(moonRadius/15.5,moonRadius/length,0,0,lowDetail?28:40),.04,mat('#f8efd7'),'library-glowing-moon');
 const craters=[];for(const [x,y,r]of [[-.28,.2,.14],[.23,-.26,.2],[.32,.3,.09],[-.1,-.38,.07]])craters.push(...disc(r/15.5,r/length,x/15.5,y/length,12));moonPatch(craters,.045,mat('#cbd0d2',{transparent:true,opacity:.55,depthWrite:false}),'library-moon-craters',-942);
 let mode=null,lastUpdate=-Infinity,lastCamera='';
 const right=new THREE.Vector3(),up=new THREE.Vector3(),center=new THREE.Vector3(),centerArray=new Float32Array(3),tangent=new THREE.Vector3(),forward=new THREE.Vector3(),view=new THREE.Vector3();
 // Invert the local view projection on the curved roof. This keeps the moon
 // circular from either floor while every vertex still lies behind the glass.
 function projectMoon(camera){const signature=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.aspect,camera.fov].join(',');if(signature===lastCamera)return;lastCamera=signature;camera.updateMatrixWorld();right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);const a=a0+moonU*(a1-a0);tangent.set(-Math.sin(a)*9.21*(a1-a0),Math.cos(a)*5.31*(a1-a0),0);surface(moonU,moonV,.04,centerArray,0);center.fromArray(centerArray);forward.setFromMatrixColumn(camera.matrixWorld,2).negate();view.copy(center).sub(camera.position);const depth=view.dot(forward);if(depth<=.1)return;const sx=view.dot(right)/depth,sy=view.dot(up)/depth,aa=right.dot(tangent)-sx*forward.dot(tangent),bb=(right.z-sx*forward.z)*length,cc=up.dot(tangent)-sy*forward.dot(tangent),dd=(up.z-sy*forward.z)*length,det=aa*dd-bb*cc;if(Math.abs(det)<.01)return;const scale=Math.max(.3,Math.min(1.8,camera.position.distanceTo(center)/26));
  for(const p of moonPatches){const pos=p.object.geometry.attributes.position;for(let n=0;n<p.offsets.length;n+=2){const x=p.offsets[n]*15.5*scale,y=p.offsets[n+1]*length*scale,du=THREE.MathUtils.clamp((dd*x-bb*y)/det,-.28,.28),dv=THREE.MathUtils.clamp((-cc*x+aa*y)/det,-.28,.28);surface(moonU+du,moonV+dv,p.inset,pos.array,n/2*3);}pos.needsUpdate=true;}
 }
 function setMode(value){if(value===mode)return;mode=value;lastCamera='';root.userData.skyMode=value;day.visible=value==='day';night.visible=value==='night';const [edge,zenith]=palettes[value],pos=backingGeometry.attributes.position,tint=new THREE.Color();for(let n=0;n<pos.count;n++){const top=clamp((pos.getY(n)-13.0)/2.22);tint.copy(edge).lerp(zenith,top);skyColors.set([tint.r,tint.g,tint.b],n*3);}backingGeometry.attributes.color.needsUpdate=true;lastUpdate=-Infinity;}
 function update(now,reduced=false,camera){if(mode==='night'&&camera)projectMoon(camera);if(reduced||now-lastUpdate<(lowDetail?220:70))return;lastUpdate=now;
  if(mode==='day')for(const c of clouds){const u=((c.base+now*.000004*c.speed)%1.5)-.25,fade=THREE.MathUtils.smoothstep(u,-.1,.1)*(1-THREE.MathUtils.smoothstep(u,.9,1.1));positions(c.offsets,u,c.v,.034,c.object.geometry.attributes.position.array);c.object.geometry.attributes.position.needsUpdate=true;c.object.material.opacity=.9*fade;c.object.visible=fade>.005;}
  else{const colors=stars.geometry.attributes.color.array;for(const s of starSpecs){const light=.58+.42*(.5+.5*Math.sin(now*s.speed+s.phase));for(let n=0;n<s.count;n++){const i=s.start+n*3;colors[i]=s.color.r*light;colors[i+1]=s.color.g*light;colors[i+2]=s.color.b*light;}}stars.geometry.attributes.color.needsUpdate=true;}
 }
 // A static starting sky is also available when reduced motion is requested.
 setMode('day');update(0);setMode('night');update(0);root.userData.cloudCount=cloudCount;root.userData.starCount=starCount;
 return{root,setMode,update,dispose(){owned.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
