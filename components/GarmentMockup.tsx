import type { CSSProperties } from "react";

export type Silhouette =
  | "tee"
  | "hoodie"
  | "polo"
  | "jacket"
  | "cap"
  | "bag"
  | "bottoms"
  | "vest";

type Props = {
  hex: string;
  silhouette?: Silhouette;
  className?: string;
  showPrintBox?: boolean;
  chestSlots?: boolean;
  side?: string;
};

export function GarmentMockup({
  hex,
  silhouette = "tee",
  className,
  showPrintBox,
  chestSlots,
  side = "front",
}: Props) {
  const fabric = hex;
  const stitch = shade(hex, -28);
  const highlight = shade(hex, 18);

  return (
    <svg
      viewBox="0 0 400 500"
      className={className}
      role="img"
      aria-label={`${silhouette} mockup`}
      style={{ "--fabric": fabric } as CSSProperties}
    >
      <defs>
        <linearGradient id={`g-${cssId(hex)}`} x1="0" x2="1">
          <stop offset="0" stopColor={highlight} />
          <stop offset="0.45" stopColor={fabric} />
          <stop offset="1" stopColor={stitch} />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="#f3eee8" />
      {silhouette === "cap" ? (
        <CapBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} />
      ) : silhouette === "bag" ? (
        <BagBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} />
      ) : silhouette === "bottoms" ? (
        <BottomsBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} />
      ) : silhouette === "hoodie" ? (
        <HoodieBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} side={side} />
      ) : silhouette === "polo" ? (
        <PoloBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} />
      ) : silhouette === "jacket" ? (
        <JacketBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} />
      ) : silhouette === "vest" ? (
        <VestBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} />
      ) : (
        <TeeBody fill={`url(#g-${cssId(hex)})`} stitch={stitch} side={side} />
      )}
      {showPrintBox ? <PrintBox silhouette={silhouette} side={side} chestSlots={chestSlots} /> : null}
    </svg>
  );
}

function TeeBody({ fill, stitch, side }: { fill: string; stitch: string; side: string }) {
  if (side === "back") {
    return (
      <g>
        <path
          d="M78 118 L132 88 L160 118 L200 110 L240 118 L268 88 L322 118 L300 168 L286 420 Q200 448 114 420 L100 168 Z"
          fill={fill}
          stroke={stitch}
          strokeWidth="2"
        />
      </g>
    );
  }
  return (
    <g>
      <path
        d="M78 118 L132 88 L158 122 C170 148 186 158 200 158 C214 158 230 148 242 122 L268 88 L322 118 L300 168 L286 420 Q200 448 114 420 L100 168 Z"
        fill={fill}
        stroke={stitch}
        strokeWidth="2"
      />
      <path d="M158 122 C170 148 186 158 200 158 C214 158 230 148 242 122" fill="none" stroke={stitch} strokeWidth="2" />
    </g>
  );
}

function HoodieBody({ fill, stitch, side }: { fill: string; stitch: string; side: string }) {
  return (
    <g>
      <path
        d="M70 128 L128 78 L156 118 C168 150 186 162 200 162 C214 162 232 150 244 118 L272 78 L330 128 L312 178 L298 430 Q200 458 102 430 L88 178 Z"
        fill={fill}
        stroke={stitch}
        strokeWidth="2"
      />
      {side !== "back" ? (
        <path d="M168 210 Q200 250 232 210 L224 310 Q200 330 176 310 Z" fill="none" stroke={stitch} strokeWidth="2" />
      ) : null}
      <ellipse cx="200" cy="92" rx="46" ry="28" fill={fill} stroke={stitch} strokeWidth="2" />
    </g>
  );
}

