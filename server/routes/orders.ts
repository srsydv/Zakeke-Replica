import { Router } from "express";
import type { DesignObj } from "@/lib/design";
import type { RushTier } from "@/lib/pricing/rush-pricing";
import type { SizeQty } from "@/lib/quote";
import { asyncRoute } from "@/server/middleware/async-route";
import { requireRole, sessionFromReq } from "@/server/middleware/session";
import { buildDummyOrderItem } from "@/server/services/dummy-order";
import { createOrder, getOrder, listOrders, updateOrderStatus, type OrderItem, type OrderStatus } from "@/server/services/orders";

export const ordersRouter = Router();

const STATUSES: OrderStatus[] = ["new", "reviewed", "in-production", "done"];

ordersRouter.get(
  "/api/orders",
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    res.json({ orders: await listOrders() });
  }),
);

ordersRouter.post(
  "/api/orders",
  requireRole("user"),
  asyncRoute(async (req, res) => {
    const body = req.body as {
      customer?: { name?: string; email?: string; address?: string };
      items?: Array<Omit<OrderItem, "printJobs">>;
      isDummy?: boolean;
    };
    const name = body.customer?.name?.trim();
    const email = body.customer?.email?.trim();
    const address = body.customer?.address?.trim();
    if (!name || !email || !address) {
      res.status(400).json({ error: "Name, email and address are required." });
      return;
    }
    if (!body.items?.length) {
      res.status(400).json({ error: "Cart is empty." });
      return;
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
    res.json({ order });
  }),
);

ordersRouter.post(
  "/api/orders/dummy",
  requireRole("user"),
  asyncRoute(async (req, res) => {
    const session = sessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: "Log in as the user to place a dummy order." });
      return;
    }
    const item = await buildDummyOrderItem();
    if (!item) {
      res.status(500).json({ error: "No dummy garment in the catalog." });
      return;
    }
    const order = await createOrder({
      isDummy: true,
      customer: {
        name: session.name,
        email: session.email,
        address: session.address || "18 High Street, Test Town",
      },
      items: [item],
    });
    res.json({ order });
  }),
);

ordersRouter.get(
  "/api/orders/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const order = await getOrder(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ order });
  }),
);

ordersRouter.patch(
  "/api/orders/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const body = req.body as { status?: string };
    if (!body.status || !STATUSES.includes(body.status as OrderStatus)) {
      res.status(400).json({ error: "Invalid status." });
      return;
    }
    const order = await updateOrderStatus(String(req.params.id), body.status as OrderStatus);
    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ order });
  }),
);
