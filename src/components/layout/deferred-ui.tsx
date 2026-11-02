"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentType } from "react";
import { useCart } from "@/components/cart/cart-provider";
import type { ToasterProps } from "sonner";
import { toasterMounted } from "@/lib/toast";

// Heavy dialog/toast code is only downloaded when it's needed, keeping first-load JS small.
const CartDrawer = dynamic(() => import("@/components/cart/cart-drawer").then((m) => m.CartDrawer), { ssr: false });

export function DeferredUi() {
  const { open } = useCart();
  const [drawerRequested, setDrawerRequested] = useState(false);
  const [Toaster, setToaster] = useState<ComponentType<ToasterProps> | null>(null);
  if (open && !drawerRequested) setDrawerRequested(true);

  // Toasts only follow user actions, so the toast library is fetched once the page is idle.
  // (A plain import() keeps it out of the page's preloaded scripts, unlike next/dynamic.)
  useEffect(() => {
    let cancelled = false;
    const load = () => import("@/components/ui/sonner").then((m) => !cancelled && setToaster(() => m.Toaster));
    const idle = "requestIdleCallback" in window;
    const id = idle ? window.requestIdleCallback(load, { timeout: 4000 }) : setTimeout(load, 2000);
    // A toast before then loads it straight away.
    window.addEventListener("toaster:needed", load, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("toaster:needed", load);
      if (idle) window.cancelIdleCallback(id as number);
      else clearTimeout(id);
    };
  }, []);

  // Runs after the toaster's own effects, so it is subscribed before queued toasts are shown.
  useEffect(() => {
    if (Toaster) toasterMounted();
  }, [Toaster]);

  return (
    <>
      {drawerRequested && <CartDrawer />}
      {Toaster && <Toaster theme="light" position="top-center" richColors />}
    </>
  );
}
