export async function api(path: string, opts?: RequestInit & { json?: unknown }) {
  const { json, ...rest } = opts ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(rest.headers || {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

export function avatarEmoji(username: string): string {
  const emojis = ["🦊", "🐉", "⚔️", "🤖", "👾", "🐺", "🦁", "🐯", "🦅", "🐙", "🔥", "⚡", "💎", "🌟", "🎮"];
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return emojis[h % emojis.length];
}

export function timeAgo(d: string | Date): string {
  const t = new Date(d).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
