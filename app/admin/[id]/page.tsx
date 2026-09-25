import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStatusForm } from "@/components/AdminStatusForm";
import { DownloadDesign, DownloadPrintFiles } from "@/components/DownloadDesign";
import { ArtworkOnly, DesignPreview } from "@/components/DesignPreview";
import { artworkLabel } from "@/lib/design";
import { findSide } from "@/lib/garment-template";
import { getStoredGarment } from "@/lib/garments";
import { getOrder } from "@/lib/orders";
import { formatPricingGbp } from "@/lib/quote";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();
  const quote = order.items[0]?.quote as
    | {
        unitIncVat?: number;
        line?: { quantity?: number; blankSubtotalExVat?: number; decorationSubtotalExVat?: number; setupFeeExVat?: number };
        rush?: { totalIncVat?: number; vatGbp?: number; rushSurchargeExVat?: number };
      }
    | undefined;

  return (
    <div className="admin-page">
      <p>
        <Link href="/admin">← All jobs</Link>
      </p>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Job #{order.id}</p>
          <h1>
            {order.items[0]?.name ?? "Order"}
            {order.isDummy ? <span className="badge-dummy">Dummy</span> : null}
          </h1>
          <p className="muted">
            {order.customer.name} · {order.customer.email}
            <br />
            {order.customer.address}
          </p>
        </div>
        <AdminStatusForm id={order.id} status={order.status} />
      </div>

      {order.items.map((item) => {
        const garment = getStoredGarment(item.productId);
        const mockupSide = item.objects[0]?.side ?? "front";
        const sideTemplate =
          findSide(garment, mockupSide) ??
          (item.printJobs[0]?.printBoxPx && item.printJobs[0].imageWidth && item.printJobs[0].imageHeight
            ? {
                name: item.printJobs[0].side,
                masks: [],
                areas: item.printJobs
                  .filter((job) => job.side === mockupSide && job.printBoxPx)
                  .map((job) => job.printBoxPx!),
                crop: item.printJobs[0].crop ?? [0, 0, item.printJobs[0].imageWidth, item.printJobs[0].imageHeight],
                embroidery: [],
                pixelsPerInch: item.printJobs[0].pixelsPerInch ?? 23,
                imageWidth: item.printJobs[0].imageWidth,
                imageHeight: item.printJobs[0].imageHeight,
                imageUrl: item.imageUrl,
              }
            : undefined);
        return (
        <section key={item.id} className="admin-job">
          <div className="admin-card">
            <h2>Customer mockup</h2>
            <p className="tiny">
              Shirt plus logos as the customer designed it. Download PNG or PDF for the press pack.
              Production still uses the print file below for the actual imprint.
            </p>
            <DesignPreview
              src={item.imageUrl}
              hex={item.hex}
              silhouette={item.silhouette}
              name={item.name}
              alt={item.name}
              objects={item.objects}
              side={mockupSide}
              sideTemplate={sideTemplate}
            />
            <DownloadDesign
              imageUrl={item.imageUrl}
              sideTemplate={sideTemplate}
              objects={item.objects}
              side={mockupSide}
              garmentWidthMm={garment?.garmentWidthMm}
              productName={item.name}
            />
            <DownloadPrintFiles
              objects={item.objects}
              side={mockupSide}
              sideTemplate={sideTemplate}
              garmentWidthMm={garment?.garmentWidthMm}
              productName={item.name}
            />
            <p className="tiny">
              {item.brand} · {item.color} · {item.decoration} · {item.rush}
            </p>
          </div>

          <div className="admin-card">
            <h2>Job ticket — where to print</h2>
            <p className="tiny">
              {item.styleCode ? `Style ${item.styleCode} · ` : ""}
              {item.brand} · {item.color} · catalog.db tables: orders, order_items, order_placements, view order_details
            </p>
            {item.printJobs.length === 0 ? (
              <p className="muted">No artwork on this garment.</p>
            ) : (
              item.printJobs.map((job) => (
                <div key={`${job.side}-${job.code}`} className="job-ticket">
                  <p className="badge-location">{job.label}</p>
                  <p className="tiny">Code {job.code} · {job.side} side</p>
                  {job.printAreaIn ? (
                    <p>
                      Print area {job.printAreaIn.w}" × {job.printAreaIn.h}"
                      {job.pixelsPerInch ? ` · ${job.pixelsPerInch} ppi` : ""}
                      {job.printBoxPx
                        ? ` · box ${job.printBoxPx.w}×${job.printBoxPx.h}px at ${job.printBoxPx.x},${job.printBoxPx.y}`
                        : ""}
                    </p>
                  ) : null}
                  <p>{job.shopNote}</p>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Artwork</th>
                        <th>Print size</th>
                        <th>From left of box</th>
                        <th>From top of box</th>
                        <th>On garment photo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.artworks.map((art) => (
                        <tr key={art.id}>
                          <td>{artworkLabel(art.obj)}</td>
                          <td>
                            {art.widthIn.toFixed(1)}" × {art.heightIn.toFixed(1)}"
                          </td>
                          <td>{art.leftIn.toFixed(1)}"</td>
                          <td>{art.topIn.toFixed(1)}"</td>
                          <td>
                            {art.pixelOnGarment
                              ? `${art.pixelOnGarment.w}×${art.pixelOnGarment.h}px @ ${art.pixelOnGarment.x},${art.pixelOnGarment.y}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}

            <h2>Print file — artwork only</h2>
            <p className="tiny">This is what goes on the screen, film or hoop — no shirt photo.</p>
            <div className="artwork-row">
              {item.objects.map((obj) => (
                <figure key={obj.id}>
                  <ArtworkOnly obj={obj} />
                  <figcaption className="tiny">{artworkLabel(obj)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
        );
      })}

      <div className="admin-card">
        <h2>Size run & quote</h2>
        {order.items.map((item) => (
          <div key={`qty-${item.id}`} className="qty-grid" style={{ maxWidth: 360 }}>
            {item.sizeQuantities
              .filter((s) => s.quantity > 0)
              .map((s) => (
                <p key={s.size}>
                  <strong>{s.size}</strong> {s.quantity}
                </p>
              ))}
          </div>
        ))}
        {quote ? (
          <dl className="price-dl">
            <div>
              <dt>Pieces</dt>
              <dd>{quote.line?.quantity ?? 0}</dd>
            </div>
            {quote.unitIncVat ? (
              <div>
                <dt>Each inc VAT</dt>
                <dd>{formatPricingGbp(quote.unitIncVat)}</dd>
              </div>
            ) : null}
            <div className="total">
              <dt>Total inc VAT</dt>
              <dd>{formatPricingGbp(order.totalIncVat)}</dd>
            </div>
          </dl>
        ) : (
          <p className="price-lg">{formatPricingGbp(order.totalIncVat)}</p>
        )}
      </div>
    </div>
  );
}
