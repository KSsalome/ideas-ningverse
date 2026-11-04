import * as THREE from 'three';

// Solid, padded room limits are independent of OrbitControls' orbit radius.
// Keep the near plane inside too, including wide desktop and portrait views.
export default function interiorCamera({camera,controls,bounds,colliders=[],focusHeight=2.6}){
 controls.enablePan=false;controls.minDistance=.85;controls.maxDistance=7;
 controls.minPolarAngle=Math.PI*.29;controls.maxPolarAngle=Math.PI*.63;
 const ray=new THREE.Ray(),direction=new THREE.Vector3(),hit=new THREE.Vector3(),min=new THREE.Vector3(),max=new THREE.Vector3(),offset=new THREE.Vector3(),targetMin=new THREE.Vector3(),targetMax=new THREE.Vector3();
 const obstacles=colliders.map(b=>new THREE.Box3(new THREE.Vector3(...b.min),new THREE.Vector3(...b.max)).expandByScalar(.35));
 function constrain(floorY=0){
  const nearPadding=Math.max(.28,camera.near*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.hypot(1,camera.aspect)+.1);
  min.set(bounds.minX+nearPadding,floorY+.65,bounds.minZ+nearPadding);
  max.set(bounds.maxX-nearPadding,Math.min(bounds.ceiling-nearPadding,floorY+4.7),bounds.maxZ-nearPadding);
  targetMin.set(min.x+.45,min.y+.25,min.z+.45);targetMax.set(max.x-.45,max.y-.25,max.z-.45);controls.target.clamp(targetMin,targetMax);offset.copy(camera.position).sub(controls.target);
  if(offset.lengthSq()<.01)offset.set(0,.65,1);
  let t=Math.min(1,controls.maxDistance/offset.length());
  for(const axis of ['x','y','z'])if(Math.abs(offset[axis])>1e-7)t=Math.min(t,((offset[axis]>0?max[axis]:min[axis])-controls.target[axis])/offset[axis]);
  camera.position.copy(controls.target).addScaledVector(offset,Math.max(0,t));
  direction.copy(camera.position).sub(controls.target);let distance=direction.length();
  if(distance>.001){ray.set(controls.target,direction.divideScalar(distance));for(const box of obstacles){if(box.containsPoint(controls.target))continue;if(ray.intersectBox(box,hit)){const d=hit.distanceTo(controls.target);if(d<distance)distance=Math.max(.01,d-.04);}}camera.position.copy(controls.target).addScaledVector(direction,distance);}
  camera.lookAt(controls.target);camera.updateMatrixWorld();
 }
 function reset(player={x:0,y:0,z:8}){const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.target.set(player.x,player.y+focusHeight,player.z-1);camera.position.set(player.x+1.3,player.y+3.35,player.z+2.5);controls.update();controls.enableDamping=damping;constrain(player.y);}
 return{constrain,reset};
}
