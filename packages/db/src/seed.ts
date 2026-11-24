/**
 * Seed: demo organization, project, verified domain, key, and a labeled
 * synthetic visitor/session/pageview set. Test data is clearly marked —
 * it is never presented as real traffic.
 */
import { createDb, createRawClient } from "./index.js";
import {
  users, organizations, organizationMembers, projects, projectDomains,
  projectKeys, visitors, sessions, pageViews, events,
} from "./schema.js";
import { randomUUID, createHash, scryptSync, randomBytes } from "node:crypto";

const db = createDb();
const sql = createRawClient();

function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

const [user] = await db.insert(users).values({
  email: "demo@rdcsgenix.local",
  name: "Demo Owner",
  passwordHash: hashPassword("signal-demo-123"),
  emailVerifiedAt: new Date(),
}).onConflictDoNothing().returning();

const userId = user?.id ?? (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, "demo@rdcsgenix.local") }))!.id;

const [org] = await db.insert(organizations).values({ name: "RDCS GENIX Demo", slug: "rdcs-genix-demo" })
  .onConflictDoNothing().returning();
const orgId = org?.id ?? (await db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.slug, "rdcs-genix-demo") }))!.id;

await db.insert(organizationMembers).values({ organizationId: orgId, userId, role: "owner", acceptedAt: new Date() }).onConflictDoNothing();

// Idempotent: reuse the project when it already exists (no unique constraint on name).
const existingProject = await db.query.projects.findFirst({
  where: (p, { and, eq }) => and(eq(p.organizationId, orgId), eq(p.url, "http://localhost:4000")),
});
const [project] = existingProject
  ? [existingProject]
  : await db.insert(projects).values({
      organizationId: orgId, name: "Demo Website", url: "http://localhost:4000",
    }).returning();
const projectId = project!.id;

await db.insert(projectDomains).values({
  organizationId: orgId, projectId, host: "localhost:4000", environment: "development",
  verificationToken: randomUUID(), verifiedAt: new Date(),
}).onConflictDoNothing();
await db.insert(projectDomains).values({
  organizationId: orgId, projectId, host: "localhost", environment: "development",
  verificationToken: randomUUID(), verifiedAt: new Date(),
}).onConflictDoNothing();

const key = `sig_pk_${randomBytes(16).toString("hex")}`;
await db.insert(projectKeys).values({ organizationId: orgId, projectId, publicKey: key }).onConflictDoNothing();

// Synthetic test visitors (marked via clientSessionId prefix "test-")
const paths = ["/", "/services", "/services/abm", "/pricing", "/contact", "/blog/demand-gen"];
const countries = [["IN", "Maharashtra", "Pune"], ["US", "California", "SF"], ["DE", "Bavaria", "Munich"], ["GB", "England", "London"]];
const devices = [["desktop", "Chrome", "Windows"], ["mobile", "Safari", "iOS"], ["desktop", "Firefox", "Linux"], ["tablet", "Chrome", "Android"]];
const channels = [["organic_search", "google", "organic"], ["direct", null, null], ["social", "linkedin", "social"], ["referral", "partner.example.com", "referral"], ["paid", "google", "cpc"]];

const now = Date.now();
for (let i = 0; i < 40; i++) {
  const [cc, region, city] = countries[i % countries.length];
  const [dev, browser, os] = devices[i % devices.length];
  const [channel, source, medium] = channels[i % channels.length];
  const firstSeen = new Date(now - (Math.random() * 14 + 1) * 86400e3);
  const [v] = await db.insert(visitors).values({
    organizationId: orgId, projectId, visitorId: `test-visitor-${i}`,
    firstSeenAt: firstSeen, lastSeenAt: new Date(now - Math.random() * 3600e3),
    sessionCount: 1 + (i % 4), pageviewCount: 5 + i, eventCount: 2 + (i % 7),
    countryCode: cc, region, city, deviceCategory: dev, browser, os,
    engagementScore: (i * 7) % 60, consentStatus: "granted",
  }).returning();

  for (let s = 0; s < 1 + (i % 3); s++) {
    const started = new Date(now - Math.random() * 10 * 86400e3);
    const [sess] = await db.insert(sessions).values({
      organizationId: orgId, projectId, visitorId: v.id,
      clientSessionId: `test-session-${i}-${s}`, startedAt: started,
      lastSeenAt: new Date(started.getTime() + 300e3 + Math.random() * 900e3),
      entryPage: "/", exitPage: "/contact", pageCount: 3 + (i % 5),
      durationS: 300 + i, channel, utmSource: source, utmMedium: medium,
      countryCode: cc, region, city, deviceCategory: dev, browser, os,
    }).returning();
    for (let p = 0; p < 3 + (i % 4); p++) {
      await db.insert(pageViews).values({
        organizationId: orgId, projectId, sessionId: sess.id, visitorId: v.id,
        path: paths[(i + p) % paths.length], title: "Demo",
        occurredAt: new Date(started.getTime() + p * 60e3),
      });
    }
    await db.insert(events).values({
      organizationId: orgId, projectId, sessionId: sess.id, visitorId: v.id,
      clientEventId: `test-evt-${i}-${s}`, name: "cta_clicked",
      occurredAt: new Date(started.getTime() + 90e3), pagePath: "/",
      props: { section: "hero", synthetic: true },
    }).onConflictDoNothing();
  }
}

console.log(`Seeded. Login: demo@rdcsgenix.local / signal-demo-123`);
console.log(`Project key: ${key}`);
await sql.end();
process.exit(0);
