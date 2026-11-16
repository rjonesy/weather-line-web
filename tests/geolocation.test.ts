import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectLocation, LocationDetectionError, type GeolocationSource} from '../lib/geolocation.ts';

const fix = (latitude = 40.7128, longitude = -74.006, accuracy = 12) => Object.freeze({
  coords: Object.freeze({latitude, longitude, accuracy}), timestamp: 12345,
}) as unknown as GeolocationPosition;
const error = (code: number) => ({code}) as GeolocationPositionError;
type Attempt = {success: PositionCallback; failure: PositionErrorCallback; options?: PositionOptions};
function provider() {
  const attempts: Attempt[] = [];
  const geo: GeolocationSource = {
    getCurrentPosition(success, failure, options) {
      assert.equal(this, geo, 'preserve the browser method receiver');
      assert.ok(failure);
      attempts.push({success, failure, options});
    },
  };
  return {geo, attempts};
}
const kind = (expected: string) => (value: unknown) => value instanceof LocationDetectionError && value.kind === expected && Boolean(value.message);

test('a fresh precise position returns unchanged and does not request a fallback', async () => {
  const {geo, attempts} = provider();
  const promise = detectLocation({geolocation: geo, secureContext: true});
  assert.deepEqual(attempts[0].options, {enableHighAccuracy:true, timeout:8000, maximumAge:0});
  const position = fix(); attempts[0].success(position);
  assert.equal(await promise, position); assert.equal(attempts.length, 1);
});

test('precise timeout and unavailable errors each recover through one coarse recent fix', async () => {
  for (const code of [2, 3]) {
    const {geo, attempts} = provider();
    const promise = detectLocation({geolocation:geo});
    attempts[0].failure(error(code));
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[1].options, {enableHighAccuracy:false, timeout:12000, maximumAge:60000});
    const coarse = fix(51.5074, -0.1278, 180); attempts[1].success(coarse);
    assert.equal(await promise, coarse);
  }
});

test('permission denial is specific and never launches another permission request', async () => {
  const {geo, attempts} = provider(); const promise = detectLocation({geolocation:geo});
  attempts[0].failure(error(1));
  await assert.rejects(promise, kind('permission')); assert.equal(attempts.length, 1);
  attempts[0].success(fix()); assert.equal(attempts.length, 1);
});

test('fallback failures distinguish timeout, unavailability and permission denial', async () => {
  for (const [code, expected] of [[3,'timeout'],[2,'unavailable'],[1,'permission']] as const) {
    const {geo, attempts} = provider(); const promise = detectLocation({geolocation:geo});
    attempts[0].failure(error(3)); attempts[1].failure(error(code));
    await assert.rejects(promise, kind(expected)); assert.equal(attempts.length, 2);
  }
});

test('invalid precise coordinates fall back; invalid fallback positions are rejected', async () => {
  for (const invalid of [fix(NaN), fix(91), fix(40, 181), fix(40, -74, -1), null]) {
    const {geo, attempts} = provider(); const promise = detectLocation({geolocation:geo});
    attempts[0].success(invalid as GeolocationPosition);
    assert.equal(attempts.length, 2);
    attempts[1].success(invalid as GeolocationPosition);
    await assert.rejects(promise, kind('unavailable'));
  }
});

test('late precise callbacks cannot override the coarse request or its permission result', async () => {
  const {geo, attempts} = provider(); const promise = detectLocation({geolocation:geo});
  attempts[0].failure(error(2));
  attempts[0].success(fix(30, -97)); attempts[0].failure(error(1));
  const coarse = fix(40, -74); attempts[1].success(coarse);
  assert.equal(await promise, coarse); assert.equal(attempts.length, 2);
});

test('cancellation before starting and during either attempt stays an AbortError and ignores late callbacks', async () => {
  for (const stage of ['before','precise','coarse']) {
    const {geo, attempts} = provider(), controller = new AbortController();
    if (stage === 'before') controller.abort();
    const promise = detectLocation({geolocation:geo, signal:controller.signal});
    if (stage === 'coarse') attempts[0].failure(error(3));
    if (stage !== 'before') controller.abort();
    await assert.rejects(promise, {name:'AbortError'});
    const count = attempts.length;
    for (const attempt of attempts) {attempt.success(fix()); attempt.failure(error(2));}
    assert.equal(attempts.length, count);
    if (stage === 'before') assert.equal(count, 0);
  }
});

test('broken providers are bounded by watchdogs and old callbacks cannot settle the result', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {geo, attempts} = provider();
  const promise = detectLocation({geolocation:geo}, {preciseTimeoutMs:8, coarseTimeoutMs:12, watchdogGraceMs:1});
  const rejected = assert.rejects(promise, kind('timeout'));
  t.mock.timers.tick(8); assert.equal(attempts.length, 1);
  t.mock.timers.tick(1); assert.equal(attempts.length, 2);
  attempts[0].success(fix());
  t.mock.timers.tick(13); await rejected;
  attempts[1].success(fix()); assert.equal(attempts.length, 2);
});

test('watchdog grants permission-prompt grace and clears itself on success', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {geo, attempts} = provider(); const promise = detectLocation({geolocation:geo});
  t.mock.timers.tick(12000); assert.equal(attempts.length, 1, 'native deadline does not cancel a normal pending consent prompt');
  const position = fix(); attempts[0].success(position); assert.equal(await promise, position);
  t.mock.timers.tick(120000); assert.equal(attempts.length, 1);
});

test('synchronous provider exceptions can recover, while security exceptions do not retry', async () => {
  let calls = 0; const position = fix();
  const geo: GeolocationSource = {getCurrentPosition(success) {calls++; if (calls === 1) throw Error('provider not ready'); success(position);}};
  assert.equal(await detectLocation({geolocation:geo}), position); assert.equal(calls, 2);
  let deniedCalls = 0;
  const denied: GeolocationSource = {getCurrentPosition() {deniedCalls++; throw new DOMException('blocked', 'SecurityError');}};
  await assert.rejects(detectLocation({geolocation:denied}), kind('permission')); assert.equal(deniedCalls, 1);
});

test('unsupported and insecure contexts fail without querying the provider', async () => {
  await assert.rejects(detectLocation({}), kind('unsupported'));
  const {geo, attempts} = provider();
  await assert.rejects(detectLocation({geolocation:geo, secureContext:false}), kind('insecure'));
  assert.equal(attempts.length, 0);
});
