/** Small localStorage helpers. Storage can be full or blocked (private windows); the app must still work. */

export function readStored(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The choice simply lasts for this visit.
  }
}

export function readIds(key: string): string[] {
  try {
    const raw = readStored(key);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function writeIds(key: string, ids: string[]) {
  writeStored(key, JSON.stringify(ids));
}

export function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id];
}
