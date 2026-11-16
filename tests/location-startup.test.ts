import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PLACE,type Place} from '../lib/weather.ts';
import {shouldSeedCurrentLocation} from '../lib/saved-places.ts';
const city:Place={...DEFAULT_PLACE,id:'searched-city',name:'Saved city'};
const gps:Place={...DEFAULT_PLACE,id:'current-location',name:'Current Location'};

test('first visit seeds GPS and a pending failed attempt resumes after New York was persisted',()=>{
 assert.equal(shouldSeedCurrentLocation(null,[DEFAULT_PLACE],false),true);
 assert.equal(shouldSeedCurrentLocation(JSON.stringify([DEFAULT_PLACE]),[DEFAULT_PLACE],true),true);
});
test('a deliberately saved city or legacy New York is not mistaken for pending startup',()=>{
 assert.equal(shouldSeedCurrentLocation(JSON.stringify([DEFAULT_PLACE]),[DEFAULT_PLACE],false),false);
 assert.equal(shouldSeedCurrentLocation(JSON.stringify([city]),[city],true),false);
});
test('empty lists and removed GPS are never automatically reinserted by a stale pending flag',()=>{
 assert.equal(shouldSeedCurrentLocation('[]',[],true),false);
 assert.equal(shouldSeedCurrentLocation(JSON.stringify([city]),[city],false),false);
});
test('existing GPS stays an update rather than a new startup seed',()=>{
 assert.equal(shouldSeedCurrentLocation(JSON.stringify([DEFAULT_PLACE,gps]),[DEFAULT_PLACE,gps],true),false);
});
