import { NextRequest, NextResponse } from "next/server";
import { eq, or, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = (searchParams.get("username") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
  let userId: string | null = null;
  if (username) {
    const u = await db.select().from(users).where(eq(users.usernameLower, username.toLowerCase())).limit(1);
    if (!u[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });
    userId = u[0].id;
  } else {
    const me = await getAuthUser();
    if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    userId = me.id;
  }
  const rows = await db
    .select()
    .from(matches)
    .where(or(eq(matches.playerXId, userId), eq(matches.playerOId, userId)))
    .orderBy(desc(matches.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const total = await db.execute(sql`SELECT COUNT(*)::int AS c FROM matches WHERE player_x_id = ${userId} OR player_o_id = ${userId}`);
  return NextResponse.json({
    matches: rows.map((m) => ({
      id: m.id, mode: m.mode, status: m.status, winner: m.winner,
      playerXName: m.playerXName, playerOName: m.playerOName,
      mySymbol: m.playerXId === userId ? "X" : m.playerOId === userId ? "O" : null,
      isRanked: m.isRanked, moveCount: m.moveCount, createdAt: m.createdAt, finishedAt: m.finishedAt,
    })),
    total: (total.rows[0] as { c: number }).c, page,
  });
}
