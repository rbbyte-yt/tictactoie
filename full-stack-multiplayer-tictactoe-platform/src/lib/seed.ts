import { db } from "@/db";
import { cosmeticItems, chestTypes, chestRewardPools, probabilityConfigVersions, redeemCodes } from "@/db/schema";
import { SEED_ITEMS, SEED_CHESTS, SEED_POOLS } from "./seed-data";
import { eq, sql } from "drizzle-orm";

let seeded = false;

export async function ensureSeeded() {
  if (seeded) return;
  try {
    const count = await db.execute(sql`SELECT COUNT(*)::int AS c FROM cosmetic_items`);
    const c = Number((count.rows[0] as { c: number })?.c ?? 0);
    if (c >= 60) {
      seeded = true;
      await ensureRedeemCodes();
      return;
    }
  } catch {
    return; // tables may not exist yet
  }
  // insert items
  for (const it of SEED_ITEMS) {
    try {
      await db
        .insert(cosmeticItems)
        .values({
          id: it.id,
          name: it.name,
          description: it.description,
          category: it.category,
          rarity: it.rarity,
          price: it.price,
          preview: it.preview,
          sortOrder: it.sortOrder,
          isLimited: it.isLimited ?? false,
          isActive: true,
        })
        .onConflictDoNothing();
    } catch {}
  }
  for (const ch of SEED_CHESTS) {
    try {
      await db
        .insert(chestTypes)
        .values({
          id: ch.id,
          name: ch.name,
          description: ch.description,
          price: ch.price,
          colorTheme: ch.colorTheme,
          icon: ch.icon,
          gradient: ch.gradient,
          isActive: true,
          activeVersion: 1,
        })
        .onConflictDoNothing();
    } catch {}
  }
  for (const [chestId, pool] of Object.entries(SEED_POOLS)) {
    const total = pool.reduce((a, p) => a + p.probability, 0);
    try {
      await db.insert(probabilityConfigVersions).values({ chestId, version: 1, isActive: true, totalProbability: total.toFixed(4), notes: "Initial v1" }).onConflictDoNothing();
    } catch {}
    for (const p of pool) {
      try {
        await db.insert(chestRewardPools).values({ chestId, itemId: p.itemId, probability: p.probability.toFixed(4), version: 1 }).onConflictDoNothing();
      } catch {}
    }
  }
  await ensureRedeemCodes();
  seeded = true;
}

async function ensureRedeemCodes() {
  try {
    await db.insert(redeemCodes).values({ codeLower: "rabbi", codeDisplay: "Rabbi", rewardCoins: 100, maxUsesPerUser: 1, maxUsesTotal: null, isActive: true, isAdminOnly: false }).onConflictDoNothing();
    await db.insert(redeemCodes).values({ codeLower: "adminrabbiboos", codeDisplay: "AdminRabbiBoos", rewardCoins: null, maxUsesPerUser: 1, maxUsesTotal: null, isActive: true, isAdminOnly: true }).onConflictDoNothing();
  } catch {}
}
