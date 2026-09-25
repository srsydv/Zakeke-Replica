import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus, type OrderStatus } from "@/lib/orders";

const STATUSES: OrderStatus[] = ["new", "reviewed", "in-production", "done"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { status?: string };
  if (!body.status || !STATUSES.includes(body.status as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const order = updateOrderStatus(id, body.status as OrderStatus);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}
