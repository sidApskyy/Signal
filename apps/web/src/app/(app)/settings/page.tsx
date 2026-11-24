"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/components/nav";
import { useApi } from "@/components/useApi";
import { Card, Table, Empty, PageHeader, Badge } from "@/components/ui";

interface ProjectDetail {
  project: { id: string; name: string; url: string; retention_days: number; consent_mode: string; timezone: string };
  domains: { id: string; host: string; environment: string; verification_method: string; verified_at: string | null }[];
  keys: { id: string; public_key: string; created_at: string; revoked_at: string | null }[];
  eventDefinitions: { id: string; name: string; kind: string; enabled: boolean }[];
}
interface Members { members: { id: string; email: string; name: string; role: string; userId: string }[] }

export default function SettingsPage() {
  const projectId = useProject();
  const { data, reload } = useApi<ProjectDetail>(projectId ? `/api/v1/projects/${projectId}` : null, [projectId]);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me").then((r) => r.json()).then((d) => setOrgId(d.orgId));
  }, []);

  const activeKey = data?.keys.find((k) => !k.revoked_at);

  async function rotate() {
    if (!projectId || !confirm("Rotate the tracking key? Old snippets stop sending data.")) return;
    await fetch(`/api/v1/projects/${projectId}/keys/rotate`, { method: "POST" });
    reload();
  }

  return (
    <div>
      <PageHeader title="Settings" sub="Project, domain, tracking and member configuration" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Project</h3>
          {data ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Name</dt><dd>{data.project.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">URL</dt><dd className="font-mono text-xs">{data.project.url}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Timezone</dt><dd>{data.project.timezone}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Retention</dt><dd>{data.project.retention_days} days</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Consent mode</dt><dd><Badge>{data.project.consent_mode}</Badge></dd></div>
            </dl>
          ) : <Empty title="Select a website" />}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Tracking key</h3>
          {activeKey ? (
            <>
              <code className="block break-all rounded bg-midnight p-3 text-xs text-lime">{activeKey.public_key}</code>
              <button className="btn-ghost mt-3" onClick={rotate}>Rotate key</button>
            </>
          ) : <Empty title="No active key" />}
          <h3 className="mb-2 mt-5 text-sm font-medium text-muted">Install snippet</h3>
          <pre className="overflow-x-auto rounded bg-midnight p-3 text-xs text-cyan2">
{`<script defer src="${typeof window !== "undefined" ? location.origin : ""}/signal.js"
  data-site-id="${activeKey?.public_key ?? "…"}"></script>`}
          </pre>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Domains</h3>
          {data?.domains.length ? (
            <Table head={["Host", "Env", "Method", "Status", ""]}>
              {data.domains.map((d) => (
                <tr key={d.id}>
                  <td className="td font-mono text-xs">{d.host}</td>
                  <td className="td">{d.environment}</td>
                  <td className="td">{d.verification_method}</td>
                  <td className="td">{d.verified_at ? <Badge tone="ok">verified</Badge> : <Badge tone="warn">pending</Badge>}</td>
                  <td className="td">{!d.verified_at && (
                    <button className="text-xs text-electric hover:underline" onClick={async () => { await fetch(`/api/v1/domains/${d.id}/verify`, { method: "POST" }); reload(); }}>Verify</button>
                  )}</td>
                </tr>
              ))}
            </Table>
          ) : <Empty title="No domains" />}
          <AddDomain projectId={projectId} onAdded={reload} />
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Members</h3>
          {orgId && <MemberList orgId={orgId} />}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium text-muted">Event definitions</h3>
          {data?.eventDefinitions.length ? (
            <Table head={["Name", "Kind", "Enabled"]}>
              {data.eventDefinitions.map((e) => (
                <tr key={e.id}><td className="td font-mono text-xs">{e.name}</td><td className="td">{e.kind}</td><td className="td">{e.enabled ? "yes" : "no"}</td></tr>
              ))}
            </Table>
          ) : <Empty title="No custom event definitions" hint="Define events to validate custom tracking." />}
          <AddEventDef projectId={projectId} onAdded={reload} />
        </Card>
      </div>
    </div>
  );
}

function MemberList({ orgId }: { orgId: string }) {
  const { data, reload } = useApi<Members>(`/api/v1/organizations/${orgId}/members`);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  return (
    <>
      {data?.members.length ? (
        <Table head={["Member", "Role"]}>
          {data.members.map((m) => (
            <tr key={m.id}><td className="td">{m.name} <span className="text-muted text-xs">{m.email}</span></td><td className="td"><Badge>{m.role}</Badge></td></tr>
          ))}
        </Table>
      ) : <Empty title="No members" />}
      <div className="mt-3 flex gap-2">
        <input className="input flex-1" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="input w-28" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">Viewer</option><option value="analyst">Analyst</option><option value="admin">Admin</option>
        </select>
        <button className="btn-ghost" onClick={async () => {
          await fetch(`/api/v1/organizations/${orgId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
          setEmail(""); reload();
        }}>Invite</button>
      </div>
    </>
  );
}

function AddDomain({ projectId, onAdded }: { projectId: string | null; onAdded: () => void }) {
  const [host, setHost] = useState("");
  const [method, setMethod] = useState("dns_txt");
  return (
    <div className="mt-3 flex gap-2">
      <input className="input flex-1" placeholder="app.example.com" value={host} onChange={(e) => setHost(e.target.value)} />
      <select className="input w-32" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="dns_txt">DNS TXT</option><option value="html_file">HTML file</option><option value="meta_tag">Meta tag</option>
      </select>
      <button className="btn-ghost" onClick={async () => {
        if (!projectId || !host) return;
        const r = await fetch(`/api/v1/projects/${projectId}/domains`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host, method }) });
        if (r.ok) { const d = await r.json(); alert(d.instructions.hint); setHost(""); onAdded(); }
      }}>Add</button>
    </div>
  );
}

function AddEventDef({ projectId, onAdded }: { projectId: string | null; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("custom");
  return (
    <div className="mt-3 flex gap-2">
      <input className="input flex-1" placeholder="event_name" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="input w-32" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="custom">Custom</option><option value="conversion">Conversion</option>
      </select>
      <button className="btn-ghost" onClick={async () => {
        if (!projectId || !name) return;
        await fetch(`/api/v1/projects/${projectId}/event-definitions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, kind }) });
        setName(""); onAdded();
      }}>Add</button>
    </div>
  );
}
