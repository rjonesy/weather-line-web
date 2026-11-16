'use client';

import {useEffect,useRef} from 'react';

/** Restore once, allowing late chart/monthly content to grow for up to five seconds. */
export function useRestoredScroll(target:number|undefined,ready:boolean):void{
 const done=useRef(false);
 useEffect(()=>{
  if(done.current||target===undefined||!Number.isFinite(target)||typeof window==='undefined')return;
  const top=Math.max(0,target);
  let stopped=false,frame=0,timer:number|undefined,observer:ResizeObserver|undefined;
  const inputs=['pointerdown','touchstart','wheel','keydown'] as const;
  function stop(complete=true){
   if(stopped)return;
   stopped=true;
   if(complete)done.current=true;
   cancelAnimationFrame(frame);
   if(timer!==undefined)window.clearTimeout(timer);
   observer?.disconnect();
   for(const event of inputs)window.removeEventListener(event,cancel,true);
   window.removeEventListener('pagehide',cancel);
   document.removeEventListener('visibilitychange',visibility);
  }
  function cancel(){stop();}
  function visibility(){if(document.visibilityState==='hidden')stop();}
  function restore(){
   frame=0;
   if(stopped)return;
   if(document.visibilityState==='hidden'){stop();return;}
   window.scrollTo({top,behavior:'instant'});
   // A clamped position is provisional: more content may still arrive.
   if(Math.abs(window.scrollY-top)<=1){stop();return;}
   if(!observer)frame=requestAnimationFrame(restore);
  }
  function schedule(){if(!stopped&&!frame)frame=requestAnimationFrame(restore);}
  for(const event of inputs)window.addEventListener(event,cancel,{capture:true,passive:true});
  window.addEventListener('pagehide',cancel);
  document.addEventListener('visibilitychange',visibility);
  if(document.visibilityState==='hidden'){stop();return;}
  // Respect user intent during loading, before restoration can begin.
  if(!ready)return()=>stop(false);
  if(typeof ResizeObserver!=='undefined'){
   observer=new ResizeObserver(schedule);
   observer.observe(document.documentElement);
   if(document.body)observer.observe(document.body);
  }
  timer=window.setTimeout(cancel,5000);
  schedule();
  // A temporarily unready forecast may restart; completion/user intent may not.
  return()=>stop(false);
 },[target,ready]);
}
