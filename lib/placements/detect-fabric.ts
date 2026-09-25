import sharp from "sharp";
import { isShorts, type PrintSpec } from "@/lib/placements/print-spec";

export type PixelRect = { x: number; y: number; w: number; h: number };

function isStudioBackground(
  r: number,
  g: number,
  b: number,
  a: number,
  studio?: { r: number; g: number; b: number },
) {
  if (a < 20) return true;
  if (r > 248 && g > 248 && b > 248) return true;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  if (r > 232 && g > 232 && b > 232 && chroma < 16) return true;
  if (studio) {
    const dist = Math.hypot(r - studio.r, g - studio.g, b - studio.b);
    if (dist < 26 && Math.max(r, g, b) > 200) return true;
  }
  return false;
}

function cornerStudio(data: Buffer, w: number, h: number) {
  const pts = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
    [Math.floor(w / 2), 2],
    [Math.floor(w / 2), h - 3],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of pts) {
    const i = (y * w + x) * 4;
    r += data[i] ?? 255;
    g += data[i + 1] ?? 255;
    b += data[i + 2] ?? 255;
  }
  return { r: r / pts.length, g: g / pts.length, b: b / pts.length };
}

function collarInset(silhouette?: string, shorts = false) {
  if (shorts) return 0.12;
  if (silhouette === "bottoms") return 0.1;
  if (silhouette === "hoodie" || silhouette === "jacket") return 0.2;
  if (silhouette === "vest") return 0.12;
  if (silhouette === "cap") return 0.2;
  if (silhouette === "bag") return 0.16;
  return 0.145;
}

function hemInset(silhouette?: string, shorts = false) {
  if (shorts) return 0.82;
  if (silhouette === "bottoms") return 0.86;
  if (silhouette === "vest") return 0.72;
  if (silhouette === "cap") return 0.62;
  if (silhouette === "bag") return 0.84;
  return 0.88;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Armpit-to-armpit (or hip) band from the row scan — same idea as the old canvas detector. */
function torsoFromRows(
  rows: Array<{ left: number; right: number; y: number }>,
  fabric: PixelRect,
  silhouette?: string,
  shorts = false,
): PixelRect {
  if (shorts || silhouette === "bottoms" || silhouette === "cap" || silhouette === "bag") {
    return fabric;
  }
  const top = fabric.y + fabric.h * (silhouette === "vest" ? 0.18 : 0.42);
  const bottom = fabric.y + fabric.h * (silhouette === "vest" ? 0.5 : 0.86);
  const band = rows.filter((row) => row.y >= top && row.y <= bottom);
  const sample = band.length >= 8 ? band : rows;
  if (sample.length < 6) {
    const sleeve = 0.235;
    return {
      x: Math.round(fabric.x + fabric.w * sleeve),
      y: fabric.y,
      w: Math.round(fabric.w * (1 - sleeve * 2)),
      h: fabric.h,
    };
  }
  const left = Math.round(median(sample.map((row) => row.left)));
  const right = Math.round(median(sample.map((row) => row.right)));
  const w = Math.max(8, right - left + 1);
  if (w < fabric.w * 0.22 || w > fabric.w * 0.9) {
    const sleeve = 0.235;
    return {
      x: Math.round(fabric.x + fabric.w * sleeve),
      y: fabric.y,
      w: Math.round(fabric.w * (1 - sleeve * 2)),
      h: fabric.h,
    };
  }
  return { x: left, y: fabric.y, w, h: fabric.h };
}

export async function detectFabricRect(
  buffer: Buffer,
  silhouette?: string,
): Promise<{ fabric: PixelRect; torso: PixelRect; imageWidth: number; imageHeight: number } | null> {
  const meta = await sharp(buffer).metadata();
  const imageWidth = meta.width ?? 0;
  const imageHeight = meta.height ?? 0;
  if (imageWidth < 32 || imageHeight < 32) return null;

  const maxW = 480;
  const scale = imageWidth > maxW ? maxW / imageWidth : 1;
  const tw = Math.max(32, Math.round(imageWidth * scale));
  const th = Math.max(32, Math.round(imageHeight * scale));
  const { data, info } = await sharp(buffer)
    .resize(tw, th, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const studio = cornerStudio(data, info.width, info.height);
  const rows: Array<{ left: number; right: number; y: number }> = [];
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  for (let y = 0; y < info.height; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      if (
        isStudioBackground(
          data[i] ?? 255,
          data[i + 1] ?? 255,
          data[i + 2] ?? 255,
          data[i + 3] ?? 255,
          studio,
        )
      ) {
        continue;
      }
      count += 1;
      if (left < 0) left = x;
      right = x;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (left >= 0) rows.push({ left, right, y });
  }
  const body = rows.filter((row) => row.right - row.left < info.width * 0.92);
  const use = body.length >= 8 ? body : rows;
  if (use.length >= 8) {
    const widths = use.map((row) => row.right - row.left).sort((a, b) => a - b);
    const mid = widths[Math.floor(widths.length / 2)] ?? 0;
    const main = use.filter((row) => row.right - row.left >= mid * 0.7);
    const pick = main.length >= 8 ? main : use;
    minX = Math.min(...pick.map((row) => row.left));
    maxX = Math.max(...pick.map((row) => row.right));
    minY = pick[0]?.y ?? minY;
    maxY = pick[pick.length - 1]?.y ?? maxY;
  }
  if (count < info.width * info.height * 0.015) return null;
  const pad = 2;
  const sx = 1 / scale;
  const fabric = {
    x: Math.max(0, Math.round((minX - pad) * sx)),
    y: Math.max(0, Math.round((minY - pad) * sx)),
    w: 0,
    h: 0,
  };
  fabric.w = Math.min(imageWidth - fabric.x, Math.round((maxX - minX + 1 + pad * 2) * sx));
  fabric.h = Math.min(imageHeight - fabric.y, Math.round((maxY - minY + 1 + pad * 2) * sx));
  if (fabric.w < imageWidth * 0.12 || fabric.h < imageHeight * 0.12) return null;
  const scaledRows = rows.map((row) => ({
    left: Math.round(row.left * sx),
    right: Math.round(row.right * sx),
    y: Math.round(row.y * sx),
  }));
  const torso = torsoFromRows(scaledRows, fabric, silhouette);
  return { fabric, torso, imageWidth, imageHeight };
}

export function printAreaOnFabric(
  fabric: PixelRect,
  spec: PrintSpec,
  silhouette?: string,
  product?: { name?: string; category?: string },
  torso?: PixelRect,
): { area: PixelRect; pixelsPerInch: number } {
  const shorts = isShorts(product);
  const bed = torso ?? torsoFromRows([], fabric, silhouette, shorts);
  const collar = Math.round(fabric.y + fabric.h * collarInset(silhouette, shorts));
  const hem = Math.round(fabric.y + fabric.h * hemInset(silhouette, shorts));
  const seam = Math.round(bed.w * 0.04);
  let w = Math.max(8, bed.w - seam * 2);
  const x = Math.round(bed.x + (bed.w - w) / 2);
  const maxH = Math.max(8, hem - collar);
  const ppi = Math.round((w / Math.max(spec.widthIn, 0.25)) * 10) / 10;
  let h = Math.round(spec.heightIn * ppi);
  h = Math.min(h, maxH, Math.round(fabric.h * (shorts ? 0.55 : 0.58)));
  const y = collar;
  return {
    pixelsPerInch: ppi,
    area: { x: Math.max(0, x), y: Math.max(0, y), w, h },
  };
}

export async function fetchProductImage(url?: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*", "User-Agent": "bluecotton-studio/1.0" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (type && !type.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
