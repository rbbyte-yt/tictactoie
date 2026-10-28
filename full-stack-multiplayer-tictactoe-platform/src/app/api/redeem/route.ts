import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { redeemCodes, redeemRedemptions, userInventory, adminCoinGrants } from "@/db/schema";
import { getAuthUser, isAdmin } from "@/lib/auth";
import { adjustCoins } from "@/lib/economy";
import { ensureSeeded } from "@/lib/seed";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const rows = await db.execute(sql`
    SELECT r.id, c.code_display AS code, r.reward_coins, r.reward_item_id, r.redeemed_at
    FROM redeem_redemptions r JOIN redeem_codes c ON c.id = r.code_id
    WHERE r.user_id = ${me.id} ORDER BY r.redeemed_at DESC LIMIT 50
  `);
  return NextResponse.json({ history: rows.rows });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const rawCode = String(body.code || "").trim();
  if (!rawCode) return NextResponse.json({ error: "Code required" }, { status: 400 });
  const normalized = rawCode.toLowerCase();
  const idem = String(body.idem || randomUUID());

  const crows = await db.select().from(redeemCodes).where(eq(redeemCodes.codeLower, normalized)).limit(1);
  const code = crows[0];
  if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  if (!code.isActive) return NextResponse.json({ error: "This code is disabled" }, { status: 400 });
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) return NextResponse.json({ error: "This code has expired" }, { status: 400 });

  // Admin-only code: NEVER grant by code text alone. Require admin role + explicit grant params.
  if (code.isAdminOnly) {
    if (!isAdmin(me)) return NextResponse.json({ error: "Invalid code" }, { status: 404 }); // do not reveal existence
    // Admin must provide amount + confirmation + target (self default)
    const amount = Number(body.amount);
    const confirm = body.confirm === true;
    if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
      return NextResponse.json({ error: "Admin grant requires amount 1-1,000,000", adminGrant: true }, { status: 400 });
    }
    if (!confirm) return NextResponse.json({ error: "Confirmation required", adminGrant: true, needsConfirm: true }, { status: 400 });
    const grantIdem = `admingrant:${code.id}:${me.id}:${idem}`;
    try {
      const r = await adjustCoins({
        userId: me.id, amount, reason: `Admin grant via ${code.codeDisplay}`,
        referenceType: "admin", referenceId: String(code.id), idempotencyKey: grantIdem,
      });
      if (!r.duplicate) {
        await db.insert(adminCoinGrants).values({ adminId: me.id, targetUserId: me.id, amount, reason: `AdminRabbiBoos grant (confirmed)`, codeId: code.id, idempotencyKey: `grant-row:${grantIdem}` });
      }
      return NextResponse.json({ ok: true, adminGrant: true, amount, balance: r.balance, duplicate: r.duplicate });
    } catch (e: unknown) {
      return NextResponse.json({ error: "Grant failed" }, { status: 400 });
    }
  }

  // Ordinary code: one redemption per user enforced by UNIQUE(codeId,userId) + transaction
  if (code.maxUsesTotal !== null && code.useCount >= code.maxUsesTotal) {
    return NextResponse.json({ error: "Code fully redeemed" }, { status: 400 });
  }
  const rewardCoins = code.rewardCoins ?? 0;
  try {
    const result = await db.transaction(async (tx) => {
      // lock code row
      const locked = await tx.execute(sql`SELECT id, use_count, max_uses_total FROM redeem_codes WHERE id = ${code.id} FOR UPDATE`);
      const lc = locked.rows[0] as { use_count: number; max_uses_total: number | null };
      if (lc.max_uses_total !== null && Number(lc.use_count) >= lc.max_uses_total) throw new Error("EXHAUSTED");
      // attempt insert redemption (unique constraint prevents double-claim incl. multi-tab/refresh)
      try {
        await tx.insert(redeemRedemptions).values({
          codeId: code.id, userId: me.id, rewardCoins, rewardItemId: code.rewardItemId,
          idempotencyKey: `redeem:${code.id}:${me.id}`,
        });
      } catch {
        throw new Error("ALREADY");
      }
      await tx.execute(sql`UPDATE redeem_codes SET use_count = use_count + 1 WHERE id = ${code.id}`);
      // grant coins
      const ulocked = await tx.execute(sql`SELECT coins FROM users WHERE id = ${me.id} FOR UPDATE`);
      const cur = Number((ulocked.rows[0] as { coins: number }).coins);
      const next = cur + rewardCoins;
      await tx.execute(sql`UPDATE users SET coins = ${next} WHERE id = ${me.id}`);
      await tx.execute(sql`INSERT INTO coin_transactions (user_id, amount, balance_after, reason, reference_type, reference_id, idempotency_key) VALUES (${me.id}, ${rewardCoins}, ${next}, ${"Redeem code: " + code.codeDisplay}, 'redeem', ${String(code.id)}, ${"redeem-tx:" + code.id + ":" + me.id}) ON CONFLICT (idempotency_key) DO NOTHING`);
      if (code.rewardItemId) {
        await tx.execute(sql`INSERT INTO user_inventory (user_id, item_id, acquired_via) VALUES (${me.id}, ${code.rewardItemId}, 'redeem') ON CONFLICT DO NOTHING`);
      }
      return { balance: next };
    });
    return NextResponse.json({ ok: true, rewardCoins, balance: result.balance, code: code.codeDisplay });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg === "ALREADY") return NextResponse.json({ error: `You already redeemed "${code.codeDisplay}"` }, { status: 409 });
    if (msg === "EXHAUSTED") return NextResponse.json({ error: "Code fully redeemed" }, { status: 400 });
    return NextResponse.json({ error: "Redemption failed" }, { status: 400 });
  }
}
