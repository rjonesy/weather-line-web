import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadStreetAddress, locationCoordinateKey, streetAddressFromResponse} from '../lib/current-location.ts';

const gps = Object.freeze({latitude:40.7128, longitude:-74.006});

test('street addresses are trimmed without losing house numbers, accents or international formatting', () => {
  for (const address of ['123 Main Street', '80, rue de Rivoli', '1-2-3 千代田', '12 São João Avenue']) {
    assert.equal(streetAddressFromResponse({address:`  ${address}  `}), address);
  }
});

test('address parsing rejects missing, malformed and coordinate-only responses', () => {
  for (const value of [null, [], '123 Main Street', {}, {address:42}, {address:''}, {address:'\t '},
    {address:'x'.repeat(201)}, {address:'123 Main\nStreet'}, {address:'12\u0000 Main'},
    {address:'40.7128, -74.006'}, {address:'40, -74'}, {address:'40.7128° N, 74.006° W'},
    {address:'40.7128 N, 74.006 W'}, {address:'40.7128 -74.006'}]) {
    assert.equal(streetAddressFromResponse(value), null, JSON.stringify(value));
  }
});

test('address requests keep precise coordinates out of the URL and browser cache', async () => {
  const controller = new AbortController();
  let requested = false;
  const fetcher: typeof fetch = async (input, init) => {
    requested = true;
    assert.equal(input, '/api/address');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.signal, controller.signal);
    assert.deepEqual(JSON.parse(String(init?.body)), gps);
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    return Response.json({address:'123 Main Street'});
  };
  assert.equal(await loadStreetAddress('/api/address', gps, controller.signal, fetcher), '123 Main Street');
  assert.ok(requested);
  assert.deepEqual(gps, {latitude:40.7128, longitude:-74.006});
});

test('failed services never turn error text or coordinates into an address', async () => {
  const signal = new AbortController().signal;
  assert.equal(await loadStreetAddress('/api/address', gps, signal, async () => Response.json({address:'40.7128, -74.006'}, {status:503})), null);
  assert.equal(await loadStreetAddress('/api/address', gps, signal, async () => Response.json({address:'40.7128, -74.006'})), null);
  await assert.rejects(loadStreetAddress('/api/address', gps, signal, async () => {throw new Error('offline');}), /offline/);
  await assert.rejects(loadStreetAddress('/api/address', gps, signal, async () => new Response('not json')), SyntaxError);
});

test('a cancelled address request remains cancelled and display matching distinguishes moved GPS fixes', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadStreetAddress('/api/address', gps, controller.signal, async (_input, init) => {
    init?.signal?.throwIfAborted();
    return Response.json({address:'123 Main Street'});
  }), {name:'AbortError'});
  assert.equal(locationCoordinateKey(gps), locationCoordinateKey({...gps}));
  assert.notEqual(locationCoordinateKey(gps), locationCoordinateKey({...gps, latitude:gps.latitude+0.0001}));
});
