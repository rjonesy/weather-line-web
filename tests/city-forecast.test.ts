import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCityForecastLoader,placeForecastKey} from '../lib/city-forecast.ts';
import type {Forecast,Place} from '../lib/weather.ts';
const city:Place={id:'austin',name:'Austin',region:'TX',latitude:30.2672,longitude:-97.7431,timezone:'America/Chicago',countryCode:'US'};
function fixture(temperature=20):Forecast{
 const conditions={time:'2026-11-15T16:00:00Z',conditionCode:'Clear',temperature};
 return{source:'weatherkit',fetchedAt:'2026-11-15T16:01:00Z',current:conditions,hourly:[conditions],daily:[{...conditions,temperatureMax:temperature,temperatureMin:temperature-5}]};
}
class MemoryStorage{
 data=new Map<string,string>();
 getItem(key:string){return this.data.get(key)??null;}
 setItem(key:string,value:string){this.data.set(key,value);}
}
const apiUrl=(path:string)=>`https://weather.example${path}`;
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>resolve=done);return{promise,resolve};}

test('identity includes ID, coordinates, timezone and country, but not display names',()=>{
 assert.equal(placeForecastKey(city),placeForecastKey({...city,name:'Other label'}));
 for(const change of[{id:'other'},{latitude:31},{longitude:-98},{timezone:'UTC'},{countryCode:'CA'}])assert.notEqual(placeForecastKey(city),placeForecastKey({...city,...change}));
 assert.equal(placeForecastKey(city),placeForecastKey({...city,countryCode:'us'}));
});

test('fresh in-flight requests deduplicate and bypass both browser and server caches',async()=>{
 const response=deferred<Response>();let requests=0;
 const load=createCityForecastLoader({apiUrl,storage:null,fetch:async(input,init)=>{
  requests++;const url=new URL(String(input));assert.equal(url.searchParams.get('lat'),'30.2672');assert.equal(url.searchParams.get('lon'),'-97.7431');assert.equal(url.searchParams.get('tz'),'America/Chicago');assert.equal(url.searchParams.get('country'),'US');assert.equal(url.searchParams.get('fresh'),'1');assert.equal(init?.cache,'no-store');assert.ok(init?.signal);return response.promise;
 }});
 const a=load(city,{force:true}),b=load(city,{force:true});assert.equal(a,b);await tick();assert.equal(requests,1);
 response.resolve(Response.json(fixture()));assert.equal((await a).isOffline,false);assert.equal((await b).forecast.current.temperature,20);
});

test('a new activation supersedes an older batch and late completion cannot overwrite fresh memory or storage',async()=>{
 const storage=new MemoryStorage(),responses=[deferred<Response>(),deferred<Response>()];let requests=0;
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>responses[requests++].promise});
 const first=load(city,{force:true,refreshId:'open-1'});
 assert.equal(load(city,{force:true,refreshId:'open-1'}),first);
 await tick();
 const second=load(city,{force:true,refreshId:'open-2'});
 assert.notEqual(first,second);assert.equal(load(city),second);await tick();assert.equal(requests,2);
 responses[1].resolve(Response.json(fixture(30)));await second;
 responses[0].resolve(Response.json(fixture(10)));await first;
 assert.equal((await load(city)).forecast.current.temperature,30);
 assert.equal((await load(city,{force:true,refreshId:'open-2'})).forecast.current.temperature,30);
 assert.equal(requests,2);
 assert.equal(JSON.parse(storage.getItem('wl-city-forecast-v1:austin')!).forecast.current.temperature,30);
});

test('a forced refresh supersedes an ordinary pending request and manual force can join the latest fresh request',async()=>{
 const responses=[deferred<Response>(),deferred<Response>()],cacheModes:(RequestCache|undefined)[]=[];let requests=0;
 const load=createCityForecastLoader({apiUrl,storage:null,fetch:async(_input,init)=>{cacheModes.push(init?.cache);return responses[requests++].promise;}});
 const old=load(city);await tick();
 const fresh=load(city,{force:true,refreshId:1});assert.notEqual(fresh,old);assert.equal(load(city,{force:true}),fresh);await tick();
 responses[1].resolve(Response.json(fixture(30)));await fresh;
 responses[0].resolve(Response.json(fixture(10)));await old;
 assert.deepEqual(cacheModes,[undefined,'no-store']);assert.equal((await load(city)).forecast.current.temperature,30);
});

