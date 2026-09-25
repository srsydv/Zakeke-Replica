"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { GarmentArea, MeasureLine } from "@/lib/garment-template";

type BoxHandle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type MeasureHandle = "start" | "end" | "move";
type Drag =
  | { kind: "box"; index: number; handle: BoxHandle; start: GarmentArea; px: number; py: number }
  | { kind: "measure"; handle: MeasureHandle; start: MeasureLine; px: number; py: number };

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

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function clampArea(area: GarmentArea, imageW: number, imageH: number): GarmentArea {
  const min = 16;
  const w = clamp(area.w, min, imageW);
  const h = clamp(area.h, min, imageH);
  return {
    ...area,
    x: clamp(area.x, 0, Math.max(0, imageW - w)),
    y: clamp(area.y, 0, Math.max(0, imageH - h)),
    w,
    h,
  };
}

function clampPoint(x: number, y: number, imageW: number, imageH: number) {
  return { x: clamp(x, 0, imageW), y: clamp(y, 0, imageH) };
}

type AlignGuide = { axis: "x" | "y"; at: number; from: number; to: number; label?: string };

const SNAP = 12;

function edges(box: GarmentArea) {
  return {
    left: box.x,
    right: box.x + box.w,
    top: box.y,
    bottom: box.y + box.h,
    cx: box.x + box.w / 2,
    cy: box.y + box.h / 2,
  };
}

function snapToOthers(box: GarmentArea, others: GarmentArea[], imageW: number, imageH: number): GarmentArea {
  let next = { ...box };
  for (const other of others) {
    const a = edges(next);
    const b = edges(other);
    if (Math.abs(next.w - other.w) <= SNAP) next.w = other.w;
    if (Math.abs(next.h - other.h) <= SNAP) next.h = other.h;
    if (Math.abs(a.top - b.top) <= SNAP) next.y = b.top;
    else if (Math.abs(a.cy - b.cy) <= SNAP) next.y = b.cy - next.h / 2;
    else if (Math.abs(a.bottom - b.bottom) <= SNAP) next.y = b.bottom - next.h;
    if (Math.abs(a.left - b.left) <= SNAP) next.x = b.left;
    else if (Math.abs(a.cx - b.cx) <= SNAP) next.x = b.cx - next.w / 2;
    else if (Math.abs(a.right - b.right) <= SNAP) next.x = b.right - next.w;
  }
  return clampArea(next, imageW, imageH);
}

function alignmentGuides(boxes: GarmentArea[], activeIndex: number): AlignGuide[] {
  const active = boxes[activeIndex];
  if (!active) return [];
  const a = edges(active);
  const guides: AlignGuide[] = [];
  const close = (p: number, q: number) => Math.abs(p - q) <= 1.5;
  boxes.forEach((other, index) => {
    if (index === activeIndex) return;
    const b = edges(other);
    const left = Math.min(a.left, b.left);
    const right = Math.max(a.right, b.right);
    const top = Math.min(a.top, b.top);
    const bottom = Math.max(a.bottom, b.bottom);
    if (close(a.top, b.top)) guides.push({ axis: "y", at: b.top, from: left, to: right, label: "Top aligned" });
    if (close(a.cy, b.cy)) guides.push({ axis: "y", at: b.cy, from: left, to: right, label: "Center aligned" });
    if (close(a.bottom, b.bottom)) guides.push({ axis: "y", at: b.bottom, from: left, to: right, label: "Bottom aligned" });
    if (close(a.left, b.left)) guides.push({ axis: "x", at: b.left, from: top, to: bottom });
    if (close(a.cx, b.cx)) guides.push({ axis: "x", at: b.cx, from: top, to: bottom });
    if (close(a.right, b.right)) guides.push({ axis: "x", at: b.right, from: top, to: bottom });
  });
  return guides;
}

