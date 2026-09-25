import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getProduct, type CatalogProduct } from "@/lib/catalog";
import { openWritableDb } from "@/lib/db";
import { defaultMeasureLine, type GarmentEmbroidery, type GarmentSide, type PublicGarment } from "@/lib/garment-template";
import { detectFabricRect, fetchProductImage, printAreaOnFabric } from "@/lib/placements/detect-fabric";
import { fallbackGarmentFrame, type GarmentFrame } from "@/lib/placements/garment-frame";
import { autoPrintArea } from "@/lib/placements/print-plate";
import { isShorts, printSpecFor, productFaces } from "@/lib/placements/print-spec";

export type { GarmentArea, GarmentEmbroidery, GarmentMask, GarmentSide } from "@/lib/garment-template";

export const GARMENT_TEMPLATE_VERSION = 5;

export type StoredGarment = PublicGarment & {
  styleCode?: string;
  source: "generated" | "admin";
  updatedAt: string;
  templateVersion?: number;
};

type GarmentFile = { garments: StoredGarment[] };

const FALLBACK_W = 1200;
const FALLBACK_H = 1440;

const SIDE_NAME: Record<string, string> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
  cap: "Front",
};

function filePath() {
  return join(process.cwd(), "data", "garments.json");
}

function readFile(): GarmentFile {
  const path = filePath();
  if (!existsSync(path)) return { garments: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as GarmentFile;
  } catch {
    return { garments: [] };
  }
}

function writeFile(data: GarmentFile) {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(filePath(), JSON.stringify(data, null, 2));
}

function persist(garment: StoredGarment) {
  const data = readFile();
  const index = data.garments.findIndex((g) => g.id === garment.id);
  if (index >= 0) data.garments[index] = garment;
  else data.garments.push(garment);
  writeFile(data);
  persistToCatalogDb(garment);
  return garment;
}

function persistToCatalogDb(garment: StoredGarment) {
  try {
    const db = openWritableDb();
    db.prepare(
      `INSERT OR REPLACE INTO garment_templates
        (product_id, name, style_code, source, template_version, updated_at, sides_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      garment.id,
      garment.name,
      garment.styleCode ?? "",
      garment.source,
      garment.templateVersion ?? GARMENT_TEMPLATE_VERSION,
      garment.updatedAt,
      JSON.stringify(garment.sides),
    );
    db.prepare("DELETE FROM garment_print_boxes WHERE product_id = ?").run(garment.id);
    const insert = db.prepare(
      `INSERT INTO garment_print_boxes
        (product_id, side, image_w, image_h, ppi, box_x_px, box_y_px, box_w_px, box_h_px, print_w_in, print_h_in)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const side of garment.sides) {
      const ppi = side.pixelsPerInch || 0;
      side.areas.forEach((area, index) => {
        insert.run(
          garment.id,
          index === 0 ? side.name : `${side.name} ${index + 1}`,
          side.imageWidth ?? null,
          side.imageHeight ?? null,
          ppi || null,
          area?.x ?? null,
          area?.y ?? null,
          area?.w ?? null,
          area?.h ?? null,
          area && ppi ? area.w / ppi : null,
          area && ppi ? area.h / ppi : null,
        );
      });
    }
  } catch {
    // catalog.db may be missing or locked; garments.json is still the live store.
  }
}

export function listGarments(): StoredGarment[] {
  return readFile().garments.sort((a, b) => a.id - b.id);
}

export function getStoredGarment(id: number): StoredGarment | undefined {
  return readFile().garments.find((g) => g.id === id);
}

export async function buildGarmentTemplate(product: CatalogProduct): Promise<StoredGarment> {
  const faces = productFaces(product);
  const imageUrl = product.colors[0]?.imageUrl || product.imageUrl;
  const buffer = await fetchProductImage(imageUrl);
  const detected = buffer ? await detectFabricRect(buffer, product.silhouette).catch(() => null) : null;
  return {
    id: product.id,
    name: product.name,
    styleCode: product.styleCode,
    source: "generated",
    templateVersion: GARMENT_TEMPLATE_VERSION,
    updatedAt: new Date().toISOString(),
    garmentWidthMm: Math.round(printSpecFor(product).garmentWidthIn * 25.4),
    sides: faces.map((face) => buildSide(product, face, imageUrl, detected)),
  };
}

