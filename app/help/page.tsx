import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function HelpPage() {
  return (
    <>
      <section className="section help-page">
        <p className="eyebrow">Design Studio</p>
        <h1>Help</h1>
        <p className="muted">
          The garment on screen is a mockup. Production uses your text, clipart and
          original uploads — not a screenshot of this preview.
        </p>

        <h2>Create design</h2>
        <ul>
          <li>
            <strong>Text</strong> — fonts, colour, outline, shadow, curve and spacing.
            Size is shown in inches on the garment.
          </li>
          <li>
            <strong>Clipart</strong> — print-friendly graphics you can recolour, flip
            and layer.
          </li>
          <li>
            <strong>Upload</strong> — PNG, JPG, WebP or SVG. Aim for 300 DPI at print
            size. Transparent PNGs print cleanest.
          </li>
          <li>
            <strong>AI Art</strong> — type a prompt to drop a starter graphic, then
            edit it like clipart.
          </li>
          <li>
            <strong>Number</strong> — athletic names and numbers for the back of the
            shirt.
          </li>
          <li>
            <strong>Distress</strong> — a worn, vintage look on the selected artwork.
          </li>
        </ul>

        <h2>Edit Image</h2>
        <ul>
          <li>
            <strong>Center</strong> — snap the selection to the middle of the print
            box.
          </li>
          <li>
            <strong>Layering</strong> — move artwork forward or back.
          </li>
          <li>
            <strong>Flip</strong> — mirror horizontally or vertically.
          </li>
          <li>
            <strong>Clone</strong> — duplicate the selection.
          </li>
          <li>
            <strong>Replace</strong> — swap an upload without losing placement.
          </li>
          <li>
            <strong>Remove Background</strong> — knock out light / white pixels on
            photos.
          </li>
          <li>
            <strong>Colors</strong> — recolour clipart or tint an upload.
          </li>
        </ul>

        <h2>Print area</h2>
        <p>
          Stay inside the dashed box. Typical front print is about 13&quot; × 15&quot;.
          Sleeves and hats are smaller. The same design prints at the same size on all
          adult shirts.
        </p>

        <p>
          <Link href="/shop" className="btn-primary">
            Start from a product
          </Link>
        </p>
      </section>
      <Footer />
    </>
  );
}
