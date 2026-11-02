import Link from "next/link";
import { User } from "lucide-react";
import categories from "../../../data/categories.json";
import { CartButton } from "@/components/cart/cart-button";
import { Logo } from "@/components/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchBox } from "@/components/search-box";

const NAV = [...categories].sort((a, b) => a.sort_order - b.sort_order).map((c) => ({ href: `/shop/${c.slug}`, label: c.name }));

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
      <div className="bg-forest text-primary-foreground">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs sm:text-sm">
          Live Arrival Guarantee on every animal · Free shipping on supplies over $99
        </p>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <MobileMenu items={[...NAV, { href: "/blog", label: "Blog & Care Guides" }]} />
        <Link href="/" className="shrink-0 rounded-md text-foreground" aria-label="ScaleHaven Reptiles home">
          <Logo className="h-8 w-auto sm:h-9" />
        </Link>
        <SearchBox className="mx-auto hidden w-full max-w-md md:block" />
        <nav aria-label="Account and cart" className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/account" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted" aria-label="Your account">
            <User className="size-5" />
          </Link>
          <CartButton />
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
      <nav aria-label="Main" className="hidden border-t lg:block">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="inline-block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted">
                {n.label}
              </Link>
            </li>
          ))}
          <li className="ml-auto">
            <Link href="/blog" className="inline-block rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted">
              Blog & Care Guides
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
