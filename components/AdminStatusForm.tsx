"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@/lib/orders";

const OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "New — art review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "in-production", label: "In production" },
  { value: "done", label: "Done" },
];

export function AdminStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="admin-status"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      <label className="field">
        Production status
        <select value={value} onChange={(e) => setValue(e.target.value as OrderStatus)}>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn-ghost" disabled={busy}>
        {busy ? "Saving…" : "Update status"}
      </button>
    </form>
  );
}
