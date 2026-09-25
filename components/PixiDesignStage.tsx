"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { printBoxesFromSide, type GarmentSide } from "@/lib/garment-template";

function proxied(src?: string) {
  if (!src) return "";
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

function loadHtmlImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("garment image failed"));
    img.src = src;
  });
}

export function PixiDesignStage({
  imageUrl,
  sideTemplate,
  showPrintBox,
  hex,
  children,
}: {
  imageUrl?: string;
  sideTemplate?: GarmentSide;
  showPrintBox?: boolean;
  hex: string;
  children?: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const src = proxied(imageUrl || sideTemplate?.imageUrl);
  const areaKey = sideTemplate?.areas?.length
    ? `${sideTemplate.areas.map((a) => `${a.x},${a.y},${a.w},${a.h}`).join("|")},${sideTemplate.crop?.join("x")},${sideTemplate.imageWidth}x${sideTemplate.imageHeight}`
    : "none";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let app: InstanceType<typeof import("pixi.js").Application> | null = null;

    (async () => {
      try {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const PIXI = await import("pixi.js");
        if (dead || !hostRef.current) return;
        const width = host.clientWidth || 420;
        const ratio =
          sideTemplate?.imageWidth && sideTemplate?.imageHeight
            ? sideTemplate.imageHeight / sideTemplate.imageWidth
            : 1.25;
        const height = Math.round(width * ratio);
        const application = new PIXI.Application();
        await application.init({
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          preference: "webgl",
          resolution: Math.min(2, window.devicePixelRatio || 1),
        });
        if (dead) {
          application.destroy(true);
          return;
        }
        app = application;
        const existing = host.querySelector("canvas");
        if (existing) existing.remove();
        host.appendChild(application.canvas);
        application.canvas.style.width = "100%";
        application.canvas.style.height = "100%";
        application.canvas.style.display = "block";
        application.canvas.style.position = "absolute";
        application.canvas.style.inset = "0";

        const stage = application.stage;
        if (src) {
          try {
            const img = await loadHtmlImage(src);
            if (dead) return;
            const texture = PIXI.Texture.from(img);
            const sprite = new PIXI.Sprite(texture);
            sprite.width = width;
            sprite.height = height;
            stage.addChild(sprite);
          } catch {
            /* HTML img fallback remains visible */
          }
        }

        if (showPrintBox) {
          const g = new PIXI.Graphics();
          for (const box of printBoxesFromSide(sideTemplate)) {
            const bx = box.x * width;
            const by = box.y * height;
            const bw = box.w * width;
            const bh = box.h * height;
            dashRect(g, bx, by, bw, bh, 0xb8b3ac);
            dashLine(g, bx, by + bh / 2, bx + bw, by + bh / 2, 0xb8b3ac);
          }
          stage.addChild(g);
        }
      } catch {
        /* keep the HTML garment photo */
      }
    })();

    return () => {
      dead = true;
      if (app) app.destroy(true);
    };
  }, [src, areaKey, showPrintBox, hex]);

  const ratio =
    sideTemplate?.imageWidth && sideTemplate?.imageHeight
      ? `${sideTemplate.imageWidth} / ${sideTemplate.imageHeight}`
      : "4 / 5";

  return (
    <div className="pixi-stage" ref={hostRef} style={{ aspectRatio: ratio }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : null}
      {children}
    </div>
  );
}

type StrokeGfx = {
  moveTo: (x: number, y: number) => unknown;
  lineTo: (x: number, y: number) => unknown;
  stroke: (style: { width: number; color: number; alpha: number }) => unknown;
};

function dashRect(g: StrokeGfx, x: number, y: number, w: number, h: number, color: number) {
  dashLine(g, x, y, x + w, y, color);
  dashLine(g, x + w, y, x + w, y + h, color);
  dashLine(g, x + w, y + h, x, y + h, color);
  dashLine(g, x, y + h, x, y, color);
}

function dashLine(
  g: StrokeGfx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const step = 7;
  for (let i = 0; i < len; i += step * 2) {
    const t0 = i / len;
    const t1 = Math.min(1, (i + step) / len);
    g.moveTo(x1 + dx * t0, y1 + dy * t0);
    g.lineTo(x1 + dx * t1, y1 + dy * t1);
    g.stroke({ width: 1, color, alpha: 0.95 });
  }
}
