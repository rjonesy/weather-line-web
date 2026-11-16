import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Conditions, Day, Forecast} from '../lib/weather.ts';
import {airTemperature, dailyTemperatures, localDayStart, withDailyApparentTemperatures} from '../lib/temperature.ts';

const hour = 3_600_000;
const conditions: Conditions = {time:'2026-11-15T06:00:00Z',conditionCode:'Clear',temperature:10,temperatureApparent:0};
const day = (time: string, forecastEnd?: string): Day => ({...conditions,time,forecastEnd,temperatureMax:15,temperatureMin:5});
function forecast(days: Day[], start: string, count: number): Forecast {
  return {source:'weatherkit',fetchedAt:conditions.time,current:conditions,daily:days,hourly:Array.from({length:count},(_,index)=>({
    ...conditions,time:new Date(Date.parse(start)+index*hour).toISOString(),temperatureApparent:index-12,
  }))};
}

test('temperature selection changes every value without treating zero as missing or using actual as apparent',()=>{
  assert.equal(airTemperature(conditions,false),10);
  assert.equal(airTemperature(conditions,true),0);
  assert.equal(airTemperature({...conditions,temperatureApparent:undefined},true),undefined);
  assert.equal(airTemperature({...conditions,temperatureApparent:Infinity},true),undefined);
  const actual = day(conditions.time);
  assert.deepEqual(dailyTemperatures(actual,false),{high:15,low:5});
  assert.deepEqual(dailyTemperatures(actual,true),{high:undefined,low:undefined});
  assert.deepEqual(dailyTemperatures({...actual,temperatureApparentMax:0,temperatureApparentMin:-8},true),{high:0,low:-8});
});

test('city midnight follows the local calendar, fractional offsets, and DST rather than UTC or a fixed offset',()=>{
  assert.equal(localDayStart('2026-11-16T03:33:00Z','America/Chicago'),'2026-11-15T06:00:00.000Z');
  assert.equal(localDayStart('2026-11-15T12:00:00Z','Asia/Kolkata'),'2026-11-14T18:30:00.000Z');
  assert.equal(localDayStart('2026-03-08T20:00:00Z','America/New_York'),'2026-03-08T05:00:00.000Z');
  assert.equal(localDayStart('2026-11-01T20:00:00Z','America/New_York'),'2026-11-01T04:00:00.000Z');
  assert.equal(localDayStart('invalid','UTC'),undefined);
  assert.equal(localDayStart(Date.now(),'Moon/Sea'),undefined);
});

test('the ten-day hourly query ends at the tenth local midnight across DST and calendar boundaries',()=>{
  for(const [now,start,end,hours] of [
    ['2026-03-04T20:00:00Z','2026-03-04T05:00:00.000Z','2026-03-14T04:00:00.000Z',239],
    ['2026-10-28T20:00:00Z','2026-10-28T04:00:00.000Z','2026-11-07T05:00:00.000Z',241],
    ['2026-12-27T20:00:00Z','2026-12-27T05:00:00.000Z','2027-01-06T05:00:00.000Z',240],
  ] as const){
    assert.equal(localDayStart(now,'America/New_York'),start);
    assert.equal(localDayStart(now,'America/New_York',10),end);
    assert.equal((Date.parse(end)-Date.parse(start))/hour,hours);
  }
  assert.equal(localDayStart('2026-11-15T12:00:00Z','Asia/Kolkata',10),'2026-11-24T18:30:00.000Z');
  assert.equal(localDayStart(Date.now(),'UTC',0.5),undefined);
});

