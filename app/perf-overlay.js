// Hidden performance panel: open the site with ?perf to show it.
// Reports what the phone actually does, so tuning is based on real numbers.
export default function perfOverlay({renderer,budget,container}){
 if(typeof location==='undefined'||!new URLSearchParams(location.search).has('perf'))return{tick(){},dispose(){}};
 const el=document.createElement('pre');
 el.style.cssText='position:fixed;left:8px;top:64px;z-index:9999;margin:0;padding:8px 10px;font:11px/1.45 ui-monospace,Menlo,monospace;color:#f4ecd8;background:rgba(10,14,30,.78);border:1px solid rgba(214,180,106,.5);border-radius:8px;pointer-events:none;white-space:pre';
 document.body.appendChild(el);
 // Count every pass of a frame (shadow, bloom, main), not just the last one.
 if(renderer.info)renderer.info.autoReset=false;
 let calls=0,tris=0,peakCalls=0;
 let last=0,windowStart=0,frames=0,worst=0,long=0;const gaps=[];
 return{
  tick(now){
   const info=renderer.info?.render;if(info?.calls){calls=info.calls;tris=info.triangles;if(calls>peakCalls)peakCalls=calls;renderer.info.reset();}
   if(last){const gap=now-last;if(gap>worst)worst=gap;if(gap>50)long++;gaps.push(gap);}
   last=now;frames++;
   if(!windowStart)windowStart=now;
   if(now-windowStart<1000)return;
   const seconds=(now-windowStart)/1000,st=budget.stats();
   gaps.sort((a,b)=>a-b);const p95=gaps.length?gaps[Math.floor(gaps.length*.95)]:0;
   el.textContent=[
    `FPS      ${(frames/seconds).toFixed(0)} / 目標 ${Math.round(st.currentFps??st.targetFps??0)}`,
    `最慢一幀 ${worst.toFixed(0)} ms`,
    `95% 幀   ${p95.toFixed(0)} ms`,
    `卡頓次數 ${long}（>50ms）`,
    `繪製次數 ${calls}（最高 ${peakCalls}）`,
    `三角面   ${Math.round(tris/1000)}k`,
    `解析度   ${st.pixelRatio?.toFixed?.(2)} × ${container.clientWidth}×${container.clientHeight}`,
    `待機     ${st.idle?'是':'否'}　陰影 ${st.staticShadows?'靜態快取':st.shadowHz+'Hz'}`,
   ].join('\n');
   windowStart=now;frames=0;worst=0;long=0;peakCalls=0;gaps.length=0;
  },
  dispose(){el.remove();if(renderer.info)renderer.info.autoReset=true;},
 };
}
