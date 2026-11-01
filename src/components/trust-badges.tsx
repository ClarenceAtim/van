import Link from "next/link";
import { Egg, Lock, ShieldCheck, Truck } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, title: "Live Arrival Guarantee", text: "Every animal arrives alive and healthy, or we make it right.", href: "/live-arrival-guarantee" },
  { icon: Egg, title: "100% captive bred", text: "Hatched and raised in our facility. Never wild caught.", href: "/about" },
  { icon: Truck, title: "Overnight animal shipping", text: "Insulated boxes, weather-checked routes, Mon–Wed only.", href: "/shipping" },
  { icon: Lock, title: "Secure checkout", text: "Payments processed by Stripe. We never see your card.", href: "/faq" },
];

export function TrustBadges() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {BADGES.map(({ icon: Icon, title, text, href }) => (
        <li key={title}>
          <Link href={href} className="flex h-full gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40">
            <Icon className="size-7 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
