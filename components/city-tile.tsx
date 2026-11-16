'use client';

import {useEffect,useRef,useState} from 'react';
import {ForecastGraph} from '@/components/forecast-graph';
import {WeatherIcon} from '@/components/weather-icons';
import {LocationSubtitle} from '@/components/location-subtitle';
import {loadCityForecast,placeForecastKey} from '@/lib/city-forecast';
import {conditionColor,conditionName,type Forecast,type Place} from '@/lib/weather';
import type {Preferences} from '@/lib/preferences';
import {airTemperature} from '@/lib/temperature';

type Props={hasStreetAddress?:boolean;place:Place;prefs:Preferences;view:'hourly'|'daily';refreshId?:string;onOpen:(place:Place,keyboard?:boolean)=>void};
type State={key:string;forecast?:Forecast;busy:boolean;error:string;isOffline:boolean};

export function CityTile({place,hasStreetAddress=false,prefs,view,refreshId,onOpen}:Props){
 const key=placeForecastKey(place),gesture=useRef({x:0,y:0,moved:false});
 const[state,setState]=useState<State>({key,busy:true,error:'',isOffline:false});
 useEffect(()=>{
  if(!refreshId)return;
  let active=true;
  setState(previous=>previous.key===key?{...previous,busy:true,error:''}:{key,busy:true,error:'',isOffline:false});
  loadCityForecast(place,{force:true,refreshId}).then(result=>{if(active)setState({key,...result,busy:false,error:''});}).catch(error=>{if(active)setState(previous=>({...previous,key,busy:false,error:error instanceof Error?error.message:'Forecast unavailable.'}));});
  return()=>{active=false;};
 },[key,refreshId]);
 const current=state.key===key?state:undefined,data=current?.forecast;
 const temperature=data?airTemperature(data.current,prefs.feelsLike):undefined;
 const formatted=temperature===undefined?'—':`${Math.round(prefs.unit==='F'?temperature*9/5+32:temperature)}°`;
 const condition=data?conditionName(data.current.conditionCode):'';
 const description=data?`${condition}, ${prefs.feelsLike?'Feels Like ':''}${formatted}${current?.isOffline||current?.error?', saved forecast':''}`:current?.error?'Unavailable, open to retry':'Loading forecast';
 return <section className="forecast-sheet is-collapsed city-tile" role="button" tabIndex={0} data-city-id={place.id} aria-label={`Open ${place.name} forecast. ${description}`} aria-expanded="false" aria-busy={!current||current.busy}
  onPointerDown={event=>{gesture.current={x:event.clientX,y:event.clientY,moved:false};}}
  onPointerMove={event=>{if(Math.hypot(event.clientX-gesture.current.x,event.clientY-gesture.current.y)>8)gesture.current.moved=true;}}
  onPointerCancel={()=>{gesture.current.moved=true;}}
  onClick={event=>{if(event.detail===0||!gesture.current.moved)onOpen(place,event.detail===0);}}
  onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onOpen(place,true);}}}>
  <header className="location-heading"><div className="location-title"><h2>{place.name}</h2><LocationSubtitle place={place} hasStreetAddress={hasStreetAddress}/></div><div className="current-temperature" aria-hidden="true" style={{color:data?conditionColor(data.current.conditionCode,data.current.daylight!==false,true):'var(--muted)'}}>{data&&<WeatherIcon code={data.current.conditionCode} daylight={data.current.daylight} size={35}/>}<span>{formatted}</span></div></header>
  {data?<><div aria-hidden="true"><ForecastGraph data={data} view={view} index={0} onSelect={()=>{}} prefs={prefs} timezone={place.timezone} nights={[]} compact/></div>{(current?.isOffline||current?.error)&&<p className="tile-status">Saved forecast · Open to refresh</p>}</>:<p className="tile-placeholder">{current?.error?'Forecast unavailable · Tap to retry':'Getting your forecast…'}</p>}
 </section>;
}
