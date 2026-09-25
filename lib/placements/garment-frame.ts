import { printKindFor, printSpecFor, type PrintSpec } from "@/lib/placements/print-spec";

/** Where the garment sits inside the product photo (0–1 of the full image). */
export type GarmentFrame = { x: number; y: number; w: number; h: number };

export type GarmentLayout = {
  frame: GarmentFrame;
  printBox: GarmentFrame;
};

/**
 * Typical Ralawise / Pimberly ghost-mannequin crop.
 * Used only when pixel detection cannot run.
 */
export const FALLBACK_GARMENT_FRAME: Record<string, GarmentFrame> = {
  tee: { x: 0.03, y: 0.02, w: 0.94, h: 0.96 },
  polo: { x: 0.06, y: 0.03, w: 0.88, h: 0.94 },
  vest: { x: 0.18, y: 0.05, w: 0.64, h: 0.90 },
  hoodie: { x: 0.04, y: 0.02, w: 0.92, h: 0.96 },
  jacket: { x: 0.04, y: 0.02, w: 0.92, h: 0.96 },
  cap: { x: 0.18, y: 0.16, w: 0.64, h: 0.58 },
  bag: { x: 0.18, y: 0.12, w: 0.64, h: 0.76 },
  bottoms: { x: 0.22, y: 0.08, w: 0.56, h: 0.86 },
};

export function fallbackGarmentFrame(silhouette?: string): GarmentFrame {
  return FALLBACK_GARMENT_FRAME[silhouette ?? "tee"] ?? FALLBACK_GARMENT_FRAME.tee;
}

export function fallbackGarmentLayout(
  silhouette?: string,
  side = "front",
  spec?: PrintSpec,
): GarmentLayout {
  const frame = fallbackGarmentFrame(silhouette);
  const resolved = spec ?? printSpecFor({ silhouette }, side);
  return { frame, printBox: getFullPrintBox(frame, side, silhouette, 4 / 5, resolved) };
}

export function getFullPrintBox(
  frame: GarmentFrame,
  side = "front",
  silhouette?: string,
  imgAspect = 4 / 5,
  spec?: PrintSpec,
): GarmentFrame {
  const resolved = spec ?? printSpecFor({ silhouette }, side);
  return placePrintBox(frame, resolved, imgAspect, silhouette, undefined);
}

function collarInset(silhouette?: string) {
  if (silhouette === "hoodie" || silhouette === "jacket") return 0.2;
  if (silhouette === "vest") return 0.12;
  return 0.145;
}

function inchBox(frame: GarmentFrame, spec: PrintSpec, imgAspect: number, fill = 1) {
  const w = Math.min(frame.w * fill, (spec.widthIn / spec.garmentWidthIn) * frame.w);
  const h = Math.min(frame.h * 0.72, w * (spec.heightIn / Math.max(spec.widthIn, 0.2)) * imgAspect);
  return { w: Math.max(0.06, w), h: Math.max(0.05, h) };
}

function placePrintBox(
  frame: GarmentFrame,
  spec: PrintSpec,
  imgAspect: number,
  silhouette?: string,
  torso?: GarmentFrame,
): GarmentFrame {
  const kind = spec.kind || printKindFor(silhouette);

  if (kind === "sleeve") {
    const box = inchBox(frame, spec, imgAspect, 0.36);
    return {
      x: frame.x + frame.w * 0.08,
      y: frame.y + frame.h * 0.22,
      ...box,
    };
  }

  if (kind === "cap") {
    const box = inchBox(frame, spec, imgAspect, 0.48);
    return {
      x: frame.x + (frame.w - box.w) / 2,
      y: frame.y + frame.h * 0.2,
      ...box,
    };
  }

  if (kind === "panel") {
    const box = inchBox(frame, spec, imgAspect, 0.78);
    return {
      x: frame.x + (frame.w - box.w) / 2,
      y: frame.y + frame.h * 0.16,
      ...box,
    };
  }

  if (kind === "thigh") {
    const box = inchBox(frame, spec, imgAspect, 0.3);
    return {
      x: frame.x + (frame.w - box.w) / 2,
      y: frame.y + frame.h * 0.16,
      ...box,
    };
  }

  if (kind === "chest") {
    const box = inchBox(frame, spec, imgAspect, 0.24);
    return {
      x: frame.x + frame.w * 0.62,
      y: frame.y + frame.h * 0.13,
      ...box,
    };
  }

  const vest = silhouette === "vest";
  const region = vest ? vestBody(frame, torso) : (torso ?? sleeveTorso(frame));
  if (spec.widthIn < 8) {
    const box = inchBox(frame, spec, imgAspect, 0.36);
    return {
      x: region.x + (region.w - box.w) / 2,
      y: frame.y + frame.h * collarInset(silhouette),
      ...box,
    };
  }

  const seam = region.w * (vest ? 0.06 : 0.04);
  const w = Math.max(0.14, region.w - seam * 2);
  const x = region.x + seam;
  const y = frame.y + frame.h * collarInset(silhouette);
  const aspectH = w * (spec.heightIn / spec.widthIn) * imgAspect;
  const hem = frame.y + frame.h * (vest ? 0.54 : 0.88);
  const h = Math.max(0.14, Math.min(aspectH, hem - y, frame.h * (vest ? 0.42 : 0.58)));
  return { x, y, w, h };
}

