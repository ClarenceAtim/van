# Orders and payments

The website does **not** take payments. Customers place an *order request*, choose how they want to pay, and you email them the payment details. When the money arrives, you mark the order as paid in /admin.

## 1. How an order flows

1. **Customer checks out** in 4 steps: contact and shipping, then delivery, then payment method, then review and **Place order**.
   - Prices, shipping and totals are recalculated on the server. The items are **reserved** (taken out of stock) straight away.
   - The customer sees their order number (for example `SH-10234`) and gets an **"Order received"** email.
   - You get a **"New order"** email with every detail and a link to the order in /admin.
2. **You send payment details.** Open the order in **/admin → Orders** (new orders are highlighted), check the pre-filled email and click **Send email to customer**.
   - Status: *Awaiting payment details* → *Payment details sent*.
   - The customer now has **3 days** to pay.
3. **The customer pays**, using your bank, PayPal, Zelle or other details.
4. **You mark it as paid.** On the order page, click **Mark as paid**. You can add a reference such as the transfer ID. The customer gets a "Payment received" email.
5. **You pack and ship.** You can click **Mark as processing** and **Print packing slip**. When it ships, use **Add tracking number**, and the customer gets the tracking by email.
6. **Delivered.** Click **Mark as delivered** if you want to close it off.

**If the customer doesn't pay:** they get a reminder **1 day before** the deadline. When the deadline passes, the order is **cancelled automatically**, the items go back into stock and the customer is told by email. This job runs once a day (see section 6).

**Cancelling by hand:** use **Cancel order** on the order page. The stock goes back on sale and the customer gets an email with the reason you typed.

**Refunds:** send the money back yourself, then click **Mark as refunded** to record it. If the order had not shipped yet, its stock goes back on sale.

Every step is listed under **History** on the order page, including which emails were sent.

| Status | Meaning |
|---|---|
| Awaiting payment details | New order: you need to send payment details |
| Payment details sent | Waiting for the customer to pay |
| Paid | Money received, ready to pack |
| Processing | Being packed |
| Shipped | Tracking number sent |
| Delivered | Done |
| Cancelled | Cancelled by you, or automatically for non-payment (stock released) |
| Refunded | You refunded the customer |

## 2. Set your payment details (do this first)

1. Go to **/admin → Settings → Edit payment templates**.
2. Each payment method has one email template. Replace the line `[Add your … details here …]` with your real details, for example:
   - **Bank transfer:** bank name, account name, account and routing number (or IBAN and SWIFT)
   - **PayPal:** your PayPal email, plus whether customers should use "Friends and Family"
   - **Zelle:** your Zelle email or phone and the name it shows
   - **Cash App:** your $Cashtag
   - **Mobile Money:** provider, number and registered name
   - **Crypto:** coin, network and wallet address
3. Click **Save template**.

You can use these placeholders. They are filled in automatically for each order:

| Placeholder | Becomes |
|---|---|
| `{{customer_name}}` | The customer's name |
| `{{order_number}}` | For example, SH-10234 |
| `{{amount}}` | The order total, for example $129.98 |
| `{{payment_method}}` | For example, Zelle |
| `{{due_date}}` | The date the payment is due |
| `{{store_name}}` | Your store name |

You can still edit the email on each order before you send it.

Payment details are only ever sent by email. They never appear on the website.

## 3. Add, remove or rename payment methods

All payment methods are in **`src/config/payments.ts`**. Each one looks like this:

```ts
{ id: "zelle", name: "Zelle", description: "Instant US bank payment with Zelle.", icon: "zelle", enabled: true, kind: "manual" },
```

- **Hide a method:** set `enabled: false`. It disappears from checkout, but old orders keep it.
- **Rename it:** change `name` and `description`. Leave `id` as it is, because existing orders and templates use it.
- **Add one:** copy a line and give it a new, unique `id` (lowercase, with dashes). For `icon`, use one of `bank`, `paypal`, `zelle`, `cashapp`, `mobile` or `crypto`. Then write its template in /admin.
- **Change the timings** in the same file:
  - `detailsWithinHours` (24): the promise shown to customers
  - `payWithinDays` (3): the payment deadline
  - `reminderDaysBefore` (1): when the reminder goes out

After editing the file, commit and redeploy.

> **Online payments later:** each method has `kind: "manual"`. To add a card or online provider, add a method with a new kind and handle it in `placeOrder` (`src/app/actions/checkout.ts`) after the order is created. The note at the top of that file explains where.

### Delivery options

Delivery options are set in **`src/config/site.ts`** under `shipping`:

| Setting | What it does |
|---|---|
| `standardCents` | Price of standard shipping, in cents |
| `expressCents` | Price of express shipping, in cents |
| `freeStandardOverCents` | Free standard shipping threshold (9900 = $99) |
| `liveAnimalOvernightCents` | Price of overnight live-animal shipping, in cents |
| `liveAnimalShipWeekdays` | Days that live animals ship |
| `liveAnimalLeadDays` | Days needed before the first live-animal ship day |
| `localPickup.enabled` | Turns local pickup on or off |

The countries offered at checkout are in `shippingCountries` in the same file. The states that live animals can ship to are under **/admin → Settings**.

## 4. Email addresses

Set these in `.env.local` for your computer, and in Vercel under **Project → Settings → Environment Variables** for the live site:

| Variable | What it is | Right now |
|---|---|---|
| `ORDER_FROM_EMAIL` | The sender of all order emails | Empty, so emails come from Resend's test sender |
| `ORDER_REPLY_TO_EMAIL` | Where customer replies go | awsclarence@gmail.com |
| `ORDER_NOTIFICATION_EMAIL` | Where "New order" alerts go | awsclarence@gmail.com |
| `RESEND_API_KEY` | Lets the site send email | **Not set yet: no emails are sent until you add it** |
| `CRON_SECRET` | Protects the daily unpaid-order job | Set in `.env.local`. Add the same value in Vercel. |

### Getting email working now

1. Create a free account at [resend.com](https://resend.com).
2. Go to **API Keys → Create**.
3. Put the key in `RESEND_API_KEY`.

Until you verify a domain, Resend only delivers to **your own Resend account email**. That is enough to test, but customers won't receive anything yet.

### After you buy a domain

1. In Resend, go to **Domains → Add domain**. Add the DNS records it shows at your domain registrar and wait for "Verified".
2. Set `ORDER_FROM_EMAIL` to, for example, `ScaleHaven Reptiles <orders@yourdomain.com>`.
3. Change `ORDER_REPLY_TO_EMAIL` and `ORDER_NOTIFICATION_EMAIL` to your new inbox, if you want to.
4. Also update `contact.email` in `src/config/site.ts`. It is shown on the website and in emails.
5. Redeploy. Then send yourself a test order.

## 5. Day-to-day checklist

- [ ] Check **/admin** for highlighted **New orders**. Send payment details within 24 hours.
- [ ] Check your bank, PayPal, Zelle and other accounts. **Mark as paid** any orders you have received payment for.
- [ ] Pack paid orders. Print the packing slip. Add the tracking number when shipped.
- [ ] Live animals ship Monday to Wednesday only. Check the weather and email the customer if you need to delay.

## 6. The daily job (reminders and auto-cancel)

`vercel.json` tells Vercel to call `/api/cron/orders` once a day, at 14:00 UTC. Vercel sends your `CRON_SECRET` with the call automatically, as long as the variable is set in the project.

To run it by hand:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/orders
```

The answer lists the order numbers that were reminded and the ones that were cancelled.
