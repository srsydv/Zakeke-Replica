import Link from "next/link";
import { listOrders } from "@/lib/orders";
import { formatPricingGbp } from "@/lib/quote";

export default function AdminOrdersPage() {
  const orders = listOrders();
  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Production</p>
          <h1>Admin — incoming jobs</h1>
          <p className="muted">
            Each job stores print area, artwork inches, and pixel placement in
            catalog.db tables <code>orders</code> and <code>order_placements</code>.
            The press uses those numbers and the artwork file, not the shirt photo.
          </p>
        </div>
        <p className="tiny">
          <Link href="/admin/garments">Print boxes</Link>
          {" · "}
          Orders appear here after a customer logs in and checks out.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="admin-card">
          <p className="muted">No orders yet. Place a dummy tee or check out from the shop.</p>
        </div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Customer</th>
                <th>Garment</th>
                <th>Location</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const item = order.items[0];
                const locations = [...new Set(order.items.flatMap((i) => i.printJobs.map((j) => j.label)))];
                return (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/${order.id}`}>#{order.id}</Link>
                      {order.isDummy ? <span className="badge-dummy">Dummy</span> : null}
                      <p className="tiny">{new Date(order.createdAt).toLocaleString()}</p>
                    </td>
                    <td>
                      {order.customer.name}
                      <p className="tiny">{order.customer.email}</p>
                    </td>
                    <td>
                      {item?.name}
                      <p className="tiny">
                        {item?.color} · {item?.quote && typeof item.quote === "object" && "line" in item.quote
                          ? `${(item.quote as { line?: { quantity?: number } }).line?.quantity ?? 0} pcs`
                          : ""}
                      </p>
                    </td>
                    <td>{locations.join(", ") || "—"}</td>
                    <td className="admin-status-cell">{order.status}</td>
                    <td>{formatPricingGbp(order.totalIncVat)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
