import type { DesignObj } from "@/lib/design";
import { printMmFromGarment, type GarmentSide } from "@/lib/garment-template";
import {
  fallbackGarmentFrame,
  mapRectToFrame,
  squareOnPhoto,
  type GarmentFrame,
} from "@/lib/placements/garment-frame";

export type LogoSlotCode = string;

export type LogoSlot = {
  code: LogoSlotCode;
  label: string;
  /** 0–1 inside the garment frame (the shirt), not the full photo. */
  x: number;
  y: number;
  w: number;
  h: number;
  widthIn: number;
  heightIn: number;
};

/** Chest print area is a 100 mm × 100 mm square. */
export const CHEST_SLOT_MM = 100;
export const CHEST_SLOT_IN = CHEST_SLOT_MM / 25.4;

/** 100 mm badges as fractions of the garment (below collar, on the torso). */
export const CHEST_SLOTS: LogoSlot[] = [
  {
    code: "FRB",
    label: "Right chest",
    x: 0.26,
    y: 0.14,
    w: 0.16,
    h: 0.16,
    widthIn: CHEST_SLOT_IN,
    heightIn: CHEST_SLOT_IN,
  },
  {
    code: "FLB",
    label: "Left chest",
    x: 0.58,
    y: 0.14,
    w: 0.16,
    h: 0.16,
    widthIn: CHEST_SLOT_IN,
    heightIn: CHEST_SLOT_IN,
  },
];

/** One left-chest badge on hi-vis vests, above the chest tape. */
export const HIVIS_SLOTS: LogoSlot[] = [
  {
    code: "FLB",
    label: "Left chest",
    x: 0.58,
    y: 0.13,
    w: 0.18,
    h: 0.18,
    widthIn: CHEST_SLOT_IN,
    heightIn: CHEST_SLOT_IN,
  },
];

export function isHiVisProduct(product: {
  shop?: string;
  silhouette?: string;
  category?: string;
}): boolean {
  if (product.shop === "hi-vis") return true;
  const category = (product.category ?? "").toLowerCase();
  if (/(safety vest|hi-vis|hi vis|tabard)/.test(category)) return true;
  return product.silhouette === "vest";
}

export function usesChestLogoSlots(_product: {
  shop?: string;
  silhouette?: string;
  category?: string;
}): boolean {
  return false;
}

export function getSlotTemplates(
  product: { shop?: string; silhouette?: string; category?: string },
  side: string,
): LogoSlot[] {
  if (side !== "front") return [];
  if (!usesChestLogoSlots(product)) return [];
  if (isHiVisProduct(product)) return HIVIS_SLOTS;
  return CHEST_SLOTS;
}

/** Admin-drawn print boxes as designer slots, sharing the garment width scale. */
export function slotsFromGarmentSide(side?: GarmentSide, garmentWidthMm?: number): LogoSlot[] {
  if (!side?.areas.length || !side.imageWidth || !side.imageHeight) return [];
  const ppi = side.pixelsPerInch || 23;
  return side.areas.map((area, index) => {
    const mm = garmentWidthMm
      ? printMmFromGarment(area, side, garmentWidthMm)
      : { w: (area.w / ppi) * 25.4, h: (area.h / ppi) * 25.4 };
    return {
      code: `BOX_${index}`,
      label: area.label || (side.areas.length === 1 ? "Print box" : `Box ${index + 1}`),
      x: area.x / side.imageWidth,
      y: area.y / side.imageHeight,
      w: area.w / side.imageWidth,
      h: area.h / side.imageHeight,
      widthIn: mm.w / 25.4,
      heightIn: mm.h / 25.4,
    };
  });
}

/** Photo-space slots sitting on the garment, BlueCotton-style. */
export function getLogoSlots(
  product: { shop?: string; silhouette?: string; category?: string },
  side: string,
  frame?: GarmentFrame,
): LogoSlot[] {
  const templates = getSlotTemplates(product, side);
  const resolved = frame ?? fallbackGarmentFrame(product.silhouette);
  return templates.map((slot) => {
    const mapped = squareOnPhoto(mapRectToFrame(slot, resolved));
    return { ...slot, ...mapped };
  });
}

