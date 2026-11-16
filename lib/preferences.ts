import type {Conditions, Day, Forecast, Place, WeatherAlert} from './weather.ts';

export type Theme = 'auto' | 'light' | 'dark' | 'black' | 'dracula' | 'solarized' | 'clear-sky';
export type Preferences = {
  theme: Theme;
  unit: 'F' | 'C';
  wind: 'mph' | 'km/h';
  rain: 'in' | 'mm';
  feelsLike: boolean;
  nightConditions: boolean;
};

const themes: readonly Theme[] = ['auto', 'light', 'dark', 'black', 'dracula', 'solarized', 'clear-sky'];

function decode(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return undefined; }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Recover each preference independently so an old or damaged field cannot break the UI. */
export function parsePreferences(value: unknown, defaults: Preferences): Preferences {
  const parsed = decode(value);
  if (!record(parsed)) return {...defaults};
  return {
    theme: typeof parsed.theme === 'string' && themes.includes(parsed.theme as Theme) ? parsed.theme as Theme : defaults.theme,
    unit: parsed.unit === 'F' || parsed.unit === 'C' ? parsed.unit : defaults.unit,
    wind: parsed.wind === 'mph' || parsed.wind === 'km/h' ? parsed.wind : defaults.wind,
    rain: parsed.rain === 'in' || parsed.rain === 'mm' ? parsed.rain : defaults.rain,
    feelsLike: typeof parsed.feelsLike === 'boolean' ? parsed.feelsLike : defaults.feelsLike,
    nightConditions: typeof parsed.nightConditions === 'boolean' ? parsed.nightConditions : defaults.nightConditions,
  };
}

function validTimezone(value: unknown): value is string {
  // Intl also accepts fixed-offset strings in some browsers. Saved cities need an
  // IANA zone so their local times continue to follow daylight-saving changes.
  if (typeof value !== 'string' || !value || value !== value.trim() || /^[+-]/.test(value)) return false;
  try { new Intl.DateTimeFormat('en-US', {timeZone: value}); return true; } catch { return false; }
}

function parsePlace(value: unknown): Place | undefined {
  if (!record(value)
    || typeof value.id !== 'string' || !value.id.trim()
    || typeof value.name !== 'string' || !value.name.trim()
    || typeof value.region !== 'string'
    || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90
    || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180
    || !validTimezone(value.timezone)
    || (value.countryCode !== undefined && (typeof value.countryCode !== 'string' || !/^[a-z]{2}$/i.test(value.countryCode)))) return undefined;
  return {
    id: value.id.trim(),
    name: value.name.trim(),
    region: value.region.trim(),
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: value.timezone,
    ...(typeof value.countryCode === 'string' ? {countryCode: value.countryCode.toUpperCase()} : {}),
  };
}

function validPlaces(value: unknown): Place[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const candidate of value) {
    const place = parsePlace(candidate);
    if (place && !seen.has(place.id)) {
      seen.add(place.id);
      places.push(place);
    }
  }
  return places;
}

