import { guardPage } from "@/lib/server/admin-page";
import { ReviewsView } from "./view";

export default async function Page() {
  await guardPage("reviews");
  return <ReviewsView />;
}
