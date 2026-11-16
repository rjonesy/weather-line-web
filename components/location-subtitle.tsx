import {MapPin} from 'lucide-react';
import type {Place} from '@/lib/weather';

export function LocationSubtitle({place,hasStreetAddress=false}:{place:Place;hasStreetAddress?:boolean}){
 return <p><span className="location-label">{place.id==='current-location'&&<MapPin size={12}/>} {place.region}</span>{hasStreetAddress&&<span className="address-attribution" translate="no">Google Maps</span>}</p>;
}
