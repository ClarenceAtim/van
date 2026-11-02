import { notFound } from "next/navigation";
import { getSitemapGroups, SITEMAP_GROUPS, urlsetXml, xmlResponse, type SitemapGroup } from "@/lib/sitemap";

/** Per-group sitemaps (/sitemaps/products.xml …), listed by /sitemap.xml once the site passes 1,000 URLs. */
export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return SITEMAP_GROUPS.map((g) => ({ name: `${g}.xml` }));
}

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const group = (await params).name.replace(/\.xml$/, "") as SitemapGroup;
  if (!SITEMAP_GROUPS.includes(group)) notFound();
  return xmlResponse(urlsetXml((await getSitemapGroups())[group]));
}
