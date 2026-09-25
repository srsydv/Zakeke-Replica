#!/usr/bin/env python3
"""Build shop catalog.json from Ralawise CustomerDataFull.zip (live SKUs)."""
from __future__ import annotations

import csv
import json
import os
import re
import statistics
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ZIP = Path(
    "/Users/shrishyadav/Documents/FreeLance/Project/server/scripts/output/customerdatafull.zip"
)
ZIP_PATH = Path(os.environ.get("RALAWISE_ZIP", ROOT / "data" / "CustomerDataFull.zip"))
if not ZIP_PATH.exists():
    ZIP_PATH = DEFAULT_ZIP
OUT = ROOT / "data" / "catalog.json"

SIZE_ORDER = [
    "3-4",
    "5-6",
    "7-8",
    "9-10",
    "11-12",
    "13-14",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "2XL",
    "3XL",
    "XXXL",
    "4XL",
    "5XL",
    "6XL",
    "7XL",
    "8XL",
]


def shop_slug(category: str) -> str:
    c = (category or "").lower()
    if "t-shirt" in c or "vest (t" in c or c == "vests (t-shirt)":
        return "t-shirts"
    if "hoodie" in c:
        return "hoodies"
    if "sweatshirt" in c or "knitted jumper" in c or "fleece" in c:
        return "sweatshirts"
    if "polo" in c:
        return "polos"
    if any(x in c for x in ("jacket", "softshell", "gilet", "body warmer", "rain")):
        return "jackets"
    if any(x in c for x in ("cap", "hat", "beanie", "headwear", "helmet")):
        return "hats"
    if any(x in c for x in ("bag", "bottle", "towel", "laptop")):
        return "bags"
    if any(x in c for x in ("trouser", "short", "jean", "legging", "chino", "sweatpant")):
        return "bottoms"
    if "safety" in c or "hi-vis" in c or "hi vis" in c or "tabard" in c:
        return "hi-vis"
    if "shirt" in c or "blouse" in c or "waistcoat" in c:
        return "shirts"
    return "workwear"


def silhouette(category: str) -> str:
    slug = shop_slug(category)
    return {
        "hoodies": "hoodie",
        "hats": "cap",
        "bags": "bag",
        "bottoms": "bottoms",
        "jackets": "jacket",
        "polos": "polo",
        "shirts": "polo",
        "hi-vis": "vest",
    }.get(slug, "tee")


def brand_label(brand: str) -> str:
    t = (brand or "").strip()
    if not t or re.fullmatch(r"\d+", t):
        return "Ralawise"
    return t


def rgb_to_hex(rgb: str, fallback_name: str) -> str:
    parts = [p for p in re.split(r"[^\d]+", rgb or "") if p]
    if len(parts) >= 3:
        vals = [max(0, min(255, int(parts[i]))) for i in range(3)]
        return "#{:02x}{:02x}{:02x}".format(*vals)
    h = 0
    for ch in fallback_name.lower():
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    hue = h % 360
    sat = 28 + (h % 35)
    lit = 32 + (h % 28)
    s, l = sat / 100, lit / 100
    a = s * min(l, 1 - l)

    def f(n: int) -> int:
        k = (n + hue / 30) % 12
        return round(255 * (l - a * max(-1, min(k - 3, min(9 - k, 1)))))

    return "#{:02x}{:02x}{:02x}".format(f(0), f(8), f(4))


def parse_price(raw: str) -> float | None:
    t = (raw or "").strip().replace(",", ".")
    if not t or t in {".", ".00"}:
        return None
    try:
        n = float(t)
    except ValueError:
        return None
    return n if 0 < n < 500 else None


def size_rank(size: str) -> int:
    u = size.upper().replace(" ", "")
    try:
        return SIZE_ORDER.index(next(o for o in SIZE_ORDER if o.upper() == u))
    except StopIteration:
        return 50 + len(size)


def median(vals: list[float]) -> float:
    return round(statistics.median(vals), 2) if vals else 0