test('one activation shares completed offline/errors, while a manual retry or new activation really retries',async()=>{
 let requests=0,fail=false;
 const load=createCityForecastLoader({apiUrl,storage:null,fetch:async()=>{requests++;if(fail)throw Error('offline');return Response.json(fixture(24));}});
 await load(city);fail=true;
 const offline=await load(city,{force:true,refreshId:'open-1'});assert.equal(offline.isOffline,true);
 assert.equal((await load(city,{refreshId:'open-1'})).isOffline,true);assert.equal(requests,2);
 await load(city,{force:true});assert.equal(requests,3);
 await load(city,{refreshId:'open-2'});assert.equal(requests,4);
 let errors=0;
 const empty=createCityForecastLoader({apiUrl,storage:null,fetch:async()=>{errors++;throw Error('offline');}});
 await assert.rejects(empty(city,{refreshId:1}),/offline/);
 await assert.rejects(empty(city,{refreshId:1}),/offline/);assert.equal(errors,1);
 await assert.rejects(empty(city,{refreshId:2}),/offline/);assert.equal(errors,2);
});

test('a failed old request cannot mark a newer successful memory entry stale',async()=>{
 let requests=0;const old=deferred<Response>(),fresh=deferred<Response>();
 const load=createCityForecastLoader({apiUrl,storage:null,fetch:async()=>++requests===1?old.promise:fresh.promise});
 const first=load(city,{refreshId:1});await tick();const second=load(city,{refreshId:2});await tick();
 fresh.resolve(Response.json(fixture(30)));await second;
 old.resolve(Response.json({error:'Old request failed'},{status:502}));assert.equal((await first).isOffline,true);
 assert.equal((await load(city)).isOffline,false);assert.equal(requests,2);
});

test('late GPS coordinates cannot replace a newer coordinate-keyed persistent envelope',async()=>{
 const storage=new MemoryStorage(),responses=[deferred<Response>(),deferred<Response>()];let requests=0;
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>responses[requests++].promise});
 const gps={...city,id:'current-location'},moved={...gps,latitude:31};
 const old=load(gps,{refreshId:1}),fresh=load(moved,{refreshId:2});await tick();
 responses[1].resolve(Response.json(fixture(30)));await fresh;
 responses[0].resolve(Response.json(fixture(10)));await old;
 const stored=JSON.parse(storage.getItem('wl-city-forecast-v1:current-location')!);
 assert.equal(stored.placeKey,placeForecastKey(moved));assert.equal(stored.forecast.current.temperature,30);
});

test('twenty distinct cities never exceed three concurrent network requests',async()=>{
 let active=0,maximum=0,requests=0;const waiting:(()=>void)[]=[];
 const load=createCityForecastLoader({apiUrl,storage:null,fetch:async()=>{
  requests++;active++;maximum=Math.max(maximum,active);await new Promise<void>(resolve=>waiting.push(resolve));active--;return Response.json(fixture());
 }});
 const work=Array.from({length:20},(_,i)=>load({...city,id:`city-${i}`,latitude:i}));
 await tick();assert.equal(requests,3);
 while(requests<20||waiting.length){waiting.splice(0).forEach(resolve=>resolve());await tick();}
 await Promise.all(work);assert.equal(requests,20);assert.equal(maximum,3);
});

test('fresh memory has a ten-minute TTL and force bypasses it',async()=>{
 let now=0,requests=0;
 const load=createCityForecastLoader({apiUrl,storage:null,now:()=>now,fetch:async()=>Response.json(fixture(++requests))});
 await load(city);await load(city);assert.equal(requests,1);
 await load(city,{force:true});assert.equal(requests,2);
 now=600000;await load(city);assert.equal(requests,3);
});

test('memory evicts the least recently used city after sixty-four entries',async()=>{
 let requests=0;const load=createCityForecastLoader({apiUrl,storage:null,fetch:async()=>{requests++;return Response.json(fixture());}});
 for(let i=0;i<64;i++)await load({...city,id:`city-${i}`});
 await load({...city,id:'city-0'});await load({...city,id:'city-64'});assert.equal(requests,65);
 await load({...city,id:'city-0'});assert.equal(requests,65);
 await load({...city,id:'city-1'});assert.equal(requests,66);
});

