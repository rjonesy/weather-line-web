import {parsePreferences,type Preferences} from './preferences.ts';

export const PREFERENCE_STORAGE_KEY='wl-preferences';
export const PREFERENCE_FIELD_PREFIX='wl-preference-v1:';
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
type StorageAccess=StorageLike|null|undefined|(()=>StorageLike|null|undefined);
const fields:readonly(keyof Preferences)[]=['theme','unit','wind','rain','feelsLike','nightConditions'];

export function isPreferenceStorageKey(key:string|null):boolean{
 return key===null||key===PREFERENCE_STORAGE_KEY||fields.some(field=>key===`${PREFERENCE_FIELD_PREFIX}${field}`);
}

/** Reads never write; independent fields prevent another tab reverting unrelated choices. */
export function createPreferenceStore(defaults:Preferences,access:StorageAccess){
 let current={...defaults};
 const unsaved=new Map<keyof Preferences,Preferences[keyof Preferences]>();
 const storage=()=>typeof access==='function'?access():access;
 const snapshot=(next:Preferences)=>{
  if(fields.some(field=>next[field]!==current[field]))current=next;
  return current;
 };
 function read():Preferences{
  try{
   const store=storage();if(!store)return current;
   // Existing installations retain their settings without a write-on-mount migration.
   let legacy=current;
   try{legacy=parsePreferences(store.getItem(PREFERENCE_STORAGE_KEY),defaults);}catch{}
   const values:Record<string,unknown>={...legacy};
   for(const field of fields){
    try{
     const raw=store.getItem(`${PREFERENCE_FIELD_PREFIX}${field}`);
     if(raw!==null)try{values[field]=JSON.parse(raw);}catch{}
    }catch{}
   }
   for(const [field,value] of unsaved)values[field]=value;
   return snapshot(parsePreferences(values,legacy));
  }catch{return current;}
 }
 function set<K extends keyof Preferences>(key:K,value:Preferences[K]):Preferences{
  const previous=read(),next=parsePreferences({...previous,[key]:value},previous);
  try{
   const store=storage();if(!store)throw new Error('Storage unavailable');
   // Save the intent before returning to React, navigation or app suspension.
   store.setItem(`${PREFERENCE_FIELD_PREFIX}${key}`,JSON.stringify(next[key]));
   unsaved.delete(key);
  }catch{unsaved.set(key,next[key]);}
  return snapshot(next);
 }
 return {read,set};
}
