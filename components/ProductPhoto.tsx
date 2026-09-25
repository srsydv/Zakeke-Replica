"use client";

import { useState, type CSSProperties } from "react";
import { GarmentMockup, type Silhouette } from "@/components/GarmentMockup";
import { getLogoSlots } from "@/lib/placements/logo-slots";
import type { PrintSpec } from "@/lib/placements/print-spec";
import { useGarmentLayout } from "@/lib/placements/use-garment-frame";

export function ProductPhoto({
  src,
  hex,
  silhouette,
  shop,
  alt,
  showPrintBox,
  chestSlots,
  side,
  printSpec,
  className,
  savedPrintBox,
  cropStyle,
}: {
  src?: string;
  hex: string;
  silhouette?: Silhouette;
  shop?: string;
  alt: string;
  showPrintBox?: boolean;
  chestSlots?: boolean;
  side?: string;
  printSpec?: PrintSpec;
  className?: string;
  savedPrintBox?: { x: number; y: number; w: number; h: number };
  cropStyle?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const needLayout = !savedPrintBox && Boolean(showPrintBox || chestSlots);
  const layout = useGarmentLayout(src, silhouette, side ?? "front", needLayout, printSpec);
  const printBox = savedPrintBox ?? layout.printBox;
  const frame = layout.frame;
  const slots = getLogoSlots({ shop, silhouette }, side ?? "front", frame);
  const useSlots = Boolean(showPrintBox) && (slots.length > 0 || chestSlots);

  if (!src || failed) {
    return (
      <GarmentMockup
        hex={hex}
        silhouette={silhouette}
        showPrintBox={showPrintBox}
        chestSlots={useSlots}
        side={side}
        className={className}
      />
    );
  }
  return (
    <div className={`product-photo ${cropStyle ? "is-cropped" : ""} ${className ?? ""}`}>
      {/* Ralawise CDN colour / lifestyle stills */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onError={() => setFailed(true)} style={cropStyle} />
      {showPrintBox && slots.length ? (
        <div className="photo-logo-slots" aria-hidden>
          {slots.map((slot) => (
            <span
              key={slot.code}
              className="logo-slot"
              style={{
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.w * 100}%`,
                height: `${slot.h * 100}%`,
              }}
            />
          ))}
        </div>
      ) : showPrintBox ? (
        <div
          className="photo-print-box"
          aria-hidden
          style={{
            left: `${printBox.x * 100}%`,
            top: `${printBox.y * 100}%`,
            width: `${printBox.w * 100}%`,
            height: `${printBox.h * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}
