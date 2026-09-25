import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../server/db/client";
import { persistImportedGarment, type StoredGarment } from "../server/services/garments";
import { persistImportedOrder, type StoredOrder } from "../server/services/orders";
import { meta, products } from "../server/db/schema";
import type { CatalogFile } from "../server/services/catalog";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const jsonPath = join(root, "data", "catalog.json");
  if (!existsSync(jsonPath)) {
    console.error("Missing data/catalog.json. Run: npm run catalog");
    process.exit(1);
  }
  const catalog = JSON.parse(readFileSync(jsonPath, "utf8")) as CatalogFile;
  const rows = catalog.products ?? [];
  const db = getDb();

  await db.delete(products);
  await db.delete(meta);
  if (rows.length) {
    const chunk = 200;
    for (let i = 0; i < rows.length; i += chunk) {
      await db.insert(products).values(
        rows.slice(i, i + chunk).map((p) => ({
          id: p.id,
          styleCode: p.styleCode,
          name: p.name,
          brand: p.brand,
          category: p.category ?? "",
          shop: p.shop,
          silhouette: p.silhouette ?? "tee",
          description: p.description ?? "",
          fabric: p.fabric ?? "",
          gender: p.gender ?? "",
          printArea: p.printArea ?? "",
          embroideryInfo: p.embroideryInfo ?? "",
          imageUrl: p.imageUrl ?? "",
          specSheetUrl: p.specSheetUrl ?? "",
          wholesaleBase: p.wholesaleBase ?? 0,
          sizeWholesale: p.sizeWholesale ?? {},
          colors: p.colors ?? [],
          sizes: p.sizes ?? [],
          faces: p.faces ?? ["front", "back"],
          colorCount: (p.colors ?? []).length,
        })),
      );
    }
  }
  await db.insert(meta).values([
    { key: "generatedAt", value: catalog.generatedAt ?? "" },
    { key: "source", value: catalog.source ?? "catalog.json" },
    { key: "count", value: String(rows.length) },
  ]);
  console.log(`Wrote ${rows.length} products to Postgres`);

  const garmentsPath = join(root, "data", "garments.json");
  if (existsSync(garmentsPath)) {
    const file = JSON.parse(readFileSync(garmentsPath, "utf8")) as { garments?: StoredGarment[] };
    for (const garment of file.garments ?? []) {
      await persistImportedGarment(garment);
    }
    console.log(`Wrote ${file.garments?.length ?? 0} garment templates to Postgres`);
  }

  const ordersPath = join(root, "data", "orders.json");
  if (existsSync(ordersPath)) {
    const file = JSON.parse(readFileSync(ordersPath, "utf8")) as { orders?: StoredOrder[] };
    for (const order of file.orders ?? []) {
      await persistImportedOrder(order);
    }
    console.log(`Wrote ${file.orders?.length ?? 0} orders to Postgres`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
