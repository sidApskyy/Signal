"use client";

import { useApi, useRange } from "@/components/useApi";
import { useProject } from "@/components/nav";
import { Card, Table, Empty, PageHeader, Badge } from "@/components/ui";
import { Bars } from "@/components/charts";

interface Events {
  names: { name: string; count: number; visitors: number; last_seen: string }[];
  recent: { name: string; occurred_at: string; page_path: string | null; props: Record<string, unknown> | null; visitor_id: string }[];
}

export default function BehaviorPage() {
  const projectId = useProject();
  const { days, setDays, query } = useRange();
  const { data } = useApi<Events>(projectId ? `/api/v1/analytics/${projectId}/events?${query}` : null, [projectId, days]);

  return (
    <div>
      <PageHeader title="Behaviour Analytics" sub="Custom events and engagement">
        <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
        </select>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Event volume</h3>
          {data?.names.length ? <Bars data={data.names.map((n) => ({ value: n.name, sessions: n.count }))} /> : <Empty title="No custom events yet" hint="Emit events with SIGNAL.track('name', {props}) from your site." />}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Event breakdown</h3>
          {data?.names.length ? (
            <Table head={["Event", "Count", "Unique visitors", "Last seen"]}>
              {data.names.map((n) => (
                <tr key={n.name}>
                  <td className="td font-mono text-xs">{n.name}</td>
                  <td className="td tabular-nums">{n.count}</td>
                  <td className="td tabular-nums">{n.visitors}</td>
                  <td className="td text-muted">{new Date(n.last_seen).toLocaleString()}</td>
                </tr>
              ))}
            </Table>
          ) : <Empty title="No data" />}
        </Card>
      </div>
      <Card className="mt-4">
        <h3 className="mb-3 text-sm font-medium text-muted">Live event debugger — most recent 100</h3>
        {data?.recent.length ? (
          <div className="max-h-96 overflow-y-auto">
            <Table head={["Time", "Event", "Page", "Visitor", "Properties"]}>
              {data.recent.map((e, i) => (
                <tr key={i}>
                  <td className="td whitespace-nowrap text-muted">{new Date(e.occurred_at).toLocaleTimeString()}</td>
                  <td className="td"><Badge tone="ok">{e.name}</Badge></td>
                  <td className="td font-mono text-xs">{e.page_path ?? "—"}</td>
                  <td className="td font-mono text-xs">{e.visitor_id.slice(0, 8)}…</td>
                  <td className="td max-w-xs truncate font-mono text-xs text-muted">{e.props ? JSON.stringify(e.props) : "—"}</td>
                </tr>
              ))}
            </Table>
          </div>
        ) : <Empty title="No events" />}
      </Card>
    </div>
  );
}
