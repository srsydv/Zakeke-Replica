import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

let writable: DatabaseSync | null = null;

export function catalogDbPath() {
  return join(process.cwd(), "data", "catalog.db");
}

export function openWritableDb(): DatabaseSync {
  if (writable) return writable;
  const path = catalogDbPath();
  if (!existsSync(path)) {
    throw new Error("Missing data/catalog.db. Run: npm run catalog:db");
  }
  writable = new DatabaseSync(path);
  writable.exec("PRAGMA journal_mode = WAL");
  writable.exec("PRAGMA synchronous = NORMAL");
  ensureOrderTables(writable);
  ensureGarmentTables(writable);
  return writable;
}

export function ensureGarmentTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS garment_templates (
      product_id INTEGER PRIMARY KEY,
      name TEXT,
      style_code TEXT,
      source TEXT,
      template_version INTEGER,
      updated_at TEXT,
      sides_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS garment_print_boxes (
      product_id INTEGER NOT NULL,
      side TEXT NOT NULL,
      image_w INTEGER,
      image_h INTEGER,
      ppi REAL,
      box_x_px REAL,
      box_y_px REAL,
      box_w_px REAL,
      box_h_px REAL,
      print_w_in REAL,
      print_h_in REAL,
      PRIMARY KEY (product_id, side)
    );
  `);
}

function ensureOrderTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      is_dummy INTEGER DEFAULT 0,
      customer_name TEXT,
      customer_email TEXT,
      customer_address TEXT,
      total_inc_vat REAL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      product_id INTEGER,
      style_code TEXT,
      garment_name TEXT,
      color TEXT,
      side TEXT,
      placement_code TEXT,
      placement_label TEXT,
      print_w_in REAL,
      print_h_in REAL,
      ppi REAL,
      image_w INTEGER,
      image_h INTEGER,
      crop TEXT,
      box_x_px INTEGER,
      box_y_px INTEGER,
      box_w_px INTEGER,
      box_h_px INTEGER,
      artwork_id TEXT,
      artwork_kind TEXT,
      artwork_label TEXT,
      width_in REAL,
      height_in REAL,
      left_in REAL,
      top_in REAL,
      art_x_px INTEGER,
      art_y_px INTEGER,
      art_w_px INTEGER,
      art_h_px INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_order_placements_order ON order_placements(order_id);
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id INTEGER,
      style_code TEXT,
      garment_name TEXT,
      brand TEXT,
      color TEXT,
      sizes TEXT,
      decoration TEXT,
      quantity INTEGER,
      total_inc_vat REAL
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    DROP VIEW IF EXISTS order_details;
    CREATE VIEW order_details AS
      SELECT
        o.id AS order_id,
        o.created_at,
        o.status,
        o.customer_name,
        o.customer_email,
        o.customer_address,
        o.total_inc_vat AS order_total,
        i.product_id,
        i.style_code,
        i.garment_name,
        i.brand,
        i.color,
        i.sizes,
        i.quantity,
        i.decoration,
        p.placement_code,
        p.placement_label,
        p.side,
        p.print_w_in,
        p.print_h_in,
        p.ppi,
        p.artwork_label,
        p.width_in AS art_w_in,
        p.height_in AS art_h_in,
        p.left_in,
        p.top_in,
        p.box_x_px,
        p.box_y_px,
        p.box_w_px,
        p.box_h_px
      FROM orders o
      JOIN order_items i ON i.order_id = o.id
      LEFT JOIN order_placements p ON p.order_id = o.id AND p.item_id = i.id;
  `);
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
}
