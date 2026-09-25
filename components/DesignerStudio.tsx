"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DownloadDesign } from "@/components/DownloadDesign";
import { PixiDesignStage } from "@/components/PixiDesignStage";
import { findSide, printBoxFromSide, printInchesFromSide, type PublicGarment } from "@/lib/garment-template";
import { CLIPART, CLIPART_CATEGORIES, PRINT_COLORS, STUDIO_FONTS, type ClipartItem } from "@/lib/clipart";
import type { CatalogProduct } from "@/lib/catalog";
import { MIN_ORDER_QTY, quoteOrder, formatPricingGbp, type SizeQty } from "@/lib/quote";
import type { RushTier } from "@/lib/pricing/rush-pricing";
import { fallbackGarmentFrame } from "@/lib/placements/garment-frame";
import { printSpecFor, productFaces } from "@/lib/placements/print-spec";
import {
  clampToSlot,
  fillInSlot,
  fitInSlot,
  getLogoSlots,
  getSlotByCode,
  isSlotted,
  nearestSlot,
  objectLayerStyle,
  photoRect,
  slotContaining,
  slotsFromGarmentSide,
  usesChestLogoSlots,
  type LogoSlotCode,
} from "@/lib/placements/logo-slots";

type Obj = {
  id: string;
  type: "text" | "clipart" | "image";
  side: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  text?: string;
  font?: string;
  fill?: string;
  src?: string;
  originalSrc?: string;
  clipartId?: string;
  fileName?: string;
  aspect?: number;
  flipH?: boolean;
  flipV?: boolean;
  removeBg?: boolean;
  outline?: string;
  outlineWidth?: number;
  shadow?: boolean;
  letterSpacing?: number;
  curve?: number;
  distressed?: boolean;
  isNumber?: boolean;
  placementCode?: string;
};

type Corner = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
type DragState =
  | { mode: "move"; id: string; dx: number; dy: number; snapshot: Obj[] }
  | { mode: "resize"; id: string; corner: Corner; start: { x: number; y: number; w: number; h: number }; snapshot: Obj[] }
  | { mode: "rotate"; id: string; cx: number; cy: number; startAngle: number; startRot: number; snapshot: Obj[] };

type Rail = "create" | "order";
type CreateView = "home" | "clipart" | "upload" | "ai" | "templates" | "open";
type Popover = "layer" | "flip" | "zoom" | "colors" | null;

type SavedDesign = {
  id: string;
  name: string;
  productId: number;
  color: string;
  objects: Obj[];
  savedAt: string;
};

const uid = () => Math.random().toString(36).slice(2, 9);
const SAVED_KEY = "bc-saved-designs";

const SIDE_PLACEMENT: Record<string, string> = {
  front: "FRONT",
  back: "BB",
  left: "LS",
  right: "RS",
  cap: "CAP_FRONT",
};

const FONT_STACK: Record<string, string> = {
  Anton: "var(--font-anton), sans-serif",
  Oswald: "var(--font-oswald), sans-serif",
  "Bebas Neue": "var(--font-bebas), sans-serif",
  Pacifico: "var(--font-pacifico), cursive",
  "Permanent Marker": "var(--font-marker), cursive",
  "Playfair Display": "var(--font-playfair), serif",
  Righteous: "var(--font-righteous), sans-serif",
  Lobster: "var(--font-lobster), cursive",
  Inter: "var(--font-sans), sans-serif",
  Georgia: "Georgia, serif",
};

