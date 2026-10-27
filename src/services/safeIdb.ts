import { get, set, del, keys, createStore, UseStore } from 'idb-keyval';

let customStore: UseStore | null = null;
const memoryFallback = new Map<string, any>();

function getStore(): UseStore | undefined {
  return customStore || undefined;
}

function resetStore() {
  try {
    customStore = createStore(`hhm_pdf_db_${Date.now()}`, 'hhm_store');
  } catch {
    customStore = null;
  }
}

function isConnectionClosingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes('connection is closing') ||
    msg.includes('force close') ||
    msg.includes('delete origin') ||
    msg.includes('database closed') ||
    msg.includes('invalidstateerror') ||
    msg.includes('unknownerror')
  );
}

export async function safeGet<T>(key: string): Promise<T | undefined> {
  try {
    return await get<T>(key, getStore());
  } catch (err) {
    if (isConnectionClosingError(err)) {
      console.warn('IndexedDB connection closed/deleted, resetting store connection:', err);
      resetStore();
      try {
        return await get<T>(key, getStore());
      } catch {
        // Fallback
      }
    }
    try {
      const localVal = localStorage.getItem(key);
      if (localVal !== null) return JSON.parse(localVal) as T;
    } catch {
      // Ignore localStorage errors
    }
    return memoryFallback.get(key) as T | undefined;
  }
}

export async function safeSet(key: string, val: any): Promise<void> {
  try {
    await set(key, val, getStore());
  } catch (err) {
    if (isConnectionClosingError(err)) {
      console.warn('IndexedDB connection closed/deleted, resetting store connection:', err);
      resetStore();
      try {
        await set(key, val, getStore());
        return;
      } catch {
        // Fallback
      }
    }
    try {
      if (
        typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean' ||
        Array.isArray(val) ||
        (typeof val === 'object' && val !== null && !(val instanceof Uint8Array))
      ) {
        localStorage.setItem(key, JSON.stringify(val));
      }
    } catch {
      // Ignore localStorage errors
    }
    memoryFallback.set(key, val);
  }
}

export async function safeDel(key: string): Promise<void> {
  try {
    await del(key, getStore());
  } catch (err) {
    if (isConnectionClosingError(err)) {
      resetStore();
      try {
        await del(key, getStore());
        return;
      } catch {}
    }
    try {
      localStorage.removeItem(key);
    } catch {}
    memoryFallback.delete(key);
  }
}

export async function safeKeys(): Promise<string[]> {
  try {
    const k = await keys(getStore());
    return k.map((x) => String(x));
  } catch (err) {
    if (isConnectionClosingError(err)) {
      resetStore();
      try {
        const k = await keys(getStore());
        return k.map((x) => String(x));
      } catch {}
    }
    try {
      const localKeys = Object.keys(localStorage);
      const memKeys = Array.from(memoryFallback.keys());
      return Array.from(new Set([...localKeys, ...memKeys]));
    } catch {
      return Array.from(memoryFallback.keys());
    }
  }
}

export function clearMemoryFallback(): void {
  memoryFallback.clear();
}
