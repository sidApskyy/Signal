import { get, set } from "./storage.js";
import { uuid } from "./identity.js";

const SESSION_KEY = "sig_sid";
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity → new session

interface SessionState { id: string; last: number; }

function read(): SessionState | null {
  const raw = get(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionState; } catch { return null; }
}

/** Current session id; rotates after 30 min inactivity. */
export function sessionId(now = Date.now()): { id: string; isNew: boolean } {
  const s = read();
  if (s && now - s.last < TIMEOUT_MS) {
    set(SESSION_KEY, JSON.stringify({ id: s.id, last: now }), 1);
    return { id: s.id, isNew: false };
  }
  const id = uuid();
  set(SESSION_KEY, JSON.stringify({ id, last: now }), 1);
  return { id, isNew: true };
}

export function touch(now = Date.now()): void {
  const s = read();
  if (s) set(SESSION_KEY, JSON.stringify({ id: s.id, last: now }), 1);
}
