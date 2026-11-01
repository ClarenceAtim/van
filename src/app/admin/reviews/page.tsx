import Link from "next/link";
import { moderateReview } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Reviews" };

type Row = { id: string; rating: number; title: string; body: string; author_name: string; status: string; created_at: string; products: { name: string } | null };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireAdmin();
  const status = (await searchParams).status === "all" ? null : "pending";
  let query = supabase.from("reviews").select("id, rating, title, body, author_name, status, created_at, products(name)").order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{status ? "Reviews awaiting approval" : "All reviews"}</h1>
      <Link href={status ? "/admin/reviews?status=all" : "/admin/reviews"} className="text-sm text-primary underline">{status ? "Show all reviews" : "Show pending only"}</Link>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nothing to moderate.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                {r.products?.name} · {r.author_name} · {formatDate(r.created_at)} · <span className="capitalize">{r.status}</span>
              </p>
              <p className="mt-1 font-semibold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} {r.title}</p>
              {/* Rendered as plain text: user content is never treated as HTML. */}
              <p className="mt-2 whitespace-pre-line">{r.body}</p>
              <div className="mt-3 flex gap-2">
                {(["approved", "rejected"] as const).map((s) => (
                  <form key={s} action={moderateReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={s} />
                    <Button type="submit" size="sm" variant={s === "approved" ? "default" : "outline"} disabled={r.status === s}>
                      {s === "approved" ? "Approve" : "Reject"}
                    </Button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
