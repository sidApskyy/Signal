import { sql } from "./db";

/**
 * Live presence: a session is "live" when its last event arrived < 90 s ago.
 * Backed by sessions.last_seen_at (written by ingestion) — no extra infra.
 * SSE streams poll this lightweight query every 5 s per subscriber.
 */
export interface LiveVisitor {
  sessionId: string; visitorId: string; currentPage: string | null;
  country: string | null; city: string | null; device: string | null;
  browser: string | null; channel: string | null; startedAt: string; lastSeenAt: string;
}

export async function liveVisitors(projectId: string, orgId: string): Promise<LiveVisitor[]> {
  const rows = await sql`
    SELECT s.id AS "sessionId", v.visitor_id AS "visitorId",
           COALESCE(s.exit_page, s.entry_page) AS "currentPage",
           s.country_code AS "country", s.city, s.device_category AS "device",
           s.browser, s.channel, s.started_at AS "startedAt", s.last_seen_at AS "lastSeenAt"
    FROM sessions s JOIN visitors v ON v.id = s.visitor_id
    WHERE s.project_id = ${projectId} AND s.organization_id = ${orgId}
      AND s.last_seen_at > now() - interval '90 seconds'
      AND s.bot_class = 'human'
    ORDER BY s.last_seen_at DESC LIMIT 100`;
  return rows as unknown as LiveVisitor[];
}
