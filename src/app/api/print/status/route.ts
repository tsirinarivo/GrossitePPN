import { NextResponse } from "next/server";
import { loadXprintConfig } from "@/lib/xprint/service";
import { xprintStatus } from "@/lib/xprint/client";
import { getSessionTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const tid = await getSessionTenantId();
  const cfg = await loadXprintConfig(tid);
  if (!cfg) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const status = await xprintStatus(cfg);
  return NextResponse.json({ configured: true, sn: cfg.sn, ...status });
}
