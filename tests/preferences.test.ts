import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCachedForecast, parsePlaces, parsePreferences, type Preferences} from '../lib/preferences.ts';
import type {Forecast, Place} from '../lib/weather.ts';

const defaults: Preferences = {theme: 'auto', unit: 'F', wind: 'mph', rain: 'in', feelsLike: false, nightConditions:false};
const austin: Place = {id: 'austin', name: 'Austin', region: 'Texas, United States', latitude: 30.2672, longitude: -97.7431, timezone: 'America/Chicago', countryCode: 'US'};

test('valid serialized preferences survive a reload, including all supported themes', () => {
  for (const theme of ['auto', 'light', 'dark', 'black', 'dracula', 'solarized', 'clear-sky'] as const) {
    const saved = {theme, unit: 'C', wind: 'km/h', rain: 'mm', feelsLike: true, nightConditions:true};
    assert.deepEqual(parsePreferences(JSON.stringify(saved), defaults), saved);
  }
});

test('damaged preference fields fall back independently without truthiness coercion or unknown fields', () => {
  const saved = {theme: 'neon', unit: 'C', wind: 4, rain: 'mm', feelsLike: 'false', extra: true};
  assert.deepEqual(parsePreferences(saved, defaults), {...defaults, unit: 'C', rain: 'mm'});
  assert.equal(parsePreferences({feelsLike: false}, {...defaults, feelsLike: true}).feelsLike, false);
  assert.deepEqual(parsePreferences({theme: null, unit: 'c', wind: 'MPH', rain: false, feelsLike: 0}, defaults), defaults);
});

test('missing, malformed and non-object preference storage recovers a fresh copy of defaults', () => {
  for (const saved of [undefined, null, '', '{broken', 'null', '[]', 'false', '2', '"dark"']) {
    const parsed = parsePreferences(saved, defaults);
    assert.deepEqual(parsed, defaults);
    assert.notEqual(parsed, defaults);
  }
});

test('null saved rows and invalid timezones cannot reach city rendering', () => {
  const saved = [null, {...austin, id: 'bad-zone', timezone: 'Moon/Tranquility'}, austin];
  const places = parsePlaces(JSON.stringify(saved), []);
  assert.deepEqual(places, [austin]);
  assert.doesNotThrow(() => places.map(place => new Intl.DateTimeFormat('en-US', {timeZone: place.timezone}).format(new Date())));
  assert.deepEqual(parsePlaces('[null]', [austin]), [austin]);
});

test('coordinates must be numeric, finite and within the latitude and longitude bounds', () => {
  for (const change of [
    {latitude: '30.2672'}, {latitude: NaN}, {latitude: Infinity}, {latitude: -90.01}, {latitude: 90.01},
    {longitude: '-97.7431'}, {longitude: NaN}, {longitude: -Infinity}, {longitude: -180.01}, {longitude: 180.01},
  ]) assert.deepEqual(parsePlaces([{...austin, ...change}], []), []);
  const boundaries = [{...austin, id: 'north', latitude: 90, longitude: 180}, {...austin, id: 'south', latitude: -90, longitude: -180}];
  assert.deepEqual(parsePlaces(boundaries, []), boundaries);
});

test('saved rows require usable identity, display strings, an IANA zone and an optional two-letter country', () => {
  for (const change of [
    {id: ''}, {id: '   '}, {id: 1}, {name: ''}, {name: null}, {region: null},
    {timezone: ''}, {timezone: '+01:00'}, {timezone: ' America/Chicago '},
    {countryCode: null}, {countryCode: 'USA'}, {countryCode: 'U1'},
  ]) assert.deepEqual(parsePlaces([{...austin, ...change}], []), []);
  const withoutCountry = {...austin, timezone: 'UTC', countryCode: undefined};
  assert.deepEqual(parsePlaces([withoutCountry], []), [{id: austin.id, name: austin.name, region: austin.region, latitude: austin.latitude, longitude: austin.longitude, timezone: 'UTC'}]);
});

test('saved cities are copied, normalized and deduplicated by stable ID', () => {
  const saved = {...austin, id: ' austin ', name: ' Austin ', region: ' Texas ', countryCode: 'us', unknown: 'discard'};
  const places = parsePlaces([saved, {...austin, name: 'Duplicate'}], []);
  assert.deepEqual(places, [{...austin, region: 'Texas'}]);
  assert.equal(saved.id, ' austin ');
  places[0].name = 'Changed';
  assert.equal(saved.name, ' Austin ');
});