test('all ten complete native daily windows derive independent hourly extrema without mutating actual data',()=>{
  const start='2026-11-15T06:00:00Z';
  const days=Array.from({length:10},(_,index)=>day(new Date(Date.parse(start)+index*24*hour).toISOString(),new Date(Date.parse(start)+(index+1)*24*hour).toISOString()));
  const data=forecast(days,start,240);
  const result=withDailyApparentTemperatures(data,'America/Chicago');
  assert.equal(result.daily.length,10);
  result.daily.forEach((row,index)=>{
    assert.deepEqual(dailyTemperatures(row,true),{high:index*24+11,low:index*24-12});
    assert.equal(row.temperatureApparentSource,'hourly');
    assert.equal(row.temperatureMax,15);assert.equal(row.temperatureMin,5);
  });
  assert.equal(data.daily[0].temperatureApparentMax,undefined);
  assert.equal(result.hourly,data.hourly);
});

test('partial current or last days, an interior missing hour, and a missing apparent sample never become full daily extrema',()=>{
  const base=forecast([day('2026-11-15T06:00:00Z')],'2026-11-15T06:00:00Z',24);
  for(const hourly of [base.hourly.slice(1),base.hourly.slice(0,-1),base.hourly.filter((_,index)=>index!==12),base.hourly.map((row,index)=>index===12?{...row,temperatureApparent:undefined}:row)]){
    const result=withDailyApparentTemperatures({...base,hourly},'America/Chicago');
    assert.deepEqual(dailyTemperatures(result.daily[0],true),{high:undefined,low:undefined});
  }
});

test('spring and fall transition days require their actual 23 and 25 hours',()=>{
  for(const [start,end,count] of [
    ['2026-03-08T05:00:00Z','2026-03-09T04:00:00Z',23],
    ['2026-11-01T04:00:00Z','2026-11-02T05:00:00Z',25],
  ] as const){
    // No native end here: exercise city-local boundary reconstruction.
    const data=forecast([day(start)],start,count);
    assert.deepEqual(dailyTemperatures(withDailyApparentTemperatures(data,'America/New_York').daily[0],true),{high:count-13,low:-12});
    assert.equal(withDailyApparentTemperatures({...data,hourly:data.hourly.slice(0,-1)},'America/New_York').daily[0].temperatureApparentMax,undefined);
    assert.equal(localDayStart(end,'America/New_York'),new Date(end).toISOString());
  }
});

test('fractional-offset days need partial edge intervals without taking an hour from the following day',()=>{
  const data=forecast([day('2026-11-14T18:30:00Z')],'2026-11-14T18:00:00Z',26);
  data.hourly[0].temperatureApparent=-50;
  data.hourly[24].temperatureApparent=40;
  data.hourly[25].temperatureApparent=100;
  assert.deepEqual(dailyTemperatures(withDailyApparentTemperatures(data,'Asia/Kolkata').daily[0],true),{high:40,low:-50});
  assert.equal(withDailyApparentTemperatures({...data,hourly:data.hourly.slice(1)},'Asia/Kolkata').daily[0].temperatureApparentMax,undefined);
});

test('duplicate and out-of-order samples cannot conceal a gap or inflate the extrema with a duplicate',()=>{
  const data=forecast([day('2026-11-15T00:00:00Z')],'2026-11-15T00:00:00Z',24);
  const duplicate={...data.hourly[0],temperatureApparent:999};
  const reordered=[...data.hourly].reverse();
  assert.deepEqual(dailyTemperatures(withDailyApparentTemperatures({...data,hourly:[...reordered,duplicate]},'UTC').daily[0],true),{high:11,low:-12});
  const missing=[...data.hourly.filter((_,index)=>index!==12),duplicate];
  assert.equal(withDailyApparentTemperatures({...data,hourly:missing},'UTC').daily[0].temperatureApparentMax,undefined);
});

test('validated complete daily values survive recomputation from an upcoming-only offline cache',()=>{
  const data=forecast([day('2026-11-15T00:00:00Z')],'2026-11-15T00:00:00Z',24);
  const complete=withDailyApparentTemperatures(data,'UTC');
  const cached={...complete,hourly:complete.hourly.slice(20)};
  assert.deepEqual(withDailyApparentTemperatures(cached,'UTC').daily,complete.daily);
});
