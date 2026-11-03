import { siteConfig } from "@/config/site";
import { getAuthor, getCategoryInfo, getPosts, lastModified, postPath } from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo";

// Rebuilt on every deploy, so new posts pushed to GitHub appear automatically.
export const dynamic = "force-static";
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const posts = getPosts();
  const items = posts
    .map((p) => {
      const url = absoluteUrl(postPath(p));
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.description)}</description>
      <category>${esc(getCategoryInfo(p.category)?.name ?? p.category)}</category>
      <dc:creator>${esc(getAuthor(p.author).name)}</dc:creator>
      <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");
  const newest = posts[0] ? new Date(`${lastModified(posts[0])}T12:00:00Z`).toUTCString() : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(`${siteConfig.name} Blog`)}</title>
    <link>${absoluteUrl("/blog")}</link>
    <atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>${esc("Reptile care guides, habitat setup, feeding and health advice.")}</description>
    <language>${siteConfig.locale.toLowerCase()}</language>
    <lastBuildDate>${newest}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