function PoloBody({ fill, stitch }: { fill: string; stitch: string }) {
  return (
    <g>
      <path
        d="M78 118 L132 88 L158 122 C170 148 186 158 200 158 C214 158 230 148 242 122 L268 88 L322 118 L300 168 L286 420 Q200 448 114 420 L100 168 Z"
        fill={fill}
        stroke={stitch}
        strokeWidth="2"
      />
      <path d="M186 158 L200 210 L214 158" fill="none" stroke={stitch} strokeWidth="2" />
      <path d="M158 122 L186 158 M242 122 L214 158" fill="none" stroke={stitch} strokeWidth="2" />
    </g>
  );
}

function JacketBody({ fill, stitch }: { fill: string; stitch: string }) {
  return (
    <g>
      <path
        d="M64 130 L120 78 L154 122 C168 152 184 164 200 164 C216 164 232 152 246 122 L280 78 L336 130 L318 182 L302 436 Q200 468 98 436 L82 182 Z"
        fill={fill}
        stroke={stitch}
        strokeWidth="2"
      />
      <path d="M200 164 L200 430" stroke={stitch} strokeWidth="2" />
    </g>
  );
}

function VestBody({ fill, stitch }: { fill: string; stitch: string }) {
  return (
    <g>
      <path
        d="M110 120 L160 100 L200 150 L240 100 L290 120 L276 400 Q200 428 124 400 Z"
        fill={fill}
        stroke={stitch}
        strokeWidth="2"
      />
      <path d="M160 100 L200 150 L240 100" fill="none" stroke={stitch} strokeWidth="2" />
    </g>
  );
}

function CapBody({ fill, stitch }: { fill: string; stitch: string }) {
  return (
    <g>
      <ellipse cx="200" cy="210" rx="110" ry="78" fill={fill} stroke={stitch} strokeWidth="2" />
      <path d="M90 220 Q200 270 310 220 Q200 310 90 220" fill={fill} stroke={stitch} strokeWidth="2" />
    </g>
  );
}

function BagBody({ fill, stitch }: { fill: string; stitch: string }) {
  return (
    <g>
      <rect x="110" y="150" width="180" height="230" rx="8" fill={fill} stroke={stitch} strokeWidth="2" />
      <path d="M140 150 Q140 90 200 90 Q260 90 260 150" fill="none" stroke={stitch} strokeWidth="8" />
    </g>
  );
}

function BottomsBody({ fill, stitch }: { fill: string; stitch: string }) {
  return (
    <g>
      <path
        d="M130 90 H270 L290 430 H220 L200 210 L180 430 H110 Z"
        fill={fill}
        stroke={stitch}
        strokeWidth="2"
      />
    </g>
  );
}

function PrintBox({
  silhouette,
  side,
}: {
  silhouette: Silhouette;
  side: string;
  chestSlots?: boolean;
}) {
  if (side === "left" || side === "right") {
    return <rect x="70" y="150" width="70" height="90" fill="none" stroke="#b8b3ac" strokeDasharray="5 4" strokeWidth="1.5" />;
  }
  if (silhouette === "cap") {
    return <rect x="155" y="155" width="90" height="70" fill="none" stroke="#b8b3ac" strokeDasharray="5 4" strokeWidth="1.5" />;
  }
  if (silhouette === "bag") {
    return <rect x="118" y="150" width="164" height="164" fill="none" stroke="#b8b3ac" strokeDasharray="5 4" strokeWidth="1.5" />;
  }
  if (silhouette === "bottoms") {
    return <rect x="168" y="130" width="64" height="64" fill="none" stroke="#b8b3ac" strokeDasharray="5 4" strokeWidth="1.5" />;
  }
  if (silhouette === "vest") {
    return <rect x="118" y="118" width="164" height="168" fill="none" stroke="#b8b3ac" strokeDasharray="5 4" strokeWidth="1.5" />;
  }
  return <rect x="108" y="128" width="184" height="210" fill="none" stroke="#b8b3ac" strokeDasharray="5 4" strokeWidth="1.5" />;
}

function cssId(hex: string) {
  return hex.replace("#", "");
}

function shade(hex: string, amt: number) {
  const n = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) + amt));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
