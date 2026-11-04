'use client';
import {useEffect,useRef,useState} from 'react';
import type {Avatar} from '@/lib/shared';
import type {Cosmetics} from '@/lib/collectibles';
export default function AvatarPreview({avatar,cosmetics}:{avatar:Avatar;cosmetics:Cosmetics}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<any>(null),latest=useRef({avatar,cosmetics}),[failed,setFailed]=useState(false);latest.current={avatar,cosmetics};
 useEffect(()=>{let cancelled=false,instance:any;import('./avatar-preview-scene.js').then(({default:create})=>{if(cancelled||!host.current)return;instance=create(host.current,latest.current.avatar,latest.current.cosmetics);scene.current=instance;}).catch(()=>setFailed(true));return()=>{cancelled=true;instance?.dispose();};},[]);
 useEffect(()=>{scene.current?.update(avatar,cosmetics);},[JSON.stringify(avatar),JSON.stringify(cosmetics)]);
 return <div className="wearing-preview" ref={host} aria-label="角色穿戴預覽">{failed&&<span>預覽暫時無法顯示，配戴紀錄仍會保存。</span>}</div>;
}