export function getSlotByCode(code: string | undefined, slots?: LogoSlot[]): LogoSlot | undefined {
  if (slots) return slots.find((slot) => slot.code === code);
  return CHEST_SLOTS.find((slot) => slot.code === code) ?? HIVIS_SLOTS.find((slot) => slot.code === code);
}

export function slotContaining(nx: number, ny: number, slots: LogoSlot[] = CHEST_SLOTS): LogoSlot | undefined {
  return slots.find((slot) => nx >= slot.x && nx <= slot.x + slot.w && ny >= slot.y && ny <= slot.y + slot.h);
}

export function nearestSlot(nx: number, ny: number, slots: LogoSlot[] = CHEST_SLOTS): LogoSlot | undefined {
  if (!slots.length) return undefined;
  return slots.slice().sort((a, b) => {
    const da = (nx - (a.x + a.w / 2)) ** 2 + (ny - (a.y + a.h / 2)) ** 2;
    const db = (nx - (b.x + b.w / 2)) ** 2 + (ny - (b.y + b.h / 2)) ** 2;
    return da - db;
  })[0];
}

export function fitInSlot(
  slot: LogoSlot,
  aspect = 1,
  fill = 0.84,
): { x: number; y: number; w: number; h: number; placementCode: LogoSlotCode } {
  let w = fill;
  let h = w / Math.max(aspect, 0.05);
  if (h > fill) {
    h = fill;
    w = h * aspect;
  }
  if (w > 1) {
    w = 1;
    h = w / Math.max(aspect, 0.05);
  }
  if (h > 1) {
    h = 1;
    w = h * aspect;
  }
  return {
    x: (1 - w) / 2,
    y: (1 - h) / 2,
    w,
    h,
    placementCode: slot.code,
  };
}

export function fillInSlot(slot: LogoSlot): {
  x: number;
  y: number;
  w: number;
  h: number;
  placementCode: LogoSlotCode;
} {
  return { x: 0, y: 0, w: 1, h: 1, placementCode: slot.code };
}

export function clampToSlot(x: number, y: number, w: number, h: number) {
  const nw = Math.min(Math.max(w, 0.08), 1);
  const nh = Math.min(Math.max(h, 0.08), 1);
  return {
    x: Math.min(Math.max(x, 0), 1 - nw),
    y: Math.min(Math.max(y, 0), 1 - nh),
    w: nw,
    h: nh,
  };
}

export function photoRect(
  obj: Pick<DesignObj, "x" | "y" | "w" | "h" | "placementCode">,
  slots?: LogoSlot[],
) {
  const slot = getSlotByCode(obj.placementCode, slots);
  if (!slot) return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
  return {
    x: slot.x + obj.x * slot.w,
    y: slot.y + obj.y * slot.h,
    w: obj.w * slot.w,
    h: obj.h * slot.h,
  };
}

export function objectLayerStyle(
  obj: Pick<DesignObj, "x" | "y" | "w" | "h" | "rotation" | "placementCode">,
  slots?: LogoSlot[],
) {
  const box = photoRect(obj, slots);
  return {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
    transform: `rotate(${obj.rotation}deg)`,
  };
}

export function usesSlotCoords(objects: Array<{ placementCode?: string }>, slots?: LogoSlot[]) {
  return objects.some((obj) => {
    if (!obj.placementCode) return false;
    if (slots) return Boolean(getSlotByCode(obj.placementCode, slots));
    return obj.placementCode === "FLB" || obj.placementCode === "FRB" || obj.placementCode.startsWith("BOX_");
  });
}

export function isSlotted(obj: { placementCode?: string }, slots?: LogoSlot[]) {
  return Boolean(obj.placementCode && getSlotByCode(obj.placementCode, slots));
}
