"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi, useRange } from "@/components/useApi";
import { useProject } from "@/components/nav";
import { Table, Empty, PageHeader, Badge } from "@/components/ui";

interface Visitor {
  id: string; visitor_id: string; first_seen_at: string; last_seen_at: string;
  session_count: number; pageview_count: number; country_code: string | null;
  city: string | null; device_category: string | null; browser: string | null;
  engagement_score: number; consent_status: string;
}

function engagement(score: number) {
  return score >= 40 ? <Badge tone="ok">High · {score}</Badge> : score >= 15 ? <Badge tone="warn">Medium · {score}</Badge> : <Badge>Low · {score}</Badge>;
}

export default function VisitorsPage() {
  const projectId = useProject();
  const { days, setDays, query } = useRange();
  const [q, setQ] = useState("");
  const { data } = useApi<{ visitors: Visitor[] }>(
    projectId ? `/api/v1/analytics/${projectId}/visitors?${query}&q=${encodeURIComponent(q)}` : null,
    [projectId, days, q],
  );

  return (
    <div>
      <PageHeader title="Visitor Explorer" sub="Anonymous visitor profiles">
        <input className="input w-56" placeholder="Search visitor ID or city…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
        </select>
      </PageHeader>
      {data?.visitors.length === 0 && <Empty title="No visitors in range" />}
      {data && data.visitors.length > 0 && (
        <Table head={["Visitor ID", "First seen", "Last seen", "Sessions", "Views", "Location (approx.)", "Device", "Engagement", "Consent"]}>
          {data.visitors.map((v) => (
            <tr key={v.id} className="hover:bg-surface2/50">
              <td className="td"><Link href={`/visitors/${v.id}`} className="font-mono text-xs text-electric hover:underline">{v.visitor_id.slice(0, 13)}…</Link></td>
              <td className="td text-muted">{new Date(v.first_seen_at).toLocaleDateString()}</td>
              <td className="td text-muted">{new Date(v.last_seen_at).toLocaleString()}</td>
              <td className="td tabular-nums">{v.session_count}</td>
              <td className="td tabular-nums">{v.pageview_count}</td>
              <td className="td">{[v.city, v.country_code].filter(Boolean).join(", ") || "—"}</td>
              <td className="td capitalize">{v.device_category ?? "—"}</td>
              <td className="td">{engagement(v.engagement_score)}</td>
              <td className="td"><Badge tone={v.consent_status === "granted" ? "ok" : "default"}>{v.consent_status}</Badge></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
