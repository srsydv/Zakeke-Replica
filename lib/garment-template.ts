/** BlueCotton-shaped print template (client-safe). */

export type GarmentArea = { x: number; y: number; w: number; h: number; label?: string };
export type GarmentEmbroidery = { x1: number; y1: number; x2: number; y2: number };
export type GarmentMask = { index: number; imageUrl: string | null; previewImageUrl?: string | null };
/** Pixel span on the photo that the admin marks as a known real width. */
export type MeasureLine = { x1: number; y1: number; x2: number; y2: number };

export type GarmentSide = {
  name: string;
  imageUrl?: string;
  previewImageUrl?: string | null;
  masks: GarmentMask[];
  areas: GarmentArea[];
  crop: [number, number, number, number];
  embroidery: GarmentEmbroidery[];
  measureLine?: MeasureLine;
  pixelsPerInch: number;
  imageWidth: number;
  imageHeight: number;
};

export type PublicGarment = {
  id: number;
  name: string;
  sides: GarmentSide[];
  /** Flat width of the garment in the photo (half of Ralawise to-fit chest). */
  garmentWidthMm?: number;
  source?: string;
  updatedAt?: string;
};

export function findSide(garment: PublicGarment | undefined, side: string) {
  if (!garment?.sides?.length) return undefined;
  const key = side.toLowerCase();
  return (
    garment.sides.find((s) => s.name.toLowerCase() === key) ??
    garment.sides.find((s) => s.name.toLowerCase() === "front") ??
    garment.sides[0]
  );
}

export function cropPixels(side?: GarmentSide) {
  const w = side?.imageWidth || 1;
  const h = side?.imageHeight || 1;
  const [x1, y1, x2, y2] =
    side?.crop && side.crop[2] > side.crop[0] ? side.crop : [0, 0, w, h];
  return {
    x: Math.max(0, x1),
    y: Math.max(0, y1),
    w: Math.max(1, x2 - x1),
    h: Math.max(1, y2 - y1),
  };
}

function areaToNorm(area: GarmentArea, side: GarmentSide) {
  return {
    x: area.x / side.imageWidth,
    y: area.y / side.imageHeight,
    w: area.w / side.imageWidth,
    h: area.h / side.imageHeight,
  };
}

/** Print box as 0–1 of the full product photo — same as BlueCotton. */
export function printBoxFromSide(side?: GarmentSide) {
  if (!side?.areas[0] || !side.imageWidth || !side.imageHeight) {
    return { x: 0.24, y: 0.16, w: 0.52, h: 0.46 };
  }
  return areaToNorm(side.areas[0], side);
}

export function printBoxesFromSide(side?: GarmentSide) {
  if (!side?.areas.length || !side.imageWidth || !side.imageHeight) {
    return [printBoxFromSide(side)];
  }
  return side.areas.map((area) => areaToNorm(area, side));
}

export function areaForPlacement(side: GarmentSide | undefined, placementCode?: string) {
  if (!side?.areas.length) return undefined;
  const match = placementCode?.match(/^BOX_(\d+)$/);
  if (match) return side.areas[Number(match[1])] ?? side.areas[0];
  return side.areas[0];
}

export function printInchesFromSide(side?: GarmentSide) {
  const area = side?.areas[0];
  const ppi = side?.pixelsPerInch || 23;
  if (!area) return { w: 13, h: 15 };
  return { w: area.w / ppi, h: area.h / ppi };
}

/** Pixel span of the garment in the photo — fabric crop, not the white studio frame. */
export function fabricWidthPx(side?: GarmentSide) {
  return cropPixels(side).w;
}

export function measureLineLengthPx(line?: MeasureLine) {
  if (!line) return 0;
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

/** Known-width span: the sketched line, or the detected fabric if no line yet. */
export function scaleWidthPx(side?: GarmentSide) {
  const drawn = measureLineLengthPx(side?.measureLine);
  return drawn > 2 ? drawn : fabricWidthPx(side);
}

export function defaultMeasureLine(side?: GarmentSide): MeasureLine {
  const crop = cropPixels(side);
  const y = crop.y + crop.h * 0.38;
  return { x1: crop.x, y1: y, x2: crop.x + crop.w, y2: y };
}

export function ppiFromGarmentWidth(side: GarmentSide | undefined, garmentWidthMm: number) {
  const widthIn = Math.max(garmentWidthMm / 25.4, 0.1);
  return scaleWidthPx(side) / widthIn;
}

/** Print box size from the sketched line: box_px / line_px × line_mm. */
export function printMmFromGarment(area: GarmentArea | undefined, side: GarmentSide | undefined, garmentWidthMm: number) {
  const scale = garmentWidthMm / scaleWidthPx(side);
  if (!area) return { w: 0, h: 0 };
  return { w: area.w * scale, h: area.h * scale };
}

/** Ralawise to-fit chest is circumference; the flat photo is half-chest. */
export function halfChestMm(chestIn: number) {
  return (chestIn / 2) * 25.4;
}

export function chestInFromGarmentWidthMm(garmentWidthMm: number) {
  return (garmentWidthMm / 25.4) * 2;
}

export function cropBoxFromSide(side?: GarmentSide) {
  if (!side?.crop || !side.imageWidth || !side.imageHeight) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const [x1, y1, x2, y2] = side.crop;
  return {
    x: x1 / side.imageWidth,
    y: y1 / side.imageHeight,
    w: (x2 - x1) / side.imageWidth,
    h: (y2 - y1) / side.imageHeight,
  };
}
