"use client";

import { use } from "react";
import { useApi } from "@/components/useApi";
import { useProject } from "@/components/nav";
import { Card, Stat, Table, Empty, PageHeader, Badge } from "@/components/ui";

interface Detail {
  visitor: Record<string, unknown> & { visitor_id: string; first_seen_at: string; last_seen_at: string; session_count: number; pageview_count: number; event_count: number; country_code: string | null; city: string | null; device_category: string | null; browser: string | null; os: string | null; engagement_score: number; consent_status: string };
  sessions: { id: string; started_at: string; duration_s: number; page_count: number; channel: string | null; utm_source: string | null; entry_page: string | null }[];
  timeline: { ts: string; kind: string; label: string | null; detail: string | null; props: Record<string, unknown> | null }[];
}

export default function VisitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = useProject();
  const { data } = useApi<Detail>(projectId ? `/api/v1/analytics/${projectId}/visitors/${id}` : null, [projectId, id]);

  if (!data) return <PageHeader title="Visitor" sub="Loading…" />;
  const v = data.visitor;

  return (
    <div>
      <PageHeader title={`Visitor ${v.visitor_id.slice(0, 13)}…`} sub="Anonymous profile — never identifies a real person" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <Stat label="Sessions" value={v.session_count} />
        <Stat label="Page views" value={v.pageview_count} />
        <Stat label="Events" value={v.event_count} />
        <Stat label="Engagement" value={v.engagement_score} />
        <Stat label="Device" value={v.device_category ?? "—"} />
        <Stat label="Location" value={[v.city, v.country_code].filter(Boolean).join(", ") || "Unknown"} sub="approximate" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Sessions</h3>
          {data.sessions.length === 0 ? <Empty title="No sessions" /> : (
            <table className="w-full">
              <thead><tr><th className="th">Started</th><th className="th">Duration</th><th className="th">Pages</th><th className="th">Source</th></tr></thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="td text-muted">{new Date(s.started_at).toLocaleString()}</td>
                    <td className="td tabular-nums">{Math.round(s.duration_s / 60)}m</td>
                    <td className="td tabular-nums">{s.page_count}</td>
                    <td className="td">{s.channel ?? "direct"}{s.utm_source ? ` · ${s.utm_source}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Journey timeline</h3>
          <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {data.timeline.map((t, i) => (
              <div key={i} className="flex items-baseline gap-3 text-sm">
                <span className="w-20 shrink-0 text-xs text-muted">{new Date(t.ts).toLocaleTimeString()}</span>
                <Badge tone={t.kind === "page_view" ? "default" : "ok"}>{t.kind}</Badge>
                <span className="truncate font-mono text-xs">{t.label ?? t.detail ?? ""}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
