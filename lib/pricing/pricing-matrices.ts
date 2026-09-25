export const EMBROIDERY_QTY_TIER_BREAKPOINTS = [11, 49, 249, 999] as const;

export type EmbroideryStitchBand = 1 | 2 | 3;

export const EMBROIDERY_BAND_PRICES_GBP: Record<EmbroideryStitchBand, readonly number[]> = {
  1: [9.5, 6.0, 4.25, 3.5, 3.0],
  2: [11.5, 7.5, 5.5, 4.5, 3.75],
  3: [14.0, 9.0, 6.75, 5.75, 4.75],
};

export const DTG_SMALL_QTY_TIER_BREAKPOINTS = [10, 49, 199, 499] as const;
export const DTG_SMALL_PRICES_GBP = [9.5, 8.0, 6.5, 5.75, 5.0] as const;
export const DTG_LARGE_QTY_TIER_BREAKPOINTS = [10, 49, 199, 499] as const;
export const DTG_LARGE_PRICES_GBP = [14.0, 11.5, 9.0, 7.5, 6.5] as const;

export const PRICING_VERSION = "2026-06-v1";
export const MAX_AUTO_STITCH_COUNT = 18_000;

export type PricingMatrices = {
  embroideryBandPricesGbp: Record<EmbroideryStitchBand, readonly number[]>;
  embroideryQtyTierBreakpoints: readonly number[];
  dtgSmallPricesGbp: readonly number[];
  dtgSmallQtyTierBreakpoints: readonly number[];
  dtgLargePricesGbp: readonly number[];
  dtgLargeQtyTierBreakpoints: readonly number[];
};

export const DEFAULT_PRICING_MATRICES: PricingMatrices = {
  embroideryBandPricesGbp: EMBROIDERY_BAND_PRICES_GBP,
  embroideryQtyTierBreakpoints: EMBROIDERY_QTY_TIER_BREAKPOINTS,
  dtgSmallPricesGbp: DTG_SMALL_PRICES_GBP,
  dtgSmallQtyTierBreakpoints: DTG_SMALL_QTY_TIER_BREAKPOINTS,
  dtgLargePricesGbp: DTG_LARGE_PRICES_GBP,
  dtgLargeQtyTierBreakpoints: DTG_LARGE_QTY_TIER_BREAKPOINTS,
};
