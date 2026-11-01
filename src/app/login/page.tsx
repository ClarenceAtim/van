import { LoginForms } from "@/components/auth/login-forms";
import { pageMetadata } from "@/lib/seo";
import { safeRedirect } from "@/lib/validation";

export const metadata = pageMetadata({ title: "Sign in", description: "Sign in to your ScaleHaven Reptiles account.", path: "/login", noIndex: true });

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="mb-2 text-4xl font-semibold">Sign in</h1>
      <p className="mb-8 text-muted-foreground">Track orders, save addresses and keep a wishlist.</p>
      <LoginForms next={safeRedirect(next)} linkError={error === "link"} />
    </div>
  );
}
