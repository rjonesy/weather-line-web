import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nightForecasts} from '../lib/night-forecast.ts';
import type {Conditions, Forecast} from '../lib/weather.ts';

const hour = 60 * 60 * 1000;
function hours(start: string, count: number, codes: string[] = ['Clear']): Conditions[] {
  return Array.from({length: count}, (_, index) => ({time: new Date(Date.parse(start) + index * hour).toISOString(), conditionCode: codes[index % codes.length], temperature: 10}));
}
function forecast(hourly: Conditions[], dates: string[] = ['2026-11-15T12:00:00Z']): Forecast {
  return {source: 'weatherkit', fetchedAt: '2026-11-15T12:00:00Z', current: hourly[0] || {time: dates[0], conditionCode: 'Clear', temperature: 10}, hourly, daily: dates.map(time => ({time, conditionCode: 'Rain', temperature: 20, temperatureMax: 20, temperatureMin: 10, overnightConditionCode: 'HeavyRain'}))};
}

test('night windows are 22:00 to next-day 05:00, with an exclusive ending hour', () => {
  const data = forecast(hours('2026-11-15T21:00:00Z', 9, ['Rain', 'Clear', 'Clear', 'Clear', 'Clear', 'Clear', 'Clear', 'Clear', 'Snow']));
  const [night] = nightForecasts(data, 'UTC');
  assert.deepEqual(night, {date: '2026-11-15', startTime: '2026-11-15T22:00:00.000Z', endTime: '2026-11-16T05:00:00.000Z', complete: true, conditionCode: 'Clear', hours: 7, hourCount: 7});
});

test('a missing hour or a truncated horizon never falls back to the daily or overnight condition', () => {
  const complete = hours('2026-11-15T22:00:00Z', 7);
  for (const hourly of [complete.filter((_, index) => index !== 3), complete.slice(0, 6), complete.slice(1), []]) {
    const [night] = nightForecasts(forecast(hourly), 'UTC');
    assert.equal(night.complete, false);
    assert.equal(night.conditionCode, undefined);
    assert.equal(night.hours, 7);
  }
});

test('full hourly horizon is used beyond the UI preview and rows remain aligned to daily dates', () => {
  const dates = Array.from({length: 10}, (_, index) => new Date(Date.UTC(2026, 10, 15 + index, 12)).toISOString());
  const nights = nightForecasts(forecast(hours('2026-11-15T00:00:00Z', 240), dates), 'UTC');
  assert.equal(nights.length, 10);
  assert.equal(nights.filter(night => night.complete).length, 9);
  assert.equal(nights[8].date, '2026-11-23');
  assert.equal(nights[8].conditionCode, 'Clear');
  assert.equal(nights[9].complete, false);
  assert.equal(nights[9].hourCount, 2);
  assert.equal(nights[9].conditionCode, undefined);
});

test('local daily dates and UTC bounds are correct across the international date line', () => {
  const [night] = nightForecasts(forecast(hours('2026-11-15T08:00:00Z', 7), ['2026-11-15T00:00:00Z']), 'Pacific/Kiritimati');
  assert.equal(night.date, '2026-11-15');
  assert.equal(night.startTime, '2026-11-15T08:00:00.000Z');
  assert.equal(night.endTime, '2026-11-15T15:00:00.000Z');
  assert.equal(night.complete, true);
});

test('spring-forward and fall-back nights cover six and eight elapsed hours', () => {
  const [spring] = nightForecasts(forecast(hours('2026-03-08T03:00:00Z', 6), ['2026-03-07T12:00:00Z']), 'America/New_York');
  assert.equal(spring.startTime, '2026-03-08T03:00:00.000Z');
  assert.equal(spring.endTime, '2026-03-08T09:00:00.000Z');
  assert.equal(spring.hours, 6); assert.equal(spring.hourCount, 6); assert.equal(spring.complete, true);
  const [fall] = nightForecasts(forecast(hours('2026-11-01T02:00:00Z', 8), ['2026-10-31T12:00:00Z']), 'America/New_York');
  assert.equal(fall.startTime, '2026-11-01T02:00:00.000Z');
  assert.equal(fall.endTime, '2026-11-01T10:00:00.000Z');
  assert.equal(fall.hours, 8); assert.equal(fall.hourCount, 8); assert.equal(fall.complete, true);
});

test('half-hour zone edges use elapsed-time weights instead of unweighted sample counts', () => {
  const data = forecast(hours('2026-11-15T16:00:00Z', 8, ['Cloudy', 'Cloudy', 'Cloudy', 'Rain', 'Rain', 'Rain', 'Clear', 'Clear']));
  const [night] = nightForecasts(data, 'Asia/Kolkata');
  assert.equal(night.startTime, '2026-11-15T16:30:00.000Z');
  assert.equal(night.endTime, '2026-11-15T23:30:00.000Z');
  assert.equal(night.hours, 7); assert.equal(night.hourCount, 8); assert.equal(night.complete, true);
  assert.equal(night.conditionCode, 'Rain'); // Rain 3h beats Cloudy 2.5h despite equal sample counts.
});

test('half-hour daylight-saving transitions retain their fractional elapsed duration', () => {
  const [night] = nightForecasts(forecast(hours('2026-10-03T11:00:00Z', 7), ['2026-10-03T12:00:00Z']), 'Australia/Lord_Howe');
  assert.equal(night.startTime, '2026-10-03T11:30:00.000Z');
  assert.equal(night.endTime, '2026-10-03T18:00:00.000Z');
  assert.equal(night.hours, 6.5); assert.equal(night.hourCount, 7); assert.equal(night.complete, true);
});

test('mode ties choose the earliest condition and duplicate samples do not skew the result', () => {
  const samples = hours('2026-11-15T22:00:00Z', 7, ['Cloudy', 'Cloudy', 'Cloudy', 'Rain', 'Rain', 'Rain', 'Clear']);
  const duplicate = {...samples[5]};
  const [night] = nightForecasts(forecast([...samples, duplicate].reverse()), 'UTC');
  assert.equal(night.complete, true); assert.equal(night.hourCount, 7); assert.equal(night.conditionCode, 'Cloudy');
});

test('an invalid condition code leaves a coverage gap rather than fabricating a dominant code', () => {
  const samples = hours('2026-11-15T22:00:00Z', 7);
  samples[3].conditionCode = '';
  const [night] = nightForecasts(forecast(samples), 'UTC');
  assert.equal(night.complete, false); assert.equal(night.conditionCode, undefined);
});
