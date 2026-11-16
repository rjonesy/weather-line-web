import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moveSavedPlace, removeSavedPlace, restoreSavedLocations, updateCurrentLocation, upsertSavedPlace} from '../lib/saved-places.ts';
import {parsePlaces} from '../lib/preferences.ts';
import {DEFAULT_PLACE, type Place} from '../lib/weather.ts';

const austin: Place = {id: 'austin', name: 'Austin', region: 'Texas', latitude: 30.2672, longitude: -97.7431, timezone: 'America/Chicago'};
const london: Place = {id: 'london', name: 'London', region: 'England', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London'};
const tokyo: Place = {id: 'tokyo', name: 'Tokyo', region: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo'};
const current: Place = {...austin, id: 'current-location', name: 'Current Location'};
const ids = (places: readonly Place[]) => places.map(place => place.id);

test('upserting updates the existing city in place and appends new cities without duplicates', () => {
  const saved = Object.freeze([austin, london, tokyo]);
  const updated = {...london, name: 'London home', latitude: 51.51};
  const next = upsertSavedPlace(saved, updated);
  assert.deepEqual(ids(next), ['austin', 'london', 'tokyo']);
  assert.equal(next[1], updated); assert.equal(next[0], austin); assert.equal(next[2], tokyo);
  const added = upsertSavedPlace(next, current);
  assert.deepEqual(ids(added), ['austin', 'london', 'tokyo', 'current-location']);
  assert.equal(upsertSavedPlace(added, {...current, longitude: -97.7}).filter(place => place.id === current.id).length, 1);
  assert.deepEqual(ids(saved), ['austin', 'london', 'tokyo']);
});

test('an upsert collapses duplicate records for its own ID without moving that city', () => {
  const next = upsertSavedPlace([austin, london, tokyo, {...london, name: 'Duplicate'}], {...london, name: 'Updated'});
  assert.deepEqual(ids(next), ['austin', 'london', 'tokyo']);
  assert.equal(next[1].name, 'Updated');
});

test('moving a city is stable, adjacent and clamped at both ends', () => {
  const saved = Object.freeze([austin, london, tokyo]);
  assert.deepEqual(ids(moveSavedPlace(saved, 'london', -1)), ['london', 'austin', 'tokyo']);
  assert.deepEqual(ids(moveSavedPlace(saved, 'london', 1)), ['austin', 'tokyo', 'london']);
  assert.deepEqual(ids(moveSavedPlace(saved, 'austin', -1)), ids(saved));
  assert.deepEqual(ids(moveSavedPlace(saved, 'tokyo', 1)), ids(saved));
  assert.deepEqual(ids(moveSavedPlace(saved, 'missing', 1)), ids(saved));
  assert.deepEqual(ids(saved), ['austin', 'london', 'tokyo']);
});

test('background Current Location updates preserve the user-selected slot and other cities', () => {
  const saved = Object.freeze([london, current, tokyo]);
  const moved = {...current, latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York'};
  const next = updateCurrentLocation(saved, moved);
  assert.deepEqual(ids(next), ['london', 'current-location', 'tokyo']);
  assert.equal(next[1].latitude, 40.7128); assert.equal(next[1].longitude, -74.006);
  assert.equal(next[0], london); assert.equal(next[2], tokyo);
  assert.equal(saved[1].latitude, current.latitude);
});

test('a removed Current Location stays removed when a delayed or later GPS update arrives', () => {
  const withoutGps = removeSavedPlace([london, current, tokyo], current.id);
  assert.deepEqual(ids(updateCurrentLocation(withoutGps, {...current, latitude: 40.7})), ['london', 'tokyo']);
  assert.deepEqual(updateCurrentLocation([], current), []);
});

test('removing the final city remains empty after persistence and all operations tolerate that state', () => {
  const empty = removeSavedPlace([austin], austin.id);
  assert.deepEqual(empty, []);
  assert.deepEqual(parsePlaces(JSON.stringify(empty), [austin]), []);
  assert.deepEqual(moveSavedPlace(empty, austin.id, 1), []);
  assert.deepEqual(removeSavedPlace(empty, austin.id), []);
  assert.deepEqual(upsertSavedPlace(empty, tokyo), [tokyo]);
});

test('restoring GPS records clears stale display addresses without changing forecast coordinates or order', () => {
  for (const region of ['Congress Avenue, Austin', '30.2672° N, 97.7431° W', 'Your location']) {
    const gps = Object.freeze({...current, name: 'Old GPS title', region, countryCode: 'US'});
    const saved = Object.freeze([london, gps, tokyo]);
    const next = restoreSavedLocations(saved);
    assert.deepEqual(ids(next), ['london', 'current-location', 'tokyo']);
    assert.deepEqual(next[1], {...gps, name: 'Current Location', region: ''});
    assert.equal(next[1].latitude, gps.latitude); assert.equal(next[1].longitude, gps.longitude);
    assert.equal(next[1].timezone, gps.timezone); assert.equal(next[1].countryCode, 'US');
    assert.equal(next[0], london); assert.equal(next[2], tokyo); assert.equal(gps.region, region);
  }
});

test('only reserved demo IDs become live New York, preserving real searched cities and the placeholder slot', () => {
  const demo: Place = {...austin, id: 'reference-cupertino', name: 'Apple Park', region: 'Cupertino, CA', latitude: 37.3349, longitude: -122.009, timezone: 'America/Los_Angeles'};
  const applePark = {...demo, id: '1234567'};
  const cupertino = {...demo, id: '7654321', name: 'Cupertino'};
  const nearby = {...demo, id: 'reference-cupertino-user', latitude: 37.335};
  const next = restoreSavedLocations([applePark, demo, cupertino, nearby]);
  assert.deepEqual(ids(next), ['1234567', 'new-york', '7654321', 'reference-cupertino-user']);
  assert.equal(next[0], applePark); assert.deepEqual(next[1], DEFAULT_PLACE);
  assert.equal(next[2], cupertino); assert.equal(next[3], nearby);
  assert.deepEqual(restoreSavedLocations([{...demo, id:'reference-new-york'}]), [DEFAULT_PLACE]);
});

test('migration preserves intentional emptiness, removals and reordered cities without adding GPS', () => {
  assert.deepEqual(restoreSavedLocations([]), []);
  assert.deepEqual(restoreSavedLocations([{...austin, id: 'reference-cupertino'}]), [DEFAULT_PLACE]);
  const removed = removeSavedPlace([london, current, tokyo], current.id);
  assert.deepEqual(ids(restoreSavedLocations(removed)), ['london', 'tokyo']);
  const ordered = moveSavedPlace([london, current, tokyo], current.id, 1);
  const restored = restoreSavedLocations(ordered);
  assert.deepEqual(ids(restored), ['london', 'tokyo', 'current-location']);
  assert.deepEqual(restoreSavedLocations(restored), restored);
});

test('migration never duplicates or moves an existing New York save, including mixed legacy demos', () => {
  const demo = {...austin, id:'reference-cupertino'};
  const existing = Object.freeze({...DEFAULT_PLACE, name:'New York home'});
  for (const before of [
    Object.freeze([demo, london, existing, {...demo, id:'reference-new-york'}, tokyo]),
    Object.freeze([london, existing, demo, tokyo]),
  ]) {
    const next = restoreSavedLocations(before);
    assert.deepEqual(ids(next), ['london', 'new-york', 'tokyo']);
    assert.equal(next[1], existing);
    assert.deepEqual(restoreSavedLocations(next), next);
  }
  const demosOnly = Object.freeze([demo, {...demo, id:'reference-new-york'}, demo]);
  assert.deepEqual(restoreSavedLocations(demosOnly), [DEFAULT_PLACE]);
  assert.equal(demosOnly.length, 3);
});
