import { markMessageRead } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Messages" };

type Msg = { id: string; name: string; email: string; subject: string; message: string; read: boolean; created_at: string };

export default async function AdminMessages() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("contact_messages").select("*").order("read").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Msg[];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Messages</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No messages yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => (
            <li key={m.id} className={`rounded-xl border p-4 ${m.read ? "opacity-70" : "border-primary/40"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{m.subject}</p>
                <p className="text-sm text-muted-foreground">{formatDate(m.created_at)}</p>
              </div>
              <p className="text-sm">
                {m.name} ·{" "}
                <a href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-primary underline">
                  {m.email}
                </a>
              </p>
              <p className="mt-2 whitespace-pre-line">{m.message}</p>
              <form action={markMessageRead} className="mt-3">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="read" value={String(!m.read)} />
                <Button type="submit" size="sm" variant="outline">{m.read ? "Mark unread" : "Mark read"}</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
