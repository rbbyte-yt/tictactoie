import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, userSettings, leaderboardStats } from "@/db/schema";

export const SESSION_COOKIE = "rt_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function validateUsername(u: string): string | null {
  if (!u || typeof u !== "string") return "Username is required";
  const s = u.trim();
  if (s.length < 3 || s.length > 20) return "Username must be 3-20 characters";
  if (!/^[a-zA-Z0-9_.-]+$/.test(s)) return "Username may contain letters, numbers, _ . -";
  const reserved = ["admin", "administrator", "root", "system", "support", "api", "profile", "shop", "null", "undefined"];
  if (reserved.includes(s.toLowerCase())) return "Username is reserved";
  return null;
}

export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 6) return "Password must be at least 6 characters";
  if (pw.length > 128) return "Password too long";
  return null;
}

export function validateDob(dob: string): { error: string | null; age: number } {
  if (!dob) return { error: "Date of birth is required", age: 0 };
  const d = new Date(dob + "T00:00:00Z");
  if (isNaN(d.getTime())) return { error: "Invalid date of birth", age: 0 };
  const now = new Date();
  if (d > now) return { error: "Date of birth cannot be in the future", age: 0 };
  if (d.getFullYear() < 1900) return { error: "Invalid date of birth", age: 0 };
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  if (age > 120) return { error: "Invalid date of birth", age: 0 };
  return { error: null, age };
}

export function calcAge(dobStr: string): number {
  const d = new Date(dobStr + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function createSession(userId: string, ip?: string, ua?: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, tokenHash, expiresAt, ip: ip ?? null, userAgent: ua ?? null });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
}

export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  dob: string;
  coins: number;
  role: string;
  isBanned: boolean;
  createdAt: Date;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
  const sess = rows[0];
  if (!sess) return null;
  if (sess.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sess.id));
    return null;
  }
  const urows = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
  const u = urows[0];
  if (!u || u.isBanned && false) return null;
  if (!u) return null;
  if (u.isBanned) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    dob: u.dob,
    coins: u.coins,
    role: u.role,
    isBanned: u.isBanned,
    createdAt: u.createdAt,
  };
}

export async function getAuthUserByToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
  const sess = rows[0];
  if (!sess || sess.expiresAt < new Date()) return null;
  const urows = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
  const u = urows[0];
  if (!u || u.isBanned) return null;
  return { id: u.id, username: u.username, email: u.email, dob: u.dob, coins: u.coins, role: u.role, isBanned: u.isBanned, createdAt: u.createdAt };
}

export async function destroySession() {
  const token = await getSessionToken();
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  await clearSessionCookie();
}

export async function ensureUserAux(userId: string) {
  const s = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (!s[0]) await db.insert(userSettings).values({ userId });
  const l = await db.select().from(leaderboardStats).where(eq(leaderboardStats.userId, userId)).limit(1);
  if (!l[0]) await db.insert(leaderboardStats).values({ userId });
}

export function isAdmin(user: AuthUser | null) {
  return !!user && user.role === "admin";
}

export function adminSetupKeyValid(key: string | null | undefined) {
  const expected = process.env.ADMIN_SETUP_KEY || "R-T-ADMIN-2026-SECURE";
  return !!key && key === expected;
}
