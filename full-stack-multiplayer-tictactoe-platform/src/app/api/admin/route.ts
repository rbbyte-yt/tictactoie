import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { users, redeemCodes, cosmeticItems, chestTypes, chestRewardPools, probabilityConfigVersions, adminLogs, adminCoinGrants } from "@/db/schema";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { adjustCoins } from "@/lib/economy";
import { ensureSeeded } from "@/lib/seed";

async function requireAdmin() {
  const me = await getAuthUser();
  if (!me) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }), me: null };
  if (!isAdmin(me)) return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }), me: null };
  return { error: null, me };
}

async function log(adminId: string, action: string, details: Record<string, unknown>) {
  await db.insert(adminLogs).values({ adminId, action, details });
}

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const { error, me } = await requireAdmin();
  if (error || !me) return error!;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "stats";
  if (action === "stats") {
    const u = await db.execute(sql`SELECT COUNT(*)::int AS c, SUM(coins)::bigint AS coins FROM users`);
    const m = await db.execute(sql`SELECT COUNT(*)::int AS c FROM matches`);
    const tx = await db.execute(sql`SELECT COUNT(*)::int AS c FROM coin_transactions`);
    const o = await db.execute(sql`SELECT COUNT(*)::int AS c FROM chest_openings`);
    const q = await db.execute(sql`SELECT COUNT(*)::int AS c FROM matchmaking_queue WHERE status='waiting' AND expires_at > NOW()`);
    const relic = await db.execute(sql`SELECT COUNT(*)::int AS c FROM chest_openings WHERE reward_item_id='relic-eternal-god'`);
    const recentTx = await db.execute(sql`SELECT t.id, u.username, t.amount, t.balance_after, t.reason, t.created_at FROM coin_transactions t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 25`);
    const recentOpenings = await db.execute(sql`SELECT o.id, u.username, o.chest_id, o.reward_item_id, o.reward_rarity, o.cost, o.created_at FROM chest_openings o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 25`);
    const grants = await db.execute(sql`SELECT g.id, a.username AS admin, u.username AS target, g.amount, g.reason, g.created_at FROM admin_coin_grants g JOIN users a ON a.id=g.admin_id JOIN users u ON u.id=g.target_user_id ORDER BY g.created_at DESC LIMIT 25`);
    const codes = await db.select().from(redeemCodes).orderBy(desc(redeemCodes.createdAt)).limit(50);
    const items = await db.select().from(cosmeticItems).limit(200);
    const chests = await db.select().from(chestTypes);
    const logs = await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(30);
    return NextResponse.json({
      stats: { users: (u.rows[0] as { c: number }).c, totalCoins: Number((u.rows[0] as { coins: string }).coins ?? 0), matches: (m.rows[0] as { c: number }).c, transactions: (tx.rows[0] as { c: number }).c, openings: (o.rows[0] as { c: number }).c, queueWaiting: (q.rows[0] as { c: number }).c, relicDrops: (relic.rows[0] as { c: number }).c },
      recentTx: recentTx.rows, recentOpenings: recentOpenings.rows, grants: grants.rows, codes, items: items.slice(0, 120), chests, logs,
    });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { error, me } = await requireAdmin();
  if (error || !me) return error!;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  const body = await req.json().catch(() => ({}));

  if (action === "grant") {
    const target = String(body.username || "").trim();
    const amount = Number(body.amount);
    const reason = String(body.reason || "Admin grant");
    if (!target || !Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) return NextResponse.json({ error: "Invalid username/amount (1-1,000,000)" }, { status: 400 });
    const t = (await db.select().from(users).where(eq(users.usernameLower, target.toLowerCase())).limit(1))[0];
    if (!t) return NextResponse.json({ error: "Target not found" }, { status: 404 });
    const idem = `admingrant:${me.id}:${t.id}:${Date.now()}:${randomUUID()}`;
    const r = await adjustCoins({ userId: t.id, amount, reason: `Admin grant by ${me.username}: ${reason}`, referenceType: "admin", referenceId: me.id, idempotencyKey: idem });
    await db.insert(adminCoinGrants).values({ adminId: me.id, targetUserId: t.id, amount, reason, idempotencyKey: `grant-row:${idem}` });
    await log(me.id, "coin_grant", { target, amount, reason });
    return NextResponse.json({ ok: true, balance: r.balance });
  }

  if (action === "create-code") {
    const codeDisplay = String(body.code || "").trim();
    const rewardCoins = Number(body.rewardCoins ?? 0);
    const rewardItemId = body.rewardItemId ? String(body.rewardItemId) : null;
    const maxUsesTotal = body.maxUsesTotal ? Number(body.maxUsesTotal) : null;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (!codeDisplay || codeDisplay.length < 3 || codeDisplay.length > 32) return NextResponse.json({ error: "Code 3-32 chars" }, { status: 400 });
    if ((!Number.isInteger(rewardCoins) || rewardCoins < 0) && !rewardItemId) return NextResponse.json({ error: "Provide rewardCoins or rewardItemId" }, { status: 400 });
    const ins = await db.insert(redeemCodes).values({ codeLower: codeDisplay.toLowerCase(), codeDisplay, rewardCoins: rewardCoins || 0, rewardItemId, maxUsesTotal, isActive: true, createdBy: me.id, expiresAt }).returning().catch(() => null);
    if (!ins) return NextResponse.json({ error: "Code already exists" }, { status: 409 });
    await log(me.id, "create_code", { codeDisplay, rewardCoins });
    return NextResponse.json({ ok: true, code: ins[0] });
  }

  if (action === "toggle-code") {
    const id = Number(body.id);
    const c = (await db.select().from(redeemCodes).where(eq(redeemCodes.id, id)).limit(1))[0];
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.update(redeemCodes).set({ isActive: !c.isActive }).where(eq(redeemCodes.id, id));
    await log(me.id, "toggle_code", { id, to: !c.isActive });
    return NextResponse.json({ ok: true });
  }

  if (action === "upsert-item") {
    const { id, name, description, category, rarity, price, preview, isLimited, isActive } = body;
    if (!id || !name || !category || !rarity) return NextResponse.json({ error: "id/name/category/rarity required" }, { status: 400 });
    if (!Number.isInteger(price) || price < 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    const existing = (await db.select().from(cosmeticItems).where(eq(cosmeticItems.id, String(id))).limit(1))[0];
    if (existing) {
      await db.update(cosmeticItems).set({ name: String(name), description: String(description || ""), category: String(category), rarity: String(rarity), price, preview: preview || existing.preview, isLimited: !!isLimited, isActive: isActive !== false }).where(eq(cosmeticItems.id, String(id)));
    } else {
      await db.insert(cosmeticItems).values({ id: String(id), name: String(name), description: String(description || ""), category: String(category), rarity: String(rarity), price, preview: preview || { emoji: "🎁" }, isLimited: !!isLimited, isActive: isActive !== false, sortOrder: 999 });
    }
    await log(me.id, "upsert_item", { id, name, price });
    return NextResponse.json({ ok: true });
  }

  if (action === "update-chest") {
    const { id, price, isActive } = body;
    const c = (await db.select().from(chestTypes).where(eq(chestTypes.id, String(id))).limit(1))[0];
    if (!c) return NextResponse.json({ error: "Chest not found" }, { status: 404 });
    const patch: Record<string, unknown> = {};
    if (Number.isInteger(price) && price >= 0) patch.price = price;
    if (typeof isActive === "boolean") patch.isActive = isActive;
    if (Object.keys(patch).length) await db.update(chestTypes).set(patch).where(eq(chestTypes.id, String(id)));
    await log(me.id, "update_chest", { id, patch });
    return NextResponse.json({ ok: true });
  }

  if (action === "update-pool") {
    // body: { chestId, pool: [{itemId, probability}] } — must sum to 100
    const chestId = String(body.chestId || "");
    const pool = body.pool as { itemId: string; probability: number }[];
    if (!chestId || !Array.isArray(pool) || !pool.length) return NextResponse.json({ error: "chestId + pool required" }, { status: 400 });
    const total = pool.reduce((a, p) => a + Number(p.probability), 0);
    if (Math.abs(total - 100) > 0.001) return NextResponse.json({ error: `Probabilities must sum to 100% (got ${total}%)` }, { status: 400 });
    for (const p of pool) {
      if (Number(p.probability) < 0) return NextResponse.json({ error: "Negative probability" }, { status: 400 });
      const it = (await db.select().from(cosmeticItems).where(eq(cosmeticItems.id, p.itemId)).limit(1))[0];
      if (!it) return NextResponse.json({ error: `Item not found: ${p.itemId}` }, { status: 400 });
    }
    const c = (await db.select().from(chestTypes).where(eq(chestTypes.id, chestId)).limit(1))[0];
    if (!c) return NextResponse.json({ error: "Chest not found" }, { status: 404 });
    const newVersion = c.activeVersion + 1;
    await db.insert(probabilityConfigVersions).values({ chestId, version: newVersion, isActive: true, totalProbability: "100.0000", notes: String(body.notes || `Updated by ${me.username}`) });
    for (const p of pool) {
      await db.insert(chestRewardPools).values({ chestId, itemId: p.itemId, probability: Number(p.probability).toFixed(4), version: newVersion });
    }
    await db.update(chestTypes).set({ activeVersion: newVersion }).where(eq(chestTypes.id, chestId));
    await db.execute(sql`UPDATE probability_config_versions SET is_active = false WHERE chest_id = ${chestId} AND version != ${newVersion}`);
    await log(me.id, "update_pool", { chestId, newVersion, total });
    return NextResponse.json({ ok: true, version: newVersion });
  }

  if (action === "ban") {
    const target = String(body.username || "").trim();
    const banned = body.banned !== false;
    const reason = String(body.reason || "Abuse");
    const t = (await db.select().from(users).where(eq(users.usernameLower, target.toLowerCase())).limit(1))[0];
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (t.role === "admin") return NextResponse.json({ error: "Cannot ban admin" }, { status: 400 });
    await db.update(users).set({ isBanned: banned, banReason: reason }).where(eq(users.id, t.id));
    await log(me.id, banned ? "ban" : "unban", { target, reason });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