def main() -> None:
    if not ZIP_PATH.exists():
        raise SystemExit(f"Zip not found: {ZIP_PATH}")

    groups: dict[str, dict] = {}
    rows = 0
    with zipfile.ZipFile(ZIP_PATH) as zf:
        name = next(n for n in zf.namelist() if n.lower().endswith(".csv"))
        with zf.open(name) as raw:
            text = (line.decode("utf-8-sig") for line in raw)
            reader = csv.DictReader(text)
            for row in reader:
                rows += 1
                if (row.get("Sku Status") or "").strip() != "Live":
                    continue
                if not (row.get("Colour Image") or "").strip():
                    continue
                style = (row.get("Style Code") or "").strip()
                name_s = (row.get("Style Name") or "").strip()
                category = (row.get("Product Type") or "").strip()
                if not style or not name_s or not category:
                    continue
                g = groups.get(style)
                if g is None:
                    g = {
                        "styleCode": style,
                        "name": name_s,
                        "brand": brand_label(row.get("Brand") or ""),
                        "category": category,
                        "shop": shop_slug(category),
                        "silhouette": silhouette(category),
                        "description": (row.get("Retail Description") or "").strip()[:500],
                        "fabric": (row.get("Fabric") or "").strip(),
                        "gender": (row.get("Gender") or "").strip(),
                        "printArea": (row.get("Print Area") or "").strip(),
                        "embroideryInfo": (row.get("Embroidery Information") or "").strip(),
                        "imageUrl": (row.get("Primary Product Image URL") or "").strip(),
                        "specSheetUrl": (row.get("Spec Sheet") or "").strip(),
                        "colors": {},
                        "size_prices": defaultdict(list),
                        "all_prices": [],
                        "sizes": set(),
                    }
                    groups[style] = g
                colour = (row.get("Colour Name") or "Default").strip()
                size = (row.get("Size Name") or row.get("Size Code") or "").strip()
                price = parse_price(row.get("Single Price") or "")
                if size:
                    g["sizes"].add(size)
                    if price is not None:
                        g["size_prices"][size].append(price)
                        g["all_prices"].append(price)
                c = g["colors"].get(colour)
                if c is None:
                    c = {
                        "name": colour,
                        "code": (row.get("Colour Code") or "").strip(),
                        "hex": rgb_to_hex(row.get("RGB") or "", colour),
                        "imageUrl": (row.get("Colour Image") or "").strip(),
                        "sku": (row.get("Sku Code") or "").strip(),
                        "prices": {},
                    }
                    g["colors"][colour] = c
                if size and price is not None:
                    c["prices"][size] = price

    products = []
    for i, g in enumerate(
        sorted(groups.values(), key=lambda x: (x["name"].lower(), x["styleCode"]))
    ):
        sizes = sorted(g["sizes"], key=size_rank) or ["S", "M", "L", "XL"]
        size_wholesale = {
            s: median(g["size_prices"][s]) for s in sizes if g["size_prices"][s]
        }
        wholesale_base = round(min(g["all_prices"]), 2) if g["all_prices"] else 8.0
        colors = list(g["colors"].values())
        products.append(
            {
                "id": 100 + i,
                "styleCode": g["styleCode"],
                "name": g["name"],
                "brand": g["brand"],
                "category": g["category"],
                "shop": g["shop"],
                "silhouette": g["silhouette"],
                "description": g["description"],
                "fabric": g["fabric"],
                "gender": g["gender"],
                "printArea": g["printArea"],
                "embroideryInfo": g["embroideryInfo"],
                "imageUrl": g["imageUrl"],
                "specSheetUrl": g["specSheetUrl"],
                "wholesaleBase": wholesale_base,
                "sizeWholesale": size_wholesale,
                "colors": colors,
                "sizes": sizes,
                "faces": ["front", "back"],
            }
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(ZIP_PATH),
        "count": len(products),
        "skuRowsRead": rows,
        "products": products,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {len(products)} live styles from {rows} SKU rows → {OUT}")
    print(f"catalog size {OUT.stat().st_size / 1_000_000:.1f} MB")


if __name__ == "__main__":
    main()
