import { db } from "@/db";
import { users, coinTransactions, leaderboardStats, yearlyStats, monthlyStats, matches } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Reward configuration (admin-configurable conceptually; stored as constants + overridable via env)
export const ECONOMY = {
  startingCoins: 500,
  botWin: 10,
  botDraw: 3,
  botLoss: 0,
  rankedWin: 50,
  rankedDraw: 15,
  rankedLoss: 5,
  friendWin: 25,
  friendDraw: 8,
  dailyBase: 50,
  dailyStreakBonus: 10,
  dailyMaxStreak: 7,
  hintCost: 20,
  assistCost: 30,
  shieldCost: 1000,
  shieldTurns: 6,
};

export const DUPLICATE_COMPENSATION: Record<string, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  ultra_rare: 120,
  epic: 300,
  legendary: 800,
  mythic: 2000,
  ancient: 5000,
  divine: 10000,
  secret: 20000,
};

export const RARITY_META: Record<string, { label: string; color: string; glow: string }> = {
  common: { label: "Common", color: "#9ca3af", glow: "none" },
  uncommon: { label: "Uncommon", color: "#22c55e", glow: "0 0 12px #22c55e55" },
  rare: { label: "Rare", color: "#3b82f6", glow: "0 0 14px #3b82f688" },
  ultra_rare: { label: "Ultra Rare", color: "#06b6d4", glow: "0 0 16px #06b6d488" },
  epic: { label: "Epic", color: "#a855f7", glow: "0 0 16px #a855f788" },
  legendary: { label: "Legendary", color: "#f59e0b", glow: "0 0 18px #f59e0b88" },
  mythic: { label: "Mythic", color: "#ec4899", glow: "0 0 20px #ec4899aa" },
  ancient: { label: "Ancient", color: "#f97316", glow: "0 0 20px #f97316aa" },
  divine: { label: "Divine", color: "#facc15", glow: "0 0 22px #facc15aa" },
  secret: { label: "Secret", color: "#ff2d55", glow: "0 0 24px #ff2d55bb" },
};

export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  symbols: { label: "X/O Symbol Skins", icon: "✨" },
  boards: { label: "Board Skins", icon: "🎛️" },
  backgrounds: { label: "Backgrounds & Places", icon: "🌌" },
  avatars: { label: "Avatars", icon: "😎" },
  frames: { label: "Avatar Frames", icon: "🖼️" },
  win_animations: { label: "Win Animations", icon: "🎉" },
  move_animations: { label: "Move Animations", icon: "⚡" },
  sound_packs: { label: "Sound Packs", icon: "🔊" },
  victory_effects: { label: "Victory Effects", icon: "🏆" },
  trails: { label: "Trails & Effects", icon: "🌠" },
  profile_decorations: { label: "Profile Decorations", icon: "💎" },
  seasonal: { label: "Seasonal Exclusives", icon: "🎃" },
};

export async function getBalance(userId: string): Promise<number> {
  const rows = await db.select({ coins: users.coins }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.coins ?? 0;
}

/** Atomic coin adjustment with ledger. Throws on insufficient funds. Idempotent via idempotencyKey. */
export async function adjustCoins(opts: {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey: string;
}): Promise<{ balance: number; duplicate: boolean }> {
  const { userId, amount, reason, referenceType, referenceId, idempotencyKey } = opts;
  // check idempotency
  const existing = await db.select().from(coinTransactions).where(eq(coinTransactions.idempotencyKey, idempotencyKey)).limit(1);
  if (existing[0]) {
    return { balance: existing[0].balanceAfter, duplicate: true };
  }
  // transaction with row lock
  const result = await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`SELECT id, coins FROM users WHERE id = ${userId} FOR UPDATE`);
    const row = (locked.rows[0] as { coins: number } | undefined);
    if (!row) throw new Error("User not found");
    const current = Number(row.coins);
    const next = current + amount;
    if (next < 0) throw new Error("INSUFFICIENT_FUNDS");
    await tx.execute(sql`UPDATE users SET coins = ${next} WHERE id = ${userId}`);
    await tx.insert(coinTransactions).values({
      userId,
      amount,
      balanceAfter: next,
      reason,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      idempotencyKey,
    });
    return next;
  });
  return { balance: result, duplicate: false };
}

