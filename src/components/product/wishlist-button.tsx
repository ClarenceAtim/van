"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "@/lib/toast";
import { toggleWishlist } from "@/app/actions/account";
import { Button } from "@/components/ui/button";

export function WishlistButton({ slug }: { slug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="lg"
      disabled={pending}
      aria-pressed={saved ?? false}
      onClick={() =>
        start(async () => {
          const result = await toggleWishlist(slug);
          if (result.status === "signed-out") {
            router.push(`/login?next=${encodeURIComponent(pathname)}`);
            return;
          }
          if (result.status === "error") {
            toast.error(result.message);
            return;
          }
          setSaved(result.status === "added");
          toast.success(result.status === "added" ? "Saved to your wishlist" : "Removed from your wishlist");
        })
      }
    >
      <Heart className={saved ? "fill-current text-destructive" : ""} /> {saved ? "Saved" : "Save to wishlist"}
    </Button>
  );
}
