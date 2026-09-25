import { CLIPART } from "@/lib/clipart";
import type { DesignObj } from "@/lib/design";
import { MIN_ORDER_QTY, quoteOrder, type SizeQty } from "@/lib/quote";
import { featuredProducts } from "@/server/services/catalog";
import type { OrderItem } from "@/server/services/orders";

export async function buildDummyOrderItem(): Promise<Omit<OrderItem, "printJobs"> | null> {
  const featured = await featuredProducts(8);
  const product = featured.find((p) => p.shop === "t-shirts") ?? (await featuredProducts(1))[0];
  if (!product) return null;
  const color = product.colors[0];
  const hex = color?.hex ?? "#1a1a1a";
  const size = product.sizes.includes("M") ? "M" : product.sizes[0] ?? "M";
  const sizeQuantities: SizeQty[] = product.sizes.map((s) => ({
    size: s,
    quantity: s === size ? MIN_ORDER_QTY : 0,
  }));
  const star = CLIPART.find((c) => c.id === "star") ?? CLIPART[0]!;
  const fill = "#0446d4";
  const objects: DesignObj[] = [
    {
      id: "dummy-star",
      type: "clipart",
      side: "front",
      placementCode: "FLB",
      x: 0.12,
      y: 0.04,
      w: 0.76,
      h: 0.58,
      rotation: 0,
      fill,
      src: star.svg,
      clipartId: star.id,
      aspect: 0.76 / 0.58,
    },
    {
      id: "dummy-text",
      type: "text",
      side: "front",
      placementCode: "FLB",
      x: 0.06,
      y: 0.66,
      w: 0.88,
      h: 0.28,
      rotation: 0,
      text: "TEST",
      font: "Anton",
      fill,
    },
  ];
  const quote = quoteOrder({
    product,
    colorName: color?.name,
    sizeQuantities,
    placementCodes: ["FLB"],
    decoration: "print",
    rushTier: "standard",
  });
  return {
    id: `dummy-${Date.now().toString(36)}`,
    productId: product.id,
    name: product.name,
    brand: product.brand,
    color: color?.name ?? "Default",
    hex,
    imageUrl: color?.imageUrl || product.imageUrl,
    silhouette: product.silhouette,
    decoration: "print",
    rush: "standard",
    sizeQuantities,
    placementCodes: ["FLB"],
    objects,
    quote,
  };
}
