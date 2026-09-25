"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DummyOrderButton({
  className = "btn-primary",
  label = "Order a dummy tee",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const me = await fetch("/api/auth/me").then((r) => r.json() as Promise<{ user?: { role?: string } }>);
            if (me.user?.role !== "user") {
              router.push("/login?need=user&next=/");
              return;
            }
            const res = await fetch("/api/orders/dummy", { method: "POST" });
            const data = (await res.json()) as { order?: { id: string }; error?: string };
            if (!res.ok || !data.order) throw new Error(data.error || "Could not place dummy order.");
            router.push(`/order-placed?id=${data.order.id}`);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not place dummy order.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Placing dummy order…" : label}
      </button>
      {error ? <p className="warn">{error}</p> : null}
    </div>
  );
}
