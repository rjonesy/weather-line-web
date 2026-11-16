import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RELOAD_STATE_KEY,createAppReloadUrl,cleanAppReloadUrl,parseReloadContext,saveReloadContext,consumeReloadContext,type ReloadContext} from '../lib/app-reload.ts';

const now = 1_800_000_000_000;
const context: ReloadContext = {version:1,createdAt:now,pathname:'/weather-line-web/',placeId:'current-location',collapsed:false,view:'hourly',index:25,scrollY:310.5,mainScroll:800};
class MemoryStorage {
  values = new Map<string,string>();
  removals = 0;
  getItem(key:string) {return this.values.get(key) ?? null;}
  setItem(key:string,value:string) {this.values.set(key,value);}
  removeItem(key:string) {this.removals++;this.values.delete(key);}
}

test('cache-busted reload retains the GitHub base path, unrelated query values and hash',()=>{
  const initial='https://rjonesy.github.io/weather-line-web/?theme=light&tag=a&tag=b#day-3';
  const url=new URL(createAppReloadUrl(initial,'open-123'));
  assert.equal(url.origin,'https://rjonesy.github.io');assert.equal(url.pathname,'/weather-line-web/');
  assert.equal(url.searchParams.get('theme'),'light');assert.deepEqual(url.searchParams.getAll('tag'),['a','b']);
  assert.equal(url.hash,'#day-3');assert.equal(url.searchParams.get('__wl_reload'),'open-123');
});

test('reload nonces replace duplicates and cannot inject query keys or fragments',()=>{
  const initial='https://weather.example/base/?__wl_reload=old&keep=1&__wl_reload=older#forecast';
  const nonce='latest&injected=1#other space';
  const url=new URL(createAppReloadUrl(initial,nonce));
  assert.deepEqual(url.searchParams.getAll('__wl_reload'),[nonce]);assert.equal(url.searchParams.has('injected'),false);
  assert.equal(url.searchParams.get('keep'),'1');assert.equal(url.hash,'#forecast');
});

test('cleanup removes only the reload parameter and never causes another cache-busted navigation',()=>{
  const initial='https://weather.example/base/?__wl_reload=1&keep=2&__wl_reload_extra=3&foo__wl_reload=4&__wl_reload=5#__wl_reload';
  const clean=cleanAppReloadUrl(initial),url=new URL(clean);
  assert.equal(url.pathname,'/base/');assert.equal(url.searchParams.has('__wl_reload'),false);
  assert.equal(url.searchParams.get('keep'),'2');assert.equal(url.searchParams.get('__wl_reload_extra'),'3');
  assert.equal(url.searchParams.get('foo__wl_reload'),'4');assert.equal(url.hash,'#__wl_reload');
  assert.equal(cleanAppReloadUrl(clean),clean);
});

test('valid UI context parses a fresh copy with optional city identity and inclusive index/scroll bounds',()=>{
  assert.deepEqual(parseReloadContext(JSON.stringify(context),now),context);
  const withoutPlace={...context};delete withoutPlace.placeId;
  assert.deepEqual(parseReloadContext(JSON.stringify(withoutPlace),now),withoutPlace);
  for(const index of [0,71])for(const amount of [0,100000])assert.ok(parseReloadContext(JSON.stringify({...context,index,scrollY:amount,mainScroll:amount}),now));
});

test('expired, future, malformed or unknown-field context cannot restore private or invalid state',()=>{
  for(const raw of [null,'','{broken','null','[]','false','42'])assert.equal(parseReloadContext(raw,now),undefined);
  const invalid=[{version:2},{createdAt:now+1},{createdAt:now-600000},{createdAt:-1},{createdAt:null},{collapsed:1},{view:'monthly'},
    ...[-1,72,1.5,NaN,Infinity].map(index=>({index})),...[-1,100001,NaN,Infinity,'10'].map(scrollY=>({scrollY})),
    {mainScroll:-1},{placeId:''},{placeId:'  city  '},{placeId:'x'.repeat(257)},{placeId:'city\nname'},{placeId:3},
    ...[undefined,'','weather-line-web/','/app?private=1','/app#day','/app\nother','/'+ 'x'.repeat(1024)].map(pathname=>({pathname})),
    {latitude:30},{longitude:-97},{address:'Private address'},{place:{id:'city'}},
  ];
  for(const change of invalid)assert.equal(parseReloadContext(JSON.stringify({...context,...change}),now),undefined);
  assert.ok(parseReloadContext(JSON.stringify({...context,createdAt:now-599999}),now));
});

test('save and consume restore context once, remove invalid data, and leave unrelated storage untouched',()=>{
  const store=new MemoryStorage();store.setItem('wl-places','saved cities');
  assert.equal(saveReloadContext(store,context,now),true);
  assert.deepEqual(consumeReloadContext(store,now),context);assert.equal(store.getItem(RELOAD_STATE_KEY),null);
  assert.equal(consumeReloadContext(store,now),undefined);assert.equal(store.getItem('wl-places'),'saved cities');
  for(const raw of ['{broken',JSON.stringify({...context,createdAt:now-600000})]){
    store.setItem(RELOAD_STATE_KEY,raw);assert.equal(consumeReloadContext(store,now),undefined);assert.equal(store.getItem(RELOAD_STATE_KEY),null);
  }
});

test('invalid or failed saves discard prior context rather than restoring an older screen',()=>{
  const store=new MemoryStorage();saveReloadContext(store,context,now);
  assert.equal(saveReloadContext(store,{...context,latitude:30} as ReloadContext,now),false);
  assert.equal(store.getItem(RELOAD_STATE_KEY),null);
  const blocked={getItem:()=>JSON.stringify(context),setItem:()=>{throw Error('blocked');},removeItem:()=>{store.removals++;}};
  const removals=store.removals;assert.equal(saveReloadContext(blocked,context,now),false);assert.equal(store.removals,removals+1);
});

test('blocked storage access is harmless and consuming unreadable data still attempts removal',()=>{
  const getter=()=>{throw Error('Storage access blocked');};
  assert.equal(saveReloadContext(getter,context,now),false);assert.equal(consumeReloadContext(getter,now),undefined);
  for(const store of [null,undefined]){assert.equal(saveReloadContext(store,context,now),false);assert.equal(consumeReloadContext(store,now),undefined);}
  let removals=0;
  const unreadable={getItem:()=>{throw Error('Read blocked');},setItem:()=>{},removeItem:()=>{removals++;}};
  assert.equal(consumeReloadContext(unreadable,now),undefined);assert.equal(removals,1);
  const cannotConsume={getItem:()=>JSON.stringify(context),setItem:()=>{},removeItem:()=>{throw Error('Remove blocked');}};
  assert.equal(consumeReloadContext(cannotConsume,now),undefined);
});
