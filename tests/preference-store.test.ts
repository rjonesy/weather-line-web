import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PREFERENCE_STORAGE_KEY,PREFERENCE_FIELD_PREFIX,isPreferenceStorageKey,createPreferenceStore} from '../lib/preference-store.ts';
import type {Preferences} from '../lib/preferences.ts';

const defaults:Preferences={theme:'auto',unit:'F',wind:'mph',rain:'in',feelsLike:false,nightConditions:false};
const field=(key:keyof Preferences)=>PREFERENCE_FIELD_PREFIX+key;
class MemoryStorage {
  data=new Map<string,string>();
  writes:{key:string;value:string}[]=[];
  getItem(key:string){return this.data.get(key)??null;}
  setItem(key:string,value:string){this.writes.push({key,value});this.data.set(key,value);}
}

test('preference storage key recognition includes the legacy record and each current field, without unrelated app state',()=>{
  assert.equal(PREFERENCE_STORAGE_KEY,'wl-preferences');assert.equal(PREFERENCE_FIELD_PREFIX,'wl-preference-v1:');
  assert.equal(isPreferenceStorageKey(PREFERENCE_STORAGE_KEY),true);
  for(const key of Object.keys(defaults) as (keyof Preferences)[])assert.equal(isPreferenceStorageKey(field(key)),true);
  for(const key of ['wl-places','wl-defaults-v2','wl-app-reload-context-v1','unrelated'])assert.equal(isPreferenceStorageKey(key),false);
});

test('simultaneous independent tab changes preserve both toggles and storage events/readbacks never echo writes',()=>{
  const storage=new MemoryStorage(),legacy=JSON.stringify(defaults);storage.data.set(PREFERENCE_STORAGE_KEY,legacy);
  const a=createPreferenceStore(defaults,storage),b=createPreferenceStore(defaults,storage);
  assert.deepEqual(a.read(),defaults);assert.deepEqual(b.read(),defaults);assert.equal(storage.writes.length,0);
  a.set('feelsLike',true);b.set('nightConditions',true);
  for(let i=0;i<8;i++){
    assert.equal(a.read().feelsLike,true);assert.equal(a.read().nightConditions,true);
    assert.equal(b.read().feelsLike,true);assert.equal(b.read().nightConditions,true);
  }
  assert.deepEqual(storage.writes,[{key:field('feelsLike'),value:'true'},{key:field('nightConditions'),value:'true'}]);
  assert.equal(storage.getItem(PREFERENCE_STORAGE_KEY),legacy);
});

test('a delayed mount snapshot cannot overwrite a newer preference change',()=>{
  const storage=new MemoryStorage();storage.data.set(PREFERENCE_STORAGE_KEY,JSON.stringify(defaults));
  const mounting=createPreferenceStore(defaults,storage),active=createPreferenceStore(defaults,storage);
  const initialRender=mounting.read();assert.equal(initialRender.feelsLike,false);assert.equal(initialRender.nightConditions,false);
  active.set('feelsLike',true);active.set('nightConditions',true);
  const hydrated=mounting.read();assert.equal(hydrated.feelsLike,true);assert.equal(hydrated.nightConditions,true);
  assert.equal(storage.writes.length,2);
  assert.equal(JSON.parse(storage.getItem(field('feelsLike'))!),true);assert.equal(JSON.parse(storage.getItem(field('nightConditions'))!),true);
});

test('each toggle is durable before set returns, including false, so an immediate new-document store reload sees it',()=>{
  const storage=new MemoryStorage();
  for(const key of ['feelsLike','nightConditions'] as const){
    const first=createPreferenceStore(defaults,storage);
    assert.equal(first.set(key,true)[key],true);assert.equal(storage.getItem(field(key)),'true');
    const reloaded=createPreferenceStore(defaults,storage);assert.equal(reloaded.read()[key],true);
    assert.equal(reloaded.set(key,false)[key],false);assert.equal(storage.getItem(field(key)),'false');
    assert.equal(createPreferenceStore(defaults,storage).read()[key],false);
  }
  assert.equal(storage.writes.every(write=>write.key.startsWith(PREFERENCE_FIELD_PREFIX)),true);
  assert.equal(storage.getItem(PREFERENCE_STORAGE_KEY),null);
});

