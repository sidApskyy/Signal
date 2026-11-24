import { get, set } from "./storage.js";

const VISITOR_KEY = "sig_vid";

export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Anonymous first-party visitor ID. No fingerprinting — a random UUID persisted client-side. */
export function visitorId(): string {
  let id = get(VISITOR_KEY);
  if (!id) { id = uuid(); set(VISITOR_KEY, id); }
  return id;
}
