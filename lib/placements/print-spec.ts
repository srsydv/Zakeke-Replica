/** Ralawise print-area sizes (inches) for each product type and side. */

export type PrintKind = "torso" | "chest" | "cap" | "panel" | "thigh" | "sleeve";

export type PrintSpec = {
  kind: PrintKind;
  widthIn: number;
  heightIn: number;
  /** Typical physical width of the item in the product photo, used to scale the box. */
  garmentWidthIn: number;
  label: string;
  source: "ralawise" | "standard";
};

const CM = 1 / 2.54;

type ProductLike = {
  silhouette?: string;
  shop?: string;
  category?: string;
  printArea?: string;
  name?: string;
};

const GARMENT_WIDTH_IN: Record<string, number> = {
  tee: 20,
  polo: 20,
  hoodie: 22,
  jacket: 22,
  vest: 20,
  cap: 7,
  bag: 16,
  bottoms: 14,
};

/** Industry / Ralawise-style defaults when Print Area is blank (most of the catalog). */
const STANDARD: Record<string, { front: { w: number; h: number }; back: { w: number; h: number } }> = {
  tee: { front: { w: 13, h: 15 }, back: { w: 13, h: 16 } },
  polo: { front: { w: 13, h: 15 }, back: { w: 13, h: 16 } },
  hoodie: { front: { w: 12, h: 14 }, back: { w: 13, h: 15 } },
  jacket: { front: { w: 12, h: 14 }, back: { w: 13, h: 15 } },
  vest: { front: { w: 12, h: 14 }, back: { w: 13, h: 15 } },
  cap: { front: { w: 2.25, h: 2.25 }, back: { w: 2.25, h: 2.25 } },
  bag: { front: { w: 12, h: 12 }, back: { w: 12, h: 12 } },
  bottoms: { front: { w: 13, h: 16 }, back: { w: 13, h: 16 } },
};

export function isSafetyVest(product?: ProductLike): boolean {
  if (!product) return false;
  if (product.silhouette === "vest") return true;
  if (product.shop === "hi-vis") return true;
  const category = (product.category ?? "").toLowerCase();
  return /(safety vest|tabard|waistcoat)/.test(category);
}

export function isShorts(product?: ProductLike): boolean {
  const text = `${product?.name ?? ""} ${product?.category ?? ""}`.toLowerCase();
  return /\bshorts?\b/.test(text);
}

export function printKindFor(silhouette?: string, side = "front"): PrintKind {
  if (side === "left" || side === "right") return "sleeve";
  if (silhouette === "cap" || side === "cap") return "cap";
  if (silhouette === "bag") return "panel";
  return "torso";
}

export function parsePrintArea(text?: string): { w: number; h: number } | null {
  if (!text) return null;
  const raw = text.replace(/×/g, "x").replace(/,/g, " ");

  const medium =
    raw.match(/M\s*[-–]\s*L\s*([\d.]+)\s*x\s*W\s*([\d.]+)/i) ??
    raw.match(/M\s*[-–]\s*([\d.]+)\s*x\s*([\d.]+)/i);
  if (medium) return normalizePair(Number(medium[1]), Number(medium[2]), unitFrom(raw));

  const pair = raw.match(/([\d.]+)\s*(cm|mm|in|")?\s*x\s*([\d.]+)\s*(cm|mm|in|")?/i);
  if (pair) {
    const unit = pair[4] || pair[2] || unitFrom(raw);
    return normalizePair(Number(pair[1]), Number(pair[3]), unit);
  }

  const single = raw.match(/([\d.]+)\s*(cm|mm|in|")/i);
  if (single) {
    const n = toInches(Number(single[1]), single[2]);
    if (n >= 0.4 && n <= 24) return { w: n, h: n };
  }
  return null;
}

function unitFrom(text: string) {
  if (/"|\bin\b/i.test(text)) return "in";
  if (/\bmm\b/i.test(text)) return "mm";
  return "cm";
}

function toInches(value: number, unit?: string) {
  const u = (unit || "cm").toLowerCase();
  if (u === "in" || u === '"') return value;
  if (u === "mm") return value / 25.4;
  return value * CM;
}

function normalizePair(a: number, b: number, unit?: string) {
  const w = toInches(a, unit);
  const h = toInches(b, unit);
  if (w < 0.4 || h < 0.4 || w > 28 || h > 28) return null;
  return { w, h };
}

export function printSpecFor(product: ProductLike, side = "front"): PrintSpec {
  const silhouette = isSafetyVest(product) ? "vest" : (product.silhouette ?? "tee");
  const kind = printKindFor(silhouette, side);
  const garmentWidthIn = GARMENT_WIDTH_IN[silhouette] ?? 20;
  const parsed = side === "front" || side === "cap" ? parsePrintArea(product.printArea) : null;
  const standard = STANDARD[silhouette] ?? STANDARD.tee;
  const fallback =
    silhouette === "bottoms" && isShorts(product)
      ? { w: 13, h: 6 }
      : side === "back"
        ? standard.back
        : standard.front;
  const sleeve = { w: 3.5, h: 3.5 };
  const size = kind === "sleeve" ? sleeve : parsed ?? fallback;
  return {
    kind,
    widthIn: size.w,
    heightIn: size.h,
    garmentWidthIn,
    label: `${size.w.toFixed(size.w < 5 ? 1 : 0)}" × ${size.h.toFixed(size.h < 5 ? 1 : 0)}"`,
    source: parsed ? "ralawise" : "standard",
  };
}

export function productFaces(product: { silhouette?: string; faces?: string[] }): string[] {
  if (product.silhouette === "cap" || product.silhouette === "bag") return ["front"];
  if (product.faces?.length) return product.faces;
  return ["front", "back"];
}
