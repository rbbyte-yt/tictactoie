import { db } from "@/db";
import { users, userSettings, leaderboardStats, matches, equippedCosmetics } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { calcAge } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const rows = await db.select().from(users).where(eq(users.usernameLower, decoded.toLowerCase())).limit(1);
  const u = rows[0];
  if (!u) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="rt-card p-8 text-center">
          <div className="text-5xl">🔍</div>
          <h1 className="text-2xl font-black mt-3">Player not found</h1>
          <p className="text-slate-400 text-sm">No one plays under “{decoded}”.</p>
          <Link href="/" className="rt-btn-primary inline-block px-6 py-2.5 mt-4 text-sm">Back to Arena</Link>
        </div>
      </main>
    );
  }
  const s = (await db.select().from(userSettings).where(eq(userSettings.userId, u.id)).limit(1))[0];
  const l = (await db.select().from(leaderboardStats).where(eq(leaderboardStats.userId, u.id)).limit(1))[0];
  const recent = await db.select().from(matches).where(or(eq(matches.playerXId, u.id), eq(matches.playerOId, u.id))).orderBy(desc(matches.createdAt)).limit(8);
  const eqRows = await db.select().from(equippedCosmetics).where(eq(equippedCosmetics.userId, u.id));
  const equipped: Record<string, string> = {};
  for (const e of eqRows) equipped[e.category] = e.itemId;
  const stats = l ?? { totalGames: 0, wins: 0, losses: 0, draws: 0, winStreakCurrent: 0, winStreakBest: 0, score: 0, rankedGames: 0, rankedWins: 0, botGames: 0, botWins: 0 };
  const winRate = stats.totalGames ? Math.round((stats.wins / stats.totalGames) * 1000) / 10 : 0;
  const hasRelic = eqRows.some((e) => e.itemId === "relic-eternal-god");

  return (
    <main className="min-h-screen">
      <header className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid place-items-center w-9 h-9 rounded-xl font-black text-sm" style={{ background: "linear-gradient(135deg,#00e5ff,#8b5cf6,#ff2d55)", color: "#04081a" }}>RT</span>
          <span className="font-black neon-text">R-T TicTacToe</span>
        </Link>
        <div className="flex-1" />
        <Link href="/" className="rt-btn-ghost px-4 py-2 text-sm font-bold">Play</Link>
      </header>
      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-4">
        <section className="rt-card p-6 relative overflow-hidden" style={hasRelic ? { borderColor: "#ec4899", boxShadow: "0 0 40px #ec489955" } : {}}>
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="text-7xl">🦊</div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-black">@{u.username} {u.role === "admin" && <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 border border-red-400/50 text-red-300 align-middle">ADMIN</span>}</h1>
              {hasRelic && <div className="mt-1 text-pink-300 font-bold text-sm">🗿 R-T Eternal God Chest Relic Bearer</div>}
              <div className="text-sm text-slate-400 mt-1">
                {(s?.showAge !== false) && <>🎂 Age {calcAge(u.dob)} • </>}📅 Joined {new Date(u.createdAt).toLocaleDateString()} • Profile: /profile/{u.username}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/40 text-amber-300 text-sm font-bold">🏆 {stats.score} pts</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">🎮 {stats.totalGames} games</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">📈 {winRate}% wins</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[["✅ Wins", stats.wins], ["❌ Losses", stats.losses], ["🤝 Draws", stats.draws], ["🔥 Best Streak", stats.winStreakBest], ["⚔️ Ranked", `${stats.rankedWins}/${stats.rankedGames}`], ["🤖 Bot Wins", `${stats.botWins}/${stats.botGames}`], ["🔥 Current Streak", stats.winStreakCurrent], ["🎮 Total", stats.totalGames]].map(([l, v]) => (
            <div key={l as string} className="rt-card p-4 text-center">
              <div className="text-[11px] uppercase text-slate-400 font-bold">{l}</div>
              <div className="text-xl font-black neon-text">{v}</div>
            </div>
          ))}
        </section>

        {Object.keys(equipped).length > 0 && (
          <section className="rt-card p-4">
            <div className="font-bold mb-2">✨ Equipped Cosmetics</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(equipped).map(([cat, id]) => (
                <span key={cat} className="text-xs px-2 py-1 rounded-full bg-violet-500/15 border border-violet-400/40">{cat}: {id}</span>
              ))}
            </div>
          </section>
        )}

        <section className="rt-card p-4">
          <div className="font-bold mb-2">🕹️ Recent Matches</div>
          <div className="space-y-2">
            {recent.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white/5">
                <span>{m.mode === "bot" ? "🤖" : m.mode === "random" ? "⚔️" : "👥"}</span>
                <span className="flex-1 truncate">{m.playerXName} vs {m.playerOName}</span>
                <span className="font-bold">{m.winner === "draw" ? "🤝 Draw" : m.winner ? `${m.winner} won` : "⏳ Live"}</span>
              </div>
            ))}
            {!recent.length && <div className="text-sm text-slate-400">No matches yet.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
