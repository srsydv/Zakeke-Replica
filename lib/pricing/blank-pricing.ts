export function applyGlobalMarkupExVat(
  wholesaleUnitExVat: number,
  markupPercent: number,
): number {
  if (!Number.isFinite(wholesaleUnitExVat) || wholesaleUnitExVat < 0) return 0;
  const markup = Number.isFinite(markupPercent) ? markupPercent : 0;
  return wholesaleUnitExVat * (1 + markup / 100);
}

export function applyBaseGarmentMarkupExVat(
  wholesaleUnitExVat: number,
  baseGarmentMarkupPercent: number,
): number {
  return applyGlobalMarkupExVat(wholesaleUnitExVat, baseGarmentMarkupPercent);
}
