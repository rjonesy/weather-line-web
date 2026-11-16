import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withDailyDewPoint} from '../lib/dew-point.ts';
import type {Conditions, Forecast} from '../lib/weather.ts';

const hour = 3_600_000;
function hours(start: string, values: (number | undefined)[]): Conditions[] {
  return values.map((temperatureDewPoint, index) => ({time: new Date(Date.parse(start) + index * hour).toISOString(), conditionCode: 'Clear', temperature: 20, temperatureDewPoint}));
}
function forecast(hourly: Conditions[], dates = ['2026-11-15T00:00:00Z']): Forecast {
  return {source: 'weatherkit', fetchedAt: '2026-11-15T12:00:00Z', current: {time: dates[0], conditionCode: 'Clear', temperature: 20, temperatureDewPoint: 999}, hourly, daily: dates.map(time => ({time, conditionCode: 'Clear', temperature: 20, temperatureMax: 25, temperatureMin: 10, temperatureDewPoint: 777}))};
}
const average = (data: Forecast, timezone = 'UTC') => withDailyDewPoint(data, timezone).daily[0].temperatureDewPointAverage;
const near = (actual: number | undefined, expected: number) => {assert.ok(actual !== undefined); assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);};

test('the daily mean includes exactly 05:00 through 21:59 and excludes extreme values on either side', () => {
  const data = forecast(hours('2026-11-15T04:00:00Z', [-999, ...Array.from({length: 17}, (_, index) => index + 1), 999]));
  const result = withDailyDewPoint(data, 'UTC');
  assert.equal(result.daily[0].temperatureDewPointAverage, 9);
  assert.equal(result.daily[0].temperatureDewPointAverageSource, 'hourly-daytime');
  assert.equal(result.daily[0].temperatureDewPoint, 777);
  assert.equal(result.current.temperatureDewPoint, 999);
  assert.equal(data.daily[0].temperatureDewPointAverage, undefined);
  assert.equal(result.hourly, data.hourly);
});

test('zero and negative dew points remain valid Celsius means without rounding', () => {
  assert.equal(average(forecast(hours('2026-11-15T05:00:00Z', Array(17).fill(0)))), 0);
  assert.equal(average(forecast(hours('2026-11-15T05:00:00Z', Array.from({length: 17}, (_, index) => index - 10)))), -2);
  const values = Array(17).fill(-2.25); values[0] = -1.5;
  near(average(forecast(hours('2026-11-15T05:00:00Z', values))), (-1.5 - 2.25 * 16) / 17);
});

test('first, middle, last, and invalid hours cannot become a partial or fallback average', () => {
  const complete = hours('2026-11-15T05:00:00Z', Array(17).fill(12));
  for (const hourly of [complete.slice(1), complete.slice(0, -1), complete.filter((_, index) => index !== 8), [],
    ...[undefined, NaN, Infinity, -Infinity, null].map(value => complete.map((row, index) => index === 8 ? {...row, temperatureDewPoint: value} as Conditions : row)),
  ]) {
    const result = withDailyDewPoint(forecast(hourly), 'UTC').daily[0];
    assert.equal(result.temperatureDewPointAverage, undefined);
    assert.equal(result.temperatureDewPointAverageSource, undefined);
  }
});

test('half-hour and quarter-hour local windows weight both partial UTC edge intervals', () => {
  const values = [0, ...Array(16).fill(10), 34];
  const data = forecast(hours('2026-11-14T23:00:00Z', values), ['2026-11-14T18:30:00Z']);
  near(average(data, 'Asia/Kolkata'), (0 * 0.5 + 10 * 16 + 34 * 0.5) / 17);
  const nepal = {...data, daily: [{...data.daily[0], time: '2026-11-14T18:15:00Z'}]};
  near(average(nepal, 'Asia/Kathmandu'), (0 * 0.75 + 10 * 16 + 34 * 0.25) / 17);
  assert.equal(average({...data, hourly: data.hourly.slice(1)}, 'Asia/Kolkata'), undefined);
});

