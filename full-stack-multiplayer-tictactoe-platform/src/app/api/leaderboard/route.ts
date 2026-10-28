import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, sql, ilike } from "drizzle-orm";
import { db } from "@/db";
import { leaderboardStats, yearlyStats, monthlyStats, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "all-time";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
  const search = (searchParams.get("search") || "").trim();
  const year = parseInt(searchParams.get("year") || String(new Date().getUTCFullYear()), 10);
  const month = parseInt(searchParams.get("month") || String(new Date().getUTCMonth() + 1), 10);
  const me = await getAuthUser();
  const offset = (page - 1) * limit;

  if (scope === "yearly") {
    const where = search ? sql`y.year = ${year} AND u.username ILIKE ${"%" + search + "%"}` : sql`y.year = ${year}`;
    const rows = await db.execute(sql`
      SELECT u.username, y.games, y.wins, y.losses, y.draws, y.score,
        CASE WHEN y.games > 0 THEN ROUND(y.wins::numeric / y.games * 100, 1) ELSE 0 END AS win_rate
      FROM yearly_stats y JOIN users u ON u.id = y.user_id
      WHERE ${where} ORDER BY y.score DESC, y.wins DESC LIMIT ${limit} OFFSET ${offset}
    `);
    const total = await db.execute(sql`SELECT COUNT(*)::int AS c FROM yearly_stats y JOIN users u ON u.id = y.user_id WHERE ${where}`);
    let myRank: number | null = null;
    if (me) {
      const r = await db.execute(sql`SELECT COUNT(*)::int + 1 AS rank FROM yearly_stats WHERE year = ${year} AND score > COALESCE((SELECT score FROM yearly_stats WHERE user_id = ${me.id} AND year = ${year}), -1)`);
      myRank = (r.rows[0] as { rank: number }).rank;
    }
    return NextResponse.json({ scope, year, rows: rows.rows, total: (total.rows[0] as { c: number }).c, page, myRank, timezone: "UTC" });
  }
  if (scope === "monthly") {
    const where = search ? sql`m.year = ${year} AND m.month = ${month} AND u.username ILIKE ${"%" + search + "%"}` : sql`m.year = ${year} AND m.month = ${month}`;
    const rows = await db.execute(sql`
      SELECT u.username, m.games, m.wins, m.score FROM monthly_stats m JOIN users u ON u.id = m.user_id
      WHERE ${where} ORDER BY m.score DESC LIMIT ${limit} OFFSET ${offset}
    `);
    return NextResponse.json({ scope, year, month, rows: rows.rows, page, timezone: "UTC" });
  }
  // all-time: competitive only (rankedGames>0 OR totalGames>0 but order by score; bot-only players included but ranked highlighted)
  const where = search ? sql`u.username ILIKE ${"%" + search + "%"}` : sql`TRUE`;
  const rows = await db.execute(sql`
    SELECT u.username, l.total_games AS games, l.wins, l.losses, l.draws, l.score, l.win_streak_best,
      l.ranked_games, l.ranked_wins, l.bot_games,
      CASE WHEN l.total_games > 0 THEN ROUND(l.wins::numeric / l.total_games * 100, 1) ELSE 0 END AS win_rate
    FROM leaderboard_stats l JOIN users u ON u.id = l.user_id
    WHERE ${where} ORDER BY l.score DESC, l.wins DESC LIMIT ${limit} OFFSET ${offset}
  `);
  const total = await db.execute(sql`SELECT COUNT(*)::int AS c FROM leaderboard_stats l JOIN users u ON u.id = l.user_id WHERE ${where}`);
  let myRank: number | null = null;
  if (me) {
    const r = await db.execute(sql`SELECT COUNT(*)::int + 1 AS rank FROM leaderboard_stats WHERE score > COALESCE((SELECT score FROM leaderboard_stats WHERE user_id = ${me.id}), -1)`);
    myRank = (r.rows[0] as { rank: number }).rank;
  }
  return NextResponse.json({
    scope: "all-time", rows: rows.rows, total: (total.rows[0] as { c: number }).c, page, myRank,
    scoring: "Ranked win=100, draw=25 · Random/Friend win=40, draw=10 · Bot win=10, draw=3 (bot tracked separately)",
  });
}
