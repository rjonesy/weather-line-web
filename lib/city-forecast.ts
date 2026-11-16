import {apiUrl} from './api-client.ts';
import {parseCachedForecast} from './preferences.ts';
import {withDailyApparentTemperatures} from './temperature.ts';
import {withDailyDewPoint} from './dew-point.ts';
import type {Forecast,Place} from './weather.ts';

export type CityForecastResult={forecast:Forecast;isOffline:boolean};
export type LoadOptions={force?:boolean;refreshId?:number|string};
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
type Dependencies={fetch?:typeof fetch;storage?:StorageLike|null|(()=>StorageLike|undefined);now?:()=>number;apiUrl?:(path:string)=>string;timeoutMs?:number};
const memoryTtl=10*60*1000,memoryLimit=64,concurrency=3;
const storagePrefix='wl-city-forecast-v1:';

/** An ID alone cannot identify a moving Current Location or an edited place. */
export function placeForecastKey(place:Place):string{
 return JSON.stringify([place.id,place.latitude,place.longitude,place.timezone,place.countryCode?.toUpperCase()||'']);
}
function deviceLocation(place:Place){return /^(?:current[-_ ]?location|gps)(?:$|[:_-])/i.test(place.id);}
function browserStorage():StorageLike|undefined{try{return globalThis.localStorage;}catch{return undefined;}}
function message(error:unknown){return error instanceof Error?error:new Error('Could not load Apple Weather. Try again.');}
function prepareForecast(forecast:Forecast,timezone:string){return withDailyDewPoint(withDailyApparentTemperatures(forecast,timezone),timezone);}

