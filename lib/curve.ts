export type Point = {x:number;y:number};
export type CurveSegment = {start:Point;end:Point;c1?:Point;c2?:Point;path:string};

// Uniform Catmull–Rom, matching Weather Line's original UIBezierPath smoothing.
// Sharing neighboring points gives the same tangent on both sides of every icon.
export function curveSegments(points:Point[]):CurveSegment[] {
  return points.slice(1).map((end,i)=>{
    const start=points[i];
    if(points.length<4)return {start,end,path:`M ${start.x} ${start.y} L ${end.x} ${end.y}`};
    const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+2)];
    const c1={x:start.x+(end.x-before.x)/6,y:start.y+(end.y-before.y)/6};
    const c2={x:end.x-(after.x-start.x)/6,y:end.y-(after.y-start.y)/6};
    return {start,end,c1,c2,path:`M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`};
  });
}
export function curve(points:Point[]) {
  if(!points.length)return '';
  return `M ${points[0].x} ${points[0].y}`+curveSegments(points).map(s=>s.path.replace(/^M \S+ \S+/, '')).join('');
}

/** Keep missing forecast values as gaps, rather than inventing connecting data. */
export function curveRuns(points:(Point|null|undefined)[]):{startIndex:number;points:Point[]}[] {
  const runs:{startIndex:number;points:Point[]}[]=[];
  let run:{startIndex:number;points:Point[]}|undefined;
  points.forEach((point,index)=>{
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){run=undefined;return;}
    if(!run){run={startIndex:index,points:[]};runs.push(run);}
    run.points.push(point);
  });
  return runs;
}
