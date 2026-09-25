#!/usr/bin/env node
/**
 * Load data/catalog.json (built from CustomerDataFull.zip) into data/catalog.db.
 * Shop pages then read one product or one page from SQLite instead of the 8.6 MB JSON.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = join(root, "data", "catalog.json");
const dbPath = join(root, "data", "catalog.db");

if (!existsSync(jsonPath)) {
  console.error("Missing data/catalog.json. Run: npm run catalog");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(jsonPath, "utf8"));
const products = catalog.products ?? [];

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA synchronous = NORMAL");
db.exec(`
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS meta;
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    style_code TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT,
    shop TEXT NOT NULL,
    silhouette TEXT,
    description TEXT,
    fabric TEXT,
    gender TEXT,
    print_area TEXT,
    embroidery_info TEXT,
    image_url TEXT,
    spec_sheet_url TEXT,
    wholesale_base REAL,
    size_wholesale TEXT,
    colors TEXT,
    sizes TEXT,
    faces TEXT,
    color_count INTEGER
  );
  CREATE INDEX idx_products_shop ON products(shop);
  CREATE INDEX idx_products_brand ON products(brand);
  CREATE INDEX idx_products_style ON products(style_code);
  CREATE INDEX idx_products_name ON products(name);
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`);

const insert = db.prepare(`
  INSERT INTO products (
    id, style_code, name, brand, category, shop, silhouette,
    description, fabric, gender, print_area, embroidery_info,
    image_url, spec_sheet_url, wholesale_base, size_wholesale,
    colors, sizes, faces, color_count
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?
  )
`);

db.exec("BEGIN");
for (const p of products) {
  insert.run(
    p.id,
    p.styleCode,
    p.name,
    p.brand,
    p.category ?? "",
    p.shop,
    p.silhouette ?? "tee",
    p.description ?? "",
    p.fabric ?? "",
    p.gender ?? "",
    p.printArea ?? "",
    p.embroideryInfo ?? "",
    p.imageUrl ?? "",
    p.specSheetUrl ?? "",
    p.wholesaleBase ?? 0,
    JSON.stringify(p.sizeWholesale ?? {}),
    JSON.stringify(p.colors ?? []),
    JSON.stringify(p.sizes ?? []),
    JSON.stringify(p.faces ?? ["front", "back"]),
    (p.colors ?? []).length,
  );
}
db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("generatedAt", catalog.generatedAt ?? "");
db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("source", catalog.source ?? "catalog.json");
db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("count", String(products.length));
db.exec("COMMIT");
db.close();

console.log(`Wrote ${products.length} products to data/catalog.db`);