function vestBody(frame: GarmentFrame, torso?: GarmentFrame): GarmentFrame {
  if (torso && torso.w > frame.w * 0.4) return torso;
  const inset = 0.07;
  return {
    x: frame.x + frame.w * inset,
    y: frame.y,
    w: frame.w * (1 - inset * 2),
    h: frame.h,
  };
}

function sleeveTorso(frame: GarmentFrame): GarmentFrame {
  const sleeve = 0.235;
  return {
    x: frame.x + frame.w * sleeve,
    y: frame.y,
    w: frame.w * (1 - sleeve * 2),
    h: frame.h,
  };
}

export function mapRectToFrame(local: GarmentFrame, frame: GarmentFrame): GarmentFrame {
  return {
    x: frame.x + local.x * frame.w,
    y: frame.y + local.y * frame.h,
    w: local.w * frame.w,
    h: local.h * frame.h,
  };
}

/** Keep a print badge visually square on the 4:5 product photo. */
export function squareOnPhoto(rect: GarmentFrame, photoAspect = 4 / 5): GarmentFrame {
  return { ...rect, h: rect.w * photoAspect };
}

function isStudioBackground(r: number, g: number, b: number, a: number) {
  if (a < 20) return true;
  if (r > 248 && g > 248 && b > 248) return true;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  if (r > 234 && g > 234 && b > 234 && chroma < 12) return true;
  return false;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Find the garment in the photo, then place the Ralawise-sized print box on it.
 */
export function detectGarmentLayout(
  image: ImageData,
  silhouette?: string,
  side = "front",
  spec?: PrintSpec,
): GarmentLayout | null {
  const { width: w, height: h, data } = image;
  if (w < 8 || h < 8) return null;
  const imgAspect = w / h;
  const resolved = spec ?? printSpecFor({ silhouette }, side);

  const rows: Array<{ y: number; left: number; right: number }> = [];
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = 0; y < h; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      const a = data[i + 3] ?? 255;
      if (isStudioBackground(r, g, b, a)) continue;
      count += 1;
      if (left < 0) left = x;
      right = x;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (left >= 0) rows.push({ y, left, right });
  }

  if (count < w * h * 0.015 || rows.length < 6) return null;

  const pad = 0.008;
  const frame: GarmentFrame = {
    x: Math.max(0, minX / w - pad),
    y: Math.max(0, minY / h - pad),
    w: 0,
    h: 0,
  };
  frame.w = Math.min(1 - frame.x, (maxX + 1) / w - frame.x + pad);
  frame.h = Math.min(1 - frame.y, (maxY + 1) / h - frame.y + pad);
  if (frame.w < 0.16 || frame.h < 0.16) return null;

  const torso = torsoFromRows(rows, frame, w, h, silhouette === "vest");
  const printBox = placePrintBox(frame, resolved, imgAspect, silhouette, torso);
  return { frame, printBox };
}

function torsoFromRows(
  rows: Array<{ y: number; left: number; right: number }>,
  frame: GarmentFrame,
  imgW: number,
  imgH: number,
  vest = false,
): GarmentFrame | undefined {
  const y0 = frame.y * imgH;
  const bandStart = y0 + frame.h * imgH * (vest ? 0.18 : 0.48);
  const bandEnd = y0 + frame.h * imgH * (vest ? 0.48 : 0.86);
  const torsoRows = rows.filter((row) => row.y >= bandStart && row.y <= bandEnd);
  const sample = torsoRows.length >= 6 ? torsoRows : rows.slice(Math.floor(rows.length * 0.45));
  if (!sample.length) return undefined;

  let left = median(sample.map((row) => row.left));
  let right = median(sample.map((row) => row.right));
  let boxW = (right - left + 1) / imgW;
  if (boxW < 0.18 || boxW > 0.86) return undefined;

  const seam = (right - left) * 0.05;
  left += seam;
  right -= seam;
  boxW = (right - left + 1) / imgW;
  return { x: left / imgW, y: frame.y, w: boxW, h: frame.h };
}
