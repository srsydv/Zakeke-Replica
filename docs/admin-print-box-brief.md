# Admin print-box brief (frontend + backend)

**Who:** frontend and backend on the same contract  
**Scope:** admin picks a garment, measures it, draws print boxes, saves. Not customer designer, not checkout.

The browser still calls `/api/...`. Next.js forwards that to Express (`server/routes/garments.ts`, `server/routes/images.ts`, `server/routes/products.ts`). Cookie `bc-session` must be an **admin** for save and reset.

---

## Shared payload (the garment template)

This object is what backend **gives** frontend when opening a garment, and what frontend **sends back** when saving.

```ts
type PublicGarment = {
  id: number;                 // catalog product id
  name: string;
  garmentWidthMm?: number;    // real width of the orange measure line
  source?: "generated" | "admin";
  updatedAt?: string;
  sides: GarmentSide[];
};

type GarmentSide = {
  name: string;               // "Front" | "Back" | ...
  imageUrl?: string;          // Ralawise / Pimberly colour photo
  imageWidth: number;         // photo pixels
  imageHeight: number;
  crop: [x1, y1, x2, y2];     // fabric rectangle on the photo
  measureLine?: { x1, y1, x2, y2 };  // orange “from here to here” line, photo px
  pixelsPerInch: number;      // derived, not typed by admin
  areas: GarmentArea[];       // print boxes
};

type GarmentArea = {
  x: number; y: number; w: number; h: number;  // photo pixels
  label?: string;                              // "Box 1", "Left chest"
};
```

**Scale rule (both sides compute the same way, frontend lives it, backend stores the result):**

```
linePx        = length of measureLine (or fabric crop width if no line)
mmPerPx       = garmentWidthMm / linePx
boxMm.w       = area.w * mmPerPx
boxMm.h       = area.h * mmPerPx
pixelsPerInch = linePx / (garmentWidthMm / 25.4)
```

Ralawise **to-fit chest** is circumference. Flat photo ≈ half chest:

```
garmentWidthMm = (chestIn / 2) * 25.4
```

Customer designer later maps each `areas[i]` to slot code `BOX_i`. Do not rename that pattern.

---

## 1. Browse garments

Admin opens `/admin/garments` and sees the same catalog as the shop. Click a style → editor.

| Direction | What |
| --- | --- |
| **FE → BE** | Query: `shop` (category slug), `q` (search), `limit`, `offset` / `page` |
| **BE → FE** | Product cards: `id`, `name`, `brand`, `shop`, colour count, `fromPrice` |

**HTTP (if FE loads the list itself)**

```
GET /api/products?shop=t-shirts&q=gildan&limit=24&offset=0
```

```json
{ "total": 452, "items": [{ "id": 300, "name": "AWDis 240 T", "brand": "AWDis", "shop": "t-shirts", "colors": 8, "fromPrice": 22.38 }] }
```

Today the Next admin page can also read Postgres via `listProducts` on the server. Same fields. After pick, FE navigates to `/admin/garments?id=300`.

**Backend:** read `products`. Do not create a template yet.

---

## 2. Open garment (load or first-time guess)

Admin needs the photo + any saved boxes, or a first automatic guess.

| Direction | What |
| --- | --- |
| **FE → BE** | Path param: product `id` |
| **BE → FE** | Full `PublicGarment` (sides, measure line, boxes, `garmentWidthMm`) |

```
GET /api/v2/garment/:id
```

Auth: none (customer designer uses this too). `404` if the product is not in catalog.

**Backend on first open**

1. If `garment_templates` already has this `product_id` and it is admin-saved (or current template version) → return it.
2. Else load the product, fetch the first colour photo, detect fabric if possible, place one guessed box per face (Front / Back / …), set `garmentWidthMm` from silhouette default (tee ≈ 20 in = 508 mm), set a default orange line across the fabric, `source: "generated"`, persist, return.

**Frontend after response**

- Draw the photo, orange line, and blue boxes.
- If `garmentWidthMm` is missing, use the silhouette default the page already has.
- Recompute `pixelsPerInch` locally from the formula above. Do not ask the user to type PPI.

---

## 3. Colour photo (CORS-safe image)

Boxes must sit on the **same photo** the customer sees.

| Direction | What |
| --- | --- |
| **FE → BE** | Query `url` = HTTPS Pimberly colour image (`cdn.pimber.ly` only) |
| **BE → FE** | Raw image bytes (`Content-Type: image/jpeg` etc.), cache headers |

```
GET /api/garment-image?url=<encoded Pimberly URL>
```

**Frontend:** if `side.imageUrl` is Pimberly, load `/api/garment-image?url=...` instead of the CDN directly. When the image loads, if natural width/height differ from `imageWidth` / `imageHeight`, scale `crop`, `measureLine`, and every `area` by `sx` / `sy` and keep that in local state until save.

**Backend:** reject non-https or non-Pimberly hosts (`400`). Upstream fail → `502`.

---

## 4. Measure chest / garment width

Admin stretches the orange line (“from here to here is 16 in”) and types the real width. Every box on every side uses this one scale.

**This step is frontend-only until Save.** Backend does not get live drag events.

