import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { ProductDetail } from "@/components/ProductDetail";
import { getProduct } from "@/lib/catalog";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return (
    <>
      <ProductDetail product={product} />
      <Footer />
    </>
  );
}
