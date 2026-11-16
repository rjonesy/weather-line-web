type Props={text:string;color:string;sizingTexts:readonly string[];notice?:string;reserveNotice?:boolean};

/** Reserve the longest forecast copy in both ranges without clipping its visible text. */
export function ForecastSummary({text,color,sizingTexts,notice,reserveNotice=false}:Props){
 return <div className="selection-summary" aria-live="polite">
  <div className="condition-copy">
   <h2 className="condition-heading" style={{color}}>{text}</h2>
   <div className="condition-sizing" aria-hidden="true">{sizingTexts.map((copy,index)=><span className="condition-heading" key={index}>{copy}</span>)}</div>
  </div>
  {(notice||reserveNotice)&&<div className="summary-notice"><p>{notice}</p><p className="summary-notice-sizing" aria-hidden="true">Feels Like temperatures are unavailable for this hour.</p></div>}
 </div>;
}
