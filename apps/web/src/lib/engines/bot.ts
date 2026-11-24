/** Bot classification — classify, never silently drop. */
export type BotClass = "human" | "known_bot" | "suspected_bot" | "internal";

const KNOWN = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|applebot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|ia_archiver/i;
const SUSPICIOUS = /headlesschrome|phantomjs|puppeteer|playwright|selenium|curl\/|wget\/|python-requests|go-http-client|java\/|libwww|httpclient|axios\//i;

export function classifyBot(ua: string | null, eventsPerMinute?: number): BotClass {
  if (!ua) return "suspected_bot";
  if (KNOWN.test(ua)) return "known_bot";
  if (SUSPICIOUS.test(ua)) return "suspected_bot";
  if (eventsPerMinute !== undefined && eventsPerMinute > 120) return "suspected_bot";
  return "human";
}
