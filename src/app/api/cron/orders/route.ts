import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { processUnpaidOrders } from "@/lib/order-service";

export const dynamic = "force-dynamic";

/**
 * Daily job (vercel.json → crons): emails payment reminders and cancels orders that weren't paid
 * in time, releasing their stock. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const result = await processUnpaidOrders(db());
  return NextResponse.json(result);
}
