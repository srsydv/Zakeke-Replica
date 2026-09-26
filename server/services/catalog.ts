import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { type CatalogFile, type CatalogProduct } from "@/lib/catalog";
import { getDb } from "@/server/db/client";
import { meta, products } from "@/server/db/schema";

export type { CatalogColor, CatalogFile, CatalogProduct } from "@/lib/catalog";
export { SHOP_CATEGORIES, shopLabel } from "@/lib/catalog";

function rowToProduct(row: typeof products.$inferSelect): CatalogProduct {
  return {
    id: row.id,
    styleCode: row.styleCode,
    name: row.name,
    brand: row.brand,
    category: row.category || "",
    shop: row.shop,
    silhouette: (row.silhouette || "tee") as CatalogProduct["silhouette"],
    description: row.description || undefined,
    fabric: row.fabric || undefined,
    gender: row.gender || undefined,
    printArea: row.printArea || undefined,
    embroideryInfo: row.embroideryInfo || undefined,
    imageUrl: row.imageUrl || undefined,
    specSheetUrl: row.specSheetUrl || undefined,
    wholesaleBase: row.wholesaleBase ?? 0,
    sizeWholesale: row.sizeWholesale ?? {},
    colors: row.colors ?? [],
    sizes: row.sizes ?? [],
    faces: row.faces ?? ["front", "back"],
  };
}

/** Kept for admin/debug. Prefer getProduct / listProducts so we do not load all 4086 rows. */
export async function getCatalog(): Promise<CatalogFile> {
  const db = getDb();
  const rows = await db.select().from(products).orderBy(asc(products.id));
  const keys = await db.select().from(meta);
  const value = (key: string) => keys.find((row) => row.key === key)?.value ?? "";
  return {
    generatedAt: value("generatedAt"),
    source: value("source") || "postgres",
    count: rows.length,
    products: rows.map(rowToProduct),
  };
}

export async function getProduct(id: number | string): Promise<CatalogProduct | undefined> {
  const n = typeof id === "string" ? Number(id) : id;
  if (!Number.isFinite(n)) return undefined;
  const [row] = await getDb().select().from(products).where(eq(products.id, n)).limit(1);
  return row ? rowToProduct(row) : undefined;
}

export async function getProductsByIds(ids: number[]): Promise<CatalogProduct[]> {
  if (!ids.length) return [];
  const rows = await getDb().select().from(products).where(inArray(products.id, ids));
  const map = new Map(rows.map((row) => [row.id, rowToProduct(row)]));
  return ids.map((id) => map.get(id)).filter((p): p is CatalogProduct => Boolean(p));
}

export async function listProducts(opts?: {
  shop?: string;
  q?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: CatalogProduct[]; total: number }> {
  const { shop, q, brand, limit = 24, offset = 0 } = opts ?? {};
  const needle = q?.trim();
  const filters = [];
  if (shop) filters.push(eq(products.shop, shop));
  if (brand) filters.push(ilike(products.brand, brand));
  if (needle) {
    const like = `%${needle}%`;
    filters.push(
      or(
        ilike(products.name, like),
        ilike(products.brand, like),
        ilike(products.category, like),
        ilike(products.styleCode, like),
      ),
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const db = getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(where);
  const rows = await db.select().from(products).where(where).orderBy(asc(products.id)).limit(limit).offset(offset);
  return { items: rows.map(rowToProduct), total: n };
}

export async function featuredProducts(limit = 8): Promise<CatalogProduct[]> {
  const db = getDb();
  const pick = async (shop: string, n: number) =>
    (
      await db
        .select()
        .from(products)
        .where(eq(products.shop, shop))
        .orderBy(desc(products.colorCount), asc(products.name))
        .limit(n)
    ).map(rowToProduct);
  return [...(await pick("t-shirts", 4)), ...(await pick("hoodies", 2)), ...(await pick("polos", 2))].slice(0, limit);
}
