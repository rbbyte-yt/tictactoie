import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { cosmeticItems, userInventory, equippedCosmetics } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { adjustCoins } from "@/lib/economy";
import { ensureSeeded } from "@/lib/seed";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "items";
  if (action === "items") {
    const items = await db.select().from(cosmeticItems).where(eq(cosmeticItems.isActive, true));
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    const me = await getAuthUser();
    let owned: string[] = [];
    let equipped: Record<string, string> = {};
    if (me) {
      const inv = await db.select().from(userInventory).where(eq(userInventory.userId, me.id));
      owned = inv.map((i) => i.itemId);
      // default free items considered owned
      for (const it of items) if (it.price === 0 && !owned.includes(it.id)) owned.push(it.id);
      const eqr = await db.select().from(equippedCosmetics).where(eq(equippedCosmetics.userId, me.id));
      for (const e of eqr) equipped[e.category] = e.itemId;
    }
    return NextResponse.json({ items, owned, equipped });
  }
  if (action === "inventory") {
    const me = await getAuthUser();
    if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const inv = await db.select().from(userInventory).where(eq(userInventory.userId, me.id));
    const eqr = await db.select().from(equippedCosmetics).where(eq(equippedCosmetics.userId, me.id));
    const equipped: Record<string, string> = {};
    for (const e of eqr) equipped[e.category] = e.itemId;
    return NextResponse.json({ inventory: inv, equipped });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  const body = await req.json().catch(() => ({}));

  if (action === "purchase") {
    const itemId = String(body.itemId || "");
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
    const rows = await db.select().from(cosmeticItems).where(eq(cosmeticItems.id, itemId)).limit(1);
    const item = rows[0];
    if (!item || !item.isActive) return NextResponse.json({ error: "Item not available" }, { status: 404 });
    // limited-time check
    const now = new Date();
    if (item.availableFrom && new Date(item.availableFrom) > now) return NextResponse.json({ error: "Not yet available" }, { status: 400 });
    if (item.availableTo && new Date(item.availableTo) < now) return NextResponse.json({ error: "No longer available" }, { status: 400 });
    const owned = await db.select().from(userInventory).where(and(eq(userInventory.userId, me.id), eq(userInventory.itemId, itemId))).limit(1);
    if (owned[0] || item.price === 0) {
      if (owned[0]) return NextResponse.json({ error: "Already owned" }, { status: 409 });
      // free item: grant without charge
      await db.insert(userInventory).values({ userId: me.id, itemId, acquiredVia: "purchase" }).onConflictDoNothing();
      return NextResponse.json({ ok: true, free: true });
    }
    // NEVER trust client price: use server item.price
    const idem = `purchase:${me.id}:${itemId}:${body.idem || randomUUID()}`;
    // Use fixed idempotency per user+item to prevent duplicate purchase exploits; but allow retry with same key
    const fixedIdem = `purchase:${me.id}:${itemId}`;
    try {
      const r = await adjustCoins({ userId: me.id, amount: -item.price, reason: `Shop purchase: ${item.name}`, referenceType: "purchase", referenceId: itemId, idempotencyKey: fixedIdem });
      await db.insert(userInventory).values({ userId: me.id, itemId, acquiredVia: "purchase" }).onConflictDoNothing();
      return NextResponse.json({ ok: true, balance: r.balance, price: item.price });
    } catch (e: unknown) {
      const msg = (e as Error).message;
      if (msg === "INSUFFICIENT_FUNDS") return NextResponse.json({ error: "Insufficient R Coins" }, { status: 402 });
      // duplicate idempotency means already purchased
      if (msg.includes("duplicate") || msg.includes("unique")) return NextResponse.json({ error: "Already owned" }, { status: 409 });
      return NextResponse.json({ error: "Purchase failed" }, { status: 400 });
    }
  }

  if (action === "equip") {
    const itemId: string | null = body.itemId ?? null;
    const category = String(body.category || "");
    if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });
    if (itemId === null) {
      await db.delete(equippedCosmetics).where(and(eq(equippedCosmetics.userId, me.id), eq(equippedCosmetics.category, category)));
      return NextResponse.json({ ok: true, equipped: null });
    }
    const rows = await db.select().from(cosmeticItems).where(eq(cosmeticItems.id, itemId)).limit(1);
    const item = rows[0];
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.category !== category) return NextResponse.json({ error: "Category mismatch" }, { status: 400 });
    // ownership check server-side (free items allowed)
    if (item.price !== 0) {
      const owned = await db.select().from(userInventory).where(and(eq(userInventory.userId, me.id), eq(userInventory.itemId, itemId))).limit(1);
      if (!owned[0]) return NextResponse.json({ error: "Item not owned" }, { status: 403 });
    }
    await db.insert(equippedCosmetics).values({ userId: me.id, category, itemId }).onConflictDoUpdate({ target: [equippedCosmetics.userId, equippedCosmetics.category], set: { itemId, equippedAt: new Date() } });
    return NextResponse.json({ ok: true, equipped: itemId });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
