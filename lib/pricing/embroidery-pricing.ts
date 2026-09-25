import { resolvePlacementMeta } from "../placements/placement-catalog";
import { applyMinimumEmbroideryDecorationGbp } from "./placement-pricing";
import {
  DEFAULT_PRICING_MATRICES,
  MAX_AUTO_STITCH_COUNT,
  type EmbroideryStitchBand,
  type PricingMatrices,
} from "./pricing-matrices";
import { lookupTierPrice } from "./quantity-bands";

export function resolveStitchBand(
  stitchCount: number,
):
  | { band: EmbroideryStitchBand; requiresManualQuote: false }
  | { band: "manual"; requiresManualQuote: true } {
  if (!Number.isFinite(stitchCount) || stitchCount <= 0) {
    return { band: 1, requiresManualQuote: false };
  }
  if (stitchCount > MAX_AUTO_STITCH_COUNT) {
    return { band: "manual", requiresManualQuote: true };
  }
  if (stitchCount <= 8000) return { band: 1, requiresManualQuote: false };
  if (stitchCount <= 12000) return { band: 2, requiresManualQuote: false };
  return { band: 3, requiresManualQuote: false };
}

export function lookupEmbroideryBaseBandPriceGbp(
  band: EmbroideryStitchBand,
  quantity: number,
  matrices: PricingMatrices = DEFAULT_PRICING_MATRICES,
): number {
  const prices = matrices.embroideryBandPricesGbp[band];
  return lookupTierPrice(quantity, matrices.embroideryQtyTierBreakpoints, prices);
}

export function computeEmbroideryDecorationUnitExVat(input: {
  stitchCount: number;
  quantity: number;
  placementCode: string;
  productType?: string | null;
  manualDecorationUnitExVat?: number | null;
  matrices?: PricingMatrices;
}): {
  unitExVat: number;
  band: EmbroideryStitchBand | "manual";
  baseBandPrice: number;
  multiplier: number;
  requiresManualQuote: boolean;
} {
  const bandResult = resolveStitchBand(input.stitchCount);
  const meta = resolvePlacementMeta(input.placementCode, {
    productType: input.productType,
  });
  const multiplier = meta?.embroideryMultiplier ?? 1;

  if (bandResult.requiresManualQuote) {
    const manual = input.manualDecorationUnitExVat;
    if (manual == null || !Number.isFinite(manual) || manual < 0) {
      throw new Error("MANUAL_QUOTE_REQUIRED");
    }
    return {
      unitExVat: applyMinimumEmbroideryDecorationGbp(manual),
      band: "manual",
      baseBandPrice: manual,
      multiplier: 1,
      requiresManualQuote: true,
    };
  }

  const baseBandPrice = lookupEmbroideryBaseBandPriceGbp(
    bandResult.band,
    input.quantity,
    input.matrices,
  );
  const unitExVat = applyMinimumEmbroideryDecorationGbp(baseBandPrice * multiplier);

  return {
    unitExVat,
    band: bandResult.band,
    baseBandPrice,
    multiplier,
    requiresManualQuote: false,
  };
}
