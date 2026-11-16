import type {Forecast} from './weather.ts';

export type NightForecast = {
  /** Local date of the evening, aligned with the corresponding daily forecast. */
  date: string;
  startTime: string;
  endTime: string;
  complete: boolean;
  conditionCode?: string;
  /** Actual elapsed duration, including any daylight-saving transition. */
  hours: number;
  /** Distinct hourly samples contributing coverage, including partial edge hours. */
  hourCount: number;
};

const hour = 60 * 60 * 1000;

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
  // Probe both sides of a possible offset change. This also handles half-hour
  // offsets and repeated clocks without assuming that a local day lasts 24h.
  const offsets = new Set([-36, -18, 0, 18, 36].map(delta => {
    const probe = target + delta * hour;
    return wallTime(formatter, probe) - probe;
  }));
  const candidates = [...offsets].map(offset => target - offset).sort((a, b) => a - b);
  const exact = candidates.find(candidate => wallTime(formatter, candidate) === target);
  if (exact !== undefined) return exact;
  // If a jurisdiction skips the boundary clock time, start/end at the first
  // real instant after that gap, rather than returning an invalid Date.
  const beforeCandidate = candidates.filter(candidate => wallTime(formatter, candidate) < target).at(-1);
  const afterCandidate = candidates.find(candidate => wallTime(formatter, candidate) > target);
  if (beforeCandidate === undefined || afterCandidate === undefined || beforeCandidate >= afterCandidate) throw new RangeError('Could not resolve the local night boundary.');
  let before: number = beforeCandidate, after: number = afterCandidate;
  while (after - before > 1000) {
    const midpoint = Math.floor((before + after) / 2000) * 1000;
    if (wallTime(formatter, midpoint) < target) before = midpoint;
    else after = midpoint;
  }
  return after;
}

/**
 * Summarize [22:00, next-day 05:00) for each daily row using the FULL hourly
 * forecast. No daypart fallback is used. The dominant code is duration-weighted;
 * exact ties choose the condition appearing earliest in the local night.
 */
export function nightForecasts(data: Forecast, timezone: string): NightForecast[] {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const samples = data.hourly.map((conditions, index) => ({
    time: Date.parse(conditions.time), code: conditions.conditionCode, index,
  })).filter(sample => Number.isFinite(sample.time) && typeof sample.code === 'string' && sample.code.trim())
    .sort((a, b) => a.time - b.time || a.index - b.index);

  return data.daily.map(day => {
    const date = localParts(formatter, Date.parse(day.time));
    const dateKey = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
    const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
    const nextDate = {year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate()};
    const start = localInstant(formatter, date, 22), end = localInstant(formatter, nextDate, 5);
    let cursor = start, gap = false, hourCount = 0;
    const durations = new Map<string, number>();
    for (const sample of samples) {
      const left = Math.max(start, sample.time), right = Math.min(end, sample.time + hour);
      if (right <= left) continue;
      if (left > cursor) gap = true;
      // Ignore duplicate/overlapping coverage so it cannot inflate a condition's
      // weight or conceal a missing hour elsewhere in the window.
      const uncovered = Math.max(left, cursor);
      if (right <= uncovered) continue;
      hourCount++;
      durations.set(sample.code, (durations.get(sample.code) || 0) + right - uncovered);
      cursor = right;
    }
    const complete = !gap && cursor >= end && end > start;
    let conditionCode: string | undefined, longest = -1;
    if (complete) for (const [code, duration] of durations) {
      if (duration > longest) {conditionCode = code; longest = duration;}
    }
    return {date: dateKey, startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), complete, conditionCode, hours: (end - start) / hour, hourCount};
  });
}
