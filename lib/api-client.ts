/** The Pages build supplies a public API origin; the server build stays same-origin. */
export function apiUrl(path:string) {
  const configured=(import.meta.env as {VITE_WEATHER_API_URL?:string}).VITE_WEATHER_API_URL;
  const origin=typeof configured==='string'?configured.replace(/\/+$/,''):'';
  if(!path.startsWith('/api/'))throw new Error('Expected an app API path.');
  return `${origin}${path}`;
}
