import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomInt, randomUUID } from "crypto";
import { db } from "@/db";
import { chestTypes, chestRewardPools, cosmeticItems, chestOpenings, userInventory, duplicateConversions, probabilityConfigVersions } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { DUPLICATE_COMPENSATION } from "@/lib/economy";
import { ensureSeeded } from "@/lib/seed";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "list";
  if (action === "list") {
    const chests = await db.select().from(chestTypes).where(eq(chestTypes.isActive, true));
    return NextResponse.json({ chests, duplicatePolicy: DUPLICATE_COMPENSATION });
  }
  if (action === "detail") {
    const id = searchParams.get("id") || "";
    const c = (await db.select().from(chestTypes).where(eq(chestTypes.id, id)).limit(1))[0];
    if (!c) return NextResponse.json({ error: "Chest not found" }, { status: 404 });
    const pools = await db.execute(sql`
      SELECT p.item_id, p.probability, i.name, i.rarity, i.category, i.preview, i.price
      FROM chest_reward_pools p JOIN cosmetic_items i ON i.id = p.item_id
      WHERE p.chest_id = ${id} AND p.version = ${c.activeVersion} ORDER BY p.probability DESC
    `);
    const total = (pools.rows as { probability: string }[]).reduce((a, r) => a + Number(r.probability), 0);
    return NextResponse.json({ chest: c, pool: pools.rows, totalProbability: Math.round(total * 10000) / 10000, duplicatePolicy: DUPLICATE_COMPENSATION });
  }
  if (action === "history") {
    const me = await getAuthUser();
    if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const rows = await db.execute(sql`
      SELECT o.id, o.chest_id, c.name AS chest_name, o.reward_item_id, i.name AS reward_name, i.rarity, o.cost, o.is_duplicate, o.duplicate_compensation, o.created_at
      FROM chest_openings o JOIN chest_types c ON c.id = o.chest_id JOIN cosmetic_items i ON i.id = o.reward_item_id
      WHERE o.user_id = ${me.id} ORDER BY o.created_at DESC LIMIT 50
    `);
    const inv = await db.execute(sql`SELECT COUNT(*)::int AS c FROM user_inventory WHERE user_id = ${me.id}`);
    const totalItems = await db.execute(sql`SELECT COUNT(*)::int AS c FROM cosmetic_items WHERE is_active = true`);
    return NextResponse.json({ history: rows.rows, collection: { owned: (inv.rows[0] as { c: number }).c, total: (totalItems.rows[0] as { c: number }).c } });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  if (action !== "open") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const chestId = String(body.chestId || "");
  const idem = String(body.idem || randomUUID());
  if (!chestId) return NextResponse.json({ error: "chestId required" }, { status: 400 });

  const c = (await db.select().from(chestTypes).where(eq(chestTypes.id, chestId)).limit(1))[0];
  if (!c || !c.isActive) return NextResponse.json({ error: "Chest not available" }, { status: 404 });
  // NEVER trust client price: use server c.price
  const pools = await db.select().from(chestRewardPools).where(and(eq(chestRewardPools.chestId, chestId), eq(chestRewardPools.version, c.activeVersion)));
  if (!pools.length) return NextResponse.json({ error: "Chest has no rewards configured" }, { status: 500 });
  const total = pools.reduce((a, p) => a + Number(p.probability), 0);
  if (Math.abs(total - 100) > 0.001) return NextResponse.json({ error: "Chest probability misconfigured" }, { status: 500 });

  // Secure random roll: 0..999999 (0.0001% resolution)
  const roll = randomInt(0, 1000000); // 0..999999
  const target = (roll / 1000000) * 100; // 0..100
  let acc = 0;
  let picked = pools[0];
  for (const p of pools) {
    acc += Number(p.probability);
    if (target < acc) { picked = p; break; }
  }
  const item = (await db.select().from(cosmeticItems).where(eq(cosmeticItems.id, picked.itemId)).limit(1))[0];
  if (!item) return NextResponse.json({ error: "Reward item missing" }, { status: 500 });

  const openingIdem = `open:${me.id}:${chestId}:${idem}`;
  try {
    const result = await db.transaction(async (tx) => {
      // idempotency: if this opening already processed, return existing
      const dup = await tx.execute(sql`SELECT id FROM chest_openings WHERE idempotency_key = ${openingIdem} LIMIT 1`);
      if (dup.rows[0]) throw new Error("DUPLICATE_REQUEST");
      // lock user & charge
      const ul = await tx.execute(sql`SELECT coins FROM users WHERE id = ${me.id} FOR UPDATE`);
      const cur = Number((ul.rows[0] as { coins: number }).coins);
      if (cur < c.price) throw new Error("INSUFFICIENT");
      const afterCharge = cur - c.price;
      await tx.execute(sql`UPDATE users SET coins = ${afterCharge} WHERE id = ${me.id}`);
      await tx.execute(sql`INSERT INTO coin_transactions (user_id, amount, balance_after, reason, reference_type, reference_id, idempotency_key) VALUES (${me.id}, ${-c.price}, ${afterCharge}, ${"Chest opened: " + c.name}, 'chest', ${chestId}, ${"chest-charge:" + openingIdem})`);
      // award or duplicate-convert
      const ownCheck = await tx.execute(sql`SELECT id FROM user_inventory WHERE user_id = ${me.id} AND item_id = ${item.id} LIMIT 1`);
      const isDup = !!ownCheck.rows[0] || item.price === 0;
      let compensation = 0;
      let finalBalance = afterCharge;
      if (isDup) {
        compensation = DUPLICATE_COMPENSATION[item.rarity] ?? 10;
        finalBalance = afterCharge + compensation;
        await tx.execute(sql`UPDATE users SET coins = ${finalBalance} WHERE id = ${me.id}`);
        await tx.execute(sql`INSERT INTO coin_transactions (user_id, amount, balance_after, reason, reference_type, reference_id, idempotency_key) VALUES (${me.id}, ${compensation}, ${finalBalance}, ${"Duplicate conversion: " + item.name}, 'duplicate', ${item.id}, ${"dup:" + openingIdem})`);
      } else {
        await tx.execute(sql`INSERT INTO user_inventory (user_id, item_id, acquired_via) VALUES (${me.id}, ${item.id}, 'chest') ON CONFLICT DO NOTHING`);
      }
      const openingId = randomUUID();
      await tx.execute(sql`INSERT INTO chest_openings (id, user_id, chest_id, reward_item_id, reward_rarity, cost, is_duplicate, duplicate_compensation, probability_version, idempotency_key) VALUES (${openingId}, ${me.id}, ${chestId}, ${item.id}, ${item.rarity}, ${c.price}, ${isDup}, ${compensation}, ${c.activeVersion}, ${openingIdem})`);
      if (isDup) {
        await tx.execute(sql`INSERT INTO duplicate_conversions (user_id, opening_id, item_id, compensation_coins) VALUES (${me.id}, ${openingId}, ${item.id}, ${compensation})`);
      }
      return { openingId, isDup, compensation, balance: finalBalance };
    });
    const isRelic = item.id === "relic-eternal-god";
    return NextResponse.json({
      ok: true, openingId: result.openingId, chest: { id: c.id, name: c.name, price: c.price },
      reward: { id: item.id, name: item.name, rarity: item.rarity, category: item.category, preview: item.preview },
      isDuplicate: result.isDup, compensation: result.compensation, balance: result.balance,
      relic: isRelic,
    });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg === "INSUFFICIENT") return NextResponse.json({ error: `Insufficient R Coins (need ${c.price})` }, { status: 402 });
    if (msg === "DUPLICATE_REQUEST") return NextResponse.json({ error: "Duplicate request ignored" }, { status: 409 });
    return NextResponse.json({ error: "Chest opening failed" }, { status: 400 });
  }
}
