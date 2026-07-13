/** §0.4 IA: /orders/:id/track — tracking lives on the order detail timeline. */
import { redirect } from "next/navigation";

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/account/orders/${id}#track`);
}
