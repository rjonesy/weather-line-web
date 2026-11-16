type LifecycleTarget={addEventListener:(type:string,listener:EventListener)=>void;removeEventListener:(type:string,listener:EventListener)=>void};
type VisibilityTarget=LifecycleTarget&{readonly visibilityState:string};
type Options={document:VisibilityTarget;window:LifecycleTarget;onRefresh:()=>void;schedule?:(callback:()=>void)=>void};

/** One refresh per visible activation; pagehide also handles BFCache-only returns. */
export function subscribeAppRefresh({document:doc,window:lifecycle,onRefresh,schedule=queueMicrotask}:Options):()=>void{
 let disposed=false,active=false,generation=0;
 const suspend=()=>{active=false;generation++;};
 const activate=()=>{
  if(disposed||active||doc.visibilityState!=='visible')return;
  active=true;const activation=++generation;
  schedule(()=>{if(!disposed&&active&&generation===activation&&doc.visibilityState==='visible')onRefresh();});
 };
 const visibility:EventListener=()=>{if(doc.visibilityState==='visible')activate();else suspend();};
 const pagehide:EventListener=()=>suspend();
 const pageshow:EventListener=event=>{if((event as Event&{persisted?:boolean}).persisted)activate();};
 doc.addEventListener('visibilitychange',visibility);
 lifecycle.addEventListener('pagehide',pagehide);
 lifecycle.addEventListener('pageshow',pageshow);
 activate();
 return()=>{
  disposed=true;suspend();
  doc.removeEventListener('visibilitychange',visibility);
  lifecycle.removeEventListener('pagehide',pagehide);
  lifecycle.removeEventListener('pageshow',pageshow);
 };
}
