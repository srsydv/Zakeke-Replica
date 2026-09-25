"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductPhoto } from "@/components/ProductPhoto";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPricingGbp, fromPriceForProduct } from "@/lib/quote";

export function ProductDetail({ product }: { product: CatalogProduct }) {
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const selected = product.colors.find((c) => c.name === color);
  const hex = selected?.hex ?? "#1a1a1a";
  const from = useMemo(() => fromPriceForProduct(product), [product]);

  return (
    <article className="pdp">
      <div>
        <ProductPhoto
          src={selected?.imageUrl || product.imageUrl}
          hex={hex}
          silhouette={product.silhouette}
          shop={product.shop}
          alt={product.name}
        />
      </div>
      <div>
        <p className="eyebrow">{product.brand}</p>
        <h1>{product.name}</h1>
        <p className="muted">
          {product.category} · {product.styleCode}
          {product.gender ? ` · ${product.gender}` : ""} · {product.colors.length} colours ·{" "}
          {product.sizes.join(", ")}
        </p>
        {product.description ? <p className="muted">{product.description}</p> : null}
        {product.fabric ? <p className="tiny">{product.fabric}</p> : null}
        {product.printArea ? <p className="tiny">Print area: {product.printArea}</p> : null}
        {product.embroideryInfo ? (
          <p className="tiny">Embroidery: {product.embroideryInfo}</p>
        ) : null}
        <p className="price-lg" style={{ marginTop: "1rem" }}>
          from {formatPricingGbp(from)}
        </p>
        <p className="tiny">Inc VAT at 12 pieces with one print placement. Live quote in the studio.</p>
        <div className="color-picker">
          {product.colors.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              className={c.name === color ? "is-on" : ""}
              style={{ background: c.hex }}
              onClick={() => setColor(c.name)}
            />
          ))}
        </div>
        <p className="tiny">{color}</p>
        <div className="hero-actions">
          <Link
            href={`/designer?productId=${product.id}&color=${encodeURIComponent(color)}`}
            className="btn-primary"
          >
            Design this
          </Link>
          <Link href={`/shop/${product.shop}`} className="btn-ghost">
            More {product.shop}
          </Link>
        </div>
      </div>
    </article>
  );
}
