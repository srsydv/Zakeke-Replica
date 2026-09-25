import { ShopView } from "@/components/ShopView";

export default async function ShopIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  return (
    <ShopView
      title="All products"
      subtitle="Ralawise blanks, grouped by style. Open a garment to design it."
      shop={undefined}
      q={sp.q}
      page={Number(sp.page || 1)}
    />
  );
}
