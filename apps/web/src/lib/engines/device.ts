import { UAParser } from "ua-parser-js";

export interface DeviceInfo {
  deviceCategory: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  isBot: boolean;
}

const KNOWN_BOTS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|applebot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|headlesschrome|phantomjs|curl\/|wget\/|python-requests|httpclient|uptime|pingdom/i;

export function parseDevice(ua: string | null): DeviceInfo {
  if (!ua) return { deviceCategory: "unknown", browser: null, browserVersion: null, os: null, isBot: false };
  if (KNOWN_BOTS.test(ua)) {
    return { deviceCategory: "bot", browser: null, browserVersion: null, os: null, isBot: true };
  }
  const r = new UAParser(ua).getResult();
  const t = r.device.type;
  return {
    deviceCategory: t === "mobile" ? "mobile" : t === "tablet" ? "tablet" : "desktop",
    browser: r.browser.name ?? null,
    browserVersion: r.browser.major ?? null,
    os: r.os.name ?? null,
    isBot: false,
  };
}
