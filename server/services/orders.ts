import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { getProduct } from "@/server/services/catalog";
import { getDb } from "@/server/db/client";
import { orderItems, orderPlacements, orders } from "@/server/db/schema";
import { artworkLabel, buildPrintJobs, type DesignObj, type LocationJob } from "@/lib/design";
import { areaForPlacement, findSide, type PublicGarment } from "@/lib/garment-template";
import { getOrCreateGarment, getStoredGarment } from "@/server/services/garments";
import type { OrderStatus } from "@/lib/orders";
import type { SizeQty } from "@/lib/quote";
import type { RushTier } from "@/lib/pricing/rush-pricing";

export type { OrderStatus } from "@/lib/orders";

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

async function hydrateItem(item: OrderItem): Promise<OrderItem> {
  const product = await getProduct(item.productId);
  const garment = await getStoredGarment(item.productId);
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

async function hydrateOrder(order: StoredOrder): Promise<StoredOrder> {
  return { ...order, items: await Promise.all(order.items.map(hydrateItem)) };
}

async function migrateJsonIfNeeded() {
  const db = getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(orders);
  if (n > 0) return;
  const file = readJsonFile();
  if (!file.orders.length) return;
  for (const order of file.orders) {
    await persistOrderRow(await hydrateOrder(order), false);
  }
}

async function persistOrderRow(order: StoredOrder, writeJson = true) {
  const db = getDb();
  await db
    .insert(orders)
    .values({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      isDummy: order.isDummy ? 1 : 0,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerAddress: order.customer.address,
      totalIncVat: order.totalIncVat,
      payload: order,
    })
    .onConflictDoUpdate({
      target: orders.id,
      set: {
        createdAt: order.createdAt,
        status: order.status,
        isDummy: order.isDummy ? 1 : 0,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerAddress: order.customer.address,
        totalIncVat: order.totalIncVat,
        payload: order,
      },
    });
  await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  await db.delete(orderPlacements).where(eq(orderPlacements.orderId, order.id));
  for (const item of order.items) {
    const qty = item.sizeQuantities.reduce((sum, row) => sum + (row.quantity || 0), 0);
    const lineTotal = (item.quote as { rush?: { totalIncVat?: number } } | undefined)?.rush?.totalIncVat ?? 0;
    await db.insert(orderItems).values({
      id: item.id,
      orderId: order.id,
      productId: item.productId,
      styleCode: item.styleCode ?? "",
      garmentName: item.name,
      brand: item.brand,
      color: item.color,
      sizes: item.sizeQuantities.filter((row) => row.quantity > 0),
      decoration: item.decoration,
      quantity: qty,
      totalIncVat: lineTotal,
    });
    const placementRows = item.printJobs.flatMap((job) =>
      job.artworks.map((art) => ({
        orderId: order.id,
        itemId: item.id,
        productId: item.productId,
        styleCode: item.styleCode ?? "",
        garmentName: item.name,
        color: item.color,
        side: job.side,
        placementCode: job.code,
        placementLabel: job.label,
        printWIn: job.printAreaIn?.w ?? null,
        printHIn: job.printAreaIn?.h ?? null,
        ppi: job.pixelsPerInch ?? null,
        imageW: job.imageWidth ?? null,
        imageH: job.imageHeight ?? null,
        crop: job.crop ? JSON.stringify(job.crop) : null,
        boxXPx: job.printBoxPx?.x ?? null,
        boxYPx: job.printBoxPx?.y ?? null,
        boxWPx: job.printBoxPx?.w ?? null,
        boxHPx: job.printBoxPx?.h ?? null,
        artworkId: art.id,
        artworkKind: art.obj.type,
        artworkLabel: artworkLabel(art.obj),
        widthIn: art.widthIn,
        heightIn: art.heightIn,
        leftIn: art.leftIn,
        topIn: art.topIn,
        artXPx: art.pixelOnGarment?.x ?? null,
        artYPx: art.pixelOnGarment?.y ?? null,
        artWPx: art.pixelOnGarment?.w ?? null,
        artHPx: art.pixelOnGarment?.h ?? null,
      })),
    );
    if (placementRows.length) await db.insert(orderPlacements).values(placementRows);
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

export async function persistImportedOrder(order: StoredOrder) {
  return persistOrderRow(order, false);
}

export async function listOrders(): Promise<StoredOrder[]> {
  await migrateJsonIfNeeded();
  const rows = await getDb().select().from(orders).orderBy(desc(orders.createdAt));
  return Promise.all(rows.map((row) => hydrateOrder(row.payload as StoredOrder)));
}

export async function getOrder(id: string): Promise<StoredOrder | undefined> {
  await migrateJsonIfNeeded();
  const [row] = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) return undefined;
  const order = await hydrateOrder(row.payload as StoredOrder);
  await persistOrderRow(order);
  return order;
}

export async function createOrder(input: {
  customer: OrderCustomer;
  items: Omit<OrderItem, "printJobs" | "styleCode">[];
  isDummy?: boolean;
}): Promise<StoredOrder> {
  const items: OrderItem[] = [];
  for (const item of input.items) {
    const product = await getProduct(item.productId);
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
  await persistOrderRow(order);
  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<StoredOrder | undefined> {
  const order = await getOrder(id);
  if (!order) return undefined;
  order.status = status;
  await persistOrderRow(order);
  return order;
}
