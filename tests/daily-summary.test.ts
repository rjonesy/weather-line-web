import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailySummary} from '../lib/daily-summary.ts';
import type {Day} from '../lib/weather.ts';
const day:Day={time:'2026-11-15T06:00:00Z',conditionCode:'PartlyCloudy',temperature:25,temperatureMax:25,temperatureMin:15};
test('provider daily prose is preferred over a condition label',()=>assert.equal(dailySummary({...day,summary:' Some clouds, then sunshine. '},'F'),'Some clouds, then sunshine'));
test('describes actual day and night changes without inventing hourly timing',()=>assert.equal(dailySummary({...day,daytimeConditionCode:'Rain',overnightConditionCode:'Drizzle'},'F'),'Rain during the day, with light drizzle overnight'));
test('fallback sentence uses measured high/low in the selected unit',()=>{assert.equal(dailySummary(day,'C'),'Partly cloudy skies, with a high of 25° and a low of 15°');assert.equal(dailySummary(day,'F'),'Partly cloudy skies, with a high of 77° and a low of 59°');});
test('Feels Like summaries use apparent extrema, preserve zero and do not repeat actual temperatures from prose',()=>{
 const apparent={...day,temperatureApparentMax:20,temperatureApparentMin:0,temperatureApparentSource:'hourly' as const};
 assert.equal(dailySummary(apparent,'C',true),'Partly cloudy skies, with a high of 20° and a low of 0°');
 assert.equal(dailySummary({...apparent,summary:'High of 25°, low of 15°.'},'F',true),'Partly cloudy skies, with a high of 68° and a low of 32°');
 assert.equal(dailySummary(day,'F',true),'Partly cloudy skies');
});
