# Orders and payments

The website does **not** take payments. Customers place an *order request*: they enter their shipping details, tick how they'd like to pay, and click **Place Order**. You then email them an **order confirmation** with the shipping cost, the final total and your payment details. When the money arrives, you mark the order as paid in /admin.

## 1. How an order flows

1. **The customer checks out** on one page. They fill in shipping details, tick one or more payment methods, and click **Place Order**.
   - Prices and totals are recalculated on the server. The items are **reserved** (taken out of stock) straight away.
   - The customer sees their order number (for example `SH-10234`) and gets an **"Order received"** email.
   - You get a **"New order"** email with all the details and a button that opens the order in /admin.
2. **You send the order confirmation.** Open the order in **/admin → Orders** (new orders are highlighted in yellow). In **Send order confirmation**:
   1. Type the **shipping cost** (for example `14.95`, or `0` for free).
   2. Choose which **payment method** to send details for. The methods the customer ticked are listed first.
   3. Click **Fill in confirmation email**. Your template is filled in with the items, shipping, total and your payment details.
   4. Read it, change anything you like, and click **Send confirmation to customer**.
   - The status changes from *Awaiting confirmation* to *Confirmation sent*.
   - The customer now has **3 days** to pay.
3. **The customer pays** using the details you sent.
4. **You mark it as paid.** On the order page, click **Mark as paid**. You can add a reference, such as the transfer ID. The customer gets a "Payment received" email.
5. **You pack and ship.** You can click **Mark as processing** and **Print packing slip**. When it ships, use **Add tracking number**, and the customer gets the tracking number by email.
6. **Delivered.** Click **Mark as delivered** to close the order.

**If the customer doesn't pay:** they get a reminder **1 day before** the deadline. When the deadline passes, the order is **cancelled automatically**, the items go back into stock and the customer is told by email. This job runs once a day (see section 7).

**Cancelling by hand:** use **Cancel order**. The stock goes back on sale and the customer gets an email with the reason you typed.

**Refunds:** send the money back yourself, then click **Mark as refunded** to record it. If the order had not shipped yet, its stock goes back on sale.

Every step is listed under **History** on the order page, including which emails were sent.

| Status | Meaning |
|---|---|
| Awaiting confirmation | New order: send the confirmation with shipping and payment details |
| Confirmation sent | Waiting for the customer to pay |
| Paid | Money received, ready to pack |
| Processing | Being packed |
| Shipped | Tracking number sent |
| Delivered | Done |
| Cancelled | Cancelled by you, or automatically for non-payment (stock released) |
| Refunded | You refunded the customer |

## 2. Put in your payment details (do this first)

1. Go to **/admin → Settings → Edit payment templates**.
2. Open each method you use and fill in **Your payment details**. Each method has its own boxes:

   | Method | Details |
   |---|---|
   | Zelle | Email or phone, and the name on the account |
   | Cash App | $Cashtag |
   | Venmo | @username |
   | Chime | $ChimeSign |
   | Apple Pay | Phone or email for Apple Cash |
   | ACH | Account name, bank, routing number and account number |
   | SEPA bank transfer | Account name, IBAN, BIC and bank |
   | Revolut | @Revtag or phone |
   | Wise | Email or account details |
   | iDEAL, Bancontact, Credit or debit card | Your payment link |
   | PayPal | PayPal email or PayPal.me link, plus optional instructions |
   | Other | Default instructions |

3. You can also change the **subject** and **email text**, then click **Save template**.

These details are stored in your database and only admins can see them. They are **never shown on the website**: they only appear in the confirmation emails you send.

You can use these placeholders in the subject and text:

| Placeholder | Becomes |
|---|---|
| `{{customer_name}}` | The customer's name |
| `{{order_number}}` | For example, SH-10234 |
| `{{items}}` | One line per item, with the price |
| `{{subtotal}}`, `{{tax}}`, `{{shipping_cost}}`, `{{total}}` | The amounts |
| `{{totals}}` | Subtotal, tax (if any), shipping and total to pay, on separate lines |
| `{{payment_method}}` | For example, Zelle |
| `{{payment_details}}` | Your saved details for that method, as "Label: value" lines |
| `{{due_date}}` | The payment deadline |
| `{{store_name}}` | Your store name |

