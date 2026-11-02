import { BlogIndex } from "@/components/blog/blog-index";
import { getPosts, pageCount, POSTS_PER_PAGE } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Reptile Care Blog: Guides, Setup & Feeding Tips",
  description: "Expert reptile care articles from ScaleHaven: species care guides, enclosure and UVB setup, feeding, supplements, health checks and beginner tips.",
  path: "/blog",
});

export default function BlogPage() {
  const posts = getPosts();
  const featured = posts.find((p) => p.featured) ?? posts[0] ?? null;
  const rest = posts.filter((p) => p !== featured);
  return (
    <BlogIndex
      title="Reptile care blog"
      intro="Practical, vet-informed advice on housing, heating, feeding and keeping your reptile healthy, from the team that raises our animals."
      posts={rest.slice(0, POSTS_PER_PAGE)}
      featured={featured}
      page={1}
      pages={pageCount(rest.length)}
      base="/blog"
      crumbs={[{ name: "Blog", href: "/blog" }]}
    />
  );
}
