import type {Forecast} from './weather.ts';

/** Weather Line's original probability-adjusted, nonlinear rain-intensity scale. */
export function precipitationHeight(millimetersPerHour:number,probability=1):number {
 if(!Number.isFinite(millimetersPerHour)||!Number.isFinite(probability))return 0;
 const chance=Math.max(0,Math.min(1,probability));
 const inches=Math.max(0,millimetersPerHour)/25.4*(1-Math.cos(chance*Math.PI))*.5;
 if(inches<.0019)return 0;
 const range=4*(1-Math.exp(-2.209389806*Math.sqrt(inches)));
 const height=range<=1?range*.15:range<=2?.15+(range-1)*.18:range<=3?.33+(range-2)*.34:.67+(range-3)*.33;
 return Math.max(0,Math.min(1,height));
}

export function precipitationPoints(minutes:Forecast['minutes']) {
 const samples=(minutes||[]).filter(m=>Number.isFinite(Date.parse(m.startTime))&&Number.isFinite(m.precipitationIntensity)&&m.precipitationIntensity>=0);
 samples.sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
 const start=samples.length?Date.parse(samples[0].startTime):0,seen=new Set<number>();
 return samples.flatMap(m=>{
  const minute=(Date.parse(m.startTime)-start)/60000;
  if(minute>60||seen.has(minute))return [];
  seen.add(minute);
  return [{minute,height:precipitationHeight(m.precipitationIntensity,m.precipitationChance),intensity:m.precipitationIntensity}];
 });
}
