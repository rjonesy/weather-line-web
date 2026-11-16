import {LocateFixed} from 'lucide-react';

type Props={busy:boolean;error:string;onRetry:()=>void;onCancel:()=>void;onSearch?:()=>void};

export function LocationStatus({busy,error,onRetry,onCancel,onSearch}:Props){
 return <section className="location-status" aria-label="Current location" aria-live="polite">
  {!busy&&!error?<button className="text-button" onClick={onRetry}><LocateFixed size={17} aria-hidden="true"/>Use Current Location</button>:<>
   <p>{busy?'Finding your location…':error}</p>
   <div className="location-status-actions">{busy?<button className="text-button" onClick={onCancel}>Cancel</button>:<><button className="text-button" onClick={onRetry}>Try again</button>{onSearch&&<button className="text-button" onClick={onSearch}>Search for a city</button>}</>}</div>
  </>}
 </section>;
}
