"use client";
import React from "react";

export type BoardCell = "" | "X" | "O";

export function symbolFor(player: "X" | "O", skinX: string, skinO: string): string {
  return player === "X" ? skinX : skinO;
}

const SKIN_MAP: Record<string, { x: string; o: string }> = {
  "sym-classic": { x: "✕", o: "○" },
  "sym-neon": { x: "✕", o: "○" },
  "sym-star-heart": { x: "★", o: "♥" },
  "sym-moon-sun": { x: "☾", o: "☀" },
  "sym-crown-shield": { x: "♛", o: "⛨" },
  "sym-dragon-phoenix": { x: "🐉", o: "🔥" },
  "sym-cyber": { x: "⬢", o: "⬣" },
  "sym-candy": { x: "🍬", o: "🍭" },
  "sym-ninja": { x: "✦", o: "❖" },
  "sym-divine-rune": { x: "ᚱ", o: "ᛟ" },
};

export function skinSymbols(skinId?: string | null): { x: string; o: string } {
  if (skinId && SKIN_MAP[skinId]) return SKIN_MAP[skinId];
  return SKIN_MAP["sym-classic"];
}

export function GameBoard(props: {
  board: BoardCell[];
  winLine: number[] | null;
  hintCell: number | null;
  legalCells: number[] | null;
  mySymbol: "X" | "O" | null;
  currentTurn: string;
  status: string;
  skinId?: string | null;
  boardSkin?: string | null;
  onMove: (pos: number) => void;
  disabled?: boolean;
}) {
  const { board, winLine, hintCell, legalCells, onMove, disabled } = props;
  const skins = skinSymbols(props.skinId);
  const boardStyles: Record<string, React.CSSProperties> = {
    "board-neon": { background: "#0a0e27", borderColor: "#00e5ff" },
    "board-glass": { background: "rgba(224,242,254,.12)", borderColor: "#ffffff88" },
    "board-cyberpunk": { background: "#12061f", borderColor: "#ff2d95" },
    "board-minimal": { background: "#111", borderColor: "#e5e5e5" },
    "board-golden": { background: "#0c0a09", borderColor: "#fbbf24" },
    "board-matrix": { background: "#020617", borderColor: "#22ff66" },
    "board-lava": { background: "#1c0a00", borderColor: "#ff5722" },
    "board-ice": { background: "#082f49", borderColor: "#a5f3fc" },
    "board-void": { background: "#000", borderColor: "#8b5cf6" },
  };
  const bs = boardStyles[props.boardSkin || ""] ?? { background: "rgba(13,18,48,.9)", borderColor: "rgba(139,92,246,.4)" };
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl border-2" style={{ background: bs.background as string, borderColor: bs.borderColor as string, boxShadow: `0 0 30px ${bs.borderColor}44` }}>
      {board.map((c, i) => {
        const isWin = winLine?.includes(i);
        const isHint = hintCell === i;
        const isLegal = legalCells?.includes(i);
        return (
          <button
            key={i}
            disabled={disabled || c !== "" || props.status !== "active"}
            onClick={() => onMove(i)}
            aria-label={`Cell ${i + 1}`}
            className={`aspect-square rounded-xl text-4xl sm:text-6xl font-black flex items-center justify-center transition-all border
              ${isWin ? "win-cell" : ""} ${isHint ? "hint-cell" : ""} ${isLegal ? "legal-cell" : ""}
              ${c === "" && props.status === "active" && !disabled ? "hover:bg-white/10 cursor-pointer" : "cursor-default"}
            `}
            style={{
              background: c ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)",
              borderColor: (bs.borderColor as string) + "66",
              color: c === "X" ? "#00e5ff" : c === "O" ? "#f472b6" : undefined,
              textShadow: c ? `0 0 18px ${c === "X" ? "#00e5ff" : "#f472b6"}` : undefined,
            }}
          >
            {c ? <span className="cell-enter">{c === "X" ? skins.x : skins.o}</span> : isHint ? <span className="opacity-40 text-3xl">👆</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div
        className="grid place-items-center rounded-xl font-black"
        style={{ width: size, height: size, background: "linear-gradient(135deg,#00e5ff,#8b5cf6,#ff2d55)", boxShadow: "0 0 20px rgba(139,92,246,.6)", fontSize: size * 0.45, color: "#04081a" }}
      >
        RT
      </div>
      <div className="leading-tight">
        <div className="font-black tracking-tight neon-text" style={{ fontSize: size * 0.42 }}>R-T TicTacToe</div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Arena Gaming</div>
      </div>
    </div>
  );
}

export function CoinBadge({ balance }: { balance: number | null }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 font-bold text-amber-300 text-sm whitespace-nowrap">
      <span>🪙</span>
      <span>{balance === null ? "—" : balance.toLocaleString()}</span>
      <span className="text-[10px] uppercase text-amber-400/70">R Coin</span>
    </div>
  );
}

export function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    common: "#9ca3af", uncommon: "#22c55e", rare: "#3b82f6", ultra_rare: "#06b6d4",
    epic: "#a855f7", legendary: "#f59e0b", mythic: "#ec4899", ancient: "#f97316",
    divine: "#facc15", secret: "#ff2d55",
  };
  const c = colors[rarity] || "#9ca3af";
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ color: c, borderColor: c + "66", background: c + "15" }}>
      {rarity.replace("_", " ")}
    </span>
  );
}

export function Toast({ msg, kind, onClose }: { msg: string; kind: "ok" | "err" | "info"; onClose: () => void }) {
  const bg = kind === "ok" ? "border-green-400/50 bg-green-500/15" : kind === "err" ? "border-red-400/50 bg-red-500/15" : "border-cyan-400/50 bg-cyan-500/15";
  const icon = kind === "ok" ? "✅" : kind === "err" ? "❌" : "ℹ️";
  return (
    <div className={`toast-in fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl border backdrop-blur-md flex items-center gap-2 max-w-[90vw] ${bg}`}>
      <span>{icon}</span>
      <span className="text-sm font-medium">{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}