test('same-place storage fallback is offline, never a newly fresh live entry',async()=>{
 const storage=new MemoryStorage();let fail=false,requests=0;
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>{requests++;if(fail)throw Error('offline');return Response.json(fixture(24));}});
 await load(city);fail=true;
 const fallback=await load(city,{force:true});assert.equal(fallback.isOffline,true);assert.equal(fallback.forecast.current.temperature,24);
 await load(city);assert.equal(requests,3);
 const reopened=createCityForecastLoader({apiUrl,storage,fetch:async()=>{throw Error('offline');}});
 assert.equal((await reopened(city)).isOffline,true);
 await assert.rejects(reopened({...city,latitude:31}),/offline/);
});

test('legacy stable-city caches migrate, but current-location/GPS caches never do',async()=>{
 const storage=new MemoryStorage();storage.setItem('wl-cache-austin',JSON.stringify(fixture(18)));storage.setItem('wl-cache-current-location',JSON.stringify(fixture(99)));storage.setItem('wl-cache-gps:test',JSON.stringify(fixture(99)));
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>{throw Error('offline');}});
 assert.equal((await load(city)).forecast.current.temperature,18);
 assert.ok([...storage.data.keys()].some(key=>key.startsWith('wl-city-forecast-v1:')));
 await assert.rejects(load({...city,id:'current-location'}),/offline/);await assert.rejects(load({...city,id:'gps:test'}),/offline/);
});

test('GPS cache isolation follows changing coordinates even across loader instances',async()=>{
 const storage=new MemoryStorage(),gps={...city,id:'current-location'};
 const first=createCityForecastLoader({apiUrl,storage,fetch:async()=>Response.json(fixture(12))});await first(gps);
 const offline=createCityForecastLoader({apiUrl,storage,fetch:async()=>{throw Error('offline');}});
 assert.equal((await offline(gps)).forecast.current.temperature,12);await assert.rejects(offline({...gps,longitude:10}),/offline/);
});

test('an existing envelope blocks legacy migration after a stable city identity changes',async()=>{
 const storage=new MemoryStorage();storage.setItem('wl-cache-austin',JSON.stringify(fixture(99)));
 const first=createCityForecastLoader({apiUrl,storage,fetch:async()=>Response.json(fixture(12))});await first(city);
 const offline=createCityForecastLoader({apiUrl,storage,fetch:async()=>{throw Error('offline');}});
 for(const change of[{latitude:31},{longitude:10},{timezone:'UTC'},{countryCode:'CA'}])await assert.rejects(offline({...city,...change}),/offline/);
 storage.setItem('wl-city-forecast-v1:austin','{broken');
 await assert.rejects(offline(city),/offline/);
});

test('broken storage cannot break a successful forecast or a memory fallback',async()=>{
 const storage={getItem(){throw Error('denied');},setItem(){throw Error('full');}};let fail=false;
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>{if(fail)throw Error('offline');return Response.json(fixture());}});
 assert.equal((await load(city)).isOffline,false);fail=true;assert.equal((await load(city,{force:true})).isOffline,true);
});

test('reference/malformed provider payloads and malformed caches cannot become live data',async()=>{
 for(const body of[{...fixture(),source:'reference'},null,{source:'weatherkit'}, {...fixture(),current:null}]){
  const storage=new MemoryStorage();storage.setItem('wl-cache-austin','{broken');
  const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>Response.json(body)});
  await assert.rejects(load(city),/incomplete forecast/);
 }
});

test('removed demo forecasts cannot return through legacy or coordinate-keyed offline caches',async()=>{
 for(const kind of ['legacy','envelope']){
  const storage=new MemoryStorage(),demo={...fixture(),source:'reference'};
  if(kind==='legacy')storage.setItem('wl-cache-austin',JSON.stringify(demo));
  else storage.setItem('wl-city-forecast-v1:austin',JSON.stringify({version:1,placeKey:placeForecastKey(city),forecast:demo}));
  const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>{throw Error('offline');}});
  await assert.rejects(load(city),/offline/);
  if(kind==='legacy')assert.equal(storage.getItem('wl-city-forecast-v1:austin'),null);
 }
});

test('HTTP error details survive and the timeout aborts only the shared request',async()=>{
 const denied=createCityForecastLoader({apiUrl,storage:null,fetch:async()=>Response.json({error:'Weather is unavailable here.'},{status:429})});
 await assert.rejects(denied(city),/Weather is unavailable here/);
 let signals=0;
 const timed=createCityForecastLoader({apiUrl,storage:null,timeoutMs:5,fetch:async(_input,init)=>new Promise((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>{signals++;reject(Error('timed out'));},{once:true});})});
 const a=timed(city),b=timed(city);await assert.rejects(a,/timed out/);await assert.rejects(b,/timed out/);assert.equal(signals,1);
});


