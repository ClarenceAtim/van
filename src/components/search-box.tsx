"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";

type Result = { slug: string; name: string; url: string; price: string; image: string | null; alt: string };

/** Instant search combobox (WAI-ARIA combobox pattern) backed by /api/search. */
export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) {
          setResults((await res.json()).results);
          setOpen(true);
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(url: string) {
    setOpen(false);
    setQ("");
    router.push(url);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(results[active].url);
      else if (q.trim().length >= 2) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }

  const listId = `${id}-results`;
  const showList = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <form role="search" action="/search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={`${id}-input`} className="sr-only">
          Search products
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id={`${id}-input`}
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Search geckos, UVB, enclosures…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          className="h-11 w-full rounded-full border border-input bg-muted/60 pr-4 pl-10 text-sm outline-none focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </form>
      {showList && (
        <ul id={listId} role="listbox" className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border bg-popover shadow-lg">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No products match “{q}”.</li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.slug}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(r.url);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === active ? "bg-muted" : ""}`}
              >
                {r.image && <Image src={r.image} alt="" width={48} height={36} className="rounded object-cover" />}
                <span className="flex-1 truncate">{r.name}</span>
                <span className="font-medium">{r.price}</span>
              </li>
            ))
          )}
          {results.length > 0 && (
            <li role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); go(`/search?q=${encodeURIComponent(q.trim())}`); }} className="cursor-pointer border-t px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted">
              See all results for “{q.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
