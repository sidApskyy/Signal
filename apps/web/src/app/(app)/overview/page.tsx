"use client";

import { useApi, useRange } from "@/components/useApi";
import { useProject } from "@/components/nav";
import { Card, Stat, Table, Empty, PageHeader, Skeleton } from "@/components/ui";
import { TrendChart, Donut } from "@/components/charts";

interface ProjectOverview {
  totals: { visitors: number; sessions: number; pageviews: number; live: number; returning_sessions: number };
  timeseries: { day: string; pageviews: number; sessions: number }[];
  topPages: { path: string; views: number; visitors: number }[];
}
interface OrgOverview {
  totals: { visitors: number; sessions: number; pageviews: number; live: number };
  projects: { id: string; name: string; visitors: number; sessions: number; pageviews: number; live: number }[];
  channels: { channel: string; sessions: number }[];
  countries: { country_code: string; visitors: number }[];
}

export default function OverviewPage() {
  const projectId = useProject();
  const { days, setDays, query } = useRange();
  const org = useApi<OrgOverview>(`/api/v1/analytics/org/current/overview?${query}`, [days]);
  const proj = useApi<ProjectOverview>(projectId ? `/api/v1/analytics/${projectId}/overview?${query}` : null, [projectId, days]);

  return (
    <div>
      <PageHeader title="Overview" sub="Organization and website analytics">
        <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
        </select>
      </PageHeader>

      {proj.data ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Stat label="Visitors" value={proj.data.totals.visitors} />
            <Stat label="Sessions" value={proj.data.totals.sessions} />
            <Stat label="Page views" value={proj.data.totals.pageviews} />
            <Stat label="Live now" value={proj.data.totals.live} />
            <Stat label="Returning sessions" value={proj.data.totals.returning_sessions} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h3 className="mb-3 text-sm font-medium text-muted">Traffic trend</h3>
              <TrendChart data={proj.data.timeseries} a="pageviews" b="sessions" />
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-medium text-muted">Top pages</h3>
              <div className="space-y-2">
                {proj.data.topPages.map((p) => (
                  <div key={p.path} className="flex items-center justify-between text-sm">
                    <span className="truncate font-mono text-xs">{p.path}</span>
                    <span className="text-muted tabular-nums">{p.views}</span>
                  </div>
                ))}
                {proj.data.topPages.length === 0 && <Empty title="No page views yet" />}
              </div>
            </Card>
          </div>
        </>
      ) : proj.loading ? (
        <div className="grid grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <Card><Empty title="No website selected" hint="Create a website under Projects, install the tracker, and data will appear here." /></Card>
      )}

      {org.data && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted">Organization — all websites</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Total visitors" value={org.data.totals.visitors} />
            <Stat label="Total sessions" value={org.data.totals.sessions} />
            <Stat label="Page views" value={org.data.totals.pageviews} />
            <Stat label="Live across sites" value={org.data.totals.live} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h3 className="mb-3 text-sm font-medium text-muted">Websites compared</h3>
              <Table head={["Website", "Visitors", "Sessions", "Page views", "Live"]}>
                {org.data.projects.map((p) => (
                  <tr key={p.id}>
                    <td className="td font-medium">{p.name}</td>
                    <td className="td tabular-nums">{p.visitors}</td>
                    <td className="td tabular-nums">{p.sessions}</td>
                    <td className="td tabular-nums">{p.pageviews}</td>
                    <td className="td tabular-nums">{p.live}</td>
                  </tr>
                ))}
              </Table>
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-medium text-muted">Channels</h3>
              <Donut data={org.data.channels.map((c) => ({ value: c.channel ?? "direct", sessions: c.sessions }))} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
