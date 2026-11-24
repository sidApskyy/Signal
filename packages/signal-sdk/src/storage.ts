/** First-party storage with graceful downgrade: localStorage → cookie → memory. */
const mem = new Map<string, string>();
let disabled = false;

export function setStorageDisabled(v: boolean) { disabled = v; }

export function get(key: string): string | null {
  if (disabled) return mem.get(key) ?? null;
  try { const v = localStorage.getItem(key); if (v !== null) return v; } catch { /* blocked */ }
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
    if (m) return decodeURIComponent(m[1]);
  } catch { /* blocked */ }
  return mem.get(key) ?? null;
}

export function set(key: string, value: string, days = 365): void {
  if (disabled) { mem.set(key, value); return; }
  try { localStorage.setItem(key, value); return; } catch { /* blocked */ }
  try {
    document.cookie = `${key}=${encodeURIComponent(value)};max-age=${days * 86400};path=/;SameSite=Lax`;
    return;
  } catch { /* blocked */ }
  mem.set(key, value);
}

export function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
  try { document.cookie = `${key}=;max-age=0;path=/`; } catch { /* noop */ }
  mem.delete(key);
}
