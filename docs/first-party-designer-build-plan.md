# First-party garment designer — how we would build it

**For:** product / ops review  
**Purpose:** show a clear, buildable path to our own 2D designer (instead of renting Zakeke for the on-screen part), and how that later feeds production (Myze) with our own image URLs.

This is a logic plan, not a code dump. Each tool is named so you can open the official page and see what it is.

---

## 1. What we are building

A shop + design studio where:

1. A customer picks a real Ralawise garment and colour.
2. They see the **real colour photo** of that shirt (not a tinted drawing).
3. Admin has already drawn **print boxes** on that photo and measured them in millimetres.
4. The customer drops a logo / text / clipart **only inside those boxes**.
5. They download a **preview** (shirt + logos) as PNG or PDF.
6. We also make a **print plate** (logo only, real size) and store it. Myze only needs a URL to that file.

We are **not** building 3D, Shopify, or a full replacement of Zakeke on day one. We are building the part customers and admins actually touch, plus a file we own so Myze can still print.

---

## 2. Why this is possible

Three facts make this a normal web project, not a research project:

- Ralawise already gives us a product list, colours, prices, and **one photo per colour**. We import that. We do not shoot the catalogue ourselves.
- A print box is just a rectangle on a photo plus a real-world width (for example “this line on the photo is 16 inches”). That is school-level scale: box pixels ÷ line pixels × line millimetres.
- Myze does not talk to Zakeke. It downloads two public image links: a small preview, and a high-res print file. If we create those files and put them on storage, Myze can keep working.

So the “magic” is: **measured boxes on a supplier photo**, then **two files we host**.

---

## 3. How it works (the logic)

### Step A — Bring in the catalogue

Ralawise sends a product file (CSV in a zip). We read only live SKUs that have a colour photo.

For each style we store:

- name, brand, sizes, prices
- each colour’s name, RGB swatch, and **Colour Image** URL (hosted on Ralawise’s CDN, Pimberly)

When the customer clicks a colour dot, we swap the photo. We do not paint a hex over one shirt.

**Tools**

