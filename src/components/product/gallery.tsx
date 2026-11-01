"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ProductImage } from "@/lib/products/schema";

/** Product image gallery with hover zoom (desktop) and a full-screen view (tap/click). */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [origin, setOrigin] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const image = images[index];
  if (!image) return <div className="aspect-[4/3] rounded-2xl bg-muted" />;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onMouseLeave={() => setOrigin(null)}
        className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted"
        aria-label={`Enlarge image: ${image.alt}`}
      >
        <Image
          src={image.url}
          alt={image.alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-200"
          style={origin && !image.placeholder ? { transform: "scale(1.8)", transformOrigin: origin } : undefined}
        />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow">
          <ZoomIn className="size-3.5" aria-hidden /> Zoom
        </span>
      </button>

      {images.length > 1 && (
        <ul className="flex gap-2" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={`relative block size-20 overflow-hidden rounded-lg border-2 ${i === index ? "border-primary" : "border-transparent"}`}
              >
                <Image src={img.thumbnail_url ?? img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {image.credit && !image.placeholder && (
        <p className="text-xs text-muted-foreground">
          Photo: {image.credit} ({image.license}).{" "}
          <Link href="/credits" className="underline underline-offset-2">
            Image credits
          </Link>
          {image.source_url && (
            <>
              {" · "}
              <a href={image.source_url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
                Source
              </a>
            </>
          )}
        </p>
      )}
      {image.placeholder && <p className="text-xs text-muted-foreground">Illustration — product photo coming soon.</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(96vw,1400px)] p-2 sm:max-w-[min(96vw,1400px)]">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <div className="relative aspect-[4/3] w-full">
            <Image src={image.url} alt={image.alt} fill sizes="96vw" className="rounded-lg object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
