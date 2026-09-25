export function resolveQuantityTierIndex(
  quantity: number,
  breakpoints: readonly number[],
): number {
  const qty = Math.max(1, Math.floor(quantity));
  for (let i = 0; i < breakpoints.length; i++) {
    if (qty <= breakpoints[i]!) return i;
  }
  return breakpoints.length;
}

export function lookupTierPrice(
  quantity: number,
  breakpoints: readonly number[],
  prices: readonly number[],
): number {
  const idx = resolveQuantityTierIndex(quantity, breakpoints);
  return prices[idx] ?? prices[prices.length - 1] ?? 0;
}
