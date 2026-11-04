import * as THREE from 'three';
import batchStatic from './batch-static.js';
import {museumFrameSlots} from '../lib/museum-layout.ts';
export default function museumExhibits({scene,kit:k,entries,layout,lowDetail=false}){const m=k.materials,frameRoot=k.group(scene),slots=museumFrameSlots(entries,layout),frames=[],clickables=[],levels=[0,1,2].map(level=>{const g=k.group(frameRoot);g.name='museum-exhibit-level-'+level;return g;});frameRoot.name='museum-three-level-interactive-exhibits';
 for(const slot of slots){const {entry,w,h}=slot,g=k.group(levels[slot.level],slot.x,slot.y,slot.z);g.rotation.y=-slot.side*Math.PI/2;g.name='museum-interactive-exhibit-frame';g.userData.section=slot.section;g.userData.level=slot.level;
  k.box(w+.24,h+.24,.18,m.frame,g);k.box(w+.06,h+.06,.13,m.paper,g,0,0,.12);for(const x of [-w/2-.08,w/2+.08])k.box(.045,h+.24,.075,m.gold,g,x,0,.22);for(const y of [-h/2-.08,h/2+.08])k.box(w+.24,.045,.075,m.gold,g,0,y,.22);
  const panel=k.mesh(new THREE.PlaneGeometry(w-.12,h-.12),new THREE.MeshBasicMaterial({color:entry?(entry.color??'#cec5b1'):'#d6ccba'}),g,0,0,.205);panel.userData.id=entry?.id??'empty:'+slot.section+':'+slots.indexOf(slot);panel.userData.section=slot.section;clickables.push(panel);
  // Short physical display hood and a warm core, instead of bright whole frames.
  k.box(.65,.12,.45,m.ivory,g,0,h/2+.28,.12);k.box(.4,.025,.16,m.warm,g,0,h/2+.21,.28);
  if(!entry){const relief=k.ring(.22,.018,m.stone,g,0,0,.22);relief.rotation.z=Math.PI/4;}
  g.updateMatrixWorld(true);const point=new THREE.Vector3(0,0,.23).applyMatrix4(g.matrixWorld),normal=new THREE.Vector3(-slot.side,0,0),preview=entry?.thumbnail||(entry?.type==='image'?entry.src:'');
  frames.push({...slot,point,normal,panel,preview,loaded:false,el:null});
  if(lowDetail)g.traverse(o=>{if(o.isMesh||o.isLine)o.renderOrder=20+o.position.z*10;});
 }
 levels.forEach(g=>batchStatic(g,{shadows:!lowDetail}));
 return{root:frameRoot,frames,clickables,levels};
}
