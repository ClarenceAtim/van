import "server-only";
import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f2e8;font-family:Arial,Helvetica,sans-serif;color:#2b2f2c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#1f4d3a;color:#f6f2e8;padding:20px 28px;font-size:20px;font-weight:bold">${esc(siteConfig.name)}</td></tr>
    <tr><td style="padding:28px"><h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>${body}</td></tr>
    <tr><td style="padding:16px 28px;background:#efe6d3;font-size:12px;color:#555">${esc(siteConfig.name)} · ${esc(siteConfig.contact.email)} · ${esc(siteConfig.contact.phone)}</td></tr>
  </table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return false;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, replyTo });
  if (error) {
    console.error("[email] send failed:", error.message);
    return false;
  }
  return true;
}

export type EmailOrder = {
  order_number: string;
  email: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_method: string;
  contains_live_animals: boolean;
  items: { product_name: string; quantity: number; line_total_cents: number }[];
};

export function sendOrderConfirmation(order: EmailOrder) {
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.product_name)} × ${i.quantity}</td><td align="right">${formatMoney(i.line_total_cents, order.currency)}</td></tr>`)
    .join("");
  const animalNote = order.contains_live_animals
    ? `<p style="background:#efe6d3;padding:12px;border-radius:8px">Your order includes live animals. They ship overnight (${siteConfig.shipping.liveAnimalShipDays}) when the weather along the route is safe. We'll email tracking as soon as your box is packed — please make sure someone can receive it on delivery day.</p>`
    : "";
  return send(
    order.email,
    `Order ${order.order_number} confirmed`,
    layout(
      `Thanks for your order!`,
      `<p>We've received payment for order <strong>${esc(order.order_number)}</strong> and we're getting it ready.</p>${animalNote}
      <table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0">${rows}
      <tr><td style="padding-top:12px;border-top:1px solid #ddd">Subtotal</td><td align="right" style="padding-top:12px;border-top:1px solid #ddd">${formatMoney(order.subtotal_cents, order.currency)}</td></tr>
      <tr><td>Shipping</td><td align="right">${order.shipping_cents ? formatMoney(order.shipping_cents, order.currency) : "Free"}</td></tr>
      ${order.tax_cents ? `<tr><td>Tax</td><td align="right">${formatMoney(order.tax_cents, order.currency)}</td></tr>` : ""}
      <tr><td style="font-weight:bold">Total</td><td align="right" style="font-weight:bold">${formatMoney(order.total_cents, order.currency)}</td></tr></table>
      <p><a href="${absoluteUrl("/account/orders")}" style="color:#1f4d3a">View your orders</a></p>`,
    ),
  );
}

export function sendShippingUpdate(o: { email: string; order_number: string; carrier: string | null; tracking_number: string; contains_live_animals: boolean }) {
  return send(
    o.email,
    `Order ${o.order_number} has shipped`,
    layout(
      "Your order is on its way",
      `<p>Order <strong>${esc(o.order_number)}</strong> has shipped${o.carrier ? ` with ${esc(o.carrier)}` : ""}.</p>
      <p style="font-size:18px">Tracking number: <strong>${esc(o.tracking_number)}</strong></p>
      ${o.contains_live_animals ? `<p>Please open live animal boxes on arrival and check on your new reptile right away. If anything is wrong, email photos within 2 hours of delivery under our <a href="${absoluteUrl("/live-arrival-guarantee")}" style="color:#1f4d3a">Live Arrival Guarantee</a>.</p>` : ""}`,
    ),
  );
}

export function sendContactNotification(m: { name: string; email: string; subject: string; message: string }) {
  const to = process.env.CONTACT_INBOX_EMAIL || siteConfig.contact.email;
  return send(
    to,
    `Contact form: ${m.subject.slice(0, 80)}`,
    layout("New contact message", `<p><strong>From:</strong> ${esc(m.name)} &lt;${esc(m.email)}&gt;</p><p><strong>Subject:</strong> ${esc(m.subject)}</p><p style="white-space:pre-wrap">${esc(m.message)}</p>`),
    m.email,
  );
}
