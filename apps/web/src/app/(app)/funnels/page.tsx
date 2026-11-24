"use client";

import { useState } from "react";
import { useProject } from "@/components/nav";
import { Card, Empty, PageHeader } from "@/components/ui";

interface StepResult { step: string; sessions: number; dropoff: number }

export default function FunnelsPage() {
  const projectId = useProject();
  const [steps, setSteps] = useState<{ type: "page" | "event"; value: string }[]>([
    { type: "page", value: "/" }, { type: "page", value: "/contact" },
  ]);
  const [result, setResult] = useState<StepResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!projectId) return;
    setBusy(true);
    const r = await fetch(`/api/v1/analytics/${projectId}/funnels?days=30`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steps }),
    });
    setResult(r.ok ? (await r.json()).steps : null);
    setBusy(false);
  }

  const max = result?.[0]?.sessions || 1;

  return (
    <div>
      <PageHeader title="Funnels & Conversions" sub="Ordered step analysis over the last 30 days" />
      <Card>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-xs text-muted">{i + 1}.</span>
              <select className="input w-28" value={s.type} onChange={(e) => { const n = [...steps]; n[i].type = e.target.value as "page" | "event"; setSteps(n); }}>
                <option value="page">Page</option><option value="event">Event</option>
              </select>
              <input className="input flex-1" placeholder={s.type === "page" ? "/path" : "event_name"} value={s.value}
                onChange={(e) => { const n = [...steps]; n[i].value = e.target.value; setSteps(n); }} />
              <button className="btn-ghost !px-2" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-ghost" onClick={() => setSteps([...steps, { type: "page", value: "" }])} disabled={steps.length >= 8}>+ Step</button>
          <button className="btn-primary" onClick={run} disabled={busy || steps.length < 2}>{busy ? "Computing…" : "Run funnel"}</button>
        </div>
      </Card>
      {result && (
        <Card className="mt-4">
          {result.every((r) => r.sessions === 0) ? <Empty title="No sessions matched" /> : (
            <div className="space-y-3">
              {result.map((r, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-mono text-xs">{r.step}</span>
                    <span className="text-muted">{r.sessions} sessions{i > 0 && ` · ${(r.dropoff * 100).toFixed(0)}% drop-off`}</span>
                  </div>
                  <div className="h-7 rounded-md bg-surface2">
                    <div className="h-7 rounded-md bg-electric/70 transition-all" style={{ width: `${(r.sessions / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
