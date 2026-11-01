"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Menu } from "lucide-react";

// The sheet (dialog) code loads on first tap instead of with every page.
const MobileMenuSheet = dynamic(() => import("@/components/layout/mobile-menu-sheet").then((m) => m.MobileMenuSheet), { ssr: false });

export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {loaded && <MobileMenuSheet items={items} open={open} onOpenChange={setOpen} />}
    </>
  );
}
