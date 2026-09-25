"use client";

import { useEffect, useState } from "react";
import {
  detectGarmentLayout,
  fallbackGarmentLayout,
  type GarmentFrame,
  type GarmentLayout,
} from "@/lib/placements/garment-frame";
import { printSpecFor, type PrintSpec } from "@/lib/placements/print-spec";

export function useGarmentLayout(
  src: string | undefined,
  silhouette?: string,
  side = "front",
  enabled = true,
  spec?: PrintSpec,
): GarmentLayout {
  const resolved = spec ?? printSpecFor({ silhouette }, side);
  const fallback = fallbackGarmentLayout(silhouette, side, resolved);
  const [layout, setLayout] = useState<GarmentLayout>(fallback);

  useEffect(() => {
    setLayout(fallback);
    if (!enabled || !src) return;
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const detected = readLayout(img, silhouette, side, resolved) ?? fallback;
      if (!cancelled) setLayout(detected);
    };
    img.onerror = () => {
      if (!cancelled) setLayout(fallback);
    };
    img.src = proxiedImageSrc(src);
    return () => {
      cancelled = true;
    };
    // fallback fields are derived from silhouette + side + spec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, silhouette, side, enabled, resolved.widthIn, resolved.heightIn, resolved.kind]);

  return layout;
}

export function useGarmentFrame(
  src: string | undefined,
  silhouette?: string,
  side = "front",
  enabled = true,
  spec?: PrintSpec,
): GarmentFrame {
  return useGarmentLayout(src, silhouette, side, enabled, spec).frame;
}

function proxiedImageSrc(src: string) {
  if (src.startsWith("/")) return src;
  try {
    const host = new URL(src).hostname;
    if (host === "cdn.pimber.ly" || host.endsWith(".pimber.ly")) {
      return `/api/garment-image?url=${encodeURIComponent(src)}`;
    }
  } catch {
    return src;
  }
  return src;
}

function readLayout(
  img: HTMLImageElement,
  silhouette?: string,
  side = "front",
  spec?: PrintSpec,
): GarmentLayout | null {
  try {
    const maxW = 220;
    const scale = Math.min(1, maxW / Math.max(1, img.naturalWidth));
    const w = Math.max(8, Math.round(img.naturalWidth * scale));
    const h = Math.max(8, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return detectGarmentLayout(ctx.getImageData(0, 0, w, h), silhouette, side, spec);
  } catch {
    return null;
  }
}
