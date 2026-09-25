import { printSpecFor } from "@/lib/placements/print-spec";

export type DesignObj = {
  id: string;
  type: "text" | "clipart" | "image";
  side: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  text?: string;
  font?: string;
  fill?: string;
  src?: string;
  originalSrc?: string;
  clipartId?: string;
  fileName?: string;
  aspect?: number;
  flipH?: boolean;
  flipV?: boolean;
  removeBg?: boolean;
  outline?: string;
  outlineWidth?: number;
  shadow?: boolean;
  letterSpacing?: number;
  curve?: number;
  distressed?: boolean;
  isNumber?: boolean;
  /** Named press location. Chest logos use slot-relative x/y/w/h. */
  placementCode?: string;
};

export const SIDE_PLACEMENT: Record<string, string> = {
  front: "FRONT",
  back: "BB",
  left: "LS",
  right: "RS",
  cap: "CAP_FRONT",
};

export const PRINT_IN: Record<string, { w: number; h: number }> = {
  front: { w: 13, h: 15 },
  back: { w: 13, h: 16 },
  left: { w: 3.5, h: 3.5 },
  right: { w: 3.5, h: 3.5 },
  cap: { w: 2.25, h: 2.25 },
  bag: { w: 12, h: 12 },
  bottoms: { w: 4, h: 4 },
  vest: { w: 100 / 25.4, h: 100 / 25.4 },
};

export const FONT_STACK: Record<string, string> = {
  Anton: "var(--font-anton), sans-serif",
  Oswald: "var(--font-oswald), sans-serif",
  "Bebas Neue": "var(--font-bebas), sans-serif",
  Pacifico: "var(--font-pacifico), cursive",
  "Permanent Marker": "var(--font-marker), cursive",
  "Playfair Display": "var(--font-playfair), serif",
  Righteous: "var(--font-righteous), sans-serif",
  Lobster: "var(--font-lobster), cursive",
  Inter: "var(--font-sans), sans-serif",
  Georgia: "Georgia, serif",
};

export type PrintLocation = {
  code: string;
  label: string;
  shopNote: string;
  widthIn: number;
  heightIn: number;
  leftIn: number;
  topIn: number;
};

export type LocationJob = {
  code: string;
  label: string;
  shopNote: string;
  side: string;
  printAreaIn: { w: number; h: number };
  pixelsPerInch?: number;
  imageWidth?: number;
  imageHeight?: number;
  crop?: [number, number, number, number];
  printBoxPx?: { x: number; y: number; w: number; h: number };
  artworks: Array<{
    id: string;
    obj: DesignObj;
    widthIn: number;
    heightIn: number;
    leftIn: number;
    topIn: number;
    pixelOnGarment?: { x: number; y: number; w: number; h: number };
  }>;
};

type ProductHint = {
  silhouette?: string;
  name?: string;
  category?: string;
  printArea?: string;
};

