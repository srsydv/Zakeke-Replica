import { notFound } from "next/navigation";
import { ShopView } from "@/components/ShopView";
import { SHOP_CATEGORIES } from "@/lib/catalog";

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { category } = await params;
  const sp = await searchParams;
  const meta = SHOP_CATEGORIES.find((c) => c.slug === category);
  if (!meta) notFound();
  return (
    <ShopView
      title={meta.label}
      subtitle={meta.blurb}
      shop={category}
      q={sp.q}
      page={Number(sp.page || 1)}
    />
  );
}
