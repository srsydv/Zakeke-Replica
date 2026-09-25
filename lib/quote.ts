import type { CatalogProduct } from "./catalog";
import { applyBaseGarmentMarkupExVat } from "./pricing/blank-pricing";
import {
  computeEmbroideryLinePricing,
  computePrintLinePricing,
  formatPricingGbp,
} from "./pricing/pricing-engine";
import type { LinePricingBreakdown } from "./pricing/pricing-types";
import {
  computeOrderTotalWithRush,
  type RushTier,
} from "./pricing/rush-pricing";
import { DEFAULT_PLATFORM_PRICING_SETTINGS } from "./pricing/settings";

export { formatPricingGbp };

export const MIN_ORDER_QTY = 6;

export type SizeQty = { size: string; quantity: number };

export type QuoteInput = {
  product: CatalogProduct;
  colorName?: string;
  sizeQuantities: SizeQty[];
  placementCodes: string[];
  decoration: "print" | "embroidery";
  stitchCount?: number;
  rushTier?: RushTier;
};

export type QuoteResult = {
  line: LinePricingBreakdown;
  unitIncVat: number;
  rush: ReturnType<typeof computeOrderTotalWithRush>;
};

function wholesaleFor(product: CatalogProduct, size: string, colorName?: string): number {
  const colour = colorName
    ? product.colors.find((c) => c.name === colorName)
    : undefined;
  return (
    colour?.prices?.[size] ??
    product.sizeWholesale[size] ??
    product.wholesaleBase
  );
}

function blankRows(product: CatalogProduct, sizeQuantities: SizeQty[], colorName?: string) {
  const settings = DEFAULT_PLATFORM_PRICING_SETTINGS;
  return sizeQuantities
    .filter((s) => s.quantity > 0)
    .map((s) => {
      const wholesale = wholesaleFor(product, s.size, colorName);
      return {
        quantity: s.quantity,
        unitWholesaleExVat: applyBaseGarmentMarkupExVat(
          wholesale,
          settings.baseGarmentMarkupPercent,
        ),
      };
    });
}

export function quoteOrder(input: QuoteInput): QuoteResult {
  const settings = DEFAULT_PLATFORM_PRICING_SETTINGS;
  const rows = blankRows(input.product, input.sizeQuantities, input.colorName);
  const quantity = rows.reduce((s, r) => s + r.quantity, 0);
  const qty = Math.max(1, quantity);
  const placements =
    input.placementCodes.length > 0 ? input.placementCodes : ["FRONT"];

  const line =
    input.decoration === "embroidery"
      ? computeEmbroideryLinePricing({
          kind: "embroidery",
          quantity: qty,
          blank: { sizeQuantities: rows.length ? rows : [{ quantity: qty, unitWholesaleExVat: input.product.wholesaleBase }] },
          placementCode: placements[0] ?? "FLB",
          productType: input.product.category,
          stitchCount: input.stitchCount ?? 8000,
          estimated: true,
          globalMarkupPercent: settings.globalProductMarkupPercent,
          vatRatePercent: settings.vatRatePercent,
          matrices: settings.matrices,
        })
      : computePrintLinePricing({
          kind: "print",
          quantity: qty,
          blank: {
            sizeQuantities: rows.length
              ? rows
              : [{ quantity: qty, unitWholesaleExVat: input.product.wholesaleBase }],
          },
          placementCodes: placements,
          productType: input.product.category,
          printSetupFeeGbp: settings.printSetupFeeGbp,
          globalMarkupPercent: settings.globalProductMarkupPercent,
          vatRatePercent: settings.vatRatePercent,
          matrices: settings.matrices,
        });

  const rush = computeOrderTotalWithRush({
    linesSubtotalExVat: line.subtotalExVat,
    tier: input.rushTier ?? "standard",
    vatRatePercent: settings.vatRatePercent,
    percents: settings.rushSurchargePercents,
  });

  const unitIncVat =
    line.quantity > 0 ? Math.round((rush.totalIncVat / line.quantity) * 100) / 100 : 0;

  return { line, unitIncVat, rush };
}

export function fromPriceForProduct(product: CatalogProduct): number {
  const size = product.sizes.includes("M")
    ? "M"
    : product.sizes.includes("L")
      ? "L"
      : product.sizes[0]!;
  const cheapest = [...product.colors].sort((a, b) => {
    const ap = a.prices?.[size] ?? product.sizeWholesale[size] ?? product.wholesaleBase;
    const bp = b.prices?.[size] ?? product.sizeWholesale[size] ?? product.wholesaleBase;
    return ap - bp;
  })[0];
  const quote = quoteOrder({
    product,
    colorName: cheapest?.name,
    sizeQuantities: [{ size, quantity: 12 }],
    placementCodes: product.silhouette === "cap" ? ["CAP_FRONT"] : ["FRONT"],
    decoration: "print",
  });
  return quote.unitIncVat;
}
