export const ORDER_STATUSES = [
  "awaiting_confirmation",
  "confirmation_sent",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_confirmation: "Awaiting confirmation",
  confirmation_sent: "Confirmation sent",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Orders whose stock is still held for the customer but that haven't been paid. */
export const UNPAID_STATUSES: readonly OrderStatus[] = ["awaiting_confirmation", "confirmation_sent"];

/** Live-animal orders ship overnight; everything else by the method agreed in the confirmation email. */
export const deliveryLabel = (o: { shipping_method: string }) => (o.shipping_method === "live-overnight" ? "Overnight live animal shipping" : "Shipping");

export type OrderItem = {
  id: string;
  product_id: string | null;
  product_slug: string;
  product_name: string;
  sku: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  is_live_animal: boolean;
};

export type ShippingAddress = {
  name?: string;
  company?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
};

export type OrderEvent = { id: string; status: OrderStatus | null; message: string; created_at: string };

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  customer_name: string | null;
  phone: string | null;
  company: string | null;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  /** False until the store confirms the shipping cost by email. */
  shipping_confirmed: boolean;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_method: string;
  shipping_address: ShippingAddress | null;
  delivery_notes: string | null;
  preferred_delivery_date: string | null;
  contains_live_animals: boolean;
  live_animal_ack_at: string | null;
  /** Every method the customer ticked at checkout. */
  payment_methods: string[];
  payment_other: string | null;
  /** The method the store sent payment details for. */
  confirmed_payment_method: string | null;
  payment_reference: string | null;
  confirmation_sent_at: string | null;
  payment_due_at: string | null;
  paid_at: string | null;
  stock_reserved: boolean;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  order_events?: OrderEvent[];
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_confirmation: "bg-amber-100 text-amber-900",
  confirmation_sent: "bg-sky-100 text-sky-900",
  paid: "bg-sand text-secondary-foreground",
  processing: "bg-orange-100 text-orange-900",
  shipped: "bg-indigo-100 text-indigo-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-zinc-200 text-zinc-800",
  refunded: "bg-rose-100 text-rose-900",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status] ?? status}</span>;
}