/** Dependencies let tests exercise the real queue and cache without real credentials. */
export function createCityForecastLoader(dependencies:Dependencies={}){
 const now=dependencies.now||Date.now,request=dependencies.fetch||((...args:Parameters<typeof fetch>)=>globalThis.fetch(...args)),urlFor=dependencies.apiUrl||apiUrl;
 const memory=new Map<string,{forecast:Forecast;until:number;refreshId?:number|string}>();
 const inflight=new Map<string,{promise:Promise<CityForecastResult>;fresh:boolean;refreshId?:number|string}>();
 const batches=new Map<string,{promise:Promise<CityForecastResult>;refreshId:number|string;until:number}>();
 const latest=new Map<string,object>(),latestStorage=new Map<string,object>();
 const queue:(()=>void)[]=[];let active=0;
 const storage=()=>{try{return typeof dependencies.storage==='function'?dependencies.storage():dependencies.storage===null?undefined:dependencies.storage||browserStorage();}catch{return undefined;}};
 function remember(key:string,forecast:Forecast,until:number,refreshId?:number|string){
  memory.delete(key);memory.set(key,{forecast,until,refreshId});
  if(memory.size>memoryLimit)memory.delete(memory.keys().next().value!);
 }
 function writeStored(place:Place,key:string,forecast:Forecast){
  try{storage()?.setItem(storagePrefix+encodeURIComponent(place.id),JSON.stringify({version:1,placeKey:key,forecast}));}catch{}
 }
 function readStored(place:Place,key:string,mayWrite:boolean):Forecast|null{
  const store=storage();if(!store)return null;
  try{
   const raw=store.getItem(storagePrefix+encodeURIComponent(place.id));
   if(raw!==null){
    const envelope=JSON.parse(raw);
    if(envelope?.version===1&&envelope.placeKey===key){const forecast=parseCachedForecast(envelope.forecast);if(forecast)return prepareForecast(forecast,place.timezone);}
    return null;
   }
  }catch{return null;}
  // Stable city IDs can migrate the old format. Never reuse an old GPS forecast.
  if(!deviceLocation(place))try{
   const forecast=parseCachedForecast(store.getItem(`wl-cache-${place.id}`));
   if(forecast){const prepared=prepareForecast(forecast,place.timezone);if(mayWrite)writeStored(place,key,prepared);return prepared;}
  }catch{}
  return null;
 }
 function scheduled<T>(job:()=>Promise<T>):Promise<T>{
  return new Promise((resolve,reject)=>{
   const run=()=>{
    active++;
    void Promise.resolve().then(job).then(resolve,reject).finally(()=>{active--;queue.shift()?.();});
   };
   if(active<concurrency)run();else queue.push(run);
  });
 }
 async function fetchCity(place:Place,fresh:boolean):Promise<Forecast>{
  const query=new URLSearchParams({lat:String(place.latitude),lon:String(place.longitude),tz:place.timezone,format:'2'});
  if(fresh)query.set('fresh','1');
  if(place.countryCode)query.set('country',place.countryCode.toUpperCase());
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),dependencies.timeoutMs??20000);
  try{
   const response=await request(urlFor(`/api/weather?${query}`),{signal:controller.signal,...(fresh?{cache:'no-store' as const}:{})});
   let body:unknown;
   try{body=await response.json();}catch{throw new Error(`Apple Weather returned an unreadable forecast (${response.status}). Try again.`);}
   if(!response.ok){
    const detail=body&&typeof body==='object'&&'error'in body&&typeof body.error==='string'?body.error.trim():'';
    throw new Error(detail||`Apple Weather is unavailable (${response.status}). Try again shortly.`);
   }
   const forecast=parseCachedForecast(body);
   if(!forecast)throw new Error('Apple Weather returned an incomplete forecast. Try again.');
   return prepareForecast(forecast,place.timezone);
  }finally{clearTimeout(timer);}
 }
 return function loadCityForecast(place:Place,options:LoadOptions={}):Promise<CityForecastResult>{
  const refreshId=options.refreshId,key=placeForecastKey(place),pending=inflight.get(key),fresh=Boolean(options.force||refreshId!==undefined);
  // Each app activation gets its own token. A new activation must not join a
  // request left running before backgrounding; consumers in one batch do share.
  if(pending&&(!fresh||(pending.fresh&&(refreshId===undefined||pending.refreshId===refreshId))))return pending.promise;
  const batch=batches.get(key);
  if(refreshId!==undefined&&batch?.refreshId===refreshId&&batch.until>now())return batch.promise;
  const existing=memory.get(key);
  if(existing&&existing.until>now()&&(!fresh||(refreshId!==undefined&&existing.refreshId===refreshId))){
   memory.delete(key);memory.set(key,existing);
   return Promise.resolve({forecast:existing.forecast,isOffline:false});
  }
  // Snapshot the identity before waiting in the shared queue.
  const requestedPlace={...place};
  const token={};latest.set(key,token);latestStorage.set(requestedPlace.id,token);
  const promise=scheduled(async()=>{
   try{
    const forecast=await fetchCity(requestedPlace,fresh);
    if(latest.get(key)===token)remember(key,forecast,now()+memoryTtl,refreshId);
    if(latestStorage.get(requestedPlace.id)===token)writeStored(requestedPlace,key,forecast);
    return{forecast,isOffline:false};
   }catch(error){
    const cached=memory.get(key)?.forecast||readStored(requestedPlace,key,latestStorage.get(requestedPlace.id)===token);
    if(cached){
     // Keep fallback data but do not give a failed refresh a fresh/live TTL.
     if(latest.get(key)===token)remember(key,cached,0);return{forecast:cached,isOffline:true};
    }
    if(latest.get(key)===token)memory.delete(key);throw message(error);
   }
  }).finally(()=>{
   if(inflight.get(key)?.promise===promise)inflight.delete(key);
   if(latest.get(key)===token)latest.delete(key);
   if(latestStorage.get(requestedPlace.id)===token)latestStorage.delete(requestedPlace.id);
  });
  inflight.set(key,{promise,fresh,refreshId});
  if(refreshId!==undefined){
   batches.delete(key);batches.set(key,{promise,refreshId,until:now()+memoryTtl});
   if(batches.size>memoryLimit)batches.delete(batches.keys().next().value!);
  }else batches.delete(key);
  return promise;
 };
}

export const loadCityForecast=createCityForecastLoader();
