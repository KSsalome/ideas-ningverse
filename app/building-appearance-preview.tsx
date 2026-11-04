import type {Project} from '@/lib/shared';
import MineAppearancePreview from './mine-appearance-preview';
import LibraryAppearancePreview from './library-appearance-preview';
import FactoryAppearancePreview from './factory-appearance-preview';
import MuseumAppearancePreview from './museum-appearance-preview';
import {appearanceName,constructionFraction,technologyProfiles,techLightColors,technologyPalette,technologyWindowGrid,type TechProfile} from '@/lib/building-appearance';
function Crown({profile:p,width:w,left,top}:{profile:TechProfile;width:number;left:number;top:number}){
 const c=p.crown,y=top-12;
 if(c==='clock')return <g><rect x="78" y={y-8} width="24" height="22" fill="#192531"/><circle cx="90" cy={y+3} r="9" fill="#101922" stroke="#ffda95"/><path d={`M90 ${y-3}v6l5 2`} fill="none" stroke="#ffda95"/></g>;
 if(c==='dome')return <path d={`M${90-w*.3} ${top}a${w*.3} ${w*.3} 0 0 1 ${w*.6} 0`} fill="#6386ac" stroke="#d4baff" opacity=".7"/>;
 if(c==='reactor')return <g>{[-1,1].map(s=><g key={s}><rect x={90+s*11-5} y={y-6} width="10" height="19" rx="4" fill="#263745" stroke="#8cabc4"/>{[0,6,12].map(yy=><path key={yy} d={`M${90+s*11-5} ${y+yy}h10`} stroke="#d4baff"/>)}</g>)}</g>;
 if(c==='terraces')return <g>{[0,1,2].map(n=><rect key={n} x={left+w*(.1+n*.14)} y={top-n*6-6} width={w*(.8-n*.22)} height="6" fill="#1a2936" stroke="#56738b"/>)}</g>;
 if(c==='canopy')return <path d={`M${left-4} ${top-4}h${w+8}v-5h-${w+8}z`} fill="#334553" stroke="#ffda95"/>;
 if(c==='archive'||c==='stacks')return <g>{Array.from({length:c==='stacks'?5:3},(_,n)=><rect key={n} x={left+6+n*(w-12)/(c==='stacks'?5:3)} y={y-n*2} width="3" height={15+n*2} fill="#72899e"/>)}</g>;
 if(c==='arcade')return <g><path d={`M${left+2} ${top+15}v-30M${left+w-2} ${top+15}v-30`} stroke="#a9dfff" strokeWidth="4"/><path d={`M77 ${y+6}l5-7h16l5 7-5 5-5-3h-6l-5 3z`} stroke="#d4baff" fill="#192636"/></g>;
 if(c==='cards')return <g>{[-1,1].map(s=><rect key={s} x={90+s*7-6} y={y-5} width="12" height="21" transform={`rotate(${s*10} ${90+s*7} ${y+6})`} fill="#15212d" stroke="#d4baff"/>)}</g>;
 if(c==='message'||c==='media')return <g><rect x={left} y={y-4} width={w} height="17" fill="#172938" stroke="#a9dfff"/><path d={`M${left+5} ${y+2}h${w-10}m-${w-10} 5h${w*.7}`} stroke="#d4baff"/></g>;
 if(c==='plant'||c==='workshop')return <g>{[-1,0,1].map(s=><g key={s}><rect x={90+s*13-5} y={y+3} width="10" height="10" fill="#334553"/><path d={`M${90+s*13} ${y+4}v-14`} stroke="#8299ab" strokeWidth="3"/></g>)}</g>;
 if(c==='studio'||c==='glass')return <rect x={left+w*.2} y={y} width={w*.6} height="13" fill={c==='glass'?'#34546b':'#1d2b39'} stroke="#a9dfff"/>;
 return <g><rect x={left+w*.2} y={y} width={w*.6} height="12" fill="#1d2834" stroke="#4c6579"/><path d={`M90 ${y}v-19`} stroke="#8098ad"/>{c==='signal'?<circle cx="90" cy={y-13} r="7" stroke="#a9dfff" fill="none"/>:<circle cx="90" cy={y-20} r="2" fill="#ff6b79"/>}</g>;
}
export default function BuildingAppearancePreview({project,compact=false}:{project:Project;compact?:boolean}){
 if(project.islandId==='art'&&project.specialType==='gallery')return <MuseumAppearancePreview project={project} compact={compact}/>;
 if(project.islandId==='information'&&project.specialType==='factory')return <FactoryAppearancePreview project={project} compact={compact}/>;
 if(project.islandId==='library')return <LibraryAppearancePreview project={project} compact={compact}/>;
 if(project.islandId==='mine')return <MineAppearancePreview project={project} compact={compact}/>;
 if(project.islandId!=='technology')return null;
 const p=technologyProfiles[project.shape],fraction=constructionFraction(project),height=Math.max(10,p.height/19*105*fraction),width=Math.min(84,p.width*16),left=90-width/2,top=142-height,{rows,columns}=technologyWindowGrid(p,p.width,p.height*fraction);
 return <figure className={'tech-appearance-preview '+(compact?'compact':'')} aria-label={appearanceName(project)+'外觀預覽'}><svg viewBox="0 0 180 170" role="img" aria-label={appearanceName(project)}><ellipse cx="90" cy="150" rx="67" ry="10" fill="#8fb6d1" opacity=".08"/><path d="M13 153H167" stroke="#394c60"/><rect x={left-4} y="142" width={width+8} height="5" fill="#354351"/><rect x={left} y={top} width={width} height={height} fill={technologyPalette.body} stroke="#2d3a47" strokeWidth="1.5"/>{project.status!=='foundation'&&Array.from({length:rows},(_,row)=>Array.from({length:columns},(_,col)=><rect key={row+'-'+col} x={left+5+col*(width-6)/columns} y={top+5+row*(height-6)/rows} width={Math.max(1,(width-12)/columns-1)} height={Math.max(1,(height-8)/rows-1.5)} fill={techLightColors[(row*3+col)%((row+col)%11===0?4:3)]} opacity={(row+col)%3===0?.08:.92}/>))}<path d={`M${left+width-3} ${top+4}V140`} stroke={project.color} strokeWidth="2"/>{project.status==='complete'||project.status==='unconfigured'?<Crown profile={p} width={width} left={left} top={top}/>:null}{project.status==='building'&&<g stroke="#ddbc70" fill="none"><path d={`M${left-5} 145V${top-22}H${left+width+7}M${left+width+2} ${top-22}v13`}/></g>}<rect x={left-5} y={top+height*.36} width="14" height={Math.min(35,height*.45)} rx="1" fill="#13202d" stroke={project.color}/><path d={`M${left-1} ${top+height*.4}v${Math.min(27,height*.3)}`} stroke={project.color}/><text x="90" y="164" fill="#8dabc5" fontSize="7" textAnchor="middle" letterSpacing="2">{p.sign}</text></svg>{!compact&&<figcaption><strong>{appearanceName(project)}</strong><span>深黑樓體・細窗格燈光・霓虹招牌</span></figcaption>}</figure>;
}