test('unusable saved arrays recover a validated fallback without sharing mutable rows', () => {
  for (const saved of [undefined, null, '{broken', '{}', '[null]', 3, {id: 'not-an-array'}]) {
    const places = parsePlaces(saved, [austin]);
    assert.deepEqual(places, [austin]);
    assert.notEqual(places[0], austin);
  }
  assert.deepEqual(parsePlaces(null, [{...austin, timezone: 'Invalid/Zone'}]), []);
});

test('an explicitly empty saved list survives hydration instead of restoring the default city', () => {
  for (const saved of [[], '[]']) assert.deepEqual(parsePlaces(saved, [austin]), []);
  assert.deepEqual(parsePlaces('[null]', [austin]), [austin]);
  assert.deepEqual(parsePlaces('null', [austin]), [austin]);
});

const conditions = {time: '2026-11-15T06:00:00Z', conditionCode: 'Clear', temperature: 15, daylight: false};
const cached: Forecast = {source: 'weatherkit', fetchedAt: '2026-11-15T06:10:00Z', current: conditions, hourly: [conditions], daily: [{...conditions, temperatureMax: 20, temperatureMin: 10}]};

test('offline cache preserves daily prose inputs and verified alert coverage with expiry',()=>{
 const complete:Forecast={...cached,daily:[{...cached.daily[0],daytimeConditionCode:'Rain',overnightConditionCode:'Drizzle',summary:'Rain giving way to drizzle'}],alertsStatus:'available',alerts:[{id:'wind',summary:'Wind Warning',severity:'severe',source:'Weather service',areaName:'Coast',effectiveTime:conditions.time,expireTime:'2026-11-16T06:00:00Z',issuedTime:conditions.time}]};
 assert.deepEqual(parseCachedForecast(JSON.stringify(complete)),complete);
 assert.equal(parseCachedForecast({...complete,alerts:undefined}),null);
 assert.equal(parseCachedForecast({...complete,alertsStatus:'made-up'}),null);
 assert.equal(parseCachedForecast({...complete,alerts:[{...complete.alerts![0],expireTime:'invalid'}]}),null);
 assert.equal(parseCachedForecast({...complete,daily:[{...complete.daily[0],overnightConditionCode:42}]}),null);
});

test('a valid live cache is copied with optional weather, solar, precipitation and alert data', () => {
  const complete: Forecast = {
    ...cached,
    current: {...conditions, temperatureApparent: 14, humidity: 0.75},
    daily: [{...cached.daily[0], sunrise: '2026-11-15T12:50:00Z', sunset: '2026-11-16T00:00:00Z'}],
    minutes: [{startTime: conditions.time, precipitationIntensity: 0, precipitationChance: 0}],
    alerts: [{id: 'alert-1', summary: 'Strong winds expected', detailsUrl: 'https://weatherkit.apple.com/alert/1'}],
    attribution: {legalPageUrl: 'https://weatherkit.apple.com/legal-attribution.html'},
  };
  assert.deepEqual(parseCachedForecast(JSON.stringify(complete)), complete);
  assert.notEqual(parseCachedForecast(complete)?.current, complete.current);
});

test('partial, reference and corrupt caches cannot replace a live forecast', () => {
  for (const invalid of [null, '', '{broken', [], {source: 'weatherkit'}, {...cached, source: 'reference'}, {...cached, current: null}, {...cached, hourly: []}, {...cached, daily: []}, {...cached, hourly: [null]}, {...cached, daily: [null]}]) {
    assert.equal(parseCachedForecast(invalid), null);
  }
});

