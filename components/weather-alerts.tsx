'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,ChevronRight} from 'lucide-react';
import type {Forecast,WeatherAlert} from '@/lib/weather';

export function WeatherAlerts({alerts,status,timezone,isOffline=false,onRetry}:{alerts?:WeatherAlert[];status:Forecast['alertsStatus'];timezone:string;isOffline?:boolean;onRetry:()=>void}) {
  const[now,setNow]=useState(0);
  useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const active=(alerts||[]).filter(a=>!a.expireTime||Date.parse(a.expireTime)>now);
  const expires=(time:string)=>new Intl.DateTimeFormat('en-US',{timeZone:timezone,weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(time));
  return <section className="weather-alerts" aria-labelledby="weather-alerts-title"><h2 id="weather-alerts-title">Weather Alerts</h2>
    {active.map(a=>{const content=<><span className="alert-title"><AlertTriangle size={18}/><strong>{a.summary}</strong>{a.detailsUrl&&<ChevronRight size={18}/>}</span>{(a.source||a.areaName)&&<span className="alert-meta">{[a.source,a.areaName].filter(Boolean).join(' · ')}</span>}{a.expireTime&&<span className="alert-meta">Until {expires(a.expireTime)}</span>}</>;return a.detailsUrl?<a className="alert-link" data-severity={a.severity} key={a.id} href={a.detailsUrl} target="_blank" rel="noopener noreferrer">{content}</a>:<div className="alert-link" data-severity={a.severity} key={a.id}>{content}</div>;})}
    {isOffline?<p className="alert-status">Saved alert information. Reconnect to check for current alerts.</p>:active.length===0&&<p className="alert-status">{status==='available'?'No active weather alerts':status==='error'?'Weather alerts could not be checked.':'Weather alerts are not available for this location.'}</p>}
    {status==='error'&&!isOffline&&<button className="text-button" onClick={onRetry}>Retry alerts</button>}
  </section>;
}
