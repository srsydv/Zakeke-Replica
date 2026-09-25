# BlueCotton Design Studio Brief

**Page reviewed:** [bluecotton.com/designer?productId=789](https://www.bluecotton.com/designer?productId=789)  
**Date:** 20 September 2026  
**Purpose:** Explain, in plain language and in technical terms, how BlueCotton lets a customer customize a garment, and what actually goes to the printer or embroidery machine after checkout.

---

## The short answer

BlueCotton is **not** using a third-party “put a logo on a shirt” widget (not Printful, Customily, Zakeke, Shopify Product Customizer, etc.).

They built **their own in-browser Design Studio**. On screen you see a **photo of a person wearing the shirt**, with your artwork drawn on top of it. That live preview is a **mockup for you**.

After you order:

| What happens | Do they print/stitch the preview screenshot? |
| --- | --- |
| **Screen printing** (most orders) | **No.** Artists review the design, then make real screens from a production-quality version of the artwork (vector data + original uploads). They *do* digitally image that artwork onto emulsion, but that is a high-quality print file, not the small on-screen mockup. |
| **Direct-to-Film (DTF)** | **No.** Used for small, very colorful jobs. They print a full-color digital file onto film, then press it to the shirt. Still not the mockup photo. |
| **Embroidery** | **No.** A person **digitizes** the design into a stitch-by-stitch machine file. Embroidery machines cannot sew a JPG/PNG preview. |
| **Names & numbers** | **No.** Those are cut from vinyl and heat-pressed. |

Every order is also **checked by BlueCotton’s art team** in Bowling Green, KY. If something needs a real change, they send you a **proof** to approve. Small fixes (centering, spelling) they often just do and send to production.

---

# Part 1 — Non-technical brief

## What you are looking at

Open [the designer with product 789](https://www.bluecotton.com/designer?productId=789) and you get:

- A **photo of a model** wearing a sage/green short-sleeve crewneck tee (that product ID loads a specific garment).
- Tools along the bottom: **Text, Clipart, Upload, AI Art, Number, Distress**, plus Open / Templates / Save / Share / Order details.
- Undo, redo, zoom, and rotate (front → back → left sleeve → right sleeve).

You are not drawing on a real 3D shirt. You are placing artwork on a **flat print area** that is overlaid on a product photo. When you add text, the studio even shows real-world size, for example **12.0" × 1.4"**.

That is the whole point of the studio: show you *approximately* how the shirt will look, while capturing **what** to print, **how big**, **where**, and **in which colors**.

## How a customer customizes a design

1. **Pick a garment and color** (`productId=789` is already chosen on this URL).
2. **Add artwork** in any mix of:
   - **Text** — 200+ fonts, color, outline, shadow, curve/shape, spacing. Resize and rotate with handles.
   - **Clipart** — 40,000–50,000 print-friendly graphics (sports, animals, holidays, etc.). Recolorable. Many come from [Vecteezy](https://www.vecteezy.com/blog/case-studies/bluecotton), not from a designer drawing each icon by hand.
   - **Upload** — your logo or photo: PNG, JPG, PDF, AI, EPS, PSD, TIFF. They want **300 DPI at the size it will print**.
   - **AI Art** — type a prompt, get generated graphics, then treat them like clipart/uploads. Login required.
   - **Templates** — start from a premade design and change text/colors.
   - **Distress** — vintage/worn look.
   - **Names & numbers** — personalize the back of each shirt ($3 per name/number).
3. **Place it** on front, back, or sleeves. Stay inside the dashed print box. Max print area is typically **13" wide × 15" tall** (smaller on sleeves, chests, hats).
4. **Enter sizes and quantities** (minimum 6 pieces for print or embroidery).
5. **Add to cart** and check out. You can also save or share the design.

BlueCotton’s own help copy is here: [Help Center — Design Studio Overview](https://www.bluecotton.com/help-center).

## What the on-screen picture is (and is not)

**It is:** a live mockup. Shirt photo + your layers, with inch measurements.

**It is not:** the file the press operator slaps on a screen, and it is not the file the embroidery head sews.

Think of it like a furniture website: the 3D sofa on your screen is for shopping. The factory still builds from a spec sheet and real materials.

## After you place the order

This is the important production path:

```
You design in the browser
        ↓
Design is saved (artwork + placement + colors + sizes)
        ↓
Artists review it (included with every order)
        ↓
If needed: they send a proof; you approve
        ↓
They pick a decoration method
        ↓
They make production files (screens, film, or stitch file)
        ↓
They print or embroider in Kentucky
        ↓
Nine quality checks, then ship
```

### Screen printing (most t-shirts)

BlueCotton says they coat a mesh screen with emulsion, **digitally print your image onto the emulsion**, expose it to light, and wash out the unexposed parts. That creates a stencil. Each color gets its own screen. Ink is pulled through with a squeegee, then the shirt is heat-cured.

So yes, a **digital image of the artwork** is used to *make the screen*. That image is a production artwork file (clean, sized in inches, color-separated). It is **not** the pretty photo of the model, and it is **not** a tiny thumbnail from the website.

Studio-made text and clipart are **vector**, so they stay sharp. Uploaded photos print only as sharp as the file you uploaded. If your JPG is blurry on screen, it will be blurry on the shirt. Their own blog: [The Lowdown on Uploaded Images](https://www.bluecotton.com/blog/design-studio/the-lowdown-on-uploaded-images/).

### Direct-to-Film (DTF)

Used when a design has **lots of colors** (often more than 8) and the order is **small**. They print the design onto special film with water-based inks, then transfer it to the garment. This *does* use a full-color digital raster of the design — still generated from the saved artwork, not from the mockup photo.

### Embroidery

They **do not stitch the preview**. A digitizer converts the 2D design into a stitch-by-stitch playbook the machine can read. The garment is hooped; the machine sews in a set color sequence.

- Simple, bold shapes work. Photos, gradients, and tiny text do not.
- Text should be at least **¼" tall**.
- They have **44 thread colors**. Artists pick the closest match; if it is a big jump, they send a proof.

### Names and numbers

These are usually **cut vinyl, heat-pressed**, not screen printed. That is why they can be different on every shirt.

## What customers should remember

- The designer is a **customization tool + preview**, not the printing press.
- **Text and clipart** will print crisply because they are vector.
- **Uploaded images** print at the quality you upload (aim for 300 DPI at final size).
- **Artists still look at every job.** Leave notes in Special Instructions for Pantone matching, background removal, or placement questions.
- They will **center the design** even if it looks a bit off in the studio.
- The same design prints at the **same size on all adult shirts**; youth sizes are scaled down.

---

# Part 2 — Technical brief

## Architecture at a glance

| Layer | What it is |
| --- | --- |
| Page | `https://www.bluecotton.com/designer?productId=789` |
| App name (in source) | **Beta Studio** — assets under `/betastudio/` |
| Frontend | Custom **Angular** SPA (`app-designer` custom element), **PrimeNG** UI |
| Renderer | **PixiJS 5.3.10** on a WebGL `<canvas class="ui-space-canvas">` |
| Mockup | Static garment photo (model) + Pixi scene of design objects |
| Backend | **Ruby on Rails** (CSRF token, `_bluecotton_session`, fingerprinted `/assets/`) behind Cloudflare |
| API | `https://www.bluecotton.com/api/v2/` |
| Uploads | Same origin: `/api/v2/upload/` |
| Feature flags | GrowthBook |
| Chat | Zendesk |

This is **first-party software**, not a licensed web-to-print plugin. BlueCotton has run a Design Studio since about **2007**; the current app is a rewritten “v2” studio (the bundle still contains a **v1 → v2 design migrator**).

It is **not** Fabric.js, Konva, Paper.js, Three.js, or a Shopify customizer.

## How the live preview is drawn

1. Rails serves a shell page: header + `<div id="app-wrapper"><app-designer></app-designer></div>`.
2. Config is injected:

```js
window.defaultDesignerMode = 'screen-print';
window.blueCottonDesignerConfig = {
  siteURL: 'https://www.bluecotton.com',
  apiURL: 'https://www.bluecotton.com/api/v2/',
  uploadApiURL: 'https://www.bluecotton.com/api/v2/',
  assetsURL: 'https://www.bluecotton.com/betastudio/studio-assets/'
};
```

3. Angular boots `APP-DESIGNER` / `APP-SPACE`. The space component owns the canvas.
4. PixiJS renders a scene graph:
   - garment / side photo
   - print-area mask (dashed box)
   - design items (text, art, shapes, uploads)
   - selection chrome (handles, rotate, delete, inch readout)
5. Coordinates are **physical**. Sides store `pxPerInch` (default **30**). Sleeve print area is treated as **3.25"** for screen print. The UI showed **12.0" × 1.4"** for a text object — that number is what production cares about, not CSS pixels.

Two decoration modes exist in the same app:

- `screen-print` (default on this URL)
- `embroidery` (API calls append `?emb=true`; print regions swap from `areas` to `embroidery`)

## Design data model (what is actually saved)

A design is a **scene JSON document**, not a flattened PNG.

Observed fields / object types in the client:

```
scene
  id, name, appMode, appVersion, hash
  thumbnail, proof
  garments[]
    template (garment, inks, color images, pixelsPerInch, areas / embroidery)
    sides[]
      type: "side"          // Front, Back, sleeves
      items[]
      pxPerInch
      distressed
      matrix                // 2D transform
      areas[]               // screen-print imprint boxes
      embroidery[]          // embroidery imprint boxes
```

Item types:

| `type` | Meaning |
| --- | --- |
| `text` | Font, string, size, outline, shadow, shape, spacing, transform matrix |
| `art` | Clipart id, recolor list, effects, matrix |
| `shape` | Vector path + fill/stroke |
| `upload` | Pointer to uploaded file (original AI/PDF/PNG kept server-side) |

Transforms use a **matrix**, so scale/rotate/position are exact and replayable.

On save, the client:

1. Deep-clones the scene model.
2. Calls `exportThumb()` → ~**90×120** PNG.
3. Calls `exportProof()` → ~**500×710** PNG (small proof 90×90 also exists).
4. POSTs the scene to `/api/v2/designs/` (quantity via `/api/v2/designs/quantity/`).
5. Cart uses `/api/v2/cart/`.

There is also an internal `exportDesign()` that can dump **per-region PNGs into a ZIP** (`{id}-{region}.png`). That is a rasterization of the **design layers only**, still not the model photo.

**Implication:** the mockup image is a *derivative* of the scene. Production can regenerate any size from vectors + original uploads. They do not need the 500px proof to print.

## Asset pipeline

| Source | How it gets in | Print character |
| --- | --- | --- |
| Text / shapes | Generated in Pixi from fonts + paths | Vector. Resolution-independent. |
| Clipart | `/api/v2/cliparts/`, categories, search | Print-oriented **SVGs**, limited colors. Vecteezy Enterprise API replaced a manual Getty workflow. [Case study](https://www.vecteezy.com/blog/case-studies/bluecotton). |
| Customer upload | `/api/v2/upload/` ; original `.ai` is stored as `{filename, image, type:"upload"}` | Raster or native vector file. Quality = source DPI. |
| AI Art | In-app text-to-image (login). Treated as an image layer after generation. | Raster. Fine for DTF; for screen print, art team may simplify / color-separate. |
| Templates | `/api/v2/templates/`, `/api/v2/garment/`, `/api/v2/fonts/` | Same scene format as customer designs. |

BlueCotton’s public statement: *“The tools available in the Design Studio are completely vector-based so they are not subject to the resolution concerns as are raster images.”*

## What happens after checkout (production systems)

This is a **human-in-the-loop web-to-print** shop, not a fully automatic POD RIP.

```
Scene JSON + original files + thumbnail/proof
        ↓
Art / prepress review (always)
        ↓
Optional customer proof (if special instructions or a large change)
        ↓
Method routing
   ├─ few colors, typical qty     → screen print (CTS)
   ├─ many colors, small qty      → DTF
   ├─ hats / left chest / “pro” look → embroidery (digitizing)
   └─ names/numbers               → vinyl cutter + heat press
```

### Screen print (computer-to-screen)

BlueCotton describes CTS / digital-to-emulsion:

1. Prepress prepares **color separations** from the scene (each ink = one screen).
2. A digital device **images the artwork onto emulsion-coated mesh**.
3. UV exposure hardens the emulsion; washout opens the stencil.
4. Automatic or manual press prints wet-on-wet or flash between colors.
5. Conveyor dryer cures plastisol/water-based ink.

The “image” in step 2 is a **high-resolution, sized, often 1-bit or spot-color separation**, typically generated from:

- outlined/vector text and clipart
- original uploaded PDF/AI/EPS when provided
- a high-DPI rasterization of the design **without** the garment photo

They explicitly say they **re-center** artwork even if the studio placement looks slightly off, and they **scale youth** separately. That only works if production is driven by **structured placement data**, not by “whatever pixels were on the mockup.”

### DTF

Full-color RIP of the design (with white underbase as needed) → print to film → powder adhesive → heat transfer. This *is* raster, so a high-res flattened design PNG/TIFF of the **artwork** (transparent background) is the usual handoff — again, not the model photo.

### Embroidery

1. Art team **digitizes**: punch stitch types, densities, underlay, pull compensation, color sequence.
2. Output is a machine file (typical industry formats: DST, EXP, PES — BlueCotton does not publish the exact format).
3. Operator hoops the garment; machine sews.
4. Thread palette is discrete (**44 colors**), unlike mixed screen-print inks.

A preview PNG cannot be “sent to the embroidery machine.” Digitizing is a separate craft.

### Names & numbers

Per-shirt data from the Names & Numbers tool → vinyl cutter → heat press. Screen-printed team logos + vinyl names on the same garment is a common combo.

## API surface observed in the client

| Path | Role |
| --- | --- |
| `GET/POST /api/v2/designs/` | Save / load scene |
| `/api/v2/designs/quantity/` | Size run / qty |
| `/api/v2/designs/legacy/` | Old studio designs |
| `/api/v2/cliparts/`, `.../categories/`, `.../search/` | Clipart library |
| `/api/v2/templates/` | Design ideas |
| `/api/v2/garment/` | Product templates, print areas, color photos |
| `/api/v2/fonts/` | Font catalog |
| `/api/v2/upload/`, `/api/v2/uploads/` | Customer files |
| `/api/v2/cart/`, `/api/v2/order/` | Commerce |
| `/api/v2/share/` | Shareable design links |
| `account/` | Saved designs (login) |

`productId=789` is a garment template key. Live API `GET /api/v2/garment/789` returns **CC1717 Comfort Colors Pigment Dyed Short Sleeve Shirt** (67 colors, default “Bay”).

## How they get the product catalog

They are **not** plugging a live SanMar / Printful catalog widget into the designer.

Two layers:

1. **Physical blanks** — they sell real branded garments (Gildan 5000, Comfort Colors 1717, Next Level, etc.). Those blanks are manufactured by the brands and typically bought through wholesale distributors (the usual US channel is SanMar, S&S Activewear, alphabroder). BlueCotton then print/embroider in Kentucky.

2. **Website catalog** — they maintain their **own product database** in Rails. The designer does not scrape Gildan’s website. It calls BlueCotton APIs:

| Endpoint | What it returns (observed 20 Sep 2026) |
| --- | --- |
| `GET /api/v2/garments/categories/` | **83** categories (tees, women’s, sweats, hats, bags, brands…) |
| `GET /api/v2/garments/search/` | **572** garments (`x-total-count: 572`). Example: `708` = Gildan 5000 (also their `defaultProductId`) |
| `GET /api/v2/garment/{id}` | Full **garment template** for the studio |

A garment template includes:

- Name / id (789 = CC1717)
- Whether printing, embroidery, names-and-numbers are allowed
- Min qty (6)
- Allowed ink IDs
- **Colors** with hex, sizes, size upcharges
- **Per-side photos** (front/back/left/right) in Rails Active Storage
- **Mask GIFs** so artwork only shows on the shirt, not the background
- **Print areas** `{x, y, w, h}` and **embroidery boxes** `{x1,y1,x2,y2}`
- `pixelsPerInch` (23 on this garment)

Shop pages (`/shop/...`, `/brands/gildan/...`) are the same catalog, presented as a storefront. “Start designing” sends you to `/designer?productId=...`.

So: **brands supply the shirts; BlueCotton photographs, measures print areas, and stores the catalog themselves.**

## Can we do this the same way?

**Yes, as a product architecture.** There is no secret third-party customizer to buy. You build:

1. A canvas designer (PixiJS, Fabric.js, or Konva) that saves a scene JSON.
2. Your own garment table: photos, colors, sizes, print boxes.
3. A production process (or a partner shop) that does not print the mockup PNG.

What you cannot skip:

- **Catalog work** — choose styles, keep inventory/pricing, shoot or retouch mockup photos, mark print areas per garment.
- **Production** — screens/DTF/digitizing. The website is only half of BlueCotton.
- If you only need mockups + someone else prints, that is POD (Printful/Printify), which is a *different* model.

## What they are *not* doing

- Not using the **website mockup screenshot** as the print file.
- Not a fully automatic “PNG in, shirt out” RIP with no art review.
- Not 3D cloth simulation (no fabric drape engine).
- Not true WYSIWYG for embroidery stitch preview (you see a flat graphic; stitch files are made later).
- Not infinite color embroidery — 44 threads, closest match.

## Practical takeaway if you are building something similar

To copy this *product* (not the code):

1. **Browser editor** that stores a **scene graph** (layers, fonts, vectors, inch-based placement).
2. **Photo mockup** composited in WebGL/Canvas for sales UX.
3. **Original files kept** (especially AI/PDF/EPS).
4. **Export thumbs/proofs** for cart and artist queue — those are *views*, not masters.
5. **Human prepress**:
   - screen: color separation + CTS
   - DTF: high-res transparent raster
   - embroidery: digitizing
6. **Proof workflow** for exceptions.

The mockup sells the shirt. The scene JSON + original art + a person at a computer is what actually gets decorated.

---

## Sources

- Live studio: [Designer, productId=789](https://www.bluecotton.com/designer?productId=789) (inspected 20 Sep 2026: Angular `app-designer`, PixiJS 5.3.10 WebGL canvas, `/betastudio/main.js`, `/api/v2/` config).
- [BlueCotton Help Center](https://www.bluecotton.com/help-center) — studio tools, screen print, DTF, embroidery, print sizes, artist review.
- [The Lowdown on Uploaded Images](https://www.bluecotton.com/blog/design-studio/the-lowdown-on-uploaded-images/) — vector studio tools vs raster uploads.
- [How To Design Your Own T-Shirt](https://www.bluecotton.com/blog/design-studio/how-to-design-your-own-t-shirt-in-our-design-studio/).
- [Vinyl vs screen printing](https://www.bluecotton.com/blog/uncategorized/vinyl-t-shirt-printing-or-screen-printing-which-is-best-for-you/) — names/numbers as heat-pressed vinyl.
- [Vecteezy × BlueCotton](https://www.vecteezy.com/blog/case-studies/bluecotton) — clipart API, print-friendly SVGs.
- [AI Text to Image in Design Studio](https://www.bluecotton.com/landings/ai-text-to-image-in-design-studio).
- Third-party order writeup describing artist proofs: [Stylelisty BlueCotton review](https://stylelisty.com/brands/bluecotton-review/).
