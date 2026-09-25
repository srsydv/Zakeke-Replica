import Link from "next/link";
import { ProductPhoto } from "@/components/ProductPhoto";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPricingGbp } from "@/lib/pricing/pricing-engine";

export function ProductCard({
  product,
  fromPrice,
  href,
  actionLabel,
}: {
  product: CatalogProduct;
  fromPrice: number;
  href?: string;
  actionLabel?: string;
}) {
  const color = product.colors[0];
  return (
    <Link href={href ?? `/product/${product.id}`} className="product-card">
      <div className="product-card__art">
        <ProductPhoto
          src={color?.imageUrl || product.imageUrl}
          hex={color?.hex ?? "#1a1a1a"}
          silhouette={product.silhouette}
          alt={product.name}
        />
      </div>
      <div className="product-card__meta">
        <p className="eyebrow">{product.brand}</p>
        <h3>{product.name}</h3>
        <p className="muted">
          {actionLabel ?? `${product.colors.length} colours · from ${formatPricingGbp(fromPrice)}`}
        </p>
        <div className="color-row">
          {product.colors.slice(0, 8).map((c) => (
            <span key={c.name} title={c.name} style={{ background: c.hex }} />
          ))}
        </div>
      </div>
    </Link>
  );
}
