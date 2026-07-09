import { NextResponse } from "next/server";
import { refreshPendingLogs } from "@/lib/xprint/service";
import { getSessionTenantId } from "@/lib/tenant";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }
  try {
    const tid = await getSessionTenantId();
    const result = await refreshPendingLogs(tid);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
