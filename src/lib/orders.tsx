export const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

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

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  shipping_method: string;
  shipping_address: {
    name?: string;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    declared_region?: string;
  } | null;
  contains_live_animals: boolean;
  live_animal_ack_at: string | null;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-sand text-secondary-foreground",
  processing: "bg-amber-100 text-amber-900",
  shipped: "bg-sky-100 text-sky-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-zinc-200 text-zinc-800",
  refunded: "bg-rose-100 text-rose-900",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>{status}</span>;
}
