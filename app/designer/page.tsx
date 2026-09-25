import { notFound } from "next/navigation";
import { DesignerStudio } from "@/components/DesignerStudio";
import { getProduct } from "@/lib/catalog";

export default async function DesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; color?: string; design?: string }>;
}) {
  const { productId, color, design } = await searchParams;
  const product = await getProduct(productId ?? "100");
  if (!product) notFound();
  return <DesignerStudio product={product} initialColor={color} designId={design} />;
}
