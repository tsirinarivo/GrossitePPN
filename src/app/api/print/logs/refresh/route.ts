import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { loadXprintConfig } from "@/lib/xprint/service";
import { xprintQueryOrder } from "@/lib/xprint/client";

export const dynamic = "force-dynamic";

export async function POST() {
  const cfg = await loadXprintConfig();
  if (!cfg) {
    return NextResponse.json({ ok: false, error: "Non configuré" }, { status: 400 });
  }

  const pending = await db
    .select()
    .from(schema.printLogs)
    .where(eq(schema.printLogs.status, "pending"));

  let updated = 0;
  for (const log of pending) {
    if (!log.orderId) continue;
    try {
      const done = await xprintQueryOrder(cfg, log.orderId);
      if (done) {
        await db
          .update(schema.printLogs)
          .set({ status: "printed" })
          .where(eq(schema.printLogs.id, log.id));
        updated++;
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ok: true, checked: pending.length, updated });
}
