import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes, randomUUID } from "crypto";
import { db } from "@/db";
import { gameRooms, matches, matchMoves, matchPlayers, abilityActivations, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { emptyBoard, checkWinner, boardFromDb, validateMove, botMove, hintMove, type Board } from "@/lib/game";
import { adjustCoins, recordMatchScore, ECONOMY } from "@/lib/economy";
import { ensureSeeded } from "@/lib/seed";

function roomCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  if (action === "room") {
    const code = (searchParams.get("code") || "").toUpperCase();
    const rows = await db.select().from(gameRooms).where(eq(gameRooms.code, code)).limit(1);
    const room = rows[0];
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (new Date(room.expiresAt) < new Date() && room.status !== "finished") {
      await db.update(gameRooms).set({ status: "expired" }).where(eq(gameRooms.id, room.id));
      return NextResponse.json({ error: "Room expired" }, { status: 410 });
    }
    let match = null;
    if (room.matchId) {
      const m = await db.select().from(matches).where(eq(matches.id, room.matchId)).limit(1);
      match = m[0] ?? null;
    }
    // resolve names
    const hostName = room.hostId ? (await db.select({ username: users.username }).from(users).where(eq(users.id, room.hostId)).limit(1))[0]?.username ?? "Host" : "Host";
    const guestName = room.guestId ? (await db.select({ username: users.username }).from(users).where(eq(users.id, room.guestId)).limit(1))[0]?.username ?? null : null;
    return NextResponse.json({ room: { ...room, hostName, guestName }, match });
  }
  if (action === "match") {
    const id = searchParams.get("id") || "";
    const m = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!m[0]) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    const moves = await db.select().from(matchMoves).where(eq(matchMoves.matchId, id)).orderBy(matchMoves.moveNumber);
    const players = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, id));
    // touch presence
    if (m[0].status === "active" && (m[0].playerXId === me.id || m[0].playerOId === me.id)) {
      await db.execute(sql`UPDATE match_players SET connected = true, last_seen_at = NOW() WHERE match_id = ${id} AND user_id = ${me.id}`);
    }
    return NextResponse.json({ match: m[0], moves, players });
  }
  if (action === "abilities") {
    const matchId = searchParams.get("matchId") || "";
    const rows = await db.select().from(abilityActivations).where(eq(abilityActivations.matchId, matchId)).orderBy(desc(abilityActivations.createdAt)).limit(20);
    return NextResponse.json({ abilities: rows });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  const body = await req.json().catch(() => ({}));

  // ---- CREATE ROOM ----
  if (action === "create-room") {
    const code = roomCode();
    const hostSymbol = body.symbol === "O" ? "O" : "X";
    const inserted = await db.insert(gameRooms).values({
      code, hostId: me.id, hostSymbol, status: "waiting",
      expiresAt: new Date(Date.now() + 2 * 3600 * 1000),
    }).returning();
    return NextResponse.json({ ok: true, room: inserted[0], inviteLink: `/room/${code}` });
  }

  // ---- JOIN ROOM ----
  if (action === "join-room") {
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
    const rows = await db.select().from(gameRooms).where(eq(gameRooms.code, code)).limit(1);
    const room = rows[0];
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.status === "expired" || new Date(room.expiresAt) < new Date()) return NextResponse.json({ error: "Room expired" }, { status: 410 });
    if (room.status === "finished") return NextResponse.json({ error: "Room finished" }, { status: 410 });
    // host rejoin
    if (room.hostId === me.id) {
      return NextResponse.json({ ok: true, room, role: "host" });
    }
    // guest slot
    if (room.guestId && room.guestId !== me.id) return NextResponse.json({ error: "Room is full" }, { status: 409 });
    await db.update(gameRooms).set({ guestId: me.id, status: "active" }).where(eq(gameRooms.id, room.id));
    // create match if none
    let matchId = room.matchId;
    if (!matchId) {
      const hostIsX = room.hostSymbol === "X";
      const mid = randomUUID();
      const hostName = me.username; // guest joining; fetch host name below
      const hostRow = room.hostId ? (await db.select({ username: users.username }).from(users).where(eq(users.id, room.hostId)).limit(1))[0] : null;
      const pxName = hostIsX ? (hostRow?.username ?? "Host") : me.username;
      const poName = hostIsX ? me.username : (hostRow?.username ?? "Host");
      await db.insert(matches).values({
        id: mid, mode: "friend", status: "active", board: emptyBoard(), currentTurn: "X",
        playerXId: hostIsX ? room.hostId : me.id, playerOId: hostIsX ? me.id : room.hostId,
        playerXName: pxName, playerOName: poName, roomId: room.id, isRanked: false,
        seasonYear: new Date().getUTCFullYear(), idempotencyKey: `room:${room.id}:${Date.now()}`,
      });
      await db.insert(matchPlayers).values([
        { matchId: mid, userId: hostIsX ? room.hostId : me.id, symbol: "X", isBot: false, connected: true },
        { matchId: mid, userId: hostIsX ? me.id : room.hostId, symbol: "O", isBot: false, connected: true },
      ]);
      await db.update(gameRooms).set({ matchId: mid }).where(eq(gameRooms.id, room.id));
      matchId = mid;
    }
    const updated = (await db.select().from(gameRooms).where(eq(gameRooms.id, room.id)).limit(1))[0];
    return NextResponse.json({ ok: true, room: updated, matchId, role: "guest" });
  }

  // ---- LEAVE ROOM ----
  if (action === "leave-room") {
    const code = String(body.code || "").toUpperCase();
    const rows = await db.select().from(gameRooms).where(eq(gameRooms.code, code)).limit(1);
    const room = rows[0];
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.hostId === me.id) {
      await db.update(gameRooms).set({ status: "finished" }).where(eq(gameRooms.id, room.id));
      if (room.matchId) {
        const m = (await db.select().from(matches).where(eq(matches.id, room.matchId)).limit(1))[0];
        if (m && m.status === "active") {
          await db.update(matches).set({ status: "finished", winner: room.guestId ? (m.playerXId === me.id ? "O" : "X") : null, finishedAt: new Date() }).where(eq(matches.id, m.id));
          await recordMatchScore(m.id);
        }
      }
    } else if (room.guestId === me.id) {
      await db.update(gameRooms).set({ guestId: null, status: "waiting" }).where(eq(gameRooms.id, room.id));
      if (room.matchId) {
        const m = (await db.select().from(matches).where(eq(matches.id, room.matchId)).limit(1))[0];
        if (m && m.status === "active") {
          await db.update(matches).set({ status: "finished", winner: m.playerXId === me.id ? "O" : "X", finishedAt: new Date() }).where(eq(matches.id, m.id));
          await recordMatchScore(m.id);
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ---- BOT CREATE ----
  if (action === "bot-create") {
    const difficulty = ["easy", "medium", "hard", "expert"].includes(body.difficulty) ? body.difficulty : "medium";
    const mySymbol = body.symbol === "O" ? "O" : "X";
    const mid = randomUUID();
    await db.insert(matches).values({
      id: mid, mode: "bot", status: "active", board: emptyBoard(), currentTurn: "X",
      playerXId: mySymbol === "X" ? me.id : null, playerOId: mySymbol === "O" ? me.id : null,
      playerXName: mySymbol === "X" ? me.username : `Bot-${difficulty}`, playerOName: mySymbol === "O" ? me.username : `Bot-${difficulty}`,
      botDifficulty: difficulty, isRanked: false, seasonYear: new Date().getUTCFullYear(),
      idempotencyKey: `bot:${me.id}:${mid}`,
    });
    await db.insert(matchPlayers).values([
      { matchId: mid, userId: mySymbol === "X" ? me.id : null, symbol: "X", isBot: mySymbol !== "X", connected: true },
      { matchId: mid, userId: mySymbol === "O" ? me.id : null, symbol: "O", isBot: mySymbol !== "O", connected: true },
    ]);
    let match = (await db.select().from(matches).where(eq(matches.id, mid)).limit(1))[0];
    // if bot is X, bot moves first
    if (mySymbol === "O") {
      match = await doBotMove(match);
    }
    return NextResponse.json({ ok: true, match });
  }

  // ---- MOVE ----
  if (action === "move") {
    const matchId = String(body.matchId || "");
    const pos = Number(body.position);
    const idem = String(body.idem || randomUUID());
    const mrows = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const m = mrows[0];
    if (!m) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (m.status !== "active") return NextResponse.json({ error: "Game already finished" }, { status: 400 });
    const board = boardFromDb(m.board);
    // determine my symbol
    let mySymbol: "X" | "O" | null = null;
    if (m.playerXId === me.id) mySymbol = "X";
    else if (m.playerOId === me.id) mySymbol = "O";
    else {
      // room guest/host edge: allow if part of room
      return NextResponse.json({ error: "You are not a player in this match" }, { status: 403 });
    }
    const err = validateMove(board, pos, mySymbol, m.currentTurn, m.status);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    // idempotency: if same moveNumber already has this position by this user, return current
    board[pos] = mySymbol;
    const { winner, line } = checkWinner(board);
    const moveNo = m.moveCount + 1;
    await db.insert(matchMoves).values({ matchId, userId: me.id, symbol: mySymbol, position: pos, moveNumber: moveNo });
    // decrement shield turns
    await db.execute(sql`UPDATE ability_activations SET turns_left = GREATEST(0, turns_left - 1) WHERE match_id = ${matchId} AND turns_left > 0`);
    if (winner === "X" || winner === "O" || winner === "draw") {
      await db.update(matches).set({
        board, status: "finished", winner: winner === "draw" ? "draw" : winner, winLine: line,
        moveCount: moveNo, finishedAt: new Date(), lastMoveAt: new Date(),
      }).where(eq(matches.id, matchId));
      await recordMatchScore(matchId);
      const fin = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
      return NextResponse.json({ ok: true, match: fin });
    }
    const nextTurn = m.currentTurn === "X" ? "O" : "X";
    await db.update(matches).set({ board, currentTurn: nextTurn, moveCount: moveNo, lastMoveAt: new Date() }).where(eq(matches.id, matchId));
    let updated = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
    // bot reply?
    if (updated.mode === "bot") {
      const botSymbol = mySymbol === "X" ? "O" : "X";
      if (updated.currentTurn === botSymbol && updated.status === "active") {
        updated = await doBotMove(updated);
      }
    }
    return NextResponse.json({ ok: true, match: updated });
  }

  // ---- REMATCH ----
  if (action === "rematch") {
    const matchId = String(body.matchId || "");
    const mrows = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const m = mrows[0];
    if (!m) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (m.status === "active") return NextResponse.json({ error: "Match still active" }, { status: 400 });
    if (m.mode === "bot") {
      const myOldSymbol = m.playerXId === me.id ? "X" : "O";
      const mySymbol = myOldSymbol === "X" ? "O" : "X"; // swap
      const mid = randomUUID();
      await db.insert(matches).values({
        id: mid, mode: "bot", status: "active", board: emptyBoard(), currentTurn: "X",
        playerXId: mySymbol === "X" ? me.id : null, playerOId: mySymbol === "O" ? me.id : null,
        playerXName: mySymbol === "X" ? me.username : `Bot-${m.botDifficulty}`, playerOName: mySymbol === "O" ? me.username : `Bot-${m.botDifficulty}`,
        botDifficulty: m.botDifficulty, isRanked: false, seasonYear: new Date().getUTCFullYear(), idempotencyKey: `bot:${me.id}:${mid}`,
      });
      let nm = (await db.select().from(matches).where(eq(matches.id, mid)).limit(1))[0];
      if (mySymbol === "O") nm = await doBotMove(nm);
      return NextResponse.json({ ok: true, match: nm });
    }
    // friend/random: create new match with swapped symbols
    if (m.playerXId !== me.id && m.playerOId !== me.id) return NextResponse.json({ error: "Not your match" }, { status: 403 });
    const mid = randomUUID();
    const newX = m.playerOId, newO = m.playerXId;
    await db.insert(matches).values({
      id: mid, mode: m.mode, status: "active", board: emptyBoard(), currentTurn: "X",
      playerXId: newX, playerOId: newO, playerXName: m.playerOName, playerOName: m.playerXName,
      roomId: m.roomId, isRanked: m.isRanked, seasonYear: new Date().getUTCFullYear(), idempotencyKey: `rematch:${m.id}:${Date.now()}`,
    });
    await db.insert(matchPlayers).values([
      { matchId: mid, userId: newX, symbol: "X", isBot: false, connected: true },
      { matchId: mid, userId: newO, symbol: "O", isBot: false, connected: true },
    ]);
    if (m.roomId) await db.update(gameRooms).set({ matchId: mid, status: "active" }).where(eq(gameRooms.id, m.roomId));
    const nm = (await db.select().from(matches).where(eq(matches.id, mid)).limit(1))[0];
    return NextResponse.json({ ok: true, match: nm });
  }

  // ---- USE ABILITY ----
  if (action === "use-ability") {
    const matchId = String(body.matchId || "");
    const type = String(body.type || "");
    const idemKey = String(body.idem || randomUUID());
    if (!["hint", "assist", "shield"].includes(type)) return NextResponse.json({ error: "Invalid ability" }, { status: 400 });
    const mrows = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const m = mrows[0];
    if (!m) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (m.status !== "active") return NextResponse.json({ error: "Game not active" }, { status: 400 });
    let mySymbol: "X" | "O" | null = null;
    if (m.playerXId === me.id) mySymbol = "X";
    else if (m.playerOId === me.id) mySymbol = "O";
    else return NextResponse.json({ error: "Not your match" }, { status: 403 });

    // ranked policy: abilities allowed but disclosed; shield works everywhere
    if (type === "shield") {
      // prevent duplicate active shield
      const existing = await db.select().from(abilityActivations).where(and(eq(abilityActivations.userId, me.id), eq(abilityActivations.matchId, matchId), eq(abilityActivations.abilityType, "shield")));
      const active = existing.find((e) => (e.turnsLeft ?? 0) > 0);
      if (active) return NextResponse.json({ error: "Shield already active", turnsLeft: active.turnsLeft }, { status: 409 });
      const cost = ECONOMY.shieldCost;
      try {
        const r = await adjustCoins({ userId: me.id, amount: -cost, reason: `Ability Shield activation (${matchId.slice(0, 8)})`, referenceType: "ability", referenceId: matchId, idempotencyKey: `shield:${me.id}:${matchId}:${idemKey}` });
        await db.insert(abilityActivations).values({
          userId: me.id, matchId, abilityType: "shield", cost,
          durationTurns: ECONOMY.shieldTurns, turnsLeft: ECONOMY.shieldTurns,
          idempotencyKey: `shield-row:${me.id}:${matchId}:${idemKey}`,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        });
        return NextResponse.json({ ok: true, balance: r.balance, turnsLeft: ECONOMY.shieldTurns, message: `Ability Shield active for ${ECONOMY.shieldTurns} turns` });
      } catch (e: unknown) {
        if ((e as Error).message === "INSUFFICIENT_FUNDS") return NextResponse.json({ error: "Insufficient R Coins (need 1,000)" }, { status: 402 });
        return NextResponse.json({ error: "Activation failed" }, { status: 400 });
      }
    }

    // hint / assist: check opponent shield
    const oppId = mySymbol === "X" ? m.playerOId : m.playerXId;
    if (oppId) {
      const shields = await db.select().from(abilityActivations).where(and(eq(abilityActivations.userId, oppId), eq(abilityActivations.matchId, matchId), eq(abilityActivations.abilityType, "shield")));
      const activeShield = shields.find((s) => (s.turnsLeft ?? 0) > 0);
      if (activeShield) {
        await db.insert(abilityActivations).values({
          userId: me.id, matchId, abilityType: type, cost: 0, isBlocked: true, blockedBy: oppId,
          idempotencyKey: `blocked:${me.id}:${matchId}:${type}:${idemKey}`,
        });
        return NextResponse.json({ error: "Blocked by opponent's Ability Shield 🛡️", blocked: true, turnsLeft: activeShield.turnsLeft }, { status: 403 });
      }
    }
    const cost = type === "hint" ? ECONOMY.hintCost : ECONOMY.assistCost;
    const board = boardFromDb(m.board);
    const suggestion = hintMove(board, mySymbol);
    try {
      const r = await adjustCoins({ userId: me.id, amount: -cost, reason: `${type} in match ${matchId.slice(0, 8)}`, referenceType: "ability", referenceId: matchId, idempotencyKey: `${type}:${me.id}:${matchId}:${idemKey}` });
      await db.insert(abilityActivations).values({ userId: me.id, matchId, abilityType: type, cost, idempotencyKey: `${type}-row:${me.id}:${matchId}:${idemKey}` });
      const legal = board.map((c, i) => (c === "" ? i : -1)).filter((i) => i >= 0);
      return NextResponse.json({ ok: true, suggestion, legalMoves: type === "assist" ? legal : undefined, balance: r.balance, cost });
    } catch (e: unknown) {
      if ((e as Error).message === "INSUFFICIENT_FUNDS") return NextResponse.json({ error: `Insufficient R Coins (need ${cost})` }, { status: 402 });
      return NextResponse.json({ error: "Ability failed" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function doBotMove(m: typeof matches.$inferSelect) {
  const board = boardFromDb(m.board);
  const botSymbol = (m.playerXId ? "O" : "X") as "X" | "O";
  // determine bot symbol: the side with null user
  const actualBot: "X" | "O" = m.playerXId === null ? "X" : "O";
  if (m.currentTurn !== actualBot) return m;
  const pos = botMove(board, actualBot, m.botDifficulty || "medium");
  if (pos < 0) return m;
  board[pos] = actualBot;
  void botSymbol;
  const { winner, line } = checkWinner(board);
  const moveNo = m.moveCount + 1;
  await db.insert(matchMoves).values({ matchId: m.id, userId: null, symbol: actualBot, position: pos, moveNumber: moveNo });
  if (winner === "X" || winner === "O" || winner === "draw") {
    await db.update(matches).set({ board, status: "finished", winner: winner === "draw" ? "draw" : winner, winLine: line, moveCount: moveNo, finishedAt: new Date(), lastMoveAt: new Date() }).where(eq(matches.id, m.id));
    await recordMatchScore(m.id);
  } else {
    await db.update(matches).set({ board, currentTurn: m.currentTurn === "X" ? "O" : "X", moveCount: moveNo, lastMoveAt: new Date() }).where(eq(matches.id, m.id));
  }
  return (await db.select().from(matches).where(eq(matches.id, m.id)).limit(1))[0];
}
