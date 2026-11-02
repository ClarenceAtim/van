import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getCategoryInfo, postPath, type Post } from "@/lib/blog";

export function PostCard({ post, priority = false, headingLevel = "h2" }: { post: Post; priority?: boolean; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
      <Link href={postPath(post)} className="relative block aspect-[16/9] overflow-hidden bg-muted" tabIndex={-1} aria-hidden>
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          fill
          preload={priority}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-semibold tracking-wide text-leaf uppercase">
          <Link href={`/blog/category/${post.category}`} className="hover:underline">
            {getCategoryInfo(post.category)?.name}
          </Link>{" "}
          · {post.readingMinutes} min read
        </p>
        <Heading className="text-xl leading-snug font-semibold">
          <Link href={postPath(post)} className="hover:underline focus-visible:underline">
            {post.title}
          </Link>
        </Heading>
        <p className="line-clamp-3 text-sm text-muted-foreground">{post.description}</p>
        <p className="mt-auto pt-2 text-xs text-muted-foreground">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </p>
      </div>
    </article>
  );
}