export async function recordMatchScore(matchId: string) {
  const mrows = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  const m = mrows[0];
  if (!m || m.scored || m.status !== "finished") return;
  const year = m.seasonYear;
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const isBot = m.mode === "bot";
  const isRanked = m.isRanked;
  const winner = m.winner; // X | O | draw | null

  const playerX = m.playerXId;
  const playerO = m.playerOId;

  // Determine outcome per player
  const outcomes: { userId: string | null; result: "win" | "loss" | "draw" }[] = [];
  if (winner === "draw") {
    if (playerX) outcomes.push({ userId: playerX, result: "draw" });
    if (playerO) outcomes.push({ userId: playerO, result: "draw" });
  } else if (winner === "X") {
    if (playerX) outcomes.push({ userId: playerX, result: "win" });
    if (playerO) outcomes.push({ userId: playerO, result: "loss" });
  } else if (winner === "O") {
    if (playerO) outcomes.push({ userId: playerO, result: "win" });
    if (playerX) outcomes.push({ userId: playerX, result: "loss" });
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE matches SET scored = true WHERE id = ${matchId} AND scored = false`);
    for (const o of outcomes) {
      if (!o.userId) continue;
      const statsRows = await tx.select().from(leaderboardStats).where(eq(leaderboardStats.userId, o.userId)).limit(1);
      let s = statsRows[0];
      if (!s) {
        await tx.insert(leaderboardStats).values({ userId: o.userId });
        s = (await tx.select().from(leaderboardStats).where(eq(leaderboardStats.userId, o.userId)).limit(1))[0];
      }
      const wins = s.wins + (o.result === "win" ? 1 : 0);
      const losses = s.losses + (o.result === "loss" ? 1 : 0);
      const draws = s.draws + (o.result === "draw" ? 1 : 0);
      const total = s.totalGames + 1;
      const streakCur = o.result === "win" ? s.winStreakCurrent + 1 : 0;
      const streakBest = Math.max(s.winStreakBest, streakCur);
      // scoring: ranked win=100, draw=25, loss=0; friend win=40 draw=10; bot win=10 draw=3 (bot not on competitive board but tracked)
      let pts = 0;
      if (isRanked) pts = o.result === "win" ? 100 : o.result === "draw" ? 25 : 0;
      else if (m.mode === "friend" || m.mode === "random") pts = o.result === "win" ? 40 : o.result === "draw" ? 10 : 0;
      else pts = o.result === "win" ? 10 : o.result === "draw" ? 3 : 0;
      const rankedGames = s.rankedGames + (isRanked ? 1 : 0);
      const rankedWins = s.rankedWins + (isRanked && o.result === "win" ? 1 : 0);
      const botGames = s.botGames + (isBot ? 1 : 0);
      const botWins = s.botWins + (isBot && o.result === "win" ? 1 : 0);
      await tx
        .update(leaderboardStats)
        .set({
          totalGames: total,
          wins,
          losses,
          draws,
          winStreakCurrent: streakCur,
          winStreakBest: streakBest,
          score: s.score + pts,
          rankedGames,
          rankedWins,
          botGames,
          botWins,
          updatedAt: new Date(),
        })
        .where(eq(leaderboardStats.userId, o.userId));

      // yearly (only ranked/random/friend count; bot excluded from competitive yearly? Keep bot separate: record but leaderboard filters ranked)
      const yRows = await tx
        .select()
        .from(yearlyStats)
        .where(and(eq(yearlyStats.userId, o.userId), eq(yearlyStats.year, year)))
        .limit(1);
      if (!yRows[0]) {
        await tx.insert(yearlyStats).values({
          userId: o.userId,
          year,
          games: 1,
          wins: o.result === "win" ? 1 : 0,
          losses: o.result === "loss" ? 1 : 0,
          draws: o.result === "draw" ? 1 : 0,
          score: pts,
        });
      } else {
        await tx
          .update(yearlyStats)
          .set({
            games: yRows[0].games + 1,
            wins: yRows[0].wins + (o.result === "win" ? 1 : 0),
            losses: yRows[0].losses + (o.result === "loss" ? 1 : 0),
            draws: yRows[0].draws + (o.result === "draw" ? 1 : 0),
            score: yRows[0].score + pts,
            updatedAt: new Date(),
          })
          .where(and(eq(yearlyStats.userId, o.userId), eq(yearlyStats.year, year)));
      }
      const mRows = await tx
        .select()
        .from(monthlyStats)
        .where(and(eq(monthlyStats.userId, o.userId), eq(monthlyStats.year, year), eq(monthlyStats.month, month)))
        .limit(1);
      if (!mRows[0]) {
        await tx.insert(monthlyStats).values({ userId: o.userId, year, month, games: 1, wins: o.result === "win" ? 1 : 0, score: pts });
      } else {
        await tx
          .update(monthlyStats)
          .set({ games: mRows[0].games + 1, wins: mRows[0].wins + (o.result === "win" ? 1 : 0), score: mRows[0].score + pts, updatedAt: new Date() })
          .where(and(eq(monthlyStats.userId, o.userId), eq(monthlyStats.year, year), eq(monthlyStats.month, month)));
      }
    }
  });

  // coin rewards (outside strict tx to avoid deadlock; each adjustCoins is idempotent)
  for (const o of outcomes) {
    if (!o.userId) continue;
    let coins = 0;
    if (isBot) coins = o.result === "win" ? ECONOMY.botWin : o.result === "draw" ? ECONOMY.botDraw : 0;
    else if (isRanked) coins = o.result === "win" ? ECONOMY.rankedWin : o.result === "draw" ? ECONOMY.rankedDraw : ECONOMY.rankedLoss;
    else coins = o.result === "win" ? ECONOMY.friendWin : o.result === "draw" ? ECONOMY.friendDraw : 0;
    if (coins > 0) {
      try {
        await adjustCoins({
          userId: o.userId,
          amount: coins,
          reason: `Match reward: ${m.mode} ${o.result} (${matchId.slice(0, 8)})`,
          referenceType: "match",
          referenceId: matchId,
          idempotencyKey: `match-reward:${matchId}:${o.userId}`,
        });
      } catch {
        // ignore duplicate
      }
    }
  }
}
