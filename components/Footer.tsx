import Link from "next/link";
import { SHOP_CATEGORIES } from "@/lib/catalog";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <p className="logo">BlueCotton</p>
          <p className="muted">Custom apparel on Ralawise blanks. Our studio, our pricing.</p>
        </div>
        <div>
          <h3>Shop</h3>
          <ul>
            {SHOP_CATEGORIES.slice(0, 8).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`}>{c.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Studio</h3>
          <ul>
            <li>
              <Link href="/help">Design Studio help</Link>
            </li>
            <li>
              <Link href="/login">Log in (user / admin)</Link>
            </li>
            <li>Print and embroidery quotes</li>
            <li>Artists review every order</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
