import { SignupForm } from "@/components/auth/signup-form";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Create an account", description: "Create a ScaleHaven Reptiles account.", path: "/signup", noIndex: true });

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="mb-2 text-4xl font-semibold">Create an account</h1>
      <p className="mb-8 text-muted-foreground">Faster checkout, order tracking and a wishlist for your next reptile.</p>
      <SignupForm />
    </div>
  );
}
