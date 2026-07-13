/** §0.4 IA: /account/profile/security — anchored panel on the profile page. */
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/account/profile#security");
}
