import {conditionName,type Day} from './weather.ts';
import {dailyTemperatures} from './temperature.ts';

function phrase(code:string,night=false) {
  const descriptions:Record<string,string>={Clear:night?'clear skies':'sunny skies',MostlyClear:night?'mostly clear skies':'mostly sunny skies',PartlyCloudy:'partly cloudy skies',MostlyCloudy:'mostly cloudy skies',Cloudy:'cloudy skies',Drizzle:'light drizzle',Rain:'rain',HeavyRain:'heavy rain',Snow:'snow',HeavySnow:'heavy snow',Flurries:'snow flurries',Foggy:'foggy conditions',Haze:'hazy skies',Smoky:'smoky skies',Breezy:'breezy conditions',Windy:'windy conditions',Hot:'hot conditions',Frigid:'very cold conditions'};
  return descriptions[code]||conditionName(code).toLowerCase();
}
export function dailySummary(day:Day,unit:'F'|'C',feelsLike=false) {
  if(day.summary?.trim()&&(!feelsLike||!/(?:\d\s*°|\bdegrees\b|\b(?:high|low)\s+(?:of\s+)?-?\d)/i.test(day.summary)))return day.summary.trim().replace(/\.$/,'');
  const code=day.daytimeConditionCode||day.conditionCode,dayText=phrase(code);
  const text=dayText[0].toUpperCase()+dayText.slice(1);
  if(day.overnightConditionCode&&day.overnightConditionCode!==code)return `${text} during the day, with ${phrase(day.overnightConditionCode,true)} overnight`;
  const {high,low}=dailyTemperatures(day,feelsLike);
  if(high===undefined||low===undefined)return text;
  const temperature=(n:number)=>`${Math.round(unit==='F'?n*9/5+32:n)}°`;
  return `${text}, with a high of ${temperature(high)} and a low of ${temperature(low)}`;
}
