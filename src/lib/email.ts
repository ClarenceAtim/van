import "server-only";
import { Resend } from "resend";
import { countryName, regionName } from "@/config/countries";
import { paymentMethodName, paymentMethodsLabel, paymentSettings } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { formatDate, formatMoney } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { absoluteUrl } from "@/lib/seo";

/**
 * Addresses come from env variables so they can change when you get a domain:
 *   ORDER_FROM_EMAIL          who emails are from, e.g. "ScaleHaven Reptiles <orders@yourdomain.com>"
 *   ORDER_REPLY_TO_EMAIL      where customer replies go (your inbox)
 *   ORDER_NOTIFICATION_EMAIL  where "New order" alerts go
 * Resend only sends from domains you've verified; until then use its test sender (onboarding@resend.dev).
 */
const from = () => process.env.ORDER_FROM_EMAIL || process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`;
const replyTo = () => process.env.ORDER_REPLY_TO_EMAIL || siteConfig.contact.email;
export const ownerEmail = () => process.env.ORDER_NOTIFICATION_EMAIL || process.env.CONTACT_INBOX_EMAIL || siteConfig.contact.email;

export type OutgoingEmail = { from: string; to: string; subject: string; html: string; text: string; replyTo?: string };
export type EmailTransport = (email: OutgoingEmail) => Promise<boolean>;

const resendTransport: EmailTransport = async (email) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${email.subject}" to ${email.to}`);
    return false;
  }
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send(email);
  if (error) {
    console.error("[email] send failed:", error.message);
    return false;
  }
  return true;
};

let transport: EmailTransport = resendTransport;
/** Tests swap in a fake transport to inspect what would be sent. */
export function setEmailTransport(t: EmailTransport | null) {
  transport = t ?? resendTransport;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Plain text (as typed in /admin) → safe HTML paragraphs. */
const textToHtml = (s: string) =>
  s
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

function layout(title: string, body: string, preheader = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
  <body style="margin:0;background:#f6f2e8;font-family:Arial,Helvetica,sans-serif;color:#2b2f2c;-webkit-text-size-adjust:100%">
  <span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#1f4d3a;color:#f6f2e8;padding:18px 24px;font-size:20px;font-weight:bold">${esc(siteConfig.name)}</td></tr>
    <tr><td style="padding:24px;font-size:15px"><h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${esc(title)}</h1>${body}
      <p style="margin:24px 0 0;font-size:13px;color:#555">Questions? Just reply to this email.</p></td></tr>
    <tr><td style="padding:14px 24px;background:#efe6d3;font-size:12px;color:#555">${esc(siteConfig.name)} · ${esc(siteConfig.contact.phone)}</td></tr>
  </table></td></tr></table></body></html>`;
}

const toText = (html: string) =>
  html
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(p|tr|h1|li)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function send(to: string, subject: string, title: string, body: string, opts: { replyTo?: string; preheader?: string } = {}) {
  const html = layout(title, body, opts.preheader);
  return transport({ from: from(), to, subject, html, text: toText(html), replyTo: opts.replyTo ?? replyTo() });
}

const box = (inner: string) => `<div style="background:#f6f2e8;border-radius:8px;padding:14px 16px;margin:16px 0">${inner}</div>`;
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#1f4d3a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${esc(label)}</a></p>`;
const hours = paymentSettings.confirmWithinHours;
const hi = (o: Order) => `<p>Hi ${esc(o.customer_name ?? "there")},</p>`;
const methods = (o: Order) => paymentMethodsLabel(o.payment_methods, o.payment_other);

function orderTable(o: Order) {
  const money = (c: number) => formatMoney(c, o.currency);
  const row = (label: string, value: string, style = "") =>
    `<tr><td style="padding:4px 0;${style}">${label}</td><td align="right" style="padding:4px 0;white-space:nowrap;${style}">${value}</td></tr>`;
  const items = (o.order_items ?? []).map((i) => row(`${esc(i.product_name)} × ${i.quantity}`, money(i.line_total_cents))).join("");
  return `<table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0;font-size:14px">${items}
    ${row("Subtotal", money(o.subtotal_cents), "border-top:1px solid #ddd;padding-top:10px")}
    ${o.tax_cents ? row(esc(siteConfig.tax.label), money(o.tax_cents)) : ""}
    ${row("Shipping", o.shipping_confirmed ? (o.shipping_cents ? money(o.shipping_cents) : "Free") : "Confirmed before you pay")}
    ${row(o.shipping_confirmed ? "Total" : "Total (before shipping)", money(o.total_cents), "font-weight:bold;padding-top:6px")}</table>`;
}

function addressBlock(o: Order) {
  const a = o.shipping_address;
  if (!a?.line1) return "";
  const cityLine = [a.city, a.state ? regionName(a.country ?? "", a.state) : "", a.postal_code].filter(Boolean).join(", ");
  return `<p style="margin:0;line-height:1.5"><strong>${esc(a.name ?? "")}</strong>${a.company ? `<br>${esc(a.company)}` : ""}<br>${esc(a.line1)}<br>${esc(cityLine)}<br>${esc(countryName(a.country))}</p>`;
}

// ───────────── To the customer ─────────────

export function sendOrderReceived(o: Order) {
  return send(
    o.email,
    `We've received your order ${o.order_number}`,
    `Thank you — your order ${o.order_number} has been received`,
    `${hi(o)}<p>Thanks for ordering from ${esc(siteConfig.name)}. Your order number is <strong>${esc(o.order_number)}</strong>.</p>
    ${box(`<strong>What happens next:</strong> within ${hours} hours we'll email you the shipping cost and the payment details for your chosen method (<strong>${esc(methods(o))}</strong>). No payment has been taken, and your items are reserved.`)}
    ${orderTable(o)}
    ${o.preferred_delivery_date ? `<p>Preferred delivery date: <strong>${esc(formatDate(o.preferred_delivery_date))}</strong> (we'll confirm the ship date by email).</p>` : ""}
    ${addressBlock(o)}`,
    { preheader: `Order ${o.order_number}: we'll confirm shipping and payment details within ${hours} hours.` },
  );
}

/** Replaces {{name}} placeholders; unknown ones are left as they are so mistakes are visible. */
export function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, key: string) => vars[key] ?? m);
}

