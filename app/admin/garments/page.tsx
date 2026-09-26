import Link from "next/link";
import { ShopView } from "@/components/ShopView";
import { GarmentTemplateForm } from "@/components/GarmentTemplateForm";
import { SHOP_CATEGORIES } from "@/lib/catalog";
import { getProduct } from "@/server/services/catalog";
import { getOrCreateGarment } from "@/server/services/garments";
import { printSpecFor } from "@/lib/placements/print-spec";

export default async function AdminGarmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; shop?: string; q?: string; page?: string }>;
}) {
  const { id, shop, q, page } = await searchParams;
  const selectedId = Number(id);
  const garment =
    Number.isFinite(selectedId) && selectedId > 0 ? (await getOrCreateGarment(selectedId)) ?? null : null;

  if (garment) {
    const back = shop ? `/admin/garments?shop=${shop}` : "/admin/garments";
    return (
      <div className="admin-page admin-page--studio">
        <p className="tiny">
          <Link href={back}>← All garments</Link>
          {" · "}
          <Link href="/admin">Jobs</Link>
        </p>
        <div className="admin-head">
          <div>
            <p className="eyebrow">Print box</p>
            <h1>{garment.name}</h1>
            <p className="muted">
              Stretch the width line, then add as many print boxes as the customer needs for logos.
            </p>
          </div>
        </div>
        <GarmentTemplateForm
          garment={garment}
          defaultGarmentWidthMm={printSpecFor((await getProduct(garment.id)) ?? { silhouette: "tee" }).garmentWidthIn * 25.4}
        />
      </div>
    );
  }

  const meta = SHOP_CATEGORIES.find((c) => c.slug === shop);
  return (
    <>
      <div className="shop-page" style={{ paddingBottom: 0 }}>
        <p className="tiny">
          <Link href="/admin">← Jobs</Link>
        </p>
      </div>
      <ShopView
        eyebrow="Print boxes"
        title={meta?.label ?? "All garments"}
        subtitle={
          meta
            ? `${meta.blurb} Pick a style to add the print box.`
            : "Same catalog as the shop. Pick a garment to add the print box."
        }
        shop={shop}
        q={q}
        page={Number(page || 1)}
        catalogBase="/admin/garments"
        productHref={(productId) =>
          shop ? `/admin/garments?id=${productId}&shop=${shop}` : `/admin/garments?id=${productId}`
        }
        productAction="Click to add a print box"
        showFooter={false}
      />
    </>
  );
}
