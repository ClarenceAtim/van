"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import type { CartLine } from "@/lib/cart";
import { formatMoney, productPath } from "@/lib/format";
import { MAX_QUANTITY_PER_LINE } from "@/lib/pricing";

export function CartLines({ lines, compact = false, onNavigate }: { lines: CartLine[]; compact?: boolean; onNavigate?: () => void }) {
  const { update, pending } = useCart();
  return (
    <ul className="divide-y divide-border">
      {lines.map((line) => {
        const img = line.product.image;
        const max = Math.min(line.stock, MAX_QUANTITY_PER_LINE);
        return (
          <li key={line.slug} className="flex gap-4 py-4">
            <Link href={productPath(line.product)} onClick={onNavigate} className="shrink-0 overflow-hidden rounded-lg bg-muted">
              {img && (
                <Image
                  src={img.thumbnail_url ?? img.url}
                  alt={img.alt}
                  width={compact ? 80 : 112}
                  height={compact ? 60 : 84}
                  className="aspect-[4/3] object-cover"
                />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-3">
                <Link href={productPath(line.product)} onClick={onNavigate} className="font-medium leading-snug hover:underline">
                  {line.name}
                </Link>
                <span className="shrink-0 font-semibold">{formatMoney(line.lineTotalCents)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatMoney(line.unitPriceCents)} each
                {line.isLiveAnimal && " · Live animal"}
              </p>
              {line.stock < line.quantity && (
                <p className="text-sm font-medium text-destructive">{line.stock === 0 ? "Sold out — please remove" : `Only ${line.stock} left`}</p>
              )}
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-input" role="group" aria-label={`Quantity for ${line.name}`}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Decrease quantity of ${line.name}`}
                    disabled={pending}
                    onClick={() => update(line.slug, line.quantity - 1)}
                  >
                    <Minus />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                    {line.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Increase quantity of ${line.name}`}
                    disabled={pending || line.quantity >= max}
                    onClick={() => update(line.slug, line.quantity + 1)}
                  >
                    <Plus />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => update(line.slug, 0)} aria-label={`Remove ${line.name}`}>
                  <Trash2 /> Remove
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
