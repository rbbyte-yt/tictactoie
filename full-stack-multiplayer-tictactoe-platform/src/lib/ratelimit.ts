const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfterMs: 0 };
}

export function clientKey(req: Request, suffix: string): string {
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  return `${ip}:${suffix}`;
}
