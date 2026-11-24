"use client";

import { useApi, useRange } from "@/components/useApi";
import { useProject } from "@/components/nav";
import { Card, Empty, PageHeader } from "@/components/ui";
import { Donut, Bars } from "@/components/charts";

interface Devices { categories: { value: string; sessions: number }[]; browsers: { value: string; sessions: number }[]; os: { value: string; sessions: number }[] }

export default function DevicesPage() {
  const projectId = useProject();
  const { days, setDays, query } = useRange();
  const { data } = useApi<Devices>(projectId ? `/api/v1/analytics/${projectId}/devices?${query}` : null, [projectId, days]);

  return (
    <div>
      <PageHeader title="Device Intelligence" sub="Device, browser and OS distribution">
        <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
        </select>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card><h3 className="mb-3 text-sm font-medium text-muted">Category</h3>
          {data?.categories.length ? <Donut data={data.categories} /> : <Empty title="No data" />}</Card>
        <Card><h3 className="mb-3 text-sm font-medium text-muted">Browsers</h3>
          {data?.browsers.length ? <Bars data={data.browsers} color="#60A5FA" /> : <Empty title="No data" />}</Card>
        <Card><h3 className="mb-3 text-sm font-medium text-muted">Operating systems</h3>
          {data?.os.length ? <Bars data={data.os} color="#B8FF3C" /> : <Empty title="No data" />}</Card>
      </div>
    </div>
  );
}
