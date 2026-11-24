const SEARCH = ["google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex.", "brave.", "ecosia."];
const SOCIAL = ["facebook.", "fb.com", "instagram.", "twitter.", "x.com", "t.co", "linkedin.", "reddit.", "tiktok.", "youtube.", "threads."];

export interface Attribution {
  channel: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
}

export function classify(loc: Location, doc: Document): Attribution {
  const q = new URLSearchParams(loc.search);
  const a: Attribution = { channel: "direct" };
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const v = q.get(k);
    if (v) a[k] = v.slice(0, 200);
  }
  const ref = doc.referrer;
  let refHost = "";
  try {
    if (ref) {
      const u = new URL(ref);
      if (u.host !== loc.host) { refHost = u.host; a.referrer = ref.slice(0, 500); }
    }
  } catch { /* ignore */ }

  if (a.utm_medium && /cpc|ppc|paid|paidsearch|paidsocial/i.test(a.utm_medium)) a.channel = "paid";
  else if (a.utm_source || a.utm_medium || a.utm_campaign) a.channel = /mail|email|newsletter/i.test(a.utm_medium ?? "") ? "email" : "campaign";
  else if (!refHost) a.channel = "direct";
  else if (SEARCH.some((s) => refHost.includes(s))) a.channel = "organic_search";
  else if (SOCIAL.some((s) => refHost.includes(s))) a.channel = "social";
  else a.channel = "referral";

  if (a.channel === "organic_search" && !a.utm_source) a.utm_source = refHost.split(".")[0];
  if (a.channel === "referral" && !a.utm_source) a.utm_source = refHost;
  return a;
}
