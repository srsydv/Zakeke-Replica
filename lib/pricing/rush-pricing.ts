import { computeTotalIncVat, roundGbp } from "./vat";

export type RushTier = "standard" | "5_day" | "3_day" | "48_hour";

export const DEFAULT_RUSH_SURCHARGE_PERCENTS: Record<
  Exclude<RushTier, "standard">,
  number
> = {
  "5_day": 15,
  "3_day": 25,
  "48_hour": 40,
};

export type RushSurchargePercents = Record<Exclude<RushTier, "standard">, number>;

export function resolveRushSurchargePercent(
  tier: RushTier,
  percents: RushSurchargePercents = DEFAULT_RUSH_SURCHARGE_PERCENTS,
): number {
  if (tier === "standard") return 0;
  return percents[tier] ?? DEFAULT_RUSH_SURCHARGE_PERCENTS[tier];
}

export function formatRushTierLabel(tier: RushTier): string {
  if (tier === "standard") return "Standard (5+ working days)";
  if (tier === "5_day") return "Less than 5 working days";
  if (tier === "3_day") return "Less than 3 working days";
  return "Less than 48 hours";
}

export function computeRushSurchargeExVat(
  linesSubtotalExVat: number,
  tier: RushTier,
  percents?: RushSurchargePercents,
): number {
  if (tier === "standard" || !Number.isFinite(linesSubtotalExVat) || linesSubtotalExVat <= 0) {
    return 0;
  }
  const percent = resolveRushSurchargePercent(tier, percents);
  return roundGbp(linesSubtotalExVat * (percent / 100));
}

export type OrderTotalWithRush = {
  linesSubtotalExVat: number;
  rushTier: RushTier;
  surchargePercent: number;
  rushSurchargeExVat: number;
  subtotalExVat: number;
  vatGbp: number;
  totalIncVat: number;
};

export function computeOrderTotalWithRush(input: {
  linesSubtotalExVat: number;
  tier: RushTier;
  vatRatePercent: number;
  percents?: RushSurchargePercents;
}): OrderTotalWithRush {
  const linesSubtotalExVat = roundGbp(Math.max(0, input.linesSubtotalExVat));
  const surchargePercent = resolveRushSurchargePercent(input.tier, input.percents);
  const rushSurchargeExVat = computeRushSurchargeExVat(
    linesSubtotalExVat,
    input.tier,
    input.percents,
  );
  const subtotalExVat = roundGbp(linesSubtotalExVat + rushSurchargeExVat);
  const vatGbp = roundGbp(subtotalExVat * (input.vatRatePercent / 100));
  const totalIncVat = roundGbp(subtotalExVat + vatGbp);

  return {
    linesSubtotalExVat,
    rushTier: input.tier,
    surchargePercent,
    rushSurchargeExVat,
    subtotalExVat,
    vatGbp,
    totalIncVat,
  };
}