test('GPS movement overwrites one persistent envelope and rejects old-coordinate reuse',async()=>{
 const storage=new MemoryStorage(),gps={...city,id:'current-location'};
 const load=createCityForecastLoader({apiUrl,storage,fetch:async input=>Response.json(fixture(Number(new URL(String(input)).searchParams.get('lat'))))});
 for(let i=0;i<20;i++)await load({...gps,latitude:i});
 assert.equal(storage.data.size,1);
 const offline=createCityForecastLoader({apiUrl,storage,fetch:async()=>{throw Error('offline');}});
 assert.equal((await offline({...gps,latitude:19})).forecast.current.temperature,19);
 await assert.rejects(offline({...gps,latitude:18}),/offline/);
});

function dewPointFixture():Forecast{
 const hour=3_600_000,start=Date.parse('2026-11-15T00:00:00Z');
 return{...fixture(),current:{...fixture().current,time:new Date(start+20*hour).toISOString()},
  hourly:Array.from({length:240},(_,index)=>({time:new Date(start+index*hour).toISOString(),conditionCode:'Clear',temperature:20,temperatureDewPoint:index%24>=5&&index%24<22?index%24+Math.floor(index/24):-80})),
  daily:Array.from({length:10},(_,index)=>({time:new Date(start+index*24*hour).toISOString(),forecastEnd:new Date(start+(index+1)*24*hour).toISOString(),conditionCode:'Clear',temperature:20,temperatureMax:22,temperatureMin:12,temperatureDewPoint:-50})),
 };
}

test('full-hourly responses and legacy offline caches derive all ten daily dew point averages',async()=>{
 const place={...city,timezone:'UTC'},body=dewPointFixture(),storage=new MemoryStorage();
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>Response.json(body)});
 const live=await load(place);
 assert.equal(live.isOffline,false);assert.deepEqual(live.forecast.daily.map(day=>day.temperatureDewPointAverage),Array.from({length:10},(_,index)=>13+index));
 const legacy=new MemoryStorage();legacy.setItem('wl-cache-austin',JSON.stringify(body));
 const offline=createCityForecastLoader({apiUrl,storage:legacy,fetch:async()=>{throw Error('offline');}});
 const migrated=await offline(place);assert.equal(migrated.isOffline,true);assert.equal(migrated.forecast.daily[0].temperatureDewPointAverage,13);
 assert.equal(JSON.parse(legacy.getItem('wl-city-forecast-v1:austin')!).forecast.daily[0].temperatureDewPointAverageSource,'hourly-daytime');
});

test('a tagged current-day dew point average survives upcoming-only response and offline cache recomputation',async()=>{
 const place={...city,timezone:'UTC'},body=dewPointFixture(),storage=new MemoryStorage();
 body.hourly=body.hourly.filter(hour=>Date.parse(hour.time)>=Date.parse(body.current.time));
 body.daily[0]={...body.daily[0],temperatureDewPointAverage:13,temperatureDewPointAverageSource:'hourly-daytime'};
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>Response.json(body)});
 assert.equal((await load(place)).forecast.daily[0].temperatureDewPointAverage,13);
 const offline=createCityForecastLoader({apiUrl,storage,fetch:async()=>{throw Error('offline');}});
 const cached=await offline(place);assert.equal(cached.isOffline,true);assert.equal(cached.forecast.daily[0].temperatureDewPointAverage,13);
 assert.equal(cached.forecast.daily[0].temperatureDewPointAverageSource,'hourly-daytime');assert.equal(cached.forecast.daily[1].temperatureDewPointAverage,14);
});

test('untagged daily dew point never becomes an average and malformed new pairs fall back offline',async()=>{
 const place={...city,timezone:'UTC'},body=dewPointFixture(),storage=new MemoryStorage();
 body.hourly=body.hourly.filter(hour=>Date.parse(hour.time)>=Date.parse(body.current.time));
 let malformed=false;
 const load=createCityForecastLoader({apiUrl,storage,fetch:async()=>Response.json(malformed?{...body,daily:[{...body.daily[0],temperatureDewPointAverage:4}]}:body)});
 const initial=await load(place);assert.equal(initial.isOffline,false);assert.equal(initial.forecast.daily[0].temperatureDewPointAverage,undefined);assert.equal(initial.forecast.daily[0].temperatureDewPoint,-50);
 malformed=true;const fallback=await load(place,{force:true});assert.equal(fallback.isOffline,true);assert.equal(fallback.forecast.daily[0].temperatureDewPointAverage,undefined);
});
