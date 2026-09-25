import { index, integer, jsonb, pgTable, primaryKey, real, serial, text } from "drizzle-orm/pg-core";
import type { GarmentSide } from "@/lib/garment-template";

type CatalogColorJson = {
  name: string;
  hex: string;
  sku: string;
  code?: string;
  imageUrl?: string;
  prices?: Record<string, number>;
};

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey(),
    styleCode: text("style_code").notNull(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    category: text("category"),
    shop: text("shop").notNull(),
    silhouette: text("silhouette"),
    description: text("description"),
    fabric: text("fabric"),
    gender: text("gender"),
    printArea: text("print_area"),
    embroideryInfo: text("embroidery_info"),
    imageUrl: text("image_url"),
    specSheetUrl: text("spec_sheet_url"),
    wholesaleBase: real("wholesale_base"),
    sizeWholesale: jsonb("size_wholesale").$type<Record<string, number>>().notNull(),
    colors: jsonb("colors").$type<CatalogColorJson[]>().notNull(),
    sizes: jsonb("sizes").$type<string[]>().notNull(),
    faces: jsonb("faces").$type<string[]>().notNull(),
    colorCount: integer("color_count").notNull(),
  },
  (table) => [
    index("idx_products_shop").on(table.shop),
    index("idx_products_brand").on(table.brand),
    index("idx_products_style").on(table.styleCode),
    index("idx_products_name").on(table.name),
  ],
);

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export const garmentTemplates = pgTable("garment_templates", {
  productId: integer("product_id").primaryKey(),
  name: text("name"),
  styleCode: text("style_code"),
  source: text("source"),
  templateVersion: integer("template_version"),
  updatedAt: text("updated_at"),
  sides: jsonb("sides").$type<GarmentSide[]>().notNull(),
  garmentWidthMm: real("garment_width_mm"),
});

export const garmentPrintBoxes = pgTable(
  "garment_print_boxes",
  {
    productId: integer("product_id").notNull(),
    side: text("side").notNull(),
    imageW: integer("image_w"),
    imageH: integer("image_h"),
    ppi: real("ppi"),
    boxXPx: real("box_x_px"),
    boxYPx: real("box_y_px"),
    boxWPx: real("box_w_px"),
    boxHPx: real("box_h_px"),
    printWIn: real("print_w_in"),
    printHIn: real("print_h_in"),
  },
  (table) => [primaryKey({ columns: [table.productId, table.side] })],
);

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  status: text("status").notNull(),
  isDummy: integer("is_dummy").default(0),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  totalIncVat: real("total_inc_vat"),
  payload: jsonb("payload").notNull(),
});

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    productId: integer("product_id"),
    styleCode: text("style_code"),
    garmentName: text("garment_name"),
    brand: text("brand"),
    color: text("color"),
    sizes: jsonb("sizes"),
    decoration: text("decoration"),
    quantity: integer("quantity"),
    totalIncVat: real("total_inc_vat"),
  },
  (table) => [index("idx_order_items_order").on(table.orderId)],
);

export const orderPlacements = pgTable(
  "order_placements",
  {
    id: serial("id").primaryKey(),
    orderId: text("order_id").notNull(),
    itemId: text("item_id").notNull(),
    productId: integer("product_id"),
    styleCode: text("style_code"),
    garmentName: text("garment_name"),
    color: text("color"),
    side: text("side"),
    placementCode: text("placement_code"),
    placementLabel: text("placement_label"),
    printWIn: real("print_w_in"),
    printHIn: real("print_h_in"),
    ppi: real("ppi"),
    imageW: integer("image_w"),
    imageH: integer("image_h"),
    crop: text("crop"),
    boxXPx: real("box_x_px"),
    boxYPx: real("box_y_px"),
    boxWPx: real("box_w_px"),
    boxHPx: real("box_h_px"),
    artworkId: text("artwork_id"),
    artworkKind: text("artwork_kind"),
    artworkLabel: text("artwork_label"),
    widthIn: real("width_in"),
    heightIn: real("height_in"),
    leftIn: real("left_in"),
    topIn: real("top_in"),
    artXPx: real("art_x_px"),
    artYPx: real("art_y_px"),
    artWPx: real("art_w_px"),
    artHPx: real("art_h_px"),
  },
  (table) => [index("idx_order_placements_order").on(table.orderId)],
);
