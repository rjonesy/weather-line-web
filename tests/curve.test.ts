import {test} from 'node:test';
import assert from 'node:assert/strict';
import {curveSegments,curve,curveRuns} from '../lib/curve.ts';
import {conditionIcon,conditionColor,isFrozenCondition} from '../lib/weather.ts';

test('Catmull–Rom passes through nodes with continuous interior derivatives',()=>{
  const points=[{x:0,y:40},{x:40,y:10},{x:80,y:25},{x:120,y:0},{x:160,y:35}];
  const segments=curveSegments(points);
  for(let i=0;i<segments.length;i++){
    const s=segments[i];assert.deepEqual(s.start,points[i]);assert.deepEqual(s.end,points[i+1]);
    if(i){const prev=segments[i-1];for(const axis of ['x','y'] as const)assert.ok(Math.abs((prev.end[axis]-prev.c2![axis])-(s.c1![axis]-s.start[axis]))<1e-10);}
  }
  assert.equal(segments[0].c1!.x,40/6);
  assert.equal(segments.at(-1)!.c2!.x,160-40/6);
  assert.equal((curve(points).match(/M /g)||[]).length,1);
});

test('unavailable temperatures break the curve without shifting dates or creating NaN paths',()=>{
 const points=[{x:0,y:20},{x:10,y:30},null,{x:30,y:15},{x:40,y:5},{x:50,y:NaN},{x:60,y:0}];
 const runs=curveRuns(points);
 assert.deepEqual(runs.map(run=>run.startIndex),[0,3,6]);
 assert.deepEqual(runs.map(run=>run.points.length),[2,2,1]);
 assert.equal(runs.map(run=>curve(run.points)).join(' ').includes('NaN'),false);
 assert.deepEqual(curveRuns([null,undefined]),[]);
});
test('sloping collinear points stay straight instead of flattening at every icon',()=>{
  for(const s of curveSegments([{x:0,y:0},{x:40,y:20},{x:80,y:40},{x:120,y:60}])){
    for(const p of [s.start,s.c1!,s.c2!,s.end])assert.equal(p.y,p.x/2);
  }
});
test('small paths preserve original polyline behavior',()=>{
  assert.equal(curve([]),'');assert.equal(curve([{x:1,y:2}]),'M 1 2');
  assert.equal(curve([{x:0,y:0},{x:20,y:10},{x:40,y:0}]),'M 0 0 L 20 10 L 40 0');
});
test('outgoing colors follow the actual glyph including cloudy, frozen and severe weather',()=>{
  const cases=[['Clear',true,'Sunny','sun'],['Clear',false,'NightClear4','night'],['MostlyCloudy',true,'MostlyCloudy','sun'],['Cloudy',true,'Cloudy','cloud'],['Foggy',true,'Fog','cloud'],['Rain',false,'Rain-Light','rain'],['Snow',true,'Snow','wind'],['Sleet',true,'Sleet','wind'],['Hail',true,'Hail','wind'],['Windy',true,'Windy','wind'],['Hurricane',true,'Hurricane','hot'],['Tornado',true,'Tornado','hot']] as const;
  for(const [code,day,icon,color] of cases){assert.equal(conditionIcon(code,day),icon);assert.equal(conditionColor(code,day),`var(--${color})`);assert.equal(conditionColor(code,day,true),`var(--${color}-ink)`);}
});

test('frigid, blowing dust and unavailable conditions never acquire sunny graph colors',()=>{
 for(const daylight of [true,false]){
  assert.equal(conditionIcon('Frigid',daylight),'Icy');assert.equal(conditionColor('Frigid',daylight,true),'var(--wind-ink)');
  assert.equal(conditionIcon('BlowingDust',daylight),'Fog');assert.equal(conditionColor('BlowingDust',daylight,true),'var(--cloud-ink)');
  assert.equal(conditionIcon('NotAvailable',daylight),'NotAvailable');
 }
});

test('all resolved frozen glyphs keep purple on daytime and overnight tracks',()=>{
 const cases=[['Snow','Snow'],['HeavySnow','Snow-Heavy'],['Blizzard','Snow-Heavy'],['Flurries','Snow'],['Sleet','Sleet'],['FreezingRain','Sleet'],['FreezingDrizzle','Sleet'],['WintryMix','Sleet'],['Hail','Hail'],['Frigid','Icy'],['Icy','Icy'],['Ice','Icy'],['Frost','Icy'],['IcePellets','Icy']] as const;
 for(const [code,icon] of cases){
  assert.equal(isFrozenCondition(code),true);
  for(const daylight of [true,false]){
   assert.equal(conditionIcon(code,daylight),icon);
   assert.equal(conditionColor(code,daylight),'var(--wind)');
   assert.equal(conditionColor(code,daylight,true),'var(--wind-ink)');
   assert.equal(conditionColor(code,daylight,false,true),'var(--wind)');
   assert.equal(conditionColor(code,daylight,true,true),'var(--wind-ink)');
  }
 }
});

test('ordinary overnight-track glyphs and lines stay slate without retinting actual daytime sun',()=>{
 for(const code of ['Clear','Sunny','Rain','Windy','Unknown','NotAvailable','Cloudy','Hot','Hurricane']){
  assert.equal(isFrozenCondition(code),false);
  for(const daylight of [true,false]){
   assert.equal(conditionColor(code,daylight,false,true),'var(--night)');
   assert.equal(conditionColor(code,daylight,true,true),'var(--night-ink)');
  }
 }
 assert.equal(conditionIcon('Clear',true),'Sunny');assert.equal(conditionColor('Clear',true),'var(--sun)');
 assert.equal(conditionColor('Clear',true,true),'var(--sun-ink)');
 assert.equal(conditionColor('Rain',true),'var(--rain)');assert.equal(conditionColor('Windy',true),'var(--wind)');
});
