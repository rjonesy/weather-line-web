export type LocationDetectionErrorKind = 'permission' | 'timeout' | 'unavailable' | 'unsupported' | 'insecure';
export type GeolocationSource = Pick<Geolocation, 'getCurrentPosition'>;
export type LocationDetectionEnvironment = {geolocation?: GeolocationSource; secureContext?: boolean; signal?: AbortSignal};
export type LocationDetectionOptions = {preciseTimeoutMs?: number; coarseTimeoutMs?: number; watchdogGraceMs?: number; coarseMaximumAgeMs?: number};

const messages: Record<LocationDetectionErrorKind, string> = {
  permission: 'Location access is blocked. Allow location for this website, then try again.',
  timeout: 'Finding your location took too long. Try again or search for a city.',
  unavailable: 'Your location is temporarily unavailable. Try again or search for a city.',
  unsupported: 'Location is not available in this browser. Search for a city instead.',
  insecure: 'Location needs a secure connection. Open the HTTPS app or search for a city.',
};

export class LocationDetectionError extends Error {
  readonly kind: LocationDetectionErrorKind;
  constructor(kind: LocationDetectionErrorKind) {
    super(messages[kind]);
    this.name = 'LocationDetectionError';
    this.kind = kind;
  }
}

function duration(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function failureKind(error: unknown): 'permission' | 'timeout' | 'unavailable' {
  if (error && typeof error === 'object') {
    const {code, name} = error as {code?: unknown; name?: unknown};
    if (code === 1 || name === 'NotAllowedError' || name === 'SecurityError') return 'permission';
    if (code === 3 || name === 'TimeoutError') return 'timeout';
  }
  return 'unavailable';
}

function validPosition(value: unknown): value is GeolocationPosition {
  if (!value || typeof value !== 'object' || !('coords' in value)) return false;
  const coords = value.coords;
  if (!coords || typeof coords !== 'object') return false;
  const {latitude, longitude, accuracy} = coords as {latitude?: unknown; longitude?: unknown; accuracy?: unknown};
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    && (accuracy === undefined || (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0));
}

/** A precise fix first, then one coarse/recent fix if the position provider cannot deliver. */
export function detectLocation({geolocation, secureContext, signal}: LocationDetectionEnvironment, options: LocationDetectionOptions = {}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {reject(new DOMException('Location detection was cancelled.', 'AbortError')); return;}
    if (secureContext === false) {reject(new LocationDetectionError('insecure')); return;}
    if (!geolocation) {reject(new LocationDetectionError('unsupported')); return;}

    let getPosition: GeolocationSource['getCurrentPosition'];
    try {getPosition = geolocation.getCurrentPosition;} catch (error) {reject(new LocationDetectionError(failureKind(error))); return;}
    if (typeof getPosition !== 'function') {reject(new LocationDetectionError('unsupported')); return;}

    const preciseTimeout = duration(options.preciseTimeoutMs, 8000);
    const coarseTimeout = duration(options.coarseTimeoutMs, 12000);
    const coarseMaximumAge = duration(options.coarseMaximumAgeMs, 60000);
    // Native timeout excludes the permission prompt. Give consent a generous
    // grace period while still recovering from a browser that never calls back.
    const watchdogGrace = duration(options.watchdogGraceMs, 30000);
    let finished = false, attempt = 0;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const clearWatchdog = () => {if (watchdog !== undefined) clearTimeout(watchdog); watchdog = undefined;};
    const clean = () => {clearWatchdog(); signal?.removeEventListener('abort', cancel);};
    const fail = (kind: LocationDetectionErrorKind) => {
      if (finished) return;
      finished = true; clean(); reject(new LocationDetectionError(kind));
    };
    const cancel = () => {
      if (finished) return;
      finished = true; clean(); reject(new DOMException('Location detection was cancelled.', 'AbortError'));
    };
    const run = (precise: boolean) => {
      const request = ++attempt;
      const active = () => !finished && request === attempt;
      const failed = (kind: 'permission' | 'timeout' | 'unavailable') => {
        if (!active()) return;
        clearWatchdog();
        if (kind === 'permission' || !precise) fail(kind);
        else run(false);
      };
      const timeout = precise ? preciseTimeout : coarseTimeout;
      watchdog = setTimeout(() => failed('timeout'), timeout + watchdogGrace);
      try {
        getPosition.call(geolocation, position => {
          if (!active()) return;
          if (!validPosition(position)) {failed('unavailable'); return;}
          finished = true; clean(); resolve(position);
        }, error => failed(failureKind(error)), {enableHighAccuracy: precise, timeout, maximumAge: precise ? 0 : coarseMaximumAge});
      } catch (error) {failed(failureKind(error));}
    };
    signal?.addEventListener('abort', cancel, {once: true});
    if (signal?.aborted) cancel();
    else run(true);
  });
}
