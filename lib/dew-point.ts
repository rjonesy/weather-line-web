import type {Day, Forecast} from './weather.ts';

const hour = 3_600_000;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function localParts(formatter: Intl.DateTimeFormat, time: number) {
  const parts = formatter.formatToParts(new Date(time));
  const get = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return {year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second')};
}

function wallTime(formatter: Intl.DateTimeFormat, time: number) {
  const parts = localParts(formatter, time);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function localInstant(formatter: Intl.DateTimeFormat, date: {year: number; month: number; day: number}, localHour: number): number {
  const target = Date.UTC(date.year, date.month - 1, date.day, localHour);
  // Resolve each clock boundary independently. Adding elapsed hours to midnight
  // gives the wrong 05:00/22:00 boundaries on days with an offset change.
  const offsets = new Set([-36, -18, 0, 18, 36].map(delta => {
    const probe = target + delta * hour;
    return wallTime(formatter, probe) - probe;
  }));
  const candidates = [...offsets].map(offset => target - offset).sort((a, b) => a - b);
  const exact = candidates.find(candidate => wallTime(formatter, candidate) === target);
  if (exact !== undefined) return exact;
  // A skipped boundary starts at the first real instant after the clock gap.
  const beforeCandidate = candidates.filter(candidate => wallTime(formatter, candidate) < target).at(-1);
  const afterCandidate = candidates.find(candidate => wallTime(formatter, candidate) > target);
  if (beforeCandidate === undefined || afterCandidate === undefined || beforeCandidate >= afterCandidate) throw new RangeError('Could not resolve the local daytime boundary.');
  let before: number = beforeCandidate, after: number = afterCandidate;
  while (after - before > 1000) {
    const midpoint = Math.floor((before + after) / 2000) * 1000;
    if (wallTime(formatter, midpoint) < target) before = midpoint;
    else after = midpoint;
  }
  return after;
}

function withoutAverage(day: Day): Day {
  const result = {...day};
  delete result.temperatureDewPointAverage;
  delete result.temperatureDewPointAverageSource;
  return result;
}

/**
 * Average hourly dew point over [05:00,22:00) on each city's local forecast day.
 * Intervals [time,time+1h) are clipped to the window and duration-weighted in
 * Celsius. Missing hours/values never fall back to a partial, daily, or current
 * reading. The first sample covering an interval wins, so duplicate/overlapping
 * records cannot increase its weight or conceal a gap elsewhere.
 */
export function withDailyDewPoint(data: Forecast, timezone: string): Forecast {
  let formatter: Intl.DateTimeFormat | undefined;
  try {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
  } catch {}
  const samples = data.hourly.map((conditions, index) => ({
    time: Date.parse(conditions.time), value: conditions.temperatureDewPoint, index,
  })).filter(sample => Number.isFinite(sample.time)).sort((a, b) => a.time - b.time || a.index - b.index);

  const daily = data.daily.map(day => {
    // Server-derived complete values survive an upcoming-only offline cache.
    if (day.temperatureDewPointAverageSource === 'hourly-daytime' && finite(day.temperatureDewPointAverage)) return day;
    const result = withoutAverage(day), time = Date.parse(day.time);
    if (!formatter || !Number.isFinite(time)) return result;
    try {
      const date = localParts(formatter, time);
      const start = localInstant(formatter, date, 5), end = localInstant(formatter, date, 22);
      let cursor = start, gap = false, valid = true, weighted = 0, covered = 0;
      for (const sample of samples) {
        const left = Math.max(start, sample.time), right = Math.min(end, sample.time + hour);
        if (right <= left || right <= cursor) continue;
        if (left > cursor) gap = true;
        const duration = right - Math.max(left, cursor);
        if (finite(sample.value)) weighted += sample.value * duration;
        else valid = false;
        covered += duration;
        cursor = right;
      }
      const average = weighted / covered;
      if (!gap && valid && end > start && cursor >= end && covered === end - start && finite(average)) {
        result.temperatureDewPointAverage = average;
        result.temperatureDewPointAverageSource = 'hourly-daytime';
      }
    } catch {}
    return result;
  });
  return {...data, daily};
}
