import { resolvePrintSizeClassForPlacement } from "../placements/garment-config-placements";
import { applyGlobalMarkupExVat } from "./blank-pricing";
import { computePrintDecorationUnitExVat } from "./dtg-pricing";
import {
  computeEmbroideryDecorationUnitExVat,
  resolveStitchBand,
} from "./embroidery-pricing";
import { PRICING_VERSION } from "./pricing-matrices";
import type {
  BlankLineInput,
  EmbroideryLinePricingInput,
  LinePricingBreakdown,
  LinePricingInput,
  PrintLinePricingInput,
} from "./pricing-types";
import {
  resolveEmbroideryDigitisingFeeExVat,
  resolvePrintSetupFeeExVat,
} from "./setup-fees";
import { roundGbp } from "./vat";

export type { LinePricingBreakdown, LinePricingInput };

function computeBlankTotals(
  blank: BlankLineInput,
  markupPercent: number,
): { quantity: number; blankSubtotalExVat: number; blankUnitExVat: number } {
  let quantity = 0;
  let blankSubtotalExVat = 0;

  for (const row of blank.sizeQuantities) {
    if (row.quantity <= 0) continue;
    const unit = applyGlobalMarkupExVat(row.unitWholesaleExVat, markupPercent);
    quantity += row.quantity;
    blankSubtotalExVat += unit * row.quantity;
  }

  blankSubtotalExVat = roundGbp(blankSubtotalExVat);
  const blankUnitExVat = quantity > 0 ? roundGbp(blankSubtotalExVat / quantity) : 0;

  return { quantity, blankSubtotalExVat, blankUnitExVat };
}

function buildBreakdown(input: {
  quantity: number;
  blankUnitExVat: number;
  blankSubtotalExVat: number;
  decorationUnitExVat: number;
  setupFeeExVat: number;
  vatRatePercent: number;
  estimated: boolean;
  embroidery?: LinePricingBreakdown["embroidery"];
  print?: LinePricingBreakdown["print"];
}): LinePricingBreakdown {
  const decorationSubtotalExVat = roundGbp(input.decorationUnitExVat * input.quantity);
  const subtotalExVat = roundGbp(
    input.blankSubtotalExVat + decorationSubtotalExVat + input.setupFeeExVat,
  );
  const vatGbp = roundGbp(subtotalExVat * (input.vatRatePercent / 100));
  const totalIncVat = roundGbp(subtotalExVat + vatGbp);

  return {
    currency: "GBP",
    quantity: input.quantity,
    blankUnitExVat: input.blankUnitExVat,
    decorationUnitExVat: input.decorationUnitExVat,
    setupFeeExVat: input.setupFeeExVat,
    blankSubtotalExVat: input.blankSubtotalExVat,
    decorationSubtotalExVat,
    subtotalExVat,
    vatRatePercent: input.vatRatePercent,
    vatGbp,
    totalIncVat,
    estimated: input.estimated,
    embroidery: input.embroidery,
    print: input.print,
    pricingVersion: PRICING_VERSION,
  };
}

export function computePrintLinePricing(input: PrintLinePricingInput): LinePricingBreakdown {
  const { quantity, blankSubtotalExVat, blankUnitExVat } = computeBlankTotals(
    input.blank,
    input.globalMarkupPercent,
  );

  const printDecoration = computePrintDecorationUnitExVat({
    placementCodes: input.placementCodes,
    productType: input.productType,
    quantity,
    resolvePrintSizeClass: (code) =>
      resolvePrintSizeClassForPlacement(code, input.productType),
    matrices: input.matrices,
  });

  const setupFeeExVat = resolvePrintSetupFeeExVat(input.printSetupFeeGbp);

  return buildBreakdown({
    quantity,
    blankUnitExVat,
    blankSubtotalExVat,
    decorationUnitExVat: printDecoration.unitExVat,
    setupFeeExVat,
    vatRatePercent: input.vatRatePercent,
    estimated: false,
    print: {
      setupFeeExVat,
      placements: printDecoration.placements,
    },
  });
}

export function computeEmbroideryLinePricing(
  input: EmbroideryLinePricingInput,
): LinePricingBreakdown {
  const { quantity, blankSubtotalExVat, blankUnitExVat } = computeBlankTotals(
    input.blank,
    input.globalMarkupPercent,
  );

  const stitchCount =
    input.stitchCount != null && input.stitchCount > 0
      ? input.stitchCount
      : input.estimated
        ? 8000
        : 0;

  const embroideryCalc = computeEmbroideryDecorationUnitExVat({
    stitchCount,
    quantity,
    placementCode: input.placementCode,
    productType: input.productType,
    manualDecorationUnitExVat: input.manualDecorationUnitExVat,
    matrices: input.matrices,
  });

  const digitisingFeeExVat = input.estimated
    ? 0
    : resolveEmbroideryDigitisingFeeExVat(input.digitisingFeeExVat);

  return buildBreakdown({
    quantity,
    blankUnitExVat,
    blankSubtotalExVat,
    decorationUnitExVat: embroideryCalc.unitExVat,
    setupFeeExVat: digitisingFeeExVat,
    vatRatePercent: input.vatRatePercent,
    estimated: input.estimated,
    embroidery: {
      stitchCount: input.estimated ? undefined : stitchCount,
      band: embroideryCalc.band,
      baseBandPrice: embroideryCalc.baseBandPrice,
      multiplier: embroideryCalc.multiplier,
      digitisingFeeExVat: digitisingFeeExVat > 0 ? digitisingFeeExVat : undefined,
    },
  });
}

export function computeOrderLinePricing(input: LinePricingInput): LinePricingBreakdown {
  if (input.kind === "print") return computePrintLinePricing(input);
  return computeEmbroideryLinePricing(input);
}

export function formatPricingGbp(amount: number): string {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export { resolveStitchBand };
