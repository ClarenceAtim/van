import { notFound, permanentRedirect } from "next/navigation";
import { BlogIndex } from "@/components/blog/blog-index";
import { getPosts, pageCount, POSTS_PER_PAGE } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

type Props = { params: Promise<{ page: string }> };

/** Page 1 is /blog itself (it also holds the featured post). */
const listed = () => {
  const posts = getPosts();
  const featured = posts.find((p) => p.featured) ?? posts[0];
  return posts.filter((p) => p !== featured);
};

export function generateStaticParams() {
  return Array.from({ length: pageCount(listed().length) }, (_, i) => ({ page: String(i + 1) }));
}

export async function generateMetadata({ params }: Props) {
  const page = Number((await params).page);
  return pageMetadata({
    title: `Reptile Care Blog – Page ${page}`,
    description: `Older reptile care articles from ScaleHaven, page ${page}: care guides, habitat setup, feeding and health advice for pet reptiles.`,
    path: `/blog/page/${page}`,
  });
}

export default async function BlogPagedPage({ params }: Props) {
  const page = Number((await params).page);
  if (page === 1) permanentRedirect("/blog");
  const posts = listed();
  const pages = pageCount(posts.length);
  if (!Number.isInteger(page) || page < 1 || page > pages) notFound();
  return (
    <BlogIndex
      title="Reptile care blog"
      intro={`Page ${page} of ${pages}. Browse older articles or pick a category.`}
      posts={posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)}
      page={page}
      pages={pages}
      base="/blog"
      crumbs={[
        { name: "Blog", href: "/blog" },
        { name: `Page ${page}`, href: `/blog/page/${page}` },
      ]}
    />
  );
}
