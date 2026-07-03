import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionTenantId, tenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json([], { status: 401 });
  const tid = await getSessionTenantId();

  const logs = await db
    .select()
    .from(schema.printLogs)
    .where(tenantFilter(schema.printLogs.tenantId, tid))
    .orderBy(desc(schema.printLogs.createdAt))
    .limit(50);

  return NextResponse.json(logs);
}
