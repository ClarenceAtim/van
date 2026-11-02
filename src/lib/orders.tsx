export const ORDER_STATUSES = [
  "awaiting_payment_details",
  "payment_details_sent",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment_details: "Awaiting payment details",
  payment_details_sent: "Payment details sent",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Orders whose stock is still held for the customer but that haven't been paid. */
export const UNPAID_STATUSES: readonly OrderStatus[] = ["awaiting_payment_details", "payment_details_sent"];

const DELIVERY_LABELS: Record<string, string> = {
  standard: "Standard shipping",
  "free-standard": "Free standard shipping",
  express: "Express shipping",
  "live-overnight": "Overnight live animal shipping",
  pickup: "Local pickup",
};
export const deliveryLabel = (o: { shipping_method: string }) => DELIVERY_LABELS[o.shipping_method] ?? o.shipping_method;

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
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  postal_code?: string;
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
  whatsapp: string | null;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_method: string;
  shipping_address: ShippingAddress | null;
  delivery_notes: string | null;
  preferred_delivery_date: string | null;
  contains_live_animals: boolean;
  live_animal_ack_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_details_sent_at: string | null;
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
  awaiting_payment_details: "bg-amber-100 text-amber-900",
  payment_details_sent: "bg-sky-100 text-sky-900",
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
