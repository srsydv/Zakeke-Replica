import { NextResponse } from "next/server";
import { createOrder, listOrders, type OrderItem } from "@/lib/orders";
import type { DesignObj } from "@/lib/design";
import type { SizeQty } from "@/lib/quote";
import type { RushTier } from "@/lib/pricing/rush-pricing";

export async function GET() {
  return NextResponse.json({ orders: listOrders() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    customer?: { name?: string; email?: string; address?: string };
    items?: Array<Omit<OrderItem, "printJobs">>;
    isDummy?: boolean;
  };
  const name = body.customer?.name?.trim();
  const email = body.customer?.email?.trim();
  const address = body.customer?.address?.trim();
  if (!name || !email || !address) {
    return NextResponse.json({ error: "Name, email and address are required." }, { status: 400 });
  }
  if (!body.items?.length) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }
  const items = body.items.map((item) => ({
    id: item.id || Math.random().toString(36).slice(2, 9),
    productId: Number(item.productId),
    name: String(item.name ?? "Garment"),
    brand: String(item.brand ?? ""),
    color: String(item.color ?? ""),
    hex: String(item.hex ?? "#111111"),
    imageUrl: item.imageUrl,
    silhouette: String(item.silhouette ?? "tee"),
    decoration: (item.decoration === "embroidery" ? "embroidery" : "print") as "print" | "embroidery",
    rush: (item.rush ?? "standard") as RushTier,
    sizeQuantities: (item.sizeQuantities ?? []) as SizeQty[],
    placementCodes: item.placementCodes ?? ["FRONT"],
    objects: (item.objects ?? []) as DesignObj[],
    quote: item.quote,
  }));
  const order = await createOrder({
    customer: { name, email, address },
    items,
    isDummy: body.isDummy,
  });
  return NextResponse.json({ order });
}