test('legacy preferences recover without migration writes and valid per-field values override them independently',()=>{
  const storage=new MemoryStorage();
  const legacy:Preferences={theme:'dark',unit:'C',wind:'km/h',rain:'mm',feelsLike:true,nightConditions:true};
  storage.data.set(PREFERENCE_STORAGE_KEY,JSON.stringify(legacy));
  const store=createPreferenceStore(defaults,storage);assert.deepEqual(store.read(),legacy);assert.equal(storage.writes.length,0);
  storage.data.set(field('feelsLike'),'false');storage.data.set(field('theme'),'"light"');storage.data.set(field('rain'),'"in"');
  assert.deepEqual(store.read(),{...legacy,theme:'light',rain:'in',feelsLike:false});assert.equal(storage.writes.length,0);
});

test('malformed legacy and per-field values recover independently without coercion or destructive writes',()=>{
  for(const raw of ['{broken','null','[]','false','42']){
    const storage=new MemoryStorage();storage.data.set(PREFERENCE_STORAGE_KEY,raw);storage.data.set(field('feelsLike'),'true');
    assert.deepEqual(createPreferenceStore(defaults,storage).read(),{...defaults,feelsLike:true});assert.equal(storage.writes.length,0);
  }
  const storage=new MemoryStorage();storage.data.set(PREFERENCE_STORAGE_KEY,JSON.stringify({...defaults,unit:'C',feelsLike:true,nightConditions:true}));
  storage.data.set(field('theme'),'"neon"');storage.data.set(field('unit'),'"F"');storage.data.set(field('feelsLike'),'"false"');storage.data.set(field('nightConditions'),'{broken');
  assert.deepEqual(createPreferenceStore(defaults,storage).read(),{...defaults,unit:'F',feelsLike:true,nightConditions:true});
  assert.equal(storage.writes.length,0);
});

test('StrictMode-style store construction and repeated hydration reads never replace saved true values with defaults',()=>{
  const storage=new MemoryStorage();storage.data.set(field('feelsLike'),'true');storage.data.set(field('nightConditions'),'true');
  for(let replay=0;replay<2;replay++){
    const store=createPreferenceStore(defaults,storage);
    for(let read=0;read<3;read++){const value=store.read();assert.equal(value.feelsLike,true);assert.equal(value.nightConditions,true);}
  }
  assert.equal(storage.writes.length,0);
});

test('blocked storage getters, reads and writes retain current in-memory user changes',()=>{
  const blockedAccess=()=>{throw Error('Storage unavailable');};
  const unreadable={getItem(){throw Error('Read denied');},setItem(){throw Error('Write denied');}};
  const unwritable={getItem(key:string){return key===PREFERENCE_STORAGE_KEY?JSON.stringify(defaults):null;},setItem(){throw Error('Quota exceeded');}};
  for(const access of [null,()=>undefined,blockedAccess,unreadable,unwritable]){
    const store=createPreferenceStore(defaults,access);
    assert.deepEqual(store.read(),defaults);
    assert.equal(store.set('feelsLike',true).feelsLike,true);
    assert.equal(store.read().feelsLike,true);
    assert.equal(store.set('nightConditions',true).nightConditions,true);
    assert.equal(store.read().feelsLike,true);assert.equal(store.read().nightConditions,true);
    assert.equal(store.set('feelsLike',false).feelsLike,false);assert.equal(store.read().feelsLike,false);
  }
});

test('a later storage read failure retains loaded preferences and new intent until storage recovers',()=>{
  const storage=new MemoryStorage();storage.data.set(PREFERENCE_STORAGE_KEY,JSON.stringify({...defaults,feelsLike:true,nightConditions:true}));
  let blocked=false;
  const access={getItem(key:string){if(blocked)throw Error('Storage became unavailable');return storage.getItem(key);},setItem:(key:string,value:string)=>storage.setItem(key,value)};
  const store=createPreferenceStore(defaults,access);assert.equal(store.read().feelsLike,true);assert.equal(store.read().nightConditions,true);
  blocked=true;
  assert.equal(store.read().feelsLike,true);assert.equal(store.read().nightConditions,true);
  assert.equal(store.set('unit','C').unit,'C');assert.equal(store.read().unit,'C');assert.equal(storage.getItem(field('unit')),'"C"');
  blocked=false;
  assert.deepEqual(store.read(),{...defaults,feelsLike:true,nightConditions:true,unit:'C'});
});
