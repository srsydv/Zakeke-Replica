import type { PrintSizeClass } from "../placements/placement-catalog";
import type { EmbroideryStitchBand, PricingMatrices } from "./pricing-matrices";

export type LinePricingBreakdown = {
  currency: "GBP";
  quantity: number;
  blankUnitExVat: number;
  decorationUnitExVat: number;
  setupFeeExVat: number;
  blankSubtotalExVat: number;
  decorationSubtotalExVat: number;
  subtotalExVat: number;
  vatRatePercent: number;
  vatGbp: number;
  totalIncVat: number;
  estimated: boolean;
  embroidery?: {
    stitchCount?: number;
    band: EmbroideryStitchBand | "manual";
    baseBandPrice: number;
    multiplier: number;
    digitisingFeeExVat?: number;
  };
  print?: {
    setupFeeExVat: number;
    placements: Array<{ code: string; sizeClass: PrintSizeClass; unitExVat: number }>;
  };
  pricingVersion: string;
};

export type BlankLineInput = {
  sizeQuantities: Array<{ quantity: number; unitWholesaleExVat: number }>;
};

export type PrintLinePricingInput = {
  kind: "print";
  quantity: number;
  blank: BlankLineInput;
  placementCodes: string[];
  productType: string | null | undefined;
  printSetupFeeGbp: number;
  globalMarkupPercent: number;
  vatRatePercent: number;
  matrices?: PricingMatrices;
};

export type EmbroideryLinePricingInput = {
  kind: "embroidery";
  quantity: number;
  blank: BlankLineInput;
  placementCode: string;
  productType: string | null | undefined;
  stitchCount?: number | null;
  digitisingFeeExVat?: number | null;
  manualDecorationUnitExVat?: number | null;
  estimated: boolean;
  globalMarkupPercent: number;
  vatRatePercent: number;
  matrices?: PricingMatrices;
};

export type LinePricingInput = PrintLinePricingInput | EmbroideryLinePricingInput;
