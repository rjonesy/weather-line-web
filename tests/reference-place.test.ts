import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PLACE, REFERENCE, REFERENCE_PLACE, forecastDayForHour} from '../lib/weather.ts';

const parts = (time: string) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: REFERENCE_PLACE.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).formatToParts(new Date(time)).map(part => [part.type, part.value]));

test('the default live location is New York and illustrative data has a separate identity', () => {
  assert.equal(DEFAULT_PLACE.name, 'New York');
  assert.equal(DEFAULT_PLACE.id, 'new-york');
  assert.equal(DEFAULT_PLACE.timezone, 'America/New_York');
  assert.equal(DEFAULT_PLACE.countryCode, 'US');
  assert.equal(DEFAULT_PLACE.latitude, 40.7128);
  assert.equal(DEFAULT_PLACE.longitude, -74.006);
  assert.notEqual(REFERENCE_PLACE.id, DEFAULT_PLACE.id);
  assert.equal(REFERENCE_PLACE.name, DEFAULT_PLACE.name);
  assert.equal(REFERENCE.source, 'reference');
});

test('illustrative New York hours and solar times follow the location timezone', () => {
  assert.equal(parts(REFERENCE.current.time).hour, '09');
  assert.equal(Date.parse(REFERENCE.hourly[0].time), Date.parse(REFERENCE.current.time));
  for (let i = 0; i < REFERENCE.hourly.length; i++) {
    const hour = REFERENCE.hourly[i], localHour = Number(parts(hour.time).hour);
    assert.equal(hour.daylight, localHour >= 6 && localHour < 20);
    if (i) assert.equal(Date.parse(hour.time) - Date.parse(REFERENCE.hourly[i - 1].time), 3600000);
    assert.ok(forecastDayForHour(REFERENCE.daily, hour.time, REFERENCE_PLACE.timezone));
  }
  for (const day of REFERENCE.daily) {
    const localDay = parts(day.time);
    const sunrise = parts(day.sunrise!), sunset = parts(day.sunset!);
    assert.equal(sunrise.day, localDay.day);
    assert.equal(sunset.day, localDay.day);
    assert.equal(sunrise.hour, '05');
    assert.equal(sunset.hour, '20');
    assert.ok(Date.parse(day.sunrise!) < Date.parse(day.time));
    assert.ok(Date.parse(day.time) < Date.parse(day.sunset!));
  }
});
