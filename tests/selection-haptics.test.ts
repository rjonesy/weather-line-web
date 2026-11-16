import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSelectionHaptics} from '../lib/selection-haptics.ts';

function harness() {
  let time = 0;
  const ticks: {time: number; duration: number}[] = [];
  const selection = createSelectionHaptics({view:'daily',index:0}, {now:()=>time,vibrate:duration=>{ticks.push({time,duration});return true;}});
  return {selection,ticks,at:(value: number)=>time=value};
}

test('pointerdown, repeated moves and a delayed click on the same column produce one tick',()=>{
  const {selection,ticks,at}=harness();
  assert.equal(selection.selectIndex(3),true);
  for(let i=0;i<5;i++)assert.equal(selection.selectIndex(3),false);
  at(100);assert.equal(selection.selectIndex(3),false);
  assert.deepEqual(ticks,[{time:0,duration:5}]);
});

test('a throttled move still becomes the synchronous selection so its delayed click cannot tick again',()=>{
  const {selection,ticks,at}=harness();
  selection.selectIndex(3);
  at(20);assert.equal(selection.selectIndex(4),true);assert.equal(selection.getSelection().index,4);
  at(80);assert.equal(selection.selectIndex(4),false);assert.equal(ticks.length,1);
  at(90);assert.equal(selection.selectIndex(5),true);
  assert.deepEqual(ticks,[{time:0,duration:5},{time:90,duration:5}]);
});

test('rapid choices before rerender stay correct and emit at most one exact5ms tick per50ms',()=>{
  const {selection,ticks,at}=harness();
  selection.selectIndex(1);
  at(10);selection.selectIndex(2);
  at(20);selection.selectIndex(1);
  at(49);selection.selectIndex(3);
  assert.deepEqual(selection.getSelection(),{view:'daily',index:3});
  at(50);selection.selectIndex(4);
  at(99);selection.selectIndex(5);
  at(100);selection.selectIndex(6);
  assert.deepEqual(ticks,[{time:0,duration:5},{time:50,duration:5},{time:100,duration:5}]);
});

test('an actual view change resets the index and ticks once; an active view click preserves its selected index',()=>{
  const {selection,ticks,at}=harness();
  selection.resetIndex(7);
  assert.equal(selection.selectView('daily'),false);assert.deepEqual(selection.getSelection(),{view:'daily',index:7});
  assert.equal(selection.selectView('hourly'),true);assert.deepEqual(selection.getSelection(),{view:'hourly',index:0});
  at(20);assert.equal(selection.selectView('daily'),true);assert.deepEqual(selection.getSelection(),{view:'daily',index:0});
  at(80);assert.equal(selection.selectView('daily'),false);
  assert.deepEqual(ticks,[{time:0,duration:5}]);
});

test('programmatic resets stay silent and a stale async reset cannot change the latest view',()=>{
  const {selection,ticks,at}=harness();
  selection.resetIndex(4);assert.equal(ticks.length,0);
  const staleCompletion=()=>selection.resetIndex();
  selection.selectView('hourly');at(100);selection.selectIndex(6);
  const count=ticks.length;staleCompletion();
  assert.deepEqual(selection.getSelection(),{view:'hourly',index:0});assert.equal(ticks.length,count);
  assert.equal(selection.selectIndex(0),false);assert.equal(ticks.length,count);
});

test('keyboard activation of the selected point and a clamped boundary arrow remain silent',()=>{
  const {selection,ticks}=harness();
  assert.equal(selection.selectIndex(0),false); // Enter/Space on selected point.
  assert.equal(selection.selectIndex(Math.max(0,0-1)),false); // Left at first point.
  assert.equal(selection.selectIndex(1),true); // Changed ArrowRight selection.
  assert.equal(selection.selectIndex(1),false);
  assert.equal(ticks.length,1);
});

test('false or throwing vibration never blocks selection changes or state updates',()=>{
  for(const vibrate of [()=>false,()=>{throw Error('Unavailable');}]) {
    const selection=createSelectionHaptics({view:'daily',index:0},{vibrate,now:()=>0});
    assert.equal(selection.selectIndex(2),true);assert.deepEqual(selection.getSelection(),{view:'daily',index:2});
    assert.equal(selection.selectView('hourly'),true);assert.deepEqual(selection.getSelection(),{view:'hourly',index:0});
  }
});

test('navigator support is checked dynamically and vibration receives the navigator as receiver',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  let time=0;
  try {
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:undefined});
    const selection=createSelectionHaptics({view:'daily',index:0},{now:()=>time});
    assert.equal(selection.selectIndex(1),true);
    const navigator={calls:0,vibrate(duration: number){assert.equal(this,navigator);assert.equal(duration,5);this.calls++;return true;}};
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:navigator});
    assert.equal(selection.selectIndex(2),true);assert.equal(navigator.calls,1);
    time=100;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
    assert.equal(selection.selectIndex(3),true);assert.equal(navigator.calls,1);
  } finally {
    if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);
    else Reflect.deleteProperty(globalThis,'navigator');
  }
});

test('selection snapshots cannot mutate internal state and invalid indices do not leak NaN',()=>{
  const {selection,ticks}=harness();
  const copy=selection.getSelection();copy.view='hourly';copy.index=99;
  assert.deepEqual(selection.getSelection(),{view:'daily',index:0});
  for(const index of [NaN,Infinity,-1,1.5]){assert.equal(selection.selectIndex(index),false);selection.resetIndex(index);}
  assert.deepEqual(selection.getSelection(),{view:'daily',index:0});assert.equal(ticks.length,0);
});
