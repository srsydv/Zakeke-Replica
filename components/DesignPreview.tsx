"use client";

import { ProductPhoto } from "@/components/ProductPhoto";
import { FONT_STACK, type DesignObj } from "@/lib/design";
import type { Silhouette } from "@/components/GarmentMockup";
import { printBoxFromSide, type GarmentSide } from "@/lib/garment-template";
import { getLogoSlots, objectLayerStyle, slotsFromGarmentSide, usesSlotCoords } from "@/lib/placements/logo-slots";
import { printSpecFor } from "@/lib/placements/print-spec";
import { useGarmentLayout } from "@/lib/placements/use-garment-frame";

export function DesignPreview({
  src,
  hex,
  silhouette,
  shop,
  name,
  alt,
  objects,
  side = "front",
  showPrintBox = true,
  savedPrintBox,
  sideTemplate,
}: {
  src?: string;
  hex: string;
  silhouette?: string;
  shop?: string;
  name?: string;
  alt: string;
  objects: DesignObj[];
  side?: string;
  showPrintBox?: boolean;
  savedPrintBox?: { x: number; y: number; w: number; h: number };
  sideTemplate?: GarmentSide;
}) {
  const visible = objects.filter((o) => o.side === side);
  const printSpec = printSpecFor({ shop, silhouette, name }, side);
  const layout = useGarmentLayout(src, silhouette, side, !savedPrintBox && !sideTemplate, printSpec);
  const printBox = sideTemplate ? printBoxFromSide(sideTemplate) : savedPrintBox ?? layout.printBox;
  const frame = layout.frame;
  const adminSlots = slotsFromGarmentSide(sideTemplate);
  const slots = adminSlots.length ? adminSlots : getLogoSlots({ shop, silhouette }, side, frame);
  const slotted = usesSlotCoords(visible, slots);
  return (
    <div className="design-preview">
      <ProductPhoto
        src={src}
        hex={hex}
        silhouette={silhouette as Silhouette | undefined}
        shop={shop}
        alt={alt}
        showPrintBox={showPrintBox}
        chestSlots={slotted || undefined}
        side={side}
        printSpec={printSpec}
        savedPrintBox={printBox}
      />
      <div
        className={`print-layer ${slotted ? "print-layer--full" : ""} ${showPrintBox && !slotted ? "is-guide" : ""}`}
        style={
          slotted
            ? undefined
            : {
                left: `${printBox.x * 100}%`,
                top: `${printBox.y * 100}%`,
                width: `${printBox.w * 100}%`,
                height: `${printBox.h * 100}%`,
              }
        }
      >
        {visible.map((obj) => (
          <div
            key={obj.id}
            className={`design-obj ${obj.distressed ? "is-distressed" : ""} ${obj.placementCode ? "is-fill" : ""}`}
            style={{
              ...objectLayerStyle(obj, slots),
              color: obj.fill,
              fontFamily: FONT_STACK[obj.font ?? "Anton"] ?? obj.font,
            }}
          >
            <div
              className="design-obj__art"
              style={{ transform: `scaleX(${obj.flipH ? -1 : 1}) scaleY(${obj.flipV ? -1 : 1})` }}
            >
              {obj.type === "text" ? (
                <span>{obj.text}</span>
              ) : obj.type === "clipart" && obj.src ? (
                <span className="clipart-node" dangerouslySetInnerHTML={{ __html: obj.src }} />
              ) : obj.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={obj.src} alt={obj.fileName || "Artwork"} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArtworkOnly({ obj }: { obj: DesignObj }) {
  return (
    <div
      className="artwork-only"
      style={{
        color: obj.fill,
        fontFamily: FONT_STACK[obj.font ?? "Anton"] ?? obj.font,
        transform: `rotate(${obj.rotation}deg) scaleX(${obj.flipH ? -1 : 1}) scaleY(${obj.flipV ? -1 : 1})`,
      }}
    >
      {obj.type === "text" ? (
        <span>{obj.text}</span>
      ) : obj.type === "clipart" && obj.src ? (
        <span className="clipart-node" dangerouslySetInnerHTML={{ __html: obj.src }} />
      ) : obj.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={obj.src} alt={obj.fileName || "Artwork"} />
      ) : (
        <span className="tiny">No file</span>
      )}
    </div>
  );
}
