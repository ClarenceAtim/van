import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/supabase/server";

export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/settings", label: "Settings" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Middleware already redirects signed-out visitors; this is the server-side re-check.
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/account");

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[200px_1fr]">
      <aside>
        <p className="mb-4 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{profile.email}</span>
        </p>
        <nav aria-label="Account">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
                  {n.label}
                </Link>
              </li>
            ))}
            {profile.role === "admin" && (
              <li>
                <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-muted">
                  Admin dashboard
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <form action={signOut} className="mt-4">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
