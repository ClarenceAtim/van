"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

// Heavy dialog/toast code is only downloaded when it's needed, keeping first-load JS small.
const CartDrawer = dynamic(() => import("@/components/cart/cart-drawer").then((m) => m.CartDrawer), { ssr: false });
const Toaster = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), { ssr: false });

export function DeferredUi() {
  const { open } = useCart();
  const [drawerRequested, setDrawerRequested] = useState(false);
  if (open && !drawerRequested) setDrawerRequested(true);
  return (
    <>
      {drawerRequested && <CartDrawer />}
      <Toaster theme="light" position="top-center" richColors />
    </>
  );
}
