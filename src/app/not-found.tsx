import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-sm font-semibold tracking-widest text-leaf uppercase">404</p>
      <h1 className="mt-2 text-4xl font-semibold">This page slithered away</h1>
      <p className="mt-4 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved. Try searching instead:</p>
      <SearchBox className="mx-auto mt-6 max-w-md text-left" />
      <Link href="/shop" className={`${buttonVariants({ size: "lg" })} mt-8`}>
        Browse the shop
      </Link>
    </div>
  );
}
