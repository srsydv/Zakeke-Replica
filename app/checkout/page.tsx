"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth-accounts";
import { formatPricingGbp } from "@/lib/quote";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<unknown[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("bc-cart") || "[]") as Array<{
        quote?: { rush?: { totalIncVat?: number } };
      }>;
      setItems(raw);
      setTotal(raw.reduce((s, i) => s + (i.quote?.rush?.totalIncVat ?? 0), 0));
    } catch {
      setItems([]);
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: SessionUser | null }) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="cart-page">
      <h1>Checkout</h1>
      <p className="price-lg">{formatPricingGbp(total)} inc VAT</p>
      <p className="muted">
        Signed in as {user?.name ?? "customer"}. After you place the order, log in as admin to
        open the production job ticket.
      </p>
      <form
        className="pdp"
        style={{ gridTemplateColumns: "1fr", maxWidth: 560, margin: "1rem 0" }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const form = e.currentTarget;
          const data = new FormData(form);
          try {
            const res = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customer: {
                  name: String(data.get("name") || ""),
                  email: String(data.get("email") || ""),
                  address: String(data.get("address") || ""),
                },
                items,
              }),
            });
            const json = (await res.json()) as { order?: { id: string }; error?: string };
            if (!res.ok || !json.order) throw new Error(json.error || "Could not place order.");
            localStorage.removeItem("bc-cart");
            window.dispatchEvent(new Event("bc-cart"));
            router.push(`/order-placed?id=${json.order.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not place order.");
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Name
          <input required name="name" defaultValue={user?.name ?? ""} key={user?.name} />
        </label>
        <label className="field">
          Email
          <input required type="email" name="email" defaultValue={user?.email ?? ""} key={user?.email} />
        </label>
        <label className="field">
          Delivery address
          <input required name="address" defaultValue={user?.address ?? ""} key={user?.address} />
        </label>
        {error ? <p className="warn">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={busy || items.length === 0}>
          {busy ? "Sending to production…" : "Place order"}
        </button>
        {items.length === 0 ? (
          <p className="muted">
            Cart is empty. <Link href="/shop/t-shirts">Shop t-shirts</Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