export function DesignerStudio({
  product,
  initialColor,
  designId,
}: {
  product: CatalogProduct;
  initialColor?: string;
  designId?: string;
}) {
  const router = useRouter();
  const [color, setColor] = useState(
    product.colors.find((c) => c.name === initialColor)?.name ?? product.colors[0]?.name ?? "",
  );
  const [side, setSide] = useState(productFaces(product)[0] ?? "front");
  const [objects, setObjects] = useState<Obj[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rail, setRail] = useState<Rail>("create");
  const [createView, setCreateView] = useState<CreateView>("home");
  const [popover, setPopover] = useState<Popover>(null);
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of product.sizes) init[s] = 0;
    const mid = product.sizes.includes("M") ? "M" : product.sizes[0];
    if (mid) init[mid] = MIN_ORDER_QTY;
    return init;
  });
  const [decoration, setDecoration] = useState<"print" | "embroidery">("print");
  const [rush, setRush] = useState<RushTier>("standard");
  const [zoom, setZoom] = useState(1);
  const [past, setPast] = useState<Obj[][]>([]);
  const [future, setFuture] = useState<Obj[][]>([]);
  const [lockAspect, setLockAspect] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dropOver, setDropOver] = useState(false);
  const [clipCat, setClipCat] = useState<string>("Sports");
  const [aiPrompt, setAiPrompt] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatNote, setChatNote] = useState("");
  const [saved, setSaved] = useState<SavedDesign[]>([]);
  const [targetSlot, setTargetSlot] = useState<LogoSlotCode>("FLB");
  const [garment, setGarment] = useState<PublicGarment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const skipClickDeselect = useRef(false);
  const selectedColor = product.colors.find((c) => c.name === color);
  const hex = selectedColor?.hex ?? "#1a1a1a";
  const selected = objects.find((o) => o.id === selectedId) ?? null;
  const sides = productFaces(product);
  const visible = objects.filter((o) => o.side === side);
  const printSpec = printSpecFor(product, side);
  const imageUrl = selectedColor?.imageUrl || product.imageUrl;
  const templateSide = findSide(garment ?? undefined, side);
  const printBox = printBoxFromSide(templateSide);
  const printIn = templateSide ? printInchesFromSide(templateSide) : { w: printSpec.widthIn, h: printSpec.heightIn };

  const toPrintLocal = (nx: number, ny: number) => ({
    x: printBox.w > 0 ? (nx - printBox.x) / printBox.w : nx,
    y: printBox.h > 0 ? (ny - printBox.y) / printBox.h : ny,
  });
  const garmentFrame = fallbackGarmentFrame(product.silhouette);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v2/garment/${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicGarment | null) => {
        if (!cancelled && data?.sides) setGarment(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [product.id]);
  const adminSlots = slotsFromGarmentSide(templateSide, garment?.garmentWidthMm);
  const chestSlots = adminSlots.length ? adminSlots : getLogoSlots(product, side, garmentFrame);
  const chestLocked = chestSlots.length > 0;
  useEffect(() => {
    if (chestSlots.length && !chestSlots.some((slot) => slot.code === targetSlot)) {
      setTargetSlot(chestSlots[0].code);
    }
  }, [chestSlots, targetSlot]);
  const showPrintGuide = chestLocked || visible.length > 0;

  const sizeQuantities: SizeQty[] = product.sizes.map((s) => ({
    size: s,
    quantity: qty[s] ?? 0,
  }));
  const totalQty = sizeQuantities.reduce((n, s) => n + s.quantity, 0);

  const placementCodes = useMemo(() => {
    const used = new Set(
      objects.map((o) => {
        if (o.placementCode) return o.placementCode;
        if (product.silhouette === "cap") return "CAP_FRONT";
        return SIDE_PLACEMENT[o.side] ?? "FRONT";
      }),
    );
    return used.size ? [...used] : product.silhouette === "cap" ? ["CAP_FRONT"] : ["FRONT"];
  }, [objects, product.silhouette]);

  const quote = quoteOrder({
    product,
    colorName: color,
    sizeQuantities,
    placementCodes,
    decoration,
    rushTier: rush,
  });

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const commit = useCallback(
    (next: Obj[]) => {
      setPast((p) => [...p.slice(-30), objects]);
      setFuture([]);
      setObjects(next);
    },
    [objects],
  );

  const updateObject = (id: string, patch: Partial<Obj>) => {
    commit(objects.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const updateSelected = (patch: Partial<Obj>) => {
    if (!selected) return;
    updateObject(selected.id, patch);
  };

  const activeSlot = getSlotByCode(targetSlot, chestSlots) ?? chestSlots[0];

  const placeArtwork = (partial: Partial<Obj> & Pick<Obj, "type">, slotCode = targetSlot): Obj => {
    const aspect = partial.aspect ?? (partial.w && partial.h ? partial.w / Math.max(partial.h, 0.01) : 1);
    if (chestLocked) {
      const slot = getSlotByCode(slotCode, chestSlots) ?? activeSlot ?? chestSlots[0]!;
      return {
        id: uid(),
        side,
        rotation: 0,
        ...partial,
        ...fitInSlot(slot, aspect),
      };
    }
    const obj: Obj = {
      id: uid(),
      side,
      x: 0.08,
      y: 0.05,
      w: 0.84,
      h: 0.2,
      rotation: 0,
      ...partial,
    };
    if (partial.x == null) obj.x = (1 - obj.w) / 2;
    if (partial.y == null) obj.y = 0.05;
    return obj;
  };

  const migrateToSlots = (list: Obj[]) => {
    if (!usesChestLogoSlots(product)) return list;
    return list.map((obj) => {
      if (obj.side !== "front") return obj;
      if (obj.placementCode === "FLB" || obj.placementCode === "FRB") return obj;
      const slot =
        getSlotByCode((obj.x + obj.w / 2) > 0.5 ? "FLB" : "FRB", chestSlots) ?? chestSlots[0]!;
      return { ...obj, ...fitInSlot(slot, obj.aspect || obj.w / Math.max(obj.h, 0.01)) };
    });
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const list = raw ? (JSON.parse(raw) as SavedDesign[]) : [];
      setSaved(list);
      if (designId) {
        const found = list.find((d) => d.id === designId);
        if (found) {
          setObjects(migrateToSlots(found.objects));
          if (found.color) setColor(found.color);
        }
      }
    } catch {
      setSaved([]);
    }
  }, [designId]);

  useEffect(() => {
    const open = () => setChatOpen(true);
    window.addEventListener("bc-live-chat", open);
    return () => window.removeEventListener("bc-live-chat", open);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      const meta = e.metaKey || e.ctrlKey;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        commit(objects.filter((o) => o.id !== selectedId));
        setSelectedId(null);
      }
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (meta && e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        cloneObject(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const addText = (preset?: Partial<Obj>) => {
    const obj = placeArtwork({
      type: "text",
      text: preset?.text ?? "YOUR TEXT",
      font: preset?.font ?? "Anton",
      fill: preset?.fill ?? (hexIsDark(hex) ? "#ffffff" : "#111111"),
      outlineWidth: 0,
      letterSpacing: 0,
      curve: 0,
      aspect: 2.4,
      w: 0.84,
      h: 0.2,
      ...preset,
    });
    commit([...objects, obj]);
    setSelectedId(obj.id);
    setRail("create");
    setCreateView("home");
  };

  const addClipart = (item: ClipartItem) => {
    const obj = placeArtwork({
      type: "clipart",
      fill: hexIsDark(hex) ? "#ffffff" : "#111111",
      src: item.svg,
      clipartId: item.id,
      aspect: 0.44 / 0.36,
    });
    commit([...objects, obj]);
    setSelectedId(obj.id);
    setRail("create");
  };

  const onUpload = (file: File, replaceId?: string) => {
    setUploadError(null);
    const okType =
      /image\/(png|jpeg|jpg|webp|svg\+xml)/i.test(file.type) || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
    if (!okType) {
      setUploadError("Use a PNG, JPG, WebP or SVG file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Keep uploads under 15 MB so they stay sharp on press.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const probe = new window.Image();
      probe.onload = () => {
        const aspect = probe.width / Math.max(1, probe.height);
        if (replaceId) {
          const current = objects.find((o) => o.id === replaceId);
          if (!current) return;
          let w = current.w;
          let h = w / aspect;
          if (h > 0.9) {
            h = current.h;
            w = h * aspect;
          }
          const next = current.placementCode
            ? { ...current, ...clampToSlot(current.x, current.y, w, h) }
            : { w, h };
          updateObject(replaceId, { src, originalSrc: src, fileName: file.name, aspect, ...next, removeBg: false });
          setSelectedId(replaceId);
          return;
        }
        const obj = placeArtwork({
          type: "image",
          src,
          originalSrc: src,
          fileName: file.name,
          aspect,
        });
        commit([...objects, obj]);
        setSelectedId(obj.id);
        setRail("create");
        setLockAspect(!chestLocked);
      };
      probe.onerror = () => setUploadError("That file could not be read. Try a PNG or JPG.");
      probe.src = src;
    };
    reader.readAsDataURL(file);
  };

  const acceptFiles = (files: FileList | File[] | null, replaceId?: string) => {
    const file = files?.[0];
    if (file) onUpload(file, replaceId);
  };

  const removeObject = (id: string) => {
    skipClickDeselect.current = true;
    drag.current = null;
    commit(objects.filter((o) => o.id !== id));
    setSelectedId(null);
  };

  const removeSelected = () => {
    if (!selected) return;
    removeObject(selected.id);
  };

  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setFuture((f) => [...f, objects]);
    setPast((p) => p.slice(0, -1));
    setObjects(prev);
  };

  const redo = () => {
    const next = future[future.length - 1];
    if (!next) return;
    setPast((p) => [...p, objects]);
    setFuture((f) => f.slice(0, -1));
    setObjects(next);
  };

  const centerSelected = (axis: "h" | "v" | "both" = "h") => {
    if (!selected) return;
    const patch: Partial<Obj> = {};
    if (axis === "h" || axis === "both") patch.x = (1 - selected.w) / 2;
    if (axis === "v" || axis === "both") patch.y = (1 - selected.h) / 2;
    updateSelected(clampToSlot(patch.x ?? selected.x, patch.y ?? selected.y, selected.w, selected.h));
    setPopover(null);
  };

  const cloneObject = (obj: Obj) => {
    if (chestLocked && obj.placementCode) {
      const other = chestSlots.find((slot) => slot.code !== obj.placementCode);
      const dest = other ?? getSlotByCode(obj.placementCode, chestSlots)!;
      const copy: Obj = { ...obj, id: uid(), ...fitInSlot(dest, obj.aspect || obj.w / Math.max(obj.h, 0.01)) };
      commit([...objects, copy]);
      setSelectedId(copy.id);
      setTargetSlot(dest.code);
      return;
    }
    const copy: Obj = { ...obj, id: uid(), ...clampToSlot(obj.x + 0.06, obj.y + 0.06, obj.w, obj.h) };
    commit([...objects, copy]);
    setSelectedId(copy.id);
  };

  const moveLayer = (dir: "forward" | "back" | "front" | "back-most") => {
    if (!selected) return;
    const same = objects.map((o, i) => ({ o, i })).filter((x) => x.o.side === selected.side);
    const pos = same.findIndex((x) => x.o.id === selected.id);
    if (pos < 0) return;
    const next = [...objects];
    const from = same[pos].i;
    let to = from;
    if (dir === "forward" && pos < same.length - 1) to = same[pos + 1].i;
    if (dir === "back" && pos > 0) to = same[pos - 1].i;
    if (dir === "front") to = same[same.length - 1].i;
    if (dir === "back-most") to = same[0].i;
    if (to === from) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
    setPopover(null);
  };

  const toggleRemoveBg = async () => {
    if (!selected || selected.type !== "image" || !selected.src) return;
    if (selected.removeBg) {
      updateSelected({ src: selected.originalSrc || selected.src, removeBg: false });
      return;
    }
    const next = await knockOutBackground(selected.originalSrc || selected.src);
    updateObject(selected.id, { src: next, originalSrc: selected.originalSrc || selected.src, removeBg: true });
  };

  const addNumber = () => {
    addText({ text: "00", font: "Bebas Neue", w: 0.5, h: 0.36, x: 0.25, y: 0.28, isNumber: true });
  };

  const addAiArt = () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      flash("Describe the graphic you want.");
      return;
    }
    const match = CLIPART.find(
      (c) => prompt.toLowerCase().includes(c.label.toLowerCase()) || prompt.toLowerCase().includes(c.id),
    );
    if (match) {
      addClipart(match);
      setAiPrompt("");
      return;
    }
    const title = escapeXml(prompt.slice(0, 18).toUpperCase());
    const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="28" fill="currentColor"/><text x="100" y="112" text-anchor="middle" fill="#fff" font-size="18" font-family="sans-serif" font-weight="700">${title}</text></svg>`;
    const obj = placeArtwork({
      type: "clipart",
      fill: hexIsDark(hex) ? "#ffffff" : "#0446d4",
      src: svg,
      clipartId: "ai",
      fileName: prompt,
      aspect: 0.56 / 0.48,
    });
    commit([...objects, obj]);
    setSelectedId(obj.id);
    setAiPrompt("");
    setCreateView("home");
  };

  const applyTemplate = (kind: "team" | "event" | "work") => {
    const fill = hexIsDark(hex) ? "#ffffff" : "#111111";
    const star = CLIPART.find((c) => c.id === "star")!;
    const shield = CLIPART.find((c) => c.id === "shield")!;
    const hardhat = CLIPART.find((c) => c.id === "hardhat")!;
    const art = kind === "work" ? hardhat : kind === "team" ? shield : star;
    const title = kind === "work" ? "CREW" : kind === "team" ? "VARSITY" : "EST. 2026";
    const left = getSlotByCode("FLB", chestSlots) ?? chestSlots[0];
    const right = getSlotByCode("FRB", chestSlots) ?? left;
    const next: Obj[] = objects.filter((o) => o.side !== side).concat(
      chestLocked && left
        ? [
            {
              id: uid(),
              type: "clipart",
              side,
              rotation: 0,
              fill,
              src: art.svg,
              clipartId: art.id,
              aspect: 0.36 / 0.28,
              ...fitInSlot(left, 0.36 / 0.28, right === left ? 0.72 : 0.84),
            },
            {
              id: uid(),
              type: "text",
              side,
              rotation: 0,
              text: title,
              font: "Anton",
              fill,
              aspect: 2.2,
              ...fitInSlot(right, 2.2, right === left ? 0.55 : 0.9),
            },
          ]
        : [
            {
              id: uid(),
              type: "clipart",
              side,
              x: 0.32,
              y: 0.12,
              w: 0.36,
              h: 0.28,
              rotation: 0,
              fill,
              src: art.svg,
              clipartId: art.id,
              aspect: 0.36 / 0.28,
            },
            {
              id: uid(),
              type: "text",
              side,
              x: 0.08,
              y: 0.46,
              w: 0.84,
              h: 0.22,
              rotation: 0,
              text: title,
              font: "Anton",
              fill,
            },
          ],
    );
    commit(next);
    setSelectedId(next[next.length - 1]?.id ?? null);
    setCreateView("home");
  };

  const persistSaved = (list: SavedDesign[]) => {
    setSaved(list);
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  };

  const saveDesign = () => {
    const entry: SavedDesign = {
      id: uid(),
      name: `${product.name} · ${new Date().toLocaleDateString()}`,
      productId: product.id,
      color,
      objects,
      savedAt: new Date().toISOString(),
    };
    persistSaved([entry, ...saved].slice(0, 24));
    flash("Design saved on this device.");
  };

  const openDesign = (entry: SavedDesign) => {
    if (entry.productId !== product.id) {
      router.push(`/designer?productId=${entry.productId}&design=${entry.id}`);
      return;
    }
    commit(migrateToSlots(entry.objects));
    setColor(entry.color);
    setCreateView("home");
    flash("Design opened.");
  };

  const shareDesign = async () => {
    const entry: SavedDesign = {
      id: uid(),
      name: "Shared design",
      productId: product.id,
      color,
      objects,
      savedAt: new Date().toISOString(),
    };
    persistSaved([entry, ...saved].slice(0, 24));
    const url = `${window.location.origin}/designer?productId=${product.id}&design=${entry.id}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Share link copied.");
    } catch {
      flash(url);
    }
  };

  const finishDrag = () => {
    const state = drag.current;
    if (!state) return;
    skipClickDeselect.current = true;
    setSelectedId(state.id);
    const moved = objects.find((o) => o.id === state.id);
    if (moved && isSlotted(moved, chestSlots)) {
      setTargetSlot(moved.placementCode as LogoSlotCode);
    }
    drag.current = null;
    setPast((p) => [...p.slice(-30), state.snapshot]);
    setFuture([]);
  };

  const onPointerDown = (e: React.PointerEvent, obj: Obj) => {
    e.stopPropagation();
    skipClickDeselect.current = true;
    setSelectedId(obj.id);
    setRail("create");
    setCreateView("home");
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    const nx = (e.clientX - box.left) / box.width / zoom;
    const ny = (e.clientY - box.top) / box.height / zoom;
    const rect = photoRect(obj, chestSlots);
    const origin =
      chestLocked && isSlotted(obj, chestSlots)
        ? { x: nx - rect.x, y: ny - rect.y }
        : (() => {
            const local = toPrintLocal(nx, ny);
            return { x: local.x - obj.x, y: local.y - obj.y };
          })();
    drag.current = {
      mode: "move",
      id: obj.id,
      dx: origin.x,
      dy: origin.y,
      snapshot: objects,
    };
    if (isSlotted(obj, chestSlots)) {
      setTargetSlot(obj.placementCode as LogoSlotCode);
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onResizePointerDown = (e: React.PointerEvent, obj: Obj, corner: Corner) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(obj.id);
    drag.current = {
      mode: "resize",
      id: obj.id,
      corner,
      start: { x: obj.x, y: obj.y, w: obj.w, h: obj.h },
      snapshot: objects,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onRotatePointerDown = (e: React.PointerEvent, obj: Obj) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(obj.id);
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;
    const nx = (e.clientX - box.left) / box.width / zoom;
    const ny = (e.clientY - box.top) / box.height / zoom;
    drag.current = {
      mode: "rotate",
      id: obj.id,
      cx,
      cy,
      startAngle: (Math.atan2(ny - cy, nx - cx) * 180) / Math.PI,
      startRot: obj.rotation,
      snapshot: objects,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    const nx = (e.clientX - box.left) / box.width / zoom;
    const ny = (e.clientY - box.top) / box.height / zoom;
    if (state.mode === "move") {
      setObjects((curr) =>
        curr.map((o) => {
          if (o.id !== state.id) return o;
          if (chestLocked && isSlotted(o, chestSlots)) {
            const current = getSlotByCode(o.placementCode, chestSlots)!;
            const photoW = o.w * current.w;
            const photoH = o.h * current.h;
            const photoX = nx - state.dx;
            const photoY = ny - state.dy;
            const dest =
              slotContaining(photoX + photoW / 2, photoY + photoH / 2, chestSlots) ??
              nearestSlot(photoX + photoW / 2, photoY + photoH / 2, chestSlots) ??
              current;
            const nextW = Math.min(photoW / dest.w, 1);
            const nextH = Math.min(photoH / dest.h, 1);
            const boxed = clampToSlot((photoX - dest.x) / dest.w, (photoY - dest.y) / dest.h, nextW, nextH);
            return { ...o, ...boxed, placementCode: dest.code };
          }
          const local = toPrintLocal(nx, ny);
          return { ...o, ...clampToSlot(local.x - state.dx, local.y - state.dy, o.w, o.h) };
        }),
      );
      return;
    }
    if (state.mode === "rotate") {
      const angle = (Math.atan2(ny - state.cy, nx - state.cx) * 180) / Math.PI;
      setObjects((curr) =>
        curr.map((o) => (o.id === state.id ? { ...o, rotation: state.startRot + (angle - state.startAngle) } : o)),
      );
      return;
    }
    setObjects((curr) =>
      curr.map((o) => {
        if (o.id !== state.id) return o;
        const slot = getSlotByCode(o.placementCode, chestSlots);
        if (slot) {
          const sx = (nx - slot.x) / slot.w;
          const sy = (ny - slot.y) / slot.h;
          return applyResize(o, state.corner, sx, sy, state.start, lockAspect, true);
        }
        const local = toPrintLocal(nx, ny);
        return applyResize(o, state.corner, local.x, local.y, state.start, lockAspect, true);
      }),
    );
  };

  const addToCart = () => {
    if (totalQty < MIN_ORDER_QTY) {
      setRail("order");
      flash(`Minimum ${MIN_ORDER_QTY} pieces.`);
      return;
    }
    const item = {
      id: uid(),
      productId: product.id,
      name: product.name,
      brand: product.brand,
      color,
      hex,
      imageUrl: selectedColor?.imageUrl || product.imageUrl,
      silhouette: product.silhouette,
      decoration,
      rush,
      sizeQuantities,
      placementCodes,
      objects,
      quote,
    };
    const raw = localStorage.getItem("bc-cart");
    const cart = raw ? JSON.parse(raw) : [];
    cart.push(item);
    localStorage.setItem("bc-cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("bc-cart"));
    router.push("/cart");
  };

  const slotMm = (slot: { widthIn: number; heightIn: number }) => ({
    w: slot.widthIn * 25.4,
    h: slot.heightIn * 25.4,
  });

  const inchLabel = (obj: Obj) => {
    const slot = getSlotByCode(obj.placementCode, chestSlots);
    if (slot) {
      const size = slotMm(slot);
      return `${Math.round(obj.w * size.w)} × ${Math.round(obj.h * size.h)} mm`;
    }
    const w = Math.max(0.1, obj.w * printIn.w);
    const h = Math.max(0.1, obj.h * printIn.h);
    return `${w.toFixed(1)}" × ${h.toFixed(1)}"`;
  };

  const fillSelectedSlot = () => {
    if (!selected?.placementCode) return;
    const slot = getSlotByCode(selected.placementCode, chestSlots);
    if (!slot) return;
    setLockAspect(false);
    updateSelected(fillInSlot(slot));
  };

  const setSelectedMm = (axis: "w" | "h", mm: number) => {
    if (!selected?.placementCode) return;
    const slot = getSlotByCode(selected.placementCode, chestSlots);
    if (!slot) return;
    const size = slotMm(slot);
    const next = axis === "w" ? mm / Math.max(size.w, 1) : selected.w;
    const nextH = axis === "h" ? mm / Math.max(size.h, 1) : selected.h;
    updateSelected(clampToSlot(selected.x, selected.y, next, nextH));
  };

  const selectedSlot = selected ? getSlotByCode(selected.placementCode, chestSlots) : undefined;
  const selectedSlotSize = selectedSlot ? slotMm(selectedSlot) : { w: 100, h: 100 };

  const editTitle =
    selected?.type === "text" ? (selected.isNumber ? "Edit Number" : "Edit Text") : selected?.type === "clipart" ? "Edit Clipart" : "Edit Image";

  return (
    <div className="studio">
      <nav className="studio-nav" aria-label="Studio">
        <button type="button" className={rail === "order" ? "is-on" : ""} onClick={() => { setRail("order"); setPopover(null); }}>
          <IconOrder />
          Order details
        </button>
        <button
          type="button"
          className={rail === "create" ? "is-on" : ""}
          onClick={() => {
            setRail("create");
            setCreateView("home");
            setPopover(null);
          }}
        >
          <IconCreate />
          Create design
        </button>
      </nav>

      <aside className="studio-card">
        {rail === "order" ? (
          <OrderDetails
            product={product}
            color={color}
            hex={hex}
            qty={qty}
            totalQty={totalQty}
            decoration={decoration}
            rush={rush}
            quote={quote}
            onColor={setColor}
            onQty={setQty}
            onDecoration={setDecoration}
            onRush={setRush}
            onCart={addToCart}
          />
        ) : selected ? (
          <div>
            <div className="studio-card-head">
              <h2>{editTitle}</h2>
              <button type="button" className="icon-x" aria-label="Close" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>
            <div className="edit-tools">
              <button type="button" onClick={() => centerSelected("h")}>
                <IconCenter />
                Center
              </button>
              <div className="edit-pop">
                <button type="button" className={popover === "layer" ? "is-on" : ""} onClick={() => setPopover(popover === "layer" ? null : "layer")}>
                  <IconLayer />
                  Layering
                </button>
                {popover === "layer" ? (
                  <div className="popover">
                    <button type="button" onClick={() => moveLayer("forward")}>Bring forward</button>
                    <button type="button" onClick={() => moveLayer("back")}>Send backward</button>
                    <button type="button" onClick={() => moveLayer("front")}>Bring to front</button>
                    <button type="button" onClick={() => moveLayer("back-most")}>Send to back</button>
                  </div>
                ) : null}
              </div>
              <div className="edit-pop">
                <button
                  type="button"
                  className={popover === "flip" ? "is-on" : ""}
                  onClick={() => {
                    updateSelected({ flipH: !selected.flipH, flipV: false });
                    setPopover(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setPopover(popover === "flip" ? null : "flip");
                  }}
                >
                  <IconFlip />
                  Flip
                </button>
                {popover === "flip" ? (
                  <div className="popover">
                    <button type="button" onClick={() => { updateSelected({ flipH: !selected.flipH, flipV: false }); setPopover(null); }}>
                      Flip horizontal
                    </button>
                    <button type="button" onClick={() => { updateSelected({ flipV: !selected.flipV, flipH: false }); setPopover(null); }}>
                      Flip vertical
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={() => cloneObject(selected)}>
                <IconClone />
                Clone
              </button>
            </div>

            {selected.type === "text" ? (
              <>
                <label className="field">
                  {selected.isNumber ? "Number / name" : "Copy"}
                  <input value={selected.text ?? ""} onChange={(e) => updateSelected({ text: e.target.value })} />
                </label>
                <label className="field">
                  Font
                  <select value={selected.font} onChange={(e) => updateSelected({ font: e.target.value })}>
                    {STUDIO_FONTS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Outline
                  <input
                    type="range"
                    min={0}
                    max={8}
                    value={selected.outlineWidth ?? 0}
                    onChange={(e) => updateSelected({ outlineWidth: Number(e.target.value), outline: selected.outline ?? "#111111" })}
                  />
                </label>
                {(selected.outlineWidth ?? 0) > 0 ? (
                  <label className="field">
                    Outline colour
                    <input type="color" value={selected.outline ?? "#111111"} onChange={(e) => updateSelected({ outline: e.target.value })} />
                  </label>
                ) : null}
                <label className="check">
                  <input type="checkbox" checked={!!selected.shadow} onChange={(e) => updateSelected({ shadow: e.target.checked })} />
                  Shadow
                </label>
                <label className="field">
                  Curve
                  <input type="range" min={-1} max={1} step={0.05} value={selected.curve ?? 0} onChange={(e) => updateSelected({ curve: Number(e.target.value) })} />
                </label>
                <label className="field">
                  Spacing
                  <input type="range" min={-4} max={16} value={selected.letterSpacing ?? 0} onChange={(e) => updateSelected({ letterSpacing: Number(e.target.value) })} />
                </label>
              </>
            ) : selected.type === "image" ? (
              <>
                <button type="button" className="edit-row" onClick={() => replaceInputRef.current?.click()}>
                  <span>Image</span>
                  <span className="edit-row__value">{selected.fileName || "Default (Click to replace)"} ›</span>
                </button>
                <div className="edit-row">
                  <span>Remove Background</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!selected.removeBg}
                    className={`toggle ${selected.removeBg ? "is-on" : ""}`}
                    onClick={toggleRemoveBg}
                  >
                    <span />
                  </button>
                </div>
                <label className="check">
                  <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
                  Keep proportions
                </label>
              </>
            ) : null}

            {selected.placementCode && selectedSlot ? (
              <div className="slot-size">
                <p className="tiny">
                  {selectedSlot.label} is {Math.round(selectedSlotSize.w)} × {Math.round(selectedSlotSize.h)} mm.
                  Stretch the logo or fill the box.
                </p>
                <button type="button" className="btn-ghost" onClick={fillSelectedSlot}>
                  Fill {selectedSlot.label}
                </button>
                <label className="field">
                  Width {Math.round(selected.w * selectedSlotSize.w)} mm
                  <input
                    type="range"
                    min={10}
                    max={Math.max(10, Math.round(selectedSlotSize.w))}
                    value={Math.round(selected.w * selectedSlotSize.w)}
                    onChange={(e) => {
                      setLockAspect(false);
                      setSelectedMm("w", Number(e.target.value));
                    }}
                  />
                </label>
                <label className="field">
                  Height {Math.round(selected.h * selectedSlotSize.h)} mm
                  <input
                    type="range"
                    min={10}
                    max={Math.max(10, Math.round(selectedSlotSize.h))}
                    value={Math.round(selected.h * selectedSlotSize.h)}
                    onChange={(e) => {
                      setLockAspect(false);
                      setSelectedMm("h", Number(e.target.value));
                    }}
                  />
                </label>
              </div>
            ) : null}

            <div className="edit-pop">
              <button type="button" className="edit-row" onClick={() => setPopover(popover === "colors" ? null : "colors")}>
                <span>Colors</span>
                <span className="swatch" style={{ background: selected.fill ?? "#111" }} />
              </button>
              {popover === "colors" ? (
                <div className="popover popover--colors">
                  {PRINT_COLORS.map((c) => (
                    <button key={c} type="button" className="ink" style={{ background: c }} onClick={() => { updateSelected({ fill: c }); setPopover(null); }} />
                  ))}
                  <label className="tiny">
                    Custom
                    <input type="color" value={selected.fill ?? "#111111"} onChange={(e) => updateSelected({ fill: e.target.value })} />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        ) : createView === "clipart" ? (
          <div>
            <div className="studio-card-head">
              <button type="button" className="text-back" onClick={() => setCreateView("home")}>‹ Clipart</button>
            </div>
            <div className="chip-row">
              {CLIPART_CATEGORIES.map((c) => (
                <button key={c} type="button" className={clipCat === c ? "is-on" : ""} onClick={() => setClipCat(c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="clipart-grid">
              {CLIPART.filter((c) => c.category === clipCat).map((c) => (
                <button key={c.id} type="button" onClick={() => addClipart(c)} title={c.label}>
                  <span dangerouslySetInnerHTML={{ __html: c.svg }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : createView === "upload" ? (
          <div>
            <div className="studio-card-head">
              <button type="button" className="text-back" onClick={() => setCreateView("home")}>‹ Upload</button>
            </div>
            <p className="muted">PNG with a transparent background prints cleanest. Aim for 300 DPI at print size.</p>
            <button
              type="button"
              className={`upload-drop ${dropOver ? "is-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
              onDragLeave={() => setDropOver(false)}
              onDrop={(e) => { e.preventDefault(); setDropOver(false); acceptFiles(e.dataTransfer.files); }}
            >
              <strong>{dropOver ? "Drop to add" : "Drag & drop a logo"}</strong>
              <span>or click to browse · PNG, JPG, WebP, SVG · up to 15 MB</span>
            </button>
            {uploadError ? <p className="warn">{uploadError}</p> : null}
          </div>
        ) : createView === "ai" ? (
          <div>
            <div className="studio-card-head">
              <button type="button" className="text-back" onClick={() => setCreateView("home")}>‹ AI Art</button>
            </div>
            <p className="muted">Describe a graphic. We’ll drop a starter you can recolour, flip and resize.</p>
            <label className="field">
              Prompt
              <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="eagle, crew, star…" />
            </label>
            <button type="button" className="btn-primary" onClick={addAiArt}>
              Generate
            </button>
          </div>
        ) : createView === "templates" ? (
          <div>
            <div className="studio-card-head">
              <button type="button" className="text-back" onClick={() => setCreateView("home")}>‹ Browse templates</button>
            </div>
            <div className="template-list">
              <button type="button" onClick={() => applyTemplate("team")}>Team pride</button>
              <button type="button" onClick={() => applyTemplate("event")}>Event / reunion</button>
              <button type="button" onClick={() => applyTemplate("work")}>Work crew</button>
            </div>
          </div>
        ) : createView === "open" ? (
          <div>
            <div className="studio-card-head">
              <button type="button" className="text-back" onClick={() => setCreateView("home")}>‹ Open design</button>
            </div>
            {saved.length === 0 ? <p className="muted">No saved designs on this device yet.</p> : null}
            <div className="template-list">
              {saved.map((d) => (
                <button key={d.id} type="button" onClick={() => openDesign(d)}>
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="studio-card-head">
              <h2>Create design</h2>
            </div>
            {chestLocked ? (
              <p className="tiny">
                Logos stay in the dashed print {chestSlots.length === 1 ? "box" : "boxes"}. Click a box, then upload.
              </p>
            ) : null}
            <div className="create-grid">
              <button type="button" onClick={() => addText()}>
                <span className="tile-icon">T</span>
                Text
              </button>
              <button type="button" onClick={() => setCreateView("clipart")}>
                <IconClipart />
                Clipart
              </button>
              <button type="button" onClick={() => setCreateView("upload")}>
                <IconUpload />
                Upload
              </button>
              <button type="button" onClick={() => setCreateView("ai")}>
                <IconSpark />
                AI Art
              </button>
              <button type="button" onClick={addNumber}>
                <span className="tile-icon">00</span>
                Number
              </button>
              <button
                type="button"
                onClick={() => {
                  const last = [...visible].reverse()[0];
                  if (!last) {
                    flash("Add artwork first, then distress it.");
                    return;
                  }
                  setSelectedId(last.id);
                  updateObject(last.id, { distressed: !last.distressed });
                }}
              >
                <IconDistress />
                Distress
              </button>
            </div>
          </div>
        )}
      </aside>

      <section className="studio-stage-wrap">
        <div className="stage-layout">
          <div className="stage-side">
            <button type="button" className="stage-btn" onClick={undo} disabled={!past.length} aria-label="Undo">
              <IconUndo />
              <span>Undo</span>
            </button>
            <button type="button" className="stage-btn" onClick={redo} disabled={!future.length} aria-label="Redo">
              <IconRedo />
              <span>Redo</span>
            </button>
          </div>

          <div
            className={`studio-stage ${dropOver ? "is-drop" : ""}`}
            ref={stageRef}
            style={{ transform: `scale(${zoom})` }}
            onPointerMove={onPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onClick={(e) => {
              if (skipClickDeselect.current) {
                skipClickDeselect.current = false;
                return;
              }
              if (chestLocked && stageRef.current) {
                const box = stageRef.current.getBoundingClientRect();
                const nx = (e.clientX - box.left) / box.width / zoom;
                const ny = (e.clientY - box.top) / box.height / zoom;
                const hit = slotContaining(nx, ny, chestSlots);
                if (hit) setTargetSlot(hit.code);
              }
              setSelectedId(null);
              setPopover(null);
            }}
            onDragOver={(e) => {
              if (![...e.dataTransfer.types].includes("Files")) return;
              e.preventDefault();
              setDropOver(true);
            }}
            onDragLeave={() => setDropOver(false)}
            onDrop={(e) => {
              if (![...e.dataTransfer.types].includes("Files")) return;
              e.preventDefault();
              setDropOver(false);
              if (chestLocked && stageRef.current) {
                const box = stageRef.current.getBoundingClientRect();
                const nx = (e.clientX - box.left) / box.width / zoom;
                const ny = (e.clientY - box.top) / box.height / zoom;
                const hit = slotContaining(nx, ny, chestSlots) ?? nearestSlot(nx, ny, chestSlots);
                if (hit) setTargetSlot(hit.code);
              }
              acceptFiles(e.dataTransfer.files);
            }}
          >
            <PixiDesignStage
              imageUrl={imageUrl}
              sideTemplate={templateSide}
              showPrintBox={showPrintGuide && !chestLocked}
              hex={hex}
            >
            <div
              className={`print-layer ${chestLocked ? "print-layer--full" : ""} ${showPrintGuide && !chestLocked ? "is-guide" : ""}`}
              style={
                chestLocked
                  ? undefined
                  : {
                      left: `${printBox.x * 100}%`,
                      top: `${printBox.y * 100}%`,
                      width: `${printBox.w * 100}%`,
                      height: `${printBox.h * 100}%`,
                    }
              }
            >
              {chestLocked
                ? chestSlots.map((slot) => (
                    <button
                      key={slot.code}
                      type="button"
                      className={`logo-slot ${targetSlot === slot.code ? "is-target" : ""}`}
                      style={{
                        left: `${slot.x * 100}%`,
                        top: `${slot.y * 100}%`,
                        width: `${slot.w * 100}%`,
                        height: `${slot.h * 100}%`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetSlot(slot.code);
                        setSelectedId(null);
                      }}
                      aria-label={slot.label}
                    />
                  ))
                : null}
              {visible.map((obj) => (
                <div
                  key={obj.id}
                  className={`design-obj ${selectedId === obj.id ? "is-selected" : ""} ${obj.distressed ? "is-distressed" : ""} ${obj.placementCode ? "is-fill" : ""}`}
                  style={{
                    ...objectLayerStyle(obj, chestSlots),
                    color: obj.fill,
                    fontFamily: FONT_STACK[obj.font ?? "Anton"] ?? obj.font,
                    letterSpacing: `${obj.letterSpacing ?? 0}px`,
                    WebkitTextStroke: obj.outlineWidth ? `${obj.outlineWidth}px ${obj.outline}` : undefined,
                    textShadow: obj.shadow ? "3px 3px 0 rgba(0,0,0,.35)" : undefined,
                  }}
                  onPointerDown={(e) => onPointerDown(e, obj)}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="design-obj__art"
                    style={{ transform: `scaleX(${obj.flipH ? -1 : 1}) scaleY(${obj.flipV ? -1 : 1})` }}
                  >
                    {obj.type === "text" ? (
                      <CurvedText text={obj.text ?? ""} curve={obj.curve ?? 0} />
                    ) : obj.type === "clipart" && obj.src ? (
                      <span
                        className="clipart-node"
                        dangerouslySetInnerHTML={{
                          __html: obj.placementCode
                            ? obj.src.replace(/<svg\b/i, '<svg preserveAspectRatio="none"')
                            : obj.src,
                        }}
                      />
                    ) : obj.src ? (
                      <span className="image-node">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={obj.src} alt={obj.fileName || "Uploaded artwork"} draggable={false} />
                        {obj.fill ? <span className="image-tint" style={{ background: obj.fill }} /> : null}
                      </span>
                    ) : null}
                  </div>
                  {selectedId === obj.id ? (
                    <>
                      {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Corner[]).map((corner) => (
                        <button
                          key={corner}
                          type="button"
                          aria-label={`Resize ${corner}`}
                          className={`resize-handle resize-handle--${corner}`}
                          onPointerDown={(e) => onResizePointerDown(e, obj, corner)}
                          onPointerUp={finishDrag}
                          onPointerCancel={finishDrag}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ))}
                      <button
                        type="button"
                        className="sel-rotate"
                        aria-label="Rotate"
                        onPointerDown={(e) => onRotatePointerDown(e, obj)}
                        onPointerUp={finishDrag}
                        onPointerCancel={finishDrag}
                        onClick={(e) => e.stopPropagation()}
                      >
                        R
                      </button>
                      <button
                        type="button"
                        className="sel-delete"
                        aria-label="Delete"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeObject(obj.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      >
                        ×
                      </button>
                      <span className="sel-move" aria-hidden />
                      <span className="sel-size">{inchLabel(obj)}</span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            </PixiDesignStage>
          </div>

          <div className="stage-side">
            <div className="edit-pop">
              <button type="button" className="stage-btn" onClick={() => setPopover(popover === "zoom" ? null : "zoom")}>
                <IconZoom />
                <span>Zoom</span>
              </button>
              {popover === "zoom" ? (
                <div className="popover">
                  <button type="button" onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}>Zoom in</button>
                  <button type="button" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}>Zoom out</button>
                  <button type="button" onClick={() => setZoom(1)}>Fit</button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="stage-btn"
              onClick={() => setSide(sides[(sides.indexOf(side) + 1) % sides.length] ?? "front")}
            >
              <IconRotateView />
              <span>Rotate</span>
            </button>
            <p className="tiny stage-side-label">{side}</p>
          </div>
        </div>
        {chestLocked ? (
          <p className="tiny slot-hint">
            {chestSlots.length === 1
              ? `Artwork stays inside ${chestSlots[0].label}.`
              : `Artwork stays inside ${chestSlots.find((slot) => slot.code === targetSlot)?.label ?? "the selected box"}. Drag to another box to move it.`}
          </p>
        ) : null}

        <div className="studio-bottom">
          <div className="studio-dock">
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setRail("create");
                setCreateView("open");
                setPopover(null);
              }}
            >
              <IconOpen /> Open design
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setRail("create");
                setCreateView("templates");
                setPopover(null);
              }}
            >
              <IconTemplate /> Browse templates
            </button>
            <button type="button" onClick={saveDesign}>
              <IconSave /> Save design
            </button>
            <button type="button" onClick={shareDesign}>
              <IconShare /> Share design
            </button>
            <DownloadDesign
              imageUrl={imageUrl}
              sideTemplate={templateSide}
              objects={objects}
              side={side}
              garmentWidthMm={garment?.garmentWidthMm}
              productName={product.name}
            />
          </div>
          <button type="button" className="get-price" onClick={() => setRail("order")}>
            Get price
          </button>
        </div>
      </section>

      <input
        ref={fileInputRef}
        className="upload-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        className="upload-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
        onChange={(e) => {
          if (selected?.type === "image") acceptFiles(e.target.files, selected.id);
          e.target.value = "";
        }}
      />

      {toast ? <div className="studio-toast">{toast}</div> : null}

      {chatOpen ? (
        <div className="chat-modal" role="dialog">
          <div className="chat-modal__card">
            <div className="studio-card-head">
              <h2>Live Chat</h2>
              <button type="button" className="icon-x" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <p className="muted">Leave a note and we’ll follow up with your order.</p>
            <textarea value={chatNote} onChange={(e) => setChatNote(e.target.value)} rows={4} />
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setChatOpen(false);
                setChatNote("");
                flash("Thanks — we’ll reply with your order.");
              }}
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrderDetails({
  product,
  color,
  hex,
  qty,
  totalQty,
  decoration,
  rush,
  quote,
  onColor,
  onQty,
  onDecoration,
  onRush,
  onCart,
}: {
  product: CatalogProduct;
  color: string;
  hex: string;
  qty: Record<string, number>;
  totalQty: number;
  decoration: "print" | "embroidery";
  rush: RushTier;
  quote: ReturnType<typeof quoteOrder>;
  onColor: (name: string) => void;
  onQty: (fn: (q: Record<string, number>) => Record<string, number>) => void;
  onDecoration: (v: "print" | "embroidery") => void;
  onRush: (v: RushTier) => void;
  onCart: () => void;
}) {
  return (
    <div>
      <div className="studio-card-head">
        <h2>Order details</h2>
      </div>
      <p className="eyebrow">{product.brand}</p>
      <p className="order-title">{product.name}</p>
      <div className="price-box">
        <p className="tiny">Live quote · min {MIN_ORDER_QTY} pieces</p>
        <p className="price-lg">{formatPricingGbp(quote.rush.totalIncVat)}</p>
        <p className="muted">
          {formatPricingGbp(quote.unitIncVat)} each · {totalQty} pcs · inc VAT
        </p>
      </div>
      <div className="color-picker">
        {product.colors.map((c) => (
          <button
            key={c.name}
            type="button"
            title={c.name}
            className={c.name === color ? "is-on" : ""}
            style={{ background: c.hex }}
            onClick={() => onColor(c.name)}
          />
        ))}
      </div>
      <p className="tiny">{color}</p>
      <label className="field">
        Decoration
        <select value={decoration} onChange={(e) => onDecoration(e.target.value as "print" | "embroidery")}>
          <option value="print">Print (DTG)</option>
          <option value="embroidery">Embroidery</option>
        </select>
      </label>
      <p className="muted">Minimum {MIN_ORDER_QTY} pieces for print or embroidery.</p>
      <div className="qty-grid">
        {product.sizes.map((s) => (
          <label key={s}>
            {s}
            <input
              type="number"
              min={0}
              value={qty[s] ?? 0}
              onChange={(e) => onQty((q) => ({ ...q, [s]: Math.max(0, Number(e.target.value) || 0) }))}
            />
          </label>
        ))}
      </div>
      <p className={totalQty < MIN_ORDER_QTY ? "warn" : "muted"}>
        {totalQty} pieces {totalQty < MIN_ORDER_QTY ? `(need ${MIN_ORDER_QTY})` : ""}
      </p>
      <label className="field">
        Delivery
        <select value={rush} onChange={(e) => onRush(e.target.value as RushTier)}>
          <option value="standard">Standard (5+ working days)</option>
          <option value="5_day">Rush 5 day (+15%)</option>
          <option value="3_day">Rush 3 day (+25%)</option>
          <option value="48_hour">Rush 48 hour (+40%)</option>
        </select>
      </label>
      <dl className="price-dl">
        <div>
          <dt>Blanks</dt>
          <dd>{formatPricingGbp(quote.line.blankSubtotalExVat)}</dd>
        </div>
        <div>
          <dt>Decoration</dt>
          <dd>{formatPricingGbp(quote.line.decorationSubtotalExVat)}</dd>
        </div>
        <div>
          <dt>Setup</dt>
          <dd>{formatPricingGbp(quote.line.setupFeeExVat)}</dd>
        </div>
        {quote.rush.rushSurchargeExVat > 0 ? (
          <div>
            <dt>Rush</dt>
            <dd>{formatPricingGbp(quote.rush.rushSurchargeExVat)}</dd>
          </div>
        ) : null}
        <div>
          <dt>VAT</dt>
          <dd>{formatPricingGbp(quote.rush.vatGbp)}</dd>
        </div>
        <div className="total">
          <dt>Total inc VAT</dt>
          <dd>{formatPricingGbp(quote.rush.totalIncVat)}</dd>
        </div>
      </dl>
      <p className="tiny">Colour swatch {hex}</p>
      <button type="button" className="btn-primary" onClick={onCart}>
        Add to cart
      </button>
    </div>
  );
}

function CurvedText({ text, curve }: { text: string; curve: number }) {
  if (!curve) return <span>{text}</span>;
  const chars = [...text];
  return (
    <span className="curved-text">
      {chars.map((ch, i) => {
        const t = chars.length <= 1 ? 0 : i / (chars.length - 1) - 0.5;
        const rot = t * curve * 46;
        const y = Math.abs(t) * Math.abs(curve) * 22;
        return (
          <span
            key={`${i}-${ch}`}
            style={{ display: "inline-block", transform: `translateY(${curve > 0 ? y : -y}px) rotate(${rot}deg)` }}
          >
            {ch === " " ? "\u00a0" : ch}
          </span>
        );
      })}
    </span>
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function applyResize(
  obj: Obj,
  corner: Corner,
  nx: number,
  ny: number,
  start: { x: number; y: number; w: number; h: number },
  lockAspect: boolean,
  lockToSlot = false,
): Obj {
  const min = lockToSlot ? 0.08 : 0.08;
  const max = lockToSlot ? 1 : 1.1;
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const aspect = obj.aspect || start.w / Math.max(start.h, 0.01);
  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;
  const keep = lockAspect && corner !== "n" && corner !== "s" && corner !== "e" && corner !== "w";

  if (corner === "e") {
    w = clamp(nx - start.x, min, max);
  } else if (corner === "w") {
    w = clamp(right - nx, min, max);
    x = right - w;
  } else if (corner === "s") {
    h = clamp(ny - start.y, min, max);
  } else if (corner === "n") {
    h = clamp(bottom - ny, min, max);
    y = bottom - h;
  } else if (corner === "se") {
    w = clamp(nx - start.x, min, max);
    h = keep ? clamp(w / aspect, min, max) : clamp(ny - start.y, min, max);
  } else if (corner === "sw") {
    w = clamp(right - nx, min, max);
    x = right - w;
    h = keep ? clamp(w / aspect, min, max) : clamp(ny - start.y, min, max);
  } else if (corner === "ne") {
    w = clamp(nx - start.x, min, max);
    if (keep) {
      h = clamp(w / aspect, min, max);
      y = bottom - h;
    } else {
      h = clamp(bottom - ny, min, max);
      y = bottom - h;
    }
  } else {
    w = clamp(right - nx, min, max);
    x = right - w;
    if (keep) {
      h = clamp(w / aspect, min, max);
      y = bottom - h;
    } else {
      h = clamp(bottom - ny, min, max);
      y = bottom - h;
    }
  }

  if (lockToSlot) {
    const boxed = clampToSlot(x, y, w, h);
    return { ...obj, ...boxed };
  }
  return { ...obj, x, y, w, h };
}

function hexIsDark(hex: string) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function knockOutBackground(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        if (brightness > 232 && max - min < 30) d[i + 3] = 0;
        else if (brightness > 205) d[i + 3] = Math.round(d[i + 3] * Math.max(0, (235 - brightness) / 30));
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

function IconOrder() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconCreate() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}
function IconCenter() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4 12h16M12 4v16M8 8h8M8 16h8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconLayer() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M12 4 20 8l-8 4-8-4 8-4zm-8 8 8 4 8-4M4 16l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconFlip() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M8 6 3 12l5 6V6zm8 0v12l5-6-5-6zM12 4v16" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconClone() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="4" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconClipart() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <circle cx="8" cy="9" r="3" fill="currentColor" />
      <rect x="13" y="6" width="7" height="7" rx="1" fill="currentColor" />
      <path d="M5 18 12 12l7 6H5z" fill="currentColor" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M12 16V6M8 10l4-4 4 4M5 18h14" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2z" fill="currentColor" />
    </svg>
  );
}
function IconDistress() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path d="M4 16c4-8 12-8 16 0M6 10c3-4 9-4 12 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconUndo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M8 8H4v4M4 12a8 8 0 1 0 2-5.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconRedo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M16 8h4v4M20 12a8 8 0 1 1-2-5.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconZoom() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 8v6M8 11h6M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconRotateView() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.2-5.5M20 5v5h-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconOpen() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M4 20V8l4-4h8v4M4 20h16V8H12" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconTemplate() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconSave() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M5 5h11l3 3v11H5zM8 5v5h8" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="6" cy="12" r="2.2" fill="currentColor" />
      <circle cx="17" cy="6" r="2.2" fill="currentColor" />
      <circle cx="17" cy="18" r="2.2" fill="currentColor" />
      <path d="M8 11 15 7M8 13l7 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
