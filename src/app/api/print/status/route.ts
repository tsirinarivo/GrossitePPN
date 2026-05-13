import { NextResponse } from "next/server";
import { loadXprintConfig } from "@/lib/xprint/service";
import { xprintStatus } from "@/lib/xprint/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await loadXprintConfig();
  if (!cfg) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const status = await xprintStatus(cfg);
  return NextResponse.json({ configured: true, sn: cfg.sn, ...status });
}
