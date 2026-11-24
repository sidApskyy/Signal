"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Badge } from "@/components/ui";

const PLATFORMS = ["HTML / Static", "React", "Next.js", "WordPress", "Shopify", "Other JavaScript"];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [env, setEnv] = useState("production");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [created, setCreated] = useState<{ project: { id: string }; publicKey: string; verificationToken: string } | null>(null);
  const [verify, setVerify] = useState<"pending" | "ok" | "failed">("pending");
  const [error, setError] = useState("");

  async function create() {
    const r = await fetch("/api/v1/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, environment: env }),
    });
    if (!r.ok) { setError((await r.json()).error?.message ?? "Failed"); return; }
    setCreated(await r.json());
    setStep(3);
  }

  async function tryVerify(domainId: string) {
    const r = await fetch(`/api/v1/domains/${domainId}/verify`, { method: "POST" });
    setVerify(r.ok ? "ok" : "failed");
    if (r.ok) setStep(5);
  }

  const host = (() => { try { return new URL(url).host; } catch { return "…"; } })();
  const snippet = created
    ? `<script defer src="${location.origin}/signal.js" data-site-id="${created.publicKey}"></script>`
    : "";

  const steps = ["Website info", "Domain verification", "Tracking key", "Platform", "Install", "Verify connection", "Done"];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add Website" sub={`Step ${step} of 7 — ${steps[step - 1]}`} />
      <div className="mb-6 flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded ${i < step ? "bg-electric" : "bg-surface2"}`} />
        ))}
      </div>

      {step === 1 && (
        <Card className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-medium text-muted">Website name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing site" /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-muted">URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-muted">Environment</label>
            <select className="input" value={env} onChange={(e) => setEnv(e.target.value)}>
              <option value="production">Production</option><option value="staging">Staging</option><option value="development">Development</option>
            </select></div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary" onClick={create} disabled={!name || !url}>Continue</button>
        </Card>
      )}

      {step === 3 && created && (
        <Card className="space-y-4">
          <h3 className="text-sm font-medium">Verify domain ownership — {host}</h3>
          <p className="text-xs text-muted">Choose a verification method, complete it on your site, then verify.</p>
          <div className="space-y-2 text-xs">
            <div className="rounded-md border border-line p-3">
              <div className="font-medium">DNS TXT record</div>
              <code className="mt-1 block break-all rounded bg-midnight p-2">_signal.{host} → {created.verificationToken}</code>
            </div>
            <div className="rounded-md border border-line p-3">
              <div className="font-medium">HTML file</div>
              <code className="mt-1 block break-all rounded bg-midnight p-2">https://{host}/.well-known/signal-verification.txt → {created.verificationToken}</code>
            </div>
            <div className="rounded-md border border-line p-3">
              <div className="font-medium">Meta tag</div>
              <code className="mt-1 block break-all rounded bg-midnight p-2">{`<meta name="signal-verification" content="${created.verificationToken}">`}</code>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <VerifyButton projectId={created.project.id} onDone={(ok) => { setVerify(ok ? "ok" : "failed"); if (ok) setStep(4); else setStep(4); }} />
            {verify === "failed" && <Badge tone="bad">Not found yet — you can verify later in Settings</Badge>}
            {verify === "ok" && <Badge tone="ok">Verified</Badge>}
          </div>
        </Card>
      )}

      {step === 4 && created && (
        <Card className="space-y-4">
          <h3 className="text-sm font-medium">Your tracking key</h3>
          <code className="block break-all rounded bg-midnight p-3 text-xs text-lime">{created.publicKey}</code>
          <p className="text-xs text-muted">Public identifier — safe to embed. Never put secrets in the snippet.</p>
          <h3 className="text-sm font-medium">Select your platform</h3>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`rounded-md border px-3 py-2 text-sm ${platform === p ? "border-electric bg-electric/10 text-electric" : "border-line text-muted hover:bg-surface2"}`}>{p}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setStep(5)}>Continue</button>
        </Card>
      )}

      {step === 5 && created && (
        <Card className="space-y-4">
          <h3 className="text-sm font-medium">Install on {platform}</h3>
          <p className="text-xs text-muted">{installHint(platform)}</p>
          <pre className="overflow-x-auto rounded bg-midnight p-3 text-xs text-cyan2">{snippet}</pre>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>
            <button className="btn-primary" onClick={() => setStep(6)}>I installed it</button>
          </div>
        </Card>
      )}

      {step === 6 && (
        <Card className="space-y-4">
          <h3 className="text-sm font-medium">Verify connection</h3>
          <p className="text-xs text-muted">Open your website in another tab — a first page view should arrive within seconds. Check the Live Visitors page.</p>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => router.push("/live")}>Open Live Visitors</button>
            <button className="btn-ghost" onClick={() => setStep(7)}>Skip for now</button>
          </div>
        </Card>
      )}

      {step === 7 && (
        <Card className="space-y-4 text-center">
          <Badge tone="ok">Website added</Badge>
          <p className="text-sm text-muted">Tracking begins as soon as the snippet loads on a verified domain.</p>
          <button className="btn-primary mx-auto" onClick={() => router.push("/overview")}>Go to Overview</button>
        </Card>
      )}
    </div>
  );
}

function VerifyButton({ projectId, onDone }: { projectId: string; onDone: (ok: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn-primary" disabled={busy} onClick={async () => {
      setBusy(true);
      const d = await fetch(`/api/v1/projects/${projectId}`).then((r) => r.json());
      const domain = d.domains?.[0];
      if (!domain) { onDone(false); setBusy(false); return; }
      const r = await fetch(`/api/v1/domains/${domain.id}/verify`, { method: "POST" });
      onDone(r.ok);
      setBusy(false);
    }}>{busy ? "Verifying…" : "Verify domain"}</button>
  );
}

function installHint(platform: string) {
  switch (platform) {
    case "React": return "Add the script tag in your app's index.html <head>, or use next/script in Next.js.";
    case "Next.js": return "Add <Script src=\"…/signal.js\" data-site-id=\"…\" strategy=\"afterInteractive\" /> in your root layout.";
    case "WordPress": return "Add the tag via a header plugin or your theme's header.php before </head>.";
    case "Shopify": return "Paste the tag in theme.liquid before </head>.";
    default: return "Paste the snippet before </head> on every page you want to track.";
  }
}
