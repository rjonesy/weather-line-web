'use client';

import {useEffect,useState} from 'react';
import {subscribeAppRefresh} from '../lib/app-refresh.ts';

/** Enable after hydration; revision zero is inert until the first visible open. */
export function useAppRefresh(enabled:boolean):number{
 const[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!enabled)return;
  return subscribeAppRefresh({document,window,onRefresh:()=>setRevision(value=>value+1)});
 },[enabled]);
 return revision;
}
