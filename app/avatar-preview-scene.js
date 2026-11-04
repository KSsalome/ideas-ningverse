import * as THREE from 'three';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import makeAvatar,{disposeAvatar,animateWearables} from './avatar-model.js';
export default function createAvatarPreview(container,avatar,cosmetics){
 const scene=new THREE.Scene();let renderer,svg=false;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}catch{svg=true;renderer=new SVGRenderer();renderer.setQuality('high');renderer.setClearColor('#efebe5',0);}
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.setAttribute('aria-label','目前穿戴的立體角色，可拖曳旋轉');renderer.domElement.setAttribute('role','img');container.appendChild(renderer.domElement);
 scene.add(new THREE.AmbientLight('#ffffff',svg?.9:1.5));const light=new THREE.DirectionalLight('#fff5e5',svg?1:2.5);light.position.set(3,5,7);scene.add(light);
 const camera=new THREE.OrthographicCamera(-1.55,1.55,2.35,-.75,.1,50);camera.position.set(2.7,2.2,6);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.5;controls.maxPolarAngle=2;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let model=makeAvatar(avatar,cosmetics,svg),stopped=false,visible=true,raf=0,last=0;scene.add(model);
 function draw(){if(stopped||document.hidden||!visible)return;animateWearables(model,performance.now(),{reducedMotion:motion.matches||svg});renderer.render(scene,camera);}
 function animate(now){raf=0;if(stopped||document.hidden||!visible||motion.matches||svg||!model.userData.floatingCard)return;if(now-last>=1000/24){draw();last=now;}raf=requestAnimationFrame(animate);}
 function schedule(){if(!raf&&!stopped&&!document.hidden&&visible&&!motion.matches&&!svg&&model.userData.floatingCard)raf=requestAnimationFrame(animate);}
 function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{draw();schedule();}}
 function resize(){const w=container.clientWidth,h=container.clientHeight||260;if(w<1||h<1)return;const a=w/h;camera.left=-1.55*a;camera.right=1.55*a;camera.top=1.55;camera.bottom=-1.55;camera.updateProjectionMatrix();renderer.setSize(w,h);controls.update();draw();}
 const observer=new ResizeObserver(resize);observer.observe(container);const visibilityObserver=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){draw();schedule();}else{cancelAnimationFrame(raf);raf=0;}});visibilityObserver?.observe(container);
 const phaseTimer=setInterval(()=>{if(!document.hidden&&visible&&animateWearables(model,performance.now(),{reducedMotion:true}))draw();},30000);
 controls.addEventListener('change',draw);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',visibility);resize();schedule();
 return{update(data,look){scene.remove(model);disposeAvatar(model);model=makeAvatar(data,look,svg);scene.add(model);draw();schedule();},dispose(){stopped=true;cancelAnimationFrame(raf);clearInterval(phaseTimer);observer.disconnect();visibilityObserver?.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',visibility);controls.removeEventListener('change',draw);controls.dispose();disposeAvatar(model);renderer.dispose?.();renderer.domElement.remove();}};
}
