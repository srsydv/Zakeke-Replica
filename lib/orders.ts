import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getProduct } from "@/lib/catalog";
import { openWritableDb } from "@/lib/db";
import { artworkLabel, buildPrintJobs, type DesignObj, type LocationJob } from "@/lib/design";
import { areaForPlacement, findSide, type PublicGarment } from "@/lib/garment-template";
import { getOrCreateGarment, getStoredGarment } from "@/lib/garments";
import type { SizeQty } from "@/lib/quote";
import type { RushTier } from "@/lib/pricing/rush-pricing";

export type OrderStatus = "new" | "reviewed" | "in-production" | "done";

export type OrderCustomer = {
  name: string;
  email: string;
  address: string;
};

export type OrderItem = {
  id: string;
  productId: number;
  styleCode?: string;
  name: string;
  brand: string;
  color: string;
  hex: string;
  imageUrl?: string;
  silhouette: string;
  decoration: "print" | "embroidery";
  rush: RushTier;
  sizeQuantities: SizeQty[];
  placementCodes: string[];
  objects: DesignObj[];
  quote: unknown;
  printJobs: LocationJob[];
};

export type StoredOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  isDummy?: boolean;
  customer: OrderCustomer;
  items: OrderItem[];
  totalIncVat: number;
};

type OrdersFile = { orders: StoredOrder[] };

const jsonPath = () => join(process.cwd(), "data", "orders.json");

function readJsonFile(): OrdersFile {
  const path = jsonPath();
  if (!existsSync(path)) return { orders: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as OrdersFile;
  } catch {
    return { orders: [] };
  }
}

function writeJsonFile(data: OrdersFile) {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(jsonPath(), JSON.stringify(data, null, 2));
}

function hydrateItem(item: OrderItem): OrderItem {
  const product = getProduct(item.productId);
  const garment = getStoredGarment(item.productId);
  const hint = {
    silhouette: item.silhouette,
    name: product?.name ?? item.name,
    category: product?.category,
    printArea: product?.printArea,
  };
  return {
    ...item,
    styleCode: product?.styleCode ?? item.styleCode,
    printJobs: buildPrintJobs(item.objects ?? [], hint).map((job) =>
      attachTemplate(job, garment, item.objects ?? []),
    ),
  };
}

function hydrateOrder(order: StoredOrder): StoredOrder {
  return { ...order, items: order.items.map(hydrateItem) };
}

function migrateJsonIfNeeded() {
  const db = openWritableDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM orders").get() as { n: number }).n;
  if (count > 0) return;
  const file = readJsonFile();
  if (!file.orders.length) return;
  for (const order of file.orders) {
    persistOrderRow(hydrateOrder(order), false);
  }
}

