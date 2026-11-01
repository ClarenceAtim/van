"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

export function CartButton() {
  const { cart, setOpen } = useCart();
  const count = cart?.count ?? 0;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}
