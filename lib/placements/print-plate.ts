/**
 * BlueCotton-style print-box automation.
 *
 * Their studio does not measure each photo by hand. Live /api/v2/garment
 * records and /betastudio/main.js show this formula:
 *
 *   1. Photograph every style on a standard plate (almost always 600×800).
 *   2. Pick a category PPI (tees 23, jackets 19–21, totes 30, sleeves 975/3.25).
 *   3. area.w / area.h = max print inches × PPI (13×16 tees are exactly 299×368).
 *   4. area.x = 0, which their Pixi stage treats as horizontally centered.
 *   5. area.y is a category preset on that plate (tee 113, sweatshirt 138, tote 275).
 *   6. Missing sleeve areas are filled with a shared sleeve.png + full-image box.
 *   7. getImageData in their studio only trims uploaded artwork, not the shirt box.
 */

export type PrintPlate = {
  canvasW: number;
  canvasH: number;
  ppiAtPlate: number;
  yOnPlate: number;
  printW: number;
  printH: number;
};

const PLATE_W = 600;
const PLATE_H = 800;

/** Shared sleeve asset from their SideService. */
export const SLEEVE_PLATE = {
  imgSize: 975,
  sizeInch: 3.25,
  get ppi() {
    return this.imgSize / this.sizeInch;
  },
};

const CATEGORY: Record<string, { ppiAtPlate: number; yOnPlate: number; front: [number, number]; back: [number, number] }> = {
  tee: { ppiAtPlate: 23, yOnPlate: 113, front: [13, 15], back: [13, 16] },
  polo: { ppiAtPlate: 23, yOnPlate: 113, front: [13, 15], back: [13, 16] },
  hoodie: { ppiAtPlate: 23, yOnPlate: 138, front: [13, 16], back: [13, 16] },
  jacket: { ppiAtPlate: 21, yOnPlate: 123, front: [13, 16], back: [13, 16] },
  vest: { ppiAtPlate: 23, yOnPlate: 116, front: [12, 14], back: [13, 15] },
  bag: { ppiAtPlate: 30, yOnPlate: 275, front: [9, 9], back: [9, 9] },
  cap: { ppiAtPlate: 72, yOnPlate: 210, front: [2.25, 2.25], back: [2.25, 2.25] },
  bottoms: { ppiAtPlate: 18, yOnPlate: 82, front: [13, 16], back: [13, 16] },
};

export function plateFor(silhouette?: string, side = "front", shorts = false): PrintPlate {
  const row = CATEGORY[silhouette ?? "tee"] ?? CATEGORY.tee;
  const [printW, printH] = shorts
    ? [13, 6]
    : side === "back"
      ? row.back
      : row.front;
  return {
    canvasW: PLATE_W,
    canvasH: PLATE_H,
    ppiAtPlate: row.ppiAtPlate,
    yOnPlate: shorts && silhouette === "bottoms" ? 253 : row.yOnPlate,
    printW,
    printH,
  };
}

export type AutoArea = {
  x: number;
  y: number;
  w: number;
  h: number;
  pixelsPerInch: number;
};

/** Scale their 600×800 plate formula onto whatever photo size we are using. */
export function autoPrintArea(
  silhouette: string | undefined,
  side: string,
  imageWidth: number,
  imageHeight: number,
  printIn?: { w: number; h: number },
  shorts = false,
): AutoArea {
  if (side === "left" || side === "right") {
    const ppi = Math.round((SLEEVE_PLATE.ppi * (imageWidth / SLEEVE_PLATE.imgSize)) * 10) / 10;
    const size = Math.round(SLEEVE_PLATE.sizeInch * ppi);
    return {
      pixelsPerInch: ppi,
      x: Math.round((imageWidth - size) / 2),
      y: Math.round((imageHeight - size) / 2),
      w: size,
      h: size,
    };
  }

  const plate = plateFor(silhouette, side, shorts);
  const widthIn = printIn?.w ?? plate.printW;
  const heightIn = printIn?.h ?? plate.printH;
  const ppi = Math.round((plate.ppiAtPlate * (imageWidth / plate.canvasW)) * 10) / 10;
  const w = Math.round(widthIn * ppi);
  const h = Math.round(heightIn * ppi);
  return {
    pixelsPerInch: ppi,
    x: Math.max(0, Math.round((imageWidth - w) / 2)),
    y: Math.max(0, Math.round(plate.yOnPlate * (imageHeight / plate.canvasH))),
    w,
    h,
  };
}
