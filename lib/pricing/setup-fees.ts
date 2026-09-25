export function resolvePrintSetupFeeExVat(printSetupFeeGbp: number): number {
  if (!Number.isFinite(printSetupFeeGbp) || printSetupFeeGbp < 0) return 0;
  return printSetupFeeGbp;
}

export function resolveEmbroideryDigitisingFeeExVat(feeGbp: number | null | undefined): number {
  if (feeGbp == null || !Number.isFinite(feeGbp) || feeGbp < 0) return 0;
  return feeGbp;
}
