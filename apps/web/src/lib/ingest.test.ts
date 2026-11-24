import { describe, it, expect } from "vitest";
import { batchSchema, sanitizeProps, hostAllowed, extractMeta } from "./ingest";
import { classifyBot } from "./engines/bot";
import { parseDevice } from "./engines/device";
import { hashPassword, verifyPassword } from "./auth";

describe("auth", () => {
  it("hashes and verifies passwords", () => {
    const h = hashPassword("s3cret-password");
    expect(verifyPassword("s3cret-password", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });
});

describe("collect schema", () => {
  const base = {
    project: "sig_pk_" + "a".repeat(32),
    events: [{ event_id: "e-12345678", event: "page_view", visitor_id: "v-12345678", session_id: "s-12345678" }],
  };
  it("accepts a valid batch", () => expect(batchSchema.parse(base).events).toHaveLength(1));
  it("rejects bad project key", () => expect(() => batchSchema.parse({ ...base, project: "nope" })).toThrow());
  it("rejects >50 events", () =>
    expect(() => batchSchema.parse({ ...base, events: Array(51).fill(base.events[0]) })).toThrow());
  it("rejects unknown event type", () =>
    expect(() => batchSchema.parse({ ...base, events: [{ ...base.events[0], event: "hack" }] })).toThrow());
  it("rejects short ids", () =>
    expect(() => batchSchema.parse({ ...base, events: [{ ...base.events[0], visitor_id: "x" }] })).toThrow());
});

describe("sanitizeProps", () => {
  it("strips system-managed fields", () => {
    const out = sanitizeProps({ path: "/a", ip: "1.2.3.4", country_code: "US", organization_id: "x", custom: "y" });
    expect(out).toEqual({ path: "/a", custom: "y" });
  });
  it("drops deep objects beyond depth and functions", () => {
    const out = sanitizeProps({ fn: () => 1, nested: { a: 1 } });
    expect(out.fn).toBeUndefined();
    expect(out.nested).toEqual({ a: 1 });
  });
});

describe("hostAllowed", () => {
  const hosts = ["example.com", "localhost:4000"];
  it("allows exact verified origin", () => expect(hostAllowed(hosts, "https://example.com", null)).toBe(true));
  it("allows subdomain of verified host", () => expect(hostAllowed(hosts, "https://app.example.com", null)).toBe(true));
  it("rejects unverified origin", () => expect(hostAllowed(hosts, "https://evil.com", null)).toBe(false));
  it("rejects when no origin/referer", () => expect(hostAllowed(hosts, null, null)).toBe(false));
  it("falls back to referer", () => expect(hostAllowed(hosts, null, "https://example.com/p")).toBe(true));
});

describe("extractMeta", () => {
  it("parses referrer host", () => {
    const m = extractMeta({ path: "/p", referrer: "https://google.com/search?q=x" });
    expect(m.referrerHost).toBe("google.com");
    expect(m.path).toBe("/p");
  });
});

describe("bot engine", () => {
  it("classifies known crawlers", () => expect(classifyBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("known_bot"));
  it("flags headless agents", () => expect(classifyBot("HeadlessChrome/120")).toBe("suspected_bot"));
  it("flags extreme event rates", () => expect(classifyBot("Mozilla/5.0", 999)).toBe("suspected_bot"));
  it("passes normal browsers", () => expect(classifyBot("Mozilla/5.0 (Macintosh) Chrome/126 Safari/537.36")).toBe("human"));
});

describe("device engine", () => {
  it("parses chrome desktop", () => {
    const d = parseDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
    expect(d.deviceCategory).toBe("desktop");
    expect(d.browser).toBe("Chrome");
    expect(d.isBot).toBe(false);
  });
  it("parses mobile safari", () => {
    const d = parseDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1");
    expect(d.deviceCategory).toBe("mobile");
  });
});
