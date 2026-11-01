import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? text(c.props.children) : ""))
    .join("");
}

/** "Live animals" → "live-animals", so headings can be linked to (e.g. /terms#live-animals). */
const anchor = (node: ReactNode) =>
  text(node)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Renders trusted repo Markdown (product descriptions, guides, policies).
 * Raw HTML is not rendered: react-markdown escapes it by default.
 */
export function Markdown({ children, headingOffset = 0 }: { children: string; headingOffset?: 0 | 1 }) {
  return (
    <div className="prose-store">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Keep a single H1 per page: content starts at H2 (or H3 inside a section).
          h1: ({ children }) => <h2 id={anchor(children)}>{children}</h2>,
          h2: ({ children }) => (headingOffset ? <h3 id={anchor(children)}>{children}</h3> : <h2 id={anchor(children)}>{children}</h2>),
          h3: ({ children }) => (headingOffset ? <h4 id={anchor(children)}>{children}</h4> : <h3 id={anchor(children)}>{children}</h3>),
          a: ({ href = "", children }) =>
            href.startsWith("/") || href.startsWith("#") ? (
              <Link href={href}>{children}</Link>
            ) : (
              <a href={href} rel="noopener noreferrer nofollow" target="_blank">
                {children}
              </a>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
