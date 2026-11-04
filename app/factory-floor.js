import * as THREE from 'three';
import {worldUV} from './home-materials.js';

export default function factoryFloor({parent,kit:k,front,back,lowDetail=false}){
 const m=k.materials,g=k.group(parent),width=18.5,length=front-back,center=(front+back)/2;g.name='factory-diamond-plate-floor';g.userData.pattern='alternating-raised-lozenges';g.userData.tileWorldSize=.8;
 const geometry=new THREE.BoxGeometry(width,.04,length);worldUV(geometry,.8,.8);const floor=k.mesh(geometry,m.floor,g,0,.014,center);floor.name='factory-continuous-tread-surface';floor.renderOrder=-1100;
 // The native renderer uses normal maps. SVG gets two tiny merged facets per tread.
 if(lowDetail){
  const positions=[],colors=[],rngColor=[new THREE.Color('#818b8c'),new THREE.Color('#4c565b')],spacing=.43;
  const p=(x,z,y)=>new THREE.Vector3(x,y,z);
  for(let row=0,z=back+.2;z<front-.1;row++,z+=spacing)for(let col=0,x=-width/2+.2;x<width/2-.1;col++,x+=spacing){const angle=(row+col)%2?Math.PI/4:-Math.PI/4,dx=Math.cos(angle),dz=Math.sin(angle),a=p(x-dx*.15,z-dz*.15,.036),b=p(x-dz*.037,z+dx*.037,.039),c=p(x+dx*.15,z+dz*.15,.036),d=p(x+dz*.037,z-dx*.037,.039);for(const [points,shade]of [[[a,b,c],0],[[a,c,d],1]]){const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(n.y<0)points.reverse();for(const q of points){positions.push(...q.toArray());colors.push(...rngColor[shade].toArray());}}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const material=new THREE.MeshLambertMaterial({vertexColors:true});material.name='factory-svg-raised-steel-treads';material.userData.bloom=false;const treads=k.mesh(geo,material,g);treads.name='factory-visible-raised-lozenges';treads.renderOrder=-1090;g.userData.treadCount=positions.length/18;
 }
 // Sparse welded panel joints; the relief continues at the same scale across them.
 for(let x=-6;x<=6;x+=6)k.box(.016,.014,length,m.iron,g,x,.037,center).renderOrder=-1080;
 for(let z=back+5.9;z<front;z+=6)k.box(width,.014,.016,m.iron,g,0,.037,z).renderOrder=-1080;
 return g;
}
