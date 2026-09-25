"use client";

import { useState } from "react";
import type { DesignObj } from "@/lib/design";
import type { GarmentSide } from "@/lib/garment-template";
import {
  downloadBlob,
  pngBlobToPdf,
  renderGarmentPng,
  renderPrintBoxPng,
} from "@/lib/export-design";
import { slotsFromGarmentSide } from "@/lib/placements/logo-slots";

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "design";
}

export function DownloadDesign({
  imageUrl,
  sideTemplate,
  objects,
  side,
  garmentWidthMm,
  productName,
}: {
  imageUrl?: string;
  sideTemplate?: GarmentSide;
  objects: DesignObj[];
  side: string;
  garmentWidthMm?: number;
  productName?: string;
}) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `${slug(productName || "garment")}-${side}`;

  const run = async (format: "png" | "pdf") => {
    setBusy(format);
    setError(null);
    try {
      const png = await renderGarmentPng({ imageUrl, sideTemplate, objects, side, garmentWidthMm });
      if (format === "png") {
        downloadBlob(png, `${base}.png`);
      } else {
        const bmp = await createImageBitmap(png);
        downloadBlob(await pngBlobToPdf(png, bmp.width, bmp.height), `${base}.pdf`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export.");
    }
    setBusy(null);
  };

  return (
    <div className="download-design">
      <button type="button" className="btn-ghost" disabled={Boolean(busy)} onClick={() => run("png")}>
        <IconDownload />
        {busy === "png" ? "Making PNG…" : "Download PNG"}
      </button>
      <button type="button" className="btn-ghost" disabled={Boolean(busy)} onClick={() => run("pdf")}>
        <IconDownload />
        {busy === "pdf" ? "Making PDF…" : "Download PDF"}
      </button>
      {error ? <p className="tiny">{error}</p> : null}
    </div>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M12 4v10M8 10l4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function DownloadPrintFiles({
  objects,
  side,
  sideTemplate,
  garmentWidthMm,
  productName,
}: {
  objects: DesignObj[];
  side: string;
  sideTemplate?: GarmentSide;
  garmentWidthMm?: number;
  productName?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const slots = slotsFromGarmentSide(sideTemplate, garmentWidthMm).filter((slot) =>
    objects.some((obj) => obj.side === side && obj.placementCode === slot.code),
  );
  if (!slots.length) return null;

  return (
    <div className="download-design">
      {slots.map((slot) => (
        <button
          key={slot.code}
          type="button"
          className="btn-ghost"
          disabled={Boolean(busy)}
          onClick={async () => {
            setBusy(slot.code);
            try {
              const png = await renderPrintBoxPng({ objects, side, slot });
              downloadBlob(png, `${slug(productName || "print")}-${slug(slot.label)}.png`);
            } catch {
              /* ignore */
            }
            setBusy(null);
          }}
        >
          {busy === slot.code ? "Making file…" : `Print file · ${slot.label}`}
        </button>
      ))}
    </div>
  );
}
