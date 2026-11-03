"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";

export type SearchablePost = { slug: string; title: string; description: string; category: string; tags: string[] };

/** Filters posts in the browser so the blog pages can stay fully static. */
export function BlogSearch({ posts }: { posts: SearchablePost[] }) {
  const [q, setQ] = useState("");
  const id = useId();
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return posts.filter((p) => {
      const hay = `${p.title} ${p.description} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, posts]);

  return (
    <div role="search" className="relative w-full max-w-md">
      <label htmlFor={id} className="sr-only">
        Search the blog
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search articles, e.g. humidity"
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {q.trim() && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border bg-popover p-2 shadow-lg" aria-live="polite">
          {results.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No articles match “{q}”.</p>
          ) : (
            <ul>
              {results.slice(0, 8).map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="block rounded-lg p-2 hover:bg-muted">
                    <span className="block text-sm font-medium">{p.title}</span>
                    <span className="block text-xs text-muted-foreground">{p.category}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
