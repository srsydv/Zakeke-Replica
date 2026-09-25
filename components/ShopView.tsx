import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { listProducts, SHOP_CATEGORIES } from "@/lib/catalog";
import { fromPriceForProduct } from "@/lib/quote";

export async function ShopView({
  title,
  subtitle,
  shop,
  q,
  page,
  eyebrow = "Shop",
  catalogBase = "/shop",
  productHref,
  productAction,
  showFooter = true,
}: {
  title: string;
  subtitle: string;
  shop?: string;
  q?: string;
  page: number;
  eyebrow?: string;
  catalogBase?: string;
  productHref?: (id: number) => string;
  productAction?: string;
  showFooter?: boolean;
}) {
  const pageSize = 24;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const { items, total } = await listProducts({
    shop,
    q,
    limit: pageSize,
    offset: (safePage - 1) * pageSize,
  });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const admin = catalogBase.startsWith("/admin");
  const categoryHref = (slug: string) => (admin ? `${catalogBase}?shop=${slug}` : `/shop/${slug}`);
  const listHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (admin && shop) params.set("shop", shop);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    if (admin) return qs ? `${catalogBase}?${qs}` : catalogBase;
    const base = shop ? `/shop/${shop}` : "/shop";
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <>
      <div className="shop-page">
        <div className="shop-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="muted">
              {subtitle} {total.toLocaleString()} styles.
            </p>
          </div>
          <form>
            {admin && shop ? <input type="hidden" name="shop" value={shop} /> : null}
            <input className="search" name="q" defaultValue={q} placeholder="Search styles, brands…" />
          </form>
        </div>
        <div className="cat-grid" style={{ marginBottom: "1.5rem" }}>
          {SHOP_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={categoryHref(c.slug)}
              className="cat-tile"
              style={c.slug === shop ? { outline: "2px solid #0446d4" } : undefined}
            >
              <h3>{c.label}</h3>
            </Link>
          ))}
        </div>
        <div className="product-grid">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              fromPrice={fromPriceForProduct(p)}
              href={productHref?.(p.id)}
              actionLabel={productAction}
            />
          ))}
        </div>
        {pages > 1 ? (
          <div className="pager">
            {safePage > 1 ? <Link href={listHref(safePage - 1)}>Previous</Link> : <span>Previous</span>}
            <span>
              {safePage} / {pages}
            </span>
            {safePage < pages ? <Link href={listHref(safePage + 1)}>Next</Link> : <span>Next</span>}
          </div>
        ) : null}
      </div>
      {showFooter ? <Footer /> : null}
    </>
  );
}
