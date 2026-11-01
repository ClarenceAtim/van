import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Checkout cancelled", description: "Your checkout was cancelled.", path: "/checkout/cancelled", noIndex: true });

export default function CancelledPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-4xl font-semibold">Checkout cancelled</h1>
      <p className="mt-4 text-lg text-muted-foreground">No payment was taken. Your cart is saved, so you can pick up where you left off.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/cart" className={buttonVariants({ size: "lg" })}>
          Return to cart
        </Link>
        <Link href="/contact" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Need help?
        </Link>
      </div>
    </div>
  );
}
