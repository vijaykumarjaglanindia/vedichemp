/** §0.4 IA: /account/profile/privacy — anchored panel on the profile page. */
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/account/profile#privacy");
}
