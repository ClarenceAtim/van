"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function MobileMenuSheet({ items, open, onOpenChange }: { items: { href: string; label: string }[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile">
          <ul className="px-2">
            {[{ href: "/shop", label: "Shop all" }, ...items, { href: "/account", label: "My account" }, { href: "/contact", label: "Contact us" }].map((i) => (
              <li key={i.href}>
                <Link href={i.href} onClick={() => onOpenChange(false)} className="block rounded-lg px-3 py-3 font-medium hover:bg-muted">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
