import {MapPin} from 'lucide-react';
import type {Place} from '@/lib/weather';

export function LocationSubtitle({place}:{place:Place}){
 return <p><span className="location-label">{place.id==='current-location'&&<MapPin size={12}/>} {place.region}</span></p>;
}
