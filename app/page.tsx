'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronRight,LocateFixed,MapPin,Plus,RefreshCw,Search,Settings,X} from 'lucide-react';
import {REFERENCE,REFERENCE_PLACE,DEFAULT_PLACE,forecastDayForHour,conditionColor,conditionName,type Day,type Forecast,type Place} from '@/lib/weather';
import {WeatherSymbols,WeatherIcon} from '@/components/weather-icons';
import {parsePreferences,parsePlaces,type Preferences as Prefs,type Theme} from '@/lib/preferences';
import {nightForecasts} from '@/lib/night-forecast';
import {dailySummary} from '@/lib/daily-summary';
import {withDailyDewPoint} from '@/lib/dew-point';
import {createSelectionHaptics} from '@/lib/selection-haptics';
import {createAppReloadUrl,cleanAppReloadUrl,saveReloadContext,consumeReloadContext,type ReloadContext} from '@/lib/app-reload';
import {useRestoredScroll} from '@/components/use-restored-scroll';
import {airTemperature,dailyTemperatures,withDailyApparentTemperatures} from '@/lib/temperature';
import {MonthlyAverages} from '@/components/monthly-averages';
import {WeatherAlerts} from '@/components/weather-alerts';
import {apiUrl} from '@/lib/api-client';
import {locationCoordinateKey,loadStreetAddress} from '@/lib/current-location';
import {detectLocation,LocationDetectionError} from '@/lib/geolocation';
import {loadCityForecast} from '@/lib/city-forecast';
import {ForecastGraph} from '@/components/forecast-graph';
import {ForecastSummary} from '@/components/forecast-summary';
import {CityTile} from '@/components/city-tile';
import {LocationSubtitle} from '@/components/location-subtitle';
import {CityScreen} from '@/components/city-screen';
import {useAppRefresh} from '@/components/use-app-refresh';
import {SavedLocationsSettings} from '@/components/saved-locations-settings';
import '@/components/saved-locations-settings.css';
import {upsertSavedPlace,moveSavedPlace,removeSavedPlace,updateCurrentLocation,restoreSavedLocations,shouldSeedCurrentLocation} from '@/lib/saved-places';
type View='hourly'|'daily';
const INITIAL:Prefs={theme:'auto',unit:'F',wind:'mph',rain:'in',feelsLike:false,nightConditions:false};
const THEMES:{id:Theme;label:string;bg:string;line:string}[]=[{id:'auto',label:'Automatic',bg:'linear-gradient(135deg,#fff 50%,#172131 50%)',line:'#249edc'},{id:'light',label:'Light',bg:'#fff',line:'#ff9700'},{id:'dark',label:'Dark',bg:'#172131',line:'#ffd16f'},{id:'black',label:'Black',bg:'#111',line:'#aaa'},{id:'dracula',label:'Dracula',bg:'#292f58',line:'#acddf1'},{id:'solarized',label:'Solarized',bg:'#203e4c',line:'#76c6be'},{id:'clear-sky',label:'Clear Sky',bg:'#2c70c5',line:'#ffdb6e'}];
function useDate(timezone:string){return(time:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{timeZone:timezone,...options}).format(new Date(time));}
function percent(v:number|undefined){return v===undefined?'—':`${Math.round(v*100)}%`;}
export default function WeatherLine(){
 const[prefs,setPrefs]=useState<Prefs>(INITIAL),[hydrated,setHydrated]=useState(false),[view,setView]=useState<View>('daily'),[index,setIndex]=useState(0),[forecast,setForecast]=useState<Forecast|null>(REFERENCE),[place,setPlace]=useState<Place>(REFERENCE_PLACE),[saved,setSaved]=useState<Place[]>([]),[panel,setPanel]=useState<'settings'|'locations'|null>(null),[collapsed,setCollapsed]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[isOffline,setIsOffline]=useState(false),[search,setSearch]=useState(''),[results,setResults]=useState<Place[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState(''),[geoBusy,setGeoBusy]=useState(false),[geoError,setGeoError]=useState('');
 const selectionFeedback=useRef<ReturnType<typeof createSelectionHaptics>|null>(null);if(!selectionFeedback.current)selectionFeedback.current=createSelectionHaptics({view:'daily',index:0});
 const tileKeyboardFocus=useRef(false),mainScroll=useRef(0),returnToCity=useRef<string|null>(null),seedLocation=useRef(false),locationsReturn=useRef<'settings'|null>(null),previousPanel=useRef<'settings'|'locations'|null>(null);
 const[manualRefresh,setManualRefresh]=useState(0),[reloading,setReloading]=useState(false),[restoreScrollY,setRestoreScrollY]=useState<number|undefined>(undefined);
 const appReloading=useRef(false),pendingRestore=useRef<ReloadContext|null>(null);
 const appRevision=useAppRefresh(hydrated),refreshId=appRevision?`${appRevision}:${manualRefresh}`:undefined;
 const refreshIdRef=useRef(refreshId);refreshIdRef.current=refreshId;
 const forecastRef=useRef(forecast);forecastRef.current=forecast;
 const activeViewRef=useRef({place,collapsed});activeViewRef.current={place,collapsed};
 const savedPlacesRef=useRef(saved);savedPlacesRef.current=saved;
 const externalSavedSnapshot=useRef<string|null>(null);
 const geoRequest=useRef<{controller:AbortController;background:boolean}|null>(null);
 const[address,setAddress]=useState<{key:string;value:string|null;busy:boolean}|null>(null);
 const gpsPlace=saved.find(p=>p.id==='current-location'),gpsAddressKey=gpsPlace?locationCoordinateKey(gpsPlace):null;
 const displayPlace=(p:Place):Place=>p.id==='current-location'?{...p,region:address?.key===locationCoordinateKey(p)?address.value||(address.busy?'Finding address…':'Address unavailable'):'Finding address…'}:p;
 const requestId=useRef(0),locationIntent=useRef(0),retryFocus=useRef(false),retryButton=useRef<HTMLButtonElement>(null),returnFocus=useRef<HTMLElement|null>(null),dialogRef=useRef<HTMLDialogElement>(null),date=useDate(place.timezone);
 const nights=useMemo(()=>forecast?nightForecasts(forecast,place.timezone):[],[forecast,place.timezone]);
 const completeNights=nights.filter(n=>n.complete),lastNight=completeNights.at(-1);
 const summarySizes=useMemo(()=>forecast?[...new Set([...forecast.daily.map((d,i)=>dailySummary(prefs.nightConditions?{...d,overnightConditionCode:nights[i]?.complete?nights[i].conditionCode:undefined}:d,prefs.unit,prefs.feelsLike)),...forecast.hourly.slice(0,72).map(d=>conditionName(d.conditionCode))])]:[],[forecast,nights,prefs.nightConditions,prefs.unit,prefs.feelsLike]);
 const nightCoverage=!forecast?'Load a forecast to check night coverage.':forecast.source==='reference'?`Reference data includes ${completeNights.length} complete nights.`:completeNights.length?`${isOffline?'Saved forecast: ':''}${completeNights.length} complete nights available, through ${date(lastNight!.endTime,{weekday:'short',month:'short',day:'numeric',hour:'numeric'})}.`:'No complete 10 PM–5 AM windows are available in this forecast.';
 const temp=(n:number|undefined)=>n===undefined?'—':`${Math.round(prefs.unit==='F'?n*9/5+32:n)}°`;
 const setPref=<K extends keyof Prefs>(key:K,value:Prefs[K])=>setPrefs(p=>({...p,[key]:value}));
 useEffect(()=>{
  let storedPrefs:string|null=null,storedPlaces:string|null=null,migrated=false,pendingLocation=false;try{storedPrefs=localStorage.getItem('wl-preferences');}catch{}try{storedPlaces=localStorage.getItem('wl-places');}catch{}try{migrated=Boolean(localStorage.getItem('wl-defaults-v2'));}catch{}try{pendingLocation=localStorage.getItem('wl-location-startup-v1')==='pending';}catch{}
  const p=parsePreferences(storedPrefs,INITIAL),locations=restoreSavedLocations(parsePlaces(storedPlaces,storedPlaces===null?[DEFAULT_PLACE]:[]));setPrefs({...p,theme:migrated?p.theme:'auto'});seedLocation.current=shouldSeedCurrentLocation(storedPlaces,locations,pendingLocation);persistLocationStartup(seedLocation.current);setSaved(locations);
  const context=consumeReloadContext(()=>window.sessionStorage);
  if(context?.pathname===window.location.pathname){
   const restoredPlace=locations.find(location=>location.id===context.placeId),restoredCollapsed=context.collapsed||!restoredPlace,restoredIndex=context.view==='daily'?Math.min(context.index,9):context.index;
   setView(context.view);setIndex(restoredIndex);setCollapsed(restoredCollapsed);setForecast(null);if(restoredPlace)setPlace(restoredPlace);
   selectionFeedback.current=createSelectionHaptics({view:context.view,index:restoredIndex});mainScroll.current=context.mainScroll;
   pendingRestore.current={...context,index:restoredIndex,collapsed:restoredCollapsed};setRestoreScrollY(!context.collapsed&&restoredCollapsed?context.mainScroll:context.scrollY);
  }
  try{const clean=cleanAppReloadUrl(window.location.href);if(clean!==window.location.href)window.history.replaceState(window.history.state,'',clean);}catch{}
  try{localStorage.setItem('wl-defaults-v2','current-location-auto');}catch{}setHydrated(true);
 },[]);
 useEffect(()=>{if(!hydrated)return;try{localStorage.setItem('wl-preferences',JSON.stringify(prefs));}catch{}},[prefs,hydrated]);
 useEffect(()=>{if(!hydrated)return;const serialized=JSON.stringify(saved),external=externalSavedSnapshot.current;externalSavedSnapshot.current=null;if(serialized===external)return;try{localStorage.setItem('wl-places',serialized);}catch{}},[saved,hydrated]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{try{if(event.storageArea!==localStorage)return;}catch{return;}if(event.key==='wl-places'){clearLocationStartup();cancelLocation();const locations=restoreSavedLocations(parsePlaces(event.newValue,[]));externalSavedSnapshot.current=JSON.stringify(locations);setSaved(locations);}if(event.key==='wl-preferences')setPrefs(parsePreferences(event.newValue,INITIAL));};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 useEffect(()=>{document.documentElement.dataset.theme=prefs.theme;},[prefs.theme]);
 useEffect(()=>{
  if(!hydrated||!refreshId||!gpsPlace||!gpsAddressKey){setAddress(null);return;}
  const controller=new AbortController(),key=gpsAddressKey;
  setAddress(previous=>({key,value:previous?.key===key?previous.value:null,busy:true}));
  void loadStreetAddress(apiUrl('/api/address'),gpsPlace,controller.signal)
   .then(value=>{if(!controller.signal.aborted)setAddress({key,value,busy:false});})
   .catch(()=>{if(!controller.signal.aborted)setAddress({key,value:null,busy:false});});
  return()=>controller.abort();
 },[hydrated,refreshId,gpsAddressKey]);

 useEffect(()=>{if(collapsed||panel||!tileKeyboardFocus.current)return;const frame=requestAnimationFrame(()=>{document.querySelector<HTMLButtonElement>('.city-screen .location-title')?.focus({preventScroll:true});tileKeyboardFocus.current=false;});return()=>cancelAnimationFrame(frame);},[collapsed,panel,place.id]);
 useEffect(()=>{if(!collapsed||panel||!returnToCity.current)return;const id=returnToCity.current;const frame=requestAnimationFrame(()=>{returnToCity.current=null;window.scrollTo({top:mainScroll.current,behavior:'auto'});const tiles=Array.from(document.querySelectorAll<HTMLElement>('.city-tile')),match=tiles.find(el=>el.dataset.cityId===id),tile=match||tiles[0];if(!match)window.scrollTo({top:0,behavior:'auto'});(tile||document.querySelector<HTMLElement>('.toolbar .icon-button'))?.focus({preventScroll:true});if(tile){const box=tile.getBoundingClientRect();if(box.top<0||box.bottom>window.innerHeight)tile.scrollIntoView({block:'nearest',behavior:'auto'});}});return()=>cancelAnimationFrame(frame);},[collapsed,panel,saved]);
 useEffect(()=>{const dialog=dialogRef.current;let frame:number|undefined;if(panel){if(!dialog?.open){returnFocus.current=document.activeElement as HTMLElement;dialog?.showModal();}if(panel==='settings'&&previousPanel.current==='locations')frame=requestAnimationFrame(()=>dialog?.querySelector<HTMLButtonElement>('.saved-locations-add')?.focus({preventScroll:true}));else dialog?.querySelector<HTMLButtonElement>('.sheet-navigation .text-button')?.focus({preventScroll:true});}else{dialog?.close();const target=returnFocus.current?.isConnected?returnFocus.current:document.querySelector<HTMLElement>('.toolbar .icon-button');target?.focus({preventScroll:true});}previousPanel.current=panel;return()=>{if(frame!==undefined)cancelAnimationFrame(frame);};},[panel]);
 async function loadWeather(p:Place,initial=false,batch=refreshIdRef.current){
  if(!initial&&geoRequest.current&&!geoRequest.current.background){cancelLocation();clearLocationStartup();}const id=++requestId.current;setBusy(true);setError('');setIsOffline(false);if(!initial){setPlace(p);setForecast(null);selectionFeedback.current?.resetIndex();setIndex(0);}
  try{const result=await loadCityForecast(p,batch?{force:true,refreshId:batch}:{force:!initial&&p.id===place.id&&!collapsed});if(id!==requestId.current)return;setForecast(result.forecast);setPlace(p);setIsOffline(result.isOffline);}
  catch(e){if(id!==requestId.current)return;if(!initial||!forecastRef.current)setError(e instanceof Error?e.message:'Could not load your forecast. Try again.');else if(forecastRef.current.source==='weatherkit')setIsOffline(true);}
  finally{if(id===requestId.current)setBusy(false);}
 }
 useEffect(()=>{if(hydrated&&saved.length===0&&!seedLocation.current){requestId.current++;setForecast(null);setBusy(false);setIsOffline(false);}},[hydrated,saved]);
 useEffect(()=>{if(!busy&&retryFocus.current){(retryButton.current||document.querySelector<HTMLElement>('.chart-target[aria-pressed=true]'))?.focus();retryFocus.current=false;}},[busy,error]);
 useEffect(()=>{if(!refreshId)return;const locations=savedPlacesRef.current,view=activeViewRef.current;for(const p of locations)void loadCityForecast(p,{force:true,refreshId}).catch(()=>{});const active=view.collapsed?locations.find(p=>p.id===view.place.id)||locations[0]:view.place;if(active)void loadWeather(active,true,refreshId);else setForecast(null);if(seedLocation.current||locations.some(p=>p.id==='current-location'))locate(true);},[refreshId]);
 useEffect(()=>{
  const context=pendingRestore.current;if(!context||!hydrated||!appRevision||busy)return;
  if(!collapsed&&forecast?.source==='weatherkit'){
   const max=view==='daily'?forecast.daily.length-1:Math.min(72,forecast.hourly.length)-1,next=Math.max(0,Math.min(index,max));
   selectionFeedback.current?.resetIndex(next);setIndex(next);pendingRestore.current=null;
  }else if(collapsed||error)pendingRestore.current=null;
 },[hydrated,appRevision,busy,collapsed,forecast,error,view,index]);
 useRestoredScroll(restoreScrollY,Boolean(hydrated&&appRevision&&!busy&&(forecast?.source==='weatherkit'||error||saved.length===0)));
 function reloadApp(){
  if(appReloading.current)return;appReloading.current=true;setReloading(true);
  const now=Date.now();saveReloadContext(()=>window.sessionStorage,{version:1,createdAt:now,pathname:window.location.pathname,placeId:place.id,collapsed,view,index,scrollY:Math.max(0,Math.min(100000,window.scrollY)),mainScroll:Math.max(0,Math.min(100000,mainScroll.current))},now);
  try{window.location.replace(createAppReloadUrl(window.location.href,`${now.toString(36)}-${Math.random().toString(36).slice(2,8)}`));}
  catch{try{window.location.reload();}catch{appReloading.current=false;setReloading(false);setManualRefresh(value=>value+1);}}
 }
 useEffect(()=>{if(search.trim().length<2){setResults([]);setSearching(false);setSearchError('');return;}const controller=new AbortController();setSearching(true);setSearchError('');const timer=setTimeout(async()=>{try{const r=await fetch(apiUrl(`/api/locations?q=${encodeURIComponent(search.trim())}`),{signal:controller.signal}),d:any=await r.json();if(!r.ok)throw new Error(d.error);setResults(d.results);}catch(e){if(!controller.signal.aborted)setSearchError(e instanceof Error?e.message:'Search is unavailable.');}finally{if(!controller.signal.aborted)setSearching(false);}},300);return()=>{controller.abort();clearTimeout(timer);};},[search]);
 function openLocations(fromSettings=false){locationsReturn.current=fromSettings?'settings':null;setSearch('');setPanel('locations');}
 function manageLocations(){setCollapsed(true);window.scrollTo({top:0,behavior:'auto'});setPanel('settings');}
 function savePlace(p:Place){cancelLocation();clearLocationStartup();setGeoError('');setPanel(null);setSearch('');setSaved(s=>upsertSavedPlace(s,p));returnToCity.current=p.id;mainScroll.current=0;setCollapsed(true);loadWeather(p,true);}
 function choosePlace(p:Place){setPanel(null);setSearch('');openCity(p,true);}
 function removePlace(id:string){cancelLocation();clearLocationStartup();setGeoError('');setSaved(s=>removeSavedPlace(s,id));}
 function movePlace(id:string,direction:-1|1){clearLocationStartup();setSaved(s=>moveSavedPlace(s,id,direction));}
 function showReference(){cancelLocation();requestId.current++;setForecast(withDailyDewPoint(withDailyApparentTemperatures(REFERENCE,REFERENCE_PLACE.timezone),REFERENCE_PLACE.timezone));setPlace(REFERENCE_PLACE);setError('');setBusy(false);setIsOffline(false);selectionFeedback.current?.resetIndex();setIndex(0);}
 function persistLocationStartup(pending:boolean){try{if(pending)localStorage.setItem('wl-location-startup-v1','pending');else localStorage.removeItem('wl-location-startup-v1');}catch{}}
 function clearLocationStartup(){seedLocation.current=false;persistLocationStartup(false);}
 function cancelLocation(){locationIntent.current++;geoRequest.current?.controller.abort();geoRequest.current=null;setGeoBusy(false);}
 function stopLocation(){cancelLocation();clearLocationStartup();setGeoError('');}
 function locationFailureMessage(reason:unknown){
  const kind=reason instanceof LocationDetectionError?reason.kind:'unavailable';
  if(kind==='permission')return 'Location permission is blocked. Allow location for this website in your browser settings, then try again.';
  if(kind==='insecure')return 'Location needs a secure connection. Open the HTTPS version of Weather Line and try again.';
  if(kind==='unsupported')return 'Location is not available in this browser. Open Weather Line in Safari or Chrome, or search for a city.';
  if(kind==='timeout')return 'Your location took too long to arrive. Try again, or search for a city.';
  return 'Your browser could not determine your location. Check Location Services, or open Weather Line in Safari or Chrome.';
 }
 function locate(initial=false){
  cancelLocation();const intent=locationIntent.current,request={controller:new AbortController(),background:initial};geoRequest.current=request;
  setGeoBusy(true);setGeoError('');
  void detectLocation({geolocation:navigator.geolocation,secureContext:window.isSecureContext,signal:request.controller.signal}).then(pos=>{
   if(intent!==locationIntent.current||request.controller.signal.aborted)return;
   geoRequest.current=null;setGeoBusy(false);
   const current:Place={id:'current-location',name:'Current Location',region:'',latitude:pos.coords.latitude,longitude:pos.coords.longitude,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};
   if(initial){
    const seed=seedLocation.current;clearLocationStartup();
    if(seed||savedPlacesRef.current.some(p=>p.id===current.id)){
     setSaved(s=>seed?(s.some(p=>p.id===DEFAULT_PLACE.id)?s.map(p=>p.id===DEFAULT_PLACE.id?current:p):upsertSavedPlace(s,current)):updateCurrentLocation(s,current));
     const view=activeViewRef.current,batch=refreshIdRef.current;
     if(view.collapsed||view.place.id===current.id)void loadWeather(current,true,batch);
     else void loadCityForecast(current,batch?{force:true,refreshId:batch}:{force:true}).catch(()=>{});
    }
   }else savePlace(current);
  }).catch(reason=>{
   if(intent!==locationIntent.current||request.controller.signal.aborted)return;
   geoRequest.current=null;setGeoBusy(false);setGeoError(locationFailureMessage(reason));
  });
 }
 useEffect(()=>()=>{locationIntent.current++;geoRequest.current?.controller.abort();},[]);


 const selected=forecast?(view==='daily'?forecast.daily[index]||forecast.daily[0]:forecast.hourly[index]||forecast.hourly[0]):null,day=selected as Day|null;
 const wind=(v:number|undefined)=>v===undefined?'—':Math.round(prefs.wind==='mph'?v/1.609344:v),compass=(v:number|undefined)=>v===undefined?'':['N','NE','E','SE','S','SW','W','NW'][Math.round(v/45)%8],rain=(v:number|undefined)=>v===undefined?'—':`${(prefs.rain==='in'?v/25.4:v).toFixed(2)} ${prefs.rain}`,sunTime=(s:string|undefined)=>s?date(s,{hour:'numeric',minute:'2-digit'}):'—';
 const selectedDay=selected&&forecast?forecastDayForHour(forecast.daily,selected.time,place.timezone):undefined;
 const detailLabel=prefs.feelsLike?'Actual Temp':'Feels Like';
 const detailRange=day&&view==='daily'?dailyTemperatures(day,!prefs.feelsLike):undefined;
 const detailTemperature=selected?(detailRange?`${temp(detailRange.high)} / ${temp(detailRange.low)}`:temp(airTemperature(selected,!prefs.feelsLike))):'—';
 const missingApparent=Boolean(prefs.feelsLike&&selected&&(view==='daily'?(dailyTemperatures(day!,true).high===undefined||dailyTemperatures(day!,true).low===undefined):airTemperature(selected,true)===undefined));
 const reserveApparentNotice=Boolean(prefs.feelsLike&&forecast&&(forecast.daily.some(d=>{const pair=dailyTemperatures(d,true);return pair.high===undefined||pair.low===undefined;})||forecast.hourly.slice(0,72).some(d=>airTemperature(d,true)===undefined)));
 const dewPointLabel=view==='daily'?'Avg. dew point':'Dew point',dewPoint=selected?(view==='daily'?(selected as Day).temperatureDewPointAverage:selected.temperatureDewPoint):undefined;
 const details=selected?[[detailLabel,detailTemperature],['Sunrise',sunTime(selectedDay?.sunrise)],['Precipitation',percent(selected.precipitationChance)],['Sunset',sunTime(selectedDay?.sunset)],['Rain',rain(selected.precipitationAmount)],['Wind',`${wind(selected.windSpeed)} ${prefs.wind} ${compass(selected.windDirection)}`],[dewPointLabel,temp(dewPoint)],['UV index',selected.uvIndex===undefined?'—':String(selected.uvIndex)],['Humidity',percent(selected.humidity)],['Cloud cover',percent(selected.cloudCover)]]:[];
 const summaryDay=day&&view==='daily'&&prefs.nightConditions?{...day,overnightConditionCode:nights[index]?.complete?nights[index].conditionCode:undefined}:day;
 const selectForecastIndex=(next:number)=>{if(selectionFeedback.current?.selectIndex(next))setIndex(next);};
 const changeView=(v:View)=>{if(!selectionFeedback.current?.selectView(v))return;setView(v);setIndex(0);};
 function openCity(p:Place,keyboard=false){if(collapsed)mainScroll.current=window.scrollY;tileKeyboardFocus.current=keyboard;setCollapsed(false);window.scrollTo({top:0,behavior:'auto'});loadWeather(p);}
 function closeCity(){returnToCity.current=place.id;setCollapsed(true);}
 const cityTitle=<><h1>{place.name}</h1><LocationSubtitle place={displayPlace(place)}/></>;
 const rangeControl=<div className={`segmented ${collapsed?'':'forecast-range'}`} aria-label="Forecast range"><button aria-pressed={view==='hourly'} onClick={()=>changeView('hourly')}>Hourly</button><button aria-pressed={view==='daily'} onClick={()=>changeView('daily')}>Daily</button></div>;
 return <main className={`app-shell ${collapsed?'is-compact':'is-expanded'}`} data-refresh-cycle={refreshId} data-forecast-updated-at={forecast?.source==='weatherkit'?forecast.fetchedAt:undefined}><WeatherSymbols/>{collapsed&&<nav className="toolbar" aria-label="Forecast controls"><button className="icon-button" aria-label="Settings" onClick={()=>setPanel('settings')}><Settings size={26} strokeWidth={2}/></button>{rangeControl}<button className="icon-button" aria-label="Locations" onClick={()=>openLocations()}><MapPin size={27} strokeWidth={2.3}/></button></nav>}
 {collapsed?<section className="city-list" aria-label="Saved locations"><h1 className="visually-hidden">Weather Line</h1>{hydrated?saved.length?saved.map(p=><CityTile key={p.id} place={displayPlace(p)} prefs={prefs} view={view} refreshId={refreshId} onOpen={openCity}/>):<><CityTile place={DEFAULT_PLACE} prefs={prefs} view={view} refreshId={refreshId} onOpen={openCity}/><div className="saved-cities-empty"><p>New York preview · Add a location to make it yours.</p><button className="primary-button" onClick={()=>openLocations()}>Add Location</button></div></>:<p className="locations-loading" role="status">Loading locations…</p>}</section>:<CityScreen enabled={!panel} busy={busy} label={`${place.name} forecast`} onClose={closeCity}><button className="weather-back visually-hidden" onClick={closeCity}>Back to saved locations</button><header className="location-heading"><button className="location-title" onClick={()=>openLocations()}>{cityTitle}</button>{forecast&&<div className="current-temperature" role="img" aria-label={`${conditionName(forecast.current.conditionCode)}, ${prefs.feelsLike?'Feels Like ':''}${temp(airTemperature(forecast.current,prefs.feelsLike))}`} style={{color:conditionColor(forecast.current.conditionCode,forecast.current.daylight!==false,true)}}><WeatherIcon code={forecast.current.conditionCode} daylight={forecast.current.daylight} size={35}/><span>{temp(airTemperature(forecast.current,prefs.feelsLike))}</span></div>}</header>{!collapsed&&rangeControl}
 {busy&&!forecast?<div className="forecast-message" role="status"><RefreshCw size={25} className="spinning"/><h2>Getting your forecast</h2><p>Connecting to Apple Weather…</p></div>:error&&!forecast?<div className="forecast-message" role="alert"><h2>Forecast unavailable</h2><p>{error}</p>{!collapsed&&<><button ref={retryButton} className="primary-button" onClick={()=>{retryFocus.current=document.activeElement===retryButton.current;setManualRefresh(value=>value+1);}}>Try again</button><button className="text-button" onClick={showReference}>Explore reference forecast</button></>}</div>:forecast&&<><ForecastGraph data={forecast} view={view} index={index} onSelect={selectForecastIndex} prefs={prefs} timezone={place.timezone} nights={nights} compact={collapsed}/>{!collapsed&&selected&&<><ForecastSummary text={view==='daily'?dailySummary(summaryDay!,prefs.unit,prefs.feelsLike):conditionName(selected.conditionCode)} color={conditionColor(selected.conditionCode,selected.daylight!==false,true)} sizingTexts={summarySizes} reserveNotice={reserveApparentNotice} notice={missingApparent?`Feels Like temperatures are unavailable for this ${view==='daily'?'day':'hour'}.`:undefined}/><dl className="weather-details">{details.map(([label,value])=><div key={label}><dt title={label===dewPointLabel&&view==='daily'?'5 AM–10 PM, local time':undefined}>{label}</dt><dd aria-label={label===detailLabel&&detailRange?`High ${temp(detailRange.high)}, low ${temp(detailRange.low)}`:label===dewPointLabel&&view==='daily'?`Average dew point from 5 AM to 10 PM, local time: ${dewPoint===undefined?'unavailable':temp(dewPoint)}`:undefined}>{value}</dd></div>)}</dl>
 {forecast.source==='weatherkit'&&<WeatherAlerts alerts={forecast.alerts} status={forecast.alertsStatus} timezone={place.timezone} isOffline={isOffline} onRetry={()=>setManualRefresh(value=>value+1)}/>}
 <section className="precipitation-section"><h2>{forecast.minutes?.some(m=>m.precipitationIntensity>0)?'Precipitation for the hour':forecast.minutes?'No precipitation for the hour':forecast.source==='reference'?'No precipitation for the hour':'Next-hour precipitation unavailable'}</h2>{forecast.minutes&&<div className="rain-chart"><svg viewBox="0 0 360 95" aria-label="Next-hour precipitation intensity"><path d={`M 0 95 ${forecast.minutes.map((m,i)=>`L ${i/Math.max(1,forecast.minutes!.length-1)*360} ${95-Math.min(m.precipitationIntensity/5,1)*85}`).join(' ')} L 360 95 Z`} fill="var(--rain)"/></svg><div><span>Now</span><span>15</span><span>30</span><span>45</span><span>60 min</span></div></div>}</section><MonthlyAverages place={place} source={forecast.source} prefs={prefs} refreshId={refreshId}/></>}</>}
 </CityScreen>}<footer className="app-footer">{collapsed?<><a className="weather-attribution" href="https://weatherkit.apple.com/legal-attribution.html" target="_blank" rel="noreferrer">{forecast?.attribution?.logoLightURL?<><img className="weather-brand-light" src={forecast.attribution.logoLightURL} alt="Apple Weather"/><img className="weather-brand-dark" src={forecast.attribution.logoDarkURL||forecast.attribution.logoLightURL} alt="Apple Weather"/></>:"Apple Weather"}</a>{saved.length>0&&<button className="text-button" onClick={reloadApp} disabled={reloading} aria-label="Refresh all weather and reload the latest app"><RefreshCw size={12} className={reloading?'spinning':undefined}/> Refresh all</button>}</>:forecast?.source==='reference'?<><p className="reference-badge">Illustrative New York forecast</p><p>{view==='hourly'?'Illustrative hourly preview · Not live weather':'Weather Line design preview · Not live weather'}</p><button className="text-button" onClick={()=>setManualRefresh(value=>value+1)}>Connect to live weather <RefreshCw size={12}/></button></>:forecast?.source==='weatherkit'?<><p>{isOffline?'Saved forecast · ':''}Updated {date(forecast.fetchedAt,{hour:'numeric',minute:'2-digit'})}</p><a className="weather-attribution" href="https://weatherkit.apple.com/legal-attribution.html" target="_blank" rel="noreferrer">{forecast.attribution?.logoLightURL?<><img className="weather-brand-light" src={forecast.attribution.logoLightURL} alt="Apple Weather"/><img className="weather-brand-dark" src={forecast.attribution.logoDarkURL||forecast.attribution.logoLightURL} alt="Apple Weather"/></>:"Apple Weather"}</a><button className="text-button" onClick={reloadApp} disabled={reloading} aria-label="Refresh weather and reload the latest app"><RefreshCw size={12} className={busy||reloading?'spinning':''}/> Refresh</button></>:null}</footer>
 <dialog className="app-dialog" ref={dialogRef} aria-label={panel==='settings'?'Settings':'Locations'} onCancel={()=>setPanel(null)} onClick={e=>{if(e.target===e.currentTarget)setPanel(null);}}>
 {panel==='settings'&&<div className="sheet settings-sheet"><header className="sheet-navigation"><h1>Settings</h1><button className="text-button" onClick={()=>setPanel(null)}>Done</button></header><SavedLocationsSettings locations={saved} onRemove={removePlace} onMove={movePlace} onAdd={()=>openLocations(true)}/><h2>Appearance</h2><div className="theme-grid">{THEMES.map(t=><button key={t.id} className={`theme-option ${prefs.theme===t.id?'chosen':''}`} onClick={()=>setPref('theme',t.id)} aria-pressed={prefs.theme===t.id}><span className="theme-preview" style={{background:t.bg}}><svg viewBox="0 0 80 45"><path d="M 0 33 C 12 33 17 12 29 13 S 48 33 61 23 S 71 12 80 12" stroke={t.line} fill="none" strokeWidth="2"/><circle cx="29" cy="13" r="4" fill={t.line}/></svg>{prefs.theme===t.id&&<Check size={16}/>}</span><span>{t.label}</span></button>)}</div><h2>Units</h2><div className="settings-group"><label><span>Temperature</span><select value={prefs.unit} onChange={e=>setPref('unit',e.target.value as 'F'|'C')}><option value="F">Fahrenheit (°F)</option><option value="C">Celsius (°C)</option></select></label><label><span>Wind speed</span><select value={prefs.wind} onChange={e=>setPref('wind',e.target.value as 'mph'|'km/h')}><option>mph</option><option>km/h</option></select></label><label><span>Precipitation</span><select value={prefs.rain} onChange={e=>setPref('rain',e.target.value as 'in'|'mm')}><option value="in">Inches</option><option value="mm">Millimeters</option></select></label><label><span>Feels Like temperature</span><input type="checkbox" role="switch" checked={prefs.feelsLike} onChange={e=>setPref('feelsLike',e.target.checked)}/></label></div><p className="settings-note">Use Feels Like for current and hourly temperatures, daily highs and lows, and forecast summaries. Weather details then show Actual Temp. Daily Feels Like highs and lows come from the full hourly forecast.</p><h2>Experimental</h2><div className="settings-group"><label><span>Nighttime conditions</span><input type="checkbox" role="switch" checked={prefs.nightConditions} onChange={e=>setPref('nightConditions',e.target.checked)}/></label></div><p className="settings-note">Use the most common hourly condition from 10 PM–5 AM, local time, for overnight icons and daily summaries. Complete nights only. A question mark means night data is unavailable.</p><p className="settings-note" role="status">{nightCoverage}</p><h2>Weather Line</h2><div className="about-app"><p>A browser recreation of the final Weather Line design, using original local screenshots and icons.</p><p>Live forecasts are provided by Apple Weather. {forecast?.source==='weatherkit'?'WeatherKit is connected.':'Choose a location to connect to WeatherKit.'}</p><p><a href="./privacy.html" target="_blank" rel="noreferrer">Privacy</a><a href="./terms.html" target="_blank" rel="noreferrer">Terms of use</a></p><p>Street addresses are provided by Apple Maps.</p><a href="https://weatherlineapp.com/" target="_blank" rel="noreferrer">Original Weather Line <ChevronRight size={15}/></a></div></div>}
 {panel==='locations'&&<div className="sheet locations-sheet"><header className="sheet-navigation"><h1>{locationsReturn.current==='settings'?'Add Location':'Locations'}</h1><button className="text-button" onClick={()=>setPanel(locationsReturn.current)}>Done</button></header><label className="search-field"><Search size={20}/><input placeholder="Search for a city" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search for a city"/>{search&&<button className="clear-search" aria-label="Clear search" onClick={()=>setSearch('')}><X size={16}/></button>}</label><button className="locate-button" onClick={()=>locate()} disabled={geoBusy}><LocateFixed size={19}/>{geoBusy?'Finding your location…':'Use Current Location'}</button>{geoBusy&&<button className="text-button" onClick={stopLocation}>Cancel</button>}{geoError&&<p role="status" className="search-status">{geoError}</p>}<div role="status" className="search-status">{searching?'Searching…':searchError?searchError:search.length>=2&&results.length===0?'No cities found. Try a nearby city.':''}</div>{search.length>=2?<div className="location-results">{results.map(p=><button key={p.id} onClick={()=>savePlace(p)}><span><strong>{p.name}</strong><small>{p.region}</small></span><Plus size={20}/></button>)}</div>:<><h2>Saved Locations</h2><div className="location-results">{saved.map(p=><div key={p.id} className="saved-location"><button onClick={()=>choosePlace(p)}><span><strong>{p.name}</strong><small>{p.region}</small></span>{p.id===place.id&&<Check size={18}/>}</button></div>)}</div><button className="text-button manage-locations-link" onClick={manageLocations}>Manage in Settings <ChevronRight size={16}/></button><p className="settings-note">Your locations and preferences stay in this browser.</p></>}</div>}
 </dialog></main>;
}
