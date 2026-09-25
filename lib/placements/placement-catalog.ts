import type { GarmentFamily } from "./product-type-family";
import { resolveGarmentFamily } from "./product-type-family";

export type PrintSizeClass = "small" | "large";
export type EmbroideryMultiplier = 1 | 1.1 | 1.15 | 1.2 | 1.3;

export type PlacementCatalogEntry = {
  code: string;
  label: string;
  maxWidthMm: number;
  maxHeightMm: number;
  printOnly?: boolean;
  description: string;
  embroideryMultiplier: EmbroideryMultiplier;
  printSizeClass: PrintSizeClass;
};

function entry(
  code: string,
  label: string,
  maxWidthMm: number,
  maxHeightMm: number,
  description: string,
  embroideryMultiplier: EmbroideryMultiplier,
  options?: { printOnly?: boolean },
): PlacementCatalogEntry {
  const maxDim = Math.max(maxWidthMm, maxHeightMm);
  return {
    code,
    label,
    maxWidthMm,
    maxHeightMm,
    description,
    embroideryMultiplier,
    printSizeClass: maxDim > 100 ? "large" : "small",
    ...(options?.printOnly ? { printOnly: true } : {}),
  };
}

export const PLACEMENT_BY_CODE: Record<string, PlacementCatalogEntry> = {
  FRONT: entry(
    "FRONT",
    "Front",
    280,
    350,
    "Full front print area",
    1.15,
    { printOnly: true },
  ),
  FLB: entry("FLB", "Front Left Breast", 100, 100, "Upper left chest area", 1),
  FRB: entry("FRB", "Front Right Breast", 100, 100, "Upper right chest area", 1),
  LS: entry("LS", "Left Sleeve", 80, 80, "Upper left arm", 1.1),
  RS: entry("RS", "Right Sleeve", 80, 80, "Upper right arm", 1.1),
  BB: entry("BB", "Big Back", 250, 250, "Large centre area on the back", 1.15, {
    printOnly: true,
  }),
  LL: entry("LL", "Left Leg", 100, 100, "Front left thigh", 1),
  RL: entry("RL", "Right Leg", 100, 100, "Front right thigh", 1),
  CAP_FRONT: entry("CAP_FRONT", "Cap Front Centre", 60, 80, "Front centre of cap", 1.3),
  CAP_LEFT: entry("CAP_LEFT", "Cap Left", 50, 50, "Left side of cap", 1.2),
  CAP_RIGHT: entry("CAP_RIGHT", "Cap Right", 50, 50, "Right side of cap", 1.2),
};

const FAMILY_PLACEMENT_CODES: Record<GarmentFamily, string[]> = {
  upper_wear: ["FRONT", "FLB", "FRB", "LS", "RS", "BB"],
  hi_vis: ["FRONT", "FLB", "BB"],
  coveralls: ["FLB", "BB"],
  bottom_wear: ["LL", "RL"],
  headwear: ["CAP_FRONT", "CAP_LEFT", "CAP_RIGHT"],
};

export function resolvePlacementMeta(
  code: string,
  context?: { family?: GarmentFamily; productType?: string | null },
): PlacementCatalogEntry | null {
  const base = PLACEMENT_BY_CODE[code];
  if (!base) return null;
  void context;
  return base;
}

export function getPlacementCodesForFamily(family: GarmentFamily): string[] {
  return FAMILY_PLACEMENT_CODES[family];
}

export function getPlacementsForProductType(
  productType: string | null | undefined,
): PlacementCatalogEntry[] {
  const family = resolveGarmentFamily(productType);
  return getPlacementCodesForFamily(family).map(
    (code) => resolvePlacementMeta(code, { family })!,
  );
}

export function getPlacementDisplayLabel(
  code: string,
  productType?: string | null,
  fallback?: string,
): string {
  return resolvePlacementMeta(code, { productType })?.label ?? fallback ?? code;
}
