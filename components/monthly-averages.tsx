'use client';

import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {curve} from '@/lib/curve';
import {apiUrl} from '@/lib/api-client';
import type {MonthlyClimate,Place} from '@/lib/weather';

type Preferences={unit:'F'|'C';rain:'in'|'mm';feelsLike:boolean};
type Props={place:Place;prefs:Preferences;refreshId?:string};
type LoadState={key:string;status:'loading'|'ready'|'error';data?:MonthlyClimate};
const monthNames=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('en',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2020,i,1))));

function localMonth(timezone:string){
 try{return Number(new Intl.DateTimeFormat('en',{month:'numeric',timeZone:timezone}).format(new Date()));}
 catch{return new Date().getUTCMonth()+1;}
}
function validClimate(data:MonthlyClimate){
 return data?.source==='weatherkit'&&Array.isArray(data.months)&&data.months.length===12&&new Set(data.months.map(m=>m?.month)).size===12&&data.months.every(m=>m&&Number.isInteger(m.month)&&m.month>=1&&m.month<=12&&Number.isFinite(m.temperatureMax)&&Number.isFinite(m.temperatureMin)&&m.temperatureMax>=m.temperatureMin&&(m.precipitationAmount===undefined||(Number.isFinite(m.precipitationAmount)&&m.precipitationAmount>=0))&&(m.precipitationDays===undefined||(Number.isFinite(m.precipitationDays)&&m.precipitationDays>=0&&m.precipitationDays<=31)));
}

export function MonthlyAverages({place,prefs,refreshId}:Props){
 return <MonthlyAveragesForPlace key={`${place.latitude}:${place.longitude}:${place.timezone}`} place={place} prefs={prefs} refreshId={refreshId}/>;
}