/** Preserve an intentionally empty list; recover the fallback only for unusable storage. */
export function parsePlaces(value: unknown, fallback: readonly Place[]): Place[] {
  const decoded = decode(value);
  if (Array.isArray(decoded) && decoded.length === 0) return [];
  const places = validPlaces(decoded);
  return places.length ? places : validPlaces(fallback);
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function httpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

const conditionNumbers = ['temperatureApparent', 'temperatureDewPoint', 'humidity', 'cloudCover', 'windSpeed', 'windGust', 'windDirection', 'uvIndex', 'precipitationChance', 'precipitationAmount'] as const;

function parseConditions(value: unknown): Conditions | null {
  if (!record(value) || !validDate(value.time) || typeof value.conditionCode !== 'string' || !value.conditionCode.trim() || !finite(value.temperature)) return null;
  const conditions: Conditions = {time: value.time, conditionCode: value.conditionCode, temperature: value.temperature};
  for (const key of conditionNumbers) {
    if (value[key] === undefined) continue;
    if (!finite(value[key])) return null;
    conditions[key] = value[key];
  }
  if (value.daylight !== undefined) {
    if (typeof value.daylight !== 'boolean') return null;
    conditions.daylight = value.daylight;
  }
  return conditions;
}

function parseDay(value: unknown): Day | null {
  const conditions = parseConditions(value);
  if (!conditions || !record(value) || !finite(value.temperatureMax) || !finite(value.temperatureMin)) return null;
  const day: Day = {...conditions, temperatureMax: value.temperatureMax, temperatureMin: value.temperatureMin};
  for (const key of ['temperatureApparentMax', 'temperatureApparentMin'] as const) {
    if (value[key] === undefined) continue;
    if (!finite(value[key])) return null;
    day[key] = value[key];
  }
  if (day.temperatureApparentMax !== undefined && day.temperatureApparentMin !== undefined
    && day.temperatureApparentMin > day.temperatureApparentMax) return null;
  if (value.temperatureApparentSource !== undefined) {
    if (value.temperatureApparentSource !== 'hourly' || day.temperatureApparentMax === undefined || day.temperatureApparentMin === undefined) return null;
    day.temperatureApparentSource = value.temperatureApparentSource;
  }
  if(value.temperatureDewPointAverage!==undefined||value.temperatureDewPointAverageSource!==undefined){
    if(!finite(value.temperatureDewPointAverage)||value.temperatureDewPointAverageSource!=='hourly-daytime')return null;
    day.temperatureDewPointAverage=value.temperatureDewPointAverage;
    day.temperatureDewPointAverageSource=value.temperatureDewPointAverageSource;
  }
  for (const key of ['sunrise', 'sunset', 'forecastEnd'] as const) {
    if (value[key] === undefined) continue;
    if (!validDate(value[key])) return null;
    day[key] = value[key];
  }
  if(day.forecastEnd!==undefined&&Date.parse(day.forecastEnd)<=Date.parse(day.time))return null;
  for(const key of ['summary','daytimeConditionCode','overnightConditionCode'] as const){if(value[key]!==undefined){if(typeof value[key]!=='string'||!value[key].trim())return null;day[key]=value[key];}}
  return day;
}

/** A cache can replace a network response only when every rendered field is safe. */
export function parseCachedForecast(value: unknown): Forecast | null {
  const parsed = decode(value);
  if (!record(parsed) || parsed.source !== 'weatherkit' || !validDate(parsed.fetchedAt)
    || !Array.isArray(parsed.hourly) || !parsed.hourly.length
    || !Array.isArray(parsed.daily) || !parsed.daily.length) return null;
  const current = parseConditions(parsed.current);
  const hourly = parsed.hourly.map(parseConditions);
  const daily = parsed.daily.map(parseDay);
  if (!current || hourly.some(hour => !hour) || daily.some(day => !day)) return null;
  const forecast: Forecast = {source: 'weatherkit', fetchedAt: parsed.fetchedAt, current, hourly: hourly as Conditions[], daily: daily as Day[]};

  if (parsed.minutes !== undefined) {
    if (!Array.isArray(parsed.minutes)) return null;
    forecast.minutes = [];
    for (const minute of parsed.minutes) {
      if (!record(minute) || !validDate(minute.startTime) || !finite(minute.precipitationIntensity) || !finite(minute.precipitationChance)) return null;
      forecast.minutes.push({startTime: minute.startTime, precipitationIntensity: minute.precipitationIntensity, precipitationChance: minute.precipitationChance});
    }
  }
  if (parsed.alerts !== undefined) {
    if (!Array.isArray(parsed.alerts)) return null;
    forecast.alerts = [];
    for (const alert of parsed.alerts) {
      if (!record(alert) || typeof alert.id !== 'string' || !alert.id.trim() || typeof alert.summary !== 'string' || !alert.summary.trim()
        || (alert.detailsUrl !== undefined && !httpsUrl(alert.detailsUrl))) return null;
      const item:WeatherAlert={id:alert.id,summary:alert.summary,...(alert.detailsUrl!==undefined?{detailsUrl:alert.detailsUrl as string}:{})};
      for(const key of ['effectiveTime','expireTime','issuedTime'] as const){if(alert[key]!==undefined){if(!validDate(alert[key]))return null;item[key]=alert[key];}}
      for(const key of ['severity','source','areaName'] as const){if(alert[key]!==undefined){if(typeof alert[key]!=='string')return null;item[key]=alert[key];}}
      forecast.alerts.push(item);
    }
  }
  if(parsed.alertsStatus!==undefined){if(!['available','unavailable','error'].includes(String(parsed.alertsStatus)))return null;forecast.alertsStatus=parsed.alertsStatus as Forecast['alertsStatus'];if(forecast.alertsStatus==='available'&&!Array.isArray(parsed.alerts))return null;}
  if (parsed.attribution !== undefined) {
    if (!record(parsed.attribution)) return null;
    forecast.attribution = {};
    for (const key of ['legalPageUrl', 'logoLightURL', 'logoDarkURL'] as const) {
      if (parsed.attribution[key] === undefined) continue;
      if (!httpsUrl(parsed.attribution[key])) return null;
      forecast.attribution[key] = parsed.attribution[key];
    }
  }
  return forecast;
}
