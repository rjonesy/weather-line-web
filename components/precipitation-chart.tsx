'use client';
import {useId,useLayoutEffect,useRef,useState} from 'react';
import {curve} from '@/lib/curve';
import {precipitationPoints} from '@/lib/precipitation-graph';
import type {Forecast} from '@/lib/weather';

export function PrecipitationChart({minutes}:{minutes:Forecast['minutes']}){
 const graph=useRef<HTMLDivElement>(null),[width,setWidth]=useState(360),clipId=`rain-${useId().replace(/:/g,'')}`;
 useLayoutEffect(()=>{const element=graph.current;if(!element)return;const measure=()=>setWidth(element.clientWidth);measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[minutes]);
 const samples=precipitationPoints(minutes),available=samples.length>0;
 const height=150,left=60,right=Math.max(left+1,width-12),x=(minute:number)=>left+minute/60*(right-left);
 const points=samples.map(s=>({x:x(s.minute),y:height-s.height*height}));
 const path=points.length?`${curve(points)} L ${points.at(-1)!.x} ${height} L ${points[0].x} ${height} Z`:'';
 const assetBase=(import.meta.env as {BASE_URL?:string}).BASE_URL||'/';
 return <section className="precipitation-section"><h2>{!available?'Next-hour precipitation unavailable':samples.some(m=>m.intensity>0)?'Precipitation for the hour':'No precipitation for the hour'}</h2>{available&&<div className="rain-chart">
  <div className="rain-plot" ref={graph}>
   <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Next-hour precipitation intensity, from light to heavy">
    <defs><clipPath id={clipId}><rect x={left} y="0" width={Math.max(1,right-left)} height={height}/></clipPath></defs>
    {[height/3,height*2/3].map(y=><line key={y} x1="0" x2={width} y1={y} y2={y} stroke="var(--rule)"/>)}
    {path&&<path d={path} fill="var(--rain)" clipPath={`url(#${clipId})`}/>}
   </svg>
   <div className="rain-legend" aria-hidden="true">{['heavy','moderate','light'].map(level=><span key={level}><span className="rain-tier-icon" style={{maskImage:`url(${assetBase}precipitation-icons/${level}.png)`,WebkitMaskImage:`url(${assetBase}precipitation-icons/${level}.png)`}}/></span>)}</div>
  </div>
  <svg className="rain-axis" viewBox={`0 0 ${width} 24`} aria-hidden="true">{[0,10,20,30,40,50,60].map(minute=><text key={minute} x={x(minute)} y="19" textAnchor="middle">{minute===30?'30min':minute}</text>)}</svg>
 </div>}</section>;
}