function MonthlyAveragesForPlace({place,prefs,refreshId}:Props){
 const [month,setMonth]=useState(()=>localMonth(place.timezone));
 const [retry,setRetry]=useState(0);
 const [load,setLoad]=useState<LoadState>({key:'',status:'loading'});
 const[refreshing,setRefreshing]=useState(false),[refreshFailed,setRefreshFailed]=useState(false);
 const graph=useRef<SVGSVGElement>(null),retryButton=useRef<HTMLButtonElement>(null),retryFocus=useRef(false),headingId=useId(),helpId=useId();
 const key=`${place.latitude}:${place.longitude}`;
 useEffect(()=>{
  if(!refreshId)return;
  setRefreshing(true);setRefreshFailed(false);
  const controller=new AbortController();let active=true,timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},20000);
  async function request(){
   try{
    const query=new URLSearchParams({lat:String(place.latitude),lon:String(place.longitude),fresh:'1'});
    const response=await fetch(apiUrl(`/api/monthly?${query}`),{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error('Monthly averages are unavailable.');
    const data=await response.json() as MonthlyClimate;
    if(!validClimate(data))throw new Error('Monthly averages are incomplete.');
    if(active)setLoad({key,status:'ready',data:{...data,months:[...data.months].sort((a,b)=>a.month-b.month)}});
   }catch{
    if(active&&(!controller.signal.aborted||timedOut)){setRefreshFailed(true);setLoad(previous=>previous.key===key&&previous.status==='ready'&&previous.data?previous:{key,status:'error'});}
   }finally{clearTimeout(timer);if(active)setRefreshing(false);}
  }
  request();
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[key,place.latitude,place.longitude,retry,refreshId]);
 useEffect(()=>{
  if(!retryFocus.current||load.status==='loading'||refreshing)return;
  if(load.status==='error')retryButton.current?.focus();
  else graph.current?.querySelector<SVGRectElement>('[aria-pressed="true"]')?.focus();
  retryFocus.current=false;
 },[load.status,refreshing]);
 const months=load.key===key&&load.status==='ready'?load.data?.months:undefined;
 const loading=load.key!==key||load.status==='loading';
 const temperature=(value:number)=>Math.round(prefs.unit==='F'?value*9/5+32:value);
 const rainfall=(value:number)=>`${(prefs.rain==='in'?value/25.4:value).toFixed(prefs.rain==='in'?2:1)} ${prefs.rain}`;
 const rainfallSpoken=(value:number)=>`${(prefs.rain==='in'?value/25.4:value).toFixed(prefs.rain==='in'?2:1)} ${prefs.rain==='in'?'inches':'millimeters'}`;
 const temperatureUnit=prefs.unit==='F'?'Fahrenheit':'Celsius';
 const precipitationDays=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);
 const selected=months?.find(m=>m.month===month)||months?.[0];
 const hasRain=Boolean(months?.some(m=>m.precipitationAmount!==undefined));
 const width=420,height=hasRain?330:280,step=width/12;
 const high=Math.max(...(months?.map(m=>m.temperatureMax)||[1]));
 const low=Math.min(...(months?.map(m=>m.temperatureMin)||[0]));
 const range=Math.max(high-low,8),x=(i:number)=>(i+.5)*step,y=(value:number)=>45+(high-value)/range*160;
 const rainMaximum=Math.max(...(months?.map(m=>m.precipitationAmount||0)||[0]),1);
 const selectKey=(event:KeyboardEvent<SVGRectElement>,i:number)=>{
  if(!months)return;
  if(event.key==='Enter'||event.key===' '){event.preventDefault();setMonth(months[i].month);return;}
  const next=event.key==='ArrowRight'?Math.min(11,i+1):event.key==='ArrowLeft'?Math.max(0,i-1):event.key==='Home'?0:event.key==='End'?11:-1;
  if(next<0)return;
  event.preventDefault();setMonth(months[next].month);
  graph.current?.querySelector<SVGRectElement>(`[data-month="${months[next].month}"]`)?.focus();
 };
 return <section className="monthly-section" aria-labelledby={headingId} aria-busy={loading||refreshing}>
  <h2 id={headingId}>Monthly Averages</h2>
  <p className="monthly-place">{place.name}</p>
  {loading?<p className="monthly-status" role="status">Loading monthly averages…</p>:!months?<div className="monthly-status"><p role="alert">Couldn’t load monthly averages.</p><button ref={retryButton} className="text-button" onClick={event=>{retryFocus.current=event.detail===0;setLoad({key,status:'loading'});setRetry(value=>value+1);}}>Try again</button></div>:<>
   <p className="monthly-keyboard-help" id={helpId}>Use the left and right arrow keys to select a month. Home selects January and End selects December.</p>
   <div className="monthly-chart"><svg ref={graph} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Monthly average ${hasRain?'temperatures and precipitation':'high and low temperatures'}`} aria-describedby={helpId}>
    <rect x={(month-1)*step} y="0" width={step} height={height} fill="var(--selection)" aria-hidden="true"/>
    <path d={curve(months.map((m,i)=>({x:x(i),y:y(m.temperatureMax)})))} stroke="var(--sun)" fill="none" strokeWidth="2.2" aria-hidden="true"/>
    <path d={curve(months.map((m,i)=>({x:x(i),y:y(m.temperatureMin)})))} stroke="var(--night)" fill="none" strokeWidth="2.2" aria-hidden="true"/>
    {months.map((m,i)=>{
     const rainHeight=(m.precipitationAmount||0)/rainMaximum*42;
     const label=`${monthNames[m.month-1]}, average high ${temperature(m.temperatureMax)} degrees ${temperatureUnit}, average low ${temperature(m.temperatureMin)} degrees ${temperatureUnit}${m.precipitationAmount===undefined?'':`, average precipitation ${rainfallSpoken(m.precipitationAmount)}`}${m.precipitationDays===undefined?'':`, average precipitation days ${precipitationDays(m.precipitationDays)}`}`;
     return <g key={m.month}>
      <circle cx={x(i)} cy={y(m.temperatureMax)} r="5.5" fill="var(--sun)" stroke="var(--surface)" aria-hidden="true"/>
      <text x={x(i)} y={y(m.temperatureMax)-14} textAnchor="middle" fill="var(--sun-ink)" className="graph-temperature" aria-hidden="true">{temperature(m.temperatureMax)}</text>
      <circle cx={x(i)} cy={y(m.temperatureMin)} r="5.5" fill="var(--night)" stroke="var(--surface)" aria-hidden="true"/>
      <text x={x(i)} y={y(m.temperatureMin)+26} textAnchor="middle" fill="var(--night-ink)" className="graph-temperature" aria-hidden="true">{temperature(m.temperatureMin)}</text>
      {m.precipitationAmount!==undefined&&<rect x={x(i)-9} y={286-rainHeight} width="18" height={rainHeight} fill="var(--rain)" rx="2" aria-hidden="true"/>}
      <text x={x(i)} y={height-11} textAnchor="middle" className="graph-time" aria-hidden="true">{monthNames[m.month-1][0]}</text>
      <rect x={i*step} y="0" width={step} height={height} fill="transparent" className="chart-target" role="button" data-month={m.month} tabIndex={m.month===month?0:-1} aria-label={label} aria-pressed={m.month===month} onClick={event=>{setMonth(m.month);if(event.detail>0)event.currentTarget.blur();}} onKeyDown={event=>selectKey(event,i)}/>
     </g>;
    })}
   </svg></div>
   {selected&&<div className="monthly-selection" aria-live="polite" aria-atomic="true"><h3>{monthNames[selected.month-1]}</h3><dl className="monthly-values"><div><dt>Average high</dt><dd>{temperature(selected.temperatureMax)}°</dd></div><div><dt>Average low</dt><dd>{temperature(selected.temperatureMin)}°</dd></div>{selected.precipitationAmount!==undefined&&<div><dt>Average precipitation</dt><dd>{rainfall(selected.precipitationAmount)}</dd></div>}<div><dt title="Expected precipitation days, based on daily historical averages.">Average Precip Days</dt><dd aria-label={selected.precipitationDays===undefined?'Average precipitation days unavailable':`${precipitationDays(selected.precipitationDays)} days`}>{selected.precipitationDays===undefined?'—':precipitationDays(selected.precipitationDays)}</dd></div></dl></div>}
   {refreshFailed&&<p className="monthly-note" role="status">Couldn’t refresh. Showing saved monthly averages. <button ref={retryButton} className="text-button" onClick={event=>{retryFocus.current=event.detail===0;setRetry(value=>value+1);}}>Try again</button></p>}
  </>}
 </section>;
}