test('invalid cache timestamps and required or optional temperatures are rejected before rendering', () => {
  for (const date of ['bad-date', '1', '2026-13-15T06:00:00Z', null]) {
    assert.equal(parseCachedForecast({...cached, fetchedAt: date}), null);
    assert.equal(parseCachedForecast({...cached, current: {...conditions, time: date}}), null);
    assert.equal(parseCachedForecast({...cached, daily: [{...cached.daily[0], sunrise: date}]}), null);
  }
  for (const temperature of [null, '15', NaN, Infinity]) {
    assert.equal(parseCachedForecast({...cached, current: {...conditions, temperature}}), null);
    assert.equal(parseCachedForecast({...cached, hourly: [{...conditions, temperatureApparent: temperature}]}), null);
    assert.equal(parseCachedForecast({...cached, daily: [{...cached.daily[0], temperatureMin: temperature}]}), null);
    assert.equal(parseCachedForecast({...cached, daily: [{...cached.daily[0], temperatureMax: temperature}]}), null);
  }
});

test('cache optional fields must keep their renderable types and external links must use HTTPS', () => {
  for (const current of [{...conditions, conditionCode: null}, {...conditions, conditionCode: ''}, {...conditions, daylight: 'false'}, {...conditions, humidity: '0.5'}]) {
    assert.equal(parseCachedForecast({...cached, current}), null);
  }
  for (const minutes of [null, {}, [null], [{startTime: 'bad', precipitationIntensity: 0, precipitationChance: 0}], [{startTime: conditions.time, precipitationIntensity: NaN, precipitationChance: 0}]]) {
    assert.equal(parseCachedForecast({...cached, minutes}), null);
  }
  for (const alerts of [null, {}, [null], [{id: '1', summary: null}], [{id: '1', summary: ''}], [{id: '1', summary: 'Wind', detailsUrl: 'javascript:alert(1)'}], [{id: '1', summary: 'Wind', detailsUrl: 'http://example.com/alert'}]]) {
    assert.equal(parseCachedForecast({...cached, alerts}), null);
  }
  assert.equal(parseCachedForecast({...cached, attribution: {logoLightURL: 'data:image/svg+xml,bad'}}), null);
  assert.deepEqual(parseCachedForecast({...cached, minutes: [], alerts: []}), {...cached, minutes: [], alerts: []});
});

test('experimental nights default off and accept only a boolean',()=>{assert.equal(parsePreferences({},defaults).nightConditions,false);assert.equal(parsePreferences({nightConditions:true},defaults).nightConditions,true);assert.equal(parsePreferences({nightConditions:'true'},defaults).nightConditions,false);});

test('complete hourly-derived daily Feels Like extrema survive caching while malformed extrema and windows are rejected',()=>{
 const row={...cached.daily[0],forecastEnd:'2026-11-16T06:00:00Z',temperatureApparentMax:19,temperatureApparentMin:0,temperatureApparentSource:'hourly' as const};
 const complete={...cached,daily:[row]};
 assert.deepEqual(parseCachedForecast(JSON.stringify(complete)),complete);
 for(const invalid of [{temperatureApparentMax:Infinity},{temperatureApparentMin:'0'},{temperatureApparentMin:20},{temperatureApparentSource:'native'},{temperatureApparentMin:undefined},{forecastEnd:'invalid'},{forecastEnd:conditions.time}]){
  assert.equal(parseCachedForecast({...complete,daily:[{...row,...invalid}]}),null);
 }
});

test('daily dew point averages require a finite value and the matching derived source marker',()=>{
 const row={...cached.daily[0],temperatureDewPoint:-15,temperatureDewPointAverage:0,temperatureDewPointAverageSource:'hourly-daytime' as const};
 const complete={...cached,daily:[row]};
 assert.deepEqual(parseCachedForecast(JSON.stringify(complete)),complete);
 for(const invalid of[{temperatureDewPointAverage:Infinity},{temperatureDewPointAverage:NaN},{temperatureDewPointAverage:'0'},{temperatureDewPointAverage:null},{temperatureDewPointAverage:undefined},{temperatureDewPointAverageSource:undefined},{temperatureDewPointAverageSource:'hourly'},{temperatureDewPointAverageSource:'native'}]){
  assert.equal(parseCachedForecast({...complete,daily:[{...row,...invalid}]}),null);
 }
 const old=parseCachedForecast({...cached,daily:[{...cached.daily[0],temperatureDewPoint:-15}]});
 assert.equal(old?.daily[0].temperatureDewPoint,-15);assert.equal(old?.daily[0].temperatureDewPointAverage,undefined);assert.equal(old?.daily[0].temperatureDewPointAverageSource,undefined);
});
