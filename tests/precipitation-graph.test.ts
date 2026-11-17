import {test} from 'node:test';
import assert from 'node:assert/strict';
import {precipitationHeight,precipitationPoints} from '../lib/precipitation-graph.ts';

test('source rain scale uses SI conversion and continuous nonlinear intensity bands',()=>{
 const thresholds=[1,2,3].map(range=>25.4*(-Math.log(1-range/4)/2.209389806)**2);
 for(let i=0;i<thresholds.length;i++){
  assert.ok(Math.abs(precipitationHeight(thresholds[i])-[.15,.33,.67][i])<1e-10);
  assert.ok(Math.abs(precipitationHeight(thresholds[i]+1e-7)-precipitationHeight(thresholds[i]-1e-7))<1e-6);
 }
 assert.equal(precipitationHeight(.0018*25.4),0);
 assert.ok(precipitationHeight(1000)<1);
});
test('dry, invalid and zero-chance inputs stay dry; forecast probability controls the area',()=>{
 for(const [intensity,chance] of [[0,1],[-1,1],[NaN,1],[1,NaN],[10,0]])assert.equal(precipitationHeight(intensity,chance),0);
 assert.ok(precipitationHeight(10,.5)<precipitationHeight(10,1));
 assert.equal(precipitationHeight(10,2),precipitationHeight(10,1));
});
test('minute positions use forecast timestamps, retain gaps and avoid stretching a partial hour',()=>{
 const at=(minute:number,intensity=1)=>({startTime:new Date(Date.UTC(2026,0,1,0,minute)).toISOString(),precipitationIntensity:intensity,precipitationChance:1});
 const input=[at(20),at(0),at(20),at(61),at(10,-1),{...at(5),startTime:'bad'}];
 const points=precipitationPoints(input);
 assert.deepEqual(points.map(p=>p.minute),[0,20]);
 assert.deepEqual(input.map(p=>p.startTime),[at(20),at(0),at(20),at(61),at(10),{startTime:'bad'}].map(p=>p.startTime));
 assert.deepEqual(precipitationPoints(undefined),[]);
});
