'use client';

import {useRef,type ReactNode} from 'react';
import {usePullToClose} from '@/components/use-pull-to-close';

/** Keep gesture frames local so the forecast charts don't rerender while dragging. */
export function CityScreen({children,enabled,busy,label,onClose}:{children:ReactNode;enabled:boolean;busy:boolean;label:string;onClose:()=>void}){
 const rootRef=useRef<HTMLElement>(null);
 const{pullDistance,isPulling}=usePullToClose({enabled,onClose,rootRef});
 return <section ref={rootRef} className={`forecast-sheet city-screen ${isPulling?'is-pulling':''}`} style={{transform:pullDistance?`translateY(${pullDistance}px)`:undefined}} aria-busy={busy} aria-label={label}>{children}</section>;
}
