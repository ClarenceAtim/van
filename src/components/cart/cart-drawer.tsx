"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { CartLines } from "@/components/cart/cart-lines";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export function CartDrawer() {
  const { cart, open, setOpen } = useCart();
  const lines = cart?.lines ?? [];
  const remaining = siteConfig.shipping.freeStandardOverCents - (cart?.totals.subtotalCents ?? 0);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link href="/shop" onClick={close} className={buttonVariants()}>
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              {!cart!.totals.containsLiveAnimals && remaining > 0 && (
                <p className="mt-4 rounded-lg bg-sand/60 px-3 py-2 text-sm">
                  Add {formatMoney(remaining)} more for <strong>free standard shipping</strong>.
                </p>
              )}
              <CartLines lines={lines} compact onNavigate={close} />
            </div>
            <SheetFooter className="border-t">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold">{formatMoney(cart!.totals.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>{cart!.totals.shippingLabel}</dt>
                  <dd>{cart!.totals.shippingCents === 0 ? "Free" : formatMoney(cart!.totals.shippingCents)}</dd>
                </div>
              </dl>
              <Link href="/checkout" onClick={close} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                Checkout
              </Link>
              <Link href="/cart" onClick={close} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                View full cart
              </Link>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
