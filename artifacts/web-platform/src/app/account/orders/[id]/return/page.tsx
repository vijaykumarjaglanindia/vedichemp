/** §0.4 IA: /orders/:id/return — the return form lives on the order detail. */
import { redirect } from "next/navigation";

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/account/orders/${id}#return`);
}