function buildSide(
  product: CatalogProduct,
  face: string,
  imageUrl: string | undefined,
  detected: Awaited<ReturnType<typeof detectFabricRect>>,
): GarmentSide {
  const spec = printSpecFor(product, face);
  const frame = fallbackGarmentFrame(product.silhouette);
  if (detected) {
    const placed = printAreaOnFabric(detected.fabric, spec, product.silhouette, product, detected.torso);
    const side: GarmentSide = {
      name: SIDE_NAME[face] ?? "Front",
      imageUrl,
      previewImageUrl: imageUrl ?? null,
      masks: [],
      areas: [placed.area],
      crop: [
        detected.fabric.x,
        detected.fabric.y,
        detected.fabric.x + detected.fabric.w,
        detected.fabric.y + detected.fabric.h,
      ],
      embroidery: embroideryBoxes(product, frame, detected.imageWidth, detected.imageHeight),
      pixelsPerInch: detected.fabric.w / spec.garmentWidthIn,
      imageWidth: detected.imageWidth,
      imageHeight: detected.imageHeight,
    };
    return { ...side, measureLine: defaultMeasureLine(side) };
  }

  const area = autoPrintArea(
    product.silhouette,
    face,
    FALLBACK_W,
    FALLBACK_H,
    { w: spec.widthIn, h: spec.heightIn },
    isShorts(product),
  );
  const side: GarmentSide = {
    name: SIDE_NAME[face] ?? "Front",
    imageUrl,
    previewImageUrl: imageUrl ?? null,
    masks: [],
    areas: [{ x: area.x, y: area.y, w: area.w, h: area.h }],
    crop: [0, 0, FALLBACK_W, FALLBACK_H],
    embroidery: embroideryBoxes(product, frame, FALLBACK_W, FALLBACK_H),
    pixelsPerInch: FALLBACK_W / spec.garmentWidthIn,
    imageWidth: FALLBACK_W,
    imageHeight: FALLBACK_H,
  };
  return { ...side, measureLine: defaultMeasureLine(side) };
}

function embroideryBoxes(
  product: CatalogProduct,
  frame: GarmentFrame,
  w: number,
  h: number,
): GarmentEmbroidery[] {
  const box = (nx: number, ny: number, nw: number, nh: number): GarmentEmbroidery => ({
    x1: Math.round((frame.x + nx * frame.w) * w),
    y1: Math.round((frame.y + ny * frame.h) * h),
    x2: Math.round((frame.x + (nx + nw) * frame.w) * w),
    y2: Math.round((frame.y + (ny + nh) * frame.h) * h),
  });
  if (product.silhouette === "vest" || product.shop === "hi-vis") {
    return [box(0.58, 0.13, 0.18, 0.16)];
  }
  if (product.silhouette === "tee" || product.silhouette === "polo") {
    return [box(0.26, 0.14, 0.16, 0.14), box(0.58, 0.14, 0.16, 0.14)];
  }
  return [];
}

export async function getOrCreateGarment(id: number): Promise<StoredGarment | undefined> {
  const existing = getStoredGarment(id);
  if (existing && ((existing.templateVersion ?? 1) >= GARMENT_TEMPLATE_VERSION || existing.source === "admin")) {
    return existing;
  }
  const product = getProduct(id);
  if (!product) return existing;
  return persist(await buildGarmentTemplate(product));
}

export async function regenerateGarment(id: number): Promise<StoredGarment | undefined> {
  const product = getProduct(id);
  if (!product) return undefined;
  return persist(await buildGarmentTemplate(product));
}

export function saveGarment(next: StoredGarment): StoredGarment {
  return persist({ ...next, updatedAt: new Date().toISOString(), source: "admin" });
}

export function toPublicGarment(garment: StoredGarment): PublicGarment {
  return {
    id: garment.id,
    name: garment.name,
    sides: garment.sides,
    garmentWidthMm: garment.garmentWidthMm,
    source: garment.source,
    updatedAt: garment.updatedAt,
  };
}
