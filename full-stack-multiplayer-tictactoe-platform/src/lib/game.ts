export type Cell = "" | "X" | "O";
export type Board = Cell[];

export const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function emptyBoard(): Board {
  return ["", "", "", "", "", "", "", "", ""];
}

export function checkWinner(board: Board): { winner: "" | "X" | "O" | "draw"; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as "X" | "O", line };
    }
  }
  if (board.every((c) => c !== "")) return { winner: "draw", line: null };
  return { winner: "", line: null };
}

export function availableMoves(board: Board): number[] {
  const out: number[] = [];
  for (let i = 0; i < 9; i++) if (board[i] === "") out.push(i);
  return out;
}

export function validateMove(board: Board, pos: number, symbol: "X" | "O", currentTurn: string, status: string): string | null {
  if (status !== "active") return "Game is not active";
  if (!Number.isInteger(pos) || pos < 0 || pos > 8) return "Invalid position";
  if (board[pos] !== "") return "Cell occupied";
  if (symbol !== currentTurn) return "Not your turn";
  return null;
}

// Minimax
function minimax(board: Board, isMax: boolean, ai: "X" | "O", human: "X" | "O", depth: number): number {
  const { winner } = checkWinner(board);
  if (winner === ai) return 10 - depth;
  if (winner === human) return depth - 10;
  if (winner === "draw") return 0;
  const moves = availableMoves(board);
  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      board[m] = ai;
      best = Math.max(best, minimax(board, false, ai, human, depth + 1));
      board[m] = "";
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      board[m] = human;
      best = Math.min(best, minimax(board, true, ai, human, depth + 1));
      board[m] = "";
    }
    return best;
  }
}

export function bestMove(board: Board, ai: "X" | "O"): number {
  const human = ai === "X" ? "O" : "X";
  let best = -Infinity;
  let move = availableMoves(board)[0] ?? 0;
  for (const m of availableMoves(board)) {
    board[m] = ai;
    const score = minimax(board, false, ai, human, 0);
    board[m] = "";
    if (score > best) {
      best = score;
      move = m;
    }
  }
  return move;
}

export function findWinningMove(board: Board, symbol: "X" | "O"): number | null {
  for (const m of availableMoves(board)) {
    board[m] = symbol;
    const { winner } = checkWinner(board);
    board[m] = "";
    if (winner === symbol) return m;
  }
  return null;
}

export function botMove(board: Board, ai: "X" | "O", difficulty: string): number {
  const moves = availableMoves(board);
  if (moves.length === 0) return -1;
  const human = ai === "X" ? "O" : "X";
  const rand = moves[Math.floor(Math.random() * moves.length)];
  switch (difficulty) {
    case "easy":
      return rand;
    case "medium": {
      // win if possible, block if possible, else random (20% mistake even when block exists)
      const win = findWinningMove(board, ai);
      if (win !== null) return win;
      const block = findWinningMove(board, human);
      if (block !== null && Math.random() > 0.2) return block;
      if (Math.random() < 0.35) return rand;
      // else prefer center/corners
      if (board[4] === "") return 4;
      const corners = [0, 2, 6, 8].filter((i) => board[i] === "");
      if (corners.length && Math.random() < 0.7) return corners[Math.floor(Math.random() * corners.length)];
      return rand;
    }
    case "hard": {
      // 85% optimal, 15% random mistake
      if (Math.random() < 0.15) return rand;
      return bestMove([...board] as Board, ai);
    }
    case "expert":
    default:
      return bestMove([...board] as Board, ai);
  }
}

export function hintMove(board: Board, symbol: "X" | "O"): number {
  const win = findWinningMove([...board] as Board, symbol);
  if (win !== null) return win;
  const opp = symbol === "X" ? "O" : "X";
  const block = findWinningMove([...board] as Board, opp);
  if (block !== null) return block;
  return bestMove([...board] as Board, symbol);
}

export function boardFromDb(raw: unknown): Board {
  if (Array.isArray(raw) && raw.length === 9) {
    return (raw as string[]).map((c) => (c === "X" || c === "O" ? c : "")) as Board;
  }
  return emptyBoard();
}
