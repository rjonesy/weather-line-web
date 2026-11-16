import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subscribeAppRefresh} from '../lib/app-refresh.ts';

class VisibilityDocument extends EventTarget{
 visibilityState='visible';
 visibility(value:'visible'|'hidden') {this.visibilityState=value;this.dispatchEvent(new Event('visibilitychange'));}
}
function page(target:EventTarget,type:'pagehide'|'pageshow',persisted=true){target.dispatchEvent(Object.assign(new Event(type),{persisted}));}
function setup(initial:'visible'|'hidden'='visible'){
 const document=new VisibilityDocument(),window=new EventTarget(),scheduled:(()=>void)[]=[];let refreshes=0;
 document.visibilityState=initial;
 const options={document,window,onRefresh:()=>refreshes++,schedule:(callback:()=>void)=>scheduled.push(callback)};
 const cleanup=subscribeAppRefresh(options);
 return{document,window,cleanup,options,flush:()=>scheduled.splice(0).forEach(callback=>callback()),count:()=>refreshes};
}

test('visible mounting schedules exactly one initial refresh',()=>{
 const app=setup();assert.equal(app.count(),0);app.flush();assert.equal(app.count(),1);app.flush();assert.equal(app.count(),1);app.cleanup();
});

test('an initially hidden app waits until it is genuinely visible',()=>{
 const app=setup('hidden');app.flush();assert.equal(app.count(),0);
 app.window.dispatchEvent(new Event('focus'));page(app.window,'pageshow');app.flush();assert.equal(app.count(),0);
 app.document.visibility('visible');app.flush();assert.equal(app.count(),1);app.cleanup();
});

test('paired pageshow, visibility and focus events coalesce within an activation',()=>{
 const app=setup();page(app.window,'pageshow');app.document.visibility('visible');app.window.dispatchEvent(new Event('focus'));app.flush();assert.equal(app.count(),1);
 page(app.window,'pageshow');app.document.visibility('visible');app.window.dispatchEvent(new Event('focus'));app.flush();assert.equal(app.count(),1);app.cleanup();
});

test('every real hide-to-visible reopen refreshes without a time-based cooldown',()=>{
 const app=setup();app.flush();
 for(let i=0;i<5;i++){
  app.document.visibility('hidden');app.flush();assert.equal(app.count(),i+1);
  app.document.visibility('visible');app.flush();assert.equal(app.count(),i+2);
 }
 app.cleanup();
});

test('BFCache pagehide/pageshow refreshes even without a visibility change',()=>{
 const app=setup();app.flush();page(app.window,'pagehide');page(app.window,'pageshow');app.flush();assert.equal(app.count(),2);
 app.document.visibility('visible');page(app.window,'pageshow');app.flush();assert.equal(app.count(),2);
 page(app.window,'pagehide');page(app.window,'pageshow');app.flush();assert.equal(app.count(),3);app.cleanup();
});

test('a BFCache return paired with hidden and visible events has one refresh',()=>{
 const app=setup();app.flush();app.document.visibility('hidden');page(app.window,'pagehide');
 app.document.visibility('visible');app.flush();page(app.window,'pageshow');app.flush();assert.equal(app.count(),2);app.cleanup();
});

test('hiding before a queued refresh runs prevents hidden network work',()=>{
 const app=setup();app.document.visibility('hidden');app.flush();assert.equal(app.count(),0);
 app.document.visibility('visible');app.flush();assert.equal(app.count(),1);
 app.document.visibility('hidden');app.document.visibility('visible');app.document.visibility('hidden');app.flush();assert.equal(app.count(),1);
 app.document.visibility('visible');app.flush();assert.equal(app.count(),2);app.cleanup();
});

test('cleanup cancels queued work and removes lifecycle listeners',()=>{
 const app=setup();app.cleanup();app.flush();assert.equal(app.count(),0);
 app.document.visibility('hidden');app.document.visibility('visible');page(app.window,'pagehide');page(app.window,'pageshow');app.flush();assert.equal(app.count(),0);
});

test('an effect cleanup and resubscribe leaves only the current visible activation',()=>{
 const app=setup();app.cleanup();const cleanup=subscribeAppRefresh(app.options);app.flush();assert.equal(app.count(),1);
 app.document.visibility('hidden');app.document.visibility('visible');app.flush();assert.equal(app.count(),2);cleanup();
});