| Who | Data |
| --- | --- |
| **FE keeps locally** | `measureLine {x1,y1,x2,y2}` in photo px; `garmentWidthMm` |
| **FE may also show** | to-fit chest (in) → converts to `garmentWidthMm` with half-chest; line length in in/mm; `mmPerPx`; read-only `pixelsPerInch` |
| **FE → BE (on Save only)** | `sides[].measureLine` + top-level `garmentWidthMm` |
| **BE → FE (on Load)** | last saved `measureLine` and `garmentWidthMm` |

Example numbers: line is 627 px, admin says the line is 16 in (406 mm) → `mmPerPx = 406 / 627`. A 200 px wide box is `200 * 406 / 627` mm.

Do not persist to-fit chest as its own column. Persist the **flat width** (`garmentWidthMm`) and the **line pixels**.

---

## 5. Draw and size print boxes

Admin adds many boxes. Same scale as the orange line. Alignment guides (snap to another box’s top/center/left) are **frontend only**.

| Who | Data |
| --- | --- |
| **FE keeps locally** | `areas[]` in photo px; active box index; optional `label` |
| **FE shows (computed)** | print W/H in mm and inches: `area.px * garmentWidthMm / linePx` |
| **FE → BE (on Save)** | `sides[].areas` (px + label) and `sides[].pixelsPerInch` |
| **BE → FE (on Load)** | saved `areas` so FE can draw boxes before the customer uploads anything |

Typing mm/in in the rail **does not** call the API. FE converts mm → px with `px = mm / mmPerPx` and updates the box.

**Add box (FE):** copy size of the current box, offset to the right, label `Box N`.  
**Remove box (FE):** allowed only if more than one box.  
**Backend** stores whatever list is saved. It does not invent extra boxes on save.

---

## 6. Save print boxes

Admin clicks **Save print boxes**. This is the write.

| Direction | What |
| --- | --- |
| **FE → BE** | Full garment: `id`, `name`, `sides` (all faces), `garmentWidthMm` |
| **BE → FE** | Same `PublicGarment` after persist (`source: "admin"`, new `updatedAt`) |

```
PUT /api/v2/garment/:id
Cookie: bc-session (admin)
Content-Type: application/json
```

```json
{
  "id": 300,
  "name": "AWDis 240 T",
  "garmentWidthMm": 406,
  "sides": [
    {
      "name": "Front",
      "imageUrl": "https://cdn.pimber.ly/…/FT.jpg",
      "imageWidth": 1000,
      "imageHeight": 1200,
      "crop": [40, 30, 960, 1150],
      "measureLine": { "x1": 80, "y1": 420, "x2": 707, "y2": 420 },
      "pixelsPerInch": 39.2,
      "areas": [
        { "x": 220, "y": 180, "w": 200, "h": 240, "label": "Box 1" },
        { "x": 480, "y": 180, "w": 120, "h": 120, "label": "Left chest" }
      ]
    }
  ]
}
```

`401` if not admin. `404` if product missing.

**Backend persist**

1. Merge body onto the existing row (`sides` and `garmentWidthMm` from FE win).
2. Set `source = "admin"`.
3. Upsert `garment_templates` (`sides` jsonb + `garment_width_mm`).
4. Rebuild `garment_print_boxes` (one row per box: px + print inches). Used for ops / tickets, not for the editor UI.

**Frontend:** do not send files. Boxes are numbers on a photo URL we already have.

---

## 7. Reset automatic guess

Admin clicks **Reset automatic guess** to throw away their edit and rebuild from catalog defaults.

| Direction | What |
| --- | --- |
| **FE → BE** | `{ "regenerate": true }` |
| **BE → FE** | Fresh `PublicGarment` (`source: "generated"`, one guessed box per side, new measure line) |

```
POST /api/v2/garment/:id
Cookie: bc-session (admin)
{ "regenerate": true }
```

`400` if `regenerate` is missing. Overwrites the saved template.

**Frontend:** replace local `sides`, `garmentWidthMm`, and select Box 1.

---

## 8. List saved templates (optional)

```
GET /api/v2/garments
→ { "garments": PublicGarment[] }
```

Admin browse today uses the product catalog, not this list. Keep the endpoint for “already templated” views.

---

## Handoff to customer designer (do not change)

After save, customer `GET /api/v2/garment/:id` gets the same object.

| Saved field | Customer use |
| --- | --- |
| `sides[].areas[i]` | Visible empty box; slot code `BOX_i` |
| `sides[].imageUrl` | Colour photo (via image proxy) |
| `garmentWidthMm` + `measureLine` | Real print size of the plate |
| Box labels | Admin-only; customer UI stays clean (no “100×100 mm”) |

Frontend designer must **not** invent its own boxes if `areas` exist.

---

## Auth and errors (all admin writes)

| Code | Meaning |
| --- | --- |
| `200` | Body is `PublicGarment` (or `{ garments }` / `{ items }`) |
| `400` | Bad action or bad image URL |
| `401` | Need admin cookie (`bc-session`) |
| `404` | Unknown product / garment |
| `502` | Pimberly image fetch failed |

---

## Who owns what

| Work | Owner |
| --- | --- |
| Drag line, drag boxes, snap guides, mm/in inputs, PPI display | Frontend (no API until Save) |
| First-time fabric detect, default box, default `garmentWidthMm` | Backend (`getOrCreate` / regenerate) |
| Store template + flattened box rows | Backend (`garment_templates`, `garment_print_boxes`) |
| Proxy colour photo | Backend |
| Catalog search for the picker | Backend (`GET /api/products`) |
| Scale maths | Shared formula above — FE for live UI, BE stores FE’s numbers |
