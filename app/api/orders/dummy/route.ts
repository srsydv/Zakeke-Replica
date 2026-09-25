import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildDummyOrderItem } from "@/lib/dummy-order";
import { createOrder } from "@/lib/orders";

export async function POST() {
  const session = await getSession();
  if (session?.role !== "user") {
    return NextResponse.json({ error: "Log in as the user to place a dummy order." }, { status: 401 });
  }
  const item = buildDummyOrderItem();
  if (!item) return NextResponse.json({ error: "No dummy garment in the catalog." }, { status: 500 });
  const order = await createOrder({
    isDummy: true,
    customer: {
      name: session.name,
      email: session.email,
      address: session.address || "18 High Street, Test Town",
    },
    items: [item],
  });
  return NextResponse.json({ order });
}