/** The order confirmation written in /admin (items, shipping cost, total and payment details are in the text). */
export function sendOrderConfirmation(o: Order, subject: string, body: string) {
  return send(o.email, subject, `Your order ${o.order_number} is confirmed`, textToHtml(body), {
    preheader: `Total ${formatMoney(o.total_cents, o.currency)} including shipping. Payment details inside.`,
  });
}

export function sendPaymentReminder(o: Order) {
  return send(
    o.email,
    `Reminder: payment for order ${o.order_number}`,
    "A friendly reminder about your order",
    `${hi(o)}<p>We haven't received payment for order <strong>${esc(o.order_number)}</strong> (${formatMoney(o.total_cents, o.currency)}) yet.</p>
    ${box(`Please pay by <strong>${esc(o.payment_due_at ? formatDate(o.payment_due_at) : "tomorrow")}</strong> using the ${esc(paymentMethodName(o.confirmed_payment_method))} details we sent you. After that the order is cancelled and the items are released.`)}
    <p>Already paid? Just reply with your payment reference and we'll match it up.</p>`,
  );
}

export function sendPaymentConfirmed(o: Order) {
  return send(
    o.email,
    `Payment received for order ${o.order_number}`,
    "Payment received — thank you!",
    `${hi(o)}<p>We've received your payment for order <strong>${esc(o.order_number)}</strong>. We're getting it ready now and will email tracking as soon as it ships.</p>
    ${o.contains_live_animals ? box(`Your order includes live animals. They ship overnight (${esc(siteConfig.shipping.liveAnimalShipDays)}) when the weather along the route is safe${o.preferred_delivery_date ? `, aiming for delivery on ${esc(formatDate(o.preferred_delivery_date))}` : ""}. Please make sure an adult can receive the package.`) : ""}
    ${orderTable(o)}`,
  );
}

export function sendShippingUpdate(o: Order) {
  return send(
    o.email,
    `Order ${o.order_number} has shipped`,
    "Your order is on its way",
    `${hi(o)}<p>Order <strong>${esc(o.order_number)}</strong> has shipped${o.carrier ? ` with ${esc(o.carrier)}` : ""}.</p>
    ${box(`<span style="font-size:17px">Tracking number: <strong>${esc(o.tracking_number ?? "")}</strong></span>`)}
    ${o.contains_live_animals ? `<p>Please open live animal boxes on arrival and check on your new reptile right away. If anything is wrong, email photos within 2 hours of delivery under our <a href="${absoluteUrl("/live-arrival-guarantee")}" style="color:#1f4d3a">Live Arrival Guarantee</a>.</p>` : ""}`,
  );
}

export function sendOrderCancelled(o: Order, reason: string) {
  return send(
    o.email,
    `Order ${o.order_number} has been cancelled`,
    "Your order has been cancelled",
    `${hi(o)}<p>Order <strong>${esc(o.order_number)}</strong> has been cancelled. ${esc(reason)}</p>
    <p>If you've already paid or think this is a mistake, just reply to this email and we'll sort it out.</p>
    ${button(absoluteUrl("/shop"), "Visit the shop")}`,
  );
}

// ───────────── To the store owner ─────────────

export function sendNewOrderNotification(o: Order) {
  return send(
    ownerEmail(),
    `New order ${o.order_number} — ${formatMoney(o.total_cents, o.currency)} + shipping · ${countryName(o.shipping_address?.country)}`,
    `New order ${o.order_number}`,
    `${box(`<strong>Next step:</strong> within ${hours} hours, send ${esc(o.customer_name ?? "the customer")} the order confirmation with the shipping cost and payment details. They chose: <strong>${esc(methods(o))}</strong>.`)}
    ${button(absoluteUrl(`/admin/orders/${o.id}`), "Open order in admin")}
    <p style="line-height:1.6"><strong>Customer:</strong> ${esc(o.customer_name ?? "")}${o.company ? ` (${esc(o.company)})` : ""}<br><strong>Email:</strong> ${esc(o.email)}<br><strong>Phone:</strong> ${esc(o.phone ?? "")}
    ${o.contains_live_animals ? `<br><strong>Live animals:</strong> yes (18+ and policy confirmed)${o.preferred_delivery_date ? `, preferred delivery ${esc(formatDate(o.preferred_delivery_date))}` : ""}` : ""}</p>
    ${addressBlock(o)}
    ${o.delivery_notes ? `<p><strong>Order notes:</strong> ${esc(o.delivery_notes)}</p>` : ""}
    ${orderTable(o)}`,
    { replyTo: o.email },
  );
}

export function sendContactNotification(m: { name: string; email: string; subject: string; message: string }) {
  return send(
    process.env.CONTACT_INBOX_EMAIL || ownerEmail(),
    `Contact form: ${m.subject.slice(0, 80)}`,
    "New contact message",
    `<p><strong>From:</strong> ${esc(m.name)} &lt;${esc(m.email)}&gt;</p><p><strong>Subject:</strong> ${esc(m.subject)}</p><p style="white-space:pre-wrap">${esc(m.message)}</p>`,
    { replyTo: m.email },
  );
}
