import type {Place} from './weather.ts';

/** Addresses are display-only; never replace the GPS fix used for weather. */
export function locationCoordinateKey(place: Pick<Place,'latitude'|'longitude'>): string {
  return `${place.latitude},${place.longitude}`;
}

export function streetAddressFromResponse(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('address' in value)) return null;
  const address = (value as {address: unknown}).address;
  if (typeof address !== 'string') return null;
  const text = address.trim();
  if (!text || text.length > 200 || /[\r\n\u0000-\u001f]/.test(text)
    || /°|^-?\d+(?:\.\d+)?\s*[NS]?\s*[,;\s]\s*-?\d+(?:\.\d+)?\s*[EW]?$/i.test(text)) return null;
  return text;
}

export async function loadStreetAddress(url: string, place: Pick<Place,'latitude'|'longitude'>, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<string | null> {
  const response = await fetcher(url, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({latitude:place.latitude,longitude:place.longitude}),
    cache:'no-store', credentials:'omit', signal,
  });
  if (!response.ok) return null;
  return streetAddressFromResponse(await response.json());
}
