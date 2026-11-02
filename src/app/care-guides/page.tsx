import { permanentRedirect } from "next/navigation";

/** Care guides moved into the blog; keep old links and search rankings working. */
export default function CareGuidesPage() {
  permanentRedirect("/blog/category/care-guides");
}
