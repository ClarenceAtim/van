"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { CartLines } from "@/components/cart/cart-lines";
import { OrderSummary } from "@/components/cart/order-summary";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CartPageClient() {
  const { cart } = useCart();
  if (!cart) return <Skeleton className="h-64 w-full" />;
  if (cart.lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="text-lg text-muted-foreground">Your cart is empty.</p>
        <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
          Start shopping
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section aria-label="Items">
        <CartLines lines={cart.lines} />
      </section>
      <aside aria-label="Order summary" className="h-fit space-y-4 rounded-2xl border p-5">
        <OrderSummary totals={cart.totals} />
        {cart.problems.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {cart.problems.map((p) => (
              <li key={p.slug + p.message}>{p.message}</li>
            ))}
          </ul>
        )}
        <Link
          href="/checkout"
          aria-disabled={cart.problems.length > 0}
          className={cn(buttonVariants({ size: "lg" }), "w-full", cart.problems.length > 0 && "pointer-events-none opacity-50")}
        >
          Continue to checkout
        </Link>
      </aside>
    </div>
  );
}