## 3. Add, remove, rename or reorder payment methods

All payment methods are in **`src/config/payments.ts`**. Each one looks like this:

```ts
{ id: "zelle", name: "Zelle", description: "Send from your US bank app", group: "us", enabled: true, kind: "manual",
  fields: [{ key: "recipient", label: "Zelle email or phone" }, { key: "name", label: "Name on the account" }] },
```

- **Switch a method off:** set `enabled: false`. It disappears from checkout, but old orders keep showing it.
- **Rename it:** change `name` and `description`. Leave `id` as it is, because orders and templates use it.
- **Reorder:** move the line. Methods appear in this order within their group.
- **Move it to another group:** change `group` to `"us"`, `"europe"` or `"worldwide"`.
- **Add a method:** copy a line and give it a new, unique `id` (lowercase, with dashes). List the details you'll need in `fields`. Then fill them in on the templates page.
- **Change the timings** in `paymentSettings` in the same file:
  - `confirmWithinHours` (24): the promise shown to customers
  - `payWithinDays` (3): the payment deadline
  - `reminderDaysBefore` (1): when the reminder goes out

Customers see all groups, but their own region comes first: US customers see United States first, and European customers see Europe first. The list of countries counted as Europe is also in this file.

After editing, commit and redeploy.

> **Online payments later:** every method has `kind: "manual"`. To add a card or online provider, add a method with a new kind and redirect to the provider in `placeOrder` (`src/app/actions/checkout.ts`). The note at the top of that file shows where.

## 4. Countries, live animals, currency and tax

- **Countries at checkout:** `src/config/countries.ts`. Delete a line to stop shipping to that country.
  - State or region is required for the US, Canada and Australia.
  - A few countries without postal codes skip the postal code field.
- **Where live animals can ship:** `liveAnimals` in `src/config/site.ts`.
  - Right now: the United States, but not Alaska or Hawaii.
  - If a customer with an animal in their cart chooses anywhere else, checkout explains why and won't let them place the order. Supplies ship worldwide.
- **Currency:** `currency` and `locale` in `src/config/site.ts`. For euros, use `currency: "EUR"` and, for example, `locale: "nl-NL"`, then update your product prices.
- **Tax or VAT:** `tax` in `src/config/site.ts`. For example, `{ enabled: true, rate: 0.21, label: "VAT (21%)", note: "Prices exclude VAT." }` adds 21% VAT to every order and shows the note at checkout.

## 5. Email addresses

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

### After you buy a domain and business email

1. In Resend, go to **Domains → Add domain**. Add the DNS records it shows at your domain registrar and wait for "Verified".
2. Set `ORDER_FROM_EMAIL` to, for example, `ScaleHaven Reptiles <orders@yourdomain.com>`.
3. Set `ORDER_REPLY_TO_EMAIL` and `ORDER_NOTIFICATION_EMAIL` to your business inbox.
4. Also update `contact.email` in `src/config/site.ts`. It is shown on the website and in emails.
5. Redeploy. Then place a test order to yourself.

## 6. Day-to-day checklist

- [ ] Check **/admin** for highlighted **New orders**. Send each confirmation within 24 hours.
- [ ] Check your Zelle, PayPal, bank and other accounts. **Mark as paid** any orders you have received payment for.
- [ ] Pack paid orders. Print the packing slip. Add the tracking number when shipped.
- [ ] Live animals ship Monday to Wednesday only. Check the weather and email the customer if you need to delay.

## 7. The daily job (reminders and auto-cancel)

`vercel.json` tells Vercel to call `/api/cron/orders` once a day, at 14:00 UTC. Vercel sends your `CRON_SECRET` with the call automatically, as long as the variable is set in the project.

To run it by hand:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/orders
```

The answer lists the order numbers that were reminded and the ones that were cancelled.
