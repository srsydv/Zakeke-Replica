import { resolvePlacementMeta } from "./placement-catalog";

export function resolvePrintSizeClassForPlacement(
  placementCode: string,
  productType?: string | null,
): "small" | "large" {
  return resolvePlacementMeta(placementCode, { productType })?.printSizeClass ?? "small";
}

export function resolveEmbroideryMultiplierForPlacement(
  placementCode: string,
  productType?: string | null,
): number {
  return resolvePlacementMeta(placementCode, { productType })?.embroideryMultiplier ?? 1;
}