test('DST changes resolve 05:00 and 22:00 wall clocks independently of local midnight', () => {
  for (const [timezone, day, start] of [
    ['America/New_York', '2026-03-08T05:00:00Z', '2026-03-08T08:00:00Z'],
    ['America/New_York', '2026-11-01T04:00:00Z', '2026-11-01T09:00:00Z'],
    ['Australia/Lord_Howe', '2026-10-03T13:30:00Z', '2026-10-03T17:00:00Z'],
  ]) {
    const data = forecast(hours(start, [-999, ...Array(17).fill(20), 999]), [day]);
    assert.equal(average(data, timezone), 20);
  }
});

test('the local date remains correct across UTC midnight and the international date line', () => {
  const data = forecast(hours('2026-11-14T15:00:00Z', Array(17).fill(8)), ['2026-11-14T10:00:00Z']);
  assert.equal(average(data, 'Pacific/Kiritimati'), 8);
  assert.equal(average(data, 'UTC'), undefined);
});

test('overlapping and duplicate samples cannot inflate weighting or cover a missing interval elsewhere', () => {
  const hourly = hours('2026-11-15T05:00:00Z', Array.from({length: 17}, (_, index) => index));
  const duplicate = {...hourly[8], temperatureDewPoint: 999};
  const overlap = {...hourly[8], time: '2026-11-15T13:30:00Z', temperatureDewPoint: 999};
  near(average(forecast([...hourly, duplicate].reverse())), (136 - 8 + 999) / 17); // First duplicate in input order wins.
  near(average(forecast([...hourly, duplicate])), 8);
  // This overlap contributes only its genuinely uncovered final half-hour.
  near(average(forecast([...hourly, overlap])), (136 - 9 * 0.5 + 999 * 0.5) / 17);
  assert.equal(average(forecast([...hourly.filter((_, index) => index !== 3), duplicate])), undefined);
});

test('all ten local daily rows use the full forecast horizon instead of a 72-hour preview', () => {
  const values = Array.from({length: 248}, (_, index) => Math.floor(index / 24) + index % 24);
  const dates = Array.from({length: 10}, (_, index) => new Date(Date.UTC(2026, 10, 15 + index)).toISOString());
  const data = forecast(hours('2026-11-15T00:00:00Z', values), dates);
  const result = withDailyDewPoint(data, 'UTC');
  result.daily.forEach((day, index) => {assert.equal(day.temperatureDewPointAverage, index + 13); assert.equal(day.temperatureDewPointAverageSource, 'hourly-daytime');});
  assert.equal(result.daily.length, 10);
});

test('a finite tagged complete average survives upcoming-only cache data, while untagged or invalid values do not', () => {
  const data = forecast([]);
  for (const value of [0, -5.25, 12]) {
    const cached = {...data, daily: [{...data.daily[0], temperatureDewPointAverage: value, temperatureDewPointAverageSource: 'hourly-daytime' as const}]};
    const result = withDailyDewPoint(cached, 'UTC');
    assert.equal(result.daily[0], cached.daily[0]); assert.equal(result.daily[0].temperatureDewPointAverage, value);
  }
  for (const fields of [{temperatureDewPointAverage: 5}, {temperatureDewPointAverage: NaN, temperatureDewPointAverageSource: 'hourly-daytime'}, {temperatureDewPointAverage: 5, temperatureDewPointAverageSource: 'daily'}]) {
    const cached = {...data, daily: [{...data.daily[0], ...fields}]} as Forecast;
    assert.equal(average(cached), undefined);
    assert.equal(withDailyDewPoint(cached, 'UTC').daily[0].temperatureDewPointAverageSource, undefined);
    assert.equal(cached.daily[0].temperatureDewPointAverage, fields.temperatureDewPointAverage);
  }
});

test('unresolvable dates and zones stay unavailable without throwing or using a current/daily reading', () => {
  const data = forecast(hours('2026-11-15T05:00:00Z', Array(17).fill(10)));
  assert.equal(average(data, 'Moon/Sea'), undefined);
  assert.equal(average({...data, daily: [{...data.daily[0], time: 'invalid'}]}), undefined);
});
