"use client";

import { useMemo, useState } from "react";
import type { GarmentArea, GarmentSide, MeasureLine, PublicGarment } from "@/lib/garment-template";
import {
  chestInFromGarmentWidthMm,
  defaultMeasureLine,
  halfChestMm,
  measureLineLengthPx,
  ppiFromGarmentWidth,
  printMmFromGarment,
  scaleWidthPx,
} from "@/lib/garment-template";
import { PrintBoxEditor } from "@/components/PrintBoxEditor";

function withLine(side: GarmentSide): GarmentSide {
  return side.measureLine ? side : { ...side, measureLine: defaultMeasureLine(side) };
}

function withScale(side: GarmentSide, garmentWidthMm: number): GarmentSide {
  const next = withLine(side);
  return { ...next, pixelsPerInch: ppiFromGarmentWidth(next, garmentWidthMm) };
}

function fallbackArea(): GarmentArea {
  return { x: 40, y: 80, w: 200, h: 240, label: "Box 1" };
}

export function GarmentTemplateForm({
  garment,
  defaultGarmentWidthMm = 508,
}: {
  garment: PublicGarment;
  defaultGarmentWidthMm?: number;
}) {
  const [garmentWidthMm, setGarmentWidthMm] = useState(
    garment.garmentWidthMm && garment.garmentWidthMm > 0 ? garment.garmentWidthMm : defaultGarmentWidthMm,
  );
  const [chestHint, setChestHint] = useState(() =>
    chestInFromGarmentWidthMm(
      garment.garmentWidthMm && garment.garmentWidthMm > 0 ? garment.garmentWidthMm : defaultGarmentWidthMm,
    ),
  );
  const [sides, setSides] = useState(() => {
    const width = garment.garmentWidthMm && garment.garmentWidthMm > 0 ? garment.garmentWidthMm : defaultGarmentWidthMm;
    return garment.sides.map((side) => withScale(side, width));
  });
  const [active, setActive] = useState(0);
  const [activeBox, setActiveBox] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const side = sides[active] ?? sides[0];
  const areas = side?.areas.length ? side.areas : [fallbackArea()];
  const boxIndex = Math.min(activeBox, areas.length - 1);
  const area = areas[boxIndex] ?? fallbackArea();
  const line = side?.measureLine ?? defaultMeasureLine(side);
  const linePx = measureLineLengthPx(line);
  const ppi = ppiFromGarmentWidth(side, garmentWidthMm);
  const sizesMm = useMemo(
    () => areas.map((item) => printMmFromGarment(item, side, garmentWidthMm)),
    [areas, side, garmentWidthMm],
  );
  const mm = sizesMm[boxIndex] ?? { w: 0, h: 0 };
  const inch = { w: mm.w / 25.4, h: mm.h / 25.4 };
  const lineIn = garmentWidthMm / 25.4;
  const mmPerPx = garmentWidthMm / Math.max(scaleWidthPx(side), 1);

  const patchSide = (index: number, next: Partial<GarmentSide>) => {
    setSides((curr) => curr.map((s, i) => (i === index ? withScale({ ...s, ...next }, garmentWidthMm) : s)));
  };

  const applyGarmentWidth = (widthMm: number) => {
    const next = Math.max(widthMm, 1);
    setGarmentWidthMm(next);
    setSides((curr) => curr.map((s) => withScale(s, next)));
  };

  const setAreaAt = (index: number, next: GarmentArea) => {
    if (!side) return;
    const list = areas.map((item, i) => (i === index ? next : item));
    patchSide(active, { areas: list });
  };

  const onMeasureChange = (next: MeasureLine) => {
    patchSide(active, { measureLine: next });
  };

  const onImageSize = (width: number, height: number) => {
    if (!side) return;
    if (side.imageWidth === width && side.imageHeight === height) return;
    const sx = width / Math.max(1, side.imageWidth || width);
    const sy = height / Math.max(1, side.imageHeight || height);
    const scaled = areas.map((item) => ({
      ...item,
      x: item.x * sx,
      y: item.y * sy,
      w: item.w * sx,
      h: item.h * sy,
    }));
    const crop: [number, number, number, number] =
      side.crop && side.crop[2] > side.crop[0]
        ? [side.crop[0] * sx, side.crop[1] * sy, side.crop[2] * sx, side.crop[3] * sy]
        : [0, 0, width, height];
    patchSide(active, {
      imageWidth: width,
      imageHeight: height,
      crop,
      measureLine: {
        x1: line.x1 * sx,
        y1: line.y1 * sy,
        x2: line.x2 * sx,
        y2: line.y2 * sy,
      },
      areas: scaled,
    });
  };

  const setPrintMm = (axis: "w" | "h", value: number) => {
    const nextPx = value / Math.max(mmPerPx, 0.001);
    if (axis === "w") setAreaAt(boxIndex, { ...area, w: nextPx });
    else setAreaAt(boxIndex, { ...area, h: nextPx });
  };

  const addBox = () => {
    const sizePx = 100 / Math.max(mmPerPx, 0.001);
    const imageW = side?.imageWidth || 1200;
    const imageH = side?.imageHeight || 1440;
    const next: GarmentArea = {
      x: Math.min((area.x || 80) + Math.max(area.w, sizePx) + 36, Math.max(0, imageW - sizePx)),
      y: area.y,
      w: area.w || sizePx,
      h: area.h || sizePx,
      label: `Box ${areas.length + 1}`,
    };
    patchSide(active, { areas: [...areas, next] });
    setActiveBox(areas.length);
  };

  const removeBox = () => {
    if (areas.length < 2) return;
    const list = areas.filter((_, i) => i !== boxIndex);
    patchSide(active, { areas: list });
    setActiveBox(Math.max(0, boxIndex - 1));
  };

  const save = async () => {
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/v2/garment/${garment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...garment, sides, garmentWidthMm }),
    });
    setBusy(false);
    setStatus(
      res.ok
        ? `Saved ${sides.reduce((n, s) => n + s.areas.length, 0)} print boxes. Customers can place a logo in each one.`
        : "Could not save.",
    );
  };

  const regenerate = async () => {
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/v2/garment/${garment.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true }),
    });
    const data = (await res.json()) as PublicGarment & { error?: string };
    setBusy(false);
    if (!res.ok || !data.sides) {
      setStatus("Could not regenerate.");
      return;
    }
    const width = data.garmentWidthMm && data.garmentWidthMm > 0 ? data.garmentWidthMm : defaultGarmentWidthMm;
    setGarmentWidthMm(width);
    setChestHint(chestInFromGarmentWidthMm(width));
    setActiveBox(0);
    setSides(data.sides.map((item) => withScale(item, width)));
    setStatus("Reset to the automatic guess. Add more boxes if the customer needs extra logo spots.");
  };

  if (!side) return null;

  return (
    <div className="admin-studio">
      <aside className="admin-card admin-studio__rail">
        <p className="muted">
          Stretch the orange line for scale, then add as many blue print boxes as you need. Customers can put a logo
          in each box.
        </p>

        <div className="box-editor-tabs" role="tablist">
          {sides.map((item, index) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              className={index === active ? "is-on" : ""}
              onClick={() => {
                setActive(index);
                setActiveBox(0);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="scale-ask">
          <p>
            The orange line is “from here to here.” Enter that real width (or fill it from Ralawise to-fit chest).
            Every print box uses this same scale.
          </p>
          <div className="field-grid field-grid--scale">
            <label className="field">
              To-fit chest (in)
              <input
                type="number"
                step="0.5"
                min="10"
                value={Number(chestHint.toFixed(1))}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setChestHint(next);
                  applyGarmentWidth(halfChestMm(next));
                }}
              />
            </label>
            <label className="field">
              This line is (in)
              <input
                type="number"
                step="0.1"
                min="1"
                value={Number(lineIn.toFixed(1))}
                onChange={(e) => applyGarmentWidth(Number(e.target.value) * 25.4)}
              />
            </label>
            <label className="field">
              This line is (mm)
              <input
                type="number"
                step="1"
                min="20"
                value={Math.round(garmentWidthMm)}
                onChange={(e) => applyGarmentWidth(Number(e.target.value))}
              />
            </label>
          </div>
          <p className="tiny">
            Line {linePx.toFixed(0)} px = {lineIn.toFixed(1)}″ / {Math.round(garmentWidthMm)} mm · {mmPerPx.toFixed(2)}{" "}
            mm/px
          </p>
        </div>

        <div className="box-list">
          <p className="tiny">Print boxes on this side</p>
          {areas.map((item, index) => {
            const size = sizesMm[index];
            return (
              <button
                key={`${item.label ?? "box"}-${index}`}
                type="button"
                className={index === boxIndex ? "is-on" : ""}
                onClick={() => setActiveBox(index)}
              >
                {item.label || `Box ${index + 1}`}
                {size ? ` · ${size.w.toFixed(0)}×${size.h.toFixed(0)} mm` : ""}
              </button>
            );
          })}
          <div className="box-list__actions">
            <button type="button" className="btn-ghost" onClick={addBox}>
              Add print box
            </button>
            <button type="button" className="btn-ghost" disabled={areas.length < 2} onClick={removeBox}>
              Remove box
            </button>
          </div>
        </div>

        <label className="field">
          Box name
          <input
            type="text"
            value={area.label || `Box ${boxIndex + 1}`}
            onChange={(e) => setAreaAt(boxIndex, { ...area, label: e.target.value })}
          />
        </label>

        <div className="field-grid">
          <label className="field">
            Print width (mm)
            <input
              type="number"
              step="0.1"
              min="1"
              value={Number(mm.w.toFixed(1))}
              onChange={(e) => setPrintMm("w", Number(e.target.value))}
            />
          </label>
          <label className="field">
            Print height (mm)
            <input
              type="number"
              step="0.1"
              min="1"
              value={Number(mm.h.toFixed(1))}
              onChange={(e) => setPrintMm("h", Number(e.target.value))}
            />
          </label>
          <label className="field">
            Print width (in)
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={Number(inch.w.toFixed(2))}
              onChange={(e) => setPrintMm("w", Number(e.target.value) * 25.4)}
            />
          </label>
          <label className="field">
            Print height (in)
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={Number(inch.h.toFixed(2))}
              onChange={(e) => setPrintMm("h", Number(e.target.value) * 25.4)}
            />
          </label>
          <label className="field">
            pixelsPerInch
            <input type="number" readOnly value={Number(ppi.toFixed(2))} />
          </label>
          {(["x", "y", "w", "h"] as const).map((key) => (
            <label key={key} className="field">
              Box {key} (px)
              <input
                type="number"
                value={Math.round(area[key])}
                onChange={(e) => setAreaAt(boxIndex, { ...area, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>

        <p className="tiny">
          {area.label || `Box ${boxIndex + 1}`}: {mm.w.toFixed(1)} × {mm.h.toFixed(1)} mm · {inch.w.toFixed(2)}″ ×{" "}
          {inch.h.toFixed(2)}″
        </p>
        {status ? <p className="tiny">{status}</p> : null}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save print boxes"}
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={regenerate}>
            Reset automatic guess
          </button>
        </div>
      </aside>

      <div className="admin-studio__canvas">
        <PrintBoxEditor
          imageUrl={side.imageUrl}
          imageWidth={side.imageWidth}
          imageHeight={side.imageHeight}
          areas={areas}
          activeIndex={boxIndex}
          sizesMm={sizesMm}
          measureLine={line}
          measureLabel={`${lineIn.toFixed(1)} in`}
          onChange={setAreaAt}
          onSelect={setActiveBox}
          onMeasureChange={onMeasureChange}
          onImageSize={onImageSize}
        />
        <p className="tiny slot-hint">
          Orange line = garment width. Blue boxes = logo spots ({areas.length} on this side).
        </p>
      </div>
    </div>
  );
}
