/** §0.4 IA: /account/profile/preferences — anchored panel on the profile page. */
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/account/profile#preferences");
}
