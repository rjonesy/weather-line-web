type View = 'hourly' | 'daily';
type Selection = {view: View; index: number};
type Dependencies = {vibrate?: (duration: number) => boolean; now?: () => number};
const validIndex = (index: number) => Number.isInteger(index) && index >= 0;

/**
 * Keep selection synchronous across pointerdown/move/click and React batching.
 * Return values report selection changes, independent of haptic availability.
 */
export function createSelectionHaptics(initial: Selection, dependencies: Dependencies = {}) {
  let selection: Selection = {...initial, index: validIndex(initial.index) ? initial.index : 0};
  let lastTick = -Infinity;
  const now = dependencies.now || (() => globalThis.performance.now());

  function tick() {
    try {
      const time = now();
      if (!Number.isFinite(time) || time - lastTick < 50) return;
      if (dependencies.vibrate) {
        lastTick = time;
        dependencies.vibrate(5);
      } else {
        // Resolve capability at event time: this helper can be created during
        // SSR, before navigator exists, or before browser capabilities change.
        const navigator = globalThis.navigator;
        if (typeof navigator?.vibrate !== 'function') return;
        lastTick = time;
        navigator.vibrate(5);
      }
    } catch {}
  }

  return {
    selectIndex(index: number): boolean {
      if (!validIndex(index) || index === selection.index) return false;
      // Update even if the 50ms limit suppresses this particular tick.
      selection = {...selection, index};
      tick();
      return true;
    },
    selectView(view: View): boolean {
      if ((view !== 'hourly' && view !== 'daily') || view === selection.view) return false;
      selection = {view, index: 0};
      tick();
      return true;
    },
    resetIndex(index = 0): void {
      if (validIndex(index)) selection = {...selection, index};
    },
    getSelection(): Selection { return {...selection}; },
  };
}
