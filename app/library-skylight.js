import * as THREE from 'three';
import {seeded} from './art-kit.js';
import {libraryLightingAt} from '../lib/library-lighting.ts';
import librarySky from './library-sky.js';

// An opaque diffuser closes the room. Thin glazing and leadwork sit beneath it;
// the light is an interior effect, never a hole into the scene background.
export default function librarySkylight({parent,kit:k,layout,lowDetail=false}){
 const root=k.group(parent);root.name='library-faceted-skylight';root.userData.dynamic=true;
 const owned=[],materials=[],textures=[],rng=seeded(418),front=layout.front,back=layout.back-1.6,length=front-back,a0=Math.PI*.2,a1=Math.PI*.8,across=lowDetail?16:22,along=Math.ceil(length/1.55);
 const point=(a,z,inset=0)=>[Math.cos(a)*(9.25-inset),9.9+Math.sin(a)*(5.35-inset),z];
 const quad=(out,a,b,c,d)=>out.push(...a,...b,...c,...a,...c,...d);
 function geometry(positions,colors,uv){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();owned.push(g);return g;}
 function mesh(g,m,name,order=0){const o=k.mesh(g,m,root);o.name=name;o.renderOrder=order;o.castShadow=false;o.receiveShadow=false;return o;}
 function material(m){m.userData.bloom=false;materials.push(m);return m;}
 const shell=[];for(let n=0;n<32;n++)quad(shell,point(n/32*Math.PI,front),point((n+1)/32*Math.PI,front),point((n+1)/32*Math.PI,back),point(n/32*Math.PI,back));
 mesh(geometry(shell),k.materials.cream,'library-barrel-vault',-950);
 const backing=[],panes=[],colors=[],uv=[],frame=[],leading=[];
 for(let i=0;i<across;i++)for(let j=0;j<along;j++){
  const a=a0+(a1-a0)*i/across,b=a0+(a1-a0)*(i+1)/across,z=back+length*j/along,zz=back+length*(j+1)/along;
  quad(backing,point(a,zz,.025),point(b,zz,.025),point(b,z,.025),point(a,z,.025));
  const aa=a+.003,bb=b-.003,z0=z+.027,z1=zz-.027;quad(panes,point(aa,z1,.052),point(bb,z1,.052),point(bb,z0,.052),point(aa,z0,.052));
  const shade=.74+.13*Math.sin((a+b)/2)+rng()*.055;for(let n=0;n<6;n++)colors.push(shade,shade,shade);uv.push(0,1,1,1,1,0,0,1,1,0,0,0);
  // Diamond leading repeats every pane and is one line batch, not many objects.
  const mid=(a+b)/2,zm=(z+zz)/2;for(const [p,q]of [[point(a,zm,.085),point(mid,zz,.085)],[point(mid,zz,.085),point(b,zm,.085)],[point(b,zm,.085),point(mid,z,.085)],[point(mid,z,.085),point(a,zm,.085)]])leading.push(...p,...q);
 }
 for(let i=0;i<=across;i++){const a=a0+(a1-a0)*i/across;quad(frame,point(a-.0027,front,.075),point(a+.0027,front,.075),point(a+.0027,back,.075),point(a-.0027,back,.075));}
 for(let j=0;j<=along;j++){const z=back+length*j/along;for(let i=0;i<across;i++){const a=a0+(a1-a0)*i/across,b=a0+(a1-a0)*(i+1)/across;quad(frame,point(a,z+.03,.078),point(b,z+.03,.078),point(b,z-.03,.078),point(a,z-.03,.078));}}
 const sky=librarySky({parent:root,backingGeometry:geometry(backing),front,back,a0,a1,lowDetail}),pane=material(new THREE.MeshBasicMaterial({color:'#f0dfba',vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.12,depthWrite:false}));
 const paneGeo=geometry(panes,colors,uv);mesh(paneGeo,pane,'library-cut-glass-panes',-940);
 const mullion=material((lowDetail?new THREE.MeshLambertMaterial():new THREE.MeshStandardMaterial({roughness:.55,metalness:.45})));mullion.color.set('#675d47');mullion.side=THREE.DoubleSide;const frameMesh=mesh(geometry(frame),mullion,'library-bronze-glass-grid',-925);frameMesh.castShadow=!lowDetail;
 const leadMaterial=material(new THREE.LineBasicMaterial({color:'#9e916e',transparent:true,opacity:.7})),leadGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(leading,3)),lead=new THREE.LineSegments(leadGeo,leadMaterial);owned.push(leadGeo);lead.name='library-diamond-glass-leading';lead.renderOrder=-924;root.add(lead);
 let glazing=null;
 if(!lowDetail){
  const size=128,normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/(size-1),v=y/(size-1),diamond=Math.abs(Math.abs(u-.5)+Math.abs(v-.5)-.36),etch=Math.exp(-diamond*diamond/.00012),wave=Math.sin(x*.37+y*.19)*.7;normal.set([128+wave+etch*3,128-wave-etch*2,255,255],(y*size+x)*4);const r=139+Math.round(etch*35+Math.sin(x*.09)*3);rough.set([r,r,r,255],(y*size+x)*4);}
  const texture=data=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.needsUpdate=true;t.minFilter=t.magFilter=THREE.LinearFilter;textures.push(t);return t;};
  glazing=material(new THREE.MeshPhysicalMaterial({color:'#ebecdf',transparent:true,opacity:.13,depthWrite:false,roughness:.31,metalness:.02,clearcoat:.55,transmission:0,normalMap:texture(normal),roughnessMap:texture(rough),normalScale:new THREE.Vector2(.11,.11),side:THREE.DoubleSide}));
  const polished=paneGeo.clone();polished.setAttribute('position',paneGeo.attributes.position.clone());const pos=polished.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)-.012);owned.push(polished);mesh(polished,glazing,'library-etched-glass-surface',-935);
 }
 const shaft=material(new THREE.MeshBasicMaterial({color:'#ffe2aa',side:THREE.DoubleSide,transparent:true,opacity:.028,depthWrite:false})),pool=material(new THREE.MeshBasicMaterial({color:'#ffe2aa',transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide}));
 if(!lowDetail){
  const data=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const alpha=Math.pow(Math.sin(x/63*Math.PI),2)*Math.pow(Math.sin(y/63*Math.PI),.7);data.set([255,255,255,Math.round(alpha*255)],(y*64+x)*4);}const soft=new THREE.DataTexture(data,64,64,THREE.RGBAFormat);soft.needsUpdate=true;soft.magFilter=soft.minFilter=THREE.LinearFilter;textures.push(soft);shaft.map=pool.map=soft;
 }
 const beamPositions=[],beamUV=[],poolPositions=[],poolUV=[];
 for(let n=0;n<Math.min(3,layout.rows);n++){const z=2-n*7;
  if(!lowDetail){quad(beamPositions,[-2,14.4,z-1],[1.2,14.4,z-1],[4,.13,z+4],[-.2,.13,z+4]);beamUV.push(0,1,1,1,1,0,0,1,1,0,0,0);}
  quad(poolPositions,[-1.3,.086,z+3.7],[2.3,.086,z+3.7],[2.3,.086,z+.3],[-1.3,.086,z+.3]);poolUV.push(0,0,1,0,1,1,0,0,1,1,0,1);
 }
 if(beamPositions.length)mesh(geometry(beamPositions,null,beamUV),shaft,'library-soft-skylight-shafts',2);
 mesh(geometry(poolPositions,null,poolUV),pool,'library-soft-window-light-on-floor',-1030);
 root.userData.paneCount=across*along;root.userData.glassTextureSize=lowDetail?0:128;
 let current=null;
 function setLighting(state){if(current===state.mode)return false;current=state.mode;root.userData.lightMode=state.mode;sky.setMode(state.mode);pane.color.set(state.glazing);pane.opacity=state.mode==='day'?.12:.065;shaft.color.set(state.light);shaft.opacity=state.shaftOpacity;pool.color.set(state.light);pool.opacity=lowDetail?state.poolOpacity*.42:state.poolOpacity;if(glazing){glazing.color.set(state.glazing);glazing.opacity=state.mode==='day'?.13:.08;}return true;}
 setLighting(libraryLightingAt());
 return{root,setLighting,update:sky.update,dispose(){sky.dispose();owned.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
