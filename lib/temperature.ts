import type {Conditions, Day, Forecast} from './weather.ts';

const hour = 3_600_000;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Never substitute an actual temperature under a Feels Like label. */
export function airTemperature(conditions: Conditions, feelsLike: boolean): number | undefined {
  const value = feelsLike ? conditions.temperatureApparent : conditions.temperature;
  return finite(value) ? value : undefined;
}

export function dailyTemperatures(day: Day, feelsLike: boolean): {high?: number; low?: number} {
  const high = feelsLike ? day.temperatureApparentMax : day.temperatureMax;
  const low = feelsLike ? day.temperatureApparentMin : day.temperatureMin;
  return {high: finite(high) ? high : undefined, low: finite(low) ? low : undefined};
}

function dateKey(formatter: Intl.DateTimeFormat, time: number): string {
  const parts = formatter.formatToParts(new Date(time));
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}

function nextDate(key: string, dayOffset = 1): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + dayOffset)).toISOString().slice(0, 10);
}

function dateBoundary(formatter: Intl.DateTimeFormat, key: string): number {
  // Find the first real instant in this local calendar date. Comparing dates
  // rather than adding 24h handles DST and jurisdictions that change at midnight.
  const nominal = Date.parse(`${key}T00:00:00Z`);
  let before = nominal - 36 * hour, after = nominal + 36 * hour;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (dateKey(formatter, middle) < key) before = middle;
    else after = middle;
  }
  return after;
}

function dateFormatter(timezone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

/** Local midnight after a calendar-day offset, including DST/midnight changes. */
export function localDayStart(time: string | number | Date, timezone: string, dayOffset = 0): string | undefined {
  const instant = new Date(time).getTime();
  if (!Number.isFinite(instant) || !Number.isInteger(dayOffset)) return undefined;
  try {
    const formatter = dateFormatter(timezone);
    const key = nextDate(dateKey(formatter, instant), dayOffset);
    return new Date(dateBoundary(formatter, key)).toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Derive sampled daily Feels Like extrema from every available hourly interval.
 * A sample covers [time,time+1h), clipped at local midnight; this includes partial
 * edge hours in fractional-offset zones. Only a complete, gap-free local day is
 * eligible, with a finite apparent value for every contributing interval.
 * These are extrema of Apple's hourly forecast, not native daily extrema.
 */
export function withDailyApparentTemperatures(data: Forecast, timezone: string): Forecast {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = dateFormatter(timezone);
  } catch {
    return data;
  }
  const samples = data.hourly.map((conditions, index) => ({
    time: Date.parse(conditions.time), value: conditions.temperatureApparent, index,
  })).filter(sample => Number.isFinite(sample.time)).sort((a, b) => a.time - b.time || a.index - b.index);
  const daily = data.daily.map(day => {
    // Valid existing values survive recomputation from an upcoming-only cache.
    if (day.temperatureApparentSource === 'hourly' && finite(day.temperatureApparentMax)
      && finite(day.temperatureApparentMin) && day.temperatureApparentMin <= day.temperatureApparentMax) return day;
    const time = Date.parse(day.time);
    if (!Number.isFinite(time)) return day;
    const key = dateKey(formatter, time);
    const providerEnd = Date.parse(day.forecastEnd || '');
    const nativeWindow = Number.isFinite(providerEnd) && providerEnd > time;
    const start = nativeWindow ? time : dateBoundary(formatter, key);
    const end = nativeWindow ? providerEnd : dateBoundary(formatter, nextDate(key));
    let cursor = start, gap = false, valid = true, high = -Infinity, low = Infinity;
    for (const sample of samples) {
      const left = Math.max(start, sample.time), right = Math.min(end, sample.time + hour);
      if (right <= left || right <= cursor) continue;
      if (left > cursor) gap = true;
      cursor = right;
      if (!finite(sample.value)) valid = false;
      else {high = Math.max(high, sample.value); low = Math.min(low, sample.value);}
    }
    if (!gap && valid && end > start && cursor >= end && finite(high) && finite(low)) {
      return {...day, temperatureApparentMax: high, temperatureApparentMin: low, temperatureApparentSource: 'hourly' as const};
    }
    return day;
  });
  return {...data, daily};
}
