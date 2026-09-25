"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { formatPricingGbp } from "@/lib/quote";

type CartItem = {
  id: string;
  productId: number;
  name: string;
  brand: string;
  color: string;
  hex: string;
  imageUrl?: string;
  silhouette: "tee" | "hoodie" | "polo" | "jacket" | "cap" | "bag" | "bottoms" | "vest";
  decoration: string;
  quote: { rush: { totalIncVat: number }; unitIncVat: number; line: { quantity: number } };
};

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("bc-cart") || "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const remove = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    localStorage.setItem("bc-cart", JSON.stringify(next));
    window.dispatchEvent(new Event("bc-cart"));
  };

  const total = items.reduce((s, i) => s + (i.quote?.rush?.totalIncVat ?? 0), 0);

  return (
    <div className="cart-page">
      <h1>Cart</h1>
      {items.length === 0 ? (
        <p className="muted">
          Nothing here yet. <Link href="/shop/t-shirts">Start with a t-shirt.</Link>
        </p>
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id} className="cart-item">
              <ProductPhoto
                src={item.imageUrl}
                hex={item.hex}
                silhouette={item.silhouette}
                alt={item.name}
              />
              <div>
                <p className="eyebrow">{item.brand}</p>
                <h3>{item.name}</h3>
                <p className="muted">
                  {item.color} · {item.decoration} · {item.quote.line.quantity} pcs
                </p>
              </div>
              <div>
                <p>{formatPricingGbp(item.quote.rush.totalIncVat)}</p>
                <button type="button" className="btn-ghost" onClick={() => remove(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <p className="price-lg">Total {formatPricingGbp(total)}</p>
          <Link href="/checkout" className="btn-primary">
            Checkout
          </Link>
        </>
      )}
    </div>
  );
}
