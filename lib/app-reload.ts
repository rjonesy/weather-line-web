export const RELOAD_STATE_KEY = 'wl-app-reload-context-v1';
const reloadParameter = '__wl_reload', contextTtl = 10 * 60 * 1000;

export type ReloadContext = {
  version: 1;
  createdAt: number;
  pathname: string;
  placeId?: string;
  collapsed: boolean;
  view: 'hourly' | 'daily';
  index: number;
  scrollY: number;
  mainScroll: number;
};
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type StorageAccess = StorageLike | null | undefined | (() => StorageLike | null | undefined);

export function createAppReloadUrl(currentUrl: string, nonce: string): string {
  const url = new URL(currentUrl);
  url.searchParams.set(reloadParameter, nonce);
  return url.href;
}

export function cleanAppReloadUrl(currentUrl: string): string {
  const url = new URL(currentUrl);
  url.searchParams.delete(reloadParameter);
  return url.href;
}

const fields = new Set(['version', 'createdAt', 'pathname', 'placeId', 'collapsed', 'view', 'index', 'scrollY', 'mainScroll']);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const scroll = (value: unknown): value is number => finite(value) && value >= 0 && value <= 100_000;

/** Only bounded UI state may cross a document reload; no Place/address data. */
export function parseReloadContext(raw: string | null, now = Date.now()): ReloadContext | undefined {
  if (typeof raw !== 'string' || !finite(now)) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const context = value as Record<string, unknown>;
    if (Object.keys(context).some(key => !fields.has(key)) || context.version !== 1
      || !finite(context.createdAt) || context.createdAt < 0 || context.createdAt > now || now - context.createdAt >= contextTtl
      || typeof context.pathname !== 'string' || !context.pathname.startsWith('/') || context.pathname.length > 1024 || /[?#\u0000-\u001f\u007f-\u009f]/.test(context.pathname)
      || typeof context.collapsed !== 'boolean' || (context.view !== 'hourly' && context.view !== 'daily')
      || !finite(context.index) || !Number.isInteger(context.index) || context.index < 0 || context.index > 71
      || !scroll(context.scrollY) || !scroll(context.mainScroll)) return undefined;
    if (context.placeId !== undefined && (typeof context.placeId !== 'string' || !context.placeId.trim()
      || context.placeId !== context.placeId.trim() || context.placeId.length > 256 || /[\u0000-\u001f\u007f-\u009f]/.test(context.placeId))) return undefined;
    return {
      version: 1, createdAt: context.createdAt, pathname: context.pathname, collapsed: context.collapsed, view: context.view,
      index: context.index, scrollY: context.scrollY, mainScroll: context.mainScroll,
      ...(context.placeId !== undefined ? {placeId: context.placeId as string} : {}),
    };
  } catch { return undefined; }
}

function resolveStorage(storage: StorageAccess): StorageLike | null | undefined {
  return typeof storage === 'function' ? storage() : storage;
}
function discard(storage: StorageLike | null | undefined) {
  try { storage?.removeItem(RELOAD_STATE_KEY); } catch {}
}

export function saveReloadContext(storage: StorageAccess, context: ReloadContext, now = Date.now()): boolean {
  let store: StorageLike | null | undefined;
  try {
    store = resolveStorage(storage);
    if (!store) return false;
    const parsed = parseReloadContext(JSON.stringify(context), now);
    if (!parsed) {discard(store); return false;}
    store.setItem(RELOAD_STATE_KEY, JSON.stringify(parsed));
    return true;
  } catch { discard(store); return false; }
}

/** Remove even invalid/unreadable data; never restore when removal is blocked. */
export function consumeReloadContext(storage: StorageAccess, now = Date.now()): ReloadContext | undefined {
  let store: StorageLike | null | undefined, raw: string | null = null, removed = false;
  try {
    store = resolveStorage(storage);
    if (!store) return undefined;
    try { raw = store.getItem(RELOAD_STATE_KEY); }
    finally {
      try { store.removeItem(RELOAD_STATE_KEY); removed = true; } catch {}
    }
  } catch {}
  return removed ? parseReloadContext(raw, now) : undefined;
}
