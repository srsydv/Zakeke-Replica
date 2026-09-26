import Link from "next/link";
import { DummyOrderButton } from "@/components/DummyOrderButton";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SHOP_CATEGORIES } from "@/lib/catalog";
import { featuredProducts } from "@/server/services/catalog";
import { fromPriceForProduct } from "@/lib/quote";

export default async function HomePage() {
  const featured = await featuredProducts(8);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Custom apparel studio</p>
          <h1>Mark the moment.</h1>
          <p>
            Design t-shirts, hoodies and workwear on Ralawise blanks. Our own Design
            Studio — text, clipart and uploads — with live print and embroidery
            pricing.
          </p>
          <div className="hero-actions">
            <Link href="/shop/t-shirts" className="btn-primary">
              Shop t-shirts
            </Link>
            <DummyOrderButton className="btn-ghost" label="Order a dummy tee" />
          </div>
          <p className="tiny">
            Log in as the user, then order a dummy tee. Log in as admin to see the job ticket.
          </p>
        </div>
        <div>
          {featured[0] ? (
            <ProductCard product={featured[0]} fromPrice={fromPriceForProduct(featured[0])} />
          ) : null}
        </div>
      </section>

      <section className="section">
        <h2>Shop by style</h2>
        <div className="cat-grid">
          {SHOP_CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}`} className="cat-tile">
              <h3>{c.label}</h3>
              <p className="muted">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Popular blanks</h2>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} fromPrice={fromPriceForProduct(p)} />
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
