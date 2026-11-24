import { describe, it, expect } from "vitest";
import { sessionId } from "./session";
import { classify } from "./attribution";

describe("session engine", () => {
  it("creates a session and reuses within 30 min", () => {
    const t0 = Date.now();
    const a = sessionId(t0);
    expect(a.isNew).toBe(true);
    const b = sessionId(t0 + 10 * 60e3);
    expect(b.isNew).toBe(false);
    expect(b.id).toBe(a.id);
  });
  it("rotates after 30 min inactivity", () => {
    const t0 = Date.now();
    const a = sessionId(t0);
    const b = sessionId(t0 + 31 * 60e3);
    expect(b.isNew).toBe(true);
    expect(b.id).not.toBe(a.id);
  });
});

describe("attribution engine", () => {
  const mk = (url: string, ref: string) =>
    classify(new URL(url) as unknown as Location, { referrer: ref } as Document);

  it("direct when no referrer/utm", () => {
    expect(mk("https://site.com/", "").channel).toBe("direct");
  });
  it("organic search from google referrer", () => {
    const a = mk("https://site.com/", "https://google.com/search?q=x");
    expect(a.channel).toBe("organic_search");
    expect(a.utm_source).toBe("google");
  });
  it("social from linkedin", () => {
    expect(mk("https://site.com/", "https://linkedin.com/feed").channel).toBe("social");
  });
  it("paid from utm_medium=cpc", () => {
    expect(mk("https://site.com/?utm_source=google&utm_medium=cpc&utm_campaign=fall", "").channel).toBe("paid");
  });
  it("email campaign", () => {
    expect(mk("https://site.com/?utm_medium=email&utm_source=newsletter", "").channel).toBe("email");
  });
  it("referral from other site", () => {
    expect(mk("https://site.com/", "https://partner.io/x").channel).toBe("referral");
  });
});
