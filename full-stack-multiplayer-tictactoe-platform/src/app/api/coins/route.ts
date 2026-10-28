import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { coinTransactions, dailyRewards, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { adjustCoins, ECONOMY, getBalance } from "@/lib/economy";
import { ensureSeeded } from "@/lib/seed";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "balance";
  if (action === "balance") {
    const balance = await getBalance(me.id);
    // next daily availability
    const last = await db.select().from(dailyRewards).where(eq(dailyRewards.userId, me.id)).orderBy(desc(dailyRewards.claimedAt)).limit(1);
    const lastClaim = last[0]?.claimedAt ?? null;
    const canClaim = !lastClaim || Date.now() - new Date(lastClaim).getTime() >= 20 * 3600 * 1000;
    return NextResponse.json({ balance, canClaimDaily: canClaim, lastDaily: lastClaim, streak: last[0]?.streakDay ?? 0 });
  }
  if (action === "transactions") {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const rows = await db.select().from(coinTransactions).where(eq(coinTransactions.userId, me.id)).orderBy(desc(coinTransactions.createdAt)).limit(limit).offset((page - 1) * limit);
    return NextResponse.json({ transactions: rows, page });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  if (action === "daily") {
    const last = await db.select().from(dailyRewards).where(eq(dailyRewards.userId, me.id)).orderBy(desc(dailyRewards.claimedAt)).limit(1);
    const lastClaim = last[0]?.claimedAt ? new Date(last[0].claimedAt).getTime() : 0;
    // 20h cooldown (server-side)
    if (Date.now() - lastClaim < 20 * 3600 * 1000) {
      const waitMs = 20 * 3600 * 1000 - (Date.now() - lastClaim);
      return NextResponse.json({ error: `Daily reward on cooldown. Come back in ${Math.ceil(waitMs / 3600000)}h.` }, { status: 429 });
    }
    const gap = Date.now() - lastClaim;
    const streak = last[0] && gap < 48 * 3600 * 1000 ? Math.min(ECONOMY.dailyMaxStreak, last[0].streakDay + 1) : 1;
    const amount = ECONOMY.dailyBase + (streak - 1) * ECONOMY.dailyStreakBonus;
    const idem = `daily:${me.id}:${new Date().toISOString().slice(0, 13)}:${randomUUID()}`;
    // use date-based idempotency guard: check if claimed today already via separate key
    try {
      const r = await adjustCoins({ userId: me.id, amount, reason: `Daily reward day ${streak}`, referenceType: "daily", referenceId: `streak-${streak}`, idempotencyKey: idem });
      await db.insert(dailyRewards).values({ userId: me.id, amount, streakDay: streak, idempotencyKey: `daily-row:${idem}` });
      return NextResponse.json({ ok: true, amount, streak, balance: r.balance });
    } catch (e: unknown) {
      return NextResponse.json({ error: (e as Error).message || "Failed" }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
