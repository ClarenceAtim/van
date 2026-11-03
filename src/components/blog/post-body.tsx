import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { Info } from "lucide-react";
import { headingId } from "@/lib/blog";

function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? text(c.props.children) : ""))
    .join("");
}

/** Callout box: <Note>Text</Note> in a post. */
function Note({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 flex gap-3 rounded-xl border border-sand-strong bg-sand/40 p-4 text-[0.98rem] not-italic">
      <Info className="mt-0.5 size-5 shrink-0 text-forest" aria-hidden />
      <div className="[&>p]:my-0">{children}</div>
    </aside>
  );
}

const components = {
  // A post's title is the page's only H1, so a stray "# Heading" renders as H2.
  h1: ({ children }: { children?: ReactNode }) => <h2 id={headingId(text(children))}>{children}</h2>,
  h2: ({ children }: { children?: ReactNode }) => <h2 id={headingId(text(children))} className="scroll-mt-28">{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 id={headingId(text(children))} className="scroll-mt-28">{children}</h3>,
  a: ({ href = "", children }: { href?: string; children?: ReactNode }) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} rel="noopener noreferrer nofollow" target="_blank">
        {children}
      </a>
    ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  Note,
};

/**
 * Renders a post's MDX body from the repo. JavaScript expressions are blocked
 * (next-mdx-remote's default), so posts can use Markdown and <Note> only.
 */
export function PostBody({ source }: { source: string }) {
  return (
    <div className="prose-store">
      <MDXRemote source={source} components={components} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
    </div>
  );
}