function clampLine(line: MeasureLine, imageW: number, imageH: number): MeasureLine {
  const a = clampPoint(line.x1, line.y1, imageW, imageH);
  const b = clampPoint(line.x2, line.y2, imageW, imageH);
  if (Math.hypot(b.x - a.x, b.y - a.y) < 8) {
    const x2 = clamp(a.x + 8, 0, imageW);
    return { x1: a.x, y1: a.y, x2, y2: a.y };
  }
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

export function PrintBoxEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  areas,
  activeIndex,
  aspect,
  sizesMm,
  measureLine,
  measureLabel,
  onChange,
  onSelect,
  onMeasureChange,
  onImageSize,
}: {
  imageUrl?: string;
  imageWidth: number;
  imageHeight: number;
  areas: GarmentArea[];
  activeIndex: number;
  aspect?: number;
  sizesMm?: Array<{ w: number; h: number }>;
  measureLine?: MeasureLine;
  measureLabel?: string;
  onChange: (index: number, area: GarmentArea) => void;
  onSelect?: (index: number) => void;
  onMeasureChange?: (line: MeasureLine) => void;
  onImageSize?: (width: number, height: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [failed, setFailed] = useState(false);
  const src = proxied(imageUrl);
  const imageW = Math.max(1, imageWidth);
  const imageH = Math.max(1, imageHeight);
  const boxes = areas.map((area) => clampArea(area, imageW, imageH));
  const guides = alignmentGuides(boxes, activeIndex);
  const line = measureLine ? clampLine(measureLine, imageW, imageH) : undefined;
  const ratio = `${imageW} / ${imageH}`;

  const toImage = (clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / Math.max(1, r.width)) * imageW,
      y: ((clientY - r.top) / Math.max(1, r.height)) * imageH,
    };
  };

  const applyHandle = (handle: BoxHandle, start: GarmentArea, mx: number, my: number): GarmentArea => {
    const min = 16;
    const right = start.x + start.w;
    const bottom = start.y + start.h;
    let x = start.x;
    let y = start.y;
    let w = start.w;
    let h = start.h;
    const ratioIn = aspect && aspect > 0.05 ? aspect : undefined;

    if (handle === "move") {
      return clampArea({ ...start, x: mx, y: my, w: start.w, h: start.h }, imageW, imageH);
    }
    if (handle === "e") w = clamp(mx - start.x, min, imageW - start.x);
    if (handle === "w") {
      w = clamp(right - mx, min, right);
      x = right - w;
    }
    if (handle === "s") h = clamp(my - start.y, min, imageH - start.y);
    if (handle === "n") {
      h = clamp(bottom - my, min, bottom);
      y = bottom - h;
    }
    if (handle === "se") {
      w = clamp(mx - start.x, min, imageW - start.x);
      h = ratioIn ? w / ratioIn : clamp(my - start.y, min, imageH - start.y);
    }
    if (handle === "sw") {
      w = clamp(right - mx, min, right);
      x = right - w;
      h = ratioIn ? w / ratioIn : clamp(my - start.y, min, imageH - start.y);
    }
    if (handle === "ne") {
      w = clamp(mx - start.x, min, imageW - start.x);
      if (ratioIn) {
        h = w / ratioIn;
        y = bottom - h;
      } else {
        h = clamp(bottom - my, min, bottom);
        y = bottom - h;
      }
    }
    if (handle === "nw") {
      w = clamp(right - mx, min, right);
      x = right - w;
      if (ratioIn) {
        h = w / ratioIn;
        y = bottom - h;
      } else {
        h = clamp(bottom - my, min, bottom);
        y = bottom - h;
      }
    }
    return clampArea({ ...start, x, y, w, h }, imageW, imageH);
  };

  const applyMeasure = (handle: MeasureHandle, start: MeasureLine, mx: number, my: number): MeasureLine => {
    if (handle === "start") return clampLine({ ...start, x1: mx, y1: my }, imageW, imageH);
    if (handle === "end") return clampLine({ ...start, x2: mx, y2: my }, imageW, imageH);
    const dx = mx - start.x1;
    const dy = my - start.y1;
    return clampLine(
      { x1: start.x1 + dx, y1: start.y1 + dy, x2: start.x2 + dx, y2: start.y2 + dy },
      imageW,
      imageH,
    );
  };

  const onBoxDown = (index: number, handle: BoxHandle) => (e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const box = boxes[index];
    if (!box) return;
    onSelect?.(index);
    const p = toImage(e.clientX, e.clientY);
    drag.current = {
      kind: "box",
      index,
      handle,
      start: box,
      px: p.x - box.x,
      py: p.y - box.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMeasureDown = (handle: MeasureHandle) => (e: PointerEvent<HTMLElement>) => {
    if (!line) return;
    e.preventDefault();
    e.stopPropagation();
    const p = toImage(e.clientX, e.clientY);
    drag.current = {
      kind: "measure",
      handle,
      start: line,
      px: p.x - line.x1,
      py: p.y - line.y1,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const p = toImage(e.clientX, e.clientY);
    if (state.kind === "box") {
      const raw =
        state.handle === "move"
          ? applyHandle("move", state.start, p.x - state.px, p.y - state.py)
          : applyHandle(state.handle, state.start, p.x, p.y);
      const others = boxes.filter((_, i) => i !== state.index);
      onChange(state.index, others.length ? snapToOthers(raw, others, imageW, imageH) : raw);
      return;
    }
    const next =
      state.handle === "move"
        ? applyMeasure("move", state.start, p.x - state.px, p.y - state.py)
        : applyMeasure(state.handle, state.start, p.x, p.y);
    onMeasureChange?.(next);
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  if (!src || failed) {
    return <p className="tiny">No product photo for this side — use the number fields.</p>;
  }

  const x1 = line ? (line.x1 / imageW) * 100 : 0;
  const y1 = line ? (line.y1 / imageH) * 100 : 0;
  const x2 = line ? (line.x2 / imageW) * 100 : 0;
  const y2 = line ? (line.y2 / imageH) * 100 : 0;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <div className="studio-stage box-editor-stage">
      <div
        ref={stageRef}
        className="pixi-stage"
        style={{ aspectRatio: ratio }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              onImageSize?.(img.naturalWidth, img.naturalHeight);
            }
          }}
          onError={() => setFailed(true)}
        />

        {line ? (
          <div className="measure-line">
            <svg className="measure-line__svg" viewBox={`0 0 ${imageW} ${imageH}`} preserveAspectRatio="none">
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                className="measure-line__stroke"
              />
            </svg>
            <button
              type="button"
              className="measure-line__rail"
              style={{
                left: `${Math.min(x1, x2)}%`,
                top: `${(y1 + y2) / 2}%`,
                width: `${Math.max(Math.abs(x2 - x1), 1.2)}%`,
              }}
              aria-label="Move width line"
              onPointerDown={onMeasureDown("move")}
            />
            <span className="measure-line__label" style={{ left: `${midX}%`, top: `${midY}%` }}>
              {measureLabel ?? "Width"}
            </span>
            <i
              className="measure-line__end"
              style={{ left: `${x1}%`, top: `${y1}%` }}
              onPointerDown={onMeasureDown("start")}
            />
            <i
              className="measure-line__end"
              style={{ left: `${x2}%`, top: `${y2}%` }}
              onPointerDown={onMeasureDown("end")}
            />
          </div>
        ) : null}

        {guides.map((guide, index) => (
          <div
            key={`${guide.axis}-${guide.at}-${index}`}
            className={`align-guide align-guide--${guide.axis}`}
            style={
              guide.axis === "y"
                ? {
                    top: `${(guide.at / imageH) * 100}%`,
                    left: `${(guide.from / imageW) * 100}%`,
                    width: `${((guide.to - guide.from) / imageW) * 100}%`,
                  }
                : {
                    left: `${(guide.at / imageW) * 100}%`,
                    top: `${(guide.from / imageH) * 100}%`,
                    height: `${((guide.to - guide.from) / imageH) * 100}%`,
                  }
            }
          >
            {guide.label ? <span>{guide.label}</span> : null}
          </div>
        ))}

        {boxes.map((box, index) => {
          const size = sizesMm?.[index];
          const on = index === activeIndex;
          return (
            <div
              key={index}
              className={`box-editor__box ${on ? "is-on" : "is-dim"}`}
              style={{
                left: `${(box.x / imageW) * 100}%`,
                top: `${(box.y / imageH) * 100}%`,
                width: `${(box.w / imageW) * 100}%`,
                height: `${(box.h / imageH) * 100}%`,
              }}
              onPointerDown={onBoxDown(index, "move")}
            >
              <span className="box-editor__label">
                {box.label || `Box ${index + 1}`}
                {size ? ` · ${size.w.toFixed(0)} × ${size.h.toFixed(0)} mm` : ""}
              </span>
              {on
                ? (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as BoxHandle[]).map((handle) => (
                    <i
                      key={handle}
                      className={`box-editor__handle box-editor__handle--${handle}`}
                      onPointerDown={onBoxDown(index, handle)}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
