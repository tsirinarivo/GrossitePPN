import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = await db
    .select()
    .from(schema.printLogs)
    .orderBy(desc(schema.printLogs.createdAt))
    .limit(50);

  return NextResponse.json(logs);
}
