import Link from "next/link";

export default async function OrderPlacedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <div className="cart-page">
      <p className="eyebrow">Customer view</p>
      <h1>Thanks — your design is in.</h1>
      <p className="muted">
        {id ? `Order #${id} ` : "Your order "}
        was sent to production. The shop floor does not print the shirt photo. They get a job
        ticket with the location (for example left chest) and the size in inches.
      </p>
      <p>
        To see that ticket, log out and sign in as the admin:
        <br />
        <code>admin@bluecotton.test</code> / <code>admin123</code>
      </p>
      <div className="hero-actions">
        <Link href="/api/auth/logout" className="btn-ghost" prefetch={false}>
          Switch account
        </Link>
        <Link href="/login?need=admin&next=/admin" className="btn-primary">
          Open admin login
        </Link>
      </div>
    </div>
  );
}
