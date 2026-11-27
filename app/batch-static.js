import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Before merging, remember where the large structures stand (in the
// parent's local space): merged geometry loses per-building bounds, and the
// night uplights need them to light each facade.
const skipFootprint=/tree|lamp|lantern|vine|ivy|rose|briar|plant|flower|bridge|rail|flag|banner|cloud|water|terrain|shore|hedge|bench|forest|garden|mote/i;
function footprint(o,parent,inverse,list){
 for(let p=o,depth=0;p&&p!==parent&&depth<3;p=p.parent,depth++)if(skipFootprint.test(p.name))return;
 const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();if(!g.boundingBox)return;
 const box=g.boundingBox.clone().applyMatrix4(new THREE.Matrix4().copy(inverse).multiply(o.matrixWorld)),size=box.getSize(new THREE.Vector3());
 // A round or irregular part only has flat sides if it is slender (towers,
 // columns); a wide one's box faces would float in front of its curved wall.
 const flat=g.type==='BoxGeometry'||/Extrude|Shape/.test(g.type);if(!flat&&Math.min(size.x,size.z)>3.2)return;
 if(size.y>=1.2&&Math.max(size.x,size.z)>=.5&&Math.max(size.x,size.z)<=26)list.push(box);
}
export default function batchStatic(parent,{shadows=true}={}){
 parent.updateMatrixWorld(true);const groups=new Map(),inverse=new THREE.Matrix4().copy(parent.matrixWorld).invert();
 const footprints=parent.userData.footprints??=[];parent.traverse(o=>{if(o.isMesh&&o.material?.visible!==false)footprint(o,parent,inverse,footprints);});
 parent.traverse(o=>{if(!o.isMesh||!o.material.visible||o.material.transparent||o.userData.id)return;let p=o;while(p){if(p.userData.dynamic)return;if(p===parent)break;p=p.parent;}const key=o.material.uuid+':'+o.renderOrder+':'+o.castShadow+':'+o.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
 for(const objects of groups.values()){if(objects.length<4)continue;const clones=objects.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);g.applyMatrix4(new THREE.Matrix4().copy(inverse).multiply(o.matrixWorld));return g;});const merged=mergeGeometries(clones,false);clones.forEach(g=>g.dispose());if(!merged)continue;const m=new THREE.Mesh(merged,objects[0].material);m.renderOrder=objects[0].renderOrder;m.castShadow=shadows&&objects[0].castShadow;m.receiveShadow=shadows&&objects[0].receiveShadow;parent.add(m);for(const o of objects)o.removeFromParent();}
}
