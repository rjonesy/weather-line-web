export type PullPoint = {x: number; y: number};
export type PullGesture = {
  start: PullPoint;
  phase: 'pending' | 'pulling' | 'cancelled';
  distance: number;
  /** Remains true after a reversal so releasing cannot activate the handle. */
  claimed: boolean;
};

export const PULL_CLOSE_THRESHOLD = 84;
const intentDistance = 12;
const verticalRatio = 1.2;

export function beginPull(point: PullPoint, {atTop, eligible = true, touches = 1}: {atTop: boolean; eligible?: boolean; touches?: number}): PullGesture | null {
  if (!atTop || !eligible || touches !== 1) return null;
  return {start: {...point}, phase: 'pending', distance: 0, claimed: false};
}

export function movePull(gesture: PullGesture, point: PullPoint, {atTop, touches = 1}: {atTop: boolean; touches?: number}): PullGesture {
  if (gesture.phase === 'cancelled') return gesture;
  const dx = point.x - gesture.start.x, dy = point.y - gesture.start.y;
  if (!atTop || touches !== 1) return {...gesture, phase: 'cancelled', distance: 0};
  if (gesture.phase === 'pending') {
    if (Math.hypot(dx, dy) < intentDistance) return gesture;
    // Once a horizontal/upward gesture is identified it stays native for its
    // entire lifetime, even if the finger later changes direction.
    if (Math.abs(dx) >= dy) return {...gesture, phase: 'cancelled', distance: 0};
    if (dy < Math.abs(dx) * verticalRatio) return gesture;
  }
  if (dy < 0) return {...gesture, phase: 'cancelled', distance: 0};
  return {...gesture, phase: 'pulling', distance: Math.max(0, dy), claimed: true};
}

export function pullTranslation(gesture: PullGesture | null): number {
  return gesture?.phase === 'pulling' ? Math.min(140, gesture.distance * 0.75) : 0;
}

/** Reserve an unambiguous downward first move before Safari starts overscroll. */
export function isEarlyDownwardPull(gesture: PullGesture, point: PullPoint): boolean {
  const dx = point.x - gesture.start.x, dy = point.y - gesture.start.y;
  return gesture.phase === 'pending' && dy > 0 && dy >= Math.abs(dx) * 2;
}

export function shouldClosePull(gesture: PullGesture | null, threshold = PULL_CLOSE_THRESHOLD): boolean {
  return gesture?.phase === 'pulling' && gesture.distance >= threshold;
}
