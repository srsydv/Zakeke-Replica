import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/catalog";
import { fromPriceForProduct } from "@/lib/quote";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const { items, total } = listProducts({
    shop: searchParams.get("shop") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    limit: Number(searchParams.get("limit") || 24),
    offset: Number(searchParams.get("offset") || 0),
  });
  return NextResponse.json({
    total,
    items: items.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      shop: p.shop,
      colors: p.colors.length,
      fromPrice: fromPriceForProduct(p),
    })),
  });
}
