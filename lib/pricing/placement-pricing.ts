export const MINIMUM_EMBROIDERY_DECORATION_GBP = 5.5;

export function applyMinimumEmbroideryDecorationGbp(amount: number): number {
  if (!Number.isFinite(amount)) return MINIMUM_EMBROIDERY_DECORATION_GBP;
  return Math.max(MINIMUM_EMBROIDERY_DECORATION_GBP, amount);
}
