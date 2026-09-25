"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth-accounts";

const NAV = [
  { href: "/shop/t-shirts", label: "T-Shirts" },
  { href: "/shop/hoodies", label: "Hoodies" },
  { href: "/shop/polos", label: "Polos" },
  { href: "/shop/hats", label: "Hats" },
  { href: "/shop", label: "All products" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const designer = pathname.startsWith("/designer");

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("bc-cart");
        const items = raw ? (JSON.parse(raw) as unknown[]) : [];
        setCount(items.length);
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener("bc-cart", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("bc-cart", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: SessionUser | null }) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className={`site-header ${designer ? "site-header--studio" : ""}`}>
      <div className="site-header__inner">
        <Link href="/" className="logo" aria-label="BlueCotton home">
          BlueCotton
        </Link>
        {!designer ? (
          <nav className="site-nav">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div className="studio-header-actions">
            <button
              type="button"
              className="studio-header-link"
              onClick={() => window.dispatchEvent(new Event("bc-live-chat"))}
            >
              Live Chat
            </button>
            <Link href="/help" className="studio-header-link">
              Help
            </Link>
            <Link href="/cart" className="cart-badge" aria-label={`Cart, ${count} items`}>
              {count}
            </Link>
          </div>
        )}
        {!designer ? (
          <div className="header-end">
            {user?.role === "admin" ? (
              <>
                <Link href="/admin" className="tiny-link">
                  Admin
                </Link>
                <Link href="/admin/garments" className="tiny-link">
                  Print boxes
                </Link>
              </>
            ) : null}
            {user ? (
              <>
                <span className="tiny-link">
                  {user.name.split(" ")[0]} · {user.role}
                </span>
                <button type="button" className="tiny-link" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className="tiny-link">
                Log in
              </Link>
            )}
            {user?.role !== "admin" ? (
              <Link href="/cart" className="cart-link">
                Cart{count > 0 ? ` (${count})` : ""}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
