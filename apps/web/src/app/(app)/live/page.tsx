"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/components/nav";
import { Card, Table, Empty, PageHeader, Badge } from "@/components/ui";

interface LiveVisitor {
  sessionId: string; visitorId: string; currentPage: string | null;
  country: string | null; city: string | null; device: string | null;
  browser: string | null; channel: string | null; startedAt: string; lastSeenAt: string;
}

export default function LivePage() {
  const projectId = useProject();
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [at, setAt] = useState<string>("");

  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/v1/analytics/${projectId}/live`);
    es.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setVisitors(d.visitors ?? []);
      setAt(d.at);
    };
    return () => es.close();
  }, [projectId]);

  return (
    <div>
      <PageHeader title="Live Visitors" sub={at ? `Updated ${new Date(at).toLocaleTimeString()} · refreshes every 5 s` : "Real-time activity"}>
        <Badge tone="live">{visitors.length} active</Badge>
      </PageHeader>
      <Card>
        {visitors.length === 0 ? (
          <Empty title="No active visitors" hint="Sessions seen in the last 90 seconds appear here. Install the tracker to see live traffic." />
        ) : (
          <Table head={["Visitor", "Current page", "Location (approx.)", "Device", "Browser", "Source", "Session started"]}>
            {visitors.map((v) => (
              <tr key={v.sessionId}>
                <td className="td font-mono text-xs">{v.visitorId.slice(0, 8)}…</td>
                <td className="td font-mono text-xs">{v.currentPage ?? "—"}</td>
                <td className="td">{[v.city, v.country].filter(Boolean).join(", ") || "Unknown"}</td>
                <td className="td capitalize">{v.device ?? "—"}</td>
                <td className="td">{v.browser ?? "—"}</td>
                <td className="td">{v.channel ?? "direct"}</td>
                <td className="td text-muted">{new Date(v.startedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
