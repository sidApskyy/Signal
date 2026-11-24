"use client";

import { useProject } from "@/components/nav";
import { Card, PageHeader } from "@/components/ui";
import { useRange } from "@/components/useApi";
import { Download } from "lucide-react";

const KINDS = [
  { id: "page_views", label: "Page views", desc: "Every recorded page view in range" },
  { id: "sessions", label: "Sessions", desc: "Session-level rollup with attribution" },
  { id: "events", label: "Custom events", desc: "All tracked custom + conversion events" },
];

export default function ReportsPage() {
  const projectId = useProject();
  const { days, setDays } = useRange();

  return (
    <div>
      <PageHeader title="Reports & Exports" sub="Download authorized analytics as CSV">
        <select className="input w-32" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d}d</option>)}
        </select>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {KINDS.map((k) => (
          <Card key={k.id}>
            <h3 className="text-sm font-medium">{k.label}</h3>
            <p className="mt-1 text-xs text-muted">{k.desc}</p>
            <a className="btn-primary mt-4" href={projectId ? `/api/v1/analytics/${projectId}/export?what=${k.id}&days=${days}` : "#"}>
              <Download size={14} /> Export CSV
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