function persistOrderRow(order: StoredOrder, writeJson = true) {
  const db = openWritableDb();
  db.prepare(
    `INSERT OR REPLACE INTO orders
      (id, created_at, status, is_dummy, customer_name, customer_email, customer_address, total_inc_vat, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    order.id,
    order.createdAt,
    order.status,
    order.isDummy ? 1 : 0,
    order.customer.name,
    order.customer.email,
    order.customer.address,
    order.totalIncVat,
    JSON.stringify(order),
  );
  db.prepare("DELETE FROM order_items WHERE order_id = ?").run(order.id);
  db.prepare("DELETE FROM order_placements WHERE order_id = ?").run(order.id);
  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO order_items (
      id, order_id, product_id, style_code, garment_name, brand, color, sizes, decoration, quantity, total_inc_vat
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insert = db.prepare(`
    INSERT INTO order_placements (
      order_id, item_id, product_id, style_code, garment_name, color,
      side, placement_code, placement_label, print_w_in, print_h_in, ppi,
      image_w, image_h, crop, box_x_px, box_y_px, box_w_px, box_h_px,
      artwork_id, artwork_kind, artwork_label, width_in, height_in, left_in, top_in,
      art_x_px, art_y_px, art_w_px, art_h_px
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of order.items) {
    const qty = item.sizeQuantities.reduce((sum, row) => sum + (row.quantity || 0), 0);
    const lineTotal = (item.quote as { rush?: { totalIncVat?: number } } | undefined)?.rush?.totalIncVat ?? 0;
    insertItem.run(
      item.id,
      order.id,
      item.productId,
      item.styleCode ?? "",
      item.name,
      item.brand,
      item.color,
      JSON.stringify(item.sizeQuantities.filter((row) => row.quantity > 0)),
      item.decoration,
      qty,
      lineTotal,
    );
    for (const job of item.printJobs) {
      for (const art of job.artworks) {
        insert.run(
          order.id,
          item.id,
          item.productId,
          item.styleCode ?? "",
          item.name,
          item.color,
          job.side,
          job.code,
          job.label,
          job.printAreaIn?.w ?? null,
          job.printAreaIn?.h ?? null,
          job.pixelsPerInch ?? null,
          job.imageWidth ?? null,
          job.imageHeight ?? null,
          job.crop ? JSON.stringify(job.crop) : null,
          job.printBoxPx?.x ?? null,
          job.printBoxPx?.y ?? null,
          job.printBoxPx?.w ?? null,
          job.printBoxPx?.h ?? null,
          art.id,
          art.obj.type,
          artworkLabel(art.obj),
          art.widthIn,
          art.heightIn,
          art.leftIn,
          art.topIn,
          art.pixelOnGarment?.x ?? null,
          art.pixelOnGarment?.y ?? null,
          art.pixelOnGarment?.w ?? null,
          art.pixelOnGarment?.h ?? null,
        );
      }
    }
  }
  if (writeJson) {
    const data = readJsonFile();
    const index = data.orders.findIndex((row) => row.id === order.id);
    if (index >= 0) data.orders[index] = order;
    else data.orders.unshift(order);
    writeJsonFile({ orders: data.orders.slice(0, 80) });
  }
}

function attachTemplate(job: LocationJob, garment: PublicGarment | undefined, objects: DesignObj[]): LocationJob {
  const side = findSide(garment, job.side);
  const area = areaForPlacement(side, job.code) ?? side?.areas[0];
  if (!side || !area) return job;
  return {
    ...job,
    pixelsPerInch: side.pixelsPerInch,
    imageWidth: side.imageWidth,
    imageHeight: side.imageHeight,
    crop: side.crop,
    printBoxPx: { x: area.x, y: area.y, w: area.w, h: area.h },
    artworks: job.artworks.map((art) => {
      const obj = objects.find((o) => o.id === art.id) ?? art.obj;
      return {
        ...art,
        pixelOnGarment: {
          x: Math.round(area.x + obj.x * area.w),
          y: Math.round(area.y + obj.y * area.h),
          w: Math.round(obj.w * area.w),
          h: Math.round(obj.h * area.h),
        },
      };
    }),
  };
}

function backfillOrderItems() {
  const db = openWritableDb();
  const n = (db.prepare("SELECT COUNT(*) AS n FROM order_items").get() as { n: number }).n;
  if (n > 0) return;
  const rows = db.prepare("SELECT payload FROM orders").all() as Array<{ payload: string }>;
  for (const row of rows) {
    persistOrderRow(hydrateOrder(JSON.parse(row.payload) as StoredOrder), false);
  }
}

export function listOrders(): StoredOrder[] {
  migrateJsonIfNeeded();
  backfillOrderItems();
  const rows = openWritableDb()
    .prepare("SELECT payload FROM orders ORDER BY created_at DESC")
    .all() as Array<{ payload: string }>;
  return rows.map((row) => hydrateOrder(JSON.parse(row.payload) as StoredOrder));
}

export function getOrder(id: string): StoredOrder | undefined {
  migrateJsonIfNeeded();
  const row = openWritableDb().prepare("SELECT payload FROM orders WHERE id = ?").get(id) as { payload: string } | undefined;
  if (!row) return undefined;
  const order = hydrateOrder(JSON.parse(row.payload) as StoredOrder);
  persistOrderRow(order);
  return order;
}

export async function createOrder(input: {
  customer: OrderCustomer;
  items: Omit<OrderItem, "printJobs" | "styleCode">[];
  isDummy?: boolean;
}): Promise<StoredOrder> {
  const items: OrderItem[] = [];
  for (const item of input.items) {
    const product = getProduct(item.productId);
    const garment = await getOrCreateGarment(item.productId);
    const hint = {
      silhouette: item.silhouette,
      name: product?.name ?? item.name,
      category: product?.category,
      printArea: product?.printArea,
    };
    const printJobs = buildPrintJobs(item.objects ?? [], hint).map((job) =>
      attachTemplate(job, garment, item.objects ?? []),
    );
    items.push({
      ...item,
      styleCode: product?.styleCode,
      printJobs,
    });
  }
  const totalIncVat = items.reduce((sum, item) => {
    const quote = item.quote as { rush?: { totalIncVat?: number } } | undefined;
    return sum + (quote?.rush?.totalIncVat ?? 0);
  }, 0);
  const order: StoredOrder = {
    id: randomUUID().slice(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    status: "new",
    isDummy: input.isDummy,
    customer: input.customer,
    items,
    totalIncVat,
  };
  persistOrderRow(order);
  return order;
}

export function updateOrderStatus(id: string, status: OrderStatus): StoredOrder | undefined {
  const order = getOrder(id);
  if (!order) return undefined;
  order.status = status;
  persistOrderRow(order);
  return order;
}
