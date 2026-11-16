'use client';

import {useEffect, useRef, useState, type RefObject} from 'react';
import {beginPull, movePull, isEarlyDownwardPull, pullTranslation, shouldClosePull, PULL_CLOSE_THRESHOLD, type PullGesture} from '../lib/pull-to-close.ts';

type Options = {enabled: boolean; onClose: () => void; rootRef: RefObject<HTMLElement | null>; threshold?: number};
let clearReleaseClickGuard: (() => void) | undefined;

function atDocumentTop() {
  return (document.scrollingElement?.scrollTop || 0) <= 1 && window.scrollY <= 1;
}

function eligibleTarget(target: EventTarget | null, root: HTMLElement) {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  if (!element || !root.contains(element) || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return false;
  if (element.closest('[data-pull-ignore]')) return false;
  const control = element.closest('a, button, input, select, textarea, option, [contenteditable], [role="button"], [role="slider"], [role="switch"], [role="checkbox"], [role="combobox"]');
  const handle = control?.matches('.sheet-handle, .location-title');
  const chartPoint = control?.tagName.toLowerCase() === 'rect' && control.getAttribute('role') === 'button' && control.closest('.forecast-chart');
  if (control && !handle && !chartPoint) return false;
  // A nested scroller with its own vertical offset must retain its scroll gesture.
  for (let parent: Element | null = element; parent && parent !== root; parent = parent.parentElement) {
    if (parent.scrollTop > 1) return false;
  }
  return true;
}

function suppressReleaseClick(x: number, y: number) {
  // The detail view can disappear before Safari sends its synthetic click. Keep
  // this one-shot guard alive briefly across the hook's enabled=false cleanup.
  clearReleaseClickGuard?.();
  const remove = () => {
    document.removeEventListener('click', suppress, true); clearTimeout(timer);
    if (clearReleaseClickGuard === remove) clearReleaseClickGuard = undefined;
  };
  const suppress = (event: MouseEvent) => {
    if (event.detail === 0 || Math.hypot(event.clientX - x, event.clientY - y) > 32) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    remove();
  };
  const timer = setTimeout(remove, 450);
  clearReleaseClickGuard = remove;
  document.addEventListener('click', suppress, true);
}

/**
 * Attach rootRef to the expanded city sheet. Render pullDistance as a translateY;
 * isPulling=false lets the caller's CSS return short/cancelled pulls to zero.
 * The default close threshold is 84 raw touch pixels; translation has resistance.
 */
export function usePullToClose({enabled, onClose, rootRef, threshold = PULL_CLOSE_THRESHOLD}: Options) {
  const [pullDistance, setPullDistance] = useState(0), [isPulling, setIsPulling] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {onCloseRef.current = onClose;}, [onClose]);
  useEffect(() => {
    setPullDistance(0); setIsPulling(false);
    const root = rootRef.current;
    if (!enabled || !root) return;
    let gesture: PullGesture | null = null, identifier: number | null = null;
    const reset = () => {gesture = null; identifier = null; setPullDistance(0); setIsPulling(false);};
    const find = (touches: TouchList) => Array.from(touches).find(touch => touch.identifier === identifier);
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1) {reset(); return;}
      const touch = event.touches[0];
      gesture = beginPull({x: touch.clientX, y: touch.clientY}, {atTop: atDocumentTop(), eligible: eligibleTarget(event.target, root)});
      identifier = gesture ? touch.identifier : null;
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      const touch = find(event.touches);
      if (!touch) {reset(); return;}
      const point = {x: touch.clientX, y: touch.clientY};
      gesture = movePull(gesture, point, {atTop: atDocumentTop(), touches: event.touches.length});
      if (gesture.phase === 'pulling' || isEarlyDownwardPull(gesture, point)) {
        if (!event.cancelable) {gesture = {...gesture, phase: 'cancelled', distance: 0};}
        else {
          // Do not leave a small downward first move uncancelled: Safari may
          // otherwise take ownership before the 12px visual intent threshold.
          event.preventDefault();
          gesture = {...gesture, claimed: true};
        }
      }
      setPullDistance(pullTranslation(gesture));
      setIsPulling(gesture.phase === 'pulling');
    };
    const end = (event: TouchEvent) => {
      if (!gesture) return;
      const touch = find(event.changedTouches);
      if (!touch || event.touches.length) {reset(); return;}
      // Never claim a gesture on release: it must already have prevented native
      // overscroll in touchmove. The final position can revoke a threshold pull.
      if (gesture.phase === 'pulling') gesture = movePull(gesture, {x: touch.clientX, y: touch.clientY}, {atTop: atDocumentTop()});
      const close = atDocumentTop() && shouldClosePull(gesture, threshold);
      if (gesture.claimed) suppressReleaseClick(touch.clientX, touch.clientY);
      reset();
      if (close) onCloseRef.current();
    };
    document.addEventListener('touchstart', start, {passive: true, capture: true});
    document.addEventListener('touchmove', move, {passive: false, capture: true});
    document.addEventListener('touchend', end, {passive: true, capture: true});
    document.addEventListener('touchcancel', reset, {passive: true, capture: true});
    return () => {
      document.removeEventListener('touchstart', start, true);
      document.removeEventListener('touchmove', move, true);
      document.removeEventListener('touchend', end, true);
      document.removeEventListener('touchcancel', reset, true);
    };
  }, [enabled, rootRef, threshold]);
  return {pullDistance, isPulling};
}
