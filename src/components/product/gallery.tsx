"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ZoomIn } from "lucide-react";
import dynamic from "next/dynamic";
import type { ProductImage } from "@/lib/products/schema";

const ZoomDialog = dynamic(() => import("@/components/product/zoom-dialog").then((m) => m.ZoomDialog), { ssr: false });

/** Product image gallery with hover zoom (desktop) and a full-screen view (tap/click). */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [origin, setOrigin] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const image = images[index];
  if (!image)
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-muted p-6 text-center text-muted-foreground">
        <p>
          <span className="block font-medium text-foreground">Photo coming soon</span>
          <span className="mt-1 block text-sm">We&apos;re photographing {name}. Contact us if you&apos;d like to see one first.</span>
        </p>
      </div>
    );

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
          preload
          fetchPriority="high"
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
          {image.representative && <strong className="font-medium text-foreground">Representative photo. </strong>}
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

      {open && <ZoomDialog image={image} name={name} onClose={() => setOpen(false)} />}
    </div>
  );
}
