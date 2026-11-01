"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ProductImage } from "@/lib/products/schema";

export function ZoomDialog({ image, name, onClose }: { image: ProductImage; name: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(96vw,1400px)] p-2 sm:max-w-[min(96vw,1400px)]">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <div className="relative aspect-[4/3] w-full">
          <Image src={image.url} alt={image.alt} fill sizes="96vw" className="rounded-lg object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
