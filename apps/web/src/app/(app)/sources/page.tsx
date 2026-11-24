"use client";

import { useApi, useRange } from "@/components/useApi";
import { useProject } from "@/components/nav";
import { Card, Table, Empty, PageHeader } from "@/components/ui";
import { Donut, Bars } from "@/components/charts";

interface Sources {
  channels: { value: string; sessions: number }[]; sources: { value: string; sessions: number }[];
  campaigns: { value: string; sessions: number }[]; referrers: { value: string; sessions: number }[];
  landing: { value: string; sessions: number; visitors: number }[];
}

export default function SourcesPage() {
  const projectId = useProject();
  const { days, setDays, query } = useRange();
  const { data } = useApi<Sources>(projectId ? `/api/v1/analytics/${projectId}/sources?${query}` : null, [projectId, days]);

  return (
    <div>
      <PageHeader title="Traffic Sources" sub="Attribution and campaign performance">
        <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
        </select>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card><h3 className="mb-3 text-sm font-medium text-muted">Channels</h3>
          {data?.channels.length ? <Donut data={data.channels} /> : <Empty title="No data" />}</Card>
        <Card><h3 className="mb-3 text-sm font-medium text-muted">UTM sources</h3>
          {data?.sources.length ? <Bars data={data.sources} /> : <Empty title="No data" />}</Card>
        <Card><h3 className="mb-3 text-sm font-medium text-muted">Campaigns</h3>
          {data?.campaigns.length ? <Bars data={data.campaigns} color="#F59E0B" /> : <Empty title="No data" />}</Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Referring domains</h3>
          {data?.referrers.length ? (
            <Table head={["Domain", "Sessions"]}>
              {data.referrers.map((r) => <tr key={r.value}><td className="td font-mono text-xs">{r.value}</td><td className="td tabular-nums">{r.sessions}</td></tr>)}
            </Table>
          ) : <Empty title="No referrals" />}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Landing pages</h3>
          {data?.landing.length ? (
            <Table head={["Page", "Sessions", "Visitors"]}>
              {data.landing.map((l) => <tr key={l.value}><td className="td font-mono text-xs">{l.value}</td><td className="td tabular-nums">{l.sessions}</td><td className="td tabular-nums">{l.visitors}</td></tr>)}
            </Table>
          ) : <Empty title="No data" />}
        </Card>
      </div>
    </div>
  );
}
