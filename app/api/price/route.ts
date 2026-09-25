import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalog";
import { quoteOrder, type SizeQty } from "@/lib/quote";
import type { RushTier } from "@/lib/pricing/rush-pricing";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    productId: number;
    sizeQuantities: SizeQty[];
    placementCodes?: string[];
    decoration?: "print" | "embroidery";
    stitchCount?: number;
    rushTier?: RushTier;
    colorName?: string;
  };
  const product = getProduct(body.productId);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const quote = quoteOrder({
    product,
    colorName: body.colorName,
    sizeQuantities: body.sizeQuantities ?? [],
    placementCodes: body.placementCodes ?? ["FRONT"],
    decoration: body.decoration ?? "print",
    stitchCount: body.stitchCount,
    rushTier: body.rushTier,
  });
  return NextResponse.json(quote);
}
