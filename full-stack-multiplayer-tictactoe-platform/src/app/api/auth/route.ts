import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users, loginAttempts } from "@/db/schema";
import {
  validateUsername, validatePassword, validateDob, hashPassword, verifyPassword,
  createSession, setSessionCookie, getAuthUser, destroySession, ensureUserAux, adminSetupKeyValid,
} from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { ensureSeeded } from "@/lib/seed";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "me";
  if (action === "check-username") {
    const username = (searchParams.get("username") || "").trim();
    const err = validateUsername(username);
    if (err) return NextResponse.json({ available: false, error: err });
    const rows = await db.select().from(users).where(eq(users.usernameLower, username.toLowerCase())).limit(1);
    return NextResponse.json({ available: !rows[0] });
  }
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { ...user, age: undefined } });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  const body = await req.json().catch(() => ({}));

  if (action === "register") {
    const rl = rateLimit(clientKey(req, "register"), 10, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const dob = String(body.dob || "");
    const email = body.email ? String(body.email).trim() : null;
    const adminKey = body.adminKey ? String(body.adminKey) : null;

    const uErr = validateUsername(username);
    if (uErr) return NextResponse.json({ error: uErr }, { status: 400 });
    const pErr = validatePassword(password);
    if (pErr) return NextResponse.json({ error: pErr }, { status: 400 });
    const { error: dErr } = validateDob(dob);
    if (dErr) return NextResponse.json({ error: dErr }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

    const existing = await db.select().from(users).where(
      email ? or(eq(users.usernameLower, username.toLowerCase()), eq(users.emailLower, email.toLowerCase())) : eq(users.usernameLower, username.toLowerCase())
    ).limit(1);
    if (existing[0]) {
      if (existing[0].usernameLower === username.toLowerCase()) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    const role = adminKey && adminSetupKeyValid(adminKey) ? "admin" : "user";
    const passwordHash = await hashPassword(password);
    const inserted = await db.insert(users).values({
      username, usernameLower: username.toLowerCase(),
      passwordHash, dob,
      email: email || null, emailLower: email ? email.toLowerCase() : null,
      role, coins: 500,
    }).returning();
    const user = inserted[0];
    await ensureUserAux(user.id);
    const { token, expiresAt } = await createSession(user.id, req.headers.get("x-forwarded-for") || "", req.headers.get("user-agent") || "");
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, coins: user.coins, role: user.role } });
  }

  if (action === "login") {
    const rl = rateLimit(clientKey(req, "login"), 15, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    const identifier = String(body.identifier || body.username || "").trim();
    const password = String(body.password || "");
    if (!identifier || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    // brute force check
    const attRows = await db.select().from(loginAttempts).where(eq(loginAttempts.identifier, identifier.toLowerCase())).limit(1);
    const att = attRows[0];
    if (att?.blockedUntil && att.blockedUntil > new Date()) {
      return NextResponse.json({ error: "Account temporarily locked. Try again later." }, { status: 429 });
    }
    const rows = await db.select().from(users).where(
      or(eq(users.usernameLower, identifier.toLowerCase()), eq(users.emailLower, identifier.toLowerCase()))
    ).limit(1);
    const user = rows[0];
    const fail = async () => {
      if (!att) await db.insert(loginAttempts).values({ identifier: identifier.toLowerCase(), ip: req.headers.get("x-forwarded-for") || "" });
      else {
        const n = att.attempts + 1;
        await db.update(loginAttempts).set({
          attempts: n, lastAttemptAt: new Date(),
          blockedUntil: n >= 8 ? new Date(Date.now() + 10 * 60_000) : null,
        }).where(eq(loginAttempts.id, att.id));
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    };
    if (!user) return fail();
    if (user.isBanned) return NextResponse.json({ error: "Account banned: " + (user.banReason || "abuse") }, { status: 403 });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return fail();
    // reset attempts
    if (att) await db.update(loginAttempts).set({ attempts: 0, blockedUntil: null }).where(eq(loginAttempts.id, att.id));
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await ensureUserAux(user.id);
    const { token, expiresAt } = await createSession(user.id, req.headers.get("x-forwarded-for") || "", req.headers.get("user-agent") || "");
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, coins: user.coins, role: user.role } });
  }

  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
