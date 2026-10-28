import { NextRequest, NextResponse } from "next/server";
import { eq, and, lt, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { matchmakingQueue, matches, matchPlayers, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { emptyBoard } from "@/lib/game";
import { ensureSeeded } from "@/lib/seed";

export async function GET(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const rows = await db.select().from(matchmakingQueue).where(eq(matchmakingQueue.userId, me.id)).limit(1);
  const entry = rows[0] ?? null;
  if (!entry) return NextResponse.json({ status: "idle" });
  if (entry.status === "matched" && entry.matchId) {
    const m = (await db.select().from(matches).where(eq(matches.id, entry.matchId)).limit(1))[0];
    return NextResponse.json({ status: "matched", matchId: entry.matchId, match: m });
  }
  if (new Date(entry.expiresAt) < new Date()) {
    await db.update(matchmakingQueue).set({ status: "cancelled" }).where(eq(matchmakingQueue.id, entry.id));
    return NextResponse.json({ status: "timeout", message: "No opponents found. Try again." });
  }
  // try to match now
  const matched = await tryMatch(me.id);
  if (matched) return NextResponse.json({ status: "matched", matchId: matched, match: (await db.select().from(matches).where(eq(matches.id, matched)).limit(1))[0] });
  const waiting = await db.execute(sql`SELECT COUNT(*)::int AS c FROM matchmaking_queue WHERE status = 'waiting' AND expires_at > NOW()`);
  return NextResponse.json({ status: "searching", waiting: (waiting.rows[0] as { c: number })?.c ?? 1 });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  if (action === "join") {
    // prevent multiple conflicting matches: check active match
    const active = await db.execute(sql`SELECT id FROM matches WHERE status = 'active' AND (player_x_id = ${me.id} OR player_o_id = ${me.id}) AND mode IN ('random','friend') LIMIT 1`);
    if (active.rows[0]) return NextResponse.json({ error: "You already have an active online match", matchId: (active.rows[0] as { id: string }).id }, { status: 409 });
    // cleanup expired
    await db.execute(sql`UPDATE matchmaking_queue SET status = 'cancelled' WHERE user_id = ${me.id} AND status = 'waiting'`);
    // Also expire old entries globally
    await db.execute(sql`UPDATE matchmaking_queue SET status = 'cancelled' WHERE status = 'waiting' AND expires_at < NOW()`);
    await db.insert(matchmakingQueue).values({ userId: me.id, status: "waiting", expiresAt: new Date(Date.now() + 120_000) });
    const matched = await tryMatch(me.id);
    if (matched) {
      const m = (await db.select().from(matches).where(eq(matches.id, matched)).limit(1))[0];
      return NextResponse.json({ ok: true, status: "matched", matchId: matched, match: m });
    }
    return NextResponse.json({ ok: true, status: "searching", message: "Searching for opponent..." });
  }
  if (action === "cancel") {
    await db.execute(sql`UPDATE matchmaking_queue SET status = 'cancelled' WHERE user_id = ${me.id} AND status = 'waiting'`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function tryMatch(myId: string): Promise<string | null> {
  // find oldest waiting opponent (not self)
  const opp = await db.execute(sql`
    SELECT id, user_id FROM matchmaking_queue
    WHERE status = 'waiting' AND user_id != ${myId} AND expires_at > NOW()
    ORDER BY joined_at ASC LIMIT 1
  `);
  const row = opp.rows[0] as { id: number; user_id: string } | undefined;
  if (!row) return null;
  const oppId: string = row.user_id;
  // double-check opponent has no active match
  const active = await db.execute(sql`SELECT id FROM matches WHERE status = 'active' AND (player_x_id = ${oppId} OR player_o_id = ${oppId}) AND mode IN ('random','friend') LIMIT 1`);
  if (active.rows[0]) {
    await db.execute(sql`UPDATE matchmaking_queue SET status = 'cancelled' WHERE id = ${row.id}`);
    return null;
  }
  // atomic claim: mark both as matched
  const mid = randomUUID();
  const coinFlip = Math.random() < 0.5;
  const xId = coinFlip ? myId : oppId;
  const oId = coinFlip ? oppId : myId;
  const xRow = (await db.select({ username: users.username }).from(users).where(eq(users.id, xId)).limit(1))[0];
  const oRow = (await db.select({ username: users.username }).from(users).where(eq(users.id, oId)).limit(1))[0];
  await db.transaction(async (tx) => {
    await tx.insert(matches).values({
      id: mid, mode: "random", status: "active", board: emptyBoard(), currentTurn: "X",
      playerXId: xId, playerOId: oId, playerXName: xRow?.username ?? "Player", playerOName: oRow?.username ?? "Player",
      isRanked: true, seasonYear: new Date().getUTCFullYear(), idempotencyKey: `mm:${mid}`,
    });
    await tx.insert(matchPlayers).values([
      { matchId: mid, userId: xId, symbol: "X", isBot: false, connected: true },
      { matchId: mid, userId: oId, symbol: "O", isBot: false, connected: true },
    ]);
    await tx.execute(sql`UPDATE matchmaking_queue SET status = 'matched', match_id = ${mid} WHERE user_id IN (${myId}, ${oppId}) AND status = 'waiting'`);
  });
  return mid;
}
