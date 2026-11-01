import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/format";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Frequently Asked Questions",
  description: "Answers about live animal shipping, our Live Arrival Guarantee, payments, returns and reptile care before you buy.",
  path: "/faq",
});

const s = siteConfig.shipping;
const FAQ: { group: string; items: { question: string; answer: string }[] }[] = [
  {
    group: "Live animals",
    items: [
      { question: "Are your reptiles captive bred?", answer: "Yes. Every animal we sell is captive bred and raised in our facility. We never sell wild-caught reptiles." },
      { question: "How are live animals shipped?", answer: `Overnight in insulated boxes, ${s.liveAnimalShipDays} only, for a flat ${formatMoney(s.liveAnimalOvernightCents)} per order. We hold shipments when the weather along the route is unsafe.` },
      { question: "What happens if my animal arrives sick or dead?", answer: "Our Live Arrival Guarantee covers it. Email photos within 2 hours of delivery and we'll replace the animal or refund it, including shipping." },
      { question: "How old do I need to be to buy a reptile?", answer: `You must be ${siteConfig.liveAnimals.minimumAge} or older. You'll confirm this at checkout.` },
      { question: "Can you ship to my state?", answer: "We ship live animals to most US states. Some states restrict certain species, and we don't ship animals to Hawaii or Alaska. You'll choose your state at checkout and we'll tell you if we can't ship there." },
      { question: "Is my animal eating before it ships?", answer: "Yes. Every animal must take at least five consecutive meals before it's listed, and we include its feeding record with your order." },
    ],
  },
  {
    group: "Orders & payment",
    items: [
      { question: "Is checkout secure?", answer: "Payments are handled by Stripe, a PCI Level 1 certified provider. Your card details go straight to Stripe and never touch our servers." },
      { question: "Which payment methods do you accept?", answer: "All major credit and debit cards, plus Apple Pay and Google Pay where your device supports them." },
      { question: "How much is shipping for supplies?", answer: `Standard shipping is ${formatMoney(s.standardCents)}, and free on supply orders over ${formatMoney(s.freeStandardOverCents)}.` },
      { question: "Can I return supplies?", answer: "Unopened supplies can be returned within 30 days. Opened food, substrate and live feeders can't be returned for hygiene reasons." },
    ],
  },
  {
    group: "Care",
    items: [
      { question: "Which reptile is best for a beginner?", answer: "Leopard geckos, corn snakes, crested geckos and ball pythons are all excellent first reptiles: they stay a manageable size, are generally calm, and have well-understood care." },
      { question: "Do I really need UVB lighting?", answer: "For diurnal lizards like bearded dragons and uromastyx, yes: strong UVB is essential to prevent metabolic bone disease. Many geckos and snakes also benefit from low-level UVB." },
      { question: "Should my enclosure be set up before the animal arrives?", answer: "Yes. Set it up at least a few days early and confirm the temperatures with a digital thermometer so your new reptile can settle in straight away." },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: "FAQ", href: "/faq" }]} />
      <h1 className="mt-4 text-4xl font-semibold">Frequently asked questions</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Can&apos;t find your answer?{" "}
        <Link href="/contact" className="text-primary underline underline-offset-4">
          Contact us
        </Link>{" "}
        — we reply within one business day.
      </p>
      {FAQ.map((section) => (
        <section key={section.group} className="mt-10" aria-labelledby={`faq-${section.group}`}>
          <h2 id={`faq-${section.group}`} className="mb-4 text-2xl font-semibold">
            {section.group}
          </h2>
          <div className="divide-y rounded-2xl border">
            {section.items.map((item) => (
              <details key={item.question} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  <h3 className="font-sans text-base">{item.question}</h3>
                  <span aria-hidden className="text-xl text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <JsonLd data={faqJsonLd(FAQ.flatMap((g) => g.items))} />
    </div>
  );
}
