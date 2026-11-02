import Link from "next/link";
import categories from "../../../data/categories.json";
import { Logo } from "@/components/logo";
import { NewsletterForm } from "@/components/newsletter-form";
import { siteConfig } from "@/config/site";

const COLUMNS = [
  { title: "Shop", links: [...categories].sort((a, b) => a.sort_order - b.sort_order).map((c) => ({ href: `/shop/${c.slug}`, label: c.name })) },
  {
    title: "Help",
    links: [
      { href: "/live-arrival-guarantee", label: "Live Arrival Guarantee" },
      { href: "/shipping", label: "Shipping Policy" },
      { href: "/returns", label: "Returns" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/blog", label: "Blog" },
      { href: "/blog/category/care-guides", label: "Care Guides" },
      { href: "/blog/rss.xml", label: "RSS Feed" },
      { href: "/credits", label: "Image Credits" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t bg-sand/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo className="h-9 w-auto text-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">{siteConfig.tagline}. Every animal is captive bred, health-checked and shipped overnight.</p>
          <div>
            <h2 className="mb-2 font-sans text-sm font-semibold">Care tips & restock alerts</h2>
            <NewsletterForm />
          </div>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 font-sans text-sm font-semibold">{col.title}</h2>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted-foreground hover:text-foreground hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All animals are captive bred and sold in accordance with local and federal law.
          </p>
          <p>
            <a href={`mailto:${siteConfig.contact.email}`} className="hover:underline">
              {siteConfig.contact.email}
            </a>{" "}
            · {siteConfig.contact.phone}
          </p>
        </div>
      </div>
    </footer>
  );
}
