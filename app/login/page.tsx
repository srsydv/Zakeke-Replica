"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DEMO_ACCOUNTS } from "@/lib/auth-accounts";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const need = params.get("need");
  const next = params.get("next") || (need === "admin" ? "/admin" : "/shop/t-shirts");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (e?: string, p?: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e ?? email, password: p ?? password }),
    });
    const data = (await res.json()) as { user?: { role: string }; error?: string };
    if (!res.ok || !data.user) {
      setError(data.error || "Could not sign in.");
      setBusy(false);
      return;
    }
    const dest = data.user.role === "admin" ? (next.startsWith("/admin") ? next : "/admin") : next.startsWith("/admin") ? "/shop/t-shirts" : next;
    router.push(dest);
    router.refresh();
  };

  return (
    <div className="cart-page login-page">
      <p className="eyebrow">Demo accounts</p>
      <h1>Log in</h1>
      <p className="muted">
        {need === "admin"
          ? "Admin pages need the production login."
          : need === "user"
            ? "Design and checkout need the customer login."
            : "Use the user login to design a shirt. Use the admin login to see the job ticket."}
      </p>

      <div className="cred-grid">
        {DEMO_ACCOUNTS.map((account) => (
          <article key={account.email} className="admin-card cred-card">
            <p className="eyebrow">{account.role === "user" ? "Customer" : "Production admin"}</p>
            <h2>{account.name}</h2>
            <p className="muted">
              {account.role === "user"
                ? "Design a t-shirt, add it to cart, and place the order."
                : "Open incoming jobs and edit garment print templates (crop, areas, ppi)."}
            </p>
            <dl className="price-dl">
              <div>
                <dt>Email</dt>
                <dd>
                  <code>{account.email}</code>
                </dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd>
                  <code>{account.password}</code>
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className={account.role === "admin" ? "btn-ghost" : "btn-primary"}
              disabled={busy}
              onClick={() => signIn(account.email, account.password)}
            >
              {busy ? "Signing in…" : `Log in as ${account.role}`}
            </button>
          </article>
        ))}
      </div>

      <form
        className="admin-card"
        style={{ maxWidth: 420 }}
        onSubmit={(e) => {
          e.preventDefault();
          signIn();
        }}
      >
        <h2>Or type the details</h2>
        <label className="field">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
        </label>
        <label className="field">
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
        </label>
        {error ? <p className="warn">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={busy}>
          Log in
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
