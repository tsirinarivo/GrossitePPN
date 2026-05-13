import { NextResponse } from "next/server";
import { refreshPendingLogs } from "@/lib/xprint/service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await refreshPendingLogs();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