| What | Why | Study |
| --- | --- | --- |
| Python (standard library: `csv`, `zipfile`) | One-off import of the Ralawise zip | [Python docs](https://docs.python.org/3/) |
| SQLite | Small product database the site reads | [SQLite](https://www.sqlite.org/docs.html) · [Node sqlite](https://nodejs.org/api/sqlite.html) |

### Step B — Admin places the print boxes

Admin opens a garment the same way the customer will see it. They:

1. Sketch a line on the fabric: “from here to here is 16 inches / 406 mm” (same idea Zakeke uses).
2. Draw one or more boxes (left chest, right chest, and so on).
3. The system shows each box in millimetres from that line.
4. Save. Those boxes become the only places a customer can put a logo.

Alignment guides help when a second box should sit level with the first.

**No extra package.** This is a photo, a mouse, and saved numbers (x, y, width, height, garment width in mm).

### Step C — Customer designs

The studio shows the colour photo and the empty boxes. Box 1 is selected. The customer clicks a box, then:

- **Upload** a logo (PNG / JPG / SVG)
- **Text** (fonts we ship)
- **Clipart** (simple SVG icons we own)
- Optional **knock out white** on a logo (see step E)

Artwork cannot leave the box. They can still move it to another box.

Live price uses our existing quote rules (quantity, decoration, rush). That is our maths, not Zakeke’s.

**Tools**

| What | Why | Study |
| --- | --- | --- |
| [Next.js](https://nextjs.org/docs) | The website: shop, designer, admin, APIs | [npm: next](https://www.npmjs.com/package/next) |
| [React](https://react.dev/learn) | Screens and buttons | [npm: react](https://www.npmjs.com/package/react) |
| [PixiJS](https://pixijs.com/8.x/guides/getting-started/intro) | Smooth garment stage (photo + boxes) | [npm: pixi.js](https://www.npmjs.com/package/pixi.js) |
| [TypeScript](https://www.typescriptlang.org/docs/) | Safer JavaScript | [npm: typescript](https://www.npmjs.com/package/typescript) |
| [Tailwind CSS](https://tailwindcss.com/docs) | Layout and styling | [npm: tailwindcss](https://www.npmjs.com/package/tailwindcss) |
| Browser Canvas | Drag, resize, and compose images | [MDN Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) |

PixiJS is the same family of tool game and design UIs use. It is not an AI model. It draws the shirt and the boxes quickly.

### Step D — Two files, not one

When the design is done we make:

| File | What it is | Who uses it |
| --- | --- | --- |
| **Mockup PNG / PDF** | Full shirt photo + logos on it | Customer, sales, art review |
| **Print plate PNG** | Logo only, sized to the real box (about 300 DPI) | Production / Myze |

The mockup is **not** what gets printed on the garment. If we sent the shirt photo to Myze as the print file, they would print a picture of a t-shirt onto a t-shirt.

PDF for the mockup can start as “image on a page” using the browser (no paid PDF suite required). If we later want a richer press pack we can add a small PDF helper.

**Tools**

| What | Why | Study |
| --- | --- | --- |
| Browser Canvas + `toBlob` | Build the PNG in the browser | [HTMLCanvasElement.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) |
| [sharp](https://sharp.pixelplumbing.com/) | Server-side resize / clean PNG if we generate plates on the server | [npm: sharp](https://www.npmjs.com/package/sharp) |

### Step E — Remove background (no AI first)

Most workwear uploads are company logos on white, or PNGs that are already cut out.

We knock out near-white pixels in the browser. Instant, free, good enough for logos.

We do **not** start with AI. AI is only worth it later if people upload photos of people or messy product shots. Then we would call a cut-out service, not train a model.

| If we add it later | Study |
| --- | --- |
| remove.bg API | [https://www.remove.bg/api](https://www.remove.bg/api) |
| In-browser option | [npm: @imgly/background-removal](https://www.npmjs.com/package/@imgly/background-removal) |

### Step F — Give Myze a URL we own

Myze’s place-order call already expects:

- `previewImageUrl` — the mockup
- `highresImageUrl` — the print plate
- SKU, quantity, `printMethod: "DTF"`

Zakeke is only used today to **create** those URLs. If we upload our two files to storage and save the links on the order line, Myze can fetch them the same way.

The link must be on the public internet (not a laptop download). That is what S3 is for.

**Tools (when we plug this into OrderWorkwear)**

| What | Why | Study |
| --- | --- | --- |
| Amazon S3 | Store preview + plate; return an HTTPS URL | [S3 user guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) |
| AWS SDK for JavaScript | Upload from our server | [npm: @aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3) |

Embroidery stays on the existing DST path. This plan is for **print / DTF**.

---

## 4. Who uses which screen

```
Ralawise colour photos
        ↓
Admin: measure line + draw boxes + save
        ↓
Customer: pick colour → put logo in a box → quote
        ↓
Two files: mockup (people) + plate (press)
        ↓
Upload to S3 → save URLs on the order
        ↓
Myze downloads the plate and prints DTF
```

| Person | They do | They do not |
| --- | --- | --- |
| Customer | Design and order | See millimetre math or Zakeke |
| Admin | Place boxes, review jobs | Draw in Zakeke backoffice |
| Production | Open the plate URL / Myze job | Print the pretty shirt photo |

---

## 5. What we would build in which order

This is the logical sequence so each step can be demoed.

**Phase 1 — Shop and photos**  
Import Ralawise. Show garments and colour dots. Clicking a colour changes the real photo.

**Phase 2 — Admin boxes**  
Measure line on the photo. Many boxes, same scale. Save. Show millimetres.

**Phase 3 — Customer designer**  
Boxes visible before upload. Lock artwork to the selected box. Text, clipart, upload. Quote.

**Phase 4 — Files**  
Download mockup PNG/PDF. Make a plate PNG per box.

**Phase 5 — Production hook (OrderWorkwear)**  
Upload both files to S3. Put the URLs where Zakeke’s print-file URLs sit today. Keep Myze as-is.

**Phase 6 — Only after Phase 5 is trusted**  
Replace the Zakeke iframe, design clone, and template lock. That is a separate project. The designer can go live as the UI first; Zakeke can still mint print files until S3 plates are proven.

---

## 6. What we are not doing in v1

- 3D / spinning mannequin
- Training our own background-removal AI
- Replacing embroidery digitising
- Replacing Stripe, Cognito, or Ralawise blank ordering
- Dropping this folder into OrderWorkwear as a one-click swap

Those are later decisions. None of them block Phase 1–4.

---

## 7. Package list (click to study)

These are the libraries this approach actually uses. Nothing exotic.

| Package | Role in one sentence | Link |
| --- | --- | --- |
| **next** | The app framework (pages + APIs) | [npm](https://www.npmjs.com/package/next) · [docs](https://nextjs.org/docs) |
| **react** / **react-dom** | UI | [npm](https://www.npmjs.com/package/react) · [docs](https://react.dev/learn) |
| **pixi.js** | Fast 2D stage for the garment | [npm](https://www.npmjs.com/package/pixi.js) · [guides](https://pixijs.com/8.x/guides/getting-started/intro) |
| **sharp** | Server image work (resize, PNG) | [npm](https://www.npmjs.com/package/sharp) · [docs](https://sharp.pixelplumbing.com/) |
| **typescript** | Typed JavaScript | [npm](https://www.npmjs.com/package/typescript) · [docs](https://www.typescriptlang.org/docs/) |
| **tailwindcss** | Styling | [npm](https://www.npmjs.com/package/tailwindcss) · [docs](https://tailwindcss.com/docs) |

**Built in (no extra vendor)**

- Browser [Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) — compose mockup and plate
- [SQLite](https://www.sqlite.org/docs.html) — catalogue
- Python 3 — one-time Ralawise import

**Add only when we connect Myze**

- [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)

**Optional later**

- [remove.bg](https://www.remove.bg/api) or [@imgly/background-removal](https://www.npmjs.com/package/@imgly/background-removal) — photo cut-out, not logos

---

## 8. Risk, in plain language

| Risk | How we handle it |
| --- | --- |
| Colour photos are front-only | Boxes live on the front photo we have. Back/sleeve wait until we have those shots. |
| Wrong file sent to Myze | Preview = shirt picture. High-res = plate only. Never swap them. |
| Box in the wrong place | Admin draws on the **same photo** the customer sees. Measure line sets millimetres, not a guess. |
| “Just replace Zakeke this week” | UI yes. Full Zakeke (templates, clone, print poll) no. Phase 5–6 are explicit. |

---

## 9. What “yes, we can build this” means

We can build this because every piece already has a known method:

1. **Catalogue** — import a file we already receive.  
2. **Colour change** — show the supplier’s photo for that colour.  
3. **Print size** — one measured line on the photo.  
4. **Customer lock** — logos stay inside saved boxes.  
5. **Preview** — draw shirt + logos to a PNG.  
6. **Production** — draw the logo at real millimetres, upload, send Myze the URL.

That is a website, a ruler on a photo, and two image files. It is not a new print factory and not an AI product.

If you want a next step: agree Phase 1–4 as the designer we own, and treat Myze S3 URLs (Phase 5) as the first production win. Leave a full Zakeke removal until those files have gone through a real DTF job.
