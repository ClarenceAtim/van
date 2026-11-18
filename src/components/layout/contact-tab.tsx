import { MessageCircle, MessageSquare, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * Floating Call / Text / WhatsApp tab on the right edge of every page.
 * Mid-height on purpose: the live-chat bubble lives in the bottom-right corner.
 */
export function ContactTab() {
  const digits = siteConfig.contact.phone.replace(/\D/g, "");
  const items = [
    { href: `tel:+${digits}`, label: "Call", action: "Call us", Icon: Phone },
    { href: `sms:+${digits}`, label: "Text", action: "Text us", Icon: MessageSquare },
    { href: `https://wa.me/${digits}`, label: "WhatsApp", action: "Message us on WhatsApp", Icon: MessageCircle },
  ];
  return (
    <div className="fixed top-1/2 right-0 z-40 flex -translate-y-1/2 flex-col divide-y divide-primary-foreground/20 overflow-hidden rounded-l-xl bg-primary text-primary-foreground shadow-lg">
      {items.map(({ href, label, action, Icon }) => (
        <a
          key={label}
          href={href}
          aria-label={`${action} on ${siteConfig.contact.phone}`}
          className="flex min-h-12 w-14 flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:bg-primary/80 focus-visible:outline-none"
        >
          <Icon className="size-5" aria-hidden />
          <span className="text-[10px] leading-none font-medium">{label}</span>
        </a>
      ))}
    </div>
  );
}
