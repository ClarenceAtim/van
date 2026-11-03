import { notFound, permanentRedirect } from "next/navigation";

export const dynamicParams = false;

/** Old /care-guides/<slug> URLs → the blog posts that replaced them. */
const MOVED: Record<string, string> = {
  "leopard-gecko-care-guide": "/blog/leopard-gecko-care-guide",
  "ball-python-care-guide": "/blog/ball-python-care-guide",
  "bearded-dragon-uvb-heating": "/blog/bearded-dragon-care-sheet",
  "bioactive-enclosure-basics": "/blog/how-to-set-up-a-bioactive-terrarium",
};

export function generateStaticParams() {
  return Object.keys(MOVED).map((slug) => ({ slug }));
}

export default async function MovedGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const to = MOVED[(await params).slug];
  if (!to) notFound();
  permanentRedirect(to);
}
