import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureSeeded();
    return Response.json({ ok: true, service: "r-t-tictactoe", time: new Date().toISOString() });
  } catch (e) {
    return Response.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}
