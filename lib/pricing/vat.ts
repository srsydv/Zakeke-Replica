export function roundGbp(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function computeVatFromExVat(subtotalExVat: number, vatRatePercent: number): number {
  if (!Number.isFinite(subtotalExVat) || subtotalExVat <= 0) return 0;
  const rate = Number.isFinite(vatRatePercent) ? vatRatePercent : 0;
  return roundGbp(subtotalExVat * (rate / 100));
}

export function computeTotalIncVat(subtotalExVat: number, vatRatePercent: number): number {
  return roundGbp(subtotalExVat + computeVatFromExVat(subtotalExVat, vatRatePercent));
}

export function computeUnitIncVat(unitExVat: number, vatRatePercent: number): number {
  return computeTotalIncVat(unitExVat, vatRatePercent);
}
