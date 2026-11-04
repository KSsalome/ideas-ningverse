// Shared, modeled architectural relief. Recesses use dark backing and projecting
// stonework so detail remains readable even without screen-space effects.
export default function architectureDetail(k){
 const {lowDetail,theme,mat,group,box,cyl,line,ball,ring,windowArch,ivory,stone,gold,navy,wood}=k;
 const joint=mat('#746d67'),reveal=mat('#454c58'),ashlar=mat(theme.stone),pale=mat('#d1c2a9');
 function rectangularWindow(parent,x,y,z,w,h){
  const g=group(parent,x,y,z);g.name='inset-window-bay';
  box(w+.16,h+.12,.08,reveal,g,0,h/2,0);
  box(w-.1,h-.12,.035,mat('#41586a','glass',lowDetail?{}:{emissive:'#88a5bc',emissiveIntensity:.035}),g,0,h/2,.05);
  for(const s of [-1,1]){box(.1,h+.22,.22,stone,g,s*(w/2+.04),h/2,.08);box(w+.32,.12,.3,ivory,g,0,s<0?-.08:h+.06,.08);}
  for(const x of [-w/6,w/6])box(.035,h,.09,gold,g,x,h/2,.105);
  box(w,.045,.09,stone,g,0,h*.5,.105);box(w+.45,.13,.44,stone,g,0,-.18,.1);return g;
 }
 function facade(parent,w,h,{windows=false,industrial=false,back=false}={}){
  const g=group(parent);g.name='coursed-stone-facade';
  const spacing=lowDetail?1.15:.72;
  for(let y=.65;y<h-.3;y+=spacing){
   box(w-.12,.018,.023,joint,g,0,y,.013);
   if(!lowDetail)for(let x=-w/2+.7+((Math.round(y/spacing)%2)*.6);x<w/2-.3;x+=1.5)box(.016,spacing-.03,.022,joint,g,x,y-spacing/2,.014);
  }
  for(const s of [-1,1]){
   box(.28,h-.32,.24,stone,g,s*(w/2-.17),h/2,.04);
   for(let y=.35,n=0;y<h-.3;y+=spacing,n++)box(n%2?.43:.58,spacing-.06,.2,n%3===0?pale:ivory,g,s*(w/2-.2),y,.1);
   box(.62,.24,.46,stone,g,s*(w/2-.2),.18,.08);
   box(.54,.18,.36,ivory,g,s*(w/2-.2),h-.2,.06);
  }
  if(windows){const count=Math.max(1,Math.floor((w-.9)/2.4));for(let n=0;n<count;n++){const x=(n-(count-1)/2)*(w-.9)/count,ww=Math.min(1.25,(w-.9)/count*.65),hh=Math.min(3.1,h*.48),yy=Math.max(.8,h*.22);if(industrial)rectangularWindow(g,x,yy,.04,ww,hh);else windowArch(g,x,yy,.035,ww,hh,{ornate:!lowDetail});}}
  if(back&&!windows&&w>4){box(w*.55,h*.4,.04,ashlar,g,0,h*.5,.035);}
  return g;
 }
 function shell(parent,{w,h,d,y=0,z=0,industrial=false,windows=true}={}){
  const g=group(parent,0,y,z);g.name='architectural-shell-detail';
  for(const [yy,ww,dd,hh,m]of [[.12,w+.7,d+.7,.24,stone],[.35,w+.38,d+.38,.13,ivory],[h-.27,w+.13,d+.13,.1,reveal],[h-.12,w+.35,d+.35,.18,stone],[h+.05,w+.6,d+.6,.16,ivory],[h+.18,w+.32,d+.32,.08,gold]])box(ww,hh,dd,m,g,0,yy,0);
  for(const [zz,angle]of [[d/2,0],[-d/2,Math.PI]]){const face=group(g,0,0,zz+.015*Math.cos(angle));face.rotation.y=angle;facade(face,w,h,{windows:windows&&angle!==0,industrial,back:angle!==0});}
  for(const s of [-1,1]){const face=group(g,s*(w/2+.015),0,0);face.rotation.y=s*Math.PI/2;facade(face,d,h,{windows,industrial});}
  return g;
 }
 function roof(parent,w,h,d){
  const g=group(parent);g.name='slate-roof-courses';const slate=mat('#485363'),shade=mat('#29384c');
  // Raised transverse slate courses on both slopes; alternating longitudinal seams.
  const courses=lowDetail?3:Math.max(4,Math.ceil(h/.5));
  for(let n=1;n<courses;n++){const t=n/courses,x=w/2*(1-t),yy=h*t+.025;for(const s of [-1,1])box(.045,.055,d+.05,n%3===0?slate:shade,g,s*x,yy,0);}
  for(const s of [-1,1])for(let n=0;n<(lowDetail?3:7);n++){const zz=-d/2+n*d/(lowDetail?2:6);line([[s*w/2,.025,zz],[0,h+.035,zz]],n%3===0?gold:slate,g,.024);}
  const ridge=cyl(.085,.085,d+.18,gold,g,0,h+.08,0,8);ridge.rotation.x=Math.PI/2;
  for(const zz of [-d/2,d/2]){ball(.13,gold,g,0,h+.08,zz);line([[-w/2-.1,-.04,zz],[0,h+.08,zz],[w/2+.1,-.04,zz]],stone,g,.075);}
  return g;
 }
 function drum(parent,r,h){
  const g=group(parent);g.name='tower-stone-courses';
  for(const [y,rad,hh,m]of [[.14,r*1.24,.24,stone],[.34,r*1.16,.12,ivory],[h*.95,r*1.15,.16,stone],[h,r*1.24,.16,ivory]])cyl(rad,rad,hh,m,g,0,y,0,lowDetail?8:16);
  for(let y=.8;y<h-.25;y+=lowDetail?1.5:.85){const band=ring(r*1.035,.013,joint,g,0,y,0);band.rotation.x=Math.PI/2;}
  if(!lowDetail)for(let n=0;n<6;n++){const a=n/6*Math.PI*2;if(Math.cos(a)>.8)continue;cyl(.045,.055,h*.82,pale,g,Math.sin(a)*r*1.04,h*.46,Math.cos(a)*r*1.04,5);}
  return g;
 }
 function column(parent,x,z,height=8.2){
  const g=group(parent,x,0,z);g.name='fluted-column-detail';
  for(const [y,r,hh,m]of [[.1,.7,.15,stone],[.4,.5,.12,ivory],[.58,.46,.08,gold],[height-.24,.5,.16,stone],[height,.64,.22,ivory],[height+.18,.7,.12,stone]])cyl(r,r,hh,m,g,0,y,0,12);
  if(!lowDetail)for(let n=0;n<8;n++){const a=n/8*Math.PI*2;cyl(.035,.035,height-.95,stone,g,Math.sin(a)*.35,height/2+.15,Math.cos(a)*.35,5);}
  return g;
 }
 function panel(parent,w=2.2,h=1.1){
  const g=group(parent);g.name='recessed-wall-panel';box(w,h,.025,reveal,g,0,h/2,0);box(w-.16,h-.16,.035,stone,g,0,h/2,.018);
  for(const x of [-w/2,w/2])box(.075,h+.07,.12,ivory,g,x,h/2,.055);
  for(const y of [0,h])box(w+.075,.075,.12,ivory,g,0,y,.055);return g;
 }
 return{shell,roof,drum,column,panel,rectangularWindow};
}
