"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/v1/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (r.ok) router.push("/overview");
    else setError((await r.json()).error?.message === "invalid_credentials" ? "Invalid email or password" : "Sign-in failed");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-electric/20 text-xl font-bold text-electric">S</div>
          <h1 className="text-lg font-semibold">SIGNAL</h1>
          <p className="text-xs text-muted">Universal Website Visitor Intelligence · RDCS GENIX</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
            <input className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Password</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn-primary w-full justify-center" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          Private beta — accounts are provisioned by an administrator.
        </p>
      </div>
    </div>
  );
}
