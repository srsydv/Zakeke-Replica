/** Browser-only: composite the designed garment to PNG / PDF. */

import { FONT_STACK, type DesignObj } from "@/lib/design";
import { printBoxFromSide, type GarmentSide } from "@/lib/garment-template";
import { getSlotByCode, photoRect, slotsFromGarmentSide, type LogoSlot } from "@/lib/placements/logo-slots";

export function proxiedImage(src?: string) {
  if (!src) return "";
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return src;
  try {
    const host = new URL(src).hostname;
    if (host === "cdn.pimber.ly" || host.endsWith(".pimber.ly")) {
      return `/api/garment-image?url=${encodeURIComponent(src)}`;
    }
  } catch {
    return src;
  }
  return src;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function paintSvg(svg: string, fill?: string) {
  return svg.replace(/currentColor/g, fill || "#111");
}

function svgToImage(svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  return loadImage(url).finally(() => URL.revokeObjectURL(url));
}

function photoNorm(obj: DesignObj, slots: LogoSlot[], printBox: { x: number; y: number; w: number; h: number }) {
  if (getSlotByCode(obj.placementCode, slots)) return photoRect(obj, slots);
  return {
    x: printBox.x + obj.x * printBox.w,
    y: printBox.y + obj.y * printBox.h,
    w: obj.w * printBox.w,
    h: obj.h * printBox.h,
  };
}

async function drawObject(
  ctx: CanvasRenderingContext2D,
  obj: DesignObj,
  px: { x: number; y: number; w: number; h: number },
) {
  ctx.save();
  ctx.translate(px.x + px.w / 2, px.y + px.h / 2);
  ctx.rotate(((obj.rotation || 0) * Math.PI) / 180);
  ctx.scale(obj.flipH ? -1 : 1, obj.flipV ? -1 : 1);
  if (obj.type === "text" && obj.text) {
    ctx.fillStyle = obj.fill || "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const family = FONT_STACK[obj.font ?? "Anton"] ?? "sans-serif";
    ctx.font = `700 ${Math.max(12, px.h * 0.72)}px ${family}`;
    ctx.fillText(obj.text, 0, 0, px.w);
  } else if (obj.src) {
    try {
      const art = obj.src.trim().startsWith("<svg")
        ? await svgToImage(paintSvg(obj.src, obj.fill))
        : await loadImage(obj.src);
      ctx.drawImage(art, -px.w / 2, -px.h / 2, px.w, px.h);
    } catch {
      /* skip a missing layer */
    }
  }
  ctx.restore();
}

export async function renderGarmentPng(opts: {
  imageUrl?: string;
  sideTemplate?: GarmentSide;
  objects: DesignObj[];
  side: string;
  garmentWidthMm?: number;
}): Promise<Blob> {
  const src = proxiedImage(opts.imageUrl || opts.sideTemplate?.imageUrl);
  if (!src) throw new Error("No garment photo");
  const photo = await loadImage(src);
  const width = opts.sideTemplate?.imageWidth || photo.naturalWidth;
  const height = opts.sideTemplate?.imageHeight || photo.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(photo, 0, 0, width, height);

  const slots = slotsFromGarmentSide(opts.sideTemplate, opts.garmentWidthMm);
  const printBox = printBoxFromSide(opts.sideTemplate);
  const layers = opts.objects.filter((obj) => obj.side === opts.side);
  for (const obj of layers) {
    const norm = photoNorm(obj, slots, printBox);
    await drawObject(ctx, obj, {
      x: norm.x * width,
      y: norm.y * height,
      w: norm.w * width,
      h: norm.h * height,
    });
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not build PNG");
  return blob;
}

export async function renderPrintBoxPng(opts: {
  objects: DesignObj[];
  side: string;
  slot: LogoSlot;
  widthPx?: number;
}): Promise<Blob> {
  const widthPx = Math.max(400, opts.widthPx ?? Math.round(opts.slot.widthIn * 300));
  const heightPx = Math.max(400, Math.round(widthPx * (opts.slot.heightIn / Math.max(opts.slot.widthIn, 0.1))));
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.clearRect(0, 0, widthPx, heightPx);
  const layers = opts.objects.filter((obj) => obj.side === opts.side && obj.placementCode === opts.slot.code);
  for (const obj of layers) {
    await drawObject(ctx, obj, {
      x: obj.x * widthPx,
      y: obj.y * heightPx,
      w: obj.w * widthPx,
      h: obj.h * heightPx,
    });
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not build print PNG");
  return blob;
}

function ascii(parts: Array<string | Uint8Array>) {
  const encoder = new TextEncoder();
  const chunks = parts.map((part) => (typeof part === "string" ? encoder.encode(part) : part));
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Single-page PDF with a JPEG image filling the page. */
export function jpegToPdf(jpeg: Uint8Array, widthPx: number, heightPx: number, dpi = 150) {
  const w = (widthPx / dpi) * 72;
  const h = (heightPx / dpi) * 72;
  const objects: Uint8Array[] = [];
  const add = (body: string | Uint8Array) => {
    objects.push(typeof body === "string" ? new TextEncoder().encode(body) : body);
    return objects.length;
  };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  add(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(2)} ${h.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`,
  );
  const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} 0 0 cm /Im0 Do Q`;
  add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  add(
    ascii([
      `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      "\nendstream",
    ]),
  );

  const header = new TextEncoder().encode("%PDF-1.4\n");
  const chunks: Uint8Array[] = [header];
  const xref = [0];
  let offset = header.length;
  objects.forEach((body, i) => {
    xref.push(offset);
    const obj = ascii([`${i + 1} 0 obj\n`, body, "\nendobj\n"]);
    chunks.push(obj);
    offset += obj.length;
  });
  const xrefStart = offset;
  let table = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < xref.length; i += 1) {
    table += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
  }
  table += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  chunks.push(new TextEncoder().encode(table));
  return new Blob([ascii(chunks)], { type: "application/pdf" });
}

export async function pngBlobToPdf(png: Blob, widthPx: number, heightPx: number) {
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.drawImage(bitmap, 0, 0, widthPx, heightPx);
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!jpeg) throw new Error("Could not build PDF");
  return jpegToPdf(new Uint8Array(await jpeg.arrayBuffer()), widthPx, heightPx);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
