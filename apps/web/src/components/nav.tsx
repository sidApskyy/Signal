"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Radio, Users, Globe2, MonitorSmartphone, Waypoints,
  MousePointerClick, Filter, FileBarChart, Settings, Globe, Plus, LogOut, ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/live", label: "Live Visitors", icon: Radio },
  { href: "/visitors", label: "Visitor Explorer", icon: Users },
  { href: "/geo", label: "Geography", icon: Globe2 },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/sources", label: "Traffic Sources", icon: Waypoints },
  { href: "/behavior", label: "Behaviour", icon: MousePointerClick },
  { href: "/funnels", label: "Funnels", icon: Filter },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface Me {
  user: { name: string; email: string; isPlatformOwner: boolean };
  orgId: string | null; role: string | null;
  organizations: { id: string; name: string; slug: string; role: string }[];
}
interface Project { id: string; name: string; url: string }

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [orgMenu, setOrgMenu] = useState(false);

  useEffect(() => {
    fetch("/api/v1/auth/me").then((r) => r.json()).then((d) => {
      setMe(d);
      const cookieProject = document.cookie.match(/sig_project=([^;]+)/)?.[1];
      setProjectId(cookieProject ?? null);
    });
  }, []);

  useEffect(() => {
    if (!me?.orgId) return;
    fetch("/api/v1/projects").then((r) => r.json()).then((d) => {
      const list = d.projects ?? [];
      setProjects(list);
      if (!projectId && list[0]) selectProject(list[0].id);
    });
  }, [me?.orgId]);

  async function switchOrg(id: string) {
    await fetch(`/api/v1/organizations/${id}/select`, { method: "POST" });
    setOrgMenu(false);
    location.reload();
  }

  function selectProject(id: string) {
    document.cookie = `sig_project=${id};path=/;SameSite=Lax`;
    setProjectId(id);
    window.dispatchEvent(new CustomEvent("signal:project", { detail: id }));
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const currentOrg = me?.organizations.find((o) => o.id === me.orgId);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-midnight">
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-electric/20 text-electric font-bold">S</div>
          <div>
            <div className="text-sm font-semibold leading-4">SIGNAL</div>
            <div className="text-[10px] text-muted leading-3">by RDCS GENIX</div>
          </div>
        </div>

        {/* Org switcher */}
        <div className="relative border-b border-line px-3 py-3">
          <button onClick={() => setOrgMenu(!orgMenu)} className="flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-sm hover:bg-surface2">
            <span className="truncate">{currentOrg?.name ?? "Select organization"}</span>
            <ChevronsUpDown size={14} className="text-muted" />
          </button>
          {orgMenu && (
            <div className="absolute left-3 right-3 top-full z-40 mt-1 rounded-md border border-line bg-surface shadow-xl">
              {me?.organizations.map((o) => (
                <button key={o.id} onClick={() => switchOrg(o.id)}
                  className={cn("block w-full px-3 py-2 text-left text-sm hover:bg-surface2", o.id === me.orgId && "text-electric")}>
                  {o.name} <span className="text-xs text-muted">· {o.role}</span>
                </button>
              ))}
              <button onClick={async () => {
                const name = prompt("Organization name");
                if (!name) return;
                const r = await fetch("/api/v1/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
                const o = await r.json();
                if (o.id) switchOrg(o.id);
              }} className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-muted hover:bg-surface2">
                <Plus size={14} /> New organization
              </button>
            </div>
          )}
        </div>

        {/* Project switcher */}
        <div className="border-b border-line px-3 py-3">
          <div className="flex items-center gap-2">
            <select className="input flex-1 text-xs" value={projectId ?? ""} onChange={(e) => selectProject(e.target.value)}>
              {projects.length === 0 && <option value="">No websites yet</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Link href="/projects" className="btn-ghost !px-2 !py-2" title="Manage websites"><Globe size={14} /></Link>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn("mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface2 hover:text-ink",
                pathname.startsWith(href) && "bg-electric/10 text-electric")}>
              <Icon size={15} /> {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <div className="truncate text-xs text-ink">{me?.user.name}</div>
          <div className="flex items-center justify-between">
            <span className="truncate text-xs text-muted">{me?.user.email}</span>
            <button onClick={logout} title="Sign out" className="text-muted hover:text-ink"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>
      <main className="ml-60 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}

/** Read the selected project id from cookie + live updates. */
export function useProject(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setId(document.cookie.match(/sig_project=([^;]+)/)?.[1] ?? null);
    read();
    const h = (e: Event) => setId((e as CustomEvent<string>).detail);
    addEventListener("signal:project", h);
    const t = setInterval(read, 2000); // cover external cookie writes
    return () => { removeEventListener("signal:project", h); clearInterval(t); };
  }, []);
  return id;
}
