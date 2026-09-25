import { redirect } from "next/navigation";

export default async function AdminGarmentRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/garments?id=${id}`);
}
