"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import type { Cart } from "@/lib/cart";

type CartContextValue = {
  cart: Cart | null;
  pending: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (slug: string, quantity?: number) => Promise<boolean>;
  update: (slug: string, quantity: number) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cart", { cache: "no-store" });
    if (res.ok) setCart(await res.json());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = useCallback(async (method: "POST" | "PATCH", slug: string, quantity: number) => {
    setPending(true);
    try {
      const res = await fetch("/api/cart", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update your cart.");
        return false;
      }
      setCart(data);
      if (data.notice) toast.info(data.notice);
      return true;
    } catch {
      toast.error("Network error. Please try again.");
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      pending,
      open,
      setOpen,
      refresh,
      add: async (slug, quantity = 1) => {
        const ok = await mutate("POST", slug, quantity);
        if (ok) setOpen(true);
        return ok;
      },
      update: (slug, quantity) => mutate("PATCH", slug, quantity),
    }),
    [cart, pending, open, refresh, mutate],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
