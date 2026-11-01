"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";

/** Re-fetches the cart (e.g. after the webhook emptied it post-payment). */
export function RefreshCart() {
  const { refresh } = useCart();
  useEffect(() => {
    const t = setTimeout(() => void refresh(), 1500);
    return () => clearTimeout(t);
  }, [refresh]);
  return null;
}
