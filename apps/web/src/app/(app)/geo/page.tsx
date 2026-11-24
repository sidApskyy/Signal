"use client";

import { useApi, useRange } from "@/components/useApi";
import { useProject } from "@/components/nav";
import { Card, Table, Empty, PageHeader, Badge } from "@/components/ui";
import { GeoMap } from "@/components/map";
import { Bars } from "@/components/charts";

interface Geo { countries: { value: string; sessions: number; visitors: number }[]; regions: { value: string; sessions: number; visitors: number }[]; cities: { value: string; sessions: number; visitors: number }[] }

export default function GeoPage() {
  const projectId = useProject();
  const { days, setDays, query } = useRange();
  const { data } = useApi<Geo>(projectId ? `/api/v1/analytics/${projectId}/geo?${query}` : null, [projectId, days]);

  return (
    <div>
      <PageHeader title="Geographic Intelligence" sub="Approximate IP-derived locations — never exact physical addresses">
        <Badge tone="warn">Approximate data</Badge>
        <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
        </select>
      </PageHeader>
      <Card className="!p-2"><GeoMap data={data?.countries ?? []} /></Card>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Countries</h3>
          {data?.countries.length ? <Bars data={data.countries} valKey="visitors" /> : <Empty title="No data" />}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Regions</h3>
          {data?.regions.length ? <Bars data={data.regions} valKey="visitors" color="#60A5FA" /> : <Empty title="No data" />}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Cities</h3>
          {data?.cities.length ? (
            <Table head={["City", "Visitors", "Sessions"]}>
              {data.cities.slice(0, 10).map((c) => (
                <tr key={c.value}><td className="td">{c.value}</td><td className="td tabular-nums">{c.visitors}</td><td className="td tabular-nums">{c.sessions}</td></tr>
              ))}
            </Table>
          ) : <Empty title="No data" />}
        </Card>
      </div>
    </div>
  );
}
