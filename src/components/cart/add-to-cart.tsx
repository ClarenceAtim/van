"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY_PER_LINE } from "@/lib/pricing";

export function AddToCart({ slug, name, stock, withQuantity = false }: { slug: string; name: string; stock: number; withQuantity?: boolean }) {
  const { add, pending } = useCart();
  const [quantity, setQuantity] = useState(1);
  const max = Math.min(stock, MAX_QUANTITY_PER_LINE);

  if (stock <= 0) {
    return (
      <Button disabled variant="secondary" className={withQuantity ? "h-12 w-full" : "w-full"}>
        Sold out
      </Button>
    );
  }

  if (!withQuantity) {
    return (
      <Button className="w-full" disabled={pending} onClick={() => add(slug, 1)} aria-label={`Add ${name} to cart`}>
        <ShoppingBag /> Add to cart
      </Button>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex items-center rounded-lg border border-input" role="group" aria-label="Quantity">
        <Button variant="ghost" size="icon-lg" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)}>
          <Minus />
        </Button>
        <output className="w-10 text-center tabular-nums" aria-live="polite">
          {quantity}
        </output>
        <Button variant="ghost" size="icon-lg" aria-label="Increase quantity" disabled={quantity >= max} onClick={() => setQuantity((q) => q + 1)}>
          <Plus />
        </Button>
      </div>
      <Button size="lg" className="flex-1" disabled={pending} onClick={() => add(slug, quantity)}>
        <ShoppingBag /> Add to cart
      </Button>
    </div>
  );
}
