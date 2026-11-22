export type Place = { id: string; name: string; region: string; latitude: number; longitude: number; timezone: string; countryCode?: string };
export type Conditions = { time: string; conditionCode: string; temperature: number; temperatureApparent?: number; temperatureDewPoint?: number; humidity?: number; cloudCover?: number; windSpeed?: number; windGust?: number; windDirection?: number; uvIndex?: number; precipitationChance?: number; precipitationAmount?: number; daylight?: boolean };
export type Day = Conditions & { temperatureMax: number; temperatureMin: number; temperatureApparentMax?: number; temperatureApparentMin?: number; temperatureApparentSource?: 'hourly'; temperatureDewPointAverage?: number; temperatureDewPointAverageSource?: 'hourly-daytime'; forecastEnd?: string; sunrise?: string; sunset?: string; summary?: string; daytimeConditionCode?: string; overnightConditionCode?: string };
export type WeatherAlert = {id:string;summary:string;detailsUrl?:string;severity?:string;effectiveTime?:string;expireTime?:string;issuedTime?:string;source?:string;areaName?:string};
export type MonthlyClimate = {source:'weatherkit';fetchedAt:string;months:{month:number;temperatureMax:number;temperatureMin:number;precipitationAmount?:number;precipitationDays?:number}[]};
export type Forecast = { source: 'weatherkit'; fetchedAt: string; current: Conditions; hourly: Conditions[]; daily: Day[]; minutes?: { startTime: string; precipitationIntensity: number; precipitationChance: number }[]; alerts?: WeatherAlert[]; alertsStatus?:'available'|'unavailable'|'error'; attribution?: { legalPageUrl?: string; logoLightURL?: string; logoDarkURL?: string } };
export function forecastDayForHour(days:Day[],time:string,timezone:string) {
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});
  const key=date.format(new Date(time));
  return days.find(d=>date.format(new Date(d.time))===key);
}
export const DEFAULT_PLACE: Place = { id: 'new-york', name: 'New York', region: 'New York, United States', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', countryCode: 'US' };
export function conditionName(code: string) { return code.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase()); }
export function conditionIcon(code: string, daylight = true) {
  if (/^(NotAvailable|Unavailable|Unknown)$/i.test(code)) return 'NotAvailable';
  if (/^(Icy|Ice|Frost|IcePellets)$/i.test(code) || /frigid/i.test(code)) return 'Icy';
  if (/hurricane|tropical/i.test(code)) return 'Hurricane';
  if (/tornado/i.test(code)) return 'Tornado';
  if (/hot/i.test(code)) return 'HotSunny';
  if (/thunder|storm/i.test(code)) return 'Rain-Heavy';
  if (/blizzard|heavySnow/i.test(code)) return 'Snow-Heavy';
  if (/snow|flurries/i.test(code)) return 'Snow';
  if (/sleet|freez|wintry/i.test(code)) return 'Sleet';
  if (/hail/i.test(code)) return 'Hail';
  if (/heavyRain/i.test(code)) return 'Rain-Heavy';
  if (/rain|shower/i.test(code)) return 'Rain-Light';
  if (/drizzle/i.test(code)) return 'Rain-Drizzle';
  if (/fog|haze|smok|blowingDust/i.test(code)) return 'Fog';
  if (/wind|breezy/i.test(code)) return 'Windy';
  if (/mostlyCloudy/i.test(code)) return daylight ? 'MostlyCloudy' : 'NightCloudy4';
  if (/partlyCloudy|mostlyClear/i.test(code)) return daylight ? 'PartlyCloudy' : 'NightCloudy4';
  if (/cloudy/i.test(code)) return 'Cloudy';
  return daylight ? 'Sunny' : 'NightClear4';
}
const frozenGlyphs = new Set(['Snow', 'Snow-Heavy', 'Sleet', 'Hail', 'Icy']);
export function isFrozenCondition(code: string) { return frozenGlyphs.has(conditionIcon(code)); }
export function conditionColor(code: string, daylight = true, ink = false, nightTrack = false) {
  const icon=conditionIcon(code,daylight);
  if(nightTrack&&!frozenGlyphs.has(icon))return ink?'var(--night-ink)':'var(--night)';
  if(icon==='NotAvailable')return ink?'var(--cloud-ink)':'var(--secondary)';
  const color=/^(Hurricane|Tornado|Hot)/.test(icon)?'hot':/^Rain/.test(icon)?'rain':/^(Windy|Snow|Sleet|Hail|Icy)/.test(icon)?'wind':/^(Cloudy|Fog)/.test(icon)?'cloud':/^Night/.test(icon)?'night':'sun';
  return `var(--${color}${ink?'-ink':''})`;
}
