import { Mail, MapPin, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContactForm } from "@/components/contact-form";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact Us",
  description: "Questions about an animal, an order or reptile care? Send us a message — real keepers reply within one business day.",
  path: "/contact",
});

export default function ContactPage() {
  const a = siteConfig.contact.address;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Contact", href: "/contact" }]} />
      <h1 className="mt-4 text-4xl font-semibold">Contact us</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Questions about an animal, your order or setting up an enclosure? Real keepers answer every message within one business day.</p>
      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_280px]">
        <ContactForm />
        <aside className="space-y-5 text-sm">
          <p className="flex gap-3">
            <Mail className="size-5 shrink-0 text-primary" aria-hidden />
            <a href={`mailto:${siteConfig.contact.email}`} className="hover:underline">
              {siteConfig.contact.email}
            </a>
          </p>
          <p className="flex gap-3">
            <Phone className="size-5 shrink-0 text-primary" aria-hidden />
            <span>
              {siteConfig.contact.phone}
              <br />
              <span className="text-muted-foreground">{siteConfig.contact.hours}</span>
            </span>
          </p>
          <p className="flex gap-3">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
            <span>
              {a.street}
              <br />
              {a.city}, {a.region} {a.postalCode}
              <br />
              <span className="text-muted-foreground">Facility visits by appointment only.</span>
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}
