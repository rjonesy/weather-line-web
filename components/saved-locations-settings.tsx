'use client';

import {useId,useLayoutEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Plus,Trash2} from 'lucide-react';
import type {Place} from '@/lib/weather';

type Props={locations:Place[];onRemove:(id:string)=>void;onMove:(id:string,direction:-1|1)=>void;onAdd:()=>void};
type Action='up'|'down'|'remove';
type FocusTarget={id:string;action:Action}|'add';
const controlKey=(id:string,action:Action)=>JSON.stringify([id,action]);

export function SavedLocationsSettings({locations,onRemove,onMove,onAdd}:Props){
 const headingId=useId(),noteId=useId();
 const controls=useRef(new Map<string,HTMLButtonElement>()),addButton=useRef<HTMLButtonElement>(null),pendingFocus=useRef<FocusTarget|null>(null);
 const[announcement,setAnnouncement]=useState('');
 useLayoutEffect(()=>{
  const target=pendingFocus.current;if(!target)return;
  const button=target==='add'?addButton.current:controls.current.get(controlKey(target.id,target.action));
  button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest'});pendingFocus.current=null;
 },[locations]);
 function move(location:Place,index:number,direction:-1|1){
  const next=index+direction;if(next<0||next>=locations.length)return;
  pendingFocus.current={id:location.id,action:direction===-1?'up':'down'};
  setAnnouncement(`${location.name} moved to position ${next+1} of ${locations.length}.`);
  onMove(location.id,direction);
 }
 function remove(location:Place,index:number){
  const next=locations[index+1]||locations[index-1];
  pendingFocus.current=next?{id:next.id,action:'remove'}:'add';
  const remaining=locations.length-1;
  setAnnouncement(`${location.name} removed. ${remaining} saved ${remaining===1?'location':'locations'} remaining.`);
  onRemove(location.id);
 }
 function register(id:string,action:Action,button:HTMLButtonElement|null){
  const key=controlKey(id,action);if(button)controls.current.set(key,button);else controls.current.delete(key);
 }
 return <section className="saved-locations-settings" aria-labelledby={headingId} aria-describedby={noteId}>
  <h2 id={headingId}>Saved Locations</h2>
  <p className="saved-locations-note" id={noteId}>Order here matches your main screen.</p>
  {locations.length?<ol className="saved-locations-list" role="list">{locations.map((location,index)=><li key={location.id}>
   <div className="saved-locations-name"><strong>{location.name}</strong><span>{location.region}</span></div>
   <div className="saved-locations-actions">
    <button type="button" ref={button=>register(location.id,'up',button)} aria-label={`Move ${location.name} up`} aria-disabled={index===0} title="Move up" onClick={()=>move(location,index,-1)}><ChevronUp size={20} aria-hidden="true"/></button>
    <button type="button" ref={button=>register(location.id,'down',button)} aria-label={`Move ${location.name} down`} aria-disabled={index===locations.length-1} title="Move down" onClick={()=>move(location,index,1)}><ChevronDown size={20} aria-hidden="true"/></button>
    <button type="button" ref={button=>register(location.id,'remove',button)} aria-label={`Remove ${location.name}`} title="Remove location" onClick={()=>remove(location,index)}><Trash2 size={18} aria-hidden="true"/></button>
   </div>
  </li>)}</ol>:<p className="saved-locations-empty">No saved locations</p>}
  <button type="button" ref={addButton} className="text-button saved-locations-add" onClick={onAdd}><Plus size={18} aria-hidden="true"/>Add Location</button>
  <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
 </section>;
}
