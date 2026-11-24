"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", organization: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/v1/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    setBusy(false);
    if (r.ok) router.push("/overview");
    else {
      const j = await r.json();
      setError(j.error?.code === "registration_disabled" ? "Public registration is disabled during private beta." : j.error?.message ?? "Registration failed");
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-electric/20 text-xl font-bold text-electric">S</div>
          <h1 className="text-lg font-semibold">Create your SIGNAL account</h1>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <div><label className="mb-1.5 block text-xs font-medium text-muted">Name</label>
            <input className="input" required value={f.name} onChange={set("name")} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
            <input className="input" type="email" required value={f.email} onChange={set("email")} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-muted">Password (10+ chars)</label>
            <input className="input" type="password" required minLength={10} value={f.password} onChange={set("password")} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-muted">Organization name (optional)</label>
            <input className="input" value={f.organization} onChange={set("organization")} /></div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary w-full justify-center" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
      </div>
    </div>
  );
}
