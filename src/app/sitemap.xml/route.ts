import { absoluteUrl } from "@/lib/seo";
import { getSitemapGroups, SITEMAP_GROUPS, SITEMAP_INDEX_THRESHOLD, sitemapIndexXml, urlsetXml, xmlResponse } from "@/lib/sitemap";

// Static, rebuilt on every deploy (new blog posts and product JSON pushed to GitHub), at most
// hourly, and when products change in /admin: the catalog data it reads is cached under
// CATALOG_TAG, which the admin actions and /api/revalidate invalidate.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const groups = await getSitemapGroups();
  const all = SITEMAP_GROUPS.flatMap((g) => groups[g]);
  if (all.length <= SITEMAP_INDEX_THRESHOLD) return xmlResponse(urlsetXml(all));
  return xmlResponse(
    sitemapIndexXml(
      SITEMAP_GROUPS.map((g) => ({
        loc: absoluteUrl(`/sitemaps/${g}.xml`),
        lastmod: groups[g].map((e) => e.lastmod).filter(Boolean).sort().at(-1),
      })),
    ),
  );
}
