"use client";

import Link from "next/link";
import { useApi } from "@/components/useApi";
import { Table, Empty, PageHeader, Badge } from "@/components/ui";
import { Plus } from "lucide-react";

interface Project { id: string; name: string; url: string; environment: string; visitors: number; sessions: number; pageviews: number }

export default function ProjectsPage() {
  const { data, reload } = useApi<{ projects: Project[] }>("/api/v1/projects");

  return (
    <div>
      <PageHeader title="Websites" sub="Tracked properties in this organization">
        <Link href="/projects/new" className="btn-primary"><Plus size={14} /> Add website</Link>
      </PageHeader>
      {data?.projects.length === 0 && <Empty title="No websites yet" hint="Add your first website to generate a tracking snippet." />}
      {data && data.projects.length > 0 && (
        <Table head={["Name", "URL", "Environment", "Visitors", "Sessions", "Page views", ""]}>
          {data.projects.map((p) => (
            <tr key={p.id}>
              <td className="td font-medium">{p.name}</td>
              <td className="td font-mono text-xs text-muted">{p.url}</td>
              <td className="td"><Badge tone={p.environment === "production" ? "ok" : "default"}>{p.environment}</Badge></td>
              <td className="td tabular-nums">{p.visitors}</td>
              <td className="td tabular-nums">{p.sessions}</td>
              <td className="td tabular-nums">{p.pageviews}</td>
              <td className="td"><Link href="/settings" className="text-xs text-electric hover:underline">Settings</Link></td>
            </tr>
          ))}
        </Table>
      )}
      <button onClick={reload} className="hidden" />
    </div>
  );
}
