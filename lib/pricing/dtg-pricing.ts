import type { PrintSizeClass } from "../placements/placement-catalog";
import {
  DEFAULT_PRICING_MATRICES,
  type PricingMatrices,
} from "./pricing-matrices";
import { lookupTierPrice } from "./quantity-bands";

export function lookupDtgUnitExVat(
  sizeClass: PrintSizeClass,
  quantity: number,
  matrices: PricingMatrices = DEFAULT_PRICING_MATRICES,
): number {
  if (sizeClass === "large") {
    return lookupTierPrice(
      quantity,
      matrices.dtgLargeQtyTierBreakpoints,
      matrices.dtgLargePricesGbp,
    );
  }
  return lookupTierPrice(
    quantity,
    matrices.dtgSmallQtyTierBreakpoints,
    matrices.dtgSmallPricesGbp,
  );
}

export function computePrintDecorationUnitExVat(input: {
  placementCodes: string[];
  productType: string | null | undefined;
  quantity: number;
  resolvePrintSizeClass: (code: string) => PrintSizeClass;
  matrices?: PricingMatrices;
}): {
  unitExVat: number;
  placements: Array<{ code: string; sizeClass: PrintSizeClass; unitExVat: number }>;
} {
  const placements = input.placementCodes.map((code) => {
    const sizeClass = input.resolvePrintSizeClass(code);
    const unitExVat = lookupDtgUnitExVat(sizeClass, input.quantity, input.matrices);
    return { code, sizeClass, unitExVat };
  });

  const unitExVat = placements.reduce((sum, p) => sum + p.unitExVat, 0);
  return { unitExVat, placements };
}
