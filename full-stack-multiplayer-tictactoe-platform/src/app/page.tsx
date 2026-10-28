"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, avatarEmoji, timeAgo } from "@/lib/client";
import { GameBoard, Logo, CoinBadge, RarityBadge, Toast, skinSymbols, type BoardCell } from "@/components/game";
import { sfx, setSoundEnabled } from "@/lib/sound";

type User = { id: string; username: string; coins: number; role: string; email?: string | null };
type View = "dashboard" | "bot" | "friend" | "random" | "shop" | "chests" | "redeem" | "leaderboard" | "wallet" | "history" | "settings" | "admin";
type Match = { id: string; mode: string; status: string; board: BoardCell[]; currentTurn: string; winner: string | null; winLine: number[] | null; playerXId: string | null; playerOId: string | null; playerXName: string; playerOName: string; botDifficulty?: string | null; isRanked: boolean; moveCount: number; createdAt: string };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [balance, setBalance] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" | "info" } | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [bgSkin, setBgSkin] = useState<string | null>(null);

  const showToast = useCallback((msg: string, kind: "ok" | "err" | "info" = "info") => setToast({ msg, kind }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshMe = useCallback(async () => {
    try {
      const d = await api("/api/auth?action=me");
      if (d.user) {
        setUser(d.user);
        const b = await api("/api/coins?action=balance").catch(() => null);
        if (b) setBalance(b.balance);
        const p = await api(`/api/profile?username=${encodeURIComponent(d.user.username)}`).catch(() => null);
        if (p?.profile) {
          setEquipped(p.profile.equipped || {});
          setTheme(p.profile.theme === "light" ? "light" : "dark");
          const bg = p.profile.equipped?.backgrounds;
          if (bg) setBgSkin(bg);
          try { setSoundEnabled(p.profile.soundEnabled !== false); } catch {}
        }
      } else setUser(null);
    } catch { setUser(null); }
    setLoading(false);
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);
  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
  }, [theme]);

  // deep links: /?room=CODE or /?match=ID
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("room")) setView("friend");
    if (q.get("match")) setView("random");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce">🎮</div>
          <div className="mt-4 font-black text-2xl neon-text">R-T TicTacToe</div>
          <div className="text-slate-400 text-sm mt-1">Loading arena...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Landing onAuth={(m) => setAuthMode(m)} authMode={authMode} setAuthMode={setAuthMode} onDone={refreshMe} showToast={showToast} />
    );
  }

  const nav: { id: View; label: string; icon: string; admin?: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "bot", label: "Vs Bot", icon: "🤖" },
    { id: "friend", label: "Friend", icon: "👥" },
    { id: "random", label: "Ranked", icon: "⚔️" },
    { id: "shop", label: "Shop", icon: "🛍️" },
    { id: "chests", label: "Chests", icon: "🎁" },
    { id: "redeem", label: "Redeem", icon: "🎟️" },
    { id: "leaderboard", label: "Ranks", icon: "🏆" },
    { id: "wallet", label: "Wallet", icon: "🪙" },
    { id: "history", label: "History", icon: "📜" },
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "admin", label: "Admin", icon: "🛡️", admin: true },
  ];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-violet-500/20" style={{ background: "rgba(6,8,24,.85)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-4">
          <Logo size={34} />
          <div className="flex-1" />
          <CoinBadge balance={balance} />
          <button onClick={() => (window.location.href = `/profile/${encodeURIComponent(user.username)}`)} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full rt-btn-ghost text-sm font-bold">
            <span className="text-lg">{avatarEmoji(user.username)}</span>
            <span className="hidden sm:inline max-w-[100px] truncate">{user.username}</span>
          </button>
          <button
            onClick={async () => { await api("/api/auth?action=logout", { method: "POST", json: {} }); window.location.reload(); }}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-4 px-3 sm:px-6 py-4 pb-24 md:pb-8">
        {/* Sidebar */}
        <aside className="sidebar-desktop hidden md:flex flex-col gap-1 w-52 shrink-0 rt-card p-3 h-fit sticky top-20">
          {nav.filter((n) => !n.admin || user.role === "admin").map((n) => (
            <button
              key={n.id}
              onClick={() => { sfx.click(); setView(n.id); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${view === n.id ? "bg-gradient-to-r from-cyan-500/25 to-violet-500/25 border border-violet-400/40 text-white" : "text-slate-300 hover:bg-white/5 border border-transparent"}`}
            >
              <span className="text-lg">{n.icon}</span> {n.label}
            </button>
          ))}
          <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-400/30 text-xs">
            <div className="font-bold text-amber-300">🎟️ Try code: Rabbi</div>
            <div className="text-slate-300 mt-1">+100 R Coins free in Redeem tab!</div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {view === "dashboard" && <Dashboard user={user} balance={balance} setBalance={setBalance} setView={setView} showToast={showToast} equipped={equipped} />}
          {view === "bot" && <BotPlay user={user} showToast={showToast} onBalance={setBalance} equipped={equipped} />}
          {view === "friend" && <FriendPlay user={user} showToast={showToast} onBalance={setBalance} equipped={equipped} />}
          {view === "random" && <RandomPlay user={user} showToast={showToast} onBalance={setBalance} equipped={equipped} />}
          {view === "shop" && <Shop user={user} showToast={showToast} onBalance={setBalance} equipped={equipped} setEquipped={setEquipped} />}
          {view === "chests" && <Chests user={user} showToast={showToast} onBalance={setBalance} />}
          {view === "redeem" && <Redeem user={user} showToast={showToast} onBalance={setBalance} />}
          {view === "leaderboard" && <Leaderboard user={user} />}
          {view === "wallet" && <Wallet />}
          {view === "history" && <History user={user} />}
          {view === "settings" && <Settings user={user} theme={theme} setTheme={setTheme} showToast={showToast} onRefresh={refreshMe} />}
          {view === "admin" && user.role === "admin" && <Admin showToast={showToast} />}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav fixed bottom-0 inset-x-0 z-40 border-t border-violet-500/25 overflow-x-auto scroll-thin" style={{ background: "rgba(6,8,24,.95)" }}>
        <div className="flex gap-1 px-2 py-2 min-w-max mx-auto justify-center">
          {nav.filter((n) => !n.admin || user.role === "admin").map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-[10px] font-bold ${view === n.id ? "text-cyan-300 bg-cyan-500/10" : "text-slate-400"}`}>
              <span className="text-lg">{n.icon}</span>{n.label}
            </button>
          ))}
        </div>
      </nav>

      {toast && <Toast msg={toast.msg} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ================= LANDING + AUTH ================= */
function Landing({ onAuth, authMode, setAuthMode, onDone, showToast }: { onAuth: (m: "login" | "register") => void; authMode: "login" | "register" | null; setAuthMode: (m: "login" | "register" | null) => void; onDone: () => void; showToast: (m: string, k?: "ok" | "err" | "info") => void }) {
  return (
    <div className="min-h-screen">
      <header className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
        <Logo />
        <div className="flex-1" />
        <button onClick={() => onAuth("login")} className="rt-btn-ghost px-4 py-2 text-sm font-bold">Login</button>
        <button onClick={() => onAuth("register")} className="rt-btn-primary px-4 py-2 text-sm">Play Free</button>
      </header>
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full border border-violet-400/40 text-xs font-bold text-violet-300 mb-4">⚔️ ONLINE MULTIPLAYER • BOTS • RANKED • CHESTS</div>
        <h1 className="text-4xl sm:text-6xl font-black leading-tight">R-T <span className="neon-text">TicTacToe</span> Arena</h1>
        <p className="mt-4 text-slate-300 max-w-2xl mx-auto">Challenge bots, invite friends with room codes, climb ranked matchmaking, earn R Coins, open chests — including the ultra-rare <b className="text-pink-300">R-T Eternal God Chest Relic</b> (0.1% from Secret Chest).</p>
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <button onClick={() => onAuth("register")} className="rt-btn-primary px-8 py-3 text-lg">🎮 Start Playing</button>
          <button onClick={() => onAuth("login")} className="rt-btn-ghost px-8 py-3 text-lg font-bold">Login</button>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
          {[["🤖", "4 Bot Levels", "Easy → Expert minimax"], ["👥", "Friend Rooms", "Private codes + rematch"], ["⚔️", "Ranked Queue", "Fair auto-matchmaking"], ["🎁", "10 Chests", "60+ cosmetics + relic"]].map(([e, t, d]) => (
            <div key={t} className="rt-card p-4">
              <div className="text-3xl">{e}</div>
              <div className="font-bold mt-2">{t}</div>
              <div className="text-xs text-slate-400">{d}</div>
            </div>
          ))}
        </div>
      </section>
      {authMode && <AuthModal mode={authMode} setMode={setAuthMode} onDone={onDone} showToast={showToast} />}
    </div>
  );
}

function AuthModal({ mode, setMode, onDone, showToast }: { mode: "login" | "register"; setMode: (m: "login" | "register" | null) => void; onDone: () => void; showToast: (m: string, k?: "ok" | "err" | "info") => void }) {
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [avail, setAvail] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "register" || username.trim().length < 3) { setAvail(null); return; }
    const t = setTimeout(async () => {
      try {
        const d = await api(`/api/auth?action=check-username&username=${encodeURIComponent(username.trim())}`);
        setAvail(d.available ? "✅ Available" : "❌ Taken");
      } catch { setAvail(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [username, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await api("/api/auth?action=login", { method: "POST", json: { identifier, password } });
        showToast("Welcome back! 🎮", "ok"); sfx.win();
      } else {
        await api("/api/auth?action=register", { method: "POST", json: { username: username.trim(), password, dob, email: email || null, adminKey: adminKey || null } });
        showToast("Account created! +500 R Coins 🪙", "ok"); sfx.coin();
      }
      setMode(null); onDone();
    } catch (err: unknown) { showToast((err as Error).message, "err"); sfx.error(); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(0,0,0,.7)" }} onClick={() => setMode(null)}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="rt-card p-6 w-full max-w-md">
        <div className="flex items-center gap-2 mb-1"><Logo size={30} /></div>
        <h2 className="text-xl font-black">{mode === "login" ? "Welcome back" : "Create account"}</h2>
        <p className="text-xs text-slate-400 mb-4">{mode === "login" ? "Login to enter the arena" : "Get 500 R Coins free • unique profile URL"}</p>
        {mode === "login" ? (
          <>
            <label className="text-xs font-bold text-slate-300">Username or Email</label>
            <input className="rt-input w-full px-3 py-2.5 mt-1 mb-3" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </>
        ) : (
          <>
            <label className="text-xs font-bold text-slate-300">Username {avail && <span className="ml-1">{avail}</span>}</label>
            <input className="rt-input w-full px-3 py-2.5 mt-1 mb-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. rabbi" required minLength={3} maxLength={20} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-300">Date of Birth</label>
                <input type="date" className="rt-input w-full px-3 py-2.5 mt-1 mb-3" value={dob} onChange={(e) => setDob(e.target.value)} required max={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Email (optional)</label>
                <input type="email" className="rt-input w-full px-3 py-2.5 mt-1 mb-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.com" />
              </div>
            </div>
          </>
        )}
        <label className="text-xs font-bold text-slate-300">Password</label>
        <input type="password" className="rt-input w-full px-3 py-2.5 mt-1 mb-3" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
        {mode === "register" && (
          <details className="mb-3 text-xs text-slate-400">
            <summary className="cursor-pointer">Have an admin setup key?</summary>
            <input className="rt-input w-full px-3 py-2 mt-2" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Admin setup key (optional)" />
          </details>
        )}
        <button disabled={busy} className="rt-btn-primary w-full py-2.5">{busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}</button>
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="w-full text-center text-sm text-cyan-300 mt-3 hover:underline">
          {mode === "login" ? "New here? Create account" : "Have an account? Login"}
        </button>
      </form>
    </div>
  );
}

/* ================= DASHBOARD ================= */
function Dashboard({ user, balance, setBalance, setView, showToast, equipped }: { user: User; balance: number | null; setBalance: (n: number) => void; setView: (v: "dashboard" | "bot" | "friend" | "random" | "shop" | "chests" | "redeem" | "leaderboard" | "wallet" | "history" | "settings" | "admin") => void; showToast: (m: string, k?: "ok" | "err" | "info") => void; equipped: Record<string, string> }) {
  const [profile, setProfile] = useState<{ stats?: { totalGames: number; wins: number; losses: number; draws: number; winStreakCurrent: number; winStreakBest: number; score: number; winRate: number }; recentMatches?: { id: string; mode: string; winner: string | null; mySymbol: string | null; playerXName: string; playerOName: string; createdAt: string }[] } | null>(null);
  const [canDaily, setCanDaily] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  useEffect(() => {
    api(`/api/profile?username=${encodeURIComponent(user.username)}`).then((d) => setProfile(d.profile)).catch(() => {});
    api("/api/coins?action=balance").then((d) => { setBalance(d.balance); setCanDaily(d.canClaimDaily); }).catch(() => {});
    api("/api/leaderboard?scope=all-time&limit=1").then((d) => setRank(d.myRank)).catch(() => {});
  }, [user.username]);
  const claimDaily = async () => {
    try {
      const d = await api("/api/coins?action=daily", { method: "POST", json: {} });
      setBalance(d.balance); setCanDaily(false);
      showToast(`Daily reward +${d.amount} 🪙 (streak ${d.streak})`, "ok"); sfx.coin();
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  const s = profile?.stats;
  return (
    <div className="space-y-4">
      <div className="rt-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "linear-gradient(135deg,#00e5ff33,#8b5cf633,#ff2d5533)" }} />
        <div className="flex items-center gap-4 relative">
          <div className="text-5xl">{avatarEmoji(user.username)}</div>
          <div className="flex-1">
            <div className="text-xl sm:text-2xl font-black">Hey, <span className="neon-text">{user.username}</span> 👋</div>
            <div className="text-sm text-slate-400">Rank #{rank ?? "—"} • Score {s?.score ?? 0} • {balance?.toLocaleString() ?? 0} R Coins</div>
          </div>
          <button onClick={claimDaily} disabled={!canDaily} className="rt-btn-primary px-4 py-2 text-sm">{canDaily ? "🎁 Claim Daily" : "✅ Claimed"}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["🎮 Matches", s?.totalGames ?? 0], ["🏆 Wins", s?.wins ?? 0],
          ["🔥 Best Streak", s?.winStreakBest ?? 0], ["📈 Win Rate", `${s?.winRate ?? 0}%`],
        ].map(([l, v]) => (
          <div key={l as string} className="rt-card p-4 text-center">
            <div className="text-xs text-slate-400 font-bold uppercase">{l}</div>
            <div className="text-2xl font-black neon-text">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["bot", "🤖", "Play Bot", "4 difficulties"],
          ["friend", "👥", "Friend Match", "Room codes"],
          ["random", "⚔️", "Ranked Queue", "Win +100 pts"],
          ["chests", "🎁", "Open Chests", "Win the Relic"],
        ].map(([v, icon, t, d]) => (
          <button key={v} onClick={() => setView(v as "bot")} className="rt-card p-4 text-left hover:border-cyan-400/60 transition-all hover:-translate-y-0.5">
            <div className="text-3xl">{icon}</div>
            <div className="font-bold mt-1">{t}</div>
            <div className="text-xs text-slate-400">{d}</div>
          </button>
        ))}
      </div>
      <div className="rt-card p-4">
        <div className="font-bold mb-2">🕹️ Recent Matches</div>
        {!profile?.recentMatches?.length && <div className="text-sm text-slate-400">No matches yet — go play your first game!</div>}
        <div className="space-y-2">
          {profile?.recentMatches?.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white/5">
              <span>{m.mode === "bot" ? "🤖" : m.mode === "random" ? "⚔️" : "👥"}</span>
              <span className="flex-1 truncate">{m.playerXName} vs {m.playerOName}</span>
              <span className="font-bold">{m.winner === "draw" ? "🤝 Draw" : m.winner === m.mySymbol ? "✅ Won" : m.winner ? "❌ Lost" : "⏳ Live"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ SHARED MATCH HOOK ============ */
function useMatchPoll(matchId: string | null, active: boolean) {
  const [match, setMatch] = useState<Match | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      const d = await api(`/api/game?action=match&id=${matchId}`);
      setMatch(d.match);
      return d.match as Match;
    } catch { return null; }
  }, [matchId]);
  useEffect(() => {
    if (!matchId || !active) return;
    fetchMatch();
    timer.current = setInterval(async () => {
      const m = await fetchMatch();
      if (m && m.status !== "active" && timer.current) { /* keep one last fetch */ }
    }, 1200);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [matchId, active, fetchMatch]);
  return { match, setMatch, fetchMatch };
}

function MatchView({ user, match, setMatch, showToast, onBalance, equipped, onRematch }: {
  user: User; match: Match; setMatch: (m: Match) => void; showToast: (m: string, k?: "ok" | "err" | "info") => void;
  onBalance: (n: number) => void; equipped: Record<string, string>; onRematch?: () => void;
}) {
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [legal, setLegal] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const mySymbol: "X" | "O" | null = match.playerXId === user.id ? "X" : match.playerOId === user.id ? "O" : null;
  const myTurn = match.status === "active" && match.currentTurn === mySymbol;

  useEffect(() => { setHintCell(null); setLegal(null); }, [match.id, match.moveCount]);

  const move = async (pos: number) => {
    if (!mySymbol || match.status !== "active" || match.currentTurn !== mySymbol || busy) return;
    setBusy(true);
    try {
      const d = await api("/api/game?action=move", { method: "POST", json: { matchId: match.id, position: pos, idem: `${Date.now()}-${pos}` } });
      setMatch(d.match);
      sfx.move();
      if (d.match.status === "finished") {
        if (d.match.winner === "draw") { showToast("Draw! 🤝", "info"); }
        else if (d.match.winner === mySymbol) { showToast("You won! 🏆 +R Coins", "ok"); sfx.win(); }
        else { showToast("You lost 😞", "info"); sfx.lose(); }
        api("/api/coins?action=balance").then((b) => onBalance(b.balance)).catch(() => {});
      }
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
    setBusy(false);
  };

  const useAbility = async (type: "hint" | "assist" | "shield") => {
    try {
      const d = await api("/api/game?action=use-ability", { method: "POST", json: { matchId: match.id, type, idem: `${Date.now()}` } });
      if (type === "shield") { showToast(d.message, "ok"); sfx.coin(); }
      else {
        setHintCell(d.suggestion);
        if (d.legalMoves) setLegal(d.legalMoves);
        showToast(`${type === "hint" ? "💡 Hint" : "🧭 Assist"}: cell ${d.suggestion + 1} (-${d.cost} 🪙)`, "ok");
      }
      if (d.balance !== undefined) onBalance(d.balance);
    } catch (e: unknown) { showToast((e as Error).message, e instanceof Error && e.message.includes("Blocked") ? "info" : "err"); }
  };

  const status = match.status !== "active"
    ? match.winner === "draw" ? "🤝 Draw" : match.winner === mySymbol ? "🏆 You won!" : match.mode === "bot" ? "🤖 Bot won" : `🏆 ${match.winner} won`
    : myTurn ? "✅ Your turn" : "⏳ Opponent's turn";

  return (
    <div className="space-y-3">
      <div className="rt-card p-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <span className={match.playerXId === user.id ? "text-cyan-300" : ""}>✕ {match.playerXName}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-white/10">VS {match.isRanked ? "• RANKED" : ""}</span>
          <span className={match.playerOId === user.id ? "text-pink-300" : ""}>○ {match.playerOName}</span>
        </div>
        <div className="text-center mt-2 font-black text-lg">{status}</div>
        <div className="text-center text-xs text-slate-400">You are {mySymbol ?? "?"} • Turn: {match.currentTurn}</div>
      </div>
      <GameBoard
        board={match.board} winLine={match.winLine} hintCell={hintCell} legalCells={legal}
        mySymbol={mySymbol} currentTurn={match.currentTurn} status={match.status}
        skinId={equipped.symbols} boardSkin={equipped.boards} onMove={move} disabled={busy || !myTurn}
      />
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => useAbility("hint")} disabled={match.status !== "active"} className="rt-btn-ghost py-2 text-xs font-bold">💡 Hint<br /><span className="text-amber-300">20 🪙</span></button>
        <button onClick={() => useAbility("assist")} disabled={match.status !== "active"} className="rt-btn-ghost py-2 text-xs font-bold">🧭 Assist<br /><span className="text-amber-300">30 🪙</span></button>
        <button onClick={() => useAbility("shield")} disabled={match.status !== "active"} className="rt-btn-ghost py-2 text-xs font-bold">🛡️ Shield<br /><span className="text-amber-300">1000 🪙</span></button>
      </div>
      <p className="text-[11px] text-slate-400 text-center">Abilities are disclosed & server-validated. Shield blocks opponent hints for 6 turns. Works in ranked.</p>
      {match.status === "finished" && onRematch && (
        <button onClick={onRematch} className="rt-btn-primary w-full py-2.5">🔁 Rematch (swap sides)</button>
      )}
    </div>
  );
}

/* ================= BOT ================= */
function BotPlay({ user, showToast, onBalance, equipped }: { user: User; showToast: (m: string, k?: "ok" | "err" | "info") => void; onBalance: (n: number) => void; equipped: Record<string, string> }) {
  const [difficulty, setDifficulty] = useState("medium");
  const [symbol, setSymbol] = useState<"X" | "O">("X");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const { match, setMatch } = useMatchPoll(matchId, false);

  const start = async () => {
    setStarting(true);
    try {
      const d = await api("/api/game?action=bot-create", { method: "POST", json: { difficulty, symbol } });
      setMatchId(d.match.id); setMatch(d.match); sfx.click();
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
    setStarting(false);
  };
  const rematch = async () => {
    if (!match) return;
    try {
      const d = await api("/api/game?action=rematch", { method: "POST", json: { matchId: match.id } });
      setMatchId(d.match.id); setMatch(d.match);
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="rt-card p-4">
        <div className="font-black text-lg">🤖 Play vs Bot</div>
        <div className="text-xs text-slate-400">Bot games pay +10 🪙/win and don't affect ranked leaderboard.</div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {(["easy", "medium", "hard", "expert"] as const).map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} className={`py-2 rounded-lg text-xs font-bold border ${difficulty === d ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-300"}`}>
              {d === "easy" ? "😊 Easy" : d === "medium" ? "🧠 Medium" : d === "hard" ? "🔥 Hard" : "👹 Expert"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          {(["X", "O"] as const).map((s) => (
            <button key={s} onClick={() => setSymbol(s)} className={`flex-1 py-2 rounded-lg font-black border ${symbol === s ? "border-pink-400 bg-pink-500/15" : "border-white/10"}`}>Play as {s}</button>
          ))}
        </div>
        <button onClick={start} disabled={starting} className="rt-btn-primary w-full py-2.5 mt-3">{starting ? "Starting..." : match ? "🔄 New Game" : "▶️ Start Game"}</button>
      </div>
      {match && <MatchView user={user} match={match} setMatch={setMatch} showToast={showToast} onBalance={onBalance} equipped={equipped} onRematch={rematch} />}
    </div>
  );
}

/* ================= FRIEND ================= */
function FriendPlay({ user, showToast, onBalance, equipped }: { user: User; showToast: (m: string, k?: "ok" | "err" | "info") => void; onBalance: (n: number) => void; equipped: Record<string, string> }) {
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<{ code: string; hostName?: string; guestName?: string | null; status: string; matchId?: string | null; hostId?: string | null; guestId?: string | null } | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const { match, setMatch } = useMatchPoll(matchId, true);
  const pollRoom = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("room");
    if (q && !room) { setCode(q.toUpperCase()); joinWith(q.toUpperCase()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchRoom = (c: string) => {
    if (pollRoom.current) clearInterval(pollRoom.current);
    pollRoom.current = setInterval(async () => {
      try {
        const d = await api(`/api/game?action=room&code=${c}`);
        setRoom(d.room);
        if (d.match) { setMatchId(d.match.id); setMatch(d.match); }
        else if (d.room.matchId) setMatchId(d.room.matchId);
      } catch {}
    }, 1500);
  };
  useEffect(() => () => { if (pollRoom.current) clearInterval(pollRoom.current); }, []);

  const create = async () => {
    try {
      const d = await api("/api/game?action=create-room", { method: "POST", json: { symbol: "X" } });
      setRoom(d.room); watchRoom(d.room.code);
      showToast(`Room ${d.room.code} created! Share the code.`, "ok"); sfx.coin();
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  const joinWith = async (c: string) => {
    try {
      const d = await api("/api/game?action=join-room", { method: "POST", json: { code: c } });
      setRoom(d.room); watchRoom(d.room.code);
      if (d.matchId) setMatchId(d.matchId);
      showToast("Joined room! 🎉", "ok"); sfx.win();
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  const leave = async () => {
    if (!room) return;
    try { await api("/api/game?action=leave-room", { method: "POST", json: { code: room.code } }); } catch {}
    setRoom(null); setMatchId(null); setMatch(null as unknown as Match);
    if (pollRoom.current) clearInterval(pollRoom.current);
  };
  const rematch = async () => {
    if (!match) return;
    try {
      const d = await api("/api/game?action=rematch", { method: "POST", json: { matchId: match.id } });
      setMatchId(d.match.id); setMatch(d.match);
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="rt-card p-4">
        <div className="font-black text-lg">👥 Friend Match</div>
        <div className="text-xs text-slate-400">Create a private room, share the code or link, play live. Winner +25 🪙.</div>
        {!room ? (
          <div className="space-y-2 mt-3">
            <button onClick={create} className="rt-btn-primary w-full py-2.5">➕ Create Room</button>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" className="rt-input flex-1 px-3 py-2.5 text-center font-black tracking-widest uppercase" maxLength={6} />
              <button onClick={() => joinWith(code)} className="rt-btn-ghost px-5 font-bold">Join</button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
              <span className="font-black tracking-widest text-cyan-300 text-lg">{room.code}</span>
              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/?room=${room.code}`); showToast("Invite link copied!", "ok"); }} className="text-xs rt-btn-ghost px-3 py-1.5 font-bold">📋 Copy Invite Link</button>
            </div>
            <div className="text-sm flex items-center gap-2">
              <span>🟢 {room.hostName || "Host"}</span>
              <span className="text-slate-500">vs</span>
              <span>{room.guestName ? `🟢 ${room.guestName}` : "⏳ Waiting for friend..."}</span>
            </div>
            <button onClick={leave} className="text-xs text-red-300 hover:underline">Leave room</button>
          </div>
        )}
      </div>
      {room && !match && <div className="rt-card p-6 text-center text-slate-300">⏳ {room.guestName ? "Starting match..." : "Share the code with your friend to begin."}</div>}
      {match && <MatchView user={user} match={match} setMatch={setMatch} showToast={showToast} onBalance={onBalance} equipped={equipped} onRematch={rematch} />}
    </div>
  );
}

/* ================= RANDOM / RANKED ================= */
function RandomPlay({ user, showToast, onBalance, equipped }: { user: User; showToast: (m: string, k?: "ok" | "err" | "info") => void; onBalance: (n: number) => void; equipped: Record<string, string> }) {
  const [state, setState] = useState<"idle" | "searching" | "matched">("idle");
  const [matchId, setMatchId] = useState<string | null>(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("match"));
  const { match, setMatch } = useMatchPoll(matchId, true);
  useEffect(() => { if (matchId) setState("matched"); }, [matchId]);

  useEffect(() => {
    if (state !== "searching") return;
    const t = setInterval(async () => {
      try {
        const d = await api("/api/matchmaking");
        if (d.status === "matched") { setState("matched"); setMatchId(d.matchId); setMatch(d.match); showToast("Opponent found! ⚔️", "ok"); sfx.win(); }
        else if (d.status === "timeout") { setState("idle"); showToast("No opponents found. Try again.", "info"); }
      } catch {}
    }, 1500);
    return () => clearInterval(t);
  }, [state, setMatch, showToast]);

  const join = async () => {
    try {
      const d = await api("/api/matchmaking?action=join", { method: "POST", json: {} });
      if (d.status === "matched") { setState("matched"); setMatchId(d.matchId); setMatch(d.match); showToast("Opponent found! ⚔️", "ok"); }
      else { setState("searching"); showToast("Searching for opponent...", "info"); }
    } catch (e: unknown) {
      const msg = (e as Error).message;
      showToast(msg, "err");
      const m = msg.match(/match/);
      if (m) { try { const s = await api("/api/matchmaking"); if (s.matchId) { setMatchId(s.matchId); setState("matched"); } } catch {} }
    }
  };
  const cancel = async () => { await api("/api/matchmaking?action=cancel", { method: "POST", json: {} }); setState("idle"); };
  const rematch = async () => {
    if (!match) return;
    try {
      const d = await api("/api/game?action=rematch", { method: "POST", json: { matchId: match.id } });
      setMatchId(d.match.id); setMatch(d.match);
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  const newSearch = () => { setMatchId(null); setState("idle"); };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="rt-card p-4 text-center">
        <div className="font-black text-lg">⚔️ Ranked Matchmaking</div>
        <div className="text-xs text-slate-400">Win +100 pts & +50 🪙 • Draw +25 pts • Fair queue, no fake opponents</div>
        {state === "idle" && !match && <button onClick={join} className="rt-btn-primary w-full py-3 mt-3 text-lg">🔍 Find Opponent</button>}
        {state === "searching" && (
          <div className="mt-3">
            <div className="text-4xl animate-bounce">🔍</div>
            <div className="font-bold mt-1">Searching...</div>
            <button onClick={cancel} className="rt-btn-ghost px-6 py-2 mt-2 text-sm font-bold">Cancel</button>
          </div>
        )}
        {state === "matched" && !match && <div className="mt-3 text-sm">Matched! Loading arena...</div>}
      </div>
      {match && (
        <>
          <MatchView user={user} match={match} setMatch={setMatch} showToast={showToast} onBalance={onBalance} equipped={equipped} onRematch={rematch} />
          {match.status === "finished" && <button onClick={newSearch} className="rt-btn-ghost w-full py-2.5 font-bold">🔍 Find New Opponent</button>}
        </>
      )}
    </div>
  );
}

/* ================= SHOP ================= */
function Shop({ user, showToast, onBalance, equipped, setEquipped }: { user: User; showToast: (m: string, k?: "ok" | "err" | "info") => void; onBalance: (n: number) => void; equipped: Record<string, string>; setEquipped: (e: Record<string, string>) => void }) {
  const [items, setItems] = useState<{ id: string; name: string; description: string; category: string; rarity: string; price: number; preview: Record<string, string> }[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [cat, setCat] = useState("all");
  const [rar, setRar] = useState("all");
  const [q, setQ] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [sort, setSort] = useState("price-asc");
  useEffect(() => {
    api("/api/shop?action=items").then((d) => { setItems(d.items); setOwned(d.owned); setEquipped(d.equipped || {}); }).catch(() => {});
  }, [setEquipped]);
  const buy = async (id: string) => {
    if (!confirm("Purchase this item with R Coins?")) return;
    try {
      const d = await api("/api/shop?action=purchase", { method: "POST", json: { itemId: id } });
      if (d.balance !== undefined) onBalance(d.balance);
      setOwned((o) => [...o, id]);
      showToast("Purchased! 🎉", "ok"); sfx.coin();
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  const equip = async (category: string, itemId: string | null) => {
    try {
      await api("/api/shop?action=equip", { method: "POST", json: { category, itemId } });
      setEquipped({ ...equipped, ...(itemId ? { [category]: itemId } : Object.fromEntries(Object.entries(equipped).filter(([k]) => k !== category)) as Record<string, string>) });
      showToast(itemId ? "Equipped! ✨" : "Unequipped", "ok"); sfx.click();
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  const cats = ["all", ...Array.from(new Set(items.map((i) => i.category)))];
  const rars = ["all", "common", "uncommon", "rare", "ultra_rare", "epic", "legendary", "mythic", "ancient", "divine", "secret"];
  let list = items.filter((i) => (cat === "all" || i.category === cat) && (rar === "all" || i.rarity === rar) && (!q || i.name.toLowerCase().includes(q.toLowerCase())) && (!ownedOnly || owned.includes(i.id)));
  list = [...list].sort((a, b) => sort === "price-asc" ? a.price - b.price : sort === "price-desc" ? b.price - a.price : a.name.localeCompare(b.name));
  return (
    <div className="space-y-3">
      <div className="rt-card p-4">
        <div className="font-black text-lg">🛍️ Cosmetic Shop <span className="text-xs text-slate-400">({items.length} items • server-validated prices)</span></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search..." className="rt-input px-3 py-2 text-sm col-span-2" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="rt-input px-2 py-2 text-sm">{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={rar} onChange={(e) => setRar(e.target.value)} className="rt-input px-2 py-2 text-sm">{rars.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rt-input px-2 py-2 text-sm">
            <option value="price-asc">Price ↑</option><option value="price-desc">Price ↓</option><option value="name">Name</option>
          </select>
        </div>
        <label className="text-xs flex items-center gap-2 mt-2"><input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} /> Owned only</label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((it) => {
          const isOwned = owned.includes(it.id);
          const isEquipped = equipped[it.category] === it.id;
          return (
            <div key={it.id} className="rt-card p-4 flex flex-col" style={it.id === "relic-eternal-god" ? { borderColor: "#ec4899", boxShadow: "0 0 24px #ec489966" } : {}}>
              <div className="flex items-center gap-3">
                <div className="text-4xl w-14 h-14 grid place-items-center rounded-xl" style={{ background: it.preview.gradient || "rgba(139,92,246,.15)" }}>
                  {it.preview.emoji || it.preview.x || "🎁"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{it.name}</div>
                  <div className="flex gap-1 mt-1"><RarityBadge rarity={it.rarity} /></div>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2 flex-1">{it.description}</div>
              <div className="text-[10px] uppercase text-slate-500 mt-1">{it.category}</div>
              {it.id === "relic-eternal-god" && <div className="text-[11px] text-pink-300 mt-1">⚠️ Direct price 1,000,000,000 🪙 — or 0.1% from Secret Chest (25,000 🪙/open)</div>}
              <div className="flex items-center gap-2 mt-2">
                <span className="font-black text-amber-300 text-sm flex-1">🪙 {it.price.toLocaleString()}</span>
                {!isOwned ? (
                  <button onClick={() => buy(it.id)} className="rt-btn-primary px-4 py-1.5 text-xs">Buy</button>
                ) : isEquipped ? (
                  <button onClick={() => equip(it.category, null)} className="rt-btn-ghost px-3 py-1.5 text-xs font-bold text-green-300">✓ Equipped</button>
                ) : (
                  <button onClick={() => equip(it.category, it.id)} className="rt-btn-ghost px-4 py-1.5 text-xs font-bold">Equip</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= CHESTS ================= */
function Chests({ user, showToast, onBalance }: { user: User; showToast: (m: string, k?: "ok" | "err" | "info") => void; onBalance: (n: number) => void }) {
  const [chests, setChests] = useState<{ id: string; name: string; description: string; price: number; icon: string; gradient: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pool, setPool] = useState<{ item_id: string; probability: string; name: string; rarity: string; preview: Record<string, string> }[]>([]);
  const [total, setTotal] = useState(0);
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<{ reward: { name: string; rarity: string; preview: Record<string, string> }; isDuplicate: boolean; compensation: number; relic: boolean } | null>(null);
  const [history, setHistory] = useState<{ chest_name: string; reward_name: string; rarity: string; cost: number; is_duplicate: boolean; created_at: string }[]>([]);
  useEffect(() => {
    api("/api/chests?action=list").then((d) => setChests(d.chests)).catch(() => {});
    api("/api/chests?action=history").then((d) => setHistory(d.history)).catch(() => {});
  }, []);
  const viewChest = async (id: string) => {
    setSelected(id); setResult(null);
    const d = await api(`/api/chests?action=detail&id=${id}`).catch(() => null);
    if (d) { setPool(d.pool); setTotal(d.totalProbability); }
  };
  const open = async () => {
    if (!selected) return;
    setOpening(true); setResult(null);
    sfx.click();
    await new Promise((r) => setTimeout(r, 1800));
    try {
      const d = await api("/api/chests?action=open", { method: "POST", json: { chestId: selected, idem: `${Date.now()}-${Math.random()}` } });
      setResult(d); onBalance(d.balance);
      if (d.relic) { showToast("🗿 ETERNAL GOD RELIC!!! Mythic pull!", "ok"); sfx.win(); }
      else if (d.isDuplicate) { showToast(`Duplicate → +${d.compensation} 🪙`, "info"); sfx.coin(); }
      else { showToast(`You won: ${d.reward.name}!`, "ok"); sfx.win(); }
      api("/api/chests?action=history").then((h) => setHistory(h.history)).catch(() => {});
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
    setOpening(false);
  };
  return (
    <div className="space-y-4">
      <div className="rt-card p-4">
        <div className="font-black text-lg">🎁 Chest Arena</div>
        <div className="text-xs text-slate-400">Server-side provably-fair rolls (crypto RNG). Duplicates auto-convert to R Coins. Probabilities always sum to 100%.</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
          {chests.map((c) => (
            <button key={c.id} onClick={() => viewChest(c.id)} className={`p-3 rounded-xl border text-center bg-gradient-to-br ${c.gradient} ${selected === c.id ? "ring-2 ring-white scale-105" : "opacity-90 hover:opacity-100"}`}>
              <div className="text-3xl">{c.icon}</div>
              <div className="text-xs font-black text-white">{c.name}</div>
              <div className="text-[11px] font-bold text-amber-200">🪙 {c.price.toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <div className="rt-card p-4">
          <div className="font-bold">📊 Reward Pool — Total: {total}% {Math.abs(total - 100) < 0.01 ? "✅" : "⚠️"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto scroll-thin">
            {pool.map((p) => (
              <div key={p.item_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 text-xs">
                <span className="text-xl">{p.preview.emoji || "🎁"}</span>
                <span className="flex-1 truncate font-semibold">{p.name}</span>
                <RarityBadge rarity={p.rarity} />
                <span className="font-black text-cyan-300">{Number(p.probability).toFixed(p.probability.includes(".") ? 1 : 0)}%</span>
              </div>
            ))}
          </div>
          <button onClick={open} disabled={opening} className="rt-btn-primary w-full py-3 mt-3 text-lg">
            {opening ? <span className="chest-opening inline-block text-3xl">🎁</span> : `🔓 Open for 🪙 ${chests.find((c) => c.id === selected)?.price.toLocaleString()}`}
          </button>
          {opening && <div className="text-center text-sm mt-2 animate-pulse">Rolling with secure RNG...</div>}
          {result && (
            <div className={`reveal mt-3 p-4 rounded-xl border text-center ${result.relic ? "border-pink-400" : "border-violet-400/40"}`} style={result.relic ? { boxShadow: "0 0 40px #ec4899aa" } : {}}>
              <div className={`text-6xl ${result.relic ? "relic-anim" : ""}`}>{result.reward.preview.emoji || "🎁"}</div>
              <div className="font-black text-lg mt-2">{result.reward.name}</div>
              <div className="mt-1"><RarityBadge rarity={result.reward.rarity} /></div>
              {result.relic && <div className="text-pink-300 font-bold text-sm mt-2">🗿 ULTRA-EXCLUSIVE MYTHIC RELIC — 0.1% pull! Equip it on your profile!</div>}
              {result.isDuplicate && <div className="text-xs text-slate-300 mt-1">Duplicate converted: +{result.compensation} 🪙</div>}
            </div>
          )}
        </div>
      )}
      <div className="rt-card p-4">
        <div className="font-bold mb-2">📜 Opening History</div>
        <div className="space-y-1 max-h-64 overflow-y-auto scroll-thin text-sm">
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 text-xs">
              <span className="flex-1 truncate">{h.chest_name} → <b>{h.reward_name}</b></span>
              <RarityBadge rarity={h.rarity} />
              {h.is_duplicate && <span className="text-amber-300">DUP</span>}
              <span className="text-slate-400">{timeAgo(h.created_at)}</span>
            </div>
          ))}
          {!history.length && <div className="text-slate-400 text-sm">No openings yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ================= REDEEM ================= */
function Redeem({ user, showToast, onBalance }: { user: User; showToast: (m: string, k?: "ok" | "err" | "info") => void; onBalance: (n: number) => void }) {
  const [code, setCode] = useState("");
  const [history, setHistory] = useState<{ code: string; reward_coins: number; redeemed_at: string }[]>([]);
  const [adminAmount, setAdminAmount] = useState("");
  const load = useCallback(() => api("/api/redeem").then((d) => setHistory(d.history)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const redeem = async () => {
    try {
      const d = await api("/api/redeem", { method: "POST", json: { code, idem: `${Date.now()}` } });
      onBalance(d.balance); showToast(`+${d.rewardCoins} 🪙 from "${d.code}"!`, "ok"); sfx.coin();
      setCode(""); load();
      api("/api/coins?action=balance").then((b) => onBalance(b.balance)).catch(() => {});
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  const adminRedeem = async () => {
    if (!confirm(`Grant yourself ${adminAmount} R Coins as admin? This is logged permanently.`)) return;
    try {
      const d = await api("/api/redeem", { method: "POST", json: { code: "AdminRabbiBoos", amount: Number(adminAmount), confirm: true, idem: `${Date.now()}` } });
      onBalance(d.balance); showToast(`Admin grant +${d.amount} 🪙 (logged)`, "ok");
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="rt-card p-5">
        <div className="font-black text-lg">🎟️ Redeem Code</div>
        <div className="text-xs text-slate-400">Codes are case-insensitive, one-per-account, enforced by DB constraints.</div>
        <div className="flex gap-2 mt-3">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code (try: Rabbi)" className="rt-input flex-1 px-3 py-2.5 font-bold" />
          <button onClick={redeem} className="rt-btn-primary px-6 font-bold">Claim</button>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-400/30 text-xs">
          <b className="text-green-300">Code “Rabbi”</b> → +100 🪙 once per account. Case-insensitive. Refresh/multi-tab safe.
        </div>
      </div>
      {user.role === "admin" && (
        <div className="rt-card p-5 border-red-400/40">
          <div className="font-black text-red-300">🛡️ Owner Grant (AdminRabbiBoos)</div>
          <div className="text-xs text-slate-400">Admin identity verified independently — code text alone grants nothing. Every grant is ledger-logged.</div>
          <div className="flex gap-2 mt-2">
            <input type="number" value={adminAmount} onChange={(e) => setAdminAmount(e.target.value)} placeholder="Amount 1-1000000" className="rt-input flex-1 px-3 py-2" min={1} max={1000000} />
            <button onClick={adminRedeem} className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/50 font-bold text-sm">Grant</button>
          </div>
        </div>
      )}
      <div className="rt-card p-4">
        <div className="font-bold mb-2">📜 Redemption History</div>
        {history.map((h, i) => (
          <div key={i} className="flex justify-between text-sm px-3 py-2 rounded bg-white/5 mb-1">
            <span className="font-bold">{h.code}</span>
            <span className="text-amber-300">+{h.reward_coins} 🪙</span>
            <span className="text-slate-400 text-xs">{timeAgo(h.redeemed_at)}</span>
          </div>
        ))}
        {!history.length && <div className="text-sm text-slate-400">No redemptions yet.</div>}
      </div>
    </div>
  );
}

/* ================= LEADERBOARD ================= */
function Leaderboard({ user }: { user: User }) {
  const [scope, setScope] = useState<"all-time" | "yearly" | "monthly">("all-time");
  const [rows, setRows] = useState<{ username: string; games?: number; wins: number; losses?: number; draws?: number; score: number; win_rate?: number; ranked_wins?: number }[]>([]);
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    const d = await api(`/api/leaderboard?scope=${scope}&year=${year}&page=${page}&limit=15&search=${encodeURIComponent(search)}`).catch(() => null);
    if (d) { setRows(d.rows); setMyRank(d.myRank ?? null); setTotal(d.total ?? 0); }
  }, [scope, year, page, search]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-3">
      <div className="rt-card p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="font-black text-lg mr-2">🏆 Leaderboards</div>
          {(["all-time", "yearly", "monthly"] as const).map((s) => (
            <button key={s} onClick={() => { setScope(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${scope === s ? "border-cyan-400 bg-cyan-500/15" : "border-white/10"}`}>{s}</button>
          ))}
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="rt-input px-2 py-1.5 text-xs w-20" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="🔍 username" className="rt-input px-3 py-1.5 text-xs flex-1 min-w-[120px]" />
        </div>
        <div className="text-[11px] text-slate-400 mt-2">Year/month from match completion (UTC). Ranked win=100, draw=25 • Random/Friend win=40 • Bot tracked separately. My rank: #{myRank ?? "—"}</div>
      </div>
      <div className="rt-card p-2">
        {rows.map((r, i) => {
          const rank = (page - 1) * 15 + i + 1;
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
          return (
            <a key={r.username} href={`/profile/${encodeURIComponent(r.username)}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${r.username === user.username ? "bg-cyan-500/10 border border-cyan-400/40" : "bg-white/[.03] hover:bg-white/[.07]"}`}>
              <span className="w-10 font-black text-sm">{medal}</span>
              <span className="text-xl">{avatarEmoji(r.username)}</span>
              <span className="font-bold flex-1 truncate">{r.username}</span>
              <span className="text-xs text-slate-300 hidden sm:inline">{r.wins}W/{r.games}G</span>
              <span className="text-xs text-slate-400 hidden sm:inline">{r.win_rate ?? ""}{r.win_rate !== undefined ? "%" : ""}</span>
              <span className="font-black text-amber-300">{r.score} pts</span>
            </a>
          );
        })}
        {!rows.length && <div className="p-6 text-center text-slate-400">No rankings yet.</div>}
        <div className="flex justify-between items-center p-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rt-btn-ghost px-4 py-1.5 text-sm font-bold disabled:opacity-40">← Prev</button>
          <span className="text-xs text-slate-400">Page {page} • {total} players</span>
          <button onClick={() => setPage(page + 1)} className="rt-btn-ghost px-4 py-1.5 text-sm font-bold">Next →</button>
        </div>
      </div>
    </div>
  );
}

/* ================= WALLET ================= */
function Wallet() {
  const [tx, setTx] = useState<{ id: number; amount: number; balance_after: number; reason: string; created_at: string }[]>([]);
  const [page, setPage] = useState(1);
  useEffect(() => { api(`/api/coins?action=transactions&page=${page}&limit=20`).then((d) => setTx(d.transactions)).catch(() => {}); }, [page]);
  return (
    <div className="rt-card p-4">
      <div className="font-black text-lg">🪙 R Coin Ledger</div>
      <div className="text-xs text-slate-400">Append-only transaction history. All mutations are server-side & atomic.</div>
      <div className="mt-3 space-y-1">
        {tx.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white/5">
            <span className={`font-black ${t.amount >= 0 ? "text-green-300" : "text-red-300"}`}>{t.amount >= 0 ? "+" : ""}{t.amount}</span>
            <span className="flex-1 truncate text-xs">{t.reason}</span>
            <span className="text-xs text-slate-400">bal {t.balance_after}</span>
            <span className="text-[10px] text-slate-500">{timeAgo(t.created_at)}</span>
          </div>
        ))}
        {!tx.length && <div className="text-slate-400 text-sm">No transactions.</div>}
      </div>
      <div className="flex justify-between mt-3">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rt-btn-ghost px-4 py-1.5 text-sm font-bold disabled:opacity-40">← Prev</button>
        <button onClick={() => setPage(page + 1)} className="rt-btn-ghost px-4 py-1.5 text-sm font-bold">Next →</button>
      </div>
    </div>
  );
}

/* ================= HISTORY ================= */
function History({ user }: { user: User }) {
  const [list, setList] = useState<{ id: string; mode: string; winner: string | null; mySymbol: string | null; playerXName: string; playerOName: string; isRanked: boolean; createdAt: string }[]>([]);
  const [page, setPage] = useState(1);
  useEffect(() => { api(`/api/matches?page=${page}&limit=15`).then((d) => setList(d.matches)).catch(() => {}); }, [page]);
  return (
    <div className="rt-card p-4">
      <div className="font-black text-lg">📜 Match History</div>
      <div className="mt-2 space-y-2">
        {list.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white/5">
            <span>{m.mode === "bot" ? "🤖" : m.mode === "random" ? "⚔️" : "👥"}</span>
            <span className="flex-1 truncate">{m.playerXName} vs {m.playerOName} {m.isRanked && <span className="text-[10px] text-amber-300">RANKED</span>}</span>
            <span className="font-bold">{m.winner === "draw" ? "🤝" : m.winner === m.mySymbol ? "✅" : m.winner ? "❌" : "⏳"}</span>
            <span className="text-[10px] text-slate-500">{timeAgo(m.createdAt)}</span>
          </div>
        ))}
        {!list.length && <div className="text-slate-400 text-sm">No matches yet.</div>}
      </div>
      <div className="flex justify-between mt-3">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rt-btn-ghost px-4 py-1.5 text-sm font-bold disabled:opacity-40">← Prev</button>
        <button onClick={() => setPage(page + 1)} className="rt-btn-ghost px-4 py-1.5 text-sm font-bold">Next →</button>
      </div>
    </div>
  );
}

/* ================= SETTINGS ================= */
function Settings({ user, theme, setTheme, showToast, onRefresh }: { user: User; theme: "dark" | "light"; setTheme: (t: "dark" | "light") => void; showToast: (m: string, k?: "ok" | "err" | "info") => void; onRefresh: () => void }) {
  const [sound, setSound] = useState(true);
  const [privacy, setPrivacy] = useState({ showEmail: false, showDob: false, showAge: true });
  useEffect(() => {
    api(`/api/profile?username=${encodeURIComponent(user.username)}`).then((d) => {
      setSound(d.profile.soundEnabled !== false);
      setPrivacy({ showEmail: !!d.profile.showEmail, showDob: !!d.profile.showDob, showAge: d.profile.showAge !== false });
    }).catch(() => {});
  }, [user.username]);
  const save = async (patch: Record<string, unknown>) => {
    try {
      await api("/api/profile/settings", { method: "PATCH", json: patch }).catch(() => api("/api/profile", { method: "PATCH", json: patch }));
      showToast("Saved ✅", "ok"); onRefresh();
    } catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  return (
    <div className="space-y-3 max-w-xl">
      <div className="rt-card p-5">
        <div className="font-black text-lg">⚙️ Settings</div>
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>🎨 Theme</span>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <button key={t} onClick={() => { setTheme(t); save({ theme: t }); }} className={`px-4 py-1.5 rounded-lg font-bold border ${theme === t ? "border-cyan-400 bg-cyan-500/15" : "border-white/10"}`}>{t === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>🔊 Sound effects</span>
            <button onClick={() => { const v = !sound; setSound(v); setSoundEnabled(v); save({ soundEnabled: v }); }} className={`px-4 py-1.5 rounded-lg font-bold border ${sound ? "border-green-400" : "border-white/10"}`}>{sound ? "ON" : "OFF"}</button>
          </div>
          {(["showEmail", "showDob", "showAge"] as const).map((k) => (
            <div key={k} className="flex items-center justify-between">
              <span>🔒 {k === "showEmail" ? "Show email publicly" : k === "showDob" ? "Show birthdate publicly" : "Show age publicly"}</span>
              <button onClick={() => { const v = !privacy[k]; const p = { ...privacy, [k]: v }; setPrivacy(p); save({ [k]: v }); }} className={`px-4 py-1.5 rounded-lg font-bold border ${privacy[k] ? "border-green-400" : "border-white/10"}`}>{privacy[k] ? "ON" : "OFF"}</button>
            </div>
          ))}
        </div>
        <a href={`/profile/${encodeURIComponent(user.username)}`} className="block text-center text-cyan-300 text-sm mt-4 hover:underline">View my public profile → /profile/{user.username}</a>
      </div>
    </div>
  );
}

/* ================= ADMIN ================= */
function Admin({ showToast }: { showToast: (m: string, k?: "ok" | "err" | "info") => void }) {
  const [data, setData] = useState<{ stats?: { users: number; totalCoins: number; matches: number; transactions: number; openings: number; queueWaiting: number; relicDrops: number }; recentTx?: { id: number; username: string; amount: number; reason: string; created_at: string }[]; recentOpenings?: { id: string; username: string; chest_id: string; reward_item_id: string; reward_rarity: string; created_at: string }[]; grants?: { id: number; admin: string; target: string; amount: number; reason: string }[]; codes?: { id: number; codeDisplay: string; code_display?: string; rewardCoins?: number; reward_coins?: number; isActive?: boolean; is_active?: boolean }[]; chests?: { id: string; name: string; price: number; isActive?: boolean; is_active?: boolean }[] } | null>(null);
  const [grantU, setGrantU] = useState(""); const [grantA, setGrantA] = useState(""); const [grantR, setGrantR] = useState("");
  const [newCode, setNewCode] = useState(""); const [newCoins, setNewCoins] = useState("500");
  const [banU, setBanU] = useState("");
  const load = useCallback(async () => {
    try { const d = await api("/api/admin?action=stats"); setData(d); } catch (e: unknown) { showToast((e as Error).message, "err"); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);
  const act = async (action: string, json: Record<string, unknown>) => {
    try { await api(`/api/admin?action=${action}`, { method: "POST", json }); showToast("Done ✅", "ok"); load(); }
    catch (e: unknown) { showToast((e as Error).message, "err"); }
  };
  return (
    <div className="space-y-3">
      <div className="rt-card p-4">
        <div className="font-black text-lg">🛡️ Admin Console</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-center">
          {[
            ["Users", data?.stats?.users ?? 0], ["R Coins in circulation", (data?.stats?.totalCoins ?? 0).toLocaleString()],
            ["Matches", data?.stats?.matches ?? 0], ["Chest openings", data?.stats?.openings ?? 0],
            ["Queue waiting", data?.stats?.queueWaiting ?? 0], ["🗿 Relic drops", data?.stats?.relicDrops ?? 0],
          ].map(([l, v]) => (
            <div key={l as string} className="p-3 rounded-lg bg-white/5"><div className="text-[10px] uppercase text-slate-400">{l}</div><div className="font-black text-lg">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rt-card p-4">
          <div className="font-bold">💰 Grant Coins (logged)</div>
          <input value={grantU} onChange={(e) => setGrantU(e.target.value)} placeholder="username" className="rt-input w-full px-3 py-2 mt-2 text-sm" />
          <input value={grantA} onChange={(e) => setGrantA(e.target.value)} placeholder="amount" type="number" className="rt-input w-full px-3 py-2 mt-2 text-sm" />
          <input value={grantR} onChange={(e) => setGrantR(e.target.value)} placeholder="reason" className="rt-input w-full px-3 py-2 mt-2 text-sm" />
          <button onClick={() => act("grant", { username: grantU, amount: Number(grantA), reason: grantR })} className="rt-btn-primary w-full py-2 mt-2 text-sm">Grant</button>
        </div>
        <div className="rt-card p-4">
          <div className="font-bold">🎟️ Create Promo Code</div>
          <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="CODE" className="rt-input w-full px-3 py-2 mt-2 text-sm" />
          <input value={newCoins} onChange={(e) => setNewCoins(e.target.value)} placeholder="coins" type="number" className="rt-input w-full px-3 py-2 mt-2 text-sm" />
          <button onClick={() => act("create-code", { code: newCode, rewardCoins: Number(newCoins) })} className="rt-btn-primary w-full py-2 mt-2 text-sm">Create</button>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto scroll-thin">
            {data?.codes?.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs px-2 py-1 bg-white/5 rounded">
                <span className="font-bold flex-1">{(c.codeDisplay || c.code_display) + ""}</span>
                <span>{(c.rewardCoins ?? c.reward_coins ?? 0) + ""} 🪙</span>
                <button onClick={() => act("toggle-code", { id: c.id })} className="text-cyan-300">{(c.isActive ?? c.is_active) ? "Disable" : "Enable"}</button>
              </div>
            ))}
          </div>
        </div>
        <div className="rt-card p-4">
          <div className="font-bold">🔨 Ban / Unban</div>
          <input value={banU} onChange={(e) => setBanU(e.target.value)} placeholder="username" className="rt-input w-full px-3 py-2 mt-2 text-sm" />
          <div className="flex gap-2 mt-2">
            <button onClick={() => act("ban", { username: banU, banned: true, reason: "Abuse" })} className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-400/50 text-sm font-bold">Ban</button>
            <button onClick={() => act("ban", { username: banU, banned: false })} className="flex-1 py-2 rounded-lg border border-white/10 text-sm font-bold">Unban</button>
          </div>
        </div>
        <div className="rt-card p-4">
          <div className="font-bold">🎁 Chests</div>
          <div className="space-y-1 mt-2 max-h-40 overflow-y-auto scroll-thin">
            {data?.chests?.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs px-2 py-1 bg-white/5 rounded">
                <span className="flex-1 font-bold">{c.name} — 🪙 {c.price.toLocaleString()}</span>
                <button onClick={() => { const p = prompt("New price", String(c.price)); if (p) act("update-chest", { id: c.id, price: Number(p) }); }} className="text-cyan-300">Edit price</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rt-card p-4">
        <div className="font-bold">💸 Recent Coin Transactions</div>
        <div className="mt-2 space-y-1 max-h-56 overflow-y-auto scroll-thin text-xs">
          {data?.recentTx?.map((t) => (
            <div key={t.id} className="px-2 py-1.5 bg-white/5 rounded flex gap-2"><b>{t.username}</b><span className={t.amount >= 0 ? "text-green-300" : "text-red-300"}>{t.amount}</span><span className="flex-1 truncate">{t.reason}</span></div>
          ))}
        </div>
      </div>
      <div className="rt-card p-4">
        <div className="font-bold">🎁 Recent Chest Openings (relic audit)</div>
        <div className="mt-2 space-y-1 max-h-56 overflow-y-auto scroll-thin text-xs">
          {data?.recentOpenings?.map((o) => (
            <div key={o.id} className="px-2 py-1.5 bg-white/5 rounded flex gap-2"><b>{o.username}</b><span>{o.chest_id}</span><span className="flex-1">→ {o.reward_item_id}</span><RarityBadge rarity={o.reward_rarity} /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
