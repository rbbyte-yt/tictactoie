import { NextRequest, NextResponse } from "next/server";
import { eq, desc, or } from "drizzle-orm";
import { db } from "@/db";
import { users, userSettings, leaderboardStats, matches, equippedCosmetics, cosmeticItems } from "@/db/schema";
import { getAuthUser, calcAge } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const username = (searchParams.get("username") || "").trim();
  if (!username) {
    const me = await getAuthUser();
    if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    return await profileById(me.id, me.id);
  }
  const rows = await db.select().from(users).where(eq(users.usernameLower, username.toLowerCase())).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const me = await getAuthUser();
  return await profileById(rows[0].id, me?.id ?? null);
}

async function profileById(userId: string, viewerId: string | null) {
  const urows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const u = urows[0];
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const srows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const settings = srows[0] ?? null;
  const lrows = await db.select().from(leaderboardStats).where(eq(leaderboardStats.userId, userId)).limit(1);
  const stats = lrows[0] ?? { totalGames: 0, wins: 0, losses: 0, draws: 0, winStreakCurrent: 0, winStreakBest: 0, score: 0, rankedGames: 0, rankedWins: 0, botGames: 0, botWins: 0 };
  const mrows = await db.select().from(matches).where(or(eq(matches.playerXId, userId), eq(matches.playerOId, userId))).orderBy(desc(matches.createdAt)).limit(10);
  const eqRows = await db.select().from(equippedCosmetics).where(eq(equippedCosmetics.userId, userId));
  const equipped: Record<string, string> = {};
  for (const e of eqRows) equipped[e.category] = e.itemId;
  const isSelf = viewerId === userId;
  const age = calcAge(u.dob);
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 1000) / 10 : 0;
  return NextResponse.json({
    profile: {
      username: u.username,
      age: settings?.showAge === false && !isSelf ? null : age,
      email: isSelf || settings?.showEmail ? u.email : null,
      coins: isSelf ? u.coins : undefined,
      role: u.role,
      createdAt: u.createdAt,
      stats: { ...stats, winRate },
      equipped,
      theme: settings?.theme ?? "dark",
      soundEnabled: settings?.soundEnabled ?? true,
      avatarItemId: settings?.avatarItemId ?? null,
      showEmail: settings?.showEmail ?? false,
      showDob: settings?.showDob ?? false,
      isSelf,
      recentMatches: mrows.map((m) => ({
        id: m.id, mode: m.mode, status: m.status, winner: m.winner,
        playerXName: m.playerXName, playerOName: m.playerOName,
        isRanked: m.isRanked, createdAt: m.createdAt, finishedAt: m.finishedAt,
        mySymbol: m.playerXId === userId ? "X" : m.playerOId === userId ? "O" : null,
      })),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.theme === "dark" || body.theme === "light") patch.theme = body.theme;
  if (typeof body.soundEnabled === "boolean") patch.soundEnabled = body.soundEnabled;
  if (typeof body.showEmail === "boolean") patch.showEmail = body.showEmail;
  if (typeof body.showDob === "boolean") patch.showDob = body.showDob;
  if (typeof body.showAge === "boolean") patch.showAge = body.showAge;
  if (typeof body.avatarItemId === "string" || body.avatarItemId === null) patch.avatarItemId = body.avatarItemId;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  (patch as Record<string, Date>).updatedAt = new Date();
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, me.id)).limit(1);
  if (!existing[0]) await db.insert(userSettings).values({ userId: me.id, ...(patch as { theme?: string }) });
  else await db.update(userSettings).set(patch).where(eq(userSettings.userId, me.id));
  return NextResponse.json({ ok: true });
}
