import { DEFAULT_PRICING_MATRICES, type PricingMatrices } from "./pricing-matrices";
import {
  DEFAULT_RUSH_SURCHARGE_PERCENTS,
  type RushSurchargePercents,
} from "./rush-pricing";

export type PlatformPricingSettings = {
  globalProductMarkupPercent: number;
  baseGarmentMarkupPercent: number;
  vatRatePercent: number;
  printSetupFeeGbp: number;
  rushSurchargePercents: RushSurchargePercents;
  matrices: PricingMatrices;
};

export const DEFAULT_PLATFORM_PRICING_SETTINGS: PlatformPricingSettings = {
  globalProductMarkupPercent: 28,
  baseGarmentMarkupPercent: 20,
  vatRatePercent: 20,
  printSetupFeeGbp: 1,
  rushSurchargePercents: DEFAULT_RUSH_SURCHARGE_PERCENTS,
  matrices: DEFAULT_PRICING_MATRICES,
};

export function loadPlatformPricingSettings(): PlatformPricingSettings {
  return DEFAULT_PLATFORM_PRICING_SETTINGS;
}
