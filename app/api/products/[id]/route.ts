import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalog";
import { fromPriceForProduct } from "@/lib/quote";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...product, fromPrice: fromPriceForProduct(product) });
}
