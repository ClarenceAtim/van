import { CartPageClient } from "@/components/cart/cart-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Your cart", description: "Review the items in your cart.", path: "/cart", noIndex: true });

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-4xl font-semibold">Your cart</h1>
      <CartPageClient />
    </div>
  );
}
