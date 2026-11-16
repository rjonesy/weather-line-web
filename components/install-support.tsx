'use client';

import {useEffect} from 'react';

/** Ask for durable device storage when running as an installed web app. */
export function InstallSupport(){
 useEffect(()=>{
  const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
  const storage=navigator.storage;
  if(!standalone||typeof storage?.persist!=='function')return;
  async function keepStorage(){
   try{
    if(typeof storage.persisted==='function'&&await storage.persisted())return;
    await storage.persist();
   }catch{/* Persistence is best effort; normal local storage remains available. */}
  }
  void keepStorage();
 },[]);
 return null;
}
