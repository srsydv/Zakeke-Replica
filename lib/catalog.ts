import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type CatalogColor = {
  name: string;
  code?: string;
  hex: string;
  sku: string;
  imageUrl?: string;
  prices?: Record<string, number>;
};

export type CatalogProduct = {
  id: number;
  styleCode: string;
  name: string;
  brand: string;
  category: string;
  shop: string;
  silhouette: "tee" | "hoodie" | "polo" | "jacket" | "cap" | "bag" | "bottoms" | "vest";
  description?: string;
  fabric?: string;
  gender?: string;
  printArea?: string;
  embroideryInfo?: string;
  imageUrl?: string;
  specSheetUrl?: string;
  wholesaleBase: number;
  sizeWholesale: Record<string, number>;
  colors: CatalogColor[];
  sizes: string[];
  faces: string[];
};

export type CatalogFile = {
  generatedAt: string;
  source: string;
  count: number;
  products: CatalogProduct[];
};

export const SHOP_CATEGORIES = [
  { slug: "t-shirts", label: "Custom T-Shirts", blurb: "Crewnecks, vests and everyday tees." },
  { slug: "hoodies", label: "Hoodies", blurb: "Pullover and zip hoodies." },
  { slug: "sweatshirts", label: "Sweatshirts", blurb: "Crews, fleece and jumpers." },
  { slug: "polos", label: "Polos", blurb: "Work and leisure polos." },
  { slug: "jackets", label: "Jackets", blurb: "Softshells, gilets and outerwear." },
  { slug: "hats", label: "Hats", blurb: "Caps, beanies and headwear." },
  { slug: "bags", label: "Bags", blurb: "Totes, backpacks and accessories." },
  { slug: "bottoms", label: "Bottoms", blurb: "Trousers, shorts and joggers." },
  { slug: "shirts", label: "Shirts", blurb: "Shirts, blouses and waistcoats." },
  { slug: "hi-vis", label: "Hi-Vis", blurb: "Safety vests and high-visibility wear." },
  { slug: "workwear", label: "Workwear", blurb: "Everything else from the Ralawise range." },
] as const;

type ProductRow = {
  id: number;
  style_code: string;
  name: string;
  brand: string;
  category: string;
  shop: string;
  silhouette: CatalogProduct["silhouette"];
  description: string;
  fabric: string;
  gender: string;
  print_area: string;
  embroidery_info: string;
  image_url: string;
  spec_sheet_url: string;
  wholesale_base: number;
  size_wholesale: string;
  colors: string;
  sizes: string;
  faces: string;
};

const SELECT_PRODUCT = `
  SELECT id, style_code, name, brand, category, shop, silhouette,
         description, fabric, gender, print_area, embroidery_info,
         image_url, spec_sheet_url, wholesale_base, size_wholesale,
         colors, sizes, faces
  FROM products
`;

let db: DatabaseSync | null = null;

function dbPath() {
  return join(process.cwd(), "data", "catalog.db");
}

function openDb(): DatabaseSync {
  if (db) return db;
  const path = dbPath();
  if (!existsSync(path)) {
    throw new Error("Missing data/catalog.db. Run: npm run catalog:db");
  }
  db = new DatabaseSync(path, { readOnly: true });
  return db;
}

function rowToProduct(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    styleCode: row.style_code,
    name: row.name,
    brand: row.brand,
    category: row.category,
    shop: row.shop,
    silhouette: row.silhouette,
    description: row.description || undefined,
    fabric: row.fabric || undefined,
    gender: row.gender || undefined,
    printArea: row.print_area || undefined,
    embroideryInfo: row.embroidery_info || undefined,
    imageUrl: row.image_url || undefined,
    specSheetUrl: row.spec_sheet_url || undefined,
    wholesaleBase: row.wholesale_base,
    sizeWholesale: JSON.parse(row.size_wholesale || "{}") as Record<string, number>,
    colors: JSON.parse(row.colors || "[]") as CatalogColor[],
    sizes: JSON.parse(row.sizes || "[]") as string[],
    faces: JSON.parse(row.faces || "[]") as string[],
  };
}

/** Kept for admin/debug. Prefer getProduct / listProducts so we do not load all 4086 rows. */
export function getCatalog(): CatalogFile {
  const database = openDb();
  const products = database.prepare(`${SELECT_PRODUCT} ORDER BY id`).all() as ProductRow[];
  const generatedAt = (database.prepare("SELECT value FROM meta WHERE key = 'generatedAt'").get() as { value?: string } | undefined)?.value ?? "";
  const source = (database.prepare("SELECT value FROM meta WHERE key = 'source'").get() as { value?: string } | undefined)?.value ?? "catalog.db";
  return {
    generatedAt,
    source,
    count: products.length,
    products: products.map(rowToProduct),
  };
}

export function getProduct(id: number | string): CatalogProduct | undefined {
  const n = typeof id === "string" ? Number(id) : id;
  if (!Number.isFinite(n)) return undefined;
  const row = openDb().prepare(`${SELECT_PRODUCT} WHERE id = ?`).get(n) as ProductRow | undefined;
  return row ? rowToProduct(row) : undefined;
}

export function getProductsByIds(ids: number[]): CatalogProduct[] {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = openDb()
    .prepare(`${SELECT_PRODUCT} WHERE id IN (${placeholders})`)
    .all(...ids) as ProductRow[];
  const map = new Map(rows.map((row) => [row.id, rowToProduct(row)]));
  return ids.map((id) => map.get(id)).filter((p): p is CatalogProduct => Boolean(p));
}

export function listProducts(opts?: {
  shop?: string;
  q?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}): { items: CatalogProduct[]; total: number } {
  const { shop, q, brand, limit = 24, offset = 0 } = opts ?? {};
  const needle = q?.trim().toLowerCase();
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (shop) {
    where.push("shop = ?");
    params.push(shop);
  }
  if (brand) {
    where.push("LOWER(brand) = ?");
    params.push(brand.toLowerCase());
  }
  if (needle) {
    where.push("(LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(category) LIKE ? OR LOWER(style_code) LIKE ?)");
    const like = `%${needle}%`;
    params.push(like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const database = openDb();
  const total = (database.prepare(`SELECT COUNT(*) AS n FROM products ${clause}`).get(...params) as { n: number }).n;
  const rows = database
    .prepare(`${SELECT_PRODUCT} ${clause} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as ProductRow[];
  return { items: rows.map(rowToProduct), total };
}

export function featuredProducts(limit = 8): CatalogProduct[] {
  const database = openDb();
  const pick = (shop: string, n: number) =>
    (
      database
        .prepare(`${SELECT_PRODUCT} WHERE shop = ? ORDER BY color_count DESC, name ASC LIMIT ?`)
        .all(shop, n) as ProductRow[]
    ).map(rowToProduct);
  return [...pick("t-shirts", 4), ...pick("hoodies", 2), ...pick("polos", 2)].slice(0, limit);
}

export function shopLabel(slug: string): string {
  return SHOP_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