export function inferPrintLocation(obj: DesignObj, product?: ProductHint | string): PrintLocation {
  if (obj.placementCode?.startsWith("BOX_")) {
    const n = Number(obj.placementCode.slice(4)) + 1;
    const print = { w: 4, h: 4 };
    return loc(
      obj.placementCode,
      `Print box ${n}`,
      `Place inside print box ${n} on the ${obj.side} of the garment.`,
      roundIn(obj.w * print.w),
      roundIn(obj.h * print.h),
      roundIn(obj.x * print.w),
      roundIn(obj.y * print.h),
    );
  }
  if (obj.placementCode === "FLB" || obj.placementCode === "FRB") {
    const print = { w: 100 / 25.4, h: 100 / 25.4 };
    const widthIn = roundIn(obj.w * print.w);
    const heightIn = roundIn(obj.h * print.h);
    const leftIn = roundIn(obj.x * print.w);
    const topIn = roundIn(obj.y * print.h);
    if (obj.placementCode === "FLB") {
      return loc(
        "FLB",
        "Left chest",
        "Do not use the full-front platen. Place over the heart: about 3–4\" below the collar and 3–4\" right of center placket.",
        widthIn,
        heightIn,
        leftIn,
        topIn,
      );
    }
    return loc(
      "FRB",
      "Right chest",
      "Mirror of left chest: 3–4\" below the collar, wearer's right.",
      widthIn,
      heightIn,
      leftIn,
      topIn,
    );
  }

  const hint = typeof product === "string" ? { silhouette: product } : product;
  const spec = printSpecFor(hint ?? {}, obj.side);
  const print = { w: spec.widthIn, h: spec.heightIn };
  const widthIn = roundIn(obj.w * print.w);
  const heightIn = roundIn(obj.h * print.h);
  const leftIn = roundIn(obj.x * print.w);
  const topIn = roundIn(obj.y * print.h);
  const cx = obj.x + obj.w / 2;
  const small = widthIn <= 5 && heightIn <= 5.5;

  if (obj.side === "back") {
    return loc("BB", "Full back", "Center on the back yoke, typically 3–4\" below the collar.", widthIn, heightIn, leftIn, topIn);
  }
  if (obj.side === "left") {
    return loc("LS", "Left sleeve", "Align to the sleeve imprint box, about 3.25\" wide.", widthIn, heightIn, leftIn, topIn);
  }
  if (obj.side === "right") {
    return loc("RS", "Right sleeve", "Align to the sleeve imprint box, about 3.25\" wide.", widthIn, heightIn, leftIn, topIn);
  }
  if (obj.side === "cap" || spec.kind === "cap") {
    return loc("CAP_FRONT", "Cap front", `Center on the front panels inside the ${spec.label} print area.`, widthIn, heightIn, leftIn, topIn);
  }
  if (spec.kind === "chest") {
    return loc("FLB", "Left chest", `Place on the left chest inside the ${spec.label} box.`, widthIn, heightIn, leftIn, topIn);
  }
  if (spec.kind === "panel") {
    return loc("FRONT", "Bag panel", `Center on the front panel inside the ${spec.label} print area.`, widthIn, heightIn, leftIn, topIn);
  }
  if (spec.kind === "thigh") {
    return loc("FRONT", "Thigh / pocket", `Place on the upper leg inside the ${spec.label} print area.`, widthIn, heightIn, leftIn, topIn);
  }
  if (small && cx < 0.4 && obj.y < 0.48) {
    return loc(
      "FLB",
      "Left chest",
      "Do not use the full-front platen. Place over the heart: about 3–4\" below the collar and 3–4\" right of center placket.",
      widthIn,
      heightIn,
      leftIn,
      topIn,
    );
  }
  if (small && cx > 0.6 && obj.y < 0.48) {
    return loc(
      "FRB",
      "Right chest",
      "Mirror of left chest: 3–4\" below the collar, wearer's right.",
      widthIn,
      heightIn,
      leftIn,
      topIn,
    );
  }
  return loc(
    "FRONT",
    "Full front",
    `Use the full-front platen. Center in the ${spec.label} print area unless the customer placed it off-center on purpose.`,
    widthIn,
    heightIn,
    leftIn,
    topIn,
  );
}

export function buildPrintJobs(objects: DesignObj[], product?: ProductHint | string): LocationJob[] {
  const hint = typeof product === "string" ? { silhouette: product } : product;
  const groups = new Map<string, LocationJob>();
  for (const obj of objects) {
    const locInfo = inferPrintLocation(obj, hint);
    const spec = printSpecFor(hint ?? {}, obj.side);
    const key = `${obj.side}:${locInfo.code}`;
    const existing = groups.get(key);
    const art = {
      id: obj.id,
      obj,
      widthIn: locInfo.widthIn,
      heightIn: locInfo.heightIn,
      leftIn: locInfo.leftIn,
      topIn: locInfo.topIn,
    };
    if (existing) {
      existing.artworks.push(art);
    } else {
      groups.set(key, {
        code: locInfo.code,
        label: locInfo.label,
        shopNote: locInfo.shopNote,
        side: obj.side,
        printAreaIn: { w: spec.widthIn, h: spec.heightIn },
        artworks: [art],
      });
    }
  }
  return [...groups.values()];
}

export function artworkLabel(obj: DesignObj) {
  if (obj.type === "text") return obj.text || "Text";
  if (obj.type === "clipart") return obj.fileName || obj.clipartId || "Clipart";
  return obj.fileName || "Uploaded image";
}

function loc(
  code: string,
  label: string,
  shopNote: string,
  widthIn: number,
  heightIn: number,
  leftIn: number,
  topIn: number,
): PrintLocation {
  return { code, label, shopNote, widthIn, heightIn, leftIn, topIn };
}

function roundIn(n: number) {
  return Math.round(Math.max(0, n) * 10) / 10;
}
