import {DEFAULT_PLACE,type Place} from './weather.ts';

/** Migrate the old starter, preserving real cities, order and intentional emptiness. */
export function restoreSavedLocations(places: readonly Place[]): Place[] {
  const hasNewYork = places.some(place => place.id === DEFAULT_PLACE.id);
  let addedNewYork = hasNewYork;
  return places.flatMap(place => {
    if (place.id === 'reference-cupertino' || place.id === 'reference-new-york') {
      if (addedNewYork) return [];
      addedNewYork = true;
      return [{...DEFAULT_PLACE}];
    }
    return [place.id === 'current-location' ? {...place, name:'Current Location', region:''} : place];
  });
}

/** Update in the existing slot; new cities go at the end of the user's order. */
export function upsertSavedPlace(places: readonly Place[], place: Place): Place[] {
  let found = false;
  const next: Place[] = [];
  for (const saved of places) {
    if (saved.id !== place.id) next.push(saved);
    else if (!found) {next.push(place); found = true;}
  }
  if (!found) next.push(place);
  return next;
}

/** Move one slot without wrapping at either end or changing other cities' order. */
export function moveSavedPlace(places: readonly Place[], id: string, direction: -1 | 1): Place[] {
  const next = [...places], index = next.findIndex(place => place.id === id);
  if (index === -1) return next;
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Removing the final saved city intentionally leaves an empty list. */
export function removeSavedPlace(places: readonly Place[], id: string): Place[] {
  return places.filter(place => place.id !== id);
}

/** Background GPS refreshes cannot add a removed location or change its position. */
export function updateCurrentLocation(places: readonly Place[], current: Place): Place[] {
  return places.some(place => place.id === current.id) ? upsertSavedPlace(places, current) : [...places];
}
