import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/blog/blog-index";
import { BLOG_CATEGORIES, getCategoryInfo, getPostsByCategory } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const c = getCategoryInfo((await params).category);
  if (!c) return {};
  // Empty categories (e.g. Shop News before its first post) stay out of search results.
  return pageMetadata({ title: `${c.name} – Reptile Care Blog`, description: c.description, path: `/blog/category/${c.slug}`, noIndex: getPostsByCategory(c.slug).length === 0 });
}

export default async function BlogCategoryPage({ params }: Props) {
  const c = getCategoryInfo((await params).category);
  if (!c) notFound();
  return (
    <BlogIndex
      title={c.name}
      intro={c.description}
      posts={getPostsByCategory(c.slug)}
      page={1}
      pages={1}
      base={`/blog/category/${c.slug}`}
      activeCategory={c.slug}
      crumbs={[
        { name: "Blog", href: "/blog" },
        { name: c.name, href: `/blog/category/${c.slug}` },
      ]}
    />
  );
}
